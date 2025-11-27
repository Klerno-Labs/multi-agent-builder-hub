from types import SimpleNamespace
from agents.Mia import http_utils


class FakeResp(SimpleNamespace):
    pass


def test_try_patch_refetch_and_retry():
    calls = {"patch_calls": 0, "get_calls": 0}

    def fake_patch(url, json=None, timeout=None, headers=None):
        calls["patch_calls"] += 1
        # first call simulates a 409 conflict, second call succeeds
        if calls["patch_calls"] == 1:
            return FakeResp(status_code=409, text="Conflict: stale data")
        return FakeResp(status_code=200, text="OK")

    def fake_get(url, timeout=None):
        calls["get_calls"] += 1
        return FakeResp(status_code=200, text="{\"id\": \"abc\"}")

    fake_requests = SimpleNamespace(patch=fake_patch, get=fake_get)

    resp = http_utils.try_patch(
        "http://example/api/projects/1",
        json_body={"a": 1},
        retries=3,
        backoff=0.01,
        requests_module=fake_requests,
        get_callable=fake_get,
    )
    assert resp is not None
    assert getattr(resp, "status_code", None) == 200
    assert calls["patch_calls"] >= 2
    assert calls["get_calls"] >= 1
