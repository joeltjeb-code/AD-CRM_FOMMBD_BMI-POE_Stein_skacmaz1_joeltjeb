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

test('Reserven füllen Lücken: keine leeren Tage, 4 × 12 Termine', () => {
  // 5 Cluster × 12 fällige Händler (60 gesamt) über 48 Kapazitätsslots —
  // wie im Demo-Datensatz: Reserve deckt höchstens eine fehlgeschlagene Gruppe.
  const demo = [];
  const zentren = [
    { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 20, y: 20 },
  ];
  let n = 0;
  zentren.forEach((z, ci) => {
    for (let k = 0; k < 12; k++) {
      n++;
      demo.push({
        id: `DX${ci}M${k}`,
        name: `Autohaus Demo ${ci}-${k}`,
        pos: { x: z.x + (k % 4) * 1.1, y: z.y + Math.floor(k / 4) * 1.1 },
        cluster: ci,
        prio: k === 0,
        dauer: 90,
        besuchVerlauf: ['2026-06-01'], // tief zurück → fällig
      });
    }
  });
  const S = {
    ...SETTINGS,
    heimat: { name: 'Heimatbüro', plz: '', pos: { x: -10, y: 0 } },
    praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 999 },
    abwesenheiten: { wochen: {}, tage: {}, gruende: {} },
  };
  const plan = planeWochen({ haendler: demo, hotels: HOTELS, settings: S, routing: r, startMontag: '2026-11-23' });
  let summe = 0;
  for (const w of plan.wochen) {
    for (const t of w.tage) {
      assert.ok(t.ok, `${w.montag} ${t.tag} nicht planbar`);
      assert.equal(t.termine.length, 3, `${w.montag} ${t.tag} hat keine 3 Termine`);
      summe += t.termine.length;
    }
  }
  assert.equal(summe, 48);
});
