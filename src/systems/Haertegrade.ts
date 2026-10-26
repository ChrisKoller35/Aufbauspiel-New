// ─── Magic City – Härtegrade ────────────────────────────────────
// Ein bezwungener Dungeon lässt sich auf Schwer oder Albtraum wiederholen. Was ein
// Grad an Gegnern, Punkten, Material und Set-Chance ändert, steht schon im Spiel
// (data/difficulty.ts, Schmiede.ts, DungeonSets.ts); hier nur die Wahl, die Sätze
// dazu und der Merker des höchsten bezwungenen Grads je Dungeon (state.haertegrade).
// Infernal fehlt: selbst die stärkste Probespiel-Gilde schafft ihn kaum (docs/HAERTEGRADE.md).
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { ROUTE_DEFS } from '../data/routes';
import { setFuerRoute } from '../data/dungeonSets';
import { bezwungeneDungeons } from './Bezwungen';
import { materialJeSieg } from './Schmiede';
import { setChance } from './DungeonSets';

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
  return `${haertegradName(grad)}: Gegner mit ${prozent(def.enemyHpMult - 1)} % mehr Leben, ${prozent(def.enemyAtkMult - 1)} % mehr Angriff`
    + ` und +${def.enemyDefBonus} Verteidigung. Dafür: ${mehr.join(' · ')}.`;
}

/** Die Zeile für die Bilanz, nur beim ersten Bezwingen eines Grads */
export function haertegradBilanz(run: ExpeditionRun, neu: boolean): string | null {
  if (!neu) return null;
  const name = ROUTE_DEFS[run.routeId]?.name ?? run.routeId;
  return run.difficulty === 'nightmare'
    ? `☠ Albtraum bezwungen: ${name}. Das System vermerkt: Diese Gilde hört nicht auf, wenn es reicht.`
    : `⚔ Schwer bezwungen: ${name}. Die Gegner hatten mehr Leben. Hatten.`;
}
