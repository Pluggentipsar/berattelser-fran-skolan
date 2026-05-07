"""Enrich each story with structured metadata via the Anthropic API.

Reads:  data/stories.json
Writes: data/enriched.json   (list of EnrichedMeta, indexed by id)

Behavior:
  * Idempotent — re-running picks up where it left off (skips ids already in enriched.json).
  * Uses prompt caching: the long system prompt + schema is cached so repeat calls are cheap.
  * Validates that any pull_quote returned by the model appears verbatim in the source body;
    if not, the pull_quote is dropped (we never publish AI-generated quotes).
  * Outputs incrementally so a Ctrl-C doesn't lose progress.

Required env:
  ANTHROPIC_API_KEY — set this before running.

Usage:
  ANTHROPIC_API_KEY=sk-ant-... python scripts/enrich_stories.py [--limit N] [--model NAME]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import anthropic  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = DATA / "stories.json"
OUT = DATA / "enriched.json"

DEFAULT_MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """Du är en noggrann analytiker av svenska berättelser från skolvärlden.

Du läser EN berättelse och extraherar strukturerad metadata. Du ska:

1. ALDRIG hitta på fakta som inte står i texten.
2. ALDRIG generera nya formuleringar eller sammanfatta. Vi vill ha råa fakta, inte tolkning.
3. ALDRIG översätta eller omformulera ett "pull_quote" — det MÅSTE vara en exakt ordagrann sträng som finns i texten.
4. Om en uppgift inte framgår tydligt i texten, sätt fältet till null eller en tom lista.

Du svarar ALLTID med ett JSON-objekt som matchar detta schema:

{
  "role": "lärare" | "förälder" | "elev" | "skolledare" | "specialpedagog" | "förskollärare" | "annan" | null,
  "stadium": "förskola" | "förskoleklass" | "lågstadiet" | "mellanstadiet" | "högstadiet" | "gymnasiet" | "vuxenutbildning" | "övergripande" | null,
  "themes": [string, ...],     // 1-6 korta tematiska etiketter på svenska, t.ex. ["resursbrist", "marknadsskola", "NPF-stöd"]
  "sentiment": "förtvivlad" | "frustrerad" | "saklig" | "hoppfull" | "kritisk" | null,
  "geo_hint": string | null,   // svensk kommun/ort om den nämns explicit, annars null
  "diagnoses_mentioned": [string, ...],   // t.ex. "ADHD", "autism", "dyslexi" — endast om de nämns ordagrant
  "system_critique": [string, ...],       // korta etiketter på systemnivåkritik (t.ex. "skolpeng", "Skolinspektionen agerar inte", "lärarbristen")
  "concrete_proposals": [string, ...],    // konkreta förbättringsförslag som skribenten själv lyfter, max 6
  "pull_quote": string | null  // EN kort ordagrann mening (max 240 tecken) som väl representerar berättelsen, eller null
}

Inget annat. Inga prefix, inga kommentarer, bara JSON.
"""

USER_PROMPT_TEMPLATE = """Här är berättelsen. Läs den och svara med ett JSON-objekt enligt schemat.

Titel: {title}
Signatur: {signature}

---
{body}
---

Svara endast med JSON-objektet."""


def load_existing() -> dict[str, dict]:
    if OUT.exists():
        return {m["id"]: m for m in json.loads(OUT.read_text(encoding="utf-8"))}
    return {}


def save(meta_by_id: dict[str, dict]) -> None:
    OUT.write_text(
        json.dumps(list(meta_by_id.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def validate_pull_quote(quote: str | None, body: str) -> str | None:
    if not quote:
        return None
    if quote in body:
        return quote
    # Try collapsing whitespace
    qn = " ".join(quote.split())
    bn = " ".join(body.split())
    if qn in bn:
        return qn
    return None


def coerce_meta(raw: dict[str, Any], story: dict) -> dict:
    """Validate / coerce a model response into a clean meta record."""
    out: dict[str, Any] = {"id": story["id"]}
    role = raw.get("role")
    if role in {
        "lärare", "förälder", "elev", "skolledare",
        "specialpedagog", "förskollärare", "annan",
    }:
        out["role"] = role
    else:
        out["role"] = None
    stad = raw.get("stadium")
    if stad in {
        "förskola", "förskoleklass", "lågstadiet", "mellanstadiet",
        "högstadiet", "gymnasiet", "vuxenutbildning", "övergripande",
    }:
        out["stadium"] = stad
    else:
        out["stadium"] = None

    def _list_of_str(key: str, max_n: int) -> list[str]:
        v = raw.get(key) or []
        if not isinstance(v, list):
            return []
        cleaned: list[str] = []
        for x in v[:max_n]:
            if isinstance(x, str) and x.strip():
                cleaned.append(x.strip())
        return cleaned

    out["themes"] = _list_of_str("themes", 6)
    sent = raw.get("sentiment")
    if sent in {"förtvivlad", "frustrerad", "saklig", "hoppfull", "kritisk"}:
        out["sentiment"] = sent
    else:
        out["sentiment"] = None
    geo = raw.get("geo_hint")
    out["geo_hint"] = geo.strip() if isinstance(geo, str) and geo.strip() else None
    out["diagnoses_mentioned"] = _list_of_str("diagnoses_mentioned", 8)
    out["system_critique"] = _list_of_str("system_critique", 6)
    out["concrete_proposals"] = _list_of_str("concrete_proposals", 6)
    pq = raw.get("pull_quote")
    out["pull_quote"] = validate_pull_quote(pq if isinstance(pq, str) else None, story["body"])
    return out


def extract_one(client: anthropic.Anthropic, model: str, story: dict) -> dict | None:
    user_msg = USER_PROMPT_TEMPLATE.format(
        title=story["title"],
        signature=story.get("signature") or "(ingen)",
        body=story["body"],
    )
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=1500,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
    except Exception as e:
        print(f"  [{story['id']}] API error: {e}", file=sys.stderr)
        return None
    text_parts = [b.text for b in resp.content if b.type == "text"]
    raw = "\n".join(text_parts).strip()
    # tolerate markdown fencing
    if raw.startswith("```"):
        raw = raw.strip("`").lstrip("json").strip()
        # try to recover the JSON object
    try:
        # find first { and last }
        s = raw.find("{")
        e = raw.rfind("}")
        if s == -1 or e == -1:
            raise ValueError("no JSON object found")
        obj = json.loads(raw[s : e + 1])
    except Exception as e:
        print(f"  [{story['id']}] JSON parse error: {e}; raw={raw[:200]!r}", file=sys.stderr)
        return None
    return coerce_meta(obj, story)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="only process first N stories")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--save-every", type=int, default=10)
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY env var not set", file=sys.stderr)
        return 2

    client = anthropic.Anthropic(api_key=api_key)
    stories = json.loads(SRC.read_text(encoding="utf-8"))
    existing = load_existing()
    todo = [s for s in stories if s["id"] not in existing]
    if args.limit:
        todo = todo[: args.limit]

    print(
        f"Stories: {len(stories)} | already enriched: {len(existing)} | "
        f"to process: {len(todo)} | model: {args.model}",
        file=sys.stderr,
    )

    t0 = time.time()
    for i, story in enumerate(todo, 1):
        meta = extract_one(client, args.model, story)
        if meta is None:
            continue
        existing[meta["id"]] = meta
        if i % args.save_every == 0 or i == len(todo):
            save(existing)
            elapsed = time.time() - t0
            rate = i / elapsed if elapsed else 0
            eta = (len(todo) - i) / rate if rate > 0 else 0
            print(
                f"  [{i}/{len(todo)}] saved. {rate:.2f}/s. ETA {eta/60:.1f} min",
                file=sys.stderr,
            )

    save(existing)
    print(f"Done. {len(existing)} enriched records in {OUT.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
