"""Merge per-batch enrichment outputs into a single enriched.json.

Reads:  data/batches/enriched_*.json  (output of sub-agents)
        data/stories.json              (for verbatim pull_quote validation)
Writes: data/enriched.json
        data/enriched_issues.json      (per-id list of repaired/dropped fields)

Validates:
- Every input story has a corresponding output entry (else: log + use null entry)
- pull_quote is a verbatim substring of body; if not, attempt to find a near-match
  in body (whitespace-tolerant); else drop the quote (set to null)
- role/stadium/sentiment values match the allowed enum; else null
- themes/diagnoses/system_critique/concrete_proposals are arrays of strings
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BATCHES = DATA / "batches"

ALLOWED_ROLE = {
    "lärare", "förälder", "elev", "skolledare",
    "specialpedagog", "förskollärare", "annan",
}
ALLOWED_STADIUM = {
    "förskola", "förskoleklass", "lågstadiet", "mellanstadiet",
    "högstadiet", "gymnasiet", "vuxenutbildning", "övergripande",
}
ALLOWED_SENTIMENT = {"förtvivlad", "frustrerad", "saklig", "hoppfull", "kritisk"}


def normalize_quote(q: str | None, body: str) -> tuple[str | None, str | None]:
    """Verify pull_quote is verbatim in body. Return (clean_quote, issue) tuple.

    The returned quote is always a verbatim substring of body, or None.
    """
    if not q or not isinstance(q, str):
        return None, None
    q = q.strip().strip('"').strip("“”‘’")
    if not q:
        return None, None
    if q in body:
        return q, None
    # Whitespace-tolerant match: collapse all whitespace and check if quote is in body
    body_collapsed = re.sub(r"\s+", " ", body)
    q_collapsed = re.sub(r"\s+", " ", q)
    if q_collapsed in body_collapsed:
        # Find the verbatim slice in body that corresponds to q_collapsed
        # by walking through body characters, skipping whitespace alignment
        idx = body_collapsed.find(q_collapsed)
        # Map collapsed index back to original body index
        cnt = 0
        start = 0
        for i, ch in enumerate(body):
            if cnt == idx:
                start = i
                break
            if ch.isspace():
                # collapsed sees one space per whitespace run
                if i == 0 or not body[i - 1].isspace():
                    cnt += 1
            else:
                cnt += 1
        end = start
        # Walk forward until we've matched q_collapsed length in collapsed-space
        cnt2 = 0
        for i in range(start, len(body)):
            ch = body[i]
            if ch.isspace():
                if i == start or not body[i - 1].isspace():
                    cnt2 += 1
            else:
                cnt2 += 1
            if cnt2 >= len(q_collapsed):
                end = i + 1
                break
        verbatim = body[start:end]
        return verbatim, "whitespace-normalized"
    return None, "not-in-body"


def coerce(meta: dict, story: dict) -> tuple[dict, list[str]]:
    issues: list[str] = []
    out: dict = {"id": story["id"]}

    role = meta.get("role")
    out["role"] = role if role in ALLOWED_ROLE else None
    if role and out["role"] is None:
        issues.append(f"role={role!r}->null")

    stad = meta.get("stadium")
    out["stadium"] = stad if stad in ALLOWED_STADIUM else None
    if stad and out["stadium"] is None:
        issues.append(f"stadium={stad!r}->null")

    sent = meta.get("sentiment")
    out["sentiment"] = sent if sent in ALLOWED_SENTIMENT else None
    if sent and out["sentiment"] is None:
        issues.append(f"sentiment={sent!r}->null")

    def _list(name: str, max_n: int) -> list[str]:
        v = meta.get(name) or []
        if not isinstance(v, list):
            issues.append(f"{name}-not-list")
            return []
        cleaned: list[str] = []
        for x in v[:max_n]:
            if isinstance(x, str) and x.strip():
                cleaned.append(x.strip())
        return cleaned

    out["themes"] = _list("themes", 6)
    out["diagnoses_mentioned"] = _list("diagnoses_mentioned", 8)
    out["system_critique"] = _list("system_critique", 6)
    out["concrete_proposals"] = _list("concrete_proposals", 6)

    geo = meta.get("geo_hint")
    out["geo_hint"] = geo.strip() if isinstance(geo, str) and geo.strip() else None

    quote, issue = normalize_quote(meta.get("pull_quote"), story["body"])
    if issue:
        issues.append(f"pull_quote-{issue}")
    out["pull_quote"] = quote

    return out, issues


def main() -> int:
    stories = json.loads((DATA / "stories.json").read_text(encoding="utf-8"))
    by_id = {s["id"]: s for s in stories}

    # Collect all batch outputs
    enriched_by_id: dict[str, dict] = {}
    missing_batches: list[str] = []
    for path in sorted(BATCHES.glob("enriched_*.json")):
        try:
            arr = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"FAILED to parse {path.name}: {e}", file=sys.stderr)
            missing_batches.append(path.stem)
            continue
        if not isinstance(arr, list):
            print(f"FAILED: {path.name} is not a JSON array", file=sys.stderr)
            missing_batches.append(path.stem)
            continue
        for entry in arr:
            sid = entry.get("id")
            if sid:
                enriched_by_id[sid] = entry

    issues_log: dict[str, list[str]] = {}
    output: list[dict] = []
    missing_ids: list[str] = []
    for s in stories:
        meta = enriched_by_id.get(s["id"])
        if meta is None:
            missing_ids.append(s["id"])
            output.append(
                {
                    "id": s["id"],
                    "role": None,
                    "stadium": None,
                    "themes": [],
                    "sentiment": None,
                    "geo_hint": None,
                    "diagnoses_mentioned": [],
                    "system_critique": [],
                    "concrete_proposals": [],
                    "pull_quote": None,
                }
            )
            issues_log[s["id"]] = ["missing-from-batches"]
            continue
        clean, iss = coerce(meta, s)
        if iss:
            issues_log[s["id"]] = iss
        output.append(clean)

    (DATA / "enriched.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA / "enriched_issues.json").write_text(
        json.dumps(issues_log, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    pulls = sum(1 for o in output if o["pull_quote"])
    roles = sum(1 for o in output if o["role"])
    stadia = sum(1 for o in output if o["stadium"])
    print(f"Stories: {len(output)} | with pull_quote: {pulls} | with role: {roles} | with stadium: {stadia}", file=sys.stderr)
    print(f"Missing batch entries: {len(missing_ids)}", file=sys.stderr)
    print(f"Stories with issues: {len(issues_log)}", file=sys.stderr)
    if missing_batches:
        print(f"FAILED batches: {missing_batches}", file=sys.stderr)
    if missing_ids[:10]:
        print(f"First missing ids: {missing_ids[:10]}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
