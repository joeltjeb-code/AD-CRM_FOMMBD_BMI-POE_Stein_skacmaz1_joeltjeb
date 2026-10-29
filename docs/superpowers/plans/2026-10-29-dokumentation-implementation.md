# Dokumentations-System – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementiere das automatische Dokumentationssystem für die begleitende Hausarbeit gemäß Spec `2026-10-29-dokumentation-design.md`

**Architecture:** 
- Skill-basierte Dokumentation, die bei jeder Session automatisch startet
- Files werden nach jeder Aufgabe aktualisiert, Commit erst bei "Feierabend"
- Git-Status-Check vor jedem Commit

**Tech Stack:** Git, Markdown, Vibe Skills

## Global Constraints

- Nutze existing `.vibe/skills/` Struktur
- Dateiformate exakt wie in Spec definiert
- Token-Effizienz: Dokumentation nur nach fertigen Aufgaben
- Bei Session-Start: Automatische Anlegung der Tagesdateien

---

## File Structure

**Neue Files:**
- `.vibe/skills/dokumentation/SKILL.md` – Dokumentations-Skill
- `AGENTS.md` – Erweiterung um Dokumentationsregeln

**Runtime Files (werden automatisch erstellt):**
- `docs/hausarbeit/tagebuch/[datum].md`
- `docs/hausarbeit/prompts/prompt-log.md`
- `docs/hausarbeit/process/[DATETIME]-actions.md`

---

## Task Decomposition

---

### Task 1: Dokumentations-Skill erstellen

**Files:**
- Create: `.vibe/skills/dokumentation/SKILL.md`

**Interfaces:**
- Consumes: Spec `2026-10-29-dokumentation-design.md`
- Produces: Skill-Definition für automatische Dokumentation

- [ ] **Step 1: Verzeichnis anlegen**

```bash
mkdir -p .vibe/skills/dokumentation
```

Expected: Verzeichnis existiert

- [ ] **Step 2: SKILL.md erstellen**

```markdown
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
```

Expected: File existiert mit obigem Inhalt

- [ ] **Step 3: Syntax prüfen**

```bash
# Prüfe, ob die Datei lesbar ist
cat .vibe/skills/dokumentation/SKILL.md | head -5
```

Expected: Zeigt die ersten 5 Zeilen des Skills

---

### Task 2: AGENTS.md erweitern

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1 (Dokumentations-Skill existiert)
- Produces: Erweiterte AGENTS.md mit Dokumentationsregeln

- [ ] **Step 1: Aktuelle AGENTS.md lesen**

```bash
cat AGENTS.md
```

Expected: Zeigt aktuellen Inhalt

- [ ] **Step 2: Dokumentations-Abschnitt hinzufügen**

Füge am **Ende** der Datei hinzu:

```markdown
## Dokumentation für Hausarbeit

- Dokumentiere JEDE **fertige Aufgabe** automatisch in `docs/hausarbeit/`
- Nutze den Skill `.vibe/skills/dokumentation/SKILL.md` als Referenz
- Erstelle bei Session-Start die Tagesdatei unter `docs/hausarbeit/tagebuch/[heute].md`, falls sie nicht existiert
- Bei "Feierabend" oder "Schluss für heute": finale Zusammenfassung + Commit aller Änderungen
```

- [ ] **Step 3: AGENTS.md aktualisieren**

```bash
# Füge den Abschnitt hinzu (manuell oder via edit)
# Ergebnis: AGENTS.md enthält den neuen Abschnitt
```

Expected: AGENTS.md enthält den neuen Dokumentations-Abschnitt

- [ ] **Step 4: Prüfen**

```bash
grep -q "Dokumentation für Hausarbeit" AGENTS.md && echo "OK" || echo "FEHLT"
```

Expected: "OK"

---

### Task 3: Test-Session vorbereiten

**Files:**
- Create: `docs/hausarbeit/tagebuch/.gitkeep` (für leere Ordner)
- Create: `docs/hausarbeit/prompts/.gitkeep`
- Create: `docs/hausarbeit/process/.gitkeep`

**Interfaces:**
- Consumes: Task 1 + Task 2 (Skill und AGENTS.md fertig)
- Produces: Leere Ordnerstruktur für erste Nutzung

- [ ] **Step 1: Ordnerstruktur anlegen**

```bash
mkdir -p docs/hausarbeit/tagebuch docs/hausarbeit/prompts docs/hausarbeit/process
```

Expected: Alle Ordner existieren

- [ ] **Step 2: .gitkeep Files erstellen**

```bash
touch docs/hausarbeit/tagebuch/.gitkeep
touch docs/hausarbeit/prompts/.gitkeep
touch docs/hausarbeit/process/.gitkeep
```

Expected: .gitkeep Files existieren

- [ ] **Step 3: Git Status prüfen**

```bash
git status
```

Expected: Neue Files werden angezeigt

---

### Task 4: Alles commiten

**Files:**
- All modified/created files

**Interfaces:**
- Consumes: Task 1-3 (alle Files bereit)
- Produces: Clean Git History

- [ ] **Step 1: Git add**

```bash
git add .vibe/skills/dokumentation/ AGENTS.md docs/hausarbeit/
```

Expected: Files staged

- [ ] **Step 2: Git commit**

```bash
git commit -m "feat: add dokumentation skill for hausarbeit

- Add .vibe/skills/dokumentation/SKILL.md with auto-documentation rules
- Extend AGENTS.md with documentation requirements
- Create docs/hausarbeit/ structure with gitkeep files

Generated by Mistral Vibe.
Co-Authored-By: Mistral Vibe <vibe@mistral.ai>"
```

Expected: Commit erfolgreich

---

## Execution Notes

**For Inline Execution (Option B):**
- Führe die Tasks in dieser Session nacheinander aus
- Nutze `executing-plans` Skill für die Ausführung
- Checkpoints nach jedem Task für User-Review

**Verification:**
- Nach Task 1: Skill existiert und ist lesbar
- Nach Task 2: AGENTS.md enthält Dokumentationsregeln
- Nach Task 3: Ordnerstruktur existiert
- Nach Task 4: Commit erfolgreich
