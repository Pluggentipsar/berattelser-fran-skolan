"use client";
import Link from "next/link";
import MiniSearch from "minisearch";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatVolumeRef } from "@/lib/format";

type Doc = {
  id: string;
  title: string;
  body: string;
  signature: string | null;
  chapter: number;
  volume: "i" | "ii";
  role: string | null;
  sentiment: string | null;
  themes: string[];
  pull_quote: string | null;
};

const STOP = new Set(
  "och att det som är en ett i på men så för av med till inte har vi jag de den var ska kan om när han hon från sig sin sina dessa även ju nog kanske eller om än vad där hur mig dig honom henne oss er dem varför vilken vilka vilket vart vem mer mest mycket många liten litet mindre flesta hela eget egna nu då här denna detta dessa man skulle skall fick får finns hade gör göra gjorde gjort blev blir bli alla allt något några ingen också både utan utom utöver dock visst ja nej kommer bör måste eftersom därför sedan medan andra annan annat oftast ofta sällan aldrig alltid del bara endast minst dryga drygt samma typ liksom lite tex dvs etc osv enligt kring runt mot bakom inom över under före efter istället förrän tills sedan vidare ibland innan vara varit vill ville velat vilja behöver behövde behövt behöva min mitt mina vår vårt våra dess deras hans hennes upp ner ut hem dit hit tillbaka iväg bort varje varenda mången manga går gick gått gå komma kom kommit ser såg sett se vet visste vetat veta gör göra gjorde gjort ta tog tagit ta får fick fått få bli blev blivit säger sade sa sagt säga göra gjorde gjort gör någon något några hela helt hel alldeles tror trodde trott tro tycker tyckte tyckt tycka fortfarande igen ändå jättebra mycket väldigt saker sak bra dåligt bra dag dagen dagar gång gången gånger gångerna år åren årets sätt sättet ofta ibland sällan alltid aldrig samtidigt liksom typ liksom verkligen riktigt ganska faktiskt ändå över under före efter helt skola skolan elever lärare barn eleverna".split(/\s+/),
);

export function CompareClient({ docs }: { docs: Doc[] }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ms = useMemo(() => {
    const m = new MiniSearch({
      idField: "id",
      fields: ["title", "body"],
      storeFields: ["title", "chapter", "volume", "signature", "role", "sentiment", "themes", "pull_quote"],
      searchOptions: {
        boost: { title: 2 },
        fuzzy: 0.12,
        prefix: true,
        combineWith: "OR",
      },
      processTerm: (t: string) => {
        const x = t.toLowerCase();
        if (x.length < 3 || STOP.has(x)) return null;
        return x;
      },
    });
    m.addAll(docs);
    return m;
  }, [docs]);

  // Extract the most informative tokens from the user's text (basic TF-IDF-ish)
  const keywords = useMemo(() => {
    if (!submitted || !text.trim()) return [];
    const tokens = text
      .toLowerCase()
      .match(/[a-zåäöéü']+/g)
      ?.filter((t) => t.length >= 3 && !STOP.has(t)) ?? [];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    // Score by tf * df-rarity (uses MiniSearch internal stats indirectly via length of postings)
    const scored: { word: string; tf: number }[] = [];
    for (const [w, n] of tf) scored.push({ word: w, tf: n });
    return scored.sort((a, b) => b.tf - a.tf).slice(0, 12);
  }, [submitted, text]);

  const results = useMemo(() => {
    if (!submitted || !text.trim()) return [];
    const r = ms.search(text);
    return r.slice(0, 24).map((hit) => ({
      id: hit.id as string,
      score: hit.score,
      title: hit.title as string,
      chapter: hit.chapter as number,
      volume: hit.volume as "i" | "ii",
      signature: hit.signature as string | null,
      role: hit.role as string | null,
      sentiment: hit.sentiment as string | null,
      themes: (hit.themes as string[]) ?? [],
      pull_quote: hit.pull_quote as string | null,
      matchedTerms: hit.terms as string[],
    }));
  }, [submitted, text, ms]);

  // Stats over the matched set
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const sentiments: Record<string, number> = {};
    const roles: Record<string, number> = {};
    const themes: Record<string, number> = {};
    for (const r of results) {
      if (r.sentiment) sentiments[r.sentiment] = (sentiments[r.sentiment] ?? 0) + 1;
      if (r.role) roles[r.role] = (roles[r.role] ?? 0) + 1;
      for (const t of r.themes) themes[t] = (themes[t] ?? 0) + 1;
    }
    return {
      sentiments: Object.entries(sentiments).sort((a, b) => b[1] - a[1]),
      roles: Object.entries(roles).sort((a, b) => b[1] - a[1]),
      themes: Object.entries(themes).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [results]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function onReset() {
    setText("");
    setSubmitted(false);
    inputRef.current?.focus();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mb-12 max-w-3xl">
        <textarea
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Klistra in ett uttalande, en debattreplik, ett policyutdrag, en tweet …"
          className="w-full px-5 py-4 border border-ink/15 rounded-sm bg-paper-warm font-serif text-lg leading-relaxed focus:outline-none focus:border-ember placeholder:text-ink-faint"
        />
        <div className="flex items-baseline gap-3 mt-3">
          <button
            type="submit"
            disabled={!text.trim()}
            className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hitta relevanta berättelser
          </button>
          {submitted && (
            <button
              type="button"
              onClick={onReset}
              className="font-sans text-sm text-ink-muted hover:text-ember underline"
            >
              Rensa
            </button>
          )}
          <p className="ml-auto font-serif italic text-sm text-ink-faint">
            Allt händer lokalt i din webbläsare.
          </p>
        </div>
      </form>

      {submitted && (
        <>
          {results.length === 0 ? (
            <div className="border border-dashed border-ink/15 rounded-sm p-10 max-w-2xl">
              <p className="font-serif italic text-ink-muted">
                Inga berättelser i korpusen behandlade tillräckligt liknande
                ämnen för att lyfta fram. Pröva ett annat uttalande, eller
                använd några nyckelord.
              </p>
            </div>
          ) : (
            <>
              <KeywordsBar keywords={keywords} />
              {stats && <StatsBar stats={stats} totalMatches={results.length} />}
              <ol className="space-y-8 mt-12 max-w-3xl">
                {results.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/berattelser/${r.id}`}
                      className="block group border-b border-ink/5 pb-6"
                    >
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="font-mono text-xs text-ink-faint tabular-nums w-12 shrink-0">
                          {formatVolumeRef(r.volume, r.chapter)}
                        </span>
                        <h3 className="font-display text-xl font-semibold leading-snug group-hover:text-ember">
                          {r.title}
                        </h3>
                        <span className="ml-auto font-mono text-xs text-ink-faint tabular-nums">
                          relevans {r.score.toFixed(1)}
                        </span>
                      </div>
                      {r.pull_quote && (
                        <p
                          className="font-serif italic text-[1.05rem] leading-relaxed text-ink-soft pl-16 mb-2"
                          style={{ fontVariationSettings: '"opsz" 36' }}
                        >
                          &ldquo;{r.pull_quote}&rdquo;
                        </p>
                      )}
                      <div className="pl-16 flex items-baseline gap-3 flex-wrap font-sans text-xs text-ink-muted">
                        {r.role && <span>{r.role}</span>}
                        {r.role && r.sentiment && <span>·</span>}
                        {r.sentiment && <span>{r.sentiment}</span>}
                        {r.matchedTerms?.length > 0 && (
                          <span className="ml-auto text-ink-faint">
                            träffar: {r.matchedTerms.slice(0, 5).join(", ")}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </>
  );
}

function KeywordsBar({
  keywords,
}: {
  keywords: { word: string; tf: number }[];
}) {
  if (!keywords.length) return null;
  return (
    <div className="border-y border-ink/10 py-4 mb-8 max-w-3xl">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
        Nyckelord ur uttalandet
      </p>
      <div className="flex flex-wrap gap-2">
        {keywords.map((k) => (
          <span
            key={k.word}
            className="font-sans text-xs px-2.5 py-0.5 rounded-full bg-ember/10 text-ember"
          >
            {k.word}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatsBar({
  stats,
  totalMatches,
}: {
  stats: {
    sentiments: [string, number][];
    roles: [string, number][];
    themes: [string, number][];
  };
  totalMatches: number;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mb-2">
      <StatBlock title="Tonläge i träffarna" entries={stats.sentiments} total={totalMatches} />
      <StatBlock title="Vem berättar?" entries={stats.roles} total={totalMatches} />
      <StatBlock title="Vanligaste teman" entries={stats.themes} total={totalMatches} />
    </div>
  );
}

function StatBlock({
  title,
  entries,
  total,
}: {
  title: string;
  entries: [string, number][];
  total: number;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-2">
        {title}
      </p>
      <ul className="space-y-1">
        {entries.slice(0, 5).map(([k, n]) => (
          <li key={k} className="flex items-baseline gap-2 font-sans text-sm">
            <span className="text-ink-soft truncate">{k}</span>
            <span className="ml-auto font-mono text-xs text-ink-faint tabular-nums">
              {n}
            </span>
            <span className="font-mono text-xs text-ink-faint tabular-nums w-10 text-right">
              {Math.round((n / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
