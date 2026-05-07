import { ImageResponse } from "next/og";
import { getStory } from "@/lib/stories";

export const dynamic = "force-static";

const FORMATS = {
  square: { width: 1080, height: 1080 },
  landscape: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
} as const;

type Format = keyof typeof FORMATS;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const fmtParam = url.searchParams.get("fmt") ?? "square";
  const fmt: Format = (Object.keys(FORMATS) as Format[]).includes(fmtParam as Format)
    ? (fmtParam as Format)
    : "square";
  const dims = FORMATS[fmt];

  const story = await getStory(id);
  if (!story) {
    return new Response("Not found", { status: 404 });
  }

  const quote =
    story.meta?.pull_quote ??
    story.body.slice(0, 220).replace(/\s+/g, " ").trim() + "…";

  const isPortrait = fmt === "portrait";
  const isSquare = fmt === "square";

  const padding = isPortrait ? 80 : isSquare ? 80 : 70;
  const eyebrowSize = isPortrait ? 22 : isSquare ? 22 : 18;
  const quoteSize = isPortrait ? 56 : isSquare ? 50 : 38;
  const titleSize = isPortrait ? 26 : isSquare ? 24 : 20;
  const sigSize = isPortrait ? 22 : isSquare ? 20 : 18;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#faf6ee",
          padding,
          fontFamily: "Georgia, serif",
          color: "#1a1814",
          position: "relative",
        }}
      >
        {/* eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: eyebrowSize,
            color: "#c2410c",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontWeight: 700,
          }}
        >
          <span>Berättelser från skolan</span>
        </div>

        {/* main quote */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            marginTop: padding * 0.4,
            marginBottom: padding * 0.3,
          }}
        >
          <div
            style={{
              fontSize: quoteSize,
              lineHeight: 1.25,
              fontStyle: "italic",
              color: "#1a1814",
              borderLeft: "4px solid #c2410c",
              paddingLeft: padding * 0.5,
              fontWeight: 400,
              display: "flex",
            }}
          >
            &ldquo;{quote.length > 320 ? quote.slice(0, 320) + "…" : quote}&rdquo;
          </div>
        </div>

        {/* footer: title + signature */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderTop: "1px solid rgba(26,24,20,0.15)",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 600,
              color: "#3a342c",
              display: "flex",
            }}
          >
            Ur &ldquo;{story.title}&rdquo;
          </div>
          <div
            style={{
              fontSize: sigSize,
              color: "#6b6155",
              marginTop: 6,
              display: "flex",
              gap: 14,
              alignItems: "baseline",
            }}
          >
            {story.signature && <span style={{ fontStyle: "italic" }}>— {story.signature}</span>}
            {story.meta?.role && (
              <span style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontSize: sigSize - 4, color: "#a39988" }}>
                {story.meta.role}
              </span>
            )}
            <span style={{ marginLeft: "auto", fontSize: sigSize - 2, color: "#a39988" }}>
              Volym {story.volume === "i" ? "I" : "II"} · Kapitel {story.chapter}
            </span>
          </div>
        </div>
      </div>
    ),
    dims,
  );
}
