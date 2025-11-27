import os
import sys
from openai import OpenAI

API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

LIAM_SYSTEM_PROMPT = """
You are **Liam**, the Frontend Engineer.
(Full prompt preserved here.)
"""


class LiamAgent:
    def __init__(self):
        self.messages = [{"role": "system", "content": LIAM_SYSTEM_PROMPT}]

    def generate_frontend(self, project_spec, design_spec, work_packages):
        user_content = (
            f"PROJECT SPEC:\n{project_spec}\n\n"
            f"DESIGN SPEC:\n{design_spec}\n\n"
            f"WORK PACKAGES:\n{work_packages}\n\n"
            "Generate the full frontend code output."
        )

        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Liam]: Building frontend architecture and components...")
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                temperature=0.3
            )
            response = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": response})
            return response

        except Exception as e:
            return f"Error communicating with Liam: {e}"


def get_multiline_input(label):
    print(f"\n{label}")
    print("(Type 'DONE' on a new line when finished)")
    lines=[]
    while True:
        l=input()
        if l.strip()=="DONE":
            break
        lines.append(l)
    return "\n".join(lines)


def main():
    print("\n--- INITIALIZING LIAM: FRONTEND ENGINEER ---\n")
    agent = LiamAgent()

    # Load ProjectSpec
    print("Liam: Load ProjectSpec.md? (y/n)")
    if input().strip().lower()=="y" and os.path.exists("ProjectSpec.md"):
        project_spec=open("ProjectSpec.md").read()
    else:
        project_spec=get_multiline_input("Paste Project Spec:")

    if not project_spec.strip():
        print("No ProjectSpec provided.")
        return

    # Load DesignSpec
    print("\nLiam: Load DesignSpec.md? (y/n)")
    if input().strip().lower()=="y" and os.path.exists("DesignSpec.md"):
        design_spec=open("DesignSpec.md").read()
    else:
        design_spec=get_multiline_input("Paste Design Spec:")

    if not design_spec.strip():
        print("No DesignSpec provided.")
        return

    print("\nLiam: Any specific frontend work packages?")
    wp=input("Packages: ").strip()
    if not wp:
        wp="ALL FRONTEND WORK PACKAGES"

    result = agent.generate_frontend(project_spec, design_spec, wp)

    print("\n"+"="*40)
    print(" FRONTEND OUTPUT ")
    print("="*40+"\n")
    print(result)

    if input("\nSave to FrontendOutput.md? (y/n): ").lower()=="y":
        with open("FrontendOutput.md","w") as f:
            f.write(result)
        print("Saved FrontendOutput.md")


if __name__=="__main__":
    main()
