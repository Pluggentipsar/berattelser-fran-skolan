import { readJsonCached } from "./data";

export type Coord = { id: string; x: number; y: number; cluster: number };
export type Cluster = {
  cluster_id: number;
  label: string;
  size: number;
  x: number;
  y: number;
  member_ids: string[];
  top_themes: string[];
};

export async function getCoords(): Promise<Coord[] | null> {
  const v = await readJsonCached<Coord[] | null>("coords.json", null);
  return v;
}

export async function getClusters(): Promise<Cluster[] | null> {
  const v = await readJsonCached<Cluster[] | null>("clusters.json", null);
  return v;
}
