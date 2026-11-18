import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { filtereNachObg } from '../../app/planung/auswahl.js';

const HAENDLER = [
  { id: 'DEU1M151', name: 'A', obg: 'D01' },
  { id: 'DEU1M152', name: 'B', obg: 'D01' },
  { id: 'DEU1M153', name: 'C', obg: 'D05' },
  { id: 'DEU1M154', name: 'D' }, // ohne obg-Feld (alter Stand)
];

test('filtereNachObg liefert nur Händler des gewählten OBG', () => {
  const res = filtereNachObg(HAENDLER, 'D01');
  assert.deepEqual(res.map((h) => h.id), ['DEU1M151', 'DEU1M152']);
});

test('Ohne OBG-Auswahl bleiben alle Händler im Plan', () => {
  assert.equal(filtereNachObg(HAENDLER, '').length, 4);
  assert.equal(filtereNachObg(HAENDLER, null).length, 4);
});
