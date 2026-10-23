/**
 * Eine Zahl mit ihrem Wort, bei genau 1 in der Einzahl: «1 Held», «0 Helden», «3 Helden», «1.250 Tränke».
 * Zwischen Zahl und Wort steht ein geschütztes Leerzeichen, damit die Zahl nie allein am Zeilenende steht.
 */
export function anzahlText(n: number, einzahl: string, mehrzahl: string): string {
  return `${n.toLocaleString('de')}\u00a0${n === 1 ? einzahl : mehrzahl}`;
}
