import sys
import json
from inference import inference

def get_response(prompt=None):
    response = inference(prompt)
    print(json.dumps(response))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            # Ensure sys.argv[1] is not an empty string and is valid JSON
            prompt = json.loads(sys.argv[1])
            get_response(str(prompt))
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps({"error": "No prompt provided"}))
