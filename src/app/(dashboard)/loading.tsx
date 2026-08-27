import { Skeleton } from "@/components/ui/skeleton";

// Route-level loading UI for every dashboard page. Its real job is to let
// Next.js partially prefetch and instantly render these (otherwise
// non-prefetchable, because dynamic) routes on navigation -- without a
// loading.tsx the client waits on a full server round trip before
// anything changes on screen. The shape is deliberately generic: a
// header row plus a scorecard strip and two content blocks, which is
// close enough to all three pages that the swap to real content doesn't
// jump.
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-8 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      <Skeleton className="h-[300px] w-full" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
