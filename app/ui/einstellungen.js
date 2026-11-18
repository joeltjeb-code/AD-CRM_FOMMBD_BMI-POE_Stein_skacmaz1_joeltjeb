// Reine Helper für die Einstellungs-UI (renderbar ohne DOM, testbar in node).
// OBG = Oberbetriebsgebiet; Werte D01–D12 im Marktnummern-Schema (ausgedacht).

export function obgOptionen() {
  return Array.from({ length: 12 }, (_, i) => {
    const wert = `D${String(i + 1).padStart(2, '0')}`;
    return { wert, label: wert };
  });
}

// PLZ-Hash → Position im Demo-Gitter (0–40), deterministisch je PLZ.
// Demo-Verfahren; in Phase 2 ersetzt der Import-Adapter echte PLZ-Zentren.
export function posAusPlz(plz) {
  const n = [...String(plz)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7);
  return { x: Math.round(((n % 400) / 10) * 10) / 10, y: Math.round(((Math.floor(n / 400)) * 10) % 400) / 10 };
}

export function heimatAusEingabe({ name, plz } = {}, fallback = {}) {
  const basis = {
    name: (name ?? '').trim() || fallback.name || 'Heimatbüro',
    plz: (plz ?? '').trim(),
    pos: fallback.pos ?? { x: -8, y: 10 },
  };
  if (basis.plz) basis.pos = posAusPlz(basis.plz);
  return basis;
}

export function rendereEinstellungen(container, settings, { onSpeichern, obgListe = obgOptionen() } = {}) {
  const optionen = obgListe.map((o) =>
    `<option value="${o.wert}" ${settings.obg === o.wert ? 'selected' : ''}>${o.label}</option>`).join('');
  container.innerHTML = `
    <fieldset>
      <legend>Einstellungen</legend>
      <div class="form-grid">
        <div class="form-feld">
          <label for="einst-obg">Gebiet</label>
          <select id="einst-obg" name="obg">${optionen}</select>
        </div>
        <div class="form-feld">
          <label for="einst-heimat">Heimatadresse</label>
          <input id="einst-heimat" name="heimatName" value="${settings.heimat?.name ?? ''}" placeholder="z. B. Heimatbüro Regensburg">
        </div>
        <div class="form-feld">
          <label for="einst-plz">PLZ (bestimmt die Position im Routenraster)</label>
          <input id="einst-plz" name="heimatPlz" value="${settings.heimat?.plz ?? ''}" placeholder="z. B. 93047" inputmode="numeric">
        </div>
        <div class="form-feld form-check">
          <label for="einst-bev">BEV-Fahrzeug</label>
          <input id="einst-bev" type="checkbox" name="bev" ${settings.bev ? 'checked' : ''}>
        </div>
        <div class="form-feld">
          <label for="einst-maxfahrt">Max. Fahrzeit zum ersten Termin (min)</label>
          <input id="einst-maxfahrt" type="number" name="maxFahrt" value="${settings.praferenzen?.maxFahrtErsterTerminMin ?? 60}" min="10" max="120">
        </div>
        <div class="form-feld form-aktion">
          <button type="button" name="speichern">Speichern &amp; neu planen</button>
        </div>
      </div>
    </fieldset>`;
  container.querySelector('[name=speichern]').addEventListener('click', () => {
    const form = {
      obg: container.querySelector('[name=obg]').value,
      heimatName: container.querySelector('[name=heimatName]').value,
      heimatPlz: container.querySelector('[name=heimatPlz]').value,
      bev: container.querySelector('[name=bev]').checked,
      maxFahrt: container.querySelector('[name=maxFahrt]').value,
    };
    onSpeichern(leseEinstellungen(settings, form));
  });
}

export function leseEinstellungen(alt, form) {  const maxFahrt = Number(form.maxFahrt);
  return {
    ...alt,
    obg: (form.obg ?? '').trim() || alt.obg,
    heimat: heimatAusEingabe({ name: form.heimatName, plz: form.heimatPlz }, alt.heimat ?? {}),
    bev: form.bev === true || form.bev === 'on' || form.bev === 'true',
    praferenzen: {
      ...alt.praferenzen,
      lieblingshotelIds: alt.praferenzen?.lieblingshotelIds ?? [],
      ...(Number.isFinite(maxFahrt) && form.maxFahrt !== '' && form.maxFahrt !== undefined
        ? { maxFahrtErsterTerminMin: maxFahrt }
        : {}),
    },
  };
}

// Abwesenheits-Toggles: ganze Woche und/oder einzeln Tage (Di–Fr) abwählen,
// optional mit Freitext-Grund (Urlaub / Lehrgang / Event). Verändert nur
// die Planung — keine Termine gehen verloren, sie wandern in aktive Tage.
export function rendereAbwesenheiten(container, plan, abw = {}, { onAendern } = {}) {
  const roh = { wochen: {}, tage: {}, gruende: {}, ...abw };
  const wochen = plan?.wochen ?? [];
  const wochenBlocks = wochen.map((woche, wi) => {
    const wk = `w${wi}`;
    const kombi = woche.abgewaehlt || Boolean(roh.wochen[wk]);
    const tageZeilen = [0, 1, 2, 3].map((ti) => {
      const tk = `${wk}-d${ti}`;
      const aus = kombi || Boolean(roh.tage[tk]);
      return `
        <div class="abw-tag">
          <label><input type="checkbox" data-key="${tk}" ${aus ? 'checked' : ''}>
            ${woche.tage?.[ti]?.tag ?? TAGE_KUERZEL[ti]}</label>
          <input class="abw-grund" data-grund="${tk}" placeholder="Grund (optional)" value="${roh.gruende[tk] ?? ''}"
            aria-label="Grund für ${woche.tage?.[ti]?.datum ?? ''}">
        </div>`;
    }).join('');
    return `
      <div class="abw-woche" data-w="${wi}">
        <div class="abw-kopf">
          <span class="abw-montag">Woche ab ${woche.montag}</span>
          <label class="abw-ganz"><input type="checkbox" data-key="${wk}" ${kombi ? 'checked' : ''}> komplett abgewählt</label>
        </div>
        <div class="abw-tage">${tageZeilen}</div>
      </div>`;
  }).join('');
  container.innerHTML = `
    <fieldset>
      <legend>Abwesenheiten</legend>
      <p class="eingang">Abgew&auml;hlte Tage und Wochen werden nicht beplant; die Termine wandern in die aktiven Tage der Folge.</p>
      ${wochenBlocks || '<p class="leer">Noch kein Plan vorhanden.</p>'}
      <button type="button" name="abwSpeichern">Abwesenheiten anwenden</button>
    </fieldset>`;

  container.querySelector('[name=abwSpeichern]').addEventListener('click', () => {
    onAendern?.(liesAbwesenheiten(container));
  });
}

export function liesAbwesenheiten(container) {
  const neu = { wochen: {}, tage: {}, gruende: {} };
  for (const cb of container.querySelectorAll('input[type=checkbox][data-key]')) {
    if (cb.checked) {
      if (cb.dataset.key.includes('-d')) neu.tage[cb.dataset.key] = true;
      else neu.wochen[cb.dataset.key] = true;
    }
  }
  for (const inp of container.querySelectorAll('input.abw-grund')) {
    const wert = inp.value.trim();
    if (wert) neu.gruende[inp.dataset.grund] = wert;
  }
  return neu;
}

const TAGE_KUERZEL = ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
