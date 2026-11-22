// Task 19 / K3 (Spec 11.4, Import-Design 17.11): Händlerimport.
// CSV/Excel-Export wird direkt geparst; PDFs gehen an Mistral OCR
// (mistral-ocr-latest) und werden aus der Markdown-Tabelle gelesen.
// Zeilen ohne Händlernummer und Sonder-OBGs (DE/neu/leer) werden klar
// verworfen und gezählt — nie stillschweigend geraten (Design 3.2).
// Der Key kommt ausschließlich aus der Runtime-Konfiguration (K4).

import { posAusPlz } from '../ui/einstellungen.js';

const OCR_BASIS = 'https://api.mistral.ai/v1/ocr';
const OCR_MODELL = 'mistral-ocr-latest';
const PLANUNGS_OBG = /^D(0[1-9]|1[0-2])$/; // D01–D12
const HND_NUMMER = /^DEU[0-9A-Z]{5}$/;     // Design 3.1: DEU + 5 Stellen

// CSV-Parsen -------------------------------------------------------------------

function spaltenKopf(zeile) {
  const t = zeile.toLowerCase();
  if (t.includes('händlernummer') || t.includes('haendlernummer')) return 'nummer';
  if (t.includes('händlername') || t.includes('haendlername')) return 'name';
  if (t.includes('straße') || t.includes('strasse') || t === 'str.') return 'strasse';
  if (t === 'plz' || t.includes('plz')) return 'plz';
  if (t === 'ort' || t.includes('ort')) return 'ort';
  if (t === 'obg') return 'obg';
  if (t.includes('kategorie')) return 'kategorie';
  if (t.includes('betreuungskategorie')) return 'betreuungKategorie';
  if (t.includes('betreuung')) return 'betreuung';
  return null;
}

function csvZeilenSplitten(text, trennzeichen) {
  // Kleiner Parser mit Anführungszeichen-Unterstützung (Excel-Export-Konvention).
  const raus = [];
  let feld = '', zeile = [], inAnfuehrung = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inAnfuehrung) {
      if (ch === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (ch === '"') inAnfuehrung = false;
      else feld += ch;
    } else if (ch === '"') inAnfuehrung = true;
    else if (ch === trennzeichen) { zeile.push(feld); feld = ''; }
    else if (ch === '\n') { zeile.push(feld); raus.push(zeile); zeile = []; feld = ''; }
    else if (ch !== '\r') feld += ch;
  }
  if (feld !== '' || zeile.length) { zeile.push(feld); raus.push(zeile); }
  return raus;
}

export function csvZuZeilen(text, { trennzeichen = ';' } = {}) {
  const roh = csvZeilenSplitten(String(text ?? ''), trennzeichen)
    .map((z) => z.map((f) => f.trim()))
    .filter((z) => z.some((f) => f !== ''));
  const kopfIndex = roh.findIndex((z) =>
    z.some((f) => f.toLowerCase().includes('händlernummer') || f.toLowerCase().includes('haendlernummer')));
  if (kopfIndex < 0) return [];
  const schluessel = roh[kopfIndex].map(spaltenKopf);
  return roh.slice(kopfIndex + 1).map((z) => {
    const o = {};
    z.forEach((feld, i) => { if (schluessel[i]) o[schluessel[i]] = feld; });
    return o;
  });
}

// Zeilen -> Händler-Datenmodell --------------------------------------------------

export function baueHaendler(zeilen, { alleObg = false } = {}) {
  const haendler = [];
  const warnungen = [];
  const nummern = new Set();
  let verworfen = 0;
  for (const z of zeilen ?? []) {
    const nummer = (z.nummer ?? '').trim().toUpperCase();
    if (!HND_NUMMER.test(nummer)) {
      // Positionsbasierte Zuordnung kann unklare Zeilen notfalls als "nummer"
      // landen lassen — geprüft wird hier, nicht geraten (Design: unklare
      // Zeilen führen zu Fehler/Warnung, nie zu stiller Übernahme).
      verworfen += 1;
      warnungen.push(`Zeile ohne gültige Händlernummer verworfen${nummer ? ` (gefunden: „${nummer}")` : ''}`);
      continue;
    }
    if (nummern.has(nummer)) {
      warnungen.push(`Duplikat übersprungen: ${nummer}`);
      continue;
    }
    const obg = (z.obg ?? '').trim().toUpperCase();
    if (!alleObg && !PLANUNGS_OBG.test(obg)) {
      verworfen += 1;
      warnungen.push(`Zeile mit Sonder-OBG „${obg || 'leer'}" verworfen (${nummer})`);
      continue;
    }
    if (!(z.plz ?? '').trim()) {
      warnungen.push(`Keine PLZ bei ${nummer} — Fallback-Position`);
    }
    nummern.add(nummer);
    haendler.push({
      id: nummer,
      name: (z.name ?? '').trim() || nummer,
      adresse: `${(z.strasse ?? '').trim()}, ${(z.plz ?? '').trim()} ${(z.ort ?? '').trim()}`,
      pos: posAusPlz((z.plz ?? '').trim(), obg || 'D01'),
      obg: obg || 'leer',
      kategorie: (z.kategorie ?? '').trim(),
      betreuung: (z.betreuung ?? '').trim(),
      betreuungKategorie: (z.betreuungKategorie ?? '').trim(),
      dauer: 90,
      prio: false,
      besuchVerlauf: [],
    });
  }
  return { haendler, warnungen, verworfen };
}

// Markdown-Tabelle (OCR-Ausgabe) -> Zeilen ---------------------------------------

function markdownZuZeilen(markdown) {
  const zeilen = String(markdown ?? '').split(/\r?\n/).filter((z) => z.trim().startsWith('|'));
  if (zeilen.length < 2) return [];
  const teile = (z) => z.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((f) => f.trim());
  const kopf = teile(zeilen[0]);
  return zeilen.slice(1)
    .map(teile)
    .filter((z) => !z.every((f) => /^-+$/.test(f) || f === ''))
    .map((z) => {
      const o = {};
      kopf.forEach((k, i) => {
        const s = spaltenKopf(k) ?? k.toLowerCase();
        o[s] = z[i] ?? '';
      });
      return o;
    });
}

// Öffentlich: Import (K3) ----------------------------------------------------------

async function pdfZuMarkdown(pdfBytes, { apiKey, fetchImpl, basisUrl, modell } = {}) {
  const f = fetchImpl ?? fetch;
  const antw = await f(basisUrl ?? OCR_BASIS, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modell ?? OCR_MODELL,
      document: {
        type: 'document_base64',
        document_name: 'betreuungsliste.pdf',
        document_bytes: bytesZuBase64(pdfBytes),
      },
      include_image_base64: false,
    }),
  });
  if (!antw.ok) throw new Error(`OCR-Dienst meldete Status ${antw.status}`);
  const daten = await antw.json();
  return (daten?.pages ?? []).map((p) => p?.markdown ?? '').join('\n');
}

function bytesZuBase64(bytes) {
  // Browser: btoa global; Node: Buffer. Beide Pfade, zwei Zeilen.
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (typeof btoa === 'function') {
    let binaer = '';
    for (const byte of b) binaer += String.fromCharCode(byte);
    return btoa(binaer);
  }
  return Buffer.from(b).toString('base64');
}

function abschluss(zeilen, quelle) {
  const { haendler, warnungen, verworfen } = baueHaendler(zeilen);
  return {
    ok: true, quelle, haendler, warnungen, verworfen,
    zusammenfassung: `${haendler.length} Händler importiert, ${verworfen} verworfen`,
  };
}

export async function importiere(quelle, optionen = {}) {
  try {
    if (Array.isArray(quelle?.zeilen)) return abschluss(quelle.zeilen, 'zeilen');
    if (quelle?.csv !== undefined) {
      return abschluss(csvZuZeilen(quelle.csv, { trennzeichen: optionen.trennzeichen }), 'csv');
    }
    if (quelle?.pdfBytes) {
      if (!optionen.apiKey) {
        return { ok: false, begruendung: 'PDF-Import braucht einen OCR-Key (Runtime-Konfiguration, K4)' };
      }
      const markdown = await pdfZuMarkdown(quelle.pdfBytes, optionen);
      const zeilen = markdownZuZeilen(markdown);
      if (!zeilen.some((z) => z.nummer)) {
        return { ok: false, begruendung: 'OCR-Ergebnis enthält keine Spalte mit Händlernummer' };
      }
      return abschluss(zeilen, 'ocr');
    }
    return { ok: false, begruendung: 'Nichts zu importieren: csv, pdfBytes oder zeilen angeben' };
  } catch (e) {
    return { ok: false, begruendung: `Import fehlgeschlagen: ${e?.message ?? e}` };
  }
}
