import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, Optional

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


KAI_SYSTEM_PROMPT = """
You are **Kai**, the Web3 Engineer.
(Full prompt preserved here.)
"""


def _build_client(api_key: Optional[str] = None):
    if OpenAI is None:
        return None
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


class KaiAgent:
    def __init__(
        self,
        client: Optional[Any] = None,
        simulate: bool = False,
        logger: Optional[logging.Logger] = None,
    ):
        self.client = client
        self.simulate = simulate
        self.logger = logger or logging.getLogger("KaiAgent")
        self.messages = [{"role": "system", "content": KAI_SYSTEM_PROMPT}]

    def generate_smart_contract(
        self, project_spec: str, chain_preference: str, task: str
    ) -> Dict[str, Any]:
        """Generate smart contract, deployment script, and frontend notes.

        Returns a dict: { contract: str, deploy: str, frontend: str }
        """
        user_content = (
            f"CONTEXT (PROJECT SPEC):\n{project_spec}\n\n"
            f"TARGET CHAIN/STACK:\n{chain_preference}\n\n"
            f"CURRENT TASK:\n{task}\n\n"
            "Instructions:\n"
            "1. Return JSON with keys: contract, deploy_script, "
            "frontend_notes.\n"
            "2. If JSON is not possible, return a plain-text result\n"
            "under the 'contract' key."
        )
        self.messages.append({"role": "user", "content": user_content})

        if self.simulate or not self.client:
            # simulation placeholder
            contract_text = (
                "// SIMULATED CONTRACT FOR TESTING\n"
                "contract Simulated "
                + task.replace(" ", "_")
                + " {}\n"
            )
            return {
                "contract": contract_text,
                "deploy_script": "# Simulated deploy script",
                "frontend_notes": "Simulated frontend integration notes",
            }

        try:
            # add retry loop with exponential backoff for LLM calls
            import time
            import random

            max_attempts = 3
            text = None
            resp = None
            for attempt in range(1, max_attempts + 1):
                try:
                    try:
                        completion = self.client.chat.completions.create(
                            model="gpt-4o",
                            messages=self.messages,
                            temperature=0.1,
                        )
                        text = completion.choices[0].message.content
                        resp = completion
                    except Exception:
                        resp = self.client.chat.create(
                            model="gpt-4o", messages=self.messages
                        )
                        if hasattr(resp, "choices") and resp.choices:
                            choice = resp.choices[0]
                            if isinstance(choice, dict):
                                text = choice.get("message", {}).get("content")
                            else:
                                msg = getattr(choice, "message", None)
                                text = getattr(msg, "content", None)
                        if text is None:
                            text = json.dumps(resp, default=str)
                    break
                except Exception:
                    if attempt == max_attempts:
                        raise
                    backoff = (0.5 * (2 ** (attempt - 1))) * (
                        0.5 + random.random() * 0.5
                    )
                    time.sleep(backoff)

            # attempt to parse JSON from assistant; fall back to raw text
            try:
                parsed = json.loads(text)
                # ensure keys exist
                return {
                    "contract": (
                        parsed.get("contract")
                        or parsed.get("contract_code")
                        or text
                    ),
                    "deploy_script": parsed.get("deploy_script")
                    or parsed.get("deploy")
                    or "",
                    "frontend_notes": parsed.get("frontend_notes")
                    or parsed.get("frontend")
                    or "",
                }
            except Exception:
                # return raw assistant content under contract
                return {
                    "contract": text,
                    "deploy_script": "",
                    "frontend_notes": "",
                }
        except Exception as exc:
            self.logger.exception("Kai generation failed")
            return {"error": str(exc)}


def get_multiline_input(msg: str) -> str:
    print(f"\n{msg}")
    print("(Type 'DONE' when finished)")
    out = []
    while True:
        line = input()
        if line.strip() == "DONE":
            break
        out.append(line)
    return "\n".join(out)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Kai agent (interactive or non-interactive)"
    )
    parser.add_argument("--spec", help="Path to ProjectSpec.md or - for stdin")
    parser.add_argument("--chain", help="Target chain (e.g., Ethereum)")
    parser.add_argument("--task", help="On-chain task to implement")
    parser.add_argument("--api-key", help="OpenAI API key (optional)")
    parser.add_argument(
        "--simulate", action="store_true", help="Run in simulation mode"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    client = _build_client(args.api_key)
    agent = KaiAgent(client=client, simulate=args.simulate)

    spec = ""
    if args.spec:
        if args.spec == "-":
            spec = sys.stdin.read()
        elif os.path.exists(args.spec):
            spec = open(args.spec, "r", encoding="utf-8").read()
    if not spec:
        spec = get_multiline_input("Paste Project Spec:")
    if not spec.strip():
        print("Missing ProjectSpec, exiting.")
        return

    chain = (
        args.chain
        or input("Network (default: Ethereum): ")
        or "Ethereum (EVM) using Hardhat"
    )
    task = args.task or input("Task (default: ERC-20): ")
    if not task:
        task = "Standard ERC-20 Token"

    result = agent.generate_smart_contract(spec, chain, task)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
