// Vorräte in der Kampf-Vorschau (CombatScreen.buildItemSection), ohne DOM, damit es sich testen lässt.
// Gleiche Vorräte stehen in einer Zeile; die Wegzehrung der Gilde (gifted) wird zuerst verbraucht, weil sie
// nach dem Lauf verfällt, der eigene Vorrat aber ins Lager zurückgeht (docs/GILDENSTADT.md, «Tränke mit Wirkung»).
import type { ExpeditionRun } from '../../models/ExpeditionRun';
import type { GameState } from '../../models/GameState';
import { trankWertText, type ExpeditionSystem } from '../../systems/ExpeditionSystem';
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

/** Eine Wirkung, die gerade gilt (run.trankWirkungen), für den Block «Wirkt gerade» und den Knopfzustand */
export interface AktiveWirkung {
  itemId: string;
  /** «Kraft-Brot: +2 Angriff, noch 3 Räume», «Krafttrank: +3 Angriff bis zum Ende des Dungeons» */
  text: string;
  /** Räume, die sie noch gilt (dieser zählt mit); undefined = bis zum Ende des Dungeons */
  restRaeume?: number;
}

/** «noch 3 Räume», «noch 1 Raum» oder «bis zum Ende des Dungeons» */
function dauerText(restRaeume: number | undefined): string {
  if (restRaeume === undefined) return 'bis zum Ende des Dungeons';
  return `noch ${restRaeume} ${restRaeume === 1 ? 'Raum' : 'Räume'}`;
}

/**
 * Was gerade wirkt, mit Restdauer = bisRaum − currentRoom (direkt nach dem Essen zählt dieser Raum mit).
 * Abgelaufene Wirkungen fehlen, auch wenn ExpeditionSystem.traenkeVerdauen sie noch nicht weggeräumt hat.
 */
export function aktiveWirkungen(run: Pick<ExpeditionRun, 'trankWirkungen' | 'currentRoom'>): AktiveWirkung[] {
  const aktiv: AktiveWirkung[] = [];
  for (const w of run.trankWirkungen ?? []) {
    const restRaeume = w.bisRaum === undefined ? undefined : w.bisRaum - run.currentRoom;
    if (restRaeume !== undefined && restRaeume <= 0) continue;
    const name = ITEM_DEFS[w.itemId]?.name ?? w.itemId;
    const trenner = restRaeume === undefined ? ' ' : ', ';
    aktiv.push({ itemId: w.itemId, restRaeume, text: `${name}: ${trankWertText(w)}${trenner}${dauerText(restRaeume)}` });
  }
  return aktiv;
}

/**
 * Knopf der Vorrats-Zeile: «Wirkt» (gesperrt), wenn die Wirkung schon bis zum Ende des Dungeons läuft
 * (useProvision liesse den Vorrat ohnehin liegen); ein Trank mit Raum-Dauer darf nachgetrunken werden.
 */
export function vorratKnopf(zeile: VorratZeile, aktiv: AktiveWirkung[]): 'Nutzen' | 'Wirkt' {
  return aktiv.some(w => w.itemId === zeile.itemId && w.restRaeume === undefined) ? 'Wirkt' : 'Nutzen';
}

/**
 * Tooltip am PC: «Name: Wirkung». Wirkt der Vorrat gerade, steht dort die Restdauer statt der Dauer aus items.ts
 * («Kraft-Brot: +2 Angriff, noch 3 Räume»), sonst hiesse es «für die nächsten 3 Räume, noch 3 Räume».
 */
export function vorratTitel(zeile: VorratZeile, aktiv: AktiveWirkung[] = []): string {
  const w = aktiv.find(a => a.itemId === zeile.itemId);
  if (w) return w.text;
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
