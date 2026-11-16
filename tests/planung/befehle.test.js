import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen } from '../../app/planung/planer.js';
import { parseBefehl, wendeAn } from '../../app/planung/befehle.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].flatMap((c) => [
  { id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, programme: [], preisNacht: 90 },
]);
const SETTINGS = { ...settings, bev: false, altStartorte: [{ name: 'Büro Ost', pos: { x: 46, y: 2 } }], praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: [] } };

function baueKontext() {
  const dealersById = Object.fromEntries(haendler.map((h) => [h.id, h]));
  return { dealersById, settings: SETTINGS, routing: r, hotels: HOTELS };
}

test('parseBefehl erkennt Verschieben', () => {
  assert.deepEqual(parseBefehl('verschiebe DEU1M151 auf Mittwoch'),
    { typ: 'verschiebe', haendlerId: 'DEU1M151', zielTag: 'Mittwoch' });
});

test('parseBefehl erkennt Übernachtung und früher', () => {
  assert.deepEqual(parseBefehl('übernachte am Mittwoch im Hotel'), { typ: 'uebernachtung', tag: 'Mittwoch', art: 'hotel' });
  assert.deepEqual(parseBefehl('übernachte am Mittwoch zu Hause'), { typ: 'uebernachtung', tag: 'Mittwoch', art: 'heim' });
  assert.deepEqual(parseBefehl('Freitag früher beenden'), { typ: 'frueher', tag: 'Freitag', letzterStartMin: 810 });
  assert.deepEqual(parseBefehl('starte Mittwoch vom Büro Ost'), { typ: 'startort', tag: 'Mittwoch', name: 'Büro Ost' });
});

test('wendeAn verschiebt einen Termin und validiert neu', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const di = plan.wochen[0].tage.find((t) => t.tag === 'Dienstag');
  const id = di.termine[0].haendlerId;
  const { plan: p2, meldung } = wendeAn(plan, parseBefehl(`verschiebe ${id} auf Donnerstag`), baueKontext());
  assert.match(meldung, /verschoben/);
  const do2 = p2.wochen[0].tage.find((t) => t.tag === 'Donnerstag');
  assert.ok(do2.termine.map((x) => x.haendlerId).includes(id));
  assert.ok(!do2.termine.map((x) => x.haendlerId).includes(undefined));
});

test('wendeAn mit unbekanntem Befehl ändert nichts', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const { plan: p2, meldung } = wendeAn(plan, parseBefehl('.xyz'), baueKontext());
  assert.deepEqual(p2, plan);
  assert.match(meldung, /nicht verstanden/);
});
