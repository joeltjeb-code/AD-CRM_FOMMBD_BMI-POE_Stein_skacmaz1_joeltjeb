import { bildeCluster } from './cluster.js';
import { faelligeKandidaten, verteileAufWochen, PRO_WOCHE } from './auswahl.js';
import { planeTag, validiereReihenfolge } from './reihenfolge.js';
import { entscheideUbernachtung } from './uebernachtung.js';

export const TAGE_NAMEN = ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export function parseDatum(iso) { return new Date(iso + 'T00:00:00Z'); }
export function datumZuString(d) { return d.toISOString().slice(0, 10); }
export function addTage(d, n) { return new Date(d.getTime() + n * 24 * 60 * 60 * 1000); }

function planeWocheEnsemble(liste, wocheStart, settings, routing, dealersById, hotels) {
  const tage = [];
  for (let ti = 0; ti < 4; ti++) {
    const drei = liste.slice(ti * 3, ti * 3 + 3).map((h) => dealersById[h.id]);
    const basis = {
      tag: TAGE_NAMEN[ti],
      datum: datumZuString(addTage(wocheStart, ti + 1)),
      startortName: settings.heimat.name,
      letzterStartMin: undefined,
    };
    if (drei.length < 3) {
      tage.push({ ...basis, ok: true, termine: [], fahrzeiten: [], leer: true, uebernachtung: { art: 'heim' } });
      continue;
    }
    const res = planeTag(drei, settings.heimat, routing);
    const fehlerTag = { ...basis, ...res, termine: res.termine ?? [], fahrzeiten: res.fahrzeiten ?? [], uebernachtung: { art: 'heim' } };
    tage.push(fehlerTag);
  }
  for (let ti = 0; ti < tage.length; ti++) {
    const t = tage[ti];
    if (t.leer || !t.ok) continue;
    const ersterMorgen = tage[ti + 1] && !tage[ti + 1].leer && tage[ti + 1].ok && (tage[ti + 1].termine?.length ?? 0) > 0
      ? dealersById[tage[ti + 1].termine[0].haendlerId]
      : null;
    t.uebernachtung = entscheideUbernachtung({
      letzterH: dealersById[t.termine[t.termine.length - 1].haendlerId],
      ersterMorgen, hotels, settings, routing,
    });
    if (!ersterMorgen) {
      // Freitag ohne Folgetag: Wochenend-Heimfahrt bleibt Standard
      t.uebernachtung = {
        art: 'heim',
        fahrzeitHeim: routing.fahrzeitMin(dealersById[t.termine[2].haendlerId].pos, settings.heimat.pos),
      };
    }
  }
  return tage;
}

export function planeWochen({ haendler, hotels, settings, routing, startMontag, anzahlWochen = 4 }) {
  const labels = bildeCluster(haendler, 5);
  const mitCluster = haendler.map((h, i) => ({ ...h, cluster: h.cluster ?? labels[i] }));
  const dealersById = Object.fromEntries(mitCluster.map((h) => [h.id, h]));
  const kandidaten = faelligeKandidaten(mitCluster, startMontag);
  const wochen = verteileAufWochen(kandidaten, anzahlWochen, PRO_WOCHE);
  return {
    erstelltAm: new Date().toISOString(),
    wochen: wochen.map((liste, wi) => ({
      montag: datumZuString(addTage(parseDatum(startMontag), wi * 7)),
      tage: planeWocheEnsemble(liste, addTage(parseDatum(startMontag), wi * 7), settings, routing, dealersById, hotels),
    })),
  };
}

// Task 9 ersetzt diesen Stump durch die vollständige Revalidierung
// (siehe Plan docs/superpowers/plans/2026-11-16-routenplanung.md).
export function frischauf(plan, settings, routing) {
  return plan;
}
