"use client";

import { ParentSize } from "@visx/responsive";
import * as topojson from "topojson-client";
import * as d3geo from "d3-geo";
import { atrocities, countryNames } from "@/data/atrocities";
import { useState, useEffect, useRef, useCallback } from "react";

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: { name: string };
}

function padId(id: string | number): string {
  return String(id).padStart(3, "0");
}

const territoryMap: Record<string, string> = {
  "304": "208", "254": "250", "540": "250",
  "660": "826", "136": "826", "238": "826",
  "630": "840", "316": "840", "850": "840",
  "074": "578", "732": "504",
};

function resolveId(rawId: string | number): string {
  const padded = padId(rawId);
  return territoryMap[padded] || padded;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function shortestAngleDelta(from: number, to: number) {
  let delta = ((to - from) % 360 + 540) % 360 - 180;
  return delta;
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
  const rotationRef = useRef<[number, number]>([-40, -15]);
  const targetRotationRef = useRef<[number, number] | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; rot: [number, number] } | null>(null);
  const autoRotateRef = useRef(true);
  const animFrameRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

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

  // Animation loop
  useEffect(() => {
    let lastTime = 0;
    const animate = (time: number) => {
      const delta = lastTime ? time - lastTime : 16;
      lastTime = time;

      const target = targetRotationRef.current;
      const rot = rotationRef.current;

      if (target) {
        const dLon = shortestAngleDelta(rot[0], target[0]);
        const dLat = shortestAngleDelta(rot[1], target[1]);
        if (Math.abs(dLon) < 0.3 && Math.abs(dLat) < 0.3) {
          rotationRef.current = [target[0], target[1]];
          targetRotationRef.current = null;
        } else {
          rotationRef.current = [
            rot[0] + dLon * 0.06,
            rot[1] + dLat * 0.06,
          ];
        }
        setTick((n) => n + 1);
      } else if (autoRotateRef.current && !isDraggingRef.current) {
        rotationRef.current = [rot[0] - delta * 0.008, rot[1]];
        setTick((n) => n + 1);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Rotate to selected country
  useEffect(() => {
    if (!selectedCountry || !features.length) return;
    const feature = features.find((f) => resolveId(f.id) === selectedCountry);
    if (!feature) return;
    const centroid = d3geo.geoCentroid(feature as unknown as d3geo.GeoPermissibleObjects);
    targetRotationRef.current = [-centroid[0], -centroid[1]];
    autoRotateRef.current = false;
  }, [selectedCountry, features]);

  // Resume auto-rotate when deselected
  useEffect(() => {
    if (!selectedCountry) {
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 500);
    }
  }, [selectedCountry]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false;
    targetRotationRef.current = null;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rot: [...rotationRef.current] as [number, number],
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    rotationRef.current = [
      dragStartRef.current.rot[0] + dx * 0.3,
      Math.max(-60, Math.min(60, dragStartRef.current.rot[1] - dy * 0.3)),
    ];
    setTick((n) => n + 1);
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    if (!selectedCountry) {
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 2000);
    }
  }, [selectedCountry]);

  const updateTooltip = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      const el = tooltipRef.current;
      if (!el) return;
      const resolved = resolveId(rawId);
      const name = countryNames[resolved] || `Unknown (${rawId})`;
      const hasEntries = !!atrocities[resolved];
      const count = hasEntries ? atrocities[resolved].length : 0;
      el.style.display = "block";
      el.style.left = `${e.clientX + 14}px`;
      el.style.top = `${e.clientY - 36}px`;
      el.innerHTML = hasEntries
        ? `<strong>${name}</strong><span style="opacity:0.5;margin-left:8px">${count}</span>`
        : `<span style="opacity:0.4">${name}</span>`;
    },
    []
  );

  const hideTooltip = useCallback(() => {
    const el = tooltipRef.current;
    if (el) el.style.display = "none";
    if (hoveredRef.current !== null) {
      hoveredRef.current = null;
      setTick((n) => n + 1);
    }
  }, []);

  const onEnter = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      hoveredRef.current = rawId;
      setTick((n) => n + 1);
      updateTooltip(e, rawId);
    },
    [updateTooltip]
  );

  const onMoveTooltip = useCallback(
    (e: React.MouseEvent, rawId: string) => {
      updateTooltip(e, rawId);
    },
    [updateTooltip]
  );

  return (
    <div
      className="relative w-full h-full select-none"
      style={{ background: "#050a1a", cursor: isDraggingRef.current ? "grabbing" : "grab" }}
    >
      <ParentSize>
        {({ width, height }) => {
          if (width < 10 || !features.length) return null;

          const size = Math.min(width, height);
          const scale = size * 0.42;
          const cx = width / 2;
          const cy = height / 2;

          const projection = d3geo.geoOrthographic()
            .scale(scale)
            .translate([cx, cy])
            .rotate(rotationRef.current)
            .clipAngle(90);

          const pathGen = d3geo.geoPath(projection);

          const paths: React.ReactNode[] = [];
          const labels: React.ReactNode[] = [];

          // Sphere outline + graticule
          const spherePath = pathGen({ type: "Sphere" } as d3geo.GeoPermissibleObjects) || "";
          const graticule = d3geo.geoGraticule10();
          const graticulePath = pathGen(graticule as unknown as d3geo.GeoPermissibleObjects) || "";

          features.forEach((feature, i) => {
            const rawId = feature.id;
            if (rawId == null) return;
            const rawIdStr = String(rawId);
            const id = resolveId(rawIdStr);
            const isSelected = selectedCountry === id;
            const isHovered = hoveredRef.current === rawIdStr;
            const hasEntries = !!atrocities[id];
            const d = pathGen(feature as unknown as d3geo.GeoPermissibleObjects);
            if (!d) return;

            const baseColor = hasEntries ? "#5a7a9a" : "#283848";
            const hoverColor = "#80aaca";
            const selectedColor = "#d4b878";

            paths.push(
              <path
                key={`feat-${i}`}
                d={d}
                fill={isSelected ? selectedColor : isHovered && hasEntries ? hoverColor : baseColor}
                stroke={isSelected ? "#f0a040" : isHovered && hasEntries ? "#80a0c0" : "#3a5068"}
                strokeWidth={isSelected ? 1.5 : 0.5}
                style={{
                  transition: "fill 0.15s ease",
                  cursor: hasEntries ? "pointer" : "default",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasEntries) onSelectCountry(isSelected ? null : id);
                }}
                onMouseEnter={(ev) => onEnter(ev, rawIdStr)}
                onMouseMove={(ev) => onMoveTooltip(ev, rawIdStr)}
                onMouseLeave={hideTooltip}
              />
            );

            // Country name labels via geoCentroid
            if (hasEntries) {
              const centroid = d3geo.geoCentroid(feature as unknown as d3geo.GeoPermissibleObjects);
              const projected = projection(centroid);
              if (projected) {
                const dist = d3geo.geoDistance(
                  centroid,
                  (projection.rotate().map((r) => -r) as [number, number])
                );
                if (dist < Math.PI / 2.2) {
                  const name = countryNames[id] || "";
                  const area = d3geo.geoArea(feature as unknown as d3geo.GeoPermissibleObjects);
                  const fontSize = Math.max(3.5, Math.min(9, Math.sqrt(area * 100000) * 0.7));
                  const edgeFade = 1 - Math.pow(dist / (Math.PI / 2), 2);

                  labels.push(
                    <text
                      key={`label-${i}`}
                      x={projected[0]}
                      y={projected[1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={fontSize}
                      fill={isSelected ? "#ffffff" : "#e8e4de"}
                      opacity={(isSelected ? 1.0 : isHovered ? 0.9 : 0.7) * edgeFade}
                      style={{
                        pointerEvents: "none",
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: isSelected ? 500 : 300,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {name}
                    </text>
                  );
                }
              }
            }
          });

          return (
            <svg
              width={width}
              height={height}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ touchAction: "none" }}
            >
              <rect x={0} y={0} width={width} height={height} fill="#050a1a" />

              <defs>
                {/* Atmosphere glow */}
                <radialGradient id="atmosphere" cx="50%" cy="50%" r="50%">
                  <stop offset="80%" stopColor="transparent" />
                  <stop offset="100%" stopColor="#2060b0" stopOpacity="0.5" />
                </radialGradient>
                <radialGradient id="globe-shading" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#000020" stopOpacity="0.04" />
                </radialGradient>
              </defs>

              {/* Atmosphere ring */}
              <circle
                cx={cx}
                cy={cy}
                r={scale + 16}
                fill="none"
                stroke="#3080d0"
                strokeWidth="32"
                opacity="0.2"
              />

              {/* Ocean */}
              <path
                d={spherePath}
                fill="#0c1830"
                stroke="none"
              />

              {/* Graticule */}
              <path
                d={graticulePath}
                fill="none"
                stroke="#4080c0"
                strokeWidth="0.3"
                opacity="0.12"
              />

              {/* Countries */}
              {paths}

              {/* Globe shading overlay */}
              <path
                d={spherePath}
                fill="url(#globe-shading)"
                stroke="none"
                style={{ pointerEvents: "none" }}
              />

              {/* Sphere border */}
              <path
                d={spherePath}
                fill="none"
                stroke="#3070a0"
                strokeWidth="0.8"
                opacity="0.5"
              />

              {/* Labels on top */}
              {labels}
            </svg>
          );
        }}
      </ParentSize>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "fixed",
          background: "#0c1428",
          color: "#f0ece6",
          padding: "6px 14px",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.02em",
          pointerEvents: "none",
          border: "1px solid #2a4060",
          whiteSpace: "nowrap",
          zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,10,40,0.7)",
        }}
      />
    </div>
  );
}
