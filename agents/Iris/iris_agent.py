import argparse
import base64
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from time import sleep
from typing import Optional, Any, Dict, List

import requests

try:
    # dynamic import to avoid hard dependency at import-time for tests
    from openai import OpenAI
except Exception:
    OpenAI = None


IRIS_SYSTEM_PROMPT = (
    "You are **Iris**, the Image & Asset Creator. "
    "(Full prompt preserved.)"
)


class IrisAgent:
    def __init__(
        self,
        client: Optional[object] = None,
        asset_dir: str = "assets",
        session: Optional[requests.Session] = None,
        simulate: bool = False,
        logger: Optional[logging.Logger] = None,
    ):
        self.client = client
        self.asset_dir = Path(asset_dir)
        self.asset_dir.mkdir(parents=True, exist_ok=True)
        self.session = session or requests.Session()
        self.simulate = simulate
        self.logger = logger or logging.getLogger("IrisAgent")
        self.messages = [{"role": "system", "content": IRIS_SYSTEM_PROMPT}]

    def chat(self, user_input: str) -> str:
        self.messages.append({"role": "user", "content": user_input})
        if self.simulate:
            out = "(simulated) asset list and prompts"
            self.messages.append({"role": "assistant", "content": out})
            return out

        if not self.client:
            raise RuntimeError("No OpenAI client configured for chat")

        try:
            # try common SDK shapes
            try:
                completion = self.client.chat.completions.create(
                    model="gpt-4o", messages=self.messages, temperature=0.7
                )
                out = completion.choices[0].message.content
            except Exception:
                # fallback to other shape
                resp = self.client.chat.create(
                    model="gpt-4o", messages=self.messages
                )
                # attempt to extract text
                out = None
                if hasattr(resp, "choices") and resp.choices:
                    choice = resp.choices[0]
                    if isinstance(choice, dict):
                        out = choice.get("message", {}).get("content")
                    else:
                        msg = getattr(choice, "message", None)  # type: ignore[arg-type]
                        out = None
                        if msg is not None:
                            out = getattr(msg, "content", None)
                if out is None:
                    out = json.dumps(resp, default=str)

            self.messages.append({"role": "assistant", "content": out})
            return out
        except Exception:
            self.logger.exception("chat failed")
            raise

    def generate_dalle_image(
        self,
        prompt: str,
        filename_hint: str = "generated_image",
    ) -> Dict[str, Any]:
        """Generate an image from prompt.

        Returns a dict with keys `path` and `source`.
        Handles URL or base64 payloads.
        """
        self.logger.info("Sending prompt to image API: %s", prompt[:80])

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_hint = "".join(
            c for c in filename_hint if c.isalnum() or c in ("-", "_")
        ) or "iris_asset"
        out_path = self.asset_dir / f"{safe_hint}_{ts}.png"

        if self.simulate:
            # create a small placeholder file
            out_path.write_bytes(b"SIMULATED_IMAGE")
            return {"path": str(out_path), "source": "simulated"}

        if not self.client:
            raise RuntimeError("No image client configured")

        # Call image generation (wrap in try/except for different SDK shapes)
        try:
            resp = self.client.images.generate(
                model="dall-e-3", prompt=prompt, n=1, size="1024x1024"
            )
        except Exception:
            # try alternate call
            resp = self.client.images.create(
                model="dall-e-3", prompt=prompt, n=1, size="1024x1024"
            )

        data0: Any = None
        if hasattr(resp, "data"):
            # SDK object shape
            data0 = resp.data[0] if resp.data else None
        elif isinstance(resp, dict):
            # dict shape returned by some clients
            data = resp.get("data")
            data0 = data[0] if data else None

        if not data0:
            raise RuntimeError("No image data returned from API")

        # prefer URL if present
        image_bytes: Any = None
        source: Any = None
        if getattr(data0, "url", None):
            url = data0.url
            source = url
            # simple retry loop for downloading
            for attempt in range(3):
                try:
                    r = self.session.get(url, timeout=10)
                    r.raise_for_status()
                    image_bytes = r.content
                    break
                except Exception:
                    sleep(0.5 * (attempt + 1))
            if image_bytes is None:
                raise RuntimeError("Failed to fetch image from url")
        else:
            # look for base64
            # support SDK object or dict shapes for base64 payloads
            b64 = (
                getattr(data0, "b64_json", None)
                or (data0.get("b64_json") if isinstance(data0, dict) else None)
            )
            if b64:
                source = "b64_json"
                image_bytes = base64.b64decode(b64)

        if not image_bytes:
            raise RuntimeError("Image payload missing URL and base64 data")

        out_path.write_bytes(image_bytes)
        return {"path": str(out_path), "source": source}


def get_multiline_input(msg: str) -> str:
    print(f"\n{msg}")
    print("(Type 'DONE' when finished)")
    lines: List[str] = []
    while True:
        line = input()
        if line.strip() == "DONE":
            break
        lines.append(line)
    return "\n".join(lines)


def _build_default_client(api_key: Optional[str] = None):
    if OpenAI is None:
        return None
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", help="Prompt to generate an image from")
    parser.add_argument(
        "--spec",
        action="store_true",
        help="Load DesignSpec.md if present and make an asset plan",
    )
    parser.add_argument("--out", help="Filename hint")
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="Run in simulation mode",
    )
    parser.add_argument("--api-key", help="OpenAI API key (optional)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    client = _build_default_client(args.api_key)
    agent = IrisAgent(client=client, simulate=args.simulate)

    spec = ""
    if args.spec and Path("DesignSpec.md").exists():
        spec = Path("DesignSpec.md").read_text(encoding="utf-8")
    elif not args.prompt:
        spec = get_multiline_input("Paste Design Spec:")

    if args.spec or spec:
        prompt_text = (
            "Design Spec:\n" + spec + "\n"
            "List critical image assets and prompts."
        )
        plan = agent.chat(prompt_text)
        print("\n" + "=" * 40)
        print(" ASSET PLAN ")
        print("=" * 40 + "\n")
        print(plan)

    if args.prompt:
        out_hint = args.out or "iris_asset"
        res = agent.generate_dalle_image(args.prompt, filename_hint=out_hint)
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
