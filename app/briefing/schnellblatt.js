export function baueSchnellblatt(kpi) {
  if (!kpi?.parkplatz) return null;
  return {
    stp: { ...kpi.parkplatz.stp },
    tva: { ...kpi.parkplatz.tva },
    zaBefreiung: { ...kpi.parkplatz.zaBefreiung },
  };
}
