import { bausteinTexte } from '../adapter/text-adapter.js';

export function erstelleEntwurf(bericht, bausteineDaten, kampagnenId) {
  const kampagne = bausteineDaten.kampagnen.find((k) => k.id === kampagnenId);
  if (!kampagne) {
    return { ok: false, begruendung: `Unbekannte Kampagne: ${kampagnenId}` };
  }
  const anhaenge = kampagne.anhaenge.some((a) => a.typ === 'tva')
    ? [...kampagne.anhaenge]
    : [...kampagne.anhaenge, { name: 'TVA.pdf', typ: 'tva' }];
  return {
    ok: true,
    entwurf: {
      betreff: kampagne.betreff,
      text: bausteinTexte(kampagne, bericht).join('\n\n'),
      anhaenge,
      links: [...kampagne.links],
    },
    zusammenfassung: ['TVA als Pflichtanhang', 'persönliche Ergänzung möglich'],
  };
}
