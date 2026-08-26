import { cn } from "@/lib/utils";

export interface InsightData {
  eyebrow: string;
  eyebrowTone: "flag" | "neutral" | "positive";
  headline: string;
  figure: string;
  figureSub: string;
  figureTone: "positive" | "negative" | "neutral";
  source: string;
}

function toneTextClass(tone: InsightData["figureTone"]): string {
  if (tone === "positive") return "text-emerald-600 dark:text-emerald-400";
  // Ember reads as the app's negative/alert color everywhere else
  // (KpiCard's down-delta, destructive text) -- reused here rather than
  // introducing a second red.
  if (tone === "negative") return "text-primary";
  return "text-foreground";
}

function dotClass(tone: InsightData["eyebrowTone"]): string {
  if (tone === "flag") return "bg-primary";
  if (tone === "positive") return "bg-emerald-600 dark:bg-emerald-400";
  return "bg-muted-foreground";
}

function eyebrowTextClass(tone: InsightData["eyebrowTone"]): string {
  return tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";
}

function HeroInsight({ data }: { data: InsightData }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-primary/5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          <span className={cn("size-1.5 shrink-0 rounded-full", dotClass(data.eyebrowTone))} />
          {data.eyebrow}
        </div>
        <p className="font-heading text-lg leading-snug font-semibold text-balance sm:text-xl">{data.headline}</p>
        <p className="text-xs text-muted-foreground">{data.source}</p>
      </div>
      <div className="shrink-0 sm:text-right">
        <p className={cn("font-sans text-3xl font-semibold tabular-nums", toneTextClass(data.figureTone))}>
          {data.figure}
        </p>
        <p className="text-xs text-muted-foreground">{data.figureSub}</p>
      </div>
    </div>
  );
}

function InsightRow({ data }: { data: InsightData }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="min-w-0 space-y-1">
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase",
            eyebrowTextClass(data.eyebrowTone),
          )}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", dotClass(data.eyebrowTone))} />
          {data.eyebrow}
        </div>
        <p className="text-sm font-medium text-foreground">{data.headline}</p>
        <p className="text-xs text-muted-foreground">{data.source}</p>
      </div>
      <div className="flex shrink-0 items-baseline justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-0.5 sm:text-right">
        <p className={cn("font-sans text-base font-semibold tabular-nums", toneTextClass(data.figureTone))}>
          {data.figure}
        </p>
        <p className="text-xs text-muted-foreground">{data.figureSub}</p>
      </div>
    </div>
  );
}

export function KeyInsights({ hero, rest }: { hero: InsightData; rest: InsightData[] }) {
  return (
    <div className="flex flex-col">
      <HeroInsight data={hero} />
      <div className="divide-y divide-border">
        {rest.map((d) => (
          <InsightRow key={d.eyebrow} data={d} />
        ))}
      </div>
    </div>
  );
}
