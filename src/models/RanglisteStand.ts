/** Ergebnis einer abgeschlossenen Wochenwertung (systems/Rangliste.ts). */
export interface WochenErgebnis {
  /** Kalenderwoche, z. B. '2026-W43' */
  wocheId: string;
  /** Platz der eigenen Gilde unter allen zehn */
  platz: number;
  ruhm: number;
  /** Inhalt der Ruhmestruhe: Gold und Gegenstände (itemId → Menge); leer ab Platz 4 */
  belohnung: Record<string, number>;
  pokal: 'gold' | 'silber' | 'bronze' | null;
}

/**
 * Stand der Rangliste mit Rivalen. Fehlt in älteren Spielständen;
 * Rangliste.ts legt ihn beim ersten Aufruf an.
 */
export interface RanglisteStand {
  /** Gespielte Runden: Jede beendete Expedition ist eine Runde, auch für die Rivalen */
  runde: number;
  /** Fester Zufall der Rivalen für diesen Spielstand */
  samen: number;
  /** Sterne und höchste Ebene der eigenen Gilde beim Start; daran messen sich die Startplätze der Rivalen */
  startSterne: number;
  startEbene: number;
  /** Ab welcher Runde ein Dungeon auf der Karte steht (0: schon beim Start) */
  bekannt: Record<string, number>;
  /** Die laufende Kalenderwoche (start: Montag 00:00 in ms); ziele: Wochenruhm jeder Rivalen-Gilde, fest ab Wochenbeginn */
  woche: { id: string; start: number; ruhm: number; ziele: Record<string, number> };
  /** Abgeschlossene Wochen mit Ruhmestruhe, die noch abgeholt werden kann */
  offen: WochenErgebnis[];
  /** Die letzten Wochenergebnisse, neuestes zuerst */
  verlauf: WochenErgebnis[];
  pokale: { gold: number; silber: number; bronze: number };
}
