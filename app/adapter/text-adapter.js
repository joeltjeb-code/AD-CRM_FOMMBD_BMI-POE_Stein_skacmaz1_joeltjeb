// Demo: deterministische Baustein-Auswahl — Logik ändert sich nicht.
// Task 18 (Spec 11.4 K1+K2): KI hinter dem Adapter. Mit API-Key fragt der
// Adapter die Mistral-Chat-API; ohne Key, bei Netz- oder Parse-Fehlern greift
// eine deterministische Heuristik (quellen-Feld verrät, was geliefert hat).
// Der Key kommt ausschließlich aus der Runtime-Konfiguration (K4), nie aus dem Repo.

export function bausteinTexte(kampagne, bericht) {
  return [...kampagne.textbausteine];
}

const MISTRAL_BASIS = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODELL = 'mistral-small-latest';

// Hilfsfunktionen -----------------------------------------------------------

function entFrist(roh) {
  const t = String(roh ?? '').trim();
  const deutsch = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deutsch) return `${deutsch[3]}-${deutsch[2].padStart(2, '0')}-${deutsch[1].padStart(2, '0')}`;
  return t; // ISO bleibt ISO
}

function hatWort(zeile, woerter) {
  const z = zeile.toLowerCase();
  return woerter.some((w) => z.includes(w));
}

function jsonAusInhalt(content) {
  const start = content.indexOf('{');
  const ende = content.lastIndexOf('}');
  if (start < 0 || ende <= start) return null;
  try {
    return JSON.parse(content.slice(start, ende + 1));
  } catch {
    return null;
  }
}

async function mistralFrage(prompts, { apiKey, fetchImpl, basisUrl, modell } = {}) {
  const f = fetchImpl ?? fetch;
  const antw = await f(basisUrl ?? MISTRAL_BASIS, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modell ?? MISTRAL_MODELL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.nutzer },
      ],
    }),
  });
  if (!antw.ok) throw new Error(`Mistral-Antwort ${antw.status}`);
  const daten = await antw.json();
  return daten?.choices?.[0]?.message?.content ?? '';
}

// Heuristik (Fallback, K1) ---------------------------------------------------

const VEREINBARUNG_WOERTER = ['vereinbar', 'zugesag', 'zugesicher', 'abgemacht', 'einigung', 'verabredet'];

function heuristikStichpunkte(text) {
  const zeilen = String(text ?? '')
    .split(/\r?\n|\r/)
    .map((z) => z.trim())
    .filter(Boolean);
  const themen = [];
  const vereinbarungen = [];
  const aufgaben = [];
  for (const zeile of zeilen) {
    if (zeile.includes('|') || hatWort(zeile, ['aufgabe:', 'todo:', 'erledigen:'])) {
      const teile = zeile.split('|').map((t) => t.replace(/^(aufgabe|todo|erledigen)\s*:\s*/i, '').trim());
      aufgaben.push({ titel: teile[0], verantwortlich: teile[1] ?? '', frist: entFrist(teile[2]) });
      continue;
    }
    if (hatWort(zeile, VEREINBARUNG_WOERTER)) {
      vereinbarungen.push(zeile);
      continue;
    }
    themen.push(zeile);
  }
  return { themen, vereinbarungen, aufgaben };
}

// Heuristik (Fallback, K2): Regel-Match auf Kampagnen- und Anhang-Katalog.

function heuristikKlassifikation(themen, kampagnen, katalog) {
  const t = (themen ?? []).map((x) => String(x).toLowerCase());
  const verstehe = (k) => [k.id, ...(k.titel ? [k.titel] : []), ...(k.schluessel ?? [])]
    .filter(Boolean).map((s) => String(s).toLowerCase());
  const kampagne = kampagnen.find((k) => verstehe(k).some((s) => t.some((x) => x.includes(s))))?.id ?? null;
  const allgemeineAnhaenge = katalog
    .filter((k) => (k.schluessel ?? []).some((s) => t.some((x) => x.includes(String(s).toLowerCase()))))
    .map((k) => k.id);
  return { kampagne, allgemeineAnhaenge };
}

// Öffentlich: Stichpunkte -> Struktur (K1) -----------------------------------

export async function strukturiereStichpunkte(text, optionen = {}) {
  const basis = heuristikStichpunkte(text);
  if (!optionen.apiKey) return { ...basis, quelle: 'heuristik' };
  try {
    const content = await mistralFrage({
      system: 'Du strukturierst Stichpunkte aus einem Händlerbesuch eines Ford-Außendienstlers. Antworte AUSSCHLIESSLICH mit JSON: {"themen":[],"vereinbarungen":[],"aufgaben":[{"titel":"","verantwortlich":"","frist":"JJJJ-MM-TT"}]}. Fristen immer als JJJJ-MM-TT (leer lassen, wenn keine). Inhalte nur aus den Stichpunkten, nichts erfinden.',
      nutzer: `Stichpunkte:\n${text}`,
    }, optionen);
    const ki = jsonAusInhalt(content);
    if (!ki) return { ...basis, quelle: 'heuristik', hinweis: 'KI-Antwort nicht lesbar' };
    return {
      themen: (ki.themen ?? []).map(String).filter(Boolean),
      vereinbarungen: (ki.vereinbarungen ?? []).map(String).filter(Boolean),
      aufgaben: (ki.aufgaben ?? []).map((a) => ({
        titel: String(a?.titel ?? ''),
        verantwortlich: String(a?.verantwortlich ?? ''),
        frist: entFrist(a?.frist),
      })).filter((a) => a.titel),
      quelle: 'llm',
    };
  } catch {
    return { ...basis, quelle: 'heuristik', hinweis: 'KI nicht erreichbar – Heuristik' };
  }
}

// Öffentlich: Themen -> Kampagne + allgemeine Anhänge (K2) -------------------

export async function klassifiziereThemen(themen, optionen = {}) {
  const kampagnen = optionen.kampagnen ?? [];
  const katalog = optionen.anhaengeKatalog ?? [];
  const knownK = kampagnen.map((k) => k.id);
  const knownA = katalog.map((k) => k.id);
  const heuristik = heuristikKlassifikation(themen, kampagnen, katalog);
  if (!optionen.apiKey) return { ...heuristik, quelle: 'heuristik' };
  try {
    const content = await mistralFrage({
      system: 'Du klassifizierst Berichtsthemen eines Ford-Außendienstlers. Antworte AUSSCHLIESSLICH mit JSON: {"kampagne":<eine ID aus der Kampagnenliste oder null>,"allgemeineAnhaenge":[<IDs aus der Listen-Gruppe>]}. Nutze NUR die vorgegebenen IDs. Wenn nichts passt: null bzw. leere Liste.',
      nutzer: `Themen: ${JSON.stringify(themen)}\nKampagnen-IDs: ${JSON.stringify(knownK)}\nAnhang-Gruppen-IDs: ${JSON.stringify(knownA)}`,
    }, optionen);
    const ki = jsonAusInhalt(content);
    if (!ki) return { ...heuristik, quelle: 'heuristik', hinweis: 'KI-Antwort nicht lesbar' };
    return {
      kampagne: knownK.includes(ki.kampagne) ? ki.kampagne : null,
      allgemeineAnhaenge: (ki.allgemeineAnhaenge ?? []).filter((id) => knownA.includes(id)),
      quelle: 'llm',
    };
  } catch {
    return { ...heuristik, quelle: 'heuristik', hinweis: 'KI nicht erreichbar – Heuristik' };
  }
}
