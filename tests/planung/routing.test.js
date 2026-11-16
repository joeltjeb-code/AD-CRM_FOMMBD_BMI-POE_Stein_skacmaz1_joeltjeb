import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';

test('baueFixtures liefert 90 Händler mit eindeutigen Marktnummern in 5 Clustern', () => {
  const { haendler } = baueFixtures();
  assert.equal(haendler.length, 90);
  assert.equal(new Set(haendler.map((h) => h.id)).size, 90);
  assert.deepEqual([...new Set(haendler.map((h) => h.cluster))].sort(), [0, 1, 2, 3, 4]);
  assert.ok(haendler.every((h) => h.dauer === 90 || h.dauer === 120));
  assert.ok(haendler.every((h) => typeof h.id === 'string' && h.id.startsWith('DEU')));
});

test('Fahrzeit = km/kmh + Staupuffer, km mit Straßenfaktor', () => {
  const r = erstelleDemoRouting();
  // hypot(3,4) = 5 km Luftlinie, * 1.15 = 5.75 km, bei 60 kmh 5.75 min -> aufrunden 6, + Staupuffer 6
  assert.equal(r.fahrtKm({ x: 0, y: 0 }, { x: 3, y: 4 }), 5.8);
  assert.equal(r.fahrzeitMin({ x: 0, y: 0 }, { x: 3, y: 4 }), 12);
});

test('BEV-Aufschlag wird pro Leg addiert', () => {
  const r = erstelleDemoRouting({ bevAufschlagMin: 10 });
  assert.equal(r.fahrzeitMin({ x: 0, y: 0 }, { x: 0, y: 0 }), 6 + 10);
});
