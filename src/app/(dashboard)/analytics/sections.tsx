import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { NewUsersBarChart } from "@/components/dashboard/new-users-bar-chart";
import { HeatmapCell } from "@/components/dashboard/heatmap-cell";
import { GeoMapChart } from "@/components/dashboard/geo-map-chart";
import { SortableTable, type Column } from "@/components/dashboard/sortable-table";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getChannelBreakdown,
  getChannelEventBreakdown,
  getDeviceBreakdown,
  getGeoBreakdown,
  getGeoSessionsByCountry,
  getKpiSummary,
  getNewUsersMonthlyTrend,
  type ChannelRow,
  type DateRange,
  type GeoRow,
} from "@/lib/google-analytics/queries";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";

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
  if (current.sessions === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="New users" value={formatNumber(current.newUsers)} deltaPct={deltaPct.newUsers} />
      <KpiCard label="Sessions" value={formatNumber(current.sessions)} deltaPct={deltaPct.sessions} />
      <KpiCard label="Engagement rate" value={formatPercent(current.engagementRate)} deltaPct={deltaPct.engagementRate} />
      <KpiCard label="Conversions" value={formatNumber(current.conversions)} deltaPct={deltaPct.conversions} />
      <KpiCard label="Conversion rate" value={formatPercent(current.conversionRate)} deltaPct={deltaPct.conversionRate} />
      <KpiCard label="% organic search" value={formatPercent(current.pctOrganicSearch)} deltaPct={deltaPct.pctOrganicSearch} />
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />;
}

export async function NewUsersSection() {
  let data;
  try {
    data = await getNewUsersMonthlyTrend();
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load the new users trend." />;
  }
  if (data.length === 0) {
    return <EmptyState />;
  }
  return <NewUsersBarChart data={data} />;
}

export function DonutSkeleton() {
  return <Skeleton className="h-[220px] w-full" />;
}

export async function EventsByChannelSection({ range }: { range: DateRange }) {
  let rows;
  try {
    rows = await getChannelEventBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load event counts by channel." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <DonutChart data={rows.map((r) => ({ label: r.channel, value: r.eventCount }))} legendPosition="right" maxSlices={3} />;
}

export async function ConversionsByChannelSection({ range }: { range: DateRange }) {
  let rows: ChannelRow[];
  try {
    rows = await getChannelBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load conversions by channel." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <DonutChart data={rows.map((r) => ({ label: r.channel, value: r.conversions }))} legendPosition="right" maxSlices={3} />;
}

export async function DeviceSection({ range }: { range: DateRange }) {
  let rows;
  try {
    rows = await getDeviceBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load traffic by device." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <DonutChart data={rows.map((r) => ({ label: r.device, value: r.sessions }))} legendPosition="right" />;
}

export function BreakdownSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-[220px] w-[220px] rounded-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

// Heatmap columns (newUsers, sessions, conversions) are scaled to the
// min/max within these currently displayed rows only -- an absolute scale
// would make a single dominant channel wash out every other row.
export async function ChannelSection({ range }: { range: DateRange }) {
  let rows: ChannelRow[];
  try {
    rows = await getChannelBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load channel breakdown." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }

  const newUsersRange = { min: Math.min(...rows.map((r) => r.newUsers)), max: Math.max(...rows.map((r) => r.newUsers)) };
  const sessionsRange = { min: Math.min(...rows.map((r) => r.sessions)), max: Math.max(...rows.map((r) => r.sessions)) };
  const conversionsRange = { min: Math.min(...rows.map((r) => r.conversions)), max: Math.max(...rows.map((r) => r.conversions)) };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Channel</TableHead>
          <TableHead className="text-right">New users</TableHead>
          <TableHead className="text-right">Sessions</TableHead>
          <TableHead className="text-right">New user %</TableHead>
          <TableHead className="text-right">Engagement rate</TableHead>
          <TableHead className="text-right">Avg engagement time</TableHead>
          <TableHead className="text-right">Conversions</TableHead>
          <TableHead className="text-right">CVR</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.channel}>
            <TableCell className="font-medium">{r.channel}</TableCell>
            <HeatmapCell value={r.newUsers} min={newUsersRange.min} max={newUsersRange.max} format={formatNumber} />
            <HeatmapCell value={r.sessions} min={sessionsRange.min} max={sessionsRange.max} format={formatNumber} />
            <TableCell className="text-right">{formatPercent(r.newUserPct)}</TableCell>
            <TableCell className="text-right">{formatPercent(r.engagementRate)}</TableCell>
            <TableCell className="text-right">{formatDuration(r.avgEngagementTime)}</TableCell>
            <HeatmapCell value={r.conversions} min={conversionsRange.min} max={conversionsRange.max} format={formatNumber} />
            <TableCell className="text-right">{formatPercent(r.conversionRate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TableSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

const geoColumns: Column<GeoRow>[] = [
  { key: "country", label: "Country" },
  { key: "sessions", label: "Sessions", align: "right", format: "number" },
  { key: "users", label: "Users", align: "right", format: "number" },
  { key: "engagementRate", label: "Engagement rate", align: "right", format: "percent" },
];

export function GeoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Skeleton className="h-[440px] w-full lg:col-span-2" />
      <Skeleton className="h-[440px] w-full" />
    </div>
  );
}

const GEO_CARD_HEIGHT = "h-[440px]";

export async function GeoSection({ range }: { range: DateRange }) {
  let rows: GeoRow[];
  let mapRows;
  try {
    [rows, mapRows] = await Promise.all([getGeoBreakdown(range), getGeoSessionsByCountry(range)]);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load geo breakdown." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className={cn(GEO_CARD_HEIGHT, "flex flex-col lg:col-span-2")}>
        <CardHeader>
          <CardTitle>Top countries</CardTitle>
          <CardDescription>Sessions, users, and engagement rate for the selected date range.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="scroll-fade h-full overflow-y-auto pr-1">
            <SortableTable columns={geoColumns} rows={rows} defaultSortKey="sessions" />
          </div>
        </CardContent>
      </Card>

      <Card className={cn(GEO_CARD_HEIGHT, "flex flex-col")}>
        <CardHeader>
          <CardTitle>Traffic by country</CardTitle>
          <CardDescription>Sessions by country for the selected date range.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GeoMapChart data={mapRows} />
        </CardContent>
      </Card>
    </div>
  );
}

export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
