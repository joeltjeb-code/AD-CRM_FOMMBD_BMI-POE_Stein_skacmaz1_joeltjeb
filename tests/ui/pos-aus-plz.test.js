import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { posAusPlz } from '../../app/ui/einstellungen.js';

test('posAusPlz: PLZ mappt in den OBG-Block, deterministisch, je Gebiet getrennt', () => {
  const a = posAusPlz('93047', 'D01');
  const b = posAusPlz('93047', 'D01');
  assert.deepEqual(a, b);
  const c = posAusPlz('93047', 'D05'); // anderes Gebiet → anderer Block
  assert.notDeepEqual(a, c);
  // Position muss im Bereich der Demo-Welt liegen (0 … 600 Einheiten)
  for (const p of [a, c]) {
    assert.ok(p.x > 0 && p.x < 600 && p.y > 0 && p.y < 600, `pos unerwartet: ${JSON.stringify(p)}`);
  }
});
