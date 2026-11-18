import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleEntwurf } from '../../app/bericht/entwurf.js';

const BAUSTEINE = { kampagnen: [
  { id: 'wkr', titel: 'WKR-Programm', betreff: 'Ihre WKR-Performance',
    textbausteine: ['Vielen Dank für das Gespräch zum WKR-Programm.'],
    anhaenge: [{ name: 'WKR-Broschuere.pdf', typ: 'pdf' }],
    links: ['https://training.example/wkr'] },
  { id: 'schnittschutz', titel: 'Windschutzscheiben', betreff: 'Training Windschutzscheiben',
    textbausteine: ['', '<persönlicher Teil>'],
    anhaenge: [{ name: 'Windschutzscheiben-Flyer.pdf', typ: 'pdf' }], links: [] },
] };
const BERICHT = { haendlerId: 'DEU90ARN', datum: '2026-11-18',
  teilnehmer: ['Frau Musterfrau'], themen: ['WKR'], vereinbarungen: [],
  aufgaben: [], offenePunkte: [] };

test('erstelleEntwurf: Bausteine + TVA-Pflichtanhang ergänzt', () => {
  const r = erstelleEntwurf(BERICHT, BAUSTEINE, 'wkr');
  assert.equal(r.ok, true);
  assert.equal(r.entwurf.betreff, 'Ihre WKR-Performance');
  const typen = r.entwurf.anhaenge.map((a) => a.typ);
  assert.ok(typen.includes('tva'));
  assert.ok(r.entwurf.links.includes('https://training.example/wkr'));
  assert.ok(r.zusammenfassung.includes('persönliche Ergänzung möglich'));
});

test('erstelleEntwurf: TVA-Pflichtanhang genau einmal', () => {
  const mit = { ...BAUSTEINE, kampagnen: [BAUSTEINE.kampagnen[0], { ...BAUSTEINE.kampagnen[0], id: 'x',
    anhaenge: [{ name: 'TVA.pdf', typ: 'tva' }] }] };
  const r = erstelleEntwurf(BERICHT, mit, 'x');
  assert.equal(r.entwurf.anhaenge.filter((a) => a.typ === 'tva').length, 1);
});

test('erstelleEntwurf: unbekannte Kampagne -> ok:false mit Begründung', () => {
  const r = erstelleEntwurf(BERICHT, BAUSTEINE, 'unbekannt');
  assert.equal(r.ok, false);
  assert.ok(r.begruendung.includes('Unbekannte Kampagne'));
});
