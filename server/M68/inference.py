from pathlib import Path
from config import get_config
from model import build_transformer
from tokenizers import Tokenizer
import torch

def causal_mask(size):
    mask = torch.triu(torch.ones((1, size, size)), diagonal=1).type(torch.int)
    return mask == 0

def greedy_decode(model, source, source_mask, tokenizer_src, tokenizer_tgt, max_len, device):
    sos_idx = tokenizer_tgt.token_to_id('[SOS]')
    eos_idx = tokenizer_tgt.token_to_id('[EOS]')

    encoder_output = model.encode(source, source_mask)
    decoder_input = torch.empty(1, 1).fill_(sos_idx).type_as(source).to(device)
    while True:
        if decoder_input.size(1) == max_len:
            break

        decoder_mask = causal_mask(decoder_input.size(1)).type_as(source_mask).to(device)
        out = model.decode(encoder_output, source_mask, decoder_input, decoder_mask)

        prob = model.project(out[:, -1])
        _, next_word = torch.max(prob, dim=1)
        decoder_input = torch.cat(
            [decoder_input, torch.empty(1, 1).type_as(source).fill_(next_word.item()).to(device)], dim=1
        )

        if next_word == eos_idx:
            break

    return decoder_input.squeeze(0)

def get_model(config, vocab_src_len, vocab_tgt_len):
    model = build_transformer(vocab_src_len, vocab_tgt_len, config["seq_len"], config['seq_len'], d_model=config['d_model'])
    return model

def get_weights_file_path(config):
    model_file_path = config.get('model_file_path', '')
    if Path(model_file_path).exists():
        return str(model_file_path)
    else:
        return None

def load_model(config, device):
    tokenizer_src = Tokenizer.from_file(str(Path(config['tokenizer'].format('input'))))
    tokenizer_tgt = Tokenizer.from_file(str(Path(config['tokenizer'].format('output'))))
    model = get_model(config, tokenizer_src.get_vocab_size(), tokenizer_tgt.get_vocab_size()).to(device)
    model_filename = get_weights_file_path(config)
    if model_filename:
        state = torch.load(model_filename, map_location=device)
        model.load_state_dict(state['model_state_dict'])
    else:
        raise FileNotFoundError("No model file found.")
    return model

def infer(config, model, input_text, tokenizer_src, tokenizer_tgt, max_len, device):
    seq_len = config['seq_len']
    model.eval()
    with torch.no_grad():
        # Tokenize the input text
        source = tokenizer_src.encode(input_text).ids
        encoder_input = torch.cat([
            torch.tensor([tokenizer_src.token_to_id('[SOS]')], dtype=torch.int64),
            torch.tensor(source, dtype=torch.int64),
            torch.tensor([tokenizer_src.token_to_id('[EOS]')], dtype=torch.int64),
            torch.tensor([tokenizer_src.token_to_id('[PAD]')] * (seq_len - len(source) - 2), dtype=torch.int64)
        ], dim=0).unsqueeze(0).to(device)
        encoder_mask = (encoder_input != tokenizer_src.token_to_id('[PAD]')).unsqueeze(1).unsqueeze(2).to(device)

        # Generate prediction
        output_tokens = greedy_decode(model, encoder_input, encoder_mask, tokenizer_src, tokenizer_tgt, max_len, device)
        predicted_text = tokenizer_tgt.decode(output_tokens.cpu().numpy().tolist())
        
        return predicted_text

def inference(input_text: str):
    config = get_config()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    device = torch.device(device)
    
    tokenizer_src = Tokenizer.from_file(str(Path(config['tokenizer'].format('input'))))
    tokenizer_tgt = Tokenizer.from_file(str(Path(config['tokenizer'].format('output'))))
    
    model = load_model(config, device)
    max_len = config['seq_len']
    
    predicted_text = infer(config, model, input_text, tokenizer_src, tokenizer_tgt, max_len, device)
    
    return predicted_text
