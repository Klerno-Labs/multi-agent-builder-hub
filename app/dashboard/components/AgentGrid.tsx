import { AgentId } from "@/lib/agents/types";

interface AgentStatus {
  agentId: AgentId;
  displayName: string;
  status: "queued" | "running" | "completed" | "failed" | "idle";
  message?: string;
}

interface AgentGridProps {
  agentStatuses: Map<AgentId, AgentStatus>;
}

const ALL_AGENTS: { id: AgentId; name: string; icon: string }[] = [
  { id: "riley", name: "Riley", icon: "📋" },
  { id: "jordan", name: "Jordan", icon: "🔧" },
  { id: "mia", name: "Mia", icon: "⚡" },
  { id: "ava", name: "Ava", icon: "🎨" },
  { id: "iris", name: "Iris", icon: "💎" },
  { id: "liam", name: "Liam", icon: "🔌" },
  { id: "noah", name: "Noah", icon: "⚛️" },
  { id: "sophia", name: "Sophia", icon: "📱" },
  { id: "kai", name: "Kai", icon: "🐍" },
  { id: "ethan", name: "Ethan", icon: "🗄️" },
  { id: "owen", name: "Owen", icon: "🌐" },
  { id: "grace", name: "Grace", icon: "✅" },
  { id: "nova", name: "Nova", icon: "☁️" },
  { id: "chloe", name: "Chloe", icon: "📊" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "running":
      return "bg-blue-500 border-blue-400";
    case "completed":
      return "bg-green-500 border-green-400";
    case "failed":
      return "bg-red-500 border-red-400";
    case "queued":
      return "bg-yellow-500 border-yellow-400";
    default:
      return "bg-slate-600 border-slate-500";
  }
}

function getStatusAnimation(status: string) {
  if (status === "running") {
    return "animate-pulse";
  }
  return "";
}

export function AgentGrid({ agentStatuses }: AgentGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {ALL_AGENTS.map((agent) => {
        const status = agentStatuses.get(agent.id);
        const currentStatus = status?.status || "idle";
        const message = status?.message;

        return (
          <div
            key={agent.id}
            className={`
              relative overflow-hidden rounded-lg border-2 p-4 transition-all duration-300
              ${getStatusColor(currentStatus)} ${getStatusAnimation(currentStatus)}
              hover:scale-105 hover:shadow-lg
            `}
          >
            {/* Status indicator dot */}
            <div className="absolute top-2 right-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentStatus === "running"
                    ? "bg-white animate-ping"
                    : "bg-white/50"
                }`}
              />
            </div>

            {/* Agent icon and name */}
            <div className="flex flex-col items-center text-center">
              <div className="text-4xl mb-2">{agent.icon}</div>
              <div className="font-bold text-white mb-1">{agent.name}</div>
              <div className="text-xs text-white/80 capitalize">
                {currentStatus}
              </div>
              {message && (
                <div className="text-xs text-white/60 mt-2 line-clamp-2">
                  {message}
                </div>
              )}
            </div>

            {/* Shimmer effect for running status */}
            {currentStatus === "running" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        );
      })}
    </div>
  );
}
