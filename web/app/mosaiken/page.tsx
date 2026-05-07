import { getStories } from "@/lib/stories";
import { MosaicClient } from "./mosaic-client";

export const metadata = {
  title: "Rösternas mosaik — Berättelser från skolan",
  description:
    "Hundratals ordagranna citat ur 615 berättelser, simultant. Ett hav av röster.",
};

export default async function MosaicPage() {
  const stories = await getStories();
  const items = stories
    .filter((s) => s.meta?.pull_quote)
    .map((s) => ({
      id: s.id,
      quote: s.meta!.pull_quote!,
      title: s.title,
      role: s.meta?.role ?? null,
      sentiment: s.meta?.sentiment ?? null,
    }));

  return (
    <>
      <header className="max-w-wide mx-auto px-6 pt-12 pb-8 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Mosaiken
        </p>
        <h1
          className="font-display text-4xl md:text-5xl font-semibold tracking-tightest leading-[1.05] mb-4"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          {items.length} röster, simultant.
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Ett hav av ordagranna meningar ur korpusen. Hovra för att fokusera.
          Klicka för hela berättelsen. Filtrera om du vill — eller släpp blicken
          och se massan.
        </p>
      </header>
      <MosaicClient items={items} />
    </>
  );
}
