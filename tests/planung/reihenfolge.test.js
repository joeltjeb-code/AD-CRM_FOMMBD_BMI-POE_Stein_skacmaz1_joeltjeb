import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { SKELETT, minZuUhr, uhrZuMin, validiereReihenfolge, planeTag } from '../../app/planung/reihenfolge.js';

const r = erstelleDemoRouting();

test('Uhrzeit-Helfer', () => {
  assert.equal(minZuUhr(510), '08:30');
  assert.equal(uhrZuMin('08:30'), 510);
});

test('Drei Händler desselben Clusters passen ins Tagesskelett', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3);
  const tag = planeTag(drei, { name: 'Heimat', pos: { x: 2, y: 1 } }, r);
  assert.equal(tag.ok, true);
  assert.equal(tag.termine.length, 3);
  const t1 = uhrZuMin(tag.termine[0].start);
  assert.ok(t1 >= SKELETT.fruehstartMin && t1 <= SKELETT.spaetstartMin);
  const t3 = uhrZuMin(tag.termine[2].start);
  assert.ok(t3 <= SKELETT.letzterStartMin);
});

test('Sehr weit entfernter Start sprengt das Skelett', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3);
  // Start rund 100 km Luftlinie von Cluster 0 entfernt
  const tag = planeTag(drei, { name: 'Fern', pos: { x: 200, y: 200 } }, r);
  assert.equal(tag.ok, false);
  assert.match(tag.grund, /einhaltbar/);
});

test('validiereReihenfolge behält die gegebene Reihenfolge bei', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3).reverse();
  const res = validiereReihenfolge(drei, { name: 'X', pos: drei[0].pos }, r);
  assert.equal(res.ok, true);
  assert.deepEqual(res.termine.map((t) => t.haendlerId), drei.map((d) => d.id));
});
