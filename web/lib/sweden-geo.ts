import { promises as fs } from "node:fs";
import path from "node:path";

export type SwedenFeature = {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
};

export type SwedenGeoJson = {
  type: "FeatureCollection";
  features: SwedenFeature[];
};

let _cached: SwedenGeoJson | null = null;

export async function getSwedenGeoJson(): Promise<SwedenGeoJson | null> {
  if (_cached) return _cached;
  const file = path.join(
    process.cwd(),
    "public",
    "sweden-municipalities.geojson",
  );
  try {
    const raw = await fs.readFile(file, "utf-8");
    _cached = JSON.parse(raw);
    return _cached;
  } catch {
    return null;
  }
}
