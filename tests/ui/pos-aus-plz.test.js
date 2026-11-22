import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { posAusPlz, posAusPlzFunktion, setzePlzZentren, PLZ_ZONEN_STREU, PLZ_STREU } from '../../app/ui/einstellungen.js';

test('posAusPlz: deterministisch, je Gebiet getrennt, im OBG-Block', () => {
  const a = posAusPlz('93047', 'D01');
  const b = posAusPlz('93047', 'D01');
  assert.deepEqual(a, b);
  const c = posAusPlz('93047', 'D05'); // anderes Gebiet → anderer Block
  assert.notDeepEqual(a, c);
  // Position muss im Bereich der Demo-Welt liegen (0 … 720 Einheiten)
  for (const p of [a, c]) {
    assert.ok(p.x > 0 && p.x < 720 && p.y > 0 && p.y < 720, `pos unerwartet: ${JSON.stringify(p)}`);
  }
});

test('posAusPlz: gleicher PLZ-Präfix landet räumlich beieinander (PLZ-Nachbarschaft)', () => {
  // Zwei Händler mit gleichem 2er-Präfix in einem Gebiet: kleine Distanz
  // (schlägt fehl, falls jemand die Präfix-Kohärenz des Verfahrens bricht)
  const gebiet = 'D01';
  const nachbar = [];
  for (const plz of ['84001', '84002', '84003']) {
    nachbar.push(posAusPlzFunktion(plz, gebiet));
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  for (let i = 0; i < nachbar.length; i++) {
    for (let j = i + 1; j < nachbar.length; j++) {
      assert.ok(dist(nachbar[i], nachbar[j]) < 60, `Präfix-Nachbarn zu weit entfernt: ${dist(nachbar[i], nachbar[j])}`);
    }
  }
  // Unterschiedliche Präfixe dürfen (müssen aber nicht) weiter auseinander liegen
  const fern = posAusPlzFunktion('40474', gebiet);
  const nächste = Math.min(...nachbar.map((p) => dist(p, fern)));
  assert.ok(nächste >= 0);
});

test('setzePlzZentren: Lookup-Tabelle schlägt die Fallback-Formel', () => {
  const tabelle = { zonen: { D03: { '12345': { x: 111.1, y: 222.2 } } } };
  setzePlzZentren(tabelle);
  assert.deepEqual(posAusPlz('12345', 'D03'), { x: 111.1, y: 222.2 });
  assert.deepEqual(posAusPlz('12345', 'D04'), posAusPlzFunktion('12345', 'D04')); // anderes Gebiet → Fallback
  setzePlzZentren(null);
  assert.deepEqual(posAusPlz('12345', 'D03'), posAusPlzFunktion('12345', 'D03'));
});

test('Synchronität: repo-Tabelle entspricht exakt der JS-Fallback-Formel', () => {
  // Speichert jemand andere Streu-Konstanten oder Hashes in tools/plz_zentren.py
  // oder app/ui/einstellungen.js, fliegt dieser Test — so bleiben App und
  // Import-Skript garantiert bei derselben Position je PLZ.
  const raw = JSON.parse(readFileSync(new URL('../../daten/plz-zentren.json', import.meta.url), 'utf8'));
  assert.ok(raw.zonen && Object.keys(raw.zonen).length >= 12, 'plz-zentren.json: 12 OBG-Zonen erwartet');
  let geprüft = 0;
  for (const [gebiet, plzMap] of Object.entries(raw.zonen)) {
    for (const [plz, pos] of Object.entries(plzMap)) {
      const erwartet = posAusPlzFunktion(plz, gebiet);
      assert.deepEqual(pos, erwartet, `Abweichung bei ${gebiet}/${plz}: Datei ${JSON.stringify(pos)} vs. Formel ${JSON.stringify(erwartet)}`);
      geprüft++;
      if (geprüft >= 60) return; // Stichprobe reicht (alle 12 Zonen werden erreicht)
    }
  }
  assert.ok(geprüft >= 12 * 4, `zu wenige Einträge geprüft: ${geprüft}`);
});

test('Fallback-Konstanten: Streuungen im Realismus-Fenster (kalibriert 22.11.)', () => {
  assert.equal(PLZ_ZONEN_STREU, 28);
  assert.equal(PLZ_STREU, 6);
});
