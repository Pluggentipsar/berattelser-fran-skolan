"use client";
import { useEffect, useRef, useState } from "react";

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

const STORAGE_KEY = "bfs.focus-reader.v1";

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
const THEMES: Record<Settings["theme"], { bg: string; ink: string; muted: string; ember: string }> = {
  paper: { bg: "#faf6ee", ink: "#1a1814", muted: "#6b6155", ember: "#c2410c" },
  sepia: { bg: "#f4e9d4", ink: "#3a2e1c", muted: "#7a6a4d", ember: "#9a3412" },
  dark: { bg: "#17120e", ink: "#f0e8da", muted: "#a29886", ember: "#fb923c" },
};

type Props = {
  title: string;
  signature: string | null;
  body: string;
  meta?: {
    role?: string | null;
    stadium?: string | null;
    pull_quote?: string | null;
  } | null;
};

export function FocusReaderButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Fokusläge — bara berättelsen"
        aria-label="Öppna i fokusläge"
        className="inline-flex items-center gap-1.5 font-sans text-xs px-2.5 py-1 rounded-full border border-ink/15 text-ink-muted hover:border-ink hover:text-ink transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
        Fokusläge
      </button>
      {open && <FocusReader {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function FocusReader({
  title,
  signature,
  body,
  meta,
  onClose,
}: Props & { onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [showPanel, setShowPanel] = useState(false);
  const [tts, setTts] = useState<{ playing: boolean; supported: boolean }>({
    playing: false,
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load + persist settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
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

  // Trap scroll, ESC handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPanel) setShowPanel(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // stop any speech on unmount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [onClose, showPanel]);

  function patch(p: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...p }));
  }

  function speak() {
    if (!tts.supported) return;
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTts((t) => ({ ...t, playing: false }));
      return;
    }
    const text = `${title}.${signature ? " Av " + signature + "." : ""} ${body}`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "sv-SE";
    u.rate = settings.ttsRate;
    // Try to pick a Swedish voice
    const voices = synth.getVoices();
    const sv = voices.find((v) => v.lang.startsWith("sv"));
    if (sv) u.voice = sv;
    u.onend = () => setTts((t) => ({ ...t, playing: false }));
    u.onerror = () => setTts((t) => ({ ...t, playing: false }));
    utteranceRef.current = u;
    synth.speak(u);
    setTts((t) => ({ ...t, playing: true }));
  }

  const palette = THEMES[settings.theme];
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto print:relative"
      style={{ background: palette.bg, color: palette.ink }}
      ref={scrollRef}
    >
      {/* Top bar — minimal */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b print:hidden"
        style={{ borderColor: palette.muted + "33", background: palette.bg + "f0", backdropFilter: "blur(6px)" }}
      >
        <div className="font-sans text-xs uppercase tracking-[0.2em]" style={{ color: palette.ember }}>
          Fokusläge
        </div>
        <div className="flex items-center gap-2">
          {tts.supported && (
            <button
              onClick={speak}
              aria-label={tts.playing ? "Stoppa uppläsning" : "Läs upp"}
              title={tts.playing ? "Stoppa uppläsning" : "Läs upp"}
              className="font-sans text-sm px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: palette.muted + "55",
                color: tts.playing ? palette.ember : palette.muted,
              }}
            >
              {tts.playing ? "⏹ Stoppa" : "▶ Läs upp"}
            </button>
          )}
          <button
            onClick={() => setShowPanel((v) => !v)}
            aria-expanded={showPanel}
            className="font-sans text-sm px-3 py-1.5 rounded-full border"
            style={{ borderColor: palette.muted + "55", color: palette.muted }}
          >
            ⚙ Inställningar
          </button>
          <button
            onClick={onClose}
            aria-label="Stäng fokusläge (esc)"
            title="Stäng (esc)"
            className="font-sans text-sm w-9 h-9 flex items-center justify-center rounded-full border"
            style={{ borderColor: palette.muted + "55", color: palette.muted }}
          >
            ×
          </button>
        </div>
      </header>

      {showPanel && (
        <SettingsPanel settings={settings} patch={patch} palette={palette} ttsRate={settings.ttsRate} />
      )}

      <article
        className="mx-auto px-6 pt-12 pb-24"
        style={{
          maxWidth: WIDTHS[settings.width],
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          fontSize: FONT_SIZES[settings.fontSize],
          lineHeight: LINE_HEIGHTS[settings.spacing],
        }}
      >
        <p
          className="font-sans text-xs uppercase tracking-[0.2em] mb-4"
          style={{ color: palette.ember }}
        >
          {meta?.role ? meta.role : "Berättelse"}
          {meta?.stadium ? ` · ${meta.stadium}` : ""}
        </p>
        <h1
          className="font-display mb-8 leading-[1.1] tracking-tight"
          style={{
            fontWeight: 600,
            fontSize: `${parseFloat(FONT_SIZES[settings.fontSize]) * 1.9}rem`,
          }}
        >
          {title}
        </h1>
        {meta?.pull_quote && (
          <aside
            className="mb-10 pl-5 italic"
            style={{
              borderLeft: `2px solid ${palette.ember}`,
              fontSize: `${parseFloat(FONT_SIZES[settings.fontSize]) * 1.18}rem`,
              color: palette.muted,
              fontStyle: "italic",
            }}
          >
            &ldquo;{meta.pull_quote}&rdquo;
          </aside>
        )}
        <div>
          {paragraphs.map((p, i) => (
            <p key={i} style={{ marginBottom: "1.2em" }}>
              {settings.bionic ? <BionicText text={p} /> : p}
            </p>
          ))}
        </div>
        {signature && (
          <p
            className="mt-12 pt-6 italic"
            style={{ borderTop: `1px solid ${palette.muted}33`, color: palette.muted }}
          >
            — {signature}
          </p>
        )}
      </article>
    </div>
  );
}

function SettingsPanel({
  settings,
  patch,
  palette,
}: {
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  palette: ReturnType<typeof THEMES.paper extends infer T ? () => T : never> | typeof THEMES.paper;
  ttsRate: number;
}) {
  return (
    <div
      className="border-b print:hidden"
      style={{
        borderColor: palette.muted + "33",
        background: palette.bg,
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-4 font-sans text-sm">
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
            <Toggle
              key={v}
              active={settings.width === v}
              onClick={() => patch({ width: v })}
              palette={palette}
            >
              {v === "narrow" ? "smal" : v === "normal" ? "normal" : "bred"}
            </Toggle>
          ))}
        </Row>
        <Row label="Radavstånd">
          {(["compact", "normal", "airy"] as const).map((v) => (
            <Toggle
              key={v}
              active={settings.spacing === v}
              onClick={() => patch({ spacing: v })}
              palette={palette}
            >
              {v === "compact" ? "tätt" : v === "normal" ? "normalt" : "luftigt"}
            </Toggle>
          ))}
        </Row>
        <Row label="Tema">
          {(["paper", "sepia", "dark"] as const).map((v) => (
            <Toggle
              key={v}
              active={settings.theme === v}
              onClick={() => patch({ theme: v })}
              palette={palette}
            >
              {v === "paper" ? "papper" : v === "sepia" ? "sepia" : "mörkt"}
            </Toggle>
          ))}
        </Row>
        <Row label="Bionic reading">
          <Toggle active={settings.bionic} onClick={() => patch({ bionic: !settings.bionic })} palette={palette}>
            {settings.bionic ? "på" : "av"}
          </Toggle>
          <span style={{ color: palette.muted }} className="font-serif italic text-xs">
            (förstärker första halvan av varje ord)
          </span>
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
  palette: { bg: string; ink: string; muted: string; ember: string };
}) {
  return (
    <button
      onClick={onClick}
      className="font-sans text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={{
        borderColor: active ? palette.ember : palette.muted + "55",
        background: active ? palette.ember : "transparent",
        color: active ? palette.bg : palette.muted,
      }}
    >
      {children}
    </button>
  );
}

// Bionic reading: bold the first half of each word so the eye fixates and skims.
function BionicText({ text }: { text: string }) {
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((t, i) => {
        if (/^\s+$/.test(t)) return <span key={i}>{t}</span>;
        // Skip non-letter tokens (punctuation only)
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
