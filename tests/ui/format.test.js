import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { kalenderwoche, hndNummer } from '../../app/ui/format.js';

test('kalenderwoche: ISO-8601 Wochennummern inkl. Jahreswechsel', () => {
  assert.equal(kalenderwoche('2026-11-23'), 48); // Montag
  assert.equal(kalenderwoche('2026-11-27'), 48); // Freitag derselben Woche
  assert.equal(kalenderwoche('2026-12-28'), 53); // Übergang 2026 → 2027
  assert.equal(kalenderwoche('2027-01-04'), 1);  // KW1-Regel: 4. Januar
});

test('hndNummer: ISO3-Präfix DEU weg, z. B. 1M203', () => {
  assert.equal(hndNummer('DEU1M151'), '1M151');
  assert.equal(hndNummer('DEU12M4899'), '12M4899');
  assert.equal(hndNummer('1M151'), '1M151'); // schon gekürzt
  assert.equal(hndNummer(''), '');
  assert.equal(hndNummer(undefined), '');
});
