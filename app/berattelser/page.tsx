import Link from "next/link";
import { getStories, excerpt } from "@/lib/stories";
import { StoryListClient } from "./list-client";

const ROLES = [
  "lärare",
  "förälder",
  "elev",
  "specialpedagog",
  "förskollärare",
  "skolledare",
];
const STADIUMS = [
  "förskola",
  "förskoleklass",
  "lågstadiet",
  "mellanstadiet",
  "högstadiet",
  "gymnasiet",
  "vuxenutbildning",
];

export default async function StoriesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{
    vol?: string;
    sort?: string;
    role?: string;
    stadium?: string;
    sentiment?: string;
    theme?: string;
    diagnosis?: string;
    geo?: string;
    critique?: string;
    proposal?: string;
  }>;
}) {
  const params = await searchParams;
  const stories = await getStories();
  let filtered = stories;
  if (params.vol) filtered = filtered.filter((s) => s.volume === params.vol);
  if (params.role) filtered = filtered.filter((s) => s.meta?.role === params.role);
  if (params.stadium)
    filtered = filtered.filter((s) => s.meta?.stadium === params.stadium);
  if (params.sentiment)
    filtered = filtered.filter((s) => s.meta?.sentiment === params.sentiment);
  if (params.theme)
    filtered = filtered.filter((s) =>
      (s.meta?.themes ?? []).includes(params.theme!),
    );
  if (params.diagnosis)
    filtered = filtered.filter((s) =>
      (s.meta?.diagnoses_mentioned ?? []).includes(params.diagnosis!),
    );
  if (params.geo)
    filtered = filtered.filter((s) => s.meta?.geo_hint === params.geo);
  if (params.critique)
    filtered = filtered.filter((s) =>
      (s.meta?.system_critique ?? []).includes(params.critique!),
    );
  if (params.proposal)
    filtered = filtered.filter((s) =>
      (s.meta?.concrete_proposals ?? []).includes(params.proposal!),
    );
  const sort = params.sort ?? "chapter";
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "chapter") {
      if (a.volume !== b.volume) return a.volume.localeCompare(b.volume);
      return a.chapter - b.chapter;
    }
    if (sort === "long") return b.word_count - a.word_count;
    if (sort === "short") return a.word_count - b.word_count;
    return 0;
  });

  const hasMeta = stories.some((s) => s.meta?.role);

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-10 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Korpus
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Alla berättelser
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {stories.length.toLocaleString("sv-SE")} berättelser, sorterbara och
          filtrerbara. Klicka för att läsa en berättelse i sin helhet.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
          Volym:
        </span>
        <FilterLink href={qs(params, { vol: "" })} label="Alla" active={!params.vol} />
        <FilterLink
          href={qs(params, { vol: "i" })}
          label="Volym I"
          active={params.vol === "i"}
        />
        <FilterLink
          href={qs(params, { vol: "ii" })}
          label="Volym II"
          active={params.vol === "ii"}
        />
        <span className="font-sans text-xs uppercase tracking-wider text-ink-muted ml-6 mr-2">
          Sortera:
        </span>
        <FilterLink
          href={qs(params, { sort: "chapter" })}
          label="Kapitel"
          active={sort === "chapter"}
        />
        <FilterLink
          href={qs(params, { sort: "long" })}
          label="Längst"
          active={sort === "long"}
        />
        <FilterLink
          href={qs(params, { sort: "short" })}
          label="Kortast"
          active={sort === "short"}
        />
      </div>

      {hasMeta && (
        <>
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
              Roll:
            </span>
            <FilterLink
              href={qs(params, { role: "" })}
              label="Alla"
              active={!params.role}
            />
            {ROLES.map((r) => (
              <FilterLink
                key={r}
                href={qs(params, { role: r })}
                label={r}
                active={params.role === r}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-8 items-center">
            <span className="font-sans text-xs uppercase tracking-wider text-ink-muted mr-2">
              Stadium:
            </span>
            <FilterLink
              href={qs(params, { stadium: "" })}
              label="Alla"
              active={!params.stadium}
            />
            {STADIUMS.map((s) => (
              <FilterLink
                key={s}
                href={qs(params, { stadium: s })}
                label={s}
                active={params.stadium === s}
              />
            ))}
          </div>
        </>
      )}

      <ActiveFilters params={params} count={sorted.length} />

      <p className="font-sans text-xs text-ink-muted mb-6 tabular-nums">
        Visar {sorted.length.toLocaleString("sv-SE")} berättelser.
      </p>

      <StoryListClient
        stories={sorted.map((s) => ({
          id: s.id,
          volume_label: s.volume_label,
          volume: s.volume,
          chapter: s.chapter,
          title: s.title,
          excerpt: excerpt(s.body, 32),
          signature: s.signature,
          word_count: s.word_count,
          role: s.meta?.role ?? null,
          stadium: s.meta?.stadium ?? null,
        }))}
      />
    </div>
  );
}

function ActiveFilters({
  params,
  count,
}: {
  params: {
    theme?: string;
    diagnosis?: string;
    sentiment?: string;
    geo?: string;
    critique?: string;
    proposal?: string;
  };
  count: number;
}) {
  const items: { label: string; value: string; key: string }[] = [];
  if (params.theme) items.push({ label: "Tema", value: params.theme, key: "theme" });
  if (params.diagnosis)
    items.push({ label: "Diagnos", value: params.diagnosis, key: "diagnosis" });
  if (params.sentiment)
    items.push({ label: "Tonläge", value: params.sentiment, key: "sentiment" });
  if (params.geo) items.push({ label: "Plats", value: params.geo, key: "geo" });
  if (params.critique)
    items.push({ label: "Kritiserar", value: params.critique, key: "critique" });
  if (params.proposal)
    items.push({ label: "Föreslår", value: params.proposal, key: "proposal" });
  if (items.length === 0) return null;
  return (
    <div className="border-l-2 border-ember pl-4 mb-6 -mt-2">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-1">
        Aktivt filter
      </p>
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        {items.map((it) => (
          <span key={it.key} className="font-display text-lg font-semibold">
            {it.label}: <span className="text-ember">{it.value}</span>
          </span>
        ))}
        <Link
          href="/berattelser"
          className="font-sans text-xs text-ink-muted hover:text-ember underline ml-auto"
        >
          Rensa filter
        </Link>
      </div>
      <p className="font-serif italic text-sm text-ink-muted">
        {count} berättelse{count === 1 ? "" : "r"} matchar.
      </p>
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "font-sans text-xs px-3 py-1.5 rounded-full border transition-colors " +
        (active
          ? "bg-ink text-paper border-ink"
          : "border-ink/15 text-ink-soft hover:border-ink hover:text-ink")
      }
    >
      {label}
    </Link>
  );
}

function qs(
  current: { vol?: string; sort?: string; role?: string; stadium?: string },
  override: { vol?: string; sort?: string; role?: string; stadium?: string },
) {
  const sp = new URLSearchParams();
  const merged = { ...current, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v) sp.set(k, v);
  }
  const q = sp.toString();
  return `/berattelser${q ? `?${q}` : ""}`;
}
