from pathlib import Path
import sys
import os

# ensure repo root is on sys.path so tests can import agents package
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agents.Iris.iris_agent import IrisAgent


SAMPLE_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNg"
    "YAAAAAMAASsJTYQAAAAA"
)


def test_simulation_mode_writes_placeholder(tmp_path):
    out_dir = tmp_path / "assets"
    agent = IrisAgent(client=None, asset_dir=str(out_dir), simulate=True)
    res = agent.generate_dalle_image("any prompt", filename_hint="sim_test")
    assert isinstance(res, dict)
    assert res.get("source") == "simulated"
    p = Path(res.get("path"))
    assert p.exists()
    assert p.read_bytes() == b"SIMULATED_IMAGE"


def test_base64_image_written(tmp_path):
    out_dir = tmp_path / "assets"

    class FakeImages:
        def __init__(self, b64):
            self._b64 = b64

        def generate(self, model, prompt, n, size):
            return {"data": [{"b64_json": self._b64}]}

        def create(self, model, prompt, n, size):
            return self.generate(model, prompt, n, size)

    fake_client = type("C", (), {"images": FakeImages(SAMPLE_PNG_B64)})()
    agent = IrisAgent(
        client=fake_client, asset_dir=str(out_dir), simulate=False
    )
    res = agent.generate_dalle_image(
        "create a tiny png", filename_hint="b64test"
    )
    assert isinstance(res, dict)
    assert res.get("source") == "b64_json"
    p = Path(res.get("path"))
    assert p.exists()
    # ensure file size > 0
    assert p.stat().st_size > 0
