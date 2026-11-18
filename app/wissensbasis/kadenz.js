export const KADENZ_STANDARD_WOCHEN = 6;

export function folgeterminNachBesuch(isoDatum, kadenzWochen = KADENZ_STANDARD_WOCHEN) {
  const d = new Date(`${isoDatum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + kadenzWochen * 7);
  return d.toISOString().slice(0, 10);
}

export function kadenzVonAkte(akte) {
  return akte.folgeterminKadenzWochen ?? KADENZ_STANDARD_WOCHEN;
}
