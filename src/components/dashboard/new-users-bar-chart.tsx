"use client";

import { Bar, BarChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatNumber } from "@/lib/format";
import type { MonthlyNewUsers } from "@/lib/google-analytics/queries";

const config: ChartConfig = {
  newUsers: { label: "New users", color: "var(--chart-1)" },
};

interface Annotation {
  month: string; // YYYY-MM, must match a data point's month exactly
  label: string;
}

// Fixed calendar milestones, not derived from "today" -- they mark real
// program start dates and stay put regardless of the rolling window.
const ANNOTATIONS: Annotation[] = [
  { month: "2025-11", label: "Upfront Ops starts" },
  { month: "2026-03", label: "Jan's findings rollout" },
];

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Speech-bubble callout: a rounded rect with a small downward-pointing
// tail, positioned directly above the reference dot (which sits at the
// top of the bar it annotates) so the tail touches the bar it references.
function BubbleLabel(props: { viewBox?: { x?: number; y?: number }; text: string }) {
  const { viewBox, text } = props;
  if (viewBox?.x == null || viewBox?.y == null) return null;
  const { x, y } = viewBox;

  const paddingX = 8;
  const charWidth = 6;
  const width = Math.round(Math.max(64, text.length * charWidth + paddingX * 2));
  const height = 22;
  const gap = 10; // px between the bar top and the tail tip
  const tailHeight = 6;
  const tailHalfWidth = 5;

  const tailTipY = y - gap;
  const bubbleBottom = tailTipY - tailHeight;
  const bubbleTop = bubbleBottom - height;
  const left = x - width / 2;

  return (
    <g pointerEvents="none">
      <rect x={left} y={bubbleTop} width={width} height={height} rx={6} fill="var(--foreground)" />
      <path
        d={`M ${x - tailHalfWidth} ${bubbleBottom} L ${x} ${tailTipY} L ${x + tailHalfWidth} ${bubbleBottom} Z`}
        fill="var(--foreground)"
      />
      <text x={x} y={bubbleTop + height / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--background)">
        {text}
      </text>
    </g>
  );
}

export function NewUsersBarChart({ data }: { data: MonthlyNewUsers[] }) {
  const valueByMonth = new Map(data.map((d) => [d.month, d.newUsers]));

  return (
    <ChartContainer config={config} className="max-h-[300px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 32 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickFormatter={formatMonthLabel}
        />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatNumber(v)} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="month"
              labelFormatter={(_, payload) => formatMonthLabel(String(payload?.[0]?.payload?.month ?? ""))}
              formatter={(value) => [`${formatNumber(Number(value))} new users`, ""]}
            />
          }
        />
        <Bar dataKey="newUsers" fill="var(--color-newUsers)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        {ANNOTATIONS.filter((a) => valueByMonth.has(a.month)).map((a) => (
          <ReferenceDot
            key={a.month}
            x={a.month}
            y={valueByMonth.get(a.month)!}
            r={0}
            fill="none"
            stroke="none"
            label={<BubbleLabel text={a.label} />}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
