"""Extract year mentions per story for the timeline view.

For each story, find all 4-digit years in a plausible range (1970-2030),
record the years AND a short context snippet around each mention.

Reads:  data/stories.json
Writes: data/years.json — list of {id, years: [{year, contexts: [str, ...]}]}
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"

YEAR_RE = re.compile(r"\b(19[7-9]\d|20[0-2]\d|2030)\b")
CONTEXT_PAD = 70  # chars on each side


def main() -> int:
    stories = json.loads((DATA / "stories.json").read_text(encoding="utf-8"))
    out = []
    for s in stories:
        body = s["body"]
        years: dict[int, list[str]] = {}
        for m in YEAR_RE.finditer(body):
            y = int(m.group(1))
            start = max(0, m.start() - CONTEXT_PAD)
            end = min(len(body), m.end() + CONTEXT_PAD)
            ctx = body[start:end].replace("\n", " ").strip()
            if start > 0:
                ctx = "…" + ctx
            if end < len(body):
                ctx += "…"
            years.setdefault(y, []).append(ctx)
        out.append(
            {
                "id": s["id"],
                "title": s["title"],
                "years": [
                    {"year": y, "contexts": ctxs[:2]}  # max 2 contexts per year
                    for y, ctxs in sorted(years.items())
                ],
            }
        )
    (DATA / "years.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    total = sum(len(o["years"]) for o in out)
    has_year = sum(1 for o in out if o["years"])
    print(
        f"Wrote years.json: {has_year}/{len(out)} stories have year refs, {total} unique year-mentions",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
