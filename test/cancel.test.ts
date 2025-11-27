import { describe, it, expect } from "vitest";
import { createProject, createPipelineRun, getPipelineRun } from "../lib/projects/store";
import { buildExecutionOrder, cancelPipelineRun, isRunCancelled } from "../lib/pipeline/engine";

describe("pipeline cancellation", () => {
  it("persists cancelRequested on pipeline and agent runs", async () => {
    const project = createProject("website");
    const order = buildExecutionOrder();
    const agentRuns = order.map((a) => ({
      id: crypto.randomUUID(),
      agentId: a.id,
      status: "queued" as const,
      logs: [],
    }));

    const run = createPipelineRun(project.id, agentRuns);

    await cancelPipelineRun(run.id);

    const persisted = getPipelineRun(run.id)!;
    expect(persisted).toBeDefined();
    expect(persisted.cancelRequested).toBeTruthy();
    for (const ar of persisted.agentRuns) {
      expect(ar.cancelRequested).toBeTruthy();
    }
    expect(isRunCancelled(run.id)).toBe(true);
  });
});
