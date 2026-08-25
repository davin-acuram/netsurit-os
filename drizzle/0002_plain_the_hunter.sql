CREATE TABLE "ga_daily_channel" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"channel" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"new_users" integer NOT NULL,
	"engaged_sessions" integer NOT NULL,
	"engagement_rate" numeric NOT NULL,
	"avg_session_duration" numeric NOT NULL,
	"conversions" numeric NOT NULL,
	"revenue" numeric NOT NULL,
	CONSTRAINT "ga_daily_channel_date_channel_unique" UNIQUE("date","channel")
);
--> statement-breakpoint
CREATE TABLE "ga_daily_device" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"device_category" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"engagement_rate" numeric NOT NULL,
	CONSTRAINT "ga_daily_device_date_device_category_unique" UNIQUE("date","device_category")
);
--> statement-breakpoint
CREATE TABLE "ga_daily_geo" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"engagement_rate" numeric NOT NULL,
	CONSTRAINT "ga_daily_geo_date_country_city_unique" UNIQUE("date","country","city")
);
--> statement-breakpoint
CREATE TABLE "ga_daily_landing_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"landing_page" text NOT NULL,
	"sessions" integer NOT NULL,
	"users" integer NOT NULL,
	"engagement_rate" numeric NOT NULL,
	"conversions" numeric NOT NULL,
	CONSTRAINT "ga_daily_landing_page_date_landing_page_unique" UNIQUE("date","landing_page")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"rows_synced" integer DEFAULT 0 NOT NULL,
	"error" text
);
