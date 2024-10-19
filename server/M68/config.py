from pathlib import Path

def get_config():
    return {
        "seq_len": 400,
        "d_model": 512,
        "model_file_path": "M68.pt",
        "tokenizer": "tokenizer_{0}.json",
    }

def get_weights_file_path(config):
    model_file_path = config.get('model_file_path', '')
    if Path(model_file_path).exists():
        return str(model_file_path)
    else:
        return None
