import { bausteinTexte } from '../adapter/text-adapter.js';

// Allgemeine Themen-Anhänge: situativ anhängbare Standarddokumente je Thema
// (nicht Teil der spezifischen Kampagnen-Vorlagen). Teilstring-Match, Kleinbuchstaben.
export function allgemeineAnhaengeFuer(themen, katalog) {
  const t = (themen ?? []).map((x) => String(x).toLowerCase());
  const treffer = (katalog ?? []).filter((k) =>
    k.schluessel?.some((s) => t.some((thema) => thema.includes(s.toLowerCase()))));
  return treffer.flatMap((k) => k.anhaenge.map((a) => ({ ...a })));
}

function fuegeEinmalHinzu(liste, anhaenge) {
  const namen = new Set(liste.map((a) => a.name));
  for (const a of anhaenge) {
    if (!namen.has(a.name)) {
      liste.push({ ...a });
      namen.add(a.name);
    }
  }
  return liste;
}

export function erstelleEntwurf(bericht, bausteineDaten, kampagnenId, { themenAnhaengeKatalog } = {}) {
  const kampagne = bausteineDaten.kampagnen.find((k) => k.id === kampagnenId);
  if (!kampagne) {
    return { ok: false, begruendung: `Unbekannte Kampagne: ${kampagnenId}` };
  }
  const anhaenge = fuegeEinmalHinzu(fuegeEinmalHinzu([], kampagne.anhaenge),
    allgemeineAnhaengeFuer(bericht.themen, themenAnhaengeKatalog));
  const endgueltig = anhaenge.some((a) => a.typ === 'tva')
    ? anhaenge
    : fuegeEinmalHinzu(anhaenge, [{ name: 'TVA.pdf', typ: 'tva' }]);
  return {
    ok: true,
    entwurf: {
      betreff: kampagne.betreff,
      text: bausteinTexte(kampagne, bericht).join('\n\n'),
      anhaenge: endgueltig,
      links: [...kampagne.links],
    },
    zusammenfassung: ['TVA als Pflichtanhang', 'persönliche Ergänzung möglich'],
  };
}
