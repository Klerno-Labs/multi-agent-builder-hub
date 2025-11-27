# 1. High-Level Overview
- **Purpose**: Multi-Agent Builder Hub – a Next.js App Router UI + API that orchestrates a mock multi-agent pipeline (Mia → Chloe) to collect requirements, generate a spec, run staged agents, and produce a downloadable ZIP of generated project stubs.
- **Tech**: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind v4 (configless), JSZip, in-memory stores.
- **Key folders**
  - `app/`: UI routes and API route handlers (`/api/projects`, `/api/pipeline`, `/api/zip`).
  - `components/`: UI primitives and builder-specific steps.
  - `lib/`: Domain types, agent registry, project store, pipeline engine, spec generator.
  - `agents/`: Placeholder prompt files (`*.md`) plus legacy python agent dirs (not wired to the Next.js app).
  - `project-output/`: Runtime artifacts created by mock agents before zipping.

# 2. Architecture & Structure Audit
- **Root clutter (agents python dirs)** – `agents/Ava`, `agents/Chloe`, etc. contain python agent implementations unrelated to the Next.js runtime. Increases cognitive load and risk of accidental tooling on the wrong code. **Fix**: Move to `legacy/agents-python/` or mark clearly; ensure app only references `agents/*.md` prompts.
- **Ephemeral state** – `lib/projects/store.ts` uses in-memory Maps; pipeline/logs lost on restart; unsafe for multi-user or serverless. **Fix**: Introduce persistence (DB or file-backed store) behind the same interface.
- **Fire-and-forget pipeline** – `runPipelineMock` triggers async pipeline without lifecycle controls (no cancellation/queueing; concurrent runs allowed). Errors only logged; no retries. **Fix**: Add run manager with status guards, cancellation, and retries; surface errors to clients.
- **Input validation gaps** – API routes trust request bodies (no schema validation). Malformed payloads could set partial state. **Fix**: Add zod/valibot validation + consistent 4xx responses.
- **project-output tracked** – `project-output/` is not gitignored; generated artifacts risk polluting commits. **Fix**: add to `.gitignore` (unless intentionally committed).
- **ZIP memory usage** – `/api/zip/[projectId]` builds full ZIP buffer in memory via JSZip; large outputs would spike memory. **Fix**: stream with archiver or chunked response when outputs grow.
- **UI state responsibilities** – `app/build/[projectId]/page.tsx` handles fetch, state machine, and rendering in a single component. Manageable now, but harder to extend (LLM wiring, multi-run views). **Fix**: extract hooks (`useProject`, `usePipelinePolling`) and presentational components.

# 3. Code Quality Audit
## 3.1 Typing
- Strong TS coverage; domain types centralized in `lib/agents/types.ts`.
- Missing request validation: API routes accept `any` body; types assumed. Add runtime schemas to avoid invalid state.
## 3.2 Duplication
- Minimal duplication. Opportunity: shared “step progress” component currently embedded in `app/build/[projectId]/page.tsx`.
## 3.3 Error Handling
- `runPipelineSteps` swallows missing run (returns silently) and converts errors to logs only; clients don’t get failure reason.
- UI fetch handlers collapse diverse errors into generic strings; no retry/backoff.
- ZIP route only returns 404/200; no differentiation for empty folders.
## 3.4 Security/Perf
- No auth/rate limiting on mutation APIs (`/api/projects`, `/api/pipeline/start`, `/api/zip`), so abuse possible.
- JSZip buffering could be a memory hotspot for large outputs.
- project-output path is derived from `projectId` without normalization; current IDs are UUIDs, but sanitize if source changes.

# 4. Proposed Target Structure
```
app/
  (routes ... )
  api/
components/
  ui/
  builder/
domain/
  agents/ (types, registry)
  projects/ (store interface, spec builder)
  pipeline/ (engine, runners, logs)
data/
  prompts/ (agents/*.md)
  output/ (runtime artifacts, gitignored)
hooks/ (client data hooks: useProject, usePipelineRun)
tests/
  integration/ (API route tests)
  unit/ (pipeline engine)
scripts/
docs/
```
- **Reasoning**: Separates domain logic (`domain/*`) from transport (`app/api`) and presentation (`components`, `hooks`). Prompts/data are isolated from code, reducing coupling. Hooks keep UI lean. Tests organized by scope.
- **Current → Proposed mapping**
  - `lib/agents/*` → `domain/agents/*`
  - `lib/projects/*` → `domain/projects/*`
  - `lib/pipeline/engine.ts` → `domain/pipeline/engine.ts`
  - `agents/*.md` → `data/prompts/*.md` (python agent dirs → `legacy/agents-python/`)
  - `project-output/` → `data/output/` (gitignored)
  - Extract polling/state from `app/build/[projectId]/page.tsx` → `hooks/useProject`, `hooks/usePipelinePolling`.

# 5. Tests & Safety
- Current: only `npm run lint`; no automated tests for APIs/UI. Mock agents create a vitest smoke test in generated output, but not exercised in this repo.
- Recommended:
  - Add Vitest for unit tests (pipeline ordering, spec generation).
  - Add API route integration tests (Next.js route handlers via `next-test-api-route-handler` or equivalent).
  - Include basic e2e flow (Playwright) for the wizard.
  - Add `.env.example` and confirm no secrets are committed (none found).

# 6. Final Structure Summary
```
app/
  api/
    pipeline/
    projects/
    zip/
  build/[projectId]/page.tsx
  layout.tsx
  page.tsx
components/
  builder/
  ui/
lib/
  agents/
  pipeline/
  projects/
  utils.ts
agents/ (prompts + legacy python agents)
project-output/ (runtime artifacts)
public/
README.md
CODEBASE_REPORT.md
```

# 7. How to Work in This Codebase
- **Add a new route**: place under `app/api/...` (for APIs) or new page in `app/`; keep logic thin and delegate to domain modules in `lib` (or future `domain/`).
- **Add domain logic**: extend types/registry/spec/pipeline under `lib` (or proposed `domain/`). Keep side effects behind small helpers.
- **Add components**: shared primitives in `components/ui`; builder-specific pieces in `components/builder`.
- **Pipeline changes**: update `lib/agents/registry.ts` for ordering/deps; adjust `runAgentMock` (or future LLM runner) in `lib/pipeline/engine.ts`.
- **Tests**: place unit tests alongside domain modules (or under `tests/unit`); integration/API tests under `tests/integration`.

# 8. Remaining Recommendations (TODO)
- Add runtime validation for all request bodies (zod/valibot).
- Introduce persistence (DB or file-backed) for projects/pipeline runs.
- Add queueing/concurrency controls and cancellation to pipeline runner.
- Stream ZIP responses for large outputs; add size caps.
- Git-ignore `project-output/` and relocate legacy python agents to a clearly named folder.
- Extract builder page data hooks to simplify the component and enable reuse/testing.
