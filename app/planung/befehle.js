import { TAGE_NAMEN, frischauf } from './planer.js';

const TAG_ALIASE = {
  di: 'Dienstag', dienstag: 'Dienstag',
  mi: 'Mittwoch', mittwoch: 'Mittwoch',
  do: 'Donnerstag', donnerstag: 'Donnerstag',
  fr: 'Freitag', freitag: 'Freitag',
};

function tagZuName(wort) { return TAG_ALIASE[wort.toLowerCase()]; }

export function parseBefehl(text) {
  const t = text.trim();
  let m = t.match(/^verschiebe\s+(\S+)\s+auf\s+(\S+)$/i);
  if (m) return { typ: 'verschiebe', haendlerId: m[1], zielTag: tagZuName(m[2]) };
  m = t.match(/^übernachte\s+(?:am\s+)?(\S+)\s+im\s+hotel$/i);
  if (m) return { typ: 'uebernachtung', tag: tagZuName(m[1]), art: 'hotel' };
  m = t.match(/^übernachte\s+(?:am\s+)?(\S+)\s+(?:zu\s*hause|zu\s+hause|in\s+der\s+heimat)$/i);
  if (m) return { typ: 'uebernachtung', tag: tagZuName(m[1]), art: 'heim' };
  m = t.match(/^(dienstag|mittwoch|donnerstag|freitag)\s+fr(?:ü|ue)her\s+beenden$/i);
  if (m) return { typ: 'frueher', tag: tagZuName(m[1]), letzterStartMin: 810 }; // 13:30
  m = t.match(/^starte\s+(\S+)\s+vom\s+(.+)$/i);
  if (m) return { typ: 'startort', tag: tagZuName(m[1]), name: m[2].trim() };
  return { typ: 'unbekannt', text: t };
}

function tagIndex(name) { return TAGE_NAMEN.indexOf(name); }

export function wendeAn(plan, befehl, kontext) {
  if (befehl.typ === 'unbekannt') {
    return { plan, meldung: `Befehl nicht verstanden: "${befehl.text}"` };
  }
  const p = JSON.parse(JSON.stringify(plan)); // tiefe Kopie
  if (befehl.typ === 'verschiebe') {
    const ziel = tagIndex(befehl.zielTag);
    if (ziel < 0) return { plan, meldung: `Unbekannter Tag: ${befehl.zielTag}` };
    for (const woche of p.wochen) {
      const zielTag = woche.tage[ziel] ?? woche.tage[tagIndex(befehl.zielTag)];
      for (const t of woche.tage) {
        const i = (t.termine ?? []).findIndex((x) => x.haendlerId === befehl.haendlerId);
        if (i >= 0) {
          const [termin] = t.termine.splice(i, 1);
          zielTag.termine.push(termin);
          frischauf(p, kontext);
          return { plan: p, meldung: `${befehl.haendlerId} nach ${befehl.zielTag} verschoben.` };
        }
      }
    }
    return { plan, meldung: `Händler ${befehl.haendlerId} im Plan nicht gefunden.` };
  }
  if (befehl.typ === 'uebernachtung') {
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag);
      if (t) {
        t.uebernachtung = { ...(t.uebernachtung ?? {}), art: befehl.art, vorgabe: true };
        return { plan: p, meldung: `Übernachtung (${befehl.art === 'hotel' ? 'Hotel' : 'zu Hause'}) für ${befehl.tag} gesetzt.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  if (befehl.typ === 'frueher') {
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag && !x.leer);
      if (t) {
        t.letzterStartMin = befehl.letzterStartMin;
        frischauf(p, kontext);
        return { plan: p, meldung: `${befehl.tag}: letzter Terminstart auf 13:30 gesetzt.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  if (befehl.typ === 'startort') {
    const ort = kontext.settings.altStartorte.find(
      (o) => o.name.toLowerCase().includes(befehl.name.toLowerCase())
          || befehl.name.toLowerCase().includes(o.name.toLowerCase())
    );
    if (!ort) return { plan, meldung: `Startort "${befehl.name}" ist nicht hinterlegt.` };
    for (const woche of p.wochen) {
      const t = woche.tage.find((x) => x.tag === befehl.tag && !x.leer);
      if (t) {
        t.startortName = ort.name;
        t.startortPos = ort.pos;
        frischauf(p, kontext);
        return { plan: p, meldung: `${befehl.tag} startet ab ${ort.name}.` };
      }
    }
    return { plan, meldung: `Tag ${befehl.tag} nicht im Plan.` };
  }
  return { plan, meldung: 'Befehl nicht verstanden.' };
}
