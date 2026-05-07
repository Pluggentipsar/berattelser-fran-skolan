"""Split long-tail unmapped values into batches for parallel agent mapping."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = ROOT / "data" / "canonicalization"


def split(name: str, n: int) -> None:
    src = CANON / f"longtail_{name}.json"
    if not src.exists():
        print(f"skip: {src.name} not present", file=sys.stderr)
        return
    items = json.loads(src.read_text(encoding="utf-8"))
    per = (len(items) + n - 1) // n
    for i in range(n):
        chunk = items[i * per : (i + 1) * per]
        if not chunk:
            continue
        out = CANON / f"longtail_{name}_part{i+1}.json"
        out.write_text(
            json.dumps(chunk, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"  {out.name}: {len(chunk)} items", file=sys.stderr)


def main() -> int:
    split("critique", 2)
    split("proposal", 2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
