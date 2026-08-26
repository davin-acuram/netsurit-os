"use client";

import { useSyncExternalStore } from "react";
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

export function GeoMapChart({ data }: { data: GeoMapDatum[] }) {
  const isDark = useIsDarkMode();
  const palette = isDark ? PALETTE.dark : PALETTE.light;

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
    <div className="flex flex-col gap-3">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 118 }}
        width={800}
        height={420}
        className="w-full"
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
