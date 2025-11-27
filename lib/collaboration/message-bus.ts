/**
 * Message bus for inter-agent communication
 */

import {
  AgentMessage,
  CollaborationSession,
  AGENT_COLLABORATION_CONFIG,
  MessageType,
} from "./types";
import { AgentId } from "../agents/types";

// In-memory storage for collaboration sessions
const activeSessions = new Map<string, CollaborationSession>();

// Message queues for each agent
const agentMessageQueues = new Map<AgentId, AgentMessage[]>();

/**
 * Initialize a collaboration session for a pipeline run
 */
export function initializeCollaborationSession(runId: string): void {
  const session: CollaborationSession = {
    runId,
    messages: [],
    activeThreads: new Map(),
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  activeSessions.set(runId, session);
  console.log(`🤝 Collaboration session initialized for run ${runId}`);
}

/**
 * Send a message from one agent to another
 */
export function sendMessage(
  runId: string,
  fromAgent: AgentId,
  toAgent: AgentId,
  type: MessageType,
  subject: string,
  content: string,
  metadata?: Record<string, unknown>
): AgentMessage | null {
  const session = activeSessions.get(runId);
  if (!session) {
    console.warn(`No collaboration session found for run ${runId}`);
    return null;
  }

  // Validate sender can send messages
  const senderConfig = AGENT_COLLABORATION_CONFIG[fromAgent];
  if (!senderConfig.canSendMessages) {
    console.warn(`Agent ${fromAgent} is not allowed to send messages`);
    return null;
  }

  // Validate message type is supported by sender
  if (!senderConfig.supportedMessageTypes.includes(type)) {
    console.warn(
      `Agent ${fromAgent} does not support message type ${type}`
    );
    return null;
  }

  // Validate recipient can receive messages
  const recipientConfig = AGENT_COLLABORATION_CONFIG[toAgent];
  if (!recipientConfig.canReceiveMessages) {
    console.warn(`Agent ${toAgent} is not allowed to receive messages`);
    return null;
  }

  // Validate agents are allowed to communicate
  if (
    senderConfig.allowedPeers &&
    !senderConfig.allowedPeers.includes(toAgent)
  ) {
    console.warn(
      `Agent ${fromAgent} is not allowed to communicate with ${toAgent}`
    );
    return null;
  }

  // Create message
  const message: AgentMessage = {
    id: crypto.randomUUID(),
    fromAgent,
    toAgent,
    type,
    subject,
    content,
    timestamp: new Date().toISOString(),
    runId,
    metadata,
  };

  // Add to session
  session.messages.push(message);
  session.lastActivityAt = new Date().toISOString();

  // Add to recipient's message queue
  const queue = agentMessageQueues.get(toAgent) || [];
  queue.push(message);
  agentMessageQueues.set(toAgent, queue);

  console.log(
    `📨 Message sent: ${fromAgent} -> ${toAgent} [${type}]: ${subject}`
  );

  return message;
}

/**
 * Get pending messages for an agent
 */
export function getPendingMessages(
  runId: string,
  agentId: AgentId
): AgentMessage[] {
  const queue = agentMessageQueues.get(agentId) || [];
  const messages = queue.filter((msg) => msg.runId === runId);

  // Remove these messages from the queue
  const remainingMessages = queue.filter((msg) => msg.runId !== runId);
  agentMessageQueues.set(agentId, remainingMessages);

  return messages;
}

/**
 * Get all messages in a collaboration session
 */
export function getSessionMessages(runId: string): AgentMessage[] {
  const session = activeSessions.get(runId);
  return session ? session.messages : [];
}

/**
 * Get messages between two specific agents
 */
export function getMessageThread(
  runId: string,
  agent1: AgentId,
  agent2: AgentId
): AgentMessage[] {
  const session = activeSessions.get(runId);
  if (!session) return [];

  return session.messages.filter(
    (msg) =>
      (msg.fromAgent === agent1 && msg.toAgent === agent2) ||
      (msg.fromAgent === agent2 && msg.toAgent === agent1)
  );
}

/**
 * Find related messages (by metadata requestId)
 */
export function getRelatedMessages(
  runId: string,
  messageId: string
): AgentMessage[] {
  const session = activeSessions.get(runId);
  if (!session) return [];

  // Find the original message
  const originalMessage = session.messages.find((msg) => msg.id === messageId);
  if (!originalMessage) return [];

  // Find messages that reference this message
  return session.messages.filter(
    (msg) =>
      msg.metadata?.requestId === messageId ||
      msg.metadata?.replyTo === messageId
  );
}

/**
 * Close a collaboration session
 */
export function closeCollaborationSession(runId: string): void {
  const session = activeSessions.get(runId);
  if (!session) return;

  // Clear any remaining messages for this run
  for (const [agentId, queue] of agentMessageQueues.entries()) {
    const filteredQueue = queue.filter((msg) => msg.runId !== runId);
    agentMessageQueues.set(agentId, filteredQueue);
  }

  activeSessions.delete(runId);
  console.log(`🤝 Collaboration session closed for run ${runId}`);
}

/**
 * Get collaboration statistics for a session
 */
export function getCollaborationStats(runId: string) {
  const session = activeSessions.get(runId);
  if (!session) return null;

  const messagesByType = new Map<MessageType, number>();
  const messagesByAgent = new Map<AgentId, number>();

  session.messages.forEach((msg) => {
    // Count by type
    messagesByType.set(msg.type, (messagesByType.get(msg.type) || 0) + 1);

    // Count by sender
    messagesByAgent.set(
      msg.fromAgent,
      (messagesByAgent.get(msg.fromAgent) || 0) + 1
    );
  });

  return {
    totalMessages: session.messages.length,
    messagesByType: Object.fromEntries(messagesByType),
    messagesByAgent: Object.fromEntries(messagesByAgent),
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
  };
}

/**
 * Check if an agent can send a specific message type to another agent
 */
export function canSendMessage(
  fromAgent: AgentId,
  toAgent: AgentId,
  type: MessageType
): boolean {
  const senderConfig = AGENT_COLLABORATION_CONFIG[fromAgent];
  const recipientConfig = AGENT_COLLABORATION_CONFIG[toAgent];

  if (!senderConfig.canSendMessages || !recipientConfig.canReceiveMessages) {
    return false;
  }

  if (!senderConfig.supportedMessageTypes.includes(type)) {
    return false;
  }

  if (
    senderConfig.allowedPeers &&
    !senderConfig.allowedPeers.includes(toAgent)
  ) {
    return false;
  }

  return true;
}
