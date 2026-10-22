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
  /** Weg ab Stufe 10 (data/spezialisierungen.ts). ?probe lässt ihn weg, damit man selbst wählt; ?probe=sterne nicht. */
  weg?: string;
}

export interface MusterTeam {
  name: string;
  helden: MusterHeld[];
}

/** Werte-Zuwachs je Stufe wie in HeroProgression (Klassen-Bonus) … */
const STUFEN_BONUS: Record<string, { hp: number; atk: number; def: number }> = {
  guardian: { hp: 4, atk: 0.3, def: 0.5 }, ranger: { hp: 2, atk: 0.6, def: 0.1 },
  berserker: { hp: 3, atk: 0.5, def: 0.2 }, assassin: { hp: 2, atk: 0.6, def: 0.1 },
  cleric: { hp: 3, atk: 0.2, def: 0.3 }, paladin: { hp: 4, atk: 0.25, def: 0.4 },
  bard: { hp: 2, atk: 0.2, def: 0.2 }, witch: { hp: 2, atk: 0.4, def: 0.1 },
  necromancer: { hp: 2, atk: 0.35, def: 0.2 }, druid: { hp: 3, atk: 0.25, def: 0.25 },
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
      { classId: 'guardian', name: 'Brom', stufe: 10, gear: T3.tank, weg: 'guardian_phalanx' },
      { classId: 'berserker', name: 'Grimm', stufe: 10, gear: T3.dps, weg: 'berserker_zorn' },
      { classId: 'ranger', name: 'Lia', stufe: 10, gear: T3.bow, weg: 'ranger_scharfschuetzin' },
    ],
  },
  gut: {
    name: 'Gut (Stufe 12, T3/T4, 4 Helden)',
    helden: [
      { classId: 'guardian', name: 'Brom', stufe: 12, gear: T4.tank, weg: 'guardian_phalanx' },
      { classId: 'berserker', name: 'Grimm', stufe: 12, gear: T3.dps, weg: 'berserker_zorn' },
      { classId: 'ranger', name: 'Lia', stufe: 12, gear: T3.bow, weg: 'ranger_scharfschuetzin' },
      { classId: 'assassin', name: 'Sina', stufe: 12, gear: T3.dps, weg: 'assassin_meuchlerin' },
    ],
  },
  stark: {
    name: 'Stark (Stufe 15, T4, 4 Helden)',
    helden: [
      { classId: 'guardian', name: 'Brom', stufe: 15, gear: T4.tank, weg: 'guardian_phalanx' },
      { classId: 'berserker', name: 'Grimm', stufe: 15, gear: T4.dps, weg: 'berserker_zorn' },
      { classId: 'ranger', name: 'Lia', stufe: 15, gear: T4.bow, weg: 'ranger_scharfschuetzin' },
      { classId: 'assassin', name: 'Sina', stufe: 15, gear: T4.dps, weg: 'assassin_meuchlerin' },
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

const SETS_HORT: Record<string, GuildFighter['gear']> = {
  ...SETS_EBENE_4,
  Grimm: { mainHand: 'set_hort_klinge', offHand: null, armor: 'set_hort_platte', trinket: 'set_hort_amulett' },
};

export interface MusterSet {
  name: string;
  gear: Record<string, GuildFighter['gear']>;
  /** Stufe aller getragenen Set-Teile in der Schmiede (docs/SCHMIEDE.md) */
  schmiede?: number;
  /** Die Eichung misst diese Ausrüstung erst in Dungeons ab dieser Ebene */
  abEbene?: number;
}

const SETS_STERNE: Record<string, GuildFighter['gear']> = {
  ...SETS_HORT,
  Grimm: { mainHand: 'set_stern_klinge', offHand: null, armor: 'set_stern_platte', trinket: 'set_stern_talisman' },
};

/** Im Mondlicht: dazu Lia in dem, was Nyxar nicht frass (der Schlüssel für den Mondhof, docs/DUNGEON-SETS.md) */
const SETS_MOND: Record<string, GuildFighter['gear']> = {
  ...SETS_STERNE,
  Lia: { mainHand: 'set_schlund_bogen', offHand: null, armor: 'set_schlund_leder', trinket: 'set_schlund_ring' },
};

/** Über dem Mondhof: Brom im Pfand des Mondvogts mit dem Amtsstab (Mondwall und Letzte Bastion zugleich) */
const SETS_PFAND: Record<string, GuildFighter['gear']> = {
  ...SETS_MOND,
  Brom: { mainHand: 'amtsstab_des_mondvogts', offHand: 'set_pfand_schild', armor: 'set_pfand_platte', trinket: 'set_pfand_amulett' },
};

/**
 * Für die Dungeons zwischen den Sternen (Ebene 7 und 8) dazu die Schmiede: Wer dort ankommt,
 * hat seine Sets aus den Dungeons darunter verbessert, und wer weiter will, trägt dazu
 * Korrunds Meisterstücke (Grimm, statt des Hort-Sets). Im Mondlicht (ab Ebene 9) trägt Lia das
 * Set aus dem Sternenschlund, über dem Mondhof (ab Ebene 10) Brom das Pfand des Mondvogts.
 */
export const MUSTER_SETS: Record<'ebene4' | 'hort' | 'sterne3' | 'sterne5' | 'mond5' | 'pfand5', MusterSet> = {
  ebene4: { name: 'Sets aus Ebene 4', gear: SETS_EBENE_4 },
  hort: { name: 'Ebene 4, Grimm mit dem Hort-Set', gear: SETS_HORT },
  sterne3: { name: 'Ebene 4 und Hort-Set, alle Teile auf +3', gear: SETS_HORT, schmiede: 3, abEbene: 7 },
  sterne5: { name: 'Dazu Grimm mit Korrunds Meisterstücken, alle Teile auf +5', gear: SETS_STERNE, schmiede: 5, abEbene: 7 },
  mond5: { name: 'Dazu Lia mit dem Schlund-Set, alle Teile auf +5', gear: SETS_MOND, schmiede: 5, abEbene: 9 },
  pfand5: { name: 'Dazu Brom im Pfand des Mondvogts mit dem Amtsstab, alle Teile auf +5', gear: SETS_PFAND, schmiede: 5, abEbene: 10 },
};
