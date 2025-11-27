# Multi-Agent Builder Hub

Production-ready scaffold for orchestrating a team of agents to plan and mock-build software projects end-to-end (website, web app, mobile app, database, or web3 dApp).

> For a full architecture and audit report, see [`CODEBASE_REPORT.md`](./CODEBASE_REPORT.md).

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Create a project on the landing page, walk through discovery/spec, run the mock pipeline, then download the generated ZIP.

## Project map

- `app/` – Next.js App Router pages and API routes
  - `page.tsx` – landing + project type selection
  - `build/[projectId]/page.tsx` – multi-step builder UI
  - `api/projects` – create/list/update projects
  - `api/pipeline/start` – start mock pipeline (async)
  - `api/pipeline/status/[runId]` – poll pipeline run state
  - `api/zip/[projectId]` – stream ZIP of project output
- `components/ui` – small UI primitives (button, card, badge, inputs)
- `components/builder` – discovery form, spec preview, pipeline view, result summary
- `components/jordan` – Jordan chat, summary, and layout for discovery
- `lib/agents/types.ts` – domain types (Project, Agent, PipelineRun, etc.)
- `lib/agents/registry.ts` – full agent registry with dependencies and prompt file references
- `lib/projects/store.ts` – SQLite-backed project + pipeline store (DB-ready abstraction)
- `lib/projects/spec.ts` – deterministic mock spec generator (Riley)
- `lib/pipeline/engine.ts` – dependency-aware pipeline runner + mock agent execution
- `agents/*.md` – placeholders for real system prompts
- `project-output/` – where agent runs write generated artifacts before zipping
- `lib/llm` – model routing config and LLM client placeholder (per-agent model selection with env overrides)
- `lib/jordan` – types and API helper for Jordan discovery chat

## Agents & pipeline

- Registry: `lib/agents/registry.ts` defines Mia, Jordan, Riley, Ava, Liam, Noah, Sophia, Kai, Iris, Nova, Ethan, Grace, Owen, Chloe with stages and dependencies (topologically sorted).
- Engine: `lib/pipeline/engine.ts` builds execution order, creates a `PipelineRun`, updates `AgentRun` statuses, logs events, and simulates work in `runAgentMock`.
- Mock outputs per agent:
  - Liam: `frontend/pages/index.tsx`
  - Noah: `backend/app.ts`
  - Sophia: `database/schema.sql`
  - Kai: `web3/ProjectRegistry.sol`
  - Iris: `assets/branding.md`
  - Nova: `ops/infra.md`
  - Ethan: `tests/smoke.test.ts`
  - Grace: `audit/report.md`
  - Owen: `README.md`
  - Chloe: `docs/summary.md` + `handoffNotes` on the project
  - Riley writes `spec.json`; Ava creates design notes; Mia/Jordan log orchestration steps

## UI flow

1) Select project type on `/` → creates a `Project` via API and routes to `/build/[projectId]`.  
2) Discovery form captures structured requirements with live summary.  
3) Spec preview shows Riley’s draft (deterministic) and advances.  
4) Pipeline view lists all agents with statuses + live logs; run pipeline.  
5) Result step shows Chloe’s summary + ZIP download (via `/api/zip/[projectId]`).

## API surface

- `POST /api/projects` – `{ type }` → `Project`
- `GET /api/projects` – list projects
- `GET /api/projects/:id` – get project
- `PATCH /api/projects/:id` – update discovery/spec/status/handoff notes/pipelineRunId
- `POST /api/pipeline/start` – `{ projectId }` → `PipelineRun` (runs asynchronously)
- `GET /api/pipeline/status/:runId` – get pipeline run + logs + agent runs
- `GET /api/zip/:projectId` – download ZIP of `/project-output/{projectId}`

## Swapping in real LLM calls

- Replace `runAgentMock` in `lib/pipeline/engine.ts` with `runAgentLLM` that:
  - Loads prompt from `/agents/{id}.md`
  - Sends project context + relevant files to the model
  - Applies returned file diffs (ensure sandboxing/versioning)
- Configure per-agent models in `lib/llm/routing.ts` (env overrides: `LLM_MODEL_GENERAL`, `LLM_MODEL_CODE`, `LLM_MODEL_WEB3`, `LLM_MODEL_AUDIT`, `LLM_MODEL_SUMMARY`). Implement your provider in `lib/llm/client.ts`.
- To enable LLM calls with OpenAI: set `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`), and set `LLM_MODE=live` (default is `mock`). Pipeline will call the LLM per agent, log the response, and still run the mock writer to generate artifacts.
- Jordan (discovery) UI: landing page → select project type → routes to `/build/[projectId]?type=...` which renders the Jordan chat + live requirements summary (`components/jordan/*`). The chat endpoint is stubbed at `/api/jordan/chat`; replace it with your real Jordan/RAG backend and update `lib/jordan/api.ts` if needed.
- Jordan live backend: set `JORDAN_API_URL` (and optional `JORDAN_API_KEY`) to forward `/api/jordan/chat` to your service. If unset, a mock responder is used.

## Environment (sample)

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # optional
LLM_MODE=mock                               # set to "live" to call the LLM
LLM_MODEL_GENERAL=gpt-4o
LLM_MODEL_CODE=gpt-4o-mini
LLM_MODEL_WEB3=gpt-4o-mini
LLM_MODEL_AUDIT=gpt-4o-mini
LLM_MODEL_SUMMARY=gpt-4o-mini
```
- Store abstraction (`lib/projects/store.ts`) is isolated; swap it with a DB without touching API/UI layers.

## Notes

- Storage is in-memory for now; long-lived deployments should back it with a database and a durable file store for `project-output/`.
- ZIP generation uses `jszip` to stream the project folder; errors are handled with 404s if output is missing.
- Tailwind CSS v4 (configless) powers styling; utilities live in `app/globals.css`.

## Updates (Memory, Sandbox, Streaming, Metrics)

- Memory/RAG: `lib/memory/*` stores project embeddings and agent learnings in ChromaDB (set `CHROMA_URL`, `OPENAI_API_KEY`). Pipeline completion writes to memory (best-effort).
- Sandbox: `lib/sandbox/docker-manager.ts` runs commands in Docker when `SANDBOX_ENABLED=true` (image defaults to `node:18-alpine`).
- Streaming: Pipeline logs via SSE at `/api/pipeline/status/[runId]` or `/api/pipeline/stream/[runId]`; metrics SSE at `/api/dashboard/metrics/stream`.
- Metrics: `/api/dashboard/metrics` returns project/run counts and estimated LLM costs (logged per agent).
- Memory debug: `/api/memory/debug?q=...&limit=5` to query similar projects from Chroma (requires `CHROMA_URL` and embeddings).
- Jordan health: `/api/jordan/health` checks whether `JORDAN_API_URL` is configured and reachable (HEAD request with optional `JORDAN_API_KEY`).
- Sandbox health: `/api/sandbox/health` attempts a simple container command when `SANDBOX_ENABLED=true` to confirm Docker connectivity.

## Environment (expanded)

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
LLM_MODE=live
LLM_MODEL_GENERAL=gpt-4o
LLM_MODEL_CODE=gpt-4o-mini
LLM_MODEL_WEB3=gpt-4o-mini
LLM_MODEL_AUDIT=gpt-4o-mini
LLM_MODEL_SUMMARY=gpt-4o-mini
GEMINI_API_KEY=your_gemini_key
CHROMA_URL=http://localhost:8000
JORDAN_API_URL=https://your-jordan-backend
JORDAN_API_KEY=optional-token
SANDBOX_ENABLED=false
SANDBOX_IMAGE=node:18-alpine
```
