import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  gaDailyChannel,
  gaDailyDevice,
  gaDailyGeo,
  gaDailyLandingPage,
  syncRuns,
} from "@/db/schema";
import { batchRunReports, type GaReportRequest } from "./client";
import { gaBatchRunReportsResponseSchema, type GaReport } from "./schemas";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// GA4 can revise session/attribution numbers for a day or two after they
// first land (late-arriving hits, session stitching), so every run
// resyncs a trailing window rather than trusting "today" alone. Upserts
// make repeating the same range safe.
const INCREMENTAL_DAYS_BACK = 2;

export function incrementalRange(): DateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - INCREMENTAL_DAYS_BACK);
  return { startDate, endDate };
}

function toApiDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GA4 API returns the "date" dimension as YYYYMMDD with no separators.
function parseGaDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function denormalize(report: GaReport): Record<string, string>[] {
  const dimNames = report.dimensionHeaders.map((h) => h.name);
  const metricNames = report.metricHeaders.map((h) => h.name);
  return report.rows.map((row) => {
    const obj: Record<string, string> = {};
    row.dimensionValues.forEach((v, i) => {
      obj[dimNames[i]] = v.value;
    });
    row.metricValues.forEach((v, i) => {
      obj[metricNames[i]] = v.value;
    });
    return obj;
  });
}

function buildRequests(range: DateRange): GaReportRequest[] {
  const dateRanges = [{ startDate: toApiDate(range.startDate), endDate: toApiDate(range.endDate) }];
  return [
    {
      dateRanges,
      dimensions: ["date", "sessionDefaultChannelGroup"],
      metrics: [
        "sessions",
        "activeUsers",
        "newUsers",
        "engagedSessions",
        "engagementRate",
        "averageSessionDuration",
        "conversions",
        "totalRevenue",
        "eventCount",
      ],
    },
    {
      dateRanges,
      dimensions: ["date", "landingPage"],
      metrics: ["sessions", "activeUsers", "engagementRate", "conversions"],
    },
    {
      dateRanges,
      dimensions: ["date", "deviceCategory"],
      metrics: ["sessions", "activeUsers", "engagementRate"],
    },
    {
      dateRanges,
      dimensions: ["date", "country", "city"],
      metrics: ["sessions", "activeUsers", "engagementRate"],
    },
  ];
}

// Money/rate values are kept as the raw strings GA4 returns and written
// straight into `numeric` columns -- never parsed to a JS float -- so no
// precision is lost in the round trip.
function mapChannelRows(report: GaReport) {
  return denormalize(report).map((r) => ({
    date: parseGaDate(r.date),
    channel: r.sessionDefaultChannelGroup,
    sessions: parseInt(r.sessions, 10),
    users: parseInt(r.activeUsers, 10),
    newUsers: parseInt(r.newUsers, 10),
    engagedSessions: parseInt(r.engagedSessions, 10),
    engagementRate: r.engagementRate,
    avgSessionDuration: r.averageSessionDuration,
    conversions: r.conversions,
    revenue: r.totalRevenue,
    eventCount: parseInt(r.eventCount, 10),
  }));
}

function mapLandingPageRows(report: GaReport) {
  return denormalize(report).map((r) => ({
    date: parseGaDate(r.date),
    landingPage: r.landingPage,
    sessions: parseInt(r.sessions, 10),
    users: parseInt(r.activeUsers, 10),
    engagementRate: r.engagementRate,
    conversions: r.conversions,
  }));
}

function mapDeviceRows(report: GaReport) {
  return denormalize(report).map((r) => ({
    date: parseGaDate(r.date),
    deviceCategory: r.deviceCategory,
    sessions: parseInt(r.sessions, 10),
    users: parseInt(r.activeUsers, 10),
    engagementRate: r.engagementRate,
  }));
}

function mapGeoRows(report: GaReport) {
  return denormalize(report).map((r) => ({
    date: parseGaDate(r.date),
    country: r.country,
    city: r.city,
    sessions: parseInt(r.sessions, 10),
    users: parseInt(r.activeUsers, 10),
    engagementRate: r.engagementRate,
  }));
}

export async function syncGa4(range: DateRange): Promise<{ rowsSynced: number }> {
  const startedAt = new Date();

  try {
    const raw = await batchRunReports(buildRequests(range));
    const { reports } = gaBatchRunReportsResponseSchema.parse(raw);
    const [channelReport, landingReport, deviceReport, geoReport] = reports;

    const channelRows = mapChannelRows(channelReport);
    const landingRows = mapLandingPageRows(landingReport);
    const deviceRows = mapDeviceRows(deviceReport);
    const geoRows = mapGeoRows(geoReport);

    let rowsSynced = 0;

    if (channelRows.length > 0) {
      await db
        .insert(gaDailyChannel)
        .values(channelRows)
        .onConflictDoUpdate({
          target: [gaDailyChannel.date, gaDailyChannel.channel],
          set: {
            sessions: sql`excluded.sessions`,
            users: sql`excluded.users`,
            newUsers: sql`excluded.new_users`,
            engagedSessions: sql`excluded.engaged_sessions`,
            engagementRate: sql`excluded.engagement_rate`,
            avgSessionDuration: sql`excluded.avg_session_duration`,
            conversions: sql`excluded.conversions`,
            revenue: sql`excluded.revenue`,
            eventCount: sql`excluded.event_count`,
          },
        });
      rowsSynced += channelRows.length;
    }

    if (landingRows.length > 0) {
      await db
        .insert(gaDailyLandingPage)
        .values(landingRows)
        .onConflictDoUpdate({
          target: [gaDailyLandingPage.date, gaDailyLandingPage.landingPage],
          set: {
            sessions: sql`excluded.sessions`,
            users: sql`excluded.users`,
            engagementRate: sql`excluded.engagement_rate`,
            conversions: sql`excluded.conversions`,
          },
        });
      rowsSynced += landingRows.length;
    }

    if (deviceRows.length > 0) {
      await db
        .insert(gaDailyDevice)
        .values(deviceRows)
        .onConflictDoUpdate({
          target: [gaDailyDevice.date, gaDailyDevice.deviceCategory],
          set: {
            sessions: sql`excluded.sessions`,
            users: sql`excluded.users`,
            engagementRate: sql`excluded.engagement_rate`,
          },
        });
      rowsSynced += deviceRows.length;
    }

    if (geoRows.length > 0) {
      await db
        .insert(gaDailyGeo)
        .values(geoRows)
        .onConflictDoUpdate({
          target: [gaDailyGeo.date, gaDailyGeo.country, gaDailyGeo.city],
          set: {
            sessions: sql`excluded.sessions`,
            users: sql`excluded.users`,
            engagementRate: sql`excluded.engagement_rate`,
          },
        });
      rowsSynced += geoRows.length;
    }

    await db.insert(syncRuns).values({
      source: "ga4",
      startedAt,
      finishedAt: new Date(),
      status: "success",
      rowsSynced,
    });

    return { rowsSynced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.insert(syncRuns).values({
      source: "ga4",
      startedAt,
      finishedAt: new Date(),
      status: "error",
      rowsSynced: 0,
      error: message,
    });
    throw err;
  }
}
