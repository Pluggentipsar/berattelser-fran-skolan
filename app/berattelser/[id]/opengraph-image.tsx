import { ImageResponse } from "next/og";
import { getStory } from "@/lib/stories";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { id: string } }) {
  const story = await getStory(params.id);
  if (!story) {
    return new ImageResponse(<div>Not found</div>, size);
  }

  const quote =
    story.meta?.pull_quote ??
    story.body.slice(0, 220).replace(/\s+/g, " ").trim();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#faf6ee",
          padding: "70px 80px",
          fontFamily: "Georgia, serif",
          color: "#1a1814",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            color: "#c2410c",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontWeight: 600,
          }}
        >
          <span>Berättelser från skolan</span>
          <span style={{ color: "#a39988" }}>·</span>
          <span style={{ color: "#6b6155" }}>
            {story.volume_label} · Nr {story.chapter}
          </span>
        </div>

        <div
          style={{
            fontSize: 56,
            lineHeight: 1.05,
            fontWeight: 600,
            marginTop: 30,
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          {story.title}
        </div>

        <div
          style={{
            fontSize: 30,
            lineHeight: 1.45,
            fontStyle: "italic",
            color: "#3a342c",
            marginTop: "auto",
            borderLeft: "3px solid #c2410c",
            paddingLeft: 28,
            display: "flex",
          }}
        >
          &ldquo;{quote.length > 240 ? quote.slice(0, 240) + "…" : quote}&rdquo;
        </div>

        {story.signature && (
          <div
            style={{
              fontSize: 22,
              fontStyle: "italic",
              color: "#6b6155",
              marginTop: 18,
              paddingLeft: 32,
              display: "flex",
            }}
          >
            — {story.signature}
          </div>
        )}
      </div>
    ),
    size,
  );
}
