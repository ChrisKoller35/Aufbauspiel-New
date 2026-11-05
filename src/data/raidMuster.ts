// ─── Magic City – Muster-Gilde des Raids ────────────────────────
// Zehn Helden auf Stufe 15 mit ihren Wegen, der Massstab für Zenit (tools/raidEichung.ts, tests/raid.test.ts)
// und die Gilde des Probespiels ?probe=raid. Der Kern sind die vier aus dem Musterteam «Stark» in ihren Sets
// wie in MUSTER_SETS.tagwerk0 (Lia ohne Stufen, die übrigen +5); die zweite Reihe trägt die Sets, die der Kern
// unterwegs abgelegt hat. Aufstellungen nach Heldennamen, gezeichnet wie auf dem Feld (Reihe 1 vorn). docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import { GuildFighter, createGuildFighter } from '../models/GuildRoster';
import type { Feld } from '../models/RaidStand';
import { totalXpForLevel, werteAufStufe } from '../systems/HeroProgression';
import { istSchmiedbar, SchmiedeStufen } from '../systems/Schmiede';
import { CLASS_DEFS } from './classes';

export interface RaidMusterHeld {
  classId: string;
  name: string;
  weg: string;
  gear: GuildFighter['gear'];
  /** Schmiede-Stufe seiner Set-Teile */
  stufe: number;
}

const T4_TANK = { mainHand: 'soulbreaker', offHand: 'aether_guardian_shield', armor: 'dragonlord_plate', trinket: 'aether_heart' };
const T4_DPS = { mainHand: 'soulbreaker', offHand: null, armor: 'dragonlord_plate', trinket: 'aether_heart' };
const T4_BOW = { mainHand: 'eternal_hunter_bow', offHand: null, armor: 'shadowhunter_armor', trinket: 'arcane_amulet' };

/** Der Kern: Brom, Grimm, Lia und Sina wie im Musterteam «Stark» mit den Sets der Ebenen 10 bis 12 */
const KERN: RaidMusterHeld[] = [
  { classId: 'guardian', name: 'Brom', weg: 'guardian_phalanx', stufe: 5,
    gear: { mainHand: 'amtsstab_des_mondvogts', offHand: 'set_pfand_schild', armor: 'set_pfand_platte', trinket: 'set_pfand_amulett' } },
  { classId: 'berserker', name: 'Grimm', weg: 'berserker_zorn', stufe: 5,
    gear: { mainHand: 'set_wachfeuer_hammer', offHand: null, armor: 'set_wachfeuer_platte', trinket: 'set_wachfeuer_talisman' } },
  { classId: 'ranger', name: 'Lia', weg: 'ranger_scharfschuetzin', stufe: 0,
    gear: { mainHand: 'set_tagwerk_bogen', offHand: null, armor: 'set_tagwerk_leder', trinket: 'set_tagwerk_ring' } },
  { classId: 'assassin', name: 'Sina', weg: 'assassin_meuchlerin', stufe: 5,
    gear: { mainHand: 'set_morgen_dolch', offHand: null, armor: 'set_morgen_leder', trinket: 'set_morgen_talisman' } },
];

/** Die zweite Reihe in den Sets, die der Kern abgelegt hat (Stufe je Variante) */
const ZWEITE_REIHE: Omit<RaidMusterHeld, 'stufe'>[] = [
  { classId: 'paladin', name: 'Ansgar', weg: 'paladin_schutzherr',
    gear: { mainHand: 'soulbreaker', offHand: 'set_festung_schild', armor: 'set_festung_platte', trinket: 'set_festung_talisman' } },
  { classId: 'cleric', name: 'Ewin', weg: 'cleric_lichtbringer',
    gear: { mainHand: 'set_hort_klinge', offHand: null, armor: 'set_hort_platte', trinket: 'set_hort_amulett' } },
  { classId: 'druid', name: 'Moos', weg: 'druid_hain',
    gear: { mainHand: 'set_schlund_bogen', offHand: null, armor: 'set_schlund_leder', trinket: 'set_schlund_ring' } },
  { classId: 'bard', name: 'Liedra', weg: 'bard_heldenlied',
    gear: { mainHand: 'set_abyss_bogen', offHand: null, armor: 'set_abyss_leder', trinket: 'set_abyss_ring' } },
  { classId: 'witch', name: 'Ysra', weg: 'witch_fluchweberin',
    gear: { mainHand: 'set_stern_klinge', offHand: null, armor: 'set_stern_platte', trinket: 'set_stern_talisman' } },
  { classId: 'necromancer', name: 'Morn', weg: 'necromancer_seuchenbringer',
    gear: { mainHand: 'set_schatten_dolch', offHand: null, armor: 'set_schatten_leder', trinket: 'set_schatten_ring' } },
];

/**
 * Die Varianten der Gilde: `anker` ist der Eichanker (zweite Reihe +3), `sets5`/`sets0` dieselben Sets auf +5 und
 * ohne Stufen, `t4` die zweite Reihe frisch hochgezogen in gewöhnlicher T4-Ausrüstung, `kern` nur die vier.
 */
export type RaidMusterName = 'anker' | 'sets5' | 'sets0' | 't4' | 'kern';

export function raidMusterHelden(name: RaidMusterName): RaidMusterHeld[] {
  if (name === 'kern') return KERN.map(h => ({ ...h }));
  if (name === 't4') {
    return [...KERN, ...ZWEITE_REIHE.map(h => ({
      ...h, stufe: 0, gear: { ...(h.classId === 'paladin' ? T4_TANK : h.classId === 'bard' ? T4_BOW : T4_DPS) },
    }))];
  }
  const stufe = name === 'sets5' ? 5 : name === 'sets0' ? 0 : 3;
  return [...KERN, ...ZWEITE_REIHE.map(h => ({ ...h, stufe }))];
}

/**
 * Baut die Helden (Stufe 15, Weg, Ausrüstung) mit Ids ab `ersteId` und die Schmiede-Stufen ihrer Set-Teile.
 * Die Helden sind neu, nichts davon steht in einem Spielstand.
 */
export function baueRaidGilde(
  name: RaidMusterName, { ersteId = 100, stufe = 15 }: { ersteId?: number; stufe?: number } = {},
): { helden: GuildFighter[]; stufen: SchmiedeStufen } {
  const stufen: SchmiedeStufen = {};
  const helden = raidMusterHelden(name).map((m, i) => {
    const held = createGuildFighter(m.classId, m.name, werteAufStufe(m.classId, CLASS_DEFS[m.classId].baseStats, stufe));
    held.id = ersteId + i;
    held.level = stufe;
    held.xp = totalXpForLevel(stufe);
    held.gear = { ...m.gear };
    if (stufe >= 10) held.spezialisierung = m.weg;
    for (const itemId of Object.values(held.gear)) {
      if (itemId && m.stufe > 0 && istSchmiedbar(itemId)) stufen[itemId] = m.stufe;
    }
    return held;
  });
  return { helden, stufen };
}

/** Feld aus Text: je Reihe sechs Namen oder «.», der Gang «|» zählt nicht */
function raster(...reihen: string[]): Record<string, Feld> {
  const felder: Record<string, Feld> = {};
  reihen.forEach((zeile, reihe) => {
    zeile.split(/\s+/).filter(w => w && w !== '|').forEach((wort, spalte) => {
      if (wort !== '.') felder[wort] = { reihe, spalte };
    });
  });
  return felder;
}

/**
 * Muster-Aufstellungen (Heldenname → Feld). `gut`: Daumenregeln (je Trupp ein Tank allein vorn, ein Heiler je
 * Trupp, jede Spalte besetzt, Sina ohne Nachbarn); `profi`: Fund der Aufstellungssuche (Schadens-Trupp mit sechs,
 * Hilfs-Trupp mit zwei Heilern); `lehrbuch`: Tanks vorn Mitte, Heiler dahinter, Schützen hinten; `naiv`: wie die
 * Startaufstellung (vorne voll, dann Mitte); `glocke`: vier Zähe vorn; `halb`: fast alle in der Mitte.
 */
export const RAID_AUFSTELLUNGEN = {
  gut: raster(
    'Brom   .      .      | .      .      Grimm',
    '.      Ewin   Liedra | Moos   Ansgar .',
    'Lia    .      Morn   | Ysra   .      Sina',
  ),
  profi: raster(
    '.      .      Brom   | .      Ansgar .',
    'Sina   .      Lia    | Moos   .      Morn',
    'Ewin   Ysra   Grimm  | Liedra .      .',
  ),
  lehrbuch: raster(
    '.      Brom   .      | .      Grimm  .',
    'Liedra Ewin   .      | Ansgar Moos   .',
    '.      Lia    Morn   | .      Sina   Ysra',
  ),
  naiv: raster(
    'Brom   Grimm  Lia    | Sina   Ansgar Ewin',
    'Moos   Liedra Ysra   | Morn   .      .',
  ),
  glocke: raster(
    'Brom   Ansgar .      | .      Ysra   Grimm',
    '.      Liedra Ewin   | Moos   .      .',
    'Lia    .      .      | Morn   .      Sina',
  ),
  halb: raster(
    '.      Brom   .      | .      Grimm  .',
    'Lia    Liedra Ewin   | Moos   Ysra   Sina',
    '.      .      Ansgar | Morn   .      .',
  ),
} satisfies Record<string, Record<string, Feld>>;

export type RaidAufstellungName = keyof typeof RAID_AUFSTELLUNGEN;

/** Aufstellung für diese Helden (Held-Id → Feld); wer in `ohne` steht oder kein Feld hat, bleibt unten */
export function raidMusterAufstellung(
  name: RaidAufstellungName, helden: GuildFighter[], ohne: string[] = [],
): Record<string, Feld> {
  const plan: Record<string, Feld> = RAID_AUFSTELLUNGEN[name];
  const aufstellung: Record<string, Feld> = {};
  for (const held of helden) {
    const feld = plan[held.name];
    if (feld && !ohne.includes(held.name)) aufstellung[String(held.id)] = { ...feld };
  }
  return aufstellung;
}
