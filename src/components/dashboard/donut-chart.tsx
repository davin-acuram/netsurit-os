"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// The theme's default --chart-* tokens are grayscale by design, which
// makes a multi-slice donut unreadable -- use a distinct categorical
// palette here instead of the app-wide theme tokens. Hex, not oklch():
// SVG's fill presentation attribute doesn't reliably parse oklch() the
// way a CSS custom property does, so slices silently failed to paint.
const COLORS = [
  "#e0763f",
  "#3f7ce0",
  "#4caf7a",
  "#c060b0",
  "#c9a227",
  "#3fb8c9",
  "#7c5fc4",
  "#b0473f",
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
