import { erstelleDemoRouting } from './adapter/routing-adapter.js';
import { erstelleSpeicher } from './adapter/speicher-adapter.js';
import { planeWochen, frischauf } from './planung/planer.js';
import { parseBefehl, wendeAn } from './planung/befehle.js';
import { renderePlanraster } from './ui/woche.js';
import { rendereEinstellungen } from './ui/einstellungen.js';

const speicher = erstelleSpeicher();

let haendler = [];
let hotels = [];
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
  renderePlanraster(document.getElementById('plan'), plan, {
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

async function starten() {
  [haendler, hotels] = await Promise.all([
    fetch('daten/haendler-demo.json').then((r) => r.json()),
    fetch('daten/hotels-demo.json').then((r) => r.json()),
  ]);
  rendereEinstellungen(document.getElementById('einstellungen'), settings, {
    onSpeichern: (neu) => { settings = neu; speicher.speichere('einstellungen', settings); neuPlanen(); },
  });
  plan = speicher.lade('plan', null);
  if (plan) zeichnen(); else neuPlanen();
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
