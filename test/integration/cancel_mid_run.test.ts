import { describe, it, expect } from "vitest";
import { createProject, getPipelineRun } from "../../lib/projects/store";
import { runPipeline, cancelPipelineRun } from "../../lib/pipeline/engine";

describe("integration: cancel mid-run", () => {
  it("persists cancellation and marks agent runs cancelled", async () => {
    const project = createProject("website");
    const run = runPipeline(project.id);

    // wait a bit for the pipeline to start processing first agent
    await new Promise((r) => setTimeout(r, 200));

    await cancelPipelineRun(run.id);

    // give a moment for persistence
    await new Promise((r) => setTimeout(r, 200));

    const persisted = getPipelineRun(run.id)!;
    expect(persisted).toBeDefined();
    expect(persisted.cancelRequested).toBeTruthy();

    const anyCancelled = persisted.agentRuns.some(
      (ar) => ar.cancelRequested === true || ar.status === "cancelled",
    );
    expect(anyCancelled).toBeTruthy();
  });
});
