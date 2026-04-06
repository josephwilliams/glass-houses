"use client";

import { Mercator } from "@visx/geo";
import { ParentSize } from "@visx/responsive";
import * as topojson from "topojson-client";
import { atrocities, countryNames } from "@/data/atrocities";
import { useState, useEffect, useRef, useCallback } from "react";

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: { name: string };
}

// topojson world-atlas uses unpadded numeric IDs (e.g. "840", "76")
// our data uses zero-padded 3-digit codes (e.g. "840", "076")
function padId(id: string): string {
  return id.padStart(3, "0");
}

// Territories that should map to their parent country
const territoryMap: Record<string, string> = {
  "304": "208", // Greenland -> Denmark
  "254": "250", // French Guiana -> France
  "540": "250", // New Caledonia -> France
  "660": "826", // Anguilla -> UK
  "136": "826", // Cayman Islands -> UK
  "238": "826", // Falkland Islands -> UK
  "630": "840", // Puerto Rico -> USA
  "316": "840", // Guam -> USA
  "850": "840", // US Virgin Islands -> USA
  "074": "578", // Bouvet Island -> Norway
  "732": "504", // Western Sahara -> Morocco
};

function resolveId(rawId: string): string {
  const padded = padId(rawId);
  return territoryMap[padded] || padded;
}

export default function WorldMap({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string | null) => void;
}) {
  const [features, setFeatures] = useState<FeatureShape[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((topology) => {
        const world = topojson.feature(
          topology,
          topology.objects.countries
        ) as unknown as GeoJSON.FeatureCollection;
        setFeatures(world.features as unknown as FeatureShape[]);
      });
  }, []);

  const updateTooltip = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      const el = tooltipRef.current;
      if (!el) return;
      const resolved = resolveId(rawId);
      const name = countryNames[resolved] || `Unknown (${rawId})`;
      const hasEntries = !!atrocities[resolved];
      el.style.display = "block";
      el.style.left = `${e.clientX + 14}px`;
      el.style.top = `${e.clientY - 32}px`;
      el.textContent = name + (hasEntries ? "" : " (no data yet)");
    },
    []
  );

  const hideTooltip = useCallback(() => {
    const el = tooltipRef.current;
    if (el) el.style.display = "none";
    if (hoveredRef.current !== null) {
      hoveredRef.current = null;
      forceRender((n) => n + 1);
    }
  }, []);

  const onEnter = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      hoveredRef.current = rawId;
      forceRender((n) => n + 1);
      updateTooltip(e, rawId);
    },
    [updateTooltip]
  );

  const onMove = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      updateTooltip(e, rawId);
    },
    [updateTooltip]
  );

  return (
    <div className="relative w-full h-full">
      <ParentSize>
        {({ width, height }) => {
          if (width < 10 || !features.length) return null;
          const mapHeight = Math.max(height, width * 0.5);

          return (
            <svg width={width} height={mapHeight}>
              <rect
                x={0}
                y={0}
                width={width}
                height={mapHeight}
                fill="var(--bg)"
              />
              <Mercator
                data={features}
                scale={width / 5.5}
                translate={[width / 2, mapHeight / 1.4]}
                center={[0, 20]}
              >
                {(mercator) =>
                  mercator.features.map(({ feature, path }, i) => {
                    const rawId = feature.id as string | undefined;
                    if (!rawId) return null;
                    const id = resolveId(rawId);
                    const isSelected = selectedCountry === id;
                    const isHovered = hoveredRef.current === rawId;
                    const hasEntries = !!atrocities[id];

                    let fill = "#1a1a2e";
                    if (isHovered && hasEntries) fill = "#334155";
                    if (isSelected) fill = "#475569";

                    return (
                      <path
                        key={`map-feature-${i}`}
                        d={path || ""}
                        fill={fill}
                        stroke={isSelected ? "#94a3b8" : "#333"}
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        style={{
                          transition: "fill 0.15s ease",
                          cursor: hasEntries ? "pointer" : "default",
                        }}
                        onClick={() => {
                          if (hasEntries) {
                            onSelectCountry(isSelected ? null : id);
                          }
                        }}
                        onMouseEnter={(e) => onEnter(e, rawId)}
                        onMouseMove={(e) => onMove(e, rawId)}
                        onMouseLeave={hideTooltip}
                      />
                    );
                  })
                }
              </Mercator>
            </svg>
          );
        }}
      </ParentSize>

      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "fixed",
          background: "#1e293b",
          color: "#e2e8f0",
          padding: "5px 12px",
          borderRadius: "6px",
          fontSize: "13px",
          pointerEvents: "none",
          border: "1px solid #334155",
          whiteSpace: "nowrap",
          zIndex: 50,
        }}
      />
    </div>
  );
}
