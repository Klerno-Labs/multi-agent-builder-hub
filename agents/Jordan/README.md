# Jordan – Discovery Architect Agent

Jordan runs a structured discovery interview to produce a detailed `DiscoveryReport`
you can hand off to planning/architecture agents (like Riley).

## Features

- Conversational CLI interview
- System prompt tuned for:
  - Goals, users, features, constraints
  - Web2/Web3 projects (Website, Web App, Mobile App, Database, Web3 dApp)
- Optionally saves the final discovery output to `DiscoveryReport.md`

## Setup

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
```

## Usage

Run from your terminal:

```bash
python jordan_agent.py
```

Then:

1. Jordan will ask you for:
   - Project type (Website, Web App, Mobile App, Database, Web3 dApp)
   - A brief description
2. He’ll then continue with targeted questions to extract all requirements.
3. When he outputs something that looks like a `DiscoveryReport` containing
   `projectSummary`, you’ll be prompted to save it to `DiscoveryReport.md`.

You can end the session any time with `exit`, `quit`, or `bye`.
