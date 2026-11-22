"""Hotels auf die PLZ-Zonen-Geografie setzen (nach Spec 3.3, 22.11.).

Misst nichts neu — hält Namen, Orte, Preise, Marken der bestehenden
hotels-demo.json und berechnet nur die Positionen neu: je OBG an der
zugehörigen PLZ-Zone (Anker = Blockursprung + PLZ_BLOCKRAND + ZONE), mit
deterministischem Jitter aus der Hotel-ID (derselbe Hash wie in
app/ui/einstellungen.js: Multiplikator 31, Modul 9973).

Grund: Die Hotels standen noch an den Cluster-Zentren der alten Demo-Welt
(ohne den 36er-Rand der PLZ-Zonen) — die ÜN-Logik hatte dadurch Hotels
etwas außerhalb der reellen Dealer-Zonen. Adjazenz zum Cluster-Index bleibt
erhalten (region: zone i ↔ 2 Hotels je Zone), nur eben auf der neuen Karte.

Aufruf: python3 tools/positioniere_hotels.py  (idempotent, deterministisch)
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PFAD = REPO / "daten" / "hotels-demo.json"

ZONEN = [[0, 0], [52, 18], [104, 8], [20, 64], [76, 70]]  # Spiegel CLUSTER_ZENTREN
BLOCKRAND = 36


def text_hash(text, seed):
    n = seed
    for ch in str(text):
        n = (n * 31 + ord(ch)) % 9973
    return n


def obg_block_ursprung(obg):
    m = re.search(r"D(\d{1,2})", str(obg or ""))
    nr = max(0, min(11, int(m.group(1)) - 1)) if m else 0
    return (nr % 4) * 180, (nr // 4) * 150


def pos_fuer_hotel(hotel):
    ox, oy = obg_block_ursprung(hotel.get("obg"))
    region = hotel.get("region")
    zone = ZONEN[region % len(ZONEN)] if isinstance(region, int) else ZONEN[text_hash(hotel["id"], 7) % len(ZONEN)]
    jitter_x = text_hash(hotel["id"], 11) % 21 - 10
    jitter_y = text_hash(hotel["id"], 13) % 21 - 10
    return {
        "x": round((ox + BLOCKRAND + zone[0] + jitter_x) * 10) / 10,
        "y": round((oy + BLOCKRAND + zone[1] + jitter_y) * 10) / 10,
    }


def main():
    hotels = json.loads(PFAD.read_text(encoding="utf-8"))
    verändert = 0
    for ho in hotels:
        if not ho.get("obg"):
            continue
        neu = pos_fuer_hotel(ho)
        if neu != ho.get("pos"):
            ho["pos"] = neu
            verändert += 1
    PFAD.write_text(json.dumps(hotels, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"hotels-demo.json: {len(hotels)} Hotels, {verändert} Positionen neu gesetzt")


if __name__ == "__main__":
    sys.exit(main())
