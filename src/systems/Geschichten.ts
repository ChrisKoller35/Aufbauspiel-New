// ─── Magic City – Geschichten der Dungeons ──────────────────────
// Regeln zu data/dungeonGeschichten.ts: wann eine Entscheidung ansteht, was sie
// bewirkt und was davon im Bericht nach der Expedition steht. Eine Entscheidung
// ist eine Begegnungs-Wahl (ExpeditionRun.pendingChoice) mit effect 'geschichte':
// Option A ist die vorsichtige, Option B die mutige. Alles ohne Zufall, damit die
// übrigen Würfe einer Expedition gleich bleiben. Anleitung: docs/GESCHICHTEN.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { EncounterChoice, EncounterRoom, ExpeditionRun } from '../models/ExpeditionRun';
import {
  DUNGEON_GESCHICHTEN, DungeonGeschichte, GeschichtsOption, GeschichtsWahl, RaumWahlText, Wirkung,
} from '../data/dungeonGeschichten';
import { ROUTE_DEFS } from '../data/routes';
import { ENEMY_DEFS } from '../data/enemies';
import { ITEM_DEFS } from '../data/items';
import { setFuerRoute } from '../data/dungeonSets';

/** Nach diesen Räumen darf eine Entscheidung anstehen; Rast, Fund und Händler haben eigene Dialoge */
export const RAEUME_MIT_ENTSCHEIDUNG: EncounterRoom['type'][] = ['combat', 'fortification', 'hazard', 'checkpoint'];

const NACH_ROUTE = new Map(DUNGEON_GESCHICHTEN.map(g => [g.routeId, g]));

export function geschichteVon(routeId: string): DungeonGeschichte | undefined {
  return NACH_ROUTE.get(routeId);
}

/** Die Entscheidung, die nach diesem Raum ansteht */
export function wahlNachRaum(routeId: string, raumIndex: number): GeschichtsWahl | undefined {
  return geschichteVon(routeId)?.wahlen.find(w => w.nachRaum === raumIndex);
}

/** Geschichte zu einem festen Wahl-Raum der Route (Drachenhort, Himmelsarchiv) */
export function raumWahlText(routeId: string, raumIndex: number): RaumWahlText | undefined {
  return geschichteVon(routeId)?.raumWahlen?.[raumIndex];
}

/** Steht eine Entscheidung der Geschichte an (und nicht die Wahl eines Raums)? */
export function istGeschichtsWahl(wahl: ExpeditionRun['pendingChoice']): boolean {
  return wahl?.optionA.effect === 'geschichte';
}

// ── Texte der Wirkungen ──

function bossName(routeId: string): string {
  const bossId = ROUTE_DEFS[routeId]?.bossId;
  return (bossId && ENEMY_DEFS[bossId]?.name) || 'Der Boss';
}

/** Eine Wirkung in wenigen Worten, für den Knopf und das Kampfprotokoll */
export function wirkungZeile(routeId: string, w: Wirkung): string {
  switch (w.art) {
    case 'gold': return `+${w.menge} Gold`;
    case 'gegenstand': return `+${w.menge}× ${ITEM_DEFS[w.itemId]?.name ?? w.itemId}`;
    case 'heilen': return `Alle +${w.prozent} % Leben`;
    case 'leben': return `Alle −${w.prozent} % Leben`;
    case 'xp': return `+${w.menge} XP für alle`;
    case 'setTeil': {
      const set = setFuerRoute(routeId);
      return `${set ? `${set.zeichen} ` : ''}+1 Set-Teil, wenn ihr siegt`;
    }
    case 'gegner': {
      const wie = `${Math.abs(w.prozent)} % ${w.prozent > 0 ? 'stärker' : 'schwächer'}`;
      return w.kaempfe === 1 ? `Gegner im nächsten Kampf ${wie}` : `Gegner der nächsten ${w.kaempfe} Kämpfe ${wie}`;
    }
    case 'boss': return `${bossName(routeId)} ${Math.abs(w.prozent)} % ${w.prozent > 0 ? 'stärker' : 'schwächer'}`;
  }
}

/** Gefahr (rot) oder Gewinn (grün), für die Farbe in der Anzeige */
export function istGefahr(w: Wirkung): boolean {
  return w.art === 'leben' || ((w.art === 'gegner' || w.art === 'boss') && w.prozent > 0);
}

// ── Ablauf im Lauf ──

function alsWahl(routeId: string, option: GeschichtsOption): EncounterChoice {
  return {
    label: option.label,
    flavorText: option.wirkung.map(w => wirkungZeile(routeId, w)).join(' · '),
    effect: 'geschichte',
    value: 0,
    wirkung: option.wirkung,
    nachklang: option.nachklang,
  };
}

/**
 * Nach einem geschafften Raum (ExpeditionSystem.processCurrentRoom): Hat die Geschichte hier eine
 * Entscheidung, steht sie als Wahl an. Gibt true zurück, wenn der Lauf jetzt auf die Wahl wartet.
 */
export function geschichtsWahlStellen(run: ExpeditionRun, room: EncounterRoom): boolean {
  if (run.status !== 'exploring' || !RAEUME_MIT_ENTSCHEIDUNG.includes(room.type)) return false;
  const wahl = wahlNachRaum(run.routeId, room.index);
  if (!wahl) return false;
  run.pendingChoice = {
    roomIndex: room.index,
    optionA: alsWahl(run.routeId, wahl.sicher),
    optionB: alsWahl(run.routeId, wahl.mutig),
  };
  run.combatLog.push(`📜 ${wahl.titel}: Eine Entscheidung steht an.`);
  return true;
}

/** Die nächsten Kämpfe nach dem aktuellen Raum (ohne Boss) */
function naechsteKaempfe(run: ExpeditionRun, anzahl: number): EncounterRoom[] {
  return run.rooms
    .filter(r => r.index > run.currentRoom && !r.completed && (r.type === 'combat' || r.type === 'fortification') && r.enemies.length > 0)
    .slice(0, anzahl);
}

/** Gegner eines Raums: Leben und Angriff um prozent stärker (oder schwächer), nie unter 1 */
function gegnerAendern(raum: EncounterRoom, prozent: number): void {
  const faktor = 1 + prozent / 100;
  for (const g of raum.enemies) {
    g.atk = Math.max(1, Math.round(g.atk * faktor));
    const maxHp = Math.max(1, Math.round(g.maxHp * faktor));
    g.hp = Math.max(1, Math.round(g.hp * maxHp / g.maxHp));
    g.maxHp = maxHp;
  }
}

/** Wirkungen der gewählten Option, ohne Zufall. Jede Wirkung schreibt eine Zeile ins Kampfprotokoll. */
export function geschichteWirkt(run: ExpeditionRun, wirkung: Wirkung[]): void {
  const lebende = run.party.filter(u => u.hp > 0);
  for (const w of wirkung) {
    switch (w.art) {
      case 'gold':
        run.goldEarned += w.menge;
        break;
      case 'gegenstand':
        run.loot[w.itemId] = (run.loot[w.itemId] ?? 0) + w.menge;
        break;
      case 'heilen':
        for (const u of lebende) u.hp = Math.min(u.maxHp, u.hp + Math.floor(u.maxHp * w.prozent / 100));
        break;
      case 'leben':
        for (const u of lebende) u.hp = Math.max(1, u.hp - Math.floor(u.maxHp * w.prozent / 100));
        break;
      case 'gegner':
        for (const raum of naechsteKaempfe(run, w.kaempfe)) gegnerAendern(raum, w.prozent);
        break;
      case 'boss':
        for (const raum of run.rooms) if (raum.type === 'boss' && !raum.completed) gegnerAendern(raum, w.prozent);
        break;
      case 'setTeil':
        run.setTeilVersprochen = true;
        break;
      case 'xp':
        if (!run.xpEarned) run.xpEarned = {};
        for (const u of lebende) run.xpEarned[u.id] = (run.xpEarned[u.id] ?? 0) + w.menge;
        break;
    }
    run.combatLog.push(`>> ${wirkungZeile(run.routeId, w)}`);
  }
}

/** Nach einer Wahl: der Satz der Geschichte dazu kommt in die Chronik des Laufs */
export function chronikNachWahl(run: ExpeditionRun, raumIndex: number, wahlIndex: 0 | 1, wahl: EncounterChoice): void {
  const satz = wahl.nachklang ?? raumWahlText(run.routeId, raumIndex)?.nachklang[wahlIndex === 0 ? 'a' : 'b'];
  if (!satz) return;
  run.chronik = [...(run.chronik ?? []), satz];
}

// ── Spielstand ──

function stand(state: GameState): NonNullable<GameState['geschichten']> {
  if (!state.geschichten) state.geschichten = { gelesen: [], erlebt: [] };
  return state.geschichten;
}

/**
 * Bis zum Ende gekommen, und wo es einen Boss gibt, ist er besiegt. Ein Kampf endet nach dem
 * Rundenlimit auch ohne Sieger (CombatEngine), dann zählt der Dungeon als geschafft, der Boss lebt aber.
 */
export function dungeonBezwungen(run: ExpeditionRun): boolean {
  return run.status === 'victory' && (run.bossesKilled > 0 || !run.rooms.some(r => r.type === 'boss'));
}

/** Hat die Gilde diese Geschichte schon bis zum Sieg gespielt? */
export function istErlebt(state: GameState, routeId: string): boolean {
  return state.geschichten?.erlebt.includes(routeId) ?? false;
}

/** Beim ersten Aufbruch in einen Dungeon: seine Geschichte, danach nicht mehr (die Einleitung steht auf der Karte) */
export function neueEinleitung(state: GameState, routeId: string): DungeonGeschichte | undefined {
  const geschichte = geschichteVon(routeId);
  if (!geschichte || stand(state).gelesen.includes(routeId)) return undefined;
  stand(state).gelesen.push(routeId);
  return geschichte;
}

export interface GeschichtsBilanz {
  titel: string;
  /** Die Sätze zu den Entscheidungen dieses Laufs */
  chronik: string[];
  /** Der Schluss, nur nach dem ersten Sieg (danach steht er auf der Dungeon-Karte) */
  ende?: string;
  /** Zum ersten Mal bis zum Ende gespielt */
  zumErstenMal: boolean;
}

/**
 * Nach der Expedition: was der Stadtschreiber festhält. Der erste Sieg (mit besiegtem Boss) zählt
 * die Geschichte als erlebt und bringt ihren Schluss. Ohne Entscheidung und ohne Schluss: null.
 */
export function geschichtsBilanz(state: GameState, run: ExpeditionRun): GeschichtsBilanz | null {
  const geschichte = geschichteVon(run.routeId);
  if (!geschichte) return null;
  const zumErstenMal = dungeonBezwungen(run) && !istErlebt(state, run.routeId);
  if (zumErstenMal) stand(state).erlebt.push(run.routeId);
  const chronik = run.chronik ?? [];
  if (chronik.length === 0 && !zumErstenMal) return null;
  return { titel: geschichte.titel, chronik, ende: zumErstenMal ? geschichte.ende : undefined, zumErstenMal };
}
