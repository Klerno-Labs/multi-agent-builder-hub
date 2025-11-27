import { z } from "zod";
import { JordanMessage, JordanRequirementsSnapshot, ProjectType } from "./types";

const jordanResponseSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.string(),
    }),
  ),
  snapshot: z
    .object({
      strategy: z.string().optional(),
      branding: z.string().optional(),
      uxUi: z.string().optional(),
      techStack: z.string().optional(),
      pages: z.string().optional(),
      performance: z.string().optional(),
      seo: z.string().optional(),
      content: z.string().optional(),
      security: z.string().optional(),
      analytics: z.string().optional(),
      conversion: z.string().optional(),
      scaling: z.string().optional(),
      legal: z.string().optional(),
      maintenance: z.string().optional(),
      wowFactor: z.string().optional(),
    })
    .optional(),
  isComplete: z.boolean(),
});

export async function sendJordanMessage(params: {
  projectId: string;
  projectType: ProjectType;
  message: string;
  history: JordanMessage[];
}): Promise<{
  messages: JordanMessage[];
  snapshot?: JordanRequirementsSnapshot;
  isComplete: boolean;
}> {
  const response = await fetch("/api/jordan/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error ?? "Jordan chat failed");
  }

  const data = await response.json();
  const parsed = jordanResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid response from Jordan backend");
  }
  return parsed.data;
}
