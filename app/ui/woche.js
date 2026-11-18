import { farbeFuer } from '../wissensbasis/farbcodierung.js';
import { kachelLabel } from './kachel-label.js';

export function renderePlanraster(container, plan, { onMove, onBefehl, onWaehl, haendlerVerlauf = {}, haendlerNamen = {}, heute }) {
  const teile = [];
  plan.wochen.forEach((woche, wi) => {
    teile.push(`<h2>Woche ab ${woche.montag}</h2><div class="woche" data-woche="${wi}">`);
    woche.tage.forEach((tag, ti) => {
      teile.push(`<section class="tag ${tag.ok ? '' : 'fehler'}" data-woche="${wi}" data-tag="${ti}">
        <h3>${tag.tag} (${tag.datum})${tag.ok ? '' : ` – ${tag.grund ?? 'ungültig'}`}</h3>
        <ul>${(tag.termine ?? []).map((x, si) =>
          `<li draggable="true" class="farbe-${farbeFuer(haendlerVerlauf[x.haendlerId] ?? null, heute)}" data-id="${x.haendlerId}" data-woche="${wi}" data-tag="${ti}" data-slot="${si}">
             ${x.start}–${x.ende} ${kachelLabel(haendlerNamen[x.haendlerId], x.haendlerId)}</li>`).join('')}
        ${tag.leer ? '<li class="leer">kein Auftrag</li>' : ''}
        </ul>
        <p>Übernachtung: ${tag.uebernachtung?.art === 'hotel'
            ? `Hotel (${tag.uebernachtung.hotelName ?? ''})` : 'Heimfahrt'}</p>
        <p class="startort">Start: ${tag.startortName}</p>
      </section>`);
    });
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
