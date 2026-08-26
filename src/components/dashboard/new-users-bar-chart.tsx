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

// Balances a label across two lines by picking the word-boundary split
// that minimizes the longer of the two resulting lines, rather than
// hardcoding a break point per label.
function wrapTwoLines(text: string): [string, string] {
  const words = text.split(" ");
  if (words.length <= 1) return [text, ""];
  let bestSplit = 1;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1Length = words.slice(0, i).join(" ").length;
    const line2Length = words.slice(i).join(" ").length;
    const score = Math.max(line1Length, line2Length);
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }
  return [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
}

// Card-styled callout: same surface, border, and radius token as the
// dashboard's cards (--card / --border / --radius-xl), so it reads as
// part of this UI rather than a generic dark tooltip. Ember is reserved
// for the small marker dot at the bar top -- not the whole bubble --
// with a card-colored ring around it so it still reads clearly against
// the bar's own Ember fill. Text wraps to two lines so the bubble stays
// narrow instead of stretching wide across the chart.
function BubbleLabel(props: { viewBox?: { x?: number; y?: number }; text: string }) {
  const { viewBox, text } = props;
  if (viewBox?.x == null || viewBox?.y == null) return null;
  const { x, y } = viewBox;

  const [line1, line2] = wrapTwoLines(text);
  const paddingX = 10;
  const paddingY = 6;
  const charWidth = 6;
  const lineHeight = 13;
  const longestLine = Math.max(line1.length, line2.length);
  const width = Math.round(Math.max(56, longestLine * charWidth + paddingX * 2));
  const height = paddingY * 2 + lineHeight * 2;
  const radius = 5; // --radius-xl
  const markerRadius = 3.5;
  const gap = 9; // px between the marker and the tail tip
  const tailHeight = 6;
  const tailHalfWidth = 5;

  const tailTipY = y - gap;
  const bubbleBottom = tailTipY - tailHeight;
  const bubbleTop = bubbleBottom - height;
  const left = x - width / 2;
  const line1Y = bubbleTop + paddingY + lineHeight - 3;
  const line2Y = line1Y + lineHeight;

  return (
    <g pointerEvents="none">
      <g style={{ filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.16))" }}>
        {/* Tail drawn first and inset half a pixel into the rect so the
            seam between the two shapes doesn't show through the shadow. */}
        <path
          d={`M ${x - tailHalfWidth} ${bubbleBottom - 0.5} L ${x} ${tailTipY} L ${x + tailHalfWidth} ${bubbleBottom - 0.5} Z`}
          fill="var(--card)"
        />
        <rect x={left} y={bubbleTop} width={width} height={height} rx={radius} fill="var(--card)" stroke="var(--border)" />
      </g>
      <text x={x} y={line1Y} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--foreground)">
        {line1}
      </text>
      {line2 && (
        <text x={x} y={line2Y} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--foreground)">
          {line2}
        </text>
      )}
      <circle cx={x} cy={y} r={markerRadius} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
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
