import { ProjectType } from "../agents/types";

export type JordanRole = "user" | "assistant" | "system";

export interface JordanMessage {
  id: string;
  role: JordanRole;
  content: string;
  timestamp: string;
}

export interface JordanRequirementsSnapshot {
  strategy?: string;
  branding?: string;
  uxUi?: string;
  techStack?: string;
  pages?: string;
  performance?: string;
  seo?: string;
  content?: string;
  security?: string;
  analytics?: string;
  conversion?: string;
  scaling?: string;
  legal?: string;
  maintenance?: string;
  wowFactor?: string;
}

export interface JordanChatState {
  messages: JordanMessage[];
  snapshot?: JordanRequirementsSnapshot;
  isComplete: boolean;
  loading: boolean;
  error?: string;
}

export type { ProjectType };
