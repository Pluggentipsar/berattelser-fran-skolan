"""Split stories.json into N batch files for parallel sub-agent processing."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"
BATCHES = DATA / "batches"


def main() -> int:
    n_batches = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    stories = json.loads((DATA / "stories.json").read_text(encoding="utf-8"))
    BATCHES.mkdir(exist_ok=True)
    # Wipe any old per-batch outputs before splitting (idempotent)
    for f in BATCHES.glob("batch_*.json"):
        f.unlink()
    for f in BATCHES.glob("enriched_*.json"):
        f.unlink()

    per = (len(stories) + n_batches - 1) // n_batches
    for i in range(n_batches):
        chunk = stories[i * per : (i + 1) * per]
        if not chunk:
            continue
        # Slim payload — drop body's >>4000-char cases? No, agents need full bodies.
        payload = [
            {
                "id": s["id"],
                "title": s["title"],
                "signature": s.get("signature"),
                "body": s["body"],
            }
            for s in chunk
        ]
        out = BATCHES / f"batch_{i+1:02d}.json"
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  batch_{i+1:02d}.json: {len(chunk)} stories", file=sys.stderr)
    print(f"Wrote {n_batches} batches", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
