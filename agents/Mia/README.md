# Mia – Orchestrator / UI Router

Mia is the top-level orchestrator for your multi-agent build system.
She doesn't do the work herself — she routes control to each specialist
agent (Jordan, Riley, Ava, Liam, Noah, Sophia, Kai, Iris, Nova, Ethan,
Grace, Owen, Chloe) in sequence and checks key artifacts along the way.

This script assumes all the individual `*_agent.py` scripts already exist
in the **same directory** and can be run as normal Python programs.

## Files in this project

- `mia_orchestrator.py` – The orchestration / UI router script.
- `README.md` – This file.
- `requirements.txt` – (currently empty; Mia only uses the standard library).

## Prerequisites

- Python 3.9+
- All your agent scripts in the same directory:

  - `jordan_agent.py`
  - `riley_agent.py`
  - `ava_agent.py`
  - `liam_agent.py`
  - `noah_agent.py`
  - `sophia_agent.py`
  - `kai_agent.py`
  - `iris_agent.py`
  - `nova_agent.py`
  - `ethan_agent.py`
  - `grace_agent.py`
  - `owen_agent.py`
  - `chloe_agent.py`

- Environment variable:

```bash
export OPENAI_API_KEY="your_key_here"
```

(Each agent that talks to the OpenAI API will use this.)

## Setup

There are no third‑party Python dependencies for Mia herself, but you can
still install from `requirements.txt` to keep things uniform:

```bash
pip install -r requirements.txt
```

Then place `mia_orchestrator.py` in the same folder as all your agent
files.

## Usage

From that directory, run:

```bash
python mia_orchestrator.py
```

Mia will:

1. Ask what you're building (Website, Web App, Mobile App, DB System, Web3 dApp).
2. Call **Jordan** to gather requirements and generate `DiscoveryReport.md`.
3. Call **Riley** to convert that into `ProjectSpec.md`.
4. Dispatch to specialists in order:
   - **Ava** (Design → `DesignSpec.md`)
   - **Sophia** (Database schema)
   - **Noah** (Backend/APIs)
   - **Kai** (Web3 contracts, only if Web3 project)
   - **Liam** (Frontend)
   - **Iris** and **Nova** (assets) if you say you want them
5. Call **Grace** for audits and **Ethan** for tests.
6. Call **Owen** to build/package into `release_build/` and a ZIP.
7. Call **Chloe** to generate final docs (`README.md`, etc.).

At the end, Mia will print out which artifacts/ZIPs are ready.

## Notes

- If any required artifact like `DiscoveryReport.md` or `ProjectSpec.md`
  is missing, Mia will stop and tell you what’s wrong.
- Mia uses `subprocess.run` with your current Python interpreter, so make
  sure your virtualenv (if any) is activated before running her.
