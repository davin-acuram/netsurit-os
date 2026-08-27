import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { ClicksImpressionsTrendChart } from "@/components/dashboard/clicks-impressions-trend-chart";
import { SortableTable, type Column } from "@/components/dashboard/sortable-table";
import { PaginatedTable, type PaginatedColumn } from "@/components/dashboard/paginated-table";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getClicksImpressionsMonthlyTrend,
  getCountryBreakdown,
  getDeviceBreakdown,
  getKpiSummary,
  getPositionDistribution,
  getTopPages,
  getTopQueries,
  PAGE_SIZE,
  type CountryRow,
  type DateRange,
  type DeviceRow,
  type PageRow,
  type PageSortKey,
  type PositionBucketRow,
  type QueryRow,
  type QuerySegment,
  type QuerySortKey,
  type SortDir,
} from "@/lib/search-console/queries";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/format";

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

export async function KpiSection({ range }: { range: DateRange }) {
  let summary;
  try {
    summary = await getKpiSummary(range, true);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load KPI summary." />;
  }
  const { current, deltaPct } = summary;
  if (current.clicks === 0 && current.impressions === 0) {
    return <EmptyState />;
  }

  // Position is the one metric here where a smaller number is better --
  // negate its delta so "improved" still renders as a green up-arrow,
  // matching the up-is-good convention every other card uses.
  const positionDeltaPct =
    deltaPct.position === null || deltaPct.position === undefined ? deltaPct.position : -deltaPct.position;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Impressions" value={formatNumber(current.impressions)} deltaPct={deltaPct.impressions} />
      <KpiCard label="Clicks" value={formatNumber(current.clicks)} deltaPct={deltaPct.clicks} />
      <KpiCard label="CTR" value={formatPercent(current.ctr)} deltaPct={deltaPct.ctr} />
      <KpiCard label="Avg. position" value={formatDecimal(current.position)} deltaPct={positionDeltaPct} />
      <KpiCard
        label="Non-branded clicks"
        value={formatNumber(current.nonBrandedClicks)}
        deltaPct={deltaPct.nonBrandedClicks}
      />
      <KpiCard
        label="Non-branded click share"
        value={formatPercent(current.nonBrandedClickShare)}
        deltaPct={deltaPct.nonBrandedClickShare}
      />
    </div>
  );
}

export async function TrendSection() {
  let data;
  try {
    data = await getClicksImpressionsMonthlyTrend();
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load the clicks/impressions trend." />;
  }
  if (data.length === 0) {
    return <EmptyState />;
  }
  const averageClicks = data.reduce((sum, d) => sum + d.clicks, 0) / data.length;
  return <ClicksImpressionsTrendChart data={data} averageClicks={averageClicks} />;
}

const queryColumns: PaginatedColumn<QueryRow>[] = [
  { key: "query", label: "Query" },
  { key: "impressions", label: "Impressions", align: "right", format: "number", heatmap: true },
  { key: "clicks", label: "Clicks", align: "right", format: "number", heatmap: true },
  { key: "ctr", label: "CTR", align: "right", format: "percent" },
  { key: "position", label: "Position", align: "right", format: "decimal" },
  // vs. the previous equivalent period. positionDelta is already oriented
  // so positive = moved up the results (improved), matching the inverted
  // treatment on the Avg. position KPI card.
  { key: "positionDelta", label: "Pos. vs prev", align: "right", delta: true },
];

export async function QueriesSection({
  range,
  segment,
  paramPrefix,
  page,
  sortKey,
  sortDir,
}: {
  range: DateRange;
  segment: QuerySegment;
  paramPrefix: string;
  page: number;
  sortKey: QuerySortKey;
  sortDir: SortDir;
}) {
  let result;
  try {
    result = await getTopQueries(range, page, sortKey, sortDir, segment);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load queries." />;
  }
  if (result.total === 0) {
    return <EmptyState />;
  }
  return (
    <PaginatedTable
      columns={queryColumns}
      rows={result.rows}
      total={result.total}
      page={page}
      pageSize={PAGE_SIZE}
      sortKey={sortKey}
      sortDir={sortDir}
      paramPrefix={paramPrefix}
    />
  );
}

const pageColumns: PaginatedColumn<PageRow>[] = [
  { key: "page", label: "Page" },
  { key: "topQuery", label: "Top query", sortable: false },
  { key: "impressions", label: "Impressions", align: "right", format: "number", heatmap: true },
  { key: "clicks", label: "Clicks", align: "right", format: "number", heatmap: true },
  { key: "ctr", label: "CTR", align: "right", format: "percent" },
  { key: "position", label: "Position", align: "right", format: "decimal" },
];

export async function PagesSection({
  range,
  page,
  sortKey,
  sortDir,
}: {
  range: DateRange;
  page: number;
  sortKey: PageSortKey;
  sortDir: SortDir;
}) {
  let result;
  try {
    result = await getTopPages(range, page, sortKey, sortDir);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load landing pages." />;
  }
  if (result.total === 0) {
    return <EmptyState />;
  }
  return (
    <PaginatedTable
      columns={pageColumns}
      rows={result.rows}
      total={result.total}
      page={page}
      pageSize={PAGE_SIZE}
      sortKey={sortKey}
      sortDir={sortDir}
      paramPrefix="p"
    />
  );
}

export function PositionSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

export async function PositionSection({ range }: { range: DateRange }) {
  let rows: PositionBucketRow[];
  try {
    rows = await getPositionDistribution(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load position distribution." />;
  }
  const total = rows.reduce((sum, r) => sum + r.queries, 0);
  if (total === 0) {
    return <EmptyState />;
  }
  const max = Math.max(...rows.map((r) => r.queries));

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.bucket} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">{r.bucket}</span>
          <div className="bg-muted h-7 flex-1 overflow-hidden rounded-xl">
            <div
              className="h-full rounded-xl"
              style={{
                width: `${max === 0 ? 0 : Math.max((r.queries / max) * 100, r.queries > 0 ? 2 : 0)}%`,
                backgroundColor: "var(--data-heatmap)",
              }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-sm tabular-nums">
            {formatNumber(r.queries)}
            <span className="text-muted-foreground"> · {formatPercent(total === 0 ? 0 : r.queries / total, 0)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const countryColumns: Column<CountryRow>[] = [
  { key: "country", label: "Country" },
  { key: "clicks", label: "Clicks", align: "right", format: "number" },
  { key: "impressions", label: "Impressions", align: "right", format: "number" },
  { key: "ctr", label: "CTR", align: "right", format: "percent" },
];

export async function CountrySection({ range }: { range: DateRange }) {
  let rows: CountryRow[];
  try {
    rows = await getCountryBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load country breakdown." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <SortableTable columns={countryColumns} rows={rows} defaultSortKey="clicks" />;
}

export async function DeviceSection({ range }: { range: DateRange }) {
  let rows: DeviceRow[];
  try {
    rows = await getDeviceBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load device breakdown." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <DonutChart data={rows.map((r) => ({ label: r.device, value: r.clicks }))} legendPosition="right" />;
}
