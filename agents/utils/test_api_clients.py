from types import SimpleNamespace

import agents.utils.api_clients as api_clients


class FakeResp(SimpleNamespace):
    def json(self):
        return getattr(self, "_json", {})


def test_request_tool_approval_success(monkeypatch):
    fake = FakeResp(status_code=201)
    fake._json = {"requestId": "req-123"}

    def fake_post(url, json=None, timeout=None):
        return fake

    fake_requests = SimpleNamespace(post=fake_post)
    monkeypatch.setattr(api_clients, "requests", fake_requests)

    res = api_clients.request_tool_approval(
        "http://next",
        "AgentX",
        "pip",
        "install",
        {"packages": []},
    )
    assert res == "req-123"


def test_poll_tool_approval_returns_on_approved(monkeypatch):
    # simulate two calls: first returns pending, second returns approved
    calls = {"n": 0}

    def fake_get(url, timeout=None):
        calls["n"] += 1
        if calls["n"] == 1:
            return FakeResp(status_code=200, _json={})
        return FakeResp(status_code=200, _json={"approved": True})

    fake_requests = SimpleNamespace(get=fake_get)
    monkeypatch.setattr(api_clients, "requests", fake_requests)

    # use small poll interval/timeout to keep test fast
    result = api_clients.poll_tool_approval(
        "http://next",
        "req-1",
        poll_interval=0.01,
        timeout=1,
    )
    assert result is not None
    assert result.get("approved") is True


def test_start_pipeline_success(monkeypatch):
    fake = FakeResp(status_code=200)
    fake._json = {"started": True}

    def fake_post(url, json=None, timeout=None):
        return fake

    fake_requests = SimpleNamespace(post=fake_post)
    monkeypatch.setattr(api_clients, "requests", fake_requests)

    r = api_clients.start_pipeline("http://next", "proj-1")
    assert r == {"started": True}
