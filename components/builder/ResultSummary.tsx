import { Project, ProjectSpec } from "@/lib/agents/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ResultSummaryProps {
  project: Project;
  spec?: ProjectSpec;
  onDownload: () => void;
}

export function ResultSummary({ project, spec, onDownload }: ResultSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Result
          </p>
          <h2 className="text-2xl font-semibold text-slate-50">
            Project ready to download
          </h2>
          <p className="text-sm text-slate-400">
            Chloe summarized the deliverable. Owen packaged the output folder.
          </p>
        </div>
        <Button onClick={onDownload}>Download project ZIP</Button>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge color="blue">{project.type.replace("_", " ")}</Badge>
              <span className="text-xs text-slate-400">Status: {project.status}</span>
            </div>
            <p className="text-slate-200">
              {project.handoffNotes ??
                "Multi-Agent Builder Hub produced a packaged project with frontend, backend, database, web3, QA, audit, and docs stubs."}
            </p>
            {spec && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Key features
                </h3>
                <ul className="grid gap-2 md:grid-cols-2">
                  {spec.keyFeatures.map((item) => (
                    <li
                      key={item}
                      className="rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100/90"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              What&apos;s inside
            </h3>
            <ul className="space-y-2 text-sm text-slate-200">
              <li>frontend/pages/index.tsx – UI shell</li>
              <li>backend/app.ts – API server scaffold</li>
              <li>database/schema.sql – starter schema</li>
              <li>web3/ProjectRegistry.sol – contract stub</li>
              <li>tests/smoke.test.ts – QA baseline</li>
              <li>docs/summary.md – Chloe&apos;s handoff notes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
