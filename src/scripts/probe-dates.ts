import { config } from "dotenv";
config({ path: ".env.local" });

async function probeGa4(runReport: typeof import("@/lib/google-analytics/client").runReport): Promise<string> {
  const raw = (await runReport({
    dimensions: ["date"],
    metrics: ["sessions"],
    dateRanges: [{ startDate: "2015-08-14", endDate: "today" }],
  })) as { rows?: { dimensionValues: { value: string }[] }[] };
  const dates = (raw.rows ?? []).map((r) => r.dimensionValues[0].value).sort();
  return dates[0];
}

async function probeGsc(
  searchAnalyticsQuery: typeof import("@/lib/search-console/client").searchAnalyticsQuery,
): Promise<string> {
  const raw = (await searchAnalyticsQuery({
    startDate: "2015-01-01",
    endDate: new Date().toISOString().slice(0, 10),
    dimensions: ["date"],
    rowLimit: 25000,
    startRow: 0,
  })) as { rows?: { keys: string[] }[] };
  const dates = (raw.rows ?? []).map((r) => r.keys[0]).sort();
  return dates[0];
}

async function main() {
  const { runReport } = await import("@/lib/google-analytics/client");
  const { searchAnalyticsQuery } = await import("@/lib/search-console/client");

  const [ga4Start, gscStart] = await Promise.all([probeGa4(runReport), probeGsc(searchAnalyticsQuery)]);
  console.log("GA4 earliest date with data:", ga4Start);
  console.log("GSC earliest date with data:", gscStart);
}

main();
