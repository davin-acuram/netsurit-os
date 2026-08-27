"use client";

import { useId } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactNumber, formatNumber } from "@/lib/format";
import type { MonthlyClicksImpressions } from "@/lib/search-console/queries";

const config: ChartConfig = {
  // Both series use --data-heatmap, the dashboard's one established blue
  // (geo choropleth, table heatmaps): clicks as solid bars from the
  // baseline, impressions as a gradient-filled line riding above them.
  // Form and vertical position keep the two readable without a second hue.
  clicks: { label: "Clicks", color: "var(--data-heatmap)" },
  impressions: { label: "Impressions", color: "var(--data-heatmap)" },
};

// Emerald, matching the positive-delta accent the KPI cards already use --
// legible in both themes and distinct from the blue bars and line.
const AVG_LINE_COLOR = "#10b981";

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Rounds up to a "nice" number so an axis tick doesn't read as an
// arbitrary data-derived value.
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

// Small pill drawn at the left end of the dashed average line, mirroring
// the reference. recharts clones this element with the line's viewBox.
function AverageLabel(props: { viewBox?: { x?: number; y?: number }; text: string }) {
  const { viewBox, text } = props;
  if (viewBox?.x == null || viewBox?.y == null) return null;
  const x = viewBox.x + 8;
  const baseline = viewBox.y - 7;
  const width = text.length * 6.1 + 16;

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={baseline - 13}
        width={width}
        height={18}
        rx={4}
        fill={AVG_LINE_COLOR}
        fillOpacity={0.14}
      />
      <text x={x + 8} y={baseline} fontSize={11} fontWeight={600} fill={AVG_LINE_COLOR}>
        {text}
      </text>
    </g>
  );
}

export function ClicksImpressionsTrendChart({
  data,
  averageClicks,
}: {
  data: MonthlyClicksImpressions[];
  averageClicks: number;
}) {
  const gradientId = useId();

  const maxClicks = Math.max(1, ...data.map((d) => d.clicks));
  const maxImpressions = Math.max(1, ...data.map((d) => d.impressions));
  // Pad the clicks axis past the real max so the bars occupy roughly the
  // lower half of the plot and the impressions area rides above them,
  // matching the reference's scale proportions.
  const clicksDomain: [number, number] = [0, niceCeiling(maxClicks * 1.5)];
  const impressionsDomain: [number, number] = [0, niceCeiling(maxImpressions * 1.05)];

  return (
    <ChartContainer config={config} className="max-h-[300px] w-full">
      <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-impressions)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-impressions)" stopOpacity={0} />
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
          yAxisId="clicks"
          domain={clicksDomain}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          yAxisId="impressions"
          orientation="right"
          domain={impressionsDomain}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) => formatCompactNumber(v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="month"
              labelFormatter={(_, payload) => formatMonthLabel(String(payload?.[0]?.payload?.month ?? ""))}
              formatter={(value, name) => [`${formatNumber(Number(value))} ${String(name)}`, ""]}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          yAxisId="clicks"
          dataKey="clicks"
          fill="var(--color-clicks)"
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
          isAnimationActive={false}
        />
        <Area
          yAxisId="impressions"
          dataKey="impressions"
          type="monotone"
          stroke="var(--color-impressions)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          baseValue={0}
          isAnimationActive={false}
        />
        <ReferenceLine
          yAxisId="clicks"
          y={averageClicks}
          stroke={AVG_LINE_COLOR}
          strokeDasharray="6 4"
          strokeWidth={1.5}
          label={<AverageLabel text={`Average clicks (${formatNumber(averageClicks)})`} />}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
