"""
Agent adapter helper used by Mia orchestrator.
Provides `AgentAdapter` which wraps existing agent classes (if available)
and offers `log()` and `think()` helpers. In SIMULATION mode `think`
returns a deterministic stub so the orchestrator can run without API keys.
"""
import os
import random
import json
import time
from typing import Any, Optional

# Control simulation via environment variable `SIMULATION`.
# Set `SIMULATION=false` to run live (delegate to real agent implementations).
_sim_env = os.getenv("SIMULATION")
if _sim_env is None:
    # If SIMULATION not explicitly set, enable live mode when an API key is present
    SIMULATION = not bool(os.getenv("OPENAI_API_KEY"))
else:
    SIMULATION = _sim_env.lower() in ("1", "true", "yes")


class AgentAdapter:
    def __init__(self, name: str, impl: Optional[Any] = None):
        self.name = name
        self.impl = impl

    def log(self, msg: str):
        ts = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{ts}] {self.name}: {msg}")

    def think(self, prompt: str) -> str:
        """Return a simulated or delegated response for the agent.

        If SIMULATION is True (default) this returns a short, deterministic
        stub based on the agent name and prompt. If an implementation is
        provided and SIMULATION is False, it will try to call a sensible
        method (like `chat`, `generate_spec`, `generate_design`, etc.).
        """
        self.log(f"thinking -> {prompt[:120]}...")
        if SIMULATION or not self.impl:
            # Deterministic, readable stub
            base = f"SIMULATED RESPONSE from {self.name}"
            low = prompt.lower()
            if 'question' in low or 'ask' in low:
                return base + ": Answer to question."
            if 'work package' in low or 'workpackage' in low:
                # return JSON workpackage list
                wps = [
                    {
                        "id": f"{self.name.lower()}-wp-1",
                        "owner": self.name.lower(),
                        "title": f"{self.name} task 1",
                        "status": "queued",
                    }
                ]
                return json.dumps({"workPackages": wps})
            if 'qa' in low or 'checks' in low:
                # random HIGH/OK
                issue = random.choice(["OK", "HIGH"])
                return json.dumps({
                    "result": issue,
                    "notes": "Simulated check",
                })
            if 'package' in low or 'zip' in low:
                return base + ": created project_bundle_v1.zip"
            # generic fallback
            return base + ": done"

        # Delegate to impl
        # Try common method names
        for method_name in (
            "chat",
            "generate_spec",
            "generate_design",
            "generate_frontend",
            "create_test_plan",
            "generate_glue_files",
            "create_zip_archive",
        ):
            if hasattr(self.impl, method_name):
                method = getattr(self.impl, method_name)
                try:
                    return method(prompt)
                except TypeError:
                    # method has different signature; try calling without args
                    try:
                        return method()
                    except Exception as e:
                        return (
                            "ERROR delegating to "
                            f"{self.name}.{method_name}: {e}"
                        )

        return f"{self.name}: no implementation available"
