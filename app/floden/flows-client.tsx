"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Flow = { from: string; to: string; count: number; storyIds: string[] };
type FlowDataset = { flows: Record<string, Flow[]> };

const PAIRS: { key: string; label: string }[] = [
  { key: "role->critique", label: "Roll → Vad de kritiserar" },
  { key: "role->proposal", label: "Roll → Vad de föreslår" },
  { key: "stadium->critique", label: "Stadium → Kritik" },
  { key: "critique->proposal", label: "Kritik → Förslag" },
  { key: "role->stadium", label: "Roll → Stadium" },
];

const ROLE_COLORS: Record<string, string> = {
  lärare: "#c2410c",
  förälder: "#4338ca",
  elev: "#15803d",
  specialpedagog: "#9d174d",
  förskollärare: "#b45309",
  skolledare: "#04748a",
  annan: "#6b6155",
};

export function FlowsClient({ dataset }: { dataset: FlowDataset }) {
  const [pair, setPair] = useState(PAIRS[1].key); // start with role -> proposal
  const flows = dataset.flows[pair] ?? [];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6 border-y border-ink/10 py-4 sticky top-[60px] bg-paper/95 backdrop-blur z-20">
        {PAIRS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPair(p.key)}
            className={
              "font-sans text-xs px-3 py-1.5 rounded-full border transition-colors " +
              (pair === p.key
                ? "bg-ink text-paper border-ink"
                : "border-ink/15 text-ink-soft hover:border-ink hover:text-ink")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {flows.length === 0 ? (
        <div className="font-serif italic text-ink-muted">Inga flöden i den här vyn.</div>
      ) : (
        <SankeyDiagram flows={flows} />
      )}
    </>
  );
}

function SankeyDiagram({ flows }: { flows: Flow[] }) {
  const [hover, setHover] = useState<{ flow: Flow; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Flow | null>(null);

  // Build node lists
  const fromNodes = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of flows) m.set(f.from, (m.get(f.from) ?? 0) + f.count);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [flows]);
  const toNodes = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of flows) m.set(f.to, (m.get(f.to) ?? 0) + f.count);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [flows]);

  const totalFlow = useMemo(() => flows.reduce((s, f) => s + f.count, 0), [flows]);

  // Layout
  const width = 1100;
  const padding = 24;
  const labelGapLeft = 200;
  const labelGapRight = 220;
  const innerW = width - labelGapLeft - labelGapRight;
  const trackX1 = labelGapLeft;
  const trackX2 = labelGapLeft + innerW;
  const nodeWidth = 14;
  const gap = 4;

  // Compute total height needed
  const heightPerUnit = 0.55;
  const minNodeHeight = 12;
  const fromHeight = fromNodes.reduce((sum, [, c]) => sum + Math.max(minNodeHeight, c * heightPerUnit), 0);
  const toHeight = toNodes.reduce((sum, [, c]) => sum + Math.max(minNodeHeight, c * heightPerUnit), 0);
  const fromGapTotal = (fromNodes.length - 1) * gap;
  const toGapTotal = (toNodes.length - 1) * gap;
  const height = Math.max(fromHeight + fromGapTotal, toHeight + toGapTotal) + padding * 2 + 40;

  // Y-positions for nodes (left)
  const fromY = new Map<string, { y: number; h: number }>();
  let cy = padding;
  for (const [k, c] of fromNodes) {
    const h = Math.max(minNodeHeight, c * heightPerUnit);
    fromY.set(k, { y: cy, h });
    cy += h + gap;
  }

  // Right side
  const toY = new Map<string, { y: number; h: number }>();
  cy = padding;
  for (const [k, c] of toNodes) {
    const h = Math.max(minNodeHeight, c * heightPerUnit);
    toY.set(k, { y: cy, h });
    cy += h + gap;
  }

  // For each node, track where the next ribbon should attach
  const fromCursor = new Map<string, number>();
  const toCursor = new Map<string, number>();
  for (const [k] of fromNodes) fromCursor.set(k, fromY.get(k)!.y);
  for (const [k] of toNodes) toCursor.set(k, toY.get(k)!.y);

  // Sort flows by from-position then by to-count desc to keep ribbons untangled
  const orderedFlows = [...flows].sort((a, b) => {
    const ay = fromY.get(a.from)?.y ?? 0;
    const by = fromY.get(b.from)?.y ?? 0;
    if (ay !== by) return ay - by;
    return b.count - a.count;
  });

  type Ribbon = {
    flow: Flow;
    fromY: number;
    toY: number;
    height: number;
    color: string;
  };
  const ribbons: Ribbon[] = [];
  for (const f of orderedFlows) {
    const fY = fromY.get(f.from);
    const tY = toY.get(f.to);
    if (!fY || !tY) continue;
    const ribbonH = Math.max(1.5, f.count * heightPerUnit);
    const startY = fromCursor.get(f.from)!;
    const endY = toCursor.get(f.to)!;
    fromCursor.set(f.from, startY + ribbonH);
    toCursor.set(f.to, endY + ribbonH);
    const color = ROLE_COLORS[f.from] ?? "#c2410c";
    ribbons.push({ flow: f, fromY: startY, toY: endY, height: ribbonH, color });
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseLeave={() => setHover(null)}
      >
        {/* Ribbons (drawn behind nodes) */}
        {ribbons.map((r, i) => {
          const x1 = trackX1 + nodeWidth / 2;
          const x2 = trackX2 - nodeWidth / 2;
          const cx1 = (x1 + x2) / 2;
          const path = ribbon(x1, r.fromY, x2, r.toY, r.height, cx1);
          const isHover = hover?.flow === r.flow;
          const isSel = selected === r.flow;
          return (
            <path
              key={i}
              d={path}
              fill={r.color}
              fillOpacity={isHover || isSel ? 0.65 : 0.32}
              className="cursor-pointer transition-opacity"
              onMouseMove={(e) => {
                const svgEl = e.currentTarget.ownerSVGElement!;
                const pt = svgEl.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const m = svgEl.getScreenCTM()?.inverse();
                if (!m) return;
                const local = pt.matrixTransform(m);
                setHover({ flow: r.flow, x: local.x, y: local.y });
              }}
              onClick={() => setSelected(r.flow)}
            />
          );
        })}
        {/* Nodes (left) */}
        {[...fromY.entries()].map(([k, p]) => (
          <g key={`from-${k}`}>
            <rect
              x={trackX1}
              y={p.y}
              width={nodeWidth}
              height={p.h}
              fill={ROLE_COLORS[k] ?? "#1a1814"}
              fillOpacity={0.9}
            />
            <text
              x={trackX1 - 12}
              y={p.y + p.h / 2}
              textAnchor="end"
              dominantBaseline="middle"
              className="font-sans text-[12px] fill-ink"
            >
              {k} <tspan className="fill-ink-faint">{fromNodes.find(([fk]) => fk === k)?.[1]}</tspan>
            </text>
          </g>
        ))}
        {/* Nodes (right) */}
        {[...toY.entries()].map(([k, p]) => (
          <g key={`to-${k}`}>
            <rect
              x={trackX2 - nodeWidth}
              y={p.y}
              width={nodeWidth}
              height={p.h}
              fill="#1a1814"
              fillOpacity={0.9}
            />
            <text
              x={trackX2 + 12}
              y={p.y + p.h / 2}
              textAnchor="start"
              dominantBaseline="middle"
              className="font-sans text-[12px] fill-ink"
            >
              {prettyLabel(k)} <tspan className="fill-ink-faint">{toNodes.find(([tk]) => tk === k)?.[1]}</tspan>
            </text>
          </g>
        ))}
      </svg>

      {hover && (
        <div
          className="absolute pointer-events-none bg-ink text-paper px-3 py-2 rounded-sm font-sans text-xs shadow-lg max-w-xs"
          style={{
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
            transform: hover.x > width * 0.6 ? "translate(-110%, -130%)" : "translate(8px, -130%)",
          }}
        >
          <div className="font-medium">{hover.flow.from} → {prettyLabel(hover.flow.to)}</div>
          <div className="text-ember mt-1">{hover.flow.count} berättelser</div>
        </div>
      )}

      {selected && (
        <div className="mt-8 p-5 border border-ink/15 rounded-sm bg-paper-warm max-w-3xl">
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember">
              Vald koppling
            </p>
            <button
              onClick={() => setSelected(null)}
              className="font-sans text-xs text-ink-muted hover:text-ember"
            >
              Stäng ×
            </button>
          </div>
          <h3 className="font-display text-2xl font-semibold mb-2">
            {selected.from} → {prettyLabel(selected.to)}
          </h3>
          <p className="font-serif text-ink-soft mb-4">
            {selected.count} berättelser har båda dessa egenskaper.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 max-h-64 overflow-y-auto">
            {selected.storyIds.slice(0, 30).map((id) => (
              <li key={id}>
                <Link
                  href={`/berattelser/${id}`}
                  className="font-mono text-xs text-ink-muted hover:text-ember"
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>
          {selected.storyIds.length > 30 && (
            <p className="font-sans text-xs text-ink-faint mt-2">
              … och {selected.storyIds.length - 30} till.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ribbon(x1: number, y1: number, x2: number, y2: number, h: number, cx: number): string {
  const top1 = y1, bot1 = y1 + h;
  const top2 = y2, bot2 = y2 + h;
  return [
    `M ${x1} ${top1}`,
    `C ${cx} ${top1} ${cx} ${top2} ${x2} ${top2}`,
    `L ${x2} ${bot2}`,
    `C ${cx} ${bot2} ${cx} ${bot1} ${x1} ${bot1}`,
    `Z`,
  ].join(" ");
}

function prettyLabel(s: string): string {
  return s
    .replace(/-/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bnpf\b/gi, "NPF")
    .replace(/\bsva\b/gi, "SVA")
    .replace(/\bbup\b/gi, "BUP");
}
