# Berättelser från skolan

En sajt som synliggör 615 berättelser från svenska skolan (lärare, föräldrar,
elever, specialpedagoger, skolledare, fritidspersonal) — annars inlåsta i
två stora PDF-volymer från Maria Wimans insamling, januari 2026.

Materialet är journalistiskt och politiskt relevant. Målet är att låta
forskare, journalister, beslutsfattare och en bredare allmänhet faktiskt
**navigera** materialet utan att tappa varje individs röst.

## Snabbstart

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

Hela sajten fungerar utan API-nycklar — alla enrichment-data (615 berättelser
× metadata) ligger redan i `web/data/`.

## Deploy till Vercel

1. Pusha repo till GitHub
2. Importera till Vercel (vercel.com → New Project → Import Git Repository)
3. Vercel detekterar Next.js automatiskt. Sätt **root directory** till `web`
4. Sätt en miljövariabel:
   - `NEXT_PUBLIC_BASE_URL` = din slutliga URL (t.ex. `https://berattelser-fran-skolan.vercel.app`)
5. Klicka **Deploy**. Klar.

Build-tiden är 2-3 minuter (615 statiska sidor + 117 tema-sidor pre-genereras).

## Sidor

| Route | Vad |
|---|---|
| `/` | Landningssida — stats, dagens citat, ingångar |
| `/las` | **Sammanhängande läsläge** — hela boken med TOC, TTS, fokusläge |
| `/berattelser` | Bläddra alla 615 — filter på roll, stadium, volym, tema, diagnos, plats, kritik, förslag |
| `/berattelser/[id]` | Läsare med drop cap, fokusläge, dela, bokmärke, "Hur vanligt är detta?" |
| `/teman` + `/teman/[t]` + `/teman/[t]/korus` | Tematisk navigation |
| `/citatmur` | 600+ ordagranna pull-quotes, filtrerbar |
| `/mosaiken` | Visuellt slående quote-collage |
| `/karta` | Sverige-heatmap (zoom + pan) + tematisk UMAP-nebulosa |
| `/tidslinje` | År nämnda i berättelserna |
| `/floden` | Sankey-flöden (roll → kritik → förslag) |
| `/fingeravtryck` | Korpus-statistik, klickbara staplar |
| `/forslag` | Folklig reformagenda — sortera på frekvens × röstbredd |
| `/jamfor` | Jämför uttalande mot rösterna |
| `/sok` | Fritextsök (MiniSearch) |
| `/bokmarken` | localStorage-bokmärken |
| `/ladda-ner` | PDF-nedladdning av båda volymerna |
| `/embed/[id]` | Iframe-citatkort för publikationer |
| `/api/stories` | Publik JSON-API |
| `/api/random` | Slumpa berättelse |
| `/rss.xml`, `/sitemap.xml`, `/robots.txt` | Distribution |

## Kort om datan

- 615 berättelser, ~415 000 ord
- Vol I: 371 berättelser. Vol II: 244 berättelser.
- 613 ordagranna pull-quotes (99.7%)
- 120 kanoniska teman (efter agent-validering — 431 felklassificeringar borttagna)
- 32+ kategorier för systemkritik, 38+ kategorier för konkreta förslag
- 290 svenska kommuner med koordinater
- 20 tematiska kluster (UMAP + DBSCAN)

## Pipeline (regenerera datan från grunden)

```bash
# 0. PDF → text (en gång)
pdftotext -enc UTF-8 -layout skolan_vol_i_final-v3.pdf  web/data/vol_i.txt
pdftotext -enc UTF-8 -layout Skolan_vol_ii_final-v3.pdf web/data/vol_ii.txt

# 1. Strukturerad korpus
python scripts/parse_stories.py

# 2. Kommun-databas
python scripts/build_kommuner.py C:/tmp/kommuner.csv

# 3. Regelbaserad enrichment (eller via Anthropic API: scripts/enrich_stories.py)
python scripts/rule_based_enrich.py

# 4. Kanonisering av teman/diagnoser
python scripts/canonicalize_enrichment.py
python scripts/apply_theme_map.py
python scripts/apply_critique_proposal_maps.py

# 5. Likhet, statistik, år
python scripts/similarity.py
python scripts/extract_years.py

# 6. Hand-kuraterade carousel-citat
python scripts/verify_quotes.py

# 7. Embeddings + UMAP/DBSCAN för tematisk karta
python scripts/build_tfidf_embeddings.py
python scripts/cluster_themes.py
```

Skripten är idempotenta. Total tid: ~2 minuter.

## Principer

1. **AI extraherar — aldrig genererar.** Citat på sajten är ordagranna substrings av berättelserna.
2. **Aggregering tappar aldrig individen.** Tematiska sidor länkar tillbaka till källtexterna.
3. **Editorial typografi.** Fraunces display, Source Serif 4 body, opsz-axel, drop cap.

## Stack

- **Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind v3 · MiniSearch
- **AI-extraktion:** Claude Code agents (eller Anthropic API direkt)
- **Klustring:** UMAP + DBSCAN på TF-IDF-vektorer
- **GeoJSON:** okfse/sweden-geojson (MIT, 290 kommuner)

## Status

Klar för demo. Sajten kan deployas till Vercel direkt (se ovan).
Innan långsiktig publik hosting bör en namn-skrubbning av minderåriga göras.
