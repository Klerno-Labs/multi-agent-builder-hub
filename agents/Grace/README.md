# Grace – Code Auditor Agent

Grace performs:
- Quick static scans (secrets & oversized files) **without** using the API
- Deep AI audits of pasted code or local files using the project spec as context

## Setup

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
```

## Usage

```bash
python grace_agent.py
```

Menu options:

1. Static scan of a directory for:
   - Hardcoded secrets (API keys, passwords, private keys)
   - Oversized files that likely need refactoring

2. Deep AI audit (paste code)
3. Deep AI audit (load a local file)
4. Exit
