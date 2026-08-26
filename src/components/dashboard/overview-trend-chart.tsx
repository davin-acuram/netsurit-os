"use client";

import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface OverviewTrendPoint {
  date: string;
  sessions: number;
  clicks: number;
}

const config: ChartConfig = {
  sessions: { label: "Sessions (GA4)", color: "var(--chart-1)" },
  clicks: { label: "Clicks (GSC)", color: "var(--chart-2)" },
};

const LEGEND_ITEMS = [
  {
    key: "sessions",
    label: "Sessions",
    color: "var(--chart-1)",
    description: "A GA4 session: one visit to the site, counted once no matter how many pages the visitor views.",
  },
  {
    key: "clicks",
    label: "Clicks",
    color: "var(--chart-2)",
    description: "Organic search clicks recorded by Google Search Console.",
  },
] as const;

// A plain div, not recharts' own <Legend>, because each item needs its own
// hover-triggered definition tooltip -- recharts' legend content renders
// from its series payload and has no hook for per-item hover state.
function TrendLegend() {
  return (
    <div className="flex items-center justify-center gap-5 pt-3 text-xs text-muted-foreground">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.key} className="group relative flex cursor-default items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-left text-xs text-foreground opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            {item.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// Sessions and clicks differ by orders of magnitude, same reasoning as the
// Search Console detail page's clicks/impressions chart -- separate Y axes
// instead of one shared scale. Sessions reads as the "featured" series
// (gradient-filled area, drawn last so it sits over the bars); clicks
// reads as the secondary volume series (plain bars, drawn first).
export function OverviewTrendChart({ data }: { data: OverviewTrendPoint[] }) {
  const gradientId = useId();

  return (
    <div className="flex flex-col">
      <ChartContainer config={config} className="max-h-[280px] w-full">
        <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar yAxisId="clicks" dataKey="clicks" fill="var(--color-clicks)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Area
            yAxisId="sessions"
            dataKey="sessions"
            type="monotone"
            stroke="var(--color-sessions)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </ComposedChart>
      </ChartContainer>
      <TrendLegend />
    </div>
  );
}
