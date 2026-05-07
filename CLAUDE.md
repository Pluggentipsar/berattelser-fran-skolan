# Berättelser från skolan — projektguide för Claude

En sajt som synliggör ~615 berättelser från svenska skolan (lärare, föräldrar, elever, specialpedagoger, skolledare). Materialet kommer från två PDF-volymer publicerade jan 2026.

## Snabbstart för dig som ny session

```bash
# Allt data är redan parsat — bara starta servern
cd web && PORT=4500 npm run dev
# Öppna http://localhost:4500
```

`data/stories.json`, `data/enriched.json`, `data/similar.json`, `data/years.json`, `data/corpus_stats.json`, `data/kommuner.json` är alla genererade och incheckade.

## Designprinciper (gäller absolut)

1. **AI extraherar — aldrig genererar.** Pull-quotes är ordagranna substrings av berättelserna. Sammanfattningar är förbjudet om de inte explicit länkar tillbaka till källtexten.
2. **Aggregering tappar aldrig individen.** Tematiska sidor är alltid klick-bara mot enskilda berättelser.
3. **Editorial typografi.** Fraunces för display med `opsz` 144, Source Serif 4 för body med `opsz` 11. Kontrasten är hela poängen — fippla inte med det utan tydlig anledning.
4. **Lokal-först.** Allt kör utan API-nyckel. Joel kommer att lämna API-nyckel senare för att uppgradera enrichment med Claude.
5. **Inget publik-going utan namn-skrubbning.** Joel har inte sagt ja till publik hosting än.

## Kodlayout

```
.
├── data/                   genererade JSON-filer (incheckade)
├── scripts/                Python-pipeline (idempotent)
│   ├── parse_stories.py        PDF-text → stories.json
│   ├── build_kommuner.py       CSV → kommuner.json (290 svenska kommuner)
│   ├── rule_based_enrich.py    deterministisk enrichment (default)
│   ├── enrich_stories.py       Claude API enrichment (kräver ANTHROPIC_API_KEY)
│   ├── similarity.py           TF-IDF likhet → similar.json
│   ├── extract_years.py        år-extraktion → years.json
│   ├── embed_stories.py        Voyage/OpenAI embeddings (kräver API-nyckel)
│   └── cluster_themes.py       UMAP+HDBSCAN (efter embeddings)
└── web/                    Next.js 15 + TypeScript + Tailwind v3
    ├── app/
    │   ├── layout.tsx              root: header, footer, RandomButton, ThemeToggle
    │   ├── page.tsx                landningssida
    │   ├── berattelser/            lista + enskild + reading-progress
    │   ├── teman/[theme]/          tematisk + /korus pull-quote-vy
    │   ├── citatmur/               filter+shuffle wall av alla pull-quotes
    │   ├── karta/                  Sverige-heatmap + UMAP-vy
    │   ├── tidslinje/              år-extraktion
    │   ├── fingeravtryck/          korpus-statistik + diff vol I/II
    │   ├── sok/                    MiniSearch fritext
    │   ├── bokmarken/              localStorage-baserade bokmärken
    │   ├── embed/[id]/route.ts     standalone iframe-embed för journalister
    │   ├── api/stories/            publik JSON-API
    │   ├── opengraph-image.tsx     dynamisk OG per berättelse
    │   ├── rss.xml/                RSS-feed
    │   ├── sitemap.ts, robots.ts
    │   └── om/                     manifest
    ├── components/
    │   ├── theme-toggle.tsx
    │   ├── random-button.tsx
    │   └── bookmark.tsx            useBookmarks-hook + BookmarkButton
    └── lib/
        ├── stories.ts              huvudsaklig data-läsning
        ├── extras.ts               similar, kommuner, corpus_stats
        └── coords.ts               UMAP-koordinater (om de finns)
```

## Data-pipeline (regenerera allt)

```bash
# 0. PDF → text (gjort en gång)
pdftotext -enc UTF-8 -layout skolan_vol_i_final-v3.pdf  data/vol_i.txt
pdftotext -enc UTF-8 -layout Skolan_vol_ii_final-v3.pdf data/vol_ii.txt

# 1. Strukturerad korpus (615 berättelser)
python scripts/parse_stories.py

# 2. Kommun-databas
python scripts/build_kommuner.py C:/tmp/kommuner.csv

# 3. Rule-based enrichment (ingen API-nyckel)
python scripts/rule_based_enrich.py

# 4. TF-IDF + corpus stats
python scripts/similarity.py

# 5. År-extraktion
python scripts/extract_years.py

# Kör allt utan API på <30s totalt.
```

När Joel lämnar API-nyckel:

```bash
# Skriver över enriched.json med Claude-extraherad data
ANTHROPIC_API_KEY=... python scripts/enrich_stories.py

# Embeddings + tema-karta
VOYAGE_API_KEY=... python scripts/embed_stories.py
pip install -r scripts/requirements.txt
python scripts/cluster_themes.py
```

## Saker att inte göra

- **Skriv inte om pull-quotes.** De ska vara verbatim substrings. `select_pull_quote` i `rule_based_enrich.py` har en sista guard som verifierar `quote in body` — bryt inte den invarianten.
- **Lägg inte till tema-etiketter via heuristik utan att uppdatera taxonomi.** Listan i `THEME_RULES` är ordnad och kuraterad. Lägg till — slumpa inte ut.
- **Ändra inte typografin på berättelse-sidan utan typografisk motivering.** Drop cap, opsz-axel, prose-bredd 32rem, leading 1.62, dessa är medvetna val. Frontend-design-skill ledde till dem.
- **Hosta inte publikt.** Joel har inte godkänt det. Namn-skrubbning är ett separat steg som ska göras tillsammans med honom.

## Etiska överväganden (hela tiden närvarande)

- Många berättelser nämner barn vid namn. PDF→AI-indexerad sajt är en bredare spridning.
- Innan publik hosting måste minst följande ske: (a) namn-skrubbning av minderåriga, (b) geo-detalj-granskning, (c) samtycke verifierat med utgivarna.
- AI-pipelinen flaggar — den skrubbar inte automatiskt.

## Vanliga porten

Dev-servern startas vanligtvis på **port 4500** (Joel har andra dev-servrar på 3000/3001):

```bash
cd web && PORT=4500 npm run dev
```

## Snabb-fakta

- 615 berättelser, ~415 000 ord, ~35 timmars läsning
- Vol I: 371 berättelser. Vol II: 244 berättelser.
- Kommun-omnämnanden: ca 90 unika kommuner av 290.
- Topp-teman (efter AI-enrichment): anpassningar (323), resursbrist (250), NPF-stöd (229), psykisk-ohälsa (203), lärarbristen (138), hemmasittare (131), specialpedagog (95).
- Pull-quotes: 613 av 615 berättelser (99.7%) — alla verifierade som ordagranna substrings.

## AI-enrichment-historik (2026-05-07)

Enrichment kördes via 12 parallella Claude Code sub-agenter (Max-plan, ingen separat API-nyckel).
- 615 berättelser i 12 batches om ~52 vardera, ~5-6 minuter parallell körtid
- 612 av 615 fick role-tilldelning (vs 280 från rule-based, 2.2× förbättring)
- 613 fick stadium (vs 395 från rule-based)
- Sentiment fördelning: kritisk 229, förtvivlad 143, frustrerad 125, hoppfull 68, saklig 49
- Pull-quote snittlängd 84 chars, max 232; alla validerade verbatim mot källtext via `scripts/merge_batches.py`
- Replikerbart: kör `scripts/split_batches.py 12` → spawna 12 sub-agenter med samma prompt → `scripts/merge_batches.py`
- Alternativt: `enrich_stories.py` (kräver ANTHROPIC_API_KEY, använder prompt caching)
