"""Apply the agent-produced theme canonicalization map to enriched.json."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"


def main() -> int:
    enriched_path = DATA / "enriched.json"
    map_path = DATA / "canonicalization" / "theme_canonical.json"
    if not map_path.exists():
        print(f"ERROR: {map_path} not found", file=sys.stderr)
        return 1

    data = json.loads(enriched_path.read_text(encoding="utf-8"))
    theme_map: dict[str, str] = json.loads(map_path.read_text(encoding="utf-8"))

    before: Counter[str] = Counter()
    for d in data:
        before.update(d.get("themes") or [])

    missing: set[str] = set()
    for d in data:
        themes = d.get("themes") or []
        seen: set[str] = set()
        out: list[str] = []
        for t in themes:
            mapped = theme_map.get(t)
            if mapped is None:
                missing.add(t)
                mapped = t
            if mapped not in seen:
                seen.add(mapped)
                out.append(mapped)
        d["themes"] = out

    enriched_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    after: Counter[str] = Counter()
    for d in data:
        after.update(d.get("themes") or [])

    print(f"Themes: {len(before)} → {len(after)} canonical forms", file=sys.stderr)
    if missing:
        print(f"Warning: {len(missing)} themes not in map (kept as-is): {list(missing)[:8]}", file=sys.stderr)
    print("Top 15 canonical themes:", file=sys.stderr)
    for t, c in after.most_common(15):
        print(f"  {c:4} {t}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
