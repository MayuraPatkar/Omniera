from pathlib import Path
from tokenizers import Tokenizer

def build_or_get_tokenizer(config):
    tokenizer_path = Path(config['tokenizer_file_path'])
    if tokenizer_path.exists():
        tokenizer = Tokenizer.from_file(str(tokenizer_path))
    
    return tokenizer