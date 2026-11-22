import { importiere, csvTabelle, schlageZuordnung, baueHaendler } from '../adapter/import-adapter.js';

// Task 19 / K3 + Nutzerwunsch 22.11.: Import-Seite „Stammdaten – Manueller
// Import" (erreichbar über das Stammdaten-Menü). Ablauf: Datei wählen ->
// KI schlägt die Spalten-Zuordnung vor -> Vorschau der ersten 10 Zeilen,
// je Spalte ein Dropdown zum Ändern -> Übernehmen. CSV/Excel-Export direkt,
// PDF über Mistral OCR. Importierte Händler gehen an die App (ersetzen die
// geladene Basis, via localStorage-Pfad). „Zurücksetzen" fragt nur an — die
// Lösch-Entscheidung trifft das Modal (onResetFordern).

const ZIELE = [
  ['nummer', 'Händlernummer'],
  ['name', 'Händlername'],
  ['strasse', 'Straße'],
  ['plz', 'PLZ'],
  ['ort', 'Ort'],
  ['obg', 'OBG (Gebiet)'],
  ['kategorie', 'Händlerkategorie'],
  ['betreuung', 'Betreuung'],
  ['betreuungKategorie', 'Betreuungskategorie'],
  ['region', 'Region'],
  ['gf1', 'GF1'],
];

export function rendereImport(container, { onUebernehmen, onResetFordern, basis = 'real' } = {}) {
  function leseText(datei) {
    // FileReader funktioniert überall (Browser und jsdom); text() wäre der
    // moderne Pfad, ist aber nicht in allen Kontexten vorhanden.
    return new Promise((loese, abbruch) => {
      const leser = new container.ownerDocument.defaultView.FileReader();
      leser.onload = () => loese(String(leser.result));
      leser.onerror = () => abbruch(leser.error);
      leser.readAsText(datei);
    });
  }

  container.innerHTML = `
    <section class="import-flaeche" aria-label="Betreuungsliste importieren">
      <p class="hilfe" id="importBasisHinweis"></p>
      <div class="leiste">
        <input id="importDatei" type="file" accept=".csv,.txt,.pdf" aria-label="Datei w&auml;hlen">
        <button id="importStart" class="aktion neben" disabled>Import &amp; &Uuml;bernehmen</button>
        <button id="importReset" class="aktion neben">Zur&uuml;cksetzen</button>
      </div>
      <p id="importVorschau" class="hilfe"></p>
      <div id="importZuordnung" hidden></div>
      <div id="importErgebnis"></div>
    </section>`;

  const dateiFeld = container.querySelector('#importDatei');
  const startKnopf = container.querySelector('#importStart');
  const vorschau = container.querySelector('#importVorschau');
  const zuordnungBlock = container.querySelector('#importZuordnung');
  const ergebnis = container.querySelector('#importErgebnis');
  const basisHinweis = container.querySelector('#importBasisHinweis');

  basisHinweis.textContent = basis === 'real'
    ? 'Grundlage: importierte Betreuungsliste aus dem Repo (daten/haendler.json).'
    : 'Grundlage: Demo-Daten (720 Händler) — es liegt noch keine importierte Liste im Repo.';

  let datei = null;
  let tabelle = { spalten: [], zeilen: [] };
  let zuordnung = {};

  const zellText = (s) => String(s ?? '')
    .replace(/[<>&]/g, (z) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[z]));

  function zeigeZuordnung() {
    if (!tabelle.spalten.length) { zuordnungBlock.hidden = true; return; }
    const schluessel = Object.keys(zuordnung).filter((s) => zuordnung[s]);
    const zeilen = tabelle.zeilen.slice(0, 10);
    const mappingLeiste = tabelle.spalten.map((s) => `
      <div class="import-mapping">
        <label for="map-${zellText(s)}">${zellText(s)}</label>
        <select id="map-${zellText(s)}" data-spalte="${zellText(s)}">
          <option value="">— ignorieren —</option>
          ${ZIELE.map(([w, l]) => `<option value="${w}"${zuordnung[s] === w ? ' selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>`).join('');
    const kopf = schluessel.map((s) => `<th>${ZIELE.find(([w]) => w === zuordnung[s])?.[1] ?? zellText(s)}</th>`).join('');
    const koerper = zeilen.map((z) => `<tr>${schluessel.map((s) => `<td>${zellText(z[s])}</td>`).join('')}</tr>`).join('');
    zuordnungBlock.innerHTML = `
      <p class="hilfe">Spalten-Zuordnung prüfen und bei Bedarf ändern (Vorschlag: KI/Regeln):</p>
      <div class="import-mappings">${mappingLeiste}</div>
      <table class="import-preview"><thead><tr>${kopf}</tr></thead><tbody>${koerper}</tbody></table>
      <p class="hilfe">Zeigt die ersten ${zeilen.length} von ${tabelle.zeilen.length} Zeilen.</p>`;
    zuordnungBlock.hidden = false;
    zuordnungBlock.querySelectorAll('select').forEach((s) => {
      s.addEventListener('change', () => {
        const spalte = s.dataset.spalte;
        // jsdom-Entitäten zurück auf den Original-Titel
        const original = tabelle.spalten.find((x) => zellText(x) === spalte);
        if (original) zuordnung[original] = s.value || null;
        zeigeZuordnung();
      });
    });
  }

  function fertigeZuordnung(resultat) {
    zuordnung = { ...resultat.zuordnung };
    zeigeZuordnung();
    const benutzt = Object.values(zuordnung).filter(Boolean).length;
    vorschau.textContent = `${tabelle.zeilen.length} Zeilen erkannt; ${benutzt} Spalten zugeordnet`
      + (resultat.quelle === 'llm' ? ' (KI-Vorschlag).' : resultat.hinweis ? ` (${resultat.hinweis}).` : ' (Regel-Vorschlag, kein KI-Key gesetzt).');
    startKnopf.disabled = !benutzt || !Object.entries(zuordnung).some(([, z]) => z === 'nummer');
  }

  dateiFeld.addEventListener('change', async () => {
    datei = dateiFeld.files?.[0] ?? null;
    ergebnis.innerHTML = '';
    zuordnungBlock.hidden = true;
    if (!datei) { startKnopf.disabled = true; vorschau.textContent = 'Keine Datei gewählt.'; return; }
    if (/\.(csv|txt)$/i.test(datei.name)) {
      const apiKey = globalThis.ASSISTENT_KONFIG?.mistralApiKey ?? '';
      tabelle = csvTabelle(await leseText(datei));
      if (!tabelle.spalten.length) {
        vorschau.textContent = 'Keine Händlerliste erkannt — es fehlt eine Spalte mit Händlernummer.';
        startKnopf.disabled = true;
        return;
      }
      const resultat = await schlageZuordnung(tabelle.spalten, { apiKey });
      fertigeZuordnung(resultat);
    } else {
      tabelle = { spalten: [], zeilen: [] };
      vorschau.textContent = `${datei.name}: PDF erkannt — wird beim Import per Mistral OCR gelesen (Key nötig).`;
      startKnopf.disabled = false;
    }
  });

  startKnopf.addEventListener('click', async () => {
    ergebnis.textContent = 'Import läuft …';
    try {
      let r;
      if (/\.(csv|txt)$/i.test(datei.name)) {
        const { haendler, warnungen, verworfen } = baueHaendler(tabelle.zeilen, { zuordnung });
        r = { ok: true, quelle: 'csv', haendler, warnungen, verworfen,
          zusammenfassung: `${haendler.length} Händler importiert, ${verworfen} verworfen` };
      } else {
        r = await importiere({ pdfBytes: new Uint8Array(await datei.arrayBuffer()) },
          { apiKey: globalThis.ASSISTENT_KONFIG?.mistralApiKey ?? '' });
      }
      if (!r.ok) {
        ergebnis.innerHTML = `<p class="import-fehler">Import nicht möglich: ${r.begruendung}</p>`;
        return;
      }
      ergebnis.innerHTML = `
        <p><b>${r.zusammenfassung}</b> (Quelle: ${r.quelle})</p>
        ${r.warnungen?.length ? `<p class="import-fehler">Hinweise: ${r.warnungen.slice(0, 5).join(' · ')}${r.warnungen.length > 5 ? ' …' : ''}</p>` : ''}`;
      onUebernehmen?.(r.haendler);
    } catch (e) {
      ergebnis.innerHTML = `<p class="import-fehler">Unerwarteter Fehler: ${e?.message ?? e}</p>`;
    }
  });

  container.querySelector('#importReset').addEventListener('click', () => {
    // Nur anfragen — das Bestätigungs-Modal (app.js) entscheidet über die Löschung.
    onResetFordern?.();
  });
}
