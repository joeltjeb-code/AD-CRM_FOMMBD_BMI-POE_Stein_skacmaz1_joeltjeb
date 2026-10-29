---
name: dokumentation
description: "Automatische Dokumentation für die begleitende Hausarbeit. Erstellt Tagebücher, Prompt-Logs und Prozess-Dokumentation."
---

# Automatische Dokumentation für Hausarbeit

## Grundregeln

- Dokumentiere JEDE **fertige Aufgabe** automatisch in `docs/hausarbeit/`
- Erstelle bei Session-Start die Tagesdatei, falls sie nicht existiert
- Bei "Feierabend" oder "Schluss für heute": finale Zusammenfassung + Commit
- Nutze die Formate aus dieser Skill-Definition

## Session-Lebenszyklus

### 1. Session-Start (automatisch)
- Prüfe: Gibt es `docs/hausarbeit/tagebuch/[HEUTE].md`? Falls nein → erstelle mit Header
- Prüfe: Gibt es `docs/hausarbeit/prompts/prompt-log.md`? Falls nein → erstelle mit Header
- Füge Session-Block in Tagesdatei hinzu (Startzeit notieren)

### 2. Während der Arbeit
Nach JEDER fertigen Aufgabe (erkennbar an:
- User sagt "Das war's zu [Thema]"
- User sagt "Nächste Aufgabe: [X]" → vorherige ist fertig
- User gibt neues, klar abgrenzbares Thema ein)

Führe aus:
- Append in `tagebuch/[heute].md` (siehe Format unten)
- Append in `prompts/prompt-log.md` (siehe Format unten)

### 3. Session-Ende (bei "Feierabend" oder "Schluss für heute")
- Erstelle finale Zusammenfassung im Tagebuch
- Erstelle `process/[DATETIME]-actions.md` (detaillierte Schritt-für-Schritt-Dokumentation)
- Führe Git-Check durch (siehe Git-Strategie)
- Commit alles

## Dateiformate

### 1. tagebuch/[datum].md

```markdown
# Tagebuch – [Datum]

## Session [N] ([Startzeit] - [Endzeit])

### Aufgabe [N]: [Thema]
- **Prompt (paraphrasiert):** [Zusammenfassung des User-Prompts]
- **Wichtige Prompts (wörtlich):**
  - "[Original-Prompt 1]"
  - "[Original-Prompt 2]"
- **Entscheidungen:**
  - [Entscheidung und Begründung]
- **Ergebnisse:**
  - ✅ [Erfolg]
  - ✅ [Erfolg]
- **Probleme/Fehler:**
  - ❌ [Problem]
  - → Fix: [Lösung]
- **Learnings:**
  - [Learning 1]
```

**Zusammenfassung am Ende jeder Session:**
```markdown
## Zusammenfassung
- **Gesamtzeit:** [X Stunden]
- **Aufgaben abgeschlossen:** [N]
- **Offene Punkte:** [Liste]
- **Haupt-Learnings:** [Zusammenfassung]
```

### 2. prompts/prompt-log.md

```markdown
# Prompt-Log

## [Datum]
- [HH:MM] "[Original-Prompt des Users]"
  → Ergebnis: [1 Satz: z.B. "API-Grundgerüst erstellt"]
```

### 3. process/[DATETIME]-actions.md

```markdown
# Prozess-Dokumentation – [Datum] [Uhrzeit]

## Übersicht
- **Session-Dauer:** [Start] - [Ende]
- **Anzahl Aufgaben:** [N]

## Detaillierte Aktionen

### [Uhrzeit] - Aufgabe [N]: [Thema]
1. User-Prompt: "[Original]"
2. Vibe-Aktion:
   - [ ] [Aktion 1]
   - [ ] [Aktion 2]
3. Ergebnis: [✅/❌] [Beschreibung]
4. Probleme: [Liste]
5. Fix: [Lösung]

## Technische Details
- **Tools verwendet:** [Liste]
- **Files verändert:** [Liste]
```

## Git-Strategie

Bei "Feierabend" oder "Schluss für heute":

1. Prüfe Git-Status:
   ```bash
   git status
   ```
2. Falls nicht initialisiert:
   ```bash
   git init
   ```
3. Prüfe Merge Conflicts:
   - Falls Conflicts → Abbruch + Warnung: "Merge Conflicts vorhanden – bitte manuell lösen"
4. Add alle Files:
   ```bash
   git add .
   ```
5. Commit:
   ```bash
   git commit -m "docs: hausarbeit update [YYYY-MM-DD] [HH:MM]"
   ```

## Fehlerbehandlung

| Szenario | Verhalten |
|----------|-----------|
| `docs/hausarbeit/` existiert nicht | Erstelle Ordner und alle Unterordner automatisch |
| Schreibrechte fehlen | Logge Fehler in Terminal + versuche später erneut |
| Git nicht initialisiert | `git init` ausführen |
| Merge Conflicts | Abbruch + Warnung |
| Session bricht ab | Daten bleiben in Files – kein Verlust |

## Prioritäten

1. **Immer** dokumentieren nach fertigen Aufgaben
2. **Immer** Git-Status vor Commit prüfen
3. **Nie** ohne User-Trigger "Feierabend" ausführen
