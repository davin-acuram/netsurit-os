import { config } from "dotenv";
config({ path: ".env.local" });

// Backfills only the gsc_daily_page_query table (the date x page x query
// breakdown). It's much larger than the single-dimension GSC tables, so
// it's kept out of the general backfill and defaults to a shorter window
// -- enough to cover the landing-pages "Top query" column for the date
// ranges people actually pick. Extend with `--days=N` or `--since=YYYY-MM-DD`.
//
//   npx tsx src/scripts/backfill-page-query.ts
//   npx tsx src/scripts/backfill-page-query.ts --days=240
//   npx tsx src/scripts/backfill-page-query.ts --since=2025-04-13

interface Chunk {
  startDate: string;
  endDate: string;
}

function weekChunks(startStr: string, endStr: string): Chunk[] {
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  const chunks: Chunk[] = [];
  let cur = new Date(start);
  while (cur <= end) {
    const chunkEnd = new Date(cur);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + 6);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ startDate: cur.toISOString().slice(0, 10), endDate: actualEnd.toISOString().slice(0, 10) });
    cur = new Date(actualEnd);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return chunks;
}

const ROW_LIMIT = 25000;
const MAX_INSERT_BATCH = 5000;
const PACE_MS = 1500;
const MAX_ATTEMPTS = 3;
const CIRCUIT_BREAKER = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const { searchAnalyticsQuery } = await import("@/lib/search-console/client");
  const { gscQueryResponseSchema } = await import("@/lib/search-console/schemas");
  const { db } = await import("@/db");
  const { gscDailyPageQuery } = await import("@/db/schema");
  const { sql } = await import("drizzle-orm");

  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const sinceArg = process.argv.find((a) => a.startsWith("--since="));
  const today = new Date().toISOString().slice(0, 10);
  let since: string;
  if (sinceArg) {
    since = sinceArg.split("=")[1];
  } else {
    const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 120;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    since = d.toISOString().slice(0, 10);
  }
  // GSC has no data before this date -- never ask for it.
  if (since < "2025-04-13") since = "2025-04-13";

  const chunks = weekChunks(since, today);
  console.log(`page_query backfill: ${chunks.length} weekly chunks, ${since}..${today}\n`);

  const set = {
    clicks: sql`excluded.clicks`,
    impressions: sql`excluded.impressions`,
    ctr: sql`excluded.ctr`,
    position: sql`excluded.position`,
  };

  let consecutiveFailures = 0;
  let totalRows = 0;
  for (const [i, c] of chunks.entries()) {
    const t0 = Date.now();
    let attempt = 1;
    let ok = false;
    let lastErr = "";
    for (; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const all: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] = [];
        let startRow = 0;
        while (true) {
          const raw = await searchAnalyticsQuery({
            startDate: c.startDate,
            endDate: c.endDate,
            dimensions: ["date", "page", "query"],
            rowLimit: ROW_LIMIT,
            startRow,
          });
          const { rows } = gscQueryResponseSchema.parse(raw);
          all.push(...rows);
          if (rows.length < ROW_LIMIT) break;
          startRow += ROW_LIMIT;
        }
        const mapped = all.map((r) => ({
          date: r.keys[0],
          page: r.keys[1],
          query: r.keys[2],
          clicks: Math.round(r.clicks),
          impressions: Math.round(r.impressions),
          ctr: String(r.ctr),
          position: String(r.position),
        }));
        for (const batch of chunk(mapped, MAX_INSERT_BATCH)) {
          await db
            .insert(gscDailyPageQuery)
            .values(batch)
            .onConflictDoUpdate({
              target: [gscDailyPageQuery.date, gscDailyPageQuery.page, gscDailyPageQuery.query],
              set,
            });
        }
        totalRows += mapped.length;
        console.log(`[${i + 1}/${chunks.length}] ${c.startDate}..${c.endDate} -> ${mapped.length} rows, ${Date.now() - t0}ms`);
        ok = true;
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_ATTEMPTS) await sleep(3000 * attempt);
      }
    }
    if (!ok) {
      console.log(`[${i + 1}/${chunks.length}] ${c.startDate}..${c.endDate} -> FAILED: ${lastErr}`);
      if (++consecutiveFailures >= CIRCUIT_BREAKER) {
        console.log(`\nABORTING after ${consecutiveFailures} consecutive failures.`);
        break;
      }
    } else {
      consecutiveFailures = 0;
    }
    await sleep(PACE_MS);
  }
  console.log(`\nDone. ${totalRows} rows upserted.`);
}

main()
  .catch((err) => {
    console.error("backfill-page-query crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
