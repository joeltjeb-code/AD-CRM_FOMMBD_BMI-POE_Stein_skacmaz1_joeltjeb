import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueSchnellblatt } from '../../app/briefing/schnellblatt.js';

test('baueSchnellblatt: STP, TVA, ZA-Befreiung aus KPI', () => {
  const kpi = { id: 'X', parkplatz: {
    stp: { punkte: 120, praemie: 'Ford-Rucksack' },
    tva: { letzterStand: '2026-09-30' },
    zaBefreiung: { befreit: false } } };
  const s = baueSchnellblatt(kpi);
  assert.equal(s.stp.praemie, 'Ford-Rucksack');
  assert.equal(s.tva.letzterStand, '2026-09-30');
  assert.equal(s.zaBefreiung.befreit, false);
});

test('baueSchnellblatt: null ohne KPI-Daten', () => {
  assert.equal(baueSchnellblatt(null), null);
  assert.equal(baueSchnellblatt({ id: 'X' }), null);
});
