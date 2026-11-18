import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normaleHndEingabe,
  folgeterminString,
  sammleTeilnehmer,
  teilnehmerVorschlaege,
} from '../../app/bericht/formular-helfer.js';

test('normaleHndEingabe: 5 Zeichen + hartcodierter DEU-Präfix, immer Caps', () => {
  assert.equal(normaleHndEingabe('1m151'), 'DEU1M151');
  assert.equal(normaleHndEingabe(' 12m99 '), 'DEU12M99');
  assert.equal(normaleHndEingabe(''), '');
  assert.equal(normaleHndEingabe(null), '');
});

test('folgeterminString: Datum + Zeiten zur lesbaren Angabe verbinden', () => {
  assert.equal(
    folgeterminString('2026-04-23', '13:00', '14:00'),
    '23.04.2026, 13:00-14:00');
  assert.equal(folgeterminString('2026-04-23', '13:00', ''), '23.04.2026, 13:00');
  assert.equal(folgeterminString('', '13:00', '14:00'), '');
  assert.equal(folgeterminString('2026-04-23', '', ''), '');
});

test('sammleTeilnehmer: einmalige Namen aus den Akten, sortiert', () => {
  const wb = { akten: [
    { besuchHistorie: [{ teilnehmer: ['Herr Mustermann', 'Frau Beispiel'] }] },
    { besuchHistorie: [{ teilnehmer: ['Herr Mustermann', 'Herr Neu'] }] },
    { besuchHistorie: [] },
  ] };
  assert.deepEqual(sammleTeilnehmer(wb), ['Frau Beispiel', 'Herr Mustermann', 'Herr Neu']);
});

test('teilnehmerVorschlaege: filtert groß/klein-unempfindlich, max. 6', () => {
  const quelle = ['Herr Mustermann', 'Frau Beispielford', 'Herr Beispiel', 'Frau Muster',
    'Herr A', 'Herr B', 'Herr C'];
  const v = teilnehmerVorschlaege(quelle, 'muster');
  assert.equal(v.length, 2); // 'Herr Mustermann' und 'Frau Muster'
  assert.deepEqual([...v], ['Herr Mustermann', 'Frau Muster']);
  assert.equal(teilnehmerVorschlaege(quelle, 'b').length, 3); // Beispielford, Beispiel, B
  assert.deepEqual(teilnehmerVorschlaege(quelle, ''), []);
});
