/** Deterministic Fisher-Yates shuffle, returning a new array. */
export function shuffleSeeded<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed | 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
