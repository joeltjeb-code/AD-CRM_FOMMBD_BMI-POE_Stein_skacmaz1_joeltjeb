import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen, aktiveTageJeWoche } from '../../app/planung/planer.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].map((c) =>
  ({ id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, preisNacht: 90 }));
const SETTINGS = { ...settings, bev: false, praferenzen: { lieblingshabs: undefined, lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 } };
const PARAMS = (abw) => ({ haendler, hotels: HOTELS, settings: { ...SETTINGS, abwesenheiten: abw }, routing: r, startMontag: '2026-11-23' });

test('aktiveTageJeWoche: 4 Tage ohne Abwesenheit, 0 bei Wochen-Absage', () => {
  const abw = { wochen: { w1: true }, tage: { 'w0-d0': true } };
  assert.deepEqual(aktiveTageJeWoche(abw, 3), [3, 0, 4]);
});

test('Ganze abgewählte Woche: leer, keine Termine, nachfolgende Woche übernimmt', () => {
  const plan = planeWochen(PARAMS({ wochen: { w1: true }, tage: {} }));
  assert.equal(plan.wochen[1].abgewaehlt, true);
  assert.equal(plan.wochen[1].tage.length, 0);
  // Kapazität pro Woche: w2/w3 füllen sich weiterhin, w0 bleibt voll
  assert.equal(plan.wochen[0].tage.reduce((s, t) => s + (t.termine?.length ?? 0), 0), 12);
  assert.ok(plan.wochen[2].tage.reduce((s, t) => s + (t.termine?.length ?? 0), 0) >= 12);
});

test('Abgewählter Tag bleibt leer, Termine wandern in aktive Tage der Folge', () => {
  const plan = planeWochen(PARAMS({ wochen: {}, tage: { 'w0-d0': true } }));
  const w0 = plan.wochen[0];
  assert.equal(w0.tage[0].abgewaehlt, true);
  assert.equal(w0.tage[0].termine.length, 0);
  const rest = w0.tage.slice(1).reduce((s, t) => s + (t.termine?.length ?? 0), 0);
  assert.ok(rest >= 9, `Die 12 Wochen-Termine müssen auf 3 aktive Tage passen oder in die Folge-Woche wandern (getroffen: ${rest})`);
  // Kein Termin geht verloren: Gesamtsumme = Kapazität der aktiven Tage
  const gesamt = plan.wochen.slice(0, 2)
    .reduce((s, w) => s + w.tage.reduce((x, t) => x + (t.termine?.length ?? 0), 0), 0);
  const kap = 3 * 3 + 12; // w0: 3 aktive Tage, w1: 4 aktive Tage
  assert.equal(gesamt, Math.min(kap, 24));
});

test('Ohne Abwesenheiten ändert sich nichts (Rückwärtskompatibilität)', () => {
  const plan = planeWochen(PARAMS({ wochen: {}, tage: {} }));
  for (const w of plan.wochen) {
    assert.equal(w.abgewaehlt, undefined);
    assert.equal(w.tage.reduce((s, t) => s + (t.termine?.length ?? 0), 0), 12);
  }
});
