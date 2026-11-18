// Validiert einen aus dem Speicher geladenen Plan gegen den aktuellen
// Händler-Datensatz. Nach einem Demo-Daten-Re-Generieren (IDs ändern sich)
// würde ein alter Plan sonst Geister-Termine rendern. Solch ein Plan wird
// verworfen und neu geplant.
export function istPlanGueltig(plan, dealersById) {
  if (!plan || !Array.isArray(plan.wochen) || plan.wochen.length === 0) return false;
  if (!dealersById) return false;
  let hatTage = false;
  for (const woche of plan.wochen) {
    if (!Array.isArray(woche?.tage)) return false;
    for (const t of woche.tage) {
      if (!t) continue;
      hatTage = true;
      for (const termin of t.termine ?? []) {
        if (!termin?.haendlerId || !dealersById[termin.haendlerId]) return false;
      }
    }
  }
  return hatTage;
}
