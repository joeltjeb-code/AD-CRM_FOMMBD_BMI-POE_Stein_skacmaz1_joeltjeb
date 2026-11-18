import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen } from '../../app/planung/planer.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].flatMap((c) => [
  { id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, preisNacht: 60 },
  { id: `H${c}b`, name: `Hotel ${c} B`, ort: 'Y', pos: { x: c * 40 + 3, y: c * 40 - 1 }, region: c, preisNacht: 200 },
]);

const SETTINGS_WEIT_WEG = {
  ...settings,
  bev: false,
  // Heimatbüro weit außerhalb der Gebietskoordinaten → Übernachtung muss
  // wirtschaftlich schlagen sein als tägliche Hin- und Heimfahrt
  heimat: { name: 'Heimatbüro Fern', plz: '', pos: { x: -40, y: -40 } },
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 999 },
};

test('Erster Tag startet im Heimatbüro, Folgetag nach Hotelnacht am Hotel', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS_WEIT_WEG, routing: r, startMontag: '2026-11-23' });
  const tage = plan.wochen[0].tage;
  assert.equal(tage[0].startortName, 'Heimatbüro Fern');
  for (let i = 1; i < tage.length; i++) {
    const un = tage[i - 1].uebernachtung;
    if (un?.art === 'hotel') {
      assert.equal(tage[i].startortName, un.hotelName, `Tag ${i} müsste am ${un.hotelName} starten`);
      assert.deepEqual(tage[i].startortPos, un.pos);
    } else {
      assert.equal(tage[i].startortName, 'Heimatbüro Fern');
    }
  }
});

test('Freitag (kein Folgetag) startet-Logik unberührt: letzte Übernachtung bleibt Heimfahrt', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS_WEIT_WEG, routing: r, startMontag: '2026-11-23' });
  const tage = plan.wochen[0].tage;
  assert.equal(tage[3].uebernachtung.art, 'heim');
  assert.equal(tage[3].startortName === 'Heimatbüro Fern' || tage[3].startortName.startsWith('Hotel'), true);
});
