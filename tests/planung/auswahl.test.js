import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { baueFixtures } from '../fixtures.js';
import {
  tageSeitBesuch, istFaellig, faelligeKandidaten, verteileAufWochen,
} from '../../app/planung/auswahl.js';

const HEUTE = '2026-11-16';

test('tageSeitBesuch berechnet Tagesdifferenz, 9999 ohne Besuch', () => {
  assert.equal(tageSeitBesuch({ besuchVerlauf: ['2026-10-01'] }, HEUTE), 46);
  assert.equal(tageSeitBesuch({ besuchVerlauf: [] }, HEUTE), 9999);
});

test('Prio-Händler ist früher fällig als Standard', () => {
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

test('verteileAufWochen: 12 pro Woche, maximal 2 Cluster je Woche', () => {
  const { haendler } = baueFixtures();
  const wochen = verteileAufWochen(faelligeKandidaten(haendler, HEUTE), 4);
  assert.equal(wochen.length, 4);
  for (const w of wochen) {
    assert.equal(w.length, 12);
    assert.ok(new Set(w.map((h) => h.cluster)).size <= 2, 'maximal 2 Cluster pro Woche');
  }
});
