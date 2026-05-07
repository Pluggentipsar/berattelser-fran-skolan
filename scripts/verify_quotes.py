"""Verify the 9 hand-picked quotes from the landing carousel are verbatim
substrings of their source stories. Tolerant of whitespace differences (line
breaks vs spaces) but strict on word content."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORIES = json.loads((ROOT / "data" / "stories.json").read_text(encoding="utf-8"))
BY_ID = {s["id"]: s for s in STORIES}

# (id, title_seen, quote_text)
QUOTES = [
    (
        "vii-119",
        "Rätten till utbildning – när systemet sviker våra barn",
        "Skolan ska vara en plats för lärande, trygghet och framtidstro. För alltför många barn har den i stället blivit en plats där de bryts ner psykiskt och fysiskt. Trots att barn har en lagstadgad rätt till utbildning ser vi hur dagens skolsystem, i praktiken, bidrar till ohälsa, utanförskap och i vissa fall total skolfrånvaro.",
    ),
    (
        "vi-009",
        "Till er som fattar beslut om skolan",
        "Ni fattar beslut om skolan utan att behöva genomföra dem. Jag är en av alla dem som dagligen genomför besluten. Ni formulerar mål, visioner och värdeord. Jag står med konsekvenserna i klassrummet. Det är där era beslut möter verkligheten – inte i utredningar, inte i styrdokument, utan bland elever som behöver undervisning, struktur och vuxennärvaro här och nu.",
    ),
    (
        "vi-003",
        "Lärare F - 3 Helsingborg, min lilla berättelse",
        "Vi behöver få klarhet i var gränsen för vår profession går och när vi kan sätta ner fötterna och det går över till annan profession, myndighet eller kan pendlas tillbaka till vårdnadshavare. Annars kommer vår profession att sakta dö ut. Vi kan inte ha hela samhället på våra axlar och dessa stora uppdrag som skolan har fått, det är fullkomligt orimligt. Skolan idag gör eller förväntas göra alldeles för mycket, till en gräns där det brinner i båda ändar men ingen förändring tycks ske.",
    ),
    (
        "vi-002",
        "Berättelse från skolan",
        "Sommaren gick fort som den brukar göra och så var vi där, det var dags för mellanstadiet. Första dagen kom han hem, och berättade att de inte alls skulle vara i två grupper utan alla 32 elever skulle vara i en och samma grupp, i ett klassrum tänkt för ca 20 elever. Och jo de hade två lärare men de skulle också undervisa andra klasser i vissa ämnen så egentligen var det en lärare med 32 elever mest hela tiden. Och sen började cirkusen...",
    ),
    (
        "vii-129",
        "Dagboksanteckningar - en speciallärares vardag",
        "Kära Simona – inte en gång har jag tänkt att dessa elever skulle bli hjälpt av vare sig skoluniform, mer disciplin eller någon form av bestraffningar. Däremot tror jag att medmänsklighet, empati, förståelse, relationsskapande, tydlighet, flexibilitet, finkänslighet, elevinflytande (vilken bok ska vi läsa, vilket utflyktsmål ska vi till, vilken film ska vi se, vilken redovisningsform ska vi ha osv) och höga krav på både undervisning, vårdnadshavare och elever.",
    ),
    (
        "vi-011",
        "Från en funkisförälder",
        "Många dagar när jag stått där vid sängkanten har jag fått till svar att det gör för ont i magen. Det har hänt att han har kräkts på morgonen av stress. Ofta är mitt barn helt okontaktbart och bara kryper ihop till en boll och gömmer sig. Det är inte att han inte vill gå till skolan. Det går bara inte. Det är faktiskt så.",
    ),
    (
        "vii-100",
        "Min berättelse om skolan",
        "Klockan 7.15 stämplar jag in, en ny arbetsdag väntar på en av mina F-6 skolor, bara 4 dagar tills jullovet börjar. På den arbetar jag 30% (1,5 dagar) som specialpedagog utan någon tillgång till speciallärare.",
    ),
    (
        "vii-071",
        "Mitt namn är Hugo",
        "Jag vill att vuxna som fattar beslut kring hur vår skola ska se ut och\nfungerar ska veta att skolan vi har nu inte passar alla barn. Det är\nsom att ni bestämmer hur alla barns hjärnor ska fungera och det är\npå ett och samma sätt.",
    ),
    (
        "vii-090",
        "En skrivbordspedagog?",
        "Är jag en ”skrivbordspedagog”? Ja, definitivt även om jag önskade kunna vara i klassrummet med samundervisning åtföljd av handledning och samtal om pedagogisk innehåll i mycket större utsträckning än idag. Mina uppdrag får jag från rektorn som i sin tur får sina förutsättningar från huvudmannen.",
    ),
]


def normalize(s: str) -> str:
    """Collapse all whitespace to single spaces; strip."""
    return re.sub(r"\s+", " ", s).strip()


def find_verbatim(quote: str, body: str) -> str | None:
    """Find the verbatim slice of body that matches the quote (whitespace-tolerant).

    Returns the actual substring of body (with original whitespace) that
    corresponds to the quote, or None if not found.
    """
    if quote in body:
        return quote
    qn = normalize(quote)
    bn = normalize(body)
    if qn not in bn:
        return None
    # Find the position in body that corresponds to the start of qn in bn.
    # Walk body char by char tracking the normalized position.
    target = bn.find(qn)
    norm_pos = 0
    start = -1
    in_ws = False
    for i, ch in enumerate(body):
        if ch.isspace():
            if not in_ws and norm_pos > 0:
                if norm_pos == target:
                    start = i
                    break
                norm_pos += 1
            in_ws = True
        else:
            if norm_pos == target:
                start = i
                break
            norm_pos += 1
            in_ws = False
    if start == -1:
        return None
    # Walk forward to find end
    end = start
    cnt = 0
    in_ws = False
    target_len = len(qn)
    for i in range(start, len(body)):
        ch = body[i]
        if ch.isspace():
            if not in_ws and cnt > 0:
                cnt += 1
            in_ws = True
        else:
            cnt += 1
            in_ws = False
        if cnt >= target_len:
            end = i + 1
            break
    return body[start:end].strip()


def main() -> int:
    out = []
    failed = 0
    for sid, title_hint, quote in QUOTES:
        story = BY_ID.get(sid)
        if not story:
            print(f"  [{sid}] NOT FOUND", file=sys.stderr)
            failed += 1
            continue
        slice_ = find_verbatim(quote, story["body"])
        if slice_ is None:
            print(f"  [{sid}] {title_hint!r}: NOT IN BODY", file=sys.stderr)
            print(f"    expected: {quote[:120]!r}", file=sys.stderr)
            failed += 1
            continue
        verbatim = slice_ in story["body"]
        print(
            f"  [{sid}] '{story['title'][:50]}': "
            f"{'OK' if verbatim else 'WS-NORMALIZED'} ({len(slice_)} chars)",
            file=sys.stderr,
        )
        out.append(
            {
                "id": sid,
                "title": story["title"],
                "signature": story.get("signature"),
                "volume": story["volume"],
                "chapter": story["chapter"],
                "quote": slice_,
                "verbatim": verbatim,
            }
        )
    if failed:
        print(f"FAILED: {failed} quote(s) could not be verified verbatim", file=sys.stderr)
        return 1
    out_path = ROOT / "data" / "carousel.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out)} verified quotes to {out_path.relative_to(ROOT)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
