"""Parse Berättelser från skolan PDF text dumps into a structured stories.json.

Input:  data/vol_i.txt, data/vol_ii.txt   (output of: pdftotext -enc UTF-8 -layout)
Output: data/stories.json

Heuristics:
  * Body chapter headings appear at column 0 (no leading whitespace) as
    "<N> <Title text>", with monotonically increasing N within a volume.
  * TOC entries also use the same numbering but are *always* indented (>= 4
    leading spaces) and end with a dot-leader and page number.
  * A chapter title can wrap onto the next 1-2 lines before the body starts
    (heuristic: continuation line starts with a lower- or upper-case letter,
    isn't blank, and contains no period).
  * Page numbers appear as bare integers on their own line within bodies and
    are stripped.
  * Form-feed (\\x0c) characters mark page breaks; we strip them.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"

VOLUMES = [
    {"id": "i",  "label": "Volym I",  "src": "vol_i.txt"},
    {"id": "ii", "label": "Volym II", "src": "vol_ii.txt"},
]

HEADING_RE = re.compile(r"^(\d{1,4})\s+(\S.*?)\s*$")
PAGE_NUM_RE = re.compile(r"^\d{1,4}$")


def _strip_pageform(s: str) -> str:
    """Remove leading form-feed page-break markers."""
    return s.lstrip("\x0c")


def find_body_start(lines: list[str]) -> int:
    """Return index of first body chapter heading (the line with `1 <Title>`).

    The TOC always indents entries with spaces; the body never does. We look
    for the first occurrence of `1 <Title>` at column 0 (after stripping any
    form-feed page-break markers).
    """
    for i, ln in enumerate(lines):
        s = _strip_pageform(ln).rstrip("\n")
        if not s:
            continue
        # body lines never start with whitespace; TOC always does
        if s.startswith(" ") or s.startswith("\t"):
            continue
        m = HEADING_RE.match(s)
        if m and int(m.group(1)) == 1:
            return i
    raise RuntimeError("Could not locate body start (chapter 1)")


def collect_headings(lines: list[str], body_start: int) -> list[tuple[int, int, str]]:
    """Return list of (line_index, chapter_number, title_first_line).

    Only accept headings whose chapter number is exactly the next expected
    one (or a small jump, to tolerate skipped numbers). This filters out
    paragraph noise like years (`1994 ...`) or page references.
    """
    headings: list[tuple[int, int, str]] = []
    expected = 1
    for i in range(body_start, len(lines)):
        raw = lines[i]
        s = _strip_pageform(raw).rstrip("\n")
        if not s:
            continue
        if s.startswith(" ") or s.startswith("\t"):
            continue  # TOC-style indentation = not a body heading
        m = HEADING_RE.match(s)
        if not m:
            continue
        n = int(m.group(1))
        # plausibility: chapter numbers should be small and only mildly jump
        if n == expected or (expected < n <= expected + 5):
            headings.append((i, n, m.group(2).strip()))
            expected = n + 1
    return headings


TITLE_CONTINUATION_BAD = re.compile(r"[.!?]$")


def assemble_title(lines: list[str], heading_idx: int, first_part: str) -> tuple[str, int]:
    """Stitch together title that wraps across 1-2 lines.

    Returns (full_title, next_index_after_title).
    """
    title_parts = [first_part]
    j = heading_idx + 1
    while j < heading_idx + 3 and j < len(lines):
        raw = lines[j]
        nxt = _strip_pageform(raw).rstrip("\n")
        if nxt.strip() == "":
            break
        # Stop if the next line looks like a new heading or page number
        if not (raw.startswith(" ") or raw.startswith("\t")) and HEADING_RE.match(nxt):
            break
        if PAGE_NUM_RE.match(nxt.strip()):
            break
        # Continuation lines for a title are short and not indented further
        # than the heading itself.
        if raw.startswith(" ") or raw.startswith("\t"):
            break
        if len(nxt) > 80:
            break
        if TITLE_CONTINUATION_BAD.search(title_parts[-1]):
            break
        title_parts.append(nxt.strip())
        j += 1
    return " ".join(p.strip() for p in title_parts).strip(), j


def clean_body(raw_lines: list[str]) -> str:
    """Strip page-number-only lines, form-feeds, normalise paragraph breaks."""
    out: list[str] = []
    for ln in raw_lines:
        s = ln.replace("\x0c", "")
        if PAGE_NUM_RE.match(s.strip()):
            continue
        out.append(s.rstrip())
    # collapse 3+ blank lines into 2
    text = "\n".join(out)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def detect_signature(body: str) -> str | None:
    """Try to extract a trailing signature (e.g. "Mamma", "Johanna", "/Anna").

    Heuristic: last non-empty line if short (<60 chars), not ending in period,
    and looks like a name/role attribution.
    """
    lines = [l.strip() for l in body.split("\n") if l.strip()]
    if not lines:
        return None
    last = lines[-1]
    if len(last) > 80:
        return None
    # Common signature shapes
    if (
        last.startswith(("/", "—", "–"))
        or re.match(r"^[A-ZÅÄÖ][A-Za-zåäöÅÄÖ' \-,/]{1,79}$", last)
    ):
        # avoid sentences disguised as names
        if "." not in last[:-1] and "," not in last:
            return last
        # accept "Mamma till X" style
        if re.match(r"^(Mamma|Pappa|Lärare|Förälder|Rektor|Specialpedagog|Mormor|Farmor|Anonym|En)\b", last):
            return last
    return None


SKIP_TITLE_PATTERNS = [
    re.compile(r"^s[öo]kning\s+nyckelord", re.IGNORECASE),
    re.compile(r"^nyckelordsregister", re.IGNORECASE),
]


def is_skip_title(title: str) -> bool:
    return any(p.search(title) for p in SKIP_TITLE_PATTERNS)


def parse_volume(volume: dict) -> list[dict]:
    src = DATA / volume["src"]
    text = src.read_text(encoding="utf-8")
    lines = text.split("\n")
    # ensure trailing newline doesn't lose a line
    if not lines[-1]:
        lines = lines[:-1]
    body_start = find_body_start(lines)
    headings = collect_headings(lines, body_start)
    print(f"[{volume['id']}] body starts at line {body_start+1}, {len(headings)} chapters detected", file=sys.stderr)

    stories: list[dict] = []
    for k, (h_idx, n, first_title) in enumerate(headings):
        title, body_start_idx = assemble_title(lines, h_idx, first_title)
        if k + 1 < len(headings):
            body_end_idx = headings[k + 1][0]
        else:
            body_end_idx = len(lines)
        if is_skip_title(title):
            continue
        body_lines = lines[body_start_idx:body_end_idx]
        body = clean_body(body_lines)
        if not body:
            continue
        sig = detect_signature(body)
        word_count = len(re.findall(r"\w+", body, flags=re.UNICODE))
        stories.append(
            {
                "id": f"v{volume['id']}-{n:03d}",
                "volume": volume["id"],
                "volume_label": volume["label"],
                "chapter": n,
                "title": title,
                "body": body,
                "signature": sig,
                "word_count": word_count,
            }
        )
    return stories


def main() -> int:
    all_stories: list[dict] = []
    for vol in VOLUMES:
        all_stories.extend(parse_volume(vol))
    out = DATA / "stories.json"
    out.write_text(
        json.dumps(all_stories, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    total_words = sum(s["word_count"] for s in all_stories)
    print(
        f"Wrote {len(all_stories)} stories ({total_words:,} words) → {out.relative_to(ROOT)}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
