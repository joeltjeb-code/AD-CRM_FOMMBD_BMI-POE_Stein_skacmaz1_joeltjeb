import { normaleHndEingabe, folgeterminString, sammleTeilnehmer, teilnehmerVorschlaege } from '../bericht/formular-helfer.js';

// Berichts-Formular in drei klaren Blöcken: Wer & Wann, Was war, Nächste
// Schritte. Händlernummer als Maske [DEU][#####] (5 Zeichen, immer Caps),
// Folgetermin über Datum/Uhrzeit-Masken, Teilnehmer mit Vorschlägem beim
// Tippen. „Kampagnen-Mail" heißt jetzt „Fokuspunkt Vorlage".
export function rendereBerichtFormular(container, onFreigeben, { onWaehl, wissensbasis, initialHaendlerId } = {}) {
  const teilnehmerQuelle = sammleTeilnehmer(wissensbasis);
  const initial = initialHaendlerId ? normaleHndEingabe(initialHaendlerId).replace(/^DEU/, '') : '';
  container.innerHTML = `
    <section id="bericht">
      <h2 class="abschnitt">Bericht nach dem Termin</h2>
      <p class="eingang">Stichpunkte und Eckdaten erfassen &ndash; der Assistent macht daraus einen fertigen Bericht mit Mail-Entwurf.</p>
      <form id="berichtForm">

        <div class="bericht-block">
          <h3>Wer &amp; wann</h3>
          <div class="forderung">
            <label for="feld-haendler">H&auml;ndlernummer</label>
            <div class="hnd-maske">
              <span class="hnd-praefix">DEU</span>
              <input id="feld-haendler" name="haendlerKurz" maxlength="5" placeholder="1M203"
                autocomplete="off" autocapitalize="characters" spellcheck="false" value="${initial}">
            </div>
            <p class="hilfe">Pr&auml;fix DEU ist vorgegeben &ndash; nur die 5 Zeichen dahinter erg&auml;nzen.</p>
          </div>
          <div class="forderung">
            <label for="feld-datum">Datum des Termins</label>
            <input id="feld-datum" name="datum" type="date">
          </div>
          <div class="forderung">
            <label for="feld-teilnehmer">Teilnehmer</label>
            <input id="feld-teilnehmer" name="teilnehmer" autocomplete="off" placeholder="Namen eintippen &ndash; Vorschl&auml;ge kommen beim Tippen">
            <div id="teilnehmerVorschlaege" class="tipp-liste" hidden></div>
            <p class="hilfe">Mehrere Namen mit Komma trennen.</p>
          </div>
        </div>

        <div class="bericht-block">
          <h3>Was war</h3>
          <div class="forderung">
            <label for="feld-stichpunkte">Stichpunkte zum Gespr&auml;ch</label>
            <textarea id="feld-stichpunkte" name="stichpunkte" placeholder="Kurze Notizen &ndash; Reihenfolge egal"></textarea>
          </div>
          <div class="forderung">
            <label for="feld-themen">Behandelte Themen</label>
            <textarea id="feld-themen" name="themen" placeholder="z. B. Wischer, AKF&plusmn; &ndash; mit Komma trennen"></textarea>
          </div>
          <div class="forderung">
            <label for="feld-vereinbarungen">Vereinbarungen</label>
            <textarea id="feld-vereinbarungen" name="vereinbarungen" placeholder="Was wurde verbindlich zugesagt?"></textarea>
          </div>
        </div>

        <div class="bericht-block">
          <h3>N&auml;chste Schritte</h3>
          <div class="forderung">
            <label for="feld-aufgaben">Aufgaben</label>
            <textarea id="feld-aufgaben" name="aufgaben" placeholder="Pro Zeile: Titel | Verantwortlicher | Frist (JJJJ-MM-TT)"></textarea>
          </div>
          <div class="forderung">
            <label for="feld-offen">Offene Punkte</label>
            <textarea id="feld-offen" name="offenePunkte" placeholder="Was bleibt ungel&ouml;st? &ndash; mit Komma trennen"></textarea>
          </div>
          <div class="forderung">
            <label for="feld-folgetermin">Folgetermin (optional)</label>
            <div class="folge-maske">
              <input id="feld-folge-datum" name="folgeDatum" type="date" aria-label="Datum des Folgetermins">
              <input id="feld-folge-start" name="folgeStart" type="time" aria-label="Beginn">
              <input id="feld-folge-ende" name="folgeEnde" type="time" aria-label="Ende (optional)">
            </div>
            <p class="hilfe">Datum und Uhrzeit w&auml;hlen &ndash; Ende optional.</p>
          </div>
          <div class="forderung">
            <label for="feld-kampagne">Fokuspunkt Vorlage</label>
            <select id="feld-kampagne" name="kampagne">
              <option value="">&ndash; keine Vorlage &ndash;</option>
              <option value="wkr">WKR-Programm</option>
              <option value="wischerdisplay">Wischerdisplay</option>
              <option value="schnittschutz">Windschutzscheiben</option>
              <option value="bremsen">Bremsen</option>
              <option value="ford-mobile">Ford Mobile</option>
            </select>
            <p class="hilfe">Vorlage f&uuml;r den Mail-Entwurf an den H&auml;ndler.</p>
          </div>
        </div>

        <p><button class="aktion">Bericht freigeben</button></p>
      </form>
      <div id="berichtErgebnis"></div>
    </section>`;

  const formular = container.querySelector('#berichtForm');
  const kurzFeld = container.querySelector('#feld-haendler');

  // Händlernummer: immer Caps, und bei gültiger Nummer wird dieser Händler
  // global selektiert (Nav-Chip, Briefing, Infos).
  kurzFeld.addEventListener('input', () => {
    kurzFeld.value = kurzFeld.value.toUpperCase();
  });
  kurzFeld.addEventListener('change', () => {
    const voll = normaleHndEingabe(kurzFeld.value);
    if (voll && onWaehl) onWaehl(voll);
  });

  // Teilnehmer-Vorschläge beim Tippen
  const tFeld = container.querySelector('#feld-teilnehmer');
  const tListe = container.querySelector('#teilnehmerVorschlaege');
  tFeld.addEventListener('input', () => {
    const teile = tFeld.value.split(',');
    const tippt = teile[teile.length - 1];
    const traege = teilnehmerVorschlaege(teilnehmerQuelle, tippt);
    tListe.innerHTML = traege.map((n) =>
      `<button type="button" class="tipp" data-name="${n}">${n}</button>`).join('');
    tListe.hidden = traege.length === 0;
  });
  tListe.addEventListener('click', (e) => {
    const b = e.target.closest('button.tipp');
    if (!b) return;
    const teile = tFeld.value.split(',');
    teile[teile.length - 1] = b.dataset.name;
    tFeld.value = `${teile.join(', ')}, `;
    tListe.hidden = true;
    tFeld.focus();
  });

  formular.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target).entries());
    onFreigeben({
      ...f,
      haendlerId: normaleHndEingabe(f.haendlerKurz),
      folgetermin: folgeterminString(f.folgeDatum, f.folgeStart, f.folgeEnde) || '',
    });
  });
}
