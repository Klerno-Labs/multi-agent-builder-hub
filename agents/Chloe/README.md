# Chloe – Documentation Guide Agent

Chloe analyzes your project structure and spec, then auto-writes:

- `README.md` – Overview, tech stack, features, and how to run locally
- `ARCHITECTURE.md` – High-level system design
- Optional extra docs like `API.md` or `CONTRIBUTING.md`

## Setup

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
```

## Usage

Place `chloe_agent.py` in your project root (where your code lives), then run:

```bash
python chloe_agent.py
```

Chloe will:

1. Load `ProjectSpec.md` if it exists (or ask you for a brief project description).
2. Scan the directory tree to detect:
   - Node/Python/Docker stack from files like `package.json`, `requirements.txt`, `docker-compose.yml`
3. Generate:
   - `README.md`
   - `ARCHITECTURE.md`
4. Optionally create a custom Markdown doc of your choice.

You can re-run Chloe any time you change the project structure or spec.
