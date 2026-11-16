import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueHaendlerDemo, baueHotelsDemo } from '../../tools/datengenerator.js';

test('Demo: 90 Händler, eindeutige IDs, Cluster 0-4', () => {
  const h = baueHaendlerDemo();
  assert.equal(h.length, 90);
  assert.equal(new Set(h.map((x) => x.id)).size, 90);
  assert.ok(h.every((x) => [0, 1, 2, 3, 4].includes(x.cluster)));
});

test('Demo: 10 Hotels, je 2 pro Region', () => {
  const ho = baueHotelsDemo();
  assert.equal(ho.length, 10);
  for (let c = 0; c < 5; c++) assert.equal(ho.filter((x) => x.region === c).length, 2);
});
