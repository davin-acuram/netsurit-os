import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

export interface DateRange {
  start: string;
  end: string;
}

export type SortDir = "asc" | "desc";

export interface GscKpiValues {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscKpiSummary {
  current: GscKpiValues;
  previous: GscKpiValues | null;
  deltaPct: Partial<Record<keyof GscKpiValues, number | null>>;
}

export interface TrendPoint {
  date: string;
  clicks: number;
  impressions: number;
}

export interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface CountryRow {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DeviceRow {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Mirrors google-analytics/queries.ts -- previous period is the same
// length immediately preceding the current range.
export function getPreviousPeriod(range: DateRange): DateRange {
  const start = new Date(`${range.start}T00:00:00Z`);
  const end = new Date(`${range.end}T00:00:00Z`);
  const lengthMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  };
}

interface RawKpiRow {
  clicks: string | null;
  impressions: string | null;
  position_weighted: string | null;
}

// gsc_daily_query already has one row per query per day -- summing
// across all queries for a day recovers site-wide totals without a
// separate rollup table. CTR and position are ratios: recompute them
// from the summed numerator/denominator rather than summing the
// per-day/per-query values, and weight position by impressions the
// same way GA weights engagement rate by sessions.
async function fetchKpiValues(range: DateRange): Promise<GscKpiValues> {
  const result = await db.execute(sql`
    SELECT
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      SUM(position * impressions) as position_weighted
    FROM gsc_daily_query
    WHERE date BETWEEN ${range.start} AND ${range.end}
  `);
  const rows = result as unknown as RawKpiRow[];
  const row = rows[0];
  const clicks = Number(row?.clicks ?? 0);
  const impressions = Number(row?.impressions ?? 0);
  const positionWeighted = Number(row?.position_weighted ?? 0);

  return {
    clicks,
    impressions,
    ctr: safeDivide(clicks, impressions),
    position: safeDivide(positionWeighted, impressions),
  };
}

export async function getKpiSummary(range: DateRange, withComparison: boolean): Promise<GscKpiSummary> {
  const current = await fetchKpiValues(range);
  if (!withComparison) {
    return { current, previous: null, deltaPct: {} };
  }
  const previous = await fetchKpiValues(getPreviousPeriod(range));
  const keys = Object.keys(current) as (keyof GscKpiValues)[];
  const deltas: Partial<Record<keyof GscKpiValues, number | null>> = {};
  for (const key of keys) {
    deltas[key] = deltaPct(current[key], previous[key]);
  }
  return { current, previous, deltaPct: deltas };
}

export async function getClicksImpressionsTrend(range: DateRange): Promise<TrendPoint[]> {
  const result = await db.execute(sql`
    SELECT date, SUM(clicks) as clicks, SUM(impressions) as impressions
    FROM gsc_daily_query
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY date
    ORDER BY date ASC
  `);
  const rows = result as unknown as { date: string; clicks: string; impressions: string }[];
  return rows.map((r) => ({
    date: typeof r.date === "string" ? r.date : new Date(r.date as unknown as string).toISOString().slice(0, 10),
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
  }));
}

export const PAGE_SIZE = 25;

export const QUERY_SORT_KEYS = ["query", "clicks", "impressions", "ctr", "position"] as const;
export type QuerySortKey = (typeof QUERY_SORT_KEYS)[number];

export const PAGE_SORT_KEYS = ["page", "clicks", "impressions", "ctr", "position"] as const;
export type PageSortKey = (typeof PAGE_SORT_KEYS)[number];

// Interpolating these SQL fragments is safe because they only ever come
// from the fixed key sets above (validated with isQuerySortKey/
// isPageSortKey), never from a raw request string.
const QUERY_SORT_COLUMNS: Record<QuerySortKey, SQL> = {
  query: sql`query`,
  clicks: sql`clicks`,
  impressions: sql`impressions`,
  ctr: sql`ctr`,
  position: sql`position`,
};

const PAGE_SORT_COLUMNS: Record<PageSortKey, SQL> = {
  page: sql`page`,
  clicks: sql`clicks`,
  impressions: sql`impressions`,
  ctr: sql`ctr`,
  position: sql`position`,
};

export function isQuerySortKey(value: string): value is QuerySortKey {
  return (QUERY_SORT_KEYS as readonly string[]).includes(value);
}

export function isPageSortKey(value: string): value is PageSortKey {
  return (PAGE_SORT_KEYS as readonly string[]).includes(value);
}

function orderByFragment(column: SQL, dir: SortDir): SQL {
  return dir === "asc" ? sql`${column} ASC` : sql`${column} DESC`;
}

interface RawTopRow {
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
  total_count: string;
}

export async function getTopQueries(
  range: DateRange,
  page: number,
  sortKey: QuerySortKey,
  sortDir: SortDir,
): Promise<PaginatedResult<QueryRow>> {
  const offset = (page - 1) * PAGE_SIZE;
  const column = QUERY_SORT_COLUMNS[sortKey];
  const result = await db.execute(sql`
    WITH agg AS (
      SELECT
        query,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
      FROM gsc_daily_query
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
    )
    SELECT *, COUNT(*) OVER() as total_count
    FROM agg
    ORDER BY ${orderByFragment(column, sortDir)}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `);
  const rows = result as unknown as (RawTopRow & { query: string })[];
  return {
    rows: rows.map((r) => ({
      query: r.query,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      ctr: Number(r.ctr),
      position: Number(r.position),
    })),
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  };
}

export async function getTopPages(
  range: DateRange,
  page: number,
  sortKey: PageSortKey,
  sortDir: SortDir,
): Promise<PaginatedResult<PageRow>> {
  const offset = (page - 1) * PAGE_SIZE;
  const column = PAGE_SORT_COLUMNS[sortKey];
  const result = await db.execute(sql`
    WITH agg AS (
      SELECT
        page,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
      FROM gsc_daily_page
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY page
    )
    SELECT *, COUNT(*) OVER() as total_count
    FROM agg
    ORDER BY ${orderByFragment(column, sortDir)}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `);
  const rows = result as unknown as (RawTopRow & { page: string })[];
  return {
    rows: rows.map((r) => ({
      page: r.page,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      ctr: Number(r.ctr),
      position: Number(r.position),
    })),
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
  };
}

const COUNTRY_LIMIT = 15;

export async function getCountryBreakdown(range: DateRange): Promise<CountryRow[]> {
  const result = await db.execute(sql`
    SELECT
      country,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
      CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
    FROM gsc_daily_country
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY country
    ORDER BY clicks DESC
    LIMIT ${COUNTRY_LIMIT}
  `);
  const rows = result as unknown as (RawTopRow & { country: string })[];
  return rows.map((r) => ({
    country: r.country,
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
    ctr: Number(r.ctr),
    position: Number(r.position),
  }));
}

export async function getDeviceBreakdown(range: DateRange): Promise<DeviceRow[]> {
  const result = await db.execute(sql`
    SELECT
      device,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
      CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
    FROM gsc_daily_device
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY device
    ORDER BY clicks DESC
  `);
  const rows = result as unknown as (RawTopRow & { device: string })[];
  return rows.map((r) => ({
    device: r.device,
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
    ctr: Number(r.ctr),
    position: Number(r.position),
  }));
}
