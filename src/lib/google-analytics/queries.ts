import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface DateRange {
  start: string;
  end: string;
}

export interface KpiValues {
  sessions: number;
  newUsers: number;
  engagementRate: number;
  conversions: number;
  conversionRate: number;
  avgEngagementTime: number;
  pctOrganicSearch: number;
}

export interface KpiSummary {
  current: KpiValues;
  previous: KpiValues | null;
  deltaPct: Partial<Record<keyof KpiValues, number | null>>;
}

export interface ChannelRow {
  channel: string;
  newUsers: number;
  sessions: number;
  engagementRate: number;
  avgEngagementTime: number;
  conversions: number;
  conversionRate: number;
}

export interface DeviceRow {
  device: string;
  sessions: number;
  users: number;
  engagementRate: number;
}

export interface LandingPageRow {
  landingPage: string;
  sessions: number;
  engagementRate: number;
  conversions: number;
}

export interface GeoRow {
  country: string;
  sessions: number;
  users: number;
  engagementRate: number;
}

export interface MonthlyNewUsers {
  month: string; // YYYY-MM
  newUsers: number;
}

export interface ChannelEventRow {
  channel: string;
  eventCount: number;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Previous period is the same length immediately preceding the current
// range, e.g. current = last 30 days -> previous = the 30 days before that.
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
  sessions: string | null;
  new_users: string | null;
  engaged_sessions: string | null;
  conversions: string | null;
  duration_weighted: string | null;
  organic_sessions: string | null;
}

async function fetchKpiValues(range: DateRange): Promise<KpiValues> {
  const result = await db.execute(sql`
    SELECT
      SUM(sessions) as sessions,
      SUM(new_users) as new_users,
      SUM(engaged_sessions) as engaged_sessions,
      SUM(conversions) as conversions,
      SUM(avg_session_duration * sessions) as duration_weighted,
      SUM(sessions) FILTER (WHERE channel = 'Organic Search') as organic_sessions
    FROM ga_daily_channel
    WHERE date BETWEEN ${range.start} AND ${range.end}
  `);
  const rows = result as unknown as RawKpiRow[];
  const row = rows[0];
  const sessions = Number(row?.sessions ?? 0);
  const newUsers = Number(row?.new_users ?? 0);
  const engagedSessions = Number(row?.engaged_sessions ?? 0);
  const conversions = Number(row?.conversions ?? 0);
  const durationWeighted = Number(row?.duration_weighted ?? 0);
  const organicSessions = Number(row?.organic_sessions ?? 0);

  return {
    sessions,
    newUsers,
    engagementRate: safeDivide(engagedSessions, sessions),
    conversions,
    conversionRate: safeDivide(conversions, sessions),
    avgEngagementTime: safeDivide(durationWeighted, sessions),
    pctOrganicSearch: safeDivide(organicSessions, sessions),
  };
}

export async function getKpiSummary(range: DateRange, withComparison: boolean): Promise<KpiSummary> {
  const current = await fetchKpiValues(range);
  if (!withComparison) {
    return { current, previous: null, deltaPct: {} };
  }
  const previous = await fetchKpiValues(getPreviousPeriod(range));
  const keys = Object.keys(current) as (keyof KpiValues)[];
  const deltas: Partial<Record<keyof KpiValues, number | null>> = {};
  for (const key of keys) {
    deltas[key] = deltaPct(current[key], previous[key]);
  }
  return { current, previous, deltaPct: deltas };
}

export interface OverviewKpiValues {
  sessions: number;
  users: number;
  conversions: number;
}

export interface OverviewKpiSummary {
  current: OverviewKpiValues;
  previous: OverviewKpiValues | null;
  deltaPct: Partial<Record<keyof OverviewKpiValues, number | null>>;
}

interface RawOverviewKpiRow {
  sessions: string | null;
  users: string | null;
  conversions: string | null;
}

// Overview's blended KPI row only needs these three GA4 numbers -- a
// narrower query than fetchKpiValues, which also computes engagement
// rate/duration/organic share the detail page needs but Overview doesn't.
async function fetchOverviewKpiValues(range: DateRange): Promise<OverviewKpiValues> {
  const result = await db.execute(sql`
    SELECT
      SUM(sessions) as sessions,
      SUM(users) as users,
      SUM(conversions) as conversions
    FROM ga_daily_channel
    WHERE date BETWEEN ${range.start} AND ${range.end}
  `);
  const rows = result as unknown as RawOverviewKpiRow[];
  const row = rows[0];
  return {
    sessions: Number(row?.sessions ?? 0),
    users: Number(row?.users ?? 0),
    conversions: Number(row?.conversions ?? 0),
  };
}

export async function getOverviewKpiSummary(range: DateRange, withComparison: boolean): Promise<OverviewKpiSummary> {
  const current = await fetchOverviewKpiValues(range);
  if (!withComparison) {
    return { current, previous: null, deltaPct: {} };
  }
  const previous = await fetchOverviewKpiValues(getPreviousPeriod(range));
  const keys = Object.keys(current) as (keyof OverviewKpiValues)[];
  const deltas: Partial<Record<keyof OverviewKpiValues, number | null>> = {};
  for (const key of keys) {
    deltas[key] = deltaPct(current[key], previous[key]);
  }
  return { current, previous, deltaPct: deltas };
}

export interface DailySessions {
  date: string;
  sessions: number;
}

export async function getSessionsTrend(range: DateRange): Promise<DailySessions[]> {
  const result = await db.execute(sql`
    SELECT date, SUM(sessions) as sessions
    FROM ga_daily_channel
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY date
    ORDER BY date ASC
  `);
  const rows = result as unknown as { date: string; sessions: string }[];
  return rows.map((r) => ({
    date: typeof r.date === "string" ? r.date : new Date(r.date as unknown as string).toISOString().slice(0, 10),
    sessions: Number(r.sessions),
  }));
}

// Rolling trailing-24-month window ending today -- intentionally takes no
// date range, this chart is independent of the page's date-range picker.
export async function getNewUsersMonthlyTrend(): Promise<MonthlyNewUsers[]> {
  const result = await db.execute(sql`
    SELECT to_char(date_trunc('month', date), 'YYYY-MM') as month, SUM(new_users) as new_users
    FROM ga_daily_channel
    WHERE date >= (CURRENT_DATE - INTERVAL '24 months')
    GROUP BY month
    ORDER BY month ASC
  `);
  const rows = result as unknown as { month: string; new_users: string }[];
  return rows.map((r) => ({
    month: r.month,
    newUsers: Number(r.new_users),
  }));
}

export async function getChannelEventBreakdown(range: DateRange): Promise<ChannelEventRow[]> {
  const result = await db.execute(sql`
    SELECT channel, SUM(event_count) as event_count
    FROM ga_daily_channel
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY channel
    ORDER BY event_count DESC
  `);
  const rows = result as unknown as { channel: string; event_count: string }[];
  return rows.map((r) => ({
    channel: r.channel,
    eventCount: Number(r.event_count),
  }));
}

export async function getChannelBreakdown(range: DateRange): Promise<ChannelRow[]> {
  const result = await db.execute(sql`
    SELECT
      channel,
      SUM(sessions) as sessions,
      SUM(new_users) as new_users,
      SUM(engaged_sessions) as engaged_sessions,
      SUM(conversions) as conversions,
      SUM(avg_session_duration * sessions) as duration_weighted
    FROM ga_daily_channel
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY channel
    ORDER BY sessions DESC
  `);
  const rows = result as unknown as {
    channel: string;
    sessions: string;
    new_users: string;
    engaged_sessions: string;
    conversions: string;
    duration_weighted: string;
  }[];
  return rows.map((r) => {
    const sessions = Number(r.sessions);
    const conversions = Number(r.conversions);
    return {
      channel: r.channel,
      newUsers: Number(r.new_users),
      sessions,
      engagementRate: safeDivide(Number(r.engaged_sessions), sessions),
      avgEngagementTime: safeDivide(Number(r.duration_weighted), sessions),
      conversions,
      conversionRate: safeDivide(conversions, sessions),
    };
  });
}

export async function getDeviceBreakdown(range: DateRange): Promise<DeviceRow[]> {
  const result = await db.execute(sql`
    SELECT device_category, SUM(sessions) as sessions, SUM(users) as users, SUM(engagement_rate * sessions) as engaged_sessions
    FROM ga_daily_device
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY device_category
    ORDER BY sessions DESC
  `);
  const rows = result as unknown as {
    device_category: string;
    sessions: string;
    users: string;
    engaged_sessions: string;
  }[];
  return rows.map((r) => {
    const sessions = Number(r.sessions);
    return {
      device: r.device_category,
      sessions,
      users: Number(r.users),
      engagementRate: safeDivide(Number(r.engaged_sessions), sessions),
    };
  });
}

const LANDING_PAGE_LIMIT = 25;

export async function getLandingPageTable(range: DateRange): Promise<LandingPageRow[]> {
  const result = await db.execute(sql`
    SELECT
      landing_page,
      SUM(sessions) as sessions,
      SUM(engagement_rate * sessions) as engaged_sessions,
      SUM(conversions) as conversions
    FROM ga_daily_landing_page
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY landing_page
    ORDER BY sessions DESC
    LIMIT ${LANDING_PAGE_LIMIT}
  `);
  const rows = result as unknown as {
    landing_page: string;
    sessions: string;
    engaged_sessions: string;
    conversions: string;
  }[];
  return rows.map((r) => {
    const sessions = Number(r.sessions);
    return {
      landingPage: r.landing_page,
      sessions,
      engagementRate: safeDivide(Number(r.engaged_sessions), sessions),
      conversions: Number(r.conversions),
    };
  });
}

export interface GeoSessionsRow {
  country: string;
  sessions: number;
}

// No LIMIT -- the choropleth needs every country with traffic, unlike the
// table above which only surfaces the top GEO_LIMIT rows.
export async function getGeoSessionsByCountry(range: DateRange): Promise<GeoSessionsRow[]> {
  const result = await db.execute(sql`
    SELECT country, SUM(sessions) as sessions
    FROM ga_daily_geo
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY country
    ORDER BY sessions DESC
  `);
  const rows = result as unknown as { country: string; sessions: string }[];
  return rows.map((r) => ({ country: r.country, sessions: Number(r.sessions) }));
}

const GEO_LIMIT = 15;

export async function getGeoBreakdown(range: DateRange): Promise<GeoRow[]> {
  const result = await db.execute(sql`
    SELECT
      country,
      SUM(sessions) as sessions,
      SUM(users) as users,
      SUM(engagement_rate * sessions) as engaged_sessions
    FROM ga_daily_geo
    WHERE date BETWEEN ${range.start} AND ${range.end}
    GROUP BY country
    ORDER BY sessions DESC
    LIMIT ${GEO_LIMIT}
  `);
  const rows = result as unknown as {
    country: string;
    sessions: string;
    users: string;
    engaged_sessions: string;
  }[];
  return rows.map((r) => {
    const sessions = Number(r.sessions);
    return {
      country: r.country,
      sessions,
      users: Number(r.users),
      engagementRate: safeDivide(Number(r.engaged_sessions), sessions),
    };
  });
}
