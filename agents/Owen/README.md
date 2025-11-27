# Owen – Integration Engineer (Glue + Packager)

This agent:

- Scans your current project files
- Organizes them into a `release_build/` structure
- Calls OpenAI to generate:
  - A root `README.md` with setup/run instructions
  - A `.env.example` and/or config suggestions embedded in the Markdown
- Creates a timestamped ZIP archive of the build folder

## Setup

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
```

## Usage

Place `owen_agent.py` in the root of your project (same level as your frontend/backend folders, etc.) and run:

```bash
python owen_agent.py
```

Owen will:

1. Create `release_build/` with `frontend/`, `backend/`, `docs/`, `assets/`, `scripts/`
2. Copy files into those folders using simple heuristics
3. Generate glue documentation into `release_build/README.md`
4. Build `final_project_release_YYYYMMDD_HHMMSS.zip` in the current directory
