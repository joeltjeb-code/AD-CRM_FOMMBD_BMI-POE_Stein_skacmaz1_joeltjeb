import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

// Reale Accor-Basis (tools/import_hotels_accor.py): nur DE + Status Open.
const hotels = JSON.parse(readFileSync(new URL('../../daten/hotels.json', import.meta.url), 'utf8'));

test('Accor-Basis: 342 offene deutsche Häuser', () => {
  assert.equal(hotels.length, 342);
});

test('Accor-Basis: eindeutige AC-Ids', () => {
  const ids = new Set(hotels.map((h) => h.id));
  assert.equal(ids.size, hotels.length);
  assert.ok(hotels.every((h) => /^AC-/.test(h.id)));
});

test('Accor-Basis: OBG-Zuweisung ausgeglichen über D01–D12', () => {
  const z = {};
  hotels.forEach((h) => { z[h.obg] = (z[h.obg] || 0) + 1; });
  assert.deepEqual(Object.keys(z).sort(), ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12']);
  Object.values(z).forEach((n) => assert.ok(n >= 20, `OBG nur ${n} Hotels`));
});

test('Accor-Basis: korrekt geschriebene Namen statt GROSSBUCHSTABEN', () => {
  hotels.forEach((h) => {
    assert.ok(h.name && h.name !== h.name.toUpperCase(), `Name ungeschönt: ${h.name}`);
  });
  assert.ok(hotels.some((h) => h.name.startsWith('ibis ')), 'ibis sollte kleingeschrieben sein');
  assert.ok(hotels.some((h) => h.name.includes('Nürnberg')), 'Umlaute sollten zurückgeschrieben sein');
});

test('Accor-Basis: Positionen innerhalb des OBG-Blocks', () => {
  hotels.forEach((h) => {
    const nr = Number(h.obg.slice(1)) - 1;
    const ox = (nr % 4) * 180;
    const oy = Math.floor(nr / 4) * 150;
    assert.ok(h.pos.x >= ox + 18 && h.pos.x <= ox + 160, `x außerhalb bei ${h.id}`);
    assert.ok(h.pos.y >= oy + 18 && h.pos.y <= oy + 130, `y außerhalb bei ${h.id}`);
    assert.ok(h.region >= 0 && h.region <= 4);
  });
});

test('Accor-Basis: Preise im Markenband (65–165 €)', () => {
  hotels.forEach((h) => {
    assert.ok(h.preisNacht >= 65 && h.preisNacht <= 165, `Preis außerhalb bei ${h.id}`);
  });
});
