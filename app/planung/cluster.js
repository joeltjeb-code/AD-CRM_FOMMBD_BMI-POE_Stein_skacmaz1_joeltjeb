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
