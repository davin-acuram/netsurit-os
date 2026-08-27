import { cn } from "@/lib/utils";

export interface FunnelStage {
  label: string;
  figure: string;
  sub?: string;
  /** Placeholder stages (no data source yet) render as a dashed outline
   * with no fill, matching the reference mockup's treatment for its
   * not-yet-integrated stage. */
  placeholder?: boolean;
}

// Each stage's [topInset, bottomInset] as a % of the SVG's width, hand-
// tuned to read as a continuous narrowing funnel: stage N's top edge
// matches stage N-1's bottom edge exactly. This is purely the internal
// viewBox coordinate system -- the rendered size scales via CSS (h-full)
// to fill whatever height the card actually gives it.
const STAGE_GEOMETRY = [
  { top: 5, bottom: 25 },
  { top: 25, bottom: 40 },
  { top: 40, bottom: 50 },
  { top: 50, bottom: 54 },
] as const;

const STAGE_HEIGHT = 44;
const STAGE_GAP = 6;
const SVG_WIDTH = 120;
const SVG_HEIGHT = STAGE_HEIGHT * 4 + STAGE_GAP * 3;

// Ember (--primary) stepped from full saturation at the top stage down to
// a pale pastel at the bottom -- the funnel narrows and lightens together.
// The last stage ("Closed deals") still gets a faint fill under its dashed
// outline rather than no fill at all.
const FILL_OPACITY = [1, 0.62, 0.38, 0.14] as const;
// Dashed outline colour for the placeholder ("Closed deals") stage --
// full-strength Ember reading as a darker red over that stage's 14% fill.
const PLACEHOLDER_STROKE = "var(--primary)";

function FunnelGraphic() {
  return (
    // preserveAspectRatio="none": with a locked aspect ratio, scaling this
    // to h-full made the SVG's rendered width blow up to match its own
    // (tall, narrow) viewBox proportions at whatever height the card gave
    // it, consuming the whole card width and squeezing the label column
    // out entirely. A purely decorative shape has no "correct" aspect
    // ratio to preserve -- stretching height independently of a fixed
    // width still reads clearly as a funnel.
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-full w-[104px] shrink-0 md:w-[190px]"
      aria-hidden="true"
    >
      {STAGE_GEOMETRY.map((g, i) => {
        const y0 = i * (STAGE_HEIGHT + STAGE_GAP);
        const y1 = y0 + STAGE_HEIGHT;
        const points = `${g.top},${y0} ${SVG_WIDTH - g.top},${y0} ${SVG_WIDTH - g.bottom},${y1} ${g.bottom},${y1}`;
        const placeholder = i === STAGE_GEOMETRY.length - 1;
        return (
          <polygon
            key={i}
            points={points}
            fill="var(--primary)"
            fillOpacity={FILL_OPACITY[i]}
            stroke={placeholder ? PLACEHOLDER_STROKE : "none"}
            strokeWidth={placeholder ? 1.5 : 0}
            strokeDasharray={placeholder ? "4 3" : undefined}
          />
        );
      })}
    </svg>
  );
}

// The metric sub-line always reads "<metric> · industry benchmark <value>".
// Break it after "benchmark" so the metric and its label sit on line one
// and the benchmark value drops to line two -- keeps each line short
// enough to read at a glance instead of one long wrapping run.
function splitSub(sub: string): string[] {
  const marker = " · industry benchmark ";
  const i = sub.indexOf(marker);
  if (i === -1) return [sub];
  const cut = i + marker.length;
  return [sub.slice(0, cut - 1), sub.slice(cut)];
}

function StageRow({ stage }: { stage: FunnelStage }) {
  const subLines = stage.sub ? splitSub(stage.sub) : [];
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
        <p
          className={cn(
            "font-sans text-lg leading-none font-semibold tabular-nums",
            // The established dashboard "chart blue" (--data-heatmap): geo
            // choropleth, table heatmaps, and now these funnel figures.
            stage.placeholder ? "text-muted-foreground" : "text-[var(--data-heatmap)]",
          )}
        >
          {stage.figure}
        </p>
      </div>
      {subLines.map((line, i) => (
        <p key={i} className="text-[13px] leading-snug text-muted-foreground italic">
          {line}
        </p>
      ))}
    </div>
  );
}

export function ConversionFunnel({ stages }: { stages: [FunnelStage, FunnelStage, FunnelStage, FunnelStage] }) {
  return (
    <div className="flex h-full items-stretch gap-4 md:gap-8">
      <FunnelGraphic />
      <div className="flex flex-1 flex-col justify-between gap-3">
        {stages.map((s, i) => (
          <StageRow key={i} stage={s} />
        ))}
      </div>
    </div>
  );
}
