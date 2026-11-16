# Routenplanung Außendienst-Assistent — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Außendienst-Assistent plant wochenweise (Di–Fr, je 3 Händler) Routen für mehrere Wochen im Voraus, die per Drag & Drop oder Textbefehl nachgebessert werden können.

**Architecture:** Plain HTML/JS mit ES-Modulen ohne Build-Schritt (Spec-Ansatz B). Planungslogik als reine DOM-freie Module unter `app/planung/`, Datenzugriff ausschließlich über vier Adapter-Typen unter `app/adapter/`, UI unter `app/ui/`.

**Tech Stack:** Vanilla JavaScript (ES2022), ES-Module, `node:test` als Test-Runner (Node ≥ 18), lokale JSON-Daten, statischer Server (python3) für die App-Vorschau.

**Spec:** `docs/superpowers/specs/2026-11-16-routenplanung-design.md`

## Global Constraints

- Kein Build-Schritt, kein Framework, keine externen Dienste/API-Keys (Spec Abschnitt 2.7, 3).
- Händlernummer ist der eindeutige Identifier aller händlerbezogenen Daten (Spec 2.1).
- Nur ausgedachte Daten (AGENTS.md, Spec 6).
- Tagesskelett: Abfahrt 08:00, erster Termin 08:30–09:00, letzter Terminstart ≤ 15:30 (konfigurierbar), Besuche 90/120 min, Fahrzeiten mit Staupuffer 6 min und BEV-Aufschlag 10 min/Leg (Spec 2.3).
- Kaskade Cluster → Fälligkeit → Prio (Spec 2.4); Kadenz Standard 85 Tage, Prio 40 Tage (Spec 2.2).
- Wochenplanung: Di–Fr, 12 Slots pro Woche, Standardhorizont 4 Wochen (Spec 2.2).
- Kein Netz-Verkehr in Unit-Tests; alle Logik-Tests deterministisch.

## File Structure

```
index.html                      App-Einstiegspunkt (UI-Shell)
app/
  app.js                        Verkabelung: State, Adapter, Re-Render
  adapter/
    routing-adapter.js          Demo-Routing aus Koordinaten + Puffer
    speicher-adapter.js         localStorage + JSON-Export/Import
  planung/
    cluster.js                  k-Means-artige Clusterbildung
    auswahl.js                  Fälligkeit/Prio-Sortierung + Wochenverteilung
    reihenfolge.js              Validierung + Bestreihenfolge eines Tages
    uebernachtung.js            Score Heimfahrt vs. Hotel
    befehle.js                  Textbefehl → Planänderung
    planer.js                   Orchestrator + Nachaktuulisierung
  ui/
    woche.js                    Wochenraster, Drag & Drop
    einstellungen.js            Einstellungsformular
tools/
  datengenerator.js             deterministische Demo-Daten (JSON)
daten/
  haendler-demo.json, hotels-demo.json   erzeugte Demodaten
tests/
  fixtures.js                   deterministische Testdaten (90 Händler)
  planung/*.test.js             je ein Testfile pro Logikmodul
```

---

### Task 1: Test-Fixtures und Demo-Routing-Adapter

**Files:**
- Create: `tests/fixtures.js`
- Create: `app/adapter/routing-adapter.js`
- Test: `tests/planung/routing.test.js`

**Interfaces:**
- Produces: `baueFixtures(): { haendler: Dealer[], settings: Settings }` — Dealer = `{ id, name, adresse, pos: {x, y}, cluster: 0..4, prio: boolean, dauer: 90|120, besuchVerlauf: string[] }` (ISO-Datum-Strings), Settings-Heimat = `{ name: 'Heimatbüro', pos: { x: -8, y: 10 } }`.
- Produces: `erstelleDemoRouting(opts): { fahrtKm(a, b): number, fahrzeitMin(a, b): number }`, `a`/`b` = `{x, y}`; Optionen `strassenfaktor=1.15, kmh=60, staupufferMin=6, bevAufschlagMin=0`.

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/routing.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';

test('baueFixtures liefert 90 Händler mit eindeutigen Marktnummern in 5 Clustern', () => {
  const { haendler } = baueFixtures();
  assert.equal(haendler.length, 90);
  assert.equal(new Set(haendler.map((h) => h.id)).size, 90);
  assert.deepEqual([...new Set(haendler.map((h) => h.cluster))].sort(), [0, 1, 2, 3, 4]);
  assert.ok(haendler.every((h) => h.dauer === 90 || h.dauer === 120));
  assert.ok(haendler.every((h) => typeof h.id === 'string' && h.id.startsWith('DEU')));
});

test(' Fahrzeit = km/kmh + Staupuffer, km mit Straßenfaktor', () => {
  const r = erstelleDemoRouting();
  // hypot(3,4) = 5 km Luftlinie, * 1.15 = 5.75 km, bei 60 kmh 5.75 min → aufrunden 6, + Staupuffer 6
  assert.equal(r.fahrtKm({ x: 0, y: 0 }, { x: 3, y: 4 }), 5.8);
  assert.equal(r.fahrzeitMin({ x: 0, y: 0 }, { x: 3, y: 4 }), 12);
});

test('BEV-Aufschlag wird pro Leg addiert', () => {
  const r = erstelleDemoRouting({ bevAufschlagMin: 10 });
  assert.equal(r.fahrzeitMin({ x: 0, y: 0 }, { x: 0, y: 0 }), 6 + 10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/routing.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// tests/fixtures.js
const NAMEN = [
  'Autohaus Bergmann', 'Kfz Sperl', 'Motorhaus Kraus', 'Wagenfeld & Co.'
];
const ZENTREN = [
  { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 20, y: 20 }
];

export function baueFixtures() {
  const haendler = [];
  let n = 0;
  ZENTREN.forEach((z, ci) => {
    for (let k = 0; k < 18; k++) {
      n++;
      haendler.push({
        id: `DEU${ci + 1}M${150 + n}`,
        name: `Autohaus ${NAMEN[n % NAMEN.length]} ${n}`,
        adresse: `Musterweg ${n}, Musterstadt`,
        pos: { x: z.x + (k % 5) * 1.4 + 0.3, y: z.y + Math.floor(k / 5) * 1.6 + 0.2 },
        cluster: ci,
        prio: n % 9 === 0,
        dauer: n % 6 === 0 ? 120 : 90,
        besuchVerlauf: n % 5 === 0 ? ['2026-10-01'] : ['2026-08-01'],
      });
    }
  });
  return {
    haendler,
    settings: { heimat: { name: 'Heimatbüro', pos: { x: -8, y: 10 } } },
  };
}
```

```js
// app/adapter/routing-adapter.js
export function erstelleDemoRouting(opts = {}) {
  const strassenfaktor = opts.strassenfaktor ?? 1.15;
  const kmh = opts.kmh ?? 60;
  const staupufferMin = opts.staupufferMin ?? 6;
  const bevAufschlagMin = opts.bevAufschlagMin ?? 0;
  const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * strassenfaktor;
  return {
    fahrtKm: (a, b) => Math.round(km(a, b) * 10) / 10,
    fahrzeitMin: (a, b) =>
      Math.ceil((km(a, b) / kmh) * 60) + staupufferMin + bevAufschlagMin,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/routing.test.js`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures.js app/adapter/routing-adapter.js tests/planung/routing.test.js
git commit -m "feat: Test-Fixtures und Demo-Routing-Adapter"
```

---

### Task 2: Clusterbildung

**Files:**
- Create: `app/planung/cluster.js`
- Test: `tests/planung/cluster.test.js`

**Interfaces:**
- Consumes: Dealer aus Task 1 (`h.pos`).
- Produces: `bildeCluster(haendler, anzahl = 5, iterationen = 20): number[]` — Clusterindex pro Händler, gleicher Index = gleicher Cluster.

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/cluster.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { bildeCluster } from '../../app/planung/cluster.js';

test('Fixture-Cluster bleiben zusammen und ergeben 5 Cluster', () => {
  const { haendler } = baueFixtures();
  const labels = bildeCluster(haendler, 5);
  assert.equal(new Set(labels).size, 5);
  for (let ci = 0; ci < 5; ci++) {
    const bereich = haendler
      .map((h, i) => ({ h, label: labels[i] }))
      .filter((e) => e.h.cluster === ci)
      .map((e) => e.label);
    assert.equal(new Set(bereich).size, 1, `Cluster ${ci} zerfiel`);
  }
});

test('Ergebnis ist deterministisch', () => {
  const { haendler } = baueFixtures();
  assert.deepEqual(bildeCluster(haendler, 5), bildeCluster(haendler, 5));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/cluster.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/cluster.js
// k-Means mit deterministischer Farthest-Point-Initialisierung.
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function naechstesZentrum(pos, zentren) {
  let best = 0;
  for (let i = 1; i < zentren.length; i++) {
    if (dist(pos, zentren[i]) < dist(pos, zentren[best])) best = i;
  }
  return best;
}

export function bildeCluster(haendler, anzahl = 5, iterationen = 20) {
  if (haendler.length === 0) return [];
  const zentren = [haendler[0].pos];
  while (zentren.length < Math.min(anzahl, haendler.length)) {
    let fern = haendler[0], fernD = -1;
    for (const h of haendler) {
      const d = Math.min(...zentren.map((z) => dist(h.pos, z)));
      if (d > fernD) { fernD = d; fern = h; }
    }
    zentren.push(fern.pos);
  }
  let labels = [];
  for (let it = 0; it < iterationen; it++) {
    labels = haendler.map((h) => naechstesZentrum(h.pos, zentren));
    for (let i = 0; i < zentren.length; i++) {
      const drin = haendler.filter((_, k) => labels[k] === i);
      if (drin.length === 0) continue;
      zentren[i] = {
        x: drin.reduce((s, h) => s + h.pos.x, 0) / drin.length,
        y: drin.reduce((s, h) => s + h.pos.y, 0) / drin.length,
      };
    }
  }
  return labels;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/cluster.test.js`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/cluster.js tests/planung/cluster.test.js
git commit -m "feat: Clusterbildung für Händlergebiete"
```

---

### Task 3: Fälligkeit, Prio-Sortierung, Wochenverteilung

**Files:**
- Create: `app/planung/auswahl.js`
- Test: `tests/planung/auswahl.test.js`

**Interfaces:**
- Consumes: Dealer aus Task 1 (`besuchVerlauf`, `prio`, `cluster`).
- Produces:
  - `tageSeitBesuch(h, heuteIso): number` — ohne Besuch: 9999
  - `istFaellig(h, heuteIso): boolean` — Standardkadenz 85 Tage, Prio 40
  - `faelligeKandidaten(haendler, heuteIso): Dealer[]` — sortiert: Fälligkeitsalter absteigend, dann Prio absteigend, dann id
  - `verteileAufWochen(kandidaten, anzahlWochen = 4, proWoche = 12): Dealer[][]` — füllt Wochen aus laufenden Clustern, damit eine Woche möglichst aus einem Teilgebiet kommt

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/auswahl.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import {
  tageSeitBesuch, istFaellig, faelligeKandidaten, verteileAufWochen,
} from '../../app/planung/auswahl.js';

const HEUTE = '2026-11-16';

test('tageSeitBesuch berechnet Tagesdifferenz, 9999 ohne Besuch', () => {
  const { haendler } = baueFixtures();
  assert.equal(tageSeitBesuch({ besuchVerlauf: ['2026-10-01'] }, HEUTE), 46);
  assert.equal(tageSeitBesuch({ besuchVerlauf: [] }, HEUTE), 9999);
});

test('Prio-Dealer ist früher fällig als Standard', () => {
  assert.equal(istFaellig({ besuchVerlauf: ['2026-10-01'], prio: false }, HEUTE), false); // 46 < 85
  assert.equal(istFaellig({ besuchVerlauf: ['2026-10-01'], prio: true }, HEUTE), true); // 46 >= 40
});

test('faelligeKandidaten: ältester Besuch zuerst, dann Prio, dann id', () => {
  const haendler = [
    { id: 'B', prio: false, besuchVerlauf: ['2026-08-01'] }, // 107 Tage
    { id: 'A', prio: true, besuchVerlauf: ['2026-10-01'] },  // 46 Tage, Prio
    { id: 'C', prio: true, besuchVerlauf: ['2026-09-01'] },  // 76 Tage, Prio
    { id: 'D', prio: false, besuchVerlauf: ['2026-10-20'] }, // 27 Tage: nicht fällig
  ];
  const k = faelligeKandidaten(haendler, HEUTE);
  assert.deepEqual(k.map((h) => h.id), ['B', 'C', 'A']);
});

test('verteileAufWochen: 12 pro Woche, Woche -> ein Cluster', () => {
  const { haendler } = baueFixtures();
  const wochen = verteileAufWochen(faelligeKandidaten(haendler, HEUTE), 4);
  assert.equal(wochen.length, 4);
  for (const w of wochen) {
    assert.equal(w.length, 12);
    assert.equal(new Set(w.map((h) => h.cluster)).size, 1);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/auswahl.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/auswahl.js
export const KADENZ = { standard: 85, prio: 40 };
export const PRO_WOCHE = 12;

const TAG_MS = 24 * 60 * 60 * 1000;
function tage(dIso) { return Date.parse(dIso + 'T00:00:00Z') / TAG_MS; }

export function tageSeitBesuch(h, heuteIso) {
  const v = h.besuchVerlauf || [];
  if (v.length === 0) return 9999;
  const letzter = v.reduce((a, b) => (b > a ? b : a));
  return Math.floor((tage(heuteIso) - tage(letzter)));
}

export function istFaellig(h, heuteIso) {
  return tageSeitBesuch(h, heuteIso) >= (h.prio ? KADENZ.prio : KADENZ.standard);
}

export function faelligeKandidaten(haendler, heuteIso) {
  return haendler
    .filter((h) => istFaellig(h, heuteIso))
    .map((h) => ({ ...h, faelligRang: tageSeitBesuch(h, heuteIso) }))
    .sort((a, b) =>
      b.faelligRang - a.faelligRang
      || (b.prio === true) - (a.prio === true)
      || a.id.localeCompare(b.id)
    ).map(({ faelligRang, ...h }) => h);
}

export function verteileAufWochen(kandidaten, anzahlWochen = 4, proWoche = PRO_WOCHE) {
  const rest = [...kandidaten];
  const wochen = [];
  for (let w = 0; w < anzahlWochen && rest.length > 0; w++) {
    const woche = [];
    while (rest.length > 0 && woche.length < proWoche) {
      const cluster = rest[0].cluster;
      while (rest.length > 0 && rest[0].cluster === cluster && woche.length < proWoche) {
        woche.push(rest.shift());
      }
    }
    wochen.push(woche);
  }
  return wochen;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/auswahl.test.js`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/auswahl.js tests/planung/auswahl.test.js
git commit -m "feat: Fälligkeit, Prio-Sortierung und Wochenverteilung"
```

---

### Task 4: Tagesplanung mit Tagesskelett-Validierung

**Files:**
- Create: `app/planung/reihenfolge.js`
- Test: `tests/planung/reihenfolge.test.js`

**Interfaces:**
- Consumes: `erstelleDemoRouting` (Task 1), Dealer (`pos`, `dauer`).
- Produces:
  - `SKELETT = { abfahrtMin: 480, fruehstartMin: 510, spaetstartMin: 540, letzterStartMin: 930 }`
  - `minZuUhr(min): 'HH:MM'` und `uhrZuMin('HH:MM'): number`
  - `validiereReihenfolge(dealerListe, start, routing, skelett): { ok, termine, fahrzeiten, grund? }` — behält die übergebene Reihenfolge; `termine = [{ haendlerId, startMin, endeMin, start, ende }]`, `fahrzeiten = [{ von, nach, min }]`
  - `planeTag(dealerListe, start, routing, skelett): { ok, termine, fahrzeiten, grund? }` — probiert alle 3!-Permutationen, wählt die mit kleinster Gesamt-Fahrzeit unter den zulässigen

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/reihenfolge.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { SKELETT, minZuUhr, uhrZuMin, validiereReihenfolge, planeTag } from '../../app/planung/reihenfolge.js';

const r = erstelleDemoRouting();

test('Uhrzeit-Helfer', () => {
  assert.equal(minZuUhr(510), '08:30');
  assert.equal(uhrZuMin('08:30'), 510);
});

test('Drei Händler desselben Clusters passen ins Tagesskelett', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3);
  const tag = planeTag(drei, { name: 'Heimat', pos: { x: 2, y: 1 } }, r);
  assert.equal(tag.ok, true);
  assert.equal(tag.termine.length, 3);
  const t1 = uhrZuMin(tag.termine[0].start);
  assert.ok(t1 >= SKELETT.fruehstartMin && t1 <= SKELETT.spaetstartMin);
  const t3 = uhrZuMin(tag.termine[2].start);
  assert.ok(t3 <= SKELETT.letzterStartMin);
});

test('Sehr weit entfernter Start sprengt das Skelett', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3);
  // Start ~100 km Luftlinie von Cluster 0 entfernt
  const tag = planeTag(drei, { name: 'Fern', pos: { x: 200, y: 200 } }, r);
  assert.equal(tag.ok, false);
  assert.match(tag.grund, /Skelett/);
});

test('validiereReihenfolge behält die gegebene Reihenfolge bei', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3).reverse();
  const res = validiereReihenfolge(drei, { name: 'X', pos: drei[0].pos }, r);
  assert.equal(res.ok, true);
  assert.deepEqual(res.termine.map((t) => t.haendlerId), drei.map((d) => d.id));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/reihenfolge.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/reihenfolge.js
export const SKELETT = {
  abfahrtMin: 480,      // Abfahrt 08:00
  fruehstartMin: 510,   // erster Termin ab 08:30
  spaetstartMin: 540,   // erster Termin spätestens 09:00
  letzterStartMin: 930, // letzter Termin startet spätestens 15:30
};

export function minZuUhr(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
export function uhrZuMin(uhr) {
  const [h, m] = uhr.split(':').map(Number);
  return h * 60 + m;
}

function berechne(liste, start, routing, skelett) {
  const fahrzeiten = [];
  const termine = [];
  let fahrt = routing.fahrzeitMin(start.pos, liste[0].pos);
  let t = Math.max(skelett.fruehstartMin, skelett.abfahrtMin + fahrt);
  if (t > skelett.spaetstartMin) return { ok: false, grund: 'Erster Termin später als ' + minZuUhr(skelett.spaetstartMin) };
  fahrzeiten.push({ von: start.name, nach: liste[0].id, min: fahrt });
  for (let i = 0; i < liste.length; i++) {
    const h = liste[i];
    const startMin = t;
    termine.push({ haendlerId: h.id, startMin, endeMin: startMin + h.dauer, start: minZuUhr(startMin), ende: minZuUhr(startMin + h.dauer) });
    if (i < liste.length - 1) {
      fahrt = routing.fahrzeitMin(h.pos, liste[i + 1].pos);
      fahrzeiten.push({ von: h.id, nach: liste[i + 1].id, min: fahrt });
      t = startMin + h.dauer + fahrt;
    }
  }
  if (termine[termine.length - 1].startMin > skelett.letzterStartMin) {
    return { ok: false, grund: 'Letzter Termin beginnt nach ' + minZuUhr(skelett.letzterStartMin) };
  }
  return { ok: true, termine, fahrzeiten };
}

export function validiereReihenfolge(dealerListe, start, routing, skelett = SKELETT) {
  if (dealerListe.length === 0) return { ok: true, termine: [], fahrzeiten: [] };
  return berechne(dealerListe, start, routing, skelett);
}

function permutationen(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutationen(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

export function planeTag(dealerListe, start, routing, skelett = SKELETT) {
  if (dealerListe.length === 0) return { ok: true, termine: [], fahrzeiten: [] };
  let best = null;
  for (const reihenfolge of permutationen(dealerListe)) {
    const res = berechne(reihenfolge, start, routing, skelett);
    if (!res.ok) continue;
    const fahrSumme = res.fahrzeiten.reduce((s, f) => s + f.min, 0);
    if (!best || fahrSumme < best._fahrSumme) best = { ...res, _fahrSumme: fahrSumme };
  }
  if (!best) return { ok: false, grund: 'Tagesskelett nicht einhaltbar für diese Kombination' };
  const { _fahrSumme, ...rest } = best;
  return rest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/reihenfolge.test.js`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/reihenfolge.js tests/planung/reihenfolge.test.js
git commit -m "feat: Tagesplanung mit Tagesskelett-Validierung"
```

---

### Task 5: Übernachtungs-Entscheidung

**Files:**
- Create: `app/planung/uebernachtung.js`
- Test: `tests/planung/uebernachtung.test.js`

**Interfaces:**
- Consumes: Routing (Task 1), Dealer (`pos`, `cluster`), Hotel-Daten.
- Produces: `entscheideUbernachtung({ letzterH: { pos, cluster }, ersterMorgen: Dealer | null, hotels: Hotel[], settings, routing }): { art: 'heim'|'hotel', fahrzeitHeim?, hotelId?, hotelName?, score? }`
  - Hotel = `{ id, name, ort, pos, region (Clusterindex), programme: string[], preisNacht: number }`
  - Präferenzen in settings: `praferenzen: { lieblingshotelIds: string[], maxFahrtErsterTerminMin: number, programme: string[] }`
  - Score Hotel = Fahrt(letzter→Hotel) + Fahrt(Hotel→ersterMorgen bzw. am Freitag Hotel→Heimat) − 30 (Lieblingshotel) − 10 je Programm-Match + Preis/10; Hotel verworfen, wenn Fahrt zum ersten Termin > `maxFahrtErsterTerminMin`
  - Score Heim = Fahrt(letzter→Heimat) + (ersterMorgen ? Fahrt(Heimat→ersterMorgen) : 0)

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/uebernachtung.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { entscheideUbernachtung } from '../../app/planung/uebernachtung.js';

const r = erstelleDemoRouting();
const HOTELS = [
  { id: 'H1', name: 'Hotel Klause', ort: 'Musterdorf', pos: { x: 1, y: 1 }, region: 0, programme: ['Hilton Honors'], preisNacht: 90 },
  { id: 'H2', name: 'Hotel Fern', ort: 'Anderswo', pos: { x: 30, y: 30 }, region: 0, programme: [], preisNacht: 80 },
];
const SETTINGS = {
  heimat: { name: 'Heimat', pos: { x: -8, y: 10 } },
  praferenzen: { lieblingshotelIds: ['H1'], maxFahrtErsterTerminMin: 60, programme: ['Hilton Honors'] },
};
const LETZTER = { pos: { x: 0, y: 0 }, cluster: 0 };
const ERSTER_MORGEN = { pos: { x: 2, y: 2 } };

test('Werktag: nahes Lieblingshotel schlägt Heimfahrt', () => {
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: HOTELS, settings: SETTINGS, routing: r });
  assert.equal(res.art, 'hotel');
  assert.equal(res.hotelId, 'H1');
});

test('Freitag: ohne morgigen Termin gewinnt die Heimfahrt bei kurzer Strecke', () => {
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: null, hotels: HOTELS, settings: SETTINGS, routing: r });
  assert.equal(res.art, 'heim');
  assert.ok(res.fahrzeitHeim > 0);
});

test('Hotel außerhalb der Präferenz-Entfernung wird nicht gewählt', () => {
  const s = { ...SETTINGS, praferenzen: { ...SETTINGS.praferenzen, maxFahrtErsterTerminMin: 1 } };
  const res = entscheideUbernachtung({ letzterH: LETZTER, ersterMorgen: ERSTER_MORGEN, hotels: HOTELS, settings: s, routing: r });
  assert.equal(res.art, 'heim');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/uebernachtung.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/uebernachtung.js
export function entscheideUbernachtung({ letzterH, ersterMorgen, hotels, settings, routing }) {
  const fahrtHeim = routing.fahrzeitMin(letzterH.pos, settings.heimat.pos);
  const heimScore = fahrtHeim + (ersterMorgen ? routing.fahrzeitMin(settings.heimat.pos, ersterMorgen.pos) : 0);

  let bestes = null;
  for (const ho of hotels.filter((x) => x.region === letzterH.cluster)) {
    const fAbend = routing.fahrzeitMin(letzterH.pos, ho.pos);
    const fMorgen = ersterMorgen
      ? routing.fahrzeitMin(ho.pos, ersterMorgen.pos)
      : routing.fahrzeitMin(ho.pos, settings.heimat.pos);
    if (ersterMorgen && fMorgen > settings.praferenzen.maxFahrtErsterTerminMin) continue;
    const lieblings = settings.praferenzen.lieblingshotelIds.includes(ho.id) ? -30 : 0;
    const programme = ho.programme.filter((p) => settings.praferenzen.programme.includes(p)).length * -10;
    const score = fAbend + fMorgen + lieblings + programme + (ho.preisNacht ? ho.preisNacht / 10 : 0);
    if (!bestes || score < bestes.score) bestes = { hotel: ho, score };
  }

  if (bestes && bestes.score < heimScore) {
    return { art: 'hotel', hotelId: bestes.hotel.id, hotelName: bestes.hotel.name, score: Math.round(bestes.score) };
  }
  return { art: 'heim', fahrzeitHeim };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/uebernachtung.test.js`
Expected: PASS (3 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/uebernachtung.js tests/planung/uebernachtung.test.js
git commit -m "feat: Übernachtungs-Entscheidung Heimat vs. Hotel"
```

---

### Task 6: Planer-Orchestrator

**Files:**
- Create: `app/planung/planer.js`
- Test: `tests/planung/planer.test.js`

**Interfaces:**
- Consumes: `bildeCluster` (Task 2), `faelligeKandidaten`/`verteileAufWochen`/`PRO_WOCHE` (Task 3), `planeTag`/`SKELETT` (Task 4), `entscheideUbernachtung` (Task 5).
- Produces:
  - `parseDatum('YYYY-MM-DD'): Date` (UTC), `datumZuString(Date): 'YYYY-MM-DD'`, `addTage(date, n)`
  - `planeWochen({ haendler, hotels, settings, routing, startMontag, anzahlWochen = 4 }): Plan`
  - Plan = `{ erstelltAm, wochen: [{ montag, tage: TagPlan[] }] }`, `TagPlan = { tag, datum, startortName, letzterStartMin, ok, grund?, termine, fahrzeiten, uebernachtung: { art, ... }, leer? }`
  - `frischauf(plan, settings, routing): Plan` — revalidiert Reihenfolge und Übernachtungen (nach Drag & Drop/Befehl), behält bestehende Reihenfolge bei

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/planer.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen, frischauf } from '../../app/planung/planer.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].flatMap((c) => [
  { id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, programme: [], preisNacht: 90 },
  { id: `H${c}b`, name: `Hotel ${c} B`, ort: 'Y', pos: { x: c * 40 + 3, y: c * 40 - 1 }, region: c, programme: [], preisNacht: 110 },
]);
const SETTINGS = {
  ...settings,
  bev: false,
  altStartorte: [],
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: [] },
};

test('planeWochen: 4 Wochen à 4 Tage mit je 3 Terminen für Di–Fr', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  assert.equal(plan.wochen.length, 4);
  assert.deepEqual(plan.wochen.map((w) => w.montag),
    ['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14']);
  for (const w of plan.wochen) {
    assert.equal(w.tage.length, 4);
    for (const t of w.tage) {
      assert.equal(t.termine.length, 3);
      assert.equal(t.ok, true);
      assert.ok(['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].includes(t.tag));
      assert.ok(t.uebernachtung);
      // Kein Termin überschreitet das Tagesskelett
      assert.ok(t.termine.every((x) => x.startMin <= (t.letzterStartMin ?? 930)));
    }
  }
});

test('frischauf erhält Reihenfolge und ValidationResult', () => {
  let plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const davor = plan.wochen[0].tage[0].termine.map((t) => t.haendlerId);
  plan = frischauf(plan, SETTINGS, r);
  assert.deepEqual(plan.wochen[0].tage[0].termine.map((t) => t.haendlerId), davor);
  assert.equal(plan.wochen[0].tage[0].ok, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/planer.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/planer.js
import { bildeCluster } from './cluster.js';
import { faelligeKandidaten, verteileAufWochen, PRO_WOCHE } from './auswahl.js';
import { planeTag, validiereReihenfolge } from './reihenfolge.js';
import { entscheideUbernachtung } from './uebernachtung.js';

export const TAGE_NAMEN = ['Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export function parseDatum(iso) { return new Date(iso + 'T00:00:00Z'); }
export function datumZuString(d) { return d.toISOString().slice(0, 10); }
export function addTage(d, n) { return new Date(d.getTime() + n * 24 * 60 * 60 * 1000); }

function dealerPos(haendler, id) { return haendler.find((h) => h.id === id); }

function werktag(d) { return d.getUTCDay(); }

function planesWochenEnsemble(liste, wocheStart, settings, routing, dealersById) {
  const tage = [];
  const startJedenTag = settings.heimat;
  for (let ti = 0; ti < 4; ti++) {
    const drei = liste.slice(ti * 3, ti * 3 + 3).map((h) => dealersById[h.id]);
    const basis = {
      tag: TAGE_NAMEN[ti],
      datum: datumZuString(addTage(wocheStart, ti + 1)),
      startortName: startJedenTag.name,
      letzterStartMin: undefined,
    };
    if (drei.length < 3) { tage.push({ ...basis, ok: true, termine: [], fahrzeiten: [], leer: true, uebernachtung: { art: 'heim' } }); continue; }
    const res = planeTag(drei, startJedenTag, routing);
    tage.push({ ...basis, ...res, uebernachtung: { art: 'heim' } });
  }
  // Übernachtungen streckweise bestimmen
  for (let ti = 0; ti < tage.length; ti++) {
    const t = tage[ti];
    if (t.leer) continue;
    const ersterMorgenT3 = tage[ti + 1] && !tage[ti + 1].leer
      ? dealersById[tage[ti + 1].termine[0].haendlerId]
      : null;
    t.uebernachtung = entscheideUbernachtung({
      letzterH: dealersById[t.termine[t.termine.length - 1].haendlerId],
      ersterMorgen: ersterMorgenT3,
      hotels, settings, routing,
    });
    if (werktag(parseDatum(t.datum)) === 5 && ersterMorgenT3 === null) {
      // Freitag ohne Folgetag: Heimfahrt am Wochenende bleibt Standard
      t.uebernachtung = { art: 'heim', fahrzeitHeim: routing.fahrzeitMin(dealersById[t.termine[2].haendlerId].pos, settings.heimat.pos) };
    }
  }
  return tage;
}

export function planeWochen({ haendler, hotels, settings, routing, startMontag, anzahlWochen = 4 }) {
  const labels = bildeCluster(haendler, 5);
  const mitCluster = haendler.map((h, i) => ({ ...h, cluster: h.cluster ?? labels[i] }));
  const dealersById = Object.fromEntries(mitCluster.map((h) => [h.id, h]));
  const kandidaten = faelligeKandidaten(mitCluster, startMontag);
  const wochen = verteileAufWochen(kandidaten, anzahlWochen, PRO_WOCHE);
  return {
    erstelltAm: new Date().toISOString(),
    wochen: wochen.map((liste, wi) => ({
      montag: datumZuString(addTage(parseDatum(startMontag), wi * 7)),
      tage: planesWochenEnsemble(liste, addTage(parseDatum(startMontag), wi * 7), settings, routing, dealersById),
    })),
  };
}

export function frischauf(plan, settings, routing) {
  // Reihenfolgen und Übernachtungen anhand der in den Tagen gespeicherten
  // Händlerreihenfolge neu validieren; Reihenfolge bleibt erhalten.
  for (const woche of plan.wochen) {
    for (let ti = 0; ti < woche.tage.length; ti++) {
      const t = woche.tage[ti];
      if (t.leer) continue;
    }
  }
  return plan;
}
```

**Achtung Implementierer:** `frischauf` ist absichtlich als Stump begonnen — er wird in Task 9 fertiggestellt, sobald der Kontext (`dealersById`, `hotels`) dazu bekannt ist. Trage dort den vollständigen Code nach; übernimm die unten angegebene Implementierung. Bis dahin genügt der Pass-Status der Tests, weil der Stump nur idempotent sein muss.

Wichtig für spätere Tasks — `frischauf` wird in Task 9 vollständig so implementiert (manuelle Übernachtungs-Vorgaben mit `vorgabe: true` übersteht Revalidierungen):

```js
export function frischauf(plan, kontext) {
  const { dealersById, settings, routing, hotels } = kontext;
  for (const woche of plan.wochen) {
    for (let ti = 0; ti < woche.tage.length; ti++) {
      const t = woche.tage[ti];
      if (t.leer) continue;
      const liste = t.termine.map((x) => dealersById[x.haendlerId]);
      const start = { name: t.startortName, pos: t.startortPos ?? settings.heimat.pos };
      const skelett = { ...SKELETT, letzterStartMin: t.letzterStartMin ?? SKELETT.letzterStartMin };
      const res = validiereReihenfolge(liste, start, routing, skelett);
      Object.assign(t, res, { leer: undefined });
      const folge = woche.tage[ti + 1];
      const ersterMorgen = folge && !folge.leer ? dealersById[folge.termine[0].haendlerId] : null;
      const letzter = liste[liste.length - 1];
      if (t.uebernachtung?.vorgabe) {
        if (t.uebernachtung.art === 'heim' && t.uebernachtung.fahrzeitHeim === undefined) {
          t.uebernachtung.fahrzeitHeim = routing.fahrzeitMin(letzter.pos, settings.heimat.pos);
        }
        continue; // manuelle Vorgabe bleibt stehen
      }
      t.uebernachtung = entscheideUbernachtung({ letzterH: letzter, ersterMorgen, hotels, settings, routing });
      if (!ersterMorgen) {
        // Freitag ohne Folgetag: Wochenend-Heimfahrt bleibt Standard
        t.uebernachtung = { art: 'heim', fahrzeitHeim: routing.fahrzeitMin(letzter.pos, settings.heimat.pos) };
      }
    }
  }
  return plan;
}
```

(Dazu wird `SKELETT` in `planer.js` importiert und re-exportiert. `planeWochen` baut das Grundgerüst und ruft am Ende einmal `frischauf(plan, kontext)` mit `kontext = { dealersById, settings, routing, hotels }` auf, damit Initialplan und spätere Updates denselben Pfad benutzen. Im Stump aus Task 6 steht noch die Signatur `(plan, settings, routing)` — der Test wird in Task 9 auf den Kontext umgestellt.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/planer.test.js`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/planer.js tests/planung/planer.test.js
git commit -m "feat: Planer-Orchestrator für Wochenplanung"
```

---

### Task 7: Speicher-Adapter

**Files:**
- Create: `app/adapter/speicher-adapter.js`
- Test: `tests/planung/speicher.test.js`

**Interfaces:**
- Produces: `erstelleSpeicher(storage): { lade(schluessel, fallback): any, speichere(schluessel, wert): void, exportJson(wert): string, importJson(text): any }` — `storage` = `{ getItem, setItem }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/speicher.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleSpeicher } from '../../app/adapter/speicher-adapter.js';

const map = new Map();
const stub = {
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, v),
};

test('lade/speichere runden über den Storage', () => {
  const s = erstelleSpeicher(stub);
  s.speichere('plan', { a: [1, 2] });
  assert.deepEqual(s.lade('plan'), { a: [1, 2] });
  assert.equal(s.lade('nix', 'fallback'), 'fallback');
});

test('exportJson/importJson runden', () => {
  const s = erstelleSpeicher(stub);
  const text = s.exportJson({ montag: '2026-11-23' });
  assert.deepEqual(s.importJson(text), { montag: '2026-11-23' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/speicher.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/adapter/speicher-adapter.js
export function erstelleSpeicher(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Kein Storage verfügbar');
  return {
    lade(schluessel, fallback = null) {
      const roh = storage.getItem(schluessel);
      return roh ? JSON.parse(roh) : fallback;
    },
    speichere(schluessel, wert) { storage.setItem(schluessel, JSON.stringify(wert)); },
    exportJson(wert) { return JSON.stringify(wert, null, 2); },
    importJson(text) { return JSON.parse(text); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/speicher.test.js`
Expected: PASS (2 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/adapter/speicher-adapter.js tests/planung/speicher.test.js
git commit -m "feat: Speicher-Adapter mit JSON-Export"
```

---

### Task 8: Text-Befehle

**Files:**
- Create: `app/planung/befehle.js`
- Test: `tests/planung/befehle.test.js`

**Interfaces:**
- Consumes: `frischauf`, `TAGE_NAMEN` (Task 6), `SKELETT` (Task 4).
- Produces:
  - `parseBefehl(text): Befehl` — erkannte Formen:
    - `verschiebe DEU1M151 auf Mittwoch` → `{ typ: 'verschiebe', haendlerId, zielTag: 'Mittwoch' }`
    - `übernachte am Mittwoch im Hotel` / `übernachte am Mittwoch zu Hause` → `{ typ: 'uebernachtung', tag, art: 'hotel'|'heim' }`
    - `Freitag früher beenden` → `{ typ: 'frueher', tag: 'Freitag', letzterStartMin: 810 }`
    - `starte Mittwoch vom Büro Ost` → `{ typ: 'startort', tag, name }`
    - sonst → `{ typ: 'unbekannt', text }`
  - `wendeAn(plan, befehl, kontext): { plan, meldung }` — `kontext = { dealersById, settings, routing, hotels }`; Verschiebe an das Ende des Zieltags (gleiche Woche wie die Quelle), beider Tage werden via `frischauf` revalidiert; unbekannter Händler/Tag → Meldung mit Fehler, Plan unverändert.

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/befehle.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { planeWochen } from '../../app/planung/planer.js';
import { parseBefehl, wendeAn } from '../../app/planung/befehle.js';

const { haendler, settings } = baueFixtures();
const r = erstelleDemoRouting();
const HOTELS = [0, 1, 2, 3, 4].flatMap((c) => [
  { id: `H${c}a`, name: `Hotel ${c} A`, ort: 'X', pos: { x: c * 40 + 2, y: c * 40 + 2 }, region: c, programme: [], preisNacht: 90 },
]);
const SETTINGS = { ...settings, bev: false, altStartorte: [{ name: 'Büro Ost', pos: { x: 46, y: 2 } }], praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: [] } };

function baueKontext(plan) {
  const dealersById = Object.fromEntries(haendler.map((h) => [h.id, h]));
  return { dealersById, settings: SETTINGS, routing: r, hotels: HOTELS };
}

test('parseBefehl erkennt Verschieben', () => {
  assert.deepEqual(parseBefehl('verschiebe DEU1M151 auf Mittwoch'),
    { typ: 'verschiebe', haendlerId: 'DEU1M151', zielTag: 'Mittwoch' });
});

test('parseBefehl erkennt Übernachtung und früher', () => {
  assert.deepEqual(parseBefehl('übernachte am Mittwoch im Hotel'), { typ: 'uebernachtung', tag: 'Mittwoch', art: 'hotel' });
  assert.deepEqual(parseBefehl('Freitag früher beenden'), { typ: 'frueher', tag: 'Freitag', letzterStartMin: 810 });
});

test('wendeAn verschiebt einen Termin und validiert neu', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const di = plan.wochen[0].tage.find((t) => t.tag === 'Dienstag');
  const id = di.termine[0].haendlerId;
  let { plan: p2, meldung } = wendeAn(plan, parseBefehl(`verschiebe ${id} auf Donnerstag`), baueKontext());
  assert.match(meldung, /verschoben/);
  const mi = p2.wochen[0].tage.find((t) => t.tag === 'Mittwoch');
  assert.ok(mi.termine[2].haendlerId === id || mi.termine.map((x) => x.haendlerId).includes(id));
  assert.ok(!mi.termine.map((x) => x.haendlerId).includes(undefined));
});

test('wendeAn mit unbekanntem Befehl ändert nichts', () => {
  const plan = planeWochen({ haendler, hotels: HOTELS, settings: SETTINGS, routing: r, startMontag: '2026-11-23' });
  const { plan: p2, meldung } = wendeAn(plan, parseBefehl('.xyz'), baueKontext());
  assert.deepEqual(p2, plan);
  assert.match(meldung, /nicht verstanden/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/befehle.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// app/planung/befehle.js
import { TAGE_NAMEN, frischauf } from './planer.js';

const TAG_ALIASE = {
  di: 'Dienstag', dienstag: 'Dienstag',
  mi: 'Mittwoch', mittwoch: 'Mittwoch',
  do: 'Donnerstag', donnerstag: 'Donnerstag',
  fr: 'Freitag', freitag: 'Freitag',
};

function tagZuName(wort) { return TAG_ALIASE[wort.toLowerCase().replace('ä', 'ae').replace('ü', 'ue')] ?? TAG_ALIASE[wort.toLowerCase()]; }

export function parseBefehl(text) {
  const t = text.trim();
  let m = t.match(/^verschiebe\s+(\S+)\s+auf\s+(\S+)$/i);
  if (m) return { typ: 'verschiebe', haendlerId: m[1], zielTag: tagZuName(m[2]) };
  m = t.match(/^übernachte\s+(?:am\s+)?(\S+)\s+im\s+hotel$/i);
  if (m) return { typ: 'uebernachtung', tag: tagZuName(m[1]), art: 'hotel' };
  m = t.match(/^übernachte\s+(?:am\s+)?(\S+)\s+(?:zu\s*hause|zu\s+hause|in\s+der\s+heimat)$/i);
  if (m) return { typ: 'uebernachtung', tag: tagZuName(m[1]), art: 'heim' };
  m = t.match(/^(dienstag|mittwoch|donnerstag|freitag)\s+fr(?:ü|ue)her\s+beenden$/i);
  if (m) return { typ: 'frueher', tag: tagZuName(m[1]), letzterStartMin: 810 }; // 13:30
  m = t.match(/^starte\s+(\S+)\s+vom\s+(.+)$/i);
  if (m) return { typ: 'startort', tag: tagZuName(m[1]), name: m[2].trim() };
  return { typ: 'unbekannt', text: t };
}

function tagIndex(name) { return TAGE_NAMEN.indexOf(name); }

export function wendeAn(plan, befehl, kontext) {
  if (befehl.typ === 'unbekannt') {
    return { plan, meldung: `Befehl nicht verstanden: "${befehl.text}"` };
  }
  const p = JSON.parse(JSON.stringify(plan)); // tiefe Kopie
  if (befehl.typ === 'verschiebe') {
    const ziel = tagIndex(befehl.zielTag);
    if (ziel < 0) return { plan, meldung: `Unbekannter Tag: ${befehl.zielTag}` };
    for (const woche of p.wochen) {
      for (const t of woche.tage) {
        const i = t.termine.findIndex((x) => x.haendlerId === befehl.haendlerId);
        if (i >= 0) {
          const [termin] = t.termine.splice(i, 1);
          woche.tage[ziel].termine.push(termin);
          frischauf(p, kontext);
          return { plan: p, meldung: `${befehl.haendlerId} nach ${befehl.zielTag} verschoben.` };
        }
      }
    }
    return { plan, meldung: `Händler ${befehl.haendlerId} nicht im Plan gefunden.` };
  }
  if (befehl.typ === 'uebernachtung') {
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag);
      if (t) {
        t.uebernachtung = befehl.art === 'hotel' ? { ...t.uebernachtung, art: 'hotel', vorgabe: true } : { art: 'heim', vorgabe: true };
        return { plan: p, meldung: `Übernachtung ${befehl.art === 'hotel' ? 'im Hotel' : 'zu Hause'} für ${befehl.tag} gesetzt.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  if (befehl.typ === 'frueher') {
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag);
      if (t) {
        t.letzterStartMin = befehl.letzterStartMin;
        frischauf(p, kontext);
        return { plan: p, meldung: `${befehl.tag}: letzter Terminstart auf 13:30 gesetzt.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  if (befehl.typ === 'startort') {
    const ort = kontext.settings.altStartorte.find((o) => o.name.toLowerCase().includes(befehl.name.toLowerCase()) || befehl.name.toLowerCase().includes(o.name.toLowerCase()));
    if (!ort) return { plan, meldung: `Startort "${befehl.name}" ist nicht hinterlegt.` };
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag);
      if (t) {
        t.startortName = ort.name;
        t.startortPos = ort.pos;
        frischauf(p, kontext);
        return { plan: p, meldung: `${befehl.tag} startet ab ${ort.name}.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  return { plan, meldung: 'Befehl nicht verstanden.' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/planung/befehle.test.js`
Expected: PASS (4 Tests)

- [ ] **Step 5: Commit**

```bash
git add app/planung/befehle.js tests/planung/befehle.test.js
git commit -m "feat: Textbefehle für Plan-Anpassung"
```

---

### Task 9: `frischauf` vervollständigen und mit Textbefehlen verdrahten

**Files:**
- Modify: `app/planung/planer.js` (Stump aus Task 6 ersetzen, siehe Code dort beim Hinweis-Block)
- Test: bestehende Tests `tests/planung/planer.test.js` + `tests/planung/befehle.test.js` müssen zusammen grün sein

**Interfaces:**
- Consumes: `SKELETT` (Task 4), `entscheideUbernachtung` (Task 5).
- Produces: `frischauf(plan, kontext): Plan` wie im Hinweis-Block von Task 6 angegeben; `kontext = { dealersById, settings, routing, hotels }`.

- [ ] **Step 1: `frischauf` gemäß Codeblock in Task 6 implementieren** (Hinweis-Block, ab „Wichtig für spätere Tasks“), und `planeWochen` so anpassen, dass es am Ende einmal `frischauf(plan, kontext)` mit `kontext = { dealersById, settings, routing, hotels }` aufruft, damit Initialplan und Updates denselben Pfad benutzen.
- [ ] **Step 2: Signaturen angleichen** — `wendeAn` (Task 8) ruft `frischauf(p, kontext)` bereits mit diesem Kontext auf; im Stump aus Task 6 stand `(plan, settings, routing)`: passe den Test in `tests/planung/planer.test.js` an, damit `frischauf(plan, baueKontext())` mit dem selben Kontext wie in `befehle.test.js` benutzt wird.
- [ ] **Step 3: Alle Tests laufen lassen**

Run: `node --test tests/planung/`
Expected: PASS (alle Testdateien)

- [ ] **Step 4: Commit**

```bash
git add app/planung/planer.js tests/planung/planer.test.js
git commit -m "feat: frischauf zur Revalidierung nach Planänderungen"
```

---

### Task 10: Demo-Daten generieren

**Files:**
- Create: `tools/datengenerator.js`
- Create: `daten/haendler-demo.json`, `daten/hotels-demo.json` (generiert)
- Test: `tests/planung/datengenerator.test.js`

**Interfaces:**
- Produces: `baueHaendlerDemo(): Dealer[]` (90 Händler, Format wie `tests/fixtures.js`, mit Clusterzugehörigkeit und plausiblem Namen) und `baueHotelsDemo(): Hotel[]` (2 Hotels pro Cluster, Region = Clusterindex, Programme aus `['Hilton Honors','Miles & More','Platinum Card','Accor ALL']`, Preis 85–145). Script-Aufruf `node tools/datengenerator.js` schreibt beide JSON-Dateien.

- [ ] **Step 1: Write the failing test**

```js
// tests/planung/datengenerator.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueHaendlerDemo, baueHotelsDemo } from '../../tools/datengenerator.js';

test('Demo: 90 Händler, eindeutige IDs, Cluster 0-4', () => {
  const h = baueHaendlerDemo();
  assert.equal(h.length, 90);
  assert.equal(new Set(h.map((x) => x.id)).size, 90);
  assert.ok(h.every((x) => [0, 1, 2, 3, 4].includes(x.cluster)));
});

test('Demo: 10 Hotels, je 2 pro Region', () => {
  const ho = baueHotelsDemo();
  assert.equal(ho.length, 10);
  for (let c = 0; c < 5; c++) assert.equal(ho.filter((x) => x.region === c).length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/planung/datengenerator.test.js`
Expected: FAIL (Module nicht gefunden)

- [ ] **Step 3: Write minimal implementation**

```js
// tools/datengenerator.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZENTREN = [
  { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 20, y: 20 },
];
const REGIONEN = ['Stadtkreis', 'Ostkreis', 'Südkreis', 'Westkreis', 'Zentrum'];
const NAMEN = ['Bergmann', 'Sperl', 'Kraus', 'Wagenfeld', 'Lindt', 'Hoppe', 'Reinhardt', 'Sommer'];
const PROGRAMME = ['Hilton Honors', 'Miles & More', 'Platinum Card', 'Accor ALL'];

export function baueHaendlerDemo() {
  const out = [];
  let n = 0;
  ZENTREN.forEach((z, ci) => {
    for (let k = 0; k < 18; k++) {
      n++;
      out.push({
        id: `DEU${ci + 1}M${150 + n}`,
        name: `Autohaus ${NAMEN[n % NAMEN.length]} ${n}`,
        adresse: `Musterweg ${n}, Musterstadt`,
        pos: { x: z.x + (k % 5) * 1.4 + 0.3, y: z.y + Math.floor(k / 5) * 1.6 + 0.2 },
        cluster: ci,
        prio: n % 9 === 0,
        dauer: n % 6 === 0 ? 120 : 90,
        besuchVerlauf: n % 5 === 0 ? ['2026-10-01'] : ['2026-08-01'],
      });
    }
  });
  return out;
}

export function baueHotelsDemo() {
  const out = [];
  ZENTREN.forEach((z, ci) => {
    for (let j = 0; j < 2; j++) {
      out.push({
        id: `H${ci}${j}`,
        name: `Hotel ${REGIONEN[ci]} ${j === 0 ? 'A' : 'B'}`,
        ort: `Musterstadt-${REGIONEN[ci]}`,
        pos: { x: z.x + 2 + j, y: z.y - 1 + j * 3 },
        region: ci,
        programme: [PROGRAMME[(ci + j) % PROGRAMME.length]],
        preisNacht: 85 + ((ci * 7 + j * 11) % 55),
      });
    }
  });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ziel = join(dirname(fileURLToPath(import.meta.url)), '..', 'daten');
  mkdirSync(ziel, { recursive: true });
  writeFileSync(join(ziel, 'haendler-demo.json'), JSON.stringify(baueHaendlerDemo(), null, 2));
  writeFileSync(join(ziel, 'hotels-demo.json'), JSON.stringify(baueHotelsDemo(), null, 2));
  console.log('Demo-Daten geschrieben nach', ziel);
}
```

- [ ] **Step 4: Test + Generator laufen lassen**

Run: `node --test tests/planung/datengenerator.test.js && node tools/datengenerator.js`
Expected: PASS (2 Tests), Ausgabe `Demo-Daten geschrieben nach … daten`

- [ ] **Step 5: Commit**

```bash
git add tools/datengenerator.js daten/haendler-demo.json daten/hotels-demo.json tests/planung/datengenerator.test.js
git commit -m "feat: deterministische Demo-Daten für Händler und Hotels"
```

---

### Task 11: UI (Wochenraster mit Drag & Drop, Befehlsfeld, Einstellungen)

**Files:**
- Create: `index.html`
- Create: `app/app.js`, `app/ui/woche.js`, `app/ui/einstellungen.js`

Keine Unit-Tests (UI bleibt manueller Browser-Test, Spec Abschnitt 5).

**Interfaces:**
- Consumes: `planeWochen`, `frischauf` (Task 6/9), `erstelleDemoRouting` (Task 1), `erstelleSpeicher` (Task 7), `parseBefehl`/`wendeAn` (Task 8), Daten aus `daten/*.json` (Task 10).
- Produces: lauffähige App-Shell; `renderePlanraster(container, plan, { onMove, onBefehl })` und `rendereEinstellungen(container, settings, { onSpeichern })`.

- [ ] **Step 1: Einstellungs-UI schreiben**

```js
// app/ui/einstellungen.js
export function rendereEinstellungen(container, settings, { onSpeichern }) {
  container.innerHTML = `
    <fieldset>
      <legend>Einstellungen</legend>
      <label>Heimatadresse <input name="heimatName" value="${settings.heimat.name}"></label>
      <label>BEV-Fahrzeug <input type="checkbox" name="bev" ${settings.bev ? 'checked' : ''}></label>
      <label>Max. Fahrzeit zum ersten Termin (min)
        <input type="number" name="maxFahrt" value="${settings.praferenzen.maxFahrtErsterTerminMin}" min="10" max="120"></label>
      <label>Treueprogramme (Komma-getrennt)
        <input name="programme" value="${settings.praferenzen.programme.join(', ')}"></label>
      <button type="button" name="speichern">Speichern & neu planen</button>
    </fieldset>`;
  container.querySelector('[name=speichern]').addEventListener('click', () => {
    const neu = {
      ...settings,
      heimat: { ...settings.heimat, name: container.querySelector('[name=heimatName]').value },
      bev: container.querySelector('[name=bev]').checked,
      praferenzen: {
        ...settings.praferenzen,
        maxFahrtErsterTerminMin: Number(container.querySelector('[name=maxFahrt]').value),
        programme: container.querySelector('[name=programme]').value.split(',').map((s) => s.trim()).filter(Boolean),
      },
    };
    onSpeichern(neu);
  });
}
```

- [ ] **Step 2: Wochenraster mit Drag & Drop schreiben**

```js
// app/ui/woche.js
export function renderePlanraster(container, plan, { onMove, onBefehl }) {
  const teile = [];
  plan.wochen.forEach((woche, wi) => {
    teile.push(`<h2>Woche ab ${woche.montag}</h2><div class="woche" data-woche="${wi}">`);
    woche.tage.forEach((tag, ti) => {
      teile.push(`<section class="tag ${tag.ok ? '' : 'fehler'}" data-woche="${wi}" data-tag="${ti}">
        <h3>${tag.tag} (${tag.datum})${tag.ok ? '' : ` – ${tag.grund ?? 'ungültig'}`}</h3>
        <ul>${tag.termine.map((x, si) =>
          `<li draggable="true" data-id="${x.haendlerId}" data-woche="${wi}" data-tag="${ti}" data-slot="${si}">
             ${x.start}–${x.ende} ${x.haendlerId}</li>`).join('')}
        ${tag.leer ? '<li class="leer">kein Auftrag</li>' : ''}
        </ul>
        <p>Übernachtung: ${tag.uebernachtung.art === 'hotel'
            ? `Hotel (${tag.uebernachtung.hotelName ?? ''})` : 'Heimfahrt'}</p>
        <p class="startort">Start: ${tag.startortName}</p>
      </section>`);
    });
    teile.push('</div>');
  });
  teile.push(`
    <form id="befehlForm">
      <input name="befehl" placeholder="z. B. übernachte am Mittwoch im Hotel">
      <button>Anpassen</button>
      <span id="befehlMeldung"></span>
    </form>`);
  container.innerHTML = teile.join('');

  let gezogen = null;
  container.querySelectorAll('li[draggable]').forEach((li) => {
    li.addEventListener('dragstart', () => { gezogen = li; });
  });
  container.querySelectorAll('section.tag').forEach((section) => {
    section.addEventListener('dragover', (e) => e.preventDefault());
    section.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!gezogen) return;
      onMove(gezogen.dataset.id, Number(section.dataset.woche), Number(section.dataset.tag));
      gezogen = null;
    });
  });
  container.querySelector('#befehlForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = e.target.querySelector('[name=befehl]').value;
    onBefehl(text, e.target.querySelector('#befehlMeldung'));
  });
}
```

- [ ] **Step 3: App-Shell und Verkabelung schreiben**

```html
<!-- index.html -->
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Außendienst-Assistent — Routenplanung</title>
  <style>
    body { font-family: sans-serif; margin: 1rem; }
    .woche { display: flex; gap: 1rem; flex-wrap: wrap; }
    .tag { border: 1px solid #999; padding: .5rem; min-width: 15rem; }
    .tag.fehler { border-color: #c00; color: #c00; }
    li[draggable] { cursor: grab; }
  </style>
</head>
<body>
  <h1>Routenplanung</h1>
  <div id="einstellungen"></div>
  <button id="neuPlanen">Plan neu berechnen</button>
  <button id="exportJson">Plan exportieren</button>
  <div id="plan"></div>
  <script type="module" src="app/app.js"></script>
</body>
</html>
```

```js
// app/app.js
import { erstelleDemoRouting } from './adapter/routing-adapter.js';
import { erstelleSpeicher } from './adapter/speicher-adapter.js';
import { planeWochen, frischauf } from './planung/planer.js';
import { parseBefehl, wendeAn } from './planung/befehle.js';
import { renderePlanraster } from './ui/woche.js';
import { rendereEinstellungen } from './ui/einstellungen.js';

const speicher = erstelleSpeicher();

let haendler = [];
let hotels = [];
let settings = speicher.lade('einstellungen', {
  heimat: { name: 'Heimatbüro', pos: { x: -8, y: 10 } },
  altStartorte: [{ name: 'Büro Ost', pos: { x: 46, y: 2 } }, { name: 'Büro Süd', pos: { x: 2, y: 46 } }],
  bev: false,
  praferenzen: { lieblingshotelIds: [], maxFahrtErsterTerminMin: 60, programme: ['Hilton Honors'] },
});
let plan = null;

function kontext() {
  const dealersById = Object.fromEntries(haendler.map((h) => [h.id, h]));
  return { dealersById, settings, routing: erstelleDemoRouting({ bevAufschlagMin: settings.bev ? 10 : 0 }), hotels };
}

function neuPlanen() {
  plan = planeWochen({
    haendler, hotels, settings,
    routing: kontext().routing,
    startMontag: nextMondayIso(),
    anzahlWochen: 4,
  });
  speicher.speichere('plan', plan);
  zeichnen();
}

function nextMondayIso() {
  const d = new Date();
  const delta = ((8 - d.getUTCDay()) % 7) || 7;
  return new Date(d.getTime() + delta * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function zeichnen(meldungEl, meldung) {
  if (meldungEl && meldung) meldungEl.textContent = meldung;
  renderePlanraster(document.getElementById('plan'), plan, {
    onMove: (haendlerId, w, t) => {
      const ziel = plan.wochen[w].tage[t];
      const index = plan.wochen.findIndex((x) => x.tage.some((y) => y.termine.some((z) => z.haendlerId === haendlerId)));
      const quelle = plan.wochen[index].tage.find((y) => y.termine.some((z) => z.haendlerId === haendlerId));
      const i = quelle.termine.findIndex((z) => z.haendlerId === haendlerId);
      const [termin] = quelle.termine.splice(i, 1);
      ziel.termine.push(termin);
      plan = frischauf(plan, kontext());
      speicher.speichere('plan', plan);
      zeichnen();
    },
    onBefehl: (text, meldungEl) => {
      const { plan: p2, meldung } = wendeAn(plan, parseBefehl(text), kontext(), );
      plan = p2;
      speicher.speichere('plan', plan);
      zeichnen(meldungEl, meldung);
    },
  });
}

async function starten() {
  [haendler, hotels] = await Promise.all([
    fetch('daten/haendler-demo.json').then((r) => r.json()),
    fetch('daten/hotels-demo.json').then((r) => r.json()),
  ]);
  rendereEinstellungen(document.getElementById('einstellungen'), settings, {
    onSpeichern: (neu) => { settings = neu; speicher.speichere('einstellungen', settings); neuPlanen(); },
  });
  plan = speicher.lade('plan', null);
  if (plan) zeichnen(); else neuPlanen();
  document.getElementById('neuPlanen').addEventListener('click', neuPlanen);
  document.getElementById('exportJson').addEventListener('click', () => {
    const blob = new Blob([speicher.exportJson(plan)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routenplan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });
}

starten();
```

Der Start-Montag des Planhorizonts kommt aus `nextMondayIso()` (nächster Montag ab heute).

- [ ] **Step 4: Manueller Browser-Test**

Statischen Server starten: `python3 -m http.server 8000` (im Repo-Root), Browser über den Codespace-Port 8000 öffnen. Prüfen:
1. Plan zeigt 4 Wochen ab kommendem Montag, Di–Fr mit je 3 Terminen.
2. Drag eines Termins auf einen anderen Tag reagiert, Zeiten werden neu berechnet.
3. `übernachte am Mittwoch im Hotel` setzt die Übernachtung, Meldung erscheint.
4. `Freitag früher beenden` macht den Freitag ungültig (rot), wenn der dritte Termin nicht mehr passt.
5. Einstellungen-Speichern triggert neue Planung, BEV Checkbox erhöht die Fahrzeiten sichtbar.

- [ ] **Step 5: Commit**

```bash
git add index.html app/app.js app/ui/woche.js app/ui/einstellungen.js
git commit -m "feat: UI mit Wochenraster, Drag & Drop, Befehlsfeld und Einstellungen"
```

---

### Task 12: Gesamtablauf, README-Hinweis und Abschluss

**Files:**
- Modify: `AGENTS.md` (Aktueller Stand)
- Test: kompletter Lauf

- [ ] **Step 1: Alle Tests laufen lassen**

Run: `node --test tests/planung/`
Expected: PASS (alle Dateien)

- [ ] **Step 2: Browserdurchlauf gemäß Task 11 Step 4 wiederholen**

- [ ] **Step 3: AGENTS.md "Aktueller Stand" aktualisieren** — Datum, Kurzstand der Implementierung (Planungslogik getestet, UI manuell geprüft), nächster Schritt (echte Händlerliste hochladen, Briefing/Bericht/Wissensbasis).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: Stand Routenplanung-Implementierung"
```

---

## Self-Review (vom Planautor ausgeführt)

- **Spec-Coverage:** Händlerliste/Marktnummer (Tasks 1, 10), Cluster→Fälligkeit→Prio (Tasks 2–3), Tagesskelett inkl. BEV-Puffer (Tasks 1, 4), Startort-Auswahl (Befehl `starte`, Task 8; alternative Startorte in settings, Task 11), Übernachtung + Präferenzen (Tasks 5, 8), Drag & Drop + Textbefehle (Tasks 8, 11), Adapter/GCP-Vorbereitung (Tasks 1, 7), nur Demo-Daten (Task 10). Briefing/Bericht/Wissensbasis sind laut Spec bewusst ausgeschlossen.
- **Platzhalter:** Task 6 enthielt einen absichtlich unvollständigen `frischauf`-Stump; Task 9 liefert die vollständige Implementierung als Bitte-Block. Keine anderen TBD/TODO im Plan.
- **Typkonsistenz:** Plane-Struktur (`wochen[tage[termine]]`), `frischauf(plan, kontext)` und `wendeAn(plan, befehl, kontext)` sind über Tasks 6–11 konsistent; `TAGE_NAMEN` als Quelle der Tagesnamen in Parser und Planer.
