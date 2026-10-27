// ─── Magic City – Härtegrade ────────────────────────────────────
// Ein bezwungener Dungeon lässt sich auf Schwer oder Albtraum wiederholen. Was ein
// Grad an Gegnern, Punkten, Material und Set-Chance ändert, steht schon im Spiel
// (data/difficulty.ts, Schmiede.ts, DungeonSets.ts); hier nur die Wahl, die Sätze
// dazu, der Merker des höchsten bezwungenen Grads je Dungeon (state.haertegrade)
// und die Albtraum-Beute: ein Wurf mehr auf die Beutetabelle des Bosses je Albtraum-Sieg.
// Infernal fehlt: selbst die stärkste Probespiel-Gilde schafft ihn kaum (docs/HAERTEGRADE.md).
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { ROUTE_DEFS } from '../data/routes';
import { ENEMY_DEFS } from '../data/enemies';
import { ITEM_DEFS } from '../data/items';
import { setFuerRoute } from '../data/dungeonSets';
import { bezwungeneDungeons } from './Bezwungen';
import { materialJeSieg } from './Schmiede';
import { setChance } from './DungeonSets';
import { CombatEngine } from './CombatEngine';
import { GearSystem } from './GearSystem';
import { SeededRNG } from '../utils/RNG';

export const HAERTEGRADE = ['normal', 'hard', 'nightmare'] as const;
export type Haertegrad = typeof HAERTEGRADE[number];

const ZEICHEN: Record<Haertegrad, string> = { normal: '', hard: '⚔ ', nightmare: '☠ ' };

/** «Normal», «⚔ Schwer», «☠ Albtraum» */
export function haertegradName(grad: Haertegrad): string {
  return ZEICHEN[grad] + DIFFICULTY_DEFS[grad].name;
}

/** Wählbar sind die Grade nur in bezwungenen Dungeons */
export function haertegradWaehlbar(state: GameState, routeId: string): boolean {
  return routeId in bezwungeneDungeons(state);
}

/** Der höchste bezwungene Grad (Normal, sobald bezwungen), null für nicht bezwungene Dungeons */
export function hoechsterHaertegrad(state: GameState, routeId: string): Haertegrad | null {
  return state.haertegrade?.[routeId] ?? (haertegradWaehlbar(state, routeId) ? 'normal' : null);
}

/** Merkt sich einen bezwungenen Schwer- oder Albtraum-Lauf; true, wenn der Grad höher ist als bisher */
export function merkeHaertegrad(state: GameState, run: ExpeditionRun): boolean {
  const grad = run.difficulty;
  if (!dungeonBezwungen(run) || (grad !== 'hard' && grad !== 'nightmare')) return false;
  const bisher = HAERTEGRADE.indexOf(state.haertegrade?.[run.routeId] ?? 'normal');
  if (HAERTEGRADE.indexOf(grad) <= bisher) return false;
  state.haertegrade = { ...state.haertegrade, [run.routeId]: grad };
  return true;
}

const prozent = (anteil: number): number => Math.round(anteil * 100);
const komma = (zahl: number): string => String(zahl).replace('.', ',');

/** Was der Grad an den Gegnern ändert und was ein Sieg mehr bringt, aus den Werten des Spiels */
export function haertegradSatz(state: GameState, routeId: string, grad: Haertegrad): string {
  if (grad === 'normal') return 'Normal: der Dungeon, wie ihr ihn kennt.';
  const def = DIFFICULTY_DEFS[grad];
  const mehr = [`Punkte ×${komma(def.scoreMult)}`];
  const material = materialJeSieg(routeId, grad);
  const normal = materialJeSieg(routeId);
  if (material && normal) mehr.push(`${material.menge} ${material.material.name} je Sieg statt ${normal.menge}`);
  const set = setFuerRoute(routeId);
  if (set && setChance(state, set, 'normal') < 1) {
    mehr.push(`Set-Teil ${prozent(setChance(state, set, grad))} % statt ${prozent(setChance(state, set, 'normal'))} %`);
  }
  if (grad === 'nightmare' && bossBeute(routeId)) mehr.push('ein Wurf mehr auf die Boss-Beute');
  return `${haertegradName(grad)}: Gegner mit ${prozent(def.enemyHpMult - 1)} % mehr Leben, ${prozent(def.enemyAtkMult - 1)} % mehr Angriff`
    + ` und +${def.enemyDefBonus} Verteidigung. Dafür: ${mehr.join(' · ')}.`;
}

/** Die Beutetabelle des Bosses, undefined in Dungeons ohne Boss */
function bossBeute(routeId: string): string | undefined {
  return ENEMY_DEFS[ROUTE_DEFS[routeId]?.bossId ?? '']?.lootTableId ?? undefined;
}

export interface AlbtraumBeute { gold: number; dinge: Record<string, number> }

/** Ein Wurf mehr auf die Boss-Beute nach einem bezwungenen Albtraum: Gold und ein Eintrag mit seiner Menge,
 *  einmal je Lauf, nach schmiedeBeute. Legt beides in run.goldEarned und run.loot; sonst null, ohne Änderung. */
export function albtraumBeute(run: ExpeditionRun): AlbtraumBeute | null {
  const tabelle = bossBeute(run.routeId);
  if (run.difficulty !== 'nightmare' || !dungeonBezwungen(run) || !tabelle) return null;
  const wurf: ExpeditionRun = { ...run, goldEarned: 0, loot: {} };
  new CombatEngine(new GearSystem()).rollLoot(wurf, tabelle, new SeededRNG((run.rngSeed ^ 0xa1b7) >>> 0));
  run.goldEarned += wurf.goldEarned;
  for (const [itemId, n] of Object.entries(wurf.loot)) run.loot[itemId] = (run.loot[itemId] ?? 0) + n;
  return { gold: wurf.goldEarned, dinge: wurf.loot };
}

/** Hinweise für die Truhe (nur Text); `loot`: die ganze Beute der Truhe */
export function albtraumHinweise(beute: AlbtraumBeute | null, loot: Record<string, number>): Record<string, string> {
  const hinweise: Record<string, string> = {};
  for (const [itemId, n] of Object.entries(beute?.dinge ?? {})) {
    hinweise[itemId] = (loot[itemId] ?? 0) > n ? `☠ ${n} davon aus der Albtraum-Beute` : '☠ Albtraum-Beute';
  }
  return hinweise;
}

/** Die Zeilen für die Bilanz: erstes Bezwingen eines Grads, Albtraum-Beute und Sieg am Rundenlimit */
export function haertegradBilanz(run: ExpeditionRun, neu: boolean, beute: AlbtraumBeute | null = null): string[] {
  const zeilen: string[] = [];
  const name = ROUTE_DEFS[run.routeId]?.name ?? run.routeId;
  const grad = run.difficulty;
  if (neu) {
    zeilen.push(grad === 'nightmare'
      ? `☠ Albtraum bezwungen: ${name}. Das System vermerkt: Diese Gilde hört nicht auf, wenn es reicht.`
      : `⚔ Schwer bezwungen: ${name}. Die Gegner hatten mehr Leben. Hatten.`);
  }
  // Sieg am Rundenlimit: «SIEG», der Boss lebt aber, der Grad zählt nicht
  if ((grad === 'hard' || grad === 'nightmare') && run.status === 'victory' && !dungeonBezwungen(run)) {
    zeilen.push(`${haertegradName(grad)} nicht bezwungen: ${name}. Der Boss stand nach dem Rundenlimit noch.`
      + ' Das System vermerkt: Beute ja, Punkte wie auf Normal.');
  }
  if (beute) {
    const teile = Object.entries(beute.dinge).map(([itemId, n]) => {
      const itemName = ITEM_DEFS[itemId]?.name ?? itemId;
      return n > 1 ? `${n}× ${itemName}` : itemName;
    });
    zeilen.push(`☠ Albtraum-Beute: ${[`${beute.gold} Gold`, ...teile].join(' und ')}`);
  }
  return zeilen;
}
