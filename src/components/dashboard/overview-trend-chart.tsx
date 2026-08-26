"use client";

import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface OverviewTrendPoint {
  month: string; // YYYY-MM
  sessions: number;
  clicks: number;
}

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const config: ChartConfig = {
  // Same blue the geo choropleth and conversion funnel already use for
  // sequential data fills (--data-heatmap) -- the dashboard's one
  // established "blue" accent, not a new color.
  sessions: { label: "Sessions (GA4)", color: "var(--chart-1)" },
  clicks: { label: "Clicks (GSC)", color: "var(--data-heatmap)" },
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
    color: "var(--data-heatmap)",
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

// Rounds up to a "nice" number so the one visible tick doesn't read as an
// arbitrary data-derived value.
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

// Sessions and clicks differ by orders of magnitude, same reasoning as the
// Search Console detail page's clicks/impressions chart -- separate Y axes
// instead of one shared scale. Sessions reads as the "featured" series
// (gradient-filled area, drawn last so it sits over the bars); clicks
// reads as the secondary volume series (plain bars, drawn first).
//
// The sessions axis domain is deliberately padded far below the real data
// range -- not because sessions can go negative, but so the line's actual
// values only ever occupy the top ~30% of the chart's vertical space,
// keeping it visually clear of the bars beneath it instead of crossing
// through them. This only affects where the line is drawn; the tooltip
// still reads the real underlying value.
export function OverviewTrendChart({ data }: { data: OverviewTrendPoint[] }) {
  const gradientId = useId();
  const sessionsMax = Math.max(1, ...data.map((d) => d.sessions));
  const sessionsCeiling = niceCeiling(sessionsMax * 1.05);
  const sessionsDomain: [number, number] = [-sessionsCeiling * 2.3, sessionsCeiling];

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
            dataKey="month"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={formatMonthLabel}
          />
          <YAxis
            yAxisId="sessions"
            domain={sessionsDomain}
            ticks={[0, sessionsCeiling]}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <YAxis yAxisId="clicks" orientation="right" tickLine={false} axisLine={false} width={48} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelKey="month"
                labelFormatter={(_, payload) => formatMonthLabel(String(payload?.[0]?.payload?.month ?? ""))}
              />
            }
          />
          <Bar yAxisId="clicks" dataKey="clicks" fill="var(--color-clicks)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Area
            yAxisId="sessions"
            dataKey="sessions"
            type="monotone"
            stroke="var(--color-sessions)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            baseValue={0}
          />
        </ComposedChart>
      </ChartContainer>
      <TrendLegend />
    </div>
  );
}
