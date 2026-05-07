import type { Metadata } from "next";
import Link from "next/link";
import { RandomButton } from "@/components/random-button";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berättelser från skolan",
  description:
    "En samtidsskildring från svenska skolan. Lärare, föräldrar, elever och skolledare berättar — med egna ord.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..900;1,8..60,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteNav />
        <main className="min-h-screen">{children}</main>
        <SiteFooter />
        <RandomButton />
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 mt-24 py-14 print:hidden">
      <div className="max-w-wide mx-auto px-6 grid lg:grid-cols-[1fr_auto] gap-10">
        <div>
          <p className="font-display font-semibold text-lg mb-4 tracking-tight">
            Berättelser från skolan
          </p>
          <p className="font-serif text-sm text-ink-muted max-w-prose mb-2 leading-relaxed">
            Ursprungligen sammanställd som två PDF-volymer av Maria Wiman, januari 2026.
            Den här sajten gör materialet sökbart och navigerbart — alla citat länkar
            till källtexten.
          </p>
          <p className="font-serif italic text-sm text-ink-faint max-w-prose">
            Inga texter är AI-genererade. Citat extraheras ordagrant.
          </p>
        </div>
        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2 font-sans text-sm text-ink-soft">
          <FooterCol heading="Läsa">
            <Link href="/berattelser" className="hover:text-ember block py-0.5">Alla berättelser</Link>
            <Link href="/teman" className="hover:text-ember block py-0.5">Teman</Link>
            <Link href="/citatmur" className="hover:text-ember block py-0.5">Citatmuren</Link>
            <Link href="/mosaiken" className="hover:text-ember block py-0.5">Mosaiken</Link>
          </FooterCol>
          <FooterCol heading="Utforska">
            <Link href="/karta" className="hover:text-ember block py-0.5">Karta</Link>
            <Link href="/tidslinje" className="hover:text-ember block py-0.5">Tidslinje</Link>
            <Link href="/floden" className="hover:text-ember block py-0.5">Flöden</Link>
            <Link href="/fingeravtryck" className="hover:text-ember block py-0.5">Fingeravtryck</Link>
          </FooterCol>
          <FooterCol heading="Påverka">
            <Link href="/forslag" className="hover:text-ember block py-0.5">Folklig reformagenda</Link>
            <Link href="/jamfor" className="hover:text-ember block py-0.5">Jämför</Link>
            <Link href="/ladda-ner" className="hover:text-ember block py-0.5">Ladda ner PDF</Link>
            <Link href="/om" className="hover:text-ember block py-0.5">Om sajten</Link>
          </FooterCol>
        </nav>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-sans text-xs uppercase tracking-[0.2em] text-ember mb-3">
        {heading}
      </p>
      <div>{children}</div>
    </div>
  );
}
