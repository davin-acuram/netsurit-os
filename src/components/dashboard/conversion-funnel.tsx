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
// matches stage N-1's bottom edge exactly.
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

// Steps down the same blue intensity ramp the geo choropleth already uses
// for data fills (--data-heatmap), rather than introducing a new hue --
// this is the one other place in the app a sequential data fill shows up.
const FILL_OPACITY = [1, 0.72, 0.46] as const;

function FunnelGraphic() {
  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      className="shrink-0"
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
            fill={placeholder ? "none" : "var(--data-heatmap)"}
            fillOpacity={placeholder ? undefined : FILL_OPACITY[i]}
            stroke={placeholder ? "var(--border)" : "none"}
            strokeWidth={placeholder ? 1.5 : 0}
            strokeDasharray={placeholder ? "4 3" : undefined}
          />
        );
      })}
    </svg>
  );
}

function StageRow({ stage }: { stage: FunnelStage }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{stage.label}</p>
      <p
        className={cn(
          "font-sans text-lg leading-none font-semibold tabular-nums",
          stage.placeholder ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {stage.figure}
      </p>
      {stage.sub && <p className="text-[11px] leading-snug text-muted-foreground italic">{stage.sub}</p>}
    </div>
  );
}

export function ConversionFunnel({ stages }: { stages: [FunnelStage, FunnelStage, FunnelStage, FunnelStage] }) {
  return (
    <div className="flex items-start gap-6">
      <FunnelGraphic />
      <div className="flex flex-1 flex-col justify-between gap-3" style={{ minHeight: SVG_HEIGHT }}>
        {stages.map((s, i) => (
          <StageRow key={i} stage={s} />
        ))}
      </div>
    </div>
  );
}
