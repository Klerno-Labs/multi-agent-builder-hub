"""Clean HTTP helpers for retries, backoff, idempotency and optimistic re-fetch.

This module centralizes robust POST/PATCH helpers for agent -> Next API calls.
"""
from typing import Any, Callable, Optional
import time
import random


def _default_requests_module():
    try:
        import requests

        return requests
    except Exception:
        return None


def try_post(
    url: str,
    json_body: Any = None,
    retries: int = 3,
    backoff: float = 0.5,
    requests_module: Optional[Any] = None,
):
    import uuid

    requests_module = requests_module or _default_requests_module()
    last_resp = None
    idempotency = str(uuid.uuid4())
    for attempt in range(1, retries + 1):
        try:
            if requests_module:
                resp = requests_module.post(
                    url,
                    json=json_body,
                    timeout=10,
                    headers={"Idempotency-Key": idempotency},
                )
            else:
                raise RuntimeError("No requests module available for POST")

            last_resp = resp
            code = getattr(resp, "status_code", None)
            if code in (200, 201):
                return resp
            print(
                f"Attempt {attempt}: POST {url} returned {code}"
            )
        except Exception as exc:
            print(f"Attempt {attempt}: POST {url} failed: {exc}")

        delay = backoff * (2 ** (attempt - 1))
        delay = delay * (0.5 + random.random() * 0.5)
        time.sleep(delay)
    return last_resp


def try_patch(
    url: str,
    json_body: Any = None,
    retries: int = 3,
    backoff: float = 0.5,
    requests_module: Optional[Any] = None,
    get_callable: Optional[Callable] = None,
):
    """Try PATCH with idempotency header and optimistic re-fetch.

    If `get_callable` is provided it will be used to re-fetch the
    resource (signature: get_callable(url) -> resp).
    """
    import uuid

    requests_module = requests_module or _default_requests_module()
    last_resp = None
    idempotency = str(uuid.uuid4())
    for attempt in range(1, retries + 1):
        try:
            if not requests_module:
                raise RuntimeError("No requests module for try_patch")

            resp = requests_module.patch(
                url,
                json=json_body,
                timeout=10,
                headers={"Idempotency-Key": idempotency},
            )
            last_resp = resp
            code = getattr(resp, "status_code", None)
            text = getattr(resp, "text", "") or ""

            if code in (200, 201):
                return resp

            need_refetch = (
                code in (409, 422)
                or "invalid" in text.lower()
                or "not found" in text.lower()
            )
            if need_refetch and get_callable is not None:
                # Best-effort re-fetch; protect the GET call
                try:
                    get_resp = get_callable(url)
                except Exception:
                    get_resp = None

                if getattr(get_resp, "status_code", None) == 200:
                    try:
                        resp2 = requests_module.patch(
                            url,
                            json=json_body,
                            timeout=10,
                            headers={"Idempotency-Key": idempotency},
                        )
                        if getattr(resp2, "status_code", None) in (200, 201):
                            return resp2
                    except Exception:
                        pass

            print(
                f"Attempt {attempt}: PATCH {url} returned {code}; body: {text}"
            )

        except Exception as exc:
            print(f"Attempt {attempt}: PATCH {url} failed: {exc}")

        delay = backoff * (2 ** (attempt - 1))
        delay = delay * (0.5 + random.random() * 0.5)
        time.sleep(delay)

    return last_resp
