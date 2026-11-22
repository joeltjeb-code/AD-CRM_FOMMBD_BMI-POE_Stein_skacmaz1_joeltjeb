"""PLZ-Mittelpunkt-Tabelle (Spec 3.3, Design 3.3 "PLZ-Zentren").

Deterministisches Verfahren — MUSS exakt app/ui/einstellungen.js spiegeln
(posAusPlzFunktion). Die Konstanten ZONEN_STREU / PLZ_STREU / BLOCKRAND und
die Hashes (Multiplikator 31, Modul 9973, Seeds 7/11/3) dürfen nicht ohne
Gegenstück in der App geändert werden; tests/ui/pos-aus-plz.test.js prüft
die Synchronität gegen die erzeugte Datei.

Verfahren:
- 2-stelliges PLZ-Präfix wählt per Hash eine der 5 Cluster-Zonen im OBG-Block.
- Der Anker um die Zone streut per Hash des Präfixes (± ZONEN_STREU).
- Die restlichen PLZ-Stellen streuen per Hash der vollen PLZ (± PLZ_STREU).
- Gleiche PLZ → immer gleiche Position; gleicher Präfix → benachbarte Position.

Aufruf (nach/für den Händlerimport):
  python3 tools/plz_zentren.py            # baut/aktualisiert daten/plz-zentren.json aus daten/haendler.json
  python3 tools/plz_zentren.py --haendler daten/haendler.json

Format: { "version", "verfahren", "zonen": { "<OBG>": { "<PLZ>": {x, y} } } }
Neue PLZ werden ergänzt (rekursives Lernen), bestehende Positionen bleiben
stabil (keine Verschiebung bereits geplanter Gebiete).
"""

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

ZONEN = [[0, 0], [52, 18], [104, 8], [20, 64], [76, 70]]  # Spiegel CLUSTER_ZENTREN
ZONEN_STREU = 28
PLZ_STREU = 6
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


def pos_aus_plz_funktion(plz, obg="D01"):
    plz_norm = str(plz or "").strip()
    m = re.search(r"^D\d{1,2}", str(obg or ""))
    gebiet = m.group(0) if m else "D01"
    o = obg_block_ursprung(gebiet)
    prefix = plz_norm[:2].ljust(2, "0")
    zone = ZONEN[text_hash(prefix, 7) % len(ZONEN)]
    a = text_hash(prefix, 11)
    b = text_hash(plz_norm or "0", 3)
    jx = a % (ZONEN_STREU * 2 + 1) - ZONEN_STREU
    jy = a // 23 % (ZONEN_STREU * 2 + 1) - ZONEN_STREU
    px = b % (PLZ_STREU * 2 + 1) - PLZ_STREU
    py = b // 13 % (PLZ_STREU * 2 + 1) - PLZ_STREU
    return {
        "x": round((o[0] + BLOCKRAND + zone[0] + jx + px) * 10) / 10,
        "y": round((o[1] + BLOCKRAND + zone[1] + jy + py) * 10) / 10,
    }


def lade(pfad):
    pfad = Path(pfad)
    if pfad.exists():
        return json.loads(pfad.read_text(encoding="utf-8"))
    return {"version": 1, "verfahren": "praefix-anker-2026", "zonen": {}}


def speichere(daten, pfad):
    Path(pfad).write_text(
        json.dumps(daten, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def ergaenze(daten, haendler_pfad):
    """Fügt fehlende (OBG, PLZ)-Einträge deterministisch hinzu.

    Bestehende Einträge bleiben unverändert (Stabilität geplanter Fahrzeiten),
    neue fallen unter das deterministische Verfahren.
    """
    haendler = json.loads(Path(haendler_pfad).read_text(encoding="utf-8"))
    zonen = daten.setdefault("zonen", {})
    plz_muster = re.compile(r"\b\d{5}\b")
    neu = 0
    for h in haendler:
        obg = str(h.get("obg") or "").strip() or "D01"
        m = plz_muster.search(str(h.get("adresse") or ""))
        if not m:
            continue
        plz = m.group(0)
        gebiet = zonen.setdefault(obg, {})
        if plz not in gebiet:
            gebiet[plz] = pos_aus_plz_funktion(plz, obg)
            neu += 1
    return neu


def main():
    parser = argparse.ArgumentParser(description="PLZ-Mittelpunkt-Tabelle erzeugen/aktualisieren")
    parser.add_argument("--haendler", default="daten/haendler.json")
    parser.add_argument("--output", default="daten/plz-zentren.json")
    args = parser.parse_args()

    daten = lade(REPO / args.output)
    neu = ergaenze(daten, REPO / args.haendler)
    speichere(daten, REPO / args.output)
    gesamt = sum(len(z) for z in daten.get("zonen", {}).values())
    print(f"{args.output}: {gesamt} PLZ-Einträge ({neu} neu)")


if __name__ == "__main__":
    sys.exit(main())
