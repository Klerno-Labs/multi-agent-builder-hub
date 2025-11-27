import { useEffect, useRef } from "react";
import { AgentId } from "@/lib/agents/types";

interface LogEntry {
  timestamp: string;
  agentId?: AgentId;
  message: string;
  level: "info" | "warn" | "error";
}

interface LogStreamProps {
  logs: LogEntry[];
}

function getLevelColor(level: string) {
  switch (level) {
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "warn":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    default:
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case "error":
      return "❌";
    case "warn":
      return "⚠️";
    default:
      return "ℹ️";
  }
}

export function LogStream({ logs }: LogStreamProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 h-96 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">📝</div>
          <p>No logs yet. Start a pipeline to see live updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">
          Live Logs ({logs.length})
        </h3>
        <div className="text-xs text-slate-500">Auto-scrolling</div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`p-3 rounded border ${getLevelColor(log.level)} transition-all duration-300 animate-slideIn`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{getLevelIcon(log.level)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {log.agentId && (
                    <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                      {log.agentId}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-200 break-words">
                  {log.message}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
