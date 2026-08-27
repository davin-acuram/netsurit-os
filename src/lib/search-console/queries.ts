import { unstable_cache } from "next/cache";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { BRAND_TERMS } from "@/lib/insights/brand-terms";

export interface DateRange {
  start: string;
  end: string;
}

export type SortDir = "asc" | "desc";

// "branded" -- the searcher already knows a Netsurit entity name;
// "nonbranded" -- generic/discovery search. Classification is the single
// hardcoded substring list in src/lib/insights/brand-terms.ts, matched
// the same way getKeyInsightsData does.
export type QuerySegment = "branded" | "nonbranded";

// Case-insensitive "does this query contain a brand term" test, as an
// OR-chain of `ILIKE '%term%'` against the given column. Every caller
// applies this to an already-GROUP BY query rollup (~17k distinct queries
// for a 30-day range), never the raw ~130k daily rows -- on the rollup the
// ILIKE chain is a simple substring scan and costs ~0.5s; a POSIX regex
// (`~*`) was measured 2-3x slower there, and filtering the daily rows
// before grouping is slower still. Safe to interpolate: fragments are
// parameterized binds and BRAND_TERMS is a compile-time constant.
function brandedQueryCondition(column: SQL = sql`query`): SQL {
  return sql.join(
    BRAND_TERMS.map((t) => sql`${column} ILIKE ${`%${t}%`}`),
    sql` OR `,
  );
}

// Applied in the OUTER query against a grouped CTE (aliased `cur`), not in
// the daily-rows WHERE -- see brandedQueryCondition.
function segmentFilter(segment: QuerySegment): SQL {
  const cond = brandedQueryCondition(sql`cur.query`);
  return segment === "branded" ? sql`WHERE (${cond})` : sql`WHERE NOT (${cond})`;
}

export interface GscKpiValues {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  // Raw click count from non-branded queries in the range.
  nonBrandedClicks: number;
  // ...and that same count as a share of all organic clicks.
  nonBrandedClickShare: number;
}

export interface GscKpiSummary {
  current: GscKpiValues;
  previous: GscKpiValues | null;
  deltaPct: Partial<Record<keyof GscKpiValues, number | null>>;
}

export interface MonthlyClicksImpressions {
  month: string; // YYYY-MM
  clicks: number;
  impressions: number;
}

export interface PositionBucketRow {
  bucket: string;
  queries: number;
}

export interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  // Average position in the previous equivalent period minus this
  // period's -- positive means the query moved UP the results (improved).
  // null when the query had no impressions in the previous period.
  positionDelta: number | null;
}

export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  // The single query that drove the most clicks to this page in the
  // range (ties broken by impressions, then alphabetically). null when no
  // date x page x query data is synced for the range yet.
  topQuery: string | null;
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
  nonbranded_clicks: string | null;
}

// gsc_daily_query already has one row per query per day -- summing
// across all queries for a day recovers site-wide totals without a
// separate rollup table. CTR and position are ratios: recompute them
// from the summed numerator/denominator rather than summing the
// per-day/per-query values, and weight position by impressions the
// same way GA weights engagement rate by sessions.
//
// The brand test runs against a per_query rollup, not the raw daily rows:
// collapsing ~130k daily rows to ~17k distinct queries first cuts the
// regex-match work by ~8x (measured ~3s -> ~0.5s for this query).
async function fetchKpiValues(range: DateRange): Promise<GscKpiValues> {
  const result = await db.execute(sql`
    WITH per_query AS (
      SELECT
        query,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        SUM(position * impressions) as position_weighted
      FROM gsc_daily_query
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
    )
    SELECT
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(position_weighted), 0) as position_weighted,
      COALESCE(SUM(clicks) FILTER (WHERE NOT (${brandedQueryCondition()})), 0) as nonbranded_clicks
    FROM per_query
  `);
  const rows = result as unknown as RawKpiRow[];
  const row = rows[0];
  const clicks = Number(row?.clicks ?? 0);
  const impressions = Number(row?.impressions ?? 0);
  const positionWeighted = Number(row?.position_weighted ?? 0);
  const nonBrandedClicks = Number(row?.nonbranded_clicks ?? 0);

  return {
    clicks,
    impressions,
    ctr: safeDivide(clicks, impressions),
    position: safeDivide(positionWeighted, impressions),
    nonBrandedClicks,
    nonBrandedClickShare: safeDivide(nonBrandedClicks, clicks),
  };
}

export async function getKpiSummary(range: DateRange, withComparison: boolean): Promise<GscKpiSummary> {
  if (!withComparison) {
    return { current: await fetchKpiValues(range), previous: null, deltaPct: {} };
  }
  // Current and previous periods are independent scans -- run them together
  // rather than back to back (this was the single biggest serial wait on
  // both detail pages and the Overview scorecards).
  const [current, previous] = await Promise.all([
    fetchKpiValues(range),
    fetchKpiValues(getPreviousPeriod(range)),
  ]);
  const keys = Object.keys(current) as (keyof GscKpiValues)[];
  const deltas: Partial<Record<keyof GscKpiValues, number | null>> = {};
  for (const key of keys) {
    deltas[key] = deltaPct(current[key], previous[key]);
  }
  return { current, previous, deltaPct: deltas };
}

// Fixed rolling trailing-22-month window ending today, mirroring GA4's
// getNewUsersMonthlyTrend -- deliberately takes no DateRange, this chart
// is independent of the page's date-range picker. GSC's own history only
// begins 2025-04-13, so the window currently returns fewer than 22 months
// and lengthens naturally as history accumulates; leading empty months
// are not synthesized.
// Scanning ~2M rows (22 months, the whole table) on every page load was
// ~4.6s. The result only changes when a sync lands new daily rows, and
// it's bucketed by month and detached from the date picker -- an hour of
// staleness is invisible. unstable_cache keeps it in the Next data cache
// (shared across requests / instances) between revalidations.
export const getClicksImpressionsMonthlyTrend = unstable_cache(
  async (): Promise<MonthlyClicksImpressions[]> => {
    const result = await db.execute(sql`
      SELECT
        to_char(date_trunc('month', date), 'YYYY-MM') as month,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions
      FROM gsc_daily_query
      WHERE date >= (CURRENT_DATE - INTERVAL '22 months')
      GROUP BY month
      ORDER BY month ASC
    `);
    const rows = result as unknown as { month: string; clicks: string; impressions: string }[];
    return rows.map((r) => ({
      month: r.month,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
    }));
  },
  ["gsc-clicks-impressions-monthly-trend"],
  { revalidate: 3600 },
);

// Buckets queries by their impression-weighted average position over the
// range (same position calc as getTopQueries). Bucketed SQL-side; only
// four counts come back. Queries with zero impressions have no meaningful
// position and are excluded.
export async function getPositionDistribution(range: DateRange): Promise<PositionBucketRow[]> {
  const result = await db.execute(sql`
    WITH agg AS (
      SELECT SUM(position * impressions) / SUM(impressions) AS position
      FROM gsc_daily_query
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
      HAVING SUM(impressions) > 0
    )
    SELECT
      COUNT(*) FILTER (WHERE position < 3.5) AS b1_3,
      COUNT(*) FILTER (WHERE position >= 3.5 AND position < 10.5) AS b4_10,
      COUNT(*) FILTER (WHERE position >= 10.5 AND position < 20.5) AS b11_20,
      COUNT(*) FILTER (WHERE position >= 20.5) AS b21
    FROM agg
  `);
  const rows = result as unknown as { b1_3: string; b4_10: string; b11_20: string; b21: string }[];
  const row = rows[0];
  return [
    { bucket: "1–3", queries: Number(row?.b1_3 ?? 0) },
    { bucket: "4–10", queries: Number(row?.b4_10 ?? 0) },
    { bucket: "11–20", queries: Number(row?.b11_20 ?? 0) },
    { bucket: "21+", queries: Number(row?.b21 ?? 0) },
  ];
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
  segment: QuerySegment,
): Promise<PaginatedResult<QueryRow>> {
  const offset = (page - 1) * PAGE_SIZE;
  const column = QUERY_SORT_COLUMNS[sortKey];
  const prev = getPreviousPeriod(range);
  // Group both periods' daily rows to one row per query first, THEN apply
  // the brand filter to that ~17k-row rollup (see brandedQueryCondition).
  // COUNT(*) OVER() runs after the filter and before LIMIT, so the total
  // reflects the segment, not the whole table.
  const result = await db.execute(sql`
    WITH cur AS (
      SELECT
        query,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
      FROM gsc_daily_query
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
    ),
    prev AS (
      SELECT
        query,
        CASE WHEN SUM(impressions) = 0 THEN NULL ELSE SUM(position * impressions) / SUM(impressions) END as position
      FROM gsc_daily_query
      WHERE date BETWEEN ${prev.start} AND ${prev.end}
      GROUP BY query
    )
    SELECT cur.*, prev.position as prev_position, COUNT(*) OVER() as total_count
    FROM cur LEFT JOIN prev USING (query)
    ${segmentFilter(segment)}
    ORDER BY ${orderByFragment(column, sortDir)}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `);
  const rows = result as unknown as (RawTopRow & { query: string; prev_position: string | null })[];
  return {
    rows: rows.map((r) => {
      const position = Number(r.position);
      const prevPosition = r.prev_position === null ? null : Number(r.prev_position);
      return {
        query: r.query,
        clicks: Number(r.clicks),
        impressions: Number(r.impressions),
        ctr: Number(r.ctr),
        position,
        positionDelta: prevPosition === null ? null : prevPosition - position,
      };
    }),
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
  // The page metrics come from gsc_daily_page; the "top query" per page
  // needs gsc_daily_page_query, which is bigger. Paginate the page list
  // first, then a LATERAL sub-select finds rank-1 query for just the 25
  // pages on screen (seeks by page via gsc_daily_page_query_page_date_idx).
  const result = await db.execute(sql`
    WITH agg AS (
      SELECT
        page,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position,
        COUNT(*) OVER() as total_count
      FROM gsc_daily_page
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY page
      ORDER BY ${orderByFragment(column, sortDir)}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    )
    SELECT agg.*, tq.query as top_query
    FROM agg
    LEFT JOIN LATERAL (
      SELECT query
      FROM gsc_daily_page_query
      WHERE page = agg.page AND date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
      ORDER BY SUM(clicks) DESC, SUM(impressions) DESC, query ASC
      LIMIT 1
    ) tq ON true
    ORDER BY ${orderByFragment(column, sortDir)}
  `);
  const rows = result as unknown as (RawTopRow & { page: string; top_query: string | null })[];
  return {
    rows: rows.map((r) => ({
      page: r.page,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      ctr: Number(r.ctr),
      position: Number(r.position),
      topQuery: r.top_query ?? null,
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

export interface OpportunityCandidate {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface KeyInsightsData {
  totalClicks: number;
  brandedClicks: number;
  topNClicks: number;
  // Top decile of queries by impression volume, capped to a small set --
  // the benchmark-gap ranking to find the single best example happens in
  // Node against the hardcoded CTR-by-position table
  // (src/lib/insights/benchmarks.ts), which has no SQL equivalent worth
  // building.
  opportunityCandidates: OpportunityCandidate[];
}

const OPPORTUNITY_CANDIDATE_LIMIT = 50;

// Backs all three Overview "key insights" that read gsc_daily_query
// (branded-vs-non-branded split, top-N query concentration, and
// high-impression/low-CTR opportunity candidates) in a single query. This
// aggregates the whole table exactly once server-side and returns only a
// handful of scalars plus a capped candidate list -- earlier versions
// either ran three separate GROUP BY scans concurrently (slow enough under
// Supabase's pooled connection to blow through its statement_timeout) or
// returned one row per query for the whole range (tens of thousands of
// rows transferred over the network on every load, for a link whose
// latency this small a payload skips entirely).
export async function getKeyInsightsData(
  range: DateRange,
  brandTerms: readonly string[],
  topN: number,
): Promise<KeyInsightsData> {
  const patterns = brandTerms.map((t) => `%${t}%`);
  const brandedCondition = sql.join(
    patterns.map((p) => sql`query ILIKE ${p}`),
    sql` OR `,
  );
  const result = await db.execute(sql`
    WITH agg AS (
      SELECT
        query,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(clicks)::numeric / SUM(impressions) END as ctr,
        CASE WHEN SUM(impressions) = 0 THEN 0 ELSE SUM(position * impressions) / SUM(impressions) END as position
      FROM gsc_daily_query
      WHERE date BETWEEN ${range.start} AND ${range.end}
      GROUP BY query
    ),
    totals AS (
      SELECT
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(clicks) FILTER (WHERE ${brandedCondition}), 0) as branded_clicks
      FROM agg
    ),
    top_n AS (
      SELECT COALESCE(SUM(clicks), 0) as top_clicks FROM (SELECT clicks FROM agg ORDER BY clicks DESC LIMIT ${topN}) t
    ),
    threshold AS (
      SELECT percentile_cont(0.9) WITHIN GROUP (ORDER BY impressions) as p90 FROM agg
    ),
    candidates AS (
      SELECT agg.query, agg.impressions, agg.clicks, agg.ctr, agg.position
      FROM agg, threshold
      WHERE agg.impressions >= threshold.p90 AND agg.impressions > 0
      ORDER BY agg.impressions DESC
      LIMIT ${OPPORTUNITY_CANDIDATE_LIMIT}
    )
    SELECT
      (SELECT total_clicks FROM totals) as total_clicks,
      (SELECT branded_clicks FROM totals) as branded_clicks,
      (SELECT top_clicks FROM top_n) as top_clicks,
      (SELECT COALESCE(json_agg(candidates), '[]') FROM candidates) as candidates
  `);
  const rows = result as unknown as {
    total_clicks: string;
    branded_clicks: string;
    top_clicks: string;
    candidates: { query: string; impressions: number; clicks: number; ctr: number; position: number }[];
  }[];
  const row = rows[0];
  return {
    totalClicks: Number(row?.total_clicks ?? 0),
    brandedClicks: Number(row?.branded_clicks ?? 0),
    topNClicks: Number(row?.top_clicks ?? 0),
    opportunityCandidates: (row?.candidates ?? []).map((c) => ({
      query: c.query,
      impressions: Number(c.impressions),
      clicks: Number(c.clicks),
      ctr: Number(c.ctr),
      position: Number(c.position),
    })),
  };
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
