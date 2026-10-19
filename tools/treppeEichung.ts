// ─── Magic City – Eichung der endlosen Treppe ───────────────────
// Probe-Läufe mit drei Musterteams (frisch, gut, stark; src/data/musterteams.ts) über das echte
// ExpeditionSystem: Wie hoch kommt welches Team? Nach Änderungen an Kampf,
// Klassen, Ausrüstung oder data/treppe.ts neu laufen lassen und die Tabelle
// in docs/TREPPE.md anpassen. Fähigkeiten vor dem Kampf nutzt die Probe nicht
// (echte Spieler kommen damit etwas höher).
// Aufruf: npm run treppe-eichung
// ────────────────────────────────────────────────────────────────

import { createNewGameState, GameState } from '../src/models/GameState';
import { GuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { MUSTER_TEAMS, MusterHeld, musterWerte } from '../src/data/musterteams';
import { HERZSTEINE } from '../src/data/stadtstufen';
import { stockwerkGegner, gegnerWerte } from '../src/data/treppe';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { alsTreppenGegner, etageGeschafft } from '../src/systems/Treppe';
import { SeededRNG } from '../src/utils/RNG';

/** Musterheld als Held der Gilde (ohne Bewohner, feste ID im Team) */
function held(id: number, muster: MusterHeld): GuildFighter {
  return { id, citizenId: 0, classId: muster.classId, name: muster.name, baseStats: musterWerte(muster),
    gear: { ...muster.gear }, gearNeedsRepair: false, xp: 0, level: muster.stufe };
}

const TEAMS = Object.values(MUSTER_TEAMS).map(team => ({
  name: team.name,
  machTeam: (): GuildFighter[] => team.helden.map((muster, i) => held(i + 1, muster)),
}));

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

for (const { name, machTeam } of TEAMS) {
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
