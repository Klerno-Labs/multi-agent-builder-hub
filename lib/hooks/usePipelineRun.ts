"use client";

import { useEffect, useRef, useState } from "react";
import { PipelineRun, PipelineLogEntry } from "@/lib/agents/types";

export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "error" | "max_retries_exceeded";

const MAX_RECONNECT_ATTEMPTS = 8; // ~2 minutes total (500ms * 2^8 = 128s base + jitter)
const MAX_BACKOFF_MS = 30000; // Cap at 30 seconds

export function usePipelineRun(runId: string | null) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldStopRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!runId) {
      setConnectionState("idle");
      return;
    }

    let cancelled = false;

    async function fetchInitial() {
      try {
        const res = await fetch(`/api/pipeline/status/${runId}`);
        if (!res.ok) {
          setError("Failed to fetch pipeline run");
          setConnectionState("error");
          return;
        }
        const data = (await res.json()) as PipelineRun;
        if (cancelled) return;
        setRun(data);
        setLogs(data.logs ?? []);
        // set last timestamp from initial logs
        const initialLogs = data.logs ?? [];
        if (initialLogs.length > 0) {
          lastTimestampRef.current = initialLogs[initialLogs.length - 1].timestamp;
        }

        // If run is already in terminal state, don't start SSE
        if (["completed", "failed", "cancelled"].includes(data.status)) {
          setConnectionState("idle");
          shouldStopRef.current = true;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setConnectionState("error");
      }
    }

    fetchInitial();

    shouldStopRef.current = false;
    reconnectAttemptRef.current = 0;

    const createEventSource = () => {
      if (!runId || shouldStopRef.current) return;

      // Check if we've exceeded max retries
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setConnectionState("max_retries_exceeded");
        setError(`Connection lost after ${MAX_RECONNECT_ATTEMPTS} retry attempts. Please refresh the page.`);
        shouldStopRef.current = true;
        return;
      }

      setConnectionState("connecting");
      const since = lastTimestampRef.current;
      const url = since
        ? `/api/pipeline/status/${runId}?since=${encodeURIComponent(since)}`
        : `/api/pipeline/status/${runId}`;
      const es = new EventSource(url);
      esRef.current = es;

      const onOpen = () => {
        setConnectionState("connected");
        setError(null);
        // Reset reconnect counter on successful connection
        reconnectAttemptRef.current = 0;
      };

      const onLog = (ev: MessageEvent) => {
        try {
          const entry = JSON.parse(ev.data) as PipelineLogEntry;
          setLogs((prev) => {
            // Deduplicate: only add if this log ID doesn't already exist
            if (prev.some((log) => log.id === entry.id)) {
              return prev;
            }
            return [...prev, entry];
          });
          lastTimestampRef.current = entry.timestamp;
        } catch {
          // ignore parse errors
        }
      };

      const onDone = (ev: MessageEvent) => {
        try {
          const finalRun = JSON.parse(ev.data) as PipelineRun;
          setRun(finalRun);
          shouldStopRef.current = true; // Terminal state reached
        } finally {
          es.close();
          setConnectionState("idle");
        }
      };

      const onError = (ev: MessageEvent) => {
        try {
          const errorData = JSON.parse(ev.data);
          setError(errorData.error || "Unknown error");
          setConnectionState("error");
        } catch {
          // ignore parse errors
        }
      };

      es.addEventListener("open", onOpen as EventListener);
      es.addEventListener("log", onLog as EventListener);
      es.addEventListener("done", onDone as EventListener);
      es.addEventListener("error", onError as EventListener);

      es.onerror = () => {
        // Connection error - close and schedule reconnect with exponential backoff
        es.close();

        if (shouldStopRef.current) return;

        setConnectionState("disconnected");

        reconnectAttemptRef.current += 1;

        // Calculate backoff with exponential growth and jitter
        const baseBackoff = 500 * Math.pow(2, reconnectAttemptRef.current);
        const backoff = Math.min(MAX_BACKOFF_MS, baseBackoff);
        const jitter = Math.random() * 300;
        const totalDelay = backoff + jitter;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!shouldStopRef.current) {
            createEventSource();
          }
        }, totalDelay);
      };
    };

    createEventSource();

    return () => {
      cancelled = true;
      shouldStopRef.current = true;

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close EventSource
      try {
        esRef.current?.close();
      } catch {}
      esRef.current = null;

      setConnectionState("idle");
    };
  }, [runId]);

  return { run, logs, error, connectionState } as const;
}
