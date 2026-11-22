#!/usr/bin/env python3
"""Import der Betreuungsliste (XLSX) in das Händler-Datenmodell.

Design 3.2/3.4 (docs/superpowers/specs/2026-11-17-haendlerimport-obg-design.md):
- Header-Zeile automatisch finden (erste Zeile, die "Markt Händlernummer" enthält)
- Zeilen ohne gültige Händlernummer (Format DEU + 5 Zeichen) verwerfen, mit Warnung
- OBG-Filter: standardmäßig nur D01–D12 (Planungsgebiete), --alle-obg übernimmt den Rest
- Position: dasselbe deterministische Demo-Verfahren wie die App (posAusPlz),
  je PLZ und OBG — Ersatz, bis echte PLZ-Zentren importiert sind
- Archiv: Kopie der Quelldatei nach daten/betreuungslisten/<stamp>_<name>
  (Versionsspeicher im Repo für künftige Vergleiche / rekursives Lernen)

Aufruf:
  python3 tools/import_betreuungsliste.py [--input XLSX] [--output daten/haendler.json]
      [--alle-obg] [--prio-liste daten/prio.json]

Ausgabeobjekt: JSON-Array, stabil sortiert nach id.
"""

import argparse
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl fehlt: pip3 install --user openpyxl")

REPO = Path(__file__).resolve().parent.parent
HND_NUMMER = re.compile(r"^DEU[0-9A-Z]{5}$")
PLANUNGS_OBG = re.compile(r"^D(0[1-9]|1[0-2])$")

CLUSTER_ZENTREN = [(0, 0), (52, 18), (104, 8), (20, 64), (76, 70)]


def obg_block_ursprung(obg):
    m = re.search(r"D(\d{1,2})", str(obg or ""))
    nr = max(0, min(11, int(m.group(1)) - 1)) if m else 0
    return (nr % 4) * 180, (nr // 4) * 150


def pos_aus_plz(plz, obg="D01"):
    n = 7
    for ch in str(plz):
        n = (n * 31 + ord(ch)) % 9973
    jx = n % 41 - 20
    jy = n // 41 % 41 - 20
    cx = sum(z[0] for z in CLUSTER_ZENTREN) / len(CLUSTER_ZENTREN)
    cy = sum(z[1] for z in CLUSTER_ZENTREN) / len(CLUSTER_ZENTREN)
    ox, oy = obg_block_ursprung(obg)
    return {"x": round((ox + cx + jx) * 10) / 10, "y": round((oy + cy + jy) * 10) / 10}


def finde_kopfzeile(zeilen):
    for i, zeile in enumerate(zeilen):
        werte = [str(v).strip() if v is not None else "" for v in zeile]
        if any("händlernummer" in w.lower() for w in werte):
            return i, werte
    sys.exit("Keine Kopfzeile mit 'Händlernummer' gefunden")


def waehle_spalten(kopf):
    """Ordnet Spaltennamen den Zielfeldern zu (robust gegen Umbenennung)."""
    zuordnung = {}
    for i, name in enumerate(kopf):
        t = name.lower()
        if "markt" in t and "händlernummer" in t:
            zuordnung.setdefault("id", i)
        elif "händlername" in t or t == "name":
            zuordnung.setdefault("name", i)
        elif "straße" in t or "strasse" in t:
            zuordnung.setdefault("strasse", i)
        elif t == "plz" or t.endswith("plz"):
            zuordnung.setdefault("plz", i)
        elif t == "ort":
            zuordnung.setdefault("ort", i)
        elif t == "obg":
            zuordnung.setdefault("obg", i)
        elif "händlerkategorie" in t:
            zuordnung.setdefault("kategorie", i)
        elif "betreuungskategorie" in t:
            zuordnung.setdefault("betreuungKategorie", i)
        elif t == "betreuung":
            zuordnung.setdefault("betreuung", i)
        elif t == "region":
            zuordnung.setdefault("region", i)
        elif t == "gf1":
            zuordnung.setdefault("gf1", i)
    fehl = [f for f in ("id", "name") if f not in zuordnung]
    if fehl:
        sys.exit(f"Unverzichtbare Spalten fehlen: {fehl}")
    return zuordnung


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="Dummy_Data/DEU_Betreuungsliste_20260924_GH_Dummy.xlsx")
    parser.add_argument("--output", default="daten/haendler.json")
    parser.add_argument("--archiv", default="daten/betreuungslisten")
    parser.add_argument("--alle-obg", action="store_true")
    parser.add_argument("--prio-liste", default=None)
    args = parser.parse_args()

    quelle = Path(args.input)
    if not quelle.exists():
        sys.exit(f"Eingabedatei fehlt: {quelle}")

    prio = set()
    if args.prio_liste and Path(args.prio_liste).exists():
        prio = set(json.loads(Path(args.prio_liste).read_text(encoding="utf-8")))

    mappe = openpyxl.load_workbook(quelle, read_only=True)
    blatt = mappe.active
    zeilen = list(blatt.iter_rows(values_only=True))
    kopf_i, kopf = finde_kopfzeile(zeilen)
    spalten = waehle_spalten(kopf)
    print(f"Kopfzeile: {kopf_i + 1}, Spalten zugeordnet: {sorted(spalten)}")

    def wert(zeile, feld, standard=""):
        i = spalten.get(feld)
        if i is None:
            return standard
        v = zeile[i] if i < len(zeile) else None
        return str(v).strip() if v is not None else standard

    händler = []
    warnungen = []
    verworfen = 0
    nummern = set()
    for zeile in zeilen[kopf_i + 1:]:
        nummer = wert(zeile, "id").upper()
        if not HND_NUMMER.match(nummer):
            if any(str(v).strip() for v in zeile if v is not None):
                verworfen += 1
                warnungen.append("Zeile ohne gültige Händlernummer verworfen")
            continue
        if nummer in nummern:
            warnungen.append(f"Duplikat übersprungen: {nummer}")
            continue
        obg = wert(zeile, "obg").upper()
        if not args.alle_obg and not PLANUNGS_OBG.match(obg):
            verworfen += 1
            warnungen.append(f"Sonder-OBG '{obg or 'leer'}' verworfen ({nummer})")
            continue
        plz = wert(zeile, "plz")
        if not plz:
            warnungen.append(f"Keine PLZ bei {nummer} — Fallback-Position")
        nummern.add(nummer)
        händler.append({
            "id": nummer,
            "name": wert(zeile, "name") or nummer,
            "adresse": f"{wert(zeile, 'strasse')}, {plz} {wert(zeile, 'ort')}".strip(", "),
            "pos": pos_aus_plz(plz, obg or "D01"),
            "obg": obg or "leer",
            "region": wert(zeile, "region"),
            "kategorie": wert(zeile, "kategorie"),
            "betreuung": wert(zeile, "betreuung"),
            "betreuungKategorie": wert(zeile, "betreuungKategorie"),
            "gf1": wert(zeile, "gf1"),
            "dauer": 90,
            "prio": nummer in prio,
            "besuchVerlauf": [],
        })

    händler.sort(key=lambda h: h["id"])
    ziel = REPO / args.output
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(händler, ensure_ascii=False, indent=1), encoding="utf-8")

    stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    archiv = REPO / args.archiv
    archiv.mkdir(parents=True, exist_ok=True)
    archiv_pfad = archiv / f"{stamp}_{quelle.name}"
    shutil.copy2(quelle, archiv_pfad)

    obg_zaehlung = {}
    for h in händler:
        obg_zaehlung[h["obg"]] = obg_zaehlung.get(h["obg"], 0) + 1
    print(f"Importiert: {len(händler)} Händler -> {ziel}")
    print(f"Verworfen: {verworfen}")
    print(f"OBG-Verteilung: {dict(sorted(obg_zaehlung.items()))}")
    print(f"Archiviert: {archiv_pfad.relative_to(REPO)}")
    for w in warnungen[:10]:
        print("Hinweis:", w)
    if len(warnungen) > 10:
        print(f"... und {len(warnungen) - 10} weitere Hinweise")


if __name__ == "__main__":
    main()
