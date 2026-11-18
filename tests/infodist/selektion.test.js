import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { vorschlaege, registriereVersand } from '../../app/infodist/selektion.js';
import { ladeMails, ladeMailbox } from '../../app/adapter/mail-adapter.js';

const MAILS = [
  { id: 'm1', von: 'vertrieb@example.com', datum: '2026-11-10', betreff: 'SitNow-Absage',
    text: 'Hinweis zur Absage von SitNow.', themen: ['sitnow'] },
  { id: 'm2', von: 'marketing@example.com', datum: '2026-11-11', betreff: 'WKR-Kampagne',
    text: 'Neue WKR-Broschüre.', themen: ['wkr'] },
  { id: 'm3', von: 'x@example.com', datum: '2026-11-12', betreff: 'Egal', text: 'x', themen: ['sonstiges'] },
];
const AKTE = { haendlerId: 'DEU90ARN', prioThemen: ['wkr'],
  besuchHistorie: [{ datum: '2026-10-05', themen: ['sitnow'] }] };

test('ladeMails/ladeMailbox: gleiche Feldform wie Postfach-Datei', () => {
  assert.deepEqual(ladeMails({ mails: MAILS }), MAILS);
  assert.deepEqual(ladeMailbox({ mails: MAILS }), MAILS);
});

test('vorschlaege: nur themenpassende, keine Duplikate', () => {
  const wb = { akten: [AKTE], gesendetInfos: [{ haendlerId: 'DEU90ARN', artikelId: 'm2', datum: '2026-11-13' }] };
  const v = vorschlaege({ mails: MAILS, akte: AKTE, gesendetInfos: wb.gesendetInfos });
  assert.deepEqual(v.map((x) => x.mailId), ['m1']);
  assert.ok(v[0].begruendung.length > 0);
});

test('registriereVersand hängt Eintrag an gesendetInfos', () => {
  const wb = { akten: [], gesendetInfos: [] };
  const wb2 = registriereVersand(wb, 'DEU90ARN', 'm1', '2026-11-18');
  assert.deepEqual(wb2.gesendetInfos[0], { haendlerId: 'DEU90ARN', artikelId: 'm1', datum: '2026-11-18' });
});
