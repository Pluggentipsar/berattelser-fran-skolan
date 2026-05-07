"""Deterministic, rule-based enrichment for the school stories corpus.

Produces the same enriched.json schema as enrich_stories.py (which uses Claude),
but using language patterns, keyword taxonomies and a Swedish municipality list.
This means the entire UI lights up *without* needing an API key.

When an API key is later available, run enrich_stories.py instead — it will
overwrite this file with higher-quality LLM-extracted metadata.

Reads:  data/stories.json, data/kommuner.json (optional)
Writes: data/enriched.json
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


# ---------------------------------------------------------------------------
# ROLE DETECTION
# ---------------------------------------------------------------------------
# Strategy: scan the first ~1000 chars and the signature.
# The earliest first-person identification wins, with weight by specificity.

ROLE_RULES: list[tuple[str, list[re.Pattern[str]]]] = [
    (
        "specialpedagog",
        [
            re.compile(r"\bjag (är|jobbar som|arbetar som) special(pedagog|lärare)\b", re.I),
            re.compile(r"\bsom special(pedagog|lärare)\b", re.I),
            re.compile(r"^special(pedagog|lärare)\b", re.I | re.M),
        ],
    ),
    (
        "förskollärare",
        [
            re.compile(r"\bjag (är|jobbar som|arbetar som) förskoll(är)?are\b", re.I),
            re.compile(r"\bförskoll(är)?ar(e|inna)\b", re.I),
            re.compile(r"\bbarnskötare\b", re.I),
        ],
    ),
    (
        "skolledare",
        [
            re.compile(r"\bjag (är|jobbar som|arbetar som) (rektor|biträdande rektor|skolledare)\b", re.I),
            re.compile(r"\bsom (rektor|skolledare|biträdande rektor)\b", re.I),
        ],
    ),
    (
        "lärare",
        [
            re.compile(r"\bjag (är|jobbar som|arbetar som) lärare\b", re.I),
            re.compile(r"\bsom (klass|ämnes|fritids|musik|idrotts|sv|engelsk|matte)?lärare\b", re.I),
            re.compile(r"\b(F-3|F-6|4-9|7-9|gymnasielärare)-?lärare\b", re.I),
        ],
    ),
    (
        "elev",
        [
            re.compile(r"\bjag är \d+ år\b", re.I),
            re.compile(r"\bjag går i (förskoleklass|åk|år) ?\d+", re.I),
            re.compile(r"\bjag är elev\b", re.I),
            re.compile(r"\bsom elev (i|på)\b", re.I),
        ],
    ),
    (
        "förälder",
        [
            re.compile(r"\bjag är (mamma|pappa|förälder|vårdnadshavare)\b", re.I),
            re.compile(r"\bvår(t)? (son|dotter|barn)\b", re.I),
            re.compile(r"\bmin (son|dotter)\b", re.I),
            re.compile(r"\bsom (mamma|pappa|förälder)\b", re.I),
        ],
    ),
]

SIGNATURE_ROLE_HINTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^special(pedagog|lärare)\b", re.I), "specialpedagog"),
    (re.compile(r"^förskoll(är)?ar(e|inna)\b", re.I), "förskollärare"),
    (re.compile(r"^(rektor|biträdande rektor|skolledare)\b", re.I), "skolledare"),
    (re.compile(r"^lärare|^.{0,30}lärare\b", re.I), "lärare"),
    (re.compile(r"^(mamma|pappa|förälder|vårdnadshavare|funkis|funkisförälder)\b", re.I), "förälder"),
    (re.compile(r"^elev\b", re.I), "elev"),
]


def detect_role(body: str, signature: str | None) -> str | None:
    # 1) Signature is the strongest signal
    if signature:
        for pat, role in SIGNATURE_ROLE_HINTS:
            if pat.search(signature):
                return role
    head = body[:1500]
    scored: dict[str, int] = {}
    for role, patterns in ROLE_RULES:
        for p in patterns:
            for m in p.finditer(head):
                # earlier matches score higher
                weight = 100 - min(80, m.start() // 20)
                scored[role] = scored.get(role, 0) + weight
    if not scored:
        return None
    return max(scored.items(), key=lambda kv: kv[1])[0]


# ---------------------------------------------------------------------------
# STADIUM (school stage)
# ---------------------------------------------------------------------------

STADIUM_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("förskola", re.compile(r"\b(förskolan|förskola(n|s)?|dagis|barnomsorgen?|barnskötare)\b", re.I)),
    ("förskoleklass", re.compile(r"\b(förskoleklass(en)?|F-klass(en)?|sexår(s|ingar)?)\b", re.I)),
    ("lågstadiet", re.compile(r"\b(lågstadiet|åk[\. ]?[123]|år ?[123]|[123]:an|[123]\.?an|F-3|F\-?3-lärare)\b", re.I)),
    ("mellanstadiet", re.compile(r"\b(mellanstadiet|åk[\. ]?[456]|år ?[456]|[456]:an|F-6|4-6)\b", re.I)),
    ("högstadiet", re.compile(r"\b(högstadiet|åk[\. ]?[789]|år ?[789]|[789]:an|7-9|7-9-lärare)\b", re.I)),
    ("gymnasiet", re.compile(r"\b(gymnasiet|gymnasium|gymnasieskolan|gymnasieelev|gymnasielärare|IM-?\w*|introduktionsprogrammet)\b", re.I)),
    ("vuxenutbildning", re.compile(r"\b(komvux|sfi|vuxenutbildning|vuxenutbildningen|folkhögskola(n|s)?)\b", re.I)),
]


def detect_stadium(body: str) -> str | None:
    counts: dict[str, int] = {}
    for stad, pat in STADIUM_RULES:
        n = len(pat.findall(body))
        if n:
            counts[stad] = n
    if not counts:
        return None
    # If multiple stages mentioned roughly equally, return "övergripande"
    sorted_counts = sorted(counts.values(), reverse=True)
    if len(sorted_counts) >= 3 and sorted_counts[0] < sorted_counts[1] * 1.5:
        return "övergripande"
    if len(sorted_counts) >= 2 and sorted_counts[0] < sorted_counts[1] * 1.5:
        return "övergripande"
    return max(counts.items(), key=lambda kv: kv[1])[0]


# ---------------------------------------------------------------------------
# THEMES — broad taxonomy with multi-word keys
# ---------------------------------------------------------------------------
# Tuned from a manual scan of the corpus. Each theme has 2+ patterns; if any
# matches we tag the story. Capped at ~6 themes per story.

THEME_RULES: list[tuple[str, list[str]]] = [
    ("resursbrist", ["resursbrist", "för lite resurser", "saknas resurser", "neddragning(ar)?", "sparkrav", "sparbeting", "minskad budget"]),
    ("marknadsskola", ["marknadsskol", "skolpeng", "kundval", "vinst(uttag)? i välfärden", "friskolekoncern", "aktiebolag(s)?skol", "vinstdriv"]),
    ("hemmasittare", ["hemmasittare", "skolfrånvaro", "problematisk frånvaro", "skolvägran"]),
    ("npf-stöd", ["NPF", "neuropsykiatrisk", "anpassning(ar)?", "extra anpassning", "särskilt stöd", "åtgärdsprogram", "elevhälsoteam"]),
    ("autism", ["\\bautism", "\\bautist", "asperger", "AST\\b", "autismspektrum"]),
    ("adhd", ["\\bADHD\\b", "\\badhd\\b", "\\badd\\b", "\\bADD\\b", "uppmärksamhetsstörning"]),
    ("dyslexi", ["dyslexi", "dyskalkyli", "läs- och skrivsv", "läs ?och ?skrivsv"]),
    ("utbrändhet", ["utbränd", "utmattning(ssyndrom)?", "sjukskriv", "sjukskrev"]),
    ("specialpedagog", ["specialpedagog", "speciallärare"]),
    ("klasstorlek", ["stora klasser", "för många elever", "30 elever", "32 elever", "klasstorlek", "stora elevgrupper"]),
    ("skolinspektionen", ["skolinspektionen", "anmälan till skolinspektion", "Skolinspektionen"]),
    ("skolverket", ["skolverket", "Skolverket"]),
    ("läroplan", ["läroplan", "kursplan", "lgr\\d{2}", "Lgr\\d{2}"]),
    ("digitalisering", ["digital(a|isering)?", "skärm(ar|tid)", "bärbara dator", "Chromebook", "iPad", "lärplatta"]),
    ("läromedel", ["läromedel", "läroböcker", "tryckta böcker", "fysiska böcker", "lärobok"]),
    ("mobil-skärm", ["mobilförbud", "mobiltelefon(er)? i skolan", "snapchat", "tiktok", "skärmtid"]),
    ("rastvakt", ["rastvakt", "rast(en)?", "ute(rast|på rast)"]),
    ("våld-trygghet", ["våld", "knuff", "slag", "hot", "kränk", "mobbning", "trygghet"]),
    ("psykisk-ohälsa", ["psykisk ohälsa", "ångest", "panikattack", "depression", "självmord", "ta sitt liv", "vill inte leva", "skär(a|er) sig"]),
    ("föräldra-skola-relation", ["vårdnadshavar", "föräldramöte", "kontakt(er)? med hem", "krav från föräldra"]),
    ("rektor-ledarskap", ["rektor(n|s)?", "skolledning", "biträdande rektor"]),
    ("budget-pengar", ["budget", "pengar(na)?", "kostnad(er)?", "kommunens ekonomi", "underskott"]),
    ("anmälan", ["soc(ial)?(tjänst)?-?anmäl", "anmälan till skolinspektion", "anmäl(ning|de) till"]),
    ("brev-till-ministern", ["till utbildningsministern", "kära utbildningsminister", "till skolministern", "till statsrådet", "till regeringen", "till politiker(na)?"]),
    ("hemundervisning", ["hemundervisning", "hemmaundervisning", "distansundervisning"]),
    ("särskild-undervisningsgrupp", ["särskild undervisningsgrupp", "liten grupp", "litet sammanhang", "resursskola"]),
    ("anpassad-grundskola", ["anpassad grundskola", "anpassad gymnasieskola", "grundsärskola", "gymnasiesärskola", "särskolan"]),
    ("svenska-som-andraspråk", ["svenska som andraspråk", "sva\\b", "SVA\\b", "nyanlända", "modersmål"]),
    ("musik-bild-estetiska", ["musiklär", "bildlär", "estetiska ämnen", "slöjdlärare", "idrottslärare"]),
    ("studievägledare", ["studie- ?och ?yrkesvägled", "syv\\b", "SYV"]),
    ("skolbibliotek", ["skolbibliotek(arie)?"]),
    ("fritids", ["fritidshem(met)?", "fritidspedag", "fritidslärare"]),
    ("skolkurator", ["skolkurator(n)?", "kurator(n)? på skolan"]),
    ("skolsköterska", ["skolsköters", "skolhälsovård"]),
    ("betyg", ["betyg(en|ssättning)?", "betygsinflation", "F i betyg", "underkänt"]),
    ("kunskapskrav", ["kunskapskrav(en)?", "nationella prov(en|et)?"]),
    ("planeringstid", ["planeringstid", "förtroendetid", "för lite tid"]),
    ("hot-mot-lärare", ["hot mot lärare", "lärare hotas", "lärare hotade"]),
    ("idrott", ["idrott(en|slärare|sundervisning)?"]),
    ("lärarutbildning", ["lärarutbildning(en)?", "lärarstudent", "VFU\\b"]),
    ("lärarbrist", ["lärarbrist(en)?", "obehöriga lärare", "saknar behörig"]),
    ("flicka-pojke-genus", ["flickor i skolan", "pojkar är", "tjej(er)?", "killar i skolan", "genus"]),
    ("rasism", ["rasism", "rasifierad", "etnicitet"]),
    ("skoldemokrati", ["elevråd(et)?", "skoldemokrati"]),
    ("inkludering-segregering", ["inkluder(ing|as)", "segregering", "uteslutning", "exkluder"]),
    ("könsidentitet-hbtq", ["transperson", "hbtq", "icke-binär", "könsidentitet"]),
    ("missbruk", ["missbruk", "narkotika", "droger", "alkohol"]),
    ("flykt-trauma", ["flykting", "krigstrauma", "trauma", "PTSD"]),
    ("föräldraansvar", ["föräldraansvar", "uppfostran", "föräldraskap"]),
    ("skolskjuts", ["skolskjuts", "skolbuss"]),
    ("matsal", ["skolmat(en)?", "matsalen", "skolluncher"]),
    ("lokaler", ["lokaler(na)?", "klassrum(met)?", "trångbodd", "ventilation"]),
]
THEME_PATTERNS = [
    (theme, [re.compile(rf"\b{p}\b" if not p.startswith("\\") else p, re.IGNORECASE) for p in pats])
    for theme, pats in THEME_RULES
]


def detect_themes(body: str, max_themes: int = 6) -> list[str]:
    scores: dict[str, int] = {}
    for theme, patterns in THEME_PATTERNS:
        n = 0
        for p in patterns:
            n += len(p.findall(body))
        if n > 0:
            scores[theme] = n
    if not scores:
        return []
    return [t for t, _ in sorted(scores.items(), key=lambda kv: -kv[1])[:max_themes]]


# ---------------------------------------------------------------------------
# DIAGNOSES
# ---------------------------------------------------------------------------

DIAGNOSIS_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("ADHD", re.compile(r"\b(ADHD|adhd)\b")),
    ("ADD", re.compile(r"\b(ADD|add)\b")),
    ("autism", re.compile(r"\b(autism|autist|asperger|AST|autismspektrum|autistisk)\b", re.I)),
    ("dyslexi", re.compile(r"\b(dyslexi|läs[\- ]och[\- ]skrivsvårig)\b", re.I)),
    ("dyskalkyli", re.compile(r"\b(dyskalkyli|matematiksvårigheter)\b", re.I)),
    ("Tourettes", re.compile(r"\b(tourett(es)?)\b", re.I)),
    ("OCD", re.compile(r"\b(OCD|tvångssyndrom|tvångstankar)\b", re.I)),
    ("ångest", re.compile(r"\b(ångest|generaliserad ångest|GAD)\b", re.I)),
    ("depression", re.compile(r"\b(depression|deprimerad)\b", re.I)),
    ("selektiv mutism", re.compile(r"\b(selektiv mutism)\b", re.I)),
    ("PTSD", re.compile(r"\bPTSD\b")),
    ("språkstörning", re.compile(r"\b(språkstörning|DLD)\b", re.I)),
    ("NPF", re.compile(r"\b(NPF|neuropsykiatrisk(a|t)?)\b", re.I)),
    ("högfungerande", re.compile(r"\b(högfungerande)\b", re.I)),
]


def detect_diagnoses(body: str) -> list[str]:
    found = []
    for label, pat in DIAGNOSIS_PATTERNS:
        if pat.search(body):
            found.append(label)
    return found


# ---------------------------------------------------------------------------
# GEO
# ---------------------------------------------------------------------------


def load_municipalities() -> list[dict]:
    f = DATA / "kommuner.json"
    if not f.exists():
        return []
    return json.loads(f.read_text(encoding="utf-8"))


# Names that are also common Swedish words; only counted when context is
# clearly geographic (preceded by "i ", "från ", or followed by " kommun").
GEO_AMBIGUOUS = frozenset({"Mark", "Mora", "Sala", "Nora", "Vara", "Mön", "Härad"})
# Names with very common prefixes that cause false positives even on stems
GEO_HARD_SKIP = frozenset({"Robertsfors"})


def _build_geo_index(kommuner: list[dict]) -> tuple[re.Pattern[str], re.Pattern[str], dict[str, str]]:
    """Build (any-name regex, ambiguous-context regex, token→display map)."""
    token_to_name: dict[str, str] = {}
    for k in kommuner:
        if k["name"] in GEO_HARD_SKIP:
            continue
        token_to_name[k["name"]] = k["name"]
        if k.get("official_name") and k["official_name"] != k["name"]:
            token_to_name[k["official_name"]] = k["name"]
    names = sorted(token_to_name.keys(), key=len, reverse=True)
    pat = re.compile(r"\b(" + "|".join(re.escape(n) for n in names) + r")\b")
    amb_pat = re.compile(
        r"\b(?:i|från|här i|på|i kommunen|närliggande)\s+("
        + "|".join(re.escape(n) for n in GEO_AMBIGUOUS)
        + r")s?\b"
        r"|\b("
        + "|".join(re.escape(n) for n in GEO_AMBIGUOUS)
        + r")\s+kommun\b"
    )
    return pat, amb_pat, token_to_name


def detect_geo(body: str, geo_index: tuple[re.Pattern[str], re.Pattern[str], dict[str, str]]) -> str | None:
    """Find the most specific Swedish municipality reference."""
    pat, amb_pat, token_to_name = geo_index
    counts: Counter[str] = Counter()
    for m in pat.finditer(body):
        canon = token_to_name.get(m.group(1), m.group(1))
        if canon in GEO_AMBIGUOUS:
            continue
        counts[canon] += 1
    for m in amb_pat.finditer(body):
        token = m.group(1) or m.group(2)
        if token:
            counts[token] += 1
    if not counts:
        return None
    return counts.most_common(1)[0][0]


# ---------------------------------------------------------------------------
# SENTIMENT (heuristic)
# ---------------------------------------------------------------------------

SENTIMENT_RULES: list[tuple[str, list[str]]] = [
    ("förtvivlad", ["förtvivl", "ger upp", "går inte längre", "orkar inte mer", "tar sitt liv", "inte leva", "panikattack", "sammanbrott"]),
    ("hoppfull", ["hopp om", "förbättr", "blev bättre", "börjar fungera", "framgång", "framåt", "ljusningen", "blomstr"]),
    ("kritisk", ["systemfel", "skandal", "katastrof", "haveri", "kris", "kapitulation"]),
    ("frustrerad", ["frustrer", "orättvis", "irriter", "obegripligt", "absurt", "trött på"]),
]
SENTIMENT_PATTERNS = [
    (s, [re.compile(rf"\b{p}", re.IGNORECASE) for p in pats]) for s, pats in SENTIMENT_RULES
]


def detect_sentiment(body: str) -> str | None:
    scores: dict[str, int] = {}
    for label, pats in SENTIMENT_PATTERNS:
        n = sum(len(p.findall(body)) for p in pats)
        if n:
            scores[label] = n
    if not scores:
        return "saklig"
    return max(scores.items(), key=lambda kv: kv[1])[0]


# ---------------------------------------------------------------------------
# SYSTEM CRITIQUE & PROPOSALS
# ---------------------------------------------------------------------------

CRITIQUE_KEYWORDS: list[tuple[str, list[str]]] = [
    ("skolpeng", ["skolpeng"]),
    ("marknadsskola", ["marknadsskol", "vinstuttag", "friskole(systemet|reformen)?"]),
    ("lärarbristen", ["lärarbrist"]),
    ("Skolinspektionen agerar inte", ["skolinspektionen.{0,80}(agerar inte|gjorde inget|ingen åtgärd|saklös)"]),
    ("kommunaliseringen", ["kommunalisering"]),
    ("byråkrati", ["byråkrati", "dokumentation", "pappersarbete"]),
    ("inkludering driven för långt", ["inkludering(en)? driven", "alla i samma klassrum"]),
    ("storklasser", ["för stora klasser", "30 ?elever", "klasstorlek"]),
    ("avsaknad av särskola/anpassad skola", ["avsaknad.{0,40}särskol", "anpassad grundskola.{0,40}saknas"]),
]


def detect_critique(body: str) -> list[str]:
    found = []
    for label, pats in CRITIQUE_KEYWORDS:
        for p in pats:
            if re.search(p, body, re.I):
                found.append(label)
                break
    return found[:6]


PROPOSAL_KEYWORDS: list[tuple[str, list[str]]] = [
    ("mindre klasser", ["mindre klasser", "minska klasstorlek", "max ?\\d+ ?elever"]),
    ("fler speciallärare/specialpedagoger", ["fler special(lärare|pedagog)"]),
    ("statlig skola", ["förstatliga skolan", "statlig skola"]),
    ("avskaffa skolpeng/marknadsskola", ["avskaffa skolpeng", "stoppa marknadssk", "förbjud vinst"]),
    ("läroplikt istället för skolplikt", ["läroplikt"]),
    ("fler vuxna i skolan", ["fler vuxna", "fler resurser i klassrum"]),
    ("mer tid för planering", ["mer planeringstid", "öka förtroendetid"]),
    ("lyssna på lärare", ["lyssna på (oss )?lärare", "fråga oss lärare"]),
]


def detect_proposals(body: str) -> list[str]:
    found = []
    for label, pats in PROPOSAL_KEYWORDS:
        for p in pats:
            if re.search(p, body, re.I):
                found.append(label)
                break
    return found[:6]


# ---------------------------------------------------------------------------
# PULL QUOTE — heuristic verbatim selection
# ---------------------------------------------------------------------------

PUNCH_WORDS = re.compile(
    r"\b(brinner|katastrof|sammanbrott|kapitulation|systemfel|måste rädda|tycks ingen|"
    r"ingen lyssnar|ger upp|orkar inte|haveri|gått sönder|aldrig (mer )?gå|"
    r"misslyck(ats|ande)|svek(et|s)?|skuldbel|knuten näve|nog är nog|den brinner|"
    r"viktig(aste)? jobb|bästa (skolan|jobb)|inte värdig|tysta|röst(er)?)\b",
    re.IGNORECASE,
)


def select_pull_quote(body: str) -> str | None:
    """Pick a verbatim short sentence that's punchy and short.

    We split on sentence boundaries, score each candidate, and pick the best
    short one. The returned string is a substring of body.
    """
    # Normalize whitespace inside the body without losing the verbatim slice
    sents = re.findall(r"[^.!?]{20,240}[.!?]", body)
    if not sents:
        return None
    scored: list[tuple[float, str]] = []
    for s in sents:
        text = s.strip()
        if 30 <= len(text) <= 180:
            n_punch = len(PUNCH_WORDS.findall(text))
            length_score = 1 - abs(len(text) - 120) / 120
            score = n_punch * 5 + length_score
            # Prefer sentences with first-person voice
            if re.search(r"\bjag\b|\bvi\b", text, re.I):
                score += 1.5
            scored.append((score, text))
    if not scored:
        return None
    scored.sort(key=lambda x: -x[0])
    quote = scored[0][1]
    # Final guard: must be a substring of the original body (verbatim).
    if quote in body:
        return quote
    # try collapsed-whitespace match, return verbatim slice from body
    bn = " ".join(body.split())
    qn = " ".join(quote.split())
    if qn in bn:
        idx = bn.find(qn)
        # Approximate-locate the verbatim slice
        # walk through original body counting non-whitespace chars
        start = 0
        non_ws = 0
        for i, ch in enumerate(body):
            if non_ws == idx and not ch.isspace():
                start = i
                break
            if not ch.isspace():
                non_ws += 1
        end = start + len(quote) + 10  # tolerance
        return body[start : min(end, len(body))]
    return None


# ---------------------------------------------------------------------------
# DRIVER
# ---------------------------------------------------------------------------


def enrich(story: dict, geo_index) -> dict[str, Any]:
    body = story["body"]
    sig = story.get("signature")
    return {
        "id": story["id"],
        "role": detect_role(body, sig),
        "stadium": detect_stadium(body),
        "themes": detect_themes(body),
        "sentiment": detect_sentiment(body),
        "geo_hint": detect_geo(body, geo_index) if geo_index else None,
        "diagnoses_mentioned": detect_diagnoses(body),
        "system_critique": detect_critique(body),
        "concrete_proposals": detect_proposals(body),
        "pull_quote": select_pull_quote(body),
    }


def main() -> int:
    stories = json.loads((DATA / "stories.json").read_text(encoding="utf-8"))
    kommuner = load_municipalities()
    geo_index = _build_geo_index(kommuner) if kommuner else None
    print(f"Stories: {len(stories)} | kommuner: {len(kommuner)}", file=sys.stderr)
    out = [enrich(s, geo_index) for s in stories]
    (DATA / "enriched.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    # print summary
    role_c = Counter(m["role"] for m in out)
    stad_c = Counter(m["stadium"] for m in out)
    theme_c = Counter(t for m in out for t in m["themes"])
    print(f"Roles: {dict(role_c)}", file=sys.stderr)
    print(f"Stadium: {dict(stad_c)}", file=sys.stderr)
    print(f"Top 10 themes: {theme_c.most_common(10)}", file=sys.stderr)
    geo_c = Counter(m["geo_hint"] for m in out if m["geo_hint"])
    print(f"Top 10 geos: {geo_c.most_common(10)}", file=sys.stderr)
    diag_c = Counter(d for m in out for d in m["diagnoses_mentioned"])
    print(f"Top diagnoses: {diag_c.most_common(10)}", file=sys.stderr)
    pulls = sum(1 for m in out if m["pull_quote"])
    print(f"Pull quotes: {pulls}/{len(out)}", file=sys.stderr)
    print(f"Wrote enriched.json", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
