import Link from "next/link";
import { notFound } from "next/navigation";
import { getStories } from "@/lib/stories";

export default async function KorusPage({
  params,
}: {
  params: Promise<{ theme: string }>;
}) {
  const { theme } = await params;
  const decoded = decodeURIComponent(theme);
  const stories = await getStories();
  const matched = stories.filter((s) => s.meta?.themes?.includes(decoded));
  if (matched.length === 0) notFound();
  const withQuote = matched.filter((s) => s.meta?.pull_quote);

  return (
    <div className="max-w-prose mx-auto px-6 py-16">
      <Link
        href={`/teman/${theme}`}
        className="font-sans text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        ← Tillbaka till temat
      </Link>
      <header className="mt-8 mb-16">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Stämmornas korus
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tightest mb-6">
          {decoded}
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {withQuote.length} röster, var och en med en mening de själva
          skrivit. Klicka för hela berättelsen.
        </p>
      </header>

      <ol className="space-y-12">
        {withQuote.map((s) => (
          <li key={s.id} className="border-l-2 border-ember/40 pl-6">
            <Link href={`/berattelser/${s.id}`} className="block group">
              <p className="font-serif italic text-xl leading-relaxed text-ink-soft mb-3 group-hover:text-ink transition-colors">
                "{s.meta?.pull_quote}"
              </p>
              <div className="flex flex-wrap items-baseline gap-3 font-sans text-sm text-ink-muted">
                {s.meta?.role && <span className="pill">{s.meta.role}</span>}
                {s.meta?.stadium && (
                  <span className="pill">{s.meta.stadium}</span>
                )}
                <span className="ml-auto text-ink-faint">
                  Berättelse {s.volume === "i" ? "I" : "II"}·{s.chapter} · "
                  {s.title}"
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
