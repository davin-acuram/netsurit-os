import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { SyncStatus } from "@/lib/sync-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ERROR_PREVIEW_LENGTH = 200;

function truncateError(message: string): string {
  return message.length > ERROR_PREVIEW_LENGTH ? `${message.slice(0, ERROR_PREVIEW_LENGTH)}…` : message;
}

export function SyncStatusItem({ label, status }: { label: string; status: SyncStatus }) {
  const isError = status.latest.status === "error";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {isError ? (
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>

      {isError ? (
        <div className="space-y-1 pl-6">
          <p className={cn("text-sm font-medium text-destructive")}>
            Sync failed {formatDateTime(status.latest.finishedAt)}
          </p>
          {status.latest.error && (
            <p className="text-xs text-destructive/80 break-words">{truncateError(status.latest.error)}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {status.lastSuccess
              ? `Last successful sync: ${formatDateTime(status.lastSuccess.finishedAt)}`
              : "No successful sync yet."}
          </p>
        </div>
      ) : (
        <p className="pl-6 text-sm text-muted-foreground">Last synced {formatDateTime(status.latest.finishedAt)}</p>
      )}
    </div>
  );
}
