import { config } from "dotenv";
config({ path: ".env.local" });

interface Chunk {
  source: "ga4" | "gsc";
  startDate: Date;
  endDate: Date;
  label: string;
}

function weekChunks(source: "ga4" | "gsc", startStr: string, endStr: string): Chunk[] {
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
      source,
      startDate: new Date(cur),
      endDate: new Date(actualEnd),
      label: `${source} ${startLabel}..${endLabel}`,
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

async function main() {
  const { syncGa4 } = await import("@/lib/google-analytics/sync");
  const { syncGsc } = await import("@/lib/search-console/sync");

  const today = new Date().toISOString().slice(0, 10);
  const ga4Chunks = weekChunks("ga4", "2023-04-24", today);
  const gscChunks = weekChunks("gsc", "2025-04-13", today);
  const smokeTest = process.argv.includes("--smoke-test");
  const allChunks = smokeTest
    ? [ga4Chunks[0], gscChunks[0]]
    : [...ga4Chunks, ...gscChunks];

  console.log(`Backfill plan: ${ga4Chunks.length} GA4 chunks (2023-04-24..${today}), ${gscChunks.length} GSC chunks (2025-04-13..${today}), ${allChunks.length} total.`);
  console.log();

  const results: { chunk: Chunk; ok: boolean; rowsSynced?: number; error?: string; attempts: number }[] = [];
  let consecutiveFailures = 0;

  for (const [i, chunk] of allChunks.entries()) {
    const syncFn = chunk.source === "ga4" ? syncGa4 : syncGsc;
    const range = { startDate: chunk.startDate, endDate: chunk.endDate };
    const t0 = Date.now();

    let outcome: { ok: boolean; rowsSynced?: number; error?: string; attempts: number };
    let lastError = "";
    let attempt = 1;
    for (; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await syncFn(range);
        outcome = { ok: true, rowsSynced: result.rowsSynced, attempts: attempt };
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
      console.log(`[${i + 1}/${allChunks.length}] ${chunk.label} -> ok, ${outcome.rowsSynced} rows, ${ms}ms (attempt ${outcome.attempts})`);
      consecutiveFailures = 0;
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
  console.log(`Backfill finished: ${succeeded.length}/${allChunks.length} chunks succeeded.`);
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
    // sync.ts's db client keeps its Postgres connection pool open, which
    // would otherwise leave the process hanging after main() resolves.
    process.exit(process.exitCode ?? 0);
  });
