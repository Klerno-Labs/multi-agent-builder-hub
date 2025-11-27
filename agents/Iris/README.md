# Iris – Image & Asset Creator Agent

Generates:
- Full asset list
- DALL·E-ready prompts
- Actual images using DALL·E 3

## Run
```
pip install -r requirements.txt
export OPENAI_API_KEY="your_key"
python iris_agent.py
```

## Run (POSIX)
```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key"
python iris_agent.py --prompt "a serene sunset over mountains"
```

## Run (Windows PowerShell)
```powershell
pip install -r requirements.txt
$env:OPENAI_API_KEY = "your_key"
python .\iris_agent.py --prompt "a serene sunset over mountains"
```

## Programmatic usage
```python
from openai import OpenAI
from agents.Iris.iris_agent import IrisAgent

client = OpenAI(api_key="your_key")
agent = IrisAgent(client=client)
agent.generate_dalle_image("a scenic logo", filename_hint="logo")
```

## Tests
Install dev requirements and run pytest:
```bash
pip install -r requirements-dev.txt
pytest -q
```
