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
import type { TrendPoint } from "@/lib/search-console/queries";

const config: ChartConfig = {
  clicks: { label: "Clicks", color: "var(--chart-1)" },
  impressions: { label: "Impressions", color: "var(--chart-2)" },
};

// Clicks and impressions differ by 1-2 orders of magnitude, so they get
// separate Y axes instead of sharing one scale.
export function ClicksImpressionsTrendChart({ data }: { data: TrendPoint[] }) {
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
        <YAxis yAxisId="clicks" tickLine={false} axisLine={false} width={40} />
        <YAxis yAxisId="impressions" orientation="right" tickLine={false} axisLine={false} width={48} />
        <ChartTooltip content={<ChartTooltipContent labelKey="date" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          yAxisId="clicks"
          dataKey="clicks"
          type="monotone"
          stroke="var(--color-clicks)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="impressions"
          dataKey="impressions"
          type="monotone"
          stroke="var(--color-impressions)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
