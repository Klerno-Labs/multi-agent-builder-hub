export type ProjectType =
  | "website"
  | "web_app"
  | "mobile_app"
  | "database"
  | "web3_dapp";

export type ProjectStatus =
  | "new"
  | "discovery"
  | "planning"
  | "running_pipeline"
  | "completed"
  | "failed";

export type AgentStage =
  | "orchestration"
  | "discovery"
  | "planning"
  | "design"
  | "frontend"
  | "backend"
  | "database"
  | "web3"
  | "assets"
  | "qa"
  | "audit"
  | "integration"
  | "docs";

export type AgentStatus = "idle" | "queued" | "running" | "completed" | "error" | "cancelled";

export type PipelineRunStatus = "not_started" | "running" | "completed" | "failed" | "cancelled";

export type AgentId =
  | "mia"
  | "jordan"
  | "riley"
  | "ava"
  | "liam"
  | "noah"
  | "sophia"
  | "kai"
  | "iris"
  | "nova"
  | "ethan"
  | "grace"
  | "owen"
  | "chloe";

export interface AgentDefinition {
  id: AgentId;
  displayName: string;
  role: string;
  description: string;
  stage: AgentStage;
  dependencies: AgentId[];
  promptFilePath: string;
  status?: AgentStatus;
  lastRunLog?: string;
}

export interface DiscoveryAnswers {
  goals?: string;
  targetUsers?: string;
  coreFeatures?: string[];
  designStyle?: string;
  integrations?: string;
  web3Requirements?: string;
  constraints?: string;
  notes?: string;
}

export interface ProjectSpec {
  summary: string;
  techStack: string[];
  keyFeatures: string[];
  pagesOrScreens: string[];
  dataModel: string[];
  apiRoutes: string[];
  risks?: string[];
}

export interface Project {
  id: string;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  discoveryAnswers?: DiscoveryAnswers;
  projectSpec?: ProjectSpec;
  pipelineRunId?: string;
  handoffNotes?: string;
}

export interface AgentRun {
  id: string;
  agentId: AgentId;
  status: AgentStatus;
  startedAt?: string;
  finishedAt?: string;
  inputSummary?: string;
  outputSummary?: string;
  error?: string;
  logs?: string[];
  cancelRequested?: boolean;
}

export interface PipelineLogEntry {
  id: string;
  agentId?: AgentId;
  message: string;
  level?: "info" | "warn" | "error";
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface PipelineRun {
  id: string;
  projectId: string;
  agentRuns: AgentRun[];
  status: PipelineRunStatus;
  createdAt: string;
  updatedAt: string;
  logs: PipelineLogEntry[];
  cancelRequested?: boolean;
}
