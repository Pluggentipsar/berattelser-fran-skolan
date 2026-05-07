"""Apply system_critique and concrete_proposals canonical maps to enriched.json.

Reads:  data/enriched.json
        data/canonicalization/system_critique_canonical.json
        data/canonicalization/concrete_proposals_canonical.json
        (optional) data/canonicalization/system_critique_longtail.json
        (optional) data/canonicalization/concrete_proposals_longtail.json
Writes: data/enriched.json (in place)
        data/canonicalization/longtail_critique.json (unmapped values needing agent help)
        data/canonicalization/longtail_proposal.json
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"
CANON = DATA / "canonicalization"


def load_map(name: str) -> dict[str, str]:
    p = CANON / name
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    data = json.loads((DATA / "enriched.json").read_text(encoding="utf-8"))
    crit_map = load_map("system_critique_canonical.json")
    crit_long = load_map("system_critique_longtail.json")
    crit_full = {**crit_map, **crit_long}
    prop_map = load_map("concrete_proposals_canonical.json")
    prop_long = load_map("concrete_proposals_longtail.json")
    prop_full = {**prop_map, **prop_long}

    # Apply with dedupe per story
    crit_unmapped: Counter[str] = Counter()
    prop_unmapped: Counter[str] = Counter()
    for d in data:
        for field, m, unmapped in (
            ("system_critique", crit_full, crit_unmapped),
            ("concrete_proposals", prop_full, prop_unmapped),
        ):
            values = d.get(field) or []
            seen: set[str] = set()
            out: list[str] = []
            for v in values:
                if v in m:
                    canon = m[v]
                else:
                    canon = v
                    unmapped[v] += 1
                if canon and canon not in seen:
                    seen.add(canon)
                    out.append(canon)
            d[field] = out

    (DATA / "enriched.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Dump unmapped (long-tail) for next-step agent processing
    if crit_unmapped:
        (CANON / "longtail_critique.json").write_text(
            json.dumps(
                [{"label": k, "count": c} for k, c in crit_unmapped.most_common()],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
    if prop_unmapped:
        (CANON / "longtail_proposal.json").write_text(
            json.dumps(
                [{"label": k, "count": c} for k, c in prop_unmapped.most_common()],
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    # Stats
    crit_after: Counter[str] = Counter()
    prop_after: Counter[str] = Counter()
    for d in data:
        crit_after.update(d.get("system_critique") or [])
        prop_after.update(d.get("concrete_proposals") or [])
    print(f"Mapping coverage:", file=sys.stderr)
    print(f"  system_critique: {len(crit_full)} mapped, {len(crit_unmapped)} long-tail still raw", file=sys.stderr)
    print(f"  concrete_proposals: {len(prop_full)} mapped, {len(prop_unmapped)} long-tail still raw", file=sys.stderr)
    print(f"\nTop 10 system_critique now:", file=sys.stderr)
    for k, c in crit_after.most_common(10):
        print(f"  {c:4} {k}", file=sys.stderr)
    print(f"\nTop 10 concrete_proposals now:", file=sys.stderr)
    for k, c in prop_after.most_common(10):
        print(f"  {c:4} {k}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
