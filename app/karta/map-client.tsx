"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FilterModal,
  type FilterMatchStory,
} from "@/components/filter-modal";
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

type StoryRecord = {
  id: string;
  title: string;
  volume: "i" | "ii";
  chapter: number;
  signature: string | null;
  body: string;
  meta?: {
    role?: string | null;
    stadium?: string | null;
    sentiment?: string | null;
    themes?: string[];
    diagnoses_mentioned?: string[];
    geo_hint?: string | null;
    pull_quote?: string | null;
    system_critique?: string[];
    concrete_proposals?: string[];
  };
};

export function ThemeMapClient({
  coords,
  clusters,
  stories,
}: {
  coords: Coord[];
  clusters: Cluster[];
  stories: StoryRecord[];
}) {
  const router = useRouter();
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<
    | { kind: "dot"; id: string; x: number; y: number }
    | { kind: "cluster"; id: number; label: string; x: number; y: number }
    | null
  >(null);
  const [modal, setModal] = useState<{
    label: string;
    matched: FilterMatchStory[];
  } | null>(null);

  const storyById = useMemo(() => {
    const m = new Map<string, StoryRecord>();
    for (const s of stories) m.set(s.id, s);
    return m;
  }, [stories]);

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

  // Cache cluster label box geometry so we can hit-test on hover/click
  const labelBoxesRef = useRef<{ id: number; label: string; x: number; y: number; w: number; h: number }[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    function draw() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const pad = 30;
      const sx = (x: number) =>
        pad + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * (W - pad * 2);
      const sy = (y: number) =>
        pad + ((y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * (H - pad * 2);

      // Soft halo around clusters
      for (const cl of clusters) {
        const x = sx(cl.x);
        const y = sy(cl.y);
        const r = 14 + Math.sqrt(cl.size) * 6;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const c = colorFor(cl.cluster_id);
        grad.addColorStop(0, c + "1F");
        grad.addColorStop(1, c + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dots
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

      // Cluster labels (record their boxes for hit testing)
      const boxes: typeof labelBoxesRef.current = [];
      ctx.font = "500 12px Inter, sans-serif";
      for (const cl of clusters) {
        const x = sx(cl.x);
        const y = sy(cl.y);
        const w = cl.label.length * 7.2 + 16;
        const h = 22;
        const bx = x - w / 2;
        const by = y - h / 2;
        ctx.fillStyle = "#faf6ee";
        ctx.fillRect(bx, by, w, h);
        ctx.strokeStyle = "rgba(26,24,20,0.18)";
        ctx.strokeRect(bx, by, w, h);
        ctx.fillStyle = "#1a1814";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cl.label, x, y);
        boxes.push({ id: cl.cluster_id, label: cl.label, x: bx, y: by, w, h });
      }
      labelBoxesRef.current = boxes;
    }

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [coords, clusters, bounds]);

  function hitTest(mx: number, my: number, W: number, H: number) {
    // Check labels first (they're on top)
    for (const b of labelBoxesRef.current) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        return { kind: "cluster" as const, id: b.id, label: b.label, x: b.x + b.w / 2, y: b.y + b.h / 2 };
      }
    }
    // Then dots
    const pad = 30;
    let best: Coord | null = null;
    let bestD = 12 * 12;
    for (const c of coords) {
      const x = pad + ((c.x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * (W - pad * 2);
      const y = pad + ((c.y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * (H - pad * 2);
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best) {
      const x = pad + ((best.x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * (W - pad * 2);
      const y = pad + ((best.y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * (H - pad * 2);
      return { kind: "dot" as const, id: best.id, x, y };
    }
    return null;
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setHover(hitTest(mx, my, rect.width, rect.height));
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitTest(mx, my, rect.width, rect.height);
    if (!hit) return;
    if (hit.kind === "dot") {
      router.push(`/berattelser/${hit.id}`);
      return;
    }
    // cluster label clicked → open modal with all stories in that cluster
    const cluster = clusters.find((c) => c.cluster_id === hit.id);
    if (!cluster) return;
    const matched: FilterMatchStory[] = cluster.member_ids
      .map((id) => storyById.get(id))
      .filter((s): s is StoryRecord => !!s)
      .map((s) => ({
        id: s.id,
        title: s.title,
        volume: s.volume,
        chapter: s.chapter,
        signature: s.signature,
        pull_quote: s.meta?.pull_quote ?? null,
        excerpt: s.body.slice(0, 220).replace(/\s+/g, " "),
        role: s.meta?.role ?? null,
        stadium: s.meta?.stadium ?? null,
      }));
    setModal({ label: hit.label, matched });
  }

  const cursor = hover ? "pointer" : "default";
  const hoverTitle =
    hover?.kind === "dot"
      ? storyById.get(hover.id)?.title ?? hover.id
      : hover?.kind === "cluster"
      ? `${hover.label} — ${clusters.find((c) => c.cluster_id === hover.id)?.size ?? 0} berättelser · klicka för att läsa`
      : null;

  return (
    <div className="relative" ref={wrapRef}>
      <canvas
        ref={ref}
        className="w-full h-[60vh] sm:h-[640px] bg-paper-warm border border-ink/10 rounded-sm"
        style={{ cursor }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        onClick={handleClick}
      />
      {hover && hoverTitle && (
        <div
          className="absolute pointer-events-none bg-ink text-paper px-2.5 py-1 rounded-sm font-sans text-xs shadow-lg max-w-xs"
          style={{
            left: hover.x + 14,
            top: hover.y + 14,
            transform: hover.x > 600 ? "translateX(-110%)" : "none",
          }}
        >
          {hoverTitle}
        </div>
      )}

      <p className="font-sans text-xs text-ink-muted mt-3 italic">
        Hovra för titel · klicka på en prick för att öppna berättelsen · klicka
        på ett kluster-namn för att läsa alla i det temat.
      </p>

      <FilterModal
        open={modal !== null}
        onClose={() => setModal(null)}
        dimension="theme"
        value={modal?.label ?? ""}
        stories={modal?.matched ?? []}
      />
    </div>
  );
}
