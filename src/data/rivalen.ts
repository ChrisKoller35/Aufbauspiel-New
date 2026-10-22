// ─── Magic City – Rivalen-Gilden ────────────────────────────────
// Neun Computer-Gilden, die auf der Dungeon-Karte mitklettern: Jede beendete
// Expedition ist eine Runde, in der auch jede Gilde ein Stück weiterkommt
// (Regeln: systems/Rangliste.ts, Anleitung und Eichung: docs/RANGLISTE.md).
// Zwei Spitzengilden, vier mittlere und drei langsame. Die Spitze und das Rudel
// schaffen eine Ebene mehr als die eigene Gilde, alle anderen höchstens so viel
// wie sie. Die Städte stammen aus der früheren Beispiel-Rangliste.
// ────────────────────────────────────────────────────────────────

/**
 * Wie eine Gilde den nächsten Dungeon wählt:
 * stuermer = immer den höchsten, den sie betreten darf (rennt den Hauptpfad hinauf),
 * gruendlich = immer den niedrigsten (räumt die Karte von unten her ab),
 * ausgewogen = die niedrigste Ebene, darin den höchsten.
 */
export type RivalenStil = 'stuermer' | 'gruendlich' | 'ausgewogen';

export interface RivaleDef {
  id: string;
  name: string;
  /** Ein Emoji, auf der Karte und in der Rangliste */
  wappen: string;
  /** Farbe des Wappen-Rands auf der Karte */
  farbe: string;
  stadt: string;
  /** Der Name steht in der Mehrzahl («Die Sturmadler ziehen vorbei», aber «Der Orden zieht vorbei») */
  mehrzahl: boolean;
  /** Eine Zeile mit Augenzwinkern */
  motto: string;
  stil: RivalenStil;
  /** Dungeons, die sie vorziehen, sobald sie dürfen (Anfang der Routen-ID, z. B. 'ocean') */
  vorliebe?: string[];
  /** Mühe je Runde: so viel schafft die Gilde während einer Expedition (ein Dungeon kostet Ebene^1,5) */
  tempo: number;
  /**
   * So viele Ebenen über der höchsten der eigenen Gilde kann sie bezwingen (mindestens bis Ebene 2 plus diese Zahl).
   * Die Rivalen sind etwa so stark wie du: Keine rennt davon, und wer weiterkommt, zieht sie mit.
   */
  ebeneUeberDir: number;
  /** Wie stark Runden voneinander abweichen: 0,4 heisst 60 % bis 140 % des Tempos */
  laune: number;
  /** Sterne Vorsprung auf die Gilde des Spielers beim Start des Rennens (negativ: Rückstand) */
  vorsprung: number;
  /** Wochenruhm: so viel wie diese Zahl Siege im Dungeon, der dir am meisten Ruhm bringt */
  wochenSiege: number;
}

export const RIVALEN: RivaleDef[] = [
  // ── Spitze ──
  {
    id: 'sturmadler', name: 'Die Sturmadler', wappen: '🦅', farbe: '#7dd3fc', stadt: 'Sturmspitze', mehrzahl: true,
    motto: 'Oben ist da, wo wir gestern schon waren.',
    stil: 'stuermer', tempo: 1.0, ebeneUeberDir: 1, laune: 0.4, vorsprung: 10, wochenSiege: 30,
  },
  {
    id: 'glutschwinge', name: 'Orden der Glutschwinge', wappen: '🐉', farbe: '#f97316', stadt: 'Glutstadt', mehrzahl: false,
    motto: 'Wir kommen mit Feuer und gehen mit Beute.',
    stil: 'ausgewogen', tempo: 0.85, ebeneUeberDir: 1, laune: 0.4, vorsprung: 12, wochenSiege: 24,
  },
  // ── Mitte ──
  {
    id: 'silbereulen', name: 'Die Silbereulen', wappen: '🦉', farbe: '#e5e7eb', stadt: 'Mondlicht', mehrzahl: true,
    motto: 'Wir lesen jede Karte. Bis zum Kleingedruckten.',
    stil: 'gruendlich', tempo: 0.8, ebeneUeberDir: 0, laune: 0.3, vorsprung: 4, wochenSiege: 15,
  },
  {
    id: 'dunstrudel', name: 'Das Rudel von Dunstmoor', wappen: '🐺', farbe: '#a3a3a3', stadt: 'Dunstmoor', mehrzahl: false,
    motto: 'Erst rennen, dann denken. Manchmal auch nur rennen.',
    stil: 'stuermer', tempo: 0.75, ebeneUeberDir: 1, laune: 0.5, vorsprung: 2, wochenSiege: 12,
  },
  {
    id: 'glueckspilze', name: 'Die Glückspilze', wappen: '🍄', farbe: '#f87171', stadt: 'Grünweide', mehrzahl: true,
    motto: 'Ein Plan ist auch nur eine Vermutung.',
    stil: 'ausgewogen', tempo: 0.7, ebeneUeberDir: 0, laune: 0.9, vorsprung: 0, wochenSiege: 10,
  },
  {
    id: 'tiefseetaucher', name: 'Bund der Tiefseetaucher', wappen: '⚓', farbe: '#38bdf8', stadt: 'Nachthafen', mehrzahl: false,
    motto: 'Luft anhalten und durch.',
    stil: 'gruendlich', vorliebe: ['ocean'], tempo: 0.6, ebeneUeberDir: 0, laune: 0.4, vorsprung: -2, wochenSiege: 8,
  },
  // ── Langsam ──
  {
    id: 'hammerbrueder', name: 'Die Hammerbrüder', wappen: '🔨', farbe: '#d6a35c', stadt: 'Felsenheim', mehrzahl: true,
    motto: 'Langsam, aber gründlich. Sehr gründlich.',
    stil: 'gruendlich', tempo: 0.4, ebeneUeberDir: 0, laune: 0.3, vorsprung: -4, wochenSiege: 5,
  },
  {
    id: 'eisenwacht', name: 'Die Wacht von Eisenfeste', wappen: '🛡️', farbe: '#94a3b8', stadt: 'Eisenfeste', mehrzahl: false,
    motto: 'Wir brechen auf, sobald das Wetter besser wird.',
    stil: 'ausgewogen', vorliebe: ['siege'], tempo: 0.3, ebeneUeberDir: 0, laune: 0.5, vorsprung: -6, wochenSiege: 4,
  },
  {
    id: 'granitschnecken', name: 'Die Schnecken von Granitburg', wappen: '🐌', farbe: '#a3e635', stadt: 'Granitburg', mehrzahl: true,
    motto: 'Wir kommen an. Irgendwann.',
    stil: 'gruendlich', tempo: 0.2, ebeneUeberDir: 0, laune: 0.3, vorsprung: -10, wochenSiege: 2,
  },
];

/** Die Gilde des Spielers in Ranglisten */
export const EIGENE_GILDE = { id: 'spieler', name: 'Deine Gilde', wappen: '⭐', stadt: 'Magic City', mehrzahl: false };
