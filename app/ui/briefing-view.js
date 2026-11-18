export function rendereBriefing(container, briefing, schnellblatt) {
  container.innerHTML = `
    <section id="briefing">
      <h2>Briefing – ${briefing.anrede}</h2>
      <h3>KPI-Block</h3>
      <ul>${briefing.kpiBlock.map((k) => `<li><b>${k.titel}:</b> ${k.wert}</li>`).join('')}</ul>
      <h3>Pflichtthemen</h3>
      <ul>${briefing.pflichthemen.map((t) => `<li>${t.titel} <i>(${t.begruendung})</i></li>`).join('')}</ul>
      ${briefing.hinweise.length ? `<p class="hinweis">${briefing.hinweise.join(' · ')}</p>` : ''}
      <h3>Offene Maßnahmen</h3>
      <ul>${briefing.massnahmen.map((m) => `<li>${m.titel} – ${m.verantwortlich} – Frist ${m.frist} (${m.status})</li>`).join('') || '<li>keine</li>'}</ul>
      <h3>Letzte Gespräche</h3>
      <ul>${briefing.letzteGespraeche.map((g) => `<li>${g.datum}: ${(g.themen ?? []).join(', ')}</li>`).join('')}</ul>
      <h3>Persönliche Notizen</h3>
      <ul>${briefing.notizen.map((n) => `<li>${n.datum}: ${n.text}</li>`).join('')}</ul>
      ${schnellblatt ? `<h3>Auf dem Parkplatz</h3><ul>
        <li>STP: ${schnellblatt.stp.punkte} Punkte (${schnellblatt.stp.praemie})</li>
        <li>TVA: Stand ${schnellblatt.tva.letzterStand}</li>
        <li>ZA-Befreiung: ${schnellblatt.zaBefreiung.befreit ? 'ja' : 'nein'}</li></ul>` : ''}
    </section>`;
}
