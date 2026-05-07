import Link from "next/link";
import { getStories, type CombinedStory } from "@/lib/stories";
import { ProposalsBoard } from "./proposals-board";

export const metadata = {
  title: "Folklig reformagenda — Berättelser från skolan",
  description:
    "Vad föreslår de 615 rösterna gemensamt? En reformagenda byggd nedifrån — rangordnad efter frekvens och bredd över olika roller.",
};

type ProposalAggregation = {
  proposal: string;
  total: number;
  byRole: Record<string, number>;
  roleBreadth: number;
  examples: { id: string; title: string; pull_quote: string | null; role: string | null }[];
};

export default async function ReformAgendaPage() {
  const stories = await getStories();

  // Aggregate
  const map = new Map<string, ProposalAggregation>();
  for (const s of stories) {
    const proposals = s.meta?.concrete_proposals ?? [];
    const role = s.meta?.role ?? "okänd";
    for (const p of proposals) {
      let agg = map.get(p);
      if (!agg) {
        agg = { proposal: p, total: 0, byRole: {}, roleBreadth: 0, examples: [] };
        map.set(p, agg);
      }
      agg.total++;
      agg.byRole[role] = (agg.byRole[role] ?? 0) + 1;
    }
  }
  // Pick examples + compute breadth
  for (const agg of map.values()) {
    agg.roleBreadth = Object.keys(agg.byRole).filter((r) => r !== "okänd").length;
    // Pick up to 4 example stories: prefer ones with pull_quote, varied roles
    const candidates = stories
      .filter((s) => (s.meta?.concrete_proposals ?? []).includes(agg.proposal))
      .sort((a, b) => {
        // Prefer pull_quote presence
        const aq = a.meta?.pull_quote ? 0 : 1;
        const bq = b.meta?.pull_quote ? 0 : 1;
        return aq - bq;
      });
    const seenRoles = new Set<string>();
    for (const c of candidates) {
      if (agg.examples.length >= 4) break;
      const role = c.meta?.role ?? "okänd";
      // Diversify by role
      if (seenRoles.has(role) && agg.examples.length >= 2) continue;
      seenRoles.add(role);
      agg.examples.push({
        id: c.id,
        title: c.title,
        pull_quote: c.meta?.pull_quote ?? null,
        role: c.meta?.role ?? null,
      });
    }
  }

  // Filter out tiny clusters
  const proposals = [...map.values()]
    .filter((p) => p.total >= 2)
    .sort((a, b) => {
      // Combined rank: frequency × breadth weight
      // Use a score that rewards both frequency and breadth (across roles)
      const aScore = a.total + a.roleBreadth * 8;
      const bScore = b.total + b.roleBreadth * 8;
      return bScore - aScore;
    });

  const topRoles = aggregateTopRoles(stories);

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          En reformagenda byggd nedifrån
        </p>
        <h1
          className="font-display text-4xl md:text-5xl font-semibold tracking-tightest leading-[1.05] mb-6"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          Vad rösterna gemensamt föreslår.
        </h1>
        <p className="font-serif text-lg text-ink-soft mb-4">
          {proposals.length.toLocaleString("sv-SE")} konkreta förslag —
          rangordnade efter <em>frekvens</em> och{" "}
          <em>bredd över roller</em>. Ett förslag som lyfts av både lärare,
          föräldrar och elever har en annan tyngd än ett som bara en grupp tar
          upp.
        </p>
        <p className="font-serif italic text-ink-muted">
          Detta är inte en partilinje. Detta är{" "}
          {stories.length.toLocaleString("sv-SE")} människors gemensamma
          erfarenhet.
        </p>
      </header>

      <ProposalsBoard
        proposals={proposals}
        rolesInCorpus={topRoles}
      />
    </div>
  );
}

function aggregateTopRoles(stories: CombinedStory[]): string[] {
  const c = new Map<string, number>();
  for (const s of stories) {
    const r = s.meta?.role;
    if (r) c.set(r, (c.get(r) ?? 0) + 1);
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
}
