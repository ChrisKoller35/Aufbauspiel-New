import { FighterStats } from '../models/GuildRoster';

export interface ClassDef {
  id: string;
  name: string;
  role: 'tank' | 'dps' | 'healer' | 'support';
  baseStats: FighterStats;
  skills: ClassSkillDef[];
  spriteKey: string;
}

export interface ClassSkillDef {
  id: string;
  name: string;
  cooldown: number;     // rounds
  effectType: 'damage' | 'heal' | 'taunt' | 'buff' | 'aoe' | 'summon';
  power: number;        // multiplier or flat amount
  target: 'enemy' | 'ally_lowest_hp' | 'self' | 'all_enemies';
}

export const CLASS_DEFS: Record<string, ClassDef> = {
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    role: 'tank',
    baseStats: {
      hp: 35, maxHp: 35,
      atk: 3, def: 5, spd: 0.8,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'shield_bash',
        name: 'Schildschlag',
        cooldown: 3,
        effectType: 'damage',
        power: 1.5,
        target: 'enemy',
      },
      {
        id: 'taunt',
        name: 'Spott',
        cooldown: 4,
        effectType: 'taunt',
        power: 2,          // rounds of taunt
        target: 'self',
      },
    ],
    spriteKey: 'HERO_GUARDIAN',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    role: 'dps',
    baseStats: {
      hp: 22, maxHp: 22,
      atk: 7, def: 1, spd: 1.2,
      critChance: 0.15, critMult: 2.0,
    },
    skills: [
      {
        id: 'precise_shot',
        name: 'Präzisionsschuss',
        cooldown: 3,
        effectType: 'damage',
        power: 2.0,
        target: 'enemy',
      },
      {
        id: 'volley',
        name: 'Pfeilhagel',
        cooldown: 5,
        effectType: 'damage',
        power: 0.6,
        target: 'all_enemies',
      },
    ],
    spriteKey: 'HERO_RANGER',
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    role: 'healer',
    baseStats: {
      hp: 29, maxHp: 29,
      atk: 2, def: 3, spd: 0.9,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'heal',
        name: 'Heilung',
        cooldown: 3,
        effectType: 'heal',
        power: 12,
        target: 'ally_lowest_hp',
      },
      {
        id: 'blessing',
        name: 'Segen',
        cooldown: 5,
        effectType: 'buff',
        power: 2,           // +2 ATK for 3 rounds
        target: 'self',
      },
    ],
    spriteKey: 'HERO_CLERIC',
  },

  // ── Batch 3: 7 neue Klassen ──────────────────────────────────

  berserker: {
    id: 'berserker',
    name: 'Berserker',
    role: 'dps',
    baseStats: {
      hp: 28, maxHp: 28,
      atk: 7, def: 2, spd: 1.1,
      critChance: 0.12, critMult: 1.8,
    },
    skills: [
      {
        id: 'rage',
        name: 'Raserei',
        cooldown: 4,
        effectType: 'buff',
        power: 3,            // +3 ATK for 3 rounds
        target: 'self',
      },
    ],
    spriteKey: 'HERO_BERSERKER',
  },
  assassin: {
    id: 'assassin',
    name: 'Assassine',
    role: 'dps',
    baseStats: {
      hp: 18, maxHp: 18,
      atk: 8, def: 0, spd: 1.4,
      critChance: 0.20, critMult: 2.0,
    },
    skills: [
      {
        id: 'execute',
        name: 'Hinrichten',
        cooldown: 4,
        effectType: 'damage',
        power: 2.5,          // 2.5x single target damage
        target: 'enemy',
      },
    ],
    spriteKey: 'HERO_ASSASSIN',
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    role: 'tank',
    baseStats: {
      hp: 32, maxHp: 32,
      atk: 4, def: 4, spd: 0.9,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'holy_shield',
        name: 'Heiliger Schild',
        cooldown: 3,
        effectType: 'heal',
        power: 6,            // heals lowest HP ally for 6
        target: 'ally_lowest_hp',
      },
      {
        id: 'divine_guard',
        name: 'Goettlicher Schutz',
        cooldown: 4,
        effectType: 'taunt',
        power: 2,            // 2 rounds of taunt
        target: 'self',
      },
    ],
    spriteKey: 'HERO_PALADIN',
  },
  bard: {
    id: 'bard',
    name: 'Barde',
    role: 'support',
    baseStats: {
      hp: 20, maxHp: 20,
      atk: 3, def: 1, spd: 1.1,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'warsong',
        name: 'Kriegslied',
        cooldown: 3,
        effectType: 'buff',
        power: 3,            // +3 ATK for 3 rounds (self for now)
        target: 'self',
      },
    ],
    spriteKey: 'HERO_BARD',
  },
  witch: {
    id: 'witch',
    name: 'Hexe',
    role: 'dps',
    baseStats: {
      hp: 19, maxHp: 19,
      atk: 5, def: 0, spd: 1.2,
      critChance: 0.08, critMult: 1.6,
    },
    skills: [
      {
        id: 'chain_lightning',
        name: 'Kettenblitz',
        cooldown: 3,
        effectType: 'aoe',
        power: 1.1,          // 1.1x damage to ALL enemies
        target: 'all_enemies',
      },
    ],
    spriteKey: 'HERO_WITCH',
  },
  necromancer: {
    id: 'necromancer',
    name: 'Nekromant',
    role: 'dps',
    baseStats: {
      hp: 20, maxHp: 20,
      atk: 4, def: 1, spd: 1.0,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'raise_skeleton',
        name: 'Skelett beschwoeren',
        cooldown: 5,
        effectType: 'summon',
        power: 3,            // +3 ATK as summon-buff
        target: 'self',
      },
    ],
    spriteKey: 'HERO_NECROMANCER',
  },
  druid: {
    id: 'druid',
    name: 'Druide',
    role: 'healer',
    baseStats: {
      hp: 25, maxHp: 25,
      atk: 4, def: 2, spd: 1.0,
      critChance: 0.06, critMult: 1.5,
    },
    skills: [
      {
        id: 'nature_shift',
        name: 'Naturwandel',
        cooldown: 3,
        effectType: 'buff',
        power: 3,            // +3 ATK for 3 rounds (bear form)
        target: 'self',
      },
      {
        id: 'regrowth',
        name: 'Nachwachsen',
        cooldown: 4,
        effectType: 'heal',
        power: 8,            // heals lowest HP ally for 8
        target: 'ally_lowest_hp',
      },
    ],
    spriteKey: 'HERO_DRUID',
  },
};
