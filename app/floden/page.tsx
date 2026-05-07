import { getStories, type CombinedStory } from "@/lib/stories";
import { FlowsClient } from "./flows-client";

export const metadata = {
  title: "Flöden — Berättelser från skolan",
  description:
    "Hur kopplar problem och lösningar ihop sig? Sankey-vy över rösternas väg från vem som drabbas till vad som föreslås.",
};

const TOP_N_NODES = 12;
const MIN_FLOW = 2;

export default async function FlowsPage() {
  const stories = await getStories();
  const dataset = buildAllFlows(stories);
  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-10 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Flöden
        </p>
        <h1
          className="font-display text-4xl md:text-5xl font-semibold tracking-tightest leading-[1.05] mb-4"
          style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
        >
          Från problem till lösning.
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Hur ofta kopplas en viss kritik till ett visst förslag i samma
          berättelse? Vilka röster bär vilka erfarenheter? Sankey-flöden gör
          mönstren synliga. Hovra över ett band för att se kopplingen, klicka
          för att läsa berättelserna.
        </p>
      </header>
      <FlowsClient dataset={dataset} />
    </div>
  );
}

type FlowKey = "role" | "stadium" | "sentiment" | "critique" | "proposal";

type Flow = { from: string; to: string; count: number; storyIds: string[] };

type FlowDataset = {
  flows: Record<string, Flow[]>; // key: `${from}->${to}` like "role->critique"
};

function buildAllFlows(stories: CombinedStory[]): FlowDataset {
  const pairs: [FlowKey, FlowKey][] = [
    ["role", "stadium"],
    ["role", "critique"],
    ["role", "proposal"],
    ["stadium", "critique"],
    ["critique", "proposal"],
  ];
  const flows: Record<string, Flow[]> = {};
  for (const [from, to] of pairs) {
    flows[`${from}->${to}`] = aggregateFlows(stories, from, to);
  }
  return { flows };
}

function valuesFor(s: CombinedStory, k: FlowKey): string[] {
  switch (k) {
    case "role":
      return s.meta?.role ? [s.meta.role] : [];
    case "stadium":
      return s.meta?.stadium ? [s.meta.stadium] : [];
    case "sentiment":
      return s.meta?.sentiment ? [s.meta.sentiment] : [];
    case "critique":
      return s.meta?.system_critique ?? [];
    case "proposal":
      return s.meta?.concrete_proposals ?? [];
  }
}

function aggregateFlows(
  stories: CombinedStory[],
  from: FlowKey,
  to: FlowKey,
): Flow[] {
  // Pick top-N values per axis for cleaner viz
  const fromCounts = new Map<string, number>();
  const toCounts = new Map<string, number>();
  for (const s of stories) {
    for (const f of valuesFor(s, from)) fromCounts.set(f, (fromCounts.get(f) ?? 0) + 1);
    for (const t of valuesFor(s, to)) toCounts.set(t, (toCounts.get(t) ?? 0) + 1);
  }
  const topFrom = new Set(
    [...fromCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_NODES).map(([k]) => k),
  );
  const topTo = new Set(
    [...toCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_NODES).map(([k]) => k),
  );

  const map = new Map<string, Flow>();
  for (const s of stories) {
    const fs = valuesFor(s, from).filter((v) => topFrom.has(v));
    const ts = valuesFor(s, to).filter((v) => topTo.has(v));
    for (const a of fs) {
      for (const b of ts) {
        const key = `${a}|||${b}`;
        let f = map.get(key);
        if (!f) {
          f = { from: a, to: b, count: 0, storyIds: [] };
          map.set(key, f);
        }
        f.count++;
        f.storyIds.push(s.id);
      }
    }
  }
  return [...map.values()].filter((f) => f.count >= MIN_FLOW).sort((a, b) => b.count - a.count);
}
