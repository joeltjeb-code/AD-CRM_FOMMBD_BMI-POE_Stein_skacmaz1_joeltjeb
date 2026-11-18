import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleBericht, aufgabenAlsMassnahmen } from '../../app/bericht/vorlage.js';

const VOLL = {
  haendlerId: 'DEU90ARN', datum: '2026-11-18', teilnehmer: ['Frau Musterfrau', 'David'],
  themen: ['WKR-Performance', 'Wischerdisplay'],
  vereinbarungen: ['Demo-Termin im Dezember'],
  aufgaben: [{ titel: 'Broschüre schicken', verantwortlich: 'David', frist: '2026-11-25' }],
  offenePunkte: ['TVA-Rückmeldung offen'],
  stichpunkte: 'gutes Gespräch über WKR',
};

test('erstelleBericht: vollständige Eingabe ok', () => {
  const r = erstelleBericht(VOLL);
  assert.equal(r.ok, true);
  assert.equal(r.fehlend.length, 0);
  assert.deepEqual(r.bericht.teilnehmer, ['Frau Musterfrau', 'David']);
});

test('erstelleBericht: fehlende Pflichtfelder werden gemeldet', () => {
  const r = erstelleBericht({ haendlerId: 'DEU90ARN', stichpunkte: 'x' });
  assert.equal(r.ok, false);
  assert.ok(r.fehlend.includes('datum'));
  assert.ok(r.fehlend.includes('teilnehmer'));
});

test('aufgabenAlsMassnahmen: alle Aufgaben offen übernommen', () => {
  const { bericht } = erstelleBericht(VOLL);
  const m = aufgabenAlsMassnahmen(bericht);
  assert.equal(m.length, 1);
  assert.equal(m[0].status, 'offen');
  assert.equal(m[0].verantwortlich, 'David');
});

test('folgetermin: optional übernommen, ohne Angabe null', () => {
  const mit = erstelleBericht({ ...VOLL, folgetermin: '23.04.2026, 13:00-14:00' });
  assert.equal(mit.bericht.folgetermin, '23.04.2026, 13:00-14:00');
  const ohne = erstelleBericht(VOLL);
  assert.equal(ohne.bericht.folgetermin, null);
});
