import { promises as fs } from "node:fs";
import path from "node:path";

// Data lives at <repo-root>/data/, alongside package.json. process.cwd() is
// the project root during both `next dev` and `next build`.
export const DATA_DIR = path.join(process.cwd(), "data");

const cache = new Map<string, unknown>();

/** Read a JSON file from data/ once per process and cache the result. */
export async function readJsonCached<T>(filename: string, fallback: T): Promise<T> {
  if (cache.has(filename)) return cache.get(filename) as T;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
    const parsed = JSON.parse(raw) as T;
    cache.set(filename, parsed);
    return parsed;
  } catch {
    cache.set(filename, fallback);
    return fallback;
  }
}
