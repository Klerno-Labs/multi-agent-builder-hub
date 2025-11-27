
# Ava – UX/UI Designer Agent (CLI)

This is a standalone VS Code–ready agent that:

- Reads the `ProjectSpec.md` produced by Riley.
- Generates a full `DesignSpec.md` including:
  - Style guide
  - UI components
  - Layouts
  - Asset requirements
  - Instructions for Liam, Iris, Nova

## Setup

1. Unzip this folder.
2. Open in VS Code.
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Set your API key:
   ```
   export OPENAI_API_KEY="your_key"
   ```
5. Run:
   ```
   python ava_agent.py
   ```
