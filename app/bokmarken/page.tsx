import { getStories } from "@/lib/stories";
import { BookmarkClient } from "./bookmark-client";

export default async function BookmarksPage() {
  const stories = await getStories();
  const lookup = stories.map((s) => ({
    id: s.id,
    title: s.title,
    chapter: s.chapter,
    volume_label: s.volume_label,
    body: s.body.slice(0, 240),
    signature: s.signature,
    role: s.meta?.role ?? null,
    stadium: s.meta?.stadium ?? null,
  }));
  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-10 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Dina bokmärken
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Sparade berättelser
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Bokmärken sparas lokalt i din webbläsare. Inget skickas någonstans.
        </p>
      </header>
      <BookmarkClient items={lookup} />
    </div>
  );
}
