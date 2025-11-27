
import os
import sys
from openai import OpenAI

# ==========================================
# CONFIGURATION
# ==========================================
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please set it or paste your key into the script.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

# ==========================================
# CHLOE'S SYSTEM PROMPT
# ==========================================
CHLOE_SYSTEM_PROMPT = """You are **Chloe**, the Documentation Guide.

YOUR MISSION
- Explain what was built.
- Provide crystal-clear instructions to the user.
- Bridge the gap between technical complexity and user-friendly guides.

INPUTS
- `ProjectSpec` (The intent).
- `FileTree` (The actual reality of what was built).

OUTPUTS
- `README.md` content:
  - Project overview.
  - Tech stack.
  - Features.
  - How to run locally (step-by-step).
- `ARCHITECTURE.md` (High-level system design).

BEHAVIOR
1. INTELLIGENT DETECTION
   - If you see `package.json`, assume Node.js/npm commands.
   - If you see `requirements.txt` or `pyproject.toml`, assume Python/pip commands.
   - If you see `docker-compose.yml`, prioritize Docker instructions.

2. CLARITY
   - Assume the user is smart but might not know the specific framework.
   - Use code blocks for all terminal commands.
   - Structure the README with clear headers (#, ##).

3. CONTENT SOURCE
   - Use the `ProjectSpec` to fill in the "About", "Features", and "Goals" sections.
   - Use the `FileTree` to generate the "Project Structure" section.
"""

# ==========================================
# AGENT CLASS
# ==========================================
class ChloeAgent:
    def __init__(self):
        self.messages = [
            {"role": "system", "content": CHLOE_SYSTEM_PROMPT}
        ]

    def generate_document(self, doc_type, project_spec, file_tree):
        """Generates a specific documentation file."""
        user_content = (
            f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
            f"CONTEXT (FILE STRUCTURE):\n{file_tree}\n\n"
            f"TASK: Write the `{doc_type}` file.\n"
            "Ensure it is formatted in valid Markdown."
        )

        messages = self.messages + [{"role": "user", "content": user_content}]

        try:
            print(f"\n[Chloe]: Writing {doc_type} based on project analysis...")
            completion = client.chat.completions.create(
                model="gpt-4o", 
                messages=messages,
                temperature=0.2 
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"

# ==========================================
# HELPER: FILE SYSTEM ANALYSIS
# ==========================================
def get_project_file_tree(startpath="."):
    """Generates a visual tree of the current directory to help the LLM understand the stack."""
    tree_str = ""
    exclude_dirs = {".git", "__pycache__", "venv", "node_modules", ".next", "dist", "build"}
    exclude_files = {".DS_Store"}

    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        tree_str += f"{indent}{os.path.basename(root)}/\n"
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if f not in exclude_files:
                tree_str += f"{subindent}{f}\n"
    return tree_str

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
    print("\n--- INITIALIZING CHLOE: THE DOCUMENTATION GUIDE ---\n")
    agent = ChloeAgent()

    # 1. Load Project Spec
    project_spec = ""
    if os.path.exists("ProjectSpec.md"):
        with open("ProjectSpec.md", "r", encoding="utf-8") as f:
            project_spec = f.read()
        print("[System]: Loaded ProjectSpec.md")
    else:
        project_spec = get_multiline_input("Chloe: 'ProjectSpec.md' not found. Paste brief project details below:")

    # 2. Analyze File System
    print("[Chloe]: Scanning directory to detect technology stack...")
    file_tree = get_project_file_tree(".")

    # 3. Generate Docs
    docs_to_generate = ["README.md", "ARCHITECTURE.md"]

    for doc in docs_to_generate:
        content = agent.generate_document(doc, project_spec, file_tree)
        with open(doc, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Chloe]: Successfully generated '{doc}'.")

    # 4. Optional Custom Doc
    print("\nChloe: Do you need any specific extra documentation? (e.g., API.md, CONTRIBUTING.md)")
    extra = input("Doc Name (or press Enter to skip): ").strip()

    if extra:
        if not extra.endswith(".md"):
            extra += ".md"
        content = agent.generate_document(extra, project_spec, file_tree)
        with open(extra, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[Chloe]: Generated custom doc '{extra}'.")

    print("\n" + "="*40)
    print(" DOCUMENTATION COMPLETE ")
    print("="*40)
    print("Your project is now documented and ready for handoff.")

if __name__ == "__main__":
    main()
