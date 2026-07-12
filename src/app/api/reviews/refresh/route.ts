import { NextResponse } from "next/server";
import { runFetchJob } from "@/lib/fetch-job";

export const dynamic = "force-dynamic";

// A real scheduled job would call runFetchJob() from a cron trigger; this
// endpoint exposes the same function so it can also be triggered on demand
// (the dashboard's "Refresh" button, or `curl -X POST .../refresh`).
export async function POST() {
  try {
    const results = await runFetchJob();
    const anyFailed = results.some((r) => r.status === "failed");
    return NextResponse.json({ results }, { status: anyFailed ? 207 : 200 });
  } catch (err) {
    console.error("POST /api/reviews/refresh failed:", err);
    return NextResponse.json({ error: "Refresh job failed to run" }, { status: 500 });
  }
}
