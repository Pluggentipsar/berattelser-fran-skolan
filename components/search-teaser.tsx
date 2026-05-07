"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const QUERIES = [
  "anpassningar",
  "hemmasittare",
  "NPF",
  "Jönköping",
  "psykisk ohälsa",
  "specialpedagog",
  "lärarbristen",
  "marknadsskola",
  "skolan brinner",
];

const SUGGESTIONS = [
  "anpassningar",
  "hemmasittare",
  "NPF",
  "Jönköping",
  "psykisk ohälsa",
];

type Phase = "typing" | "holding" | "erasing" | "paused";

const TYPE_MS = 65;
const TYPE_JITTER = 35;
const ERASE_MS = 28;
const HOLD_MS = 1700;
const PAUSE_MS = 380;
const START_DELAY_MS = 700;

export function SearchTeaser({ total }: { total: number }) {
  const [text, setText] = useState("");
  const [reduced, setReduced] = useState(false);
  const idxRef = useRef(0);
  const phaseRef = useRef<Phase>("typing");
  const charRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) {
      setText(QUERIES[0]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      if (cancelled) return;
      const q = QUERIES[idxRef.current];
      const phase = phaseRef.current;
      let nextPhase: Phase = phase;
      let nextChar = charRef.current;
      let delay = TYPE_MS;

      if (phase === "typing") {
        nextChar++;
        if (nextChar >= q.length) {
          nextPhase = "holding";
          delay = HOLD_MS;
          nextChar = q.length;
        } else {
          delay = TYPE_MS + Math.random() * TYPE_JITTER;
        }
      } else if (phase === "holding") {
        nextPhase = "erasing";
        delay = ERASE_MS;
      } else if (phase === "erasing") {
        nextChar--;
        if (nextChar <= 0) {
          nextPhase = "paused";
          nextChar = 0;
          delay = PAUSE_MS;
        } else {
          delay = ERASE_MS;
        }
      } else if (phase === "paused") {
        idxRef.current = (idxRef.current + 1) % QUERIES.length;
        nextPhase = "typing";
        nextChar = 0;
        delay = TYPE_MS;
      }

      charRef.current = nextChar;
      phaseRef.current = nextPhase;
      const visible = QUERIES[idxRef.current].slice(0, Math.max(0, nextChar));
      setText(visible);
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, START_DELAY_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reduced]);

  return (
    <div className="mt-12 anim-rise anim-rise-delay-3">
      <Link
        href="/sok"
        aria-label={`Sök i ${total} berättelser`}
        className="group relative block border-y border-ink/15 hover:border-ember/60 transition-colors"
      >
        {/* hairline above-rule accent that grows on hover */}
        <span
          aria-hidden
          className="absolute -top-px left-0 h-px bg-ember origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out w-full"
        />
        <div className="flex items-baseline gap-4 sm:gap-6 py-4 sm:py-5">
          <div className="shrink-0 flex flex-col gap-0.5">
            <span className="font-sans text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.28em] text-ember">
              Sök
            </span>
            <span className="font-sans text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint hidden sm:block">
              i {total} röster
            </span>
          </div>
          <span
            aria-hidden
            className="font-display text-2xl text-ink-faint group-hover:text-ember transition-colors leading-none -translate-y-0.5"
          >
            ↳
          </span>
          <span
            className="flex-1 min-w-0 font-display italic text-[1.35rem] sm:text-2xl lg:text-[1.7rem] text-ink leading-snug"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 60' }}
          >
            <span aria-hidden className="text-ink-faint">“</span>
            <span className="text-ink">{text || " "}</span>
            <span
              aria-hidden
              className="search-teaser-caret inline-block w-px h-[0.95em] align-middle bg-ember ml-0.5 -mb-0.5"
            />
            <span aria-hidden className="text-ink-faint">”</span>
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="shrink-0 text-ink-muted group-hover:text-ember group-hover:translate-x-1 transition-all duration-300"
          >
            <line x1="4" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-serif text-[0.95rem] text-ink-muted">
        <span className="italic text-ink-faint mr-0.5">försök själv —</span>
        {SUGGESTIONS.map((s, i) => (
          <span key={s} className="inline-flex items-baseline gap-x-2.5">
            {i > 0 && (
              <span aria-hidden className="text-ink-faint select-none">
                ·
              </span>
            )}
            <Link
              href={`/sok?q=${encodeURIComponent(s)}`}
              className="text-ink-soft hover:text-ember underline decoration-transparent hover:decoration-ember/50 underline-offset-[4px] decoration-from-font transition-colors"
            >
              {s}
            </Link>
          </span>
        ))}
      </div>
    </div>
  );
}
