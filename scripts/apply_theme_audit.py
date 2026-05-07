"""Apply theme audit verdicts to enriched.json.

For each audit_*.json file in data/audit/, read the verdicts. Each verdict says
whether story X should keep theme Y. Remove Y from the story's themes when
keep=false.

Reads:  data/enriched.json + data/audit/audit_*.json + data/audit/INDEX.json
Writes: data/enriched.json (in place)
        data/audit/audit_summary.json (per-theme stats and removed-pairs log)
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"
AUDIT = DATA / "audit"


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-zåäöéü0-9-]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def main() -> int:
    enriched = json.loads((DATA / "enriched.json").read_text(encoding="utf-8"))
    by_id = {m["id"]: m for m in enriched}

    index = json.loads((AUDIT / "INDEX.json").read_text(encoding="utf-8"))
    # Build slug → theme name map
    slug_to_theme: dict[str, str] = {}
    for it in index:
        slug_to_theme[it["slug"]] = it["theme"]

    # For each audit file: collect verdicts (id, theme, keep, reason)
    removals: list[dict] = []  # for log
    for audit_file in sorted(AUDIT.glob("audit_*.json")):
        # Parse theme slug from filename (handle batched files like audit_anpassningar_1.json)
        stem = audit_file.stem.replace("audit_", "")
        # Strip trailing _N
        slug = re.sub(r"_\d+$", "", stem)
        theme = slug_to_theme.get(slug)
        if not theme:
            print(f"  SKIP {audit_file.name}: no theme for slug {slug!r}", file=sys.stderr)
            continue
        try:
            verdicts = json.loads(audit_file.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  SKIP {audit_file.name}: parse error {e}", file=sys.stderr)
            continue
        if not isinstance(verdicts, list):
            print(f"  SKIP {audit_file.name}: not a list", file=sys.stderr)
            continue
        for v in verdicts:
            if not isinstance(v, dict):
                continue
            sid = v.get("id")
            keep = v.get("keep")
            reason = v.get("reason", "")
            if sid is None or keep is True or keep is None:
                continue
            # keep is false → remove the theme from this story
            m = by_id.get(sid)
            if not m:
                continue
            themes = m.get("themes") or []
            if theme in themes:
                removals.append({"id": sid, "theme": theme, "reason": reason})
                m["themes"] = [t for t in themes if t != theme]

    # Save
    (DATA / "enriched.json").write_text(
        json.dumps(enriched, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Stats
    by_theme: dict[str, int] = defaultdict(int)
    for r in removals:
        by_theme[r["theme"]] += 1

    summary = {
        "total_removed": len(removals),
        "by_theme": dict(sorted(by_theme.items(), key=lambda x: -x[1])),
        "examples": removals[:50],
    }
    (AUDIT / "audit_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Removed {len(removals)} story-theme pairs", file=sys.stderr)
    print("Top removals by theme:", file=sys.stderr)
    for t, c in sorted(by_theme.items(), key=lambda x: -x[1])[:15]:
        print(f"  {c:4} {t}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
