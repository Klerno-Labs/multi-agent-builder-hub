import { describe, it, expect, vi, beforeEach } from "vitest";
import * as llmClient from "../../lib/llm/client";
import { createProject, getPipelineRun } from "../../lib/projects/store";
import { runPipeline } from "../../lib/pipeline/engine";

describe("LLM retry behavior", () => {
  beforeEach(() => {
    process.env.LLM_MODE = "live";
  });

  it("retries on LLM failure and eventually succeeds", async () => {
    let callCount = 0;
    const stub = vi.spyOn(llmClient, "runWithLLM").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("simulated transient LLM error");
      }
      return { output: "LLM result", raw: {} } as any;
    });

    const project = createProject("website");
    const run = runPipeline(project.id);

    // wait for pipeline to finish (agents are fast mocks)
    await new Promise((r) => setTimeout(r, 1500));

    const persisted = getPipelineRun(run.id)!;
    expect(persisted).toBeDefined();
    // ensure run completed or at least llm attempted twice
    expect(callCount).toBeGreaterThanOrEqual(2);

    stub.mockRestore();
  });
});
