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
 * Auf Zehntel gerundet (Angriff und Verteidigung wachsen je Stufe um Zehntel, HeroProgression). Ohne Rundung zeigte
 * 16.8 + 0.1 «16.900000000000002» und 24.6 − 10.6 «14.000000000000002».
 */
export function zehntel(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Angriff oder Verteidigung für die Anzeige: unter 100 auf Zehntel, ab 100 ganz (104 statt 104.3). So zeigen
 * Heldenfenster, Heldenkarte, Teamwahl, Kampf und das Blatt im Raid dieselbe Zahl, und die kleinen Teamkarten am
 * Handy bleiben einzeilig. Nur Darstellung: Gerechnet wird weiter genau.
 */
export function kampfwert(n: number): number {
  return Math.abs(n) >= 99.95 ? Math.round(n) : zehntel(n);
}

/** Tempo und Boni auf Hundertstel (0.93, +0.05) */
export function hundertstel(n: number): number {
  return Math.round(n * 100) / 100;
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
