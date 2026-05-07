"use client";
import { useMemo, useRef, useState } from "react";
import { FilterModal, useFilterModal } from "@/components/filter-modal";

type Point = {
  name: string;
  code: string;
  region: string;
  population: number | null;
  lat: number;
  lng: number;
  count: number;
};

type StoryRecord = Parameters<typeof useFilterModal>[0][number];

type GeoFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

const BOUNDS = {
  latMin: 55.3,
  latMax: 69.1,
  lngMin: 10.9,
  lngMax: 24.2,
};

// Tunables
const VIEW_W = 800;
const VIEW_H = 1200;
const PAD = 24;

function project(lng: number, lat: number): [number, number] {
  const x = PAD + ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * (VIEW_W - PAD * 2);
  const t = (BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin);
  const y = PAD + t * (VIEW_H - PAD * 2);
  return [x, y];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function ringToPath(ring: number[][]): string {
  if (ring.length === 0) return "";
  const pts = ring.map(([lng, lat]) => project(lng, lat));
  return (
    "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L") + "Z"
  );
}

function geometryToPath(geom: GeoFeature["geometry"]): string {
  if (geom.type === "Polygon") {
    return (geom.coordinates as number[][][]).map(ringToPath).join(" ");
  }
  // MultiPolygon
  return (geom.coordinates as number[][][][])
    .flatMap((poly) => poly.map(ringToPath))
    .join(" ");
}

// Try to extract a kommun name from feature properties (the GeoJSON file's
// property naming may vary between sources — we try common keys).
// Reconcile a few names that differ between the okfse GeoJSON (kommun-staden)
// and our kommuner.json (kommun-genitiv).
const NAME_ALIASES: Record<string, string> = {
  Falun: "Falu",
  Härnösand: "Härnösands",
  Krokom: "Krokoms",
};

function featureName(f: GeoFeature): string | null {
  const p = f.properties;
  for (const k of [
    "kom_namn",
    "name",
    "kommun",
    "kommun_namn",
    "kommunnamn",
    "KnNamn",
    "KOMMUNNAMN",
    "NAME_2",
  ]) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) {
      const cleaned = v.replace(/ kommun$/i, "").trim();
      return NAME_ALIASES[cleaned] ?? cleaned;
    }
  }
  return null;
}

export function SwedenMap({
  points,
  geo,
  stories,
}: {
  points: Point[];
  geo: GeoCollection | null;
  stories: StoryRecord[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ p: Point; cx: number; cy: number } | null>(null);
  const { state, open, close, matched } = useFilterModal(stories);

  // Zoom + pan state. (vbX, vbY, vbW, vbH) is the visible viewBox in SVG coords.
  const [view, setView] = useState({ x: 0, y: 0, w: VIEW_W, h: VIEW_H });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  function clientToSvg(clientX: number, clientY: number): [number, number] | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    return [view.x + fx * view.w, view.y + fy * view.h];
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.25 : 0.8;
    const minW = VIEW_W / 12;
    const maxW = VIEW_W;
    const newW = Math.max(minW, Math.min(maxW, view.w * factor));
    const newH = (newW / VIEW_W) * VIEW_H;
    const at = clientToSvg(e.clientX, e.clientY);
    if (!at) return;
    const [sx, sy] = at;
    const fx = (sx - view.x) / view.w;
    const fy = (sy - view.y) / view.h;
    const nx = sx - fx * newW;
    const ny = sy - fy * newH;
    setView({
      x: clamp(nx, -newW * 0.1, VIEW_W - newW * 0.9),
      y: clamp(ny, -newH * 0.1, VIEW_H - newH * 0.9),
      w: newW,
      h: newH,
    });
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: view.x,
      origY: view.y,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) {
      onMove(e);
      return;
    }
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sdx = (dx / rect.width) * view.w;
    const sdy = (dy / rect.height) * view.h;
    setView((v) => ({
      ...v,
      x: clamp(dragRef.current!.origX - sdx, -v.w * 0.1, VIEW_W - v.w * 0.9),
      y: clamp(dragRef.current!.origY - sdy, -v.h * 0.1, VIEW_H - v.h * 0.9),
    }));
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    // The drag-vs-click distinction is preserved on each clickable element
    // via wasDragged() check before they fire their click handler.
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  }

  // Returns true if the most recent pointer interaction was a drag rather than
  // a click — clickables consult this before opening the modal.
  function wasDragged(): boolean {
    return dragRef.current?.moved === true;
  }

  function resetView() {
    setView({ x: 0, y: 0, w: VIEW_W, h: VIEW_H });
  }

  function zoomBy(factor: number) {
    const newW = Math.max(VIEW_W / 12, Math.min(VIEW_W, view.w * factor));
    const newH = (newW / VIEW_W) * VIEW_H;
    setView({
      x: view.x + (view.w - newW) / 2,
      y: view.y + (view.h - newH) / 2,
      w: newW,
      h: newH,
    });
  }

  // Index counts by kommun-name for choropleth
  const countByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of points) m.set(p.name, p.count);
    return m;
  }, [points]);

  const peakCount = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.count), 0) || 1,
    [points],
  );

  // Pre-compute SVG paths for each feature (memoize so re-renders don't recompute)
  const featurePaths = useMemo(() => {
    if (!geo) return [];
    return geo.features.map((f, i) => {
      const name = featureName(f);
      const count = name ? countByName.get(name) ?? 0 : 0;
      return {
        id: i,
        name,
        count,
        d: geometryToPath(f.geometry),
      };
    });
  }, [geo, countByName]);

  // Project all dots once
  const projectedPoints = useMemo(
    () =>
      points.map((p) => {
        const [x, y] = project(p.lng, p.lat);
        return { ...p, x, y };
      }),
    [points],
  );

  function onMove(e: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>) {
    const at = clientToSvg(e.clientX, e.clientY);
    if (!at) return;
    const [lx, ly] = at;
    let best: typeof projectedPoints[0] | null = null;
    // Larger pickable radius when zoomed out, smaller when zoomed in
    const zoom = VIEW_W / view.w;
    const pickR = 18 / zoom;
    let bestD = pickR * pickR;
    for (const p of projectedPoints) {
      const d = (p.x - lx) ** 2 + (p.y - ly) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) setHover({ p: best, cx: best.x, cy: best.y });
    else setHover(null);
  }

  const isZoomed = view.w < VIEW_W - 1 || view.x !== 0 || view.y !== 0;

  return (
    <div className="relative" ref={wrapRef}>
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 print:hidden">
        <button
          type="button"
          onClick={() => zoomBy(0.7)}
          aria-label="Zooma in"
          title="Zooma in"
          className="w-8 h-8 flex items-center justify-center rounded-sm bg-paper border border-ink/15 hover:border-ink hover:text-ember font-mono text-base shadow-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          aria-label="Zooma ut"
          title="Zooma ut"
          className="w-8 h-8 flex items-center justify-center rounded-sm bg-paper border border-ink/15 hover:border-ink hover:text-ember font-mono text-base shadow-sm"
        >
          −
        </button>
        {isZoomed && (
          <button
            type="button"
            onClick={resetView}
            aria-label="Återställ vy"
            title="Återställ vy"
            className="w-8 h-8 flex items-center justify-center rounded-sm bg-paper border border-ink/15 hover:border-ink hover:text-ember text-[10px] shadow-sm"
          >
            ⟲
          </button>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="w-full h-auto bg-paper-warm border border-ink/10 rounded-sm select-none touch-none"
        style={{
          maxHeight: "78vh",
          cursor: dragRef.current?.moved ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseLeave={() => setHover(null)}
      >
        {/* Subtle graticule */}
        <g stroke="rgb(26 24 20 / 0.04)" strokeWidth="1" fill="none">
          {Array.from({ length: 7 }, (_, i) => 56 + i * 2).map((lat) => {
            const [, y] = project(BOUNDS.lngMin, lat);
            return <line key={`lat-${lat}`} x1={0} y1={y} x2={VIEW_W} y2={y} />;
          })}
          {Array.from({ length: 7 }, (_, i) => 12 + i * 2).map((lng) => {
            const [x] = project(lng, BOUNDS.latMin);
            return <line key={`lng-${lng}`} x1={x} y1={0} x2={x} y2={VIEW_H} />;
          })}
        </g>

        {/* Sweden outline / municipalities */}
        {featurePaths.length > 0 && (
          <g>
            {featurePaths.map((f) => {
              const intensity = f.count > 0 ? Math.min(1, Math.sqrt(f.count / peakCount)) : 0;
              const fill =
                intensity > 0
                  ? `rgba(194, 65, 12, ${(0.10 + intensity * 0.55).toFixed(2)})`
                  : "rgb(26 24 20 / 0.04)";
              const stroke =
                intensity > 0
                  ? `rgba(154, 52, 18, ${(0.45 + intensity * 0.4).toFixed(2)})`
                  : "rgb(26 24 20 / 0.18)";
              const isClickable = f.count > 0 && f.name;
              return (
                <path
                  key={f.id}
                  d={f.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  className={isClickable ? "cursor-pointer" : ""}
                  onClick={
                    isClickable
                      ? (e) => {
                          if (wasDragged()) return;
                          e.stopPropagation();
                          open("geo", f.name!);
                        }
                      : undefined
                  }
                >
                  {isClickable && (
                    <title>
                      {f.name}: {f.count} berättelse{f.count === 1 ? "" : "r"} — klicka
                    </title>
                  )}
                </path>
              );
            })}
          </g>
        )}

        {/* Halo dots for mentioned municipalities (the eye-catching layer) */}
        {projectedPoints
          .filter((p) => p.count > 0)
          .sort((a, b) => a.count - b.count)
          .map((p) => {
            const r = 4 + Math.sqrt(p.count / peakCount) * 14;
            return (
              <g
                key={p.code}
                className="cursor-pointer"
                onClick={(e) => {
                  if (wasDragged()) return;
                  e.stopPropagation();
                  open("geo", p.name);
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r * 1.7}
                  fill="rgba(194, 65, 12, 0.18)"
                />
                <circle cx={p.x} cy={p.y} r={r} fill="#c2410c" />
                <title>
                  {p.name}: {p.count} berättelse{p.count === 1 ? "" : "r"} — klicka
                </title>
              </g>
            );
          })}

        {/* Faint dots for un-mentioned municipalities — only if no choropleth layer */}
        {featurePaths.length === 0 &&
          projectedPoints
            .filter((p) => p.count === 0)
            .map((p) => (
              <circle
                key={p.code}
                cx={p.x}
                cy={p.y}
                r={2.2}
                fill="rgba(26, 24, 20, 0.13)"
              />
            ))}

        {/* Hover halo */}
        {hover && (
          <circle
            cx={hover.cx}
            cy={hover.cy}
            r={20}
            fill="none"
            stroke="#1a1814"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hover && wrapRef.current && (
        <Tooltip
          point={hover.p}
          svgX={hover.cx}
          svgY={hover.cy}
          containerWidth={wrapRef.current.clientWidth}
        />
      )}

      <div className="font-sans text-xs text-ink-muted mt-3 italic flex items-baseline gap-3 flex-wrap">
        <span>
          {featurePaths.length > 0
            ? `Sveriges ${featurePaths.length} kommuner. ${points.filter((p) => p.count > 0).length} av 290 är omnämnda — färgintensiteten visar antal omnämnanden.`
            : `Sveriges silhuett växer fram ur 290 kommun-koordinater. ${points.filter((p) => p.count > 0).length} av 290 är omnämnda.`}
        </span>
        <span className="ml-auto not-italic text-ink-faint font-sans">
          Scrolla för att zooma · drag för att panorera · klicka för berättelser
        </span>
      </div>

      <FilterModal
        open={state !== null}
        onClose={close}
        dimension={state?.dimension ?? "geo"}
        value={state?.value ?? ""}
        stories={matched}
      />
    </div>
  );
}

function Tooltip({
  point,
  svgX,
  svgY,
  containerWidth,
}: {
  point: Point;
  svgX: number;
  svgY: number;
  containerWidth: number;
}) {
  // Convert SVG coordinates back to container pixel coordinates
  const scale = containerWidth / VIEW_W;
  const left = svgX * scale;
  const top = svgY * scale;
  const flipX = left > containerWidth * 0.6;
  return (
    <div
      className="absolute pointer-events-none bg-ink text-paper px-3 py-2 rounded-sm font-sans text-xs shadow-lg z-10"
      style={{
        left,
        top,
        transform: flipX ? "translate(-110%, -130%)" : "translate(8px, -130%)",
      }}
    >
      <div className="font-medium text-paper">{point.name}</div>
      <div className="text-paper/70">{point.region}</div>
      {point.count > 0 ? (
        <div className="text-ember mt-1">
          {point.count} berättelse{point.count === 1 ? "" : "r"}
        </div>
      ) : (
        <div className="text-paper/50 mt-1 italic">inga omnämnanden</div>
      )}
    </div>
  );
}
