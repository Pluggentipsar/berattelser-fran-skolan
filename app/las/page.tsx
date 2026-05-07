import { getStories, getStats } from "@/lib/stories";
import { BookReader } from "./book-reader";

export const metadata = {
  title: "Läsläge — Berättelser från skolan",
  description:
    "Läs hela samlingen från första till sista berättelse, som boken är skriven. Distraktionsfritt med valfri uppläsning.",
};

export default async function ReadAllPage() {
  const [stories, stats] = await Promise.all([getStories(), getStats()]);

  // Slim payload — only what reader needs
  const items = stories.map((s) => ({
    id: s.id,
    volume: s.volume,
    chapter: s.chapter,
    title: s.title,
    body: s.body,
    signature: s.signature,
    role: s.meta?.role ?? null,
    pull_quote: s.meta?.pull_quote ?? null,
    word_count: s.word_count,
  }));

  return <BookReader items={items} totalWords={stats.total_words} />;
}
