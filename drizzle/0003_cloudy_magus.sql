CREATE TABLE "gsc_daily_country" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"country" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric NOT NULL,
	"position" numeric NOT NULL,
	CONSTRAINT "gsc_daily_country_date_country_unique" UNIQUE("date","country")
);
--> statement-breakpoint
CREATE TABLE "gsc_daily_device" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"device" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric NOT NULL,
	"position" numeric NOT NULL,
	CONSTRAINT "gsc_daily_device_date_device_unique" UNIQUE("date","device")
);
--> statement-breakpoint
CREATE TABLE "gsc_daily_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"page" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric NOT NULL,
	"position" numeric NOT NULL,
	CONSTRAINT "gsc_daily_page_date_page_unique" UNIQUE("date","page")
);
--> statement-breakpoint
CREATE TABLE "gsc_daily_query" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"query" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric NOT NULL,
	"position" numeric NOT NULL,
	CONSTRAINT "gsc_daily_query_date_query_unique" UNIQUE("date","query")
);
