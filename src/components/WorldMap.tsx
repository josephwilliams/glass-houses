"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as d3geo from "d3-geo";
import * as THREE from "three";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as topojson from "topojson-client";
import { atrocities, countries } from "@/data/atrocities";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: { name: string };
}

interface PreparedCountry {
  /** Atlas feature id — unique per mesh, used for hover identity. */
  featureId: string;
  /** Resolved country id used for every data lookup. */
  id: string;
  name: string;
  entryCount: number;
  geometry: THREE.BufferGeometry;
  borderGeometry: THREE.BufferGeometry;
  centroid: [number, number];
}

interface RotationState {
  current: [number, number];
  target: [number, number] | null;
  autoRotate: boolean;
  isDragging: boolean;
}

const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/** Shell radii, innermost first. Each layer sits just above the one below it. */
const GLOBE_RADIUS = 1;
const GRATICULE_RADIUS = 1.002;
const COUNTRY_RADIUS = 1.006;
const HALO_RADIUS = 1.008;
const BORDER_RADIUS = 1.01;

const INITIAL_ROTATION: [number, number] = [-40, -15];
const MAX_LATITUDE = 60;
const DRAG_DEGREES_PER_PIXEL = 0.3;
/** Pointer travel (px) past which a gesture counts as a drag, not a click. */
const DRAG_THRESHOLD = 3;
const AUTO_ROTATE_DEGREES_PER_SECOND = 3;
const RESUME_AFTER_DESELECT_MS = 500;
const RESUME_AFTER_DRAG_MS = 2000;

const BACKGROUND_COLOR = "#050a1a";
const OCEAN_COLOR = "#0c1830";
const HALO_COLOR = "#3070a0";
const GRATICULE_COLOR = "#4080c0";

const COUNTRY_COLOR = "#283848";
const COUNTRY_WITH_ENTRIES_COLOR = "#5a7a9a";
const COUNTRY_HOVER_COLOR = "#80aaca";
const COUNTRY_SELECTED_COLOR = "#d4b878";

const BORDER_COLOR = "#3a5068";
const BORDER_HOVER_COLOR = "#80a0c0";
const BORDER_SELECTED_COLOR = "#f0a040";

/**
 * Overseas territories the atlas lists separately but that this dataset files
 * under the governing state. Keys and values are ISO 3166-1 numeric codes.
 */
const TERRITORY_PARENTS: Record<string, string> = {
  "304": "208", // Greenland -> Denmark
  "254": "250", // French Guiana -> France
  "540": "250", // New Caledonia -> France
  "660": "826", // Anguilla -> United Kingdom
  "136": "826", // Cayman Islands -> United Kingdom
  "238": "826", // Falkland Islands -> United Kingdom
  "630": "840", // Puerto Rico -> United States
  "316": "840", // Guam -> United States
  "850": "840", // US Virgin Islands -> United States
  "074": "578", // Bouvet Island -> Norway
  "732": "504", // Western Sahara -> Morocco
};

/** Atlas ids are not consistently zero-padded; country ids always are. */
function padCountryId(rawId: string | number): string {
  return String(rawId).padStart(3, "0");
}

function resolveCountryId(paddedId: string): string {
  return TERRITORY_PARENTS[paddedId] ?? paddedId;
}

/**
 * Meshes on the far side of the globe still raycast through the sphere, so
 * hits behind the camera-facing hemisphere must be ignored.
 */
function isFrontFacing(event: { point: THREE.Vector3 }) {
  return event.point.z > 0;
}

function shortestAngleDelta(from: number, to: number) {
  return (((to - from) % 360) + 540) % 360 - 180;
}

/** Project a lon/lat pair (degrees) onto a sphere of the given radius. */
function toCartesian(
  longitudeDegrees: number,
  latitudeDegrees: number,
  radius: number,
  target = new THREE.Vector3()
) {
  const longitude = THREE.MathUtils.degToRad(longitudeDegrees);
  const latitude = THREE.MathUtils.degToRad(latitudeDegrees);
  const cosLatitude = Math.cos(latitude);
  return target.set(
    radius * cosLatitude * Math.sin(longitude),
    radius * Math.sin(latitude),
    radius * cosLatitude * Math.cos(longitude)
  );
}

function polygonsOf(geometry: GeoJSON.Geometry): GeoJSON.Position[][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

/** Degrees from `start` to `end` inclusive, in fixed steps. */
function degreeRange(start: number, end: number, step: number) {
  const count = Math.round((end - start) / step) + 1;
  return Array.from({ length: count }, (_, index) => start + index * step);
}

/**
 * Rings cross the antimeridian, which would otherwise produce polygons that
 * wrap the wrong way round the globe. Shift each vertex to stay within 180deg
 * of the previous one so the ring stays continuous.
 */
function unwrapRing(ring: GeoJSON.Position[]): THREE.Vector2[] {
  if (!ring.length) return [];

  let previousLongitude = ring[0][0];
  return ring.slice(0, -1).map(([rawLongitude, latitude], index) => {
    let longitude = rawLongitude;
    if (index > 0) {
      while (longitude - previousLongitude > 180) longitude -= 360;
      while (longitude - previousLongitude < -180) longitude += 360;
    }
    previousLongitude = longitude;
    return new THREE.Vector2(longitude, latitude);
  });
}

function alignRing(ring: THREE.Vector2[], referenceLongitude: number) {
  if (!ring.length) return ring;
  const average = ring.reduce((sum, point) => sum + point.x, 0) / ring.length;
  const offset = Math.round((referenceLongitude - average) / 360) * 360;
  return ring.map((point) => new THREE.Vector2(point.x + offset, point.y));
}

function polygonGeometry(
  coordinates: GeoJSON.Position[][]
): THREE.BufferGeometry | null {
  const outer = unwrapRing(coordinates[0] ?? []);
  if (outer.length < 3) return null;

  const referenceLongitude =
    outer.reduce((sum, point) => sum + point.x, 0) / outer.length;
  const shape = new THREE.Shape(outer);
  shape.holes = coordinates.slice(1).flatMap((ring) => {
    const points = alignRing(unwrapRing(ring), referenceLongitude);
    return points.length >= 3 ? [new THREE.Path(points)] : [];
  });

  // Tessellate first: the flat shape is subdivided so that, once its vertices
  // are pushed onto the sphere, edges follow the curve instead of cutting it.
  const shapeGeometry = new THREE.ShapeGeometry(shape);
  const geometry: THREE.BufferGeometry =
    new TessellateModifier(6, 8).modify(shapeGeometry);
  shapeGeometry.dispose();

  const positions = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    toCartesian(positions.getX(index), positions.getY(index), COUNTRY_RADIUS, vertex);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  geometry.deleteAttribute("normal");
  geometry.computeBoundingSphere();
  return geometry;
}

/** Line-segment pairs tracing one ring, subdivided so it hugs the sphere. */
function ringBorderPositions(ring: GeoJSON.Position[]) {
  const points = unwrapRing(ring);
  if (points.length < 2) return [];

  const closingPoint = points[0].clone();
  const last = points[points.length - 1];
  while (closingPoint.x - last.x > 180) closingPoint.x -= 360;
  while (closingPoint.x - last.x < -180) closingPoint.x += 360;
  const closedPoints = [...points, closingPoint];

  const positions: number[] = [];
  const vertex = new THREE.Vector3();
  for (let index = 0; index < closedPoints.length - 1; index += 1) {
    const start = closedPoints[index];
    const end = closedPoints[index + 1];
    const longitudeDelta = end.x - start.x;
    const latitudeDelta = end.y - start.y;
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(longitudeDelta), Math.abs(latitudeDelta)) / 2)
    );

    for (let step = 0; step < steps; step += 1) {
      for (const t of [step / steps, (step + 1) / steps]) {
        toCartesian(
          start.x + longitudeDelta * t,
          start.y + latitudeDelta * t,
          BORDER_RADIUS,
          vertex
        );
        positions.push(vertex.x, vertex.y, vertex.z);
      }
    }
  }

  return positions;
}

function featureBorderGeometry(feature: FeatureShape) {
  const positions = polygonsOf(feature.geometry).flatMap((polygon) =>
    polygon.flatMap(ringBorderPositions)
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.computeBoundingSphere();
  return geometry;
}

function featureGeometry(feature: FeatureShape) {
  const geometries = polygonsOf(feature.geometry)
    .map(polygonGeometry)
    .filter((geometry): geometry is THREE.BufferGeometry => geometry !== null);

  if (!geometries.length) return null;
  const merged = mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

function usePreparedCountries(features: FeatureShape[]) {
  const prepared = useMemo(
    () =>
      features.flatMap((feature): PreparedCountry[] => {
        if (feature.id == null) return [];
        const geometry = featureGeometry(feature);
        if (!geometry) return [];

        const featureId = padCountryId(feature.id);
        const id = resolveCountryId(featureId);
        return [
          {
            featureId,
            id,
            // The atlas carries a name for every feature, including the ones
            // this dataset has no entry for.
            name: countries[id]?.name ?? feature.properties.name,
            entryCount: atrocities[id]?.length ?? 0,
            geometry,
            borderGeometry: featureBorderGeometry(feature),
            centroid: d3geo.geoCentroid(
              feature as unknown as d3geo.GeoPermissibleObjects
            ) as [number, number],
          },
        ];
      }),
    [features]
  );

  useEffect(
    () => () =>
      prepared.forEach((country) => {
        country.geometry.dispose();
        country.borderGeometry.dispose();
      }),
    [prepared]
  );

  return prepared;
}

function CameraController() {
  const camera = useThree((state) => state.camera as THREE.OrthographicCamera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const halfExtent = 1.19;
    const aspect = size.width / Math.max(size.height, 1);
    const halfWidth = aspect >= 1 ? halfExtent * aspect : halfExtent;
    const halfHeight = aspect >= 1 ? halfExtent : halfExtent / aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

function Graticule() {
  const lines = useMemo(() => {
    const parallels = degreeRange(-60, 60, 30).map((latitude) =>
      degreeRange(-180, 180, 5).map((longitude) =>
        toCartesian(longitude, latitude, GRATICULE_RADIUS)
      )
    );
    const meridians = degreeRange(-150, 180, 30).map((longitude) =>
      degreeRange(-90, 90, 5).map((latitude) =>
        toCartesian(longitude, latitude, GRATICULE_RADIUS)
      )
    );
    return [...parallels, ...meridians];
  }, []);

  return lines.map((points, index) => (
    <Line
      key={index}
      points={points}
      color={GRATICULE_COLOR}
      lineWidth={0.35}
      transparent
      opacity={0.12}
      depthWrite={false}
    />
  ));
}

/** Flat ring drawn at the globe's silhouette to give it a lit rim. */
function Halo() {
  const points = useMemo(
    () =>
      degreeRange(0, 360, 360 / 128).map((degrees) => {
        const angle = THREE.MathUtils.degToRad(degrees);
        return new THREE.Vector3(
          Math.cos(angle) * HALO_RADIUS,
          Math.sin(angle) * HALO_RADIUS,
          0.01
        );
      }),
    []
  );

  return (
    <Line points={points} color={HALO_COLOR} lineWidth={0.8} transparent opacity={0.5} />
  );
}

function CountryMesh({
  country,
  isSelected,
  isHovered,
  didDragRef,
  onSelect,
  onHover,
  onMove,
}: {
  country: PreparedCountry;
  isSelected: boolean;
  isHovered: boolean;
  didDragRef: RefObject<boolean>;
  onSelect: (id: string | null) => void;
  onHover: (country: PreparedCountry | null) => void;
  onMove: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const hasEntries = country.entryCount > 0;
  const highlighted = isHovered && hasEntries;

  const color = isSelected
    ? COUNTRY_SELECTED_COLOR
    : highlighted
      ? COUNTRY_HOVER_COLOR
      : hasEntries
        ? COUNTRY_WITH_ENTRIES_COLOR
        : COUNTRY_COLOR;
  const borderColor = isSelected
    ? BORDER_SELECTED_COLOR
    : highlighted
      ? BORDER_HOVER_COLOR
      : BORDER_COLOR;

  return (
    <group>
      <mesh
        geometry={country.geometry}
        onClick={(event) => {
          if (didDragRef.current || !hasEntries || !isFrontFacing(event)) return;
          event.stopPropagation();
          onSelect(isSelected ? null : country.id);
        }}
        onPointerOver={(event) => {
          if (!isFrontFacing(event)) return;
          event.stopPropagation();
          onHover(country);
          onMove(event);
        }}
        onPointerMove={(event) => {
          if (!isFrontFacing(event)) return;
          event.stopPropagation();
          onMove(event);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
      >
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={country.borderGeometry} raycast={() => null}>
        <lineBasicMaterial
          color={borderColor}
          transparent
          opacity={isSelected ? 1 : 0.85}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function GlobeScene({
  countryMeshes,
  selectedCountry,
  hoveredFeatureId,
  rotationRef,
  didDragRef,
  onSelect,
  onHover,
  onMove,
}: {
  countryMeshes: PreparedCountry[];
  selectedCountry: string | null;
  hoveredFeatureId: string | null;
  rotationRef: RefObject<RotationState>;
  didDragRef: RefObject<boolean>;
  onSelect: (id: string | null) => void;
  onHover: (country: PreparedCountry | null) => void;
  onMove: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const rotation = rotationRef.current;
    const [longitude, latitude] = rotation.current;

    if (rotation.target) {
      const longitudeDelta = shortestAngleDelta(longitude, rotation.target[0]);
      const latitudeDelta = shortestAngleDelta(latitude, rotation.target[1]);
      if (Math.abs(longitudeDelta) < 0.3 && Math.abs(latitudeDelta) < 0.3) {
        rotation.current = [...rotation.target];
        rotation.target = null;
      } else {
        // Framerate-independent ease: 6% of the remaining gap per 1/60s.
        const blend = 1 - Math.pow(0.94, delta * 60);
        rotation.current = [
          longitude + longitudeDelta * blend,
          latitude + latitudeDelta * blend,
        ];
      }
    } else if (rotation.autoRotate && !rotation.isDragging) {
      rotation.current = [longitude - delta * AUTO_ROTATE_DEGREES_PER_SECOND, latitude];
    }

    // "XYZ" applies the Y (longitude) spin before the X (latitude) tilt, which
    // is what keeps the focused point centred and the poles on a vertical
    // meridian. "YXZ" tilts first and throws the target off by a margin that
    // grows with latitude.
    globeRef.current?.rotation.set(
      THREE.MathUtils.degToRad(-rotation.current[1]),
      THREE.MathUtils.degToRad(rotation.current[0]),
      0,
      "XYZ"
    );
  });

  return (
    <>
      <CameraController />
      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 96, 64]} />
          <meshBasicMaterial color={OCEAN_COLOR} />
        </mesh>
        <Graticule />
        {countryMeshes.map((country) => (
          <CountryMesh
            key={country.featureId}
            country={country}
            isSelected={selectedCountry === country.id}
            isHovered={hoveredFeatureId === country.featureId}
            didDragRef={didDragRef}
            onSelect={onSelect}
            onHover={onHover}
            onMove={onMove}
          />
        ))}
      </group>
      <Halo />
    </>
  );
}

export default function WorldMap({
  selectedCountry,
  onSelectCountry,
}: {
  selectedCountry: string | null;
  onSelectCountry: (id: string | null) => void;
}) {
  const [features, setFeatures] = useState<FeatureShape[]>([]);
  const [hovered, setHovered] = useState<PreparedCountry | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // The tooltip follows the pointer imperatively: its position changes on every
  // pointer move, which is far too often to drive through React state.
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    rotation: [number, number];
  } | null>(null);
  const didDragRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef<RotationState>({
    current: [...INITIAL_ROTATION],
    target: null,
    autoRotate: true,
    isDragging: false,
  });

  const countryMeshes = usePreparedCountries(features);

  useEffect(() => {
    const controller = new AbortController();
    fetch(ATLAS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Atlas request failed: ${response.status}`);
        return response.json();
      })
      .then((topology) => {
        const world = topojson.feature(
          topology,
          topology.objects.countries
        ) as unknown as GeoJSON.FeatureCollection;
        setFeatures(world.features as unknown as FeatureShape[]);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to load world atlas", error);
      });
    return () => controller.abort();
  }, []);

  /** Schedule auto-rotation to resume, replacing any pending resume. */
  const resumeAutoRotate = useCallback((delayMs: number | null) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
    if (delayMs === null) return;
    resumeTimerRef.current = setTimeout(() => {
      rotationRef.current.autoRotate = true;
    }, delayMs);
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      // Overseas territories share their governing state's id, so match the
      // state's own feature first — otherwise selecting the United Kingdom
      // centres the globe on the Falkland Islands.
      const country =
        countryMeshes.find((candidate) => candidate.featureId === selectedCountry) ??
        countryMeshes.find((candidate) => candidate.id === selectedCountry);
      if (!country) return;
      rotationRef.current.target = [-country.centroid[0], -country.centroid[1]];
      rotationRef.current.autoRotate = false;
      return;
    }
    resumeAutoRotate(RESUME_AFTER_DESELECT_MS);
    return () => resumeAutoRotate(null);
  }, [countryMeshes, resumeAutoRotate, selectedCountry]);

  useEffect(() => () => resumeAutoRotate(null), [resumeAutoRotate]);

  const moveTooltip = useCallback((event: ThreeEvent<PointerEvent>) => {
    const element = tooltipRef.current;
    if (!element) return;
    element.style.left = `${event.nativeEvent.clientX + 14}px`;
    element.style.top = `${event.nativeEvent.clientY - 36}px`;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      resumeAutoRotate(null);
      didDragRef.current = false;
      rotationRef.current.isDragging = true;
      rotationRef.current.autoRotate = false;
      rotationRef.current.target = null;
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        rotation: [...rotationRef.current.current],
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [resumeAutoRotate]
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    if (!rotationRef.current.isDragging || !dragStart) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) didDragRef.current = true;
    rotationRef.current.current = [
      dragStart.rotation[0] + dx * DRAG_DEGREES_PER_PIXEL,
      THREE.MathUtils.clamp(
        dragStart.rotation[1] - dy * DRAG_DEGREES_PER_PIXEL,
        -MAX_LATITUDE,
        MAX_LATITUDE
      ),
    ];
    setHovered(null);
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      rotationRef.current.isDragging = false;
      dragStartRef.current = null;
      setIsDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!selectedCountry) resumeAutoRotate(RESUME_AFTER_DRAG_MS);
    },
    [resumeAutoRotate, selectedCountry]
  );

  return (
    <div
      className="relative h-full w-full select-none"
      style={{
        background: BACKGROUND_COLOR,
        cursor: isDragging ? "grabbing" : hovered ? "pointer" : "grab",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        if (!isDragging) setHovered(null);
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 4], near: 0.1, far: 10 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onPointerMissed={() => {
          if (!didDragRef.current) onSelectCountry(null);
        }}
      >
        <color attach="background" args={[BACKGROUND_COLOR]} />
        {countryMeshes.length > 0 && (
          <GlobeScene
            countryMeshes={countryMeshes}
            selectedCountry={selectedCountry}
            hoveredFeatureId={hovered?.featureId ?? null}
            rotationRef={rotationRef}
            didDragRef={didDragRef}
            onSelect={onSelectCountry}
            onHover={setHovered}
            onMove={moveTooltip}
          />
        )}
      </Canvas>

      <div
        ref={tooltipRef}
        aria-hidden="true"
        className="fixed z-50 whitespace-nowrap rounded px-3.5 py-1.5 text-xs tracking-[0.02em] border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--fg)] shadow-[0_8px_32px_rgba(0,10,40,0.7)] pointer-events-none"
        style={{ display: hovered ? "block" : "none" }}
      >
        {hovered && (
          <>
            <span className={hovered.entryCount > 0 ? "font-semibold" : "opacity-40"}>
              {hovered.name}
            </span>
            {hovered.entryCount > 0 && (
              <span className="ml-2 opacity-50">{hovered.entryCount}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
