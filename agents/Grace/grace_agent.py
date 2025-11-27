import os
import sys
import re
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
# GRACE'S SYSTEM PROMPT
# ==========================================
GRACE_SYSTEM_PROMPT = """
You are **Grace**, the Code Auditor.

YOUR MISSION
- Enforce code quality, consistency, and basic security/performance standards.
- You are strict but helpful.

INPUTS
- `ProjectSpec` (Architecture Intent).
- Source Code snippets.

OUTPUTS
- `IssueList`: A structured table of findings.
  - Columns: [Severity] [File/Area] [Issue Description] [Suggested Fix]

BEHAVIOR
1. SECURITY FIRST
   - Flag any potential SQL injection, XSS vulnerabilities, or exposed secrets (API keys).
2. CODE QUALITY (SMELLS)
   - Flag "God Functions" (too large/complex).
   - Flag "Spaghetti Code" (nested ifs, callbacks).
   - Flag hardcoded magic numbers/strings.
3. ARCHITECTURE
   - Ensure separation of concerns (e.g., Database logic shouldn't be in the View layer).
4. PERFORMANCE
   - Flag obvious N+1 queries or heavy computations in render loops.

FORMATTING
- Use Markdown tables for the Issue List.
- Provide code snippets for the "Suggested Fix" where possible.
"""

# ==========================================
# AGENT CLASS
# ==========================================
class GraceAgent:
    def __init__(self):
        self.messages = [
            {"role": "system", "content": GRACE_SYSTEM_PROMPT}
        ]

    # --- AI ANALYSIS ---
    def deep_audit(self, project_spec, code_content, filename="Unknown"):
        """
        Sends code to LLM for semantic analysis.
        """
        user_content = (
            f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
            f"FILE NAME: {filename}\n"
            f"CODE TO AUDIT:\n{code_content}\n\n"
            "Please perform a deep audit on this code. Look for security, performance, and style issues."
        )
        self.messages.append({"role": "user", "content": user_content})
        
        try:
            print(f"\n[Grace]: deeply analyzing logic in '{filename}'...")
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                temperature=0.1 
            )
            response = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": response})
            return response
        except Exception as e:
            return f"Error: {e}"

    # --- HEURISTIC SCANS (Python-based, fast, no API cost) ---
    def scan_for_secrets(self, directory="."):
        """
        Simple regex scan for potential hardcoded secrets.
        """
        print(f"\n[Grace]: Scanning '{directory}' for hardcoded secrets...")
        issues = []
        # Patterns for common keys (simplified)
        patterns = {
            "Generic Secret": r'(?i)(secret|password|api_key|access_token)\s*[:=]\s*["\'][a-zA-Z0-9_\-]{8,}["\']',
            "Private Key": r'-----BEGIN PRIVATE KEY-----'
        }
        
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.tsx', '.json', '.env')):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            for p_name, p_regex in patterns.items():
                                if re.search(p_regex, content):
                                    issues.append(f"CRITICAL | {path} | Possible {p_name} found hardcoded.")
                    except Exception:
                        pass
        return issues

    def scan_file_sizes(self, directory=".", limit=300):
        """
        Flags files that are too large (anti-pattern).
        """
        print(f"\n[Grace]: Scanning for files exceeding {limit} lines...")
        issues = []
        for root, _, files in os.walk(directory):
            if "node_modules" in root or ".git" in root or "venv" in root:
                continue
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.tsx')):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            if lines > limit:
                                issues.append(f"MEDIUM   | {path} | File is too large ({lines} lines). Consider splitting.")
                    except:
                        pass
        return issues

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
    print("\n--- INITIALIZING GRACE: THE CODE AUDITOR ---\n")
    agent = GraceAgent()

    # 1. Load Project Spec
    project_spec = ""
    if os.path.exists("ProjectSpec.md"):
        with open("ProjectSpec.md", "r") as f:
            project_spec = f.read()
            print("[System]: Loaded ProjectSpec.md")
    else:
        print("[System]: ProjectSpec.md not found. (Auditing will lack architectural context)")

    while True:
        print("\n" + "="*40)
        print(" AUDIT MENU ")
        print("="*40)
        print("1. Quick Static Scan (Secrets & File Size) - No API Cost")
        print("2. Deep AI Audit (Paste Code)")
        print("3. Deep AI Audit (Read Local File)")
        print("4. Exit")
        
        choice = input("\nSelect Action: ").strip()

        if choice == '1':
            target_dir = input("Directory to scan (default '.'): ").strip() or "."
            
            # Run Secrets Scan
            secret_issues = agent.scan_for_secrets(target_dir)
            # Run Size Scan
            size_issues = agent.scan_file_sizes(target_dir)
            
            all_issues = secret_issues + size_issues
            
            print("\n" + "-"*20 + " SCAN RESULTS " + "-"*20)
            if not all_issues:
                print("No obvious issues found by static scanner.")
            else:
                for issue in all_issues:
                    print(issue)

        elif choice == '2':
            print("\nGrace: Paste the code snippet below.")
            code = get_multiline_input("Code:")
            if code.strip():
                response = agent.deep_audit(project_spec, code, filename="Snippet")
                print("\n" + "-"*20 + " AUDIT REPORT " + "-"*20)
                print(response)

        elif choice == '3':
            fname = input("Enter filename (e.g., 'server.py'): ").strip()
            if os.path.exists(fname):
                with open(fname, 'r') as f:
                    code = f.read()
                response = agent.deep_audit(project_spec, code, filename=fname)
                print("\n" + "-"*20 + " AUDIT REPORT " + "-"*20)
                print(response)
                
                # Save Report
                save = input("\nSave report to 'AuditReport.md'? (y/n): ")
                if save.lower() == 'y':
                    with open("AuditReport.md", "w") as f:
                        f.write(response)
                    print("Saved.")
            else:
                print("File not found.")

        elif choice == '4':
            print("Grace: Keep your code clean. Goodbye.")
            break

if __name__ == "__main__":
    main()
