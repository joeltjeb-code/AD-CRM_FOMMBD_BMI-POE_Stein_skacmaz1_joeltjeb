import { farbeFuer } from '../wissensbasis/farbcodierung.js';
import { kachelLabel } from './kachel-label.js';
import { hndNummer, kalenderwoche } from './format.js';

export function renderePlanraster(container, plan, {
  onMove, onBefehl, onWaehl,
  haendlerVerlauf = {}, haendlerNamen = {}, heute, abwesenheiten = {},
}) {
  const gruende = abwesenheiten.gruende ?? {};
  const teile = [];
  plan.wochen.forEach((woche, wi) => {
    teile.push(`<h2>Woche ab ${woche.montag} <span class="kw">KW${String(kalenderwoche(woche.montag)).padStart(2, '0')}</span></h2><div class="woche" data-woche="${wi}">`);
    if (woche.abgewaehlt) {
      teile.push(`<section class="tag abgewaehlt" data-woche="${wi}" data-tag="-1" data-abgewaehlt="1">
        <h3>Ganze Woche abgew&auml;hlt${gruende[`w${wi}`] ? `: ${gruende[`w${wi}`]}` : ''} &ndash; keine Termine geplant</h3>
        <p class="startort">Urlaub, Lehrgang oder Event &ndash; im Kopf per Toggle abw&auml;hlbar</p>
      </section>`);
    } else {
      woche.tage.forEach((tag, ti) => {
        const tk = `w${wi}-d${ti}`;
        const kopf = tag.abgewaehlt
          ? `${tag.tag} (${tag.datum}) &ndash; abgew&auml;hlt${gruende[tk] ? `: ${gruende[tk]}` : ''}`
          : `${tag.tag} (${tag.datum})${tag.ok ? '' : ` &ndash; ${tag.grund ?? 'ung&uuml;ltig'}`}`;
        teile.push(`<section class="tag ${tag.ok ? '' : 'fehler'}${tag.abgewaehlt ? ' abgewaehlt' : ''}" data-woche="${wi}" data-tag="${ti}" ${tag.abgewaehlt ? 'data-abgewaehlt="1"' : ''}>
        <h3>${kopf}</h3>
        <ul>${(tag.termine ?? []).map((x, si) =>
          `<li draggable="${tag.abgewaehlt ? 'false' : 'true'}" class="farbe-${farbeFuer(haendlerVerlauf[x.haendlerId] ?? null, heute)}" data-id="${x.haendlerId}" data-woche="${wi}" data-tag="${ti}" data-slot="${si}">
             ${x.start}–${x.ende} ${kachelLabel(haendlerNamen[x.haendlerId], hndNummer(x.haendlerId))}</li>`).join('')}
        ${tag.leer ? `<li class="leer">${tag.abgewaehlt ? 'abgew&auml;hlt &ndash; kein Auftrag' : 'kein Auftrag'}</li>` : ''}
        </ul>
        ${tag.abgewaehlt ? '' : `<p>&Uuml;bernachtung: ${tag.uebernachtung?.art === 'hotel'
            ? `Hotel (${tag.uebernachtung.hotelName ?? ''})` : 'Heimfahrt'}</p>
        <p class="startort">Start: ${tag.startortName}</p>`}
      </section>`);
      });
    }
    teile.push('</div>');
  });
  teile.push(`
    <form id="befehlForm">
      <input name="befehl" placeholder="z. B. &uuml;bernachte am Mittwoch im Hotel" aria-label="Plan per Textbefehl anpassen">
      <button class="aktion">Anpassen</button>
      <span id="befehlMeldung" class="meldung" role="status"></span>
    </form>`);
  container.innerHTML = teile.join('');

  let gezogen = null;
  container.querySelectorAll('li[draggable]').forEach((li) => {
    li.addEventListener('dragstart', () => { gezogen = li; });
    li.addEventListener('click', () => onWaehl?.(li.dataset.id));
  });
  container.querySelectorAll('section.tag').forEach((section) => {
    if (section.dataset.abgewaehlt) return; // abgewählte Tage nehmen keine Termine auf
    section.addEventListener('dragover', (e) => e.preventDefault());
    section.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!gezogen) return;
      onMove(gezogen.dataset.id, Number(section.dataset.woche), Number(section.dataset.tag));
      gezogen = null;
    });
  });
  container.querySelector('#befehlForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = e.target.querySelector('[name=befehl]').value;
    onBefehl(text, e.target.querySelector('#befehlMeldung'));
  });
}
