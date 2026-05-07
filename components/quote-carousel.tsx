"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CarouselQuote = {
  id: string;
  title: string;
  signature: string | null;
  volume: "i" | "ii";
  chapter: number;
  quote: string;
};

const ROTATE_MS = 8000;

export function QuoteCarousel({ quotes }: { quotes: CarouselQuote[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || quotes.length <= 1) return;
    timer.current = setInterval(() => {
      setIdx((i) => (i + 1) % quotes.length);
    }, ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, quotes.length]);

  if (quotes.length === 0) return null;
  const q = quotes[idx];

  function go(delta: number) {
    setIdx((i) => (i + delta + quotes.length) % quotes.length);
  }

  return (
    <section
      className="border-y border-ink/10 bg-paper-warm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-wide mx-auto px-6 py-16 lg:py-20">
        <div className="flex items-baseline justify-between mb-8">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember">
            Röster ur korpusen
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => go(-1)}
              aria-label="Föregående citat"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink hover:text-ember transition-colors"
            >
              ‹
            </button>
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {String(idx + 1).padStart(2, "0")} / {String(quotes.length).padStart(2, "0")}
            </span>
            <button
              onClick={() => go(1)}
              aria-label="Nästa citat"
              className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink hover:text-ember transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        <Link
          href={`/berattelser/${q.id}`}
          className="block group"
          key={q.id}
        >
          <blockquote
            className="font-display text-ink-soft group-hover:text-ink transition-colors fade-in"
            style={{
              fontSize: "clamp(1.4rem, 2.8vw, 2.1rem)",
              lineHeight: 1.32,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 96, "SOFT" 50',
            }}
          >
            <span className="text-ember mr-1 leading-none" aria-hidden>“</span>
            {q.quote.replace(/\s+/g, " ").trim()}
            <span className="text-ember ml-1 leading-none" aria-hidden>”</span>
          </blockquote>
          <footer className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-sm text-ink-muted">
            <span className="font-display font-semibold text-ink group-hover:text-ember">
              {q.title}
            </span>
            {q.signature && <span>· {q.signature}</span>}
            <span className="ml-auto font-mono text-xs">
              Volym {q.volume === "i" ? "I" : "II"} · Kapitel {q.chapter}
            </span>
          </footer>
        </Link>

        <div className="flex gap-1.5 mt-8 justify-center">
          {quotes.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Gå till citat ${i + 1}`}
              className={
                "h-1 rounded-full transition-all " +
                (i === idx ? "w-8 bg-ember" : "w-2 bg-ink/15 hover:bg-ink/30")
              }
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .fade-in {
          animation: fade 0.5s ease-out;
        }
        @keyframes fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
