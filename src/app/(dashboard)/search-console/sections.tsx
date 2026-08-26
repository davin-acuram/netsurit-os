import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { ClicksImpressionsTrendChart } from "@/components/dashboard/clicks-impressions-trend-chart";
import { SortableTable, type Column } from "@/components/dashboard/sortable-table";
import { PaginatedTable, type PaginatedColumn } from "@/components/dashboard/paginated-table";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getClicksImpressionsTrend,
  getCountryBreakdown,
  getDeviceBreakdown,
  getKpiSummary,
  getTopPages,
  getTopQueries,
  PAGE_SIZE,
  type CountryRow,
  type DateRange,
  type DeviceRow,
  type PageRow,
  type PageSortKey,
  type QueryRow,
  type QuerySortKey,
  type SortDir,
} from "@/lib/search-console/queries";
import { formatDecimal, formatNumber, formatPercent } from "@/lib/format";

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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard label="Clicks" value={formatNumber(current.clicks)} deltaPct={deltaPct.clicks} />
      <KpiCard label="Impressions" value={formatNumber(current.impressions)} deltaPct={deltaPct.impressions} />
      <KpiCard label="CTR" value={formatPercent(current.ctr)} deltaPct={deltaPct.ctr} />
      <KpiCard label="Avg position" value={formatDecimal(current.position)} deltaPct={positionDeltaPct} />
    </div>
  );
}

export async function TrendSection({ range }: { range: DateRange }) {
  let data;
  try {
    data = await getClicksImpressionsTrend(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load the clicks/impressions trend." />;
  }
  if (data.length === 0) {
    return <EmptyState />;
  }
  return <ClicksImpressionsTrendChart data={data} />;
}

const queryColumns: PaginatedColumn<QueryRow>[] = [
  { key: "query", label: "Query" },
  { key: "clicks", label: "Clicks", align: "right", format: "number" },
  { key: "impressions", label: "Impressions", align: "right", format: "number" },
  { key: "ctr", label: "CTR", align: "right", format: "percent" },
  { key: "position", label: "Position", align: "right", format: "decimal" },
];

export async function QueriesSection({
  range,
  page,
  sortKey,
  sortDir,
}: {
  range: DateRange;
  page: number;
  sortKey: QuerySortKey;
  sortDir: SortDir;
}) {
  let result;
  try {
    result = await getTopQueries(range, page, sortKey, sortDir);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load top queries." />;
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
      paramPrefix="q"
    />
  );
}

const pageColumns: PaginatedColumn<PageRow>[] = [
  { key: "page", label: "Page" },
  { key: "clicks", label: "Clicks", align: "right", format: "number" },
  { key: "impressions", label: "Impressions", align: "right", format: "number" },
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
    return <ErrorState message="Couldn't load top pages." />;
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
  return <DonutChart data={rows.map((r) => ({ label: r.device, value: r.clicks }))} />;
}
