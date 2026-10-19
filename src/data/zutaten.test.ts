import { describe, expect, it } from 'vitest';
import { RECIPE_DEFS } from './recipes';
import { BUILDING_DEFS } from './buildings';
import { LOOT_TABLE_DEFS } from './lootTables';
import { ENEMY_DEFS } from './enemies';
import { ROUTE_DEFS } from './routes';
import { ITEM_DEFS } from './items';

/** Rezepte, die in mindestens einem Gebäude stehen (nur die kann man herstellen). */
const BAUBARE_REZEPTE = Object.values(RECIPE_DEFS)
  .filter(r => Object.values(BUILDING_DEFS).some(b => b.recipes.includes(r.id)));

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

/** Alles, was ein Spieler bekommen kann: Beute, dann Rezepte bis nichts Neues dazukommt. */
function erreichbareItems(): Set<string> {
  const items = new Set<string>();
  for (const tid of genutzteBeutetabellen()) {
    for (const e of LOOT_TABLE_DEFS[tid]?.entries ?? []) items.add(e.itemId);
  }
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
  it('jede Zutat eines baubaren Rezepts kommt aus Beute oder einem Rezept', () => {
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

  it('Beutetabellen und Gegner verweisen nur auf existierende Einträge', () => {
    for (const table of Object.values(LOOT_TABLE_DEFS)) {
      for (const e of table.entries) {
        if (e.itemId === 'gold') continue;
        expect(ITEM_DEFS[e.itemId], `${table.id}: ${e.itemId}`).toBeDefined();
      }
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
