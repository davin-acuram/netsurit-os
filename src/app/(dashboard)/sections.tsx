import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OverviewTrendChart, type OverviewTrendPoint } from "@/components/dashboard/overview-trend-chart";
import { SyncStatusItem } from "@/components/dashboard/sync-status-item";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getOverviewKpiSummary as getGaOverviewKpiSummary,
  getSessionsTrend,
  type DateRange as GaDateRange,
} from "@/lib/google-analytics/queries";
import {
  getClicksImpressionsTrend,
  getOverviewKpiSummary as getGscOverviewKpiSummary,
  type DateRange as GscDateRange,
} from "@/lib/search-console/queries";
import { getLatestSyncStatus } from "@/lib/sync-status";
import { formatDecimal, formatNumber } from "@/lib/format";

// The two detail pages' DateRange types are structurally identical
// ({ start, end }) but declared in separate modules -- this page blends
// both sources, so it needs one range value that satisfies both.
export type DateRange = GaDateRange & GscDateRange;

export function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export async function KpiSection({ range, compare }: { range: DateRange; compare: boolean }) {
  let gaSummary, gscSummary;
  try {
    [gaSummary, gscSummary] = await Promise.all([
      getGaOverviewKpiSummary(range, compare),
      getGscOverviewKpiSummary(range, compare),
    ]);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load KPI summary." />;
  }
  const ga = gaSummary.current;
  const gsc = gscSummary.current;
  if (ga.sessions === 0 && gsc.clicks === 0) {
    return <EmptyState />;
  }

  // Position is the one metric here where a smaller number is better --
  // negate its delta so "improved" still renders as a green up-arrow,
  // matching the up-is-good convention every other card uses (same
  // reasoning as the Search Console detail page).
  const positionDeltaPct =
    gscSummary.deltaPct.position === null || gscSummary.deltaPct.position === undefined
      ? gscSummary.deltaPct.position
      : -gscSummary.deltaPct.position;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Analytics (GA4)</h3>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Sessions"
            value={formatNumber(ga.sessions)}
            deltaPct={compare ? gaSummary.deltaPct.sessions : undefined}
          />
          <KpiCard
            label="Users"
            value={formatNumber(ga.users)}
            deltaPct={compare ? gaSummary.deltaPct.users : undefined}
          />
          <KpiCard
            label="Conversions"
            value={formatNumber(ga.conversions)}
            deltaPct={compare ? gaSummary.deltaPct.conversions : undefined}
          />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Search Console (GSC)</h3>
        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            label="Clicks"
            value={formatNumber(gsc.clicks)}
            deltaPct={compare ? gscSummary.deltaPct.clicks : undefined}
          />
          <KpiCard
            label="Impressions"
            value={formatNumber(gsc.impressions)}
            deltaPct={compare ? gscSummary.deltaPct.impressions : undefined}
          />
          <KpiCard label="Avg position" value={formatDecimal(gsc.position)} deltaPct={compare ? positionDeltaPct : undefined} />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[280px] w-full" />;
}

export async function TrendSection({ range }: { range: DateRange }) {
  let sessionsTrend, clicksTrend;
  try {
    [sessionsTrend, clicksTrend] = await Promise.all([getSessionsTrend(range), getClicksImpressionsTrend(range)]);
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load the combined trend." />;
  }
  if (sessionsTrend.length === 0 && clicksTrend.length === 0) {
    return <EmptyState />;
  }

  const byDate = new Map<string, OverviewTrendPoint>();
  for (const s of sessionsTrend) {
    byDate.set(s.date, { date: s.date, sessions: s.sessions, clicks: 0 });
  }
  for (const c of clicksTrend) {
    const existing = byDate.get(c.date);
    if (existing) {
      existing.clicks = c.clicks;
    } else {
      byDate.set(c.date, { date: c.date, sessions: 0, clicks: c.clicks });
    }
  }
  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return <OverviewTrendChart data={data} />;
}

export function SyncSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export async function SyncSection() {
  let statuses;
  try {
    statuses = await getLatestSyncStatus();
  } catch (err) {
    console.error(err);
    return <ErrorState message="Couldn't load sync status." />;
  }
  const ga = statuses.find((s) => s.source === "ga4");
  const gsc = statuses.find((s) => s.source === "gsc");
  if (!ga && !gsc) {
    return <EmptyState message="No syncs recorded yet." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {ga ? (
        <SyncStatusItem label="Analytics (GA4)" status={ga} />
      ) : (
        <p className="text-sm text-muted-foreground">Analytics (GA4): no syncs recorded yet.</p>
      )}
      {gsc ? (
        <SyncStatusItem label="Search Console (GSC)" status={gsc} />
      ) : (
        <p className="text-sm text-muted-foreground">Search Console (GSC): no syncs recorded yet.</p>
      )}
    </div>
  );
}
