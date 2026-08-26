"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Check } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toIsoDate(from), to: toIsoDate(now) };
}

function lastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function thisYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toIsoDate(from), to: toIsoDate(now) };
}

const PRESETS = [
  { id: "7", label: "Last 7 days", getRange: () => presetRange(7) },
  { id: "14", label: "Last 14 days", getRange: () => presetRange(14) },
  { id: "30", label: "Last 30 days", getRange: () => presetRange(30) },
  { id: "90", label: "Last 90 days", getRange: () => presetRange(90) },
  { id: "this-month", label: "This month", getRange: thisMonthRange },
  { id: "last-month", label: "Last month", getRange: lastMonthRange },
  { id: "this-year", label: "This year", getRange: thisYearRange },
] as const;

function formatDisplay(from: string, to: string): string {
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DayPickerRange | undefined>(undefined);

  const from = searchParams.get("from") ?? presetRange(30).from;
  const to = searchParams.get("to") ?? presetRange(30).to;

  const activePresetId = PRESETS.find((p) => {
    const r = p.getRange();
    return r.from === from && r.to === to;
  })?.id;

  function pushParams(next: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams);
    params.set("from", next.from);
    params.set("to", next.to);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetClick(getRange: () => { from: string; to: string }) {
    pushParams(getRange());
    setOpen(false);
  }

  function handleApplyCustom() {
    if (!pendingRange?.from) return;
    const nextTo = pendingRange.to ?? pendingRange.from;
    pushParams({ from: toIsoDate(pendingRange.from), to: toIsoDate(nextTo) });
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      // Seed the calendar from the committed range each time it opens,
      // not from whatever was left pending from a cancelled selection.
      setPendingRange({ from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) });
    }
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="default"
            className="justify-start rounded-xl! text-left font-normal shadow-sm"
          >
            <CalendarIcon className="mr-2 size-4" />
            {formatDisplay(from, to)}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex w-40 flex-col gap-0.5 border-r border-border p-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.getRange)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                  activePresetId === p.id ? "bg-primary/12 text-primary" : "text-muted-foreground",
                )}
              >
                {p.label}
                {activePresetId === p.id && <Check className="size-3.5" />}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              defaultMonth={pendingRange?.from ?? new Date(`${from}T00:00:00`)}
              selected={pendingRange}
              onSelect={setPendingRange}
              numberOfMonths={2}
            />
            <div className="flex items-center justify-end gap-2 border-t border-border p-3">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={!pendingRange?.from} onClick={handleApplyCustom}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
