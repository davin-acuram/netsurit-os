import { NextRequest, NextResponse } from "next/server";
import { incrementalRange, syncGa4 } from "@/lib/google-analytics/sync";

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

  try {
    const result = await syncGa4(incrementalRange());
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
