"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
] as const;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? presetRange(30).from;
  const to = searchParams.get("to") ?? presetRange(30).to;
  const compare = searchParams.get("compare") === "1";

  const activePreset = PRESETS.find((p) => {
    if (p.value === "custom") return false;
    return JSON.stringify(presetRange(Number(p.value))) === JSON.stringify({ from, to });
  })?.value ?? "custom";

  function pushParams(next: { from: string; to: string; compare: boolean }) {
    const params = new URLSearchParams(searchParams);
    params.set("from", next.from);
    params.set("to", next.to);
    if (next.compare) {
      params.set("compare", "1");
    } else {
      params.delete("compare");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetChange(value: string | null) {
    if (!value || value === "custom") return;
    pushParams({ ...presetRange(Number(value)), compare });
  }

  function handleCalendarSelect(range: DayPickerRange | undefined) {
    if (!range?.from) return;
    const nextTo = range.to ?? range.from;
    pushParams({ from: toIsoDate(range.from), to: toIsoDate(nextTo), compare });
  }

  function handleCompareToggle(checked: boolean) {
    pushParams({ from, to, compare: checked });
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-pending={isPending || undefined}>
      <Select value={activePreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 size-4" />
              {from} &ndash; {to}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={new Date(`${from}T00:00:00`)}
            selected={{ from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Switch id="compare-toggle" checked={compare} onCheckedChange={handleCompareToggle} />
        <Label htmlFor="compare-toggle" className="text-sm font-normal">
          Compare to previous period
        </Label>
      </div>
    </div>
  );
}
