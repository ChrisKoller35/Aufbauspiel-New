// ─── Magic City – Eichung der endlosen Treppe ───────────────────
// Probe-Läufe mit drei Musterteams (frisch, gut, stark) über das echte
// ExpeditionSystem: Wie hoch kommt welches Team? Nach Änderungen an Kampf,
// Klassen, Ausrüstung oder data/treppe.ts neu laufen lassen und die Tabelle
// in docs/TREPPE.md anpassen. Fähigkeiten vor dem Kampf nutzt die Probe nicht
// (echte Spieler kommen damit etwas höher).
// Aufruf: npm run treppe-eichung
// ────────────────────────────────────────────────────────────────

import { createNewGameState, GameState } from '../src/models/GameState';
import { GuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { CLASS_DEFS } from '../src/data/classes';
import { HERZSTEINE } from '../src/data/stadtstufen';
import { stockwerkGegner, gegnerWerte } from '../src/data/treppe';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { alsTreppenGegner, etageGeschafft } from '../src/systems/Treppe';
import { SeededRNG } from '../src/utils/RNG';

/** Werte-Zuwachs je Stufe wie in HeroProgression (Klassen-Bonus) … */
const STUFEN_BONUS: Record<string, { hp: number; atk: number; def: number }> = {
  guardian: { hp: 4, atk: 0.3, def: 0.5 }, ranger: { hp: 2, atk: 0.6, def: 0.1 },
  berserker: { hp: 3, atk: 0.5, def: 0.2 }, assassin: { hp: 2, atk: 0.6, def: 0.1 },
};
/** … und durch Training (+2 Leben, +1 Angriff, +1 Rüstung); die Probe nimmt je die Hälfte. */
const TRAINING = { hp: 2, atk: 1, def: 1 };

function held(id: number, classId: string, stufe: number, gear: GuildFighter['gear']): GuildFighter {
  const base = { ...CLASS_DEFS[classId].baseStats };
  const bonus = STUFEN_BONUS[classId];
  const ups = stufe - 1;
  base.maxHp = Math.round(base.maxHp + ups * (bonus.hp + TRAINING.hp) / 2);
  base.atk = Math.round(base.atk + ups * (bonus.atk + TRAINING.atk) / 2);
  base.def = Math.round(base.def + ups * (bonus.def + TRAINING.def) / 2);
  base.hp = base.maxHp;
  return { id, citizenId: 0, classId, name: classId, baseStats: base, gear, gearNeedsRepair: false, xp: 0, level: stufe };
}

const T3 = {
  tank: { mainHand: 'crystal_golem_staff', offHand: 'wyrm_scale_shield', armor: 'mystic_plate_armor', trinket: 'abyss_amulet' },
  dps: { mainHand: 'hydra_venomfang', offHand: null, armor: 'mystic_plate_armor', trinket: 'lich_phylactery' },
  bow: { mainHand: 'fallen_hunters_bow', offHand: null, armor: 'spider_silk_robe', trinket: 'abyss_amulet' },
};
const T4 = {
  tank: { mainHand: 'war_hammer', offHand: 'aether_guardian_shield', armor: 'dragonlord_plate', trinket: 'aether_heart' },
  dps: { mainHand: 'soulbreaker', offHand: null, armor: 'dragonlord_plate', trinket: 'aether_heart' },
  bow: { mainHand: 'eternal_hunter_bow', offHand: null, armor: 'shadowhunter_armor', trinket: 'arcane_amulet' },
};

const TEAMS: Record<string, () => GuildFighter[]> = {
  'Frisch (Stufe 10, T3, 3 Helden)': () => [
    held(1, 'guardian', 10, T3.tank), held(2, 'berserker', 10, T3.dps), held(3, 'ranger', 10, T3.bow),
  ],
  'Gut (Stufe 12, T3/T4, 4 Helden)': () => [
    held(1, 'guardian', 12, T4.tank), held(2, 'berserker', 12, T3.dps), held(3, 'ranger', 12, T3.bow), held(4, 'assassin', 12, T3.dps),
  ],
  'Stark (Stufe 15, T4, 4 Helden)': () => [
    held(1, 'guardian', 15, T4.tank), held(2, 'berserker', 15, T4.dps), held(3, 'ranger', 15, T4.bow), held(4, 'assassin', 15, T4.dps),
  ],
};

const gear = new GearSystem();
const engine = new CombatEngine(gear);

/** Spielstand in der Magischen Stadt mit diesem Team; Bestmarke so, dass `start` erlaubt ist. */
function stadtMit(team: GuildFighter[], start: number, startwert: number): GameState {
  const state = createNewGameState();
  state.rngSeed = startwert;
  state.fighters.push(...team);
  state.stadtweg = { stufe: 7, herzsteine: HERZSTEINE.map(h => h.id), gelesen: 7 };
  if (start > 1) etageGeschafft(state, start - 1);
  return state;
}

/** Ein Lauf ab `start`, an jedem Rastplatz weiter; Ergebnis: höchstes Stockwerk und wie es endete. */
function aufstieg(team: GuildFighter[], start: number, startwert: number): { hoechstes: number; ende: string } {
  const state = stadtMit(team, start, startwert);
  const system = new ExpeditionSystem(gear, new ProvisionSystem());
  const run = system.startTreppe(state, team.map(f => f.id), start) as ExpeditionRun;
  for (let schritt = 0; schritt < 1000; schritt++) {
    const step = system.nextStep(run);
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'finish') break;
    else system.processCurrentRoom(state);
  }
  const ergebnis = system.treppeAbschliessen(run)!;
  const ende = ergebnis.ende === 'patt' ? 'patt' : 'niederlage';
  return { hoechstes: ergebnis.hoechstes, ende: `${ende} auf ${ergebnis.hoechstes + 1}` };
}

/** Ein einzelnes Stockwerk mit vollem Leben: 'sieg' | 'niederlage' | 'patt'. */
function einzelkampf(team: GuildFighter[], etage: number, startwert: number): string {
  const run = { party: team.map(f => engine.fighterToCombatUnit(f)), combatLog: [], loot: {}, goldEarned: 0,
    activeModifier: null, totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0 } as unknown as ExpeditionRun;
  const enemies = stockwerkGegner(etage).map((id, platz) => alsTreppenGegner(engine.enemyToCombatUnit(id), etage, platz));
  const room = { index: 0, type: enemies.length === 1 ? 'boss' : 'combat', enemies, healPercent: 0, hazardDamage: 0, completed: false } as const;
  engine.processCombat(run, { ...room }, new SeededRNG(startwert));
  if (run.party.every(u => u.hp <= 0)) return 'niederlage';
  return enemies.some(e => e.hp > 0) ? 'patt' : 'sieg';
}

for (const [name, machTeam] of Object.entries(TEAMS)) {
  const units = machTeam().map(f => engine.fighterToCombatUnit(f));
  console.log(`\n== ${name}: ${units.map(u => `${u.classId} ${u.maxHp}/${u.atk}/${u.def}`).join(' · ')}`);
  const zeile: string[] = [];
  for (const etage of [1, 5, 10, 15, 20, 25, 30, 35, 40, 50]) {
    let siege = 0;
    for (let s = 1; s <= 20; s++) if (einzelkampf(machTeam(), etage, s) === 'sieg') siege++;
    zeile.push(`${etage}: ${siege * 5} %`);
  }
  console.log('Einzelne Stockwerke (Siege):', zeile.join(' · '));
  for (const start of [1, 11, 21, 31]) {
    const laeufe = [1, 2, 3, 4, 5, 6, 7, 8].map(s => aufstieg(machTeam(), start, s));
    console.log(`Aufstieg ab ${start}: höchstes ${laeufe.map(l => l.hoechstes).join(', ')} (${laeufe.slice(0, 2).map(l => l.ende).join('; ')})`);
  }
}
const beispiel = (etage: number): string =>
  stockwerkGegner(etage).map(id => `${id} ${JSON.stringify(gegnerWerte(id, etage))}`).join(' | ');
console.log('\nStockwerk 1:', beispiel(1));
console.log('Stockwerk 10:', beispiel(10));
console.log('Stockwerk 25:', beispiel(25));
console.log('Stockwerk 50:', beispiel(50));
