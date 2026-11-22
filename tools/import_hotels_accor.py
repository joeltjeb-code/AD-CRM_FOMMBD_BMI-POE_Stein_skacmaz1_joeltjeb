"""Accor-Export → Hotelliste für die Routenplanung (22.11.).

Quelle: daten/Hotels/Accor_Export_22112026.csv (globaler Hotelbestand,
Semikolon-getrennt, ISO-8859-1). Übernommen werden nur deutsche Häuser mit
Status "Open" — Closed/Deleted fallen weg und werden gezählt.

Ausgabe daten/hotels.json im bekannten Format (id, name, ort, pos, obg,
region, preisNacht) plus brand und echte Koordinaten (lat/lon, nur Doku).

Zwei bewusste Vereinfachungen (Hausarbeits-Kontext, anonymisierte Händlerwelt):
- Die Händlerwelt ist eine synthetische Koordinaten-Karte — echte lat/lon der
  Hotels können also nicht 1:1 in die Karte gemappt werden. Hotels landen
  deterministisch an einer der 5 PLZ-Zonen ihres zugewiesenen OBGs
  (Zone = Hash aus Stadtname, Jitter aus der Hotelnummer — Hash-Muster wie
  in tools/plz_zentren.py und app/ui/einstellungen.js).
- OBG-Zuweisung ausgeglichen per Round-Robin (sortiert nach Stadt+Code),
  damit jedes Planungsgebiet ein ähnliches Hotelangebot hat.

Wichtig fürs Ergebnis: Das Webfrontend zeigt ab jetzt korrekt geschriebene
Namen ("ibis Berlin Mitte", "Mercure Dresden Elbufer" …), nicht mehr die
GROSSBUCHSTABEN aus dem Export. Markenschreibweise aus fester Tabelle,
Rest über deutsche Titel-Schreibweise (Beiwörter klein, Umlaute zurück).

Aufruf (im Repo-Ordner):
  python3 tools/import_hotels_accor.py [--output daten/hotels.json]
"""

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

ZONEN = [[0, 0], [52, 18], [104, 8], [20, 64], [76, 70]]  # Spiegel zu CLUSTER_ZENTREN
BLOCKRAND = 36

# Korrekte Markenschreibweise, Key = brandName aus dem Export (GROSS)
MARKEN = {
    "25HOURS": "25hours",
    "ADAGIO ACCESS": "Adagio Access",
    "ADAGIO ORIGINAL": "Adagio Original",
    "BY MERCURE": "Mercure",
    "FAIRMONT": "Fairmont",
    "GREET": "Greet",
    "HANDWRITTEN": "Handwritten Collection",
    "IBIS BUDGET": "ibis budget",
    "IBIS HOTELS": "ibis",
    "IBIS STYLES": "ibis Styles",
    "INTERCITYHOTEL": "IntercityHotel",
    "JAZ IN THE CITY": "Jaz in the City",
    "MAXX": "MAXX",
    "MGALLERY": "MGallery",
    "MERCURE": "Mercure",
    "MERCURE LIVING": "Mercure Living",
    "MOVENPICK": "Mövenpick",
    "NOVOTEL": "Novotel",
    "NOVOTEL SUITES": "Novotel Suites",
    "OTHER BRAND": "",
    "PULLMAN": "Pullman",
    "SOFITEL": "Sofitel",
    "STEIGENBERGER": "Steigenberger",
    "STEIGENBERGER ICON": "Steigenberger Icon",
    "THE HOXTON": "The Hoxton",
    "TRIBE": "TRIBE",
    "ZLEEP": "Zleep",
}

# Preisspannen je Markenklasse (Übernachtungs-Score nutzt preisNacht/10)
PREIS = [
    (["SOFITEL", "FAIRMONT", "MGALLERY", "MOVENPICK", "STEIGENBERGER ICON"], (135, 165)),
    (["NOVOTEL", "NOVOTEL SUITES", "PULLMAN", "MERCURE", "MERCURE LIVING", "THE HOXTON",
      "25HOURS", "STEIGENBERGER", "JAZ IN THE CITY", "HANDWRITTEN"], (95, 130)),
    (["IBIS HOTELS", "IBIS STYLES", "ADAGIO ORIGINAL", "ADAGIO ACCESS"], (80, 105)),
    (["INTERCITYHOTEL", "TRIBE", "GREET", "MAXX", "OTHER BRAND"], (80, 100)),
    (["IBIS BUDGET", "ZLEEP"], (65, 85)),
]

# Beiwörter, die in der Mitte von Namen klein bleiben
KLEINE_WOERTER = {"am", "an", "auf", "bei", "der", "des", "die", "im", "in", "ob",
                  "und", "vom", "vor", "zum", "zur", "ueber", "über"}

# Der Export transliteriert Umlaute — hier zurück zu Deutsch (kleingeschrieben als Key)
WOERTER = {
    "cologne": "Köln",
    "duerkheim": "Dürkheim",
    "duesseld": "Düsseldorf",
    "duesseldorf": "Düsseldorf",
    "dusseldorf": "Düsseldorf",
    "fra": "Frankfurt",
    "fuerth": "Fürth",
    "koeln": "Köln",
    "koenigsplatz": "Königsplatz",
    "kurfuerstendamm": "Kurfürstendamm",
    "luedenscheid": "Lüdenscheid",
    "muc": "München",
    "sued": "Süd",
    "koenigswinter": "Königswinter",
    "lubeck": "Lübeck",
    "luebeck": "Lübeck",
    "moenchengladbach": "Mönchengladbach",
    "muenchen": "München",
    "munchen": "München",
    "munich": "München",
    "muenster": "Münster",
    "neuenahr": "Neuenahr",
    "nuernberg": "Nürnberg",
    "oeynhausen": "Oeynhausen",
    "osnabrueck": "Osnabrück",
    "plaerrer": "Plärrer",
    "saarbrucken": "Saarbrücken",
    "saarbruecken": "Saarbrücken",
    "tuebingen": "Tübingen",
    "wuerzburg": "Würzburg",
}


def text_hash(text, seed):
    n = seed
    for ch in str(text):
        n = (n * 31 + ord(ch)) % 9973
    return n


def obg_block_ursprung(obg):
    """Blockursprung eines OBGs (4 Spalten x 3 Zeilen), wie im Frontend."""
    m = re.search(r"D(\d{1,2})", str(obg or ""))
    nr = max(0, min(11, int(m.group(1)) - 1)) if m else 0
    return (nr % 4) * 180, (nr // 4) * 150


def titel(text):
    """Deutsche Wortanfangs-Großschreibung; Beiwörter klein, Umlaute zurück."""
    ergebnis = []
    for i, w in enumerate(text.split()):
        klein = w.lower()
        w = WOERTER.get(klein, w)
        if i > 0 and klein in KLEINE_WOERTER and klein not in WOERTER:
            ergebnis.append(klein)
        elif w[:1].isalpha():
            ergebnis.append(w[:1].upper() + w[1:].lower())
        else:
            ergebnis.append(w.lower())
    return " ".join(ergebnis)


def sauber(wert):
    return " ".join(str(wert or "").split())


# Marken-Präfixe für Match am Namensanfang, längster zuerst; "IBIS HOTELS"
# heißt im Hotelnamen nur "IBIS", deshalb der zusätzliche Eintrag.
MARKE_PRÄFIXE = sorted(
    [(k, v) for k, v in MARKEN.items() if k != "OTHER BRAND"] + [("IBIS", "ibis")],
    key=lambda p: -len(p[0]))


def korrekter_name(zeile):
    """HotelName → korrekt geschriebener Anzeigename.

    Schritte: Markenteil am Namensanfang erkennen (längster Treffer zuerst,
    z. B. "IBIS STYLES" vor "IBIS") und mit der Markentabelle spiegeln,
    Rest in Titelschreibweise. Ohne Marken-Treffer greift der Titel-Fallback.
    """
    roh = sauber(zeile.get("hotelName"))
    for schluessel, schoen in MARKE_PRÄFIXE:
        if roh.upper().startswith(schluessel):
            return (schoen + " " + titel(roh[len(schluessel):].strip())).strip()
    return titel(roh)


def preis_fuer(marke_roh, code):
    schluessel = marke_roh.upper()
    for marken, (unten, oben) in PREIS:
        if schluessel in marken:
            return unten + text_hash(code, 3) % (oben - unten + 1)
    return 80 + text_hash(code, 5) % 41  # unbekannte Marke: 80–120


def lese():
    """CSV lesen; deutsche offene Häuser behalten; Zähler fürs Protokoll."""
    zeilen = list(csv.DictReader(open(REPO / "daten/Hotels/Accor_Export_22112026.csv",
                                      encoding="iso-8859-1"), delimiter=";"))
    de = [z for z in zeilen if sauber(z.get("countryCode")).upper() == "DE"]
    offen = [z for z in de if sauber(z.get("hotelStatus")).lower() == "open"]
    behalten = []
    codes = set()
    ohne_name = 0
    for z in offen:
        code = sauber(z.get("hotelCode"))
        if not code or code in codes:
            continue
        if not sauber(z.get("hotelName")) or not sauber(z.get("cityName")):
            ohne_name += 1
            continue
        codes.add(code)
        behalten.append(z)
    konto = {"importiert": len(zeilen), "de": len(de),
             "status_verworfen": len(de) - len(offen), "ohne_name": ohne_name}
    return behalten, konto


def baue(zeilen):
    """Ausgeglichene OBG-Zuweisung (Round-Robin D01..D12) + Kartenposition."""
    zeilen = sorted(zeilen, key=lambda z: (sauber(z.get("cityName")).upper(),
                                           sauber(z.get("hotelCode"))))
    out = []
    obg_zaehler = defaultdict(int)
    for i, z in enumerate(zeilen):
        code = sauber(z.get("hotelCode"))
        stadt = sauber(z.get("cityName"))
        obg = f"D{(i % 12) + 1:02d}"
        obg_zaehler[obg] += 1
        zone = text_hash(stadt.upper(), 7) % len(ZONEN)
        ox, oy = obg_block_ursprung(obg)
        pos = {
            "x": round((ox + BLOCKRAND + ZONEN[zone][0] + text_hash(code, 11) % 25 - 12) * 10) / 10,
            "y": round((oy + BLOCKRAND + ZONEN[zone][1] + text_hash(code, 13) % 25 - 12) * 10) / 10,
        }
        marke_roh = sauber(z.get("brandName"))
        marke = MARKEN.get(marke_roh.upper(), titel(marke_roh))
        out.append({
            "id": f"AC-{code}",
            "name": korrekter_name(z),
            "ort": titel(stadt),
            "brand": marke,
            "pos": pos,
            "region": zone,
            "obg": obg,
            "preisNacht": preis_fuer(marke_roh, code),
            "koordinaten": {
                "lat": float(sauber(z.get("latitude")).replace(",", ".")),
                "lon": float(sauber(z.get("longitude")).replace(",", ".")),
            },
        })
    out.sort(key=lambda h: h["id"])
    return out, dict(sorted(obg_zaehler.items()))


def main():
    parser = argparse.ArgumentParser(description="Accor-Export importieren (nur DE Open)")
    parser.add_argument("--output", default="daten/hotels.json")
    args = parser.parse_args()

    hotels, konto = lese()
    if not hotels:
        sys.exit("Kein passender Datensatz gefunden (DE + Open erwartet).")
    hotels, obg_vert = baue(hotels)
    ziel = REPO / args.output
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(hotels, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Quelle: {konto['importiert']} Zeilen, {konto['de']} DE, "
          f"{konto['status_verworfen']} verworfen (Closed/Deleted), "
          f"{konto['ohne_name']} ohne Name/Stadt")
    print(f"Übernommen: {len(hotels)} geöffnete Häuser -> {ziel}")
    print(f"OBG-Verteilung: {obg_vert}")
    for h in hotels[:5]:
        print("Beispiel:", h["name"], f'({h["brand"]})', h["ort"], f'{h["preisNacht"]} €')


if __name__ == "__main__":
    main()
