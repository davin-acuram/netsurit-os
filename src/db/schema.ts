import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const gaDailyChannel = pgTable(
  "ga_daily_channel",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    channel: text("channel").notNull(),
    sessions: integer("sessions").notNull(),
    users: integer("users").notNull(),
    newUsers: integer("new_users").notNull(),
    engagedSessions: integer("engaged_sessions").notNull(),
    engagementRate: numeric("engagement_rate").notNull(),
    avgSessionDuration: numeric("avg_session_duration").notNull(),
    conversions: numeric("conversions").notNull(),
    revenue: numeric("revenue").notNull(),
    eventCount: integer("event_count").notNull().default(0),
  },
  (table) => [unique().on(table.date, table.channel)],
);

export const gaDailyLandingPage = pgTable(
  "ga_daily_landing_page",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    landingPage: text("landing_page").notNull(),
    sessions: integer("sessions").notNull(),
    users: integer("users").notNull(),
    engagementRate: numeric("engagement_rate").notNull(),
    conversions: numeric("conversions").notNull(),
  },
  (table) => [unique().on(table.date, table.landingPage)],
);

export const gaDailyDevice = pgTable(
  "ga_daily_device",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    deviceCategory: text("device_category").notNull(),
    sessions: integer("sessions").notNull(),
    users: integer("users").notNull(),
    engagementRate: numeric("engagement_rate").notNull(),
  },
  (table) => [unique().on(table.date, table.deviceCategory)],
);

export const gaDailyGeo = pgTable(
  "ga_daily_geo",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    country: text("country").notNull(),
    city: text("city").notNull(),
    sessions: integer("sessions").notNull(),
    users: integer("users").notNull(),
    engagementRate: numeric("engagement_rate").notNull(),
  },
  (table) => [unique().on(table.date, table.country, table.city)],
);

export const gscDailyQuery = pgTable(
  "gsc_daily_query",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    query: text("query").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: numeric("ctr").notNull(),
    position: numeric("position").notNull(),
  },
  (table) => [unique().on(table.date, table.query)],
);

export const gscDailyPage = pgTable(
  "gsc_daily_page",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    page: text("page").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: numeric("ctr").notNull(),
    position: numeric("position").notNull(),
  },
  (table) => [unique().on(table.date, table.page)],
);

// One row per (page, query) pair per day -- the only breakdown that
// carries both dimensions, needed for "which query drove the most clicks
// to this page". Much larger than the single-dimension GSC tables (it's
// closer to their product), so it's synced/backfilled on its own and
// read only by the landing-pages "Top query" column.
export const gscDailyPageQuery = pgTable(
  "gsc_daily_page_query",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    page: text("page").notNull(),
    query: text("query").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: numeric("ctr").notNull(),
    position: numeric("position").notNull(),
  },
  (table) => [
    unique().on(table.date, table.page, table.query),
    // "top query for this page over a date range" seeks by page first,
    // then scans the date slice -- the unique index (date-first) can't
    // serve that without scanning every page in the range.
    index("gsc_daily_page_query_page_date_idx").on(table.page, table.date),
  ],
);

export const gscDailyCountry = pgTable(
  "gsc_daily_country",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    country: text("country").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: numeric("ctr").notNull(),
    position: numeric("position").notNull(),
  },
  (table) => [unique().on(table.date, table.country)],
);

export const gscDailyDevice = pgTable(
  "gsc_daily_device",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    device: text("device").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: numeric("ctr").notNull(),
    position: numeric("position").notNull(),
  },
  (table) => [unique().on(table.date, table.device)],
);

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'ga4' | 'gsc'
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // 'success' | 'error'
  rowsSynced: integer("rows_synced").notNull().default(0),
  error: text("error"),
});
