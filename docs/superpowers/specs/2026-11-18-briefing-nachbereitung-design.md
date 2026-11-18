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

## 10. Ford-Design (Addendum, 18.11. abends)

Auslöser: Endnutzer-Feedback "Interface zu technisch/komplex, nicht im Ford
Design". Grundlage: `Ford Design/Ford_Brand_Identity_Guidelines_R09 (1).pdf`
(temporär im Repo, wird nicht committet; PDF ist AES-verschlüsselt, Text via
pypdf extrahiert).

### 10.1 Angewandte Design-Tokens

| Token | Wert | Verwendung |
|---|---|---|
| Ford Blue | `#00095B` | Header, Primär-Buttons, aktiver Tab, Kartentitel |
| Ford Twilight | `#00142E` | Button-Hover |
| Ford Skyview | `#066FEF` | Fokus-Outline, Akzent, Hover-Text |
| Light Gray | `#F0F0F0` | Seitenhintergrund |
| Off Black | `#0F0F0F` | Fließtext |
| White | `#FFFFFF` | Karten/Hintergrund auf Blau (WCAG AA/AAA-Kombinationen laut Guideline) |

- Typografie: `font-family: 'Ford F-1', 'Arial Nova', Arial, sans-serif` —
  Ford F-1 ist lizenzpflichtig und nicht verfügbar; die Guideline nennt
  **Arial Nova** als System-Ersatz. Body 16 px / leading 1,5 (Guideline:
  Leading = Größe x 1,5), max. vier Größen (16/18/22/28), linksbündig,
  sentence case, kein All-Caps, Headlines Medium (nicht Bold), Bold sparsam.
- Layout: "Maximize impact, minimize complexity" — weiße Karten auf Light
  Gray, 80/20-Hintergrund-zu-Fokus-Regel, klare CTAs.
- Logo: kein Ford Oval eingebunden (Asset liegt nicht vor; eigenes Bauen ist
  laut Guideline verboten). Header bleibt reiner Text.
- Statusfarben (grün/orange/rot für Farbcodierung) bleiben als
  funktionale Datenvisualisierung; Demo-Ausnahme, in der Guideline nicht
  geregelt.

### 10.2 Interface-Vereinfachung (Endnutzer-Fokus)

- Tab-Navigation `Plan | Briefing | Bericht | Infos` (`role=tablist`) statt
  parallel gestapelter Sektionen und Lostrennung von Tech-Begriffen.
- Raw-IDs im Planraster ersetzt durch Händler-Namen (IDs bleiben in
  Tooltip-Datenattribut bzw. Titelzeile).
- Formularfelder mit echten `<label>`-Elementen und sprechenden Platzhaltern
  (Bericht-Formular).
- Klick auf Termin im Plan → springt automatisch in den Briefing-Tab.
- Berichtsformular wird beim Start gerendert (Tab "Bericht"), Info-Verteilung
  öffnet per Händlerauswahl den "Infos"-Tab.
- Entfallen: Schaltflächen `Bericht erfassen` / `Info-Verteilung` in der
  globalen Leiste (durch Tabs ersetzt).

## 11. Addendum (18.11.2026, nach Browser-Review durch den Nutzer)

Anlass: Erster manueller Durchlauf am Ford-Interface. Befunde und daraus abgeleitete Anforderungen. Bereits ohne Spec umgesetzt (kleine, unmissverständliche Fixes): Tab-Panel-Umschaltung korrigiert (`wechsleTab`), Kacheln zeigen Namen **und** Identifier (`kachelLabel`), Treueprogramm vollständig entfernt (Settings, Hotel-Daten, Übernachtungs-Score).

### 11.1 OBG-Auswahl und Heimatadresse (nicht vorhanden → Pflicht)

| # | Anforderung |
|---|---|
| O1 | Kopfbereich des Tabs „Plan" enthält ein **Dropdown „OBG"** (Auswahl des zu planenden Gebietes) und eine **Eingabemaske „Heimatadresse"** (Ort/PLZ bzw. Koordinate) mit Speichern-Button |
| O2 | OBG- und Heimat- Auswahl werden in localStorage persistiert (Schlüssel `einstellungen`) und beim Start wiederhergestellt |
| O3 | Die Planung (Cluster → Fälligkeit → Prio) läuft **nur über die Händler des gewählten OBG**; Wechsel des OBG erzeugt den Plan neu |
| O4 | Heimat-Position ersetzt die hart verdrahtete Demo-Koordinate; Demo-Koordinate bleibt Fallback ohne Eingabe |
| O5 | Demo-Daten: Händler erhalten ein `obg`-Feld (Werte OBG 01–12 im Marktnummern-Schema, vollständig ausgedacht) |

### 11.2 Startort und Übernachtung (Korrekturen)

| # | Anforderung |
|---|---|
| S1 | `startortName` je Tag ergibt sich aus dem Ablauf: Tag beginnt im Heimatbüro; Folgetage nach Hotelnacht starten am Hotel (bislang steht „Heimatbüro" an jedem Tag) |
| S2 | Übernachtungs-Entscheidung wird fairer gewichtet: Anfahrtseinsparung gegenüber Heimfahrt gegen reale Hotelkosten; Hotel darf Heimfahrt nicht „fast immer" schlagen (Konstante statt `preisNacht/10`, in Tests gegen beide Varianten kalibriert) |
| S3 | Treueprogramm bleibt gestrichen (Nutzer-Entscheid) |

### 11.3 Abwesenheiten (nicht vorhanden → Pflicht)

| # | Anforderung |
|---|---|
| A1 | Im Tab „Plan": **Toggles für jede geplante Woche und jeden Wochentag** (Di–Fr); abgewählte Tage/Wochen werden nicht beplant |
| A2 | Die Soll-Kapazität (12/Woche, 3/Tag) verteilt sich **nur auf aktive Tage**; vollständig abgewählte Wochen zählen nicht zur Soll-Kapazität des Horizonts |
| A3 | Toggles persistieren in localStorage; Abwesenheits-Grund (Urlaub/Lehrgang/Event) ist optional als Freitext-Label je Toggle |
| A4 | Abgewählte Termine bleiben in der Planung erhalten (kein Datenverlust), der Plan wird neu gerechnet |

### 11.4 KI-Komponente (Entscheidung des Nutzers, 18.11.: „Alles davon")

Bewertungskontext FOM (Business Model Innovation und Plattformökonomie): Der Agent braucht eine **sichtbare KI-/Datenanalyse-Komponente**. Umsetzung in drei Phasen, alles hinter Adaptern (Ansatz C bleibt gültig):

| # | Anforderung | Adapter |
|---|---|---|
| K1 | **Stichpunkte → strukturierte Felder**: Das Formular akzeptiert Freitext-Stichpunkte; ein LLM (Mistral API) schlägt Themen, Vereinbarungen und Aufgaben (Verantwortlicher, Frist) als Vorschläge vor, die der Nutzer vor der Freigabe bestätigt/ändert. Ohne API-Key: Formular bleibt wie heute manuell (Fallback, kein Abbruch) | `text-adapter` |
| K2 | **Themen-Klassifikation**: Bericht-Themen werden (LLM-basiert, Fallback Regel-Heuristik) auf Kampagne + allgemeine Themen-Anhänge gemappt statt per manueller Kampagnen-Auswahl | `text-adapter` |
| K3 | **Händlerimport über Mistral OCR**: Excel/PDF-Referenzlisten werden per OCR 4.1 eingelesen und in das Händler-Datenmodell (inkl. `obg`) überführt — Anbindung des Imports-Designs vom 17.11. (Ansatz A) | neuer `import-adapter` |
| K4 | Secrets ausschließlich in `~/.vibe/.env` (oder Runtime-Konfiguration des Nutzers), nie im Repository; kein Key → Fallback-Modus mit sichtbarem Hinweis im UI |
| K5 | Prompt-Log dokumentiert jede KI-Nutzung (wie bei Vibe) — nachvollziehbar für die Hausarbeit |

### 11.5 Explizit nicht Teil dieses Addendums

- Echte Outlook-Mailbox (Phase 2, unverändert zurückgestellt)
- Echte Routing-Daten (Route-Adapter bleibt Demo)
- Ford-Assets (Ford F-1, Oval) — Richtlinien-Verbot bleibt
