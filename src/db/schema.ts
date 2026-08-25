import {
  date,
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

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // 'ga4' | 'gsc'
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // 'success' | 'error'
  rowsSynced: integer("rows_synced").notNull().default(0),
  error: text("error"),
});
