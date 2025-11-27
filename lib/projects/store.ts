import Database from "better-sqlite3";
import path from "path";
import {
  AgentRun,
  PipelineRun,
  PipelineRunStatus,
  Project,
  ProjectStatus,
  ProjectType,
} from "../agents/types";

const DB_PATH = path.join(process.cwd(), "data", "store.db");

// Ensure database and tables
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  status TEXT NOT NULL,
  discoveryAnswers TEXT,
  projectSpec TEXT,
  pipelineRunId TEXT,
  handoffNotes TEXT
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  agentRuns TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  logs TEXT NOT NULL,
  cancelRequested INTEGER DEFAULT 0,
  FOREIGN KEY(projectId) REFERENCES projects(id)
);
`);

const now = () => new Date().toISOString();

function serialize<T>(value: T | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}
function deserialize<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function createProject(type: ProjectType): Project {
  const id = crypto.randomUUID();
  const timestamp = now();
  const project: Project = {
    id,
    type,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "new",
  };
  db.prepare(
    `INSERT INTO projects (id, type, createdAt, updatedAt, status)
     VALUES (@id, @type, @createdAt, @updatedAt, @status)`,
  ).run(project);
  return project;
}

export function listProjects(): Project[] {
  const rows = db.prepare(`SELECT * FROM projects`).all() as ProjectRow[];
  return rows.map(mapProjectRow);
}

export function getProject(id: string): Project | undefined {
  const row = db
    .prepare(`SELECT * FROM projects WHERE id = ?`)
    .get(id) as ProjectRow | undefined;
  return row ? mapProjectRow(row) : undefined;
}

export function updateProject(
  id: string,
  updates: Partial<Project>,
): Project | undefined {
  const existing = getProject(id);
  if (!existing) return undefined;
  const merged: Project = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };
  db.prepare(
    `UPDATE projects SET
      type = @type,
      updatedAt = @updatedAt,
      status = @status,
      discoveryAnswers = @discoveryAnswers,
      projectSpec = @projectSpec,
      pipelineRunId = @pipelineRunId,
      handoffNotes = @handoffNotes
     WHERE id = @id`,
  ).run({
    ...merged,
    discoveryAnswers: serialize(merged.discoveryAnswers),
    projectSpec: serialize(merged.projectSpec),
  });
  return merged;
}

interface ProjectRow {
  id: string;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  discoveryAnswers: string | null;
  projectSpec: string | null;
  pipelineRunId?: string | null;
  handoffNotes?: string | null;
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    type: row.type as ProjectType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    status: row.status as ProjectStatus,
    discoveryAnswers: deserialize(row.discoveryAnswers),
    projectSpec: deserialize(row.projectSpec),
    pipelineRunId: row.pipelineRunId ?? undefined,
    handoffNotes: row.handoffNotes ?? undefined,
  };
}

export function createPipelineRun(
  projectId: string,
  agentRuns: AgentRun[],
): PipelineRun {
  const id = crypto.randomUUID();
  const timestamp = now();
  const run: PipelineRun = {
    id,
    projectId,
    agentRuns,
    status: "not_started",
    createdAt: timestamp,
    updatedAt: timestamp,
    logs: [],
  };
  db.prepare(
    `INSERT INTO pipeline_runs
     (id, projectId, agentRuns, status, createdAt, updatedAt, logs, cancelRequested)
     VALUES (@id, @projectId, @agentRuns, @status, @createdAt, @updatedAt, @logs, @cancelRequested)`,
  ).run({
    ...run,
    agentRuns: JSON.stringify(run.agentRuns),
    logs: JSON.stringify(run.logs),
    cancelRequested: 0,
  });
  updateProject(projectId, { pipelineRunId: id });
  return run;
}

export function getPipelineRun(id: string): PipelineRun | undefined {
  const row = db
    .prepare(`SELECT * FROM pipeline_runs WHERE id = ?`)
    .get(id) as PipelineRow | undefined;
  return row ? mapPipelineRow(row) : undefined;
}

export function updatePipelineRun(
  id: string,
  updates: Partial<PipelineRun> & { cancelRequested?: boolean },
): PipelineRun | undefined {
  const existing = getPipelineRun(id);
  if (!existing) return undefined;
  const merged: PipelineRun = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };
  db.prepare(
    `UPDATE pipeline_runs SET
      projectId = @projectId,
      agentRuns = @agentRuns,
      status = @status,
      updatedAt = @updatedAt,
      logs = @logs,
      cancelRequested = @cancelRequested
     WHERE id = @id`,
  ).run({
    ...merged,
    agentRuns: JSON.stringify(merged.agentRuns),
    logs: JSON.stringify(merged.logs),
    cancelRequested:
      (updates.cancelRequested ?? existing.cancelRequested) ? 1 : 0,
  });
  return merged;
}

interface PipelineRow {
  id: string;
  projectId: string;
  agentRuns: string;
  status: PipelineRunStatus;
  createdAt: string;
  updatedAt: string;
  logs: string;
  cancelRequested?: number;
}

function mapPipelineRow(row: PipelineRow): PipelineRun {
  return {
    id: row.id,
    projectId: row.projectId,
    agentRuns: JSON.parse(row.agentRuns) as AgentRun[],
    status: row.status as PipelineRunStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    logs: JSON.parse(row.logs),
    cancelRequested: row.cancelRequested === 1,
  };
}

export function listPipelineRuns(): PipelineRun[] {
  const rows = db.prepare(`SELECT * FROM pipeline_runs`).all() as PipelineRow[];
  return rows.map(mapPipelineRow);
}

export function setPipelineRunStatus(
  id: string,
  status: PipelineRunStatus,
): PipelineRun | undefined {
  return updatePipelineRun(id, { status });
}

export function setProjectStatus(
  id: string,
  status: ProjectStatus,
): Project | undefined {
  return updateProject(id, { status });
}

export function requestPipelineCancel(id: string) {
  const run = getPipelineRun(id);
  if (!run) return;
  updatePipelineRun(id, { cancelRequested: true });
}

export function isCancelRequested(id: string): boolean {
  const row = db
    .prepare(`SELECT cancelRequested FROM pipeline_runs WHERE id = ?`)
    .get(id) as { cancelRequested: number } | undefined;
  return row ? row.cancelRequested === 1 : false;
}
