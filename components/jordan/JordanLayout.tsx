import { useEffect, useState } from "react";
import { sendJordanMessage } from "@/lib/jordan/api";
import {
  JordanChatState,
  JordanMessage,
  ProjectType,
} from "@/lib/jordan/types";
import { JordanChat } from "./JordanChat";
import { JordanSummary } from "./JordanSummary";
import { Card } from "../ui/card";

interface JordanLayoutProps {
  projectId: string;
  projectType: ProjectType;
}

export function JordanLayout({ projectId, projectType }: JordanLayoutProps) {
  const [state, setState] = useState<JordanChatState>({
    messages: [],
    snapshot: undefined,
    isComplete: false,
    loading: false,
    error: undefined,
  });

  useEffect(() => {
    if (state.messages.length === 0) {
      void bootstrapConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrapConversation = async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const response = await sendJordanMessage({
        projectId,
        projectType,
        message: "",
        history: [],
      });
      setState({
        messages: response.messages,
        snapshot: response.snapshot,
        isComplete: response.isComplete,
        loading: false,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start discovery chat.",
      }));
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || state.loading) return;
    const userMessage: JordanMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    const history = [...state.messages, userMessage];
    setState((prev) => ({
      ...prev,
      messages: history,
      loading: true,
      error: undefined,
    }));

    try {
      const response = await sendJordanMessage({
        projectId,
        projectType,
        message,
        history,
      });
      setState((prev) => ({
        ...prev,
        messages: response.messages,
        snapshot: response.snapshot,
        isComplete: response.isComplete,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong sending your message.",
      }));
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">
            Discovery · Jordan
          </p>
          <h1 className="text-3xl font-semibold text-slate-50">
            {projectType.replace("_", " ")} discovery chat
          </h1>
          <p className="text-sm text-slate-400">
            Jordan captures requirements via conversation. Live summary updates on the right.
          </p>
        </div>
        <Card className="border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
          Project ID: <span className="font-mono text-xs text-slate-100">{projectId}</span>
        </Card>
      </div>

      {state.error && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <JordanChat state={state} onSend={handleSend} />
        <JordanSummary snapshot={state.snapshot} isComplete={state.isComplete} />
      </div>
    </main>
  );
}
