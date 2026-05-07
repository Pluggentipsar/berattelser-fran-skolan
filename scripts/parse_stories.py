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
DATA = ROOT / "data"

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
        title_text = m.group(2).strip()
        # Real chapter titles always start with an uppercase letter (or a
        # non-letter like a quotation mark). A lowercase start means we've
        # caught a body line that happens to begin with a number — e.g.
        # "70 år, och hur..." (mid-sentence "70 years and how...").
        if title_text and title_text[0].islower():
            continue
        # plausibility: chapter numbers should be small and only mildly jump
        if n == expected or (expected < n <= expected + 5):
            headings.append((i, n, title_text))
            expected = n + 1
    return headings


TITLE_CONTINUATION_BAD = re.compile(r"[.!?]$")
# After a blank, a sentence-shaped line is more likely a body lede
# (the editor's pull-quote intro) than a title continuation. Title fragments
# don't usually contain commas or multiple sentence terminators.
LEDE_COMMA_RE = re.compile(r",")
LEDE_SENTENCE_END_RE = re.compile(r"[.!?…]")


def assemble_title(
    lines: list[str],
    heading_idx: int,
    first_part: str,
    next_heading_idx: int | None = None,
) -> tuple[str, int]:
    """Stitch together a title that wraps across multiple lines.

    PDF titles can span 2-5 lines for long entries, sometimes with blank
    lines BETWEEN the wrap parts (the typesetter's pagination). We keep
    stitching until we hit two blanks in a row, a new chapter heading, a
    page number, or a line that's clearly body prose.

    A line followed by a blank is ambiguous — it could be a title
    continuation OR a short signature like "Anonym". To disambiguate we
    require body text to remain after extending across a blank; otherwise
    the line is more likely the signature/body and not the title.

    Returns (full_title, next_index_after_title).
    """
    title_parts = [first_part]
    j = heading_idx + 1
    seen_blank = False
    MAX_WRAP_LINES = 8
    TITLE_CONT_MAX_LEN = 60

    def has_body_after(idx: int) -> bool:
        """Is there any non-blank, non-pagenumber line between idx and the
        next chapter? Used to refuse extending the title when doing so
        would leave the story with no body."""
        end = next_heading_idx if next_heading_idx is not None else len(lines)
        for k in range(idx, end):
            t = _strip_pageform(lines[k]).rstrip("\n").strip()
            if not t:
                continue
            if PAGE_NUM_RE.match(t):
                continue
            return True
        return False

    while j < heading_idx + 1 + MAX_WRAP_LINES and j < len(lines):
        raw = lines[j]
        nxt = _strip_pageform(raw).rstrip("\n")
        if nxt.strip() == "":
            if seen_blank:
                break  # two consecutive blanks = title is definitely over
            seen_blank = True
            j += 1
            continue
        # Next chapter heading (column-0 numbered line) ends the title
        if not (raw.startswith(" ") or raw.startswith("\t")) and HEADING_RE.match(nxt):
            break
        # Page numbers
        if PAGE_NUM_RE.match(nxt.strip()):
            break
        # Indented lines aren't part of the title
        if raw.startswith(" ") or raw.startswith("\t"):
            break
        # Defensive: a 100+ char line is almost certainly body, not title
        if len(nxt) > 100:
            break
        # Sentence-end on previous part stops continuation
        if TITLE_CONTINUATION_BAD.search(title_parts[-1]):
            break
        if seen_blank:
            # The candidate line is title-continuation only if it stands
            # alone (next line is blank). Body paragraphs span multiple
            # consecutive non-blank lines.
            look_ahead = lines[j + 1] if j + 1 < len(lines) else ""
            look_ahead_clean = _strip_pageform(look_ahead).rstrip("\n").strip()
            if look_ahead_clean != "":
                break  # part of a multi-line paragraph = body
            if len(nxt) > TITLE_CONT_MAX_LEN:
                break
            # Sentence-shaped lines are body ledes, not title parts. A real
            # title fragment doesn't contain a comma, and won't have more
            # than one sentence-end mark. Catches "Jag är så trött, så
            # fruktansvärt trött." and "Hjälp! Hjälp mig. Jag orkar snart
            # inte mer…" while still allowing "utsatthet." or "berättelse".
            if LEDE_COMMA_RE.search(nxt):
                break
            if len(LEDE_SENTENCE_END_RE.findall(nxt)) >= 2:
                break
            # Refuse to absorb the line if doing so leaves no body — that
            # means we're probably looking at a signature, not a title
            # continuation. (e.g. "Misshandlad" + blank + "Anonym" + blank
            # + page-number + next chapter.)
            if not has_body_after(j + 1):
                break
        title_parts.append(nxt.strip())
        seen_blank = False
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
        if k + 1 < len(headings):
            body_end_idx = headings[k + 1][0]
        else:
            body_end_idx = len(lines)
        title, body_start_idx = assemble_title(
            lines, h_idx, first_title, next_heading_idx=body_end_idx
        )
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
