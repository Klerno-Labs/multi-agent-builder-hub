import { useEffect, useState, useRef } from "react";
import { AgentId } from "@/lib/agents/types";

interface AgentMetrics {
  agentId: AgentId;
  displayName: string;
  status: "queued" | "running" | "completed" | "failed";
  currentTask?: string;
  tokensUsed: number;
  costUsd: number;
  executionTimeMs?: number;
}

interface PipelineMetrics {
  runId: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  agentMetrics: AgentMetrics[];
  totalTokens: number;
  totalCost: number;
  progressPercentage: number;
  currentAgentIndex: number;
  totalAgents: number;
}

interface DashboardMetrics {
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalTokensToday: number;
  totalCostToday: number;
  averageExecutionTime: number;
  currentPipeline?: PipelineMetrics;
  recentPipelines: PipelineMetrics[];
}

interface LogEntry {
  timestamp: string;
  agentId?: AgentId;
  message: string;
  level: "info" | "warn" | "error";
}

interface AgentStatus {
  agentId: AgentId;
  displayName: string;
  status: "queued" | "running" | "completed" | "failed" | "idle";
  message?: string;
}

export function useDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<Map<AgentId, AgentStatus>>(
    new Map()
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource("/api/dashboard/metrics/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("✅ Dashboard connected");
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.log("❌ Dashboard connection error");
    };

    // Handle metrics updates
    eventSource.addEventListener("metrics", (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(data);

        // Initialize agent statuses from current pipeline
        if (data.currentPipeline?.agentMetrics) {
          const statusMap = new Map<AgentId, AgentStatus>();
          data.currentPipeline.agentMetrics.forEach((agent: AgentMetrics) => {
            statusMap.set(agent.agentId, {
              agentId: agent.agentId,
              displayName: agent.displayName,
              status: agent.status,
              message: agent.currentTask,
            });
          });
          setAgentStatuses(statusMap);
        }
      } catch (error) {
        console.error("Failed to parse metrics:", error);
      }
    });

    // Handle agent status updates
    eventSource.addEventListener("agent_status", (event) => {
      try {
        const update = JSON.parse(event.data);
        const { agentId, status, message } = update.data;

        setAgentStatuses((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(agentId);
          newMap.set(agentId, {
            agentId,
            displayName: existing?.displayName || agentId,
            status,
            message,
          });
          return newMap;
        });
      } catch (error) {
        console.error("Failed to parse agent status:", error);
      }
    });

    // Handle log entries
    eventSource.addEventListener("log_entry", (event) => {
      try {
        const update = JSON.parse(event.data);
        const logEntry: LogEntry = {
          timestamp: update.timestamp,
          agentId: update.data.agentId,
          message: update.data.message,
          level: update.data.level,
        };

        setLogs((prev) => [...prev.slice(-99), logEntry]); // Keep last 100 logs
      } catch (error) {
        console.error("Failed to parse log entry:", error);
      }
    });

    // Cleanup on unmount
    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  return {
    metrics,
    agentStatuses,
    logs,
    isConnected,
  };
}
