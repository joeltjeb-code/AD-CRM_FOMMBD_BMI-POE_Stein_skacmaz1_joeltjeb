// Reine Helfer für das Berichts-Formular (ohne DOM, testbar).
// Der Nutzer tippt nur 5 Zeichen (wie bei PIN-Eingaben), der Präfix DEU ist
// hartcodiert; daraus entsteht die vollständige Händlernummer.

export function normaleHndEingabe(kurz) {
  const s = String(kurz ?? '').trim().toUpperCase();
  if (!s) return '';
  return `DEU${s}`;
}

// Datum (ISO) + Uhrzeiten → lesbare Folgetermin-Angabe im Bericht.
// Format wie bisherige Freitexteinträge: '23.04.2026, 13:00-14:00'.
export function folgeterminString(datumIso, startUhr, endeUhr) {
  if (!datumIso || !startUhr) return '';
  const [j, m, t] = String(datumIso).split('-');
  const datum = `${t}.${m}.${j}`;
  const ende = endeUhr ? `-${endeUhr}` : '';
  return `${datum}, ${startUhr}${ende}`;
}

// Alle Teilnehmernamen aus den Besuchshistorien der Wissensbasis — Basis
// für die Vorschlagsliste beim Tippen.
export function sammleTeilnehmer(wissensbasis, aktenListe = wissensbasis?.akten ?? []) {
  const namen = new Set();
  for (const akte of aktenListe) {
    for (const h of akte.besuchHistorie ?? []) {
      for (const t of h.teilnehmer ?? []) if (t) namen.add(t);
    }
  }
  return [...namen].sort((a, b) => a.localeCompare(b));
}

export function teilnehmerVorschlaege(quelle, eingabe, limit = 6) {
  const s = String(eingabe ?? '').trim().toLowerCase();
  if (!s) return [];
  return quelle.filter((n) => n.toLowerCase().includes(s)).slice(0, limit);
}
