import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { farbeFuer } from '../../app/wissensbasis/farbcodierung.js';

test('Besuch unter 6 Wochen -> frisch', () => {
  assert.equal(farbeFuer('2026-11-05', '2026-11-18'), 'frisch');
});

test('Besuch 6–12 Wochen -> ok', () => {
  assert.equal(farbeFuer('2026-10-01', '2026-11-18'), 'ok');
});

test('Besuch über 12 Wochen oder nie -> ueberfaellig', () => {
  assert.equal(farbeFuer('2026-08-01', '2026-11-18'), 'ueberfaellig');
  assert.equal(farbeFuer(null, '2026-11-18'), 'ueberfaellig');
});
