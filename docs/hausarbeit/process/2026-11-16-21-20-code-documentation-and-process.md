# Code-Dokumentation und Prozess – 2026-11-16 21:20

Zielgruppe: Mitarbeitende im Projekt, die den aktuellen Stand des Außendienst-Assistenten
übernehmen oder verstehen wollen. Quelle der Wahrheit ist das Repository; dieses Dokument
ist eine Momentaufnahme des Abends 2026-11-16.

## 1. Was heute gebaut wurde

Die Routenplanung des Außendienst-Assistenten: Auf Basis einer Händlerliste plant die App
Wochenrouten (Di–Fr, je 3 Händlerbesuche) mehrere Wochen im voraus. Der Plan ist nachbearbeitbar
per Drag & Drop und Textbefehl. Implementiert auf Branch `feature/routenplanung`, gemerged nach
`main` (Merge-Commit `7add03d`).

## 2. Code-Dokumentation

### 2.1 Architekturübersicht

```
index.html                    App-Shell (Styles, Buttons, Mount-Punkte)
app/
  app.js                      Verkabelung: State (haendler, hotels, settings, plan),
                              fetch der Demo-Daten, nächster Montag als Planungsstart,
                              Render-Zyklen, Drag&Drop-Rückruf, Befehlsformular
  adapter/
    routing-adapter.js        Demo-Routing: Luftlinie * Straßenfaktor 1.15 → km;
                              Fahrzeit = km/60 kmh aufgerundet + Staupuffer 6 min
                              + optionaler BEV-Aufschlag (10 min/Leg, per Option)
    speicher-adapter.js       Wrapper um {getItem,setItem}: lade/speichere (JSON),
                              exportJson/importJson für Plan-Export als Datei
  planung/                    Reine Logik, kein DOM-Zugriff, mit node:test geprüft
    cluster.js                k-Means (5 Cluster) mit deterministischer
                              Farthest-Point-Initialisierung; 20 Iterationen
    auswahl.js                KADENZ {standard:85, prio:40} Tage; tageSeitBesuch
                              (9999 ohne Besuch); faelligeKandidaten sortiert
                              Fälligkeit abwärts → Prio → id; verteileAufWochen füllt
                              12 Slots/Woche clustertreu, Nachfüllen aus dem nächsten
                              Cluster nur bei Unterdeckung
    reihenfolge.js            SKELETT: erster Termin fix 08:30, Startfahrt max. 120 min,
                              letzter Terminstart ≤ 15:30; berechne() setzt Termine inkl.
                              Fahrzeiten + Besuchsdauer; validiereReihenfolge() behält
                              die gegebene Reihenfolge (für Drag & Drop); planeTag()
                              probiert alle 3!-Permutationen, beste zulässige gewinnt
    uebernachtung.js          Score Heimfahrt = Fahrt(letzter→Heimat) + Fahrt(Heimat→
                              erster Termin morgen); Score Hotel = Fahrt(letzter→Hotel)
                              + Fahrt(Hotel→erster Termin am nächsten Morgen)
                              −30 Lieblingshotel, −10 je Programm-Match, + Preis/10;
                              Hotels jenseits der Präferenz-Fahrzeit werden verworfen
    befehle.js                parseBefehl() erkennt: "verschiebe <ID> auf <Tag>",
                              "übernachte am <Tag> im Hotel|zu Hause",
                              "<Tag> früher beenden" (→ 13:30), "starte <Tag> vom <Ort>";
                              wendeAn() wendet sie auf eine Tiefkopie des Plans an
    planer.js                 planeWochen(): Cluster → Kandidaten → Wochen → Tage →
                              Übernachtungen; frischauf(): Revalidierung + Übernachtungs-
                              Neuberechnung, manuelle Vorgaben (vorgabe: true) bleiben
    TAGE_NAMEN = [Di, Mi, Do, Fr]
  ui/
    woche.js                  renderePlanraster: Wochen → Tagkarten (Termine mit Uhrzeit,
                              Übernachtung, Startort); HTML5-Drag & Drop; Befehlsformular
    einstellungen.js          Formular: Heimatname, BEV-Checkbox, max. Morgenfahrt,
                              Treueprogramme; Speichern → Neu-Planung
tools/
  datengenerator.js           baueHaendlerDemo (90 Händler, 5 Cluster, Marktnummern
                              "DEU<Cluster+1>M<150+n>"), baueHotelsDemo (10 Hotels);
                              als Skript geschrieben nach daten/*.json (deterministisch)
daten/                        haendler-demo.json (1352 Zeilen), hotels-demo.json
tests/
  fixtures.js                 baueFixtures: 90 Händler + Heimat; Grundlage aller Tests
  planung/*.test.js           9 Testdateien, 26 Tests (node --test tests/planung/)
```

### 2.2 Plan-Datenstruktur (JSON-Form, an UI und Export)

```
plan = {
  erstelltAm: ISO-Zeitstempel,
  wochen: [{
    montag: "YYYY-MM-DD",
    tage: [{
      tag: "Dienstag"|"Mittwoch"|"Donnerstag"|"Freitag",
      datum: "YYYY-MM-DD",
      startortName: string, startortPos?: {x,y},   // alternativer Startort
      letzterStartMin?: number,                    // z. B. 810 nach "früher beenden"
      ok: boolean, grund?: string,                 // false = rot markiert
      leer?: boolean,                              // Tag ohne Aufträge
      termine: [{ haendlerId, startMin, endeMin, start: "HH:MM", ende: "HH:MM" }],
      fahrzeiten: [{ von: string, nach: string, min: number }],
      uebernachtung: { art: "heim"|"hotel", fahrzeitHeim?, hotelId?, hotelName?, vorgabe? }
    }]
  }]
}
```

### 2.3 Abhängigkeiten und Datenfluss

Kein Build-Schritt, keine Laufzeit-Abhängigkeiten. Datenfluss: `daten/*.json` (fetch) →
`settings` (localStorage via Speicher-Adapter) → `planeWochen()` (reine Logik, Routing-Adapter
als Parameter) → `plan` (localStorage + Export) → UI-Render. Händlernummer = eindeutiger
Schlüssel aller Zuordnungen; Später-Austausch der Quelle (GCP) nur im
Routing-Adapter/daten-Adapter — die Logik bleibt unverändert.

### 2.4 Testabdeckung

`node --test tests/planung/` → 26/26 grün (Stand heute). Abgedeckt: Fixtures/Routing (3),
Cluster (2), Auswahl/Wochenverteilung (4), Tagesplanung/Skelett (4), Übernachtung (3),
Planer (2), Speicher (2), Befehle (4), Demodaten (2). Die UI wird manuell getestet
(Spec-Abschnitt 5) — Stand: Browserdurchlauf steht noch aus.

### 2.5 Starten der App

1. `python3 -m http.server 8000` im Repository-Root (ES-Module benötigen HTTP, kein file://)
2. Im Codespace unten "Ports" → Port 8000 öffnen
3. Prüfen: 4 Wochen je 12 Termine, Drag & Drop, Befehlseingabe, BEV-Checkbox (Fahrzeiten
   steigen sichtbar), Plan-Export-Button

## 3. Prozess-Abfolge des Abends (kurz, Details: 2026-11-16-21-16-actions.md)

1. Session-Start: Tagesdatei nachgetragen (letzter Stand 31.10.), Prompt-Log fortgeführt
2. AGENTS.md: Session-Start-Checkliste ergänzt, damit die Tagesdatei künftig garantiert anlegt
3. Brainstorming (4 Klärungsrunden) → Architektur Ansatz B gewählt
4. Spec geschrieben + freigegeben: `docs/superpowers/specs/2026-11-16-routenplanung-design.md`
5. Implementierungsplan (12 TDD-Tasks): `docs/superpowers/plans/2026-11-16-routenplanung.md`
6. Inline-Ausführung auf `feature/routenplanung` (15+ Commits), 4 Planfehler unterwegs gefixt
7. Merge nach `main` (`7add03d`), Tests danach erneut grün
8. Feierabend-Material: Tageszusammenfassung + Prozess-Doku, Abschluss-Commits

## 4. Git-Stand zum Zeitpunkt dieses Dokuments

- Git: initialisiert (Repo existierte), Remote: `origin` → github.com/joeltjeb-code/AD-CRM_FOMMBD_BMI-POE_Stein_skacmaz1_joeltjeb
- `git status`: sauber, keine Konflikte → Commit aller Dateien möglich
- `main` liegt lokal voraus von `origin/main` (nicht gepusht) → Sync/Push steht aus
