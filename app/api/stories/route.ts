import { NextRequest, NextResponse } from "next/server";
import { getStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const stadium = searchParams.get("stadium");
  const theme = searchParams.get("theme");
  const volume = searchParams.get("volume");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200"), 1000);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const all = await getStories();
  const matched = all.filter((s) => {
    if (volume && s.volume !== volume) return false;
    if (role && s.meta?.role !== role) return false;
    if (stadium && s.meta?.stadium !== stadium) return false;
    if (theme && !(s.meta?.themes ?? []).includes(theme)) return false;
    return true;
  });

  const slice = matched.slice(offset, offset + limit).map((s) => ({
    id: s.id,
    volume: s.volume,
    chapter: s.chapter,
    title: s.title,
    body: s.body,
    signature: s.signature,
    word_count: s.word_count,
    meta: s.meta,
    url: `/berattelser/${s.id}`,
  }));

  return NextResponse.json({
    total: matched.length,
    offset,
    limit,
    results: slice,
  });
}
