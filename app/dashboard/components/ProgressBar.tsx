interface PipelineMetrics {
  runId: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progressPercentage: number;
  currentAgentIndex: number;
  totalAgents: number;
  totalTokens: number;
  totalCost: number;
}

interface ProgressBarProps {
  pipeline: PipelineMetrics;
}

export function ProgressBar({ pipeline }: ProgressBarProps) {
  const { progressPercentage, currentAgentIndex, totalAgents, status } = pipeline;

  const statusColor = {
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    cancelled: "bg-gray-500",
  }[status];

  const statusText = {
    running: "In Progress",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  }[status];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Pipeline Progress</h3>
          <p className="text-sm text-slate-400">
            Agent {currentAgentIndex} of {totalAgents} • {statusText}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-400">
            {Math.round(progressPercentage)}%
          </div>
          <div className="text-xs text-slate-400">
            {pipeline.totalTokens.toLocaleString()} tokens
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${statusColor} transition-all duration-500 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        >
          {status === "running" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Cost and tokens */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400">Total Cost:</span>{" "}
            <span className="text-yellow-400 font-bold">
              ${pipeline.totalCost.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-slate-400 text-xs">
          Run ID: {pipeline.runId.slice(0, 8)}...
        </div>
      </div>
    </div>
  );
}
