"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Metrics = {
  projects: Record<string, number>;
  pipelineRuns: Record<string, number>;
  totalProjects: number;
  totalPipelineRuns: number;
  estimatedCost: number;
  updatedAt: string;
};

const defaultMetrics: Metrics = {
  projects: {},
  pipelineRuns: {},
  totalProjects: 0,
  totalPipelineRuns: 0,
  estimatedCost: 0,
  updatedAt: "",
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics);
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const connect = () => {
      setStatus("connecting");
      const es = new EventSource("/api/dashboard/metrics/stream");

      es.addEventListener("metrics", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as Metrics;
          setMetrics(data);
          setStatus("streaming");
          setError(null);
        } catch (err) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Failed to parse metrics");
        }
      });

      es.onerror = () => {
        setStatus("error");
        setError("Metrics stream disconnected");
        es.close();
      };

      return () => es.close();
    };

    const cleanup = connect();
    return cleanup;
  }, []);

  const projectStatuses = useMemo(
    () => Object.entries(metrics.projects ?? {}),
    [metrics.projects],
  );
  const runStatuses = useMemo(
    () => Object.entries(metrics.pipelineRuns ?? {}),
    [metrics.pipelineRuns],
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">
            Live metrics
          </p>
          <h1 className="text-3xl font-semibold text-slate-50">
            Agent pipeline dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Project and pipeline counters update in real time via SSE.
          </p>
        </div>
        <Badge color={status === "streaming" ? "green" : "yellow"}>
          {status === "streaming" ? "Streaming" : status === "error" ? "Error" : "Connecting"}
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-950/60">
          <p className="text-xs uppercase tracking-wide text-slate-400">Projects</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">
            {metrics.totalProjects}
          </h2>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            {projectStatuses.map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="capitalize text-slate-400">{k}</span>
                <span className="font-semibold text-slate-100">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-slate-950/60">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pipeline runs</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">
            {metrics.totalPipelineRuns}
          </h2>
          <div className="mt-3 space-y-1 text-sm text-slate-300">
            {runStatuses.map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="capitalize text-slate-400">{k}</span>
                <span className="font-semibold text-slate-100">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-slate-950/60">
          <p className="text-xs uppercase tracking-wide text-slate-400">LLM cost (est.)</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-50">
            ${metrics.estimatedCost.toFixed(4)}
          </h2>
          <p className="mt-3 text-xs text-slate-400">
            Updated:{" "}
            {metrics.updatedAt
              ? new Date(metrics.updatedAt).toLocaleTimeString()
              : "—"}
          </p>
        </Card>
      </div>
    </main>
  );
}
