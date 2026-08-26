"use client";

import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface OverviewTrendPoint {
  date: string;
  sessions: number;
  clicks: number;
}

const config: ChartConfig = {
  sessions: { label: "Sessions (GA4)", color: "var(--chart-1)" },
  clicks: { label: "Clicks (GSC)", color: "var(--chart-2)" },
};

// Sessions and clicks differ by orders of magnitude, same reasoning as
// the Search Console detail page's clicks/impressions chart -- separate
// Y axes instead of one shared scale.
export function OverviewTrendChart({ data }: { data: OverviewTrendPoint[] }) {
  return (
    <ChartContainer config={config} className="max-h-[280px] w-full">
      <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(value: string) => value.slice(5)}
        />
        <YAxis yAxisId="sessions" tickLine={false} axisLine={false} width={40} />
        <YAxis yAxisId="clicks" orientation="right" tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          yAxisId="sessions"
          dataKey="sessions"
          type="monotone"
          stroke="var(--color-sessions)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="clicks"
          dataKey="clicks"
          type="monotone"
          stroke="var(--color-clicks)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
