import { cache } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewTrendChart, type OverviewTrendPoint } from "@/components/dashboard/overview-trend-chart";
import { ScorecardGroup } from "@/components/dashboard/scorecard-group";
import { ConversionFunnel, type FunnelStage } from "@/components/dashboard/conversion-funnel";
import { KeyInsights, type InsightData } from "@/components/dashboard/key-insights";
import { EmptyState, ErrorState } from "@/components/dashboard/section-states";
import {
  getOverviewKpiSummary as getGaOverviewKpiSummary,
  getOrganicSearchChannelSummary,
  getSessionsTrend,
  type DateRange as GaDateRange,
} from "@/lib/google-analytics/queries";
import {
  getClicksImpressionsTrend,
  getKeyInsightsData,
  getKpiSummary as getGscKpiSummary,
  type DateRange as GscDateRange,
  type OpportunityCandidate,
} from "@/lib/search-console/queries";
import { getLatestSyncStatus } from "@/lib/sync-status";
import { BRAND_TERMS } from "@/lib/insights/brand-terms";
import { BRANDED_SHARE_HEALTHY_RANGE, ORGANIC_CVR_BENCHMARK, expectedCtrForPosition } from "@/lib/insights/benchmarks";
import { formatCompactNumber, formatDecimal, formatNumber, formatPercent } from "@/lib/format";

// The two detail pages' DateRange types are structurally identical
// ({ start, end }) but declared in separate modules -- this page blends
// both sources, so it needs one range value that satisfies both.
export type DateRange = GaDateRange & GscDateRange;

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

// Scorecards, the funnel, and key insights each independently need the
// same GSC current-period KPIs and the same GA4 organic-channel summary --
// cache() dedupes those calls to one DB round trip per request instead of
// one per Suspense boundary that asks for them.
const getGscKpiSummaryCached = cache(getGscKpiSummary);
const getOrganicSearchChannelSummaryCached = cache(getOrganicSearchChannelSummary);

export function ScorecardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-4 w-36" />
        </div>
      ))}
    </div>
  );
}

export async function ScorecardsSection({ range }: { range: DateRange }) {
  let gaSummary, gscSummary, syncStatuses;
  try {
    [gaSummary, gscSummary, syncStatuses] = await Promise.all([
      getGaOverviewKpiSummary(range, true),
      getGscKpiSummaryCached(range, true),
      getLatestSyncStatus(),
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

  const gaSync = syncStatuses.find((s) => s.source === "ga4");
  const gscSync = syncStatuses.find((s) => s.source === "gsc");

  // Position is the one metric here where a smaller number is better --
  // negate its delta so "improved" still renders as a green up-arrow,
  // matching the up-is-good convention every other card uses (same
  // reasoning as the Search Console detail page).
  const positionDeltaPct =
    gscSummary.deltaPct.position === null || gscSummary.deltaPct.position === undefined
      ? gscSummary.deltaPct.position
      : -gscSummary.deltaPct.position;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ScorecardGroup
        title="Analytics (GA4)"
        syncStatus={gaSync}
        detailHref="/analytics"
        detailLabel="View Analytics details"
        metrics={[
          { label: "Users", value: formatNumber(ga.users), deltaPct: gaSummary.deltaPct.users },
          { label: "Sessions", value: formatNumber(ga.sessions), deltaPct: gaSummary.deltaPct.sessions },
          { label: "Conversions", value: formatNumber(ga.conversions), deltaPct: gaSummary.deltaPct.conversions },
        ]}
      />
      <ScorecardGroup
        title="Search Console (GSC)"
        syncStatus={gscSync}
        detailHref="/search-console"
        detailLabel="View Search Console details"
        metrics={[
          { label: "Impressions", value: formatNumber(gsc.impressions), deltaPct: gscSummary.deltaPct.impressions },
          { label: "Clicks", value: formatNumber(gsc.clicks), deltaPct: gscSummary.deltaPct.clicks },
          { label: "CTR", value: formatPercent(gsc.ctr), deltaPct: gscSummary.deltaPct.ctr },
          { label: "Avg. position", value: formatDecimal(gsc.position), deltaPct: positionDeltaPct },
        ]}
      />
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

export function ConversionFunnelSkeleton() {
  return <Skeleton className="h-[280px] w-full lg:col-span-1" />;
}

// Every stage stays scoped to the organic-search population: GSC's
// impressions/clicks are organic search by definition, and the GA4 side
// is narrowed to the "Organic Search" channel rather than site-wide
// conversions, so the funnel tells one coherent story end to end.
export async function ConversionFunnelSection({ range }: { range: DateRange }) {
  let gscKpi, gaOrganic;
  try {
    // Same args as ScorecardsSection's call -- cache() dedupes this to the
    // one shared query rather than a second, comparison-free fetch.
    [gscKpi, gaOrganic] = await Promise.all([
      getGscKpiSummaryCached(range, true),
      getOrganicSearchChannelSummaryCached(range),
    ]);
  } catch (err) {
    console.error(err);
    return (
      <Card className="lg:col-span-1">
        <CardContent>
          <ErrorState message="Couldn't load the conversion funnel." />
        </CardContent>
      </Card>
    );
  }
  const gsc = gscKpi.current;

  const expectedCtr = expectedCtrForPosition(gsc.position);
  const organicCvr = safeDivide(gaOrganic.conversions, gaOrganic.sessions);

  const stages: [FunnelStage, FunnelStage, FunnelStage, FunnelStage] = [
    { label: "Impressions", figure: formatCompactNumber(gsc.impressions) },
    {
      label: "Clicks",
      figure: formatNumber(gsc.clicks),
      sub: `${formatPercent(gsc.ctr)} CTR · industry benchmark ${formatPercent(expectedCtr)} at position ${formatDecimal(gsc.position)}`,
    },
    {
      label: "Conversions",
      figure: formatNumber(gaOrganic.conversions),
      sub: `${formatPercent(organicCvr)} CVR · industry benchmark ${formatPercent(ORGANIC_CVR_BENCHMARK)}`,
    },
    {
      label: "Closed deals",
      figure: "—",
      sub: "Awaiting HubSpot integration",
      placeholder: true,
    },
  ];

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Conversion funnel</CardTitle>
        <CardDescription>Selected date range · organic search, Search Console → GA4.</CardDescription>
      </CardHeader>
      <CardContent>
        {gsc.impressions === 0 && gaOrganic.sessions === 0 ? <EmptyState /> : <ConversionFunnel stages={stages} />}
      </CardContent>
    </Card>
  );
}

export function KeyInsightsSkeleton() {
  return <Skeleton className="h-[280px] w-full lg:col-span-2" />;
}

// Top N is a judgment call, not a computed figure -- 5 already tells a
// dramatic-enough concentration story on this site's real click
// distribution without needing to reach for 10.
const QUERY_CONCENTRATION_TOP_N = 5;

// candidates are already filtered to the top decile by impressions in SQL
// -- this just ranks them by estimated lost clicks against the
// CTR-by-position benchmark to find the single best example.
function bestOpportunityCandidate(candidates: OpportunityCandidate[]): OpportunityCandidate | null {
  let best: OpportunityCandidate | null = null;
  let bestLostClicks = 0;
  for (const c of candidates) {
    const expected = expectedCtrForPosition(c.position);
    if (expected <= c.ctr) continue;
    const lostClicks = (expected - c.ctr) * c.impressions;
    if (lostClicks > bestLostClicks) {
      bestLostClicks = lostClicks;
      best = c;
    }
  }
  return best;
}

function KeyInsightsCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden lg:col-span-2">
      <CardHeader>
        <CardTitle>Key insights</CardTitle>
        <CardDescription>Computed from fixed rules against your synced data — not AI-generated.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

export async function KeyInsightsSection({ range }: { range: DateRange }) {
  let insightsData, gaOrganic;
  try {
    [insightsData, gaOrganic] = await Promise.all([
      getKeyInsightsData(range, BRAND_TERMS, QUERY_CONCENTRATION_TOP_N),
      getOrganicSearchChannelSummaryCached(range),
    ]);
  } catch (err) {
    console.error(err);
    return (
      <KeyInsightsCard>
        <ErrorState message="Couldn't load key insights." />
      </KeyInsightsCard>
    );
  }

  const { totalClicks, brandedClicks, topNClicks, opportunityCandidates } = insightsData;
  if (totalClicks === 0) {
    return (
      <KeyInsightsCard>
        <EmptyState message="Not enough Search Console click data yet for this range." />
      </KeyInsightsCard>
    );
  }

  const brandedPct = safeDivide(brandedClicks, totalClicks);
  const nonBrandedPct = 1 - brandedPct;
  const aboveHealthy = brandedPct > BRANDED_SHARE_HEALTHY_RANGE.max;
  const hero: InsightData = {
    eyebrow: "Brand mix",
    eyebrowTone: aboveHealthy ? "flag" : "neutral",
    headline: aboveHealthy
      ? `${formatPercent(brandedPct, 0)} of organic clicks are branded searches, vs ${formatPercent(nonBrandedPct, 0)} non-branded — an over-reliance on people who already know Netsurit`
      : `${formatPercent(brandedPct, 0)} of organic clicks are branded searches, vs ${formatPercent(nonBrandedPct, 0)} non-branded — a healthy discovery mix`,
    figure: formatPercent(brandedPct, 0),
    figureSub: `vs ${formatPercent(BRANDED_SHARE_HEALTHY_RANGE.min, 0)}–${formatPercent(BRANDED_SHARE_HEALTHY_RANGE.max, 0)} B2B services benchmark`,
    figureTone: aboveHealthy ? "negative" : "positive",
    source: "Search Console · gsc_daily_query",
  };

  const rest: InsightData[] = [];

  const best = bestOpportunityCandidate(opportunityCandidates);
  if (best) {
    const expected = expectedCtrForPosition(best.position);
    rest.push({
      eyebrow: "Opportunity",
      eyebrowTone: "neutral",
      headline: `"${best.query}" has ${formatNumber(best.impressions)} impressions but only ${formatNumber(best.clicks)} clicks (${formatPercent(best.ctr, 1)} CTR) vs an expected ${formatPercent(expected, 1)} at position ${formatDecimal(best.position)} — worth testing the title tag, meta description, or rich snippets`,
      figure: formatPercent(best.ctr, 1),
      figureSub: `vs ${formatPercent(expected, 1)} expected`,
      figureTone: "negative",
      source: "Search Console · gsc_daily_query",
    });
  }

  const concentrationPct = safeDivide(topNClicks, totalClicks);
  rest.push({
    eyebrow: "Risk",
    eyebrowTone: "flag",
    headline: `${formatPercent(concentrationPct, 0)} of organic clicks depend on just the top ${QUERY_CONCENTRATION_TOP_N} queries`,
    figure: formatPercent(concentrationPct, 0),
    figureSub: `query concentration, top ${QUERY_CONCENTRATION_TOP_N}`,
    figureTone: "negative",
    source: "Search Console · gsc_daily_query",
  });

  const newUserShare = safeDivide(gaOrganic.newUsers, gaOrganic.users);
  const estimatedSessions = Math.round(gaOrganic.sessions * nonBrandedPct * newUserShare);
  rest.push({
    eyebrow: "Estimate",
    eyebrowTone: "neutral",
    headline: `An estimated ~${formatNumber(estimatedSessions)} organic sessions come from new, non-branded visitors — the audience least familiar with Netsurit already`,
    figure: `~${formatCompactNumber(estimatedSessions)}`,
    figureSub: "modeled: non-branded click share × new-user rate",
    figureTone: "neutral",
    source: "GA4 + Search Console · modeled estimate",
  });

  return (
    <KeyInsightsCard>
      <KeyInsights hero={hero} rest={rest} />
    </KeyInsightsCard>
  );
}
