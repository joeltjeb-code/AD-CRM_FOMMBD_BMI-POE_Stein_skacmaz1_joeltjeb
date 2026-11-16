# Design-Dokument: Routenplanung im Außendienst-Assistenten

**Datum:** 2026-11-16
**Status:** Vom Nutzer freigegeben (Klärungsrunde + Design-Vorlage am 16.11.2026)
**Teil von:** Außendienst-Assistent (siehe `AGENTS.md`, Abschnitt "Außendienst-Assistent")

## 1. Ziel

Der Außendienst-Assistent erhält die Fähigkeit, auf Basis einer Händlerliste
Routenpläne für mehrere Wochen im Voraus zu erstellen. Die oberflächliche
Planung findet regelmäßig statt (Montags-Workflow): Der Agent schlägt Wochen-
und Tagespläne vor, der Außendienstler korrigiert im Interface per Drag & Drop
oder Texteingabe.

## 2. Anforderungen (aus der Klärungsrunde)

### 2.1 Datenbasis

- Händlerliste mit Adresse; **Marktnummer ist der eindeutige Identifier**
  jedes Händlerbetriebs (Beispiel: `DEU1M150`).
- Perspektivisch werden die Händlerdaten live aus der Google Cloud Platform
  abgerufen, wenn der Agent in ein Ford-System transferiert wird. Deshalb:
  Datenzugriff ausschließlich über Adapter.
- Keine Geocodierung/Distanzdienste im Codespace (kein Netz, keine API-Keys).
  Fahrzeiten werden aus groben Positionen + Pufferwerten approximiert.

### 2.2 Planungsparameter

| Parameter | Wert |
|---|---|
| Besuche pro Tag | 3 (Di–Fr) |
| Wochenpensum | 12 Händler |
| Besuchsdauer | 90 Minuten (ausnahmsweise 120) |
| Gebietsgröße | 85–95 Betriebe |
| Quartalsabdeckung | Alle Betriebe ca. 1× pro Quartal |
| Prio-Betriebe | Mehrfachbesuche pro Quartal (Kadenz 2–3×) |
| Planungshorizont | Mehrere Wochen im Voraus |
| Slots pro Quartal | ~156 (12 × 13 Wochen); Restkapazität nach Standardabdeckung → Prio-Wiederholungen |

### 2.3 Tagesstruktur

- Erster Termin: Start 8:30–9:00 Uhr.
- Letzter Termin: Start bis spätestens 15:00–16:00 Uhr.
- Fahrzeiten zwischen Terminen haben ein natürliches Limit (3 × 90–120 min
  Besuch + Fahrzeiten müssen ins Tagesskelett passen), inklusive Marge für
  Staus und ggf. Ladestopps bei BEV-Fahrzeugen.
- Ein Tagesentwurf, der das Skelett sprengt, wird verworfen und neu
  kombiniert — nicht gebrochen geplant.

### 2.4 Auswahlogik

Kaskade, in dieser Reihenfolge:

1. **Regionale Cluster** (Fahrzeiten verringern, Woche = Teilgebiet)
2. **Fälligkeit** (zuletzt lange nicht Besuchte zuerst)
3. **Prio** (höhere Priorität zuerst innerhalb des gleichen Fälligkeitsrangs)

### 2.5 Startorte

- Heimatadresse wird einmal hinterlegt und bleibt Standard-Start/-Ziel.
- Alternativstartorte dürfen pro Tour gewählt werden.

### 2.6 Übernachtung

Pro Abend Entscheidung: Heimfahrt zur Heimatadresse oder Übernachtung im Hotel.
Präferenzkriterien des Außendienstlers:

- Feste Lieblingshotels pro Region
- Maximale Entfernung/Fahrzeit zum ersten Termin am nächsten Morgen
- Benefits bei Hotelstatis oder Kreditkarten-Treueprogrammen
- Preis pro Nacht (nur mit Datenquelle verfügbar)

### 2.7 Hotelquelle

Kein direkter Zugriff auf Google Maps bzw. Booking.com im Codespace und keine
API-Keys vorhanden. Für die aktuelle Version werden fiktive Hotel-Datenobjekte
generiert. Alle Präferenzkriterien sind aber als Felder im Hotel- und
Präferenz-Datenmodell vorgesehen, sodass ein echter Connector später ohne
Änderung der Logik einwechseln kann.

### 2.8 Nachbesserung des Plans

- Automatischer Vorschlag als Ausgangspunkt.
- Drag & Drop von Terminen zwischen Slots und Tagen.
- Anpassung durch Textbefehle, z. B. „Hotel am Mittwoch näher am
  Donnerstagmorgen" oder „Freitag früher beenden".
- Jede manuelle Änderung wird sofort gegen das Tagesskelett validiert;
  Konflikte werden rot markiert.

## 3. Architektur (Ansatz B: Modular ohne Build-Schritt)

Plain HTML/JS mit ES-Modulen, kein Framework, kein Build-Prozess.

```
index.html
app/
  adapter/
    daten-adapter.js       # Händlerdaten (Demo: Upload/JSON, später: GCP)
    hotel-adapter.js       # Hotels (Demo: fiktive Liste, später: Google/Booking)
    routing-adapter.js     # Fahrzeit/Distanz (Demo: Koordinaten+Puffer, später: Distance Matrix)
    speicher-adapter.js    # Pläne/Einstellungen (localStorage + JSON-Export/Import)
  planung/
    cluster.js             # Clusterbildung
    auswahl.js             # Cluster → Fälligkeit → Prio
    reihenfolge.js         # nearest-neighbor + Verbesserung, Validierung Tagesskelett
    uebernachtung.js       # Heimat vs. Hotel-Score
    befehle.js             # Textbefehl → Planungsoperation
  ui/
    woche.js, einstellungen.js, plan-view.js   # DOM-Komponenten
daten/
  haendler-demo.json
  hotels-demo.json
tests/
  planung/*.js             # Unit-Tests der Planungslogik
```

Der Planer (`planung/`) ist eine reine Logikkomponente ohne DOM-Zugriff.

## 4. Planungsalgorithmus

1. **Kandidaten:** Nur Händler, deren Quartalsfälligkeit erreicht ist bzw.
   deren Prio-Kadenz einen weiteren Besuch verlangt (Standard: 1× pro Quartal,
   Prio: 2–3× pro Quartal).
2. **Clusterauswahl:** Wochen werden logisch aus Clustern befüllt (12 Slots pro
   Woche); Cluster mit den frühesten Fälligkeiten zuerst.
3. **Tagesauswahl:** Aus dem aktiven Cluster 3 Händler nach Fälligkeit → Prio.
4. **Reihenfolge:** Nearest-Neighbor-Startreihenfolge, verbessert (2-opt), unter
   Beachtung von Startort (Heimat oder alternativ gewählt) und Hotelziel des Vorabends.
5. **Validierung:** Tagesskelett einhalten (Start 8:30–9:00, letzter
   Terminstart ≤ 15:00–16:00, Fahrzeiten + Puffer + BEV-Ladestopp).
   Scheitert der Entwurf → neu kombinieren.
6. **Übernachtung:** Score-Vergleich Heimatfahrt vs. Hotel
   (Lieblingshotel in Region?, Fahrzeit zum morgigen ersten Termin,
   Programme/Status-Match, Preis falls vorhanden).

## 5. Teststrategie

- Planungslogik per TDD mit deterministischen Spielfixturedaten (ca. 90 Händler,
  5 Cluster): Fälligkeitsreihenfolge, Skelett-Validierung, Übernachtungs-Score,
  Prio-Mehrfachbesuche, Textbefehl-Übersetzung.
- UI-Bedienung bleibt manuell (Browser-Test).

## 6. Bewusste Abgrenzungen

- Keine echte Geocodierung, keine externen Distanzdienste in dieser Version.
- Keine Anmeldung/Benutzerverwaltung (ein Nutzer: Außendienst).
- Nur ausgedachte Daten (gemäß `AGENTS.md`).
- Briefing vor Termin, Bericht nach Termin und Wissensbasis sind bereits
  spezifiziert, aber nicht Teil dieses Designs.

## 7. Offene Punkte für die Implementierung

- Format der vom Nutzer hochgeladenen Händlerliste (Feldnamen) beim Upload klären
  und auf das Datenmodell abbilden.
- Konkrete Pufferwerte für Stau/BEV-Ladestopp festlegen (Startwert, konfigurierbar).
