import type { MetadataRoute } from "next";
import { getStories } from "@/lib/stories";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await getStories();
  const today = new Date();
  const staticRoutes = [
    "",
    "/berattelser",
    "/teman",
    "/citatmur",
    "/karta",
    "/tidslinje",
    "/fingeravtryck",
    "/sok",
    "/om",
  ];
  return [
    ...staticRoutes.map((p) => ({
      url: `${BASE}${p}`,
      lastModified: today,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1.0 : 0.7,
    })),
    ...stories.map((s) => ({
      url: `${BASE}/berattelser/${s.id}`,
      lastModified: today,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
