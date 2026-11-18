# Design-Dokument: Briefing, Bericht & Wissensbasis im Außendienst-Assistenten

**Datum:** 2026-11-18
**Status:** Vom Nutzer freigegeben (Klärungsrunde + Design-Vorlage am 18.11.2026)
**Teil von:** Außendienst-Assistent (siehe `AGENTS.md`, Abschnitt "Außendienst-Assistent")
**Anforderungsquelle:** Praktiker-Interview mit einem Außendienstler (David), 18.11.2026
**Related:** `2026-11-16-routenplanung-design.md`, `2026-11-17-haendlerimport-obg-design.md`

## 1. Ziel

Der Außendienst-Assistent erhält vier Elemente, die den realen Arbeitsablauf
vor und nach einem Händlerbesuch abbilden:

1. **Briefing vor Termin** — 5-Minuten-Überblick pro geplantem Termin.
2. **Bericht nach Termin** — Stichpunkte → strukturierter Bericht → E-Mail-Entwurf.
3. **Wissensbasis / Händlerakte** — das Gedächtnis hinter beiden Abläufen.
4. **Info-Verteilung** — selektives Weiterleiten von Rundschreiben/Mailings.

Entscheidendes Designprinzip aus dem Interview: Der Agent liefert **Bausteine
und Anlagen**, der Außendienstler formuliert die persönliche Ergänzung selbst.
Keine vollgenerierten KI-Texte ("KI-Slop" wurde im Interview explizit abgelehnt).

## 2. Anforderungen aus dem Interview

### 2.1 Interview-Erkenntnisse

| Bereich | Davids Praxis | Konsequenz für den Agenten |
|---|---|---|
| Vorbereitung | Kurzfristig zwischen Terminen; Scorecard (WKR-Performance, Wischerdisplay/AFSB), offene Maßnahmenpläne prüfen und ansprechen | Briefing in unter 5 Minuten erfassbar; KPIs und Maßnahmen zuerst |
| Auf dem Parkplatz | STP und TVA kurz vor dem Termin lesen | Schnellblatt je Händler mit STP, TVA, ZA-Befreiung (Demo-Werte) |
| Persönliche Infos | Kein System; OneNote je Händler als positives Gegen-Vorbild (Tim Kneiss) | Händlerakte mit freien persönlichen Notizen |
| Folgetermin | Wird direkt vor Ort vereinbart, ca. 6 Wochen später | Kadenz-Feld (Standard 6 Wochen); Agent schlägt Folgetermin im Planungsmodul vor |
| Nachbereitung | Vorbereitete Outlook-Entwürfe je Kampagne (z. B. WKR), ergänzt nur persönliche Punkte; TVA immer angehängt, Focus-Produkt-Mails mit Trainings-Link | E-Mail-Entwurf aus Kampagnen-Bausteinen inkl. Anhang-Liste; TVA als Pflichtanhang |
| Ton | Persönlich; keine vollgenerierte KI-Mail aus Stichpunkten | Baustein-Ansatz mit freiem Ergänzungsfeld |
| Info-Verteilung | Selektiv (etwa die Hälfte), Mehrwert statt Überflutung, da Händler ohnehin viel Post bekommen | Selektionslogik mit Mehrwert-Kriterium; immer nur Vorschlag, kein Auto-Versand |
| Planungs-Ansicht | Google-Maps-Karte mit Farbcodierung nach Besuchs-Historie | Plan-View farbcodiert Händler nach letztem Besuch |
| Terminpensum | 12 Termine/Woche, 3/Tag (Freitags-Check) | Bestätigt die bestehende Routenplanung-Spec — keine Änderung nötig |

### 2.2 Datenbasis (Demo)

- Nur ausgedachte Daten (gemäß `AGENTS.md`).
- Händler-ID bleibt die **Markt Händlernummer** (konsistent zum Händlerimport,
  Spec `2026-11-17-haendlerimport-obg-design.md`).
- Scorecard-/KPI-Daten (WKR-Performance, Wischerdisplay-Bestellung, AFSB-Status)
  kommen als Demo-Datensatz über einen Adapter; später wäre ein echter
  Connector an dessen Stelle, ohne Änderung der Logik.

## 3. Elemente

### 3.1 Wissensbasis / Händlerakte (`app/wissensbasis/`)

Je Händler (ID = Marktnummer) eine Akte mit:

- `stammdaten`: Name, Anrede/Geschäftsführung (GF1–GF3, aus dem Import)
- `persoenlicheNotizen`: `[{datum, text}]` — Geburtstage, private Gesprächsthemen
- `besuchHistorie`: `[{terminId, datum, teilnehmer, themen, kernpunkte}]`
- `offeneMassnahmen`: `[{titel, beschreibung, verantwortlich, frist, status: offen|erledigt}]`
- `kpiWerte`: je Händler aus dem Scorecard-Demo-Datensatz (siehe 3.3)
- `prioThemen`: relevante Kampagnen je Händler (aus Prio-Liste des Imports)
- `folgeterminKadenzWochen`: Standard 6; wird an das Planungsmodul übergeben

### 3.2 Briefing vor Termin (`app/briefing/`)

Eingabe: geplanter Termin. Ausgabe: 5-Minuten-Ansicht mit

1. KPI-Block: WKR-Performance, Wischerdisplay-Bestellung, AFSB-Status (Demo)
2. Offene Maßnahmen mit Verantwortlich + Frist
3. Letzte Gesprächsstände (aus `besuchHistorie`)
4. Persönliche Notizen, inkl. Hinweis auf anstehende Geburtstage
5. Umsetzbare Themen mit Prio-Fahne (Nutzer-Eingabe oder `prioThemen`)
6. Schnellblatt "Auf dem Parkplatz": STP, TVA, ZA-Befreiung

### 3.3 Bericht + E-Mail nach Termin (`app/bericht/`)

**Bericht:** Stichpunkte (Freitext) + Händler + Datum + Teilnehmer →
strukturierter Bericht: Händler, Datum, Teilnehmer, Themen, Vereinbarungen,
Aufgaben (Verantwortlicher + Frist), offene Punkte. Aufgabe lassen sich beim
Freigeben direkt in `offeneMassnahmen` übernehmen.

**E-Mail-Entwurf:** Baustein-Mechanismus

- `daten/kampagnen-bausteine.json`: je Kampagne `{id, titel, betreff,
  textbausteine[], anhaenge[{name, typ}], links[]}`
- Beim Freigeben wählt der Nutzer die Kampagne; der Entwurf besteht aus
  Standard-Betreff + Bausteintexten + Anhang-Liste sowie einem leeren Feld für
  die persönliche Ergänzung
- **TVA ist Pflichtanhang**; Focus-Produkt-Anlagen (z. B. Windschutzscheiben-
  Trainings-Link) kommen aus dem Baustein der gewählten Kampagne
- Anhänge sind in der Demo Platzhalter-Objekte (Name + Typ), keine echten PDFs
- Texterzeugung läuft über `text-adapter.js` (siehe Abschnitt 4). In der Demo
  ist der Adapter die deterministische Baustein-Auswahl; keine LLM-API-Aufrufe
  im Codespace.

### 3.4 Info-Verteilung (AOB) (`app/infodist/`)

- `daten/infos.json`: Rundschreiben/Mailings `{id, quelle, datum, themen[],
  zielgruppen[], mehrwertNotiz}`
- Der Agent schlägt selektiv vor, wenn mindestens ein Mehrwert-Kriterium
  erfüllt ist (thematisch passend zu Händler, Historie oder aktueller
  Kampagne) **und** die Info an diesen Händler noch nicht gestoßen wurde.
- Ergebnis ist eine Vorschlagsliste mit Begründung ("Warum diesem Händler
  vorschlagen?") — **kein Auto-Versand**, das Senden bleibt immer eine
  Nutzerentscheidung.
- **Phasenmodell (vom Nutzer festgelegt):**
  - **Phase 1 (Demo):** Simulierte Mailbox `daten/postfach-demo.json` über
    `mail-adapter.js` — der Agent scannt Demo-Mails.
  - **Phase 2 (perspektivisch, nicht Teil dieser Implementierung):** Echte
    Outlook-Mailbox (z. B. Microsoft Graph) hinter demselben `mail-adapter`.
    Der Adapter-Vertrag wird so entworfen, dass Phase 2 ohne Logikänderung
    einwechseln kann.

## 4. Architektur (Ansatz C: Bausteine + LLM hinter Adapter)

Erweiterung der bestehenden Struktur (Spec `2026-11-16-routenplanung-design.md`,
Ansatz B: Modular ohne Build-Schritt):

```
app/
  adapter/
    mail-adapter.js        # NEU: Mailbox (Demo: postfach-demo.json, später: Outlook)
    text-adapter.js        # NEU: E-Mail-Entwurf/Bericht-Texte (Demo: Bausteine, später: LLM)
    scorecard-adapter.js   # NEU: KPI-Daten (Demo: scorecard-demo.json)
    (bestehende: routing-, speicher-adapter; daten-adapter aus dem Import)
  wissensbasis/
    akte.js                # Lesen/Schreiben der Händlerakte
    kadenz.js              # Folgetermin-Kadenz (Standard 6 Wochen)
  briefing/
    checkliste.js          # Themen + Reihenfolge nach Prio
    schnellblatt.js        # "Auf dem Parkplatz": STP / TVA / ZA-Befreiung
  bericht/
    vorlage.js             # Stichpunkte → strukturierter Bericht
    entwurf.js             # E-Mail-Entwurf aus Kampagnen-Bausteinen über text-adapter
  infodist/
    selektion.js           # Mehrwert-Kriterien → Vorschlagsliste
  ui/
    briefing-view.js, bericht-view.js, infodist-view.js   # NEU
daten/
  wissensbasis.json        # Händlerakten (initial: Demo-Einträge)
  kampagnen-bausteine.json # WKR, Wischerdisplay, Windschutzscheiben, Bremsen, Ford Mobile, …
  scorecard-demo.json      # KPI-Demo-Daten je Händler
  infos.json               # Rundschreiben/Mailings
  postfach-demo.json       # simulierte Mailbox
tests/
  wissensbasis/, briefing/, bericht/, infodist/           # Unit-Tests der Logikkomponenten
```

Logikkomponenten (`wissensbasis/`, `briefing/`, `bericht/`, `infodist/`)
bleiben frei von DOM-Zugriff — identisch zum bestehenden `planung/`-Muster.

## 5. Beispiel-Datenmodelle

`wissensbasis.json` (Auszug; exakte Feldnamen legt der Implementierungsplan fest):

```json
{
  "haendler": [
    {
      "id": "DEU90ARN",
      "stammdaten": { "name": "Autohaus Beispiel", "anrede": "Frau Musterfrau (GF1)" },
      "persoenlicheNotizen": [
        { "datum": "2026-10-05", "text": "Geburtstag: 14. April" }
      ],
      "besuchHistorie": [
        { "terminId": "t-001", "datum": "2026-10-05",
          "teilnehmer": ["Frau Musterfrau"], "themen": ["WKR-Kampagne"],
          "kernpunkte": ["Interesse an Wischerdisplay geäußert"] }
      ],
      "offeneMassnahmen": [
        { "titel": "TVA-Rückmeldung", "verantwortlich": "Frau Musterfrau",
          "frist": "2026-12-01", "status": "offen" }
      ],
      "folgeterminKadenzWochen": 6
    }
  ],
  "gesendetInfos": []
}
```

`scorecard-demo.json` (Auszug):

```json
{ "haendler": [
    { "id": "DEU90ARN",
      "wkr": { "tier": 1, "quoteProzent": 42 },
      "wischerdisplay": { "bestellt": true, "datum": "2026-10-20" },
      "afsb": { "status": "Silber", "punkteBisGold": 35 }
    }
  ]
}
```

## 6. Teststrategie

Per TDD mit deterministischen Fixturedaten:

- Briefing-Checkliste: Themen-Reihenfolge nach Prio/Fälligkeit, Geburtstags-Hinweis
- Bericht: Vollständigkeit (alle geforderten Felder), Aufgaben→Maßnahmen-Übernahme
- E-Mail-Entwurf: Kampagnen-Auswahl, TVA-Pflichtanhang, Anhang-Liste, Betreff
- Info-Verteilung: Mehrwert-Filter, Duplikat-Unterdrückung (bereits gesendet),
  Vorschlags-Begründung
- Kadenz: 6-Wochen-Standard, Übergabe an das Planungsmodul

UI-Bedienung bleibt manuell (Browser-Test).

## 7. Bewusste Abgrenzungen

- Keine LLM-API-Aufrufe, keine externen Mail-Services in der Demo-Version.
- E-Mails werden nicht automatisch gesendet; der Entwurf bleibt im Baustein-Katalog.
- Kein echter Outlook-Zugang (Phase 2, nur ein definierter Adapter-Vertrag).
- Nur ausgedachte Daten; keine echten Firmen- oder Personendaten.

## 8. Offene Punkte für die Implementierung

- Exakte Feldnamen der Händlerakte festlegen (Kompatibilität zum
  Import-Datenmodell von 2026-11-17).
- Kampagnen-Liste der Demo-Bausteine (Start: WKR, Wischerdisplay,
  Windschutzscheiben, Bremsen — erweiterbar).
- Farbcodierungsschwellen der Plan-View (Vorschlag: letzter Besuch < 6 Wochen
  grün, < 12 Wochen gelb, älter/niemals rot; konfigurierbar).
- Adapter-Vertrag für `mail-adapter.js` so dokumentieren, dass Phase 2
  (Outlook/Microsoft Graph) ohne Logikänderung anschließbar ist.

## 9. Addendum (18.11.2026, nach Review realer Gesprächszusammenfassungen)

Nach Sichtung dreier realer Nachbereitungs-Mails (als anonymisierte Muster mit Demo-IDs) ergänzt:

### 9.1 Zwei Anhangs-Klassen

| Klasse | Beispiel | Quelle |
|---|---|---|
| **Kampagnen-Anhänge** (spezifisch, vorbereitet) | WKR-Broschüre + Trainings-Link | `daten/kampagnen-bausteine.json` (bisher) |
| **Allgemeine Themen-Anhänge** (situativ, allgemein) | Maßnahmenplan Wischer, Excel zur Werkstatt-Qualitätssicherung, Best-Practice Wischer, Service News 04, Quick-Check-Liste | NEU: `daten/themen-anhaenge.json` |

- `daten/themen-anhaenge.json`: Katalog `[{id, titel, schluessel[], anhaenge[{name, typ}]}]`
- `allgemeineAnhaengeFuer(themen, katalog)` in `app/bericht/entwurf.js`: leitet aus
  den Bericht-Themen (Teilstring-Match, Kleinbuchstaben) die Anhangs-Liste ab.
- E-Mail-Entwurf = **Kampagnen-Anhänge + themen-abhängige allgemeine Anhänge +
  TVA-Pflichtanhang**, dedupliziert per Anhangsname.
- TVA bleibt Pflicht und wird genau einmal geführt.

### 9.2 Folgetermin im Bericht (optional)

- David sagt Folgetermine vor Ort zu und sendet die Einladung separat
  ("schicke ich Ihnen separat zu").
- Neues **optionales** Feld `folgetermin` im Bericht (Freitext: Datum/Zeit oder
  "sende ich separat"); wird mit dem Bericht in der Händlerakte geführt.

### 9.3 Demo-Akten im Mail-Stil

- Drei zusätzliche Demo-Akten in `daten/wissensbasis.json`, strukturell an die
  Muster angelehnt (themen-gegliederte `kernpunkte`, Themen AKF+/Wischer/WSS/
  Quick-Check, AFSB-/STP-Notizen) — vollständig ausgedachte Werte im
  Marktnummern-Schema.
