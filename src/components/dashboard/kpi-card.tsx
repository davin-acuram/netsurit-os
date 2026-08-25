import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDeltaPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  deltaPct?: number | null;
}

export function KpiCard({ label, value, deltaPct }: KpiCardProps) {
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const isUp = hasDelta && deltaPct > 0;
  const isDown = hasDelta && deltaPct < 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {deltaPct !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isUp && "text-emerald-600 dark:text-emerald-400",
              isDown && "text-red-600 dark:text-red-400",
              !hasDelta && "text-muted-foreground",
            )}
          >
            {isUp && <ArrowUp className="size-3" />}
            {isDown && <ArrowDown className="size-3" />}
            {formatDeltaPct(deltaPct)}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
