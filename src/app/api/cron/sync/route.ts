import { NextRequest, NextResponse } from "next/server";
import { incrementalRange as gaIncrementalRange, syncGa4 } from "@/lib/google-analytics/sync";
import { incrementalRange as gscIncrementalRange, syncGsc } from "@/lib/search-console/sync";

// Vercel's own Cron Jobs send `Authorization: Bearer $CRON_SECRET`
// automatically once the env var is set; the query param exists for
// manual triggers/testing.
function isAuthorized(request: NextRequest, secret: string): boolean {
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === secret || querySecret === secret;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD overrides the incremental
// window -- for manually backfilling a gap (e.g. after the database was
// paused and the daily cron missed days). Keep each call to about a week:
// a single request has to finish within the function's time limit.
function explicitRange(request: NextRequest): { startDate: Date; endDate: Date } | null | "invalid" {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from && !to) return null;
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) return "invalid";
  return { startDate: new Date(`${from}T00:00:00Z`), endDate: new Date(`${to}T00:00:00Z`) };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const range = explicitRange(request);
  if (range === "invalid") {
    return NextResponse.json({ error: "from and to must both be YYYY-MM-DD, with from <= to" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};
  let hadError = false;

  try {
    results.ga4 = await syncGa4(range ?? gaIncrementalRange());
  } catch (err) {
    hadError = true;
    results.ga4 = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  try {
    results.gsc = await syncGsc(range ?? gscIncrementalRange());
  } catch (err) {
    hadError = true;
    results.gsc = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(
    { status: hadError ? "error" : "ok", ...results },
    { status: hadError ? 500 : 200 },
  );
}
