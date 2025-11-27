/**
 * Feedback loop system for agent collaboration
 */

import { sendMessage, getPendingMessages } from "./message-bus";
import { AgentMessage, FeedbackRequest, FeedbackResponse } from "./types";
import { AgentId } from "../agents/types";

export interface FeedbackResult {
  approved: boolean;
  suggestions: string[];
  blockers: string[];
  needsRevision: boolean;
}

/**
 * Request feedback from another agent
 */
export function requestFeedback(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  subject: string,
  content: string,
  options?: {
    artifactType?: "code" | "design" | "spec" | "infrastructure";
    artifactPath?: string;
    specificConcerns?: string[];
  }
): AgentMessage | null {
  return sendMessage(runId, fromAgent, toAgent, "request_feedback", subject, content, {
    artifactType: options?.artifactType,
    artifactPath: options?.artifactPath,
    specificConcerns: options?.specificConcerns,
  });
}

/**
 * Provide feedback in response to a request
 */
export function provideFeedback(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  requestId: string,
  approved: boolean,
  suggestions: string[],
  blockers?: string[]
): AgentMessage | null {
  const subject = approved
    ? "Feedback: Approved with suggestions"
    : "Feedback: Changes required";

  const content = `
Approval Status: ${approved ? "APPROVED" : "NEEDS REVISION"}

${suggestions.length > 0 ? `Suggestions:\n${suggestions.map((s) => `- ${s}`).join("\n")}` : ""}

${blockers && blockers.length > 0 ? `\nBlockers:\n${blockers.map((b) => `- ${b}`).join("\n")}` : ""}
  `.trim();

  return sendMessage(runId, fromAgent, toAgent, "provide_feedback", subject, content, {
    requestId,
    approved,
    suggestions,
    blockers: blockers || [],
  });
}

/**
 * Share context with other agents
 */
export function shareContext(
  runId: string,
  fromAgent: AgentId,
  toAgents: AgentId[],
  contextType: "decision" | "constraint" | "requirement" | "discovery",
  subject: string,
  content: string,
  importance: "low" | "medium" | "high" | "critical" = "medium"
): AgentMessage[] {
  const messages: AgentMessage[] = [];

  for (const toAgent of toAgents) {
    const message = sendMessage(runId, fromAgent, toAgent, "share_context", subject, content, {
      contextType,
      importance,
    });

    if (message) {
      messages.push(message);
    }
  }

  return messages;
}

/**
 * Ask a question to another agent
 */
export function askQuestion(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  question: string,
  context?: string
): AgentMessage | null {
  const content = context ? `Context: ${context}\n\nQuestion: ${question}` : question;

  return sendMessage(runId, fromAgent, toAgent, "ask_question", "Question", content);
}

/**
 * Answer a question from another agent
 */
export function answerQuestion(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  questionId: string,
  answer: string
): AgentMessage | null {
  return sendMessage(runId, fromAgent, toAgent, "answer_question", "Answer", answer, {
    replyTo: questionId,
  });
}

/**
 * Report an issue to another agent
 */
export function reportIssue(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  issueType: "bug" | "security" | "performance" | "quality",
  subject: string,
  description: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
): AgentMessage | null {
  return sendMessage(runId, fromAgent, toAgent, "report_issue", subject, description, {
    issueType,
    severity,
  });
}

/**
 * Suggest an improvement to another agent
 */
export function suggestImprovement(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  subject: string,
  suggestion: string,
  rationale?: string
): AgentMessage | null {
  const content = rationale
    ? `Suggestion: ${suggestion}\n\nRationale: ${rationale}`
    : suggestion;

  return sendMessage(runId, fromAgent, toAgent, "suggest_improvement", subject, content);
}

/**
 * Process pending feedback requests for an agent
 */
export function processPendingFeedbackRequests(
  runId: string,
  agentId: AgentId
): FeedbackRequest[] {
  const allMessages = getPendingMessages(runId, agentId);
  return allMessages.filter(
    (msg): msg is FeedbackRequest => msg.type === "request_feedback"
  );
}

/**
 * Process pending feedback responses for an agent
 */
export function processPendingFeedbackResponses(
  runId: string,
  agentId: AgentId
): FeedbackResponse[] {
  const allMessages = getPendingMessages(runId, agentId);
  return allMessages.filter(
    (msg): msg is FeedbackResponse => msg.type === "provide_feedback"
  );
}

/**
 * Check if feedback is required before an agent can proceed
 */
export function requiresFeedback(agentId: AgentId): boolean {
  // Code generation agents should get feedback from review agent
  const codeAgents: AgentId[] = ["liam", "noah", "sophia", "kai", "ethan", "owen"];
  return codeAgents.includes(agentId);
}

/**
 * Get the feedback reviewer for an agent
 */
export function getFeedbackReviewer(agentId: AgentId): AgentId | null {
  const codeAgents: AgentId[] = ["liam", "noah", "sophia", "kai", "ethan", "owen"];

  if (codeAgents.includes(agentId)) {
    return "grace"; // Grace is the code review agent
  }

  return null;
}

/**
 * Parse feedback response into actionable result
 */
export function parseFeedbackResult(response: FeedbackResponse): FeedbackResult {
  const approved = response.metadata?.approved === true;
  const suggestions = (response.metadata?.suggestions as string[]) || [];
  const blockers = (response.metadata?.blockers as string[]) || [];

  return {
    approved,
    suggestions,
    blockers,
    needsRevision: !approved || blockers.length > 0,
  };
}
