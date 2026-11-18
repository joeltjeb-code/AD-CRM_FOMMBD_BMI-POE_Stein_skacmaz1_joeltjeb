export function erstelleBericht(eingabe) {
  const fehlend = [];
  if (!eingabe.haendlerId) fehlend.push('haendlerId');
  if (!eingabe.datum) fehlend.push('datum');
  if (!Array.isArray(eingabe.teilnehmer) || eingabe.teilnehmer.length === 0) fehlend.push('teilnehmer');
  const bericht = {
    haendlerId: eingabe.haendlerId ?? null,
    datum: eingabe.datum ?? null,
    teilnehmer: eingabe.teilnehmer ?? [],
    themen: eingabe.themen ?? [],
    vereinbarungen: eingabe.vereinbarungen ?? [],
    aufgaben: eingabe.aufgaben ?? [],
    offenePunkte: eingabe.offenePunkte ?? [],
    folgetermin: eingabe.folgetermin ?? null,
  };
  return { ok: fehlend.length === 0, bericht, fehlend };
}

export function aufgabenAlsMassnahmen(bericht) {
  return bericht.aufgaben.map((a) => ({
    titel: a.titel, beschreibung: a.titel,
    verantwortlich: a.verantwortlich ?? '', frist: a.frist ?? null, status: 'offen',
  }));
}
