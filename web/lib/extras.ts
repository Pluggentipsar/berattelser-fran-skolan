import { readJsonCached } from "./data";

export type SimilarRow = { id: string; similar: { id: string; score: number }[] };
export type Kommun = {
  code: string;
  name: string;
  official_name?: string;
  full_name: string;
  region: string;
  population: number | null;
  lat: number;
  lng: number;
};
export type VocabularyStats = {
  vocab_size: number;
  top_words: [string, number][];
  total_tokens: number;
};

let _similarMap: Map<string, SimilarRow> | null = null;

export async function getSimilar(): Promise<Map<string, SimilarRow>> {
  if (_similarMap) return _similarMap;
  const arr = await readJsonCached<SimilarRow[]>("similar.json", []);
  _similarMap = new Map(arr.map((r) => [r.id, r]));
  return _similarMap;
}

export async function getKommuner(): Promise<Kommun[]> {
  return readJsonCached<Kommun[]>("kommuner.json", []);
}

export async function getCorpusStats(): Promise<VocabularyStats | null> {
  const v = await readJsonCached<VocabularyStats | null>("corpus_stats.json", null);
  return v;
}
