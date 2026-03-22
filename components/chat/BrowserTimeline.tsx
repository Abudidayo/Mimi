"use client";

import { useEffect, useState } from "react";
import {
  Browser,
  CaretRight,
  CursorClick,
  Globe,
  Keyboard,
  MagnifyingGlass,
  WarningCircle,
  XCircle,
  SpinnerGap,
} from "@phosphor-icons/react";
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

function normalizeEvent(message: string) {
  const raw = message.trim();
  if (!raw) return null;

  let formatted = raw;
  formatted = formatted.replace(/^Agent calling tool:\s*/i, "");
  formatted = formatted.replace(/^act\s*/i, "");
  formatted = formatted.replace(/^goto\s+/i, "Open ");
  formatted = formatted.replace(/^ariaTree\s*$/i, "Scan the page");
  formatted = formatted.replace(/\btextbox\b/gi, "field");
  formatted = formatted.replace(/\binput\b/gi, "field");
  formatted = formatted.replace(/\s+/g, " ").trim();

  if (!formatted) return null;

  const lower = formatted.toLowerCase();

  if (lower.includes("shutdown supervisor unavailable")) {
    return {
      label: "Background cleanup is unavailable for this browser session",
      icon: <WarningCircle weight="fill" className="h-4 w-4 text-amber-200" />,
      tone: "warning",
    } as const;
  }

  if (lower.includes("stop requested") || lower.includes("closing browser session")) {
    return {
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      icon: <XCircle weight="fill" className="h-4 w-4 text-rose-200" />,
      tone: "danger",
    } as const;
  }

  if (
    lower.includes(" type ") ||
    lower.startsWith("type ") ||
    lower.includes("fill ") ||
    lower.includes("enter ")
  ) {
    return {
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      icon: <Keyboard weight="fill" className="h-4 w-4 text-violet-200" />,
      tone: "input",
    } as const;
  }

  if (lower.includes("click")) {
    return {
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      icon: <CursorClick weight="fill" className="h-4 w-4 text-sky-200" />,
      tone: "action",
    } as const;
  }

  if (lower.includes("scan the page") || lower.includes("observe") || lower.includes("aria")) {
    return {
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      icon: <MagnifyingGlass weight="fill" className="h-4 w-4 text-emerald-200" />,
      tone: "scan",
    } as const;
  }

  if (lower.includes("launching") || lower.includes("open ") || lower.includes("browserbase") || lower.includes("session")) {
    return {
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
      icon: <Globe weight="fill" className="h-4 w-4 text-cyan-200" />,
      tone: "nav",
    } as const;
  }

  return {
    label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    icon: <CaretRight weight="bold" className="h-4 w-4 text-emerald-200" />,
    tone: "default",
  } as const;
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
              {run.events
                .slice(-10)
                .map((event) => ({ event, normalized: normalizeEvent(event.message) }))
                .filter(
                  (
                    item
                  ): item is {
                    event: BrowserProgressEvent;
                    normalized: NonNullable<ReturnType<typeof normalizeEvent>>;
                  } => Boolean(item.normalized)
                )
                .map(({ event, normalized }) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`
                      flex items-start gap-3 rounded-2xl border px-3 py-2
                      ${normalized.tone === "warning" ? "border-amber-300/14 bg-amber-400/[0.06]" : ""}
                      ${normalized.tone === "danger" ? "border-rose-300/14 bg-rose-400/[0.06]" : ""}
                      ${normalized.tone !== "warning" && normalized.tone !== "danger" ? "border-white/8 bg-white/[0.04]" : ""}
                    `}
                  >
                    <div className="mt-0.5">{normalized.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-relaxed text-white/90">{normalized.label}</p>
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
