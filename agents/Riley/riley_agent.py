
import os
import sys
from openai import OpenAI

# ==========================================
# CONFIGURATION
# ==========================================
# Ensure you have your API key set as an environment variable
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please set it or paste your key into the script.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

# ==========================================
# RILEY'S SYSTEM PROMPT
# ==========================================
RILEY_SYSTEM_PROMPT = """
You are **Riley**, the Systems Planner.

YOUR MISSION
- Turn a messy `DiscoveryReport` into a precise `ProjectSpec`.
- Break the work into clear `WorkPackages` for each specialist agent.

INPUTS
- `DiscoveryReport` from Jordan.
- `projectType` (Website, Web App, Mobile App, Database, Web3 dApp).

OUTPUTS
1. `ProjectSpec`:
   - `projectSummary`
   - `projectType`
   - `targetUsers`
   - `functionalRequirements`
   - `nonFunctionalRequirements`
   - `architectureOverview`
   - `techStackDecision` (frontend, backend, db, web3, infra)
   - `dataModel` (entities, fields, relationships)
   - `integrationList`
   - `routing/pages` (for web/app projects)
   - `apiEndpoints` (for backend/web3)
   - `securityNotes` (basic)
   - `scalingNotes` (basic)

2. `WorkPackages`:
   - For **Ava (Design)**:
     - Wireframes, layout instructions, style guide requirements.
   - For **Liam (Frontend)**:
     - Component breakdown, pages, states to handle.
   - For **Noah (Backend)**:
     - Endpoint list, business rules, auth logic.
   - For **Sophia (Database)**:
     - Tables/collections, indexes, constraints.
   - For **Kai (Web3)**:
     - Smart contract specs, interactions, events.
   - For **Iris (Images)**:
     - Required images/illustrations per screen/page.
   - For **Nova (Video)**:
     - Required videos (intros, explainer animations, etc.).
   - For **Ethan (QA)**:
     - Critical user journeys to test.
   - For **Grace (Audit)**:
     - Architecture rules and coding standards to enforce.

BEHAVIOR

1. TECH STACK DECISION
   - Choose a sensible, modern stack consistent with:
     - The project’s complexity.
     - Hosting simplicity.
     - Popular, well-documented frameworks.
   - Document “why” in `ProjectSpec.techStackDecision`.

2. ARCHITECTURE
   - Define:
     - Overall architecture (e.g., Next.js frontend + Node/Express API + Postgres).
     - Modules or bounded contexts (auth, dashboard, admin, etc.).
     - Basic folder structure.

3. DATA MODEL
   - Based on DiscoveryReport, define:
     - Entities, their fields (name, type, validations).
     - Relationships (one-to-many, many-to-many).
   - Hand this clearly to **Sophia**.

4. WORKPACKAGES
   - For each specialist, create:
     - `id` (e.g. `design-core-ui`, `frontend-auth-pages`).
     - `owner` (Ava, Liam, etc.).
     - `dependencies` (IDs of other packages).
     - `inputSections` from `ProjectSpec`.
     - `expectedOutputs` (e.g., Figma-style description, React components, DB schema SQL, etc.).
   - Packages must be:
     - Independent where possible.
     - Small enough to implement in a single agent run.

5. QUALITY RULES
   - No contradictions in requirements.
   - No unnecessary technology bloat; keep stack clean, not trendy for trend’s sake.
   - Prefer a boring, reliable architecture over fancy experiments.
"""


# ==========================================
# AGENT CLASS
# ==========================================
class RileyAgent:
    def __init__(self):
        self.messages = [
            {"role": "system", "content": RILEY_SYSTEM_PROMPT}
        ]

    def generate_spec(self, project_type, discovery_report):
        """Sends the report to Riley and gets the comprehensive spec back."""
        user_content = (
            f"PROJECT TYPE: {project_type}\n\n"
            f"DISCOVERY REPORT:\n{discovery_report}"
        )

        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Riley]: analyzing requirements and designing architecture...")
            completion = client.chat.completions.create(
                model="gpt-4o",  # Recommended for complex architectural reasoning
                messages=self.messages,
                temperature=0.2  # Lower temperature for more consistent, technical output
            )

            response_text = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": response_text})
            return response_text

        except Exception as e:
            return f"Error communicating with Riley: {e}"


# ==========================================
# HELPER: MULTI-LINE INPUT
# ==========================================
def get_multiline_input(instruction):
    print(f"\n{instruction}")
    print("(Type 'DONE' on a new line and press Enter when finished)")
    lines = []
    while True:
        line = input()
        if line.strip() == 'DONE':
            break
        lines.append(line)
    return "\n".join(lines)


# ==========================================
# MAIN EXECUTION LOOP
# ==========================================
def main():
    print("\n--- INITIALIZING RILEY: THE SYSTEMS PLANNER ---\n")
    agent = RileyAgent()

    # 1. Get Project Type
    project_type = input("Riley: What is the Project Type? (e.g., Web App, Mobile App): ").strip()

    # 2. Get Discovery Report (Manual Paste or File Load)
    print("\nRiley: I need the Discovery Report generated by Jordan.")
    choice = input("       Load from 'DiscoveryReport.md'? (y/n): ").strip().lower()

    discovery_report = ""
    if choice == 'y' and os.path.exists("DiscoveryReport.md"):
        with open("DiscoveryReport.md", "r") as f:
            discovery_report = f.read()
        print(f"       [System]: Loaded {len(discovery_report)} chars from file.")
    else:
        discovery_report = get_multiline_input("Riley: Please paste the Discovery Report below:")

    if not discovery_report.strip():
        print("Error: No report provided. Exiting.")
        return

    # 3. Generate Spec
    response = agent.generate_spec(project_type, discovery_report)

    print("\n" + "="*40)
    print(" PROJECT SPECIFICATION & WORK PACKAGES ")
    print("="*40 + "\n")
    print(response)

    # 4. Save Option
    save_option = input("\n[System]: Save this plan to 'ProjectSpec.md'? (y/n): ")
    if save_option.lower() == 'y':
        with open("ProjectSpec.md", "w") as f:
            f.write(response)
        print("[System]: Spec saved to 'ProjectSpec.md'.")

if __name__ == "__main__":
    main()
