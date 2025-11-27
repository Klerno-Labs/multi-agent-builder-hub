import { JordanRequirementsSnapshot } from "@/lib/jordan/types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

interface JordanSummaryProps {
  snapshot?: JordanRequirementsSnapshot;
  isComplete: boolean;
}

const sections: Array<{ key: keyof JordanRequirementsSnapshot; label: string }> = [
  { key: "strategy", label: "Strategy" },
  { key: "branding", label: "Branding" },
  { key: "uxUi", label: "UX / UI" },
  { key: "techStack", label: "Tech Stack" },
  { key: "pages", label: "Pages" },
  { key: "performance", label: "Performance" },
  { key: "seo", label: "SEO" },
  { key: "content", label: "Content" },
  { key: "security", label: "Security" },
  { key: "analytics", label: "Analytics" },
  { key: "conversion", label: "Conversion" },
  { key: "scaling", label: "Scaling" },
  { key: "legal", label: "Legal" },
  { key: "maintenance", label: "Maintenance" },
  { key: "wowFactor", label: "Wow Factor" },
];

export function JordanSummary({ snapshot, isComplete }: JordanSummaryProps) {
  return (
    <Card className="h-full border border-slate-800/70 bg-slate-950/70 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">
            Requirements summary
          </p>
          <h3 className="text-lg font-semibold text-slate-50">Live updates</h3>
        </div>
        <Badge color={isComplete ? "green" : "blue"}>
          {isComplete ? "Discovery complete" : "Discovery in progress"}
        </Badge>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {sections.map(({ key, label }) => {
          const value = snapshot?.[key]?.trim();
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-sm text-slate-100">
                {value && value.length > 0 ? value : "Not filled yet"}
              </p>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          Discovery is done. You can proceed to the next agent stage.
        </div>
      )}
    </Card>
  );
}
