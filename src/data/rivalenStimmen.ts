// ─── Magic City – Stimmen der Rivalen ───────────────────────────
// Je Rivalen-Gilde (data/rivalen.ts) drei trockene Sätze, passend zum Motto:
// einer, wenn du an ihr vorbeiziehst, einer, wenn sie an dir vorbeizieht, und
// einer für die Warnung auf der Seite «Rangliste». Kein Zufall: Jeder Satz
// hängt an einem echten Überholen (Anzeige: ui/components/RanglistenBilanzAnzeige.ts).
// Die Sätze ohne «» (die setzt die Anzeige).
// ────────────────────────────────────────────────────────────────

export interface RivalenStimme {
  /** Du ziehst an ihr vorbei (Expeditions-Bericht) */
  ueberholt: string;
  /** Sie zieht an dir vorbei (Expeditions-Bericht) */
  vorbei: string;
  /** Sie zieht bald vorbei (Warnung in der Rangliste) */
  drohung: string;
}

export type StimmenAnlass = keyof RivalenStimme;

/** Rivalen-ID → ihre drei Sätze */
export const RIVALEN_STIMMEN: Record<string, RivalenStimme> = {
  sturmadler: {
    ueberholt: 'Wir kreisen nur. Das sieht von oben bloss aus wie Zurückfallen.',
    vorbei: 'Von hier oben sieht man dich kaum. Wir winken trotzdem.',
    drohung: 'Wir sind schon im Anflug. Bitte nicht ducken, das macht es nur peinlicher.',
  },
  glutschwinge: {
    ueberholt: 'Glückwunsch. Eine Grusskarte ist unterwegs. Sie brennt schon.',
    vorbei: 'Wir kamen mit Feuer. Du darfst die Asche behalten.',
    drohung: 'Riechst du das? Das ist nicht dein Abendessen.',
  },
  silbereulen: {
    ueberholt: 'Wir haben das nachgeprüft. Dreimal. Es stimmt leider.',
    vorbei: 'Laut Kleingedrucktem stehst du jetzt hinter uns. Seite 412, unten links.',
    drohung: 'Wir haben nachgerechnet. Mit Fussnoten. Es sieht nicht gut aus für dich.',
  },
  dunstrudel: {
    ueberholt: 'Wir haben kurz nachgedacht. Das passiert uns nicht wieder.',
    vorbei: 'Keine Ahnung, wie das ging. Wir sind einfach gerannt.',
    drohung: 'Wir rennen schon. Wohin genau, klären wir unterwegs.',
  },
  glueckspilze: {
    ueberholt: 'Pech gehabt. Hatten wir noch nie. Fühlt sich komisch an.',
    vorbei: 'Wir hatten keinen Plan. Hat wieder bestens geklappt.',
    drohung: 'Wir haben ein gutes Gefühl. Wir haben immer ein gutes Gefühl.',
  },
  tiefseetaucher: {
    ueberholt: 'Kein Problem. Wir halten einfach länger die Luft an.',
    vorbei: 'Aufgetaucht, vorbeigezogen, wieder abgetaucht. Du hast nur die Blasen gesehen.',
    drohung: 'Wir kommen von unten. Von dort kommen wir immer.',
  },
  hammerbrueder: {
    ueberholt: 'Du warst schneller. Wir waren gründlicher. Das zählt nur leider nicht.',
    vorbei: 'Wir haben jeden Stein umgedreht. Unter einem lagst du.',
    drohung: 'Wir kommen. Langsam. Aber wir kommen.',
  },
  eisenwacht: {
    ueberholt: 'Wir hätten dich aufgehalten. Aber es hat geregnet.',
    vorbei: 'Das Wetter war gut. Das kommt alle paar Jahre einmal vor.',
    drohung: 'Die Wettervorhersage ist gut. Das sollte dir Sorgen machen.',
  },
  granitschnecken: {
    ueberholt: 'Kein Grund zur Eile. Für uns gibt es nie einen.',
    vorbei: 'Irgendwann ist jetzt.',
    drohung: 'Keine Panik. Wir sind langsam. Aber du stehst still.',
  },
};

/**
 * Der Satz zur Warnung, aber nur, wenn die Gilde mit ihrem nächsten Sieg vorbeizieht
 * (runden === 1), damit er sich nicht abnutzt. Sonst und ohne Satz null.
 */
export function drohungSatz(gildeId: string, runden: number): string | null {
  if (runden !== 1) return null;
  return RIVALEN_STIMMEN[gildeId]?.drohung ?? null;
}
