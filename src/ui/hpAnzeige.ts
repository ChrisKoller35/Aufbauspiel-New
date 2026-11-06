/**
 * Anzeige von Lebenspunkten und Zahlen im Kampf ohne Gleitkomma-Reste.
 * Nur Darstellung: die Kampfformel rechnet weiter mit den genauen Werten.
 */

/** Ganze Lebenspunkte für die Anzeige. Wer noch lebt (hp > 0), zeigt nie 0 (aufgerundet). */
export function hpZahl(hp: number): number {
  if (!Number.isFinite(hp) || hp <= 0) return 0;
  return Math.ceil(hp - 1e-9);
}

/**
 * Angriff und Verteidigung auf Zehntel (sie wachsen je Stufe um Zehntel, HeroProgression): So zeigen Heldenfenster,
 * Teamwahl und Kampf dieselbe Zahl, und eine Summe wie 24.6 + 0.2 zeigt nie 24.799999999999997.
 */
export function zehntel(n: number): number {
  return Math.round(n * 10) / 10;
}

/** «aktuell / maximal», beide ganzzahlig. */
export function hpAnzeige(hp: number, maxHp: number): string {
  return `${hpZahl(hp)} / ${Math.round(maxHp)}`;
}

/**
 * Rundet Gleitkomma-Reste in einer Protokollzeile («erleidet 12.600000000000001» → «erleidet 13»).
 * Zahlen mit höchstens zwei Nachkommastellen (z. B. «1.5×») bleiben stehen.
 */
export function rundeLogZahlen(zeile: string): string {
  return zeile.replace(/\d+\.\d{3,}/g, z => String(Math.round(Number(z))));
}
