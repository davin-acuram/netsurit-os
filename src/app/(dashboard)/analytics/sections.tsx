import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { NewUsersTrendChart } from "@/components/dashboard/new-users-trend-chart";
import { SortableTable, type Column } from "@/components/dashboard/sortable-table";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getChannelBreakdown,
  getDeviceBreakdown,
  getGeoBreakdown,
  getKpiSummary,
  getLandingPageTable,
  getNewUsersWeeklyTrend,
  type ChannelRow,
  type DateRange,
  type DeviceRow,
  type GeoRow,
  type LandingPageRow,
} from "@/lib/google-analytics/queries";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      <KpiCard label="Sessions" value={formatNumber(current.sessions)} deltaPct={deltaPct.sessions} />
      <KpiCard label="New users" value={formatNumber(current.newUsers)} deltaPct={deltaPct.newUsers} />
      <KpiCard label="Engagement rate" value={formatPercent(current.engagementRate)} deltaPct={deltaPct.engagementRate} />
      <KpiCard label="Conversions" value={formatNumber(current.conversions)} deltaPct={deltaPct.conversions} />
      <KpiCard label="Conversion rate" value={formatPercent(current.conversionRate)} deltaPct={deltaPct.conversionRate} />
      <KpiCard label="Avg engagement time" value={formatDuration(current.avgEngagementTime)} deltaPct={deltaPct.avgEngagementTime} />
      <KpiCard label="% organic search" value={formatPercent(current.pctOrganicSearch)} deltaPct={deltaPct.pctOrganicSearch} />
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />;
}

export async function NewUsersTrendSection() {
  let data;
  try {
    data = await getNewUsersWeeklyTrend();
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load the new users trend." />;
  }
  if (data.length === 0) {
    return <EmptyState />;
  }
  return <NewUsersTrendChart data={data} />;
}

const channelColumns: Column<ChannelRow>[] = [
  { key: "channel", label: "Channel" },
  { key: "newUsers", label: "New users", align: "right", format: "number" },
  { key: "sessions", label: "Sessions", align: "right", format: "number" },
  { key: "engagementRate", label: "Engagement rate", align: "right", format: "percent" },
  { key: "avgEngagementTime", label: "Avg engagement time", align: "right", format: "duration" },
  { key: "conversions", label: "Conversions", align: "right", format: "number" },
  { key: "conversionRate", label: "Conversion rate", align: "right", format: "percent" },
];

export function BreakdownSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-[220px] w-[220px] rounded-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

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
  return (
    <div className="space-y-4">
      <DonutChart data={rows.map((r) => ({ label: r.channel, value: r.sessions }))} />
      <SortableTable columns={channelColumns} rows={rows} defaultSortKey="sessions" />
    </div>
  );
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
  return <DonutChart data={rows.map((r) => ({ label: r.device, value: r.sessions }))} />;
}

const landingPageColumns: Column<LandingPageRow>[] = [
  { key: "landingPage", label: "Landing page" },
  { key: "sessions", label: "Sessions", align: "right", format: "number" },
  { key: "engagementRate", label: "Engagement rate", align: "right", format: "percent" },
  { key: "conversions", label: "Conversions", align: "right", format: "number" },
];

export function TableSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

export async function LandingPageSection({ range }: { range: DateRange }) {
  let rows: LandingPageRow[];
  try {
    rows = await getLandingPageTable(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load landing page performance." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <SortableTable columns={landingPageColumns} rows={rows} defaultSortKey="sessions" />;
}

const geoColumns: Column<GeoRow>[] = [
  { key: "country", label: "Country" },
  { key: "sessions", label: "Sessions", align: "right", format: "number" },
  { key: "users", label: "Users", align: "right", format: "number" },
  { key: "engagementRate", label: "Engagement rate", align: "right", format: "percent" },
];

export async function GeoSection({ range }: { range: DateRange }) {
  let rows: GeoRow[];
  try {
    rows = await getGeoBreakdown(range);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load geo breakdown." />;
  }
  if (rows.length === 0) {
    return <EmptyState />;
  }
  return <SortableTable columns={geoColumns} rows={rows} defaultSortKey="sessions" />;
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
