import { getStories } from "@/lib/stories";
import { CompareClient } from "./compare-client";

export const metadata = {
  title: "Jämför mot rösterna — Berättelser från skolan",
  description:
    "Klistra in ett uttalande om svensk skola och se vilka av de 615 rösterna som behandlar samma ämnen.",
};

export default async function ComparePage() {
  const stories = await getStories();

  // Slim payload: id + title + body + key meta — used to build a client-side
  // MiniSearch index and render results.
  const docs = stories.map((s) => ({
    id: s.id,
    title: s.title,
    body: s.body,
    signature: s.signature,
    chapter: s.chapter,
    volume: s.volume,
    role: s.meta?.role ?? null,
    sentiment: s.meta?.sentiment ?? null,
    themes: s.meta?.themes ?? [],
    pull_quote: s.meta?.pull_quote ?? null,
  }));

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-10 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Jämför mot rösterna
        </p>
        <h1
          className="font-display text-4xl md:text-5xl font-semibold tracking-tightest leading-[1.05] mb-6"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          Vad säger rösterna om detta?
        </h1>
        <p className="font-serif text-lg text-ink-soft mb-4">
          Klistra in ett uttalande, en debattreplik, ett tweetinlägg eller ett
          policyutdrag om svenska skolan. Sajten letar upp de berättelser i
          korpusen som behandlar samma ämnen — så du kan läsa dem i ljuset av
          påståendet.
        </p>
        <p className="font-serif italic text-sm text-ink-muted">
          Detta är inte en sannings­bedömning. Det är ett läsverktyg som
          hjälper dig hitta de relevanta vittnesmålen. Det är du som drar
          slutsatsen.
        </p>
      </header>
      <CompareClient docs={docs} />
    </div>
  );
}
