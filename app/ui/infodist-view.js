export function rendereInfoVorschlaege(container, vorschlaege, onSenden) {
  container.innerHTML = `
    <section id="infodist">
      <h2 class="abschnitt">Info-Verteilung</h2>
      <p class="eingang">Vorschl&auml;ge aus dem Postfach &ndash; Sie entscheiden, was der H&auml;ndler bekommt. Es wird nichts automatisch gesendet.</p>
      ${vorschlaege.map((v) => `
      <div class="karte">
        <h3>${v.mailId}</h3>
        <p>${v.begruendung}</p>
        <button class="aktion neben versand" data-mail="${v.mailId}">Als gesendet markieren</button>
      </div>`).join('') || '<p class="leer">Keine Vorschl&auml;ge f&uuml;r diesen H&auml;ndler.</p>'}
    </section>`;
  container.querySelectorAll('button.versand').forEach((b) => {
    b.addEventListener('click', () => onSenden(b.dataset.mail));
  });
}
