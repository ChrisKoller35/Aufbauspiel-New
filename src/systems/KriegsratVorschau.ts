// ─── Magic City – Kriegsrat-Vorschau ────────────────────────────
// Was die Probeläufe des Kriegsrats heimbringen und wer dabei weiterkommt:
// Nach jedem Lauf rechnet die Kopie dieselben Funktionen in derselben
// Reihenfolge wie finishExpedition (ExpeditionFlow.ts): setBeute,
// schmiedeBeute, dann die XP wie finalizeExpeditionProgress. Der echte
// Spielstand bleibt unberührt (docs/KRIEGSRAT.md). Reine Logik, kein DOM.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { ITEM_DEFS } from '../data/items';
import { setFuerRoute } from '../data/dungeonSets';
import { materialFuerRoute } from '../data/schmiede';
import { besitz, gesammelteTeile, setBeute } from './DungeonSets';
import { SPLITTER, schmiedeBeute } from './Schmiede';
import { VICTORY_XP_BONUS } from './ExpeditionFinalizer';
import { MAX_HERO_LEVEL, awardXP, totalXpForLevel } from './HeroProgression';

export interface HeldVorschau {
  id: number;
  name: string;
  /** Stufe vor dem Aufbruch */
  stufe: number;
  /** XP bis zur nächsten Stufe vor dem Aufbruch, auf Stufe 15 gleich 0 */
  fehltXp: number;
  /** Ø XP je Lauf, gerundet (während der Läufe: die Summe) */
  xpSchnitt: number;
  /** Läufe mit mindestens einem Aufstieg */
  aufstiege: number;
  /** Höchste Stufe nach einem Lauf */
  besteStufe: number;
  /** Läufe, nach denen der Held 0 Leben hat */
  gefallen: number;
}

export interface BeuteVorschau {
  /** `gesammelt`: Teile des Sets, die die Gilde vor dem Aufbruch besitzt */
  set: { zeichen: string; name: string; gesammelt: number } | null;
  /** Läufe mit mindestens einem Set-Teil */
  setLaeufe: number;
  /** Set-Teile aus allen Läufen zusammen */
  setTeile: number;
  /** Ø Schmiede-Material je Lauf, gerundet (während der Läufe: die Summe) */
  material: { name: string; schnitt: number } | null;
  /** Ø Kristallsplitter je Lauf, gerundet (während der Läufe: die Summe) */
  splitterSchnitt: number;
  /** Höchstens drei: zuerst, was die Gilde nicht besitzt (`neu`), dann die in den meisten Läufen */
  ausruestung: { name: string; laeufe: number; neu: boolean; legendaer: boolean }[];
}

export interface Vorschau {
  helden: HeldVorschau[];
  beute: BeuteVorschau;
  /** Ausrüstung (ohne Set-Teile) → Zahl der Läufe, in denen sie fiel */
  ausruestung: Map<string, number>;
}

export function neueVorschau(state: GameState, routeId: string, heroIds: number[]): Vorschau {
  const helden: HeldVorschau[] = [];
  for (const id of heroIds) {
    const f = state.fighters.find(h => h.id === id);
    if (!f) continue;
    const fehltXp = f.level >= MAX_HERO_LEVEL ? 0 : Math.max(0, totalXpForLevel(f.level + 1) - f.xp);
    helden.push({ id, name: f.name, stufe: f.level, fehltXp, xpSchnitt: 0, aufstiege: 0, besteStufe: f.level, gefallen: 0 });
  }
  const set = setFuerRoute(routeId);
  const material = materialFuerRoute(routeId);
  return {
    helden,
    beute: {
      set: set ? { zeichen: set.zeichen, name: set.name, gesammelt: gesammelteTeile(state, set).length } : null,
      setLaeufe: 0, setTeile: 0,
      material: material ? { name: material.name, schnitt: 0 } : null,
      splitterSchnitt: 0, ausruestung: [],
    },
    ausruestung: new Map(),
  };
}

/** Nach einem Lauf auf seiner Kopie: Beute und XP wie finishExpedition. Ändert nur `kopie`, `run` und `v`. */
export function vorschauNachLauf(v: Vorschau, kopie: GameState, run: ExpeditionRun): void {
  const teile = setBeute(kopie, run);
  if (teile.length > 0) v.beute.setLaeufe++;
  v.beute.setTeile += teile.length;
  const material = schmiedeBeute(run);
  if (v.beute.material && material) v.beute.material.schnitt += material.menge;
  v.beute.splitterSchnitt += run.loot[SPLITTER] ?? 0;
  for (const [itemId, menge] of Object.entries(run.loot)) {
    const def = ITEM_DEFS[itemId];
    if (menge > 0 && def?.type === 'gear' && !def.tags.includes('set')) {
      v.ausruestung.set(itemId, (v.ausruestung.get(itemId) ?? 0) + 1);
    }
  }
  for (const held of v.helden) {
    const unit = run.party.find(u => u.id === held.id);
    const fighter = kopie.fighters.find(f => f.id === held.id);
    if (!unit || !fighter) continue;
    const xp = (run.xpEarned?.[held.id] ?? 0) + (run.status === 'victory' ? VICTORY_XP_BONUS : 0);
    held.xpSchnitt += xp;
    if (awardXP(fighter, xp) > 0) held.aufstiege++;
    held.besteStufe = Math.max(held.besteStufe, fighter.level);
    if (unit.hp <= 0) held.gefallen++;
  }
}

/** Aus den Summen die Schnitte; `state`: der Stand beim Klick (was die Gilde besitzt). */
export function vorschauSchnitt(v: Vorschau, state: GameState, anzahl: number): { helden: HeldVorschau[]; beute: BeuteVorschau } {
  const schnitt = (summe: number) => (anzahl > 0 ? Math.round(summe / anzahl) : 0);
  const ausruestung = [...v.ausruestung]
    .map(([id, laeufe]) => ({
      name: ITEM_DEFS[id]?.name ?? id, laeufe, neu: besitz(state, id) === 0,
      legendaer: ITEM_DEFS[id]?.tags.includes('legendary') ?? false,
    }))
    .sort((a, b) => Number(b.neu) - Number(a.neu) || b.laeufe - a.laeufe)
    .slice(0, 3);
  const { material } = v.beute;
  return {
    helden: v.helden.map(h => ({ ...h, xpSchnitt: schnitt(h.xpSchnitt) })),
    beute: {
      ...v.beute,
      material: material ? { name: material.name, schnitt: schnitt(material.schnitt) } : null,
      splitterSchnitt: schnitt(v.beute.splitterSchnitt),
      ausruestung,
    },
  };
}
