"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// Only the top (first) category gets the brand accent -- everything
// else steps down a warm-neutral gray ramp instead of a rainbow of
// hues, so one slice reads as "the highlighted one" rather than
// competing categories all shouting for attention. Hex, not oklch():
// SVG's fill presentation attribute doesn't reliably parse oklch() the
// way a CSS custom property does, so slices silently failed to paint.
const COLORS = [
  "#f4364c", // Ember -- top category only
  "#6e6863",
  "#8f8880",
  "#a8a19b",
  "#b9b2ac",
  "#c9c3be",
  "#d8d3ce",
  "#e6e2de",
];

export interface DonutDatum {
  label: string;
  value: number;
}

export function DonutChart({
  data,
  legendPosition = "none",
  maxSlices,
}: {
  data: DonutDatum[];
  /** "right" places a swatch+value legend beside the donut instead of the
   * default no-legend rendering other pages already rely on. */
  legendPosition?: "right" | "none";
  /** When set, only the top N values (by value) are drawn as donut slices
   * -- the legend still lists every entry, scrollable past 3. Leave unset
   * to draw every entry (e.g. device breakdown, which never has more
   * than a handful of categories anyway). */
  maxSlices?: number;
}) {
  // Sorted by the value actually being plotted -- not whatever order the
  // caller's query happened to return -- so the brand-accent slice always
  // lands on the true top category and, when maxSlices is set, "top N"
  // means top by this chart's own metric.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const sliceData = maxSlices ? sorted.slice(0, maxSlices) : sorted;
  const colorByLabel = new Map(sorted.map((d, i) => [d.label, COLORS[i % COLORS.length]]));

  const config: ChartConfig = Object.fromEntries(
    sorted.map((d) => [d.label, { label: d.label, color: colorByLabel.get(d.label) }]),
  );

  const chart = (
    <ChartContainer
      config={config}
      className={cn(legendPosition === "right" ? "h-[170px] w-[170px] shrink-0" : "mx-auto h-[260px] w-full")}
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
        <Pie
          data={sliceData}
          dataKey="value"
          nameKey="label"
          innerRadius="51%"
          outerRadius="90%"
          paddingAngle={3}
          cornerRadius={3}
          strokeWidth={2}
          stroke="var(--card)"
          isAnimationActive={false}
        >
          {sliceData.map((d) => (
            <Cell key={d.label} fill={colorByLabel.get(d.label)} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );

  if (legendPosition !== "right") {
    return chart;
  }

  return (
    <div className="flex items-center gap-4">
      {chart}
      <ul className="scroll-fade flex max-h-[170px] min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 text-sm">
        {sorted.map((d) => (
          <li key={d.label} className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="mt-0.5 size-2.5 shrink-0 self-start rounded-[2px]" style={{ background: colorByLabel.get(d.label) }} />
              <span className="break-words">{d.label}</span>
            </span>
            <span className="shrink-0 font-mono font-medium text-foreground tabular-nums">{formatCompactNumber(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
