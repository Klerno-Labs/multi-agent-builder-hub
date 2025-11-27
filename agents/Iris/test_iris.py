import base64
import os
import sys
from pathlib import Path

# Ensure repo root is on sys.path for test execution
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from agents.Iris.iris_agent import IrisAgent


class DummyResp:
    def __init__(self, data):
        self.data = data


class DummyClient:
    class images:
        @staticmethod
        def generate(model, prompt, n, size):
            # return small red-dot PNG base64
            png = base64.b64encode(b"\x89PNG\r\n\x1a\n").decode("ascii")
            return {"data": [{"b64_json": png}]}


def test_generate_b64(tmp_path):
    outdir = tmp_path / "assets"
    client = DummyClient()
    agent = IrisAgent(client=client, asset_dir=str(outdir), simulate=False)
    res = agent.generate_dalle_image("a test prompt", filename_hint="tst")
    p = Path(res["path"])
    assert p.exists()
    assert p.suffix == ".png"
