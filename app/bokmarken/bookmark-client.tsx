"use client";
import Link from "next/link";
import { useBookmarks } from "@/components/bookmark";

type Item = {
  id: string;
  title: string;
  chapter: number;
  volume_label: string;
  body: string;
  signature: string | null;
  role: string | null;
  stadium: string | null;
};

export function BookmarkClient({ items }: { items: Item[] }) {
  const { ids, toggle } = useBookmarks();
  const visible = items.filter((i) => ids.includes(i.id));

  if (ids.length === 0) {
    return (
      <div className="border border-dashed border-ink/15 rounded-sm p-10 max-w-2xl">
        <p className="font-serif italic text-ink-muted mb-2">
          Inga bokmärken än.
        </p>
        <p className="font-sans text-sm text-ink-muted">
          Klicka på "Bokmärk" på en berättelse-sida så hamnar den här.
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-ink/10 max-w-3xl border-t border-ink/10">
      {visible.map((s) => (
        <li key={s.id} className="py-5 flex items-start gap-4">
          <Link href={`/berattelser/${s.id}`} className="flex-1 group">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-mono text-xs text-ink-faint tabular-nums w-12 shrink-0">
                {s.volume_label === "Volym I" ? "I" : "II"}·{s.chapter}
              </span>
              <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember">
                {s.title}
              </h3>
            </div>
            <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft pl-16">
              {s.body}…
            </p>
          </Link>
          <button
            onClick={() => toggle(s.id)}
            className="font-sans text-xs px-2 py-1 text-ink-muted hover:text-ember"
            title="Ta bort"
          >
            ×
          </button>
        </li>
      ))}
    </ol>
  );
}
