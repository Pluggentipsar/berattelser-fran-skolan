import Link from "next/link";
import { getStories } from "@/lib/stories";
import { CitationWallClient } from "./wall-client";

export default async function CitationWallPage() {
  const stories = await getStories();
  const items = stories
    .filter((s) => s.meta?.pull_quote)
    .map((s) => ({
      id: s.id,
      quote: s.meta!.pull_quote!,
      title: s.title,
      role: s.meta?.role ?? null,
      stadium: s.meta?.stadium ?? null,
      themes: s.meta?.themes ?? [],
      signature: s.signature,
      volume: s.volume,
      chapter: s.chapter,
    }));

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Citatmur
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Stämmornas korus
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {items.length} röster, var och en med en mening de själva har skrivit.
          Filtrera på tonläge, roll eller tema. Klicka på en mening för hela
          berättelsen.
        </p>
      </header>

      <CitationWallClient items={items} />
    </div>
  );
}
