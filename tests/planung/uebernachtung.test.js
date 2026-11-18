import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { entscheideUbernachtung } from '../../app/planung/uebernachtung.js';

const r = erstelleDemoRouting();
const HOTELS = [
  { id: 'H1', name: 'Hotel Klause', ort: 'Musterdorf', pos: { x: 1, y: 1 }, region: 0, preisNacht: 90 },
  { id: 'H2', name: 'Hotel Fern', ort: 'Anderswo', pos: { x: 30, y: 30 }, region: 0, preisNacht: 80 },
];
const SETTINGS = {
  heimat: { name: 'Heimat', pos: { x: -8, y: 10 } },
  praferenzen: { lieblingshotelIds: ['H1'], maxFahrtErsterTerminMin: 60 },
};
const LETZTER = { pos: { x: 0, y: 0 }, cluster: 0 };
const ERSTER_MORGEN = { pos: { x: 2, y: 2 } };

test('Werktag: nahes Lieblingshotel schlägt Heimfahrt', () => {
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: HOTELS, settings: SETTINGS, routing: r });
  assert.equal(res.art, 'hotel');
  assert.equal(res.hotelId, 'H1');
});

test('Freitag: ohne morgigen Termin gewinnt die Heimfahrt bei kurzer Strecke', () => {
  const s = { ...SETTINGS, praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 } };
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: null, hotels: HOTELS, settings: s, routing: r });
  assert.equal(res.art, 'heim');
  assert.ok(res.fahrzeitHeim > 0);
});

test('Hotel außerhalb der Präferenz-Entfernung wird nicht gewählt', () => {
  const s = { ...SETTINGS, praferenzen: { ...SETTINGS.praferenzen, maxFahrtErsterTerminMin: 1 } };
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: HOTELS, settings: s, routing: r });
  assert.equal(res.art, 'heim');
});

test('Kurze Heimfahrt schlägt teures weit-liegendes Hotel (Kosten zählen real)', () => {
  const s = { ...SETTINGS, praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 } };
  const sNah = { ...s, heimat: { name: 'Nah', pos: { x: 5, y: 5 } } }; // Heimfahrt von (0,0) kurz
  const teuerWeit = [{ id: 'T1', name: 'Grand Fern', ort: 'Weit', pos: { x: 40, y: 40 }, region: 0, preisNacht: 300 }];
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: teuerWeit, settings: sNah, routing: r });
  assert.equal(res.art, 'heim');
});

test('Weite Heimfahrt schlägt nach: nahes, günstiges Hotel gewinnt', () => {
  const s = { ...SETTINGS, praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 } };
  const sFern = { ...s, heimat: { name: 'Fern', pos: { x: 80, y: 80 } } }; // Heimfahrt sehr weit
  const nah = [{ id: 'N1', name: 'Gasthof Nahe', ort: 'Dahinter', pos: { x: 1, y: 0 }, region: 0, preisNacht: 40 }];
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: nah, settings: sFern, routing: r });
  assert.equal(res.art, 'hotel');
  assert.equal(res.hotelId, 'N1');
});
