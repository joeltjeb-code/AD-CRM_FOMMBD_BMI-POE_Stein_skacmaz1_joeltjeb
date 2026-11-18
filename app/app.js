import { erstelleDemoRouting } from './adapter/routing-adapter.js';
import { erstelleSpeicher } from './adapter/speicher-adapter.js';
import { planeWochen, frischauf } from './planung/planer.js';
import { parseBefehl, wendeAn } from './planung/befehle.js';
import { renderePlanraster } from './ui/woche.js';
import { rendereEinstellungen } from './ui/einstellungen.js';
import { baueBriefing } from './briefing/checkliste.js';
import { baueSchnellblatt } from './briefing/schnellblatt.js';
import { erstelleBericht, aufgabenAlsMassnahmen } from './bericht/vorlage.js';
import { erstelleEntwurf } from './bericht/entwurf.js';
import { vorschlaege, registriereVersand } from './infodist/selektion.js';
import { ladeAkte, fuegePersoenlicheNotizHinzu, uebernimmAufgabe, speichereAkte } from './wissensbasis/akte.js';
import { rendereBriefing } from './ui/briefing-view.js';
import { rendereBerichtFormular } from './ui/bericht-view.js';
import { rendereInfoVorschlaege } from './ui/infodist-view.js';
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
let settings = speicher.lade('einstellungen', {
  heimat: { name: 'Heimatbüro', pos: { x: -8, y: 10 } },
  altStartorte: [{ name: 'Büro Ost', pos: { x: 46, y: 2 } }, { name: 'Büro Süd', pos: { x: 2, y: 46 } }],
  bev: false,
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: ['Hilton Honors'] },
});
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
    haendler, hotels, settings,
    routing: kontext().routing,
    startMontag: nextMondayIso(),
    anzahlWochen: 4,
  });
  speicher.speichere('plan', plan);
  zeichnen();
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
    onMove: (haendlerId, w, t) => {
      const quelleWoche = plan.wochen.findIndex((x) =>
        x.tage.some((y) => (y.termine ?? []).some((z) => z.haendlerId === haendlerId)));
      const quelle = plan.wochen[quelleWoche].tage.find((y) =>
        (y.termine ?? []).some((z) => z.haendlerId === haendlerId));
      const i = quelle.termine.findIndex((z) => z.haendlerId === haendlerId);
      const [termin] = quelle.termine.splice(i, 1);
      plan.wochen[w].tage[t].termine.push(termin);
      plan = frischauf(plan, kontext());
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
  const akte = id && ladeAkte(wissensbasis, id);
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

async function starten() {
  [haendler, hotels, wissensbasis, bausteine, scorecard, postfach, themenAnhaenge] = await Promise.all([
    fetch('daten/haendler-demo.json').then((r) => r.json()),
    fetch('daten/hotels-demo.json').then((r) => r.json()),
    fetch('daten/wissensbasis.json').then((r) => r.json()),
    fetch('daten/kampagnen-bausteine.json').then((r) => r.json()),
    fetch('daten/scorecard-demo.json').then((r) => r.json()),
    fetch('daten/postfach-demo.json').then((r) => r.json()),
    fetch('daten/themen-anhaenge.json').then((r) => r.json()),
  ]);
  wissensbasis = speicher.lade('wissensbasis', wissensbasis);
  rendereEinstellungen(document.getElementById('einstellungen'), settings, {
    onSpeichern: (neu) => { settings = neu; speicher.speichere('einstellungen', settings); neuPlanen(); },
  });
  plan = speicher.lade('plan', null);
  if (plan) zeichnen(); else neuPlanen();
  rendereBerichtFormular(document.getElementById('bericht'), berichtFreigeben);
  for (const tab of document.querySelectorAll('[role=tab]')) {
    tab.addEventListener('click', () => wechsleTab(tab.id.replace('tab-', '')));
  }
  document.getElementById('neuPlanen').addEventListener('click', neuPlanen);
  document.getElementById('exportJson').addEventListener('click', () => {
    const blob = new Blob([speicher.exportJson(plan)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routenplan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
}

starten();
