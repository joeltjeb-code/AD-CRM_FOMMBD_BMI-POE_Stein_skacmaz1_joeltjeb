# Design-Dokument: Echte Händlerdaten (Betreuungsliste) + OBG-Auswahl

**Datum:** 2026-11-17
**Status:** Vom Nutzer freigegeben (Klärungsrunde + Ansatzwahl am 17.11.2026)
**Teil von:** Außendienst-Assistent; erweitert `2026-11-16-routenplanung-design.md`

## 1. Ziel

Die mit der Referenzdatei `DEU_Betreuungsliste_20260924_GH_Dummy.xlsx`
(hochgeladen am 17.11.2026) zur Verfügung gestellten 1036 Händler (fiktive
Dummy-Daten) ersetzen die 90 generierten Demo-Händler als Datenbasis. Der
Nutzer der App ist ein Außendienstler, der **ein** OBG betreut: Er wählt
sein OBG beim Start aus, die App merkt sich die Auswahl und zeigt und plant nur
dessen Händler.

## 2. Entscheidungen aus der Klärungsrunde

| Frage | Entscheidung |
|---|---|
| Prio-Quelle | Fürs Erste Demo-Prio-Flags (c) — spätere Management-Liste über Import-Flag einwechselbar |
| Sonder-OBGs (`DE`, `neu`, ohne OBG: 64 Händler) | Aus der Routenplanung ausgeschlossen; Planung nur für D01–D12 (895 Händler) |
| Koordinaten | Statische PLZ-Mittelpunkt-Tabelle im Repo (a) |
| OBG-Auswahl | Startbildschirm mit OBG-Auswahl; Auswahl wird gemerkt (localStorage), jederzeit umschaltbar |
| Datenmenge | Alle Händler werden geladen; geplant wird nur der gewählte OBG (73–95 Händler — entspricht der Gebietsgröße 85–95 aus der Basis-Spec, Performance unkritisch) |
| Cluster-Kaskade | Erst Region, dann OBG → technisch: Planungsgebiet = OBG; räumliche Cluster (k-Means auf `pos`, vorhanden) wirken innerhalb des OBGs |

## 3. Datenbasis und Import (Ansatz A: Import-Skript)

### 3.1 Quelle

`DEU_Betreuungsliste_20260924_GH_Dummy.xlsx` im Repo-Root — 1 Sheet,
1036 Datenzeilen, 60 Spalten, Header in Zeile 6 (vier Hinweis-/Titelzeilen
darüber). Eindeutiger Schlüssel: Spalte `Markt Händlernummer`
(Format `DEU` + 5 Stellen, z. B. `DEU90ARN`), 1036/1036 gefüllt und einzigartig.

Wichtige Quellspalten: `Händlername`, `Straße`, `PLZ`, `Ort` (Stammdaten),
`Händlerkategorie` (SDLR/MDLR/BRAN/DEPOT), `Region` (Nord/Süd/Digital),
`OBG` (D01–D12, `DE`, `neu`, leer), `Betreuung`/`Betreuungskategorie`
(Präsenz/Online/keine/DuD, A–D), GF1–GF3, ~25 Ja/Nein-Vertrags-/Programm-Spalten.

### 3.2 Import-Skript `tools/import_betreuungsliste.py`

- Python + openpyxl (im Codespace vorhanden, wird außerhalb des Repos per
  `pip3 install --user openpyxl` nutzbar gemacht; kein npm/Build-Schritt).
- Aufruf: `python3 tools/import_betreuungsliste.py [--input <xlsx>]
  [--output daten/haendler.json] [--alle-obg] [--prio-liste <json>]`
- Verhalten:
  - Header-Zeile automatisch finden (erste Zeile, die mit `Markt` beginnt),
    nicht starr Zeile 6.
  - Zeilen ohne `Markt Händlernummer` verwerfen (Leerzeilen).
  - OBG-Filter: Standard `D01`–`D12`; `--alle-obg` übernimmt auch `DE`/`neu`/leer.
  - Konsistenz-Hinweise sammeln (z. B. `Betreuung` „keine" vs. „Keine",
    Region „Digital") und am Ende als Zusammenfassung ausgeben, ohne abzubrechen.
  - Ausgabe: JSON-Array im Händler-Datenmodell (siehe 3.4), stabil
    sortiert nach `id`.

### 3.3 PLZ-Mittelpunkt-Tabelle `daten/plz-zentren.json`

- Die Zuordnung ist nicht in der Excel und die Orte sind fiktiv: statisch
  erzeugte PLZ-Mittelpunkte, einmalig generiert und committed. Die Generierung
  ist deterministisch: Ankerposition je 2-stelligem PLZ-Präfix, daraus über die
  PLZ-Stellen eine feste Streuung — dieselbe PLZ ergibt immer dieselbe Position.
- Format: Objekt `PLZ -> {x, y}`; jede in der Excel vorkommende PLZ ist genau
  einmal enthalten. Das Import-Skript nutzt sie als Lookup; eine unbekannte PLZ
  erzeugt eine Warnung und eine Fallback-Position, kein stillschweigendes Raten.
- Der Routing-Adapter (Straßenfaktor, kmh, Puffer) bleibt unverändert.

### 3.4 Abbildung auf das Händler-Datenmodell

Bestehendes Modell (`daten/haendler-demo.json`) wird erweitert, nicht ersetzt:

| Feld | Quelle / Herleitung |
|---|---|
| `id` | `Markt Händlernummer` |
| `name` | `Händlername` |
| `adresse` | `Straße` + `PLZ` + `Ort` |
| `pos` | Lookup in `daten/plz-zentren.json` |
| `region`, `obg` | **neu**, direkt aus der Excel |
| `kategorie`, `betreuung`, `betreuungskategorie`, `gf1` | **neu**, direkt (für späteres Briefing) |
| `cluster` | nicht importiert — wird vom Planer je OBG aus `pos` (k-Means) bestimmt |
| `prio` | `false`, außer `id` in Prio-Liste (`--prio-liste`); Demo: Flag-Datei `daten/prio-demo.json` mit Beispiel-IDs |
| `dauer` | Default 90 (nicht in der Excel) |
| `besuchVerlauf` | leer `[]` (Historie startet neu) |

### 3.5 Adapter/Fallback

`app/app.js` lädt künftig `daten/haendler.json`; fehlt es, fällt die App auf
`haendler-demo.json` zurück (mit deutlichem Hinweis im UI). Damit bleibt die
App auch ohne Import lauffähig. Hotels bleiben Demo-Datenobjekte.

## 4. OBG-Auswahl im UI

1. **Startbildschirm:** Kein `obg`-Eintrag im Speicher → Auswahlbildschirm
   mit den OBGs D01–D12 (inkl. Händlerzahl je OBG). Kein Login.
2. **Merken:** Auswahl via `localStorage` (über den bestehenden
   `speicher-adapter.js`, Schlüssel `ausgewaehltesObg`).
3. **Umschalten:** Der gewählte OBG ist im Header sichtbar und jederzeit über
   ein Auswahl-Element wechselbar (Wechsel lädt Händler- und Wochenplan neu;
   bestehende manuelle Plananpassungen des alten OBGs bleiben erhalten,
   werden aber erst beim Rückwechsel wieder angezeigt).
4. **Filterung:** Händlerliste, Planung, Tagesansicht zeigen nur Händler des
   gewählten OBGs.

## 5. Auswirkungen auf die Planungslogik

Unverändert: Tagesskelett, Kaskade Cluster → Fälligkeit → Prio,
Übernachtung, Drag & Drop, Textbefehle. Neu/angepasst:

- Der Planer erhält statt aller Händler nur die Händler des gewählten OBGs
  (Filter vor `bildeCluster`).
- Die bestehenden Konstanten (KADENZ, PRO_WOCHE) bleiben unverändert.
- Mit ~90 Händlern je OBG liegen wir in der getesteten Größenordnung.

## 6. Tests (TDD)

- **Import-Mapping** (Python `unittest`): Zeile → Modell (inkl. Header-Erkennung,
  Leerzeilen, OBG-Filter, Prio-Liste, fehlende PLZ → Warnung + Fallback).
- **PLZ-Zentren** (Node): Lookup deterministisch, unbekannte PLZ → Fehler/Fallback.
- **OBG-Filter** (Node): nur D01–D12, Sonder-OBGs nicht geplant.
- **App-Filter + Persistenz** (Node): OBG-Auswahl wird gespeichert/gelesen;
  Planskandidaten enthalten nur OBG-Händler; Fallback auf Demo-Daten.
- Bestehende 26 Unit-Tests müssen grün bleiben.

## 7. Offene Punkte (bewusst nicht Teil dieses Designs)

- Management-Prio-Liste: Format/Übermittlung steht noch aus — Import-Flag
  `--prio-liste` ist vorbereitet (JSON-Array von `Markt Händlernummern`).
- Live-Abzug aus der GCP: Adapter-Architektur bleibt austauschbar.
- Briefing/Bericht/Wissensbasis (Alt-Spezifikation) — eigenes Vorhaben.
- Manueller Browser-Durchlauf der bestehenden Routenplanung (aus 16.11. offen).
