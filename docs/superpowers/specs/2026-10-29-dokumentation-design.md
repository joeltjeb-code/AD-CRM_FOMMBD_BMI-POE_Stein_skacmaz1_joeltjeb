# Dokumentations-System für Hausarbeit – Design Specification

**Datum:** 2026-10-29  
**Status:** Draft  
**Autor:** Vibe (mit User Input)  
**Zweck:** Automatisierte Dokumentation aller Sessions für die begleitende Hausarbeit

---

## 1. Zielsetzung

Erstelle ein **vollautomatisches Dokumentationssystem**, das:
- Jede Interaktion während der Arbeit mit Vibe aufzeichnet
- **Prompts** (User-Eingaben) wörtlich mit Zeitstempel speichert
- **Tagebücher** pro Tag mit Entscheidungen, Ergebnissen, Problemen und Learnings erstellt
- **Prozess-Dokumentation** für jeden Tag generiert
- Bei Session-Ende alles **versioniert in Git** speichert

---

## 2. Anforderungen

### 2.1 Funktionelle Anforderungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Automatische Anlegung der Tagesdatei bei Session-Start | Hoch |
| F2 | Dokumentation nach jeder **fertigen Aufgabe** | Hoch |
| F3 | Prompts wörtlich in `prompt-log.md` speichern | Hoch |
| F4 | Tagebuch mit paraphrasierten Prompts + wichtigen wörtlich | Hoch |
| F5 | Fehler, Abwege und Learnings dokumentieren | Hoch |
| F6 | Bei "Feierabend" oder "Schluss für heute": finale Zusammenfassung + Commit | Hoch |
| F7 | Git-Status prüfen (init, merge conflicts) vor Commit | Hoch |
| F8 | Alle geänderten Files commiten (`git add .`) | Hoch |
| F9 | Prozess-Dokumentation pro Tag in `process/[DATETIME]-actions.md` | Mittel |

### 2.2 Nicht-funktionelle Anforderungen

- **Token-Effizienz:** Dokumentation nur nach fertigen Aufgaben, nicht nach jeder Nachricht
- **Struktur:** Klare Ordnerhierarchie und konsistente Dateiformate
- **Robustheit:** Fehlerbehandlung für fehlende Ordner/Dateien

---

## 3. Architektur

### 3.1 Dateistruktur

```
docs/
└── hausarbeit/
    ├── tagebuch/
    │   └── 2026-10-29.md          # Ein File pro Tag
    ├── prompts/
    │   └── prompt-log.md           # Alle Prompts in EINER Datei
    └── process/
        └── 2026-10-29-18-30-actions.md  # Prozess-Dokumentation pro Tag
```

### 3.2 Komponenten

| Komponente | Typ | Verantwortung |
|-----------|-----|---------------|
| `AGENTS.md` | Konfiguration | Grundregel: Dokumentation aktivieren |
| `.vibe/skills/dokumentation/SKILL.md` | Skill | Definiert Dokumentationsverhalten |
| `docs/hausarbeit/tagebuch/[datum].md` | Runtime | Tages-Tagebuch |
| `docs/hausarbeit/prompts/prompt-log.md` | Runtime | Alle Prompts mit Zeitstempel |
| `docs/hausarbeit/process/[DATETIME]-actions.md` | Runtime | Detaillierte Prozess-Dokumentation |

---

## 4. Workflow

### 4.1 Session-Lebenszyklus

```mermaid
graph TD
    A[Session-Start] --> B{Existiert tagebuch/[heute].md?}
    B -->|Nein| C[Erstelle tagebuch/[heute].md mit Header]
    B -->|Ja| D[Füge Session-Block hinzu]
    D --> E[Existiert prompts/prompt-log.md?]
    E -->|Nein| F[Erstelle prompt-log.md]
    E -->|Ja| G[Weiter]
    G --> H[Warte auf Aufgabe]
    H --> I[Aufgabe fertig?]
    I -->|Ja| J[Dokumentiere in tagebuch + prompt-log]
    I -->|Nein| H
    J --> I
    I --> K[User sagt "Feierabend"]
    K --> L[Finale Zusammenfassung schreiben]
    L --> M[Process-Doc erstellen]
    M --> N[Git-Status prüfen]
    N --> O{Merge Conflicts?}
    O -->|Ja| P[Abbruch + Warnung]
    O -->|Nein| Q[git add .]
    Q --> R[git commit -m "docs: hausarbeit update [Datum] [Zeit]"]
```

### 4.2 Aufgabe-Erkennung

Eine Aufgabe gilt als **fertig**, wenn:
- User sagt: "Das war's zu [Thema]"
- User sagt: "Nächste Aufgabe: [X]" (→ vorherige ist fertig)
- User gibt ein neues, klar abgrenzbares Thema ein

---

## 5. Dateiformate

### 5.1 `tagebuch/[datum].md`

```markdown
# Tagebuch – 29. Oktober 2026

## Session 1 (18:30 - 20:15)

### Aufgabe 1: [Thema]
- **Prompt (paraphrasiert):** [Zusammenfassung]
- **Wichtige Prompts (wörtlich):**
  - "[Original-Prompt 1]"
  - "[Original-Prompt 2]"
- **Entscheidungen:**
  - [Entscheidung 1 und Begründung]
- **Ergebnisse:**
  - ✅ [Erfolg 1]
  - ✅ [Erfolg 2]
- **Probleme/Fehler:**
  - ❌ [Problem 1]
  - → Fix: [Lösung]
- **Learnings:**
  - [Learning 1]

### Aufgabe 2: [Thema]
... [gleiche Struktur]

## Zusammenfassung
- **Gesamtzeit:** [X Stunden]
- **Aufgaben abgeschlossen:** [N]
- **Offene Punkte:** [Liste]
- **Haupt-Learnings:** [Zusammenfassung]
```

### 5.2 `prompts/prompt-log.md`

```markdown
# Prompt-Log

## 2026-10-29
- [18:30] "[Original-Prompt des Users]"
  → Ergebnis: [1 Satz: z.B. "API-Grundgerüst erstellt"]
- [18:45] "[Nächster Prompt]"
  → Ergebnis: [1 Satz]
```

### 5.3 `process/[DATETIME]-actions.md`

```markdown
# Prozess-Dokumentation – 2026-10-29 20:15

## Übersicht
- **Session-Dauer:** 18:30 - 20:15
- **Anzahl Aufgaben:** 4
- **Commits:** 1

## Detaillierte Aktionen

### 18:30 - Aufgabe 1: API-Endpoint
1. User-Prompt: "Bau eine REST-API für Benutzerdaten"
2. Vibe-Aktion: 
   - [ ] Projektstruktur angelegt
   - [ ] Dependencies installiert (express, typescript)
   - [ ] Basic User-Interface definiert
3. Ergebnis: ✅ Grundgerüst steht
4. Probleme: ❌ Typfehler in Interface
5. Fix: Property 'email' hinzugefügt

### 19:00 - Aufgabe 2: Docker
1. User-Prompt: "Container für die API"
2. Vibe-Aktion:
   - [ ] Dockerfile erstellt
   - [ ] .dockerignore konfiguriert
   - [ ] Image gebaut und getestet
3. Ergebnis: ✅ Container läuft lokal

## Technische Details
- **Tools verwendet:** Git, Docker, Node.js 20
- **Files verändert:** `src/user.ts`, `Dockerfile`, `package.json`
- **Token verbraucht:** ~500
```

---

## 6. Fehlerbehandlung

| Szenario | Verhalten |
|----------|-----------|
| `docs/hausarbeit/` existiert nicht | Erstelle Ordner und alle Unterordner automatisch |
| Schreibrechte fehlen | Logge Fehler in Terminal + versuche später erneut |
| Git nicht initialisiert | `git init` ausführen |
| Merge Conflicts | Abbruch + Warnung: "Merge Conflicts vorhanden – bitte manuell lösen" |
| Session bricht ab | Daten bleiben in Files – kein Verlust |

---

## 7. Commit-Strategie

### 7.1 Ablauf bei "Feierabend"

1. **Git-Status prüfen**
   ```bash
   git status
   ```
2. **Merge Conflicts checken**
   - Falls Conflicts: **Abbruch** + Warnung
3. **Alle Files adden**
   ```bash
   git add .
   ```
4. **Commit erstellen**
   ```bash
   git commit -m "docs: hausarbeit update 2026-10-29 20:15"
   ```
5. **Process-Doc erstellen** (siehe 5.3)

### 7.2 Commit-Nachricht Format

```
docs: hausarbeit update [YYYY-MM-DD] [HH:MM]
```

Beispiel: `docs: hausarbeit update 2026-10-29 20:15`

---

## 8. Technische Umsetzung

### 8.1 Änderungen an bestehenden Dateien

#### `AGENTS.md` (Erweiterung)

Füge folgenden Abschnitt hinzu:

```markdown
## Dokumentation für Hausarbeit

- Dokumentiere JEDE fertige Aufgabe automatisch in `docs/hausarbeit/`
- Erstelle bei Session-Start die Tagesdatei, falls nicht vorhanden
- Bei "Feierabend" oder "Schluss für heute": finale Zusammenfassung + Commit
- Nutze das Format aus `.vibe/skills/dokumentation/SKILL.md`
```

### 8.2 Neuer Skill: `.vibe/skills/dokumentation/SKILL.md`

**Inhalt:**
- Definiert das Dokumentationsverhalten
- Beschreibt Formate für Tagebuch, Prompt-Log und Process-Doc
- Enthält Trigger für Session-Start und Session-Ende

---

## 9. Akzeptanzkriterien

- [ ] Nach Session-Start existiert `docs/hausarbeit/tagebuch/[heute].md`
- [ ] Nach jeder Aufgabe werden Tagebuch und Prompt-Log aktualisiert
- [ ] Bei "Feierabend" wird Process-Doc erstellt und alles commited
- [ ] Git-Status wird vor Commit geprüft
- [ ] Alle Files (`git add .`) werden commited
- [ ] Merge Conflicts führen zu Abbruch

---

## 10. Offene Fragen

- Soll die Process-Doc **täglich** oder **pro Session** erstellt werden? *(Aktuell: täglich)*
- Sollen **Code-Snippets** in der Dokumentation enthalten sein? *(Aktuell: nein, nur Beschreibungen)*

---

## 11. Nächste Schritte

1. User reviewt dieses Design-Dokument
2. Bei Zustimmung: Skill `dokumentation/SKILL.md` erstellen
3. `AGENTS.md` erweitern
4. Test-Session durchführen
5. Anpassungen vornehmen

---

**Letzte Aktualisierung:** 2026-10-29  
**Nächste Review:** Pendend (User)
