import { Suspense } from "react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import type { DateRange } from "@/lib/google-analytics/queries";
import {
  ChannelSection,
  ChartSkeleton,
  DeviceSection,
  GeoSection,
  KpiSection,
  KpiSkeleton,
  LandingPageSection,
  NewUsersTrendSection,
  SectionCard,
  BreakdownSkeleton,
  TableSkeleton,
} from "./sections";

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const params = await searchParams;
  const fallback = defaultRange();
  const from = typeof params.from === "string" ? params.from : fallback.from;
  const to = typeof params.to === "string" ? params.to : fallback.to;
  const range: DateRange = { start: from, end: to };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground text-sm">GA4 detail.</p>
        </div>
        <DateRangePicker />
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection range={range} />
      </Suspense>

      <SectionCard
        title="New users, weekly"
        description={`Weekly, full history since Apr 2023 — not affected by the date range above.`}
      >
        <Suspense fallback={<ChartSkeleton />}>
          <NewUsersTrendSection />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Channel breakdown">
          <Suspense fallback={<BreakdownSkeleton />}>
            <ChannelSection range={range} />
          </Suspense>
        </SectionCard>

        <SectionCard title="Device breakdown">
          <Suspense fallback={<BreakdownSkeleton />}>
            <DeviceSection range={range} />
          </Suspense>
        </SectionCard>
      </div>

      <SectionCard title="Landing page performance">
        <Suspense fallback={<TableSkeleton />}>
          <LandingPageSection range={range} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Geo breakdown" description="Top countries by sessions.">
        <Suspense fallback={<TableSkeleton />}>
          <GeoSection range={range} />
        </Suspense>
      </SectionCard>
    </div>
  );
}
