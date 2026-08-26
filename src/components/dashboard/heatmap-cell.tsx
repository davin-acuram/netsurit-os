import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Single-hue ramp scaled to this column's own min/max within the currently
// displayed rows -- not a fixed absolute scale, so it stays meaningful as
// the date range (and therefore the value range) changes.
const MAX_ALPHA = 65;
const STRONG_THRESHOLD = 0.6;

export function heatmapIntensity(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

export function HeatmapCell({
  value,
  min,
  max,
  format,
}: {
  value: number;
  min: number;
  max: number;
  format: (value: number) => string;
}) {
  const t = heatmapIntensity(value, min, max);
  const alpha = Math.round(t * MAX_ALPHA);
  const isStrong = t >= STRONG_THRESHOLD;

  return (
    // The color lives on an inner chip, not the <td>'s own background --
    // a <td> background fills the cell's padding too, so two adjacent
    // heatmap columns would paint edge-to-edge with no visible gap
    // between them no matter how much cell padding is set. The chip's
    // own margin (from the cell's padding) is what creates the gap, and
    // rounding it to --radius-xl matches the card radius used everywhere else.
    <TableCell className="p-1.5">
      <div
        className={cn(
          "rounded-xl px-2.5 py-1.5 text-right font-medium tabular-nums",
          isStrong ? "text-white" : "text-foreground",
        )}
        style={{ backgroundColor: `color-mix(in oklch, var(--data-heatmap) ${alpha}%, transparent)` }}
      >
        {format(value)}
      </div>
    </TableCell>
  );
}
