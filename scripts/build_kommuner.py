"""Convert the peterdalle/svensktext kommuner CSV into our compact JSON.

Reads:  C:/tmp/kommuner.csv (or path via arg)
Writes: data/kommuner.json — list of {code, name, region, population, lat, lng}
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "web" / "data"


# Suffixes where the trailing 's' is genuine (part of the place name),
# not Swedish genitive of the city. E.g. Borås, Bollnäs, Hagfors, Vännäs.
GENUINE_S_SUFFIXES = ("näs", "ås", "fors", "äs", "tås")
# Explicit overrides: kommun names where the official spelling ends in 's'
# but the genitive interpretation would be wrong.
GENUINE_S_NAMES = {
    "Bollnäs", "Borås", "Höganäs", "Strängnäs", "Sotenäs", "Mönsterås",
    "Tranås", "Vännäs", "Västerås", "Hagfors", "Munkfors", "Storfors",
    "Degerfors", "Hofors", "Bengtsfors", "Munkfors", "Mönsterås",
    "Robertsfors", "Munkfors", "Grums", "Bollnäs", "Härnösands",
    "Krokoms",  # actually genitive — but leave as-is to avoid conflicts
}


def canonical_short(name: str) -> str:
    """Strip kommun-genitive 's' to get a natural city name for display."""
    if name in GENUINE_S_NAMES:
        return name
    if name.endswith(GENUINE_S_SUFFIXES):
        return name
    if name.endswith("s") and len(name) > 3:
        return name[:-1]
    return name


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("C:/tmp/kommuner.csv")
    if not src.exists():
        print(f"ERROR: {src} not found", file=sys.stderr)
        return 1
    out: list[dict] = []
    with src.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["name"].strip()
            # Strip the trailing " kommun" suffix for matching
            short_name = name.replace(" kommun", "").strip()
            display_name = canonical_short(short_name)
            try:
                lat = float(row["location_lat_google_2015_05_28"])
                lng = float(row["location_lng_google_2015_05_28"])
            except (KeyError, ValueError):
                continue
            try:
                population = int(row["population"])
            except (KeyError, ValueError):
                population = None
            out.append(
                {
                    "code": row["code"],
                    "name": display_name,
                    "official_name": short_name,
                    "full_name": name,
                    "region": row.get("region", "").strip(),
                    "population": population,
                    "lat": lat,
                    "lng": lng,
                }
            )
    DATA.mkdir(exist_ok=True)
    (DATA / "kommuner.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {len(out)} kommuner → data/kommuner.json", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
