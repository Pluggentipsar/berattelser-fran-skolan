"use client";
import Link from "next/link";
import MiniSearch from "minisearch";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Doc = {
  id: string;
  title: string;
  chapter: number;
  volume_label: string;
  body: string;
  signature: string | null;
  word_count: number;
};

const STOP = new Set([
  "och",
  "att",
  "det",
  "som",
  "är",
  "en",
  "ett",
  "i",
  "på",
  "men",
  "så",
  "för",
  "av",
  "med",
  "till",
  "inte",
  "har",
  "vi",
  "jag",
  "de",
  "den",
  "var",
  "ska",
  "kan",
  "om",
  "den",
  "när",
  "han",
  "hon",
  "de",
  "från",
]);

export function SearchClient({ docs }: { docs: Doc[] }) {
  const params = useSearchParams();
  const initial = params?.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const ms = useMemo(() => {
    const m = new MiniSearch({
      idField: "id",
      fields: ["title", "body", "signature"],
      storeFields: ["title", "chapter", "volume_label", "signature", "word_count"],
      searchOptions: {
        boost: { title: 3, signature: 1.5 },
        fuzzy: 0.18,
        prefix: true,
        combineWith: "AND",
      },
      processTerm: (t: string) => {
        const x = t.toLowerCase();
        if (STOP.has(x)) return null;
        return x;
      },
    });
    m.addAll(docs);
    return m;
  }, [docs]);

  const results = useMemo(() => {
    if (!debounced.trim()) return [];
    return ms.search(debounced).slice(0, 80);
  }, [debounced, ms]);

  const bodyById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of docs) m.set(d.id, d.body);
    return m;
  }, [docs]);

  return (
    <>
      <div className="max-w-2xl mb-10">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Försök "specialpedagog", "hemmasittare", "marknadsskola", "Skolinspektionen"…'
          className="w-full px-5 py-4 border border-ink/15 rounded-sm bg-paper-warm font-serif text-lg focus:outline-none focus:border-ember placeholder:text-ink-faint"
        />
        {debounced && (
          <p className="font-sans text-xs text-ink-muted mt-2 tabular-nums">
            {results.length.toLocaleString("sv-SE")} träffar för "
            <span className="font-medium">{debounced}</span>"
          </p>
        )}
      </div>

      {!debounced && (
        <div className="font-serif text-ink-muted italic max-w-prose">
          Skriv ett ord eller en fras. Sökningen är fuzzy — stavfel funkar.
        </div>
      )}

      <ol className="divide-y divide-ink/10 max-w-3xl">
        {results.map((r) => {
          const body = bodyById.get(r.id as string) ?? "";
          const snippet = makeSnippet(body, debounced, 280);
          return (
            <li key={r.id} className="py-6">
              <Link
                href={`/berattelser/${r.id}`}
                className="block group"
              >
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-mono text-xs text-ink-faint tabular-nums">
                    {r.volume_label === "Volym I" ? "I" : "II"}·
                    {r.chapter}
                  </span>
                  <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember">
                    {highlight(r.title as string, debounced)}
                  </h3>
                </div>
                <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft">
                  {snippet.map((part, i) =>
                    part.match ? (
                      <mark
                        key={i}
                        className="bg-ember/15 text-ink rounded px-0.5"
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </p>
                {r.signature && (
                  <p className="font-serif italic text-sm text-ink-muted mt-2">
                    — {r.signature as string}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(escape).join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="bg-ember/15 text-ink rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeSnippet(
  body: string,
  q: string,
  windowChars: number,
): { text: string; match: boolean }[] {
  if (!q.trim()) return [{ text: body.slice(0, windowChars) + "…", match: false }];
  const terms = q.split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length)
    return [{ text: body.slice(0, windowChars) + "…", match: false }];
  const re = new RegExp(`(${terms.map(escape).join("|")})`, "gi");
  const m = re.exec(body);
  if (!m)
    return [
      {
        text: body.slice(0, windowChars).replace(/\s+/g, " ") + "…",
        match: false,
      },
    ];
  const start = Math.max(0, m.index - windowChars / 3);
  const end = Math.min(body.length, m.index + windowChars * 0.7);
  const slice = body.slice(start, end).replace(/\s+/g, " ");
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  const re2 = new RegExp(`(${terms.map(escape).join("|")})`, "gi");
  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  let mm: RegExpExecArray | null;
  const text = prefix + slice + suffix;
  // We'll re-run on the snippet text
  while ((mm = re2.exec(text))) {
    if (mm.index > last)
      parts.push({ text: text.slice(last, mm.index), match: false });
    parts.push({ text: mm[0], match: true });
    last = mm.index + mm[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}
