"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { aggArr } from "@/lib/stats";
import { formatVolumeRef } from "@/lib/format";
import { shuffleSeeded } from "@/lib/random";
import type { Role, Stadium } from "@/lib/stories";

type Item = {
  id: string;
  quote: string;
  title: string;
  role: Role | null;
  stadium: Stadium | null;
  themes: string[];
  signature: string | null;
  volume: "i" | "ii";
  chapter: number;
};

type Filter = { role?: Role; stadium?: Stadium; theme?: string };

export function CitationWallClient({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<Filter>({});
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const { allRoles, allStadiums, themeCounts } = useMemo(() => {
    const roles = new Set<Role>();
    const stadiums = new Set<Stadium>();
    for (const i of items) {
      if (i.role) roles.add(i.role);
      if (i.stadium) stadiums.add(i.stadium);
    }
    return {
      allRoles: [...roles].sort(),
      allStadiums: [...stadiums].sort(),
      themeCounts: [...aggArr(items, (i) => i.themes).entries()].sort(
        (a, b) => b[1] - a[1],
      ),
    };
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (filter.role) r = r.filter((i) => i.role === filter.role);
    if (filter.stadium) r = r.filter((i) => i.stadium === filter.stadium);
    if (filter.theme) r = r.filter((i) => i.themes.includes(filter.theme!));
    return shuffleSeed === 0 ? r : shuffleSeeded(r, shuffleSeed);
  }, [items, filter, shuffleSeed]);

  return (
    <>
      <div className="border-y border-ink/10 py-3 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 sticky top-[60px] bg-paper/95 backdrop-blur z-20">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
            Roll:
          </span>
          <Chip
            label="alla"
            active={!filter.role}
            onClick={() => setFilter({ ...filter, role: undefined })}
          />
          {allRoles.map((r) => (
            <Chip
              key={r}
              label={r}
              active={filter.role === r}
              onClick={() => setFilter({ ...filter, role: r })}
            />
          ))}
          <span className="font-sans text-xs uppercase tracking-wider text-ink-muted ml-4 mr-2">
            Stadium:
          </span>
          <Chip
            label="alla"
            active={!filter.stadium}
            onClick={() => setFilter({ ...filter, stadium: undefined })}
          />
          {allStadiums.map((s) => (
            <Chip
              key={s}
              label={s}
              active={filter.stadium === s}
              onClick={() => setFilter({ ...filter, stadium: s })}
            />
          ))}
          <button
            onClick={() => setShuffleSeed((x) => x + 1)}
            className="ml-auto font-sans text-xs px-3 py-1.5 rounded-full border border-ink/20 hover:border-ink"
          >
            ⤧ Blanda om
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 max-h-12 overflow-y-auto">
          <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2 self-center">
            Tema:
          </span>
          <Chip
            label="alla"
            active={!filter.theme}
            onClick={() => setFilter({ ...filter, theme: undefined })}
          />
          {themeCounts.slice(0, 25).map(([t, n]) => (
            <Chip
              key={t}
              label={`${t} (${n})`}
              active={filter.theme === t}
              onClick={() => setFilter({ ...filter, theme: t })}
            />
          ))}
        </div>
      </div>

      <p className="font-sans text-sm text-ink-muted mb-6 tabular-nums">
        Visar {filtered.length.toLocaleString("sv-SE")} citat
      </p>

      <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {filtered.map((i) => (
          <li key={i.id}>
            <Link href={`/berattelser/${i.id}`} className="group block">
              <p className="font-serif italic text-lg leading-relaxed text-ink-soft group-hover:text-ink mb-4">
                &ldquo;{i.quote}&rdquo;
              </p>
              <div className="flex flex-wrap items-baseline gap-2 font-sans text-xs text-ink-faint">
                {i.role && <span className="pill">{i.role}</span>}
                {i.stadium && <span className="pill">{i.stadium}</span>}
                <span className="ml-auto">
                  Berättelse {formatVolumeRef(i.volume, i.chapter)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
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
