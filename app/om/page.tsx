import { getStats } from "@/lib/stories";

export default async function AboutPage() {
  const stats = await getStats();
  return (
    <div className="max-w-prose mx-auto px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-8">
        Om sajten
      </h1>
      <div className="prose-story font-serif">
        <p>
          Berättelser från skolan är en samling av {stats.total} röster — från
          lärare, föräldrar, elever, specialpedagoger, fritidspersonal,
          skolledare och andra som har erfarenhet av den svenska skolan. Texterna
          samlades in under hösten och vintern 2025–2026 och publicerades först
          som två digitala PDF-volymer i januari 2026.
        </p>
        <p>
          Den här sajten gör materialet sökbart och navigerbart. Inget av
          textinnehållet är AI-genererat. När AI används på sajten är det för att
          extrahera struktur ur det befintliga materialet — vilken roll
          skribenten har, vilket stadium det rör, vilka teman som återkommer —
          aldrig för att skriva om eller tolka enskilda berättelser.
        </p>

        <h2 className="font-display font-semibold mt-12 mb-3">Principer</h2>
        <ul className="font-serif list-none pl-0 space-y-2">
          <li>
            <strong>Citat är ordagranna.</strong> Alla utdrag på sajten kan
            spåras tillbaka till en enskild berättelse via klickbara länkar.
          </li>
          <li>
            <strong>AI extraherar — aldrig genererar.</strong> Om en passage
            visas inom citationstecken på sajten är den hämtad ordagrant ur en
            berättelse, inte producerad av en språkmodell.
          </li>
          <li>
            <strong>Inga sammanfattningar utan källor.</strong> Tematiska
            översikter länkar alltid till de berättelser de bygger på.
          </li>
          <li>
            <strong>Individens röst bevaras.</strong> Aggregering används för att
            visa mönster, men varje enskild berättelse är alltid en klick bort.
          </li>
        </ul>

        <h2 className="font-display font-semibold mt-12 mb-3">Etik och integritet</h2>
        <p>
          Berättelserna delades ursprungligen för publicering i en PDF-volym. En
          AI-indexerad, sökbar webbversion är en bredare spridning än en PDF, och
          vi tar det på allvar. Innan publik publicering körs:
        </p>
        <ul className="font-serif list-none pl-0 space-y-2">
          <li>— en namn-skrubbning av minderåriga som identifieras i texterna,</li>
          <li>— en granskning av geografiska detaljer som riskerar att peka ut individer,</li>
          <li>— samtycke verifieras med originalsamlingens utgivare.</li>
        </ul>

        <h2 className="font-display font-semibold mt-12 mb-3">Korpusens omfång</h2>
        <ul className="font-mono text-sm list-none pl-0 space-y-1">
          <li>Berättelser: {stats.total.toLocaleString("sv-SE")}</li>
          <li>— Volym I: {stats.vol_i.toLocaleString("sv-SE")}</li>
          <li>— Volym II: {stats.vol_ii.toLocaleString("sv-SE")}</li>
          <li>Totalt antal ord: {stats.total_words.toLocaleString("sv-SE")}</li>
          <li>Mediantext: {stats.median_words.toLocaleString("sv-SE")} ord</li>
          <li>Lästid (≈200 ord/min): {Math.round(stats.reading_time_minutes / 60)} timmar</li>
          <li>Signerade berättelser: {stats.signed.toLocaleString("sv-SE")}</li>
        </ul>
      </div>
    </div>
  );
}
