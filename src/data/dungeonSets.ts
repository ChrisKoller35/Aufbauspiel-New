// ─── Magic City – Dungeon-Sets ──────────────────────────────────
// Jeder Dungeon hat sein eigenes Set aus drei Teilen. Ein Teil fällt beim Sieg
// im Dungeon (systems/DungeonSets.ts). Zwei Teile geben Werte, alle drei die
// Set-Fähigkeit, die im Kampf sichtbar auslöst (systems/Kampfeffekte.ts).
// Neue Dungeons bekommen ein neues Set (docs/DUNGEON-SETS.md).
// ────────────────────────────────────────────────────────────────

import type { ItemDef } from './items';
import type { SpecialEffect } from '../models/ExpeditionRun';

/**
 * Bauart eines Set-Teils. Sie legt Platz und Werte fest (ART_WERTE).
 * Einhand: klinge, dolch · Zweihand: hammer, bogen, stab · Nebenhand: schild
 * Rüstung: platte, leder, robe · Schmuck: amulett, ring, talisman
 */
export type SetTeilArt =
  | 'klinge' | 'dolch' | 'hammer' | 'bogen' | 'stab' | 'schild'
  | 'platte' | 'leder' | 'robe' | 'amulett' | 'ring' | 'talisman';

export interface SetTeilDef {
  art: SetTeilArt;
  name: string;
  /** Vorhandenes Bild (Sprite-Key), bis es eigene Set-Bilder gibt */
  bild: string;
  text: string;
  /** Eigenschaft ab Ebene 3, wenn nicht die der Bauart (ART_EIGENSCHAFT), z. B. damit sie sich im Set nicht doppelt */
  eigenschaft?: string;
}

export type SetWerte = NonNullable<ItemDef['statBonuses']> & { critMult?: number };

/** Set-Fähigkeit ab drei Teilen: Effekte mit Werten für den Träger */
export interface SetFaehigkeitDef {
  name: string;
  text: string;
  effekte: Omit<SpecialEffect, 'usesLeft'>[];
  /** Feste Werte, die mit der Fähigkeit kommen (z. B. Krit-Schaden) */
  werte?: SetWerte;
}

export interface DungeonSetDef {
  id: string;
  routeId: string;
  name: string;
  /** Zeichen auf Bild und Karte */
  zeichen: string;
  tier: number;
  teile: [SetTeilDef, SetTeilDef, SetTeilDef];
  /** Bonus ab zwei getragenen Teilen */
  zweiTeile: SetWerte;
  dreiTeile: SetFaehigkeitDef;
  /** Luft je Teil auf Unterwasser-Routen */
  luftJeTeil?: number;
}

// ── Werte je Bauart und Ebene (Index 0 = Ebene 1) ──
// So gut wie die besten gewöhnlichen Gegenstände derselben Ebene und Bauart (Ebene 4:
// Seelenbrecher, Drachenfürstplatte, Aetherkristall-Herz …), damit ein Set-Teil nie ein
// Rückschritt ist. Die Set-Boni kommen obendrauf und machen den Unterschied.
// Ebene 7 und 8 (Sternenschmiede, Sternenschlund) setzen die Reihen im selben Schritt fort,
// Ebene 9 und 10 (Mondhof, Morgentor) ebenso. Ein Dungeon auf Ebene 11 braucht je eine Zahl mehr in jeder Reihe.

/** Die höchste Ebene, für die es Werte gibt */
export const HOECHSTE_EBENE = 10;

type Reihe = [number, number, number, number, number, number, number, number, number, number];

const ART_WERTE: Record<SetTeilArt, Partial<Record<'atk' | 'def' | 'hp' | 'spd' | 'critChance', Reihe>>> = {
  klinge: { atk: [3, 5, 7, 10, 12, 14, 16, 18, 20, 22], def: [0, 0, 0, 2, 2, 3, 3, 4, 4, 5], critChance: [0, 0, 0.05, 0.08, 0.1, 0.12, 0.13, 0.14, 0.15, 0.16] },
  dolch: { atk: [2, 4, 6, 8, 11, 13, 15, 17, 19, 21], spd: [0.05, 0.05, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2, 0.2], critChance: [0.05, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.21, 0.22] },
  hammer: { atk: [4, 7, 10, 13, 16, 19, 22, 25, 28, 31], hp: [4, 6, 10, 15, 20, 25, 30, 35, 40, 45], def: [0, 1, 2, 3, 3, 4, 5, 6, 7, 8] },
  bogen: { atk: [2, 3, 6, 9, 11, 13, 15, 17, 19, 21], spd: [0.1, 0.15, 0.1, 0.2, 0.2, 0.2, 0.2, 0.25, 0.25, 0.25], critChance: [0.05, 0.1, 0.12, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3] },
  stab: { atk: [1, 2, 5, 7, 9, 11, 13, 15, 17, 19], hp: [5, 8, 12, 18, 24, 30, 36, 42, 48, 54], def: [0, 0, 2, 3, 4, 5, 6, 7, 8, 9], critChance: [0, 0, 0, 0.08, 0.08, 0.1, 0.1, 0.12, 0.12, 0.14] },
  schild: { def: [4, 6, 7, 10, 14, 16, 18, 20, 22, 24], hp: [2, 4, 10, 15, 26, 30, 35, 40, 45, 50], spd: [-0.05, -0.05, -0.05, -0.05, -0.05, -0.05, -0.05, -0.05, -0.05, -0.05] },
  platte: { def: [4, 5, 8, 12, 14, 16, 18, 20, 22, 24], hp: [4, 8, 15, 20, 26, 32, 38, 44, 50, 56], spd: [-0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  leder: { def: [2, 3, 4, 7, 9, 11, 13, 15, 17, 19], hp: [5, 7, 12, 14, 18, 22, 26, 30, 34, 38], atk: [0, 1, 1, 2, 3, 4, 5, 6, 7, 8], critChance: [0, 0, 0.05, 0.12, 0.14, 0.16, 0.18, 0.2, 0.21, 0.22] },
  robe: { hp: [8, 12, 14, 22, 26, 32, 38, 44, 50, 56], atk: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11], spd: [0, 0, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2, 0.2], critChance: [0, 0.05, 0.05, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22] },
  amulett: { atk: [1, 2, 3, 4, 4, 5, 6, 7, 8, 9], def: [0, 1, 2, 2, 3, 4, 5, 5, 6, 6], hp: [3, 4, 5, 12, 16, 20, 24, 28, 32, 36], spd: [0, 0, 0, 0.05, 0.08, 0.1, 0.1, 0.12, 0.12, 0.14], critChance: [0.03, 0.05, 0.05, 0.1, 0.08, 0.1, 0.12, 0.12, 0.12, 0.14] },
  ring: { atk: [1, 2, 4, 4, 5, 6, 7, 8, 9, 10], spd: [0.05, 0.05, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2, 0.2], critChance: [0.05, 0.06, 0.1, 0.12, 0.12, 0.15, 0.16, 0.18, 0.2, 0.22] },
  talisman: { def: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11], hp: [4, 6, 8, 15, 18, 22, 26, 30, 34, 38] },
};

/**
 * Eigenschaft je Bauart ab Ebene 3, wie bei den übrigen Gegenständen dieser Ebenen
 * (Seelenbrecher: Doppelschlag, Aetherschild: Reflexion …). Gleiche Eigenschaften zählen
 * nicht doppelt, darum weicht ein Teil davon ab, wenn sein Set sie schon hat (SetTeilDef.eigenschaft).
 */
export const EIGENSCHAFT_AB_EBENE = 3;
const ART_EIGENSCHAFT: Record<SetTeilArt, string> = {
  klinge: 'double_strike', dolch: 'double_strike', hammer: 'stun_strike', bogen: 'anti_heal',
  stab: 'spell_power', schild: 'reflect', platte: 'fire_resist', leder: 'dodge',
  robe: 'aoe_resist', amulett: 'spell_power', ring: 'spell_power', talisman: 'aoe_resist',
};

/** Die Eigenschaft eines Set-Teils (null unter Ebene 3) */
export function teilEigenschaft(set: DungeonSetDef, teil: SetTeilDef): string | null {
  return set.tier >= EIGENSCHAFT_AB_EBENE ? teil.eigenschaft ?? ART_EIGENSCHAFT[teil.art] : null;
}

const ART_PLATZ: Record<SetTeilArt, { slot: NonNullable<ItemDef['gearSlot']>; hand?: ItemDef['weaponSlotType']; tags: string[] }> = {
  klinge: { slot: 'mainHand', hand: '1h', tags: ['weapon'] },
  dolch: { slot: 'mainHand', hand: '1h', tags: ['weapon'] },
  hammer: { slot: 'mainHand', hand: '2h', tags: ['weapon'] },
  bogen: { slot: 'mainHand', hand: '2h', tags: ['weapon'] },
  stab: { slot: 'mainHand', hand: '2h', tags: ['weapon'] },
  schild: { slot: 'offHand', hand: 'shield', tags: ['shield'] },
  platte: { slot: 'armor', tags: ['armor', 'heavy'] },
  leder: { slot: 'armor', tags: ['armor', 'medium'] },
  robe: { slot: 'armor', tags: ['armor', 'light'] },
  amulett: { slot: 'trinket', tags: ['trinket'] },
  ring: { slot: 'trinket', tags: ['trinket'] },
  talisman: { slot: 'trinket', tags: ['trinket'] },
};

/** Grundpreis je Ebene (wie die übrigen Gegenstände derselben Ebene) */
const WERT_JE_EBENE: Reihe = [12, 26, 45, 72, 100, 120, 140, 160, 180, 200];

// ── Die Sets, in der Reihenfolge der Dungeon-Karte von unten nach oben ──

export const DUNGEON_SETS: DungeonSetDef[] = [
  // ── Ebene 1 ──
  {
    id: 'rudel', routeId: 'forest_short', name: 'Rudel des Waldpfads', zeichen: '🐺', tier: 1,
    teile: [
      { art: 'klinge', name: 'Rudelreisser', bild: 'ITEM_IRON_SWORD', text: 'Hat mehr Wölfe gesehen als Schleifsteine.' },
      { art: 'leder', name: 'Pelzwams des Leitwolfs', bild: 'ITEM_LEATHER_ARMOR', text: 'Riecht nach nassem Hund. Hält trotzdem warm.' },
      { art: 'amulett', name: 'Heulpfeife', bild: 'ITEM_WOLF_FANG_NECKLACE', text: 'Ein Knochen mit drei Löchern. Wölfe finden den Ton beleidigend.' },
    ],
    zweiTeile: { atk: 1, hp: 5 },
    dreiTeile: {
      name: 'Rudelgeheul',
      text: 'Zu Beginn jedes Kampfes heult der Träger: Das ganze Team hat 3 Runden lang +2 Angriff.',
      effekte: [{ id: 'rudelgeheul', power: 2, runden: 3 }],
    },
  },
  {
    id: 'lichtung', routeId: 'forest_ruins', name: 'Hüter der Lichtung', zeichen: '🍃', tier: 1,
    teile: [
      { art: 'schild', name: 'Moosschild', bild: 'ITEM_IRON_SHIELD', text: 'Das Moos wächst nach. Der Schild leider nicht.' },
      { art: 'platte', name: 'Ruinen-Kettenhemd', bild: 'ITEM_CHAIN_ARMOR', text: 'Aus den Ruinen geborgen. Der Vorbesitzer braucht es nicht mehr.' },
      { art: 'talisman', name: 'Altarsplitter', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Niemand weiss, wem der Altar gehörte. Er schützt trotzdem.' },
    ],
    zweiTeile: { def: 1, hp: 6 },
    dreiTeile: {
      name: 'Moospolster',
      text: 'Zu Beginn jedes Kampfes erhält der Träger einen Schild, der 12 Schaden schluckt.',
      effekte: [{ id: 'moospolster', power: 12 }],
    },
  },

  // ── Ebene 2 ──
  {
    id: 'borke', routeId: 'forest_medium', name: 'Borke des Uralten', zeichen: '🌳', tier: 2,
    teile: [
      { art: 'stab', name: 'Treantast', bild: 'ITEM_OAK_STAFF', text: 'Er hat sich nicht gewehrt. Er hat nur sehr langsam protestiert.' },
      { art: 'leder', name: 'Borkenwams', bild: 'ITEM_LEATHER_ARMOR', text: 'Knarrt bei jedem Schritt. Spechte halten Abstand.' },
      { art: 'amulett', name: 'Harztropfen', bild: 'ITEM_WOLF_FANG_NECKLACE', text: 'Darin eingeschlossen: eine Mücke, die sehr viel weiss.' },
    ],
    zweiTeile: { hp: 10 },
    dreiTeile: {
      name: 'Wurzelkraft',
      text: 'Der Träger heilt am Ende jeder Runde 4 Leben.',
      effekte: [{ id: 'regen', power: 4, name: 'Wurzelkraft' }],
    },
  },
  {
    id: 'irrlicht', routeId: 'haunted_woods', name: 'Schleier der Irrlichter', zeichen: '🕯️', tier: 2,
    teile: [
      { art: 'dolch', name: 'Irrlichtdolch', bild: 'ITEM_STEEL_SWORD', text: 'Leuchtet immer dort, wo der Gegner gerade nicht hinschaut.' },
      { art: 'robe', name: 'Nebelkutte', bild: 'ITEM_NOVIZENROBE', text: 'Wer sie trägt, wird im Nebel übersehen. Auch beim Essen.' },
      { art: 'ring', name: 'Irrlicht im Glas', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Es zeigt den Weg. Nur nie den richtigen.' },
    ],
    zweiTeile: { spd: 0.05, critChance: 0.03 },
    dreiTeile: {
      name: 'Irrlichtschleier',
      text: 'Der Träger weicht 20 % aller Angriffe aus.',
      effekte: [{ id: 'dodge', chance: 0.2, name: 'Irrlichtschleier' }],
    },
  },
  {
    id: 'golem', routeId: 'cave_deep', name: 'Splitter des Kristallgolems', zeichen: '💎', tier: 2,
    teile: [
      { art: 'schild', name: 'Kristallschild', bild: 'ITEM_STEEL_SHIELD', text: 'Wer darauf schlägt, hört ein sehr teures Klirren.' },
      { art: 'platte', name: 'Golemplatte', bild: 'ITEM_STEEL_ARMOR', text: 'Der Golem wollte sie zurück. Dann ist er umgefallen.' },
      { art: 'talisman', name: 'Glimmender Kern', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Summt in derselben Tonart wie Zahnschmerzen.' },
    ],
    zweiTeile: { def: 2, hp: 6 },
    dreiTeile: {
      name: 'Splitterpanzer',
      text: 'Wer den Träger angreift, bekommt 25 % des Schadens als Splitter zurück.',
      effekte: [{ id: 'reflect', power: 0.25, name: 'Splitterpanzer' }],
    },
  },
  {
    id: 'spinne', routeId: 'cave_spider', name: 'Brut der Spinnenkönigin', zeichen: '🕷️', tier: 2,
    teile: [
      { art: 'dolch', name: 'Giftzahn', bild: 'ITEM_HYDRA_VENOMFANG', text: 'Ausgerissen, nicht geschenkt. Tropft noch, also bitte nicht ablecken.' },
      { art: 'robe', name: 'Netzseidenhemd', bild: 'ITEM_SPIDER_SILK_ROBE', text: 'Gewebt aus dem Netz, in dem du fast hängen geblieben wärst.' },
      { art: 'ring', name: 'Kokonbrosche', bild: 'ITEM_LICH_PHYLACTERY', text: 'Im Kokon war etwas. Jetzt nicht mehr. Wo es ist, verrät die Brosche nicht.' },
    ],
    zweiTeile: { atk: 2 },
    dreiTeile: {
      name: 'Giftbiss',
      text: 'Jeder Treffer vergiftet: Der Gegner verliert 3 Runden lang je 4 Leben.',
      effekte: [{ id: 'giftbiss', power: 4, runden: 3 }],
    },
  },
  {
    id: 'goblin', routeId: 'cave_tunnels', name: 'Schmugglerware der Goblins', zeichen: '💰', tier: 2,
    teile: [
      { art: 'dolch', name: 'Krummer Dietrich', bild: 'ITEM_IRON_SWORD', text: 'Öffnet Schlösser, Taschen und gelegentlich Gegner.' },
      { art: 'leder', name: 'Wams mit vierzig Taschen', bild: 'ITEM_LEATHER_ARMOR', text: 'Neununddreissig sind leer. In der vierzigsten wohnt ein Goblin.' },
      { art: 'ring', name: 'Glücksbeutel', bild: 'ITEM_AMULET_OF_REBIRTH', text: 'Klimpert immer. Auch wenn nichts drin ist. Vor allem dann.' },
    ],
    zweiTeile: { atk: 2, spd: 0.05 },
    dreiTeile: {
      name: 'Klebrige Finger',
      text: 'Aus jedem Kampf bringt das Team 30 % mehr Gold mit.',
      effekte: [{ id: 'klebrige_finger', power: 0.3 }],
    },
  },
  {
    id: 'kueste', routeId: 'ocean_shallows', name: 'Strandgut der Küste', zeichen: '🐚', tier: 2, luftJeTeil: 10,
    teile: [
      { art: 'stab', name: 'Treibholzstab', bild: 'ITEM_CRYSTAL_STAFF', text: 'Von der Flut gebracht, von der Ebbe vergessen. Riecht nach Tang.' },
      { art: 'robe', name: 'Netzflickerkutte', bild: 'ITEM_BATTLE_ROBE', text: 'Mehr Flicken als Kutte. Hält jede Welle ab, nur nicht die nasse.' },
      { art: 'amulett', name: 'Muschelhorn', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Wer hineinhorcht, hört das Meer. Wer hineinbläst, hört Beschwerden.' },
    ],
    zweiTeile: { hp: 8, def: 1 },
    dreiTeile: {
      name: 'Gezeitenwelle',
      text: 'Alle 3 Runden heilt der Träger das schwächste Teammitglied um 15 % seiner Leben.',
      effekte: [{ id: 'gezeitenwelle', runden: 3, anteil: 0.15 }],
    },
  },
  {
    id: 'sumpfdorf', routeId: 'swamp_village', name: 'Tracht des Sumpfdorfs', zeichen: '🐸', tier: 2,
    teile: [
      { art: 'klinge', name: 'Egelklinge', bild: 'ITEM_STEEL_SWORD', text: 'Saugt. Nicht im übertragenen Sinn.' },
      { art: 'leder', name: 'Krötenlederwams', bild: 'ITEM_HEAVY_LEATHER_ARMOR', text: 'Aus echtem Krötenleder. Die Kröte war damit nicht einverstanden.' },
      { art: 'talisman', name: 'Egelglas', bild: 'ITEM_LICH_PHYLACTERY', text: 'Drei Blutegel in einem Glas. Sie haben Namen. Frag nicht.' },
    ],
    zweiTeile: { atk: 1, hp: 8 },
    dreiTeile: {
      name: 'Blutegelbiss',
      text: 'Der Träger heilt sich um 20 % des Schadens, den er austeilt.',
      effekte: [{ id: 'lifesteal', power: 0.2, name: 'Blutegelbiss' }],
    },
  },

  // ── Ebene 3 ──
  {
    id: 'hydra', routeId: 'swamp_long', name: 'Köpfe der Hydra', zeichen: '🐍', tier: 3,
    teile: [
      { art: 'bogen', name: 'Zwillingssehne', bild: 'ITEM_FALLEN_HUNTERS_BOW', text: 'Zwei Sehnen, zwei Pfeile, ein Gedanke. Die Hydra hatte mehr Köpfe als das.' },
      { art: 'leder', name: 'Hydraschuppenwams', bild: 'ITEM_BANDIT_KING_ARMOR', text: 'Für jede abgeschnittene Schuppe wuchsen zwei nach. Der Kürschner hat aufgegeben.' },
      { art: 'amulett', name: 'Hydraauge', bild: 'ITEM_ARCANE_AMULET', text: 'Es blinzelt. Es hat sechs Geschwister, die alle woanders hinschauen.' },
    ],
    zweiTeile: { atk: 3, critChance: 0.04 },
    dreiTeile: {
      name: 'Zweiter Kopf',
      text: '30 % Chance, nach jedem Angriff gleich noch einmal zuzuschlagen.',
      effekte: [{ id: 'double_strike', chance: 0.3, name: 'Zweiter Kopf' }],
    },
  },
  {
    id: 'ritter', routeId: 'ruins_crypts', name: 'Eid des Gefallenen Ritters', zeichen: '💀', tier: 3,
    teile: [
      { art: 'klinge', name: 'Eidbrecher', bild: 'ITEM_STEEL_SWORD', text: 'Der Ritter schwor, sie nie wieder zu ziehen. Sie hat ihm das nie verziehen.' },
      { art: 'schild', name: 'Schild ohne Wappen', bild: 'ITEM_WYRM_SCALE_SHIELD', text: 'Das Wappen wurde abgekratzt. Von innen.' },
      { art: 'platte', name: 'Grabplatte', bild: 'ITEM_MYSTIC_PLATE_ARMOR', text: 'Schwer wie ein Grabstein. Steht dir aber besser.' },
    ],
    zweiTeile: { def: 3, hp: 10 },
    dreiTeile: {
      name: 'Unbeugsam',
      text: 'Fällt der Träger, steht er einmal pro Expedition mit 40 % seiner Leben wieder auf.',
      effekte: [{ id: 'revive', power: 0.4, name: 'Unbeugsam' }],
    },
  },
  {
    id: 'kommandant', routeId: 'siege_walls', name: 'Rüstzeug des Eisernen Kommandanten', zeichen: '🏰', tier: 3,
    teile: [
      { art: 'schild', name: 'Turmschild', bild: 'ITEM_STEEL_SHIELD', text: 'So breit wie ein Tor. Wer dahinter steht, hört Pfeile nur noch anklopfen.' },
      { art: 'platte', name: 'Kommandantenharnisch', bild: 'ITEM_STEEL_ARMOR', text: 'Mit eingebauter Pfeife für Befehle. Gehorcht hat ihr noch nie jemand.' },
      { art: 'talisman', name: 'Eisernes Siegel', bild: 'ITEM_AETHER_HEART', text: 'Wer es zeigt, darf Befehle geben. Befolgt werden sie trotzdem selten.' },
    ],
    zweiTeile: { def: 3, hp: 8 },
    dreiTeile: {
      name: 'Schildwall',
      text: 'Das ganze Team hat die ganze Expedition lang +3 Verteidigung.',
      effekte: [{ id: 'schildwall', power: 3 }],
    },
  },
  {
    id: 'leviathan', routeId: 'ocean_depths', name: 'Schuppen des Leviathan', zeichen: '🌊', tier: 3, luftJeTeil: 12,
    teile: [
      { art: 'stab', name: 'Strudelstab', bild: 'ITEM_CRYSTAL_STAFF', text: 'Dreht man ihn, dreht sich das Wasser mit. Und der Magen.' },
      { art: 'platte', name: 'Leviathanschuppe', bild: 'ITEM_MYSTIC_PLATE_ARMOR', text: 'Eine einzige Schuppe. Der Leviathan vermisst sie, aber nicht lange.' },
      { art: 'amulett', name: 'Perle aus dem Magen', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Wo genau sie gefunden wurde, verschweigen wir besser.', eigenschaft: 'aoe_resist' },
    ],
    zweiTeile: { atk: 3, hp: 10 },
    dreiTeile: {
      name: 'Druckwelle',
      text: 'Jede 4. Runde trifft der Träger alle Gegner mit 60 % seines Schadens.',
      effekte: [{ id: 'druckwelle', runden: 4, anteil: 0.6 }],
    },
  },
  {
    id: 'kristall', routeId: 'crystal_mines', name: 'Werkzeug des Kristallsuchers', zeichen: '⛏️', tier: 3,
    teile: [
      { art: 'hammer', name: 'Spitzhacke des Vorarbeiters', bild: 'ITEM_WAR_HAMMER', text: 'Hat mehr Kristall gesehen als jede Schatzkammer. Und mehr Daumen.' },
      { art: 'leder', name: 'Grubenwams', bild: 'ITEM_LEATHER_ARMOR', text: 'Staubig, löchrig, unkaputtbar. Wie der Vorarbeiter.' },
      { art: 'ring', name: 'Geschliffener Splitter', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Bricht das Licht in sieben Farben. Und Gegner in zwei Hälften.' },
    ],
    zweiTeile: { critChance: 0.06 },
    dreiTeile: {
      name: 'Kristallschliff',
      text: 'Der Träger trifft 8 % öfter kritisch, und seine kritischen Treffer machen 60 % mehr Schaden.',
      effekte: [{ id: 'kristallschliff' }],
      werte: { critChance: 0.08, critMult: 0.6 },
    },
  },
  {
    id: 'frost', routeId: 'frozen_pass', name: 'Frostwanderer', zeichen: '❄️', tier: 3,
    teile: [
      { art: 'klinge', name: 'Eiszapfenschwert', bild: 'ITEM_STEEL_SWORD', text: 'Schmilzt nie. Schärft sich bei Frost von selbst. Hasst den Sommer.' },
      { art: 'leder', name: 'Pelz des Passwärters', bild: 'ITEM_HEAVY_LEATHER_ARMOR', text: 'Der Passwärter hat ihn verkauft, kurz bevor es kalt wurde. Schlechtes Timing.' },
      { art: 'amulett', name: 'Frostkristall', bild: 'ITEM_CRYSTAL_PENDANT', text: 'Kühlt Tee in Sekunden. Hier oben trinkt niemand Tee.' },
    ],
    zweiTeile: { atk: 2, def: 2 },
    dreiTeile: {
      name: 'Einfrieren',
      text: '20 % Chance, dass ein getroffener Gegner einfriert und seinen nächsten Zug verliert.',
      effekte: [{ id: 'stun_strike', chance: 0.2, name: 'Einfrieren' }],
    },
  },
  {
    id: 'obsidian', routeId: 'obsidian_tunnels', name: 'Obsidianpanzer', zeichen: '🌋', tier: 3,
    teile: [
      { art: 'schild', name: 'Obsidianschild', bild: 'ITEM_WYRM_SCALE_SHIELD', text: 'Scharfkantig. Wer dagegen schlägt, blutet. Wer ihn trägt, auch ein bisschen.' },
      { art: 'platte', name: 'Lavaglasrüstung', bild: 'ITEM_MYSTIC_PLATE_ARMOR', text: 'Geschmolzen, gegossen, abgekühlt. Der Schmied auch.' },
      { art: 'talisman', name: 'Glutstein', bild: 'ITEM_AETHER_HEART', text: 'Warm wie ein Ofen. Praktisch im Winter, lästig im Bett.' },
    ],
    zweiTeile: { def: 3, hp: 8 },
    dreiTeile: {
      name: 'Glutpanzer',
      text: 'Wer den Träger mit einem normalen Angriff trifft, erleidet 8 Feuerschaden.',
      effekte: [{ id: 'glutpanzer', power: 8 }],
    },
  },

  // ── Ebene 4 ──
  {
    id: 'lich', routeId: 'ruins_depths', name: 'Nachlass des Schattenlichs', zeichen: '👑', tier: 4,
    teile: [
      { art: 'stab', name: 'Seelenstab', bild: 'ITEM_CRYSTAL_GOLEM_STAFF', text: 'Jede Kerbe ist eine Seele. Es sind sehr viele Kerben.' },
      { art: 'robe', name: 'Gewand des Lichs', bild: 'ITEM_SPIDER_SILK_ROBE', text: 'Riecht nach Staub und Ewigkeit. Hauptsächlich nach Staub.' },
      { art: 'amulett', name: 'Leeres Phylakterium', bild: 'ITEM_LICH_PHYLACTERY', text: 'Der Lich ist ausgezogen. Die Kaution hat er nicht zurückverlangt.', eigenschaft: 'revive' },
    ],
    zweiTeile: { atk: 4, hp: 12 },
    dreiTeile: {
      name: 'Seelenernte',
      text: 'Stirbt ein Gegner, heilt der Träger das ganze Team um 8 Leben.',
      effekte: [{ id: 'seelenernte', power: 8 }],
    },
  },
  {
    id: 'wyrm', routeId: 'volcano_core', name: 'Glut des Magma-Wyrms', zeichen: '🔥', tier: 4,
    teile: [
      { art: 'klinge', name: 'Wyrmzahnklinge', bild: 'ITEM_ARCANE_BLADE', text: 'Noch warm vom Wyrm. Wird nie ganz kalt. Bitte nicht in die Scheide stecken.' },
      { art: 'platte', name: 'Wyrmschuppenpanzer', bild: 'ITEM_DRAGONLORD_PLATE', text: 'Jede Schuppe hält Lava ab. Zusammen halten sie sogar Ausreden ab.' },
      { art: 'amulett', name: 'Herz der Glut', bild: 'ITEM_AETHER_HEART', text: 'Es schlägt im Takt des Vulkans. Wird es schneller: rennen.' },
    ],
    zweiTeile: { atk: 4, hp: 10 },
    dreiTeile: {
      name: 'Feueratem',
      text: 'Zu Beginn jedes Kampfes speit der Träger Feuer: Alle Gegner erleiden 20 Schaden.',
      effekte: [{ id: 'feueratem', power: 20 }],
    },
  },
  {
    id: 'festung', routeId: 'siege_fortress', name: 'Bollwerk des Festungswächters', zeichen: '🛡️', tier: 4,
    teile: [
      { art: 'schild', name: 'Festungstor', bild: 'ITEM_AETHER_GUARDIAN_SHIELD', text: 'Ein Tor als Schild. Wenn jemand klopft, macht keiner auf.' },
      { art: 'platte', name: 'Bergfried-Harnisch', bild: 'ITEM_DRAGONLORD_PLATE', text: 'Wiegt so viel wie ein kleiner Turm und hält auch so viel aus.' },
      { art: 'talisman', name: 'Schlüsselbund des Wächters', bild: 'ITEM_ARCANE_AMULET', text: 'Siebenundvierzig Schlüssel. Keiner passt. Er trägt sie trotzdem.' },
    ],
    zweiTeile: { def: 4, hp: 15 },
    dreiTeile: {
      name: 'Letzte Bastion',
      text: 'Zu Beginn jedes Kampfes zieht der Träger 2 Runden lang alle Angriffe auf sich. Unter halben Leben hat er +6 Verteidigung.',
      effekte: [{ id: 'letzte_bastion', runden: 2, power: 6 }],
    },
  },
  {
    id: 'abyss', routeId: 'ocean_abyss', name: 'Tiefenrausch', zeichen: '🦑', tier: 4, luftJeTeil: 15,
    teile: [
      { art: 'bogen', name: 'Abgrundbogen', bild: 'ITEM_ETERNAL_HUNTER_BOW', text: 'Schiesst unter Wasser. Über Wasser auch, aber dann ist er nur ein Bogen.' },
      { art: 'leder', name: 'Tiefseeleder', bild: 'ITEM_SHADOWHUNTER_ARMOR', text: 'Gegerbt im Abgrund, wo kein Licht hinkommt. Welche Farbe es hat, weiss niemand.' },
      { art: 'ring', name: 'Abgrundauge', bild: 'ITEM_ARCANE_AMULET', text: 'Ein Auge aus der Tiefe. Es starrt zurück. Länger als du.' },
    ],
    zweiTeile: { atk: 4, critChance: 0.05 },
    dreiTeile: {
      name: 'Tiefenrausch',
      text: 'Unter halben Leben schlägt der Träger mit +8 Angriff zu.',
      effekte: [{ id: 'tiefenrausch', power: 8 }],
    },
  },
  {
    id: 'schatten', routeId: 'shadow_catacombs', name: 'Schattenklinge der Katakomben', zeichen: '🌑', tier: 4,
    teile: [
      { art: 'dolch', name: 'Katakombenstilett', bild: 'ITEM_BLADE_OF_THOUSAND_SHADOWS', text: 'Man hört es nicht kommen. Man hört es auch nicht gehen. Man hört eigentlich gar nichts mehr.' },
      { art: 'leder', name: 'Grabtuchwams', bild: 'ITEM_SHADOWHUNTER_ARMOR', text: 'Aus Grabtüchern genäht. Die Vorbesitzer haben nicht protestiert.' },
      { art: 'ring', name: 'Ring der Stille', bild: 'ITEM_LICH_PHYLACTERY', text: 'Dreh ihn, und alles wird still. Vor allem der Gegner.' },
    ],
    zweiTeile: { atk: 4, spd: 0.1 },
    dreiTeile: {
      name: 'Schattenstoss',
      text: 'Der erste Angriff des Trägers in jedem Kampf trifft garantiert kritisch, mit doppelter Wucht.',
      effekte: [{ id: 'schattenstoss', power: 2 }],
    },
  },
  {
    id: 'asche', routeId: 'ash_wastes', name: 'Aschewanderer', zeichen: '🏜️', tier: 4,
    teile: [
      { art: 'hammer', name: 'Aschehammer', bild: 'ITEM_WAR_HAMMER', text: 'Jeder Schlag wirbelt Asche auf. Danach sieht keiner mehr etwas, am wenigsten der Gegner.' },
      { art: 'robe', name: 'Aschemantel', bild: 'ITEM_MAGIARCH_ROBE', text: 'War einmal weiss. War einmal sauber. War einmal.' },
      { art: 'talisman', name: 'Glühende Kohle', bild: 'ITEM_AETHER_HEART', text: 'Glüht seit drei Wochen. Womit man sie füttert, weiss niemand.', eigenschaft: 'fire_resist' },
    ],
    zweiTeile: { atk: 4, hp: 12 },
    dreiTeile: {
      name: 'Glutherz',
      text: 'Nach jedem Gegner, den der Träger besiegt, hat er bis Kampfende +3 Angriff, höchstens +12.',
      effekte: [{ id: 'glutherz', power: 3, max: 12 }],
    },
  },
  {
    id: 'magma', routeId: 'magma_caverns', name: 'Esse der Magmahöhlen', zeichen: '⚒️', tier: 4,
    teile: [
      { art: 'klinge', name: 'Tropfende Klinge', bild: 'ITEM_SOULBREAKER', text: 'Frisch aus der Esse. Tropft. Bitte Abstand halten, auch zu Freunden.' },
      { art: 'schild', name: 'Ambossschild', bild: 'ITEM_MAGITECH_SHIELD', text: 'Ein Amboss mit Griff. Wer ihn hebt, braucht keinen zweiten Sport.' },
      { art: 'leder', name: 'Schmiedeschürze', bild: 'ITEM_HEAVY_LEATHER_ARMOR', text: 'Feuerfest bis zum Bauchnabel. Darunter: Glückssache.' },
    ],
    zweiTeile: { atk: 3, def: 3 },
    dreiTeile: {
      name: 'Funkenflug',
      text: 'Jeder Treffer des Trägers spritzt auf einen zweiten Gegner: Er erleidet 40 % des Schadens.',
      effekte: [{ id: 'funkenflug', anteil: 0.4 }],
    },
  },

  // ── Über dem Vulkankern ──
  {
    id: 'hort', routeId: 'drachenhort', name: 'Aus Ignarax\' Hort', zeichen: '🐉', tier: 5,
    teile: [
      { art: 'klinge', name: 'Drachenklaue', bild: 'ITEM_SOULBREAKER', text: 'Eine Kralle von Ignarax, umgeschmiedet. Er vermisst sie. Er vermisst alles, was glänzt.' },
      { art: 'platte', name: 'Goldschuppenpanzer', bild: 'ITEM_DRAGONLORD_PLATE', text: 'Mit Münzen geflickt. Jede Münze ist echt, und jede ist gezählt. Von ihm.' },
      { art: 'amulett', name: 'Kleinster Schatz', bild: 'ITEM_AMULET_OF_REBIRTH', text: 'So klein, dass Ignarax es nie vermisst hat. Er sucht es seit dreihundert Jahren.' },
    ],
    zweiTeile: { atk: 5, hp: 15 },
    dreiTeile: {
      name: 'Drachengier',
      text: 'Gold macht stark: +1 Angriff je 50 Gold, das das Team auf dieser Expedition erbeutet hat, höchstens +10. Dazu 20 % mehr Gold.',
      effekte: [{ id: 'drachengier', power: 50, max: 10 }, { id: 'klebrige_finger', power: 0.2, name: 'Drachengier' }],
    },
  },
  {
    id: 'archiv', routeId: 'himmelsarchiv', name: 'Nachlass des Oberarchivars', zeichen: '📖', tier: 6,
    teile: [
      { art: 'stab', name: 'Lesezeichen des Oberarchivars', bild: 'ITEM_WORLDEND_STAFF', text: 'Eigentlich ein Stab. Er benutzt ihn als Lesezeichen. Für sehr dicke Bücher.' },
      { art: 'robe', name: 'Talar der Fussnoten', bild: 'ITEM_MAGIARCH_ROBE', text: 'Über und über mit Fussnoten bestickt. Die Fussnoten haben Fussnoten.' },
      { art: 'amulett', name: 'Siegel der Leihfrist', bild: 'ITEM_ARCANE_AMULET', text: 'Die Leihfrist ist seit vierhundert Jahren abgelaufen. Die Mahngebühr auch.', eigenschaft: 'regen' },
    ],
    zweiTeile: { atk: 6, hp: 20 },
    dreiTeile: {
      name: 'Verbotene Fussnote',
      text: 'Alle 3 Runden liest der Träger eine verbotene Seite vor: Flammen (alle Gegner 30 Schaden), Heilung (Team +12 % Leben) oder Schutz (jeder im Team erhält einen Schild von 20).',
      effekte: [{ id: 'fussnote', runden: 3, power: 30, anteil: 0.12, schild: 20 }],
    },
  },

  // ── Zwischen den Sternen ──
  {
    id: 'stern', routeId: 'sternenschmiede', name: 'Korrunds Meisterstücke', zeichen: '🌟', tier: 7,
    teile: [
      { art: 'klinge', name: 'Sternenstahlklinge', bild: 'ITEM_FALLEN_KNIGHTS_BLADE', text: 'Aus einem Stück Stern, das vom Himmel fiel. Der Rest des Sterns sucht es noch.' },
      { art: 'platte', name: 'Harnisch des Sternenschmieds', bild: 'ITEM_STEEL_ARMOR', text: 'Korrund hat ihn viermal neu geschmiedet. Beim vierten Mal war er zufrieden, beim fünften stolz.' },
      { art: 'talisman', name: 'Glut im Glas', bild: 'ITEM_AETHER_HEART', text: 'Ein Funke aus Korrunds Esse, in Glas gesperrt. Er brennt seit hundert Jahren und will immer noch raus.' },
    ],
    zweiTeile: { atk: 7, hp: 24 },
    dreiTeile: {
      name: 'Schmiedetakt',
      text: 'Alle 3 Runden schlägt der Träger den Takt wie auf dem Amboss: Das ganze Team hat jedes Mal 3 Angriff mehr, bis Kampfende höchstens +9.',
      effekte: [{ id: 'schmiedetakt', power: 3, runden: 3, max: 9 }],
    },
  },
  {
    id: 'schlund', routeId: 'sternenschlund', name: 'Was Nyxar nicht frass', zeichen: '🌌', tier: 8,
    teile: [
      { art: 'bogen', name: 'Sternschnuppenbogen', bild: 'ITEM_FALLEN_HUNTERS_BOW', text: 'Jeder Pfeil zieht einen Schweif hinter sich her. Wer ihn sieht, darf sich etwas wünschen, meistens, dass er nicht gemeint ist.' },
      { art: 'leder', name: 'Mantel der Leere', bild: 'ITEM_SPIDER_SILK_ROBE', text: 'Innen ist er grösser als aussen. Was man hineinsteckt, findet man nie wieder, ein Gegner aber auch nicht.' },
      { art: 'ring', name: 'Ereignisring', bild: 'ITEM_LICH_PHYLACTERY', text: 'Ein Ring aus gebogenem Licht. Was hineinfällt, kommt nicht zurück, nicht einmal die Bemerkung, die man dazu machen wollte.' },
    ],
    zweiTeile: { atk: 8, critChance: 0.08 },
    dreiTeile: {
      name: 'Sternenfall',
      text: 'Jeder dritte Treffer des Trägers holt einen Stern vom Himmel: Er trifft alle Gegner mit der Hälfte des Schadens.',
      effekte: [{ id: 'sternenfall', treffer: 3, anteil: 0.5 }],
    },
  },

  // ── Im Mondlicht (das Schild-Set für die Phalanx) ──
  {
    id: 'pfand', routeId: 'mondhof', name: 'Pfand des Mondvogts', zeichen: '🌙', tier: 9,
    teile: [
      { art: 'schild', name: 'Silberne Zollscheibe', bild: 'ITEM_AETHER_GUARDIAN_SHIELD', text: 'Eine Waagschale des Vogts, umgeschmiedet. Sie wiegt jeden Treffer und gibt das Wechselgeld zurück.' },
      { art: 'platte', name: 'Amtsharnisch des Vogts', bild: 'ITEM_DRAGONLORD_PLATE', text: 'Mit Silber beschlagen, auf jeder Platte ein Siegel. Wer ihn trägt, wird in jedem Hof zuerst bedient und zuletzt getroffen.' },
      { art: 'amulett', name: 'Pfandzettel in Silber', bild: 'ITEM_ARCANE_AMULET', text: 'Darauf steht, was die Gilde dem Mond schuldet. Die Zahl ist sehr lang. Das Amulett ist trotzdem leicht.' },
    ],
    zweiTeile: { def: 9, hp: 30 },
    dreiTeile: {
      name: 'Mondwall',
      text: 'Zu Beginn jedes Kampfes und danach alle 3 Runden erhält jeder im Team einen Schild von 15, der sich auf andere Schilde (Phalanx, Moospolster, Fussnote) dazulegt.',
      effekte: [{ id: 'mondwall', schild: 15, runden: 3 }],
    },
  },
];

// ── Abgeleitete Daten ──

export const SET_TEIL_NAMEN: Record<SetTeilArt, string> = {
  klinge: 'Klinge', dolch: 'Dolch', hammer: 'Hammer', bogen: 'Bogen', stab: 'Stab', schild: 'Schild',
  platte: 'Platte', leder: 'Leder', robe: 'Robe', amulett: 'Amulett', ring: 'Ring', talisman: 'Talisman',
};

/** Gegenstands-ID eines Set-Teils, z. B. set_spinne_dolch */
export function setTeilId(set: DungeonSetDef, teil: SetTeilDef): string {
  return `set_${set.id}_${teil.art}`;
}

function teilWerte(art: SetTeilArt, tier: number): NonNullable<ItemDef['statBonuses']> {
  const i = Math.min(Math.max(tier, 1), HOECHSTE_EBENE) - 1;
  const werte: NonNullable<ItemDef['statBonuses']> = {};
  for (const [stat, reihe] of Object.entries(ART_WERTE[art]) as [keyof typeof werte, Reihe][]) {
    if (reihe[i] !== 0) werte[stat] = reihe[i];
  }
  return werte;
}

/** Alle Set-Teile als Gegenstände (werden in ITEM_DEFS aufgenommen) */
export function setItemDefs(): Record<string, ItemDef> {
  const defs: Record<string, ItemDef> = {};
  for (const set of DUNGEON_SETS) {
    for (const teil of set.teile) {
      const id = setTeilId(set, teil);
      const platz = ART_PLATZ[teil.art];
      const eigenschaft = teilEigenschaft(set, teil);
      defs[id] = {
        id,
        name: teil.name,
        type: 'gear',
        stackSize: 1,
        baseValue: WERT_JE_EBENE[Math.min(set.tier, HOECHSTE_EBENE) - 1],
        spriteKey: teil.bild,
        gearSlot: platz.slot,
        ...(platz.hand ? { weaponSlotType: platz.hand } : {}),
        statBonuses: teilWerte(teil.art, set.tier),
        tags: ['gear', ...platz.tags, 'set', `set:${set.id}`, `tier${set.tier}`, ...(eigenschaft ? [`special:${eigenschaft}`] : [])],
        productionSource: 'expedition_only',
        tier: set.tier,
        flavorText: teil.text,
        ...(set.luftJeTeil ? { airBonus: set.luftJeTeil } : {}),
      };
    }
  }
  return defs;
}

const SET_NACH_ID = new Map(DUNGEON_SETS.map(s => [s.id, s]));
const SET_NACH_ROUTE = new Map(DUNGEON_SETS.map(s => [s.routeId, s]));

export function getSet(setId: string): DungeonSetDef | undefined {
  return SET_NACH_ID.get(setId);
}

/** Das Set, das ein Dungeon fallen lässt */
export function setFuerRoute(routeId: string): DungeonSetDef | undefined {
  return SET_NACH_ROUTE.get(routeId);
}

/** Das Set, zu dem ein Gegenstand gehört (über den Tag set:<id>) */
export function setVonItem(itemId: string | null | undefined): DungeonSetDef | undefined {
  if (!itemId || !itemId.startsWith('set_')) return undefined;
  const rest = itemId.slice(4);
  const setId = rest.slice(0, rest.lastIndexOf('_'));
  return SET_NACH_ID.get(setId);
}

/** Die drei Gegenstands-IDs eines Sets */
export function setTeilIds(set: DungeonSetDef): string[] {
  return set.teile.map(t => setTeilId(set, t));
}

/** Die Bauart eines Set-Teils (set_rudel_klinge → klinge); undefined für andere Gegenstände */
export function teilArtVonItem(itemId: string | null | undefined): SetTeilArt | undefined {
  const set = setVonItem(itemId);
  return set?.teile.find(t => setTeilId(set, t) === itemId)?.art;
}

const STAT_NAMEN: [keyof SetWerte, string, (v: number) => string][] = [
  ['atk', 'Angriff', v => `+${v}`],
  ['def', 'Verteidigung', v => `+${v}`],
  ['hp', 'Leben', v => `+${v}`],
  ['spd', 'Tempo', v => `${v > 0 ? '+' : ''}${v}`],
  ['critChance', 'Krit-Chance', v => `+${Math.round(v * 100)} %`],
  ['critMult', 'Krit-Schaden', v => `+${Math.round(v * 100)} %`],
];

/** «+2 Angriff, +6 Leben» */
export function setWerteText(werte: SetWerte): string {
  return STAT_NAMEN
    .filter(([k]) => werte[k] !== undefined && werte[k] !== 0)
    .map(([k, name, fmt]) => `${fmt(werte[k] as number)} ${name}`)
    .join(', ');
}
