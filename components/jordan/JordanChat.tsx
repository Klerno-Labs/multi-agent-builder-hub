import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { JordanChatState } from "@/lib/jordan/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface JordanChatProps {
  state: JordanChatState;
  onSend: (message: string) => void;
}

export function JordanChat({ state, onSend }: JordanChatProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [state.messages]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || state.loading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!state.loading) {
        onSend(input.trim());
        setInput("");
      }
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">Jordan</p>
          <h3 className="text-lg font-semibold text-slate-50">Discovery chat</h3>
        </div>
        {state.loading && (
          <span className="text-xs text-slate-400">Jordan is thinking…</span>
        )}
      </div>
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-900/70 bg-slate-900/50 p-3"
      >
        {state.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "assistant" ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-lg",
                message.role === "assistant"
                  ? "bg-slate-800/70 text-slate-100 ring-1 ring-cyan-500/30"
                  : "bg-cyan-500 text-slate-950 ring-1 ring-cyan-300/60",
              )}
            >
              {message.role === "assistant" && (
                <p className="mb-1 text-xs uppercase tracking-wide text-cyan-200">
                  Jordan
                </p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {state.messages.length === 0 && (
          <div className="text-sm text-slate-500">Jordan will start the conversation shortly.</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <textarea
          className="min-h-[80px] w-full resize-none rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          placeholder="Type a message to Jordan…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={state.loading}
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Enter to send · Shift+Enter for newline</span>
          <Button type="submit" loading={state.loading} disabled={!input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
