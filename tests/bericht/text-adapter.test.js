import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strukturiereStichpunkte, klassifiziereThemen } from '../../app/adapter/text-adapter.js';

// Task 18: KI hinter text-adapter (Spec 11.4 K1, K2, K4).
// Ohne API-Key: deterministische Heuristik, kein Netzaufruf, quelle: 'heuristik'.
// Mit API-Key: Mistral-Chat-Call über injizierbaren fetch, quelle: 'llm'.

const STICHPUNKTE = [
  'WKR-Zahlen besprochen, 62 % Quote',
  'Kunde wünscht Folgetermin zur Wischerkampagne',
  'Vereinbart: Verkaufsgespräch am 30.11. mit dem Prinzipal',
  'Aufgabe: Ersatzteile bestellen | Herr Schmidt | 2026-12-01',
].join('\n');

test('Heuristik ohne Key: stichpunkte -> themen, vereinbarungen, aufgaben', async () => {
  const r = await strukturiereStichpunkte(STICHPUNKTE, { fetchImpl: async () => { throw new Error('darf nicht gerufen werden'); } });
  assert.equal(r.quelle, 'heuristik');
  assert.deepEqual(r.aufgaben, [
    { titel: 'Ersatzteile bestellen', verantwortlich: 'Herr Schmidt', frist: '2026-12-01' },
  ]);
  assert.ok(r.vereinbarungen.some((v) => v.includes('Verkaufsgespräch')));
  assert.ok(r.themen.some((t) => t.toLowerCase().includes('wkr')));
  assert.ok(!r.themen.some((t) => t.toLowerCase().includes('ersatzteile')));
});

test('Heuristik: deutsche Frist (TT.MM.JJJJ) wird normalisiert', async () => {
  const r = await strukturiereStichpunkte('Aufgabe: Rechnung prüfen | Frau Klein | 05.12.2026');
  assert.deepEqual(r.aufgaben, [
    { titel: 'Rechnung prüfen', verantwortlich: 'Frau Klein', frist: '2026-12-05' },
  ]);
});

test('Heuristik: Aufgabe ohne Verantwortlichen/Frist bleibt strukturierbar', async () => {
  const r = await strukturiereStichpunkte('aufgabe: Filme für den Zug tunen');
  assert.deepEqual(r.aufgaben, [
    { titel: 'Filme für den Zug tunen', verantwortlich: '', frist: '' },
  ]);
});

test('Heuristik: leerer Text liefert leere Struktur, quelle heuristik', async () => {
  const r = await strukturiereStichpunkte('   ');
  assert.equal(r.quelle, 'heuristik');
  assert.deepEqual(r.themen, []);
  assert.deepEqual(r.vereinbarungen, []);
  assert.deepEqual(r.aufgaben, []);
});

const MISTRAL_ANTWORT = {
  choices: [{ message: { content: JSON.stringify({
    themen: ['WKR-Programm', 'Wischeraufsteller'],
    vereinbarungen: ['Aufsteller bis Ende November leeren'],
    aufgaben: [{ titel: 'Zahlen nachliefern', verantwortlich: 'Fr. Klein', frist: '2026-11-27' }],
  }) } }],
};

function mistralFetcher(assertionen) {
  return async (url, init) => {
    assertionen({ url, init });
    return { ok: true, status: 200, json: async () => MISTRAL_ANTWORT };
  };
}

test('Mit Key: Mistral-Call liefern Felder, quelle llm', async () => {
  const aufgerufen = [];
  const r = await strukturiereStichpunkte(STICHPUNKTE, {
    apiKey: 'test-key', fetchImpl: mistralFetcher((a) => aufgerufen.push(a)),
  });
  assert.equal(aufgerufen.length, 1);
  assert.equal(aufgerufen[0].url, 'https://api.mistral.ai/v1/chat/completions');
  assert.equal(aufgerufen[0].init.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(aufgerufen[0].init.body);
  assert.equal(body.model, 'mistral-small-latest');
  assert.ok(body.messages[1].content.includes(STICHPUNKTE.split('\n')[0]));
  assert.equal(r.quelle, 'llm');
  assert.deepEqual(r.themen, ['WKR-Programm', 'Wischeraufsteller']);
  assert.deepEqual(r.aufgaben, [
    { titel: 'Zahlen nachliefern', verantwortlich: 'Fr. Klein', frist: '2026-11-27' },
  ]);
});

test('Mit Key, aber Netzfehler: Rueckfall auf Heuristik (kein Abbruch)', async () => {
  const r = await strukturiereStichpunkte(STICHPUNKTE, {
    apiKey: 'test-key', fetchImpl: async () => { throw new Error('netzweg'); },
  });
  assert.equal(r.quelle, 'heuristik');
  assert.ok(r.themen.length > 0);
});

test('Mit Key, aber kaputtem Modell-JSON: Rueckfall auf Heuristik', async () => {
  const r = await strukturiereStichpunkte(STICHPUNKTE, {
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      choices: [{ message: { content: 'kein json' } }] }) }),
  });
  assert.equal(r.quelle, 'heuristik');
});

test('Heuristik-Klassifikation: WKR-Thema -> Kampagne wkr + Anhang-IDs', async () => {
  const r = await klassifiziereThemen(['WKR-Programm', 'Qualität der Werkstatt'], {
    kampagnen: [
      { id: 'wkr', titel: 'WKR-Programm' },
      { id: 'bremsen', titel: 'Bremsen' },
    ],
    anhaengeKatalog: [
      { id: 'qs-werkstatt', schluessel: ['qualitaet', 'qs', 'werkstatt'] },
      { id: 'akf', schluessel: ['akf'] },
    ],
  });
  assert.equal(r.quelle, 'heuristik');
  assert.equal(r.kampagne, 'wkr');
  assert.deepEqual([...r.allgemeineAnhaenge].sort(), ['qs-werkstatt']);
});

test('Klassifikation ohne Treffer: kampagne null, keine Anhaenge', async () => {
  const r = await klassifiziereThemen(['Irgendein Thema'], {
    kampagnen: [{ id: 'wkr', titel: 'WKR-Programm' }], anhaengeKatalog: [],
  });
  assert.equal(r.quelle, 'heuristik');
  assert.equal(r.kampagne, null);
  assert.deepEqual(r.allgemeineAnhaenge, []);
});

test('Klassifikation mit Key: LLM-Antwort wird respektiert (nur bekannte IDs)', async () => {
  const llm = { kampagne: 'bremsen', allgemeineAnhaenge: ['akf', 'unbekannt'] };
  const r = await klassifiziereThemen(['Bremsen', 'AKF'], {
    apiKey: 'test-key',
    kampagnen: [{ id: 'bremsen', titel: 'Bremsen' }, { id: 'wkr', titel: 'WKR-Programm' }],
    anhaengeKatalog: [{ id: 'akf', schluessel: ['akf'] }],
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({
      choices: [{ message: { content: JSON.stringify(llm) } }] }),
    }),
  });
  assert.equal(r.quelle, 'llm');
  assert.equal(r.kampagne, 'bremsen');
  assert.deepEqual(r.allgemeineAnhaenge, ['akf']);
});
