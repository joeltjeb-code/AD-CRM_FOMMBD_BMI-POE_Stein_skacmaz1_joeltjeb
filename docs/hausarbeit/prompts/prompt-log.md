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

- [21:14] "Schluss für heute"
  → Ergebnis: Tageszusammenfassung + Prozess-Doku (2026-11-16-21-16-actions.md), Abschluss-Commit

- [14:33] "Kurze Frage vorab: Steht in der Agents.md schon drin, dass du automatisch über den Skill dokumentierst? Und hast du schon für heute die Tagesdatei angelegt?"
  → Ergebnis: Tagesdatei 2026-11-17 angelegt, Prompt-Log geprüft (vorhanden), Status aus AGENTS.md bestätigt
- [15:17] "Ich habe gerade die Excel DEU_Betreuungsliste_20260924_GH_Dummy als Referenz hochgeladen"
  → Ergebnis: Excel analysiert (1036 Händler, 60 Spalten, eindeutige Markt Händlernummer DEUxxxxx); Mapping-Fragen ans Datenmodell dokumentiert

- [15:17] Mapping-Antworten: Cluster erst nach Region, dann OBG; Prio vom Management definiert; alle 1036 Händler wenn Performance es erlaubt; Nutzer = Außendienstler, der ein OBG betreut
  → Ergebnis: Verteilungsanalyse (D01-D12: 73-95 Händler je OBG; Sonder-OBGs DE/neu/None; Kapazität 576 Besuche/Jahr vs. 292-380 nötig bei Quartalskadenz) + Brainstorming-Kontext

- [15:17] "Dann gehen wir mit Ansatz A" (+ Antworten: Demo-Prios, nur D01-D12, PLZ-Tabelle, OBG-Auswahl mit Merken)
  → Ergebnis: Design-Doku `docs/superpowers/specs/2026-11-17-haendlerimport-obg-design.md` erstellt und committed; Spec-Selbstreview (5 mechanische Schreibfehler bereinigt)

- [16:04] "Feierabend"
  → Ergebnis: Tageszusammenfassung + Prozess-Doku (2026-11-17-16-04-actions.md), Abschluss-Commit

## 2026-11-18
- [18:12] "Steht in der Agents.md schon drin, dass du automatisch über den Skill dokumentiertst? Und hast du schon für heute die Tagesdatei angelegt?"
  → Ergebnis: Tagesdatei 2026-11-18.md angelegt, Prompt-Log geprüft (vorhanden)

- [18:15] "Interview mit Außendienstler (David) zu Vorbereitung/Nachbereitung — damit an den Skills und Elementen des Agenten arbeiten" (Highlevel-Workflow + KI-Meetingzusammenfassung übergeben)
  → Ergebnis: Brainstorming-Skill; Element-Mapping (Briefing, Bericht, Wissensbasis, Info-Verteilung, Routing-Anpassungen) präsentiert

- [18:25] "Auswertung + Spec + Plan"
  → Ergebnis: 3 Ansätze vorgeschlagen, Nutzer wählt Ansatz C (Bausteine + LLM hinter Adapter)

- [18:30] "Ansatz C. Info-Verteilung: Outlook-Postfach-Scan als phased requirement definieren"
  → Ergebnis: Spec `docs/superpowers/specs/2026-11-18-briefing-nachbereitung-design.md` geschrieben, Selbst-Review, Commit (0efe919); Plan `docs/superpowers/plans/2026-11-18-briefing-nachbereitung.md` (10 Tasks, TDD), Commit (b5f82df)

- [18:45] "Die Spec schaut für mich schlüssig aus. Bitte geh wie folgt vor: Inline — Ausführung in dieser Session mit Checkpoints"
  → Ergebnis: executing-plans-Skill, Branch `feature/briefing-nachbereitung`; alle 10 Plan-Tasks TDD-treu umgesetzt (9 Feature-Commits); Gesamt-Suite 54/54 Tests grün; Checkpoints A und B mit Testberichten; Browser-Durchlauf bleibt manuell

- [19:20] "Drei reale Gesprächszusammenfassungen als Nachbereitung erhalten — Anhänge waren allgemein, nicht Teil der spezifischen Vorlagen"
  → Ergebnis: Design-Addendum (Spec Abschnitt 9) + Plan-Addendum (Tasks 11–13) + Umsetzung TDD: Themen-Anhänge-Katalog (`daten/themen-anhaenge.json`), Anhang-Zusammenführung in `entwurf.js` (Kampagnen + Themen + TVA-Pflicht, dedupliziert), optionales folgetermin-Feld, 3 Demo-Akten im Mail-Stil; Suite 58/58 grün

- [19:33] "Interface ist zu technisch/komplex, nicht im Ford Design — Design Guidelines PDF in `Ford Design/`, bitte bestmöglich befolgen"
  → Ergebnis: PDF via pypdf extrahiert (111 S.), Design-Tokens abgeleitet; UI-Rework mit Ford-Farben/-Typo und Tab-Navigation; Spec-Addendum Abschnitt 10; Suite 58/58 grün

## 2026-11-18
- [20:00] "Ich habe mich gerade mal durch die Webanwendung geklickt. Ich habe nicht den Eindruck, dass die Tabs Briefing und Bericht und Infos funktionieren. Das Interface ändert sich nicht, wenn man diese auswählt. Woher weiß das Interface für welches Gebiet (OBG) er die Route planen soll? Woher kennt das Interface die Heimatadresse des Nutzers? Ich brauche in der Übersicht der Händler sowohl den Namen als auch den Identifier, weil Namen teilweise auch mehrfach vergeben sind. Warum ist in jeder Kachel der Start das Heimatbüro und immer eine Übernachtung? Mir gefällt das Thema Treueprogramm nicht. Das können wir auch direkt streichen. Ich muss auch irgendwo deklarieren können, dass man mal auf Urlaub, Lehrgang oder auf einem Event ist und dann nicht den regulären Verlauf machen kann. Woher weiß das Interface welchen Teil des Gebietes ich bespielen will? Das ganze sieht im Fordergrund noch recht wenig nach KI bzw KI Datenanalyse der Nutzereingaben aus. Da habe ich ein bisschen bedenken im Kontext FOM Benotung. Ich habe dir die Hintergrund Präsentationen von der FOM in den neuen Ordner FOM_Data geladen"
  → Ergebnis: Tab-Bug reproduziert (jsdom) und gefixt (app/app.js, wechsleTab); 58/58 Tests grün; Ursachenanalyse zu OBG/Heimat/Übernightung/Kacheln; Rest als geplanter Nachschlag vorbereitet
- [20:10] (Antwort auf Rückfragen) "Wie soll die KI-Komponente konkret angebunden werden?" → "Alles davon"; "Wie setzen wir OBG-Auswahl und Heimatadresse um?" → "Es gibt oben ein Dropdown für das OBG und eine Eingabemaske für die Heimatadresse"; "Wie fein soll die Abwesenheits-Deklaration sein?" → "Man kann einzelne Tage und Woche per Toggle abwählen können"
  → Ergebnis: Sofort-Fixes (Kachel-Label, Treueprogramm raus, 61/61 grün), Spec-Addendum Abschnitt 11, Plan-Addendum Tasks 14–19; Freigabe ausstehend
- [20:35] "Gehe weiter vor" (Freigabe der Addenda)
  → Ergebnis: Tasks 14–17 TDD-mäßig umgesetzt (4 Commits), jsdom-Durchlauf-Tests je Task, Suite 75/75; Checkpoint C zur manuellen Prüfung vorbereitet
- [20:55] (Checkpoint C, Screenshot-Feedback) "Danke. Die Tabs Briefing und Bericht funktionieren jetzt. Im Tab Infos kommt immer die Meldung, dass ich im Tab Plan einen Händler auswählen soll egal ob ich das gemacht habe. Kannst du ganz rechts in die Leiste mit Plan, Briefing, Bericht, Infos ein Feld hinzufügen, wo der Händler angezeigt wird, wen man selektiert hat. Nut der Überarbeitung sieht aber alles wieder sehr chaotisch platziert aus. Bring da bitte mehr gleichmäßigkeit und Struktur rein. Ich habe dir ein aktuelles Refrenzbild angehängt. In der OBG Auswahl im Einstellungen Block reicht auch die Bezeichnung Gebiet und im Dropdown muss nicht OBG davor stehen. Zb D01 reicht auch einfach so. Ich finde die Termine sind teilweise sehr unrealistisch nach aneinander getimed. Außerdem ist nur eine Woche und da auch nur der Dienstag und Mittwoch geplant. Bennene im Tab Briefing die Kategorie Auf dem Parkplatz um in 'Performance Auswertung'"
  → Ergebnis: T20 (Infos-Laden beim Tab-Klick + Nav-Chip), T21 (Layout-Raster, „Gebiet"-Label, OBG-Optionen ohne Präfix, Abwesenheiten-Raster), T22 (Wechselpuffer + Mittagspause, Commit d8888f2), T23 (720 Händler je OBG mit Remap), Planer-Überarbeitung (Cluster-3er-Gruppen, Reserven, OBG-Hotelfilter — 4 Wochen × 12 Termine), T24 (Performance Auswertung); Suite 78/78 grün, jsdom-End-to-End-Verifikation
- [21:10] "Warum hast du gestoppt?"
  → Ergebnis: Arbeit fortgesetzt — planeWochen-Reserven, Hotel-Fix, Tests, 3 Feature-Commits (f58366b, da80b87, d4ab393), Lagebuch-Eintrag
- [21:25] (Feedback-Runde D) "Danke, das sieht schon besser aus. Kannst du bei der Woche im Tab Plan noch die Kalenderwoche als KWXX ergänzen. Wenn man im Tab Plan über die Schaltfläche Plan neu berechnen hovert soll diese auch in Ford Skyview (Hex 066FEF) eingefärbt sein. Wenn man die Abwesenheit einmal ausgeklappt hat soll man sie auch bitte wieder einklappen können. Kannst du den Demo Hotels bitte noch aussagekräftigere Namen geben, wie Hilton Dreseden; HolidayIn Leipzig; etc. Du kannst in dieser Oberfläche bei den Händlernummern den ISO3 Identifier DEU weglassen und nur zB 1M203 zeigen. Die Zeitlichen Abstände zwischen den Terminen sind immer noch sehr klein … realistische Fahrzeiten … selten weniger als 30 Minuten … 1,5 Stunden. Wenn man im Tab Bericht ist soll der aktuell selektierte Händler der sein, den man bei der Marktnummer eingibt. Marktnummer soll bitte auch zu 'Händlernummer' umbenannt werden und aus einem Feld bestehen, wo … DEU gehardcoded ist und dann nur fünf Zeichen … Diese Zeichen sind immer Caps. Kann man es so bauen, dass der Eingeber für das Feld der Teilnehmer Vorschläge bekommt sobald er tippt? Die Eingabefelder sind zu granuliert. Im Feld Folgetermin soll man das bitte auch über eine Maske eingeben. Das Feld Kampagnen Mails soll bitte umgebannt werden in 'Fokuspunkt Vorlagen'. Ich verstehe nicht mehr ganz wofür der Tab Infos gedacht ist. Warum steht im Tab Infos immernoch 'Wählen Sie im Tab Plan einen Händler aus.' obwohl ich einen Händler als selektiert angezeigt bekomme"
  → Ergebnis: alle 9 Punkte umgesetzt (KW, Hover #066FEF, Einklappbar, Hotel-Namen, HndNummer ohne DEU, Fahrzeiten 29–81 min, Bericht-Blöcke + Händlernummer-Maske + Folgetermin-Maske + Teilnehmer-Vorschläge, Fokuspunkt Vorlage, Infos-Tab-Fix mit Ad-hoc-Akte + Zwecktext); 85/85 Tests, jsdom-End-to-End 20 Checks ok, 4 Feature-Commits
- [21:50] (Feedback-Runde E) "Danke. Das sieht gut aus. Kannst du bitte auch den selektierten Tab in Ford Skyview hervorheben. Kannst du bitte bei den Abwesenheiten bei den Wochen auch die KWs ergänzen. Mir gefällt die Routenplanung noch nicht. Du hast dort stumpf einen Abstand von 29 Minuten zwischen den Terminen. Gehst du gar nicht auf realen Abstände der PLZs ein? Wenn ich Termine von einen Tag auf einen anderen Verschiebe sind im ersten Moment die Abstände auch nicht mehr existent und es kommt zu überlappungen. Das darf nicht passieren und alles andere muss sich dann per trickle down nach hinten verschieben und anpassen. Kannst du bei den Demohotels mehr Varianz in die Namen und Orte reinbringen. Danke"
  → Ergebnis: Tab-Hervorhebung (#066FEF), KW bei Abwesenheiten, Fahrzeit-Streuung (median 32, p95 69 min), Hotel-Varianz (18 Marken × Stadtteile), Trickle-Down + beste Einsattposition; 88/88 Tests, jsdom-Drag-Verifikation, 3 Feature-Commits
- [21:55] "Ich komme jetzt nicht mehr aus dieser Ansicht weiter" (Screenshot: Plan-Tab ohne Einstellungen/Wochen, nur Statik)
  → Ergebnis: Ursache = stummer Abbruch von starten() bei Fetch-Fehler; Fix mit Lade-Retry, sichtbarer Fehlermeldung + Neuladen-Button, Listener-Frühbindung und Verwerfen gealterter Pläne; 92/92 Tests, jsdom 3-Szenarien-Verifikation, Commit
- [22:05] "Ich will die restlichen Aufgaben in den kommenden Tagen machen. Bitte starte führe das aufräumen durch. Also dokumentier alles notwenige sobald noch nicht passiert und dann mergen wir auf Main. Was fehlt dann noch?"
  → Ergebnis: .gitignore + FOM_Data/, AGENTS.md aktueller Stand 18.11., README-Projektabschnitt, Merge auf main; Restliste T18 (KI text-adapter), T19 (OCR-Import), echte PLZ-Koordinaten, echte Händlerliste, Maillinbox Phase 2
- [22:08] "Feierabend"
  → Ergebnis: Finale Tageszusammenfassung im Tagebuch, alle Änderungen committed (main auf Merge-Stand 972c664, Suite 92/92), offene Punkte T18/T19 dokumentiert

- [20:31] "Hallo, ist die tagesdatei zur Dokumentation schon erstellt?"
  → Ergebnis: Tagesdatei 2026-11-22.md angelegt (Session-Start-Checkliste), Prompt-Log geprüft, Stand der letzten Session (18.11.) referenziert, offene Aufgaben T18/T19 usw. notiert

- [20:35] "Okay. Dann gehen wir mal #1 an"
  → Ergebnis: Task 18 (KI text-adapter) TDD umgesetzt auf `feature/ki-text-adapter`: strukturiereStichpunkte + klassifiziereThemen mit Mistral-Call (injizierbarer Fetch) und Heuristik-Fallback, Button „KI-Vorschläge" im Bericht mit editierbarer Vorbelegung; Suite 102/102, jsdom 9 Checks ok, 2 Feature-Commits (ccce0d9, 14a22d3)

- [21:05] "Dann merge den Branch bitte bevor wir weitergehen. Ich will unbeding Merge Konflikte verhindern"
  → Ergebnis: Fast-Forward-Merge `feature/ki-text-adapter` → `main` (`--ff-only`, keine Konflikte möglich, da main nicht divergiert war); Suite auf main 102/102 grün; AGENTS.md „Aktueller Stand" auf 22.11. aktualisiert (T18 abgeschlossen, T19 als nächstes)

- [21:20] "Super. Dann will ich jetzt bitte mit der nächsten aufgabe weitermachen, wenn das risikolos möglich ist"
  → Ergebnis: Task 19 (Händlerimport per Mistral OCR) TDD auf neuem Branch `feature/haendlerimport-ocr`: import-adapter (CSV + OCR-Pfad, Nummern-Format-Validierung, OBG-Filter D01–D12, Warnungen), Import-Kasten im Plan-Tab mit Vorschau/Übersicht/Reset; Suite 114/114, jsdom 10 Checks ok, 2 Feature-Commits (7236f05, 6e35ed0)

- [21:50] "Also ist die erste Grundlage vor einem Neuupload jetzt die Liste aus Dummy Data mit all den bestehenden Infos? ... Eine neu hochgeladene Liste überschreibt dann immer die Infos ... als Speicher abgelegt. ... mit Hilfe von KI Vorschläge für die Zuordnung von Spalten ... ersten 10 Zeilen ... Dropdown"
  → Ergebnis: alle drei Punkte umgesetzt: (1) echte Liste ist Basis — daten/haendler.json mit 972 Händlern via tools/import_betreuungsliste.py, App lädt sie mit Demo-Fallback; (2) Versionsspeicher daten/betreuungslisten/ (quelldatei versioniert), Neuupload überschreibt; (3) schlageZuordnung (KI/Heuristik) mit 10-Zeilen-Vorschau + Dropdown je Spalte; Suite 119/119, jsdom 13+5 Checks ok, Commits 0b80aed, b8f5ce7, c2d0d7f

- [22:10] "Danke, gefunden. Ich will das als neuen Button links neben Plan oben im Menü haben. Der Überpunkt soll "Stammdaten" heißen. Als ausklappbare Unterpunkte, wenn man über dem Feld mit der Maus schwebt soll "Manueller Import" und "Zurücksetzen" stehen"
  → Ergebnis: Nav-Dropdown „Stammdaten" links neben Plan (Hover/Klick), Unterpunkte Manueller Import + Zurücksetzen; Suite 119/119, jsdom-Gegenprobe vorbereitet

- [22:12] "Ich will aber, dass mich der Button Manueller Import auf eine neue Seite führt, wo dieser Import durchgeführt wird und damit das aufklapp Interface für Händlerdaten importieren aus dem Tab Plan ersetzt. Wenn ich auf Zurücksetzen klicke soll bitte ein Popup Fenster mittig vom Screen erscheinen, wo gefragt wird: 'VORSICHT DATENLÖSCHUNG [fett, rot, zentriert] ... Diese Änderung ist nicht umkehrbar' — zwei Buttons: Abbrechen (Ford Skyview) und Final Löschen (rot)"
  → Ergebnis: eigene Stammdaten-Seite (details-Kasten ersetzt), Warn-Modal mittig mit exakten Texten und beiden Buttons; Suite 119/119

- [22:18] "Das Popup Fenster funktioniert es schließt sich aber nicht, wenn man auch Abbrechen klickt. Den Button Final Löschen habe ich nicht ausprobiert"
  → Ergebnis: CSS-Bug gefunden (display:flex übersteuerte hidden-Attribut), Fix über .modal-overlay[hidden]-Regel; jsdom 19 Checks grün, Nutzer bestätigt Funktion

- [22:25] "Kannst du bitte noch die Postleitzahl einordnung für die Kalkulation der Fahrzeiten umsetzen oder gibt es da Probleme?"
  → Ergebnis: kein Problem; Spec 3.3 umgesetzt — daten/plz-zentren.json (946 Einträge, je OBG), posAusPlz mit Lookup + identischem JS/Python-Fallback, Import-Skript nutzt Lookup + pflegt Tabelle rekursiv, kalibrierte Fahrzeiten (median 30 / p95 108 / max 162 min), Suite 123/123, Python↔JS identisch

- [22:40] "Sollte ich dann nicht besser eine Liste mit korrekten PLZs hochladen?" + "Dann lasse ich die Daten erstmal so, wie sie gerade sind."
  → Ergebnis: Analyse: korrekte PLZ zu anonymisierten/erfundenen Orten bringt nichts und wäre inkonsistent; Empfehlung: anonymisierte Basis behalten, echten Geodaten-Pfad nur mit erlaubter echter Liste bauen

- [22:45] "Ich habe jetzt nur den Eindruck, dass die Logik mit Startort und Übernachtung nicht mehr passt"
  → Ergebnis: berechtigter Eindruck — Diagnose bestätigt 0 Hotelnächte/immer Heimatstart: (1) Filter region===cluster kaputt nach PLZ-Geografie, (2) frischauf bekam alle OBG-Hotels, (3) Hotels an alter Welt ausgerichtet. Fix: hotelsFuerObg + Score-Auswahl ohne Cluster-Abgleich + hotels neu positioniert + heimat selbstheilend; D01 9/7, D05 10/6 Hotelnächte; Suite 125/125

- [23:20] "Ich habe unter daten --> Hotels --> Accor_Export eine CSV mit allen Accor Standorten in Deutschland hochgeladen. Berücksichtige für die Routenplanung bitte nur Hotels mit dem Status Open. Gib im Webfrontend dann gerne auch die korrekten Namen an"
  → Ergebnis: tools/import_hotels_accor.py (nur DE + Open: 342 von 652, 310 Deleted/Closed verworfen), korrekt geschriebene Marken-/Hotelnamen (ibis, 25hours, Mövenpick …, Umlaute zurückgeschrieben), daten/hotels.json im bekannten Format; app.js lädt die echte Basis mit Demo-Fallback; neuer Test hotels-basis.test.js; zusätzlich vorbestehender Reset-Fix (entferne statt []); Suite 131/131, jsdom ALLE OK

- [23:40] "Lege mir bitte einen neuen Task an, dass ich mich nochmal drum kümmern muss richtige Händlerdaten einzupflegen. Aktuell ist die Mischung aus Demodaten und realen Hoteldaten schlecht"
  → Ergebnis: T20 (offen) in AGENTS.md angelegt — echte Händlerstammdaten einpflegen, danach Fahrzeiten-/ÜN-Kalibrierung neu prüfen; Prio-Liste/OCR-Punkte bleiben offen
