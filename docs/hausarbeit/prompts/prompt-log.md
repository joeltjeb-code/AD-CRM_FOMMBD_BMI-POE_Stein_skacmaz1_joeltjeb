# Prompt-Log

## 2026-10-29
- [18:30] "Hi, wir müssen zu unserem Projekt eine begleitende Hausarbeit schreiben und wollen, dass du von Anfang an mitdokumentierst, was wir machen. Also was wir eingeben, wie es geklappt hat und was alles nicht funktioniert hat, damit wir später daraus die Kapitel schreiben können. Geht das mit einem eigenen Skill? Ich habe gesehen, dass wir einen Brainstorming Skill haben. Nutze den und frage erst bevor du was neues baust oder veränderst"
  → Ergebnis: Brainstorming-Prozess gestartet, Anforderungen geklärt

- [18:35] "Option A. Also nach jeder Aufgabe und wenn ich Feierabend oder Schluss für heute sage eine ergänzende Zusammenfassung. Dabei will ich das einmal ausführlich haben mit Prompts, Entscheidungen, Ergebnissen, problemen und auch Abwegen und Fehlern. Vergiss dabei aber auch nicht die Learnings und wenn du kann screenshots zu erstellen."
  → Ergebnis: Dokumentationsfrequenz und Inhalt definiert

- [18:40] "Nimm bitte Option A aber stelle sicher, dass hausarbeit ein Unterordner ist. Ich will, dass ich ein Tagebuch pro Abend und die Prompts sammel"
  → Ergebnis: Speicherort `docs/hausarbeit/` als Unterordner festgelegt

- [18:45] "Ich hätte bitte Option C: Beides. Aber ich will die Prompts bitte wörtlich mit Zeitstempel in einem Promptlog haben und im Tagebuch reicht dann eine paraphrasierte Version und nur die wichtigsten Prompts des Abends wörtlich"
  → Ergebnis: Prompt-Log-Format definiert (wörtlich + Zeitstempel)

- [18:50] "Dann nur Option D, wenn man keine richtigen Screenshots machen kann. Die Prompts werden ja schon 1:1 gespeichert"
  → Ergebnis: Keine Screenshots, nur Text-Dokumentation

- [19:00] "Können wir uns an dieser Commit-Strategie orientieren: [Strategie des Freundes]"
  → Ergebnis: Commit-Strategie angepasst (Git init check, Merge Conflict check, alle Files commiten)

- [19:05] "Das Design Dokument hat immernoch das falsche Datum im Titel"
  → Ergebnis: Spec-Dateiname korrigiert auf `2026-10-29-dokumentation-design.md`

- [19:10] "Option B"
  → Ergebnis: Inline Execution für Implementierung gewählt

- [19:15] "Ja das sieht für mich als Laien gut aus"
  → Ergebnis: Design-Dokument genehmigt, Implementierung gestartet

- [20:30] "Ja lege das bitte für heute an"
  → Ergebnis: Erste Test-Dokumentation wird erstellt

## 2026-11-16
- [20:28] "Kurze Frage vorab: Steht in der Agents.md schon drin, dass du automatisch über den Skill dokumentiertst? Und hast du schon für heute die Tagesdatei angelegt?"
  → Ergebnis: Tagesdatei `2026-11-16.md` nachgetragen (letzte vom 31.10.), AGENTS.md verweist auf Dokumentations-Skill

- [20:33] "Ich will für den Außendienst diesen Agenten bauen. Er soll auf Basis einer Händlerliste die Routenplanung übernehmen können. Was waren die anderen Aufgaben, die ich bisher skizziert hatte?"
- [20:40] "Ich werde dir eine Händlerliste mit Adressen hochladen. Dort wirst du auch die Markt Händlernummern, z.B. DEU1M150 als unique identifier eines Händlerbetriebs finden. Perspektivisch wirst du diese Daten Live aus der Google Cloud Platform abrufen, wenn der Agent in ein Ford System transferiert wird. Der Außendiener soll einmal seine Heimatadresse hinterlegen aber auch andere Startorte wählen können. Die Idee ist, dass an einem Montag die Routenplanung für die kommenden Wochen gemacht wird. Dort sollen dann pro Tag von Di bis Freitag drei Händler besucht werden und der Außendiener kann entweder im Hotel schlafen, da sollte man auch Präferenzen hinterlegen können oder wieder an seiner Heimatadresse schlafen. Es wäre super, wenn der Agent einen Vorschlag macht, den man in dem Interface per Drag & Drop nachbessern kann oder auch über Texteingaben anpassen kann. z.B. wenn man Abends nicht mehr so weit zum Hotel fahren will oder man eher in der nähe des nächsten Morgens Termin im Hotel übernachten will. Reicht dir das so an Fähigkeiten?"
- [20:50] "Man soll in der Regel drei Betriebe pro Tag besuchen. Die Besuche dauern ca 90 Minuten, manchmal auch 120. Das Pensum für eine Woche sind also 12 Händler (3 Besuche auf vier Tage von Di bis Fr). Ein Gebiet hat 85 bis 95 Betriebe und es sollen alle ca einmal pro Quartal besucht werden. Es gibt auch Prio Betriebe, die dann öfter als einmal pro Quartal angefahren werden. Die oberflächliche Routenplanung findet in der Regel immer mehrere Wochen im voraus statt"
  → Ergebnis: Planungslogik konkretisiert (12 Besuche/Woche, ~90 Betriebe/Gebiet, Quartalsrhythmus + Prio); Frage nach Auswahlogik + Hotelquelle offen

- [21:00] "Grundsätzlich nach regionalen Clustern, um die Fahrzeiten zu verringern und dort dann nach erst nach Fälligkeit und dann nach Prio. Wenn der erste Termin in der Regel so für 8:30/9:00 Uhr Morgens angesetzt ist und der letzte so gegen 15/16 Uhr startet und jeder Termin so circa 90 bis 120 Minuten lang ist haben die Fahrzeiten zwischen den Terminen auch ein natürliches Limit, um alles mit einer Marge für Staus, ggf Ladestops bei BEV Fahrzeugen zu schaffen"
  → Ergebnis: Auswahlogik (Cluster → Fälligkeit → Prio) + Tagesskelett (8:30–16:00, 3 × 90–120 min) festgelegt; letzte offene Frage: Hotelquelle/Präferenzen

- [21:15] "Kannst du für die Hotelquelle auf Google Maps, etc zugreifen? Ich habe jetzt per se keine Liste. Der ADler soll eine Präferenz hinterlegen können auf Basis fester Lieblingshotels pro region, Maximale Entfernung zum ersten Termin am nächsten Morning, Benefits bei Hotelstati oder Kreditkarten Treueprogrammen und best case auch noch nach Preis pro Nacht, wenn du über Booking.com, etc darauf Zugriff erhalten kannst"
  → Ergebnis: Kein Zugriff auf Maps/Booking möglich → fiktive Hotel-Daten mit vollständigem Präferenz-Datenmodell; Klärungsrunde abgeschlossen, Entwurf folgt

- [21:20] "Dann nehmen wir doch Ansatz B, wenn das dein Vorschlag ist"
  → Ergebnis: Architektur festgelegt: modulares HTML/JS ohne Build-Schritt; Design-Dokument folgt

- [21:30] "Das klingt für mich in Ordnung als Spec"
  → Ergebnis: Spec geschrieben (2026-11-16-routenplanung-design.md), Selbstreview + AGENTS.md-Update; Implementierungsplan folgt nach Spec-Review

- [21:50] "mach den Plan."
  → Ergebnis: Implementierungsplan erstellt (12 TDD-Tasks, docs/superpowers/plans/2026-11-16-routenplanung.md), Selbstreview durchgeführt

- [22:00] "Inline (meine Empfehlung) — Ich arbeite die Tasks hier direkt ab, mit Teil-Commits je Task und Checkpoints."
  → Ergebnis: Alle 12 Tasks auf feature/routenplanung ausgeführt, 26 Unit-Tests grün

- [22:25] "Das klingt für mich soweit okay. Bitte merge nach main"
  → Ergebnis: Merge-Commit 7add03d, Tests nach Merge grün; nicht gepusht (Sync durch Nutzer)
