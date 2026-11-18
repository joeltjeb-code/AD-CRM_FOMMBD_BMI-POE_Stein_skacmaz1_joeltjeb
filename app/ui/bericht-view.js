export function rendereBerichtFormular(container, onFreigeben) {
  container.innerHTML = `
    <section id="bericht">
      <h2 class="abschnitt">Bericht nach dem Termin</h2>
      <p class="eingang">Stichpunkte und Eckdaten erfassen &ndash; der Assistent macht daraus einen fertigen Bericht mit Mail-Entwurf.</p>
      <form id="berichtForm">
        <label for="feld-haendler">Marktnummer</label>
        <input id="feld-haendler" name="haendlerId" placeholder="z. B. DEU1M151">
        <label for="feld-datum">Datum</label>
        <input id="feld-datum" name="datum" type="date">
        <label for="feld-teilnehmer">Teilnehmer (Komma-getrennt)</label>
        <input id="feld-teilnehmer" name="teilnehmer" placeholder="z. B. Herr Mustermann, Frau Beispiel">
        <label for="feld-stichpunkte">Stichpunkte</label>
        <textarea id="feld-stichpunkte" name="stichpunkte"></textarea>
        <label for="feld-themen">Themen (Komma-getrennt)</label>
        <textarea id="feld-themen" name="themen"></textarea>
        <label for="feld-vereinbarungen">Vereinbarungen (Komma-getrennt)</label>
        <textarea id="feld-vereinbarungen" name="vereinbarungen"></textarea>
        <label for="feld-aufgaben">Aufgaben &ndash; pro Zeile: Titel | Verantwortlicher | Frist (JJJJ-MM-TT)</label>
        <textarea id="feld-aufgaben" name="aufgaben"></textarea>
        <label for="feld-offen">Offene Punkte (Komma-getrennt)</label>
        <textarea id="feld-offen" name="offenePunkte"></textarea>
        <label for="feld-folgetermin">Folgetermin (optional, z. B. 23.04.2026 13:00&ndash;14:00)</label>
        <input id="feld-folgetermin" name="folgetermin" placeholder="Folgetermin direkt vor Ort vereinbaren">
        <label for="feld-kampagne">Kampagnen-Mail</label>
        <select id="feld-kampagne" name="kampagne">
          <option value="">&ndash; keine Kampagnen-Mail &ndash;</option>
          <option value="wkr">WKR-Programm</option>
          <option value="wischerdisplay">Wischerdisplay</option>
          <option value="schnittschutz">Windschutzscheiben</option>
          <option value="bremsen">Bremsen</option>
          <option value="ford-mobile">Ford Mobile</option>
        </select>
        <p><button class="aktion">Bericht freigeben</button></p>
      </form>
      <div id="berichtErgebnis"></div>
    </section>`;
  document.getElementById('berichtForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target).entries());
    onFreigeben(f);
  });
}
