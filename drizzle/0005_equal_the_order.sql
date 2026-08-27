CREATE TABLE "gsc_daily_page_query" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"page" text NOT NULL,
	"query" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" numeric NOT NULL,
	"position" numeric NOT NULL,
	CONSTRAINT "gsc_daily_page_query_date_page_query_unique" UNIQUE("date","page","query")
);
