import { NextResponse } from "next/server";
import { getStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET() {
  const stories = await getStories();
  if (stories.length === 0) {
    return NextResponse.json({ id: null }, { status: 404 });
  }
  const idx = Math.floor(Math.random() * stories.length);
  return NextResponse.json({ id: stories[idx].id });
}
