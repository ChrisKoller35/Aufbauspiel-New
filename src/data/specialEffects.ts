/**
 * Special-Effect Definitionen fuer T3/T4 Gear und die Set-Faehigkeiten der Dungeon-Sets.
 * Gegenstaende aktivieren einen Effekt ueber den 'special:*' Tag im ItemDef,
 * Sets ueber ihre Set-Faehigkeit (data/dungeonSets.ts) mit eigenen Werten.
 * Die Wirkung steht in systems/CombatEngine.ts und systems/Kampfeffekte.ts.
 */

export type SpecialTrigger =
  | 'on_deal_damage' | 'on_take_damage' | 'on_round_end' | 'on_death' | 'on_skill_use'
  | 'on_expedition_start' | 'on_combat_start' | 'on_kill' | 'on_enemy_death' | 'passive';

export interface SpecialEffectDef {
  id: string;
  name: string;          // Deutscher Anzeigename
  description: string;   // Deutsche Kurzbeschreibung
  trigger: SpecialTrigger;
  /** Proc-Chance (0-1). 1.0 = immer */
  procChance: number;
  /** Effekt-Staerke (Interpretation abhaengig vom Typ) */
  power: number;
}

export const SPECIAL_EFFECT_DEFS: Record<string, SpecialEffectDef> = {
  lifesteal: {
    id: 'lifesteal',
    name: 'Lebensraub',
    description: 'Heilt 25 % des verursachten Schadens',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.25,
  },
  dodge: {
    id: 'dodge',
    name: 'Ausweichen',
    description: '15 % Chance, einem Angriff auszuweichen',
    trigger: 'on_take_damage',
    procChance: 0.15,
    power: 1.0, // 100% damage reduction on proc
  },
  reflect: {
    id: 'reflect',
    name: 'Reflexion',
    description: 'Wirft 20 % des erlittenen Schadens auf den Angreifer zurück',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.20,
  },
  revive: {
    id: 'revive',
    name: 'Wiedergeburt',
    description: 'Steht einmal pro Expedition mit 30 % Leben wieder auf',
    trigger: 'on_death',
    procChance: 1.0,
    power: 0.30, // 30% maxHp restored
  },
  double_strike: {
    id: 'double_strike',
    name: 'Doppelschlag',
    description: '30 % Chance auf einen zweiten Angriff',
    trigger: 'on_deal_damage',
    procChance: 0.30,
    power: 1.0, // full damage on second strike
  },
  anti_heal: {
    id: 'anti_heal',
    name: 'Wundfluch',
    description: 'Getroffene Gegner heilen sich nur halb so stark',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.50,
  },
  regen: {
    id: 'regen',
    name: 'Regeneration',
    description: 'Heilt 9 Leben pro Runde',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 9,
  },
  aoe_resist: {
    id: 'aoe_resist',
    name: 'Flächenschutz',
    description: 'Angriffe auf alle Helden machen 30 % weniger Schaden',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.30,
  },
  spell_power: {
    id: 'spell_power',
    name: 'Zaubermacht',
    description: 'Fähigkeiten machen 25 % mehr Schaden',
    trigger: 'on_skill_use',
    procChance: 1.0,
    power: 0.25,
  },
  fire_resist: {
    id: 'fire_resist',
    name: 'Feuerresistenz',
    description: 'Fallen, Lava und Glut machen 30 % weniger Schaden',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 0.30,
  },
  stun_strike: {
    id: 'stun_strike',
    name: 'Erschütterungsschlag',
    description: '25 % Chance pro Treffer: Der Gegner setzt seinen nächsten Zug aus (Bosse: halbe Chance)',
    trigger: 'on_deal_damage',
    procChance: 0.25,
    power: 1.0,
  },

  // ── Set-Fähigkeiten (data/dungeonSets.ts); die Werte hier gelten, wenn ein Set keine eigenen nennt ──
  rudelgeheul: {
    id: 'rudelgeheul',
    name: 'Rudelgeheul',
    description: 'Zu Beginn jedes Kampfes: Das ganze Team hat 3 Runden lang +2 Angriff',
    trigger: 'on_combat_start',
    procChance: 1.0,
    power: 2,
  },
  moospolster: {
    id: 'moospolster',
    name: 'Moospolster',
    description: 'Zu Beginn jedes Kampfes ein Schild, der 12 Schaden schluckt',
    trigger: 'on_combat_start',
    procChance: 1.0,
    power: 12,
  },
  giftbiss: {
    id: 'giftbiss',
    name: 'Giftbiss',
    description: 'Jeder Treffer vergiftet: 4 Schaden pro Runde, 3 Runden lang',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 4,
  },
  klebrige_finger: {
    id: 'klebrige_finger',
    name: 'Klebrige Finger',
    description: 'Mehr Gold aus besiegten Gegnern (zusammen höchstens doppelt so viel)',
    trigger: 'passive',
    procChance: 1.0,
    power: 0.3,
  },
  gezeitenwelle: {
    id: 'gezeitenwelle',
    name: 'Gezeitenwelle',
    description: 'Alle 3 Runden heilt der verletzteste Verbündete 15 % seiner Leben',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 0.15,
  },
  schildwall: {
    id: 'schildwall',
    name: 'Schildwall',
    description: 'Das ganze Team hat auf der Expedition +3 Verteidigung (mehrere Schildwälle zählen nicht doppelt)',
    trigger: 'on_expedition_start',
    procChance: 1.0,
    power: 3,
  },
  druckwelle: {
    id: 'druckwelle',
    name: 'Druckwelle',
    description: 'Alle 4 Runden trifft der Träger alle Gegner mit 60 % seines Schadens',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 0.6,
  },
  kristallschliff: {
    id: 'kristallschliff',
    name: 'Kristallschliff',
    description: 'Mehr Krit-Chance und Krit-Schaden',
    trigger: 'passive',
    procChance: 1.0,
    power: 0,
  },
  glutpanzer: {
    id: 'glutpanzer',
    name: 'Glutpanzer',
    description: 'Wer den Träger mit einem Grundangriff trifft, erleidet 8 Feuerschaden',
    trigger: 'on_take_damage',
    procChance: 1.0,
    power: 8,
  },
  seelenernte: {
    id: 'seelenernte',
    name: 'Seelenernte',
    description: 'Stirbt ein Gegner, heilt das ganze Team 8 Leben',
    trigger: 'on_enemy_death',
    procChance: 1.0,
    power: 8,
  },
  feueratem: {
    id: 'feueratem',
    name: 'Feueratem',
    description: 'Zu Beginn jedes Kampfes erleiden alle Gegner 20 Schaden',
    trigger: 'on_combat_start',
    procChance: 1.0,
    power: 20,
  },
  letzte_bastion: {
    id: 'letzte_bastion',
    name: 'Letzte Bastion',
    description: 'Zieht zu Beginn jedes Kampfes 2 Runden lang alle Angriffe auf sich; unter halben Leben +6 Verteidigung',
    trigger: 'on_combat_start',
    procChance: 1.0,
    power: 6,
  },
  tiefenrausch: {
    id: 'tiefenrausch',
    name: 'Tiefenrausch',
    description: 'Unter halben Leben +8 Angriff',
    trigger: 'passive',
    procChance: 1.0,
    power: 8,
  },
  schattenstoss: {
    id: 'schattenstoss',
    name: 'Schattenstoss',
    description: 'Der erste Treffer jedes Kampfes macht doppelten Schaden',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 2,
  },
  glutherz: {
    id: 'glutherz',
    name: 'Glutherz',
    description: 'Jeder eigene Sieg über einen Gegner gibt +3 Angriff bis Kampfende (höchstens +12)',
    trigger: 'on_kill',
    procChance: 1.0,
    power: 3,
  },
  funkenflug: {
    id: 'funkenflug',
    name: 'Funkenflug',
    description: 'Jeder Treffer springt auf einen zweiten Gegner über (40 % des Schadens)',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.4,
  },
  drachengier: {
    id: 'drachengier',
    name: 'Drachengier',
    description: '+1 Angriff je 50 Gold im Gepäck (höchstens +10) und mehr Gold aus Kämpfen',
    trigger: 'on_combat_start',
    procChance: 1.0,
    power: 50,
  },
  fussnote: {
    id: 'fussnote',
    name: 'Verbotene Fussnote',
    description: 'Alle 3 Runden eine zufällige Seite: Flammen, Heilung oder Schutz',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 30,
  },
  schmiedetakt: {
    id: 'schmiedetakt',
    name: 'Schmiedetakt',
    description: 'Alle 3 Runden hat das ganze Team 3 Angriff mehr, bis Kampfende höchstens +9',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 3,
  },
  sternenfall: {
    id: 'sternenfall',
    name: 'Sternenfall',
    description: 'Jeder dritte Treffer trifft als Stern alle Gegner mit der Hälfte des Schadens',
    trigger: 'on_deal_damage',
    procChance: 1.0,
    power: 0.5,
  },
  mondwall: {
    id: 'mondwall',
    name: 'Mondwall',
    description: 'Zu Beginn jedes Kampfes und alle 3 Runden erhält jeder im Team einen Schild von 15, zusätzlich zu anderen Schilden',
    trigger: 'on_round_end',
    procChance: 1.0,
    power: 15,
  },
};

/** Extract special effect IDs from an item's tags array */
export function extractSpecialTags(tags: string[]): string[] {
  return tags
    .filter(t => t.startsWith('special:'))
    .map(t => t.replace('special:', ''));
}

/** Die Eigenschaften eines Gegenstands, die im Kampf wirken (Tags ohne Definition zählen nicht) */
export function itemEigenschaften(tags: string[]): SpecialEffectDef[] {
  return extractSpecialTags(tags)
    .map(id => SPECIAL_EFFECT_DEFS[id])
    .filter((d): d is SpecialEffectDef => !!d);
}
