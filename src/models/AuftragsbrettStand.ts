/** Was ein Auftrag am Brett verlangt (systems/Auftragsbrett.ts) */
export type AuftragsArt =
  /** Den Dungeon bezwingen (gewinnen, mit Boss den Boss besiegen) */
  | 'sieg'
  /** Den Dungeon bezwingen, ohne dass ein Held fällt */
  | 'makellos'
  /** Gegner einer Art besiegen, egal wo */
  | 'jagd'
  /** Ein Teil aus dem Set des Dungeons erbeuten */
  | 'set'
  /** Eine Ware aus den Werkstätten abgeben */
  | 'lieferung';

/** Belohnung eines Auftrags, beim Aushängen festgelegt */
export interface AuftragsBelohnung {
  siegel: number;
  gold: number;
  /** Gegenstands-ID → Menge (Material für die Schmiede) */
  dinge: Record<string, number>;
}

/** Ein Zettel am Auftragsbrett */
export interface Auftrag {
  art: AuftragsArt;
  /** Text-Vorlage (data/auftragsbrett.ts) */
  vorlage: string;
  /** Ziel-Dungeon; bei einer Lieferung leer */
  routeId: string;
  /** Jagd: welche Gegner zählen */
  gegnerId?: string;
  /** Lieferung: welche Ware */
  itemId?: string;
  ziel: number;
  stand: number;
  fertig: boolean;
  belohnung: AuftragsBelohnung;
}

/**
 * Stand des Auftragsbretts im Gildenhaus. Fehlt in älteren Spielständen;
 * Auftragsbrett.ts legt ihn beim ersten Aufruf an.
 */
export interface AuftragsbrettStand {
  /** Fester Zufall für die Zettel dieses Spielstands */
  samen: number;
  /** Der Tag der aushängenden Zettel ('2026-10-21', Ortszeit) und sein Beginn in ms */
  tag: { id: string; start: number };
  auftraege: Auftrag[];
  /** So oft heute schon ein Zettel getauscht wurde */
  getauscht: number;
  /** Alle Zettel des Tages erledigt: der Bonus ist gutgeschrieben */
  tagesbonus: boolean;
  /** Tag (id), an dem jemand das Brett zuletzt angeschaut hat: sonst «Neue Zettel» im Hauptmenü */
  gesehen?: string;
  /** Gildensiegel zum Einlösen */
  siegel: number;
  /** Fürs Gildenbuch im Trophäensaal */
  erledigt: number;
  siegelGesamt: number;
  /**
   * Kette «Der Saal der Gilde»: das laufende Kapitel (Boss-Dungeon), sein Stand und die
   * Dungeons, deren Prunkstück schon im Saal steht.
   */
  kette: { routeId: string; stand: number; fertig: string[] };
}

/** Trophäensaal: Siege je Boss-Dungeon (systems/Trophaeensaal.ts) */
export interface TrophaeenStand {
  siege: Record<string, number>;
}
