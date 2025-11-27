/**
 * Agent collaboration types for inter-agent communication
 */

import { AgentId } from "../agents/types";

export type MessageType =
  | "request_feedback"
  | "provide_feedback"
  | "share_context"
  | "ask_question"
  | "answer_question"
  | "report_issue"
  | "suggest_improvement";

export interface AgentMessage {
  id: string;
  fromAgent: AgentId;
  toAgent: AgentId;
  type: MessageType;
  subject: string;
  content: string;
  timestamp: string;
  runId: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackRequest extends AgentMessage {
  type: "request_feedback";
  metadata?: {
    artifactType?: "code" | "design" | "spec" | "infrastructure";
    artifactPath?: string;
    specificConcerns?: string[];
  };
}

export interface FeedbackResponse extends AgentMessage {
  type: "provide_feedback";
  metadata?: {
    requestId: string;
    approved: boolean;
    suggestions: string[];
    blockers?: string[];
  };
}

export interface SharedContext extends AgentMessage {
  type: "share_context";
  metadata?: {
    contextType: "decision" | "constraint" | "requirement" | "discovery";
    importance: "low" | "medium" | "high" | "critical";
  };
}

export interface CollaborationSession {
  runId: string;
  messages: AgentMessage[];
  activeThreads: Map<string, AgentMessage[]>;
  startedAt: string;
  lastActivityAt: string;
}

export interface AgentCollaborationConfig {
  /** Whether this agent can receive messages */
  canReceiveMessages: boolean;
  /** Whether this agent can send messages */
  canSendMessages: boolean;
  /** Which agents this agent can collaborate with */
  allowedPeers?: AgentId[];
  /** Message types this agent can handle */
  supportedMessageTypes: MessageType[];
}

export const AGENT_COLLABORATION_CONFIG: Record<
  AgentId,
  AgentCollaborationConfig
> = {
  riley: {
    canReceiveMessages: false,
    canSendMessages: true,
    supportedMessageTypes: ["share_context"],
  },
  jordan: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["riley", "mia"],
    supportedMessageTypes: [
      "share_context",
      "ask_question",
      "answer_question",
    ],
  },
  mia: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["riley", "jordan"],
    supportedMessageTypes: [
      "share_context",
      "ask_question",
      "answer_question",
    ],
  },
  ava: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["mia", "iris"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  iris: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["ava", "liam", "noah", "sophia", "kai", "ethan", "owen"],
    supportedMessageTypes: [
      "share_context",
      "provide_feedback",
      "suggest_improvement",
    ],
  },
  liam: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  noah: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  sophia: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  kai: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  ethan: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  owen: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["iris", "grace"],
    supportedMessageTypes: ["share_context", "request_feedback"],
  },
  grace: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: [
      "liam",
      "noah",
      "sophia",
      "kai",
      "ethan",
      "owen",
      "nova",
    ],
    supportedMessageTypes: [
      "provide_feedback",
      "report_issue",
      "suggest_improvement",
    ],
  },
  nova: {
    canReceiveMessages: true,
    canSendMessages: true,
    allowedPeers: ["grace", "chloe"],
    supportedMessageTypes: ["share_context", "report_issue"],
  },
  chloe: {
    canReceiveMessages: true,
    canSendMessages: false,
    allowedPeers: ["nova"],
    supportedMessageTypes: ["share_context"],
  },
};
