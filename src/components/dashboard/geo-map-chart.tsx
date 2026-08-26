"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { geoEqualEarth } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ComposableMap, Geographies, Geography, type GeographyFeature } from "react-simple-maps";
import worldAtlas from "world-atlas/countries-110m.json";
import { toMapCountryName } from "@/lib/geo/country-name-map";
import { formatCompactNumber, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface GeoMapDatum {
  country: string;
  sessions: number;
}

// Mirrors rail-nav.tsx's dark-mode detection (DOM class is authoritative
// and already correct pre-hydration via next-themes' blocking script) --
// duplicated locally rather than imported so this chart has no dependency
// on the rail nav, which this task is scoped to leave untouched.
function subscribeDarkClass(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useIsDarkMode(): boolean {
  return useSyncExternalStore(
    subscribeDarkClass,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

interface MapBox {
  width: number;
  height: number;
  left: number;
}

// The legend bar is narrower than the card's full width -- it sits
// between the "0" and max-value labels -- so the map has to match the
// *bar's* measured box (width and left offset), not the outer
// container's, or their edges won't line up. One ResizeObserver on the
// outer wrapper re-measures both the bar (for width/left) and the map
// slot (for height) whenever the layout changes.
function useMapBox() {
  const outerRef = useRef<HTMLDivElement>(null);
  const mapSlotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<MapBox | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const mapSlot = mapSlotRef.current;
    const bar = barRef.current;
    if (!outer || !mapSlot || !bar) return;

    const observer = new ResizeObserver(() => {
      const outerRect = outer.getBoundingClientRect();
      const mapSlotRect = mapSlot.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      if (barRect.width > 0 && mapSlotRect.height > 0) {
        setBox({ width: barRect.width, height: mapSlotRect.height, left: barRect.left - outerRect.left });
      }
    });
    observer.observe(outer);
    return () => observer.disconnect();
  }, []);

  return { outerRef, mapSlotRef, barRef, box };
}

const PALETTE = {
  light: { noData: "#e8e4e2", stroke: "#ffffff", min: [219, 231, 251] as const, max: [29, 78, 216] as const },
  dark: { noData: "#2d2a29", stroke: "#131112", min: [30, 42, 74] as const, max: [91, 141, 239] as const },
};

function lerpColor(min: readonly [number, number, number], max: readonly [number, number, number], t: number): string {
  const r = Math.round(min[0] + (max[0] - min[0]) * t);
  const g = Math.round(min[1] + (max[1] - min[1]) * t);
  const b = Math.round(min[2] + (max[2] - min[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// A small inset so coastlines and the 0.5px country strokes don't touch
// the bar's edge pixel-for-pixel -- still fills essentially all of the
// aligned width, just not literally edge-to-edge.
const MAP_PADDING = 6;

interface HoverInfo {
  name: string;
  sessions: number | undefined;
  x: number;
  y: number;
}

export function GeoMapChart({ data }: { data: GeoMapDatum[] }) {
  const isDark = useIsDarkMode();
  const palette = isDark ? PALETTE.dark : PALETTE.light;
  const { outerRef, mapSlotRef, barRef, box } = useMapBox();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const worldFeatures = useMemo(() => {
    const topology = worldAtlas as unknown as Topology;
    return feature(topology, topology.objects.countries as GeometryCollection);
  }, []);

  // fitExtent computes the scale + translate that makes the geography
  // fill exactly this box -- computed fresh whenever the measured box
  // changes, instead of a fixed scale tuned for one assumed canvas size.
  const projection = useMemo(() => {
    if (!box) return null;
    return geoEqualEarth().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [box.width - MAP_PADDING, box.height - MAP_PADDING],
      ],
      worldFeatures,
    );
  }, [box, worldFeatures]);

  const sessionsByMapName = new Map<string, number>();
  // The topojson dataset's own names ("United States of America") don't
  // always match GA4's naming ("United States") -- shown in the table
  // right next to this map -- so the tooltip prefers the original
  // reported name when we have data for that country, falling back to
  // the map's own name for countries with no data at all.
  const originalNameByMapName = new Map<string, string>();
  for (const d of data) {
    const mapName = toMapCountryName(d.country);
    sessionsByMapName.set(mapName, d.sessions);
    originalNameByMapName.set(mapName, d.country);
  }
  const max = data.reduce((acc, d) => Math.max(acc, d.sessions), 0);

  function fillFor(geo: GeographyFeature): string {
    const name = geo.properties.name as string;
    const sessions = sessionsByMapName.get(name);
    if (!sessions || max === 0) return palette.noData;
    return lerpColor(palette.min, palette.max, sessions / max);
  }

  return (
    <div ref={outerRef} className="flex h-full w-full flex-col gap-3">
      {/* min-h-0 lets this flex child actually shrink/grow within the
          card's fixed height instead of being pushed to its SVG's
          intrinsic size. The map itself is sized/offset to box (the
          legend bar's measured width + left edge, not this slot's full
          width) so the two read as one aligned unit. */}
      <div ref={mapSlotRef} className="min-h-0 flex-1">
        {box && projection && (
          <div style={{ width: box.width, height: "100%", marginLeft: box.left }}>
            <ComposableMap
              projection={projection}
              width={box.width}
              height={box.height}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={worldAtlas}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const mapName = geo.properties.name as string;
                    const sessions = sessionsByMapName.get(mapName);
                    const displayName = originalNameByMapName.get(mapName) ?? mapName;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillFor(geo)}
                        stroke={palette.stroke}
                        strokeWidth={0.5}
                        onMouseMove={(e) => setHover({ name: displayName, sessions, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span>0</span>
        <div
          ref={barRef}
          className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${lerpColor(palette.min, palette.max, 0)}, ${lerpColor(palette.min, palette.max, 1)})` }}
        />
        <span>{formatCompactNumber(max)}</span>
      </div>
      {/* Matches ChartTooltipContent's styling (recharts tooltips
          elsewhere in the dashboard) so this reads as the same tooltip
          pattern rather than a one-off. Fixed positioning follows the
          cursor regardless of the card's scroll position. */}
      {hover && (
        <div
          className={cn(
            "pointer-events-none fixed z-50 grid min-w-32 items-start gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          )}
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-medium text-foreground">{hover.name}</div>
          <div className="text-muted-foreground">{hover.sessions ? `${formatNumber(hover.sessions)} sessions` : "No sessions"}</div>
        </div>
      )}
    </div>
  );
}
