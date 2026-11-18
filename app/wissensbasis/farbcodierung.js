export function farbeFuer(letzterBesuchIso, heute,
  { schwelleGruenWochen = 6, schwelleGelbWochen = 12 } = {}) {
  if (!letzterBesuchIso) return 'ueberfaellig';
  const tage = Math.round((new Date(`${heute}T00:00:00Z`) - new Date(`${letzterBesuchIso}T00:00:00Z`)) / 86400000);
  if (tage < schwelleGruenWochen * 7) return 'frisch';
  if (tage < schwelleGelbWochen * 7) return 'ok';
  return 'ueberfaellig';
}
