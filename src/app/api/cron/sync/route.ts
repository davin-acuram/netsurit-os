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

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  let hadError = false;

  try {
    results.ga4 = await syncGa4(gaIncrementalRange());
  } catch (err) {
    hadError = true;
    results.ga4 = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  try {
    results.gsc = await syncGsc(gscIncrementalRange());
  } catch (err) {
    hadError = true;
    results.gsc = { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(
    { status: hadError ? "error" : "ok", ...results },
    { status: hadError ? 500 : 200 },
  );
}
