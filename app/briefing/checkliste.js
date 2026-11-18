function tageBisMMTT(heute, mmtt) {
  const jahr = new Date(`${heute}T00:00:00Z`).getUTCFullYear();
  const restJahr = Math.round((new Date(`${jahr}-${mmtt}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400000);
  return restJahr >= 0
    ? restJahr
    : Math.round((new Date(`${jahr + 1}-${mmtt}T00:00:00Z`) - new Date(`${heute}T00:00:00Z`)) / 86400000);
}

export function baueBriefing({ haendlerStamm, akte, kpi, heute }) {
  const kpiBlock = kpi
    ? [{ titel: `WKR-Performance (Tier ${kpi.wkr.tier})`, wert: `${kpi.wkr.quoteProzent} %` },
       { titel: 'Wischerdisplay', wert: kpi.wischerdisplay.bestellt
          ? `bestellt am ${kpi.wischerdisplay.datum}` : 'nicht bestellt' },
       { titel: `AFSB-Status ${kpi.afsb.status}`, wert: `${kpi.afsb.punkteBisGold} Punkte bis Gold` }]
    : [{ titel: 'KPI', wert: 'keine Scorecard-Daten' }];

  const pflichthemen = [];
  if (kpi && kpi.wkr.quoteProzent < 55) {
    pflichthemen.push({ titel: 'WKR-Performance ansprechen', begruendung: `Quote ${kpi.wkr.quoteProzent} %` });
  }
  if (kpi && !kpi.wischerdisplay.bestellt) {
    pflichthemen.push({ titel: 'Wischerdisplay vorstellen', begruendung: 'noch nicht bestellt' });
  }
  for (const t of akte.prioThemen ?? []) {
    pflichthemen.push({ titel: t.charAt(0).toUpperCase() + t.slice(1), begruendung: 'Prio-Liste des AD' });
  }

  const hinweise = [];
  for (const n of akte.persoenlicheNotizen ?? []) {
    if (n.kind === 'geburtstag' && n.tag) {
      const tage = tageBisMMTT(heute, n.tag);
      if (tage <= 14) hinweise.push(`Geburtstag in ${tage} Tagen (${n.text})`);
    }
  }

  return {
    anrede: haendlerStamm.gf1 ?? akte.stammdaten.anrede?.replace(/ \((GF\d)\)$/, '') ?? haendlerStamm.name,
    kpiBlock,
    pflichthemen,
    massnahmen: akte.offeneMassnahmen ?? [],
    letzteGespraeche: akte.besuchHistorie ?? [],
    notizen: akte.persoenlicheNotizen ?? [],
    hinweise,
  };
}
