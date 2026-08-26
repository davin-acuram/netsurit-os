import { Suspense } from "react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { PageTopBar } from "@/components/dashboard/page-top-bar";
import { SectionCard } from "./analytics/sections";
import {
  ChartSkeleton,
  ConversionFunnelSection,
  ConversionFunnelSkeleton,
  KeyInsightsSection,
  KeyInsightsSkeleton,
  ScorecardsSection,
  ScorecardsSkeleton,
  TrendSection,
  type DateRange,
} from "./sections";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const fallback = defaultRange();
  const from = typeof params.from === "string" ? params.from : fallback.from;
  const to = typeof params.to === "string" ? params.to : fallback.to;
  const range: DateRange = { start: from, end: to };

  return (
    <div className="space-y-8">
      <PageTopBar page="Overview" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-muted-foreground text-sm">Organic traffic and search performance at a glance.</p>
        </div>
        <DateRangePicker />
      </div>

      <Suspense fallback={<ScorecardsSkeleton />}>
        <ScorecardsSection range={range} />
      </Suspense>

      <SectionCard title="Sessions & clicks" description="GA4 sessions and Search Console clicks, daily.">
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection range={range} />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Suspense fallback={<ConversionFunnelSkeleton />}>
          <ConversionFunnelSection range={range} />
        </Suspense>
        <Suspense fallback={<KeyInsightsSkeleton />}>
          <KeyInsightsSection range={range} />
        </Suspense>
      </div>
    </div>
  );
}
