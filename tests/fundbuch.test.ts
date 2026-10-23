// Fundbuch (systems/Fundbuch.ts): Woher und Wofür, gegengeprüft mit den echten Daten und den
// echten Spielfunktionen (CombatEngine.rollLoot, EncounterProcessor, Musterläufe).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { ENEMY_DEFS } from '../src/data/enemies';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import { ITEM_DEFS } from '../src/data/items';
import { BUILDING_DEFS } from '../src/data/buildings';
import { RECIPE_DEFS } from '../src/data/recipes';
import { STADTSTUFEN } from '../src/data/stadtstufen';
import { BAUPLAN_PREISE, HAENDLER_WAREN, ankaufpreis, kaufpreis } from '../src/data/haendler';
import { CombatEngine } from '../src/systems/CombatEngine';
import { EncounterProcessor } from '../src/systems/EncounterProcessor';
import { MERCHANT_PRICES } from '../src/systems/ExpeditionSystem';
import { musterStand, spieleRoute, gewonnen, MusterTeamName } from '../src/systems/Musterlauf';
import { SeededRNG } from '../src/utils/RNG';
import { GearSystem } from '../src/systems/GearSystem';
import { EncounterRoom, ExpeditionRun } from '../src/models/ExpeditionRun';
import {
  VERSTECK_CHANCE, beuteZiehungen, chanceInTabelle, dungeonBeute, fundbuchEintraege, fundorte, gegnerDerRoute,
  gruppeVon, prozentText, verwendung, zahlText,
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

  it('Händler der Stadt, Dungeon-Händler und Baupläne kommen aus den Datendateien', () => {
    for (const w of HAENDLER_WAREN) expect(fundorte(w.itemId).haendler).toBe(kaufpreis(w.itemId, 1));
    for (const [id, preis] of Object.entries(MERCHANT_PRICES)) expect(fundorte(id).dungeonHaendler?.preis).toBe(preis);
    for (const id of Object.keys(BAUPLAN_PREISE)) expect(fundorte(id).bauplan?.haendlerPreis).toBe(BAUPLAN_PREISE[id]);
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

describe('Baupläne', () => {
  it('jeder Bauplan, den ein Gebäude braucht, hat eine Quelle (Händler oder Boss)', () => {
    for (const def of Object.values(BUILDING_DEFS)) {
      const bauplan = def.freischaltung.bauplan;
      if (!bauplan) continue;
      const q = fundorte(bauplan).bauplan;
      expect(q && (q.haendlerPreis !== null || q.boss !== null), `${def.name}: ${bauplan}`).toBeTruthy();
      expect(verwendung(bauplan).schaltetFrei?.buildingId).toBe(def.id);
    }
  });

  it('Boss-Baupläne nennen den Boss aus ENEMY_DEFS und seine Route', () => {
    for (const t of Object.values(LOOT_TABLE_DEFS)) {
      if (!t.ersterSiegBauplan) continue;
      const boss = fundorte(t.ersterSiegBauplan).bauplan?.boss;
      expect(boss).toBeTruthy();
      expect(ENEMY_DEFS[boss!.enemyId].lootTableId).toBe(t.id);
      expect(ROUTE_DEFS[boss!.routeId].bossId).toBe(boss!.enemyId);
    }
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
        + (f.bauplan ? 1 : 0) + (f.haendler ? 1 : 0) + (f.dungeonHaendler ? 1 : 0);
      expect(quellen, id).toBeGreaterThan(0);
      expect(gruppeVon(id)).toBeTruthy();
    }
    expect(gruppeVon('crystal_shard')).toBe('material');
    expect(gruppeVon('bauplan_schmiede')).toBe('bauplan');
  });

  it('das Fenster lädt ohne Browser (greift erst beim Öffnen auf document zu)', async () => {
    expect(typeof document).toBe('undefined');
    const modul = await import('../src/ui/components/FundbuchFenster');
    expect(typeof modul.oeffneFundbuch).toBe('function');
  });

  it('Zahlen mit Komma', () => {
    expect(prozentText(0.35)).toBe('35 %');
    expect(prozentText(0.004)).toBe('0,4 %');
    expect(zahlText(1.4)).toBe('1,4');
    expect(zahlText(2)).toBe('2');
    expect(zahlText(0.05)).toBe('0,05');
  });
});
