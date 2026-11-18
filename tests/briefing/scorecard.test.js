import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ladeKpiWerte } from '../../app/adapter/scorecard-adapter.js';

const DEMO = { haendler: [{ id: 'DEU90ARN',
  wkr: { tier: 1, quoteProzent: 42 },
  wischerdisplay: { bestellt: true, datum: '2026-10-20' },
  afsb: { status: 'Silber', punkteBisGold: 35 },
  parkplatz: { stp: { punkte: 120, praemie: 'Ford-Rucksack' },
    tva: { letzterStand: '2026-09-30' }, zaBefreiung: { befreit: false } } }] };

test('ladeKpiWerte liefert KPI je Marktnummer', () => {
  const kpi = ladeKpiWerte(DEMO, 'DEU90ARN');
  assert.equal(kpi.wkr.quoteProzent, 42);
  assert.equal(kpi.parkplatz.tva.letzterStand, '2026-09-30');
});

test('ladeKpiWerte: null für unbekannten Händler', () => {
  assert.equal(ladeKpiWerte(DEMO, 'XXX'), null);
});
