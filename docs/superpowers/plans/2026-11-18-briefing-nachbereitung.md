# Briefing, Bericht & Wissensbasis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Außendienst-Assistent erhält Briefing vor Termin, Bericht + E-Mail-Entwurf nach Termin, Händlerakte/Wissensbasis und Info-Verteilung (Ansatz C: Bausteine + Adapter).

**Architecture:** Plain ES-Module-JS ohne Build-Schritt, Logikmodule ohne DOM-Zugriff (`app/wissensbasis/`, `app/briefing/`, `app/bericht/`, `app/infodist/`), neue Adapter (`text-`, `mail-`, `scorecard-adapter.js`). Daten als Demo-JSON in `daten/`.

**Tech Stack:** Node ≥ 20 (`node --test` mit `node:test` + `node:assert`), Browser-App ES-Module, kein Framework.

**Spec:** `docs/superpowers/specs/2026-11-18-briefing-nachbereitung-design.md`

## Global Constraints

- Nur ausgedachte Daten; keine echten Firmen- oder Personendaten.
- Händler-ID = Markt Händlernummer (z. B. `DEU90ARN`), konsistent zum Import.
- Keine Netz-API-Aufrufe (kein LLM, kein Outlook, kein Mail-Versand) im Codespace.
- Logikmodule (`wissensbasis/`, `briefing/`, `bericht/`, `infodist/`) ohne DOM-Zugriff.
- TDD: erst Test, dann Implementierung; Commit nach jedem Task.
- Testkommando: `node --test tests/<ordner>/<datei>.test.js`
- Keine package.json — Module rein über ES-`import`.

---

### Task 1: Händlerakte – Datenmodell und CRUD

**Files:**
- Create: `app/wissensbasis/akte.js`
- Create: `daten/wissensbasis.json`
- Test: `tests/wissensbasis/akte.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `ladeAkte(wissensbasis, haendlerId) -> akte|null`; `fuegePersoenlicheNotizHinzu(akte, notiz) -> akte`; `uebernimmAufgabe(akte, aufgabe) -> akte`; `setzeMassnahmenStatus(akte, titel, status) -> akte`; `speichereAkte(wissensbasis, akte) -> wissensbasis`. Akten-Shape: `{haendlerId, stammdaten, persoenlicheNotizen, besuchHistorie, offeneMassnahmen, prioThemen, folgeterminKadenzWochen}`. Wissensbasis-Shape: `{akten: [], gesendetInfos: []}`. Alle Funktionen geben neue Objekte zurück (keine Mutation).

- [ ] **Step 1: Write the failing test**

```js
// tests/wissensbasis/akte.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ladeAkte, fuegePersoenlicheNotizHinzu, uebernimmAufgabe,
  setzeMassnahmenStatus, speichereAkte,
} from '../../app/wissensbasis/akte.js';

const AKTE = {
  haendlerId: 'DEU90ARN',
  stammdaten: { name: 'Autohaus Beispiel', anrede: 'Frau Musterfrau (GF1)' },
  persoenlicheNotizen: [{ datum: '2026-10-05', text: 'Geburtstag: 14. April', kind: 'geburtstag', tag: '04-14' }],
  besuchHistorie: [{ terminId: 't-001', datum: '2026-10-05', teilnehmer: ['Frau Musterfrau'], themen: ['WKR-Kampagne'], kernpunkte: ['Interesse an Wischerdisplay'] }],
  offeneMassnahmen: [{ titel: 'TVA-Rückmeldung', beschreibung: '', verantwortlich: 'Frau Musterfrau', frist: '2026-12-01', status: 'offen' }],
  prioThemen: ['wkr', 'wischerdisplay'],
  folgeterminKadenzWochen: 6,
};
const WB = { akten: [AKTE], gesendetInfos: [] };

test('ladeAkte findet Akte per Marktnummer, null sonst', () => {
  assert.equal(ladeAkte(WB, 'DEU90ARN')?.haendlerId, 'DEU90ARN');
  assert.equal(ladeAkte(WB, 'XXX'), null);
});

test('fuegePersoenlicheNotizHinzu erzeugt neue Akte, Original unverändert', () => {
  const neue = fuegePersoenlicheNotizHinzu(AKTE, { datum: '2026-11-18', text: 'Läuft Marathon' });
  assert.equal(neue.persoenlicheNotizen.length, 2);
  assert.equal(AKTE.persoenlicheNotizen.length, 1);
});

test('uebernimmAufgabe ergänzt offene Maßnahme, setzeMassnahmenStatus erledigt sie', () => {
  const a1 = uebernimmAufgabe(AKTE, { titel: 'Broschüre schicken', verantwortlich: 'David', frist: '2026-12-05' });
  assert.equal(a1.offeneMassnahmen.at(-1).status, 'offen');
  const a2 = setzeMassnahmenStatus(a1, 'Broschüre schicken', 'erledigt');
  assert.equal(a2.offeneMassnahmen.find((m) => m.titel === 'Broschüre schicken').status, 'erledigt');
});

test('speichereAkte ersetzt Akte anhand der ID', () => {
  const wb2 = speichereAkte(WB, { ...AKTE, folgeterminKadenzWochen: 4 });
  assert.equal(wb2.akten.length, 1);
  assert.equal(wb2.akten[0].folgeterminKadenzWochen, 4);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wissensbasis/akte.test.js`
Expected: FAIL (`Cannot find module .../app/wissensbasis/akte.js`)

- [ ] **Step 3: Write minimal implementation**

```js
// app/wissensbasis/akte.js
export function ladeAkte(wissensbasis, haendlerId) {
  return wissensbasis.akten.find((a) => a.haendlerId === haendlerId) ?? null;
}

export function fuegePersoenlicheNotizHinzu(akte, notiz) {
  return { ...akte, persoenlicheNotizen: [...akte.persoenlicheNotizen, { ...notiz }] };
}

export function uebernimmAufgabe(akte, aufgabe) {
  return { ...akte, offeneMassnahmen: [...akte.offeneMassnahmen,
    { beschreibung: '', status: 'offen', ...aufgabe }] };
}

export function setzeMassnahmenStatus(akte, titel, status) {
  return { ...akte, offeneMassnahmen:
    akte.offeneMassnahmen.map((m) => (m.titel === titel ? { ...m, status } : m)) };
}

export function speichereAkte(wissensbasis, akte) {
  const ersetzt = wissensbasis.akten.some((a) => a.haendlerId === akte.haendlerId);
  return {
    ...wissensbasis,
    akten: ersetzt
      ? wissensbasis.akten.map((a) => (a.haendlerId === akte.haendlerId ? akte : a))
      : [...wissensbasis.akten, akte],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wissensbasis/akte.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Demo-Daten + Commit**

`daten/wissensbasis.json` nach dem Shema aus der Spec (Abschnitt 5) anlegen — 2 Demo-Akten (`DEU90ARN`, `DEU91M151`), `gesendetInfos: []`.

```bash
git add app/wissensbasis/akte.js daten/wissensbasis.json tests/wissensbasis/akte.test.js
git commit -m "feat: händlerakte CRUD (wissensbasis)"
```

---

### Task 2: Folgetermin-Kadenz (Standard 6 Wochen)

**Files:**
- Create: `app/wissensbasis/kadenz.js`
- Test: `tests/wissensbasis/kadenz.test.js`

**Interfaces:**
- Consumes: Akten-Shape (Task 1)
- Produces: `KADENZ_STANDARD_WOCHEN = 6` (Konstante); `folgeterminNachBesuch(isoDatum, kadenzWochen) -> isoDatum`; `kadenzVonAkte(akte) -> number`

- [ ] **Step 1: Write the failing test**

```js
// tests/wissensbasis/kadenz.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { KADENZ_STANDARD_WOCHEN, folgeterminNachBesuch, kadenzVonAkte } from '../../app/wissensbasis/kadenz.js';

test('Standard-Kadenz ist 6 Wochen', () => {
  assert.equal(KADENZ_STANDARD_WOCHEN, 6);
});

test('folgeterminNachBesuch: 6 Wochen nach Besuchsdatum (ohne Angaben)', () => {
  assert.equal(folgeterminNachBesuch('2026-10-05'), '2026-11-16');
});

test('folgeterminNachBesuch mit individueller Kadenz', () => {
  assert.equal(folgeterminNachBesuch('2026-10-05', 4), '2026-11-02');
});

test('kadenzVonAkte: Standard bei leerer Akte', () => {
  assert.equal(kadenzVonAkte({}), 6);
  assert.equal(kadenzVonAkte({ folgeterminKadenzWochen: 8 }), 8);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wissensbasis/kadenz.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/wissensbasis/kadenz.js
export const KADENZ_STANDARD_WOCHEN = 6;

export function folgeterminNachBesuch(isoDatum, kadenzWochen = KADENZ_STANDARD_WOCHEN) {
  const d = new Date(`${isoDatum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + kadenzWochen * 7);
  return d.toISOString().slice(0, 10);
}

export function kadenzVonAkte(akte) {
  return akte.folgeterminKadenzWochen ?? KADENZ_STANDARD_WOCHEN;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wissensbasis/kadenz.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/wissensbasis/kadenz.js tests/wissensbasis/kadenz.test.js
git commit -m "feat: folgetermin-kadenz 6 wochen standard"
```

---

### Task 3: Scorecard-Adapter + Demo-KPI-Daten

**Files:**
- Create: `app/adapter/scorecard-adapter.js`
- Create: `daten/scorecard-demo.json`
- Test: `tests/briefing/scorecard.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `ladeKpiWerte(scorecardDaten, haendlerId) -> kpi|null`. KPI-Shape: `{id, wkr:{tier, quoteProzent}, wischerdisplay:{bestellt, datum}, afsb:{status, punkteBisGold}, parkplatz:{stp:{punkte, praemie}, tva:{letzterStand}, zaBefreiung:{befreit}}}`

- [ ] **Step 1: Write the failing test**

```js
// tests/briefing/scorecard.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ladeKpiWerte } from '../../app/adapter/scorecard-adapter.js';

const DEMO = { haendler: [{ id: 'DEU90ARN',
  wkr: { tier: 1, quoteProzent: 42 },
  wischerdisplay: { bestellt: true, datum: '2026-10-20' },
  afsb: { status: 'Silber', punkteBisGold: 35 },
  parkplatz: { stp: { punkte: 120, praemie: 'Ford-Rucksack' },
    tva: { letzterStand: '2026-09-30' }, zaBefreiung: { befreit: false } } }] };

test('ladeKpiWerte liefert KPI je Marktnummer', () => {
  const kpi = ladeKpiWerte(DEMO, 'DEU90ARN');
  assert.equal(kpi.wkr.quoteProzent, 42);
  assert.equal(kpi.parkplatz.tva.letzterStand, '2026-09-30');
});

test('ladeKpiWerte: null für unbekannten Händler', () => {
  assert.equal(ladeKpiWerte(DEMO, 'XXX'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/briefing/scorecard.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/adapter/scorecard-adapter.js
// Demo: statische Demo-JSON. Später: echter Scorecard-Connector (z. B. GCP)
// mit gleicher Signatur — Logik der App ändert sich nicht (Adapter-Prinzip).
export function ladeKpiWerte(scorecardDaten, haendlerId) {
  return scorecardDaten.haendler.find((h) => h.id === haendlerId) ?? null;
}
```

`daten/scorecard-demo.json`: gleicher Aufbau wie `DEMO` im Test, für 5 Demo-Händler
(u. a. `DEU90ARN`, `DEU91M151`, Mix aus bestellt/nicht bestellt, Tier 1–3).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/briefing/scorecard.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/adapter/scorecard-adapter.js daten/scorecard-demo.json tests/briefing/scorecard.test.js
git commit -m "feat: scorecard-adapter mit demo-kpi-daten"
```

---

### Task 4: Briefing-Checkliste

**Files:**
- Create: `app/briefing/checkliste.js`
- Test: `tests/briefing/checkliste.test.js`

**Interfaces:**
- Consumes: Akte (Task 1), KPI (Task 3)
- Produces: `baueBriefing({ haendlerStamm, akte, kpi, heute }) -> briefing`. Briefing-Shape: `{anrede, kpiBlock:[{titel, wert}], pflichthemen:[{titel, begruendung}], massnahmen, letzteGespraeche, notizen, hinweise:[string]}`. `haendlerStamm = {id, name, gf1?}`.

- [ ] **Step 1: Write the failing test**

```js
// tests/briefing/checkliste.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueBriefing } from '../../app/briefing/checkliste.js';

const AKTE = {
  haendlerId: 'DEU90ARN',
  stammdaten: { name: 'Autohaus Beispiel', anrede: 'Frau Musterfrau (GF1)' },
  persoenlicheNotizen: [
    { datum: '2026-10-05', text: 'Geburtstag: 14. April', kind: 'geburtstag', tag: '04-14' },
    { datum: '2026-10-05', text: 'Läuft Marathon' },
  ],
  besuchHistorie: [{ terminId: 't-001', datum: '2026-10-05', teilnehmer: ['Frau Musterfrau'], themen: ['WKR-Kampagne'], kernpunkte: ['Interesse an Wischerdisplay'] }],
  offeneMassnahmen: [{ titel: 'TVA-Rückmeldung', beschreibung: '', verantwortlich: 'Frau Musterfrau', frist: '2026-12-01', status: 'offen' }],
  prioThemen: ['bremsen'],
  folgeterminKadenzWochen: 6,
};
const KPI = { id: 'DEU90ARN', wkr: { tier: 1, quoteProzent: 42 },
  wischerdisplay: { bestellt: false, datum: null },
  afsb: { status: 'Silber', punkteBisGold: 35 }, parkplatz: {} };

test('baueBriefing: KPI-Block zuerst, Anrede aus Stamm', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'Autohaus Beispiel', gf1: 'Frau Musterfrau' }, akte: AKTE, kpi: KPI, heute: '2026-11-18' });
  assert.equal(b.anrede, 'Frau Musterfrau');
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('WKR')));
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('Wischerdisplay')));
  assert.ok(b.kpiBlock.some((k) => k.titel.includes('AFSB')));
});

test('pflichthemen: WKR-Quote, Wischerdisplay fehlt, Prio-Thema der Akte', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'Autohaus Beispiel' }, akte: AKTE, kpi: KPI, heute: '2026-11-18' });
  const titel = b.pflichthemen.map((t) => t.titel).join('|');
  assert.ok(titel.includes('WKR-Performance ansprechen'));
  assert.ok(titel.includes('Wischerdisplay vorstellen'));
  assert.ok(titel.includes('Bremsen'));
});

test('pflichthemen: kein Wischerdisplay-Thema, wenn schon bestellt', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' },
    akte: { ...AKTE, prioThemen: [] },
    kpi: { ...KPI, wischerdisplay: { bestellt: true, datum: '2026-10-20' } },
    heute: '2026-11-18' });
  assert.ok(!b.pflichthemen.some((t) => t.titel.includes('Wischerdisplay')));
});

test('hinweise: Geburtstag innerhalb 14 Tage', () => {
  const b = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' }, akte: AKTE, kpi: KPI, heute: '2026-04-08' });
  assert.ok(b.hinweise.some((h) => h.includes('Geburtstag')));
  const b2 = baueBriefing({ haendlerStamm: { id: 'DEU90ARN', name: 'X' }, akte: AKTE, kpi: KPI, heute: '2026-06-01' });
  assert.ok(!b2.hinweise.some((h) => h.includes('Geburtstag')));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/briefing/checkliste.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/briefing/checkliste.js
function tageBisMMTT(heute, mmtt) {
  const jahr = new Date(`${heute}T00:00:00Z`).getUTCFullYear();
  const aktuellesJahr = Math.round((new Date(`${jahr}-${mmtt}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400000);
  return aktuellesJahr >= 0
    ? aktuellesJahr
    : Math.round((new Date(`${jahr + 1}-${mmtt}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400000);
}

export function baueBriefing({ haendlerStamm, akte, kpi, heute }) {
  const kpiBlock = kpi
    ? [{ titel: `WKR-Performance (Tier ${kpi.wkr.tier})`, wert: `${kpi.wkr.quoteProzent} %` },
       { titel: 'Wischerdisplay', wert: kpi.wischerdisplay.bestellt
          ? `bestellt am ${kpi.wischerdisplay.datum}` : 'nicht bestellt' },
       { titel: `AFSB-Status ${kpi.afsb.status}`, wert: `${kpi.afsb.punkteBisGold} Punkte bis Gold` }]
    : [{ titel: 'KPI', wert: 'keine Scorecard-Daten' }];

  const pflichthemen = [];
  if (kpi && kpi.wkr.quoteProzent < 55) {
    pflichthemen.push({ titel: 'WKR-Performance ansprechen', begruendung: `Quote ${kpi.wkr.quoteProzent} %` });
  }
  if (kpi && !kpi.wischerdisplay.bestellt) {
    pflichthemen.push({ titel: 'Wischerdisplay vorstellen', begruendung: 'noch nicht bestellt' });
  }
  for (const t of akte.prioThemen ?? []) {
    pflichthemen.push({ titel: t.charAt(0).toUpperCase() + t.slice(1), begruendung: 'Prio-Liste des AD' });
  }

  const hinweise = [];
  for (const n of akte.persoenlicheNotizen ?? []) {
    if (n.kind === 'geburtstag' && n.tag) {
      const tage = tageBisMMTT(heute, n.tag);
      if (tage <= 14) hinweise.push(`Geburtstag in ${tage} Tagen (${n.text})`);
    }
  }

  return {
    anrede: haendlerStamm.gf1 ?? akte.stammdaten.anrede?.replace(/ \((GF\d)\)$/, '') ?? haendlerStamm.name,
    kpiBlock,
    pflichthemen,
    massnahmen: akte.offeneMassnahmen ?? [],
    letzteGespraeche: akte.besuchHistorie ?? [],
    notizen: akte.persoenlicheNotizen ?? [],
    hinweise,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/briefing/checkliste.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/briefing/checkliste.js tests/briefing/checkliste.test.js
git commit -m "feat: briefing-checkliste mit kpi-block und pflichthemen"
```

---

### Task 5: Schnellblatt "Auf dem Parkplatz"

**Files:**
- Create: `app/briefing/schnellblatt.js`
- Test: `tests/briefing/schnellblatt.test.js`

**Interfaces:**
- Consumes: KPI-Shape inkl. `parkplatz` (Task 3)
- Produces: `baueSchnellblatt(kpi) -> {stp, tva, zaBefreiung}|null`

- [ ] **Step 1: Write the failing test**

```js
// tests/briefing/schnellblatt.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueSchnellblatt } from '../../app/briefing/schnellblatt.js';

test('baueSchnellblatt: STP, TVA, ZA-Befreiung aus KPI', () => {
  const kpi = { id: 'X', parkplatz: {
    stp: { punkte: 120, praemie: 'Ford-Rucksack' },
    tva: { letzterStand: '2026-09-30' },
    zaBefreiung: { befreit: false } } };
  const s = baueSchnellblatt(kpi);
  assert.equal(s.stp.praemie, 'Ford-Rucksack');
  assert.equal(s.tva.letzterStand, '2026-09-30');
  assert.equal(s.zaBefreiung.befreit, false);
});

test('baueSchnellblatt: null ohne KPI/Parkplatz-Daten', () => {
  assert.equal(baueSchnellblatt(null), null);
  assert.equal(baueSchnellblatt({ id: 'X' }), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/briefing/schnellblatt.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/briefing/schnellblatt.js
export function baueSchnellblatt(kpi) {
  if (!kpi?.parkplatz) return null;
  return {
    stp: { ...kpi.parkplatz.stp },
    tva: { ...kpi.parkplatz.tva },
    zaBefreiung: { ...kpi.parkplatz.zaBefreiung },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/briefing/schnellblatt.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/briefing/schnellblatt.js tests/briefing/schnellblatt.test.js
git commit -m "feat: schnellblatt on the parkplatz (stp/tva/za)"
```

---

### Task 6: Bericht-Vorlage

**Files:**
- Create: `app/bericht/vorlage.js`
- Test: `tests/bericht/vorlage.test.js`

**Interfaces:**
- Consumes: nichts
- Produces: `erstelleBericht(eingabe) -> {ok, bericht, fehlend}` (Pflicht: `haendlerId`, `datum`, `teilnehmer` nicht-leer); `aufgabenAlsMassnahmen(bericht) -> [{titel, beschreibung, verantwortlich, frist, status:'offen'}]`

- [ ] **Step 1: Write the failing test**

```js
// tests/bericht/vorlage.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleBericht, aufgabenAlsMassnahmen } from '../../app/bericht/vorlage.js';

const VOLL = {
  haendlerId: 'DEU90ARN', datum: '2026-11-18', teilnehmer: ['Frau Musterfrau', 'David'],
  themen: ['WKR-Performance', 'Wischerdisplay'],
  vereinbarungen: ['Demo-Termin im Dezember'],
  aufgaben: [{ titel: 'Broschüre schicken', verantwortlich: 'David', frist: '2026-11-25' }],
  offenePunkte: ['TVA-Rückmeldung offen'],
  stichpunkte: 'gutes Gespräch über WKR',
};

test('erstelleBericht: vollständige Eingabe ok', () => {
  const r = erstelleBericht(VOLL);
  assert.equal(r.ok, true);
  assert.equal(r.fehlend.length, 0);
  assert.deepEqual(r.bericht.teilnehmer, ['Frau Musterfrau', 'David']);
});

test('erstelleBericht: fehlende Pflichtfelder werden gemeldet', () => {
  const r = erstelleBericht({ haendlerId: 'DEU90ARN', stichpunkte: 'x' });
  assert.equal(r.ok, false);
  assert.ok(r.fehlend.includes('datum'));
  assert.ok(r.fehlend.includes('teilnehmer'));
});

test('aufgabenAlsMassnahmen: alle Aufgaben offen übernommen', () => {
  const { bericht } = erstelleBericht(VOLL);
  const m = aufgabenAlsMassnahmen(bericht);
  assert.equal(m.length, 1);
  assert.equal(m[0].status, 'offen');
  assert.equal(m[0].verantwortlich, 'David');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/bericht/vorlage.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/bericht/vorlage.js
export function erstelleBericht(eingabe) {
  const fehlend = [];
  if (!eingabe.haendlerId) fehlend.push('haendlerId');
  if (!eingabe.datum) fehlend.push('datum');
  if (!Array.isArray(eingabe.teilnehmer) || eingabe.teilnehmer.length === 0) fehlend.push('teilnehmer');
  const bericht = {
    haendlerId: eingabe.haendlerId ?? null,
    datum: eingabe.datum ?? null,
    teilnehmer: eingabe.teilnehmer ?? [],
    themen: eingabe.themen ?? [],
    vereinbarungen: eingabe.vereinbarungen ?? [],
    aufgaben: eingabe.aufgaben ?? [],
    offenePunkte: eingabe.offenePunkte ?? [],
  };
  return { ok: fehlend.length === 0, bericht, fehlend };
}

export function aufgabenAlsMassnahmen(bericht) {
  return bericht.aufgaben.map((a) => ({
    titel: a.titel, beschreibung: a.titel,
    verantwortlich: a.verantwortlich ?? '', frist: a.frist ?? null, status: 'offen',
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/bericht/vorlage.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/bericht/vorlage.js tests/bericht/vorlage.test.js
git commit -m "feat: bericht-vorlage aus stichpunkten"
```

---

### Task 7: E-Mail-Entwurf aus Kampagnen-Bausteinen (text-adapter + Pflichtanhang TVA)

**Files:**
- Create: `app/adapter/text-adapter.js`
- Create: `app/bericht/entwurf.js`
- Create: `daten/kampagnen-bausteine.json`
- Test: `tests/bericht/entwurf.test.js`

**Interfaces:**
- Consumes: Bericht (Task 6)
- Produces: `erstelleEntwurf(bericht, bausteineDaten, kampagnenId) -> {ok, entwurf:{betreff, text, anhaenge, links}, zusammenfassung: [] | begruendung:string}`. Bausteine-Shape: `{kampagnen:[{id, titel, betreff, textbausteine:[], anhaenge:[{name, typ}], links:[]}]}`. TVA (typ `tva`) ist Pflichtanhang und wird ergänzt, falls fehlt.

- [ ] **Step 1: Write the failing test**

```js
// tests/bericht/entwurf.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { erstelleEntwurf } from '../../app/bericht/entwurf.js';

const BAUSTEINE = { kampagnen: [
  { id: 'wkr', titel: 'WKR-Programm', betreff: 'Ihre WKR-Performance',
    textbausteine: ['Vielen Dank für das Gespräch zum WKR-Programm.'],
    anhaenge: [{ name: 'WKR-Broschuere.pdf', typ: 'pdf' }],
    links: ['https://training.example/wkr'] },
  { id: 'schnittschutz', titel: 'Windschutzscheiben', betreff: 'Training Windschutzscheiben',
    textbausteine: ['', '<persönlicher Teil>'],
    anhaenge: [{ name: 'Windschutzscheiben-Flyer.pdf', typ: 'pdf' }], links: [] },
] };
const BERICHT = { haendlerId: 'DEU90ARN', datum: '2026-11-18',
  teilnehmer: ['Frau Musterfrau'], themen: ['WKR'], vereinbarungen: [],
  aufgaben: [], offenePunkte: [] };

test('erstelleEntwurf: Bausteine + TVA-Pflichtanhang ergänzt', () => {
  const r = erstelleEntwurf(BERICHT, BAUSTEINE, 'wkr');
  assert.equal(r.ok, true);
  assert.equal(r.entwurf.betreff, 'Ihre WKR-Performance');
  const typen = r.entwurf.anhaenge.map((a) => a.typ);
  assert.ok(typen.includes('tva'));
  assert.ok(r.entwurf.links.includes('https://training.example/wkr'));
  assert.ok(r.zusammenfassung.includes('persönliche Ergänzung möglich'));
});

test('erstelleEntwurf: TVA-Pflichtanhang genau einmal', () => {
  const mit = { ...BAUSTEINE, kampagnen: [BAUSTEINE.kampagnen[0], { ...BAUSTEINE.kampagnen[0], id: 'x',
    anhaenge: [{ name: 'TVA.pdf', typ: 'tva' }] }] };
  const r = erstelleEntwurf(BERICHT, mit, 'x');
  assert.equal(r.entwurf.anhaenge.filter((a) => a.typ === 'tva').length, 1);
});

test('erstelleEntwurf: unbekannte Kampagne -> ok:false mit Begründung', () => {
  const r = erstelleEntwurf(BERICHT, BAUSTEINE, 'unbekannt');
  assert.equal(r.ok, false);
  assert.ok(r.begruendung.includes('Unbekannte Kampagne'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/bericht/entwurf.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/adapter/text-adapter.js
// Demo: deterministische Baustein-Auswahl. Später: LLM-Connector mit gleicher
// Signatur (Bericht + Kampagnen-Bausteine -> Textbausteine) — Logik ändert sich nicht.
export function bausteinTexte(kampagne, bericht) {
  return [...kampagne.textbausteine];
}
```

```js
// app/bericht/entwurf.js
import { bausteinTexte } from '../adapter/text-adapter.js';

export function erstelleEntwurf(bericht, bausteineDaten, kampagnenId) {
  const kampagne = bausteineDaten.kampagnen.find((k) => k.id === kampagnenId);
  if (!kampagne) {
    return { ok: false, begruendung: `Unbekannte Kampagne: ${kampagnenId}` };
  }
  const anhaenge = kampagne.anhaenge.some((a) => a.typ === 'tva')
    ? [...kampagne.anhaenge]
    : [...kampagne.anhaenge, { name: 'TVA.pdf', typ: 'tva' }];
  return {
    ok: true,
    entwurf: {
      betreff: kampagne.betreff,
      text: bausteinTexte(kampagne, bericht).join('\n\n'),
      anhaenge,
      links: [...kampagne.links],
    },
    zusammenfassung: ['TVA als Pflichtanhang', 'persönliche Ergänzung möglich'],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/bericht/entwurf.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Demo-Bausteine + Commit**

`daten/kampagnen-bausteine.json` nach dem Shema von `BAUSTEINE` im Test anlegen — Start: `wkr`, `wischerdisplay`, `schnittschutz`, `bremsen`, `ford-mobile`.

```bash
git add app/adapter/text-adapter.js app/bericht/entwurf.js daten/kampagnen-bausteine.json tests/bericht/entwurf.test.js
git commit -m "feat: e-mail-entwurf aus kampagnen-bausteinen mit tva-pflichtanhang"
```

---

### Task 8: Mail-Adapter + Info-Verteilung (Selektion, Phase 1: simuliertes Postfach)

**Files:**
- Create: `app/adapter/mail-adapter.js`
- Create: `app/infodist/selektion.js`
- Create: `daten/postfach-demo.json`
- Create: `daten/infos.json`
- Test: `tests/infodist/selektion.test.js`

**Interfaces:**
- Consumes: Akte (Task 1, Feld `prioThemen`, `besuchHistorie[].themen`); `gesendetInfos` aus Wissensbasis
- Produces: `ladeMails(postfachDaten) -> mails` (Adapter-Vertrag Phase 2: identische Feldform, Quelle Outlook/Graph); `vorschlaege({ mails, akte, gesendetInfos }) -> [{mailId, begruendung}]`; `registriereVersand(wissensbasis, haendlerId, artikelId, datum) -> wissensbasis`. Mail-Shape: `{id, von, datum, betreff, text, themen:[]}`. Match-Kriterium: `themen` ∩ `akte.prioThemen` ∪ `akte.besuchHistorie[].themen` (Kleinbuchstaben-Vergleich), ohne Duplikat in `gesendetInfos`.

- [ ] **Step 1: Write the failing test**

```js
// tests/infodist/selektion.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { vorschlaege, registriereVersand } from '../../app/infodist/selektion.js';
import { ladeMails, ladeMailbox } from '../../app/adapter/mail-adapter.js';

const MAILS = [
  { id: 'm1', von: 'vertrieb@example.com', datum: '2026-11-10', betreff: 'SitNow-Absage',
    text: 'Hinweis zur Absage von SitNow.', themen: ['sitnow'] },
  { id: 'm2', von: 'marketing@example.com', datum: '2026-11-11', betreff: 'WKR-Kampagne',
    text: 'Neue WKR-Broschüre.', themen: ['wkr'] },
  { id: 'm3', von: 'x@example.com', datum: '2026-11-12', betreff: 'Egal', text: 'x', themen: ['sonstiges'] },
];
const AKTE = { haendlerId: 'DEU90ARN', prioThemen: ['wkr'],
  besuchHistorie: [{ datum: '2026-10-05', themen: ['sitnow'] }] };

test('ladeMails/ladeMailbox: gleiche Feldform wie Postfach-Datei', () => {
  assert.deepEqual(ladeMails({ mails: MAILS }), MAILS);
  assert.deepEqual(ladeMailbox({ mails: MAILS }), MAILS);
});

test('vorschlaege: nur themenpassende, keine Duplikate', () => {
  const wb = { akten: [AKTE], gesendetInfos: [{ haendlerId: 'DEU90ARN', artikelId: 'm2', datum: '2026-11-13' }] };
  const v = vorschlaege({ mails: MAILS, akte: AKTE, gesendetInfos: wb.gesendetInfos });
  assert.deepEqual(v.map((x) => x.mailId), ['m1']);
  assert.ok(v[0].begruendung.length > 0);
});

test('registriereVersand hängt Eintrag an gesendetInfos', () => {
  const wb = { akten: [], gesendetInfos: [] };
  const wb2 = registriereVersand(wb, 'DEU90ARN', 'm1', '2026-11-18');
  assert.deepEqual(wb2.gesendetInfos[0], { haendlerId: 'DEU90ARN', artikelId: 'm1', datum: '2026-11-18' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/infodist/selektion.test.js`
Expected: FAIL (Module fehlen)

- [ ] **Step 3: Write minimal implementation**

```js
// app/adapter/mail-adapter.js
// Phase 1 (Demo): simuliertes Postfach aus postfach-demo.json.
// Phase 2 (perspektivisch): echte Outlook-Mailbox (z. B. Microsoft Graph).
// Der Adapter-Vertrag bleibt identisch: liefert Mails im Shape
// {id, von, datum, betreff, text, themen[]}. Die Agent-Logik (infodist/)
// ändert sich beim Wechsel auf Phase 2 nicht.
export function ladeMails(postfachDaten) {
  return [...postfachDaten.mails];
}
export const ladeMailbox = ladeMails;
```

```js
// app/infodist/selektion.js
function alleThemen(akte) {
  const s = new Set((akte.prioThemen ?? []).map((t) => t.toLowerCase()));
  for (const h of akte.besuchHistorie ?? []) {
    for (const t of h.themen ?? []) s.add(t.toLowerCase());
  }
  return s;
}

export function vorschlaege({ mails, akte, gesendetInfos }) {
  const themen = alleThemen(akte);
  const gesendet = new Set(
    gesendetInfos.filter((g) => g.haendlerId === akte.haendlerId).map((g) => g.artikelId));
  return mails
    .filter((m) => !gesendet.has(m.id))
    .filter((m) => (m.themen ?? []).some((t) => themen.has(t.toLowerCase())))
    .map((m) => ({
      mailId: m.id,
      begruendung: `Thematisch passend (${(m.thenes ?? m.themen ?? []).join(', ')}) und noch nicht gesendet.`,
    }));
}

export function registriereVersand(wissensbasis, haendlerId, artikelId, datum) {
  return { ...wissensbasis, gesendetInfos:
    [...wissensbasis.gesendetInfos, { haendlerId, artikelId, datum }] };
}
```

- [ ] **Step 4**: Run test to verify it passes**

Run: `node --test tests/infodist/selektion.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Demo-Daten + Commit**

`daten/postfach-demo.json` (= `MAILS`-Array aus dem Test, Wrapper `{mails: [...]}`) und `daten/infos.json` (3 Rundschreiben/Mailings `{id, quelle, datum, themen, zielgruppen, mehrwertNotiz}`) anlegen.

```bash
git add app/adapter/mail-adapter.js app/infodist/selektion.js daten/postfach-demo.json daten/infos.json tests/infodist/selektion.test.js
git commit -m "feat: info-verteilung phase 1 mit simuliertem postfach"
```

---

### Task 9: UI-Anbindung (Briefing, Bericht, Info-Verteilung)

**Files:**
- Create: `app/ui/briefing-view.js`
- Create: `app/ui/bericht-view.js`
- Create: `app/ui/infodist-view.js`
- Modify: `app/app.js` (Termin-Auswahl → Briefing anzeigen; Button "Bericht erfassen" → Formular; Freigabe → Akte speichern + Entwurf; Info-Tab)

**Interfaces:**
- Consumes: `baueBriefing`, `baueSchnellblatt`, `erstelleBericht`, `aufgabenAlsMassnahmen`, `erstelleEntwurf`, `vorschlaege`, `speichereAkte`, `uebernimmAufgabe` — exakte Signaturen aus Tasks 1–8
- Produces: DOM-Funktionen `rendereBriefing(container, briefing, schnellblatt)`, `rendereBerichtFormular(container, onFreigeben)`, `rendereInfoVorschlaege(container, vorschlaege, onSenden)` (keine Unit-Tests; manuell im Browser prüfen)

- [ ] **Step 1: Views implementieren**

```js
// app/ui/briefing-view.js
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
      <ul>${briefing.letzteGespraeche.map((g) => `<li>${g.datum}: ${g.themen.join(', ')}</li>`).join('')}</ul>
      <h3>Persönliche Notizen</h3>
      <ul>${briefing.notizen.map((n) => `<li>${n.datum}: ${n.text}</li>`).join('')}</ul>
      ${schnellblatt ? `<h3>Auf dem Parkplatz</h3><ul>
        <li>STP: ${schnellblatt.stp.punkte} Punkte (${schnellblatt.stp.praemie})</li>
        <li>TVA: Stand ${schnellblatt.tva.letzterStand}</li>
        <li>ZA-Befreiung: ${schnellblatt.zaBefreiung.befreit ? 'ja' : 'nein'}</li></ul>` : ''}
    </section>`;
}
```

```js
// app/ui/bericht-view.js
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
```

```js
// app/ui/infodist-view.js
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
```

- [ ] **Step 2: app.js verdrahten**

In `app/app.js` ergänzen (vorhandene Import- und Render-Struktur beibehalten):

```js
import { baueBriefing } from './briefing/checkliste.js';
import { baueSchnellblatt } from './briefing/schnellblatt.js';
import { erstelleBericht, aufgabenAlsMassnahmen } from './bericht/vorlage.js';
import { erstelleEntwurf } from './bericht/entwurf.js';
import { vorschlaege, registriereVersand } from './infodist/selektion.js';
import { ladeAkte, uebernimmAufgabe, speichereAkte } from './wissensbasis/akte.js';
import { rendereBriefing } from './ui/briefing-view.js';
import { rendereBerichtFormular } from './ui/bericht-view.js';
import { rendereInfoVorschlaege } from './ui/infodist-view.js';
```

Der Bericht-Freigabe-Handler (Pseudokontrakt, an den bestehenden Speicheradapter anpassen):

```js
// Freigeben: Bericht bauen → Aufgaben übernehmen → Akte speichern → Mail-Entwurf
function berichtFreigeben(formwerte, { wissensbasis, bausteineDaten }) {
  const teilnehmer = formwerte.teilnehmer.split(',').map((s) => s.trim()).filter(Boolean);
  const aufgaben = formwerte.aufgaben.split('\n').map((zeile) => {
    const [titel, verantwortlich, frist] = zeile.split('|').map((s) => s.trim());
    return { titel, verantwortlich: verantwortlich ?? '', frist: frist || null };
  }).filter((a) => a.titel);
  const komma = (s) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  const eingabe = {
    haendlerId: formwerte.haendlerId, datum: formwerte.datum, teilnehmer,
    themen: komma(formwerte.themen), vereinbarungen: komma(formwerte.vereinbarungen),
    aufgaben, offenePunkte: komma(formwerte.offenePunkte), stichpunkte: formwerte.stichpunkte,
  };
  const r = erstelleBericht(eingabe);
  if (!r.ok) return { ok: false, fehlend: r.fehlend };
  let akte = ladeAkte(wissensbasis, eingabe.haendlerId);
  for (const m of aufgabenAlsMassnahmen(r.bericht)) akte = uebernimmAufgabe(akte, m);
  const wb2 = speichereAkte(wissensbasis, akte);
  const entwurf = formwerte.kampagne
    ? erstelleEntwurf(r.bericht, bausteineDaten, formwerte.kampagne) : null;
  return { ok: true, wissensbasis: wb2, bericht: r.bericht, entwurf };
}
```

- [ ] **Step 3: Regressions-Test + manueller Browser-Durchlauf**

Run: `node --test tests/`
Expected: alle bisherigen Tests PASS

Manuell prüfen (`python3 -m http.server 8000` — nur Browser, kein Test):
1. Termin anklicken → Briefing erscheint mit KPI/Themen/Schnellblatt.
2. Bericht erfassen (unvollständig) → Fehlermeldung mit `fehlend`.
3. Bericht vollständig freigeben → Maßnahme in Akte, E-Mail-Entwurf mit TVA-Anhang sichtbar.
4. Info-Verteilung → Vorschläge mit Begründung, "Als gesendet markieren" entfernt Vorschlag.

- [ ] **Step 4: Commit**

```bash
git add app/ui/briefing-view.js app/ui/bericht-view.js app/ui/infodist-view.js app/app.js
git commit -m "feat: ui für briefing, bericht und info-verteilung"
```

---

### Task 10: Plan-View-Farbcodierung nach Besuchs-Historie

**Files:**
- Create: `app/wissensbasis/farbcodierung.js`
- Modify: `app/ui/woche.js` (Termin-`<li>` erhält Klasse nach letztem Besuch)
- Test: `tests/wissensbasis/farbcodierung.test.js`

**Interfaces:**
- Consumes: `besuchVerlauf: [isoDatum]` je Händler; Schwellen konfigurierbar, Standard: < 6 Wochen = `farbe-frisch` (grün), < 12 Wochen = `farbe-ok` (gelb), sonst = `farbe-ueberfaellig` (rot)
- Produces: `farbeFuer(letzterBesuchIso, heute, {schwelleGruenWochen=6, schwelleGelbWochen=12}) -> 'frisch'|'ok'|'ueberfaellig'`

- [ ] **Step 1: Write the failing test**

```js
// tests/wissensbasis/farbcodierung.test.js
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { farbeFuer } from '../../app/wissensbasis/farbcodierung.js';

test('Besuch unter 6 Wochen -> frisch', () => {
  assert.equal(farbeFuer('2026-11-05', '2026-11-18'), 'frisch');
});

test('Besuch 6–12 Wochen -> ok', () => {
  assert.equal(farbeFuer('2026-10-01', '2026-11-18'), 'ok');
});

test('Besuch über 12 Wochen oder nie -> ueberfaellig', () => {
  assert.equal(farbeFuer('2026-08-01', '2026-11-18'), 'ueberfaellig');
  assert.equal(farbeFuer(null, '2026-11-18'), 'ueberfaellig');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/wissensbasis/farbcodierung.test.js`
Expected: FAIL (Modul fehlt)

- [ ] **Step 3: Write minimal implementation**

```js
// app/wissensbasis/farbcodierung.js
export function farbeFuer(letzterBesuchIso, heute,
  { schwelleGruenWochen = 6, schwelleGelbWochen = 12 } = {}) {
  if (!letzterBesuchIso) return 'ueberfaellig';
  const tage = Math.round((new Date(`${heute}T00:00:00Z`) - new Date(`${letzterBesuchIso}T00:00:00Z`)) / 86400000);
  if (tage < schwelleGruenWochen * 7) return 'frisch';
  if (tage < schwelleGelbWochen * 7) return 'ok';
  return 'ueberfaellig';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/wissensbasis/farbcodierung.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: woche.js anbinden**

In `app/ui/woche.js` die Terminzeile erweitern (Import ergänzen: `import { farbeFuer } from '../wissensbasis/farbcodierung.js';`), `woche.heute` wird an `renderePlanraster` mitgegeben bzw. `new Date().toISOString().slice(0, 10)`):

```js
// in der map-Zeile statt ${x.start}–${x.ende} ${x.haendlerId}:
`<li draggable="true" class="farbe-${farbeFuer(haendlerVerlauf[x.haendlerId] ?? null, heute)}"
   data-id="${x.haendlerId}" data-woche="${wi}" data-tag="${ti}" data-slot="${si}">
   ${x.start}–${x.ende} ${x.haendlerId}</li>`
```

`haendlerVerlauf` = Map `id -> letztes besuchVerlauf-Datum` (vorab aus der Händlerliste, z. B. `Object.fromEntries(haendler.map((h) => [h.id, h.besuchVerlauf.at(-1)]))`). CSS: `.farbe-frisch { border-left: 4px solid green }`, `.farbe-ok { border-left: 4px solid orange }`, `.farbe-ueberfaellig { border-left: 4px solid red }`.

- [ ] **Step 6: Gesamt-Tests + Commit**

Run: `node --test tests/`
Expected: alle Tests PASS (inkl. bestehender 26 Planungs-Tests)

```bash
git add app/wissensbasis/farbcodierung.js app/ui/woche.js tests/wissensbasis/farbcodierung.test.js
git commit -m "feat: plan-view farbcodierung nach besuchs-historie"
```

---

## Selbst-Review (ausgeführt)

- **Spec-Abdeckung:** Händlerakte (T1), Kadenz (T2), Scorecard/KPI (T3), Briefing (T4), Schnellblatt (T5), Bericht (T6), E-Mail-Bausteine + TVA (T7), Mail-Adapter Phase 1/2 + Info-Verteilung (T8), UI (T9), Farbcodierung (T10) — alle Spec-Abschnitte 3.1–3.4 und 5–7 abgedeckt.
- **Phasenmodell:** Phase 2 (Outlook/KI) ist bewusst kein Task, nur Adapter-Vertrag (T7/T8-Kommentare) — gemäß Nutzerentscheidung.
- **Typ-Konsistenz:** `ladeAkte`/`speichereAkte`-Signatur konsistent zwischen T1, T8, T9; KPI-Shape konsistent zwischen T3, T4, T5; Report-Shape konsistent zwischen T6, T7, T9.
