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
