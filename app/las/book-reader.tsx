"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  volume: "i" | "ii";
  chapter: number;
  title: string;
  body: string;
  signature: string | null;
  role: string | null;
  pull_quote: string | null;
  word_count: number;
};

type Settings = {
  fontSize: "s" | "m" | "l" | "xl";
  width: "narrow" | "normal" | "wide";
  bionic: boolean;
  spacing: "compact" | "normal" | "airy";
  theme: "paper" | "dark" | "sepia";
  ttsRate: number;
};

const DEFAULTS: Settings = {
  fontSize: "m",
  width: "normal",
  bionic: false,
  spacing: "normal",
  theme: "paper",
  ttsRate: 1.0,
};
const STORAGE_KEY = "bfs.book-reader.v1";
const POSITION_KEY = "bfs.book-reader.position.v1";

const FONT_SIZES: Record<Settings["fontSize"], string> = {
  s: "1rem",
  m: "1.15rem",
  l: "1.35rem",
  xl: "1.6rem",
};
const LINE_HEIGHTS: Record<Settings["spacing"], number> = {
  compact: 1.45,
  normal: 1.65,
  airy: 1.9,
};
const WIDTHS: Record<Settings["width"], string> = {
  narrow: "30rem",
  normal: "36rem",
  wide: "44rem",
};
const THEMES: Record<Settings["theme"], { bg: string; ink: string; muted: string; ember: string; faint: string; border: string }> = {
  paper: { bg: "#faf6ee", ink: "#1a1814", muted: "#6b6155", ember: "#c2410c", faint: "#a39988", border: "rgba(26,24,20,0.10)" },
  sepia: { bg: "#f4e9d4", ink: "#3a2e1c", muted: "#7a6a4d", ember: "#9a3412", faint: "#a89a78", border: "rgba(58,46,28,0.12)" },
  dark: { bg: "#17120e", ink: "#f0e8da", muted: "#a29886", ember: "#fb923c", faint: "#6e6759", border: "rgba(240,232,218,0.10)" },
};

export function BookReader({ items, totalWords }: { items: Item[]; totalWords: number }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [showPanel, setShowPanel] = useState(false);
  const [tocOpen, setTocOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [tts, setTts] = useState<{
    playing: boolean;
    supported: boolean;
    currentIdx: number | null;
  }>({
    playing: false,
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
    currentIdx: null,
  });

  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsIdxRef = useRef<number | null>(null);

  // Load settings + last position
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      const pos = localStorage.getItem(POSITION_KEY);
      if (pos) {
        // Only auto-restore if user landed without a hash (so hash navigation
        // overrides auto-restore).
        if (!window.location.hash) {
          setTimeout(() => {
            const el = articleRefs.current.get(pos);
            if (el)
              el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
          }, 50);
        }
      }
      // If URL has hash, jump to it
      if (window.location.hash) {
        const id = decodeURIComponent(window.location.hash.slice(1));
        setTimeout(() => {
          const el = articleRefs.current.get(id);
          if (el)
            el.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
        }, 50);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // IntersectionObserver to track which story is currently in view (for TOC highlight + position save)
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-id");
          const idx = items.findIndex((i) => i.id === id);
          if (idx >= 0) {
            setActiveIdx(idx);
            try {
              localStorage.setItem(POSITION_KEY, items[idx].id);
            } catch {
              /* ignore */
            }
          }
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.5, 1] },
    );
    articleRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function patch(p: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...p }));
  }

  function jumpTo(id: string) {
    const el = articleRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setTocOpen(false);
    }
  }

  function speakFrom(idx: number) {
    if (!tts.supported || idx >= items.length) {
      setTts((t) => ({ ...t, playing: false, currentIdx: null }));
      return;
    }
    const item = items[idx];
    const synth = window.speechSynthesis;
    const text = `${item.title}. ${item.signature ? "Signerat: " + item.signature + ". " : ""}${item.body}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "sv-SE";
    u.rate = settings.ttsRate;
    const voices = synth.getVoices();
    const sv = voices.find((v) => v.lang.startsWith("sv"));
    if (sv) u.voice = sv;
    u.onstart = () => {
      // Auto-scroll to next story when reading starts
      const el = articleRefs.current.get(item.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    u.onend = () => {
      // Continue with next
      if (ttsIdxRef.current === null) return; // cancelled
      const next = idx + 1;
      ttsIdxRef.current = next;
      setTts((t) => ({ ...t, currentIdx: next }));
      speakFrom(next);
    };
    u.onerror = () => {
      ttsIdxRef.current = null;
      setTts((t) => ({ ...t, playing: false, currentIdx: null }));
    };
    utteranceRef.current = u;
    synth.cancel();
    synth.speak(u);
    ttsIdxRef.current = idx;
    setTts((t) => ({ ...t, playing: true, currentIdx: idx }));
  }

  function ttsToggle() {
    if (!tts.supported) return;
    if (tts.playing) {
      ttsIdxRef.current = null;
      window.speechSynthesis.cancel();
      setTts((t) => ({ ...t, playing: false, currentIdx: null }));
    } else {
      speakFrom(activeIdx);
    }
  }

  function ttsNext() {
    if (!tts.playing) return;
    const next = (ttsIdxRef.current ?? activeIdx) + 1;
    if (next >= items.length) {
      ttsIdxRef.current = null;
      window.speechSynthesis.cancel();
      setTts((t) => ({ ...t, playing: false, currentIdx: null }));
      return;
    }
    speakFrom(next);
  }

  // Group items by volume for visual sectioning
  const sections = useMemo(() => {
    const out: { volume: "i" | "ii"; label: string; items: Item[] }[] = [];
    for (const item of items) {
      const v = item.volume;
      if (out.length === 0 || out[out.length - 1].volume !== v) {
        out.push({ volume: v, label: v === "i" ? "Volym I" : "Volym II", items: [] });
      }
      out[out.length - 1].items.push(item);
    }
    return out;
  }, [items]);

  const palette = THEMES[settings.theme];
  const totalReadingMinutes = Math.round(totalWords / 200);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col print:relative"
      style={{ background: palette.bg, color: palette.ink }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 border-b print:hidden gap-2"
        style={{ borderColor: palette.border, background: palette.bg }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setTocOpen((v) => !v)}
            aria-label={tocOpen ? "Stäng kapitellista" : "Öppna kapitellista"}
            title={tocOpen ? "Stäng kapitellista" : "Öppna kapitellista"}
            className="font-sans text-sm w-9 h-9 flex items-center justify-center rounded-full border shrink-0"
            style={{ borderColor: palette.border, color: palette.muted }}
          >
            {tocOpen ? "‹" : "≡"}
          </button>
          <div className="min-w-0">
            <p className="font-sans text-[0.65rem] uppercase tracking-[0.2em] truncate" style={{ color: palette.ember }}>
              Sammanhängande läsläge
            </p>
            <p className="font-display text-sm font-medium truncate" style={{ color: palette.ink }}>
              {items[activeIdx]?.title ?? "Berättelser från skolan"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs tabular-nums hidden sm:inline" style={{ color: palette.faint }}>
            {activeIdx + 1} / {items.length}
          </span>
          {tts.supported && (
            <>
              <button
                onClick={ttsToggle}
                aria-label={tts.playing ? "Stoppa uppläsning" : "Läs upp"}
                title={tts.playing ? "Stoppa uppläsning" : "Läs upp"}
                className="font-sans text-sm px-3 py-1.5 rounded-full border"
                style={{
                  borderColor: tts.playing ? palette.ember : palette.border,
                  color: tts.playing ? palette.ember : palette.muted,
                }}
              >
                {tts.playing ? "⏹" : "▶"}
              </button>
              {tts.playing && (
                <button
                  onClick={ttsNext}
                  aria-label="Nästa berättelse"
                  title="Nästa berättelse"
                  className="font-sans text-sm w-9 h-9 flex items-center justify-center rounded-full border"
                  style={{ borderColor: palette.border, color: palette.muted }}
                >
                  ⏭
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setShowPanel((v) => !v)}
            aria-expanded={showPanel}
            className="font-sans text-sm px-3 py-1.5 rounded-full border"
            style={{ borderColor: palette.border, color: palette.muted }}
          >
            ⚙
          </button>
          <Link
            href="/"
            className="font-sans text-sm w-9 h-9 flex items-center justify-center rounded-full border"
            style={{ borderColor: palette.border, color: palette.muted }}
            aria-label="Stäng läsläge"
            title="Stäng (gå tillbaka)"
          >
            ×
          </Link>
        </div>
      </header>

      {showPanel && (
        <SettingsPanel settings={settings} patch={patch} palette={palette} />
      )}

      {/* Progress bar */}
      <div className="h-0.5 print:hidden" style={{ background: palette.border }}>
        <div
          className="h-full transition-all"
          style={{ width: `${((activeIdx + 1) / items.length) * 100}%`, background: palette.ember }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {tocOpen && (
          <>
            {/* Mobile backdrop */}
            <button
              type="button"
              aria-label="Stäng kapitellista"
              onClick={() => setTocOpen(false)}
              className="md:hidden absolute inset-0 z-10 bg-ink/40 cursor-default"
            />
            <Toc
              sections={sections}
              activeId={items[activeIdx]?.id}
              onJump={jumpTo}
              palette={palette}
            />
          </>
        )}
        <main
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: "smooth" }}
        >
          <div
            className="mx-auto px-6 py-12"
            style={{
              maxWidth: WIDTHS[settings.width],
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: FONT_SIZES[settings.fontSize],
              lineHeight: LINE_HEIGHTS[settings.spacing],
            }}
          >
            <header className="mb-16 pb-10 border-b" style={{ borderColor: palette.border }}>
              <p className="font-sans text-xs uppercase tracking-[0.2em] mb-3" style={{ color: palette.ember }}>
                Hela boken, från början till slut
              </p>
              <h1
                className="font-display tracking-tightest leading-[1.05] mb-4"
                style={{ fontSize: "2.5em", fontWeight: 600 }}
              >
                Berättelser från skolan.
              </h1>
              <p className="font-serif italic" style={{ color: palette.muted }}>
                {items.length.toLocaleString("sv-SE")} berättelser · {totalWords.toLocaleString("sv-SE")} ord ·{" "}
                {Math.round(totalReadingMinutes / 60)} timmars läsning
              </p>
            </header>

            {sections.map((section) => (
              <section key={section.volume}>
                <h2
                  className="font-display mt-20 mb-12 pb-4 border-b text-center"
                  style={{
                    borderColor: palette.border,
                    color: palette.ember,
                    fontSize: "1.75em",
                    fontWeight: 500,
                    fontStyle: "italic",
                  }}
                >
                  {section.label}
                </h2>
                {section.items.map((item, i) => (
                  <article
                    key={item.id}
                    data-id={item.id}
                    id={item.id}
                    ref={(el) => {
                      if (el) articleRefs.current.set(item.id, el);
                      else articleRefs.current.delete(item.id);
                    }}
                    className="mb-20 scroll-mt-20"
                    style={{
                      background: tts.currentIdx !== null && items[tts.currentIdx]?.id === item.id
                        ? palette.ember + "14"
                        : "transparent",
                      borderRadius: 8,
                      transition: "background 200ms ease",
                      padding: tts.currentIdx !== null && items[tts.currentIdx]?.id === item.id ? "1.5em 1em" : 0,
                    }}
                  >
                    <header className="mb-6">
                      <p
                        className="font-sans text-[0.7rem] uppercase tracking-[0.2em] mb-1.5 flex items-baseline gap-2 flex-wrap"
                        style={{ color: palette.faint }}
                      >
                        <span className="font-mono">
                          {section.volume === "i" ? "I" : "II"}·{item.chapter}
                        </span>
                        {item.role && <span>{item.role}</span>}
                      </p>
                      <h3
                        className="font-display tracking-tight leading-tight"
                        style={{ fontWeight: 600, fontSize: "1.6em" }}
                      >
                        {item.title}
                      </h3>
                    </header>
                    {item.pull_quote && (
                      <aside
                        className="mb-6 pl-4 italic"
                        style={{
                          borderLeft: `2px solid ${palette.ember}`,
                          color: palette.muted,
                          fontSize: "1.1em",
                        }}
                      >
                        &ldquo;{item.pull_quote}&rdquo;
                      </aside>
                    )}
                    <Body text={item.body} bionic={settings.bionic} />
                    {item.signature && (
                      <p
                        className="mt-6 italic"
                        style={{ color: palette.muted }}
                      >
                        — {item.signature}
                      </p>
                    )}
                  </article>
                ))}
              </section>
            ))}

            <footer
              className="text-center pt-12 pb-24"
              style={{ borderTop: `1px solid ${palette.border}`, color: palette.muted }}
            >
              <p className="font-display italic text-2xl mb-2">Slut.</p>
              <p className="font-serif italic">
                {items.length} röster, hela boken igenom. Tack för att du läste.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Toc({
  sections,
  activeId,
  onJump,
  palette,
}: {
  sections: { volume: "i" | "ii"; label: string; items: Item[] }[];
  activeId: string | undefined;
  onJump: (id: string) => void;
  palette: typeof THEMES.paper;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState("");

  // Auto-scroll the TOC so the active item stays visible
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId]);

  const term = filter.trim().toLowerCase();

  return (
    <aside
      className="flex flex-col absolute md:static inset-y-0 left-0 z-20 md:z-auto w-72 border-r overflow-hidden shrink-0"
      style={{ borderColor: palette.border, background: palette.bg }}
    >
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: palette.border }}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Sök kapitel…"
          className="w-full px-3 py-1.5 rounded-sm font-sans text-sm focus:outline-none"
          style={{
            background: "transparent",
            border: `1px solid ${palette.border}`,
            color: palette.ink,
          }}
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((s) => {
          const filtered = term
            ? s.items.filter(
                (it) =>
                  it.title.toLowerCase().includes(term) ||
                  String(it.chapter).includes(term),
              )
            : s.items;
          if (filtered.length === 0) return null;
          return (
            <div key={s.volume} className="mb-4">
              <p
                className="font-sans text-[0.65rem] uppercase tracking-[0.2em] px-3 mb-2"
                style={{ color: palette.ember }}
              >
                {s.label}
              </p>
              <ul>
                {filtered.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <li key={item.id}>
                      <button
                        ref={active ? activeRef : null}
                        onClick={() => onJump(item.id)}
                        className="w-full text-left flex items-baseline gap-2 px-3 py-1.5 rounded-sm font-sans text-sm transition-colors"
                        style={{
                          color: active ? palette.ember : palette.muted,
                          fontWeight: active ? 600 : 400,
                          background: active ? palette.ember + "12" : "transparent",
                        }}
                      >
                        <span
                          className="font-mono text-xs tabular-nums w-8 shrink-0"
                          style={{ color: active ? palette.ember : palette.faint }}
                        >
                          {item.chapter}
                        </span>
                        <span className="truncate" style={{ color: active ? palette.ember : palette.ink }}>
                          {item.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Body({ text, bionic }: { text: string; bionic: boolean }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ marginBottom: "1.1em" }}>
          {bionic ? <BionicText text={p} /> : p}
        </p>
      ))}
    </>
  );
}

function BionicText({ text }: { text: string }) {
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((t, i) => {
        if (/^\s+$/.test(t)) return <span key={i}>{t}</span>;
        if (!/[a-zåäöA-ZÅÄÖ]/.test(t)) return <span key={i}>{t}</span>;
        const len = t.length;
        let cut = Math.ceil(len * (len <= 3 ? 0.6 : len <= 6 ? 0.5 : 0.42));
        cut = Math.max(1, cut);
        return (
          <span key={i}>
            <strong style={{ fontWeight: 700 }}>{t.slice(0, cut)}</strong>
            {t.slice(cut)}
          </span>
        );
      })}
    </>
  );
}

function SettingsPanel({
  settings,
  patch,
  palette,
}: {
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  palette: typeof THEMES.paper;
}) {
  return (
    <div
      className="border-b print:hidden"
      style={{ borderColor: palette.border, background: palette.bg }}
    >
      <div className="max-w-3xl mx-auto px-6 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 font-sans text-sm">
        <Row label="Textstorlek">
          {(["s", "m", "l", "xl"] as const).map((v) => (
            <Toggle
              key={v}
              active={settings.fontSize === v}
              onClick={() => patch({ fontSize: v })}
              palette={palette}
            >
              {v.toUpperCase()}
            </Toggle>
          ))}
        </Row>
        <Row label="Spaltbredd">
          {(["narrow", "normal", "wide"] as const).map((v) => (
            <Toggle key={v} active={settings.width === v} onClick={() => patch({ width: v })} palette={palette}>
              {v === "narrow" ? "smal" : v === "normal" ? "normal" : "bred"}
            </Toggle>
          ))}
        </Row>
        <Row label="Radavstånd">
          {(["compact", "normal", "airy"] as const).map((v) => (
            <Toggle key={v} active={settings.spacing === v} onClick={() => patch({ spacing: v })} palette={palette}>
              {v === "compact" ? "tätt" : v === "normal" ? "normalt" : "luftigt"}
            </Toggle>
          ))}
        </Row>
        <Row label="Tema">
          {(["paper", "sepia", "dark"] as const).map((v) => (
            <Toggle key={v} active={settings.theme === v} onClick={() => patch({ theme: v })} palette={palette}>
              {v === "paper" ? "papper" : v === "sepia" ? "sepia" : "mörkt"}
            </Toggle>
          ))}
        </Row>
        <Row label="Bionic reading">
          <Toggle active={settings.bionic} onClick={() => patch({ bionic: !settings.bionic })} palette={palette}>
            {settings.bionic ? "på" : "av"}
          </Toggle>
        </Row>
        <Row label="Uppläsningstakt">
          {([0.8, 1.0, 1.25, 1.5] as const).map((v) => (
            <Toggle
              key={v}
              active={Math.abs(settings.ttsRate - v) < 0.01}
              onClick={() => patch({ ttsRate: v })}
              palette={palette}
            >
              {v}×
            </Toggle>
          ))}
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="font-sans text-xs uppercase tracking-wider opacity-60 w-32 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap items-baseline gap-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
  palette,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  palette: typeof THEMES.paper;
}) {
  return (
    <button
      onClick={onClick}
      className="font-sans text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={{
        borderColor: active ? palette.ember : palette.border,
        background: active ? palette.ember : "transparent",
        color: active ? palette.bg : palette.muted,
      }}
    >
      {children}
    </button>
  );
}
