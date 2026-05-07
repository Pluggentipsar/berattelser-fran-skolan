import Link from "next/link";
import { getStories } from "@/lib/stories";
import { getClusters, getCoords } from "@/lib/coords";
import { getKommuner } from "@/lib/extras";
import { getSwedenGeoJson } from "@/lib/sweden-geo";
import { countBy } from "@/lib/stats";
import { ThemeMapClient } from "./map-client";
import { SwedenMap } from "./sweden-map";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showThematic = view === "tematisk";

  const [coords, clusters, stories, kommuner, geo] = await Promise.all([
    getCoords(),
    getClusters(),
    getStories(),
    getKommuner(),
    getSwedenGeoJson(),
  ]);

  const counts = countBy(stories, (s) => s.meta?.geo_hint ?? null);
  const points = kommuner.map((k) => ({
    name: k.name,
    code: k.code,
    region: k.region,
    population: k.population,
    lat: k.lat,
    lng: k.lng,
    count: (counts.get(k.name) as number | undefined) ?? 0,
  }));
  const topGeo = [...counts.entries()]
    .filter(([k]) => k != null)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 12) as [string, number][];

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-8 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Karta
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          {showThematic ? "Berättelse-nebulosan" : "Var berättas det ifrån?"}
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {showThematic
            ? "Varje punkt är en berättelse, placerad efter tematisk likhet. Berättelser nära varandra delar ord och teman. Klustren visar de mönster korpusen självt grupperar sig i."
            : "Varje punkt är en svensk kommun. Mörkare punkter har fler berättelser som nämner dem. Klicka på en kommun för att läsa berättelserna."}
        </p>
      </header>

      <div className="flex gap-2 mb-8">
        <Link
          href="/karta"
          className={`font-sans text-xs px-3 py-1.5 rounded-full border ${!showThematic ? "bg-ink text-paper border-ink" : "border-ink/15 text-ink-soft hover:border-ink"}`}
        >
          Geografisk
        </Link>
        <Link
          href="/karta?view=tematisk"
          className={`font-sans text-xs px-3 py-1.5 rounded-full border ${showThematic ? "bg-ink text-paper border-ink" : "border-ink/15 text-ink-soft hover:border-ink"}`}
        >
          Tematisk (UMAP-nebulosa)
        </Link>
      </div>

      {showThematic ? (
        coords && coords.length > 0 ? (
          <ThemeMapClient
            coords={coords}
            clusters={clusters ?? []}
            stories={stories.map((s) => ({
              id: s.id,
              title: s.title,
              volume: s.volume,
              chapter: s.chapter,
              signature: s.signature,
              body: s.body,
              meta: s.meta && {
                role: s.meta.role ?? null,
                stadium: s.meta.stadium ?? null,
                sentiment: s.meta.sentiment ?? null,
                themes: s.meta.themes ?? [],
                diagnoses_mentioned: s.meta.diagnoses_mentioned ?? [],
                geo_hint: s.meta.geo_hint ?? null,
                pull_quote: s.meta.pull_quote ?? null,
                system_critique: s.meta.system_critique ?? [],
                concrete_proposals: s.meta.concrete_proposals ?? [],
              },
            }))}
          />
        ) : (
          <div className="border border-dashed border-ink/15 rounded-sm p-10 text-center max-w-2xl">
            <p className="font-serif italic text-ink-muted mb-2">
              Tematiska kartan genereras av AI-pipelinen (kräver embeddings).
            </p>
            <p className="font-sans text-sm text-ink-muted">
              Kör{" "}
              <code className="bg-paper-warm px-1.5 py-0.5 rounded">
                embed_stories.py
              </code>{" "}
              och{" "}
              <code className="bg-paper-warm px-1.5 py-0.5 rounded">
                cluster_themes.py
              </code>
              .
            </p>
          </div>
        )
      ) : (
        <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
          <SwedenMap
            points={points}
            geo={geo}
            stories={stories.map((s) => ({
              id: s.id,
              title: s.title,
              volume: s.volume,
              chapter: s.chapter,
              signature: s.signature,
              body: s.body,
              meta: s.meta && {
                role: s.meta.role ?? null,
                stadium: s.meta.stadium ?? null,
                sentiment: s.meta.sentiment ?? null,
                themes: s.meta.themes ?? [],
                diagnoses_mentioned: s.meta.diagnoses_mentioned ?? [],
                geo_hint: s.meta.geo_hint ?? null,
                pull_quote: s.meta.pull_quote ?? null,
                system_critique: s.meta.system_critique ?? [],
                concrete_proposals: s.meta.concrete_proposals ?? [],
              },
            }))}
          />
          <aside className="border-l border-ink/10 pl-6">
            <h3 className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-4">
              Topp 12 nämnda
            </h3>
            <ol className="space-y-2.5">
              {topGeo.map(([name, n]) => (
                <li
                  key={name}
                  className="flex items-baseline gap-3 font-sans text-sm border-b border-ink/5 pb-1.5"
                >
                  <Link
                    href={`/berattelser?geo=${encodeURIComponent(name)}`}
                    className="hover:text-ember"
                  >
                    {name}
                  </Link>
                  <span className="ml-auto font-mono tabular-nums text-ink-muted">
                    {n}
                  </span>
                </li>
              ))}
            </ol>
            <p className="font-serif italic text-xs text-ink-muted mt-6 leading-relaxed">
              Att en kommun inte syns betyder inte att den saknar problem — bara
              att ingen berättelse i samlingen råkat nämna den vid namn.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
