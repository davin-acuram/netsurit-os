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
import { ChartSkeleton, DonutSkeleton, SectionCard, TableSkeleton } from "../analytics/sections";
import {
  CountrySection,
  DeviceSection,
  KpiSection,
  KpiSkeleton,
  PagesSection,
  PositionSection,
  PositionSkeleton,
  QueriesSection,
  TrendSection,
} from "./sections";

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

function parseQuerySort(value: string | string[] | undefined): QuerySortKey {
  return typeof value === "string" && isQuerySortKey(value) ? value : "clicks";
}

export default async function SearchConsolePage({ searchParams }: PageProps<"/search-console">) {
  const params = await searchParams;
  const fallback = defaultRange();
  const from = typeof params.from === "string" ? params.from : fallback.from;
  const to = typeof params.to === "string" ? params.to : fallback.to;
  const range: DateRange = { start: from, end: to };

  // Three independently sorted/paginated tables on this page: branded
  // queries ("qb"), non-branded queries ("qn"), landing pages ("p").
  const branded = {
    sortKey: parseQuerySort(params.qbSort),
    sortDir: parseDir(params.qbDir),
    page: parsePage(params.qbPage),
  };
  const nonBranded = {
    sortKey: parseQuerySort(params.qnSort),
    sortDir: parseDir(params.qnDir),
    page: parsePage(params.qnPage),
  };

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

      <SectionCard
        title="Clicks & impressions"
        description="Monthly totals, trailing 22 months. This card is not affected by the date range selector."
      >
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection />
        </Suspense>
      </SectionCard>

      <SectionCard title="Branded terms" description="Queries containing a known Netsurit brand or entity name.">
        <Suspense fallback={<TableSkeleton />}>
          <QueriesSection
            range={range}
            segment="branded"
            paramPrefix="qb"
            page={branded.page}
            sortKey={branded.sortKey}
            sortDir={branded.sortDir}
          />
        </Suspense>
      </SectionCard>

      <SectionCard title="Non-branded terms" description="Generic / discovery queries with no brand name.">
        <Suspense fallback={<TableSkeleton />}>
          <QueriesSection
            range={range}
            segment="nonbranded"
            paramPrefix="qn"
            page={nonBranded.page}
            sortKey={nonBranded.sortKey}
            sortDir={nonBranded.sortDir}
          />
        </Suspense>
      </SectionCard>

      <SectionCard title="Top landing pages" description="Pages ranked by organic performance for the selected date range.">
        <Suspense fallback={<TableSkeleton />}>
          <PagesSection range={range} page={pPage} sortKey={pSort} sortDir={pDir} />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Position distribution" description="Queries by average position bucket for the selected date range.">
          <Suspense fallback={<PositionSkeleton />}>
            <PositionSection range={range} />
          </Suspense>
        </SectionCard>

        <SectionCard title="Device breakdown" description="Organic clicks by device for the selected date range.">
          <Suspense fallback={<DonutSkeleton />}>
            <DeviceSection range={range} />
          </Suspense>
        </SectionCard>
      </div>

      <SectionCard title="Country breakdown" description="Top countries by organic clicks for the selected date range.">
        <Suspense fallback={<TableSkeleton />}>
          <CountrySection range={range} />
        </Suspense>
      </SectionCard>
    </div>
  );
}
