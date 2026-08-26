import { Suspense } from "react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { PageTopBar } from "@/components/dashboard/page-top-bar";
import {
  isPageSortKey,
  isQuerySortKey,
  type DateRange,
  type PageSortKey,
  type QuerySortKey,
  type SortDir,
} from "@/lib/search-console/queries";
import { BreakdownSkeleton, ChartSkeleton, KpiSkeleton, SectionCard, TableSkeleton } from "../analytics/sections";
import { CountrySection, DeviceSection, KpiSection, PagesSection, QueriesSection, TrendSection } from "./sections";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function parsePage(value: string | string[] | undefined): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseDir(value: string | string[] | undefined): SortDir {
  return value === "asc" ? "asc" : "desc";
}

export default async function SearchConsolePage({ searchParams }: PageProps<"/search-console">) {
  const params = await searchParams;
  const fallback = defaultRange();
  const from = typeof params.from === "string" ? params.from : fallback.from;
  const to = typeof params.to === "string" ? params.to : fallback.to;
  const range: DateRange = { start: from, end: to };

  const qSortRaw = typeof params.qSort === "string" ? params.qSort : "clicks";
  const qSort: QuerySortKey = isQuerySortKey(qSortRaw) ? qSortRaw : "clicks";
  const qDir = parseDir(params.qDir);
  const qPage = parsePage(params.qPage);

  const pSortRaw = typeof params.pSort === "string" ? params.pSort : "clicks";
  const pSort: PageSortKey = isPageSortKey(pSortRaw) ? pSortRaw : "clicks";
  const pDir = parseDir(params.pDir);
  const pPage = parsePage(params.pPage);

  return (
    <div className="space-y-8">
      <PageTopBar page="Organic" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Search Console</h1>
          <p className="text-muted-foreground text-sm">GSC detail.</p>
        </div>
        <DateRangePicker />
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection range={range} />
      </Suspense>

      <SectionCard title="Clicks & impressions" description="Daily totals for the selected date range.">
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection range={range} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Top queries">
        <Suspense fallback={<TableSkeleton />}>
          <QueriesSection range={range} page={qPage} sortKey={qSort} sortDir={qDir} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Top pages">
        <Suspense fallback={<TableSkeleton />}>
          <PagesSection range={range} page={pPage} sortKey={pSort} sortDir={pDir} />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Country breakdown" description="Top countries by clicks.">
          <Suspense fallback={<TableSkeleton />}>
            <CountrySection range={range} />
          </Suspense>
        </SectionCard>

        <SectionCard title="Device breakdown">
          <Suspense fallback={<BreakdownSkeleton />}>
            <DeviceSection range={range} />
          </Suspense>
        </SectionCard>
      </div>
    </div>
  );
}
