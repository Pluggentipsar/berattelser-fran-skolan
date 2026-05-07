import { getStory } from "@/lib/stories";

export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const s = await getStory(id);
  if (!s) return new Response("Not found", { status: 404 });

  const quote =
    s.meta?.pull_quote ??
    s.body.slice(0, 240).replace(/\s+/g, " ").trim() + "…";
  const sourceUrl = `${BASE}/berattelser/${s.id}`;
  const role = s.meta?.role ?? "";
  const stadium = s.meta?.stadium ?? "";
  const sig = s.signature ?? "";

  const html = `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(s.title)} — citat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@500&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light }
    *, *::before, *::after { box-sizing: border-box }
    html, body { margin: 0; padding: 0 }
    body {
      font-family: 'Fraunces', Georgia, serif;
      background: #faf6ee;
      color: #1a1814;
      padding: 28px 32px;
      line-height: 1.4;
    }
    .eyebrow {
      font-family: 'Inter', sans-serif;
      font-size: 11px; letter-spacing: 0.2em;
      text-transform: uppercase; color: #c2410c;
      font-weight: 600; margin-bottom: 12px;
    }
    .quote {
      font-size: 22px; font-weight: 500; color: #3a342c;
      font-variation-settings: "opsz" 60;
      margin: 0 0 18px 0;
      border-left: 3px solid #c2410c;
      padding-left: 18px;
    }
    .meta {
      font-family: 'Inter', sans-serif; font-size: 12px;
      color: #6b6155; display: flex; gap: 8px;
      align-items: baseline; flex-wrap: wrap;
    }
    .source { margin-left: auto; color: #6b6155; text-decoration: none }
    .source:hover { color: #c2410c }
  </style>
</head>
<body>
  <div class="eyebrow">Berättelser från skolan</div>
  <p class="quote">&ldquo;${escapeHtml(quote)}&rdquo;</p>
  <div class="meta">
    ${role ? `<span>${escapeHtml(role)}</span>` : ""}
    ${role && stadium ? "<span>·</span>" : ""}
    ${stadium ? `<span>${escapeHtml(stadium)}</span>` : ""}
    ${sig ? `<span>· ${escapeHtml(sig)}</span>` : ""}
    <a class="source" href="${escapeHtml(sourceUrl)}" target="_top">Ur &ldquo;${escapeHtml(s.title)}&rdquo; →</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
