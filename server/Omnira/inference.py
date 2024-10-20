import torch
from config import get_config
from loadmodel import load_model
from tokenizer import build_or_get_tokenizer
from model import TCLM

config = get_config()
tokenizer = build_or_get_tokenizer(config)

model = TCLM(vocab_size=tokenizer.get_vocab_size(),
             seq_len=config['seq_len'],
             d_model=config['d_model'],
             N=config['n_layers'],
             h=config['head'],
             dropout=config['dropout'],
             d_ff=config['d_ff'])

optimizer = torch.optim.Adam(model.parameters(), lr=config['lr'], eps=1e-9)
model, initial_epoch, global_step = load_model(config, config['device'], model, optimizer)

def inference(text):
    input_text = f"[SOS] [USER] {text} [BOT]"
    idx = tokenizer.encode(input_text).ids
    idx = torch.tensor([idx]).to(config['device'])
    generated_sequence = model.generate(idx, max_new_tokens=50, seq_len=config['seq_len'], temperature=config['temperature'], top_k=config['top_k'])
    predicted_text = tokenizer.decode(generated_sequence[0].cpu().numpy())
    bot_token_index = predicted_text.find(text[-1]) + 1
    response_tokens = predicted_text[bot_token_index:].strip()

    return response_tokens