import Link from "next/link";
import { getStats, getStories, excerpt } from "@/lib/stories";
import { getCarouselQuotes } from "@/lib/carousel";
import { QuoteCarousel } from "@/components/quote-carousel";
import { OptionalImage } from "@/components/optional-image";

export default async function HomePage() {
  const [stats, all, carousel] = await Promise.all([
    getStats(),
    getStories(),
    getCarouselQuotes(),
  ]);
  const dailySeed = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const featured = pickN(all, 6, dailySeed);

  return (
    <>
      <Hero stats={stats} />
      <Background />
      <QuoteCarousel quotes={carousel} />
      <ScaleStrip stats={stats} />
      <NavGrid />
      <FeaturedVoices stories={featured} />
      <DownloadStrip />
      <WhatThisIs />
    </>
  );
}

function Hero({ stats }: { stats: Awaited<ReturnType<typeof getStats>> }) {
  return (
    <section className="border-b border-ink/10">
      <div className="max-w-wide mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-28 grid lg:grid-cols-12 gap-12 items-end">
        <div className="lg:col-span-8">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-6 anim-rise">
            En samtidsskildring · Januari 2026
          </p>
          <h1
            className="font-display tracking-tightest text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-ink mb-8 anim-rise anim-rise-delay-1"
            style={{ fontWeight: 600, fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
          >
            Skolan brinner.
            <br />
            <span
              className="text-ink-soft"
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                fontVariationSettings: '"opsz" 144, "SOFT" 80',
              }}
            >
              Det här är berättelserna.
            </span>
          </h1>
          <p className="font-serif text-xl leading-relaxed text-ink-soft max-w-2xl mb-8 anim-rise anim-rise-delay-2">
            {stats.total} röster från svenska skolan. Lärare, föräldrar, elever,
            specialpedagoger, rektorer, fritidspersonal. Här finns deras egna ord
            — sökbara, läsbara, inte filtrerade.
          </p>
          <div className="flex flex-wrap gap-3 anim-rise anim-rise-delay-3">
            <Link
              href="/las"
              className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Läs hela boken
            </Link>
            <Link
              href="/berattelser"
              className="font-sans text-sm font-medium px-5 py-3 border border-ink/20 rounded-sm hover:border-ink transition-colors"
            >
              Bläddra
            </Link>
            <Link
              href="/citatmur"
              className="font-sans text-sm font-medium px-5 py-3 border border-ink/20 rounded-sm hover:border-ink transition-colors"
            >
              Citatmuren →
            </Link>
            <Link
              href="/ladda-ner"
              className="font-sans text-sm font-medium px-5 py-3 border border-ink/20 rounded-sm hover:border-ink transition-colors"
            >
              Ladda ner PDF
            </Link>
          </div>
        </div>
        <aside className="lg:col-span-4 lg:border-l lg:border-ink/10 lg:pl-10">
          <BigStat
            value={stats.total.toLocaleString("sv-SE")}
            label="berättelser"
          />
          <div className="rule-thin my-6" />
          <BigStat
            value={`${(stats.total_words / 1000).toFixed(0)}k`}
            label="ord, sammanlagt"
          />
          <div className="rule-thin my-6" />
          <BigStat
            value={`${Math.round(stats.reading_time_minutes / 60)}h`}
            label="att läsa allt"
            footnote="≈ en lärares reglerade arbetsvecka"
          />
        </aside>
      </div>
    </section>
  );
}

function BigStat({
  value,
  label,
  footnote,
}: {
  value: string;
  label: string;
  footnote?: string;
}) {
  return (
    <div>
      <div className="font-display text-5xl font-light tabular-nums text-ink leading-none">
        {value}
      </div>
      <div className="font-sans text-sm uppercase tracking-wider text-ink-muted mt-2">
        {label}
      </div>
      {footnote && (
        <div className="font-serif italic text-sm text-ink-faint mt-1">
          {footnote}
        </div>
      )}
    </div>
  );
}

function Background() {
  return (
    <section className="border-b border-ink/10">
      <div className="max-w-wide mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <figure className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="aspect-[4/5] bg-paper-warm border border-ink/10 overflow-hidden rounded-sm relative">
            <OptionalImage
              src="/maria-wiman.jpg"
              alt="Maria Wiman med de två volymerna Berättelser från skolan"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
              <p className="font-serif italic text-ink-faint text-sm">
                (porträtt)
              </p>
            </div>
          </div>
          <figcaption className="font-serif italic text-sm text-ink-muted mt-3 leading-relaxed">
            Initiativtagaren Maria Wiman med de två tryckta volymerna.
          </figcaption>
        </figure>

        <div className="lg:col-span-7">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-4">
            Bakgrund
          </p>
          <h2
            className="font-display text-4xl lg:text-5xl font-semibold tracking-tightest leading-[1.05] mb-8"
            style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30' }}
          >
            Hur det började.
          </h2>
          <div className="prose-story max-w-none">
            <p>
              I december 2025 auktionerar utbildningsministern ut en dag med
              sig själv till förmån för Musikhjälpen. Detta väcker en idé. På
              initiativ av läraren Maria Wiman skapas en crowdfundingkampanj
              för att vinna auktionen. På bara några dagar är insamlingen uppe
              i över 120 000 kronor.
            </p>
            <p>
              Tanken med kampanjen var att glappet mellan politikers beslut
              och verklighetens villkor skulle överbryggas. Man ville få
              utbildningsministern till skolan, man ville att hon skulle ta
              del av vardagens berättelser och erfarenheter.
            </p>
            <p>
              I samband med detta samlade Maria in historier, ofiltrerade
              skildringar från skolan. Denna bok är resultatet av de över 700
              mail som kom in på kort tid. Här skriver lärare, förskollärare,
              speciallärare, fritidslärare, forskare, elever, studie- och
              yrkesvägledare, skolbibliotekarier, vårdnadshavare och många
              fler.
            </p>
            <p className="font-display text-2xl text-ink mt-10 mb-2" style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}>
              Hundratals berättelser.
            </p>
            <p className="font-display text-2xl text-ink-soft italic mb-2">
              Men egentligen ett gemensamt budskap.
            </p>
            <p className="font-display text-3xl text-ember mt-4" style={{ fontWeight: 600 }}>
              Vi måste rädda svensk skola. Vi har inte tid att vänta.
            </p>
          </div>

          <div className="mt-12 border-t border-ink/10 pt-8">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">
              Originalmaterialet
            </p>
            <p className="font-serif text-ink-soft mb-5 max-w-prose">
              Båda volymerna finns att ladda ner som PDF — exakt så som de
              ursprungligen publicerades.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/berattelser-fran-skolan-vol-1.pdf"
                className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
                download
              >
                <DownloadIcon /> Volym I (PDF, 4.6 MB)
              </a>
              <a
                href="/berattelser-fran-skolan-vol-2.pdf"
                className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
                download
              >
                <DownloadIcon /> Volym II (PDF, 4.6 MB)
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ScaleStrip({ stats }: { stats: Awaited<ReturnType<typeof getStats>> }) {
  return (
    <section className="bg-paper-warm border-b border-ink/10">
      <div className="max-w-wide mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <Cell n={stats.vol_i} l="i Volym I" />
        <Cell n={stats.vol_ii} l="i Volym II" />
        <Cell n={stats.signed} l="signerade" />
        <Cell n={stats.median_words} l="median (ord)" />
      </div>
    </section>
  );
}

function Cell({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-medium tabular-nums">
        {n.toLocaleString("sv-SE")}
      </div>
      <div className="font-sans text-xs uppercase tracking-wider text-ink-muted mt-1">
        {l}
      </div>
    </div>
  );
}

function NavGrid() {
  const cards = [
    { href: "/berattelser", title: "Bläddra alla berättelser", desc: "Filtrera på roll, stadium, volym. Läs i sin helhet." },
    { href: "/forslag", title: "Folklig reformagenda", desc: "Vad rösterna gemensamt föreslår — rangordnat efter frekvens och röstbredd." },
    { href: "/mosaiken", title: "Rösternas mosaik", desc: "Hundratals ordagranna citat, simultant. Ett hav av röster." },
    { href: "/floden", title: "Flöden", desc: "Hur kopplas roller, kritik och förslag ihop? Sankey-vy över mönstren." },
    { href: "/jamfor", title: "Jämför mot rösterna", desc: "Klistra in ett uttalande, hitta de berättelser som behandlar samma ämnen." },
    { href: "/teman", title: "Tematisk navigation", desc: "Återkommande mönster — resursbrist, NPF, marknadsskola, hemmasittare." },
    { href: "/citatmur", title: "Citatmuren", desc: "Filtrerbar mur av alla pull-quotes." },
    { href: "/karta", title: "Sverige-kartan", desc: "Var berättas det ifrån? Hela landet, kommun för kommun." },
    { href: "/tidslinje", title: "Tidslinje", desc: "Berättelserna sträcker sig över decennier. Här är åren." },
    { href: "/fingeravtryck", title: "Korpusens fingeravtryck", desc: "Statistik, mönster, vokabulär. Vad pratar 615 röster om?" },
  ];

  return (
    <section className="border-b border-ink/10">
      <div className="max-w-wide mx-auto px-6 py-16">
        <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
          Sätt att navigera
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight mb-10 max-w-prose">
          Tio ingångar in i materialet.
        </h2>
        <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
          {cards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="block group border-l-2 border-ink/10 pl-5 hover:border-ember transition-colors"
              >
                <div className="font-display text-xl font-semibold mb-1 group-hover:text-ember">
                  {c.title} →
                </div>
                <p className="font-serif text-ink-soft leading-relaxed">{c.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeaturedVoices({
  stories,
}: {
  stories: Awaited<ReturnType<typeof getStories>>;
}) {
  return (
    <section>
      <div className="max-w-wide mx-auto px-6 py-20">
        <header className="mb-12 max-w-prose">
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
            Sex röster
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            "Vi är många men våra historier är förvånansvärt lika."
          </h2>
          <p className="font-serif text-ink-muted mt-4 italic">
            — Ur förordet, Maria Wiman
          </p>
        </header>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {stories.map((s) => (
            <article key={s.id} className="group">
              <Link href={`/berattelser/${s.id}`} className="block">
                <div className="flex items-center gap-3 mb-3">
                  <span className="pill">{s.volume_label}</span>
                  <span className="font-sans text-xs text-ink-faint tabular-nums">
                    Nr {s.chapter}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold leading-tight mb-3 group-hover:text-ember transition-colors">
                  {s.title}
                </h3>
                <p className="font-serif text-[0.95rem] leading-relaxed text-ink-soft">
                  {excerpt(s.body, 38)}
                </p>
                {s.signature && (
                  <p className="font-serif italic text-sm text-ink-muted mt-3">
                    — {s.signature}
                  </p>
                )}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadStrip() {
  return (
    <section className="bg-paper-warm border-y border-ink/10">
      <div className="max-w-wide mx-auto px-6 py-14 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
            Originalmaterialet
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight mb-3">
            Ladda ner båda volymerna som PDF.
          </h2>
          <p className="font-serif text-ink-soft max-w-prose">
            Vill du läsa eller dela materialet i sin ursprungliga form? Här är
            de två digitala böckerna att ladda ner direkt — fri spridning.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/berattelser-fran-skolan-vol-1.pdf"
            download
            className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
          >
            <DownloadIcon /> Volym I
          </a>
          <a
            href="/berattelser-fran-skolan-vol-2.pdf"
            download
            className="font-sans text-sm font-medium px-5 py-3 bg-ink text-paper rounded-sm hover:bg-ember transition-colors inline-flex items-center gap-2"
          >
            <DownloadIcon /> Volym II
          </a>
        </div>
      </div>
    </section>
  );
}

function WhatThisIs() {
  return (
    <section className="bg-paper-deep border-y border-ink/10">
      <div className="max-w-prose mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-semibold mb-8 tracking-tight">
          Vad är det här?
        </h2>
        <div className="prose-story font-serif">
          <p>
            Berättelser från skolan samlades in från lärare, föräldrar, elever,
            specialpedagoger, fritidspersonal och skolledare under hösten och
            vintern 2025–2026, och publicerades som två digitala volymer i
            januari 2026.
          </p>
          <p>
            Den här sajten gör materialet sökbart, navigerbart och citerbart —
            utan att tappa varje individs röst. Du kan läsa allt från första
            till sista berättelse, eller söka efter ett specifikt tema, en roll,
            en plats.
          </p>
          <p>
            Allt textmaterial är skrivet av människor. Sajten använder
            språkmönster och AI för att extrahera struktur — vilken roll
            skribenten har, vilket stadium det handlar om, vilka teman som
            återkommer — men aldrig för att skriva om, tolka eller sammanfatta
            enskilda berättelser. Citat är ordagranna och länkar alltid till
            källtexten.
          </p>
        </div>
      </div>
    </section>
  );
}

// helpers ---------------------------------------------------------

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
