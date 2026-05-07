"""Generate dense TF-IDF embeddings for each story, suitable for UMAP+HDBSCAN.

Reuses tokenization + stopword logic from similarity.py. Output is the same
shape as embeddings.json (a list of {id, embedding[]}) so cluster_themes.py
can consume it directly — no semantic API needed.

Reads:  data/stories.json
Writes: data/embeddings.json
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

# Reuse the same stopword set as similarity.py
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
säger sade sa sagt säga
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


def tokenize(text: str) -> list[str]:
    text = text.lower()
    raw = re.findall(r"[a-zåäöéü']+", text)
    return [t for t in raw if len(t) >= 3 and t not in STOP and not t.isdigit()]


# Vector size cap — keep top-N globally most informative terms across the corpus
VOCAB_SIZE = 1500


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
    # IDF
    idf: dict[str, float] = {t: math.log((N + 1) / (c + 1)) + 1 for t, c in df.items()}

    # Pick the top-VOCAB_SIZE terms by their summed tf*idf across the corpus.
    # This keeps the dense vector small enough for UMAP while preserving signal.
    score: Counter[str] = Counter()
    for toks in tokens_per:
        tf = Counter(toks)
        if not tf:
            continue
        max_tf = max(tf.values())
        for t, c in tf.items():
            score[t] += (0.5 + 0.5 * c / max_tf) * idf[t]
    vocab = [t for t, _ in score.most_common(VOCAB_SIZE)]
    vocab_idx = {t: i for i, t in enumerate(vocab)}
    print(f"Selected vocabulary: {len(vocab)} terms", file=sys.stderr)

    # Build dense vectors
    vectors: list[list[float]] = []
    for toks in tokens_per:
        v = [0.0] * len(vocab)
        if not toks:
            vectors.append(v)
            continue
        tf = Counter(toks)
        max_tf = max(tf.values())
        for t, c in tf.items():
            i = vocab_idx.get(t)
            if i is None:
                continue
            v[i] = (0.5 + 0.5 * c / max_tf) * idf[t]
        # L2-normalize so cosine becomes a dot product
        n = math.sqrt(sum(x * x for x in v))
        if n > 0:
            v = [x / n for x in v]
        vectors.append(v)

    out = [{"id": s["id"], "embedding": v} for s, v in zip(stories, vectors)]
    (DATA / "embeddings.json").write_text(
        json.dumps(out, ensure_ascii=False),
        encoding="utf-8",
    )
    size = (DATA / "embeddings.json").stat().st_size
    print(f"Wrote embeddings.json ({size / 1024 / 1024:.1f} MB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
