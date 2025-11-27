"""Lightweight helpers for calling Next.js API endpoints from Python agents.

Provides functions to request tool approvals, poll approval results, and start the pipeline.
These are intentionally small and retry-friendly; callers should provide the `base_url` for Next.
"""
from typing import Any, Dict, Optional
import time
import json

try:
    import requests
except Exception:
    requests = None


def _post(url: str, payload: Dict[str, Any], timeout: int = 5):
    if requests:
        return requests.post(url, json=payload, timeout=timeout)
    raise RuntimeError("requests package not available")


def _get(url: str, timeout: int = 5):
    if requests:
        return requests.get(url, timeout=timeout)
    raise RuntimeError("requests package not available")


def request_tool_approval(base_url: str, agent_id: str, tool_name: str, operation: str, details: Any, timeout: int = 60) -> Optional[str]:
    """Create an approval request. Returns requestId on success or None."""
    url = base_url.rstrip("/") + "/api/tool-approval"
    payload = {
        "agentId": agent_id,
        "toolName": tool_name,
        "operation": operation,
        "details": details,
    }
    resp = _post(url, payload)
    if resp and getattr(resp, "status_code", None) in (200, 201):
        try:
            data = resp.json()
            return data.get("requestId")
        except Exception:
            return None
    return None


def poll_tool_approval(base_url: str, request_id: str, poll_interval: float = 2.0, timeout: int = 60) -> Optional[Dict[str, Any]]:
    """Poll approval status until approved/rejected or timeout. Returns the result dict or None if timeout."""
    url = base_url.rstrip("/") + f"/api/tool-approval?requestId={request_id}"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = _get(url)
            if getattr(resp, "status_code", None) == 200:
                data = resp.json()
                # If the response contains `approved` it's a final result
                if "approved" in data:
                    return data
                # if pending, continue polling
        except Exception:
            pass
        time.sleep(poll_interval)
    return None


def start_pipeline(base_url: str, project_id: str) -> Optional[Dict[str, Any]]:
    """Call POST /api/pipeline/start with { projectId } and return server response JSON or None."""
    url = base_url.rstrip("/") + "/api/pipeline/start"
    try:
        resp = _post(url, {"projectId": project_id})
        if resp and getattr(resp, "status_code", None) in (200, 201):
            return resp.json()
    except Exception:
        pass
    return None
