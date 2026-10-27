// ─── Magic City – Beutevergleich ─────────────────────────────────
// Grüner Pfeil in Truhe, Heldenfenster und Lager: Macht ein Fund einen Helden der Gilde stärker? «Besser» nur, wenn
// nichts schlechter wird (docs/BEUTEVERGLEICH.md). Reine Logik, ändert weder Held noch Spielstand.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { FighterStats, GuildFighter } from '../models/GuildRoster';
import { ITEM_DEFS } from '../data/items';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { EquipSlot, GearSystem } from './GearSystem';
import { SchmiedeStufen, schmiedeStufen } from './Schmiede';

const gearSystem = new GearSystem();

export interface Verbesserung {
  held: GuildFighter;
  /** Bei Einhandwaffen die Hand, sonst null */
  platz: EquipSlot | null;
  teile: string[];
  zugewinn: number;
}

const WERTE: [keyof FighterStats, (d: number) => string][] = [
  ['atk', d => `ATK +${d}`],
  ['def', d => `DEF +${d}`],
  ['maxHp', d => `HP +${d}`],
  ['spd', d => `SPD +${d}`],
  ['critChance', d => `CRIT +${Math.round(d * 100)} %`],
  ['critMult', d => `Krit-Schaden +${Math.round(d * 100)} %`],
];

/** Der Held mit dem Teil, wie ANLEGEN im Heldenfenster (null, wenn es nicht passt) */
export function mitTeil(held: GuildFighter, itemId: string, wunsch?: EquipSlot): GuildFighter | null {
  const slot = gearSystem.resolveEquipSlot(held, itemId, wunsch);
  if (!slot) return null;
  const def = ITEM_DEFS[itemId];
  const gear = { ...held.gear };
  if (def?.gearSlot === 'mainHand' && def.weaponSlotType === '2h') gear.offHand = null;
  gear[slot] = itemId;
  return { ...held, gear };
}

type Vorher = () => { werte: FighterStats; ids: Set<string> };

function vergleiche(held: GuildFighter, itemId: string, stufen: SchmiedeStufen, vorher: Vorher, wunsch?: EquipSlot): Verbesserung | null {
  const nachher = mitTeil(held, itemId, wunsch);
  if (!nachher) return null;
  const { werte: a, ids: vorIds } = vorher();
  const b = gearSystem.getEffectiveStats(nachher, stufen);
  // Erst die Werte: Sinkt einer, braucht es die Eigenschaften nicht mehr
  const gestiegen: { anteil: number; text: string }[] = [];
  for (const [k, fmt] of WERTE) {
    const d = Math.round((b[k] - a[k]) * 100) / 100;
    if (d < 0) return null;
    if (d > 0) gestiegen.push({ anteil: a[k] > 0 ? d / a[k] : 1, text: fmt(d) });
  }
  const nachEffekte = gearSystem.getSpecialEffects(nachher);
  const nachIds = new Set(nachEffekte.map(e => e.id));
  if ([...vorIds].some(id => !nachIds.has(id))) return null;

  const neueIds = new Set<string>();
  const namen: string[] = [];
  for (const e of nachEffekte) {
    if (vorIds.has(e.id) || neueIds.has(e.id)) continue;
    neueIds.add(e.id);
    const name = `✦ ${e.name ?? SPECIAL_EFFECT_DEFS[e.id]?.name ?? e.id}`;
    if (!namen.includes(name)) namen.push(name);
  }
  if (gestiegen.length === 0 && neueIds.size === 0) return null;

  // sort ist stabil: bei gleichem Anteil bleibt die Reihenfolge von WERTE
  gestiegen.sort((x, y) => y.anteil - x.anteil);
  const zugewinn = gestiegen.reduce((s, g) => s + g.anteil, 0) + neueIds.size;
  const platz = ITEM_DEFS[itemId]?.weaponSlotType === '1h' ? gearSystem.resolveEquipSlot(held, itemId, wunsch) : null;
  return { held, platz, teile: [...namen, ...gestiegen.map(g => g.text)], zugewinn };
}

/** Vergleicht viele Teile mit einem Helden (seine Werte höchstens einmal); mit nurPlatz zählt nur dieser Platz */
export function vergleicher(held: GuildFighter, stufen: SchmiedeStufen = {}): (itemId: string, nurPlatz?: EquipSlot) => Verbesserung | null {
  let gemerkt: ReturnType<Vorher> | null = null;
  const vorher: Vorher = () => (gemerkt ??= {
    werte: gearSystem.getEffectiveStats(held, stufen),
    ids: new Set(gearSystem.getSpecialEffects(held).map(e => e.id)),
  });
  return (itemId, nurPlatz) => {
    const def = ITEM_DEFS[itemId];
    if (!def || def.type !== 'gear' || !def.gearSlot) return null;
    if (nurPlatz) return gearSystem.resolveEquipSlot(held, itemId, nurPlatz) === nurPlatz ? vergleiche(held, itemId, stufen, vorher, nurPlatz) : null;
    if (def.weaponSlotType !== '1h') return vergleiche(held, itemId, stufen, vorher);
    const haupt = vergleiche(held, itemId, stufen, vorher, 'mainHand');
    const neben = vergleiche(held, itemId, stufen, vorher, 'offHand');
    if (!haupt) return neben;
    return neben && neben.zugewinn > haupt.zugewinn ? neben : haupt;
  };
}

/** Wie sehr das Teil den Helden stärker macht, ohne dass etwas schlechter wird (sonst null) */
export function verbesserungFuer(held: GuildFighter, itemId: string, stufen: SchmiedeStufen = {}): Verbesserung | null {
  return vergleicher(held, stufen)(itemId);
}

export interface BesserFuer { beste: Verbesserung; weitere: number; besteWahl: boolean }

/**
 * Für wen in der Gilde jedes Teil besser ist (nur Teile, die jemanden stärker machen).
 * Ist ein Teil die beste Wahl, nennt beste diesen Helden (bei mehreren den mit dem grössten Zugewinn), sonst wie besserFuer
 */
export function besserFuerAlle(state: GameState, itemIds: string[]): Map<string, BesserFuer> {
  const stufen = schmiedeStufen(state);
  const mit = state.fighters.map(f => vergleicher(f, stufen));
  const listen = new Map<string, Verbesserung[]>();
  // je Held und Platz das Teil mit dem grössten Zugewinn
  const sieger = new Map<string, Verbesserung>();
  // Jede Kennung einmal: Ein zweites Vorkommen legte sonst neue Objekte in listen, und besteWahl ginge verloren
  for (const itemId of new Set(itemIds)) {
    const alle = mit.map(m => m(itemId)).filter((v): v is Verbesserung => v !== null);
    if (alle.length === 0) continue;
    listen.set(itemId, alle);
    for (const v of alle) {
      const schluessel = `${v.held.id}:${v.platz ?? ITEM_DEFS[itemId].gearSlot}`;
      if (!sieger.has(schluessel) || v.zugewinn > sieger.get(schluessel)!.zugewinn) sieger.set(schluessel, v);
    }
  }
  const gewonnen = new Set(sieger.values());
  const ergebnis = new Map<string, BesserFuer>();
  for (const [itemId, alle] of listen) {
    const gewinne = alle.filter(v => gewonnen.has(v));
    const besteWahl = gewinne.length > 0;
    const beste = (besteWahl ? gewinne : alle).reduce((x, y) => (y.zugewinn > x.zugewinn ? y : x));
    ergebnis.set(itemId, { beste, weitere: alle.length - 1, besteWahl });
  }
  return ergebnis;
}

/** Für wen in der Gilde das Teil am meisten bringt, und für wie viele weitere es auch besser ist */
export function besserFuer(state: GameState, itemId: string): BesserFuer | null {
  return besserFuerAlle(state, [itemId]).get(itemId) ?? null;
}

/** Ist die Nebenhand leer: das Teil im Lager, das sie am meisten stärkt (sonst null) */
export function nebenhandFrei(state: GameState, held: GuildFighter): { itemId: string; besser: Verbesserung } | null {
  if (held.gear.offHand) return null;
  const mit = vergleicher(held, schmiedeStufen(state));
  let bestes: { itemId: string; besser: Verbesserung } | null = null;
  for (const [itemId, qty] of Object.entries(state.globalStock)) {
    if (qty <= 0) continue;
    const besser = mit(itemId, 'offHand');
    if (besser && (!bestes || besser.zugewinn > bestes.besser.zugewinn)) bestes = { itemId, besser };
  }
  return bestes;
}

/** «⬆ Besser für Lia: ATK +12 · HP +30» (Name roh, die Anzeige escapt) */
export function besserText({ beste, weitere }: { beste: Verbesserung; weitere: number }): string {
  const hand = beste.platz === 'mainHand' ? ' (Haupthand)' : beste.platz === 'offHand' ? ' (Nebenhand)' : '';
  const mehr = weitere === 1 ? ' · auch für 1 weiteren' : weitere > 1 ? ` · auch für ${weitere} weitere` : '';
  return `⬆ Besser für ${beste.held.name}${hand}: ${beste.teile.slice(0, 3).join(' · ')}${mehr}`;
}
