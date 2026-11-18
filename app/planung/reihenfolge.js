export const SKELETT = {
  abfahrtMin: 480,        // frühester Abfahrtswunsch 08:00 (nur Referenz)
  fruehstartMin: 510,     // erster Termin startet 08:30
  maxStartFahrtMin: 120,  // Startfahrt zum ersten Termin max. 120 min
  letzterStartMin: 930,   // letzter Termin startet spätestens 15:30
};

// Realistische Tagesabläufe: nach dem Termin erst zum Auto, einsteigen,
// fahren. 15 min Wechselpuffer; mitten am Tag 30 min Mittagspause.
export const WECHSELPUFFER_MIN = 15;
export const MITTAGSPAUSE_MIN = 30;
const MITTAGS_FENSTER_AB = 690;  // 11:30 — ab hier darf die Pause einschieben
const MITTAGS_PAUSE_BIS = 750;   // 12:30 — Terminbeginn frühestens nach Pause

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
  const wechselpuffer = skelett.wechselpufferMin ?? WECHSELPUFFER_MIN;
  const ersteFahrt = routing.fahrzeitMin(start.pos, liste[0].pos);
  const maxStart = skelett.maxStartFahrtMin ?? 120;
  if (ersteFahrt > maxStart) {
    return { ok: false, grund: `Startort zu weit vom ersten Termin (${ersteFahrt} min > ${maxStart} min)` };
  }
  let t = skelett.fruehstartMin;
  fahrzeiten.push({ von: start.name, nach: liste[0].id, min: ersteFahrt });
  let mittagspause = false;
  for (let i = 0; i < liste.length; i++) {
    const h = liste[i];
    if (i > 0) {
      const vorherEnde = termine[i - 1].endeMin;
      const fahrt = routing.fahrzeitMin(liste[i - 1].pos, h.pos);
      fahrzeiten.push({ von: liste[i - 1].id, nach: h.id, min: fahrt });
      t = vorherEnde + fahrt + wechselpuffer;
      // Mittagspause: läge der nächste Termin zwischen 11:30 und 12:30,
      // wird vorab 30 min Pause eingelegt (Essen) — statt Back-to-Back
      if (!mittagspause && t >= MITTAGS_FENSTER_AB && t < MITTAGS_PAUSE_BIS) {
        t = MITTAGS_PAUSE_BIS;
        mittagspause = true;
      }
    }
    const startMin = t;
    termine.push({
      haendlerId: h.id,
      startMin,
      endeMin: startMin + h.dauer,
      start: minZuUhr(startMin),
      ende: minZuUhr(startMin + h.dauer),
    });
  }
  if (termine[termine.length - 1].startMin > skelett.letzterStartMin) {
    return { ok: false, grund: 'Letzter Termin beginnt nach ' + minZuUhr(skelett.letzterStartMin) };
  }
  return { ok: true, termine, fahrzeiten };
}

// zeitreihe: wie validiereReihenfolge, aber NIE invalid. Bewahrt die gegebene
// Reihenfolge und rechnet alle Folge-Termine nach dem Einschieben hinten raus
// (Trickle-Down). Überschreitet der letzte Terminstart das Tagesskelett, wird
// das nur als Flag gemeldet — nicht als Ablehnung.
export function zeitreihe(liste, start, routing, skelett = SKELETT) {
  if (liste.length === 0) return { ok: true, termine: [], fahrzeiten: [] };
  const locker = { ...skelett, letzterStartMin: 24 * 60 };
  const res = berechne(liste, start, routing, locker);
  if (!res.ok) {
    // Nicht mal die Skelettvorgaben (Startfahrt) passen — Termine unverändert
    // durchreichen, damit UI/Planer nie einen leeren Ring bekommt.
    return { ok: true, termine: liste.map(h => ({ haendlerId: h.id, startMin: 0, endeMin: h.dauer, start: minZuUhr(0), ende: minZuUhr(h.dauer) })), fahrzeiten: [], unverändert: false };
  }
  const letzteStartMin = res.termine[res.termine.length - 1].startMin;
  return { ...res, ueberlaeuft: letzteStartMin > (skelett.letzterStartMin ?? SKELETT.letzterStartMin) };
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

// besteEinsattposition: Wo gehört ein neu eingeschobener Händler in einen
// bestehenden Tag? Für jede mögliche Einsatzposition wird die Gesamt-Fahrzeit
// der Kandidaten-Tagesreihung bewertet; kürzeste Fahrsumme gewinnt. Tie-Break:
// weniger Überlauf (kein Überlauf schlägt Überlauf), dann die spätere Position
// (Anhängen), damit bestehende Termine möglichst wenig verrücken.
export function besteEinsattposition(liste, h, start, routing, skelett = SKELETT) {
  const ohneH = liste.filter(x => x.id !== h.id);
  let bestIdx = ohneH.length;
  let bestFahr = Infinity;
  let bestUeberlauf = Infinity;
  for (let i = 0; i <= ohneH.length; i++) {
    const kandidat = [...ohneH.slice(0, i), h, ...ohneH.slice(i)];
    const r = zeitreihe(kandidat, start, routing, skelett);
    const fahrSumme = r.fahrzeiten.reduce((s, f) => s + f.min, 0);
    const ueberlauf = r.ueberlaeuft ? r.termine[r.termine.length - 1].startMin - (skelett.letzterStartMin ?? SKELETT.letzterStartMin) : 0;
    if (fahrSumme < bestFahr
      || (fahrSumme === bestFahr && (ueberlauf < bestUeberlauf
        || (ueberlauf === bestUeberlauf && i > bestIdx)))) {
      bestIdx = i; bestFahr = fahrSumme; bestUeberlauf = ueberlauf;
    }
  }
  return bestIdx;
}
