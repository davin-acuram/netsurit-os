import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import type { SyncStatus } from "@/lib/sync-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ScorecardMetric {
  label: string;
  value: string;
  deltaPct?: number | null;
}

export function ScorecardGroup({
  title,
  metrics,
  syncStatus,
  detailHref,
  detailLabel,
}: {
  title: string;
  metrics: ScorecardMetric[];
  syncStatus?: SyncStatus;
  detailHref: string;
  detailLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">{title}</h3>
        {syncStatus && <SyncStatusLine status={syncStatus} />}
      </div>
      <div className={cn("grid gap-4", metrics.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {metrics.map((m) => (
          <KpiCard key={m.label} label={m.label} value={m.value} deltaPct={m.deltaPct} />
        ))}
      </div>
      <Link
        href={detailHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        {detailLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function SyncStatusLine({ status }: { status: SyncStatus }) {
  if (status.latest.status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        Sync failed {formatDateTime(status.latest.finishedAt)}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      Last synced {formatDateTime(status.latest.finishedAt)}
    </div>
  );
}
