# Project Guide for Vibe

This repository is a starter kit for coding with Vibe Code at a hackathon.

## Session-Start (PFLICHT, vor allem anderen)

Sobald eine Session beginnt, tue dies als Erstes, bevor irgendwelche anderen
Aufgaben laufen:

1. Prüfe, ob `docs/hausarbeit/tagebuch/[HEUTE].md` existiert (HEUTE = aktuelles
   Datum, YYYY-MM-DD). Falls nein: lege sie an, orientiere dich am Format der
   bisherigen Tagesdateien und trage die Startzeit ein.
2. Prüfe, ob `docs/hausarbeit/prompts/prompt-log.md` existiert; falls nein:
   lege es mit Header an.
3. Bestätige dem Nutzer in einem Satz, dass die Tagesdatei steht.

Eine fehlende Tagesdatei am Session-Start ist ein Fehler, kein Sonderfall.
Formate und Details: `.vibe/skills/dokumentation/SKILL.md`

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
- **Routenplanung** (Spec: `docs/superpowers/specs/2026-11-16-routenplanung-design.md`): Wochenplanung Di–Fr mit je 3 Händlerbesuchen, Kaskade Cluster → Fälligkeit → Prio, Tagesskelett 8:30–16:00, Übernachtung Heimat vs. Hotel mit Präferenzen, Nachbesserung per Drag & Drop oder Textbefehl.

## Dokumentation

- Automatische Dokumentation jeder fertigen Aufgabe in `docs/hausarbeit/` (siehe `.vibe/skills/dokumentation/SKILL.md`).
- Tagesdatei wird bei Session-Start in `docs/hausarbeit/tagebuch/[heute].md` angelegt.
- Bei "Feierabend": Finale Zusammenfassung + Commit aller Änderungen (gemäß Dokumentations-Skill).

## Aktueller Stand

*Letzter Stand (22.11.2026, Branch `main`, Suite 119/119 grün):*
- **Routenplanung:** Planungslogik getestet (Cluster → Fälligkeit → Prio, Tagesskelett mit Wechselpuffer + Mittagspause, Übernachtung Heimat/Hotel mit Präferenzen), 4-Wochen-Plan, Drag & Drop mit Trickle-Down und bester Einsattposition, Textbefehle, Abwesenheiten je Tag/Woche (KW-Anzeige).
- **Briefing / Bericht / Infos:** Briefing mit KPIs + Pflichthemen + Schnellblatt, Bericht mit Feldblöcken, Händlernummer-Maske, Folgetermin-Maske, Teilnehmer-Vorschlägen, **KI-Vorschläge-Button (T18: Stichpunkte → Feldvorbelegung + Fokuspunkt-Klassifikation, Mistral-Call mit Heuristik-Fallback, Key nur Runtime-Konfig)**, Freigabe → Wissensbasis, Info-Verteilung per Postfach-Anhängen.
- **Datenbasis:** echte Betreuungsliste — `daten/haendler.json` (972 Händler, D01–D12) erzeugt von `tools/import_betreuungsliste.py` aus der anonymisierten Liste in `Dummy_Data/` (bleibt lokal, `.gitignore`); Quelldateien versioniert in `daten/betreuungslisten/`; ein Neuupload im Import-Kasten (Tab Plan) überschreibt die wirksame Liste (localStorage) und sollte zusätzlich per Skript/Agent als neue Version in `daten/betreuungslisten/` abgelegt werden; Demo-Daten bleiben Fallback (`haendler-demo.json`).
- **Start:** `python3 -m http.server 8000`, App im Browser; Tests: `node --test tests/` (119).
- **Nächste Schritte:** echte PLZ-Koordinaten statt Demo-Jitter, echte Händlerliste hochladen (CSV aus der Betreuungsliste oder PDF+OCR-Key); danach Outlook-Anbindung (Phase 2, zurückgestellt). T18 und T19 sind abgeschlossen.
