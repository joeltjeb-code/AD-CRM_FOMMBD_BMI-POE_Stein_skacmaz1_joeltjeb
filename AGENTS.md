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

## Dokumentation für Hausarbeit

- Dokumentiere JEDE **fertige Aufgabe** automatisch in `docs/hausarbeit/`
- Nutze den Skill `.vibe/skills/dokumentation/SKILL.md` als Referenz
- Erstelle bei Session-Start die Tagesdatei unter `docs/hausarbeit/tagebuch/[heute].md`, falls sie nicht existiert
- Bei "Feierabend" oder "Schluss für heute": finale Zusammenfassung + Commit aller Änderungen
