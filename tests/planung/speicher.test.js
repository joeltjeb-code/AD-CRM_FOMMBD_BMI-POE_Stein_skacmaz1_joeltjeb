import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleSpeicher } from '../../app/adapter/speicher-adapter.js';

const map = new Map();
const stub = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, v),
};

test('lade/speichere runden über den Storage', () => {
  const s = erstelleSpeicher(stub);
  s.speichere('plan', { a: [1, 2] });
  assert.deepEqual(s.lade('plan'), { a: [1, 2] });
  assert.equal(s.lade('nix', 'fallback'), 'fallback');
});

test('exportJson/importJson runden', () => {
  const s = erstelleSpeicher(stub);
  const text = s.exportJson({ montag: '2026-11-23' });
  assert.deepEqual(s.importJson(text), { montag: '2026-11-23' });
});
