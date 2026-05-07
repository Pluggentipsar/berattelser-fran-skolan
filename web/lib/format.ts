// Pure formatting helpers — safe to import from both server and client components.

/** Short volume reference label like "I·12" / "II·240". */
export function formatVolumeRef(volume: "i" | "ii", chapter: number): string {
  return `${volume === "i" ? "I" : "II"}·${chapter}`;
}

/** First-N-words excerpt with ellipsis. */
export function excerpt(body: string, words = 40): string {
  const tokens = body.split(/\s+/);
  if (tokens.length <= words) return tokens.join(" ");
  return tokens.slice(0, words).join(" ") + "…";
}
