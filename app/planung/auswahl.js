export const KADENZ = { standard: 85, prio: 40 };
export const PRO_WOCHE = 12;

const TAG_MS = 24 * 60 * 60 * 1000;
function tage(dIso) { return Date.parse(dIso + 'T00:00:00Z') / TAG_MS; }

export function tageSeitBesuch(h, heuteIso) {
  const v = h.besuchVerlauf || [];
  if (v.length === 0) return 9999;
  const letzter = v.reduce((a, b) => (b > a ? b : a));
  return Math.floor(tage(heuteIso) - tage(letzter));
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
      // Kandidaten des ältesten Clusters zuerst; nur wenn das Cluster kleiner
      // als das Wochensoll ist, wird aus dem nächsten Cluster nachgefüllt
      const cluster = rest[0].cluster;
      const inCluster = rest.filter((h) => h.cluster === cluster);
      const nimm = inCluster.slice(0, proWoche - woche.length);
      woche.push(...nimm);
      const ids = new Set(nimm.map((h) => h.id));
      for (let i = rest.length - 1; i >= 0; i--) {
        if (ids.has(rest[i].id)) rest.splice(i, 1);
      }
    }
    wochen.push(woche);
  }
  return wochen;
}
