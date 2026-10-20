// ─── Magic City – Musterteams ───────────────────────────────────
// Drei Helden-Teams als Massstab für das Endgame: Die Dungeon-Eichung
// (tools/dungeonEichung.ts) misst, wie oft sie die Dungeons ganz oben schaffen
// (docs/NEUE-DUNGEONS.md), das Probespiel (systems/Probespiel.ts) startet mit dem Team «Gut».
// ────────────────────────────────────────────────────────────────

import { FighterStats, GuildFighter } from '../models/GuildRoster';
import { CLASS_DEFS } from './classes';

export interface MusterHeld {
  classId: string;
  name: string;
  stufe: number;
  gear: GuildFighter['gear'];
}

export interface MusterTeam {
  name: string;
  helden: MusterHeld[];
}

/** Werte-Zuwachs je Stufe wie in HeroProgression (Klassen-Bonus) … */
const STUFEN_BONUS: Record<string, { hp: number; atk: number; def: number }> = {
  guardian: { hp: 4, atk: 0.3, def: 0.5 }, ranger: { hp: 2, atk: 0.6, def: 0.1 },
  berserker: { hp: 3, atk: 0.5, def: 0.2 }, assassin: { hp: 2, atk: 0.6, def: 0.1 },
};
/** … und durch Training (+2 Leben, +1 Angriff, +1 Rüstung); gerechnet wird je die Hälfte. */
const TRAINING = { hp: 2, atk: 1, def: 1 };

/** Grundwerte eines Musterhelden auf seiner Stufe, ohne Ausrüstung. */
export function musterWerte(held: MusterHeld): FighterStats {
  const base = { ...CLASS_DEFS[held.classId].baseStats };
  const bonus = STUFEN_BONUS[held.classId];
  const ups = held.stufe - 1;
  base.maxHp = Math.round(base.maxHp + ups * (bonus.hp + TRAINING.hp) / 2);
  base.atk = Math.round(base.atk + ups * (bonus.atk + TRAINING.atk) / 2);
  base.def = Math.round(base.def + ups * (bonus.def + TRAINING.def) / 2);
  base.hp = base.maxHp;
  return base;
}

/** Ausrüstung nach den Regeln von GearSystem.equip: Schild nur zu einer Einhand-Waffe */
const T3 = {
  tank: { mainHand: 'hydra_venomfang', offHand: 'neptune_shield', armor: 'mystic_plate_armor', trinket: 'abyss_amulet' },
  dps: { mainHand: 'hydra_venomfang', offHand: null, armor: 'mystic_plate_armor', trinket: 'lich_phylactery' },
  bow: { mainHand: 'fallen_hunters_bow', offHand: null, armor: 'spider_silk_robe', trinket: 'abyss_amulet' },
};
const T4 = {
  tank: { mainHand: 'soulbreaker', offHand: 'aether_guardian_shield', armor: 'dragonlord_plate', trinket: 'aether_heart' },
  dps: { mainHand: 'soulbreaker', offHand: null, armor: 'dragonlord_plate', trinket: 'aether_heart' },
  bow: { mainHand: 'eternal_hunter_bow', offHand: null, armor: 'shadowhunter_armor', trinket: 'arcane_amulet' },
};

export const MUSTER_TEAMS: Record<'frisch' | 'gut' | 'stark', MusterTeam> = {
  frisch: {
    name: 'Frisch (Stufe 10, T3, 3 Helden)',
    helden: [
      { classId: 'guardian', name: 'Brom', stufe: 10, gear: T3.tank },
      { classId: 'berserker', name: 'Grimm', stufe: 10, gear: T3.dps },
      { classId: 'ranger', name: 'Lia', stufe: 10, gear: T3.bow },
    ],
  },
  gut: {
    name: 'Gut (Stufe 12, T3/T4, 4 Helden)',
    helden: [
      { classId: 'guardian', name: 'Brom', stufe: 12, gear: T4.tank },
      { classId: 'berserker', name: 'Grimm', stufe: 12, gear: T3.dps },
      { classId: 'ranger', name: 'Lia', stufe: 12, gear: T3.bow },
      { classId: 'assassin', name: 'Sina', stufe: 12, gear: T3.dps },
    ],
  },
  stark: {
    name: 'Stark (Stufe 15, T4, 4 Helden)',
    helden: [
      { classId: 'guardian', name: 'Brom', stufe: 15, gear: T4.tank },
      { classId: 'berserker', name: 'Grimm', stufe: 15, gear: T4.dps },
      { classId: 'ranger', name: 'Lia', stufe: 15, gear: T4.bow },
      { classId: 'assassin', name: 'Sina', stufe: 15, gear: T4.dps },
    ],
  },
};

/**
 * Dungeon-Sets der Musterhelden für die Set-Eichung (tools/dungeonEichung.ts, docs/DUNGEON-SETS.md):
 * volle Sets, wie sie ein Team nach einigen Siegen in den Dungeons dieser Ebene trägt.
 * Brom behält den Seelenbrecher, weil sein Schild-Set keine Waffe hat.
 */
const SETS_EBENE_4: Record<string, GuildFighter['gear']> = {
  Brom: { mainHand: 'soulbreaker', offHand: 'set_festung_schild', armor: 'set_festung_platte', trinket: 'set_festung_talisman' },
  Grimm: { mainHand: 'set_wyrm_klinge', offHand: null, armor: 'set_wyrm_platte', trinket: 'set_wyrm_amulett' },
  Lia: { mainHand: 'set_abyss_bogen', offHand: null, armor: 'set_abyss_leder', trinket: 'set_abyss_ring' },
  Sina: { mainHand: 'set_schatten_dolch', offHand: null, armor: 'set_schatten_leder', trinket: 'set_schatten_ring' },
};

export const MUSTER_SETS: Record<'ebene4' | 'hort', { name: string; gear: Record<string, GuildFighter['gear']> }> = {
  ebene4: { name: 'Sets aus Ebene 4', gear: SETS_EBENE_4 },
  hort: {
    name: 'Ebene 4, Grimm mit dem Hort-Set',
    gear: { ...SETS_EBENE_4, Grimm: { mainHand: 'set_hort_klinge', offHand: null, armor: 'set_hort_platte', trinket: 'set_hort_amulett' } },
  },
};
