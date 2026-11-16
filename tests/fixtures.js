const NAMEN = ['Bergmann', 'Sperl', 'Kraus', 'Wagenfeld'];
const ZENTREN = [
  { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }, { x: 20, y: 20 },
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
