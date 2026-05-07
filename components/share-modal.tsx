"use client";
import { useEffect, useState } from "react";

type Format = "square" | "landscape" | "portrait";
const FORMAT_LABELS: Record<Format, string> = {
  square: "Kvadrat (Instagram)",
  landscape: "Landscape (Twitter)",
  portrait: "Porträtt (Stories)",
};
const FORMAT_RATIOS: Record<Format, string> = {
  square: "aspect-square",
  landscape: "aspect-[1200/630]",
  portrait: "aspect-[1080/1350]",
};

type Story = {
  id: string;
  title: string;
  signature: string | null;
  volume: "i" | "ii";
  chapter: number;
  pull_quote: string | null;
};

export function ShareButton({ story, baseUrl }: { story: Story; baseUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Dela detta citat"
        aria-label="Dela detta citat"
        className="inline-flex items-center gap-1.5 font-sans text-xs px-2.5 py-1 rounded-full border border-ink/15 text-ink-muted hover:border-ink hover:text-ink transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Dela
      </button>
      {open && <ShareDialog story={story} baseUrl={baseUrl} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareDialog({
  story,
  baseUrl,
  onClose,
}: {
  story: Story;
  baseUrl: string;
  onClose: () => void;
}) {
  const [fmt, setFmt] = useState<Format>("square");
  const [copied, setCopied] = useState<"text" | "url" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const imageUrl = `/berattelser/${story.id}/share-image?fmt=${fmt}`;
  const sourceUrl = `${baseUrl}/berattelser/${story.id}`;
  const quote = story.pull_quote ?? "";
  const sig = story.signature ?? "";
  const fullText = quote
    ? `"${quote}"\n\n— ${sig ? `${sig} · ` : ""}Ur "${story.title}", Berättelser från skolan, Vol ${story.volume === "i" ? "I" : "II"}, kap ${story.chapter}\n${sourceUrl}`
    : `"${story.title}" — Berättelser från skolan\n${sourceUrl}`;

  async function copy(text: string, kind: "text" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Browser refused (insecure context, etc.)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden"
    >
      <button
        type="button"
        aria-label="Stäng"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] cursor-default"
      />
      <div className="relative w-full max-w-2xl bg-paper border border-ink/10 shadow-2xl rounded-sm flex flex-col max-h-[calc(100vh-4rem)] overflow-hidden">
        <header className="flex items-baseline justify-between px-6 py-4 border-b border-ink/10 bg-paper-warm">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember">
              Dela detta citat
            </p>
            <p className="font-display font-medium text-ink mt-1">
              Ur &ldquo;{story.title}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-ink/15 hover:border-ink hover:text-ember"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFmt(f)}
                className={
                  "font-sans text-xs px-3 py-1.5 rounded-full border transition-colors " +
                  (fmt === f
                    ? "bg-ink text-paper border-ink"
                    : "border-ink/15 text-ink-soft hover:border-ink")
                }
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>

          <div
            className={`${FORMAT_RATIOS[fmt]} w-full bg-paper-warm border border-ink/10 rounded-sm overflow-hidden mb-5`}
          >
            <img
              key={fmt}
              src={imageUrl}
              alt="Förhandsvisning av delningskort"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={imageUrl}
              download={`berattelser-skolan-${story.id}-${fmt}.png`}
              className="font-sans text-sm font-medium px-4 py-2.5 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Ladda ner bild
            </a>
            <button
              onClick={() => copy(fullText, "text")}
              className="font-sans text-sm font-medium px-4 py-2.5 border border-ink/20 rounded-sm hover:border-ink"
            >
              {copied === "text" ? "Kopierat ✓" : "Kopiera citat + källa"}
            </button>
            <button
              onClick={() => copy(sourceUrl, "url")}
              className="font-sans text-sm font-medium px-4 py-2.5 border border-ink/20 rounded-sm hover:border-ink"
            >
              {copied === "url" ? "Kopierat ✓" : "Kopiera länk"}
            </button>
          </div>

          <p className="font-serif italic text-xs text-ink-muted mt-5">
            Dela gärna — citat är ordagranna och länkar tillbaka hit.
          </p>
        </div>
      </div>
    </div>
  );
}
