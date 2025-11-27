import { z } from "zod";

export const projectTypes = [
  "website",
  "web_app",
  "mobile_app",
  "database",
  "web3_dapp",
] as const;

export const projectTypeSchema = z.enum([...projectTypes] as [string, ...string[]]);

export const createProjectSchema = z.object({
  type: projectTypeSchema,
});

export const startPipelineSchema = z.object({
  projectId: z.string().uuid(),
});

export const cancelPipelineSchema = z.object({
  runId: z.string().uuid(),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid(),
});

export const projectIdRouteParamSchema = z.object({
  id: z.string().uuid(),
});

export const projectStatus = [
  "new",
  "discovery",
  "planning",
  "running_pipeline",
  "completed",
  "failed",
] as const;

export const projectStatusSchema = z.enum([...projectStatus] as [string, ...string[]]);

export const patchProjectSchema = z.object({
  status: projectStatusSchema.optional(),
  discoveryAnswers: z.any().optional(),
  projectSpec: z.any().optional(),
  handoffNotes: z.string().optional(),
  pipelineRunId: z.string().uuid().optional(),
});
