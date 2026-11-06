// Vorräte in der Kampf-Vorschau (CombatScreen.buildItemSection), ohne DOM, damit es sich testen lässt.
// Gleiche Vorräte stehen in einer Zeile; die Wegzehrung der Gilde (gifted) wird zuerst verbraucht, weil sie
// nach dem Lauf verfällt, der eigene Vorrat aber ins Lager zurückgeht (docs/GILDENSTADT.md, «Tränke mit Wirkung»).
import type { ExpeditionRun } from '../../models/ExpeditionRun';
import type { GameState } from '../../models/GameState';
import type { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { ITEM_DEFS } from '../../data/items';
import { rundeLogZahlen } from '../hpAnzeige';

/** Eine Zeile «Bild, Name, Wirkung, Menge, Nutzen» */
export interface VorratZeile {
  itemId: string;
  name: string;
  /** Halbsatz aus items.ts («+8 Leben, sofort»), leer, falls der Vorrat keinen hat */
  wirkung: string;
  /** Alle Plätze dieses Vorrats zusammen */
  menge: number;
  /** Platz in run.provisions, den «Nutzen» verbraucht: zuerst die Wegzehrung */
  index: number;
}

/** Gleiche Vorräte zusammengefasst, in der Reihenfolge ihres ersten Platzes */
export function vorratZeilen(provisions: ExpeditionRun['provisions']): VorratZeile[] {
  const zeilen: VorratZeile[] = [];
  provisions.forEach((p, i) => {
    if (p.qty <= 0) return;
    const zeile = zeilen.find(z => z.itemId === p.itemId);
    if (!zeile) {
      const def = ITEM_DEFS[p.itemId];
      zeilen.push({ itemId: p.itemId, name: def?.name ?? p.itemId, wirkung: def?.wirkungText ?? '', menge: p.qty, index: i });
      return;
    }
    zeile.menge += p.qty;
    if (p.gifted && !provisions[zeile.index].gifted) zeile.index = i;
  });
  return zeilen;
}

/** Tooltip am PC: «Name: Wirkung» */
export function vorratTitel(zeile: VorratZeile): string {
  return zeile.wirkung ? `${zeile.name}: ${zeile.wirkung}` : zeile.name;
}

/** Der Bereich bleibt nach dem letzten Vorrat stehen, solange eine Meldung zu zeigen ist */
export function zeigeVorratBereich(zeilen: VorratZeile[], meldung: string): boolean {
  return zeilen.length > 0 || meldung !== '';
}

/**
 * Vorrat der Zeile nutzen und die Meldung dazu liefern («Brot: Die Gruppe heilt 8 Leben.»): die letzte neue
 * Protokollzeile ohne «>> ». Leer, wenn nichts geschah (z. B. kein laufender Dungeon).
 */
export function nutzeVorrat(system: ExpeditionSystem, state: GameState, zeile: VorratZeile): string {
  const run = state.activeExpedition;
  if (!run) return '';
  const vorher = run.combatLog.length;
  system.useProvision(state, zeile.index);
  const neu = run.combatLog.slice(vorher);
  return neu.length > 0 ? rundeLogZahlen(neu[neu.length - 1]).replace(/^>>\s*/, '') : '';
}
