// ─── Magic City – Geschichten der Dungeons ──────────────────────
// Regeln zu data/dungeonGeschichten.ts: wann eine Entscheidung ansteht, was sie
// bewirkt und was davon im Bericht nach der Expedition steht. Eine Entscheidung
// ist eine Begegnungs-Wahl (ExpeditionRun.pendingChoice) mit effect 'geschichte':
// Option A ist die vorsichtige, Option B die mutige. Alles ohne Zufall, damit die
// übrigen Würfe einer Expedition gleich bleiben. Anleitung: docs/GESCHICHTEN.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { EncounterChoice, EncounterRoom, ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
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

/**
 * Gold und Gegenstände einer Option mit Kampf-Gefahr kommen erst, wenn dieser Kampf gewonnen ist
 * (geschichtsBeuteNachKampf). Der Zusatz sagt es auf dem Knopf.
 */
function beuteZusatz(wirkung: Wirkung[]): string {
  if (wirkung.some(w => w.art === 'boss' && w.prozent > 0)) return ', wenn ihr siegt';
  const gegner = wirkung.find((w): w is Extract<Wirkung, { art: 'gegner' }> => w.art === 'gegner' && w.prozent > 0);
  if (!gegner) return '';
  return gegner.kaempfe === 1 ? ' nach dem Kampf' : ` nach ${gegner.kaempfe} Kämpfen`;
}

/** Die Folgen einer Option, je Wirkung eine Zeile (für den Knopf, die Farbe und das Kampfprotokoll) */
export function folgenZeilen(routeId: string, wirkung: Wirkung[]): { text: string; gefahr: boolean }[] {
  const zusatz = beuteZusatz(wirkung);
  return wirkung.map(w => ({
    text: wirkungZeile(routeId, w) + (w.art === 'gold' || w.art === 'gegenstand' ? zusatz : ''),
    gefahr: istGefahr(w),
  }));
}

// ── Ablauf im Lauf ──

function alsWahl(routeId: string, option: GeschichtsOption): EncounterChoice {
  return {
    label: option.label,
    flavorText: folgenZeilen(routeId, option.wirkung).map(z => z.text).join(' · '),
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

/** Der letzte Kampf, den eine Gefahr der Option trifft (stärkere Gegner oder Boss); ohne Kampf-Gefahr undefined */
function gefahrBisRaum(run: ExpeditionRun, wirkung: Wirkung[]): number | undefined {
  let bis: number | undefined;
  for (const w of wirkung) {
    if ((w.art !== 'gegner' && w.art !== 'boss') || w.prozent <= 0) continue;
    const raeume = w.art === 'gegner' ? naechsteKaempfe(run, w.kaempfe) : run.rooms.filter(r => r.type === 'boss' && !r.completed);
    for (const r of raeume) bis = Math.max(bis ?? r.index, r.index);
  }
  return bis;
}

/**
 * Gegenstand aus der Geschichte: Was unterwegs hilft (Heiltrank, Luftkristall), kommt in den Proviant und
 * lässt sich gleich einsetzen; Unbenutztes geht nach dem Lauf ins Lager. Der Rest kommt in die Beute.
 */
function dingGeben(run: ExpeditionRun, itemId: string, menge: number): void {
  const def = ITEM_DEFS[itemId];
  if (def && ('healAmount' in def || def.tags.includes('air_restore'))) {
    const platz = run.provisions.find(p => p.itemId === itemId && !p.gifted);
    if (platz) platz.qty += menge;
    else run.provisions.push({ itemId, qty: menge });
  } else {
    run.loot[itemId] = (run.loot[itemId] ?? 0) + menge;
  }
}

/** Wirkungen der gewählten Option, ohne Zufall. Jede Wirkung schreibt eine Zeile ins Kampfprotokoll. */
export function geschichteWirkt(run: ExpeditionRun, wirkung: Wirkung[]): void {
  const lebende = run.party.filter(u => u.hp > 0);
  // Mit Kampf-Gefahr wartet die Beute auf diesen Kampf
  const bisRaum = gefahrBisRaum(run, wirkung);
  const beute = { gold: 0, dinge: {} as Record<string, number> };
  for (const w of wirkung) {
    switch (w.art) {
      case 'gold':
        beute.gold += w.menge;
        break;
      case 'gegenstand':
        beute.dinge[w.itemId] = (beute.dinge[w.itemId] ?? 0) + w.menge;
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
  }
  for (const zeile of folgenZeilen(run.routeId, wirkung)) run.combatLog.push(`>> ${zeile.text}`);
  if (beute.gold === 0 && Object.keys(beute.dinge).length === 0) return;
  if (bisRaum === undefined) beuteGeben(run, beute.gold, beute.dinge);
  else run.geschichtsBeute = [...(run.geschichtsBeute ?? []), { raum: bisRaum, ...beute }];
}

/**
 * Beute, die erst mit dem Boss kommt (EncounterChoice.nachSieg): wartet wie die Beute einer mutigen Wahl,
 * aber auf den Bosskampf, und kommt dort zusammen in einer Zeile. Ohne Boss sofort.
 */
export function beuteNachBoss(run: ExpeditionRun, dinge: Record<string, number>): void {
  const boss = run.rooms.find(r => r.type === 'boss' && !r.completed);
  if (!boss) {
    beuteGeben(run, 0, dinge);
    return;
  }
  const wartet = run.geschichtsBeute?.find(b => b.raum === boss.index);
  if (!wartet) {
    run.geschichtsBeute = [...(run.geschichtsBeute ?? []), { raum: boss.index, gold: 0, dinge: { ...dinge } }];
    return;
  }
  for (const [itemId, menge] of Object.entries(dinge)) wartet.dinge[itemId] = (wartet.dinge[itemId] ?? 0) + menge;
}

function beuteGeben(run: ExpeditionRun, gold: number, dinge: Record<string, number>): void {
  run.goldEarned += gold;
  for (const [itemId, menge] of Object.entries(dinge)) dingGeben(run, itemId, menge);
}

/** Anfang der Protokollzeilen zur Beute, die auf einen Kampf gewartet hat */
const BEUTE_ZEILE = '📜 Beute aus der Geschichte';

/** Zeile zur Beute aus der Geschichte? Die Kampfansicht zeigt sie beim Ergebnis des Kampfes. */
export function istGeschichtsBeuteZeile(zeile: string): boolean {
  return zeile.startsWith(BEUTE_ZEILE);
}

/**
 * Nach einem geschafften Raum (ExpeditionSystem.processCurrentRoom): Beute einer mutigen Wahl, die auf
 * diesen Kampf gewartet hat. Sie kommt nur, wenn die Gegner besiegt sind, beim Boss nur, wenn er tot ist
 * (nicht nach dem Rundenlimit). Wer vorher umkehrt oder fällt, lässt sie liegen.
 */
export function geschichtsBeuteNachKampf(run: ExpeditionRun, raum: EncounterRoom): void {
  const faellig = (run.geschichtsBeute ?? []).filter(b => b.raum === raum.index);
  if (faellig.length === 0) return;
  run.geschichtsBeute = run.geschichtsBeute!.filter(b => b.raum !== raum.index);
  const besiegt = raum.type === 'boss' ? run.bossesKilled > 0 : raum.enemies.every(g => g.hp <= 0);
  for (const b of faellig) {
    if (!besiegt) {
      run.combatLog.push(`${BEUTE_ZEILE} bleibt liegen: Die Gegner stehen noch.`);
      continue;
    }
    beuteGeben(run, b.gold, b.dinge);
    const teile = [...(b.gold > 0 ? [`+${b.gold} Gold`] : []),
      ...Object.entries(b.dinge).map(([id, menge]) => `+${menge}× ${ITEM_DEFS[id]?.name ?? id}`)];
    run.combatLog.push(`${BEUTE_ZEILE}: ${teile.join(', ')}`);
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

/** Hat die Gilde diese Geschichte schon bis zum Sieg gespielt? */
export function istErlebt(state: GameState, routeId: string): boolean {
  return state.geschichten?.erlebt.includes(routeId) ?? false;
}

/** Vor dem ersten Aufbruch in einen Dungeon: seine Geschichte, solange die Gruppe mit ihr noch nicht aufgebrochen ist */
export function ungeleseneEinleitung(state: GameState, routeId: string): DungeonGeschichte | undefined {
  const geschichte = geschichteVon(routeId);
  return geschichte && !state.geschichten?.gelesen.includes(routeId) ? geschichte : undefined;
}

/** «Aufbrechen» nach der Einleitung: Sie kommt nicht wieder, danach steht sie auf der Karte */
export function einleitungGelesen(state: GameState, routeId: string): void {
  if (!stand(state).gelesen.includes(routeId)) stand(state).gelesen.push(routeId);
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
