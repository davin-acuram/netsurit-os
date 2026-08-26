import { Suspense } from "react";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { PageTopBar } from "@/components/dashboard/page-top-bar";
import type { DateRange } from "@/lib/google-analytics/queries";
import {
  ChannelSection,
  ChartSkeleton,
  ConversionsByChannelSection,
  DeviceSection,
  DonutSkeleton,
  EventsByChannelSection,
  GeoSection,
  GeoSkeleton,
  KpiSection,
  KpiSkeleton,
  NewUsersSection,
  SectionCard,
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
      <PageTopBar page="Analytics" />
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

      <SectionCard title="New users per month" description="22 months lookback period. This card is not affected by date range selector.">
        <Suspense fallback={<ChartSkeleton />}>
          <NewUsersSection />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SectionCard title="Where key actions come from" description="All events by channel.">
          <Suspense fallback={<DonutSkeleton />}>
            <EventsByChannelSection range={range} />
          </Suspense>
        </SectionCard>

        <SectionCard title="Where key business comes from" description="Conversions by channel.">
          <Suspense fallback={<DonutSkeleton />}>
            <ConversionsByChannelSection range={range} />
          </Suspense>
        </SectionCard>

        <SectionCard title="Traffic by device" description="Sessions by device category.">
          <Suspense fallback={<DonutSkeleton />}>
            <DeviceSection range={range} />
          </Suspense>
        </SectionCard>
      </div>

      <SectionCard title="Channel breakdown">
        <Suspense fallback={<TableSkeleton />}>
          <ChannelSection range={range} />
        </Suspense>
      </SectionCard>

      <Suspense fallback={<GeoSkeleton />}>
        <GeoSection range={range} />
      </Suspense>
    </div>
  );
}
