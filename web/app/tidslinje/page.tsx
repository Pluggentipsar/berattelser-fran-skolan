import Link from "next/link";
import { readJsonCached } from "@/lib/data";

type YearRow = {
  id: string;
  title: string;
  years: { year: number; contexts: string[] }[];
};

type Mention = { id: string; title: string; ctx: string };

export default async function TimelinePage() {
  const years = await readJsonCached<YearRow[]>("years.json", []);

  const byYear = new Map<number, Mention[]>();
  for (const r of years) {
    for (const ye of r.years) {
      const arr = byYear.get(ye.year) ?? [];
      for (const c of ye.contexts) arr.push({ id: r.id, title: r.title, ctx: c });
      byYear.set(ye.year, arr);
    }
  }
  const allYears = [...byYear.keys()].sort((a, b) => a - b);
  const minY = allYears[0] ?? 1990;
  const maxY = allYears[allYears.length - 1] ?? 2026;
  let peak = 1;
  for (const arr of byYear.values()) if (arr.length > peak) peak = arr.length;

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Tidslinje
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          När hände det?
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Berättelserna sträcker sig över decennier. Här är de år som nämns
          ordagrant, med ett klick fram till källan. Höjden visar hur många
          gånger året refereras.
        </p>
      </header>

      <YearAxis
        years={allYears}
        byYear={byYear}
        minY={minY}
        maxY={maxY}
        peak={peak}
      />

      <section className="mt-16 space-y-12">
        {[...allYears].reverse().map((y) => {
          const mentions = byYear.get(y)!;
          return (
            <article key={y} id={`y${y}`} className="grid lg:grid-cols-[120px_1fr] gap-6 scroll-mt-24">
              <div>
                <div className="font-display text-4xl font-semibold tabular-nums text-ember">
                  {y}
                </div>
                <div className="font-sans text-sm text-ink-muted">
                  {mentions.length} omnämnande{mentions.length === 1 ? "" : "n"}
                </div>
              </div>
              <ul className="space-y-4 border-l-2 border-ember/40 pl-6">
                {mentions.slice(0, 8).map((m, i) => (
                  <li key={i}>
                    <Link
                      href={`/berattelser/${m.id}`}
                      className="font-display text-base font-medium text-ink hover:text-ember"
                    >
                      {m.title}
                    </Link>
                    <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft mt-1 italic">
                      {m.ctx}
                    </p>
                  </li>
                ))}
                {mentions.length > 8 && (
                  <li className="font-serif italic text-sm text-ink-muted">
                    + {mentions.length - 8} fler omnämnanden
                  </li>
                )}
              </ul>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function YearAxis({
  years,
  byYear,
  minY,
  maxY,
  peak,
}: {
  years: number[];
  byYear: Map<number, unknown[]>;
  minY: number;
  maxY: number;
  peak: number;
}) {
  return (
    <div className="border border-ink/10 bg-paper-warm rounded-sm p-6 overflow-x-auto">
      <div className="relative h-40 min-w-[800px]">
        {Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i).map((y) => {
          const n = byYear.get(y)?.length ?? 0;
          const left = ((y - minY) / Math.max(maxY - minY, 1)) * 100;
          const h = n > 0 ? Math.max(6, (n / peak) * 130) : 0;
          return (
            <a
              key={y}
              href={`#y${y}`}
              className="absolute bottom-6 group"
              style={{ left: `${left}%`, transform: "translateX(-50%)" }}
            >
              {n > 0 && (
                <div
                  className="w-2.5 bg-ember/70 group-hover:bg-ember transition-colors rounded-t"
                  style={{ height: h }}
                />
              )}
              {(y % 5 === 0 || y === minY || y === maxY) && (
                <div className="absolute -bottom-6 -translate-x-1/2 left-1/2 font-mono text-xs text-ink-muted">
                  {y}
                </div>
              )}
              <div className="absolute opacity-0 group-hover:opacity-100 -top-7 -translate-x-1/2 left-1/2 bg-ink text-paper px-2 py-0.5 rounded text-xs whitespace-nowrap pointer-events-none">
                {y}: {n}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
