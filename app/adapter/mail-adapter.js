// Phase 1 (Demo): simuliertes Postfach aus postfach-demo.json.
// Phase 2 (perspektivisch): echte Outlook-Mailbox (z. B. Microsoft Graph).
// Der Adapter-Vertrag bleibt identisch: liefert Mails im Shape
// {id, von, datum, betreff, text, themen[]}. Die Agent-Logik (infodist/)
// ändert sich beim Wechsel auf Phase 2 nicht.
export function ladeMails(postfachDaten) {
  return [...postfachDaten.mails];
}
export const ladeMailbox = ladeMails;
