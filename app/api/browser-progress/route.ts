import { NextResponse } from "next/server";
import { listBrowserProgressRuns, stopBrowserProgressRun } from "@/lib/browser/progress-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    runs: listBrowserProgressRuns(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { runId?: string };

  if (!body.runId) {
    return NextResponse.json({ ok: false, error: "runId is required" }, { status: 400 });
  }

  const stopped = await stopBrowserProgressRun(body.runId);
  return NextResponse.json({ ok: stopped });
}
