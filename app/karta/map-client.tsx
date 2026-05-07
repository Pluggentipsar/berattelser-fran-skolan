"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Coord, Cluster } from "@/lib/coords";

const PALETTE = [
  "#c2410c", "#4338ca", "#0369a1", "#15803d", "#a16207",
  "#9d174d", "#1e40af", "#166534", "#7e22ce", "#b91c1c",
  "#0e7490", "#854d0e", "#5b21b6", "#9f1239", "#365314",
];

function colorFor(cluster: number): string {
  if (cluster < 0) return "#a39988";
  return PALETTE[cluster % PALETTE.length];
}

export function ThemeMapClient({
  coords,
  clusters,
  titles,
}: {
  coords: Coord[];
  clusters: Cluster[];
  titles: Record<string, string>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const bounds = useMemo(() => {
    const xs = coords.map((c) => c.x);
    const ys = coords.map((c) => c.y);
    return {
      xmin: Math.min(...xs),
      xmax: Math.max(...xs),
      ymin: Math.min(...ys),
      ymax: Math.max(...ys),
    };
  }, [coords]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = 30;
    const sx = (x: number) =>
      pad + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * (W - pad * 2);
    const sy = (y: number) =>
      pad + ((y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * (H - pad * 2);

    for (const c of coords) {
      const x = sx(c.x);
      const y = sy(c.y);
      ctx.beginPath();
      ctx.fillStyle = colorFor(c.cluster);
      ctx.globalAlpha = c.cluster < 0 ? 0.18 : 0.55;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // cluster labels
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillStyle = "#1a1814";
    for (const cl of clusters) {
      const x = sx(cl.x);
      const y = sy(cl.y);
      ctx.fillStyle = "#faf6ee";
      ctx.fillRect(x - cl.label.length * 3.6 - 4, y - 8, cl.label.length * 7.2 + 8, 16);
      ctx.strokeStyle = "rgba(26,24,20,0.15)";
      ctx.strokeRect(x - cl.label.length * 3.6 - 4, y - 8, cl.label.length * 7.2 + 8, 16);
      ctx.fillStyle = "#1a1814";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cl.label, x, y);
    }
  }, [coords, clusters, bounds]);

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width;
    const H = rect.height;
    const pad = 30;
    let best: Coord | null = null;
    let bestD = 12 * 12;
    for (const c of coords) {
      const x =
        pad + ((c.x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * (W - pad * 2);
      const y =
        pad + ((c.y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * (H - pad * 2);
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best) setHover({ id: best.id, x: mx, y: my });
    else setHover(null);
  }

  function handleClick() {
    if (hover) setActive(hover.id);
  }

  return (
    <div className="relative">
      <canvas
        ref={ref}
        className="w-full h-[640px] bg-paper-warm border border-ink/10 rounded-sm cursor-crosshair"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
      />
      {hover && (
        <div
          className="absolute pointer-events-none bg-ink text-paper px-2.5 py-1 rounded-sm font-sans text-xs shadow-lg max-w-xs"
          style={{
            left: hover.x + 14,
            top: hover.y + 14,
            transform: hover.x > 600 ? "translateX(-110%)" : "none",
          }}
        >
          {titles[hover.id] ?? hover.id}
        </div>
      )}
      {active && (
        <div className="mt-6 p-5 border border-ink/15 rounded-sm bg-paper-warm">
          <p className="font-sans text-xs uppercase tracking-wider text-ink-muted mb-2">
            Vald berättelse
          </p>
          <Link
            href={`/berattelser/${active}`}
            className="font-display text-xl font-semibold hover:text-ember"
          >
            {titles[active]}
          </Link>
        </div>
      )}
    </div>
  );
}
