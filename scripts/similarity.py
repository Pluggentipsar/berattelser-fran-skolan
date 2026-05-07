"""Compute TF-IDF similarity between stories — no API needed.

Reads:  data/stories.json
Writes: data/similar.json — list of {id, similar: [{id, score}]} (top 5 each)
        data/corpus_stats.json — corpus-level word statistics

Pure-Python implementation (no scikit-learn) so no extra deps.
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Swedish stop words — broad list, augmented by frequent corpus tokens we
# don't want as "thematic" anchors.
STOP = set("""
och att det som är en ett i på men så för av med till inte har vi jag
de den var ska kan om när han hon från sig sin sina dessa även
ju nog kanske eller om än vad där hur mig dig honom henne oss er dem
varför vilken vilka vilket vart vem mer mest mycket många liten
litet mindre flesta hela eget egna nu då här
denna detta dessa man skulle skall fick får finns hade
gör göra gjorde gjort blev blir bli alla allt något några ingen
också både utan utom utöver dock visst ja nej
kommer bör måste eftersom därför sedan medan andra annan annat
oftast ofta sällan aldrig alltid del bara endast minst dryga drygt
samma typ liksom lite tex dvs etc osv enligt kring runt mot bakom inom
över under före efter istället förrän tills sedan
vidare ibland innan
vara varit vill ville velat vilja behöver behövde behövt behöva
min mitt mina vår vårt våra dess deras hans hennes
upp ner ut hem dit hit tillbaka iväg bort
varje varenda mången manga
går gick gått gå komma kom kommit
ser såg sett se vet visste vetat veta gör göra gjorde gjort
ta tog tagit ta får fick fått få bli blev blivit
säger sade sa sagt säga säga
göra gjorde gjort gör
någon något några
hela helt hel
alldeles
tror trodde trott tro
tycker tyckte tyckt tycka
fortfarande igen ändå
jättebra mycket väldigt
saker sak
bra dåligt bra
dag dagen dagar
gång gången gånger gångerna
år åren årets
sätt sättet
ofta ibland sällan alltid aldrig
samtidigt
liksom typ liksom verkligen riktigt ganska
faktiskt ändå
över under före efter
helt
""".split())

# Drop very short tokens and pure numbers
def tokenize(text: str) -> list[str]:
    text = text.lower()
    raw = re.findall(r"[a-zåäöéü']+", text)
    return [t for t in raw if len(t) >= 3 and t not in STOP and not t.isdigit()]


def main() -> int:
    stories = json.loads((DATA / "stories.json").read_text(encoding="utf-8"))
    print(f"Tokenizing {len(stories)} stories…", file=sys.stderr)
    tokens_per: list[list[str]] = []
    df: Counter[str] = Counter()
    for s in stories:
        toks = tokenize(s["body"])
        tokens_per.append(toks)
        df.update(set(toks))
    N = len(stories)
    # Compute idf with smoothing
    idf: dict[str, float] = {t: math.log((N + 1) / (c + 1)) + 1 for t, c in df.items()}

    print(f"Vocabulary: {len(idf):,}", file=sys.stderr)

    # Build sparse tf-idf vectors (only top-200 terms per doc to keep it light)
    TOP_TERMS_PER_DOC = 200
    vecs: list[dict[str, float]] = []
    norms: list[float] = []
    for toks in tokens_per:
        tf = Counter(toks)
        if not tf:
            vecs.append({})
            norms.append(0.0)
            continue
        max_tf = max(tf.values())
        scored: dict[str, float] = {}
        for t, c in tf.items():
            scored[t] = (0.5 + 0.5 * c / max_tf) * idf.get(t, 0.0)
        # keep top N
        kept = dict(sorted(scored.items(), key=lambda kv: -kv[1])[:TOP_TERMS_PER_DOC])
        n = math.sqrt(sum(v * v for v in kept.values()))
        vecs.append(kept)
        norms.append(n)

    # Inverted index: term → list of (doc_idx, weight)
    print("Building inverted index…", file=sys.stderr)
    postings: dict[str, list[tuple[int, float]]] = {}
    for j, vj in enumerate(vecs):
        for t, w in vj.items():
            postings.setdefault(t, []).append((j, w))

    print("Computing pairwise similarities…", file=sys.stderr)
    similar: list[dict] = []
    for i, (vi, ni) in enumerate(zip(vecs, norms)):
        if not vi or ni == 0:
            similar.append({"id": stories[i]["id"], "similar": []})
            continue
        # Walk only docs that share a term with this doc — true inverted-index
        # accumulation. Each (i,j) pair is visited only as many times as terms
        # they share, instead of N-1 unconditional probes per doc.
        dots: dict[int, float] = {}
        for t, wi in vi.items():
            for j, wj in postings.get(t, ()):  # noqa: B007
                if j == i:
                    continue
                dots[j] = dots.get(j, 0.0) + wi * wj
        scores: list[tuple[float, int]] = []
        for j, dot in dots.items():
            nj = norms[j]
            if nj == 0:
                continue
            cos = dot / (ni * nj)
            if cos > 0.05:
                scores.append((cos, j))
        scores.sort(reverse=True)
        top = [{"id": stories[j]["id"], "score": round(s, 4)} for s, j in scores[:8]]
        similar.append({"id": stories[i]["id"], "similar": top})
        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{N}", file=sys.stderr)

    (DATA / "similar.json").write_text(
        json.dumps(similar, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # ---- corpus stats ----
    print("Computing corpus stats…", file=sys.stderr)
    overall_counter: Counter[str] = Counter()
    for toks in tokens_per:
        overall_counter.update(toks)
    stats = {
        "vocab_size": len(idf),
        "top_words": overall_counter.most_common(200),
        "total_tokens": sum(len(t) for t in tokens_per),
    }
    (DATA / "corpus_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote similar.json and corpus_stats.json", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
