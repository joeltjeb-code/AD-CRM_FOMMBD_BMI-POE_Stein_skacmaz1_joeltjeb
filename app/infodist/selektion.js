function alleThemen(akte) {
  const s = new Set((akte.prioThemen ?? []).map((t) => t.toLowerCase()));
  for (const h of akte.besuchHistorie ?? []) {
    for (const t of h.themen ?? []) s.add(t.toLowerCase());
  }
  return s;
}

export function vorschlaege({ mails, akte, gesendetInfos }) {
  const themen = alleThemen(akte);
  const gesendet = new Set(
    gesendetInfos.filter((g) => g.haendlerId === akte.haendlerId).map((g) => g.artikelId));
  return mails
    .filter((m) => !gesendet.has(m.id))
    .filter((m) => (m.themen ?? []).some((t) => themen.has(t.toLowerCase())))
    .map((m) => ({
      mailId: m.id,
      begruendung: `Thematisch passend (${(m.themen ?? []).join(', ')}) und noch nicht gesendet.`,
    }));
}

export function registriereVersand(wissensbasis, haendlerId, artikelId, datum) {
  return { ...wissensbasis, gesendetInfos:
    [...wissensbasis.gesendetInfos, { haendlerId, artikelId, datum }] };
}
