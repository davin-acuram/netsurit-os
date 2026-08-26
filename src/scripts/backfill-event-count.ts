import { config } from "dotenv";
config({ path: ".env.local" });

interface Chunk {
  startDate: Date;
  endDate: Date;
  label: string;
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
    const startLabel = cur.toISOString().slice(0, 10);
    const endLabel = actualEnd.toISOString().slice(0, 10);
    chunks.push({
      startDate: new Date(cur),
      endDate: new Date(actualEnd),
      label: `event_count ${startLabel}..${endLabel}`,
    });
    cur = new Date(actualEnd);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return chunks;
}

const PACE_MS = 1500;
const MAX_ATTEMPTS = 3;
const CIRCUIT_BREAKER_CONSECUTIVE_FAILURES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GA4 API returns the "date" dimension as YYYYMMDD with no separators.
function parseGaDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function main() {
  const { runReport } = await import("@/lib/google-analytics/client");
  const { gaReportSchema } = await import("@/lib/google-analytics/schemas");
  const { db } = await import("@/db");
  const { sql } = await import("drizzle-orm");

  const today = new Date().toISOString().slice(0, 10);
  const chunks = weekChunks("2023-04-24", today);
  const smokeTest = process.argv.includes("--smoke-test");
  const allChunks = smokeTest ? [chunks[0]] : chunks;

  console.log(`event_count backfill plan: ${allChunks.length} weekly chunks (2023-04-24..${today}).`);
  console.log();

  const results: { chunk: Chunk; ok: boolean; rowsUpdated?: number; error?: string; attempts: number }[] = [];
  let consecutiveFailures = 0;
  let totalUpdated = 0;

  for (const [i, chunk] of allChunks.entries()) {
    const t0 = Date.now();

    let outcome: { ok: boolean; rowsUpdated?: number; error?: string; attempts: number };
    let lastError = "";
    let attempt = 1;
    for (; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const raw = await runReport({
          dateRanges: [{ startDate: toApiDate(chunk.startDate), endDate: toApiDate(chunk.endDate) }],
          dimensions: ["date", "sessionDefaultChannelGroup"],
          metrics: ["eventCount"],
        });
        const report = gaReportSchema.parse(raw);
        const dimNames = report.dimensionHeaders.map((h) => h.name);
        const metricNames = report.metricHeaders.map((h) => h.name);
        const rows = report.rows.map((row) => {
          const obj: Record<string, string> = {};
          row.dimensionValues.forEach((v, idx) => {
            obj[dimNames[idx]] = v.value;
          });
          row.metricValues.forEach((v, idx) => {
            obj[metricNames[idx]] = v.value;
          });
          return {
            date: parseGaDate(obj.date),
            channel: obj.sessionDefaultChannelGroup,
            eventCount: parseInt(obj.eventCount, 10),
          };
        });

        let rowsUpdated = 0;
        if (rows.length > 0) {
          // Only updates rows that already exist for this date+channel --
          // this backfill fills in one historical column, it never inserts
          // new date/channel combinations (the full sync already owns that).
          for (const r of rows) {
            const result = await db.execute(sql`
              UPDATE ga_daily_channel
              SET event_count = ${r.eventCount}
              WHERE date = ${r.date} AND channel = ${r.channel}
            `);
            rowsUpdated += result.count ?? 0;
          }
        }
        outcome = { ok: true, rowsUpdated, attempts: attempt };
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_ATTEMPTS) {
          console.log(`  [${i + 1}/${allChunks.length}] ${chunk.label} attempt ${attempt} failed, retrying: ${lastError}`);
          await sleep(3000 * attempt);
        }
      }
    }
    outcome ??= { ok: false, error: lastError, attempts: attempt - 1 };

    const ms = Date.now() - t0;
    if (outcome.ok) {
      console.log(`[${i + 1}/${allChunks.length}] ${chunk.label} -> ok, ${outcome.rowsUpdated} rows, ${ms}ms (attempt ${outcome.attempts})`);
      consecutiveFailures = 0;
      totalUpdated += outcome.rowsUpdated ?? 0;
    } else {
      console.log(`[${i + 1}/${allChunks.length}] ${chunk.label} -> FAILED after ${outcome.attempts} attempts, ${ms}ms: ${outcome.error}`);
      consecutiveFailures++;
    }
    results.push({ chunk, ...outcome });

    if (consecutiveFailures >= CIRCUIT_BREAKER_CONSECUTIVE_FAILURES) {
      console.log();
      console.log(`ABORTING: ${consecutiveFailures} consecutive chunk failures -- likely a systemic issue (quota, auth, outage), not a transient blip. Stopping rather than burning through the remaining ${allChunks.length - i - 1} chunks.`);
      break;
    }

    await sleep(PACE_MS);
  }

  const failed = results.filter((r) => !r.ok);
  const succeeded = results.filter((r) => r.ok);
  console.log();
  console.log(`Backfill finished: ${succeeded.length}/${allChunks.length} chunks succeeded, ${totalUpdated} rows updated.`);
  if (failed.length > 0) {
    console.log(`${failed.length} chunk(s) FAILED and were not recovered:`);
    failed.forEach((f) => console.log(`  - ${f.chunk.label}: ${f.error}`));
  }
}

main()
  .catch((err) => {
    console.error("Backfill script crashed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
