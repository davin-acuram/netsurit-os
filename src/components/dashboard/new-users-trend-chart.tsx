"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { WeeklyNewUsers } from "@/lib/google-analytics/queries";

const config: ChartConfig = {
  newUsers: { label: "New users", color: "var(--chart-1)" },
};

export function NewUsersTrendChart({ data }: { data: WeeklyNewUsers[] }) {
  return (
    <ChartContainer config={config} className="max-h-[280px] w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="weekStart"
          tickLine={false}
          axisLine={false}
          minTickGap={40}
          tickFormatter={(value: string) => value.slice(0, 7)}
        />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent labelKey="weekStart" />} />
        <Area dataKey="newUsers" type="monotone" fill="var(--color-newUsers)" fillOpacity={0.25} stroke="var(--color-newUsers)" />
      </AreaChart>
    </ChartContainer>
  );
}
