import { bildeCluster } from './cluster.js';
import { faelligeKandidaten, verteileAufWochen, verteileMitKapazitaeten, PRO_WOCHE } from './auswahl.js';
import { SKELETT, planeTag, validiereReihenfolge } from './reihenfolge.js';
import { entscheideUbernachtung } from './uebernachtung.js';

export { SKELETT };

export const TAGE_NAMEN = ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

// Abwesenheits-Schlüssel: Wochen 'w0'..'w3', Tage 'w<wi>-d<ti>' (ti = Di..Fr).
// true = abwesend. Aktiv je Woche: 0 (Wochen-Absage) bis 4 abzüglich Tage.
export function aktiveTageJeWoche(abwesenheiten = {}, anzahlWochen = 4) {
  const abw = { wochen: {}, tage: {}, ...abwesenheiten };
  return Array.from({ length: anzahlWochen }, (_, wi) => {
    if (abw.wochen[`w${wi}`]) return 0;
    return 4 - [0, 1, 2, 3].filter((ti) => abw.tage[`w${wi}-d${ti}`]).length;
  });
}

export function parseDatum(iso) { return new Date(iso + 'T00:00:00Z'); }
export function datumZuString(d) { return d.toISOString().slice(0, 10); }
export function addTage(d, n) { return new Date(d.getTime() + n * 24 * 60 * 60 * 1000); }

function planeWocheEnsemble(liste, wocheStart, settings, routing, dealersById, hotels, aktiveTage = [0, 1, 2, 3]) {
  const tage = [];
  // Startort des Tages: Tag 1 im Heimatbüro; nach Hotelnacht am Hotel.
  let startOrt = { name: settings.heimat.name, pos: settings.heimat.pos };
  let zeiger = 0; // Positionen in der Wochenzuweisung (nur aktive Tage füllen sich)
  for (let ti = 0; ti < 4; ti++) {
    const basis = {
      tag: TAGE_NAMEN[ti],
      datum: datumZuString(addTage(wocheStart, ti + 1)),
      startortName: startOrt.name,
      startortPos: startOrt.pos,
      letzterStartMin: undefined,
    };
    if (!aktiveTage.includes(ti)) {
      // Abgewählter Tag (Urlaub/Lehrgang/Event): bleibt leer, keine Termine
      tage.push({ ...basis, ok: true, termine: [], fahrzeiten: [], leer: true, abgewaehlt: true, uebernachtung: { art: 'heim' } });
      continue;
    }
    const drei = liste.slice(zeiger, zeiger + 3).map((h) => dealersById[h.id]);
    zeiger += 3;
    if (drei.length < 3) {
      tage.push({ ...basis, ok: true, termine: [], fahrzeiten: [], leer: true, uebernachtung: { art: 'heim' } });
      startOrt = { name: settings.heimat.name, pos: settings.heimat.pos };
      continue;
    }
    const res = planeTag(drei, startOrt, routing);
    const tag = { ...basis, ...res, termine: res.termine ?? [], fahrzeiten: res.fahrzeiten ?? [], uebernachtung: { art: 'heim' } };
    if (res.ok) {
      // ÜN-Entscheidung direkt am Tagesende: sie bestimmt den Folgetags-Start
      const ersterMorgen = zeiger < liste.length ? dealersById[liste[zeiger].id] : null;
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
  const aktiv = aktiveTageJeWoche(settings.abwesenheiten, anzahlWochen);
  const wochen = verteileMitKapazitaeten(kandidaten, aktiv.map((a) => a * 3));
  const plan = {
    erstelltAm: new Date().toISOString(),
    wochen: wochen.map((liste, wi) => {
      if (aktiv[wi] === 0) {
        return { montag: datumZuString(addTage(parseDatum(startMontag), wi * 7)), abgewaehlt: true, tage: [] };
      }
      return {
        montag: datumZuString(addTage(parseDatum(startMontag), wi * 7)),
        tage: planeWocheEnsemble(liste, addTage(parseDatum(startMontag), wi * 7), settings, routing, dealersById, hotels, aktiv[wi] === 4 ? [0, 1, 2, 3] : [0, 1, 2, 3].filter((ti) => !settings.abwesenheiten?.tage?.[`w${wi}-d${ti}`])),
      };
    }),
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
