import { importiere, csvZuZeilen } from '../adapter/import-adapter.js';

// Task 19 / K3: Datei-Auswahl im Plan-Kopf (unterhalb der Einstellungen).
// CSV/Excel-Export direkt, PDF über Mistral OCR. Vor dem Import gibt es eine
// Vorschau (erkannte Händler), danach Zusammenfassung + Warnungen. Importierte
// Händler gehen an die App (overwrite der Demo-Daten, via localStorage-Pfad).

export function rendereImport(container, { onUebernehmen, onReset } = {}) {
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
    <details id="importKasten">
      <summary>H&auml;ndlerdaten importieren (Betreuungsliste)</summary>
      <div class="leiste import-zeile">
        <input id="importDatei" type="file" accept=".csv,.txt,.pdf" aria-label="Datei w&auml;hlen">
        <button id="importStart" class="aktion neben" disabled>Import &amp; &Uuml;bernehmen</button>
        <button id="importReset" class="aktion neben">Demo-Daten zur&uuml;ck</button>
      </div>
      <p id="importVorschau" class="hilfe"></p>
      <div id="importErgebnis"></div>
    </details>`;

  const dateiFeld = container.querySelector('#importDatei');
  const startKnopf = container.querySelector('#importStart');
  const vorschau = container.querySelector('#importVorschau');
  const ergebnis = container.querySelector('#importErgebnis');
  let datei = null;

  vorschau.textContent = 'CSV/Excel-Export (.;-getrennt) oder PDF der Betreuungsliste wählen.';

  dateiFeld.addEventListener('change', async () => {
    datei = dateiFeld.files?.[0] ?? null;
    ergebnis.innerHTML = '';
    if (!datei) { startKnopf.disabled = true; vorschau.textContent = 'Keine Datei gewählt.'; return; }
    if (/\.(csv|txt)$/i.test(datei.name)) {
      const zeilen = csvZuZeilen(await leseText(datei));
      const gueltig = zeilen.filter((z) => /^DEU[0-9A-Z]{5}$/i.test((z.nummer ?? '').trim())).length;
      vorschau.textContent = `${datei.name}: ${zeilen.length} Zeilen gelesen, davon ${gueltig} mit gültiger Händlernummer.`;
      startKnopf.disabled = gueltig === 0;
    } else {
      vorschau.textContent = `${datei.name}: PDF erkannt — wird beim Import per Mistral OCR gelesen (Key nötig).`;
      startKnopf.disabled = false;
    }
  });

  startKnopf.addEventListener('click', async () => {
    ergebnis.textContent = 'Import läuft …';
    try {
      const r = /\.(csv|txt)$/i.test(datei.name)
        ? await importiere({ csv: await leseText(datei) })
        : await importiere({ pdfBytes: new Uint8Array(await datei.arrayBuffer()) },
            { apiKey: globalThis.ASSISTENT_KONFIG?.mistralApiKey ?? '' });
      if (!r.ok) {
        ergebnis.innerHTML = `<p class="import-fehler">Import nicht möglich: ${r.begruendung}</p>`;
        return;
      }
      ergebnis.innerHTML = `
        <p><b>${r.zusammenfassung}</b> (Quelle: ${r.quelle})</p>
        ${r.warnungen.length ? `<p class="import-fehler">Hinweise: ${r.warnungen.slice(0, 5).join(' · ')}${r.warnungen.length > 5 ? ' …' : ''}</p>` : ''}
        <p class="hilfe">Händler übernehmen und Plan neu rechnen?</p>`;
      onUebernehmen?.(r.haendler);
    } catch (e) {
      ergebnis.innerHTML = `<p class="import-fehler">Unerwarteter Fehler: ${e?.message ?? e}</p>`;
    }
  });

  container.querySelector('#importReset').addEventListener('click', () => {
    ergebnis.innerHTML = '';
    vorschau.textContent = 'Demo-Daten werden wiederhergestellt.';
    startKnopf.disabled = true;
    dateiFeld.value = '';
    onReset?.();
  });
}
