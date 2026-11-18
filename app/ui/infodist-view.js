export function rendereInfoVorschlaege(container, vorschlaege, onSenden) {
  container.innerHTML = `
    <section id="infodist">
      <h2>Info-Verteilung (Vorschläge, kein Auto-Versand)</h2>
      <ul>${vorschlaege.map((v) => `<li data-mail="${v.mailId}">
        <b>${v.mailId}</b> – ${v.begruendung}
        <button class="versand">Als gesendet markieren</button></li>`).join('') || '<li>keine Vorschläge</li>'}</ul>
    </section>`;
  container.querySelectorAll('button.versand').forEach((b) => {
    b.addEventListener('click', () => onSenden(b.closest('li').dataset.mail));
  });
}
