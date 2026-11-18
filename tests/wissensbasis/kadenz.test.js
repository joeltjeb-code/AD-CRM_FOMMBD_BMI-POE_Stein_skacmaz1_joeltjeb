import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { KADENZ_STANDARD_WOCHEN, folgeterminNachBesuch, kadenzVonAkte } from '../../app/wissensbasis/kadenz.js';

test('Standard-Kadenz ist 6 Wochen', () => {
  assert.equal(KADENZ_STANDARD_WOCHEN, 6);
});

test('folgeterminNachBesuch: 6 Wochen nach Besuchsdatum (ohne Angaben)', () => {
  assert.equal(folgeterminNachBesuch('2026-10-05'), '2026-11-16');
});

test('folgeterminNachBesuch mit individueller Kadenz', () => {
  assert.equal(folgeterminNachBesuch('2026-10-05', 4), '2026-11-02');
});

test('kadenzVonAkte: Standard bei leerer Akte', () => {
  assert.equal(kadenzVonAkte({}), 6);
  assert.equal(kadenzVonAkte({ folgeterminKadenzWochen: 8 }), 8);
});
