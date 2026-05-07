"""Canonicalize enriched.json — collapse synonyms and near-duplicates.

Strategy:
- DIAGNOSES: manual synonym table (small set, high stakes — get it right)
- THEMES: auto-cluster via slug + Levenshtein, keeping the most frequent
  variant as canonical
- SYSTEM_CRITIQUE / CONCRETE_PROPOSALS: same auto-clustering. With long tails
  of singletons, perfection isn't possible — we focus on collapsing the
  obvious cases (case, plural, hyphenation) so the top-N aggregations are
  trustworthy.

Reads:  data/enriched.json
Writes: data/enriched.json (in place — keeps original schema)
        data/canonicalization_log.json (audit trail of what merged into what)
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


# ---------------------------------------------------------------------------
# DIAGNOSES — manual canonical table
# ---------------------------------------------------------------------------
# Each variant maps to its canonical form. Acronyms keep uppercase.

DIAGNOSIS_CANONICAL: dict[str, str] = {
    # ADHD family
    "ADHD": "ADHD", "adhd": "ADHD", "ad(h)d": "ADHD",
    "ADD": "ADD", "add": "ADD",
    # Autism family
    "autism": "autism", "autistisk": "autism", "autismspektrum": "autism",
    "autism nivå 1": "autism", "Autism nivå 1": "autism",
    "autusm": "autism",  # typo in source
    "AST": "autism", "ast": "autism",
    "Asperger": "Asperger",  # keep separate — it's a specific term some prefer
    # Dyslexi / read-write
    "dyslexi": "dyslexi", "dyslexsi": "dyslexi",
    "läs- och skrivsvårigheter": "läs- och skrivsvårigheter",
    "stavningssvårigheter": "läs- och skrivsvårigheter",
    "dyskalkyli": "dyskalkyli",
    "inlärningssvårigheter": "inlärningssvårigheter",
    # NPF umbrella
    "NPF": "NPF", "npf": "NPF",
    # Anxiety family
    "ångest": "ångest",
    "panikångest": "ångest",
    "social ångest": "ångest",
    "social fobi": "ångest",
    "GAD": "ångest",  # generaliserad ångest
    "separationsångestsyndrom": "ångest",
    # Depression family
    "depression": "depression",
    "kronisk depression": "depression",
    "utmattningsdepression": "depression",
    # Trauma
    "PTSD": "PTSD",
    "CPTSD": "PTSD",
    # Burnout (separate from depression — culturally distinct in Swedish discourse)
    "utmattning": "utmattningssyndrom",
    "utmattningssyndrom": "utmattningssyndrom",
    # OCD / tvång
    "OCD": "OCD",
    "tvång": "OCD",
    # IF / intellectual disability
    "IF": "intellektuell funktionsnedsättning",
    "intellektuell funktionsnedsättning": "intellektuell funktionsnedsättning",
    # Speech / language
    "språkstörning": "språkstörning",
    "semantisk språkstörning": "språkstörning",
    "expressiv språkstörning": "språkstörning",
    "verbal dyspraxi": "språkstörning",
    "DLD": "språkstörning",
    # CP-skada
    "cp-skada": "CP-skada",
    "cp-skador": "CP-skada",
    # Eating
    "ARFID": "ARFID",
    "AFRID": "ARFID",  # typo in source
    # Other neuro
    "Tourettes": "Tourettes",
    "trotssyndrom": "trotssyndrom",
    "PDA": "PDA",
    "selektiv mutism": "selektiv mutism",
    "epilepsi": "epilepsi",
    "läppspalt": "läppspalt",
    # Physical / chronic
    "diabetes": "diabetes",
    "celiaki": "celiaki",
    "astma": "astma",
    "POTS": "POTS",
    "EDS": "EDS",
    # Other
    "särbegåvning": "särbegåvning",
    "könsdysfori": "könsdysfori",
}


# ---------------------------------------------------------------------------
# Slug + stem — used for auto-clustering of free-text fields
# ---------------------------------------------------------------------------

def slug(s: str) -> str:
    """Lowercase, strip diacritics from sv letters? No — keep å/ä/ö but
    normalize whitespace, hyphens, casing."""
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    s = s.strip("-")
    return s


# Common Swedish suffixes for naive stemming
SV_SUFFIXES = (
    "erna", "arna", "orna", "are", "ade", "ats",
    "ar", "or", "er", "en", "et", "an", "as",
    "s",
)


def stem(s: str) -> str:
    """Strip one common Swedish suffix from each whitespace/hyphen-separated word."""
    parts = re.split(r"[\s\-]+", s)
    out = []
    for p in parts:
        if len(p) <= 4:
            out.append(p)
            continue
        for suf in SV_SUFFIXES:
            if p.endswith(suf) and len(p) - len(suf) >= 3:
                p = p[: -len(suf)]
                break
        out.append(p)
    return "-".join(out)


def lev(a: str, b: str) -> int:
    """Levenshtein distance — small inputs only, no perf hardening needed."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            curr[j] = min(
                curr[j - 1] + 1,
                prev[j] + 1,
                prev[j - 1] + (0 if ca == cb else 1),
            )
        prev = curr
    return prev[-1]


def cluster_freetext(values: Counter) -> dict[str, str]:
    """Cluster free-text values by slug-equality, then by stem-equality, then
    by Levenshtein <= 1 (for short) / 2 (for long).

    Returns a map from raw → canonical. Canonical = the most frequent form
    in the cluster (ties broken by length, then lexicographically).
    """
    # Group by slug first
    by_slug: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for raw, c in values.items():
        by_slug[slug(raw)].append((raw, c))

    # Then merge slug-clusters whose stems are equal
    by_stem: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for sl, items in by_slug.items():
        by_stem[stem(sl)].extend(items)

    # Then merge stem-clusters by Levenshtein on stems
    keys = list(by_stem.keys())
    parent = {k: k for k in keys}

    def find(k: str) -> str:
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    sorted_keys = sorted(keys, key=len)
    for i, a in enumerate(sorted_keys):
        for b in sorted_keys[i + 1 :]:
            if abs(len(a) - len(b)) > 2:
                continue
            limit = 1 if max(len(a), len(b)) <= 8 else 2
            if lev(a, b) <= limit:
                union(a, b)

    # Build clusters
    clusters: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for k, items in by_stem.items():
        clusters[find(k)].extend(items)

    # Pick canonical per cluster: most frequent, longest, lexicographically first
    mapping: dict[str, str] = {}
    for cluster in clusters.values():
        # Aggregate same-text within the cluster
        agg: Counter[str] = Counter()
        for raw, c in cluster:
            agg[raw] += c
        canonical = sorted(
            agg.items(),
            key=lambda kv: (-kv[1], -len(kv[0]), kv[0].lower()),
        )[0][0]
        for raw in agg:
            mapping[raw] = canonical
    return mapping


# ---------------------------------------------------------------------------

def main() -> int:
    src = DATA / "enriched.json"
    data = json.loads(src.read_text(encoding="utf-8"))

    # Collect raw values per field
    diagnoses_raw: Counter[str] = Counter()
    themes_raw: Counter[str] = Counter()
    crit_raw: Counter[str] = Counter()
    prop_raw: Counter[str] = Counter()
    for d in data:
        diagnoses_raw.update(d.get("diagnoses_mentioned") or [])
        themes_raw.update(d.get("themes") or [])
        crit_raw.update(d.get("system_critique") or [])
        prop_raw.update(d.get("concrete_proposals") or [])

    # Build mappings
    # Diagnoses: manual table, fall through to identity for anything unknown
    diagnoses_map: dict[str, str] = {}
    for raw in diagnoses_raw:
        diagnoses_map[raw] = DIAGNOSIS_CANONICAL.get(raw, raw)

    themes_map = cluster_freetext(themes_raw)
    crit_map = cluster_freetext(crit_raw)
    prop_map = cluster_freetext(prop_raw)

    # Apply mappings — preserve order, drop dupes within a story
    def remap(values: list[str], m: dict[str, str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for v in values:
            cv = m.get(v, v)
            if cv not in seen:
                seen.add(cv)
                out.append(cv)
        return out

    for d in data:
        d["diagnoses_mentioned"] = remap(d.get("diagnoses_mentioned") or [], diagnoses_map)
        d["themes"] = remap(d.get("themes") or [], themes_map)
        d["system_critique"] = remap(d.get("system_critique") or [], crit_map)
        d["concrete_proposals"] = remap(d.get("concrete_proposals") or [], prop_map)

    src.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Audit log: only show non-identity mappings, sorted by frequency
    def merges(raw_counts: Counter[str], m: dict[str, str]) -> list[dict]:
        merged: dict[str, list[tuple[str, int]]] = defaultdict(list)
        for raw, c in raw_counts.items():
            target = m[raw]
            if target != raw:
                merged[target].append((raw, c))
        rows = []
        for canonical, sources in merged.items():
            rows.append(
                {
                    "canonical": canonical,
                    "merged_from": sorted(sources, key=lambda x: -x[1]),
                    "total": sum(c for _, c in sources) + raw_counts.get(canonical, 0),
                }
            )
        rows.sort(key=lambda r: -r["total"])
        return rows

    log = {
        "diagnoses": merges(diagnoses_raw, diagnoses_map),
        "themes": merges(themes_raw, themes_map),
        "system_critique": merges(crit_raw, crit_map),
        "concrete_proposals": merges(prop_raw, prop_map),
    }
    (DATA / "canonicalization_log.json").write_text(
        json.dumps(log, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Print summary
    def stats(name: str, raw: Counter[str], m: dict[str, str]) -> None:
        before = len(raw)
        after = len(set(m.values()))
        print(f"  {name:24s}: {before:5d} → {after:5d}  (-{before-after})", file=sys.stderr)

    print("Canonicalization summary:", file=sys.stderr)
    stats("diagnoses", diagnoses_raw, diagnoses_map)
    stats("themes", themes_raw, themes_map)
    stats("system_critique", crit_raw, crit_map)
    stats("concrete_proposals", prop_raw, prop_map)
    print(f"Wrote enriched.json + canonicalization_log.json", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
