export const SKELETT = {
  abfahrtMin: 480,        // frühester Abfahrtswunsch 08:00 (nur Referenz)
  fruehstartMin: 510,     // erster Termin startet 08:30
  maxStartFahrtMin: 120,  // Startfahrt zum ersten Termin max. 120 min
  letzterStartMin: 930,   // letzter Termin startet spätestens 15:30
};

export function minZuUhr(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
export function uhrZuMin(uhr) {
  const [h, m] = uhr.split(':').map(Number);
  return h * 60 + m;
}

function berechne(liste, start, routing, skelett) {
  const fahrzeiten = [];
  const termine = [];
  const ersteFahrt = routing.fahrzeitMin(start.pos, liste[0].pos);
  const maxStart = skelett.maxStartFahrtMin ?? 120;
  if (ersteFahrt > maxStart) {
    return { ok: false, grund: `Startort zu weit vom ersten Termin (${ersteFahrt} min > ${maxStart} min)` };
  }
  let t = skelett.fruehstartMin;
  fahrzeiten.push({ von: start.name, nach: liste[0].id, min: ersteFahrt });
  for (let i = 0; i < liste.length; i++) {
    const h = liste[i];
    const startMin = t;
    termine.push({
      haendlerId: h.id,
      startMin,
      endeMin: startMin + h.dauer,
      start: minZuUhr(startMin),
      ende: minZuUhr(startMin + h.dauer),
    });
    if (i < liste.length - 1) {
      const fahrt = routing.fahrzeitMin(h.pos, liste[i + 1].pos);
      fahrzeiten.push({ von: h.id, nach: liste[i + 1].id, min: fahrt });
      t = startMin + h.dauer + fahrt;
    }
  }
  if (termine[termine.length - 1].startMin > skelett.letzterStartMin) {
    return { ok: false, grund: 'Letzter Termin beginnt nach ' + minZuUhr(skelett.letzterStartMin) };
  }
  return { ok: true, termine, fahrzeiten };
}

export function validiereReihenfolge(dealerListe, start, routing, skelett = SKELETT) {
  if (dealerListe.length === 0) return { ok: true, termine: [], fahrzeiten: [] };
  return berechne(dealerListe, start, routing, skelett);
}

function permutationen(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutationen(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

export function planeTag(dealerListe, start, routing, skelett = SKELETT) {
  if (dealerListe.length === 0) return { ok: true, termine: [], fahrzeiten: [] };
  let best = null;
  for (const reihenfolge of permutationen(dealerListe)) {
    const res = berechne(reihenfolge, start, routing, skelett);
    if (!res.ok) continue;
    const fahrSumme = res.fahrzeiten.reduce((s, f) => s + f.min, 0);
    if (!best || fahrSumme < best._fahrSumme) best = { ...res, _fahrSumme: fahrSumme };
  }
  if (!best) return { ok: false, grund: 'Tagesskelett nicht einhaltbar für diese Kombination' };
  const { _fahrSumme, ...rest } = best;
  return rest;
}
