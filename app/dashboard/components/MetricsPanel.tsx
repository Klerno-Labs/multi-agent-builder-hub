interface DashboardMetrics {
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  totalTokensToday: number;
  totalCostToday: number;
  averageExecutionTime: number;
}

interface MetricsPanelProps {
  metrics: DashboardMetrics | null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800/50 rounded-lg p-4 animate-pulse"
          >
            <div className="h-4 bg-slate-700 rounded w-20 mb-2" />
            <div className="h-8 bg-slate-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      label: "Active Runs",
      value: metrics.activeRuns,
      color: "text-blue-400",
      icon: "🏃",
    },
    {
      label: "Completed",
      value: metrics.completedRuns,
      color: "text-green-400",
      icon: "✅",
    },
    {
      label: "Failed",
      value: metrics.failedRuns,
      color: "text-red-400",
      icon: "❌",
    },
    {
      label: "Tokens Today",
      value: formatNumber(metrics.totalTokensToday),
      color: "text-purple-400",
      icon: "🔤",
    },
    {
      label: "Cost Today",
      value: formatCost(metrics.totalCostToday),
      color: "text-yellow-400",
      icon: "💰",
    },
    {
      label: "Avg Time",
      value: formatTime(metrics.averageExecutionTime),
      color: "text-cyan-400",
      icon: "⏱️",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {metricCards.map((metric, index) => (
        <div
          key={index}
          className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-all hover:scale-105"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">{metric.label}</span>
            <span className="text-2xl">{metric.icon}</span>
          </div>
          <div className={`text-2xl font-bold ${metric.color}`}>
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
