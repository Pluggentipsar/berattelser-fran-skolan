"""Embed each story for semantic search and clustering.

Reads:  data/stories.json
Writes: data/embeddings.json   (list of {id, embedding[]})

Supports two providers via env:
  - VOYAGE_API_KEY  → uses voyage-3 (Anthropic-recommended)
  - OPENAI_API_KEY  → uses text-embedding-3-large

Pick whichever key is set. If both are set, VOYAGE_API_KEY wins.

Usage:
  VOYAGE_API_KEY=... python scripts/embed_stories.py
  OPENAI_API_KEY=... python scripts/embed_stories.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"
SRC = DATA / "stories.json"
OUT = DATA / "embeddings.json"

BATCH_SIZE = 32


def embed_voyage(texts: list[str], api_key: str) -> list[list[float]]:
    r = requests.post(
        "https://api.voyageai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"input": texts, "model": "voyage-3", "input_type": "document"},
        timeout=60,
    )
    r.raise_for_status()
    j = r.json()
    return [d["embedding"] for d in j["data"]]


def embed_openai(texts: list[str], api_key: str) -> list[list[float]]:
    r = requests.post(
        "https://api.openai.com/v1/embeddings",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"input": texts, "model": "text-embedding-3-large"},
        timeout=120,
    )
    r.raise_for_status()
    j = r.json()
    return [d["embedding"] for d in j["data"]]


def truncate_for_embedding(s: str, max_chars: int = 8000) -> str:
    if len(s) <= max_chars:
        return s
    return s[:max_chars]


def main() -> int:
    voyage_key = os.environ.get("VOYAGE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if voyage_key:
        embed_fn = lambda batch: embed_voyage(batch, voyage_key)
        provider = "voyage-3"
    elif openai_key:
        embed_fn = lambda batch: embed_openai(batch, openai_key)
        provider = "openai-text-embedding-3-large"
    else:
        print("ERROR: set VOYAGE_API_KEY or OPENAI_API_KEY", file=sys.stderr)
        return 2

    stories = json.loads(SRC.read_text(encoding="utf-8"))

    existing: dict[str, list[float]] = {}
    if OUT.exists():
        for r in json.loads(OUT.read_text(encoding="utf-8")):
            existing[r["id"]] = r["embedding"]

    todo = [s for s in stories if s["id"] not in existing]
    print(f"{len(stories)} stories | {len(existing)} already embedded | {len(todo)} to do | provider={provider}", file=sys.stderr)

    t0 = time.time()
    for batch_start in range(0, len(todo), BATCH_SIZE):
        batch = todo[batch_start : batch_start + BATCH_SIZE]
        texts = [
            truncate_for_embedding(f"Titel: {s['title']}\n\n{s['body']}")
            for s in batch
        ]
        try:
            vectors = embed_fn(texts)
        except Exception as e:
            print(f"  [batch {batch_start}] error: {e}", file=sys.stderr)
            time.sleep(5)
            continue
        for s, v in zip(batch, vectors):
            existing[s["id"]] = v
        # save incrementally
        OUT.write_text(
            json.dumps(
                [{"id": k, "embedding": v} for k, v in existing.items()],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        done = batch_start + len(batch)
        elapsed = time.time() - t0
        rate = done / elapsed if elapsed else 0
        eta = (len(todo) - done) / rate if rate > 0 else 0
        print(f"  [{done}/{len(todo)}] saved. {rate:.1f}/s. ETA {eta/60:.1f} min", file=sys.stderr)

    print(f"Done. {len(existing)} embeddings in {OUT.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
