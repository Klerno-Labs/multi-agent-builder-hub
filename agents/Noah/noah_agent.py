import os
import sys
from openai import OpenAI

API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

NOAH_SYSTEM_PROMPT = """
You are **Noah**, the Backend & API Engineer.
(Full prompt preserved here.)
"""


class NoahAgent:
    def __init__(self):
        self.messages = [{"role": "system", "content": NOAH_SYSTEM_PROMPT}]

    def generate_backend(self, project_spec, work_packages):
        user_content = (
            f"PROJECT SPEC:\n{project_spec}\n\n"
            f"WORK PACKAGES:\n{work_packages}\n\n"
            "Generate backend architecture + API code."
        )
        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Noah]: Designing backend architecture and APIs...")
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                temperature=0.25
            )
            result = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": result})
            return result

        except Exception as e:
            return f"Error communicating with Noah: {e}"


def get_multiline_input(msg):
    print(f"\n{msg}")
    print("(Type 'DONE' on a new line when finished)")
    out=[]
    while True:
        line=input()
        if line.strip()=="DONE":
            break
        out.append(line)
    return "\n".join(out)


def main():
    print("\n--- INITIALIZING NOAH: BACKEND ENGINEER ---\n")
    agent = NoahAgent()

    print("Noah: Load ProjectSpec.md? (y/n)")
    if input().strip().lower()=="y" and os.path.exists("ProjectSpec.md"):
        project_spec=open("ProjectSpec.md").read()
    else:
        project_spec=get_multiline_input("Paste Project Spec:")

    if not project_spec.strip():
        print("No ProjectSpec provided.")
        return

    print("\nNoah: Any backend work packages?")
    wp=input("Packages: ").strip()
    if not wp:
        wp="ALL BACKEND WORK PACKAGES"

    out = agent.generate_backend(project_spec, wp)

    print("\n"+"="*40)
    print(" BACKEND OUTPUT ")
    print("="*40+"\n")
    print(out)

    if input("\nSave to BackendOutput.md? (y/n): ").lower()=="y":
        with open("BackendOutput.md","w") as f:
            f.write(out)
        print("Saved BackendOutput.md")


if __name__=="__main__":
    main()
