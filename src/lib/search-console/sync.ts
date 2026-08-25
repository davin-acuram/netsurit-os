import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  gscDailyCountry,
  gscDailyDevice,
  gscDailyPage,
  gscDailyQuery,
  syncRuns,
} from "@/db/schema";
import { searchAnalyticsQuery } from "./client";
import { gscQueryResponseSchema, type GscRow } from "./schemas";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// GSC data is typically 2-3 days behind and can still be revised for a
// few days after that, so every run resyncs a trailing window rather
// than trusting "yesterday" alone. Upserts make repeating it safe.
const INCREMENTAL_DAYS_BACK = 5;

export function incrementalRange(): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - INCREMENTAL_DAYS_BACK);
  return { startDate, endDate };
}

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// searchAnalytics.query caps a single response at 25,000 rows -- a
// popular "query" breakdown can exceed that, so page with startRow until
// a response comes back short of the cap.
const ROW_LIMIT = 25000;

async function fetchAllRows(range: DateRange, dimensions: string[]): Promise<GscRow[]> {
  const startDate = toApiDate(range.startDate);
  const endDate = toApiDate(range.endDate);
  const allRows: GscRow[] = [];
  let startRow = 0;

  while (true) {
    const raw = await searchAnalyticsQuery({
      startDate,
      endDate,
      dimensions,
      rowLimit: ROW_LIMIT,
      startRow,
    });
    const { rows } = gscQueryResponseSchema.parse(raw);
    allRows.push(...rows);
    if (rows.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }

  return allRows;
}

// ctr/position arrive as JSON floats (GSC has no string-value mode like
// GA4) -- stringify before insert so the numeric columns store the exact
// value the API returned instead of a float round-trip.
function mapQueryRows(rows: GscRow[]) {
  return rows.map((r) => ({
    date: r.keys[0],
    query: r.keys[1],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr: String(r.ctr),
    position: String(r.position),
  }));
}

function mapPageRows(rows: GscRow[]) {
  return rows.map((r) => ({
    date: r.keys[0],
    page: r.keys[1],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr: String(r.ctr),
    position: String(r.position),
  }));
}

function mapCountryRows(rows: GscRow[]) {
  return rows.map((r) => ({
    date: r.keys[0],
    country: r.keys[1],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr: String(r.ctr),
    position: String(r.position),
  }));
}

function mapDeviceRows(rows: GscRow[]) {
  return rows.map((r) => ({
    date: r.keys[0],
    device: r.keys[1],
    clicks: Math.round(r.clicks),
    impressions: Math.round(r.impressions),
    ctr: String(r.ctr),
    position: String(r.position),
  }));
}

const upsertMetricSet = {
  clicks: sql`excluded.clicks`,
  impressions: sql`excluded.impressions`,
  ctr: sql`excluded.ctr`,
  position: sql`excluded.position`,
};

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Postgres caps bind parameters at 65,535 per query. A site this size can
// return 15k+ rows for a single "query" breakdown over just a few days --
// well under the GSC API's own 25k-row cap, but enough to blow past
// Postgres's limit in one bulk insert. Chunk large upserts to stay safe.
const MAX_INSERT_BATCH = 5000;

async function upsertInBatches(
  table: PgTable,
  rows: Record<string, unknown>[],
  target: AnyPgColumn[],
  set: Record<string, SQL>,
): Promise<number> {
  for (const batch of chunk(rows, MAX_INSERT_BATCH)) {
    await db.insert(table).values(batch).onConflictDoUpdate({ target, set });
  }
  return rows.length;
}

export async function syncGsc(range: DateRange): Promise<{ rowsSynced: number }> {
  const startedAt = new Date();
  let rowsSynced = 0;
  const errors: string[] = [];

  // Each dimension is its own GSC API call (no batch endpoint exists),
  // so one failing breakdown shouldn't stop the other three from
  // landing -- errors are collected instead of thrown immediately.

  try {
    const mapped = mapQueryRows(await fetchAllRows(range, ["date", "query"]));
    if (mapped.length > 0) {
      rowsSynced += await upsertInBatches(
        gscDailyQuery,
        mapped,
        [gscDailyQuery.date, gscDailyQuery.query],
        upsertMetricSet,
      );
    }
  } catch (err) {
    errors.push(`query: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const mapped = mapPageRows(await fetchAllRows(range, ["date", "page"]));
    if (mapped.length > 0) {
      rowsSynced += await upsertInBatches(
        gscDailyPage,
        mapped,
        [gscDailyPage.date, gscDailyPage.page],
        upsertMetricSet,
      );
    }
  } catch (err) {
    errors.push(`page: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const mapped = mapCountryRows(await fetchAllRows(range, ["date", "country"]));
    if (mapped.length > 0) {
      rowsSynced += await upsertInBatches(
        gscDailyCountry,
        mapped,
        [gscDailyCountry.date, gscDailyCountry.country],
        upsertMetricSet,
      );
    }
  } catch (err) {
    errors.push(`country: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const mapped = mapDeviceRows(await fetchAllRows(range, ["date", "device"]));
    if (mapped.length > 0) {
      rowsSynced += await upsertInBatches(
        gscDailyDevice,
        mapped,
        [gscDailyDevice.date, gscDailyDevice.device],
        upsertMetricSet,
      );
    }
  } catch (err) {
    errors.push(`device: ${err instanceof Error ? err.message : String(err)}`);
  }

  await db.insert(syncRuns).values({
    source: "gsc",
    startedAt,
    finishedAt: new Date(),
    status: errors.length === 0 ? "success" : "error",
    rowsSynced,
    error: errors.length > 0 ? errors.join("; ") : null,
  });

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return { rowsSynced };
}
