export function rendereBerichtFormular(container, onFreigeben) {
  container.innerHTML = `
    <section id="bericht">
      <h2>Bericht nach Termin</h2>
      <form id="berichtForm">
        <input name="haendlerId" placeholder="Marktnummer (z. B. DEU90ARN)"><br>
        <input name="datum" type="date"><br>
        <input name="teilnehmer" placeholder="Teilnehmer (Komma-getrennt)"><br>
        <textarea name="stichpunkte" placeholder="Stichpunkte"></textarea><br>
        <textarea name="themen" placeholder="Themen (Komma-getrennt)"></textarea><br>
        <textarea name="vereinbarungen" placeholder="Vereinbarungen (Komma-getrennt)"></textarea><br>
        <textarea name="aufgaben" placeholder="Aufgaben, pro Zeile: Titel | Verantwortlicher | Frist (JJJJ-MM-TT)"></textarea><br>
        <textarea name="offenePunkte" placeholder="Offene Punkte (Komma-getrennt)"></textarea><br>
        <input name="folgetermin" placeholder="Folgetermin (optional, z. B. 23.04.2026 13:00–14:00)"><br>
        <select name="kampagne">
          <option value="">— keine Kampagnen-Mail —</option>
          <option value="wkr">WKR-Programm</option>
          <option value="wischerdisplay">Wischerdisplay</option>
          <option value="schnittschutz">Windschutzscheiben</option>
          <option value="bremsen">Bremsen</option>
          <option value="ford-mobile">Ford Mobile</option>
        </select>
        <button>Bericht freigeben</button>
      </form>
      <div id="berichtErgebnis"></div>
    </section>`;
  document.getElementById('berichtForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target).entries());
    onFreigeben(f);
  });
}
