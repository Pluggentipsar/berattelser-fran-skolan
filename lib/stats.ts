/** Count occurrences of a single key per item. Null/undefined keys preserved. */
export function countBy<T>(
  arr: readonly T[],
  key: (x: T) => string | undefined | null,
): Map<string | undefined | null, number> {
  const m = new Map<string | undefined | null, number>();
  for (const x of arr) {
    const k = key(x);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Aggregate counts when each item exposes an array of keys (e.g. themes). */
export function aggArr<T>(arr: readonly T[], key: (x: T) => readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of arr) for (const k of key(x)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}
