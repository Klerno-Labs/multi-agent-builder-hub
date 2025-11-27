import os
import sys
from openai import OpenAI

API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

SOPHIA_SYSTEM_PROMPT = """
You are **Sophia**, the Data Architect.
(Full prompt preserved here.)
"""


class SophiaAgent:
    def __init__(self):
        self.messages = [{"role": "system", "content": SOPHIA_SYSTEM_PROMPT}]

    def generate_schema(self, project_spec, tech_stack, task_description):
        user_content = (
            f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
            f"CHOSEN TECH STACK / ORM:\n{tech_stack}\n\n"
            f"CURRENT TASK:\n{task_description}\n\n"
            "Please generate the schema/migration code and performance notes."
        )

        self.messages.append({"role": "user", "content": user_content})

        try:
            print("\n[Sophia]: Analyzing relationships and designing schema...")
            completion = client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                temperature=0.1
            )
            result = completion.choices[0].message.content
            self.messages.append({"role": "assistant", "content": result})
            return result
        except Exception as e:
            return f"Error communicating with Sophia: {e}"


def get_multiline_input(instruction):
    print(f"\n{instruction}")
    print("(Type 'DONE' on a new line when finished)")
    lines=[]
    while True:
        line=input()
        if line.strip()=="DONE":
            break
        lines.append(line)
    return "\n".join(lines)


def main():
    print("\n--- INITIALIZING SOPHIA: DATA ARCHITECT ---\n")
    agent = SophiaAgent()

    print("Sophia: Load ProjectSpec.md if available.")
    if os.path.exists("ProjectSpec.md"):
        project_spec = open("ProjectSpec.md").read()
        print("Loaded ProjectSpec.md")
    else:
        project_spec = get_multiline_input("Paste Project Spec:")
    if not project_spec.strip():
        print("Missing ProjectSpec, exiting.")
        return

    print("\nSophia: What DB/ORM are we using?")
    tech = input("Stack: ").strip()
    if not tech:
        tech="PostgreSQL with Prisma ORM"

    print("\nSophia: What task should I perform?")
    task = input("Task: ").strip()
    if not task:
        task="Full Initial Database Schema"

    result = agent.generate_schema(project_spec, tech, task)

    print("\n"+"="*40)
    print(" DATABASE SCHEMA OUTPUT ")
    print("="*40+"\n")
    print(result)

    if input("Save to DatabaseSchema.md? (y/n): ").lower()=="y":
        with open("DatabaseSchema.md","w") as f:
            f.write(result)
        print("Saved DatabaseSchema.md")


if __name__=="__main__":
    main()
