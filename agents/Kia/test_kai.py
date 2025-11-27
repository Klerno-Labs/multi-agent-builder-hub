import sys
import os
from pathlib import Path

# allow tests to import agents package
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agents.Kia.kai_agent import KaiAgent


def test_kai_simulation_returns_structure(tmp_path):
    agent = KaiAgent(client=None, simulate=True)
    res = agent.generate_smart_contract("spec", "Ethereum", "ERC20")
    assert isinstance(res, dict)
    assert "contract" in res
    assert "deploy_script" in res
    assert "frontend_notes" in res


class FakeCompletion:
    def __init__(self, text):
        self.choices = [type('C', (), {'message': type('M', (), {'content': text})})()]


class FakeClient:
    class chat:
        @staticmethod
        def create(model, messages):
            return FakeCompletion('{"contract": "code", "deploy_script": "deploy", "frontend_notes": "notes"}')


def test_kai_with_fake_client_parses_json(tmp_path):
    fake = FakeClient()
    agent = KaiAgent(client=fake, simulate=False)
    res = agent.generate_smart_contract("spec", "Ethereum", "ERC20")
    assert res.get("contract") == "code"
    assert res.get("deploy_script") == "deploy"
    assert res.get("frontend_notes") == "notes"
