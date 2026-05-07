import { getStories, getStats, type CombinedStory } from "@/lib/stories";
import { getCorpusStats } from "@/lib/extras";
import { aggArr, countBy } from "@/lib/stats";
import { FingerprintBoard } from "./fingerprint-board";

export const metadata = {
  title: "Korpusens fingeravtryck — Berättelser från skolan",
  description: "Återkommande mönster i 615 berättelser från svenska skolan.",
};

export default async function FingerprintPage() {
  const [stories, stats, corpus] = await Promise.all([
    getStories(),
    getStats(),
    getCorpusStats(),
  ]);

  const roleCounts = mapToEntries(countBy(stories, (s) => s.meta?.role));
  const stadiumCounts = mapToEntries(countBy(stories, (s) => s.meta?.stadium));
  const themeCounts = mapToEntries(aggArr(stories, (s) => s.meta?.themes ?? []));
  const diagCounts = mapToEntries(
    aggArr(stories, (s) => s.meta?.diagnoses_mentioned ?? []),
  );
  const sentimentCounts = mapToEntries(countBy(stories, (s) => s.meta?.sentiment));
  const critiqueCounts = mapToEntries(
    aggArr(stories, (s) => s.meta?.system_critique ?? []),
  );
  const proposalCounts = mapToEntries(
    aggArr(stories, (s) => s.meta?.concrete_proposals ?? []),
  );
  const geoCounts = mapToEntries(countBy(stories, (s) => s.meta?.geo_hint));

  const volI = stories.filter((s) => s.volume === "i");
  const volII = stories.filter((s) => s.volume === "ii");
  const themesI = aggArr(volI, (s) => s.meta?.themes ?? []);
  const themesII = aggArr(volII, (s) => s.meta?.themes ?? []);
  const allThemes = new Set([...themesI.keys(), ...themesII.keys()]);
  const diff = [...allThemes]
    .map((theme) => {
      const pi = (themesI.get(theme) ?? 0) / Math.max(volI.length, 1);
      const pii = (themesII.get(theme) ?? 0) / Math.max(volII.length, 1);
      return { theme, pi, pii, delta: pii - pi };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const wordLengthBuckets = bucketize(
    stories.map((s) => s.word_count),
    [50, 200, 500, 1000, 2000, 4000, Infinity],
  );

  // Slim story records for client-side modal lookups
  const storyRecords = stories.map((s) => ({
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
  }));

  return (
    <FingerprintBoard
      stats={stats}
      stories={storyRecords}
      roleCounts={roleCounts}
      stadiumCounts={stadiumCounts}
      themeCounts={themeCounts}
      diagCounts={diagCounts}
      sentimentCounts={sentimentCounts}
      critiqueCounts={critiqueCounts}
      proposalCounts={proposalCounts}
      geoCounts={geoCounts}
      volumeDiff={diff}
      wordLengthBuckets={wordLengthBuckets}
      topWords={corpus?.top_words.slice(0, 50) ?? []}
      vocabSize={corpus?.vocab_size ?? 0}
      totalTokens={corpus?.total_tokens ?? 0}
    />
  );
}

function mapToEntries(m: Map<string | null | undefined, number>): [string, number][] {
  const out: [string, number][] = [];
  for (const [k, v] of m) {
    if (k != null && k !== "") out.push([k as string, v]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

function bucketize(values: number[], thresholds: number[]): [string, number][] {
  const labels: [string, number][] = [];
  let prev = 0;
  for (const t of thresholds) {
    const n = values.filter((v) => v > prev && v <= t).length;
    const label = t === Infinity ? `${prev}+ ord` : `${prev}–${t} ord`;
    labels.push([label, n]);
    prev = t;
  }
  return labels;
}
