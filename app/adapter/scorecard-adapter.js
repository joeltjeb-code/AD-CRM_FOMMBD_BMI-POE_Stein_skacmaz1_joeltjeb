// Demo: statische Demo-JSON. Später: echter Scorecard-Connector (z. B. GCP)
// mit gleicher Signatur — Logik der App ändert sich nicht (Adapter-Prinzip).
export function ladeKpiWerte(scorecardDaten, haendlerId) {
  return scorecardDaten.haendler.find((h) => h.id === haendlerId) ?? null;
}
