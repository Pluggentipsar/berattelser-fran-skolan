import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getStories,
  getStory,
  getStoryWithNeighbors,
  excerpt,
  formatVolumeRef,
  type CombinedStory,
} from "@/lib/stories";
import { getSimilar } from "@/lib/extras";
import { BookmarkButton } from "@/components/bookmark";
import { ShareButton } from "@/components/share-modal";
import { FocusReaderButton } from "@/components/focus-reader";
import { ReadingProgress } from "./reading-progress";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

type PrevalenceItem = {
  dimension: string;
  value: string;
  label: string;
  count: number;
  href: string;
};

function computePrevalence(
  story: CombinedStory,
  all: CombinedStory[],
): { total: number; items: PrevalenceItem[] } {
  const meta = story.meta;
  if (!meta) return { total: all.length, items: [] };
  const items: PrevalenceItem[] = [];

  const role = meta.role;
  const stadium = meta.stadium;
  const themes = meta.themes ?? [];
  const diagnoses = meta.diagnoses_mentioned ?? [];
  const geo = meta.geo_hint;

  // Role
  if (role) {
    const n = all.filter((s) => s.meta?.role === role).length;
    items.push({
      dimension: "role",
      value: role,
      label: `Andra som berättar som ${role}`,
      count: n,
      href: `/berattelser?role=${encodeURIComponent(role)}`,
    });
  }
  // Stadium
  if (stadium) {
    const n = all.filter((s) => s.meta?.stadium === stadium).length;
    items.push({
      dimension: "stadium",
      value: stadium,
      label: `Andra om ${stadium}`,
      count: n,
      href: `/berattelser?stadium=${encodeURIComponent(stadium)}`,
    });
  }
  // Top theme
  for (const t of themes.slice(0, 2)) {
    const n = all.filter((s) => (s.meta?.themes ?? []).includes(t)).length;
    if (n >= 2) {
      items.push({
        dimension: "theme",
        value: t,
        label: `Andra om temat ${t}`,
        count: n,
        href: `/berattelser?theme=${encodeURIComponent(t)}`,
      });
    }
  }
  // Diagnoses
  for (const d of diagnoses.slice(0, 2)) {
    const n = all.filter((s) =>
      (s.meta?.diagnoses_mentioned ?? []).includes(d),
    ).length;
    if (n >= 2) {
      items.push({
        dimension: "diagnosis",
        value: d,
        label: `Andra som nämner ${d}`,
        count: n,
        href: `/berattelser?diagnosis=${encodeURIComponent(d)}`,
      });
    }
  }
  // Geo
  if (geo) {
    const n = all.filter((s) => s.meta?.geo_hint === geo).length;
    if (n >= 2) {
      items.push({
        dimension: "geo",
        value: geo,
        label: `Andra som nämner ${geo}`,
        count: n,
        href: `/berattelser?geo=${encodeURIComponent(geo)}`,
      });
    }
  }

  // Sort by count desc, dedupe by (dimension, value)
  const seen = new Set<string>();
  const filtered = items
    .filter((i) => {
      const k = `${i.dimension}:${i.value}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { total: all.length, items: filtered };
}

export async function generateStaticParams() {
  const stories = await getStories();
  return stories.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getStory(id);
  if (!s) return {};
  return {
    title: `${s.title} — Berättelser från skolan`,
    description: s.body.slice(0, 160),
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const neighbors = await getStoryWithNeighbors(id);
  if (!neighbors) notFound();
  const { story, prev, next } = neighbors;

  const all = await getStories();
  const similarMap = await getSimilar();
  const sim = similarMap.get(story.id);
  const similar: CombinedStory[] = [];
  if (sim) {
    for (const ref of sim.similar.slice(0, 4)) {
      const s = await getStory(ref.id);
      if (s) similar.push(s);
    }
  }

  // "How common is this?" — compute prevalence of this story's enrichment
  // attributes across the full corpus.
  const prevalence = computePrevalence(story, all);

  const paragraphs = story.body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const minutes = Math.max(1, Math.round(story.word_count / 200));

  return (
    <article>
      <ReadingProgress />
      <div className="border-b border-ink/10">
        <div className="max-w-prose mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-8 sm:pb-10">
          <Link
            href="/berattelser"
            className="font-sans text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            ← Alla berättelser
          </Link>
          <div className="flex items-center gap-3 mt-6 mb-5 flex-wrap">
            <span className="pill">{story.volume_label}</span>
            <span className="font-sans text-xs text-ink-muted tabular-nums">
              Berättelse nr {story.chapter}
            </span>
            <span className="font-sans text-xs text-ink-muted">·</span>
            <span className="font-sans text-xs text-ink-muted">
              {minutes} min läsning
            </span>
            <span className="ml-auto" />
            <FocusReaderButton
              title={story.title}
              signature={story.signature}
              body={story.body}
              meta={
                story.meta
                  ? {
                      role: story.meta.role ?? null,
                      stadium: story.meta.stadium ?? null,
                      pull_quote: story.meta.pull_quote ?? null,
                    }
                  : null
              }
            />
            <ShareButton
              story={{
                id: story.id,
                title: story.title,
                signature: story.signature,
                volume: story.volume,
                chapter: story.chapter,
                pull_quote: story.meta?.pull_quote ?? null,
              }}
              baseUrl={BASE_URL}
            />
            <BookmarkButton id={story.id} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tightest text-ink mb-6">
            {story.title}
          </h1>
          {(story.meta?.role ||
            story.meta?.stadium ||
            (story.meta?.themes?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {story.meta?.role && (
                <Link
                  href={`/berattelser?role=${story.meta.role}`}
                  className="pill hover:border-ember hover:text-ember"
                >
                  {story.meta.role}
                </Link>
              )}
              {story.meta?.stadium && (
                <Link
                  href={`/berattelser?stadium=${story.meta.stadium}`}
                  className="pill hover:border-ember hover:text-ember"
                >
                  {story.meta.stadium}
                </Link>
              )}
              {story.meta?.themes?.slice(0, 4).map((t) => (
                <Link
                  key={t}
                  href={`/teman/${encodeURIComponent(t)}`}
                  className="pill hover:border-ember hover:text-ember"
                >
                  {t}
                </Link>
              ))}
              {story.meta?.geo_hint && (
                <span className="pill">📍 {story.meta.geo_hint}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-prose mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {story.meta?.pull_quote && (
          <aside className="mb-12 border-l-2 border-ember pl-6 py-2 -ml-6">
            <p
              className="font-display text-2xl text-ink-soft"
              style={{
                fontWeight: 500,
                lineHeight: 1.32,
                fontVariationSettings: '"opsz" 60, "SOFT" 40',
              }}
            >
              &ldquo;{story.meta.pull_quote}&rdquo;
            </p>
          </aside>
        )}
        <div className="prose-story">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {story.signature && (
          <p className="font-serif italic text-ink-muted mt-10 pt-6 border-t border-ink/10">
            — {story.signature}
          </p>
        )}

        {(story.meta?.diagnoses_mentioned?.length ?? 0) > 0 && (
          <section className="mt-10 pt-6 border-t border-ink/10">
            <h3 className="font-sans text-xs uppercase tracking-[0.2em] text-ink-muted mb-3">
              Nämns i berättelsen
            </h3>
            <div className="flex flex-wrap gap-2">
              {story.meta!.diagnoses_mentioned!.map((d) => (
                <span key={d} className="pill">
                  {d}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {prevalence.items.length > 0 && (
        <section className="border-t border-ink/10 print:hidden">
          <div className="max-w-prose mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
              Hur vanligt är detta?
            </h2>
            <p className="font-serif text-ink-muted italic mb-6 text-sm">
              Av de {prevalence.total.toLocaleString("sv-SE")} berättelserna
              i samlingen är denna inte ensam.
            </p>
            <ul className="space-y-3">
              {prevalence.items.map((it) => (
                <li key={`${it.dimension}:${it.value}`}>
                  <Link
                    href={it.href}
                    className="group flex items-baseline gap-3 border-b border-ink/5 py-2 hover:border-ember"
                  >
                    <span className="font-serif text-[0.95rem] text-ink-soft group-hover:text-ink flex-1">
                      {it.label}
                    </span>
                    <span className="font-display text-2xl font-semibold tabular-nums text-ember">
                      {it.count.toLocaleString("sv-SE")}
                    </span>
                    <span className="font-sans text-xs text-ink-muted whitespace-nowrap">
                      ({Math.round((it.count / prevalence.total) * 100)}%)
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="bg-paper-warm border-y border-ink/10 print:hidden">
          <div className="max-w-prose mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <h2 className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-6">
              Den tysta majoriteten — fler som berättar liknande
            </h2>
            <ul className="grid gap-6">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/berattelser/${s.id}`} className="block group">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-mono text-xs text-ink-faint tabular-nums">
                        {formatVolumeRef(s.volume, s.chapter)}
                      </span>
                      <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember">
                        {s.title}
                      </h3>
                    </div>
                    <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft">
                      {excerpt(s.body, 28)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <nav className="border-t border-ink/10 max-w-prose mx-auto px-6 py-10 grid grid-cols-2 gap-6 print:hidden">
        {prev ? (
          <Link href={`/berattelser/${prev.id}`} className="group">
            <div className="font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
              ← Föregående
            </div>
            <div className="font-display font-medium text-ink-soft group-hover:text-ember">
              {prev.title}
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link href={`/berattelser/${next.id}`} className="group text-right">
            <div className="font-sans text-xs uppercase tracking-wider text-ink-muted mb-1">
              Nästa →
            </div>
            <div className="font-display font-medium text-ink-soft group-hover:text-ember">
              {next.title}
            </div>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </article>
  );
}
