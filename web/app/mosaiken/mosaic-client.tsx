"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  quote: string;
  title: string;
  role: string | null;
  sentiment: string | null;
};

const SENTIMENT_TINT: Record<string, string> = {
  förtvivlad: "rgb(127 29 29 / 0.06)",
  frustrerad: "rgb(154 52 18 / 0.05)",
  saklig: "rgb(82 82 91 / 0.04)",
  hoppfull: "rgb(21 128 61 / 0.06)",
  kritisk: "rgb(67 56 202 / 0.05)",
};

export function MosaicClient({ items }: { items: Item[] }) {
  const [sentimentFilter, setSentimentFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const allRoles = useMemo(
    () => [...new Set(items.map((i) => i.role).filter(Boolean) as string[])].sort(),
    [items],
  );

  const visible = useMemo(() => {
    let r = items;
    if (sentimentFilter) r = r.filter((i) => i.sentiment === sentimentFilter);
    if (roleFilter) r = r.filter((i) => i.role === roleFilter);
    return r;
  }, [items, sentimentFilter, roleFilter]);

  return (
    <>
      <div className="border-y border-ink/10 sticky top-[60px] bg-paper/95 backdrop-blur z-20">
        <div className="max-w-wide mx-auto px-6 py-3 flex flex-wrap items-center gap-2">
          <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
            Tonläge:
          </span>
          <Chip
            label="alla"
            active={!sentimentFilter}
            onClick={() => setSentimentFilter(null)}
          />
          {(["förtvivlad", "frustrerad", "saklig", "hoppfull", "kritisk"] as const).map(
            (s) => (
              <Chip
                key={s}
                label={s}
                active={sentimentFilter === s}
                onClick={() => setSentimentFilter(s)}
              />
            ),
          )}
          <span className="font-sans text-xs uppercase tracking-wider text-ink-muted ml-4 mr-2">
            Röst:
          </span>
          <Chip
            label="alla"
            active={!roleFilter}
            onClick={() => setRoleFilter(null)}
          />
          {allRoles.map((r) => (
            <Chip
              key={r}
              label={r}
              active={roleFilter === r}
              onClick={() => setRoleFilter(r)}
            />
          ))}
          <span className="ml-auto font-mono text-xs text-ink-muted tabular-nums">
            {visible.length} av {items.length}
          </span>
        </div>
      </div>

      <div className="max-w-wide mx-auto px-6 py-10">
        <div className="mosaic">
          {visible.map((it, i) => (
            <Tile key={it.id} item={it} index={i} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .mosaic {
          column-count: 1;
          column-gap: 1.5rem;
        }
        @media (min-width: 640px) {
          .mosaic { column-count: 2; }
        }
        @media (min-width: 900px) {
          .mosaic { column-count: 3; }
        }
        @media (min-width: 1200px) {
          .mosaic { column-count: 4; }
        }
      `}</style>
    </>
  );
}

function Tile({ item, index }: { item: Item; index: number }) {
  const tint = SENTIMENT_TINT[item.sentiment ?? ""] ?? "rgb(0 0 0 / 0)";
  const len = item.quote.length;
  // Vary typography to break up the grid: longer quotes smaller, shorter quotes larger
  const sizeClass =
    len < 60
      ? "text-2xl md:text-[1.65rem]"
      : len < 120
      ? "text-xl"
      : len < 180
      ? "text-lg"
      : "text-base";
  // Slightly randomize rotation/letterspacing per tile (deterministic)
  const seed = (item.id.charCodeAt(item.id.length - 1) + index) % 7;
  return (
    <Link
      href={`/berattelser/${item.id}`}
      className="break-inside-avoid block mb-6 group p-5 rounded-sm border border-ink/8 hover:border-ember/40 hover:shadow-md transition-all"
      style={{ background: tint }}
    >
      <p
        className={`font-display italic leading-snug text-ink-soft group-hover:text-ink ${sizeClass}`}
        style={{
          fontVariationSettings: '"opsz" 60, "SOFT" 50',
          fontWeight: 400,
          letterSpacing: seed % 3 === 0 ? "-0.005em" : "0",
        }}
      >
        <span className="text-ember">“</span>
        {item.quote.replace(/\s+/g, " ").trim()}
        <span className="text-ember">”</span>
      </p>
      <div className="font-sans text-[0.7rem] uppercase tracking-wider text-ink-faint mt-3 flex items-baseline gap-2 flex-wrap">
        {item.role && <span>{item.role}</span>}
        {item.role && item.sentiment && <span>·</span>}
        {item.sentiment && <span>{item.sentiment}</span>}
        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-ember normal-case tracking-normal">
          läs →
        </span>
      </div>
    </Link>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "font-sans text-xs px-3 py-1 rounded-full border transition-colors " +
        (active
          ? "bg-ink text-paper border-ink"
          : "border-ink/15 text-ink-soft hover:border-ink hover:text-ink")
      }
    >
      {label}
    </button>
  );
}
