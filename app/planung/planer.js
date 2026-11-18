import { bildeCluster } from './cluster.js';
import { faelligeKandidaten, verteileAufWochen, PRO_WOCHE } from './auswahl.js';
import { SKELETT, planeTag, validiereReihenfolge } from './reihenfolge.js';
import { entscheideUbernachtung } from './uebernachtung.js';

export { SKELETT };

export const TAGE_NAMEN = ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export function parseDatum(iso) { return new Date(iso + 'T00:00:00Z'); }
export function datumZuString(d) { return d.toISOString().slice(0, 10); }
export function addTage(d, n) { return new Date(d.getTime() + n * 24 * 60 * 60 * 1000); }

function planeWocheEnsemble(liste, wocheStart, settings, routing, dealersById, hotels) {
  const tage = [];
  // Startort des Tages: Tag 1 im Heimatbüro; nach Hotelnacht am Hotel.
  let startOrt = { name: settings.heimat.name, pos: settings.heimat.pos };
  for (let ti = 0; ti < 4; ti++) {
    const drei = liste.slice(ti * 3, ti * 3 + 3).map((h) => dealersById[h.id]);
    const basis = {
      tag: TAGE_NAMEN[ti],
      datum: datumZuString(addTage(wocheStart, ti + 1)),
      startortName: startOrt.name,
      startortPos: startOrt.pos,
      letzterStartMin: undefined,
    };
    if (drei.length < 3) {
      tage.push({ ...basis, ok: true, termine: [], fahrzeiten: [], leer: true, uebernachtung: { art: 'heim' } });
      startOrt = { name: settings.heimat.name, pos: settings.heimat.pos };
      continue;
    }
    const res = planeTag(drei, startOrt, routing);
    const tag = { ...basis, ...res, termine: res.termine ?? [], fahrzeiten: res.fahrzeiten ?? [], uebernachtung: { art: 'heim' } };
    if (res.ok) {
      // ÜN-Entscheidung direkt am Tagesende: sie bestimmt den Folgetags-Start
      const folgeDrei = liste.slice((ti + 1) * 3, (ti + 1) * 3 + 3);
      const ersterMorgen = folgeDrei.length > 0 ? dealersById[folgeDrei[0].id] : null;
      const letzter = dealersById[tag.termine[tag.termine.length - 1].haendlerId];
      tag.uebernachtung = entscheideUbernachtung({ letzterH: letzter, ersterMorgen, hotels, settings, routing });
      if (!ersterMorgen) {
        // Freitag ohne Folgetag: Wochenend-Heimfahrt bleibt Standard
        tag.uebernachtung = { art: 'heim', fahrzeitHeim: routing.fahrzeitMin(letzter.pos, settings.heimat.pos) };
      }
      startOrt = tag.uebernachtung.art === 'hotel'
        ? { name: tag.uebernachtung.hotelName, pos: tag.uebernachtung.pos ?? settings.heimat.pos }
        : { name: settings.heimat.name, pos: settings.heimat.pos };
    }
    tage.push(tag);
  }
  return tage;
}

export function planeWochen({ haendler, hotels, settings, routing, startMontag, anzahlWochen = 4 }) {
  const labels = bildeCluster(haendler, 5);
  const mitCluster = haendler.map((h, i) => ({ ...h, cluster: h.cluster ?? labels[i] }));
  const dealersById = Object.fromEntries(mitCluster.map((h) => [h.id, h]));
  const kandidaten = faelligeKandidaten(mitCluster, startMontag);
  const wochen = verteileAufWochen(kandidaten, anzahlWochen, PRO_WOCHE);
  const plan = {
    erstelltAm: new Date().toISOString(),
    wochen: wochen.map((liste, wi) => ({
      montag: datumZuString(addTage(parseDatum(startMontag), wi * 7)),
      tage: planeWocheEnsemble(liste, addTage(parseDatum(startMontag), wi * 7), settings, routing, dealersById, hotels),
    })),
  };
  return frischauf(plan, { dealersById, settings, routing, hotels });
}

// Revalidiert Reihenfolge und Übernachtungen eines bestehenden Plans.
// Kontext: { dealersById, settings, routing, hotels }. Reihenfolgen bleiben
// erhalten; manuelle Übernachtungs-Vorgaben (vorgabe: true) werden nicht
// überschrieben.
export function frischauf(plan, kontext) {
  const { dealersById, settings, routing, hotels } = kontext;
  for (const woche of plan.wochen) {
    let startOrt = { name: settings.heimat.name, pos: settings.heimat.pos };
    for (let ti = 0; ti < woche.tage.length; ti++) {
      const t = woche.tage[ti];
      if (t.leer) { startOrt = { name: settings.heimat.name, pos: settings.heimat.pos }; continue; }
      const liste = (t.termine ?? []).map((x) => dealersById[x.haendlerId]);
      if (liste.length === 0) continue;
      const start = { name: t.startortName ?? startOrt.name, pos: t.startortPos ?? startOrt.pos };
      const skelett = { ...SKELETT, letzterStartMin: t.letzterStartMin ?? SKELETT.letzterStartMin };
      const res = validiereReihenfolge(liste, start, routing, skelett);
      Object.assign(t, res, { leer: undefined });
      const folge = woche.tage[ti + 1];
      const ersterMorgen = folge && !folge.leer && folge.ok && (folge.termine?.length ?? 0) > 0
        ? dealersById[folge.termine[0].haendlerId]
        : null;
      const letzter = liste[liste.length - 1];
      if (t.uebernachtung?.vorgabe) {
        if (t.uebernachtung.art === 'heim' && t.uebernachtung.fahrzeitHeim === undefined) {
          t.uebernachtung.fahrzeitHeim = routing.fahrzeitMin(letzter.pos, settings.heimat.pos);
        }
        continue; // manuelle Vorgabe bleibt stehen
      }
      t.uebernachtung = entscheideUbernachtung({ letzterH: letzter, ersterMorgen, hotels, settings, routing });
      if (!ersterMorgen) {
        // Letzter Tag der Woche: Wochenend-Heimfahrt bleibt Standard
        t.uebernachtung = { art: 'heim', fahrzeitHeim: routing.fahrzeitMin(letzter.pos, settings.heimat.pos) };
      }
      startOrt = t.uebernachtung.art === 'hotel'
        ? { name: t.uebernachtung.hotelName, pos: t.uebernachtung.pos ?? settings.heimat.pos }
        : { name: settings.heimat.name, pos: settings.heimat.pos };
    }
  }
  return plan;
}
