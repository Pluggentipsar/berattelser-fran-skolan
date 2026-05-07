import { getStats } from "@/lib/stories";

export const metadata = {
  title: "Ladda ner — Berättelser från skolan",
  description:
    "Båda volymerna av Berättelser från skolan att ladda ner som PDF.",
};

export default async function DownloadPage() {
  const stats = await getStats();
  return (
    <div className="max-w-wide mx-auto px-6 py-12">
      <header className="mb-12 max-w-prose">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Ladda ner
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tightest mb-4">
          Originalmaterialet, fritt att sprida.
        </h1>
        <p className="font-serif text-lg text-ink-soft">
          Båda volymerna av Berättelser från skolan finns här att ladda ner som
          PDF — exakt så som de ursprungligen publicerades. Sprid gärna, läs,
          citera, dela med beslutsfattare.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
        <DownloadCard
          title="Volym I"
          chapters={stats.vol_i}
          words={Math.round((stats.total_words * stats.vol_i) / stats.total)}
          href="/berattelser-fran-skolan-vol-1.pdf"
          fileLabel="berattelser-fran-skolan-vol-1.pdf"
          fileSize="4.6 MB"
        />
        <DownloadCard
          title="Volym II"
          chapters={stats.vol_ii}
          words={Math.round((stats.total_words * stats.vol_ii) / stats.total)}
          href="/berattelser-fran-skolan-vol-2.pdf"
          fileLabel="berattelser-fran-skolan-vol-2.pdf"
          fileSize="4.6 MB"
        />
      </div>

      <div className="mt-16 max-w-prose">
        <h2 className="font-display text-2xl font-semibold mb-4 tracking-tight">
          Användning och spridning
        </h2>
        <div className="prose-story font-serif">
          <p>
            Texterna är skrivna av lärare, förskollärare, speciallärare,
            fritidslärare, forskare, elever, studie- och yrkesvägledare,
            skolbibliotekarier, vårdnadshavare och många fler. Materialet är
            sammanställt och utgivet av Maria Wiman.
          </p>
          <p>
            Citera gärna från materialet i artiklar, debattinlägg och rapporter
            — ange "Berättelser från skolan, Volym I/II". Vi uppmuntrar att
            länka tillbaka till sajten för läsare som vill se citatet i sitt
            sammanhang.
          </p>
        </div>
      </div>
    </div>
  );
}

function DownloadCard({
  title,
  chapters,
  words,
  href,
  fileLabel,
  fileSize,
}: {
  title: string;
  chapters: number;
  words: number;
  href: string;
  fileLabel: string;
  fileSize: string;
}) {
  return (
    <article className="border border-ink/10 rounded-sm p-8 bg-paper-warm">
      <div className="flex items-baseline gap-3 mb-4">
        <h2
          className="font-display text-3xl font-semibold tracking-tight"
          style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30' }}
        >
          {title}
        </h2>
      </div>
      <dl className="font-sans text-sm text-ink-muted mb-8 space-y-1">
        <div className="flex justify-between border-b border-ink/10 pb-1">
          <dt>Berättelser</dt>
          <dd className="tabular-nums">{chapters.toLocaleString("sv-SE")}</dd>
        </div>
        <div className="flex justify-between border-b border-ink/10 pb-1">
          <dt>Ord (uppskattat)</dt>
          <dd className="tabular-nums">{words.toLocaleString("sv-SE")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Filstorlek</dt>
          <dd className="tabular-nums">{fileSize}</dd>
        </div>
      </dl>
      <a
        href={href}
        download
        className="block w-full font-sans text-sm font-medium px-5 py-4 bg-ink text-paper rounded-sm hover:bg-ember transition-colors text-center"
      >
        Ladda ner PDF →
      </a>
      <p className="font-mono text-xs text-ink-faint mt-3 truncate" title={fileLabel}>
        {fileLabel}
      </p>
    </article>
  );
}
