import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { allgemeineAnhaengeFuer, erstelleEntwurf } from '../../app/bericht/entwurf.js';

const KATALOG = [
  { id: 'wischer', titel: 'Wischer', schluessel: ['wischer'],
    anhaenge: [{ name: 'Massnahmenplan-Wischer.pdf', typ: 'pdf' },
               { name: 'Best-Practice-Wischer.pdf', typ: 'pdf' }] },
  { id: 'quickcheck', titel: 'Quick-Check', schluessel: ['quick-check', 'quickcheck', 'raederwechsel'],
    anhaenge: [{ name: 'Quick-Check-Liste.pdf', typ: 'pdf' }] },
];
const BAUSTEINE = { kampagnen: [
  { id: 'wkr', titel: 'WKR', betreff: 'B', textbausteine: ['T'],
    anhaenge: [{ name: 'WKR-Broschuere.pdf', typ: 'pdf' }], links: [] },
] };
const R = { haendlerId: 'X', datum: '2026-11-18', teilnehmer: ['A'], themen: ['Wischer', 'AKF+'],
  vereinbarungen: [], aufgaben: [], offenePunkte: [] };

test('allgemeineAnhaengeFuer: Themen-Match per Teilstring', () => {
  const a = allgemeineAnhaengeFuer(R.themen, KATALOG);
  assert.deepEqual(a.map((x) => x.name),
    ['Massnahmenplan-Wischer.pdf', 'Best-Practice-Wischer.pdf']);
});

test('erstelleEntwurf: Kampagnen- + Themen-Anhänge vereint, TVA ergänzt, dedupliziert', () => {
  const r = erstelleEntwurf(R, BAUSTEINE, 'wkr', { themenAnhaengeKatalog: KATALOG });
  const namen = r.entwurf.anhaenge.map((x) => x.name);
  assert.ok(namen.includes('Massnahmenplan-Wischer.pdf'));
  assert.ok(namen.includes('WKR-Broschuere.pdf'));
  assert.ok(namen.includes('TVA.pdf'));
  assert.equal(new Set(namen).size, namen.length);
});

test('erstelleEntwurf ohne Katalog: Verhalten unverändert', () => {
  const r = erstelleEntwurf(R, BAUSTEINE, 'wkr');
  assert.deepEqual(r.entwurf.anhaenge.map((x) => x.name),
    ['WKR-Broschuere.pdf', 'TVA.pdf']);
});
