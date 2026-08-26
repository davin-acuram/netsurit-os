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
}: {
  data: DonutDatum[];
  /** "right" places a swatch+value legend beside the donut instead of the
   * default no-legend rendering other pages already rely on. */
  legendPosition?: "right" | "none";
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.label, { label: d.label, color: COLORS[i % COLORS.length] }]),
  );

  const chart = (
    <ChartContainer
      config={config}
      className={cn(legendPosition === "right" ? "h-[160px] w-[160px] shrink-0" : "mx-auto h-[260px] w-full")}
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="90%"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={d.label} fill={COLORS[i % COLORS.length]} />
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
      <ul className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="mt-0.5 size-2.5 shrink-0 self-start rounded-[2px]" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="break-words">{d.label}</span>
            </span>
            <span className="shrink-0 font-mono font-medium text-foreground tabular-nums">{formatCompactNumber(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
