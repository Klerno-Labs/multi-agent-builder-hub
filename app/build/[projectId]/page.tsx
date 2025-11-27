"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { JordanLayout } from "@/components/jordan/JordanLayout";
import { ProjectType } from "@/lib/jordan/types";

export default function BuildPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const projectId = Array.isArray(params?.projectId) ? params.projectId[0] : params?.projectId ?? "";

  useEffect(() => {
    const typeParam = searchParams.get("type") as ProjectType | null;
    if (typeParam) {
      setProjectType(typeParam);
      setLoading(false);
    } else {
      void fetchProjectType();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchProjectType = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error("Project not found");
      }
      const data = await res.json();
      setProjectType(data.type as ProjectType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load project");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 text-slate-100">
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm">
          {error}
        </div>
      </main>
    );
  }

  if (!projectType || loading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 text-slate-300">
        Loading discovery workspace...
      </main>
    );
  }

  return <JordanLayout projectId={projectId} projectType={projectType} />;
}
