import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { bildeCluster } from '../../app/planung/cluster.js';

test('Fixture-Cluster bleiben zusammen und ergeben 5 Cluster', () => {
  const { haendler } = baueFixtures();
  const labels = bildeCluster(haendler, 5);
  assert.equal(new Set(labels).size, 5);
  for (let ci = 0; ci < 5; ci++) {
    const bereich = haendler
      .map((h, i) => ({ h, label: labels[i] }))
      .filter((e) => e.h.cluster === ci)
      .map((e) => e.label);
    assert.equal(new Set(bereich).size, 1, `Cluster ${ci} zerfiel`);
  }
});

test('Ergebnis ist deterministisch', () => {
  const { haendler } = baueFixtures();
  assert.deepEqual(bildeCluster(haendler, 5), bildeCluster(haendler, 5));
});
