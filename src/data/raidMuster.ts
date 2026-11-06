// ─── Magic City – Muster-Gilde des Raids ────────────────────────
// Zehn Helden auf Stufe 15 mit ihren Wegen, der Massstab für Zenit (tools/raidEichung.ts, tests/raid.test.ts)
// und die Gilde des Probespiels ?probe=raid. Der Kern sind die vier aus dem Musterteam «Stark» in ihren Sets
// wie in MUSTER_SETS.tagwerk0 (Lia ohne Stufen, die übrigen +5); die zweite Reihe trägt die Sets, die der Kern
// unterwegs abgelegt hat. Für Stufe II («Die dreizehnte Stunde») kommen fünf Lehrlinge dazu (`anker15`, die Gilde
// von ?probe=raid2), für Stufe III («Das Kuckucksei») die übrigen fünf (`anker20`, ?probe=raid3). Aufstellungen nach
// Heldennamen, gezeichnet wie auf dem Feld (Reihe 1 vorn). docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import { GuildFighter, createGuildFighter } from '../models/GuildRoster';
import type { Feld } from '../models/RaidStand';
import { totalXpForLevel, werteAufStufe } from '../systems/HeroProgression';
import { istSchmiedbar, SchmiedeStufen } from '../systems/Schmiede';
import { CLASS_DEFS } from './classes';
import { LEHRLINGE } from './lehrlinge';

export interface RaidMusterHeld {
  classId: string;
  name: string;
  weg: string;
  gear: GuildFighter['gear'];
  /** Schmiede-Stufe seiner Set-Teile */
  stufe: number;
  /** Ein Lehrling (data/lehrlinge.ts): zweiter Held seiner Klasse, im Bild gespiegelt */
  lehrling?: boolean;
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
 * Die fünf Lehrlinge für Stufe II: ein zweiter Schild und ein zweiter Salbentopf für den dritten Trupp, dazu Bogen,
 * Lied und Hexe. Stufe 15 mit Weg, in Sets der Stufen 3 und 4 und T4-Ausrüstung, alles ohne Schmiede: was eine
 * Gilde hat, die ihre Lehrlinge mit dem ausstattet, was im Lager liegt, während der Kern die neuen Sets trägt.
 */
const LEHRLINGE_15: RaidMusterHeld[] = [
  { classId: 'guardian', name: LEHRLINGE.guardian.name, weg: 'guardian_phalanx', stufe: 0, lehrling: true,
    gear: { mainHand: 'soulbreaker', offHand: 'set_kommandant_schild', armor: 'set_kommandant_platte', trinket: 'set_kommandant_talisman' } },
  { classId: 'cleric', name: LEHRLINGE.cleric.name, weg: 'cleric_kriegspriester', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_lich_stab', offHand: null, armor: 'set_lich_robe', trinket: 'set_lich_amulett' } },
  { classId: 'ranger', name: LEHRLINGE.ranger.name, weg: 'ranger_scharfschuetzin', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_hydra_bogen', offHand: null, armor: 'set_hydra_leder', trinket: 'set_hydra_amulett' } },
  { classId: 'bard', name: LEHRLINGE.bard.name, weg: 'bard_heldenlied', stufe: 0, lehrling: true, gear: { ...T4_BOW } },
  { classId: 'witch', name: LEHRLINGE.witch.name, weg: 'witch_sturmhexe', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_wyrm_klinge', offHand: null, armor: 'set_wyrm_platte', trinket: 'set_wyrm_amulett' } },
];

/**
 * Die fünf weiteren Lehrlinge für Stufe III, wieder aus dem Lager: Ragna (Berserkerin) mit Schild im Obsidianpanzer
 * für den Gang, Nix (Assassine) im Frostwanderer, Gerlinde (Paladin) im Eid des Gefallenen Ritters, Edgar
 * (Nekromant) im Aschewanderer, Farn (Druide) in den Schuppen des Leviathan. Stufe 15 mit Weg, ohne Schmiede.
 */
const LEHRLINGE_20: RaidMusterHeld[] = [
  { classId: 'berserker', name: LEHRLINGE.berserker.name, weg: 'berserker_zorn', stufe: 0, lehrling: true,
    gear: { mainHand: 'soulbreaker', offHand: 'set_obsidian_schild', armor: 'set_obsidian_platte', trinket: 'set_obsidian_talisman' } },
  { classId: 'assassin', name: LEHRLINGE.assassin.name, weg: 'assassin_schattentaenzerin', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_frost_klinge', offHand: null, armor: 'set_frost_leder', trinket: 'set_frost_amulett' } },
  { classId: 'paladin', name: LEHRLINGE.paladin.name, weg: 'paladin_kreuzritter', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_ritter_klinge', offHand: 'set_ritter_schild', armor: 'set_ritter_platte', trinket: 'arcane_amulet' } },
  { classId: 'necromancer', name: LEHRLINGE.necromancer.name, weg: 'necromancer_seuchenbringer', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_asche_hammer', offHand: null, armor: 'set_asche_robe', trinket: 'set_asche_talisman' } },
  { classId: 'druid', name: LEHRLINGE.druid.name, weg: 'druid_baerengestalt', stufe: 0, lehrling: true,
    gear: { mainHand: 'set_leviathan_stab', offHand: null, armor: 'set_leviathan_platte', trinket: 'set_leviathan_amulett' } },
];

/**
 * Die Varianten der Gilde: `anker` ist der Eichanker (zweite Reihe +3), `sets5`/`sets0` dieselben Sets auf +5 und
 * ohne Stufen, `t4` die zweite Reihe frisch hochgezogen in gewöhnlicher T4-Ausrüstung, `kern` nur die vier.
 * `anker15` ist der Anker mit den fünf Lehrlingen (Stufe II), `anker20` mit allen zehn (Stufe III).
 */
export type RaidMusterName = 'anker' | 'sets5' | 'sets0' | 't4' | 'kern' | 'anker15' | 'anker20';

export function raidMusterHelden(name: RaidMusterName): RaidMusterHeld[] {
  if (name === 'kern') return KERN.map(h => ({ ...h }));
  if (name === 'anker15') return [...raidMusterHelden('anker'), ...LEHRLINGE_15.map(h => ({ ...h, gear: { ...h.gear } }))];
  if (name === 'anker20') return [...raidMusterHelden('anker15'), ...LEHRLINGE_20.map(h => ({ ...h, gear: { ...h.gear } }))];
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
    if (m.lehrling) held.lehrling = true;
    if (stufe >= 10) held.spezialisierung = m.weg;
    for (const itemId of Object.values(held.gear)) {
      if (itemId && m.stufe > 0 && istSchmiedbar(itemId)) stufen[itemId] = m.stufe;
    }
    return held;
  });
  return { helden, stufen };
}

/** Feld aus Text: je Reihe sechs (Stufe II: neun, Stufe III: zwölf) Namen oder «.», die Gänge «|» zählen nicht */
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
  return nachPlan(RAID_AUFSTELLUNGEN[name], helden, ohne);
}

function nachPlan(plan: Record<string, Feld>, helden: GuildFighter[], ohne: string[]): Record<string, Feld> {
  const aufstellung: Record<string, Feld> = {};
  for (const held of helden) {
    const feld = plan[held.name];
    if (feld && !ohne.includes(held.name)) aufstellung[String(held.id)] = { ...feld };
  }
  return aufstellung;
}

/**
 * Muster-Aufstellungen für Stufe II (neun Spalten, drei Trupps; anker15). `gut`: die Daumenregeln für drei Trupps
 * (je Trupp ein Tank allein vorn und ein Heiler, jede Spalte besetzt und allein nur, wer den Zeiger aushält, auf E,
 * wo sich die Zeiger treffen, zwei Zähe, Sina ohne Nachbarn); `profi`: Fund der Aufstellungssuche ab «Gut»;
 * `lehrbuch`: Tanks vorn Mitte, Heiler dahinter, Schützen hinten, ohne Rücksicht auf die Zeiger; `naiv`: wie die
 * Startaufstellung (vorne voll, dann Mitte); `zehn`: die besten zehn aus dem Anker ohne Lehrlinge (Fund der
 * Aufstellungssuche, `npm run raid-eichung -- --suche zehn`): jede Spalte besetzt, fast jede mit nur einem.
 */
export const RAID_AUFSTELLUNGEN_DREIZEHN = {
  gut: raster(
    'Brom   .      .      | .      Bertram .      | .      Grimm  .',
    '.      Ewin   Morn   | Moos   Ansgar  Ysra   | Pirmin .      Sina',
    'Lia    Liedra Mirabell | Benno  .     .      | Wenna  .      .',
  ),
  profi: raster(
    '.      Sina   .      | .      Grimm   .      | .      .      Wenna',
    'Brom   Lia    Ewin   | .      .       Bertram | Mirabell Morn .',
    'Moos   Ansgar Ysra   | Liedra .       .      | Pirmin .      Benno',
  ),
  lehrbuch: raster(
    '.      Brom   .      | .      Bertram .      | .      Grimm  .',
    'Liedra Ewin   .      | Ansgar Moos    .      | Benno  Pirmin .',
    '.      Lia    Morn   | .      Sina    Ysra   | .      Wenna  Mirabell',
  ),
  naiv: raster(
    'Brom   Grimm  Lia    | Sina   Ansgar  Ewin   | Moos   Liedra Ysra',
    'Morn   Bertram Pirmin | Wenna  Benno   Mirabell | .   .      .',
  ),
  zehn: raster(
    'Liedra .      Grimm  | Ysra   .       .      | .      Brom   .',
    '.      .      .      | .      Morn    Ansgar | Moos   .      .',
    '.      Ewin   .      | .      .       .      | Lia    .      Sina',
  ),
} satisfies Record<string, Record<string, Feld>>;

export type RaidAufstellungDreizehn = keyof typeof RAID_AUFSTELLUNGEN_DREIZEHN;

/** Aufstellung für Stufe II (wie raidMusterAufstellung) */
export function raidMusterAufstellungDreizehn(
  name: RaidAufstellungDreizehn, helden: GuildFighter[], ohne: string[] = [],
): Record<string, Feld> {
  return nachPlan(RAID_AUFSTELLUNGEN_DREIZEHN[name], helden, ohne);
}

/**
 * Muster-Aufstellungen für Stufe III (zwölf Spalten, vier Trupps; anker20). `gut`: die Daumenregeln mit Kuckuck (je
 * Trupp ein Tank allein vorn in B, E, H, K; jede Spalte besetzt; am Gang, in C/D, F/G und I/J, keiner, der wenig
 * Leben hat und nicht ausweicht); `profi`: Fund der Aufstellungssuche; `lehrbuch`: die Daumenregeln von Stufe II auf
 * vier Trupps, ohne Rücksicht auf den Kuckuck; `naiv`: wie die Startaufstellung; `fuenfzehn`: die Gilde von Stufe II
 * (anker15), die beste gesuchte Ordnung für fünfzehn auf vier Trupps. Sie kommt nicht durch: Stufe III braucht mehr.
 */
export const RAID_AUFSTELLUNGEN_KUCKUCK = {
  gut: raster(
    '.      Brom   .      | .      Bertram .        | .        Grimm  .      | .      Ragna  .',
    '.      Benno  Lia    | Morn   .       Gerlinde | Liedra   .      Nix    | Wenna  .      Mirabell',
    'Sina   .      Pirmin | Ansgar .       Ewin     | Ysra     .      Moos   | Farn   .      Edgar',
  ),
  profi: raster(
    '.      Ysra   .      | .      Ewin    Bertram  | .        Grimm  .        | .      Liedra .',
    '.      Morn   Lia    | Edgar  .       Mirabell | Benno    .      Nix      | Pirmin .      .',
    'Sina   Brom   Farn   | Ansgar .       .        | .        .      Gerlinde | Wenna  Moos   Ragna',
  ),
  lehrbuch: raster(
    '.      Brom   .      | .      Bertram .      | .      Grimm  .        | .        Ragna  .',
    'Liedra Ewin   .      | Ansgar Moos    .      | Benno  Pirmin .        | Gerlinde Farn   .',
    '.      Lia    Morn   | .      Sina    Ysra   | .      Wenna  Mirabell | .        Nix    Edgar',
  ),
  naiv: raster(
    'Brom   Grimm  Lia      | Sina   Ansgar Ewin     | Moos  Liedra Ysra | Morn Bertram Pirmin',
    'Wenna  Benno  Mirabell | Ragna  Nix    Gerlinde | Edgar Farn   .    | .    .       .',
  ),
  fuenfzehn: raster(
    '.      Brom   .      | .      Pirmin .      | .        Grimm  .      | .      .       .',
    '.      Moos   Lia    | Morn   .      .      | Mirabell .      .      | .      .       Liedra',
    'Sina   Benno  Ysra   | .      .      Ansgar | .        .      Ewin   | Wenna  Bertram .',
  ),
} satisfies Record<string, Record<string, Feld>>;
export type RaidAufstellungKuckuck = keyof typeof RAID_AUFSTELLUNGEN_KUCKUCK;

/** Aufstellung für Stufe III (wie raidMusterAufstellung) */
export function raidMusterAufstellungKuckuck(
  name: RaidAufstellungKuckuck, helden: GuildFighter[], ohne: string[] = [],
): Record<string, Feld> {
  return nachPlan(RAID_AUFSTELLUNGEN_KUCKUCK[name], helden, ohne);
}
