import { FighterStats } from '../models/GuildRoster';

export interface ClassDef {
  id: string;
  name: string;
  role: 'tank' | 'dps' | 'healer' | 'support';
  baseStats: FighterStats;
  skills: ClassSkillDef[];
  spriteKey: string;
  background: string;
  preferredWeaponSetup?: { mainHand: string; offHand: string | null };
}

export interface ClassSkillDef {
  id: string;
  name: string;
  cooldown: number;     // rounds
  effectType: 'damage' | 'heal' | 'taunt' | 'buff' | 'aoe' | 'summon';
  power: number;        // multiplier or flat amount
  target: 'enemy' | 'ally_lowest_hp' | 'self' | 'all_enemies';
  skillType?: 'melee' | 'ranged' | 'heal' | 'support' | 'self_buff' | 'debuff' | 'magic' | 'summon';
  description: string;
}

export const CLASS_DEFS: Record<string, ClassDef> = {
  guardian: {
    id: 'guardian',
    name: 'Guardian',
    role: 'tank',
    baseStats: {
      hp: 25, maxHp: 25,
      atk: 3, def: 2, spd: 0.8,
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
        skillType: 'melee',
        description: 'Rammt den massiven Stahl-Schild mit voller Wucht in den Gegner, verursacht physischen Schaden und bringt ihn ins Taumeln.',
      },
      {
        id: 'taunt',
        name: 'Spott',
        cooldown: 4,
        effectType: 'taunt',
        power: 2,          // rounds of taunt
        target: 'self',
        skillType: 'support',
        description: 'Aktiviert eine laute, grelle Sirene an seiner Rüstung, die alle Feinde zwingt, ihre Angriffe in der nächsten Runde auf ihn zu konzentrieren.',
      },
    ],
    spriteKey: 'HERO_GUARDIAN',
    background: 'Er war Hauptmann der Stadtgarde. Einer Stadt, die es nicht mehr gibt. Als der Kollaps kam, blieb er als letzter auf dem Schiff stehen und zählte die Köpfe, bis kein Platz mehr war. Auf Valdris hat er keine Befehlskette mehr über sich. Das ist schwerer zu tragen als sein Schild.\n\nMotivation: Er schützt. Das ist das Einzige, das er noch weiß. Wofür genau, das fragt er sich nachts.',
    preferredWeaponSetup: { mainHand: '1h', offHand: 'shield' },
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    role: 'dps',
    baseStats: {
      hp: 21, maxHp: 21,
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
        skillType: 'ranged',
        description: 'Spannt den Bogen bis zum Äußersten und feuert einen panzerbrechenden Pfeil direkt in die Schwachstelle des Ziels.',
      },
      {
        id: 'volley',
        name: 'Pfeilhagel',
        cooldown: 5,
        effectType: 'damage',
        power: 0.6,
        target: 'all_enemies',
        skillType: 'ranged',
        description: 'Schießt ein Bündel von Leuchtspur-Pfeilen in die Luft, die als tödlicher Regen auf alle feindlichen Positionen niederprasseln.',
      },
    ],
    spriteKey: 'HERO_RANGER',
    background: 'Sie kannte keine Städte. Nur den Wald, den Horizont, den nächsten Morgen. Als Kundschafterin überlebte sie Situationen, die ganze Patrouillen das Leben kosteten, und sprach danach nie darüber. Valdris ist für sie kein Exil, kein Neuanfang. Nur ein neues Terrain.\n\nMotivation: Neugier. Sie will wissen, was im Inneren der Dungeons wartet. Nicht aus Pflicht, sondern aus echtem, ruhigem Interesse.',
    preferredWeaponSetup: { mainHand: '2h', offHand: null },
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    role: 'healer',
    baseStats: {
      hp: 19, maxHp: 19,
      atk: 2, def: 1.5, spd: 0.9,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'heal',
        name: 'Heilung',
        cooldown: 3,
        effectType: 'heal',
        power: 36,
        target: 'ally_lowest_hp',
        skillType: 'heal',
        description: 'Injiziert einen Schwarm medizinischer Nanobots, der Wunden in Sekundenschnelle schließt und Lebenspunkte wiederherstellt.',
      },
      {
        id: 'blessing',
        name: 'Segen',
        cooldown: 5,
        effectType: 'buff',
        power: 2,           // +2 ATK for 3 rounds
        target: 'self',
        skillType: 'support',
        description: 'Spricht ein uraltes Schutz-Protokoll, das die Abwehrkräfte eines Verbündeten temporär stärkt und leichten passiven Schutz gewährt.',
      },
    ],
    spriteKey: 'HERO_CLERIC',
    background: 'Er diente einem Gott, dessen Tempel jetzt Asche ist. Ob dieser Gott noch antwortet, testet er jeden Morgen. Bisher: ja. Er heilt die anderen, weil jemand es tun muss, und weil er nicht weiß, was er sonst wäre.\n\nMotivation: Er sucht keine Antworten mehr. Er sucht Menschen, die er am Leben halten kann. Das ist genug.',
  },

  // ── Batch 3: 7 neue Klassen ──────────────────────────────────

  berserker: {
    id: 'berserker',
    name: 'Berserker',
    role: 'dps',
    baseStats: {
      hp: 84, maxHp: 84,
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
        skillType: 'self_buff',
        description: 'Verfällt in einen blinden Rausch und entfesselt eine Serie von verheerenden, wilden Hieben auf das Ziel.',
      },
      {
        id: 'adrenaline_rush',
        name: 'Adrenalin-Schub',
        cooldown: 4,
        effectType: 'buff',
        power: 4,            // +4 ATK for 3 rounds, costs HP
        target: 'self',
        skillType: 'self_buff',
        description: 'Ignoriert den eigenen Schmerz für pure Zerstörungskraft. Opfert eigene HP, um den Schaden für 3 Runden massiv zu erhöhen.',
      },
    ],
    spriteKey: 'HERO_BERSERKER',
    background: 'Sein Dorf war das erste, das fiel. Er war der einzige, der danach noch stand. Nicht weil er der Stärkste war, sondern weil Schmerz ihn weitertreibt, wenn Vernunft aufhört. Im Lager ist er still, fast scheu. Im Kampf ist er etwas anderes.\n\nMotivation: Er sucht nicht Vergeltung. Er sucht das Ende. Ob das sein eigenes oder das der Dungeons ist, weiß er nicht, und er denkt nicht zu lang darüber nach.',
    preferredWeaponSetup: { mainHand: '1h', offHand: '1h' },
  },
  assassin: {
    id: 'assassin',
    name: 'Assassine',
    role: 'dps',
    baseStats: {
      hp: 54, maxHp: 54,
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
        skillType: 'melee',
        description: 'Ein blitzschneller, gnadenloser Stoß in eine vitale Leitung, der bei geschwächten Feinden kritischen Schaden verursacht.',
      },
      {
        id: 'shadow_step',
        name: 'Schattensprung',
        cooldown: 3,
        effectType: 'damage',
        power: 2.0,          // 2.0x damage, ignores DEF
        target: 'enemy',
        skillType: 'melee',
        description: 'Aktiviert kurz das optische Tarnmodul, taucht hinter dem Gegner auf und umgeht dessen Rüstungswerte vollständig.',
      },
    ],
    spriteKey: 'HERO_ASSASSIN',
    background: 'Ihre Identität ist eine Erfindung. Eine von vielen, die sie durch die Jahre getragen hat. Sie sagt, sie arbeitete früher für niemanden. Das stimmt nicht, ist aber besser als die Wahrheit. Auf Valdris verfolgt sie keine Aufträge. Ob das von Dauer ist, entscheidet sie noch.\n\nMotivation: Für sich selbst kämpfen, das ist neu für sie. Sie testet, wie es sich anfühlt.',
    preferredWeaponSetup: { mainHand: '1h', offHand: '1h' },
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    role: 'tank',
    baseStats: {
      hp: 40, maxHp: 40,
      atk: 4, def: 2.5, spd: 0.9,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'holy_shield',
        name: 'Heiliger Schild',
        cooldown: 3,
        effectType: 'heal',
        power: 18,            // heals lowest HP ally for 18
        target: 'ally_lowest_hp',
        skillType: 'support',
        description: 'Überlädt seinen Plasma-Generator, um einen massiven Energieschild vor sich aufzubauen, der eintreffenden Schaden absorbiert.',
      },
      {
        id: 'divine_guard',
        name: 'Göttlicher Schutz',
        cooldown: 4,
        effectType: 'taunt',
        power: 2,            // 2 rounds of taunt
        target: 'self',
        skillType: 'support',
        description: 'Hüllt die gesamte Gruppe in eine schützende Licht-Aura, die den erlittenen Gruppenschaden für eine Runde drastisch senkt.',
      },
    ],
    spriteKey: 'HERO_PALADIN',
    background: 'Einst Ritter einer Heiligen Ordnung, die er für gerecht hielt. Er zog in Kriege, die ihm heute falsch erscheinen. Er trägt seine Rüstung noch, aber schwerer als früher. Jeder Sieg auf Valdris ist ein kleines Gegengewicht zu dem, was er nicht ungeschehen machen kann.\n\nMotivation: Buße. Kein Selbstmitleid, echtes, stilles Gutmachen. Einen Verletzten mehr tragen als nötig. Einen Schild mehr hochhalten als befohlen.',
    preferredWeaponSetup: { mainHand: '1h', offHand: 'shield' },
  },
  bard: {
    id: 'bard',
    name: 'Barde',
    role: 'support',
    baseStats: {
      hp: 60, maxHp: 60,
      atk: 3, def: 1, spd: 1.1,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'warsong',
        name: 'Kriegslied',
        cooldown: 6,
        effectType: 'buff',
        power: 3,            // +3 ATK for 3 rounds (self for now)
        target: 'self',
        skillType: 'support',
        description: 'Spielt eine aggressive, pumpende Bassfrequenz, die das Adrenalin der Verbündeten ansteigen lässt und ihre Angriffskraft erhöht.',
      },
      {
        id: 'sonic_disruptor',
        name: 'Schall-Störsender',
        cooldown: 4,
        effectType: 'aoe',
        power: 0.5,          // 0.5x damage to all enemies + debuff
        target: 'all_enemies',
        skillType: 'debuff',
        description: 'Sendet ein schrilles Pfeifen aus, das die Sensoren der Feinde stört und ihre Genauigkeit sowie Geschwindigkeit senkt.',
      },
    ],
    spriteKey: 'HERO_BARD',
    background: 'Sie hat mehr Schlachten überlebt als die meisten Soldaten. Nicht durch Stärke, sondern durch die Kunst, die richtigen Worte zur richtigen Zeit zu finden. Ihre Lieder heben Moral, ihr Gedächtnis bewahrt die Namen der Gefallenen, ihr Lächeln überzeugt Leute, die eigentlich nein sagen wollten.\n\nMotivation: Sie schreibt eine Chronik. Valdris soll nicht vergessen werden wie alles andere. Dafür muss sie überleben, und dafür sorgen, dass die anderen das auch tun.',
  },
  witch: {
    id: 'witch',
    name: 'Hexe',
    role: 'dps',
    baseStats: {
      hp: 57, maxHp: 57,
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
        skillType: 'magic',
        description: 'Entfesselt einen knisternden Strom aus purer Elektrizität, der vom Hauptziel unkontrolliert auf benachbarte Feinde überspringt.',
      },
      {
        id: 'energy_drain',
        name: 'Energie-Sog',
        cooldown: 3,
        effectType: 'damage',
        power: 1.3,          // 1.3x damage + slow
        target: 'enemy',
        skillType: 'debuff',
        description: 'Zieht kinetische Energie aus dem Ziel ab, verursacht moderaten Schaden und verlangsamt den Feind für 2 Runden.',
      },
    ],
    spriteKey: 'HERO_WITCH',
    background: 'Die Alten nannten es Wildmagie. Die Gelehrten nannten es Anomalie. Das Volk nannte es Fluch. Sie nennt es Werkzeug. Aus drei Städten vertrieben, von zwei Orden gesucht. Auf Valdris ist sie das erste Mal irgendwo, wo niemand ihre Vergangenheit kennt.\n\nMotivation: Ruhe. Kein Orden, keine Mob, kein Ausweichen mehr. Sie ist fertig damit, wegzulaufen. Jetzt kämpft sie.',
    preferredWeaponSetup: { mainHand: '2h', offHand: null },
  },
  necromancer: {
    id: 'necromancer',
    name: 'Nekromant',
    role: 'dps',
    baseStats: {
      hp: 60, maxHp: 60,
      atk: 4, def: 1, spd: 1.0,
      critChance: 0.05, critMult: 1.5,
    },
    skills: [
      {
        id: 'raise_skeleton',
        name: 'Skelett beschwören',
        cooldown: 5,
        effectType: 'summon',
        power: 3,            // +3 ATK as summon-buff
        target: 'self',
        skillType: 'summon',
        description: 'Führt einen Re-Boot an einem Haufen metallischer Knochen durch und zwingt den so erschaffenen Diener, für ihn zu kämpfen.',
      },
      {
        id: 'toxic_cloud',
        name: 'Toxische Wolke',
        cooldown: 4,
        effectType: 'aoe',
        power: 0.8,          // 0.8x damage to all enemies over time
        target: 'all_enemies',
        skillType: 'magic',
        description: 'Lässt ätzendes Kühlmittel verdampfen, das alle Feinde vergiftet und ihnen über mehrere Runden Schaden zufügt.',
      },
    ],
    spriteKey: 'HERO_NECROMANCER',
    background: 'Er studierte den Tod, lange bevor der Tod so nah kam. Was die anderen als Schrecken sehen, ist für ihn Fachgebiet. Die Untoten, die er beschwört, betrachtet er nicht als Diener. Er nennt sie Kollegen. Das klingt wie ein Witz. Meistens ist es keiner.\n\nMotivation: Akademischer Ehrgeiz. Die Dungeons enthalten Wesen und Mechanismen, die er nie zuvor gesehen hat. Das allein reicht ihm als Grund.',
  },
  druid: {
    id: 'druid',
    name: 'Druide',
    role: 'healer',
    baseStats: {
      hp: 75, maxHp: 75,
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
        skillType: 'support',
        description: 'Verändert die eigene molekulare Struktur, um temporär die widerstandsfähige Haut eines Baum-Mutanten anzunehmen.',
      },
      {
        id: 'regrowth',
        name: 'Nachwachsen',
        cooldown: 4,
        effectType: 'heal',
        power: 24,            // heals lowest HP ally for 24
        target: 'ally_lowest_hp',
        skillType: 'heal',
        description: 'Sät schnellwachsende, heilende Sporen auf einen Verbündeten, die dessen Lebenspunkte über 3 Runden hinweg kontinuierlich regenerieren.',
      },
    ],
    spriteKey: 'HERO_DRUID',
    background: 'Sie kam nicht mit dem Schiff. Sie war bereits hier, als die anderen landeten. Saß auf einem Fels, aß Beeren, beobachtete. Wie lange sie schon da war, sagt sie nicht. Valdris\' Natur kennt sie besser als jeder andere. Die Neuankömmlinge waren zunächst Störung, dann Notwendigkeit, dann langsam etwas wie Begleitung.\n\nMotivation: Die Insel schützen. Die Menschen sind Teil davon geworden, ob sie will oder nicht.',
  },
};
