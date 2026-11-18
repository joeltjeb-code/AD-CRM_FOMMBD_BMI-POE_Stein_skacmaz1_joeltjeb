import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueBriefing } from '../../app/briefing/checkliste.js';

const AKTE = {
  haendlerId: 'DEU90ARN',
  stammdaten: { name: 'Autohaus Beispiel', anrede: 'Frau Musterfrau (GF1)' },
  persoenlicheNotizen: [
    { datum: '2026-10-05', text: 'Geburtstag: 14. April', kind: 'geburtstag', tag: '04-14' },
    { datum: '2026-10-05', text: 'Läuft Marathon' },
  ],
  besuchHistorie: [{ terminId: 't-001', datum: '2026-10-05', teilnehmer: ['Frau Musterfrau'], themen: ['WKR-Kampagne'], kernpunkte: ['Interesse an Wischerdisplay'] }],
  offeneMassnahmen: [{ titel: 'TVA-Rückmeldung', beschreibung: '', verantwortlich: 'Frau Musterfrau', frist: '2026-12-01', status: 'offen' }],
  prioThemen: ['bremsen'],
  folgeterminKadenzWochen: 6,
};
const KPI = { id: 'DEU90ARN', wkr: { tier: 1, quoteProzent: 42 },
  wischerdisplay: { bestellt: false, datum: null },
  afsb: { status: 'Silber', punkteBisGold: 35 }, parkplatz: {} };

test('baueBriefing: KPI-Block zuerst, Anrede aus Stamm', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'Autohaus Beispiel', gf1: 'Frau Musterfrau' }, akte: AKTE, kpi: KPI, heute: '2026-11-18' });
  assert.equal(b.anrede, 'Frau Musterfrau');
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('WKR')));
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('Wischerdisplay')));
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('AFSB')));
});

test('pflichthemen: WKR-Quote, Wischerdisplay fehlt, Prio-Thema der Akte', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'Autohaus Beispiel' }, akte: AKTE, kpi: KPI, heute: '2026-11-18' });
  const titel = b.pflichthemen.map((t) => t.titel).join('|');
  assert.ok(titel.includes('WKR-Performance ansprechen'));
  assert.ok(titel.includes('Wischerdisplay vorstellen'));
  assert.ok(titel.includes('Bremsen'));
});

test('pflichthemen: kein Wischerdisplay-Thema, wenn schon bestellt', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' },
    akte: { ...AKTE, prioThemen: [] },
    kpi: { ...KPI, wischerdisplay: { bestellt: true, datum: '2026-10-20' } },
    heute: '2026-11-18' });
  assert.ok(!b.pflichthemen.some((t) => t.titel.includes('Wischerdisplay')));
});

test('hinweise: Geburtstag innerhalb 14 Tage', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' }, akte: AKTE, kpi: KPI, heute: '2026-04-08' });
  assert.ok(b.hinweise.some((h) => h.includes('Geburtstag')));
  const b2 = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' }, akte: AKTE, kpi: KPI, heute: '2026-06-01' });
  assert.ok(!b2.hinweise.some((h) => h.includes('Geburtstag')));
});
