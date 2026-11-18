import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istPlanGueltig } from '../../app/planung/validierung.js';

const dealer = { DEU1M151: { id: 'DEU1M151' }, DEU1M163: { id: 'DEU1M163' } };

const gueltigerPlan = {
  wochen: [
    { tage: [
      { tag: 'Dienstag', datum: '2026-11-24', ok: true,
        termine: [{ haendlerId: 'DEU1M151', start: '08:30', ende: '10:00' }],
        uebernachtung: { art: 'heim' }, startortName: 'Heimatbüro', startortPos: { x: 0, y: 0 } },
    ] },
  ],
};

test('Plan mit bekannten Händler-IDs ist gültig', () => {
  assert.equal(istPlanGueltig(gueltigerPlan, dealer), true);
});

test('Plan mit unbekannter Händler-ID ist ungültig (gealtete Demo-Daten)', () => {
  const alterPlan = {
    wochen: [{ tage: [
      { tag: 'Dienstag', datum: '2026-11-24', ok: true, termine: [{ haendlerId: 'DEU9X999' }] },
    ] }],
  };
  assert.equal(istPlanGueltig(alterPlan, dealer), false);
});

test('null/leerer Plan ist ungültig', () => {
  assert.equal(istPlanGueltig(null, dealer), false);
  assert.equal(istPlanGueltig({ wochen: [] }, dealer), false);
  assert.equal(istPlanGueltig({ wochen: [{ tage: [] }] }, dealer), false);
});

test('Plan ohne Wochen-Struktur ist ungültig', () => {
  assert.equal(istPlanGueltig({ foo: 1 }, dealer), false);
});
