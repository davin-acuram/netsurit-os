import { Suspense } from "react";
import Link from "next/link";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionCard } from "./analytics/sections";
import { ChartSkeleton, KpiSection, KpiSkeleton, SyncSection, SyncSkeleton, TrendSection, type DateRange } from "./sections";

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-muted-foreground text-sm">Organic traffic and search performance at a glance.</p>
        </div>
        <DateRangePicker />
      </div>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiSection range={range} />
      </Suspense>

      <SectionCard title="Sessions & clicks" description="GA4 sessions and Search Console clicks, daily.">
        <Suspense fallback={<ChartSkeleton />}>
          <TrendSection range={range} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Sync status">
        <Suspense fallback={<SyncSkeleton />}>
          <SyncSection />
        </Suspense>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/analytics" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
          View Analytics detail
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/search-console" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
          View Search Console detail
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
