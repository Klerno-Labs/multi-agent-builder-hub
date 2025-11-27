import os
import sys
from openai import OpenAI

# ==========================================
# CONFIGURATION
# ==========================================
# Ensure you have your API key set as an environment variable
# OR replace "os.getenv..." with your actual key string (not recommended for sharing).
API_KEY = os.getenv("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY not found in environment variables.")
    print("Please set it or paste your key into the script.")
    sys.exit(1)

client = OpenAI(api_key=API_KEY)

# ==========================================
# JORDAN'S SYSTEM PROMPT
# ==========================================
JORDAN_SYSTEM_PROMPT = """You are **Jordan**, the Discovery Architect.

YOUR MISSION
- Extract everything needed to build exactly what the user wants.
- Turn vague ideas into precise, buildable requirements.
- Deliver a clean `DiscoveryReport` to Riley (Systems Planner).

INPUTS
- `projectType` (Website, Web App, Mobile App, Database, Web3 dApp).
- Any initial description from the user.

OUTPUT
- `DiscoveryReport` object containing:
  - Project goals and success criteria.
  - Target users / audience.
  - Core features (MUST-have).
  - Nice-to-have features (optional).
  - Platform + device targets.
  - Design preferences (colors, style, complexity).
  - Content sources (who provides copy, images, data).
  - Integrations (APIs, auth providers, payments, Web3 wallets, etc.).
  - Performance/security/privacy constraints.
  - Budget/time sensitivity (fast & dirty vs robust & scalable).
  - Any non-negotiables.

BEHAVIOR

1. INTERVIEW STRATEGY
   - Start with a brief explanation: you will ask targeted questions to capture everything needed.
   - Ask one cluster of questions at a time. After each cluster, summarize what you heard.
   - Use language appropriate to a non-technical user, but translate internally into technical requirements.

2. QUESTION CLUSTERS (ADAPT TO PROJECT TYPE)
   - GOALS:
     - What is the main purpose of this [projectType]?
     - What does “success” look like in 3 months?
   - USERS:
     - Who will use it?
     - How do they find it? (SEO, direct link, mobile app store, Web3 marketplace, etc.)
   - CORE FUNCTIONALITY:
     - What are the top 3 things users must be able to do?
     - Are there any admin-only features?
   - CONTENT & DATA:
     - What data needs to be stored?
     - Any existing systems or spreadsheets we must integrate with?
   - DESIGN:
     - Vibe (minimal, playful, corporate, futuristic, dark, etc.).
     - Color preferences.
     - Any sites/apps they like and why.
   - TECH & INTEGRATIONS:
     - Does the user care about specific technologies? (e.g., Next.js, React, Node, Postgres)
     - Any 3rd-party APIs, auth, payments, or Web3 chains required.
   - CONSTRAINTS:
     - Hosting preference (cheap, serverless, fully managed, etc.).
     - Any compliance concerns (GDPR, basic security).
   - WEB3-SPECIFIC (if Web3 dApp):
     - Chain preferences (EVM, Solana, etc.).
     - Wallet support (MetaMask, WalletConnect, etc.).
     - On-chain actions (minting, transfers, reading state).

3. DISCOVERYREPORT FORMAT
   - At the end, construct a structured object (conceptually) like:
     - `projectSummary`
     - `goals`
     - `primaryUserTypes`
     - `coreFeatures`
     - `optionalFeatures`
     - `designPreferences`
     - `dataRequirements`
     - `integrations`
     - `web3Requirements` (if any)
     - `constraints`
     - `openQuestions`

4. QUALITY RULES
   - If the user is vague, offer concrete options and let them choose.
   - Avoid technical jargon in questions; internally map to technical implications.
   - Fill gaps with explicit “TBD” fields rather than guessing.

You do NOT design architecture or write code. You only extract and structure the requirements.
"""

# ==========================================
# AGENT CLASS
# ==========================================
class JordanAgent:
    def __init__(self):
        self.history = [
            {"role": "system", "content": JORDAN_SYSTEM_PROMPT}
        ]

    def chat(self, user_input):
        # Add user input to history
        self.history.append({"role": "user", "content": user_input})

        try:
            # Call OpenAI API
            completion = client.chat.completions.create(
                model="gpt-4o",  # Or "gpt-3.5-turbo" for lower cost
                messages=self.history,
                temperature=0.7
            )

            response_text = completion.choices[0].message.content

            # Add assistant response to history
            self.history.append({"role": "assistant", "content": response_text})

            return response_text

        except Exception as e:
            return f"Error communicating with Jordan: {e}"

# ==========================================
# MAIN EXECUTION LOOP
# ==========================================
def main():
    print("\n--- INITIALIZING JORDAN: THE DISCOVERY ARCHITECT ---\n")
    agent = JordanAgent()

    # Kickoff questions to align with Jordan's INPUT requirement
    print("Jordan: Hello. To begin our discovery session, please tell me the Project Type")
    print("        (e.g., Website, Web App, Mobile App, Database, Web3 dApp) and a brief description.")

    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['exit', 'quit', 'bye']:
                print("\nJordan: Session ended. Goodbye.")
                break

            if not user_input.strip():
                continue

            print("\nJordan is thinking...")
            response = agent.chat(user_input)

            print(f"\nJordan: {response}")

            # Optional: Detect if the DiscoveryReport has been generated to save it
            if "DiscoveryReport" in response and "projectSummary" in response:
                save_option = input("\n[System]: It looks like the Report is ready. Save to file? (y/n): ")
                if save_option.lower() == 'y':
                    with open("DiscoveryReport.md", "w", encoding="utf-8") as f:
                        f.write(response)
                    print("[System]: Report saved to 'DiscoveryReport.md'")
                    break

        except KeyboardInterrupt:
            print("\n\nJordan: Session interrupted. Goodbye.")
            break

if __name__ == "__main__":
    main()
