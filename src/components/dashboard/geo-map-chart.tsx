"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { geoEqualEarth } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ComposableMap, Geographies, Geography, type GeographyFeature } from "react-simple-maps";
import worldAtlas from "world-atlas/countries-110m.json";
import { toMapCountryName } from "@/lib/geo/country-name-map";
import { formatCompactNumber } from "@/lib/format";

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

// A small inset so coastlines and the 0.5px country strokes don't touch
// the card's edge pixel-for-pixel -- still fills essentially all of the
// available space, just not literally edge-to-edge.
const MAP_PADDING = 6;

export function GeoMapChart({ data }: { data: GeoMapDatum[] }) {
  const isDark = useIsDarkMode();
  const palette = isDark ? PALETTE.dark : PALETTE.light;
  const [containerRef, size] = useElementSize<HTMLDivElement>();

  const worldFeatures = useMemo(() => {
    const topology = worldAtlas as unknown as Topology;
    return feature(topology, topology.objects.countries as GeometryCollection);
  }, []);

  // fitExtent computes the scale + translate that makes the geography
  // fill exactly this box -- computed fresh whenever the measured
  // container size changes, instead of a fixed scale tuned for one
  // assumed canvas size that only matched one particular card width.
  const projection = useMemo(() => {
    if (!size) return null;
    return geoEqualEarth().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [size.width - MAP_PADDING, size.height - MAP_PADDING],
      ],
      worldFeatures,
    );
  }, [size, worldFeatures]);

  const sessionsByMapName = new Map<string, number>();
  for (const d of data) {
    sessionsByMapName.set(toMapCountryName(d.country), d.sessions);
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
          intrinsic size. The map only renders once we've measured a
          real size -- the ComposableMap's own width/height (and
          therefore its viewBox) are set to that exact measured size, so
          the projection's fitExtent and the SVG's aspect ratio always
          match and nothing gets letterboxed. */}
      <div ref={containerRef} className="min-h-0 flex-1">
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
                  const name = geo.properties.name as string;
                  const sessions = sessionsByMapName.get(name);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillFor(geo)}
                      stroke={palette.stroke}
                      strokeWidth={0.5}
                    >
                      <title>{sessions ? `${name}: ${formatCompactNumber(sessions)} sessions` : name}</title>
                    </Geography>
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span>0</span>
        <div
          className="h-2 flex-1 rounded-full"
          style={{ background: `linear-gradient(to right, ${lerpColor(palette.min, palette.max, 0)}, ${lerpColor(palette.min, palette.max, 1)})` }}
        />
        <span>{formatCompactNumber(max)}</span>
      </div>
    </div>
  );
}
