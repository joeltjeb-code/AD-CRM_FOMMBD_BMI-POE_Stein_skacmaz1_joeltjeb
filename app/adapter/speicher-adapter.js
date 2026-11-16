export function erstelleSpeicher(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Kein Storage verfügbar');
  return {
    lade(schluessel, fallback = null) {
      const roh = storage.getItem(schluessel);
      return roh ? JSON.parse(roh) : fallback;
    },
    speichere(schluessel, wert) { storage.setItem(schluessel, JSON.stringify(wert)); },
    exportJson(wert) { return JSON.stringify(wert, null, 2); },
    importJson(text) { return JSON.parse(text); },
  };
}
