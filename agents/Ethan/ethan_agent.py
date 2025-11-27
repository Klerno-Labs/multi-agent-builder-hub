import os
import sys
from openai import OpenAI

API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

TEST_DIR = "tests"
if not os.path.exists(TEST_DIR):
    os.makedirs(TEST_DIR)

ETHAN_SYSTEM_PROMPT = """You are **Ethan**, the QA Engineer.
(Full prompt preserved.)"""


class EthanAgent:
    def __init__(self):
        self.messages=[{"role":"system","content":ETHAN_SYSTEM_PROMPT}]

    def create_test_plan(self, project_spec):
        msg=(f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
             "Please generate a Test Plan listing the top 3-5 Critical User Journeys (CUJs).")
        self.messages.append({"role":"user","content":msg})
        return self._call()

    def write_test_code(self, project_spec, code_context, test_type="Unit"):
        msg=(f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
             f"CODE TO TEST:\n{code_context}\n\n"
             f"TASK: Write a {test_type} Test suite.")
        self.messages.append({"role":"user","content":msg})
        return self._call()

    def analyze_error(self,error_log):
        msg=(f"ERROR LOG:\n{error_log}\n\n"
             "Analyze this error. Return IssueList + fix.")
        self.messages.append({"role":"user","content":msg})
        return self._call()

    def _call(self):
        try:
            print("\n[Ethan]: Analyzing...")
            comp=client.chat.completions.create(
                model="gpt-4o",
                messages=self.messages,
                temperature=0.1
            )
            res=comp.choices[0].message.content
            self.messages.append({"role":"assistant","content":res})
            return res
        except Exception as e:
            return f"Error: {e}"


def get_multiline_input(txt):
    print(f"\n{txt}")
    print("(Type 'DONE' to finish)")
    out=[]
    while True:
        l=input()
        if l.strip()=="DONE": break
        out.append(l)
    return "\n".join(out)


def main():
    print("\n--- INITIALIZING ETHAN: QA ENGINEER ---\n")
    agent=EthanAgent()

    print("Ethan: Load ProjectSpec.md? (y/n)")
    if input().strip().lower()=="y" and os.path.exists("ProjectSpec.md"):
        ps=open("ProjectSpec.md").read()
    else:
        ps=get_multiline_input("Paste Project Spec:")
    if not ps.strip():
        print("Missing Project Spec."); return

    while True:
        print("\n1. Generate Test Plan")
        print("2. Write Test Code")
        print("3. Analyze Error Log")
        print("4. Exit")
        c=input("Choice: ").strip()
        if c=="1":
            r=agent.create_test_plan(ps)
            print(r)
            open("TestPlan.md","w").write(r)
        elif c=="2":
            cc=get_multiline_input("Paste Code:")
            tt=input("Type (Unit/E2E/Integration): ")
            r=agent.write_test_code(ps,cc,tt)
            print(r)
            fn=input("Save filename: ").strip()
            if fn:
                open(os.path.join(TEST_DIR,fn),"w").write(r)
        elif c=="3":
            el=get_multiline_input("Paste Error Log:")
            print(agent.analyze_error(el))
        elif c=="4":
            break

if __name__=="__main__":
    main()
