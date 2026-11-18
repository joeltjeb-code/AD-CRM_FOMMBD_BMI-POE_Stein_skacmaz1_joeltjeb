import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ladeAkte, fuegePersoenlicheNotizHinzu, uebernimmAufgabe,
  setzeMassnahmenStatus, speichereAkte,
} from '../../app/wissensbasis/akte.js';

const AKTE = {
  haendlerId: 'DEU90ARN',
  stammdaten: { name: 'Autohaus Beispiel', anrede: 'Frau Musterfrau (GF1)' },
  persoenlicheNotizen: [{ datum: '2026-10-05', text: 'Geburtstag: 14. April', kind: 'geburtstag', tag: '04-14' }],
  besuchHistorie: [{ terminId: 't-001', datum: '2026-10-05', teilnehmer: ['Frau Musterfrau'], themen: ['WKR-Kampagne'], kernpunkte: ['Interesse an Wischerdisplay'] }],
  offeneMassnahmen: [{ titel: 'TVA-Rückmeldung', beschreibung: '', verantwortlich: 'Frau Musterfrau', frist: '2026-12-01', status: 'offen' }],
  prioThemen: ['wkr', 'wischerdisplay'],
  folgeterminKadenzWochen: 6,
};
const WB = { akten: [AKTE], gesendetInfos: [] };

test('ladeAkte findet Akte per Marktnummer, null sonst', () => {
  assert.equal(ladeAkte(WB, 'DEU90ARN')?.haendlerId, 'DEU90ARN');
  assert.equal(ladeAkte(WB, 'XXX'), null);
});

test('fuegePersoenlicheNotizHinzu erzeugt neue Akte, Original unverändert', () => {
  const neue = fuegePersoenlicheNotizHinzu(AKTE, { datum: '2026-11-18', text: 'Läuft Marathon' });
  assert.equal(neue.persoenlicheNotizen.length, 2);
  assert.equal(AKTE.persoenlicheNotizen.length, 1);
});

test('uebernimmAufgabe ergänzt offene Maßnahme, setzeMassnahmenStatus erledigt sie', () => {
  const a1 = uebernimmAufgabe(AKTE, { titel: 'Broschüre schicken', verantwortlich: 'David', frist: '2026-12-05' });
  assert.equal(a1.offeneMassnahmen.at(-1).status, 'offen');
  const a2 = setzeMassnahmenStatus(a1, 'Broschüre schicken', 'erledigt');
  assert.equal(a2.offeneMassnahmen.find((m) => m.titel === 'Broschüre schicken').status, 'erledigt');
});

test('speichereAkte ersetzt Akte anhand der ID', () => {
  const wb2 = speichereAkte(WB, { ...AKTE, folgeterminKadenzWochen: 4 });
  assert.equal(wb2.akten.length, 1);
  assert.equal(wb2.akten[0].folgeterminKadenzWochen, 4);
});
