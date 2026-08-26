"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

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

export function DonutChart({ data }: { data: DonutDatum[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.label, { label: d.label, color: COLORS[i % COLORS.length] }]),
  );

  return (
    <ChartContainer config={config} className="mx-auto h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
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
}
