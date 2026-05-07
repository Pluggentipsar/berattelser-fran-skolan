"""Prepare per-theme audit batches.

For each top theme, dump a JSON file with all stories tagged with that theme.
Each batch will be handed to an agent that validates whether each story
genuinely concerns the theme, or whether the tag is a misclassification.

Reads:  data/stories.json, data/enriched.json
Writes: data/audit/theme_<slug>.json   (one per theme)
        data/audit/INDEX.json           (list of generated batches)
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
AUDIT = DATA / "audit"

# Audit themes that have at least this many stories — singletons aren't worth it
MIN_STORIES = 5
# Per-theme cap on stories sent to one agent (split into multiple if needed)
MAX_PER_BATCH = 80


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-zåäöéü0-9-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def main() -> int:
    stories = {s["id"]: s for s in json.loads((DATA / "stories.json").read_text(encoding="utf-8"))}
    enriched = json.loads((DATA / "enriched.json").read_text(encoding="utf-8"))

    # Map theme → [story_id, ...]
    by_theme: dict[str, list[str]] = defaultdict(list)
    for m in enriched:
        for t in m.get("themes") or []:
            by_theme[t].append(m["id"])

    # Filter and sort
    candidates = sorted(
        ((t, ids) for t, ids in by_theme.items() if len(ids) >= MIN_STORIES),
        key=lambda kv: -len(kv[1]),
    )
    print(f"Themes with >= {MIN_STORIES} stories: {len(candidates)}", file=sys.stderr)

    AUDIT.mkdir(exist_ok=True)
    # Wipe old batches
    for f in AUDIT.glob("theme_*.json"):
        f.unlink()
    for f in AUDIT.glob("audit_*.json"):
        f.unlink()

    index = []
    for theme, ids in candidates:
        slug = slugify(theme)
        # Split into batches if too large
        n_batches = (len(ids) + MAX_PER_BATCH - 1) // MAX_PER_BATCH
        for b in range(n_batches):
            batch_ids = ids[b * MAX_PER_BATCH : (b + 1) * MAX_PER_BATCH]
            payload = {
                "theme": theme,
                "stories": [
                    {
                        "id": sid,
                        "title": stories[sid]["title"],
                        # Trim body to keep batches small
                        "body": stories[sid]["body"][:2400],
                        "truncated": len(stories[sid]["body"]) > 2400,
                    }
                    for sid in batch_ids
                ],
            }
            name = f"theme_{slug}{'_' + str(b+1) if n_batches > 1 else ''}.json"
            (AUDIT / name).write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            index.append(
                {
                    "theme": theme,
                    "slug": slug,
                    "batch": b + 1 if n_batches > 1 else None,
                    "n_batches": n_batches,
                    "count": len(batch_ids),
                    "input": name,
                    "output": name.replace("theme_", "audit_"),
                }
            )

    (AUDIT / "INDEX.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(index)} batches to {AUDIT.relative_to(ROOT)}", file=sys.stderr)
    print(f"Themes: {len(candidates)}; total stories tagged across them: {sum(len(ids) for _, ids in candidates)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
