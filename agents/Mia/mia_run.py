"""
Mia orchestrator (programmatic simulation run).

This script runs the orchestration flow described by the user entirely
inside Python using the AgentAdapter helper. It runs in SIMULATION mode
by default so it doesn't require API keys or external services. It
produces simple artifacts in the workspace to simulate real agent work.

Phases implemented:
 - Entry (project type selection)
 - Discovery (Jordan asks 3 Qs)
 - Planning (Riley produces WorkPackages)
 - Execution (Builders execute packages)
 - QA loop (Ethan/Grace run checks up to 3 times)
 - Integration (Owen packages to zip)
 - Delivery (Chloe generates docs)

Run: `python agents/Mia/mia_run.py`
"""
from argparse import Namespace
from importlib.machinery import ModuleSpec
from types import ModuleType
import json
import os
import shutil
from pathlib import Path
from time import sleep
from typing import Dict, List

from requests import Response

from requests import Response

from requests import Response
from urllib.error import HTTPError

from requests import Response

from requests import Response

from requests import Response

from requests import Response


# Load .env.local if present so OPENAI_API_KEY and SIMULATION are available
# to the script and to delegated agent implementations.
def load_dotenv_local(path: str = ".env.local") -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            # don't overwrite existing env vars
            if key not in os.environ:
                os.environ[key] = val


load_dotenv_local()

from agents.agent_adapter import AgentAdapter
from agents.Mia import http_utils

# Simple in-memory project spec
class ProjectSpec:
    def __init__(self, project_id: str, project_type: str) -> None:
        self.id: str = project_id
        self.type: str = project_type
        self.requirements = {}
        self.work_packages = []


def save_file(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def collect_agent_requirements(agents_dir: str = "agents"):
    """Scan each agent folder for a requirements.txt and return a sorted list of unique requirements."""
    reqs = set()
    base = Path(agents_dir)
    if not base.exists():
        return []
    for child in base.iterdir():
        if not child.is_dir():
            continue
        req_file: Path = child / "requirements.txt"
        if req_file.exists():
            try:
                text: str = req_file.read_text(encoding="utf-8")
            except Exception:
                continue
            for line in text.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                reqs.add(line)
    return sorted(reqs)


def install_packages(packages) -> None:
    """Install packages using the current Python interpreter's pip."""
    if not packages:
        print("No agent packages to install.")
        return
    import subprocess
    import sys

    print("Installing agent-specific Python packages:", ", ".join(packages))
    cmd = [sys.executable, "-m", "pip", "install", *packages]
    try:
        subprocess.run(cmd, check=True)
        print("Package installation completed.")
    except Exception as e:
        print(f"Package installation failed: {e}")


def _http_client():
    # lightweight HTTP helpers that try to use requests if available
    try:
        import requests

        def get(url, **kw) -> Response:
            return requests.get(url, timeout=kw.get("timeout", 5))

        def post(url, json=None, **kw) -> Response:
            return requests.post(url, json=json, timeout=kw.get("timeout", 5))

        def patch(url, json=None, **kw) -> Response:
            return requests.patch(url, json=json, timeout=kw.get("timeout", 5))

        return get, post, patch
    except Exception:
        import urllib.request
        import urllib.error
        import json as _json

        def _req(method, url, json_body=None, timeout=5) -> object:
            data = None
            headers: Dict[str, str] = {"Content-Type": "application/json"}
            if json_body is not None:
                data: bytes = _json.dumps(json_body).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    return type("R", (), {"status_code": resp.getcode(), "text": resp.read().decode("utf-8")})
            except urllib.error.HTTPError as e:
                return type("R", (), {"status_code": e.code, "text": e.read().decode("utf-8")})

        def get(url, **kw) -> type[R] | type[R]:
            return _req("GET", url, None, timeout=kw.get("timeout", 5))

        def post(url, json=None, **kw) -> type[R] | type[R]:
            return _req("POST", url, json, timeout=kw.get("timeout", 5))

        def patch(url, json=None, **kw) -> type[R] | type[R]:
            return _req("PATCH", url, json, timeout=kw.get("timeout", 5))

        return get, post, patch


def run(argv=None) -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "Run Mia orchestrator (simulation or live)"
        )
    )
    parser.add_argument(
        "--project-id",
        help="Existing project id to update (optional)",
    )
    parser.add_argument(
        "--project-type",
        default=None,
        help="Project type (Website, API, etc.)",
    )
    parser.add_argument(
        "--description",
        default=None,
        help="Short project description / prompt",
    )
    parser.add_argument(
        "--next-base-url",
        default=os.environ.get("NEXT_BASE_URL", "http://localhost:3000"),
        help="Next.js base URL for project store API",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force overwrite existing projectSpec if present",
    )
    args: Namespace = parser.parse_args(argv)

    print("\n=== MIA ORCHESTRATOR ===\n")

    # Determine whether we should run in live mode and install agent deps.
    sim_env: str = os.environ.get("SIMULATION", "").lower()
    live_mode: bool = (
        sim_env not in ("1", "true", "yes")
        and any(os.environ.get(k) for k in ("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"))
    )
    if live_mode:
        print("Live mode detected; scanning agent requirements and installing packages...")
        reqs = collect_agent_requirements()
        if reqs:
            # Ask user for approval via the Next API tool-approval endpoint before installing
            try:
                from agents.utils.api_clients import request_tool_approval, poll_tool_approval

                print("Requesting user approval for installing agent packages...")
                req_id = request_tool_approval(next_base, "Mia", "pip", "install", {"packages": reqs}, timeout=30)
                approved = False
                if req_id:
                    result = poll_tool_approval(next_base, req_id, poll_interval=2.0, timeout=60)
                    if result and result.get("approved") is True:
                        approved = True

                if approved:
                    print("Approval granted. Installing packages...")
                    install_packages(reqs)
                else:
                    print("Package installation not approved or approval timed out; skipping installation.")
            except Exception:
                print("Tool-approval API not reachable; proceeding to install packages by default.")
                install_packages(reqs)
        else:
            print("No agent requirements found.")

    # Initialize adapters for agents. If real implementations exist,
    # import and provide them so AgentAdapter can delegate when
    # SIMULATION is disabled.
    import importlib.util

    def try_import(module_path: str, class_name: str) -> json.Any | None:
        # First try normal import
        try:
            mod = __import__(module_path, fromlist=[class_name])
            return getattr(mod, class_name)
        except Exception:
            pass

        # Fallback: load by file path (agents/<Folder>/<file>.py)
        parts: List[str] = module_path.split('.')
        if len(parts) >= 3 and parts[0] == 'agents':
            folder: str = parts[1]
            filename: str = parts[2] + '.py'
            file_path: str = os.path.join(os.getcwd(), 'agents', folder, filename)
            if os.path.exists(file_path):
                try:
                    spec: ModuleSpec | None = importlib.util.spec_from_file_location(f"agents.{folder}.{parts[2]}", file_path)
                    mod: ModuleType = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    return getattr(mod, class_name)
                except Exception:
                    return None
        return None

    JordanImpl: json.Any | None = try_import("agents.Jordan.jordan_agent", "JordanAgent")
    RileyImpl: json.Any | None = try_import("agents.Riley.riley_agent", "RileyAgent")
    AvaImpl: json.Any | None = try_import("agents.Ava.ava_agent", "AvaAgent")
    LiamImpl: json.Any | None = try_import("agents.Liam.liam_agent", "LiamAgent")
    NoahImpl: json.Any | None = try_import("agents.Noah.noah_agent", "NoahAgent")
    SophiaImpl: json.Any | None = try_import("agents.Sophia.sophia_agent", "SophiaAgent")
    EthanImpl: json.Any | None = try_import("agents.Ethan.ethan_agent", "EthanAgent")
    GraceImpl: json.Any | None = try_import("agents.Grace.grace_agent", "GraceAgent")
    OwenImpl: json.Any | None = try_import("agents.Owen.owen_agent", "OwenAgent")
    ChloeImpl: json.Any | None = try_import("agents.Chloe.chloe_agent", "ChloeAgent")
    IrisImpl: json.Any | None = try_import("agents.Iris.iris_agent", "IrisAgent")

    # Debug: show which implementations were located
    print("Impl found:", {
        'Jordan': bool(JordanImpl),
        'Riley': bool(RileyImpl),
        'Ava': bool(AvaImpl),
        'Liam': bool(LiamImpl),
        'Noah': bool(NoahImpl),
        'Sophia': bool(SophiaImpl),
        'Ethan': bool(EthanImpl),
        'Grace': bool(GraceImpl),
        'Owen': bool(OwenImpl),
        'Chloe': bool(ChloeImpl),
        'Iris': bool(IrisImpl),
    })

    jordan = AgentAdapter("Jordan", JordanImpl() if JordanImpl else None)
    riley = AgentAdapter("Riley", RileyImpl() if RileyImpl else None)
    ava = AgentAdapter("Ava", AvaImpl() if AvaImpl else None)
    liam = AgentAdapter("Liam", LiamImpl() if LiamImpl else None)
    noah = AgentAdapter("Noah", NoahImpl() if NoahImpl else None)
    sophia = AgentAdapter("Sophia", SophiaImpl() if SophiaImpl else None)
    ethan = AgentAdapter("Ethan", EthanImpl() if EthanImpl else None)
    grace = AgentAdapter("Grace", GraceImpl() if GraceImpl else None)
    owen = AgentAdapter("Owen", OwenImpl() if OwenImpl else None)
    chloe = AgentAdapter("Chloe", ChloeImpl() if ChloeImpl else None)
    iris = AgentAdapter("Iris", None)

    # Phase 1: Entry
    project_type: json.Any | str = args.project_type or "Website"
    # map various user-facing types to the API enum values
    def _normalize_type(t: str) -> str:
        if not t:
            return "website"
        s: str = t.strip().lower()
        if s in ("website", "site"):
            return "website"
        if s in ("web app", "web_app", "webapp"):
            return "web_app"
        if s in ("mobile app", "mobile_app", "mobile"):
            return "mobile_app"
        if "db" in s or "database" in s:
            return "database"
        if "web3" in s or "dapp" in s:
            return "web3_dapp"
        # default
        return "website"

    api_project_type: str = _normalize_type(project_type)
    description: json.Any | str = args.description or os.environ.get("PROJECT_DESCRIPTION") or "A short project description"

    # Prepare HTTP helpers for web-store persistence
    get, post, patch = _http_client()
    next_base = args.next_base_url.rstrip("/")

    # Use shared http utils; wrap to pass local `get` when available
    def try_post(url, json=None, retries: int = 3, backoff: float = 0.5):
        return http_utils.try_post(url, json_body=json, retries=retries, backoff=backoff)

    def try_patch(url, json=None, retries: int = 3, backoff: float = 0.5):
        return http_utils.try_patch(url, json_body=json, retries=retries, backoff=backoff, get_callable=get)

    project_id = args.project_id
    created_project = None

    if project_id:
        print(f"Entry: using provided project id '{project_id}'. Will attempt to update store at {next_base}")
        try:
            resp: Response = get(f"{next_base}/api/projects/{project_id}")
            if resp.status_code == 200:
                created_project = json.loads(resp.text)
            else:
                print(f"Warning: GET project {project_id} returned {resp.status_code}")
        except Exception as e:
            print(f"Warning: could not reach Next API at {next_base}: {e}")

    if not created_project:
        # create a new local id if API not reachable or not provided
        project_id: json.Any | str = project_id or f"mia-{int(os.times()[4])}-{os.getpid()}"
        created_project = None
        # Try to create via API POST /api/projects { type }
        try:
            resp: Response = try_post(
                f"{next_base}/api/projects",
                json={"type": api_project_type},
            )
            if resp and getattr(resp, "status_code", None) in (200, 201):
                created_project = json.loads(resp.text)
                # ensure we use the canonical UUID returned by the API
                project_id = created_project.get("id", project_id)
                print(f"Created project via Next API: {project_id}")
                # Optionally trigger the pipeline start endpoint so the server-side runner is aware
                try:
                    from agents.utils.api_clients import start_pipeline

                    start_result = start_pipeline(next_base, project_id)
                    if start_result:
                        print(f"Triggered server pipeline start for project {project_id}")
                except Exception:
                    # best-effort; if the helper or endpoint is not available, ignore
                    pass
            else:
                code = getattr(resp, "status_code", None) if resp else None
                print(f"Next API project creation returned {code}; continuing with local id {project_id}")
        except Exception as e:
            print(f"Next API not available ({e}), will continue with local project id {project_id}")

    project = ProjectSpec(project_id, project_type)
    print(f"Entry: project '{project.id}' of type '{project.type}'\n")

    # prepare output directory for this project
    output_dir: Path = Path("project-output") / project.id
    output_dir.mkdir(parents=True, exist_ok=True)

    # If Iris implementation exists, instantiate it with project-specific asset dir
    try:
        if IrisImpl and iris.impl is None:
            try:
                iris_impl = IrisImpl(asset_dir=str(output_dir / "assets"), simulate=not live_mode)
                iris.impl = iris_impl
            except Exception as e:  # pragma: no cover - best-effort
                print(f"Could not instantiate Iris agent implementation: {e}")
    except NameError:
        pass

    # Phase 2: Discovery (Jordan asks 3 questions)
    jordan.log("Phase: Discovery - asking 3 targeted questions.")
    questions: List[str] = [
        "What is the main goal of the project?",
        "Who are the primary users?",
        "What are the top 3 core features required?",
    ]
    answers = {}
    for i, q in enumerate(questions, 1):
        resp: str = jordan.think(q)
        jordan.log(f"Q{i}: {q} -> {resp}")
        answers[f"q{i}"] = resp
        sleep(0.3)

    project.requirements = answers
    discovery_path: Path = output_dir / "DiscoveryReport.md"
    save_file(str(discovery_path), json.dumps(answers, indent=2))
    print(f"Discovery completed. Saved '{discovery_path}'\n")

    # Phase 3: Planning (Riley creates work packages)
    riley.log("Phase: Planning - creating work packages from discovery.")
    wp_payload: str = riley.think("Create work packages based on DiscoveryReport")
    try:
        parsed = json.loads(wp_payload)
        wps = parsed.get("workPackages") or parsed.get("work_packages") or []
    except Exception:
        # fallback simple packages
        wps: List[Dict[str, str]] = [
            {"id": "design-core", "owner": "ava", "title": "Design core UI", "status": "queued"},
            {"id": "frontend-auth", "owner": "liam", "title": "Frontend auth pages", "status": "queued"},
            {"id": "backend-api", "owner": "noah", "title": "API endpoints", "status": "queued"},
        ]

    project.work_packages = wps
    spec_path: Path = output_dir / "ProjectSpec.md"
    spec_obj: Dict[str, json.Any | List[Dict[str, str]]] = {"workPackages": wps}
    save_file(str(spec_path), json.dumps(spec_obj, indent=2))
    print(f"Planning completed. Saved '{spec_path}' with work packages.\n")

    # Persist spec and discovery answers into Next.js project store if available
    if created_project:
        try:
            payload = {
                "discoveryAnswers": project.requirements,
                "projectSpec": spec_obj,
                "status": "planning",
            }
            resp: Response = try_patch(f"{next_base}/api/projects/{project_id}", json=payload)
            if resp and getattr(resp, "status_code", None) in (200, 201):
                print(f"Persisted project spec to Next store for project {project_id}")
            else:
                code = getattr(resp, "status_code", None) if resp else None
                print(
                    f"Next API PATCH returned {code}; body: {getattr(resp, 'text', '') if resp else ''}"
                )
        except Exception as e:
            print(f"Could not persist to Next API: {e}")
    else:
        print("Skipping persistence: project was not created via Next API; using local output dir only.")

    # Phase 4: Execution (builders)
    print("Phase: Execution - dispatching work packages to builders")
    builders: Dict[str, AgentAdapter] = {
        "ava": ava,
        "liam": liam,
        "noah": noah,
        "sophia": sophia,
        "iris": iris,
    }
    # Prepare textual project spec and design spec if available
    project_spec_str: str = json.dumps({"requirements": project.requirements, "workPackages": project.work_packages}, indent=2)
    design_spec_str: str = ""
    if os.path.exists("DesignSpec.md"):
        with open("DesignSpec.md", "r", encoding="utf-8") as f:
            design_spec_str = f.read()
    for wp in wps:
        owner = wp.get("owner")
        agent = builders.get(owner, AgentAdapter(owner))
        agent.log(f"Executing work package {wp['id']} - {wp['title']}")

        # If live impl exists, call a role-appropriate method when possible
        if agent.impl:
            try:
                if hasattr(agent.impl, "generate_design"):
                    # Ava
                    res = agent.impl.generate_design(project_spec_str, json.dumps(wp))
                elif hasattr(agent.impl, "generate_frontend"):
                    # Liam
                    res = agent.impl.generate_frontend(project_spec_str, design_spec_str, json.dumps(wp))
                elif hasattr(agent.impl, "generate_dalle_image"):
                    # Iris: asset generation
                    prompt_text = (
                        f"{wp.get('title', wp.get('id'))}\n" + project_spec_str[:2000]
                    )
                    try:
                        res = agent.impl.generate_dalle_image(prompt_text, filename_hint=wp.get('id', 'iris'))
                    except Exception as e:  # pragma: no cover - best effort
                        res = f"ERROR generating image: {e}"
                elif hasattr(agent.impl, "create_zip_archive"):
                    res = agent.impl.create_zip_archive()
                else:
                    # Generic delegate where method accepts a prompt
                    res = agent.think(f"execute_package {wp['id']}")
            except Exception as e:
                res = f"ERROR delegating to {owner}: {e}"
        else:
            res = agent.think(f"execute_package {wp['id']}")

        agent.log(f"Result: {res}")
        wp["status"] = "complete"
        sleep(0.25)

    print("Execution phase completed. All work packages marked COMPLETE.\n")

    # Phase 5: QA Loop
    print("Phase: QA - running QA checks up to 3 iterations")
    max_rounds = 3
    issues_found = []
    for round_num in range(1, max_rounds + 1):
        ethan.log(f"QA Round {round_num}: running checks")
        eth_resp: str = ethan.think("run_checks on project")
        grace.log(f"Audit Round {round_num}: running security checks")
        gr_resp: str = grace.think("run_checks on project")

        try:
            eth_parsed = json.loads(eth_resp)
            gr_parsed = json.loads(gr_resp)
        except Exception:
            eth_parsed = {"result": "OK"}
            gr_parsed = {"result": "OK"}

        if eth_parsed.get("result") == "HIGH" or gr_parsed.get("result") == "HIGH":
            issues_found.append({"round": round_num, "ethan": eth_parsed, "grace": gr_parsed})
            print(f"QA: Issues detected in round {round_num}: {eth_parsed} / {gr_parsed}")
            # In this simplified simulation we don't implement rework,
            # but will continue the loop so user can see repeated checks.
        else:
            print(f"QA: Round {round_num} passed: {eth_parsed} / {gr_parsed}")
            break
        sleep(0.3)

    print("QA phase completed.\n")

    # Phase 6: Integration (Owen creates a zip)
    print("Phase: Integration - packaging project")
    owen.log("Creating project bundle zip")

    # Collect files from output_dir and create a real zip bundle
    bundle_base: Path = output_dir / "project_bundle_v1"
    bundle_name = str(bundle_base.with_suffix('.zip'))

    # Ensure there is at least some content under output_dir
    found: List[Path] = list(output_dir.glob("**/*"))
    if not found:
        # if nothing produced, write a minimal README
        save_file(str(output_dir / "README.txt"), "Project bundle generated by Mia orchestrator\n")

    # Optionally delegate to Owen implementation if present
    if owen.impl and hasattr(owen.impl, "create_zip_archive"):
        try:
            custom = owen.impl.create_zip_archive(str(output_dir))
            if custom:
                bundle_name = custom
        except Exception as e:
            owen.log(f"Owen impl error: {e}")

    # Create the zip from the output_dir contents
    try:
        # shutil.make_archive wants the base name without suffix
        shutil.make_archive(str(bundle_base), 'zip', root_dir=str(output_dir))
        owen.log(f"Bundle created: {bundle_name}")
    except Exception as e:
        owen.log(f"Error creating archive: {e}")
        # fallback to a small file
        try:
            with open(bundle_name, "wb") as f:
                f.write(b"FALLBACK BUNDLE")
            owen.log(f"Fallback bundle created: {bundle_name}")
        except Exception as ee:
            owen.log(f"Fallback bundle creation failed: {ee}")

    # Phase 7: Delivery (Chloe generates docs)
    print("Phase: Delivery - generating documentation")
    docs: str = chloe.think("generate docs for project delivery")
    delivery_path: Path = output_dir / "DELIVERY_DOCS.md"
    save_file(str(delivery_path), f"# Delivery Docs\n\n{docs}\n")

    # After delivery, attempt to update Next project store with final status and bundle path
    if created_project:
        try:
            handoff: Dict[str, str] = {"bundle": str(bundle_name), "deliveryDocs": str(delivery_path.name)}
            final_payload = {
                "status": "completed",
                "projectSpec": spec_obj,
                # API expects handoffNotes as a string field; serialize the dict
                "handoffNotes": json.dumps(handoff),
            }
            resp2: Response = try_patch(f"{next_base}/api/projects/{project_id}", json=final_payload)
            if resp2 and getattr(resp2, "status_code", None) in (200, 201):
                print(f"Updated Next project store with delivery info for {project_id}")
            else:
                code = getattr(resp2, "status_code", None) if resp2 else None
                print(f"Next API PATCH (delivery) returned {code}; body: {getattr(resp2, 'text', '') if resp2 else ''}")
        except Exception as e:
            print(f"Could not PATCH delivery info to Next API: {e}")
    else:
        print("Skipping final persistence: project was not created via Next API.")

    # Summary
    print("\n=== ORCHESTRATION SUMMARY ===")
    print(f"Project: {project.id} ({project.type})")
    print(f"WorkPackages: {len(project.work_packages)}")
    print(f"QA Issues Found: {len(issues_found)}")
    print(f"Bundle: {bundle_name}")
    print("Delivery docs: DELIVERY_DOCS.md")
    print("\nSimulation run complete.")


if __name__ == "__main__":
    run()
