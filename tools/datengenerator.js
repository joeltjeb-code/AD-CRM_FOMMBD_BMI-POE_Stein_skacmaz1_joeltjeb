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
