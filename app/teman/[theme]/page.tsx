import Link from "next/link";
import { notFound } from "next/navigation";
import { getStories, excerpt } from "@/lib/stories";

export async function generateStaticParams() {
  const stories = await getStories();
  const themes = new Set<string>();
  for (const s of stories) for (const t of s.meta?.themes ?? []) themes.add(t);
  return [...themes].map((theme) => ({ theme: encodeURIComponent(theme) }));
}

export default async function ThemePage({
  params,
}: {
  params: Promise<{ theme: string }>;
}) {
  const { theme } = await params;
  const decoded = decodeURIComponent(theme);
  const stories = await getStories();
  const matched = stories.filter((s) => s.meta?.themes?.includes(decoded));
  if (matched.length === 0) notFound();

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <Link
        href="/teman"
        className="font-sans text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        ← Alla teman
      </Link>
      <header className="mt-6 mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Tema
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          {decoded}
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {matched.length.toLocaleString("sv-SE")} berättelser berör temat.
        </p>
      </header>

      <ol className="divide-y divide-ink/10 max-w-3xl">
        {matched.map((s) => (
          <li key={s.id}>
            <Link
              href={`/berattelser/${s.id}`}
              className="block py-5 group"
            >
              <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-ember">
                {s.title}
              </h3>
              <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft mt-1.5">
                {excerpt(s.body, 36)}
              </p>
              {s.signature && (
                <p className="font-serif italic text-sm text-ink-muted mt-1.5">
                  — {s.signature}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
