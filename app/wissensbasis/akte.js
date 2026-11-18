export function ladeAkte(wissensbasis, haendlerId) {
  return wissensbasis.akten.find((a) => a.haendlerId === haendlerId) ?? null;
}

export function fuegePersoenlicheNotizHinzu(akte, notiz) {
  return { ...akte, persoenlicheNotizen: [...akte.persoenlicheNotizen, { ...notiz }] };
}

export function uebernimmAufgabe(akte, aufgabe) {
  return { ...akte, offeneMassnahmen: [...akte.offeneMassnahmen,
    { beschreibung: '', status: 'offen', ...aufgabe }] };
}

export function setzeMassnahmenStatus(akte, titel, status) {
  return { ...akte, offeneMassnahmen:
    akte.offeneMassnahmen.map((m) => (m.titel === titel ? { ...m, status } : m)) };
}

export function speichereAkte(wissensbasis, akte) {
  const ersetzt = wissensbasis.akten.some((a) => a.haendlerId === akte.haendlerId);
  return {
    ...wissensbasis,
    akten: ersetzt
      ? wissensbasis.akten.map((a) => (a.haendlerId === akte.haendlerId ? akte : a))
      : [...wissensbasis.akten, akte],
  };
}
