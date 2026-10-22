import { describe, expect, it } from 'vitest';
import { RECIPE_DEFS } from './recipes';
import { BUILDING_DEFS } from './buildings';
import { LOOT_TABLE_DEFS } from './lootTables';
import { ENEMY_DEFS } from './enemies';
import { ROUTE_DEFS } from './routes';
import { ITEM_DEFS, PROVISION_ITEMS } from './items';
import { HAENDLER_WAREN } from './haendler';
import { HERZSTEINE, STADTSTUFEN } from './stadtstufen';
import { BUILDING_UPGRADE_DEFS } from './buildingUpgrades';

/** Rezepte, die in mindestens einem Gebäude stehen (nur die kann man herstellen). */
const BAUBARE_REZEPTE = Object.values(RECIPE_DEFS)
  .filter(r => Object.values(BUILDING_DEFS).some(b => b.recipes.includes(r.id)));

/** Was es in der Gildenstadt nicht mehr gibt (docs/GILDENSTADT.md). */
const WEG = ['wood', 'stone', 'grain', 'flour', 'water'];

/** Beutetabellen, die tatsächlich fallen: Gegner, der auf einer Route vorkommt. */
function genutzteBeutetabellen(): Set<string> {
  const tabellen = new Set<string>();
  for (const route of Object.values(ROUTE_DEFS)) {
    for (const enc of route.encounters) {
      for (const eid of enc.enemies ?? []) {
        const tid = ENEMY_DEFS[eid]?.lootTableId;
        if (tid) tabellen.add(tid);
      }
    }
  }
  return tabellen;
}

/** Alles, was ein Spieler bekommen kann: Beute und Gold, Waren des Händlers, dann Rezepte bis nichts Neues dazukommt. */
function erreichbareItems(): Set<string> {
  const items = new Set<string>(['gold']);
  for (const tid of genutzteBeutetabellen()) {
    for (const e of LOOT_TABLE_DEFS[tid]?.entries ?? []) items.add(e.itemId);
  }
  for (const w of HAENDLER_WAREN) items.add(w.itemId);
  let neu = true;
  while (neu) {
    neu = false;
    for (const r of BAUBARE_REZEPTE) {
      if (!Object.keys(r.inputs).every(i => items.has(i))) continue;
      for (const out of Object.keys(r.outputs)) {
        if (!items.has(out)) { items.add(out); neu = true; }
      }
    }
  }
  return items;
}

/** Erwartete Menge eines Items pro Lauf einer Route (jede Beutetabelle würfelt einmal pro besiegtem Gegner). */
function erwartetProLauf(routeId: string, itemId: string): number {
  let summe = 0;
  for (const enc of ROUTE_DEFS[routeId].encounters) {
    for (const eid of enc.enemies ?? []) {
      const table = LOOT_TABLE_DEFS[ENEMY_DEFS[eid].lootTableId];
      const gesamt = table.entries.reduce((s, e) => s + e.weight, 0);
      for (const e of table.entries) {
        if (e.itemId === itemId) summe += (e.weight / gesamt) * (e.minQty + e.maxQty) / 2;
      }
    }
  }
  return summe;
}

describe('Zutaten sind erreichbar', () => {
  it('jede Zutat eines baubaren Rezepts kommt aus Beute, vom Händler oder aus einem Rezept', () => {
    const erreichbar = erreichbareItems();
    for (const r of BAUBARE_REZEPTE) {
      for (const zutat of Object.keys(r.inputs)) {
        expect(erreichbar.has(zutat), `${r.id} braucht ${zutat}, das nie zu bekommen ist`).toBe(true);
      }
    }
  });

  it('jedes baubare Rezept lässt sich herstellen', () => {
    const erreichbar = erreichbareItems();
    for (const r of BAUBARE_REZEPTE) {
      for (const out of Object.keys(r.outputs)) expect(erreichbar.has(out), r.id).toBe(true);
    }
  });

  it('kein Rezept, Bau, Ausbau, Herzstein oder Stadtaufstieg braucht Holz, Stein, Getreide, Mehl oder Wasser', () => {
    for (const id of WEG) expect(ITEM_DEFS[id], id).toBeUndefined();
    const kosten: [string, Record<string, number>][] = [
      ...Object.values(RECIPE_DEFS).map((r): [string, Record<string, number>] => [r.id, r.inputs]),
      ...Object.values(BUILDING_DEFS).map((b): [string, Record<string, number>] => [b.id, b.buildCost]),
      ...Object.values(BUILDING_UPGRADE_DEFS).map((u): [string, Record<string, number>] => [u.id, u.cost]),
      ...HERZSTEINE.map((h): [string, Record<string, number>] => [h.id, h.kosten]),
      ...STADTSTUFEN.map((s): [string, Record<string, number>] => [`Stufe ${s.stufe} Abgabe`, s.abgabe]),
      ...STADTSTUFEN.map((s): [string, Record<string, number>] => [`Stufe ${s.stufe} Geschenk`, s.geschenk]),
    ];
    for (const [wer, was] of kosten) {
      for (const res of Object.keys(was)) {
        expect(ITEM_DEFS[res], `${wer}: ${res}`).toBeDefined();
        expect(WEG, `${wer} braucht ${res}`).not.toContain(res);
      }
    }
  });

  it('Beutetabellen und Gegner verweisen nur auf existierende Einträge', () => {
    for (const table of Object.values(LOOT_TABLE_DEFS)) {
      for (const e of table.entries) {
        if (e.itemId === 'gold') continue;
        expect(ITEM_DEFS[e.itemId], `${table.id}: ${e.itemId}`).toBeDefined();
      }
      if (table.ersterSiegBauplan) expect(ITEM_DEFS[table.ersterSiegBauplan]?.tags, table.id).toContain('bauplan');
    }
    for (const enemy of Object.values(ENEMY_DEFS)) {
      expect(LOOT_TABLE_DEFS[enemy.lootTableId], `${enemy.id}: ${enemy.lootTableId}`).toBeDefined();
    }
  });

  it('jedes seltene Kraut fällt in seinem Gebiet', () => {
    const gebiete: Record<string, string> = {
      herb_fire_root: 'obsidian_tunnels',
      herb_shimmer_shroom: 'cave_deep',
      herb_swamp_blossom: 'swamp_village',
      herb_bone_dust: 'ruins_crypts',
      herb_moonwort: 'haunted_woods',
    };
    for (const [kraut, route] of Object.entries(gebiete)) {
      expect(erwartetProLauf(route, kraut), `${kraut} in ${route}`).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('Eisenschrott (die Eisenmine ist weg, docs/GILDENSTADT.md)', () => {
  it('fällt schon auf dem Waldpfad: ein Eisenschwert (2 Eisenschrott) nach einem Lauf', () => {
    expect(erwartetProLauf('forest_short', 'iron_scrap')).toBeGreaterThanOrEqual(2);
  });

  it('Höhlen und Ruinen liefern je Lauf genug für den Ausbau der Schmiede auf Stufe 2 (10 Eisenschrott) in zwei Läufen', () => {
    expect(erwartetProLauf('cave_deep', 'iron_scrap') + erwartetProLauf('ruins_crypts', 'iron_scrap')).toBeGreaterThanOrEqual(10);
  });
});

describe('Vorräte', () => {
  it('jeder Vorrat ist ein Verbrauchsgut mit Wirkung und Wirkungstext', () => {
    for (const id of PROVISION_ITEMS) {
      const def = ITEM_DEFS[id];
      expect(def, id).toBeDefined();
      expect(def.type, id).toBe('consumable');
      expect(def.tags, id).toContain('provision');
      expect(def.wirkungText, `${id} ohne wirkungText`).toBeTruthy();
      const wirkt = def.healAmount || def.buffEffect || def.tags.includes('cooldown_reset') || def.tags.includes('cleanse');
      expect(wirkt, `${id} ohne Wirkung`).toBeTruthy();
    }
  });

  it('Kraft-Brot 3 Räume, Krafttrank und Titan-Gebräu bis zum Ende, Schnelligkeit 2 Räume', () => {
    expect(ITEM_DEFS.power_bread.buffEffect).toEqual({ stat: 'atk', value: 2, durationRooms: 3 });
    expect(ITEM_DEFS.potion_strength.buffEffect).toEqual({ stat: 'atk', value: 3, durationRooms: 99 });
    expect(ITEM_DEFS.potion_titan.buffEffect).toEqual({ stat: 'hp', value: 10, durationRooms: 99 });
    expect(ITEM_DEFS.potion_speed.buffEffect).toEqual({ stat: 'spd', value: 0.2, durationRooms: 2 });
    expect(ITEM_DEFS.potion_antidote.healAmount).toBe(5);
  });
});

describe('Kristallsplitter (docs/BALANCING.md)', () => {
  it('Kristallminen liefern jeden Lauf sicher Splitter (Kristallkäfer)', () => {
    const beetles = ROUTE_DEFS.crystal_mines.encounters
      .flatMap(e => e.enemies ?? []).filter(id => id === 'crystal_beetle').length;
    expect(beetles).toBeGreaterThanOrEqual(3);
    const table = LOOT_TABLE_DEFS[ENEMY_DEFS.crystal_beetle.lootTableId];
    expect(table.entries.every(e => e.itemId === 'crystal_shard' && e.minQty >= 1)).toBe(true);
  });

  it('Stufe-2-Ausrüstung nach ca. 4 Expeditionen: Waldpfad, Tiefwald, 2× Tiefe Höhle ≥ 5 Splitter', () => {
    const summe = erwartetProLauf('forest_short', 'crystal_shard')
      + erwartetProLauf('forest_medium', 'crystal_shard')
      + 2 * erwartetProLauf('cave_deep', 'crystal_shard');
    expect(summe).toBeGreaterThanOrEqual(5);
  });
});
