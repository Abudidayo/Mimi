"use client";

import { useEffect, useState } from "react";
import { Browser, CaretRight, CursorClick, Globe, Keyboard, SpinnerGap } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface BrowserProgressEvent {
  id: string;
  timestamp: number;
  message: string;
}

interface BrowserProgressRun {
  id: string;
  label: string;
  status: "running" | "completed" | "failed" | "stopped";
  startUrl: string;
  startedAt: number;
  updatedAt: number;
  sessionUrl?: string;
  summary?: string;
  events: BrowserProgressEvent[];
}

function iconForMessage(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes(" type ") ||
    lower.startsWith("type ") ||
    lower.includes("fill ") ||
    lower.includes("enter ")
  ) {
    return <Keyboard weight="fill" className="h-3.5 w-3.5 text-violet-200" />;
  }

  if (lower.includes("click")) {
    return <CursorClick weight="fill" className="h-3.5 w-3.5 text-sky-200" />;
  }

  if (lower.includes("goto") || lower.includes("browserbase") || lower.includes("session")) {
    return <Globe weight="fill" className="h-3.5 w-3.5 text-cyan-200" />;
  }

  return <CaretRight weight="bold" className="h-3.5 w-3.5 text-emerald-200" />;
}

function formatEventMessage(message: string) {
  let formatted = message.trim();

  formatted = formatted.replace(/^Agent calling tool:\s*/i, "");
  formatted = formatted.replace(/^act\s*/i, "");
  formatted = formatted.replace(/^goto\s*/i, "Open ");
  formatted = formatted.replace(/^ariaTree\s*$/i, "Scan the page");

  if (/^type\s+['"].+['"]\s+into\s+/i.test(formatted)) {
    formatted = formatted.replace(/^type\s+/i, "Type ");
  } else if (/^type\s+/i.test(formatted)) {
    formatted = formatted.replace(/^type\s+/i, "Enter ");
  }

  formatted = formatted.replace(/\btextbox\b/gi, "field");
  formatted = formatted.replace(/\binput\b/gi, "field");
  formatted = formatted.replace(/\s+/g, " ").trim();

  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  return formatted;
}

export function BrowserTimeline({ active }: { active: boolean }) {
  const [runs, setRuns] = useState<BrowserProgressRun[]>([]);
  const [stoppingRunId, setStoppingRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/browser-progress", { cache: "no-store" });
        const data = (await res.json()) as { runs?: BrowserProgressRun[] };
        if (!cancelled) {
          setRuns(Array.isArray(data.runs) ? data.runs : []);
        }
      } catch {
        if (!cancelled) {
          setRuns([]);
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active]);

  if (!active || runs.length === 0) {
    return null;
  }

  const handleStop = async (runId: string) => {
    setStoppingRunId(runId);
    try {
      await fetch("/api/browser-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const res = await fetch("/api/browser-progress", { cache: "no-store" });
      const data = (await res.json()) as { runs?: BrowserProgressRun[] };
      setRuns(Array.isArray(data.runs) ? data.runs : []);
    } finally {
      setStoppingRunId(null);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {runs.map((run) => (
        <motion.div
          key={run.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] border px-4 py-3"
          style={{
            background: "linear-gradient(180deg, rgba(16,30,74,0.96), rgba(8,18,46,0.96))",
            borderColor: "rgba(125,211,252,0.16)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              {run.status === "running" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                >
                  <SpinnerGap weight="bold" className="h-4 w-4 text-emerald-200" />
                </motion.div>
              ) : (
                <Browser weight="fill" className="h-4 w-4 text-cyan-200" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{run.label}</p>
              <p className="text-xs text-white/55">
                {run.status === "running"
                  ? "Live browser activity"
                  : run.status === "stopped"
                    ? "Stopped by user"
                    : run.summary ?? "Browser run finished"}
              </p>
            </div>
            {run.status === "running" && (
              <button
                type="button"
                onClick={() => {
                  void handleStop(run.id);
                }}
                disabled={stoppingRunId === run.id}
                className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-400/20 disabled:opacity-60"
              >
                {stoppingRunId === run.id ? "Stopping..." : "Stop"}
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
              {run.events.slice(-8).map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2"
                >
                  <div className="mt-0.5">{iconForMessage(event.message)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/90">{formatEventMessage(event.message)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
