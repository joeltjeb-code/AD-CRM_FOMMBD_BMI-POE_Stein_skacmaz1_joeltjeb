# Project Guide for Vibe

This repository is a starter kit for coding with Vibe Code at a hackathon.

## How to work here

Devstral is capable but smaller than the largest frontier models, so it does
best with structure. Follow these defaults:

- Start in plan mode. Let the agent lay out the steps before it changes files.
- Gather requirements before writing code. Use the brainstorming skill for
  anything new.
- Write a test before the implementation when you can. Use the
  test-driven-development skill.
- Do not claim something works until you have run it. Use the
  verification-before-completion skill.
- Keep prompts small and specific. One clear task beats one big vague request.

## Skills and tools

Skills live in `.vibe/skills` and are invoked when they fit the task, so this
file does not repeat their content. MCP servers (your tools for real docs, the
browser, and the web) are listed by `/mcp`. Keep secrets in `~/.vibe/.env`,
never in this repository.

## Außendienst-Assistent

- Einfache Web-App mit HTML/JS und lokalen JSON-Dateien im Codespace.
- Ein Nutzer: Außendienst.
- **Briefing vor Termin**: Letzte Gespräche, Vereinbarungen, offene Aufgaben, KPIs, korrekte Anrede (aus Wissensbasis).
- **Bericht nach Termin**: Stichpunkte eingeben → fertiger Bericht mit: Händler, Datum, Teilnehmer, Themen, Vereinbarungen, Aufgaben (Verantwortlicher + Frist), offene Punkte.
- **Freigabe & Wissensbasis**: Geprüfte Berichte werden in der Wissensbasis gespeichert und beim nächsten Briefing mitgenutzt.
- **Daten**: Nur ausgedachte Daten, keine echten Firmen- oder Personendaten.
- Die App holt Daten nur über einen Adapter, damit man später die Datenquelle austauschen kann, ohne den Rest zu ändern.

## Dokumentation

- Automatische Dokumentation jeder fertigen Aufgabe in `docs/hausarbeit/` (siehe `.vibe/skills/dokumentation/SKILL.md`).
- Tagesdatei wird bei Session-Start in `docs/hausarbeit/tagebuch/[heute].md` angelegt.
- Bei "Feierabend": Finale Zusammenfassung + Commit aller Änderungen (gemäß Dokumentations-Skill).

## Aktueller Stand

*Heute (31.10.2026):*
- AGENTS.md-Struktur wurde überarbeitet.
- Nächster Schritt: Umsetzung der App-Spezifikation (Außendienst-Assistent).
