// Demo: deterministische Baustein-Auswahl. Später: LLM-Connector mit gleicher
// Signatur (Bericht + Kampagnen-Bausteine -> Textbausteine) — Logik ändert sich nicht.
export function bausteinTexte(kampagne, bericht) {
  return [...kampagne.textbausteine];
}
