// ─── Magic City – Die endlose Treppe (Daten) ────────────────────
// Christophs Endgame (18.10.2026): ab Stadtstufe 7 im Dungeon endlos nach
// oben kämpfen. Jedes Stockwerk ist ein Kampf, jedes 10. ein Boss, nach
// jedem 5. ein Rastplatz. Die Gegner kommen aus den bekannten Gebieten;
// ihre Werte richten sich nach dem Stockwerk (ihr Profil bleibt: der Troll
// bleibt zäh, die Fledermaus flink), damit die Treppe gleichmässig schwerer
// wird. Regeln und Zahlen: docs/TREPPE.md. Ablauf: systems/Treppe.ts.
// ────────────────────────────────────────────────────────────────

import { ENEMY_DEFS } from './enemies';

export const TREPPE_ROUTE_ID = 'endlose_treppe';

/** Stadtstufe, ab der die Treppe offen ist (Magische Stadt). */
export const TREPPE_AB_STADTSTUFE = 7;

/** Jedes 10. Stockwerk ist ein Boss-Stockwerk. */
export const BOSS_ALLE = 10;

/** Nach jedem 5. Stockwerk kommt ein Rastplatz; dort ist die Beute sicher. */
export const RAST_ALLE = 5;

/** Rastplatz: heilt diesen Anteil der vollen Leben … */
export const RAST_HEILUNG = 0.4;

/** … und Gefallene stehen mit diesem Anteil wieder auf. */
export const RAST_AUFSTEHEN = 0.25;

/** Kampf-IDs der Treppen-Gegner (eindeutig je Stockwerk, weit weg von Helden- und Zufalls-IDs). */
export const TREPPE_ID_BASIS = 2_000_000;

export interface TreppenAbschnitt {
  name: string;
  /** Route, deren Bild als Kampf-Hintergrund dient (ROUTE_IMAGE_MAP). */
  bild: string;
  /** Gegner der Stockwerke 1-9 dieses Abschnitts. */
  gegner: string[];
  /** Boss auf dem 10. Stockwerk. */
  boss: string;
}

/**
 * Elf Abschnitte zu je zehn Stockwerken, jeder mit einem Boss.
 * Nach Stockwerk 110 beginnt die Folge von vorn, nur stärker (zweiter Umlauf).
 */
export const TREPPEN_ABSCHNITTE: readonly TreppenAbschnitt[] = [
  { name: 'Wurzelgewölbe', bild: 'forest_medium', boss: 'boss_elder_treant',
    gegner: ['forest_bear', 'forest_wisp', 'forest_shaman', 'thorn_sprite', 'fungal_creeper', 'moss_golem', 'bramble_bear'] },
  { name: 'Spinnenschacht', bild: 'cave_spider', boss: 'boss_spider_queen',
    gegner: ['venomfang_spider', 'deep_crawler', 'stalactite_bat', 'crystal_beetle', 'shadow_bat'] },
  { name: 'Kristallgrotte', bild: 'crystal_mines', boss: 'boss_crystal_golem',
    gegner: ['cave_goblin', 'cave_troll', 'crystal_beetle', 'cave_slime', 'cave_golem_shard', 'mine_specter'] },
  { name: 'Räuberstiege', bild: 'forest_ruins', boss: 'boss_bandit_chief',
    gegner: ['forest_bandit', 'bandit_raider', 'goblin_scout', 'wild_boar', 'hollow_shade'] },
  { name: 'Moorstufen', bild: 'swamp_long', boss: 'boss_swamp_hydra',
    gegner: ['leech_swarm', 'toxic_toad', 'rot_walker', 'swamp_troll', 'bog_witch', 'mire_phantom'] },
  { name: 'Gruftgalerie', bild: 'ruins_crypts', boss: 'boss_fallen_knight',
    gegner: ['skeleton_warrior', 'bone_knight', 'stone_guardian', 'cursed_priest', 'ghost_mage'] },
  { name: 'Schattensaal', bild: 'shadow_catacombs', boss: 'boss_shadow_lich',
    gegner: ['tomb_horror', 'ghost_mage', 'bone_knight', 'cursed_wisp', 'shadow_bat'] },
  { name: 'Tiefseewendel', bild: 'ocean_abyss', boss: 'boss_leviathan',
    gegner: ['deep_sea_angler', 'jellyfish_swarm', 'pressure_crab', 'drowned_knight', 'sea_serpent'] },
  { name: 'Glutschlot', bild: 'volcano_core', boss: 'boss_magma_wyrm',
    gegner: ['lava_elemental', 'fire_bat', 'obsidian_crab', 'ash_golem', 'flame_spirit', 'magma_slug'] },
  { name: 'Mauerkranz', bild: 'siege_walls', boss: 'boss_iron_commander',
    gegner: ['wall_archer', 'wall_guard', 'siege_crossbowman', 'siege_defender'] },
  { name: 'Bollwerk', bild: 'siege_fortress', boss: 'boss_fortress_warden',
    gegner: ['siege_crossbowman', 'siege_defender', 'wall_archer', 'siege_mage'] },
];

/** Stockwerke je Umlauf (11 Abschnitte × 10). */
export const STOCKWERKE_JE_UMLAUF = TREPPEN_ABSCHNITTE.length * BOSS_ALLE;

// ── Aufbau eines Stockwerks ─────────────────────────────────────

export function istBossEtage(etage: number): boolean {
  return etage % BOSS_ALLE === 0;
}

export function istRastEtage(etage: number): boolean {
  return etage % RAST_ALLE === 0;
}

export function abschnittFuer(etage: number): TreppenAbschnitt {
  const nr = Math.floor((Math.max(1, etage) - 1) / BOSS_ALLE);
  return TREPPEN_ABSCHNITTE[nr % TREPPEN_ABSCHNITTE.length];
}

/** 1 für Stockwerk 1-110, 2 für 111-220 … */
export function umlaufFuer(etage: number): number {
  return Math.floor((Math.max(1, etage) - 1) / STOCKWERKE_JE_UMLAUF) + 1;
}

/** Nächstes Boss-Stockwerk ab hier (das Stockwerk selbst, wenn es eines ist). */
export function naechsteBossEtage(etage: number): number {
  return Math.ceil(Math.max(1, etage) / BOSS_ALLE) * BOSS_ALLE;
}

/** Gegner auf einem normalen Stockwerk: das erste eines Abschnitts hat zwei, die anderen drei. */
export function gegnerAnzahl(etage: number): number {
  return etage % BOSS_ALLE === 1 ? 2 : 3;
}

/** Kleiner Zufall mit Startwert, damit jedes Stockwerk immer gleich aussieht. */
function zufallMitStartwert(startwert: number): () => number {
  let s = startwert | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const heilt = (id: string): boolean =>
  ENEMY_DEFS[id]?.skills.some(s => s.effectType === 'heal') ?? false;

/**
 * Gegner-IDs eines Stockwerks. Immer gleich für dasselbe Stockwerk; höchstens
 * ein Heiler je Kampf (zwei Heiler machen einen Kampf zur Geduldsprobe).
 */
export function stockwerkGegner(etage: number): string[] {
  const abschnitt = abschnittFuer(etage);
  if (istBossEtage(etage)) return [abschnitt.boss];
  const zufall = zufallMitStartwert(etage * 7919 + 17);
  const ids: string[] = [];
  const anzahl = gegnerAnzahl(etage);
  for (let versuch = 0; ids.length < anzahl && versuch < 50; versuch++) {
    const id = abschnitt.gegner[Math.floor(zufall() * abschnitt.gegner.length)];
    if (heilt(id) && ids.some(heilt)) continue;
    ids.push(id);
  }
  return ids;
}

// ── Stärke je Stockwerk ─────────────────────────────────────────
// Ein normaler Gegner auf Stockwerk n hat im Mittel diese Werte. Leben
// wachsen um einen festen Prozentsatz je Stockwerk, Angriff und Rüstung
// zusätzlich um feste Schritte: Der Schaden ist «Angriff − 0,7 × Rüstung»,
// prozentuales Wachstum allein würde schwache Werte nie über die Rüstung
// der Helden heben. Stockwerk 1 ist etwas stärker als die Gegner der
// Stufe 4 (Angriff 10 statt 5-8); geeicht mit Probe-Kämpfen, siehe docs/TREPPE.md.

export const STAERKE = {
  leben: 90,           // Leben auf Stockwerk 1
  lebenWachstum: 0.05, // +5 % Leben je Stockwerk
  angriff: 10,         // Angriff auf Stockwerk 1
  angriffSchritt: 0.55, // + je Stockwerk
  angriffWachstum: 0,  // zusätzlich in Prozent je Stockwerk
  ruestung: 2,         // Rüstung auf Stockwerk 1
  ruestungSchritt: 0.25,
} as const;

/** Bosse sind ein Vielfaches eines normalen Gegners ihres Stockwerks. */
export const BOSS_FAKTOR = { leben: 3.5, angriff: 1.25, ruestung: 1.2 } as const;

export interface StockwerkWerte {
  hp: number;
  atk: number;
  def: number;
}

/** Mittlere Werte eines normalen Gegners auf diesem Stockwerk. */
export function stockwerkStaerke(etage: number): StockwerkWerte {
  const n = Math.max(1, etage) - 1;
  return {
    hp: STAERKE.leben * Math.pow(1 + STAERKE.lebenWachstum, n),
    atk: (STAERKE.angriff + STAERKE.angriffSchritt * n) * Math.pow(1 + STAERKE.angriffWachstum, n),
    def: STAERKE.ruestung + STAERKE.ruestungSchritt * n,
  };
}

const mittel = (werte: number[]): number => werte.reduce((a, b) => a + b, 0) / Math.max(1, werte.length);

/**
 * Profil eines Gegners in seinem Abschnitt: seine Grundwerte geteilt durch
 * den Durchschnitt des Abschnitts (Troll 1,6 × Leben, Fledermaus 0,6 × …).
 */
export function gegnerProfil(defId: string, abschnitt: TreppenAbschnitt): StockwerkWerte {
  const def = ENEMY_DEFS[defId];
  if (!def) return { hp: 1, atk: 1, def: 1 };
  const defs = abschnitt.gegner.map(id => ENEMY_DEFS[id]).filter(Boolean);
  return {
    hp: def.hp / mittel(defs.map(d => d.hp)),
    atk: def.atk / mittel(defs.map(d => d.atk)),
    // +1: Gegner mit Rüstung 0 bekommen trotzdem etwas
    def: (def.def + 1) / (mittel(defs.map(d => d.def)) + 1),
  };
}

/** Werte eines Gegners auf einem Stockwerk (gerundet). Bosse: Stockwerk-Stärke × BOSS_FAKTOR. */
export function gegnerWerte(defId: string, etage: number): StockwerkWerte {
  const staerke = stockwerkStaerke(etage);
  const boss = ENEMY_DEFS[defId]?.isBoss === true;
  const profil = boss
    ? { hp: BOSS_FAKTOR.leben, atk: BOSS_FAKTOR.angriff, def: BOSS_FAKTOR.ruestung }
    : gegnerProfil(defId, abschnittFuer(etage));
  return {
    hp: Math.max(1, Math.round(staerke.hp * profil.hp)),
    atk: Math.max(1, Math.round(staerke.atk * profil.atk)),
    def: Math.max(0, Math.round(staerke.def * profil.def)),
  };
}

// ── Belohnung und Startpunkte ───────────────────────────────────

/** Gold zusätzlich zur Beute der Gegner, wenn ein Stockwerk geschafft ist. */
export function stockwerkGold(etage: number): number {
  return istBossEtage(etage) ? 12 * etage : 2 * etage;
}

/** Zusätzliche Beute eines Boss-Stockwerks (Kristallsplitter, mehr je höher). */
export function bossBeute(etage: number): Record<string, number> {
  return istBossEtage(etage) ? { crystal_shard: 1 + Math.floor(etage / 30) } : {};
}

/**
 * Wo ein Lauf beginnen darf: ganz unten oder direkt über einem Boss-Stockwerk,
 * das schon einmal geschafft wurde (11, 21, 31 …).
 */
export function startEtagen(besteEtage: number): number[] {
  const starts = [1];
  for (let boss = BOSS_ALLE; boss <= besteEtage; boss += BOSS_ALLE) starts.push(boss + 1);
  return starts;
}

/** Römische Ziffer für den Umlauf im Boss-Namen («Uralter Treant II»). */
export function umlaufZusatz(etage: number): string {
  const umlauf = umlaufFuer(etage);
  const roemisch = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return umlauf < 2 ? '' : ` ${roemisch[umlauf] ?? umlauf}`;
}
