import { readJsonCached } from "./data";

export type Story = {
  id: string;
  volume: "i" | "ii";
  volume_label: string;
  chapter: number;
  title: string;
  body: string;
  signature: string | null;
  word_count: number;
};

export type Role =
  | "lärare"
  | "förälder"
  | "elev"
  | "skolledare"
  | "specialpedagog"
  | "förskollärare"
  | "annan";

export type Stadium =
  | "förskola"
  | "förskoleklass"
  | "lågstadiet"
  | "mellanstadiet"
  | "högstadiet"
  | "gymnasiet"
  | "vuxenutbildning"
  | "övergripande";

export type Sentiment =
  | "förtvivlad"
  | "frustrerad"
  | "saklig"
  | "hoppfull"
  | "kritisk";

export type EnrichedMeta = {
  id: string;
  role?: Role | null;
  stadium?: Stadium | null;
  themes?: string[];
  sentiment?: Sentiment | null;
  geo_hint?: string | null;
  diagnoses_mentioned?: string[];
  system_critique?: string[];
  concrete_proposals?: string[];
  pull_quote?: string | null;
};

export type CombinedStory = Story & { meta?: EnrichedMeta };

export type CorpusStats = {
  total: number;
  vol_i: number;
  vol_ii: number;
  total_words: number;
  median_words: number;
  reading_time_minutes: number;
  signed: number;
  with_meta: number;
};

let _index: {
  stories: CombinedStory[];
  byId: Map<string, CombinedStory>;
  positionById: Map<string, number>;
  stats: CorpusStats;
} | null = null;

async function loadIndex() {
  if (_index) return _index;
  const [stories, enriched] = await Promise.all([
    readJsonCached<Story[]>("stories.json", []),
    readJsonCached<EnrichedMeta[]>("enriched.json", []),
  ]);
  const metaById = new Map(enriched.map((m) => [m.id, m]));
  const combined: CombinedStory[] = stories.map((s) => ({ ...s, meta: metaById.get(s.id) }));

  const byId = new Map<string, CombinedStory>();
  const positionById = new Map<string, number>();
  let totalWords = 0;
  let signed = 0;
  let withMeta = 0;
  let volI = 0;
  let volII = 0;
  const wcs: number[] = new Array(combined.length);
  for (let i = 0; i < combined.length; i++) {
    const s = combined[i];
    byId.set(s.id, s);
    positionById.set(s.id, i);
    wcs[i] = s.word_count;
    totalWords += s.word_count;
    if (s.signature) signed++;
    if (s.meta) withMeta++;
    if (s.volume === "i") volI++;
    else volII++;
  }
  wcs.sort((a, b) => a - b);
  const median = wcs.length ? wcs[Math.floor(wcs.length / 2)] : 0;
  const stats: CorpusStats = {
    total: combined.length,
    vol_i: volI,
    vol_ii: volII,
    total_words: totalWords,
    median_words: median,
    reading_time_minutes: Math.round(totalWords / 200),
    signed,
    with_meta: withMeta,
  };
  _index = { stories: combined, byId, positionById, stats };
  return _index;
}

export async function getStories(): Promise<CombinedStory[]> {
  return (await loadIndex()).stories;
}

export async function getStory(id: string): Promise<CombinedStory | null> {
  const idx = await loadIndex();
  return idx.byId.get(id) ?? null;
}

export async function getStoryWithNeighbors(id: string) {
  const idx = await loadIndex();
  const story = idx.byId.get(id);
  if (!story) return null;
  const pos = idx.positionById.get(id)!;
  return {
    story,
    prev: pos > 0 ? idx.stories[pos - 1] : null,
    next: pos < idx.stories.length - 1 ? idx.stories[pos + 1] : null,
  };
}

export async function getStats(): Promise<CorpusStats> {
  return (await loadIndex()).stats;
}

// Re-export formatting helpers for backwards compatibility with server components.
export { formatVolumeRef, excerpt } from "./format";
