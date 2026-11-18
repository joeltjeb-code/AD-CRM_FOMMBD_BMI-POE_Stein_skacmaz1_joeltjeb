export function rendereBriefing(container, briefing, schnellblatt) {
  container.innerHTML = `
    <section id="briefing">
      <h2 class="abschnitt">Briefing &ndash; ${briefing.anrede}</h2>
      <div class="karte">
        <h3>Kennzahlen</h3>
        <ul>${briefing.kpiBlock.map((k) => `<li><b>${k.titel}:</b> ${k.wert}</li>`).join('')}</ul>
      </div>
      <div class="karte">
        <h3>Pflichthemen heute</h3>
        <ul>${briefing.pflichthemen.map((t) => `<li>${t.titel} <i>(${t.begruendung})</i></li>`).join('')}</ul>
      </div>
      ${briefing.hinweise.length ? `<p class="hinweis">${briefing.hinweise.join(' &middot; ')}</p>` : ''}
      <div class="karte">
        <h3>Offene Ma&szlig;nahmen</h3>
        <ul>${briefing.massnahmen.map((m) => `<li>${m.titel} &ndash; ${m.verantwortlich} &ndash; Frist ${m.frist} (${m.status})</li>`).join('') || '<li>keine</li>'}</ul>
      </div>
      <div class="karte">
        <h3>Letzte Gespr&auml;che</h3>
        <ul>${briefing.letzteGespraeche.map((g) => `<li>${g.datum}: ${(g.themen ?? []).join(', ')}</li>`).join('')}</ul>
      </div>
      ${briefing.notizen.length ? `
      <div class="karte">
        <h3>Pers&ouml;nliche Notizen</h3>
        <ul>${briefing.notizen.map((n) => `<li>${n.datum}: ${n.text}</li>`).join('')}</ul>
      </div>` : ''}
      ${schnellblatt ? `
      <div class="karte">
        <h3>Performance Auswertung</h3>
        <ul>
          <li>STP: ${schnellblatt.stp.punkte} Punkte (${schnellblatt.stp.praemie})</li>
          <li>TVA: Stand ${schnellblatt.tva.letzterStand}</li>
          <li>ZA-Befreiung: ${schnellblatt.zaBefreiung.befreit ? 'ja' : 'nein'}</li>
        </ul>
      </div>` : ''}
    </section>`;
}
