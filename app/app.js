import { erstelleDemoRouting } from './adapter/routing-adapter.js';
import { erstelleSpeicher } from './adapter/speicher-adapter.js';
import { planeWochen, frischauf } from './planung/planer.js';
import { istPlanGueltig } from './planung/validierung.js';
import { besteEinsattposition } from './planung/reihenfolge.js';
import { filtereNachObg } from './planung/auswahl.js';
import { parseBefehl, wendeAn } from './planung/befehle.js';
import { renderePlanraster } from './ui/woche.js';
import { rendereEinstellungen, rendereAbwesenheiten, posAusPlz } from './ui/einstellungen.js';
import { baueBriefing } from './briefing/checkliste.js';
import { baueSchnellblatt } from './briefing/schnellblatt.js';
import { erstelleBericht, aufgabenAlsMassnahmen } from './bericht/vorlage.js';
import { erstelleEntwurf } from './bericht/entwurf.js';
import { vorschlaege, registriereVersand } from './infodist/selektion.js';
import { ladeAkte, fuegePersoenlicheNotizHinzu, uebernimmAufgabe, speichereAkte } from './wissensbasis/akte.js';
import { rendereBriefing } from './ui/briefing-view.js';
import { rendereBerichtFormular } from './ui/bericht-view.js';
import { rendereInfoVorschlaege } from './ui/infodist-view.js';
import { hndNummer } from './ui/format.js';
import { ladeMails } from './adapter/mail-adapter.js';
import { ladeKpiWerte } from './adapter/scorecard-adapter.js';

const speicher = erstelleSpeicher();

function wechsleTab(tabId) {
  for (const tab of document.querySelectorAll('[role=tab]')) {
    tab.setAttribute('aria-selected', String(tab.id === `tab-${tabId}`));
  }
  document.querySelectorAll('[role=tabpanel]').forEach((panel) => {
    panel.classList.toggle('versteckt', panel.id !== `${tabId}Tab`);
  });
}

let haendler = [];
let hotels = [];
let wissensbasis = { akten: [], gesendetInfos: [] };
let bausteine = { kampagnen: [] };
let scorecard = { haendler: [] };
let themenAnhaenge = { anhaengeKatalog: [] };
let gewaehlt = null;
const STANDARD_SETTINGS = {
  obg: 'D01',
  heimat: { name: 'Heimatbüro', plz: '', pos: posAusPlz('93047', 'D01') },
  altStartorte: [], // obsolet seit OBG/Heimat-Eingabe; bleibt als Feld für Kompatibilität
  bev: false,
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60 },
};
let settings = speicher.lade('einstellungen', null);
const ALTE_HEIMAT_POS = { x: -8, y: 10 }; // Demo-Welt vor der Fahrzeit-Skalierung
settings = {
  ...STANDARD_SETTINGS,
  ...(settings ?? {}),
  heimat: { ...STANDARD_SETTINGS.heimat, ...(settings?.heimat ?? {}) },
  praferenzen: { ...STANDARD_SETTINGS.praferenzen, ...(settings?.praferenzen ?? {}) },
  abwesenheiten: { wochen: {}, tage: {}, gruende: {}, ...(settings?.abwesenheiten ?? {}) },
};
// Migration: Heimat-Pos aus der alten Demo-Welt auf die neue Skalierung heben
if (settings.heimat.pos?.x === ALTE_HEIMAT_POS.x && settings.heimat.pos?.y === ALTE_HEIMAT_POS.y) {
  settings.heimat.pos = STANDARD_SETTINGS.heimat.pos;
}
let plan = null;

function nextMondayIso() {
  const d = new Date();
  const delta = ((8 - d.getUTCDay()) % 7) || 7; // nächster Montag
  return new Date(d.getTime() + delta * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function kontext() {
  const dealersById = Object.fromEntries(haendler.map((h) => [h.id, h]));
  return {
    dealersById,
    settings,
    routing: erstelleDemoRouting({ bevAufschlagMin: settings.bev ? 10 : 0 }),
    hotels,
  };
}

function neuPlanen() {
  plan = planeWochen({
    haendler: filtereNachObg(haendler, settings.obg),
    hotels, settings,
    routing: kontext().routing,
    startMontag: nextMondayIso(),
    anzahlWochen: 4,
  });
  speicher.speichere('plan', plan);
  zeichnen();
  zeigeAbwesenheiten();
}

function zeichnen(meldungEl, meldung) {
  if (meldungEl && meldung) meldungEl.textContent = meldung;
  const heute = new Date().toISOString().slice(0, 10);
  const verlauf = Object.fromEntries(haendler.map((h) =>
    [h.id, h.besuchVerlauf?.at(-1) ?? wissensbasis.akten.find((a) => a.haendlerId === h.id)?.besuchHistorie?.at(-1)?.datum ?? null]));
  renderePlanraster(document.getElementById('plan'), plan, {
    onWaehl: zeigeBriefing,
    haendlerVerlauf: verlauf,
    haendlerNamen: Object.fromEntries(haendler.map((h) => [h.id, h.name])),
    heute,
    abwesenheiten: settings.abwesenheiten,
    onMove: (haendlerId, w, t) => {
      const quelleWoche = plan.wochen.findIndex((x) =>
        x.tage.some((y) => (y.termine ?? []).some((z) => z.haendlerId === haendlerId)));
      const quelle = plan.wochen[quelleWoche].tage.find((y) =>
        (y.termine ?? []).some((z) => z.haendlerId === haendlerId));
      const i = quelle.termine.findIndex((z) => z.haendlerId === haendlerId);
      const [termin] = quelle.termine.splice(i, 1);
      // Bester Einsattpunkt im Ziel-Tag: kürzeste Gesamt-Fahrzeit, sonstige
      // Termine rücken per Trickle-Down nach hinten (keine Überlappungen).
      const zielTag = plan.wochen[w].tage[t];
      const ktx = kontext();
      const liste = zielTag.termine.map((x) => ktx.dealersById[x.haendlerId]).filter(Boolean);
      const einsatz = besteEinsattposition(liste, ktx.dealersById[haendlerId],
        { name: zielTag.startortName, pos: zielTag.startortPos }, ktx.routing);
      zielTag.termine.splice(einsatz, 0, termin);
      plan = frischauf(plan, ktx);
      speicher.speichere('plan', plan);
      zeichnen();
    },
    onBefehl: (text, meldungEl) => {
      const { plan: p2, meldung } = wendeAn(plan, parseBefehl(text), kontext());
      plan = p2;
      speicher.speichere('plan', plan);
      zeichnen(meldungEl, meldung);
    },
  });
}

function zeigeBriefing(haendlerId) {
  const stamm = haendler.find((h) => h.id === haendlerId);
  if (!stamm) return;
  gewaehlt = haendlerId;
  let akte = ladeAkte(wissensbasis, haendlerId);
  if (!akte) {
    akte = {
      haendlerId, stammdaten: { name: stamm.name },
      persoenlicheNotizen: [], besuchHistorie: [], offeneMassnahmen: [],
      prioThemen: stamm.prio ? ['wkr'] : [], folgeterminKadenzWochen: 6,
    };
    wissensbasis = speichereAkte(wissensbasis, akte);
    speicher.speichere('wissensbasis', wissensbasis);
  }
  const kpi = ladeKpiWerte(scorecard, haendlerId);
  const chip = document.getElementById('navHaendler');
  chip.textContent = `${stamm.name} (${hndNummer(stamm.id)})`;
  chip.hidden = false;
  // Berichts-Formular hält die Händlernummer der Auswahl aktuell
  const kurzFeld = document.querySelector('#feld-haendler');
  if (kurzFeld) kurzFeld.value = hndNummer(stamm.id);
  document.getElementById('briefingEingang').classList.add('versteckt');
  wechsleTab('briefing');
  rendereBriefing(document.getElementById('briefing'),
    baueBriefing({ haendlerStamm: { ...stamm, gf1: akte.stammdaten.anrede }, akte, kpi, heute: new Date().toISOString().slice(0, 10) }),
    baueSchnellblatt(kpi));
}

function berichtFreigeben(formwerte) {
  const komma = (s) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const aufgaben = (formwerte.aufgaben ?? '').split('\n').map((zeile) => {
    const [titel, verantwortlich, frist] = zeile.split('|').map((s) => s.trim());
    return { titel, verantwortlich: verantwortlich ?? '', frist: frist || null };
  }).filter((a) => a.titel);
  const eingabe = {
    haendlerId: formwerte.haendlerId, datum: formwerte.datum,
    teilnehmer: komma(formwerte.teilnehmer),
    themen: komma(formwerte.themen),
    vereinbarungen: komma(formwerte.vereinbarungen),
    aufgaben, offenePunkte: komma(formwerte.offenePunkte),
    stichpunkte: formwerte.stichpunkte,
  };
  const ergebnis = document.getElementById('berichtErgebnis');
  const r = erstelleBericht(eingabe);
  if (!r.ok) {
    ergebnis.textContent = `Unvollständig: ${r.fehlend.join(', ')}`;
    return;
  }
  let akte = ladeAkte(wissensbasis, eingabe.haendlerId);
  if (!akte) {
    akte = { haendlerId: eingabe.haendlerId, stammdaten: {}, persoenlicheNotizen: [],
      besuchHistorie: [], offeneMassnahmen: [], prioThemen: [], folgeterminKadenzWochen: 6 };
    akte.besuchHistorie.push({ terminId: `b-${eingabe.datum}`, datum: eingabe.datum,
      teilnehmer: eingabe.teilnehmer, themen: eingabe.themen, kernpunkte: [eingabe.stichpunkte] });
  }
  for (const m of aufgabenAlsMassnahmen(r.bericht)) akte = uebernimmAufgabe(akte, m);
  wissensbasis = speichereAkte(wissensbasis, akte);
  speicher.speichere('wissensbasis', wissensbasis);
  const e = formwerte.kampagne
    ? erstelleEntwurf(r.bericht, bausteine, formwerte.kampagne,
        { themenAnhaengeKatalog: themenAnhaenge.anhaengeKatalog }) : null;
  const themenListen = [r.bericht.folgetermin ? `Folgetermin: ${r.bericht.folgetermin} (Einladung separat)` : null]
    .filter(Boolean);
  ergebnis.innerHTML = '<p>Bericht übernommen.</p>' + (e?.ok ? `
    ${themenListen.map((x) => `<p>${x}</p>`).join('')}
    <h3>E-Mail-Entwurf (${e.entwurf.anhaenge.map((a) => a.name).join(', ')})</h3>
    <p><b>${e.entwurf.betreff}</b></p>
    <pre>${e.entwurf.text}</pre>
    ${e.entwurf.links.map((l) => `<a href="${l}">Training</a>`).join(' · ')}
    <p><i>${e.zusammenfassung.join(' · ')}</i></p>` : '');
  zeichnen();
}

function zeigeInfoVerteilung() {
  const id = gewaehlt ?? wissensbasis.akten[0]?.haendlerId;
  // Händler ohne Akte (z. B. frisch aus der Planung gewählt) bekommen eine
  // Ad-hoc-Akte aus den Stamm- und Planungsdaten — so zeigt der Tab immer die
  // passenden Vorschläge statt der „Händler wählen"-Meldung.
  const stamm = id && haendler.find((h) => h.id === id);
  const akte = (id && ladeAkte(wissensbasis, id)) ?? (stamm ? {
    haendlerId: stamm.id, stammdaten: { name: stamm.name },
    persoenlicheNotizen: [], besuchHistorie: [], offeneMassnahmen: [],
    prioThemen: stamm.prio ? ['wkr'] : [], folgeterminKadenzWochen: 6,
  } : null);
  if (!akte) return;
  document.getElementById('infosEingang').classList.add('versteckt');
  wechsleTab('infos');
  const v = vorschlaege({ mails: ladeMails(postfach), akte, gesendetInfos: wissensbasis.gesendetInfos });
  rendereInfoVorschlaege(document.getElementById('infodist'), v, (mailId) => {
    wissensbasis = registriereVersand(wissensbasis, akte.haendlerId, mailId, new Date().toISOString().slice(0, 10));
    speicher.speichere('wissensbasis', wissensbasis);
    zeigeInfoVerteilung();
  });
}

let postfach = { mails: [] };

function zeigeAbwesenheiten() {
  rendereAbwesenheiten(document.getElementById('abwesenheiten'), plan, settings.abwesenheiten, {
    onAendern: (abw) => {
      settings = { ...settings, abwesenheiten: abw };
      speicher.speichere('einstellungen', settings);
      neuPlanen();
    },
  });
}

// Lädt eine JSON-Datei mit Retry — ein kurzer Hänger des internen Servers
// (oder eine Datei, die genau während eines Regenerierens gelesen wird)
// wirft sonst einen stummen Abbruch beim Start.
async function ladeDatenMitRetry(url, versuche = 3) {
  let letzterFehler = null;
  for (let i = 0; i < versuche; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status} für ${url}`);
      return await r.json();
    } catch (e) {
      letzterFehler = e;
      await new Promise((res) => setTimeout(res, 250 * (i + 1)));
    }
  }
  throw letzterFehler;
}

function zeigeStartfehler(fehler) {
  const ziel = document.getElementById('plan');
  if (!ziel) return;
  ziel.innerHTML = `
    <section class="fehlerhinweis" style="border:2px solid #c0272d; padding:16px; margin-top:16px; border-radius:4px;">
      <h2 style="margin-top:0">Die Daten konnten nicht geladen werden</h2>
      <p>Ursache: <code>${(fehler?.message ?? fehler).toString().replace(/[<>&]/g, '')}</code></p>
      <p>Bitte die Seite neu laden (F5). Läuft der interne Server nicht mehr, im Terminal
      <code>python3 -m http.server 8000</code> starten und dann neu laden.</p>
      <p><button id="startfehlerNeuLaden" type="button">Seite neu laden</button></p>
    </section>`;
  document.getElementById('startfehlerNeuLaden')?.addEventListener('click', () => window.location.reload());
}

function bindeStatischeListener() {
  for (const tab of document.querySelectorAll('[role=tab]')) {
    tab.addEventListener('click', () => {
      const tabId = tab.id.replace('tab-', '');
      wechsleTab(tabId);
      // Infos laden den aktuellen Vorschlag-Stand beim Betreten (nach Auswahl)
      if (tabId === 'infos') zeigeInfoVerteilung();
    });
  }
  document.getElementById('neuPlanen').addEventListener('click', () => {
    if (!haendler.length) return; // Daten noch nicht (bzw. fehlerhaft) geladen
    neuPlanen();
  });
  document.getElementById('exportJson').addEventListener('click', () => {
    if (!plan) return;
    const blob = new Blob([speicher.exportJson(plan)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routenplan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
}

async function starten() {
  // Listener VOR dem Datenladen binden — soll das Laden scheitern, bleiben
  // die Buttons trotzdem bedienbar und die Fehlermeldung sichtbar.
  bindeStatischeListener();
  try {
    [haendler, hotels, wissensbasis, bausteine, scorecard, postfach, themenAnhaenge] = await Promise.all([
      ladeDatenMitRetry('daten/haendler-demo.json'),
      ladeDatenMitRetry('daten/hotels-demo.json'),
      ladeDatenMitRetry('daten/wissensbasis.json'),
      ladeDatenMitRetry('daten/kampagnen-bausteine.json'),
      ladeDatenMitRetry('daten/scorecard-demo.json'),
      ladeDatenMitRetry('daten/postfach-demo.json'),
      ladeDatenMitRetry('daten/themen-anhaenge.json'),
    ]);
  } catch (e) {
    zeigeStartfehler(e);
    return;
  }
  wissensbasis = speicher.lade('wissensbasis', wissensbasis);
  rendereEinstellungen(document.getElementById('einstellungen'), settings, {
    onSpeichern: (neu) => { settings = neu; speicher.speichere('einstellungen', settings); neuPlanen(); },
  });
  zeigeAbwesenheiten();
  plan = speicher.lade('plan', null);
  // Gealterten Plan verwerfen: referenziert er Händler, die es im aktuellen
  // Datensatz nicht mehr gibt (Demo-Re-Generierung), lieber neu planen als
  // Geister-Termine zu rendern.
  const dealers = Object.fromEntries(haendler.map((h) => [h.id, h]));
  if (plan && !istPlanGueltig(plan, dealers)) plan = null;
  if (plan) { plan = frischauf(plan, kontext()); zeichnen(); } else neuPlanen();
  rendereBerichtFormular(document.getElementById('bericht'), berichtFreigeben, {
    wissensbasis: wissensbasis,
    // KI-Klassifikation (Task 18) kennt beide Kataloge — ohne Key greift die
    // Heuristik auf dieselben Daten zu.
    kampagnen: bausteine.kampagnen,
    anhaengeKatalog: themenAnhaenge.anhaengeKatalog,
    // Händlernummer im Bericht wählt den global selektierten Händler —
    // wir bleiben aber im Bericht (kein Tab-Wechsel wie beim Klick in den Plan).
    onWaehl: (haendlerId) => {
      const stamm = haendler.find((h) => h.id === haendlerId);
      if (!stamm) return;
      gewaehlt = haendlerId;
      const chip = document.getElementById('navHaendler');
      chip.textContent = `${stamm.name} (${hndNummer(stamm.id)})`;
      chip.hidden = false;
      const kurzFeld = document.querySelector('#feld-haendler');
      if (kurzFeld) kurzFeld.value = hndNummer(stamm.id);
    },
  });
}

starten();
