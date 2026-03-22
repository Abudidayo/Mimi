export type BrowserProgressStatus = "running" | "completed" | "failed" | "stopped";

export interface BrowserProgressEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface BrowserProgressRun {
  id: string;
  label: string;
  status: BrowserProgressStatus;
  startUrl: string;
  startedAt: number;
  updatedAt: number;
  sessionUrl?: string;
  summary?: string;
  events: BrowserProgressEvent[];
}

declare global {
  var __browserProgressRuns: Map<string, BrowserProgressRun> | undefined;
  var __browserProgressStopHandlers: Map<string, () => Promise<void> | void> | undefined;
}

function getStore() {
  if (!globalThis.__browserProgressRuns) {
    globalThis.__browserProgressRuns = new Map<string, BrowserProgressRun>();
  }

  return globalThis.__browserProgressRuns;
}

function getStopHandlers() {
  if (!globalThis.__browserProgressStopHandlers) {
    globalThis.__browserProgressStopHandlers = new Map<string, () => Promise<void> | void>();
  }

  return globalThis.__browserProgressStopHandlers;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startBrowserProgressRun(label: string, startUrl: string) {
  const run: BrowserProgressRun = {
    id: createId("browser"),
    label,
    status: "running",
    startUrl,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    events: [],
  };

  getStore().set(run.id, run);
  return run.id;
}

export function appendBrowserProgressEvent(runId: string, message: string) {
  const run = getStore().get(runId);
  if (!run) return;

  run.events.push({
    id: createId("evt"),
    timestamp: Date.now(),
    message,
  });
  run.updatedAt = Date.now();

  if (run.events.length > 40) {
    run.events = run.events.slice(-40);
  }
}

export function registerBrowserProgressStopHandler(runId: string, handler: () => Promise<void> | void) {
  getStopHandlers().set(runId, handler);
}

export function finishBrowserProgressRun(
  runId: string,
  status: BrowserProgressStatus,
  summary?: string,
  sessionUrl?: string
) {
  const run = getStore().get(runId);
  if (!run) return;

  run.status = status;
  run.summary = summary;
  run.sessionUrl = sessionUrl;
  run.updatedAt = Date.now();
  getStopHandlers().delete(runId);
}

export function listBrowserProgressRuns() {
  return Array.from(getStore().values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
}

export async function stopBrowserProgressRun(runId: string) {
  const run = getStore().get(runId);
  if (!run) return false;

  appendBrowserProgressEvent(runId, "Stop requested by user");
  run.status = "stopped";
  run.summary = "Stopped by user.";
  run.updatedAt = Date.now();

  const stopHandler = getStopHandlers().get(runId);
  if (stopHandler) {
    await stopHandler();
    getStopHandlers().delete(runId);
  }

  return true;
}
