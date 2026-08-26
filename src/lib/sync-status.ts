import { sql } from "drizzle-orm";
import { db } from "@/db";

export type SyncSource = "ga4" | "gsc";

export interface SyncRun {
  finishedAt: string;
  status: "success" | "error";
  rowsSynced: number;
  error: string | null;
}

export interface SyncStatus {
  source: SyncSource;
  // The most recent run regardless of outcome -- if this is an error,
  // the UI needs to surface it rather than silently falling back to
  // lastSuccess and hiding the failure.
  latest: SyncRun;
  // Most recent successful run, for "data as of" context when the
  // latest run failed. Null if this source has never synced successfully.
  lastSuccess: SyncRun | null;
}

interface RawSyncRow {
  source: string;
  finished_at: string;
  status: string;
  rows_synced: number;
  error: string | null;
}

function toSyncRun(row: RawSyncRow): SyncRun {
  return {
    finishedAt: new Date(row.finished_at).toISOString(),
    status: row.status === "error" ? "error" : "success",
    rowsSynced: Number(row.rows_synced),
    error: row.error,
  };
}

export async function getLatestSyncStatus(): Promise<SyncStatus[]> {
  const [latestResult, successResult] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (source) source, finished_at, status, rows_synced, error
      FROM sync_runs
      ORDER BY source, finished_at DESC
    `),
    db.execute(sql`
      SELECT DISTINCT ON (source) source, finished_at, status, rows_synced, error
      FROM sync_runs
      WHERE status = 'success'
      ORDER BY source, finished_at DESC
    `),
  ]);

  const latestRows = latestResult as unknown as RawSyncRow[];
  const successRows = successResult as unknown as RawSyncRow[];
  const successBySource = new Map(successRows.map((r) => [r.source, toSyncRun(r)]));

  return latestRows.map((row) => ({
    source: row.source as SyncSource,
    latest: toSyncRun(row),
    lastSuccess: successBySource.get(row.source) ?? null,
  }));
}
