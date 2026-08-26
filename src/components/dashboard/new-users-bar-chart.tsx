"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
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
// program start dates and stay put regardless of the 24-month rolling window.
// Four months apart, so their top labels never collide horizontally --
// both can sit at the same height.
const ANNOTATIONS: Annotation[] = [
  { month: "2025-11", label: "Upfront Ops starts" },
  { month: "2026-03", label: "Jan's findings rollout" },
];

function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function NewUsersBarChart({ data }: { data: MonthlyNewUsers[] }) {
  const presentMonths = new Set(data.map((d) => d.month));

  return (
    <ChartContainer config={config} className="max-h-[300px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 24 }}>
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
        {ANNOTATIONS.filter((a) => presentMonths.has(a.month)).map((a) => (
          <ReferenceLine
            key={a.month}
            x={a.month}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: a.label,
              position: "top",
              fill: "var(--muted-foreground)",
              fontSize: 11,
              fontWeight: 500,
            }}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
