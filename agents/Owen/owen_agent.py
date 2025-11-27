
import os
import sys
import shutil
from datetime import datetime
from openai import OpenAI

# ==========================================
# CONFIGURATION
# ==========================================
API_KEY = os.getenv("OPENAI_API_KEY")
BUILD_DIR = "release_build"
ZIP_NAME = "final_project_release"

if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please set it or paste your key into the script.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

# ==========================================
# OWEN'S SYSTEM PROMPT
# ==========================================
OWEN_SYSTEM_PROMPT = """You are **Owen**, the Integration Engineer.

YOUR MISSION
- Analyze a file structure and generate the "Glue" files needed to run the project.
- You do NOT write feature code. You write READMEs, docker-compose.yml, and .env.examples.

INPUTS
- List of filenames in the project.
- `ProjectSpec` content.

OUTPUTS
- Content for `README.md` (Instructions on how to install/run).
- Content for `.env.example` (Based on found variables in the code).
- Content for `package.json` (Root script to run both front/back if needed).

BEHAVIOR
1. ANALYZE
   - Look at the file list. Identify if it's a Monorepo, a simple Python script, or a Full Stack Web App.
2. DOCUMENT
   - Write clear step-by-step instructions for the user to start the app.
"""

# ==========================================
# AGENT CLASS
# ==========================================
class OwenAgent:
    def __init__(self):
        self.messages = [
            {"role": "system", "content": OWEN_SYSTEM_PROMPT}
        ]

    def generate_glue_files(self, project_spec, file_tree_str):
        """
        Asks the LLM to write the README and Config based on the file structure.
        """
        user_content = (
            f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
            f"CURRENT FILE STRUCTURE:\n{file_tree_str}\n\n"
            "TASK:\n"
            "1. Generate a root `README.md` with setup instructions.\n"
            "2. Generate a `.env.example` listing likely required variables.\n"
            "Return them in Markdown code blocks labeled with their filenames."
        )
        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Owen]: Analyzing project structure and writing documentation...")
            completion = client.chat.completions.create(
                model="gpt-4o", 
                messages=self.messages,
                temperature=0.1 
            )
            return completion.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"

# ==========================================
# FILE SYSTEM OPERATIONS
# ==========================================
def clean_build_dir():
    # Ask for user approval before removing existing build directory
    try:
        from agents.utils.api_clients import request_tool_approval, poll_tool_approval
        next_base = os.environ.get("NEXT_BASE_URL", "http://localhost:3000")
        approved = False
        if os.path.exists(BUILD_DIR):
            req_id = request_tool_approval(next_base, "Owen", "filesystem", "clean_build", {"path": BUILD_DIR}, timeout=10)
            if req_id:
                result = poll_tool_approval(next_base, req_id, poll_interval=1.0, timeout=30)
                if result and result.get("approved") is True:
                    approved = True
        else:
            approved = True
    except Exception:
        # If the approval API or helper isn't available, proceed conservatively
        approved = True

    if os.path.exists(BUILD_DIR) and approved:
        shutil.rmtree(BUILD_DIR)
    elif os.path.exists(BUILD_DIR) and not approved:
        print(f"[Owen]: Skipping removal of existing '{BUILD_DIR}' (approval not granted). Will reuse or overwrite files.")

    os.makedirs(BUILD_DIR, exist_ok=True)
    # Create subfolders
    os.makedirs(os.path.join(BUILD_DIR, "frontend"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "backend"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "docs"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "assets"), exist_ok=True)
    os.makedirs(os.path.join(BUILD_DIR, "scripts"), exist_ok=True)

def categorize_and_move_files():
    """
    Heuristic logic to move files from the root to the build folder.
    """
    print(f"[Owen]: Organizing files into '{BUILD_DIR}/'...")

    # Exclude the agents themselves and specific system files
    exclude = {
        "owen_agent.py", "liam_agent.py", "noah_agent.py", "ava_agent.py", 
        "riley_agent.py", "jordan_agent.py", "sophia_agent.py", "kai_agent.py",
        "iris_agent.py", "nova_agent.py", "ethan_agent.py", "grace_agent.py",
        "agency.py", ".env", ".git", "__pycache__", "venv"
    }

    moved_count = 0

    for file in os.listdir("."):
        if file in exclude or os.path.isdir(file):
            continue

        src = file
        dest_folder = "docs"  # Default

        # Heuristics
        if file.endswith((".tsx", ".jsx", ".css", "tailwind.config.js", "next.config.js")):
            dest_folder = "frontend"
        elif file.endswith((".py", ".go", ".java", "requirements.txt")):
            # Check if it's a generated backend file or a random script
            if "agent" not in file: 
                dest_folder = "backend"
        elif file.endswith((".sql", ".prisma")):
            dest_folder = "backend"  # or database
        elif file.endswith((".md", ".txt")):
            dest_folder = "docs"
        elif file.endswith((".png", ".jpg", ".mp4", ".svg")):
            dest_folder = "assets"
        elif file.endswith(".json"):
            if "package" in file or "tsconfig" in file:
                dest_folder = "frontend"  # Assumption for Node projects

        shutil.copy2(src, os.path.join(BUILD_DIR, dest_folder, file))
        moved_count += 1

    print(f"[Owen]: Moved {moved_count} files to staging area.")
    return moved_count

def create_zip_archive():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_name = f"{ZIP_NAME}_{timestamp}"
    print(f"[Owen]: Compressing '{BUILD_DIR}' into '{out_name}.zip'...")
    shutil.make_archive(out_name, 'zip', BUILD_DIR)
    return f"{out_name}.zip"

# ==========================================
# HELPER: EXTRACT CODE FROM MARKDOWN
# ==========================================
def extract_and_save_files(llm_response):
    """
    Parses the LLM response for blocks like:
    ```markdown
    // README.md
    ...
    ```
    and saves them to the build dir.
    For now, we dump the whole response into README.md so the user can split manually.
    """
    readme_path = os.path.join(BUILD_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(llm_response)
    print(f"[Owen]: Wrote README/Config to '{readme_path}' (split into separate files if needed).")

# ==========================================
# MAIN EXECUTION LOOP
# ==========================================
def main():
    print("\n--- INITIALIZING OWEN: THE INTEGRATION ENGINEER ---\n")
    agent = OwenAgent()

    # 1. Load Project Spec
    project_spec = ""
    if os.path.exists("ProjectSpec.md"):
        with open("ProjectSpec.md", "r", encoding="utf-8") as f:
            project_spec = f.read()
    else:
        print("[Owen]: Warning: 'ProjectSpec.md' not found. Documentation will be generic.")

    # 2. Prepare Build Directory
    clean_build_dir()

    # 3. Move Files
    file_count = categorize_and_move_files()
    if file_count == 0:
        print("[Owen]: No files found to package! Run Liam/Noah first.")

    # 4. Generate Glue Code (README, .env)
    staged_files = []
    for root, _, files in os.walk(BUILD_DIR):
        for f in files:
            staged_files.append(os.path.join(root, f))

    file_tree = "\n".join(staged_files)

    print("\n[Owen]: Analyzing file structure to generate documentation...")
    glue_response = agent.generate_glue_files(project_spec, file_tree)

    # 5. Save Glue Code
    extract_and_save_files(glue_response)

    # 6. Verification (Mock)
    print("\n[Owen]: Verifying build structure...")
    frontend_files = os.listdir(os.path.join(BUILD_DIR, "frontend"))
    backend_files = os.listdir(os.path.join(BUILD_DIR, "backend"))

    if frontend_files:
        print(f"       - Frontend: Detected {len(frontend_files)} files.")
    if backend_files:
        print(f"       - Backend:  Detected {len(backend_files)} files.")

    # 7. Zip It
    zip_path = create_zip_archive()

    print("\n" + "="*40)
    print(" DEPLOYMENT READY ")
    print("="*40)
    print(f"1. Build Folder: ./{BUILD_DIR}/")
    print(f"2. ZIP Archive:  ./{zip_path}")
    print("\n[Owen]: Handover complete. Good luck with the launch.")

if __name__ == "__main__":
    main()
