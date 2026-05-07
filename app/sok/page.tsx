import { getStories } from "@/lib/stories";
import { SearchClient } from "./search-client";

export default async function SearchPage() {
  const stories = await getStories();
  // ship a slim payload to the client (no full bodies for index docs we won't show)
  const docs = stories.map((s) => ({
    id: s.id,
    title: s.title,
    chapter: s.chapter,
    volume_label: s.volume_label,
    body: s.body,
    signature: s.signature,
    word_count: s.word_count,
  }));

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-10 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Fritextsök
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Sök i berättelserna
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Sökmotorn matchar mot titel och hela texten med fuzzy-matchning och
          stemsökning. Resultaten visar varje träff i sin kontext.
        </p>
      </header>
      <SearchClient docs={docs} />
    </div>
  );
}
