"""Merge long-tail mapping outputs into single critique/proposal long-tail maps.

Reads:  data/canonicalization/longtail_{critique,proposal}_part{1,2}_mapped.json
Writes: data/canonicalization/system_critique_longtail.json
        data/canonicalization/concrete_proposals_longtail.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "data" / "canonicalization"


def merge(name: str, output_basename: str) -> None:
    parts = sorted(CANON.glob(f"longtail_{name}_part*_mapped.json"))
    if not parts:
        print(f"  no parts found for {name}", file=sys.stderr)
        return
    merged: dict[str, str] = {}
    for p in parts:
        m = json.loads(p.read_text(encoding="utf-8"))
        for k, v in m.items():
            if v is not None:
                merged[k] = v
    out = CANON / output_basename
    out.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  {out.name}: {len(merged)} non-null mappings (from {sum(1 for p in parts for _ in json.loads(p.read_text(encoding='utf-8')))} input labels)", file=sys.stderr)


def main() -> int:
    merge("critique", "system_critique_longtail.json")
    merge("proposal", "concrete_proposals_longtail.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
