import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { kachelLabel } from '../../app/ui/kachel-label.js';

test('Kachel zeigt Name und Identifier in Klammern', () => {
  assert.equal(kachelLabel('Autohaus Sperl 1', 'DEU1M151'), 'Autohaus Sperl 1 (DEU1M151)');
});

test('Fehlt der Name, steht der Identifier allein (kein leeres Label)', () => {
  assert.equal(kachelLabel(undefined, 'DEU1M151'), 'DEU1M151');
});

test('Fehlt der Identifier, steht der Name allein', () => {
  assert.equal(kachelLabel('Autohaus Kraus', null), 'Autohaus Kraus');
});
