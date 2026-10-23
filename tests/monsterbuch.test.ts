// ─── Monsterbuch: Zählen, Strecke, Seiten, Stufen, Prämien ──────
// Mit echten Läufen über das ExpeditionSystem und den echten Routen
// und Gegnern (docs/MONSTERBUCH.md). Keine erfundenen Gegner oder Routen.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { EncounterRoom, ExpeditionRun } from '../src/models/ExpeditionRun';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { SaveSystem, pruefeSpielstandText } from '../src/systems/SaveSystem';
import { CombatEngine, bossWut, wutAbRunde } from '../src/systems/CombatEngine';
import { BestiariumSystem } from '../src/systems/BestiariumSystem';
import { SeededRNG } from '../src/utils/RNG';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../src/data/routes';
import { ENEMY_DEFS, ENEMY_LORE } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { MONSTERBUCH_NOTIZEN } from '../src/data/monsterbuchNotizen';
import { musterStand } from '../src/systems/Musterlauf';
import {
  FAEHIGKEIT_ART, SCHWELLEN, anzahlBesiegt, begegnungenJeLauf, beuteChancen, einsatzRunden, erreichbareGegner, faehigkeitText, gesichtet,
  goldSpanne, kampfRunden, praemieAbgeholt, praemieAbholen, praemieBetrag, praemieFaellig, praemieGrundbetrag, praemien, seiten, seitenStand,
  siegeBis, strecke, stufe, wutVorziehbar,
} from '../src/systems/Monsterkunde';

/** Neues Spiel wie main.ts beim ersten Start: ein Guardian. */
function neuesSpiel(): { state: GameState; ids: number[] } {
  const state = createNewGameState();
  placeStartingLayout(state);
  return { state, ids: state.fighters.map(f => f.id) };
}

/**
 * Ein Lauf wie `aufbrechen` (ExpeditionFlow.ts) und `spieleRoute` (Musterlauf.ts): Kontrollpunkt weiter,
 * Händler übergehen, bei einer Wahl Option A. Mit `rueckzugVorRaum` zieht sich das Team zurück, sobald
 * dieser Raum als nächster dran wäre. Danach wie `finishExpedition`: finalizeExpeditionProgress.
 */
function lauf(state: GameState, ids: number[], routeId: string, rueckzugVorRaum?: number): ExpeditionRun {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  state.activeExpedition = null;
  const run = system.startExpedition(state, routeId, ids, 'normal', null, false, []);
  if (!run) throw new Error(`Route ${routeId} lässt sich nicht starten`);
  for (let schritt = 0; schritt < 500; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else if (rueckzugVorRaum !== undefined && run.currentRoom >= rueckzugVorRaum) {
      system.retreat(run);
      break;
    } else system.processCurrentRoom(state);
  }
  finalizeExpeditionProgress(state, run, system);
  state.activeExpedition = null;
  return run;
}

/** Besiegte Gegner (hp <= 0) je ID in den gespielten Räumen eines Laufs. */
function besiegteImLauf(run: ExpeditionRun): Record<string, number> {
  const zahl: Record<string, number> = {};
  for (const room of run.rooms) {
    if (!room.completed) continue;
    for (const e of room.enemies) if (e.defId && e.hp <= 0) zahl[e.defId] = (zahl[e.defId] ?? 0) + 1;
  }
  return zahl;
}

describe('Zählen: nur gespielte Räume', () => {
  it('Rückzug nach Raum 2: der Boss ist nicht gesichtet, die Gegner der zwei Räume schon', () => {
    // Ein starkes Team, damit es Raum 2 sicher übersteht (der einzelne Guardian fällt im Tiefwald)
    const { state, ids } = musterStand('stark', 7919);
    const route = ROUTE_DEFS.forest_medium;
    expect(route.bossId).toBe('boss_elder_treant');
    const run = lauf(state, ids, 'forest_medium', 2);
    expect(run.status).toBe('retreat');
    expect(run.rooms.filter(r => r.completed).map(r => r.index)).toEqual([0, 1]);
    for (const id of [...route.encounters[0].enemies!, ...route.encounters[1].enemies!]) {
      expect(gesichtet(state, id)).toBe(true);
    }
    expect(state.bestiarium.discovered).not.toContain('boss_elder_treant');
    expect(gesichtet(state, 'boss_elder_treant')).toBe(false);
    // Gegner, die nur in späteren Räumen leben, auch nicht
    for (const id of ['forest_wisp', 'forest_shaman']) {
      if (!route.encounters.slice(0, 2).some(enc => enc.enemies?.includes(id))) {
        expect(gesichtet(state, id)).toBe(false);
      }
    }
  });

  it('Niederlage: die Gegner des Todesraums sind gesichtet, die danach nicht', () => {
    const { state, ids } = neuesSpiel();
    const run = lauf(state, ids, 'himmelsarchiv');
    expect(run.status).toBe('defeat');
    const gespielt = run.rooms.filter(r => r.completed);
    const todesraum = gespielt[gespielt.length - 1];
    expect(todesraum.enemies.length).toBeGreaterThan(0);
    for (const e of todesraum.enemies) expect(gesichtet(state, e.defId!)).toBe(true);
    const gesehen = new Set(gespielt.flatMap(r => r.enemies.map(e => e.defId)));
    const spaeter = run.rooms.filter(r => !r.completed).flatMap(r => r.enemies.map(e => e.defId!)).filter(id => !gesehen.has(id));
    expect(spaeter).toContain('boss_oberarchivar');
    for (const id of spaeter) expect(gesichtet(state, id)).toBe(false);
  });

  it('Strecke = Zahl der Gegner mit hp <= 0, zwei Wölfe im Raum zählen 2', () => {
    // Fester Startwert und ein Team, das den Waldpfad sicher schafft: Es kommt immer bis in den vierten
    // Raum, wo zwei Waldwölfe stehen (ein einzelner Guardian mit zufälligem Startwert kam fast nie dorthin)
    const { state, ids } = musterStand('stark', 7919);
    expect(ROUTE_DEFS.forest_short.encounters[0].enemies).toEqual(['forest_wolf', 'forest_spider']);
    expect(ROUTE_DEFS.forest_short.encounters[3].enemies).toEqual(['forest_wolf', 'forest_wolf']);
    const run = lauf(state, ids, 'forest_short');
    expect(run.status).toBe('victory');
    const wolfsraum = run.rooms[3];
    expect(wolfsraum.completed).toBe(true);
    expect(wolfsraum.enemies.map(e => [e.defId, e.hp <= 0])).toEqual([['forest_wolf', true], ['forest_wolf', true]]);
    // Ein Wolf aus dem ersten Raum und zwei aus dem vierten: drei, nicht zwei (je Raum und Art nur einmal)
    expect(anzahlBesiegt(state, 'forest_wolf')).toBe(3);
    expect(strecke(state)).toEqual({ forest_wolf: 3, forest_spider: 1, forest_bandit: 1, forest_bear: 1 });
    expect(strecke(state)).toEqual(besiegteImLauf(run));
    // Ein zweiter Lauf zählt dazu
    const run2 = lauf(state, ids, 'forest_short');
    expect(run2.status).toBe('victory');
    expect(strecke(state)).toEqual({ forest_wolf: 6, forest_spider: 2, forest_bandit: 2, forest_bear: 2 });
    // Die Listen für Erfolge und Stadtweg bleiben Listen von IDs
    expect(state.bestiarium.defeated.every(id => typeof id === 'string')).toBe(true);
    expect(state.bestiarium.discovered.every(id => typeof id === 'string')).toBe(true);
  });
});

/** Die erreichbaren Gegner, direkt aus ROUTE_DEFS gerechnet (nicht über Monsterkunde) */
function ausRouten(): Set<string> {
  return new Set(Object.values(ROUTE_DEFS).flatMap(r => r.encounters.flatMap(e => e.enemies ?? [])));
}

describe('Erreichbarkeit aus ROUTE_DEFS', () => {
  it('das Monsterbuch zählt genau die Gegner, die in einer Route vorkommen', () => {
    const erwartet = ausRouten();
    expect(new Set(erreichbareGegner())).toEqual(erwartet);
    expect(erreichbareGegner().length).toBe(erwartet.size);
    expect(new BestiariumSystem().getProgress(createNewGameState()).total).toBe(erwartet.size);
    // monsterbuch_50 bleibt erreichbar
    expect(erwartet.size).toBeGreaterThanOrEqual(50);
    // Die unerreichbaren zählen nicht mit, auch wenn sie in einem alten Stand stehen
    const state = createNewGameState();
    const unerreichbar = Object.keys(ENEMY_DEFS).filter(id => !erwartet.has(id));
    expect(unerreichbar.length).toBe(Object.keys(ENEMY_DEFS).length - erwartet.size);
    state.bestiarium.discovered = [...unerreichbar];
    state.bestiarium.defeated = [...unerreichbar];
    expect(new BestiariumSystem().getProgress(state)).toEqual({ discovered: 0, defeated: 0, total: erwartet.size });
  });

  it('eine Seite je Dungeon in der Reihenfolge der Karte, jeder Gegner auf jeder seiner Seiten', () => {
    const graph = DUNGEON_GRAPH.map(n => n.routeId).filter(id => ROUTE_DEFS[id].encounters.some(e => e.enemies?.length));
    expect(seiten().map(s => s.routeId)).toEqual(graph);
    for (const seite of seiten()) {
      expect(seite.name).toBe(ROUTE_DEFS[seite.routeId].name);
      const inRoute = new Set(ROUTE_DEFS[seite.routeId].encounters.flatMap(e => e.enemies ?? []));
      expect(new Set(seite.gegner)).toEqual(inRoute);
    }
  });

  it('jede Seite ist mit höchstens 10 Siegen erforscht und mit höchstens 30 gemeistert', () => {
    for (const seite of seiten()) {
      const zahl: Record<string, number> = {};
      for (const enc of ROUTE_DEFS[seite.routeId].encounters) for (const id of enc.enemies ?? []) zahl[id] = (zahl[id] ?? 0) + 1;
      const bis = (ziel: 'erforscht' | 'gemeistert') => Math.max(...Object.entries(zahl).map(([id, n]) =>
        Math.ceil((ENEMY_DEFS[id].isBoss ? SCHWELLEN.boss : SCHWELLEN.normal)[ziel] / n)));
      expect(siegeBis(seite.routeId, 'erforscht')).toBe(bis('erforscht'));
      expect(siegeBis(seite.routeId, 'gemeistert')).toBe(bis('gemeistert'));
      expect(bis('erforscht'), seite.routeId).toBeLessThanOrEqual(10);
      expect(bis('gemeistert'), seite.routeId).toBeLessThanOrEqual(30);
    }
    // Stufe 1: genau 30 Siege bis gemeistert
    expect(siegeBis('forest_short', 'gemeistert')).toBe(30);
    expect(siegeBis('forest_ruins', 'gemeistert')).toBe(30);
  });
});

describe('Beute im Fenster = Beute im Spiel', () => {
  it('die Gold-Spanne ist die der Beutetabelle, die Chancen summieren sich zu 1', () => {
    for (const id of erreichbareGegner()) {
      const tabelle = LOOT_TABLE_DEFS[ENEMY_DEFS[id].lootTableId];
      expect(goldSpanne(id)).toEqual(tabelle.guaranteedGold);
      const summe = tabelle.entries.reduce((s, e) => s + e.weight, 0);
      const chancen = beuteChancen(id);
      chancen.forEach((c, i) => expect(c.chance).toBeCloseTo(tabelle.entries[i].weight / summe, 10));
      expect(chancen.reduce((s, c) => s + c.chance, 0)).toBeCloseTo(1, 10);
    }
  });

  it('Gegenprobe mit CombatEngine.rollLoot: 10 000 Ziehungen, höchstens 2 Prozentpunkte daneben', () => {
    const engine = new CombatEngine(new GearSystem());
    for (const id of ['forest_wolf', 'boss_ignarax']) {
      const rng = new SeededRNG(4242);
      const gezogen: Record<string, number> = {};
      const { min, max } = goldSpanne(id);
      const N = 10_000;
      for (let i = 0; i < N; i++) {
        const run = { party: [], loot: {}, goldEarned: 0 } as unknown as ExpeditionRun;
        engine.rollLoot(run, ENEMY_DEFS[id].lootTableId, rng);
        expect(run.goldEarned).toBeGreaterThanOrEqual(min);
        expect(run.goldEarned).toBeLessThanOrEqual(max);
        const [itemId] = Object.keys(run.loot);
        gezogen[itemId] = (gezogen[itemId] ?? 0) + 1;
      }
      const angezeigt: Record<string, number> = {};
      for (const c of beuteChancen(id)) angezeigt[c.itemId] = (angezeigt[c.itemId] ?? 0) + c.chance;
      for (const [itemId, chance] of Object.entries(angezeigt)) {
        expect(Math.abs((gezogen[itemId] ?? 0) / N - chance), `${id} ${itemId}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('jede Fähigkeitsart aus ENEMY_DEFS hat einen deutschen Namen', () => {
    for (const e of Object.values(ENEMY_DEFS)) {
      for (const sk of e.skills) expect(FAEHIGKEIT_ART[sk.effectType], sk.effectType).toMatch(/^[A-ZÄÖÜ][a-zäöü]+$/);
    }
  });
});

/**
 * Was ein Gegner im echten Kampf (CombatEngine.processCombat, mit `belagerung` in einem Belagerungsraum
 * processFortificationCombat) mit seinen Fähigkeiten tut: je Fähigkeit die Runden ihres Einsatzes mit
 * den Protokollzeilen der Runde. Vier Helden, der Gegner und die Befestigung sind unverwundbar, die
 * Helden ohne Effekte (niemand betäubt, weicht aus oder fängt ab), mit Luftschild.
 */
function imKampf(id: string, belagerung = false): { runde: number; zeilen: string[] }[][] {
  const { state, ids } = musterStand('stark', 7919);
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const run = system.startExpedition(state, 'forest_short', ids, 'normal', null, false, [])!;
  run.airShield = 1000;
  for (const held of run.party) Object.assign(held, { hp: 1e7, maxHp: 1e7, def: 1e5, atk: 0, critChance: 0, specialEffects: [] });
  const engine = new CombatEngine(new GearSystem());
  const gegner = engine.enemyToCombatUnit(id);
  Object.assign(gegner, { hp: 1e7, maxHp: 1e7 });
  const raum = { index: 0, type: ENEMY_DEFS[id].isBoss ? 'boss' : 'combat', enemies: [gegner], healPercent: 0, hazardDamage: 0, completed: false } as EncounterRoom;
  if (belagerung) {
    Object.assign(raum, { type: 'fortification', fortification: { name: 'Prüfturm', hp: 1e7, maxHp: 1e7, armor: 0, spriteKey: '' } });
    engine.processFortificationCombat(run, raum, new SeededRNG(1));
  } else {
    engine.processCombat(run, raum, new SeededRNG(1));
  }
  return ENEMY_DEFS[id].skills.map(sk => (run.combatRoundSnapshots ?? [])
    .filter(runde => runde.logLines.some(z => z.startsWith(`${gegner.name} setzt ${sk.name} ein`)
      || (sk.effectType === 'drain_air' && z.startsWith(`>> ${gegner.name} entzieht dem Luftschild`))))
    .map(runde => ({ runde: runde.round, zeilen: runde.logLines })));
}

describe('Fähigkeiten im Fenster = Fähigkeiten im Kampf', () => {
  it('einsatzRunden: dieselben Runden wie processCombat, für jeden erreichbaren Gegner', () => {
    let geprueft = 0;
    for (const id of erreichbareGegner()) {
      const skills = ENEMY_DEFS[id].skills;
      if (skills.length === 0) continue;
      expect(einsatzRunden(skills), id).toEqual(imKampf(id).map(einsaetze => einsaetze.map(e => e.runde)));
      geprueft++;
    }
    expect(geprueft).toBeGreaterThan(70);
    // Wer in einem Belagerungsraum steht, kämpft dort bis zu 30 Runden (processFortificationCombat)
    const belagert = erreichbareGegner().filter(id => kampfRunden(id) === 30);
    expect(belagert.sort()).toEqual(['siege_crossbowman', 'siege_defender', 'siege_mage', 'wall_archer', 'wall_guard']);
    for (const id of belagert) {
      expect(einsatzRunden(ENEMY_DEFS[id].skills, 30), id).toEqual(imKampf(id, true).map(einsaetze => einsaetze.map(e => e.runde)));
    }
    expect(einsatzRunden(ENEMY_DEFS.siege_mage.skills, 30)[1]).toEqual([2, 9, 17, 24]);
    // Abklingzeit 3 heisst: jede vierte Runde. Die zweite Fähigkeit wartet, solange die erste vorgeht.
    expect(einsatzRunden(ENEMY_DEFS.forest_wolf.skills)).toEqual([[1, 5, 9, 13, 17]]);
    expect(einsatzRunden(ENEMY_DEFS.boss_elder_treant.skills)).toEqual([[1, 5, 9, 13, 17], [2, 10, 18]]);
  });

  it('faehigkeitText sagt, was der Kampf tut: Zahl, Ziel, Dauer, Luft; nie Abwehr', () => {
    const helden = 4;
    for (const id of erreichbareGegner()) {
      const kampf = imKampf(id);
      ENEMY_DEFS[id].skills.forEach((sk, i) => {
        const text = faehigkeitText(id, sk);
        const name = `${id} ${sk.name}`;
        expect(kampf[i].length, name).toBeGreaterThan(0);
        // Die Zeilen der ersten Runde, in der er die Fähigkeit einsetzt
        const zeilen = kampf[i][0].zeilen;
        expect(text, name).not.toMatch(/Abwehr|DEF|Verstärkung/);
        if (sk.effectType === 'damage' || sk.effectType === 'aoe') {
          expect(text, name).toContain(`mit dem ${sk.power.toLocaleString('de')}-fachen Schaden`);
          // So viele Treffer, wie der Text Ziele nennt
          const treffer = zeilen.filter(z => z.startsWith(`${ENEMY_DEFS[id].name} setzt ${sk.name} ein →`) && z.includes('erleidet'));
          expect(treffer.length, name).toBe(text.startsWith('Trifft alle Helden') ? helden : 1);
          expect(text.startsWith('Trifft alle Helden') || text.startsWith('Trifft einen Helden'), name).toBe(true);
        }
        // Luft nennt der Text genau dann, wenn der Kampf Luft nimmt, und dann dieselbe Menge
        const luft = zeilen.map(z => /(?:reißt|entzieht dem Luftschild) (\d+) Luft/.exec(z)?.[1]).find(Boolean);
        expect(/(\d+) Luft/.exec(text)?.[1], name).toBe(luft);
        if (sk.effectType === 'heal') {
          expect(zeilen.some(z => z.includes(`${sk.name} ein → heilt`) && z.endsWith(`um ${sk.power}`)), name).toBe(true);
          expect(text, name).toContain(`um ${sk.power.toLocaleString('de')}`);
        }
        if (sk.effectType === 'buff') {
          expect(zeilen.some(z => z.includes(`${sk.name} ein → +${sk.power} ATK für 3 Runden`)), name).toBe(true);
          expect(text, name).toBe(`Gibt sich selbst ${sk.power} Angriff mehr, 3 Runden lang.`);
        }
        if (sk.effectType === 'summon') {
          expect(zeilen.some(z => z.includes(`${sk.name} ein → Verstärkung beschworen! (+${sk.power} ATK für 4 Runden)`)), name).toBe(true);
          expect(text, name).toBe(`Ruft niemanden herbei, sondern gibt sich selbst ${sk.power} Angriff mehr, 4 Runden lang.`);
        }
        if (sk.effectType === 'drain_air') expect(luft, name).toBeDefined();
      });
    }
  });

  it('die Beispiele aus der Prüfung: Heilung, Diamantpanzer, Brut, Luftsauger', () => {
    const text = (id: string, skillId: string) => faehigkeitText(id, ENEMY_DEFS[id].skills.find(s => s.id === skillId)!);
    const heilung = ENEMY_DEFS.forest_shaman.skills[0];
    expect(faehigkeitText('forest_shaman', heilung)).toBe('Heilt den Verbündeten mit den wenigsten Leben um 24, das kann auch er selbst sein.');
    // Ein Boss kämpft allein: Seine Heilung heilt nur ihn
    const regeneration = ENEMY_DEFS.boss_swamp_hydra.skills.find(s => s.effectType === 'heal')!;
    expect(faehigkeitText('boss_swamp_hydra', regeneration)).toBe('Heilt sich um 36 Leben.');
    const diamantpanzer = ENEMY_DEFS.boss_crystal_golem.skills.find(s => s.name === 'Diamantpanzer')!;
    expect(text('boss_crystal_golem', diamantpanzer.id)).toBe('Gibt sich selbst 5 Angriff mehr, 3 Runden lang.');
    const brut = ENEMY_DEFS.boss_spider_queen.skills.find(s => s.name === 'Brut beschwören')!;
    expect(text('boss_spider_queen', brut.id)).toBe('Ruft niemanden herbei, sondern gibt sich selbst 3 Angriff mehr, 4 Runden lang.');
    const luftsauger = ENEMY_DEFS.jellyfish_swarm.skills.find(s => s.effectType === 'drain_air')!;
    expect(text('jellyfish_swarm', luftsauger.id)).toBe('Zieht 10 Luft aus dem Luftschild, ohne Schaden.');
    expect(text('forest_wolf', 'bite')).toBe('Trifft einen Helden mit dem 1,5-fachen Schaden eines normalen Angriffs.');
    expect(text('forest_spider', 'web')).toBe('Trifft alle Helden mit dem 0,5-fachen Schaden eines normalen Angriffs.');
    // drainAirAmount: 18 steht in enemies.ts, kommt aber nicht im Kampf an (enemyToCombatUnit)
    expect(ENEMY_DEFS.boss_leviathan.skills.find(s => s.id === 'druckwelle')!.drainAirAmount).toBe(18);
    expect(text('boss_leviathan', 'druckwelle')).toBe('Trifft alle Helden mit dem 0,9-fachen Schaden eines normalen Angriffs.');
  });

  it('Sonnenuhr: Sunnas Wut kann bis Runde 4 vorrücken, bei keinem anderen Boss rückt sie', () => {
    const sonnenuhren = ROUTE_DEFS.morgentor.encounters.flatMap(enc => enc.wahl ? [enc.wahl.a, enc.wahl.b] : [])
      .map(option => option.bossWutFrueher ?? 0).filter(n => n > 0);
    expect(sonnenuhren).toEqual([2, 2, 2]);
    const frueher = sonnenuhren.reduce((a, b) => a + b, 0);
    expect(wutVorziehbar('boss_sunna')).toEqual([
      { routeId: 'morgentor', name: ROUTE_DEFS.morgentor.name, abRunde: wutAbRunde(bossWut('boss_sunna'), { bossWutFrueher: frueher }) },
    ]);
    expect(wutVorziehbar('boss_sunna')[0].abRunde).toBe(4);
    for (const id of erreichbareGegner().filter(id => ENEMY_DEFS[id].isBoss && id !== 'boss_sunna')) {
      expect(wutVorziehbar(id), id).toEqual([]);
    }
  });
});

describe('Stufen und Seitenprämien', () => {
  it('Stufen nach Siegen: normal 1/10/30, Boss 1/3/10', () => {
    const state = createNewGameState();
    expect(stufe(state, 'forest_wolf')).toBe('unbekannt');
    state.bestiarium.discovered.push('forest_wolf');
    expect(stufe(state, 'forest_wolf')).toBe('gesichtet');
    for (const [n, s] of [[1, 'bekannt'], [9, 'bekannt'], [10, 'erforscht'], [29, 'erforscht'], [30, 'gemeistert']] as const) {
      Object.assign(state.bestiarium, { strecke: { forest_wolf: n, boss_elder_treant: Math.ceil(n / 3) } });
      expect(stufe(state, 'forest_wolf')).toBe(s);
    }
    for (const [n, s] of [[1, 'bekannt'], [2, 'bekannt'], [3, 'erforscht'], [9, 'erforscht'], [10, 'gemeistert']] as const) {
      Object.assign(state.bestiarium, { strecke: { boss_elder_treant: n } });
      expect(stufe(state, 'boss_elder_treant')).toBe(s);
    }
  });

  it('30 echte Siege im Waldpfad: Seite gemeistert, beide Prämien genau einmal (N und 3 × N)', () => {
    const { state, ids } = musterStand('stark', 7919);
    const route = 'forest_short';
    const N = praemieGrundbetrag(route);
    let siege = 0;
    let versuche = 0;
    const abgeholt: { art: string; nachSiegen: number; gold: number }[] = [];
    while (siege < 30 && versuche < 60) {
      versuche++;
      const run = lauf(state, ids, route);
      if (run.status === 'victory') siege++;
      for (const art of ['erforscht', 'gemeistert'] as const) {
        const vorher = state.globalStock.gold;
        const gold = praemieAbholen(state, route, art);
        expect(state.globalStock.gold - vorher).toBe(gold);
        if (gold > 0) {
          abgeholt.push({ art, nachSiegen: siege, gold });
          // Der zweite Klick eines Doppelklicks bringt nichts
          expect(praemieAbholen(state, route, art)).toBe(0);
          expect(state.globalStock.gold - vorher).toBe(gold);
        }
      }
      if (siege === 29) expect(praemieFaellig(state, route, 'gemeistert') || praemieAbgeholt(state, route, 'gemeistert')).toBe(false);
    }
    expect(siege).toBe(30);
    const seite = seiten().find(s => s.routeId === route)!;
    expect(seitenStand(state, seite)).toEqual({ gesamt: seite.gegner.length, erforscht: seite.gegner.length, gemeistert: seite.gegner.length });
    expect(abgeholt.map(a => [a.art, a.gold])).toEqual([['erforscht', N], ['gemeistert', 3 * N]]);
    expect(abgeholt[0].nachSiegen).toBeLessThanOrEqual(siegeBis(route, 'erforscht'));
    expect(praemien(state)).toEqual([`${route}:erforscht`, `${route}:gemeistert`]);
    expect(praemieAbholen(state, route, 'erforscht') + praemieAbholen(state, route, 'gemeistert')).toBe(0);
  });

  it('ohne Anspruch keine Prämie, auch nicht für fremde Seiten', () => {
    const state = createNewGameState();
    const gold = state.globalStock.gold;
    expect(praemieAbholen(state, 'forest_short', 'erforscht')).toBe(0);
    expect(praemieAbholen(state, 'gibt_es_nicht', 'erforscht')).toBe(0);
    expect(state.globalStock.gold).toBe(gold);
    expect(praemien(state)).toEqual([]);
  });

  it('N ist das mittlere Gold eines Siegs, auf 10 gerundet, mindestens 10', () => {
    for (const seite of seiten()) {
      let summe = 0;
      for (const enc of ROUTE_DEFS[seite.routeId].encounters) {
        for (const id of enc.enemies ?? []) {
          const g = LOOT_TABLE_DEFS[ENEMY_DEFS[id].lootTableId].guaranteedGold;
          summe += (g.min + g.max) / 2;
        }
      }
      expect(praemieGrundbetrag(seite.routeId)).toBe(Math.max(10, Math.round(summe / 10) * 10));
      expect(praemieBetrag(seite.routeId, 'gemeistert')).toBe(3 * praemieGrundbetrag(seite.routeId));
    }
  });
});

const ZAHLWORT: Record<string, number> = {
  zweite: 2, dritte: 3, vierte: 4, fünfte: 5, sechste: 6, siebte: 7, achte: 8, neunte: 9, zehnte: 10,
  zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
};

/**
 * Jede Takt-Angabe in Ottokars Notizen: der Text in der Notiz und die Runden, in denen der Gegner die
 * Fähigkeit im echten Kampf einsetzt (20 Runden, ohne ausgesetzten Zug). Eine zweite oder dritte
 * Fähigkeit wartet, solange eine frühere bereit ist (Rindenwall, Neuauflage).
 */
const TAKT: { routeId: string; gegner: string; faehigkeit: string; text: string; runden: number[] }[] = [
  { routeId: 'forest_medium', gegner: 'boss_elder_treant', faehigkeit: 'Rindenwall', text: 'zuerst in Runde 2 und danach nur alle acht Runden', runden: [2, 10, 18] },
  { routeId: 'haunted_woods', gegner: 'cursed_wisp', faehigkeit: 'Verbündete heilen', text: 'das Irrlicht jede vierte Runde', runden: [1, 5, 9, 13, 17] },
  { routeId: 'haunted_woods', gegner: 'forest_shaman', faehigkeit: 'Heilung', text: 'der Schamane jede fünfte', runden: [1, 6, 11, 16] },
  { routeId: 'ocean_shallows', gegner: 'jellyfish_swarm', faehigkeit: 'Stromtentakel', text: 'mit Stromtentakel jede dritte Runde', runden: [1, 4, 7, 10, 13, 16, 19] },
  { routeId: 'ocean_depths', gegner: 'boss_leviathan', faehigkeit: 'Tiefenstrahl', text: 'Tiefenstrahl trifft jede dritte Runde alle Helden', runden: [1, 4, 7, 10, 13, 16, 19] },
  { routeId: 'ocean_abyss', gegner: 'drowned_knight', faehigkeit: 'Rostiger Hieb', text: 'Rostiger Hieb kommt jede dritte Runde', runden: [1, 4, 7, 10, 13, 16, 19] },
  { routeId: 'swamp_long', gegner: 'bog_witch', faehigkeit: 'Dunkle Heilung', text: 'mit Dunkler Heilung jede vierte Runde', runden: [1, 5, 9, 13, 17] },
  { routeId: 'ruins_crypts', gegner: 'cursed_priest', faehigkeit: 'Dunkles Gebet', text: 'Priester heilt jede vierte Runde', runden: [1, 5, 9, 13, 17] },
  { routeId: 'ruins_depths', gegner: 'boss_shadow_lich', faehigkeit: 'Seelenraub', text: 'Seelenraub, der jede vierte Runde kommt', runden: [1, 5, 9, 13, 17] },
  { routeId: 'obsidian_tunnels', gegner: 'fire_bat', faehigkeit: 'Flammensturz', text: 'greift jede dritte Runde mit Flammensturz an', runden: [1, 4, 7, 10, 13, 16, 19] },
  { routeId: 'ash_wastes', gegner: 'magma_broodling', faehigkeit: 'Flammenaura', text: 'mit Flammenaura jede vierte Runde', runden: [1, 5, 9, 13, 17] },
  { routeId: 'magma_caverns', gegner: 'lava_elemental', faehigkeit: 'Magmawelle', text: 'Magmawelle trifft jede fünfte Runde', runden: [1, 6, 11, 16] },
  { routeId: 'volcano_core', gegner: 'boss_magma_wyrm', faehigkeit: 'Infernoodem', text: 'Infernoodem trifft jede dritte Runde', runden: [1, 4, 7, 10, 13, 16, 19] },
  { routeId: 'himmelsarchiv', gegner: 'boss_oberarchivar', faehigkeit: 'Neuauflage', text: 'nur in Runde 3 und 14', runden: [3, 14] },
];

describe('Ottokars Randnotizen', () => {
  it('jede Route der Karte hat genau eine Notiz, keine Notiz ohne Route', () => {
    const ids = MONSTERBUCH_NOTIZEN.map(n => n.routeId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(ROUTE_DEFS[id], id).toBeDefined();
    for (const n of DUNGEON_GRAPH) expect(ids, n.routeId).toContain(n.routeId);
  });

  it('jede Notiz nennt einen Gegner ihrer Seite beim Namen, 2 bis 3 Sätze, keine HTML-Zeichen, kein Eszett', () => {
    for (const notiz of MONSTERBUCH_NOTIZEN) {
      const namen = Object.keys(begegnungenJeLauf(notiz.routeId)).map(id => ENEMY_DEFS[id].name);
      expect(namen.some(name => notiz.text.includes(name)), notiz.routeId).toBe(true);
      expect(notiz.text).not.toMatch(/[ß<>"]/);
      const saetze = notiz.text.split(/[.!?](?:\s|$)/).filter(s => s.trim().length > 0).length;
      expect(saetze, notiz.routeId).toBeGreaterThanOrEqual(2);
      expect(saetze, notiz.routeId).toBeLessThanOrEqual(3);
    }
  });

  it('jede Takt-Angabe stimmt mit dem echten Kampf (Abklingzeit N: erst N + 1 Runden später wieder)', () => {
    for (const t of TAKT) {
      const name = `${t.routeId} ${t.faehigkeit}`;
      expect(MONSTERBUCH_NOTIZEN.find(n => n.routeId === t.routeId)?.text, name).toContain(t.text);
      expect(begegnungenJeLauf(t.routeId)[t.gegner], name).toBeGreaterThan(0);
      const i = ENEMY_DEFS[t.gegner].skills.findIndex(s => s.name === t.faehigkeit);
      expect(i, name).toBeGreaterThanOrEqual(0);
      expect(imKampf(t.gegner)[i].map(e => e.runde), name).toEqual(t.runden);
      // «jede vierte», «alle acht»: genau so weit liegen die Einsätze auseinander
      const abstand = ZAHLWORT[/(?:alle|jede)\s+(\S+)/.exec(t.text)?.[1] ?? ''];
      if (abstand) expect(new Set(t.runden.slice(1).map((r, k) => r - t.runden[k])), name).toEqual(new Set([abstand]));
    }
    // Keine Takt-Angabe in einer Notiz ohne Eintrag in TAKT
    const takt = new RegExp(`\\b(?:alle|jede)\\s+(?:${Object.keys(ZAHLWORT).join('|')})\\b`, 'g');
    for (const notiz of MONSTERBUCH_NOTIZEN) {
      for (const treffer of notiz.text.match(takt) ?? []) {
        expect(TAKT.some(t => t.routeId === notiz.routeId && t.text.includes(treffer)), `${notiz.routeId}: «${treffer}»`).toBe(true);
      }
    }
  });
});

describe('Monsterbuch-Bildschirm (HTML ohne Browser)', () => {
  it('genau die gewählte Seite ist gedrückt und ausgewählt, die Pfeile sperren am Buchende', async () => {
    const { seitenwahlHtml } = await import('../src/ui/screens/BestiariumScreen');
    const state = createNewGameState();
    const alle = seiten();
    alle.forEach((seite, i) => {
      // seiten() baut jedes Mal neue Objekte, wie im Bildschirm
      const html = seitenwahlHtml(state, seiten()[i]);
      expect([...html.matchAll(/data-seite="(\w+)" aria-pressed="true"/g)].map(m => m[1])).toEqual([seite.routeId]);
      expect([...html.matchAll(/aria-pressed="/g)].length).toBe(alle.length);
      expect([...html.matchAll(/<option value="(\w+)" selected>/g)].map(m => m[1])).toEqual([seite.routeId]);
      expect(html.includes('aria-label="Vorige Seite" disabled'), seite.routeId).toBe(i === 0);
      expect(html.includes('aria-label="Nächste Seite" disabled'), seite.routeId).toBe(i === alle.length - 1);
    });
  });

  it('Detailfenster: Fähigkeiten nach der Kampfregel, keine doppelten Bezeichnungen, Sonnenuhr bei Sunna', async () => {
    const { detailHtml } = await import('../src/ui/screens/BestiariumScreen');
    const state = createNewGameState();
    Object.assign(state.bestiarium, { strecke: Object.fromEntries(erreichbareGegner().map(id => [id, 30])) });
    for (const id of erreichbareGegner()) {
      const html = detailHtml(state, ENEMY_DEFS[id]);
      // Rolle unter dem Namen: keine Bezeichnung doppelt («💀 Boss · BOSS»)
      const rolle = /<div class="ms">([^<]*)<\/div>/.exec(html)?.[1] ?? '';
      const teile = rolle.split(' · ').map(t => t.replace(/^\P{L}+/u, '').toLowerCase());
      expect(teile[0], id).not.toBe('');
      expect(new Set(teile).size, `${id}: ${rolle}`).toBe(teile.length);
      for (const sk of ENEMY_DEFS[id].skills) {
        expect(html, id).toContain(faehigkeitText(id, sk));
        // Die alten Texte aus enemies.ts stehen nicht mehr im Fenster (ausser einer stimmt zufällig: «Heilt sich um 150»)
        for (const alt of [sk.description, ENEMY_LORE[id]?.skillDescriptions?.[sk.id]]) {
          if (alt && !faehigkeitText(id, sk).includes(alt)) expect(html, `${id} ${sk.name}`).not.toContain(alt);
        }
        if (FAEHIGKEIT_ART[sk.effectType] === sk.name) expect(html, id).not.toContain(`${sk.name} · Abklingzeit`);
      }
    }
    expect(detailHtml(state, ENEMY_DEFS.forest_shaman)).toContain('<span class="md-skill-cd">Abklingzeit 4 Runden</span>');
    expect(detailHtml(state, ENEMY_DEFS.forest_shaman)).toContain('Einsatz in Runde 1, 6, 11 …');
    expect(detailHtml(state, ENEMY_DEFS.boss_oberarchivar)).toContain('Einsatz in Runde 3 und 14.');
    // Im Belagerungsraum dauert der Kampf bis zu 30 Runden: nach Runde 17 kommt die Schutzbarriere noch einmal
    expect(detailHtml(state, ENEMY_DEFS.siege_mage)).toContain('Einsatz in Runde 2, 9, 17 …');
    expect(detailHtml(state, ENEMY_DEFS.boss_elder_treant)).toMatch(/<div class="ms">💀 Boss<\/div>/);
    expect(detailHtml(state, ENEMY_DEFS.boss_sunna)).toContain('Im Dungeon «Das Morgentor» können Wahlen unterwegs die Wut bis auf Runde 4 vorziehen.');
    expect(detailHtml(state, ENEMY_DEFS.boss_leviathan)).not.toContain('vorziehen');
  });
});

describe('Strecke lesen: bereinigt', () => {
  it('nur Gegner aus ENEMY_DEFS, nur ganze Zahlen ≥ 0, alte Stände zählen 1', () => {
    const state = createNewGameState();
    state.bestiarium.defeated = ['forest_bear', 'gibt_es_nicht'];
    // Wie aus einer Datei gelesen (JSON.parse legt «__proto__» als echten Schlüssel an)
    const roh = JSON.parse('{"forest_wolf":4.7,"forest_spider":-3,"forest_bandit":"viele","forest_wisp":null,'
      + '"gibt_es_nicht":9,"__proto__":5,"toString":2,"constructor":1}');
    Object.assign(state.bestiarium, { strecke: roh });
    expect(strecke(state)).toEqual({ forest_wolf: 4, forest_bear: 1 });
    expect(anzahlBesiegt(state, 'forest_bear')).toBe(1);
    Object.assign(state.bestiarium, { strecke: 'kaputt' });
    expect(strecke(state)).toEqual({ forest_bear: 1 });
  });
});

describe('Speichern', () => {
  afterEach(() => vi.unstubAllGlobals());

  function speicher(): Storage {
    const data = new Map<string, string>();
    return {
      get length() { return data.size; },
      clear: () => data.clear(),
      getItem: (key: string) => data.get(key) ?? null,
      key: (index: number) => [...data.keys()][index] ?? null,
      removeItem: (key: string) => { data.delete(key); },
      setItem: (key: string, value: string) => { data.set(key, String(value)); },
    };
  }

  it('die Strecke übersteht Speichern und Laden, auch als Spielstand-Datei', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state, ids } = neuesSpiel();
    lauf(state, ids, 'forest_short');
    const vorher = strecke(state);
    const save = new SaveSystem();
    expect(save.save(state)).toBe(true);
    const geladen = save.load()!;
    expect(strecke(geladen)).toEqual(vorher);
    expect(pruefeSpielstandText(JSON.stringify(state)).ok).toBe(true);
  });

  it('kaputte Werte in der Strecke werden nach dem Laden bereinigt', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state } = neuesSpiel();
    Object.assign(state.bestiarium, { strecke: { forest_wolf: 2.5, forest_bear: -1, unbekannt: 3 } });
    const save = new SaveSystem();
    save.save(state);
    expect(strecke(save.load()!)).toEqual({ forest_wolf: 2 });
  });

  it('Prämien überstehen Speichern und Laden, kaputte Einträge fallen weg', () => {
    vi.stubGlobal('localStorage', speicher());
    const { state } = neuesSpiel();
    Object.assign(state.bestiarium, { praemien: ['forest_short:erforscht'] });
    const save = new SaveSystem();
    save.save(state);
    expect(praemien(save.load()!)).toEqual(['forest_short:erforscht']);
    expect(pruefeSpielstandText(JSON.stringify(state)).ok).toBe(true);
    Object.assign(state.bestiarium, { praemien: ['forest_short:erforscht', 'a b', 5, null, 'forest_short:erforscht', 'x-y'] });
    expect(praemien(state)).toEqual(['forest_short:erforscht']);
    Object.assign(state.bestiarium, { praemien: 'kaputt' });
    expect(praemien(state)).toEqual([]);
  });

  it('jede erreichbare Gegner-ID ist ein sicherer Schlüssel für die Spielstand-Datei', () => {
    for (const id of Object.keys(ENEMY_DEFS)) expect(id).toMatch(/^[a-z0-9_]+$/);
  });
});
