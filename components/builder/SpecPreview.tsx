import { ProjectSpec } from "@/lib/agents/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SpecPreviewProps {
  spec: ProjectSpec;
  onConfirm: () => void;
  onBack?: () => void;
}

export function SpecPreview({ spec, onConfirm, onBack }: SpecPreviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">
            Project spec
          </p>
          <h2 className="text-2xl font-semibold text-slate-50">
            Generated scope preview
          </h2>
          <p className="text-sm text-slate-400">
            Riley&apos;s draft based on your answers. Tweak before running agents.
          </p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
          )}
          <Button onClick={onConfirm}>Looks good → Run agents</Button>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <Section title="Summary">
            <p className="text-slate-200">{spec.summary}</p>
          </Section>

          <Section title="Tech stack">
            <List items={spec.techStack} />
          </Section>

          <Section title="Key features">
            <List items={spec.keyFeatures} />
          </Section>

          <Section title="Pages / Screens">
            <List items={spec.pagesOrScreens} />
          </Section>

          <Section title="Data model">
            <List items={spec.dataModel} />
          </Section>

          <Section title="API routes">
            <List items={spec.apiRoutes} />
          </Section>

          {spec.risks && spec.risks.length > 0 && (
            <Section title="Risks / notes">
              <List items={spec.risks} />
            </Section>
          )}
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100/90"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
