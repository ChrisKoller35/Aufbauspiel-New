// Fundbuch (systems/Fundbuch.ts): Woher und Wofür, gegengeprüft mit den echten Daten und den
// echten Spielfunktionen (CombatEngine.rollLoot, EncounterProcessor, Musterläufe, Schmiede).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ROUTE_DEFS, isRouteAvailable } from '../src/data/routes';
import { ENEMY_DEFS } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { ITEM_DEFS } from '../src/data/items';
import { BUILDING_DEFS, BUILD_MENU_ORDER } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { STADTSTUFEN } from '../src/data/stadtstufen';
import { HAENDLER_WAREN, ankaufpreis, kaufpreis } from '../src/data/haendler';
import { CombatEngine } from '../src/systems/CombatEngine';
import { EncounterProcessor } from '../src/systems/EncounterProcessor';
import { ExpeditionSystem, MERCHANT_PRICES } from '../src/systems/ExpeditionSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { musterStand, spieleRoute, gewonnen, MusterTeamName } from '../src/systems/Musterlauf';
import { SeededRNG } from '../src/utils/RNG';
import { GearSystem } from '../src/systems/GearSystem';
import { EncounterRoom, ExpeditionRun } from '../src/models/ExpeditionRun';
import { createNewGameState } from '../src/models/GameState';
import { renderAufbauTab } from '../src/ui/screens/AufbauTab';
import { DUNGEON_SETS, setTeilIds } from '../src/data/dungeonSets';
import { MAX_SCHMIEDE_STUFE } from '../src/data/schmiede';
import { SPLITTER, einschmelzenErtrag, istSchmiedbar, schmiedeBeute, schmiedeKosten } from '../src/systems/Schmiede';
import {
  GRUPPEN_NAMEN, RAST_KRAEUTER, VERSTECK_CHANCE, beuteZiehungen, chanceInTabelle, dungeonBeute, fundbuchEintraege,
  fundorte, gegnerDerRoute, gruppeVon, prozentText, verwendung, zahlText,
} from '../src/systems/Fundbuch';

const ROUTEN = Object.values(ROUTE_DEFS);
const GEGNER_IN_ROUTEN = new Set(ROUTEN.flatMap(gegnerDerRoute));

afterEach(() => { vi.restoreAllMocks(); });

describe('Woher: Gegner und Dungeons', () => {
  it('nennt für jeden Gegenstand einer Beutetabelle jeden Gegner mit dieser Tabelle, der in einer Route steht', () => {
    for (const tabelle of Object.values(LOOT_TABLE_DEFS)) {
      const gegner = Object.values(ENEMY_DEFS).filter(e => e.lootTableId === tabelle.id && GEGNER_IN_ROUTEN.has(e.id));
      for (const eintrag of tabelle.entries) {
        if (eintrag.itemId === 'gold' || ITEM_DEFS[eintrag.itemId]?.tags.includes('set')) continue;
        const genannt = new Set(fundorte(eintrag.itemId).gegner.map(g => g.enemyId));
        for (const g of gegner) expect(genannt.has(g.id), `${eintrag.itemId} von ${g.id}`).toBe(true);
      }
    }
  });

  it('nennt keine Gegner, die in keiner Route stehen (z. B. thorn_sprite, boss_bandit_chief)', () => {
    expect(GEGNER_IN_ROUTEN.has('thorn_sprite')).toBe(false);
    expect(GEGNER_IN_ROUTEN.has('boss_bandit_chief')).toBe(false);
    for (const id of fundbuchEintraege()) {
      const f = fundorte(id);
      for (const g of [...f.gegner, ...f.dungeons.flatMap(d => d.gegner)]) {
        expect(GEGNER_IN_ROUTEN.has(g.enemyId), `${id}: ${g.enemyId}`).toBe(true);
      }
    }
  });

  it('Chance je Sieg stimmt mit 10 000 Ziehungen von rollLoot überein (höchstens 2 Prozentpunkte)', () => {
    const engine = new CombatEngine(new GearSystem());
    for (const tabelle of Object.values(LOOT_TABLE_DEFS)) {
      const rng = new SeededRNG(4242);
      const treffer: Record<string, number> = {};
      for (let i = 0; i < 10_000; i++) {
        const run = { loot: {} as Record<string, number>, goldEarned: 0, party: [] } as unknown as ExpeditionRun;
        engine.rollLoot(run, tabelle.id, rng);
        for (const itemId of Object.keys(run.loot)) treffer[itemId] = (treffer[itemId] ?? 0) + 1;
      }
      for (const e of tabelle.entries) {
        const erwartet = chanceInTabelle(tabelle, e.itemId);
        expect(Math.abs((treffer[e.itemId] ?? 0) / 10_000 - erwartet), `${tabelle.id} ${e.itemId}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('das Gewicht von «gold» zählt in der Summe, Gold selbst ist kein Eintrag', () => {
    const mitGold = Object.values(LOOT_TABLE_DEFS).find(t => t.entries.some(e => e.itemId === 'gold'));
    expect(fundbuchEintraege()).not.toContain('gold');
    if (mitGold) {
      const anderer = mitGold.entries.find(e => e.itemId !== 'gold')!;
      const summe = mitGold.entries.reduce((s, e) => s + e.weight, 0);
      expect(chanceInTabelle(mitGold, anderer.itemId)).toBeCloseTo(
        mitGold.entries.filter(e => e.itemId === anderer.itemId).reduce((s, e) => s + e.weight, 0) / summe);
    }
  });

  it('Dungeons sind nach Ø je Sieg sortiert, die Summe läuft über alle Gegner der Route', () => {
    const f = fundorte('iron_scrap');
    for (let i = 1; i < f.dungeons.length; i++) expect(f.dungeons[i - 1].jeSieg).toBeGreaterThanOrEqual(f.dungeons[i].jeSieg);
    for (const d of f.dungeons) {
      const summe = d.gegner.reduce((s, g) => {
        const t = LOOT_TABLE_DEFS[ENEMY_DEFS[g.enemyId].lootTableId];
        const mittel = t.entries.filter(e => e.itemId === 'iron_scrap')
          .reduce((m, e) => m + e.weight / t.entries.reduce((x, y) => x + y.weight, 0) * (e.minQty + e.maxQty) / 2, 0);
        return s + g.anzahl * mittel;
      }, 0);
      expect(d.jeSieg).toBeCloseTo(summe, 9);
    }
  });

  it('Händler der Stadt und Dungeon-Händler kommen aus den Datendateien', () => {
    for (const w of HAENDLER_WAREN) expect(fundorte(w.itemId).haendler).toBe(kaufpreis(w.itemId, 1));
    for (const [id, preis] of Object.entries(MERCHANT_PRICES)) expect(fundorte(id).dungeonHaendler?.preis).toBe(preis);
  });
});

describe('Woher: Fund-Räume', () => {
  it('«Versteck durchsuchen» bietet ein Fund-Raum ohne feste Wahl in einem von drei Besuchen an', () => {
    const route = ROUTEN.find(r => r.encounters.some(e => e.type === 'find' && !e.wahl && e.findItems?.length))!;
    const index = route.encounters.findIndex(e => e.type === 'find' && !e.wahl && e.findItems?.length);
    const vorlage = route.encounters[index];
    const processor = new EncounterProcessor();
    const rng = new SeededRNG(777);
    let angeboten = 0;
    const versuche = 30_000;
    for (let i = 0; i < versuche; i++) {
      const run = { routeId: route.id, combatLog: [] } as unknown as ExpeditionRun;
      const room = { index, type: 'find', findGold: vorlage.findGold, findItems: vorlage.findItems, enemies: [] } as unknown as EncounterRoom;
      processor.processFind(run, room, rng);
      if (run.pendingChoice?.optionB.itemId === vorlage.findItems![0].itemId) angeboten++;
    }
    expect(Math.abs(angeboten / versuche - VERSTECK_CHANCE)).toBeLessThanOrEqual(0.02);
  });

  it('nennt Fund-Räume und feste Wahl (Mondsilber im Mondhof, Sternenstahl erst nach dem Boss)', () => {
    for (const r of fundorte('mat_sternenstahl').fundRaeume) expect(r.nachSieg).toBe(true);
    expect(fundorte('mat_mondsilber').fundRaeume.some(r => r.art === 'fest' && !r.nachSieg)).toBe(true);
    expect(fundorte('old_coin').fundRaeume.every(r => r.art === 'zufall')).toBe(true);
  });
});

describe('Woher: Rastplätze (Grüne Kräuter)', () => {
  it('«Kräuter sammeln» bietet ein Rastplatz ohne feste Wahl in einem von drei Besuchen an, mit 2 Grünen Kräutern', () => {
    const route = ROUTEN.find(r => r.encounters.some(e => e.type === 'rest' && !e.wahl))!;
    const index = route.encounters.findIndex(e => e.type === 'rest' && !e.wahl);
    const processor = new EncounterProcessor();
    const rng = new SeededRNG(778);
    let angeboten = 0;
    let andereMenge = 0;
    const versuche = 30_000;
    for (let i = 0; i < versuche; i++) {
      const run = { routeId: route.id, combatLog: [], party: [] } as unknown as ExpeditionRun;
      const room = { index, type: 'rest', healPercent: route.encounters[index].healPercent, enemies: [] } as unknown as EncounterRoom;
      processor.processRest(run, room, rng);
      const b = run.pendingChoice?.optionB;
      if (b?.effect !== 'item' || b.itemId !== RAST_KRAEUTER.itemId) continue;
      angeboten++;
      if (b.value !== RAST_KRAEUTER.menge) andereMenge++;
    }
    expect(andereMenge).toBe(0);
    expect(Math.abs(angeboten / versuche - RAST_KRAEUTER.chance)).toBeLessThanOrEqual(0.02);
  });

  it('nennt bei jedem Eintrag genau die Rastplätze, an denen processRest ihn zufällig anbietet', () => {
    // Die Räume baut startExpedition wie im Spiel, jeder Rastplatz wird 60-mal mit processRest besucht. Kommt
    // ein Gegenstand dort manchmal und manchmal nicht, ist es die Zufallswahl (eine feste Wahl käme jedes Mal).
    const BESUCHE = 60;
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const processor = new EncounterProcessor();
    const erwartet: Record<string, string[]> = {};
    for (const route of ROUTEN) {
      const { state, ids } = musterStand('frisch', 1);
      const run = system.startExpedition(state, route.id, ids)!;
      for (const room of run.rooms.filter(r => r.type === 'rest')) {
        const angeboten: Record<string, number> = {};
        for (let i = 0; i < BESUCHE; i++) {
          processor.processRest(run, room, new SeededRNG(1000 + i));
          const b = run.pendingChoice?.optionB;
          if (b?.effect === 'item' && b.itemId) angeboten[b.itemId] = (angeboten[b.itemId] ?? 0) + 1;
        }
        for (const [itemId, n] of Object.entries(angeboten)) {
          if (n < BESUCHE) (erwartet[itemId] ??= []).push(`${route.id} #${room.index + 1}`);
        }
      }
    }
    // Zurzeit bietet ein Rastplatz nur «Kräuter sammeln» als Gegenstand an
    expect(Object.keys(erwartet)).toEqual([RAST_KRAEUTER.itemId]);
    for (const id of fundbuchEintraege()) {
      expect(fundorte(id).rastplaetze.map(r => `${r.routeId} #${r.raum}`), id).toEqual(erwartet[id] ?? []);
    }
  });
});

describe('Schmiede-Material (Mondsilber, Sternenstahl und die anderen zehn)', () => {
  it('Woher: jeder Sieg bringt so viel, wie schmiedeBeute in die Truhe legt; jedes solche Material ist ein Eintrag', () => {
    const erwartet: Record<string, Record<string, number>> = {};
    for (const route of ROUTEN) {
      const beute = schmiedeBeute({ routeId: route.id, status: 'victory', rooms: [], loot: {} } as unknown as ExpeditionRun);
      if (beute) (erwartet[beute.itemId] ??= {})[route.id] = beute.menge;
    }
    const eintraege = fundbuchEintraege();
    expect(Object.keys(erwartet).length).toBeGreaterThan(0);
    for (const id of Object.keys(erwartet)) {
      expect(eintraege, id).toContain(id);
      expect(gruppeVon(id), id).toBe('material');
    }
    for (const id of eintraege) {
      const genannt = Object.fromEntries(fundorte(id).jedenSieg.map(s => [s.routeId, s.menge]));
      expect(genannt, id).toEqual(erwartet[id] ?? {});
    }
    // Die Hauptquelle fehlte bis 23.10.2026: Mondsilber und Sternenstahl standen nur mit ihren Fund-Räumen da
    expect(fundorte('mat_sternenstahl').jedenSieg.map(s => s.routeId).sort()).toEqual(['sternenschlund', 'sternenschmiede']);
    expect(fundorte('mat_mondsilber').jedenSieg.map(s => s.routeId).sort()).toEqual(['mondhof', 'morgentor']);
  });

  it('Woher: Einschmelzen nennt genau die Sets, deren Teile das Material bringen, mit der Menge der Schmiede', () => {
    // Erwartung aus einschmelzenErtrag jedes Teils jedes Sets (das Fundbuch fragt nur das erste Teil eines Sets)
    const erwartet: Record<string, Record<string, number>> = {};
    for (const set of DUNGEON_SETS) {
      for (const teil of setTeilIds(set)) {
        const ertrag = einschmelzenErtrag(teil);
        if (!ertrag) continue;
        const proSet = (erwartet[ertrag.material.id] ??= {});
        expect(proSet[set.routeId] ?? ertrag.menge, `${teil} bringt so viel wie die anderen Teile seines Sets`).toBe(ertrag.menge);
        proSet[set.routeId] = ertrag.menge;
      }
    }
    expect(Object.keys(erwartet).length).toBeGreaterThan(0);
    const eintraege = fundbuchEintraege();
    for (const id of Object.keys(erwartet)) expect(eintraege, id).toContain(id);
    for (const id of eintraege) {
      expect(Object.fromEntries(fundorte(id).einschmelzen.map(e => [e.routeId, e.menge])), id).toEqual(erwartet[id] ?? {});
    }
  });

  it('Wofür: Material und Kristallsplitter je Stufe wie schmiedeKosten (statt «Die Stadt verbraucht das nicht»)', () => {
    const state = createNewGameState();
    let geprueft = 0;
    for (const set of DUNGEON_SETS) {
      for (const teil of setTeilIds(set).filter(istSchmiedbar)) {
        for (let stufe = 0; stufe < MAX_SCHMIEDE_STUFE; stufe++) {
          state.schmiede = { stufen: { [teil]: stufe } };
          const kosten = schmiedeKosten(state, teil)!;
          const material = verwendung(kosten.material.id).schmiede.find(s => s.routeId === set.routeId);
          expect(material?.mengen[stufe], `${teil} auf +${stufe + 1}`).toBe(kosten.menge);
          const splitter = verwendung(SPLITTER).schmiede.find(s => s.routeId === null);
          expect(splitter?.mengen[stufe] ?? 0, `Splitter für ${teil} auf +${stufe + 1}`).toBe(kosten.splitter);
          geprueft++;
        }
      }
    }
    expect(geprueft).toBeGreaterThan(0);
    for (const id of ['mat_mondsilber', 'mat_sternenstahl']) expect(verwendung(id).schmiede.length, id).toBeGreaterThan(0);
  });
});

describe('Woher: Ø je Sieg gegen echte Läufe', () => {
  // Drei Dungeons verschiedener Stufen, je mit einem Musterteam, das sie sicher genug schafft
  const DUNGEONS: { routeId: string; team: MusterTeamName }[] = [
    { routeId: 'forest_short', team: 'frisch' },
    { routeId: 'swamp_long', team: 'gut' },
    { routeId: 'volcano_core', team: 'stark' },
  ];

  /** Spielt Läufe mit festen Startwerten und hält jeden Aufruf von rollLoot fest (Tabelle, Beute-Zuwachs). */
  function siegeMitBeute(routeId: string, team: MusterTeamName, siege: number) {
    const original = CombatEngine.prototype.rollLoot;
    let aufrufe: { tabelle: string; zuwachs: Record<string, number> }[] = [];
    vi.spyOn(CombatEngine.prototype, 'rollLoot').mockImplementation(function (this: CombatEngine, run, tabelle, rng) {
      const vorher = { ...run.loot };
      original.call(this, run, tabelle, rng);
      const zuwachs: Record<string, number> = {};
      for (const [id, n] of Object.entries(run.loot)) if (n !== (vorher[id] ?? 0)) zuwachs[id] = n - (vorher[id] ?? 0);
      aufrufe.push({ tabelle, zuwachs });
    });
    const laeufe: { aufrufe: typeof aufrufe }[] = [];
    for (let i = 1; laeufe.length < siege && i <= siege * 4; i++) {
      aufrufe = [];
      const { state, ids } = musterStand(team, i * 7919);
      const run = spieleRoute(state, ids, routeId, 'vorsichtig');
      if (gewonnen(run) && run.rooms.every(r => r.enemies.every(e => e.hp <= 0))) laeufe.push({ aufrufe });
    }
    return laeufe;
  }

  it.each(DUNGEONS)('$routeId: je Sieg würfelt rollLoot so oft je Tabelle, wie das Fundbuch Gegner zählt', ({ routeId, team }) => {
    const laeufe = siegeMitBeute(routeId, team, 10);
    expect(laeufe.length).toBe(10);
    const erwartet = beuteZiehungen(routeId);
    for (const lauf of laeufe) {
      const gezaehlt: Record<string, number> = {};
      for (const a of lauf.aufrufe) gezaehlt[a.tabelle] = (gezaehlt[a.tabelle] ?? 0) + 1;
      expect(gezaehlt).toEqual(erwartet);
    }
  });

  it.each(DUNGEONS)('$routeId: 200 Siege bringen im Mittel, was das Fundbuch als Ø je Sieg nennt', ({ routeId, team }) => {
    const laeufe = siegeMitBeute(routeId, team, 200);
    expect(laeufe.length).toBe(200);
    const summe: Record<string, number> = {};
    for (const lauf of laeufe) {
      for (const a of lauf.aufrufe) for (const [id, n] of Object.entries(a.zuwachs)) summe[id] = (summe[id] ?? 0) + n;
    }
    for (const { itemId, jeSieg } of dungeonBeute(routeId)) {
      const maxQty = Math.max(...gegnerDerRoute(ROUTE_DEFS[routeId])
        .flatMap(g => LOOT_TABLE_DEFS[ENEMY_DEFS[g].lootTableId]?.entries ?? [])
        .filter(e => e.itemId === itemId).map(e => e.maxQty));
      const grenze = 4 * Math.sqrt(200 * jeSieg * maxQty) + 2;
      expect(Math.abs((summe[itemId] ?? 0) - 200 * jeSieg), `${routeId} ${itemId}`).toBeLessThanOrEqual(grenze);
    }
  }, 120_000);
});

describe('Ohne Baupläne (seit 23.10.2026)', () => {
  it('das Fundbuch führt keine Baupläne mehr, auch nicht als Gruppe', () => {
    expect(fundbuchEintraege().filter(id => id.startsWith('bauplan_'))).toEqual([]);
    expect(Object.keys(GRUPPEN_NAMEN)).not.toContain('bauplan');
  });

  it('jede Beute in den Baukosten steht unter «Wofür» bei ihrem Gebäude', () => {
    for (const id of BUILD_MENU_ORDER) {
      for (const [itemId, menge] of Object.entries(BUILDING_DEFS[id].buildCost)) {
        if (itemId === 'gold') continue;
        expect(verwendung(itemId).bau.find(b => b.buildingId === id)?.menge, `${id}: ${itemId}`).toBe(menge);
      }
    }
  });

  it('der Reiter «Aufbau» hat keinen «Wo?»-Knopf mehr', () => {
    const html = renderAufbauTab(createNewGameState(), () => '');
    expect(html).not.toContain('acard-wo');
    expect(html).not.toContain('Bauplan');
  });
});

describe('Wofür', () => {
  it('findet jede Zutat jedes Rezepts und jede Abgabe der Stadtstufen', () => {
    for (const r of Object.values(RECIPE_DEFS)) {
      for (const [id, menge] of Object.entries(r.inputs)) {
        expect(verwendung(id).rezepte.find(x => x.recipeId === r.id)?.menge, `${r.id} ${id}`).toBe(menge);
      }
    }
    for (const s of STADTSTUFEN) {
      for (const [id, menge] of Object.entries(s.abgabe)) {
        expect(verwendung(id).abgaben.find(a => a.stufe === s.stufe)?.menge, `Stufe ${s.stufe} ${id}`).toBe(menge);
      }
    }
  });

  it('Ankauf, Proviant, Bau- und Ausbau-Kosten', () => {
    expect(verwendung('iron_scrap').ankauf).toBe(ankaufpreis('iron_scrap'));
    expect(verwendung('bread').proviant).toBe(true);
    expect(verwendung('crystal_shard').bau.map(b => b.buildingId)).toContain('ARCANE_SMITHY');
    expect(verwendung('iron_scrap').ausbau.some(a => a.buildingId === 'SMITHY' && a.stufe === 2)).toBe(true);
  });
});

describe('Einträge', () => {
  it('keine Set-Teile der Dungeon-Sets (Tag set), aber die Abyssal-Teile (Tag abyssal_set)', () => {
    const eintraege = fundbuchEintraege();
    expect(eintraege.some(id => ITEM_DEFS[id].tags.includes('set'))).toBe(false);
    const abyssal = Object.values(ITEM_DEFS).filter(d => d.tags.includes('abyssal_set')).map(d => d.id);
    expect(abyssal.length).toBeGreaterThan(0);
    for (const id of abyssal) expect(eintraege, id).toContain(id);
  });

  it('jeder Eintrag hat mindestens eine Quelle und eine Gruppe', () => {
    for (const id of fundbuchEintraege()) {
      const f = fundorte(id);
      const quellen = f.dungeons.length + f.fundRaeume.length + f.ersterSieg.length + f.hergestellt.length
        + f.jedenSieg.length + f.einschmelzen.length + f.rastplaetze.length + (f.haendler ? 1 : 0) + (f.dungeonHaendler ? 1 : 0);
      expect(quellen, id).toBeGreaterThan(0);
      expect(gruppeVon(id)).toBeTruthy();
    }
    expect(gruppeVon('crystal_shard')).toBe('material');
    expect(gruppeVon('bread')).toBe('verbrauch');
  });

  it('das Fenster lädt ohne Browser (greift erst beim Öffnen auf document zu)', async () => {
    expect(typeof document).toBe('undefined');
    const modul = await import('../src/ui/components/FundbuchFenster');
    expect(typeof modul.oeffneFundbuch).toBe('function');
  });

  it('Zahlen mit Komma, vor «%» ein geschütztes Leerzeichen', () => {
    expect(prozentText(0.35)).toBe('35\u00a0%');
    expect(prozentText(0.004)).toBe('0,4\u00a0%');
    expect(zahlText(1.4)).toBe('1,4');
    expect(zahlText(2)).toBe('2');
    expect(zahlText(0.05)).toBe('0,05');
  });
});

describe('Fenster (HTML ohne Browser)', () => {
  it('Woher: je Dungeon eine Kopfzeile mit Link und Ø, seine Gegner darunter ohne eigenen Link und ohne Ø', async () => {
    const { itemSeite } = await import('../src/ui/components/FundbuchFenster');
    const f = fundorte('iron_scrap');
    const woher = itemSeite('iron_scrap', createNewGameState()).split('Wofür')[0];
    const listen = [...woher.matchAll(/<ul class="fb-gegner">(.*?)<\/ul>/g)].map(m => m[1]);
    expect(listen.length).toBe(f.dungeons.length);
    listen.forEach((liste, i) => {
      expect(liste, f.dungeons[i].routeId).not.toContain('data-route');
      expect((liste.match(/<li>/g) ?? []).length, f.dungeons[i].routeId).toBe(f.dungeons[i].gegner.length);
      // Kein «Ø … je Sieg in ‹Dungeon›» je Gegner: Das Ø steht nur einmal, in der Kopfzeile darüber
      expect(liste, f.dungeons[i].routeId).not.toContain('Ø');
    });
    // Die Kopfzeile eines Dungeons: vom letzten «<li>» vor seiner Gegnerliste bis zu ihr
    const kopfzeilen = woher.split('<ul class="fb-gegner">').slice(0, -1).map(t => t.slice(t.lastIndexOf('<li>') + '<li>'.length));
    expect(kopfzeilen.length).toBe(f.dungeons.length);
    kopfzeilen.forEach((kopf, i) => {
      expect(kopf, f.dungeons[i].routeId).toContain(`data-route="${f.dungeons[i].routeId}"`);
      expect(kopf.split('Ø').length - 1, f.dungeons[i].routeId).toBe(1);
    });
    expect(woher.split('Ø').length - 1).toBe(f.dungeons.length);
    // Ein Link je Dungeon-Zeile und je weiterer Quelle, nicht einer je Gegner wie in der Zeilenform
    const links = (woher.match(/data-route="/g) ?? []).length;
    expect(links).toBe(f.dungeons.length + f.fundRaeume.length + f.ersterSieg.length + f.jedenSieg.length + f.einschmelzen.length);
    expect(f.dungeons.reduce((n, d) => n + d.gegner.length, 0)).toBeGreaterThan(2 * f.dungeons.length);
  });

  it('Zahl und Einheit bleiben zusammen: geschütztes Leerzeichen vor «Stück» und «Gold», Wortverbinder nach «–»', async () => {
    const { itemSeite } = await import('../src/ui/components/FundbuchFenster');
    const stand = createNewGameState();
    let stellen = 0;
    for (const id of fundbuchEintraege()) {
      // Nur der Text, ohne Tags und Attribute
      const text = itemSeite(id, stand).replace(/<[^>]*>/g, '');
      expect(text.match(/\d[ \n](Stück|Gold)/g), id).toBeNull();
      expect(text.match(/\d–\d/g), id).toBeNull();
      stellen += (text.match(/\d\u00a0(Stück|Gold)/g) ?? []).length;
    }
    expect(stellen).toBeGreaterThan(1000);
    expect(itemSeite('iron_scrap', stand)).toContain('2–\u20605\u00a0Stück');
  });

  it('Händler der Stadt: der Preis der eigenen Stadtstufe (ab Stufe 4 mit Rabatt)', async () => {
    const { itemSeite } = await import('../src/ui/components/FundbuchFenster');
    const stand = createNewGameState();
    expect(itemSeite('healing_potion', stand)).toContain(`Beim Händler der Stadt · ${kaufpreis('healing_potion', 1)}\u00a0Gold`);
    const stufe4 = { ...stand, stadtweg: { stufe: 4, herzsteine: [], gelesen: 0 } };
    expect(kaufpreis('healing_potion', 4)).toBeLessThan(kaufpreis('healing_potion', 1));
    expect(itemSeite('healing_potion', stufe4)).toContain(`Beim Händler der Stadt · ${kaufpreis('healing_potion', 4)}\u00a0Gold`);
  });

  describe('ohne Wunsch öffnet es beim ersten Eintrag der Liste, den die Gilde schon bekommen kann', () => {
    type Stand = ReturnType<typeof createNewGameState>;
    /** Die Reihe der Liste: Gruppen wie GRUPPEN_NAMEN, in der Gruppe wie fundbuchEintraege */
    const reihe = () => (Object.keys(GRUPPEN_NAMEN) as (keyof typeof GRUPPEN_NAMEN)[])
      .flatMap(g => fundbuchEintraege().filter(id => gruppeVon(id) === g));
    /** Zählt: Händler der Stadt und Quellen in offenen Dungeons. Nicht: Werkstätten, Dungeon-Händler, Einschmelzen. */
    const erreichbar = (id: string, stand: Stand) => {
      const f = fundorte(id);
      const offen = (q: { routeId: string }) => isRouteAvailable(ROUTE_DEFS[q.routeId], stand);
      return !!f.haendler || [...f.dungeons, ...f.fundRaeume, ...f.ersterSieg, ...f.jedenSieg, ...f.rastplaetze].some(offen);
    };
    /** Der Start ist erreichbar, und alles davor in der Liste ist es nicht */
    const pruefeErsten = (start: string, stand: Stand) => {
      const i = reihe().indexOf(start);
      expect(i, start).toBeGreaterThanOrEqual(0);
      expect(erreichbar(start, stand), start).toBe(true);
      for (const id of reihe().slice(0, i)) expect(erreichbar(id, stand), `${id} steht vor ${start}`).toBe(false);
    };

    it('neues Spiel: Eisenschrott (vor ihm nur Material aus gesperrten Dungeons)', async () => {
      const { startEintrag } = await import('../src/ui/components/FundbuchFenster');
      const stand = createNewGameState();
      // Die Liste beginnt mit den Schmiede-Materialien Drachenschuppe und Eisblüte aus gesperrten Dungeons
      expect(reihe().slice(0, 3)).toEqual(['mat_drachenschuppe', 'mat_eisbluete', 'iron_scrap']);
      expect(startEintrag(stand)).toBe('iron_scrap');
      pruefeErsten('iron_scrap', stand);
      // Mit Wunsch genau der; ein unbekannter Wunsch fällt auf den Start zurück
      expect(startEintrag(stand, 'mat_drachenschuppe')).toBe('mat_drachenschuppe');
      expect(startEintrag(stand, 'gibt_es_nicht')).toBe('iron_scrap');
    });

    it('der Dungeon-Händler zählt nicht: Böte er Drachenschuppe an, bliebe es Eisenschrott', async () => {
      const { startEintrag } = await import('../src/ui/components/FundbuchFenster');
      // Zurzeit führt er nur Brot, Heiltrank und Kraft-Brot (die ersten beiden hat auch der Händler der Stadt)
      expect(Object.keys(MERCHANT_PRICES).sort()).toEqual(['bread', 'healing_potion', 'power_bread']);
      MERCHANT_PRICES.mat_drachenschuppe = 5;
      try {
        expect(fundorte('mat_drachenschuppe').dungeonHaendler).not.toBeNull();
        expect(startEintrag(createNewGameState())).toBe('iron_scrap');
      } finally {
        delete MERCHANT_PRICES.mat_drachenschuppe;
      }
    });

    it('alle Dungeons offen: der erste Eintrag der Liste', async () => {
      const { startEintrag } = await import('../src/ui/components/FundbuchFenster');
      const neu = createNewGameState();
      const bosse = ROUTEN.flatMap(r => r.unlockCondition?.bossesDefeated ?? []);
      const stand = { ...neu, guildStats: { ...neu.guildStats, rank: 99, bossesDefeatedIds: bosse } };
      expect(ROUTEN.every(r => isRouteAvailable(r, stand))).toBe(true);
      expect(startEintrag(stand)).toBe(reihe()[0]);
      expect(ITEM_DEFS[reihe()[0]].name).toBe('Drachenschuppe');
    });

    it('Händlerware zählt: Sind alle Dungeons zu, ist es die erste Ware des Händlers in der Liste (Brot)', async () => {
      const { startEintrag } = await import('../src/ui/components/FundbuchFenster');
      const neu = createNewGameState();
      // Künstlich (Gildenrang 0; im Spiel ist der Waldpfad immer offen): So entscheidet allein der Händler der Stadt.
      // Vor Brot stehen Drachenschuppe (nur Einschmelzen) und Magitech-Komponente (Werkstatt): Die zählen nicht
      const stand = { ...neu, guildStats: { ...neu.guildStats, rank: 0 } };
      expect(ROUTEN.some(r => isRouteAvailable(r, stand))).toBe(false);
      expect(fundorte('mat_drachenschuppe').einschmelzen.length).toBeGreaterThan(0);
      expect(fundorte('magitech_component').hergestellt.length).toBeGreaterThan(0);
      expect(reihe().indexOf('magitech_component')).toBeLessThan(reihe().indexOf('bread'));
      const start = startEintrag(stand);
      expect(start).toBe('bread');
      expect(fundorte('bread').haendler).toBeGreaterThan(0);
      pruefeErsten('bread', stand);
    });
  });
});
