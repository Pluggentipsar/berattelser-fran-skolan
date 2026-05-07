"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { formatVolumeRef } from "@/lib/format";

export type FilterMatchStory = {
  id: string;
  title: string;
  volume: "i" | "ii";
  chapter: number;
  signature: string | null;
  pull_quote: string | null;
  excerpt: string;
  role: string | null;
  stadium: string | null;
};

export type FilterDimension =
  | "role"
  | "stadium"
  | "sentiment"
  | "theme"
  | "diagnosis"
  | "geo"
  | "critique"
  | "proposal";

const DIMENSION_LABEL: Record<FilterDimension, string> = {
  role: "Roll",
  stadium: "Stadium",
  sentiment: "Tonläge",
  theme: "Tema",
  diagnosis: "Diagnos / tillstånd",
  geo: "Plats",
  critique: "Systemkritik",
  proposal: "Förslag",
};

const DIMENSION_FULL_HREF_PARAM: Record<FilterDimension, string> = {
  role: "role",
  stadium: "stadium",
  sentiment: "sentiment",
  theme: "theme",
  diagnosis: "diagnosis",
  geo: "geo",
  critique: "critique",
  proposal: "proposal",
};

type Props = {
  open: boolean;
  onClose: () => void;
  dimension: FilterDimension;
  value: string;
  stories: FilterMatchStory[];
};

export function FilterModal({ open, onClose, dimension, value, stories }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const fullViewParam = DIMENSION_FULL_HREF_PARAM[dimension];
  const fullViewHref = `/berattelser?${fullViewParam}=${encodeURIComponent(value)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
      className="fixed inset-0 z-50 flex items-stretch md:items-start md:justify-center md:pt-16 md:pb-8 print:hidden"
    >
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] cursor-default"
      />
      <div
        ref={dialogRef}
        className="relative w-full md:max-w-3xl bg-paper border border-ink/10 shadow-2xl rounded-none md:rounded-sm flex flex-col overflow-hidden max-h-full md:max-h-[calc(100vh-8rem)]"
      >
        <header className="flex items-start gap-4 px-6 py-5 border-b border-ink/10 bg-paper-warm">
          <div className="flex-1">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-1">
              {DIMENSION_LABEL[dimension]}
            </p>
            <h2
              id="filter-modal-title"
              className="font-display text-2xl md:text-3xl font-semibold tracking-tightest"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
            >
              {value}
            </h2>
            <p className="font-serif italic text-sm text-ink-muted mt-1">
              {stories.length.toLocaleString("sv-SE")} berättelse
              {stories.length === 1 ? "" : "r"}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Stäng"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink hover:text-ember transition-colors text-lg"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto flex-1">
          {stories.length === 0 ? (
            <div className="p-10 text-center font-serif italic text-ink-muted">
              Inga berättelser matchar.
            </div>
          ) : (
            <ol className="divide-y divide-ink/10">
              {stories.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/berattelser/${s.id}`}
                    className="block px-6 py-5 hover:bg-paper-warm transition-colors group"
                    onClick={onClose}
                  >
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-mono text-xs text-ink-faint tabular-nums w-12 shrink-0">
                        {formatVolumeRef(s.volume, s.chapter)}
                      </span>
                      <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember">
                        {s.title}
                      </h3>
                    </div>
                    {s.pull_quote ? (
                      <p
                        className="font-serif italic text-[0.95rem] leading-relaxed text-ink-soft pl-16"
                        style={{ fontVariationSettings: '"opsz" 36' }}
                      >
                        &ldquo;{s.pull_quote}&rdquo;
                      </p>
                    ) : (
                      <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft pl-16">
                        {s.excerpt}
                      </p>
                    )}
                    <div className="pl-16 mt-2 flex items-baseline gap-3 flex-wrap font-sans text-xs text-ink-faint">
                      {s.role && <span>{s.role}</span>}
                      {s.role && s.stadium && <span>·</span>}
                      {s.stadium && <span>{s.stadium}</span>}
                      {s.signature && (
                        <span className="ml-auto font-serif italic">
                          — {s.signature}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-ink/10 bg-paper-warm flex items-center justify-between font-sans text-sm">
          <Link
            href={fullViewHref}
            className="text-ink-soft hover:text-ember"
            onClick={onClose}
          >
            Öppna i full vy →
          </Link>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink"
          >
            Stäng (esc)
          </button>
        </footer>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Hook: useFilterModal — manages modal state + computes matches from full corpus
// ---------------------------------------------------------------------------

export type FilterModalState = {
  dimension: FilterDimension;
  value: string;
} | null;

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

export function useFilterModal(stories: StoryRecord[]) {
  const [state, setState] = useState<FilterModalState>(null);

  const open = useCallback(
    (dimension: FilterDimension, value: string) =>
      setState({ dimension, value }),
    [],
  );
  const close = useCallback(() => setState(null), []);

  const matched: FilterMatchStory[] = state
    ? stories
        .filter((s) => matches(s, state.dimension, state.value))
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
        }))
    : [];

  return { state, open, close, matched };
}

function matches(
  s: StoryRecord,
  dimension: FilterDimension,
  value: string,
): boolean {
  const m = s.meta;
  if (!m) return false;
  switch (dimension) {
    case "role":
      return m.role === value;
    case "stadium":
      return m.stadium === value;
    case "sentiment":
      return m.sentiment === value;
    case "theme":
      return (m.themes ?? []).includes(value);
    case "diagnosis":
      return (m.diagnoses_mentioned ?? []).includes(value);
    case "geo":
      return m.geo_hint === value;
    case "critique":
      return (m.system_critique ?? []).includes(value);
    case "proposal":
      return (m.concrete_proposals ?? []).includes(value);
  }
}
