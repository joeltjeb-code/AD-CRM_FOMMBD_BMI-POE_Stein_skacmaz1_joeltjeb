// Formatier-Helfer fürs Interface: Händlernummer ohne ISO3-Präfix und
// Kalenderwochen nach ISO-8601 (die KW des Montags gilt für die ganze Woche).

// Händlernummer kompakt anzeigen: "DEU1M151" → "1M203". Der Präfix DEU ist im
// Interface redundant (Eingabemaske im Bericht zeigt ihn hartcodiert).
export function hndNummer(id) {
  if (!id) return '';
  return String(id).replace(/^DEU/, '');
}

// ISO-8601 Kalenderwoche eines ISO-Datums (YYYY-MM-DD). Montag = Wochenstart;
// KW1 ist die Woche mit dem ersten Donnerstag des Jahres.
export function kalenderwoche(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Zum Donnerstag der Woche: Montag + 3 Tage
  const donnerstag = new Date(d.getTime() + 3 * 24 * 60 * 60 * 1000);
  const jahresStart = Date.UTC(donnerstag.getUTCFullYear(), 0, 1);
  const kw = Math.ceil(((donnerstag.getTime() - jahresStart) / 86400000 + 1) / 7);
  return kw;
}
