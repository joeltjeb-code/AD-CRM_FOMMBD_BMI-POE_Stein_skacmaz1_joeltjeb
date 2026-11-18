import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { obgOptionen, leseEinstellungen, heimatAusEingabe } from '../../app/ui/einstellungen.js';

test('obgOptionen liefert 12 OBG-Regionen im Marktnummern-Schema D01–D12', () => {
  const opt = obgOptionen();
  assert.equal(opt.length, 12);
  assert.deepEqual(opt.map((o) => o.wert), ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12']);
});

test('leseEinstellungen übernimmt OBG und Heimat aus Formularwerten', () => {
  const alt = { obg: 'D01', heimat: { name: 'Alt', plz: '', pos: { x: -8, y: 10 } }, bev: false, praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 } };
  const neu = leseEinstellungen(alt, { obg: 'D07', heimatName: 'Heimatbüro Regensburg', heimatPlz: '93047', bev: true, maxFahrt: '45' });
  assert.equal(neu.obg, 'D07');
  assert.equal(neu.heimat.plz, '93047');
  assert.equal(neu.bev, true);
  assert.equal(neu.praferenzen.maxFahrtErsterTerminMin, 45);
});

test('heimatAusEingabe: ohne PLZ bleibt die bisherige Position erhalten', () => {
  const h = heimatAusEingabe({ name: 'Büro', plz: '' }, { pos: { x: 3, y: 4 } });
  assert.deepEqual(h.pos, { x: 3, y: 4 });
});

test('heimatAusEingabe: aus PLZ entsteht eine deterministische Position', () => {
  const a = heimatAusEingabe({ name: 'Büro', plz: '93047' }, { pos: { x: 0, y: 0 } });
  const b = heimatAusEingabe({ name: 'Büro', plz: '93047' }, { pos: { x: 0, y: 0 } });
  assert.deepEqual(a.pos, b.pos);
  assert.equal(Number.isFinite(a.pos.x) && Number.isFinite(a.pos.y), true);
  const c = heimatAusEingabe({ name: 'Büro', plz: '10115' }, { pos: { x: 0, y: 0 } });
  assert.notDeepEqual(a.pos, c.pos);
});
