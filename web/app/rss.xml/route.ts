import { getStories } from "@/lib/stories";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const dynamic = "force-static";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const stories = await getStories();
  const items = stories
    .slice()
    .sort((a, b) => {
      if (a.volume !== b.volume) return b.volume.localeCompare(a.volume);
      return b.chapter - a.chapter;
    })
    .slice(0, 50)
    .map((s) => {
      const link = `${BASE}/berattelser/${s.id}`;
      const desc = s.meta?.pull_quote ?? s.body.slice(0, 280);
      return `    <item>
      <title>${escapeXml(s.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Berättelser från skolan</title>
    <link>${BASE}</link>
    <description>En samtidsskildring från svenska skolan. ${stories.length} röster, ordagrant.</description>
    <language>sv</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
