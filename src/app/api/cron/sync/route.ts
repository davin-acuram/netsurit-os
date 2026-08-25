import { NextResponse } from "next/server";

// Placeholder route to confirm the cron path exists. Sync logic (GA4 +
// Search Console fetch, Postgres writes) lands in the data-source phase.
export async function GET() {
  return NextResponse.json({ status: "not implemented" }, { status: 501 });
}
