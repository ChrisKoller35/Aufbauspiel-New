import type { Wirkung } from '../data/dungeonGeschichten';

export type EncounterType = 'combat' | 'rest' | 'hazard' | 'boss' | 'checkpoint' | 'find' | 'merchant' | 'survivor' | 'fortification';

/** Eine wählbare Option in einem Begegnungs-Dialog */
export interface EncounterChoice {
  label: string;
  flavorText: string;
  /**
   * 'geschichte': Entscheidung der Dungeon-Geschichte, sie wirkt über `wirkung` (systems/Geschichten.ts).
   * 'angriff': Die Gruppe hat bis zum Ende des Dungeons `value` Prozent mehr Angriff (Sternenfeuer).
   * 'kein': Die Option wirkt nur über Preis, Gier und Zusage (gefangene Sterne, Pfandbuch).
   */
  effect: 'heal' | 'gold' | 'item' | 'xp' | 'risky_heal' | 'geschichte' | 'angriff' | 'kein';
  /** Stärke des Effekts (Prozent, Goldmenge oder XP-Betrag, je nach effect) */
  value: number;
  /** Optionaler Item-Key für effect='item' */
  itemId?: string;
  /**
   * Die Beute (effect 'item') kommt erst, wenn der Boss fällt (Sternenschlund: ausgeschlachtete Sterne).
   * Bis dahin wartet sie in `geschichtsBeute`; wer vorher umkehrt oder fällt, lässt sie liegen.
   */
  nachSieg?: boolean;
  /** Hort-Gier: so viele Punkte kommen dazu, wenn diese Option gewählt wird (RouteDef.hortGier); weniger als 0 schwächt den Boss */
  gier?: number;
  /** Preis der Option: jeder lebende Held verliert so viel Prozent seiner max. HP (nie unter 1) */
  kostetLeben?: number;
  /**
   * Preis der Option in Angriff (Pfandzettel): Die Gruppe schlägt bis zum Ende des Dungeons so viel
   * Prozent schwächer zu, wie das Sternenfeuer nur nach unten (gruppenAngriff); flache Boni bleiben.
   */
  kostetAngriff?: number;
  /** Zusage eines Set-Teils mehr, wenn der Boss fällt (wie `setTeil` in den Geschichten); nur in einem Raum je Dungeon */
  setTeil?: true;
  /**
   * Preis der Option in Geduld (Sonnenuhr): Die Wut-Runde des Bosses kommt so viele Runden früher,
   * nie vor Runde 1 (ExpeditionRun.bossWutFrueher). Jeder Boss wütet (CombatEngine: Vorgabe Runde 8, eigener Wert in `enrage`).
   */
  bossWutFrueher?: number;
  /** Geschichte: was die Option bewirkt */
  wirkung?: Wirkung[];
  /** Geschichte: der Satz dazu im Bericht nach der Expedition */
  nachklang?: string;
}

/** Zustand einer Befestigungsanlage (Mauer, Tor, Turm, Bergfried) */
export interface FortificationState {
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  spriteKey: string;
}

export interface EncounterRoom {
  index: number;
  type: EncounterType;
  enemies: CombatUnit[];
  healPercent: number;
  hazardDamage: number;
  completed: boolean;
  findGold?: number;
  findItems?: { itemId: string; qty: number }[];
  /** Wählbare Optionen (für find/rest Räume – Feature #11) */
  encounterChoices?: { optionA: EncounterChoice; optionB: EncounterChoice };
  /** Belagerungsraum: die zu zerstörende Befestigung */
  fortification?: FortificationState;
}

export interface SpecialEffect {
  id: string;           // z.B. 'lifesteal', 'dodge', 'reflect'
  usesLeft: number;     // -1 = unbegrenzt, 0 = verbraucht
  // Werte für diesen Träger; fehlen sie, gelten power/procChance aus SPECIAL_EFFECT_DEFS
  power?: number;
  chance?: number;
  /** Dauer oder Abstand in Runden (Gift, Gezeitenwelle, Spott …) */
  runden?: number;
  /** Höchstwert (Glutherz, Drachengier, Schmiedetakt) */
  max?: number;
  /** Jeder wievielte Treffer des Trägers (Sternenfall) */
  treffer?: number;
  /** Anteil an Schaden oder Leben (Druckwelle, Gezeitenwelle …) */
  anteil?: number;
  /** Schild je Teammitglied (Verbotene Fussnote) */
  schild?: number;
  /** Anzeigename im Kampf, z. B. der Name der Set-Fähigkeit */
  name?: string;
  /** Kommt aus diesem Dungeon-Set (data/dungeonSets.ts) */
  set?: string;
  /** Tempo für das Team (Heldenlied) */
  tempo?: number;
  /** Angriff für das Team (Kriegspriester, dort ist power die Verteidigung) */
  atk?: number;
  /** Kommt aus dem Weg des Helden (data/spezialisierungen.ts) */
  weg?: string;
}

export interface CombatUnit {
  id: number;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critMult: number;
  threat: number;
  tauntRounds: number;
  skills: CombatSkill[];
  buffs: CombatBuff[];
  lootTableId: string | null;
  spriteKey?: string;
  /** Class ID for player units (e.g. 'guardian', 'ranger') */
  classId?: string;
  /** Key into ENEMY_DEFS – only set for enemy units */
  defId?: string;
  /** Active special effects from gear (only player units) */
  specialEffects?: SpecialEffect[];
  /** Whether anti_heal debuff is active on this unit */
  antiHealDebuff?: boolean;
  /** Siege: diese Einheit ist eine Kriegsmaschine (Kanone/Katapult) */
  isWarMachine?: boolean;
  /** Siege: dieser Gegner bevorzugt die Kriegsmaschine als Angriffsziel */
  prefersWarMachineTarget?: boolean;
  // ── Zustand aus Kampfeffekten (systems/Kampfeffekte.ts), gilt für einen Kampf ──
  /** Schild: schluckt Schaden, bevor Leben verloren geht */
  schild?: number;
  /** Gift: Schaden am Rundenende, noch so viele Runden */
  gift?: { schaden: number; runden: number };
  /** Setzt den nächsten Zug aus; der Text nennt den Grund (z. B. «Einfrieren») */
  betaeubt?: string;
  /** Hat gerade ausgesetzt und kann bis zum nächsten eigenen Zug nicht erneut aussetzen */
  betaeubtSchutz?: boolean;
  /** Schattenstoss: der erste Angriff in diesem Kampf steht noch aus */
  ersterSchlag?: boolean;
  /** Scharfschützin: der erste Angriff in diesem Kampf trifft sicher kritisch */
  zielschuss?: boolean;
  /** Fährtenleserin: markierter Gegner erleidet so viel mehr Schaden von Helden (Anteil) */
  markiert?: number;
  /** Bärengestalt: ist gerade Bärin und zieht die Angriffe auf sich, bis sie unter die Hälfte ihrer Leben fällt */
  baerin?: boolean;
  /** Was der Weg des Helden in dieser Expedition bewirkt hat, für die Bilanz danach (Kampfeffekte.wegZaehlen) */
  wegWirkung?: WegWirkung;
  /** Knochenherr: Skelette, die bis zum Ende der Expedition für den Helden kämpfen */
  skelette?: number;
  /** Sternenfall: Treffer in diesem Kampf seit dem letzten Stern */
  sternenTreffer?: number;
  /** Angriff und Verteidigung, die Kampfeffekte gerade dazugeben (Glutherz, Tiefenrausch, Drachengier, Bastion) */
  effektBoni?: Record<string, number>;
}

/**
 * Bilanz eines Wegs: Extraschaden, verhinderter Schaden, Heilung, verteilter Schild und wie oft
 * er Angriffe umgelenkt, abgefangen oder auf sich gezogen, ausgewichen oder sicher kritisch getroffen hat
 */
export type WegWirkungArt =
  'schaden' | 'verhindert' | 'heilung' | 'schild' | 'umgelenkt' | 'abgefangen' | 'angezogen' | 'ausgewichen' | 'krit';
export type WegWirkung = Partial<Record<WegWirkungArt, number>>;

export interface CombatBuff {
  stat: string;
  value: number;
  remainingRounds: number;
  /** Woher der Buff kommt (z. B. 'rudelgeheul'); solche Buffs enden mit dem Kampf */
  quelle?: string;
}

export interface CombatSkill {
  id: string;
  name: string;
  cooldown: number;
  currentCooldown: number;
  effectType: 'damage' | 'heal' | 'taunt' | 'buff' | 'aoe' | 'summon' | 'drain_air';
  power: number;
  target: string;
  /** Optional: Luftentzug zusätzlich zum normalen Schaden (z.B. Leviathan-Druckwelle) */
  drainAirAmount?: number;
}

/**
 * Wirkung eines Vorrats, die über den Moment hinaus gilt (ExpeditionSystem.useProvision, docs/GILDENSTADT.md
 * «Tränke mit Wirkung»): Kraft-Brot und Schnelligkeitstrank für die nächsten Räume, Krafttrank und
 * Titan-Gebräu bis zum Ende des Dungeons.
 */
export interface TrankWirkung {
  /** Der Vorrat, der sie gegeben hat (ITEM_DEFS-Key, z. B. 'power_bread') */
  itemId: string;
  /** Angriff und Tempo liegen als flacher Bonus in CombatUnit.effektBoni['trank:atk' | 'trank:spd'], maximale Leben direkt auf der Einheit */
  stat: 'atk' | 'spd' | 'maxHp';
  wert: number;
  /** Läuft ab, sobald dieser Raum betreten wird (run.currentRoom); fehlt = bis zum Ende des Dungeons */
  bisRaum?: number;
  /** IDs der Helden, die sie bekommen haben: nur ihnen wird sie beim Ablauf wieder abgezogen, und keiner bekommt sie doppelt */
  helden: number[];
}

export interface ExpeditionRun {
  routeId: string;
  party: CombatUnit[];
  rooms: EncounterRoom[];
  currentRoom: number;
  combatLog: string[];
  loot: Record<string, number>;
  goldEarned: number;
  /** gifted = Gratis-Proviant der Gilde, wird nach dem Lauf NICHT ins Lager zurückgegeben */
  provisions: { itemId: string; qty: number; gifted?: boolean }[];
  status: 'exploring' | 'victory' | 'defeat' | 'retreat';
  lastCheckpoint: number;
  desperateResolveUsed: boolean;
  rngSeed: number;
  xpEarned?: Record<number, number>;  // fighterId → accumulated XP
  focusTarget: { enemyId: number; roundsLeft: number } | null;
  focusTargetCooldown: number;
  difficulty: string;               // Schwierigkeitsgrad-ID ('normal' | 'hard' | 'nightmare' | 'infernal')
  activeModifier: string | null;    // Aktiver Modifikator-ID oder null
  score: number;                    // Berechneter Score am Ende des Runs
  totalCombatRounds: number;        // Summe aller Kampfrunden (für Score-Berechnung)
  enemiesKilled: number;            // Anzahl besiegter normaler Gegner
  bossesKilled: number;             // Anzahl besiegter Bosse
  /** Hort-Gier: Punkte aus eingesteckten Schätzen, machen den Boss stärker (RouteDef.hortGier) */
  gier?: number;
  /** Sternenfeuer: so viel Prozent mehr Angriff hat die Gruppe bis zum Ende des Dungeons (EncounterChoice 'angriff'); unter 0 bei Pfandzetteln (kostetAngriff) */
  gruppenAngriff?: number;
  /** Sonnenuhr: um so viele Runden kommt die Wut-Runde des Bosses früher (EncounterChoice.bossWutFrueher, summiert) */
  bossWutFrueher?: number;
  /** Tränke mit Wirkung: was die Gruppe gerade getrunken hat und wie lange es gilt (ExpeditionSystem.useProvision) */
  trankWirkungen?: TrankWirkung[];
  /** Set-Teil, das der Sieg eingebracht hat (systems/DungeonSets.ts); null = keins, fehlt = noch nicht gewürfelt */
  setTeil?: string | null;
  /** Geschichte oder Wahl-Raum (EncounterChoice.setTeil): Eine Entscheidung verspricht nach dem Sieg ein Set-Teil mehr (systems/Geschichten.ts) */
  setTeilVersprochen?: boolean;
  /** Das versprochene Set-Teil, gezogen mit setTeil; null = keins */
  setTeilExtra?: string | null;
  /** Material für die Schmiede, das der Lauf gebracht hat (systems/Schmiede.ts); fehlt = noch nicht vergeben */
  schmiedeMaterial?: { itemId: string; menge: number } | null;
  /** Geschichte: die Sätze zu den Entscheidungen dieses Laufs, für den Bericht (systems/Geschichten.ts) */
  chronik?: string[];
  /** Geschichte: Beute einer mutigen Wahl, die erst kommt, wenn der Kampf in Raum `raum` gewonnen ist */
  geschichtsBeute?: { raum: number; gold: number; dinge: Record<string, number> }[];
  /** Feature #11: Ausstehende Begegnungs-Wahl (find/rest Raum) */
  pendingChoice?: { roomIndex: number; optionA: EncounterChoice; optionB: EncounterChoice };
  /** Feature #15: Checkpoint-Dialog ausstehend */
  pendingCheckpoint?: boolean;
  /** Feature #16: Händler-Interaktion ausstehend */
  pendingMerchant?: boolean;
  /** Feature #16: Anzahl der Käufe beim aktuellen Händler */
  merchantPurchases?: number;
  /** Feature #17: Im Survivor-Raum gefundener Spezialist */
  specialistFound?: string;
  /** Feature #18: Großmeister-Prüfung aktiv */
  isGrandmasterTrial?: boolean;
  /** Tracks which party units have used their one ability this expedition (unit.id → used) */
  abilitiesUsed: Record<number, boolean>;
  // Air Shield System (Unterwasser-Routen)
  /** Aktuelle Luft (0-100+) */
  airShield?: number;
  /** Maximum Luft (Standard 100 + airBonus von Items) */
  airShieldMax?: number;
  /** Spott-Fähigkeit (Guardian, Paladin): when true, all enemy attacks are redirected to the taunting hero */
  guardianTauntActive?: boolean;
  /** Wer gespottet hat (unit.id). Fehlt bei alten Spielständen → der Guardian */
  tauntUnitId?: number;
  /** Per-round HP snapshots for animated combat playback (transient, not saved) */
  combatRoundSnapshots?: CombatRoundSnapshot[];
  /** Siege: die Kriegsmaschine dieser Expedition (nicht in party, separater Slot) */
  warMachineUnit?: CombatUnit;
  /** ID des eingesetzten War Machine Items (z.B. 'war_cannon') */
  warMachineItemId?: string;
}

/**
 * Bis zum Ende gekommen, und wo es einen Boss gibt, ist er besiegt. Ein Kampf endet nach dem
 * Rundenlimit auch ohne Sieger (CombatEngine), dann zählt die Expedition als Sieg, der Boss lebt aber.
 * Geschichte, versprochenes Set-Teil und Musterlauf zählen nur einen echten Sieg.
 */
export function dungeonBezwungen(run: ExpeditionRun): boolean {
  return run.status === 'victory' && (run.bossesKilled > 0 || !run.rooms.some(r => r.type === 'boss'));
}

/** Snapshot of HP values after a combat round – used by CombatOverlay for round-by-round animation */
export interface CombatRoundSnapshot {
  round: number;
  /** partyHp[unitId] = hp after this round */
  partyHp: Record<number, number>;
  /** enemyHp[unitId] = hp after this round */
  enemyHp: Record<number, number>;
  /** Combat log entries generated DURING this round */
  logLines: string[];
  /** Whether any critical hit occurred this round */
  hadCrit: boolean;
  /** Whether a unit died this round */
  hadDeath: boolean;
  /** Siege: HP der Befestigung nach dieser Runde */
  fortificationHp?: number;
  /** Fährtenleserin: IDs der Gegner, die nach dieser Runde markiert sind */
  markiert?: number[];
  /** Zustände aus den Wegen nach dieser Runde (Zorn, Bärin, Fluch, Kränkung …) je Held und je Gegner, nach ID */
  wegZustand?: { helden: Record<number, WegZustand[]>; gegner: Record<number, WegZustand[]> };
}

/** Ein Zustand aus einem Weg auf der Kampfkarte: Zeichen mit Zahl und Erklärung, z. B. «🔥+4» */
export interface WegZustand {
  zeichen: string;
  titel: string;
}
