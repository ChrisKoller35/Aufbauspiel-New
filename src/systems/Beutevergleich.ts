// ─── Magic City – Beutevergleich ─────────────────────────────────
// Grüner Pfeil in der Truhe: Macht ein Fund einen Helden der Gilde stärker? «Besser» nur, wenn
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

function vergleiche(held: GuildFighter, itemId: string, stufen: SchmiedeStufen, wunsch?: EquipSlot): Verbesserung | null {
  const nachher = mitTeil(held, itemId, wunsch);
  if (!nachher) return null;
  const a = gearSystem.getEffectiveStats(held, stufen);
  const b = gearSystem.getEffectiveStats(nachher, stufen);
  const vorIds = new Set(gearSystem.getSpecialEffects(held).map(e => e.id));
  const nachEffekte = gearSystem.getSpecialEffects(nachher);
  const nachIds = new Set(nachEffekte.map(e => e.id));
  if ([...vorIds].some(id => !nachIds.has(id))) return null;

  const gestiegen: { anteil: number; text: string }[] = [];
  for (const [k, fmt] of WERTE) {
    const d = Math.round((b[k] - a[k]) * 100) / 100;
    if (d < 0) return null;
    if (d > 0) gestiegen.push({ anteil: a[k] > 0 ? d / a[k] : 1, text: fmt(d) });
  }
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

/** Wie sehr das Teil den Helden stärker macht, ohne dass etwas schlechter wird (sonst null) */
export function verbesserungFuer(held: GuildFighter, itemId: string, stufen: SchmiedeStufen = {}): Verbesserung | null {
  const def = ITEM_DEFS[itemId];
  if (!def || def.type !== 'gear' || !def.gearSlot) return null;
  if (def.weaponSlotType !== '1h') return vergleiche(held, itemId, stufen);
  const haupt = vergleiche(held, itemId, stufen, 'mainHand');
  const neben = vergleiche(held, itemId, stufen, 'offHand');
  if (!haupt) return neben;
  return neben && neben.zugewinn > haupt.zugewinn ? neben : haupt;
}

/** Für wen in der Gilde das Teil am meisten bringt, und für wie viele weitere es auch besser ist */
export function besserFuer(state: GameState, itemId: string): { beste: Verbesserung; weitere: number } | null {
  const stufen = schmiedeStufen(state);
  const alle = state.fighters
    .map(f => verbesserungFuer(f, itemId, stufen))
    .filter((v): v is Verbesserung => v !== null);
  if (alle.length === 0) return null;
  const beste = alle.reduce((x, y) => (y.zugewinn > x.zugewinn ? y : x));
  return { beste, weitere: alle.length - 1 };
}

/** «⬆ Besser für Lia: ATK +12 · HP +30» (Name roh, die Anzeige escapt) */
export function besserText({ beste, weitere }: { beste: Verbesserung; weitere: number }): string {
  const hand = beste.platz === 'mainHand' ? ' (Haupthand)' : beste.platz === 'offHand' ? ' (Nebenhand)' : '';
  const mehr = weitere === 1 ? ' · auch für 1 weiteren' : weitere > 1 ? ` · auch für ${weitere} weitere` : '';
  return `⬆ Besser für ${beste.held.name}${hand}: ${beste.teile.slice(0, 3).join(' · ')}${mehr}`;
}
