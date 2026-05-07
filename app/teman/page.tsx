import Link from "next/link";
import { getStories } from "@/lib/stories";

export default async function ThemesPage() {
  const stories = await getStories();
  // Aggregate themes from enriched meta if present
  const themeCounts = new Map<string, number>();
  for (const s of stories) {
    for (const t of s.meta?.themes ?? []) {
      themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    }
  }
  const themes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const hasThemes = themes.length > 0;

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Tematisk navigation
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Teman
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {hasThemes
            ? "Återkommande mönster ur korpusen. Klicka för att läsa alla berättelser med samma tema."
            : "När AI-pipelinen körs syns här de återkommande mönstren ur korpusen — tematiska kluster med antal förekomster, klickbara mot källberättelserna."}
        </p>
      </header>

      {hasThemes ? (
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8 max-w-5xl">
          {themes.map(([t, n]) => (
            <li
              key={t}
              className="flex items-baseline gap-3 border-b border-ink/10 py-3"
            >
              <Link
                href={`/teman/${encodeURIComponent(t)}`}
                className="font-display text-lg hover:text-ember"
              >
                {t}
              </Link>
              <span className="font-mono text-sm text-ink-muted ml-auto tabular-nums">
                {n}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-dashed border-ink/15 rounded-sm p-10 text-center max-w-2xl">
          <p className="font-serif italic text-ink-muted mb-2">
            Ingen tematisk data ännu.
          </p>
          <p className="font-sans text-sm text-ink-muted">
            Kör <code className="bg-paper-warm px-1.5 py-0.5 rounded">scripts/enrich_stories.py</code>{" "}
            med en API-nyckel för att generera tematiska etiketter per berättelse.
          </p>
        </div>
      )}
    </div>
  );
}
