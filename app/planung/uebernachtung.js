export function entscheideUbernachtung({ letzterH, ersterMorgen, hotels, settings, routing }) {
  const fahrtHeim = routing.fahrzeitMin(letzterH.pos, settings.heimat.pos);
  const heimScore = fahrtHeim + (ersterMorgen ? routing.fahrzeitMin(settings.heimat.pos, ersterMorgen.pos) : 0);

  // Gebiets-Zuschnitt passiert vorher (hotelsFuerObg) — die Auswahl selbst
  // bewertet nur Fahrzeiten, Preis und Lieblingshotel. KEIN Cluster-Index-
  // Abgleich (region === cluster) mehr: der brach bei neu berechnerten
  // Clustern und machte jede Hotelnacht unmöglich.
  let bestes = null;
  for (const ho of hotels) {
    const fAbend = routing.fahrzeitMin(letzterH.pos, ho.pos);
    const fMorgen = ersterMorgen
      ? routing.fahrzeitMin(ho.pos, ersterMorgen.pos)
      : routing.fahrzeitMin(ho.pos, settings.heimat.pos);
    if (ersterMorgen && fMorgen > settings.praferenzen.maxFahrtErsterTerminMin) continue;
    const lieblings = settings.praferenzen.lieblingshotelIds.includes(ho.id) ? -30 : 0;
    const score = fAbend + fMorgen + lieblings + (ho.preisNacht ? ho.preisNacht / 10 : 0);
    if (!bestes || score < bestes.score) bestes = { hotel: ho, score };
  }

  if (bestes && bestes.score < heimScore) {
    return {
      art: 'hotel',
      hotelId: bestes.hotel.id,
      hotelName: bestes.hotel.name,
      pos: bestes.hotel.pos,
      score: Math.round(bestes.score),
    };
  }
  return { art: 'heim', fahrzeitHeim: fahrtHeim };
}
