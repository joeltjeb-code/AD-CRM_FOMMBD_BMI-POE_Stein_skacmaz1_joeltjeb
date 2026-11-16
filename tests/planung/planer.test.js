import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen, frischauf } from '../../app/planung/planer.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].flatMap((c) => [
  { id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, programme: [], preisNacht: 90 },
  { id: `H${c}b`, name: `Hotel ${c} B`, ort: 'Y', pos: { x: c * 40 + 3, y: c * 40 - 1 }, region: c, programme: [], preisNacht: 110 },
]);
const SETTINGS = {
  ...settings,
  bev: false,
  altStartorte: [],
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: [] },
};

test('planeWochen: 4 Wochen mit je 4 Tagen Di-Fr und 3 Terminen', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  assert.equal(plan.wochen.length, 4);
  assert.deepEqual(plan.wochen.map((w) => w.montag),
    ['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14']);
  for (const w of plan.wochen) {
    assert.equal(w.tage.length, 4);
    for (const t of w.tage) {
      assert.equal(t.termine.length, 3);
      assert.equal(t.ok, true);
      assert.ok(['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].includes(t.tag));
      assert.ok(t.uebernachtung);
      // Kein Termin überschreitet das Tagesskelett
      assert.ok(t.termine.every((x) => x.startMin <= (t.letzterStartMin ?? 930)));
    }
  }
});

test('frischauf erhält Reihenfolge und ValidationResult', () => {
  const dealersById = Object.fromEntries(haendler.map((h) => [h.id, h]));
  const kontext = { dealersById, settings: SETTINGS, routing: r, hotels: HOTELS };
  let plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const davor = plan.wochen[0].tage[0].termine.map((t) => t.haendlerId);
  plan = frischauf(plan, kontext);
  assert.deepEqual(plan.wochen[0].tage[0].termine.map((t) => t.haendlerId), davor);
  assert.equal(plan.wochen[0].tage[0].ok, true);
});
