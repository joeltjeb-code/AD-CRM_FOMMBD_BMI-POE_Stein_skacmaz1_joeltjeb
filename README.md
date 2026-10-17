# Vibe Lab

Deine Arbeitsumgebung für eigene KI-Agenten mit Mistral Vibe. Läuft komplett
im Browser, du installierst nichts auf deinem Rechner.

## Start

Du brauchst nur ein kostenloses GitHub-Konto (https://github.com/signup).
GitHub Student ist nicht nötig, das kostenlose Konto enthält genug Codespaces-Zeit.

1. Oben rechts auf **Use this template**, dann **Create a new repository** klicken.
   Name vergeben (zum Beispiel `vibelab-teamname`), **Create repository**.
   Im Zweierteam macht das eine Person und lädt die andere unter
   **Settings, Collaborators** ein.
2. In deinem neuen Repo: **Code**, dann **Codespaces**, dann **Create codespace on main**.
   Nach ein bis zwei Minuten ist VS Code im Browser offen.
3. Weiter geht es in der Datei `START-HIER.md`, die sich automatisch öffnet.

## Was drin ist

- **Vibe**, der Coding-Agent von Mistral, im Terminal und als VS-Code-Erweiterung
- **Werkzeuge ohne Key:** `context7` (aktuelle Doku zu Bibliotheken), `fetch` (Webseiten lesen)
- **Skills** in `.vibe/skills`, die Vibe strukturiert arbeiten lassen
  (brainstorming, writing-plans, test-driven-development, systematic-debugging, ...)

## Deine Anmeldung

Vibe meldet dich beim ersten Start über dein Mistral-Konto an (Launch browser).
Die Anmeldung bleibt in deinem Codespace gespeichert, nie im Repository, und
gilt weiter, wenn der Codespace pausiert. Löschst du den Codespace, meldest du
dich beim nächsten Mal einfach erneut an.
