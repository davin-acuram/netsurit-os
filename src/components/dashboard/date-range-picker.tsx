"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Check } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
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

  const activePresetDays = PRESETS.find((p) => {
    const r = presetRange(p.days);
    return r.from === from && r.to === to;
  })?.days;

  function pushParams(next: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams);
    params.set("from", next.from);
    params.set("to", next.to);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetClick(days: number) {
    pushParams(presetRange(days));
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
          <Button variant="outline" className="justify-start text-left font-normal">
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
                key={p.days}
                type="button"
                onClick={() => handlePresetClick(p.days)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                  activePresetDays === p.days ? "bg-primary/12 text-primary" : "text-muted-foreground",
                )}
              >
                {p.label}
                {activePresetDays === p.days && <Check className="size-3.5" />}
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
