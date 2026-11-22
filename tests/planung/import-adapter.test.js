import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvZuZeilen, baueHaendler, importiere } from '../../app/adapter/import-adapter.js';

// Task 19 / K3: Händlerimport (Design 17.11 + Spec 11.4).
// CSV/Excel-Export direkt parsen, PDF über Mistral OCR (mockbar). Zeilen
// ohne Nummer und Sonder-OBGs (Design: Planung nur D01–D12) werden klar
// verworfen und gezählt, nie stillschweigend geraten.

const KOPF = 'Markt Händlernummer;Händlername;Straße;PLZ;Ort;OBG;Händlerkategorie;Betreuung';
const ZEILE_A = 'DEU90ARN;Autohaus Alpenblick;Seestraße 3;93047;Regensburg;D01;MDLR;Präsenz';
const ZEILE_B = 'DEU90BRV;Autohaus Bergtaler;Waldweg 7;93051;Regensburg;D05;SDLR;Online';

const CSV = [
  'Hinweiszeile 1', 'Hinweiszeile 2', 'Hinweiszeile 3',
  KOPF,
  ZEILE_A,
  ZEILE_B,
  '',                      // Leerzeile
  'zu wenig;ohne Nummer',  // unklare Zeile
  `${ZEILE_A}`,            // Duplikat
  'DEU90CQW;Depot Mitte;Markt 1;10115;Berlin;DE;DEPOT;keine', // Sonder-OBG
].join('\n');

test('csvZuZeilen: Header-Zeile automatisch erkannt, Spalten normalisiert', () => {
  const z = csvZuZeilen(CSV, { trennzeichen: ';' });
  // Zeilen mit Inhalt: A, B, unklare Zeile, A (Duplikat), CQW
  assert.equal(z.length, 5);
  assert.equal(z[0].nummer, 'DEU90ARN');
  assert.equal(z[0].name, 'Autohaus Alpenblick');
  assert.equal(z[0].plz, '93047');
  assert.equal(z[0].ort, 'Regensburg');
  assert.equal(z[0].obg, 'D01');
  assert.equal(z[0].kategorie, 'MDLR');
  assert.equal(z[0].betreuung, 'Präsenz');
});

test('csvZuZeilen: Anführungszeichen und Komma im Text bleiben erhalten', () => {
  const z = csvZuZeilen('Händlernummer;Händlername\n"DEU90XXX";"Autohaus ""Am Tor"", GmbH"', { trennzeichen: ';' });
  assert.equal(z[0].nummer, 'DEU90XXX');
  assert.equal(z[0].name, 'Autohaus "Am Tor", GmbH');
});

test('baueHaendler: Zeile -> Datenmodell (pos aus PLZ+OBG, adresse, defaults)', () => {
  const r = baueHaendler(csvZuZeilen(CSV, { trennzeichen: ';' }));
  const a = r.haendler.find((h) => h.id === 'DEU90ARN');
  assert.equal(a.name, 'Autohaus Alpenblick');
  assert.equal(a.adresse, 'Seestraße 3, 93047 Regensburg');
  assert.equal(a.obg, 'D01');
  assert.equal(a.dauer, 90);
  assert.equal(a.prio, false);
  assert.deepEqual(a.besuchVerlauf, []);
  // Deterministische Demo-Position je PLZ und OBG (posAusPlz)
  assert.deepEqual(a.pos, { ...a.pos });
  assert.ok(typeof a.pos.x === 'number' && typeof a.pos.y === 'number');
});

test('baueHaendler: Sonder-OBGs und unklare Zeilen werden verworfen und gezählt', () => {
  const r = baueHaendler(csvZuZeilen(CSV, { trennzeichen: ';' }));
  assert.ok(!r.haendler.some((h) => h.obg === 'DE'));
  assert.equal(r.verworfen, 2);      // unklare Zeile + Sonder-OBG
  assert.ok(r.warnungen.some((w) => w.includes('ohne gültige Händlernummer')));
  assert.ok(r.warnungen.some((w) => w.includes('DE')));
});

test('baueHaendler: Duplikat -> erster gewinnt, Warnung', () => {
  const r = baueHaendler(csvZuZeilen(CSV, { trennzeichen: ';' }));
  assert.equal(r.haendler.filter((h) => h.id === 'DEU90ARN').length, 1);
  assert.ok(r.warnungen.some((w) => w.includes('Duplikat')));
});

test('baueHaendler: ohne PLZ -> Warnung und Fallback-Position, kein Abbruch', () => {
  const z = [{ nummer: 'DEU90ZZZ', name: 'Ohne PLZ', strasse: 'Waldweg 9', plz: '', ort: 'X', obg: 'D02' }];
  const r = baueHaendler(z);
  assert.equal(r.haendler.length, 1);
  assert.equal(r.haendler[0].adresse, 'Waldweg 9,  X');
  assert.ok(r.warnungen.some((w) => w.includes('PLZ')));
});

test('baueHaendler: alleObg-Option übernimmt auch Sonder-OBGs', () => {
  const r = baueHaendler(csvZuZeilen(CSV, { trennzeichen: ';' }), { alleObg: true });
  assert.ok(r.haendler.some((h) => h.obg === 'DE'));
  // die unklare Zeile bleibt trotzdem raus (ungültige Nummer)
  assert.deepEqual(r.haendler.map((h) => h.id).sort(), ['DEU90ARN', 'DEU90BRV', 'DEU90CQW']);
});

// OCR-Pfad (PDF) — fetch injizierbar, Antwort-Format Mistral OCR: pages[].markdown

function ocrFetcher(markdown) {
  return async (url, init) => ({
    ok: true, status: 200,
    json: async () => {
      if (url.includes('/ocr')) return { pages: [{ markdown }] };
      throw new Error('unerwartete url');
    },
  });
}

const PDF_BYTES = new Uint8Array([37, 80, 68, 70]); // "%PDF"

const OCR_MARKDOWN = [
  '| Markt Händlernummer | Händlername | Straße | PLZ | Ort | OBG |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DEU90ARN | Autohaus Alpenblick | Seestraße 3 | 93047 | Regensburg | D01 |',
  '| DEU90BRV | Autohaus Bergtaler | Waldweg 7 | 93051 | Regensburg | D05 |',
].join('\n');

test('importiere: PDF bytes gehen an Mistral-OCR, Markdown-Tabelle wird Händler', async () => {
  const aufgerufen = [];
  const r = await importiere({ pdfBytes: PDF_BYTES }, {
    apiKey: 'test-key',
    fetchImpl: async (url, init) => {
      aufgerufen.push({ url, init });
      return ocrFetcher(OCR_MARKDOWN)(url, init);
    },
  });
  assert.equal(aufgerufen.length, 1);
  assert.equal(aufgerufen[0].url, 'https://api.mistral.ai/v1/ocr');
  assert.equal(aufgerufen[0].init.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(aufgerufen[0].init.body);
  assert.equal(body.model, 'mistral-ocr-latest');
  assert.equal(body.document.type, 'document_base64');
  assert.equal(r.ok, true);
  assert.equal(r.quelle, 'ocr');
  assert.equal(r.haendler.length, 2);
  assert.equal(r.haendler[0].id, 'DEU90ARN');
  assert.equal(r.zusammenfassung, '2 Händler importiert, 0 verworfen');
});

test('importiere: CSV-Text direkt', async () => {
  const r = await importiere({ csv: CSV });
  assert.equal(r.ok, true);
  assert.equal(r.quelle, 'csv');
  assert.equal(r.haendler.length, 2);
});

test('importiere: OCR-Fehler (HTTP 500) -> ok:false mit Begründung, kein Abbruch', async () => {
  const r = await importiere({ pdfBytes: PDF_BYTES }, {
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: false, status: 500 }),
  });
  assert.equal(r.ok, false);
  assert.ok(r.begruendung.includes('500'));
});

test('importiere: PDF ohne Key -> ok:false, Hinweis auf Konfiguration (K4)', async () => {
  const r = await importiere({ pdfBytes: PDF_BYTES }, {
    fetchImpl: async () => { throw new Error('darf nicht gerufen werden'); },
  });
  assert.equal(r.ok, false);
  assert.ok(r.begruendung.includes('Key'));
});

test('importiere: OCR ohne erkennbare Tabelle -> ok:false', async () => {
  const r = await importiere({ pdfBytes: PDF_BYTES }, {
    apiKey: 'k',
    fetchImpl: ocrFetcher('Reiner Text, keine Tabelle.'),
  });
  assert.equal(r.ok, false);
  assert.ok(r.begruendung.includes('Händlernummer'));
});
