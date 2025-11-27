import { agentRegistry } from "@/lib/agents/registry";
import {
  AgentRun,
  PipelineLogEntry,
  PipelineRunStatus,
} from "@/lib/agents/types";
import { ConnectionState } from "@/lib/hooks/usePipelineRun";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineViewProps {
  runs: AgentRun[];
  pipelineStatus: PipelineRunStatus | "not_started";
  onRun: () => void;
  onCancel?: () => void;
  running: boolean;
  logs: PipelineLogEntry[];
  connectionState?: ConnectionState;
}

export function PipelineView({
  runs,
  pipelineStatus,
  onRun,
    onCancel,
    running,
    logs,
    connectionState,
}: PipelineViewProps) {
  const statusColor = (status: AgentRun["status"]) => {
    switch (status) {
      case "completed":
        return "green";
      case "running":
        return "blue";
      case "cancelled":
        return "orange";
      case "error":
        return "red";
      case "queued":
        return "yellow";
      default:
        return "gray";
    }
  };

  const runMap = runs.reduce<Record<string, AgentRun>>((acc, run) => {
    acc[run.agentId] = run;
    return acc;
  }, {});

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Agent pipeline
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">
              Orchestration plan
            </h2>
            <p className="text-sm text-slate-400">
              Mia coordinates the following specialists with dependencies baked in.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onRun} loading={running} disabled={running}>
              {pipelineStatus === "completed" ? "Re-run pipeline" : "Run full pipeline"}
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} disabled={!running}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {agentRegistry.map((agent) => {
            const agentRun = runMap[agent.id];
            const status = agentRun?.status ?? "idle";
            return (
              <div
                key={agent.id}
                className={cn(
                  "rounded-xl border border-slate-800/70 bg-slate-900/60 p-4",
                  status === "running" && "border-cyan-500/50 shadow-cyan-500/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {agent.displayName}
                    </p>
                    <p className="text-xs text-slate-400">{agent.role}</p>
                  </div>
                  <Badge color={statusColor(status)}>{status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-400">{agent.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800/70 px-2 py-1">
                    Stage: {agent.stage}
                  </span>
                  {agent.dependencies.length > 0 && (
                    <span className="rounded-full bg-slate-800/70 px-2 py-1">
                      Waits for {agent.dependencies.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-cyan-500/20 bg-slate-900/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Logs</p>
            <h3 className="text-lg font-semibold text-slate-50">Agent activity</h3>
          </div>
          <div className="flex items-center gap-2">
            {connectionState === "connecting" && (
              <span className="text-xs text-yellow-400">Connecting...</span>
            )}
            {connectionState === "disconnected" && (
              <span className="text-xs text-orange-400">Reconnecting...</span>
            )}
            {connectionState === "error" && (
              <span className="text-xs text-red-400">Connection error</span>
            )}
            <Badge color={pipelineStatus === "completed" ? "green" : "blue"}>
              {pipelineStatus}
            </Badge>
          </div>
        </div>
        <div className="mt-4 space-y-2 max-h-[360px] overflow-y-auto pr-2">
          {logs.length === 0 && (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
          {logs
            .slice()
            .reverse()
            .map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100/90"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.agentId && (
                    <span className="uppercase tracking-wide">
                      {log.agentId}
                    </span>
                  )}
                </div>
                <p>{log.message}</p>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
