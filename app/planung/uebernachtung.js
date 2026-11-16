export function entscheideUbernachtung({ letzterH, ersterMorgen, hotels, settings, routing }) {
  const fahrtHeim = routing.fahrzeitMin(letzterH.pos, settings.heimat.pos);
  const heimScore = fahrtHeim + (ersterMorgen ? routing.fahrzeitMin(settings.heimat.pos, ersterMorgen.pos) : 0);

  let bestes = null;
  for (const ho of hotels.filter((x) => x.region === letzterH.cluster)) {
    const fAbend = routing.fahrzeitMin(letzterH.pos, ho.pos);
    const fMorgen = ersterMorgen
      ? routing.fahrzeitMin(ho.pos, ersterMorgen.pos)
      : routing.fahrzeitMin(ho.pos, settings.heimat.pos);
    if (ersterMorgen && fMorgen > settings.praferenzen.maxFahrtErsterTerminMin) continue;
    const lieblings = settings.praferenzen.lieblingshotelIds.includes(ho.id) ? -30 : 0;
    const programme = ho.programme.filter((p) => settings.praferenzen.programme.includes(p)).length * -10;
    const score = fAbend + fMorgen + lieblings + programme + (ho.preisNacht ? ho.preisNacht / 10 : 0);
    if (!bestes || score < bestes.score) bestes = { hotel: ho, score };
  }

  if (bestes && bestes.score < heimScore) {
    return { art: 'hotel', hotelId: bestes.hotel.id, hotelName: bestes.hotel.name, score: Math.round(bestes.score) };
  }
  return { art: 'heim', fahrzeitHeim: fahrtHeim };
}
