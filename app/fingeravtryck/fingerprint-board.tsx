"use client";
import {
  FilterModal,
  useFilterModal,
  type FilterDimension,
} from "@/components/filter-modal";

type Entries = [string, number][];

type Props = {
  stats: {
    total: number;
    vol_i: number;
    vol_ii: number;
    total_words: number;
    median_words: number;
    reading_time_minutes: number;
  };
  stories: Parameters<typeof useFilterModal>[0];
  roleCounts: Entries;
  stadiumCounts: Entries;
  themeCounts: Entries;
  diagCounts: Entries;
  sentimentCounts: Entries;
  critiqueCounts: Entries;
  proposalCounts: Entries;
  geoCounts: Entries;
  volumeDiff: { theme: string; pi: number; pii: number; delta: number }[];
  wordLengthBuckets: Entries;
  topWords: [string, number][];
  vocabSize: number;
  totalTokens: number;
};

export function FingerprintBoard(props: Props) {
  const { state, open, close, matched } = useFilterModal(props.stories);

  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Fingeravtryck
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-4">
          Korpusens vågrörelser
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          {props.stats.total.toLocaleString("sv-SE")} berättelser om svenska
          skolan. Det här är vad de pratar om — i siffror. Klicka på en stapel
          för att läsa de berättelser som ligger bakom siffran.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-12 mb-20">
        <BigStatBox
          label="Berättelser"
          value={props.stats.total.toLocaleString("sv-SE")}
          sub={`${props.stats.vol_i} i Volym I · ${props.stats.vol_ii} i Volym II`}
        />
        <BigStatBox
          label="Ord, totalt"
          value={props.stats.total_words.toLocaleString("sv-SE")}
          sub={`Median ${props.stats.median_words.toLocaleString("sv-SE")} ord per berättelse`}
        />
        <BigStatBox
          label="Lästid"
          value={`${Math.round(props.stats.reading_time_minutes / 60)}h`}
          sub="≈ en lärares reglerade arbetsvecka"
        />
      </section>

      <SectionTitle eyebrow="Röster" title="Vem berättar?" />
      <BarChart entries={props.roleCounts} dimension="role" onClick={open} className="mb-16" />

      <SectionTitle eyebrow="Stadium" title="Vilket stadium handlar det om?" />
      <BarChart entries={props.stadiumCounts} dimension="stadium" onClick={open} className="mb-16" />

      <SectionTitle eyebrow="Tonläge" title="Hur låter rösterna?" />
      <BarChart entries={props.sentimentCounts} dimension="sentiment" onClick={open} className="mb-16" />

      <SectionTitle
        eyebrow="Återkommande mönster"
        title="De mest omtalade temana"
      />
      <BarChart
        entries={props.themeCounts}
        dimension="theme"
        onClick={open}
        max={25}
        className="mb-16"
      />

      <SectionTitle eyebrow="Diagnoser och tillstånd" title="Vad nämns?" />
      <BarChart entries={props.diagCounts} dimension="diagnosis" onClick={open} max={20} className="mb-16" />

      <SectionTitle eyebrow="Plats" title="Var berättas det ifrån?" />
      <BarChart entries={props.geoCounts} dimension="geo" onClick={open} max={20} className="mb-16" />

      <SectionTitle eyebrow="Längd" title="Berättelse-längd i ord" />
      <BarChart entries={props.wordLengthBuckets} className="mb-16" />

      <SectionTitle eyebrow="Systemkritik" title="Vad kritiseras?" />
      <BarChart
        entries={props.critiqueCounts.filter((e) => e[1] >= 2)}
        dimension="critique"
        onClick={open}
        max={20}
        className="mb-16"
      />

      <SectionTitle eyebrow="Förslag" title="Vad föreslås?" />
      <BarChart
        entries={props.proposalCounts.filter((e) => e[1] >= 2)}
        dimension="proposal"
        onClick={open}
        max={20}
        className="mb-16"
      />

      {props.topWords.length > 0 && (
        <>
          <SectionTitle
            eyebrow="Vokabulär"
            title="De mest använda innehållsorden"
          />
          <p className="font-serif text-ink-soft mb-6 max-w-prose">
            {props.vocabSize.toLocaleString("sv-SE")} unika ord (efter
            stoppords-filter), {props.totalTokens.toLocaleString("sv-SE")}{" "}
            innehållsords-tokens totalt. De femtio mest använda:
          </p>
          <WordCloud words={props.topWords} />
        </>
      )}

      <FilterModal
        open={state !== null}
        onClose={close}
        dimension={state?.dimension ?? "theme"}
        value={state?.value ?? ""}
        stories={matched}
      />
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-6">
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-1">
        {eyebrow}
      </p>
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
    </header>
  );
}

function BigStatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-l-2 border-ember/40 pl-6">
      <div className="font-sans text-xs uppercase tracking-wider text-ink-muted mb-2">
        {label}
      </div>
      <div className="font-display text-5xl font-semibold tabular-nums leading-none mb-2">
        {value}
      </div>
      <div className="font-serif italic text-sm text-ink-muted">{sub}</div>
    </div>
  );
}

function BarChart({
  entries,
  max,
  dimension,
  onClick,
  className = "",
}: {
  entries: Entries;
  max?: number;
  dimension?: FilterDimension;
  onClick?: (dim: FilterDimension, value: string) => void;
  className?: string;
}) {
  const top = max ? entries.slice(0, max) : entries;
  const peak = top[0]?.[1] ?? 1;
  const clickable = !!(dimension && onClick);

  return (
    <ul className={`space-y-2 max-w-3xl ${className}`}>
      {top.map(([label, n]) => {
        const w = (n / peak) * 100;
        const inner = (
          <>
            <span className="font-sans text-sm text-ink w-32 sm:w-44 shrink-0 truncate text-left">
              {label}
            </span>
            <div className="flex-1 h-5 bg-paper-deep rounded-sm overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-ember/70 group-hover:bg-ember transition-colors" style={{ width: `${w}%` }} />
            </div>
            <span className="font-mono text-xs text-ink-muted tabular-nums w-12 text-right">
              {n.toLocaleString("sv-SE")}
            </span>
          </>
        );
        if (clickable) {
          return (
            <li key={label}>
              <button
                onClick={() => onClick!(dimension!, label)}
                className="flex items-center gap-3 w-full group cursor-pointer hover:[&_span]:text-ember"
                title={`Visa ${n} berättelse${n === 1 ? "" : "r"}`}
              >
                {inner}
              </button>
            </li>
          );
        }
        return (
          <li key={label} className="flex items-center gap-3">
            {inner}
          </li>
        );
      })}
    </ul>
  );
}

function DiffTable({
  rows,
  onClick,
}: {
  rows: { theme: string; pi: number; pii: number; delta: number }[];
  onClick?: (theme: string) => void;
}) {
  return (
    <table className="font-sans text-sm max-w-3xl w-full">
      <thead className="border-b border-ink/15">
        <tr className="text-left text-xs uppercase tracking-wider text-ink-muted">
          <th className="py-2">Tema</th>
          <th className="py-2 text-right tabular-nums">Vol I</th>
          <th className="py-2 text-right tabular-nums">Vol II</th>
          <th className="py-2 text-right tabular-nums">Δ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/10">
        {rows.map((r) => (
          <tr key={r.theme}>
            <td className="py-2.5">
              {onClick ? (
                <button onClick={() => onClick(r.theme)} className="hover:text-ember text-left">
                  {r.theme}
                </button>
              ) : (
                r.theme
              )}
            </td>
            <td className="py-2.5 text-right tabular-nums">
              {(r.pi * 100).toFixed(1)}%
            </td>
            <td className="py-2.5 text-right tabular-nums">
              {(r.pii * 100).toFixed(1)}%
            </td>
            <td className={`py-2.5 text-right tabular-nums font-medium ${r.delta >= 0 ? "text-ember" : "text-ink-muted"}`}>
              {r.delta >= 0 ? "+" : ""}
              {(r.delta * 100).toFixed(1)} pp
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function WordCloud({ words }: { words: [string, number][] }) {
  const peak = words[0]?.[1] ?? 1;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-baseline max-w-4xl">
      {words.map(([w, n]) => {
        const scale = 0.8 + (n / peak) * 1.6;
        return (
          <span
            key={w}
            className="font-display text-ink"
            style={{ fontSize: `${scale}rem`, lineHeight: 1.2 }}
            title={`${n.toLocaleString("sv-SE")} förekomster`}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}
