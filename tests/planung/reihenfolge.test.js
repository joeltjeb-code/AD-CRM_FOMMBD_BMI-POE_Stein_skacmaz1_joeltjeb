import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import { erstelleDemoRouting } from '../../app/adapter/routing-adapter.js';
import { SKELETT, minZuUhr, uhrZuMin, validiereReihenfolge, planeTag, zeitreihe, besteEinsattposition } from '../../app/planung/reihenfolge.js';

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
  assert.equal(t1, SKELETT.fruehstartMin); // erster Termin startet fix 08:30
  const t3 = uhrZuMin(tag.termine[2].start);
  assert.ok(t3 <= SKELETT.letzterStartMin);
});

test('Sehr weit entfernter Start sprengt das Skelett', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3);
  // Start rund 100 km Luftlinie von Cluster 0 entfernt
  const tag = planeTag(drei, { name: 'Fern', pos: { x: 200, y: 200 } }, r);
  assert.equal(tag.ok, false);
  assert.match(tag.grund, /einhaltbar/);
});

test('validiereReihenfolge behält die gegebene Reihenfolge bei', () => {
  const { haendler } = baueFixtures();
  const drei = haendler.filter((h) => h.cluster === 0).slice(0, 3).reverse();
  const res = validiereReihenfolge(drei, { name: 'X', pos: drei[0].pos }, r);
  assert.equal(res.ok, true);
  assert.deepEqual(res.termine.map((t) => t.haendlerId), drei.map((d) => d.id));
});

test('Zwischen Terminen liegt ein realistischer Wechselpuffer (15 min)', () => {
  const drei = [
    { id: 'A', dauer: 90, pos: { x: 0, y: 0 } },
    { id: 'B', dauer: 90, pos: { x: 0.5, y: 0 } }, // 1-2 min Fahrt
  ];
  const res = validiereReihenfolge(drei, { name: 'X', pos: { x: 0.2, y: 0 } }, r);
  assert.equal(res.ok, true);
  const endeA = uhrZuMin(res.termine[0].ende);
  const startB = uhrZuMin(res.termine[1].start);
  const luecke = startB - endeA;
  // Fahrzeit + Puffer: mind. 15 min Lücke, aber keine roboterhafte 5-Min-Folge
  assert.ok(luecke >= 15, `Lücke zwischen Terminen nur ${luecke} min`);
  assert.ok(luecke <= 30, `Lücke zwischen Terminen ${luecke} min — zu groß für die kurze Strecke`);
});

test('Mittagspause: Termin in der Mittagszeit startet frühestens 12:30', () => {
  const drei = [
    { id: 'A', dauer: 120, pos: { x: 0, y: 0 } },   // 08:30–10:30
    { id: 'B', dauer: 60, pos: { x: 1.5, y: 0 } },  // ca. 10:45–11:45
    { id: 'C', dauer: 90, pos: { x: 3, y: 0 } },    // ohne Pause ~12:08 → Pause → 12:30
  ];
  const res = validiereReihenfolge(drei, { name: 'X', pos: { x: 0.5, y: 0 } }, r);
  assert.equal(res.ok, true);
  const startC = uhrZuMin(res.termine[2].start);
  const endeB = uhrZuMin(res.termine[1].ende);
  assert.equal(startC, 750, `Termin C startet ${minZuUhr(startC)} statt 12:30 (Mittagspause)`);
  assert.ok(startC - endeB >= 30, 'Zwischen B-Ende und C-Start liegen mindestens 30 min (Pause/Fahrt)');
});

test('zeitreihe: nach dem Einschieben rücken Folge-Termine nach (Trickle-Down)', () => {
  const vater = [
    { id: 'A', dauer: 90, pos: { x: 0, y: 0 } },
    { id: 'B', dauer: 90, pos: { x: 1, y: 0 } },
  ];
  const vor = zeitreihe(vater, { name: 'X', pos: { x: 0.5, y: 0 } }, r);
  // C ans Ende: B rückt nach hinten, kein Termin startet vor seinem Vorgänger-Ende
  // C wird ZWISCHEN A und B eingeschoben → B muss per Trickle-Down nach hinten rücken
  const nach = zeitreihe([vater[0], { id: 'C', dauer: 90, pos: { x: 2, y: 0 } }, vater[1]], { name: 'X', pos: { x: 0.5, y: 0 } }, r);
  assert.equal(nach.ok, true);
  assert.equal(nach.termine.length, 3);
  for (let i = 1; i < nach.termine.length; i++) {
    const prevEnde = uhrZuMin(nach.termine[i - 1].ende);
    const start = uhrZuMin(nach.termine[i].start);
    assert.ok(start >= prevEnde, `Überlappung: ${minZuUhr(start)} vor Ende ${minZuUhr(prevEnde)}`);
  }
  assert.ok(uhrZuMin(nach.termine[1].start) > uhrZuMin(vor.termine[1].start), 'B beginnt später als vor dem Einschieben');
});

test('zeitreihe: 4. Termin startet nach 15:30 → ueberlaeuft-Flag statt Fehler', () => {
  const vier = Array.from({ length: 4 }, (_, i) =>
    ({ id: `H${i}`, dauer: 120, pos: { x: 0, y: 0 } }));
  const res = zeitreihe(vier, { name: 'X', pos: { x: 0, y: 0 } }, r);
  assert.equal(res.ok, true);                          // nie invalid — Trickle-Down statt Fehler
  assert.equal(res.ueberlaeuft, true, 'letzte Termin startet nach 15:30 → überläuft');
  for (let i = 1; i < res.termine.length; i++) {
    assert.ok(uhrZuMin(res.termine[i].start) >= uhrZuMin(res.termine[i - 1].ende), 'keine Überlappung');
  }
});

test('besteEinsattposition: wählt die Einsattposition mit der kürzesten Gesamt-Fahrzeit', () => {
  const liste = [
    { id: 'A', dauer: 90, pos: { x: 0, y: 0 } },
    { id: 'B', dauer: 90, pos: { x: 10, y: 0 } },
  ];
  // C liegt neben B → Anhängen (nach B) schlägt dazwischenstecken
  const c = { id: 'C', dauer: 90, pos: { x: 11, y: 0 } };
  const pos = besteEinsattposition(liste, c, { name: 'X', pos: { x: 0, y: 0 } }, r);
  assert.equal(pos, 2, 'C gehört ans Ende, direkt hinter B');
  // CDazwischen für den Fall, dass C mittig dichter liegt
  const c2 = { id: 'C2', dauer: 90, pos: { x: 5, y: 0 } };
  assert.equal(besteEinsattposition(liste, c2, { name: 'X', pos: { x: 0, y: 0 } }, r), 1);
});
