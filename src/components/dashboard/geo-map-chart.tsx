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

interface Size {
  width: number;
  height: number;
}

// Measures the actual rendered box a ref is attached to -- the map's
// projection has to fit *this*, not a hardcoded canvas size, or it only
// fills whatever fraction of the real container its assumed size
// happened to match.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
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

interface HoverInfo {
  name: string;
  sessions: number | undefined;
  x: number;
  y: number;
}

export function GeoMapChart({ data }: { data: GeoMapDatum[] }) {
  const isDark = useIsDarkMode();
  const palette = isDark ? PALETTE.dark : PALETTE.light;
  const [mapSlotRef, size] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const worldFeatures = useMemo(() => {
    const topology = worldAtlas as unknown as Topology;
    return feature(topology, topology.objects.countries as GeometryCollection);
  }, []);

  // fitExtent computes the scale + translate that makes the geography
  // fill exactly this box -- computed fresh whenever the measured size
  // changes, instead of a fixed scale tuned for one assumed canvas size.
  // Fit to the full [0,0]-[width,height] extent with zero inset so the
  // drawn geography reaches the SVG's true edges, flush with the legend
  // bar beneath it.
  const projection = useMemo(() => {
    if (!size) return null;
    return geoEqualEarth().fitExtent(
      [
        [0, 0],
        [size.width, size.height],
      ],
      worldFeatures,
    );
  }, [size, worldFeatures]);

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
    <div className="flex h-full w-full flex-col gap-3">
      {/* min-h-0 lets this flex child actually shrink/grow within the
          card's fixed height instead of being pushed to its SVG's
          intrinsic size. The map itself sizes to this slot's own
          measured box (ComposableMap's width/height, and therefore its
          viewBox, are set to that exact size) so nothing gets
          letterboxed. */}
      <div ref={mapSlotRef} className="min-h-0 flex-1">
        {size && projection && (
          <ComposableMap
            projection={projection}
            width={size.width}
            height={size.height}
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
        )}
      </div>
      {/* The "0"/max labels sit on their own line above the bar instead
          of as flex siblings beside it -- as inline flex siblings they
          ate a fixed chunk of the row's width via their own text size +
          gaps, which is a much bigger proportion of a narrow card than a
          wide one. That silently shrank the bar (and therefore the map,
          which matches the bar) well below the card's actual available
          width at anything less than a very wide viewport. A plain
          w-full bar guarantees it always matches the map slot's width
          exactly, at any container size. */}
      <div className="shrink-0">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>{formatCompactNumber(max)}</span>
        </div>
        <div
          className="h-2 w-full rounded-full"
          style={{ background: `linear-gradient(to right, ${lerpColor(palette.min, palette.max, 0)}, ${lerpColor(palette.min, palette.max, 1)})` }}
        />
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
