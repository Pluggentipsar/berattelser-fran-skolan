"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  volume_label: string;
  volume: string;
  chapter: number;
  title: string;
  excerpt: string;
  signature: string | null;
  word_count: number;
  role?: string | null;
  stadium?: string | null;
};

const PAGE_SIZE = 60;

export function StoryListClient({ stories }: { stories: Item[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return stories;
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.excerpt.toLowerCase().includes(term) ||
        (s.signature?.toLowerCase().includes(term) ?? false),
    );
  }, [q, stories]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <>
      <div className="mb-6 max-w-md">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Filtrera titlar, citat, signaturer…"
          className="w-full px-4 py-2.5 border border-ink/15 rounded-sm bg-paper-warm font-sans text-sm focus:outline-none focus:border-ember"
        />
        <p className="font-sans text-xs text-ink-muted mt-2">
          Visar {visible.length.toLocaleString("sv-SE")} av{" "}
          {filtered.length.toLocaleString("sv-SE")}
        </p>
      </div>

      <ol className="divide-y divide-ink/10 border-t border-ink/10">
        {visible.map((s) => (
          <li key={s.id}>
            <Link
              href={`/berattelser/${s.id}`}
              className="block py-5 group hover:bg-paper-warm/50 -mx-2 px-2 transition-colors"
            >
              <div className="flex items-baseline gap-4 mb-1">
                <span className="font-mono text-xs text-ink-faint tabular-nums w-16 shrink-0">
                  {s.volume_label === "Volym I" ? "I" : "II"}·{s.chapter}
                </span>
                <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember transition-colors">
                  {s.title}
                </h3>
                <span className="ml-auto font-sans text-xs text-ink-faint tabular-nums whitespace-nowrap">
                  {s.word_count.toLocaleString("sv-SE")} ord
                </span>
              </div>
              <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft pl-20">
                {s.excerpt}
              </p>
              <div className="pl-20 mt-1.5 flex items-baseline gap-3 flex-wrap">
                {s.signature && (
                  <p className="font-serif italic text-sm text-ink-muted">
                    — {s.signature}
                  </p>
                )}
                {(s.role || s.stadium) && (
                  <p className="font-sans text-xs text-ink-faint">
                    {[s.role, s.stadium].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {hasMore && (
        <div className="text-center mt-12">
          <button
            onClick={() => setPage(page + 1)}
            className="font-sans text-sm font-medium px-6 py-3 border border-ink/20 rounded-sm hover:border-ink"
          >
            Visa {Math.min(PAGE_SIZE, filtered.length - visible.length)} fler
          </button>
        </div>
      )}
    </>
  );
}
