import { describe, expect, it } from 'vitest';
import {
  BUILDING_DEFS, BUILD_MENU_ORDER,
  getFreischaltHinweise, getFreischaltStatus, getFreischaltStufe, isBuildingUnlocked,
} from './buildings';
import { GUILD_RANK_DEFS } from './guildRanks';
import { ITEM_DEFS } from './items';
import { RECIPE_DEFS } from './recipes';
import { STARTING_BUILDING_TYPES } from '../scenes/CityStartingLayout';
import { HAENDLER_WAREN, ankaufpreis, istAnkaufbar, kaufpreis, rabattProzent } from './haendler';
import { STADTSTUFEN } from './stadtstufen';

const MAX_RANG = Math.max(...GUILD_RANK_DEFS.map(r => r.rank));

describe('Die sechs Gebäude der Gildenstadt', () => {
  it('es gibt genau die sechs, alle im Baumenü', () => {
    expect(Object.keys(BUILDING_DEFS).sort()).toEqual(
      ['ARCANE_SMITHY', 'GUILD_HALL', 'HAENDLER', 'HERB_GARDEN', 'SMITHY', 'WAR_MACHINE_WORKSHOP'],
    );
    expect([...BUILD_MENU_ORDER].sort()).toEqual(Object.keys(BUILDING_DEFS).sort());
  });

  it('Gildenhaus und Händler stehen von Anfang an und kosten nichts', () => {
    expect([...STARTING_BUILDING_TYPES]).toEqual(['GUILD_HALL', 'HAENDLER']);
    for (const id of STARTING_BUILDING_TYPES) {
      expect(BUILDING_DEFS[id].buildCost).toEqual({});
    }
  });

  it('jede Werkstatt kostet Gold und nur Beute aus den Dungeons, und arbeitet auf Auftrag', () => {
    for (const def of Object.values(BUILDING_DEFS)) {
      if (def.recipes.length === 0) continue;
      expect(def.manualCraft, def.id).toBe(true);
      expect(def.buildCost.gold, def.id).toBeGreaterThan(0);
      for (const res of Object.keys(def.buildCost)) {
        expect(['gold', 'iron_scrap', 'crystal_shard'], `${def.id} kostet ${res}`).toContain(res);
      }
      for (const rid of def.recipes) expect(RECIPE_DEFS[rid], `${def.id}: ${rid}`).toBeDefined();
    }
  });

  it('jede Werkstatt hat Ausbau-Beute aus den Dungeons nach der Tabelle, Gildenhaus und Händler keine', () => {
    expect(BUILDING_DEFS.SMITHY.ausbauBeute).toEqual({ iron_scrap: 10 });
    expect(BUILDING_DEFS.HERB_GARDEN.ausbauBeute).toEqual({ herb_green: 5 });
    expect(BUILDING_DEFS.ARCANE_SMITHY.ausbauBeute).toEqual({ crystal_shard: 5 });
    expect(BUILDING_DEFS.WAR_MACHINE_WORKSHOP.ausbauBeute).toEqual({ iron_scrap: 10 });
    for (const def of Object.values(BUILDING_DEFS)) {
      if (def.recipes.length === 0) {
        expect(def.ausbauBeute, def.id).toBeUndefined();
        continue;
      }
      for (const [res, qty] of Object.entries(def.ausbauBeute ?? {})) {
        expect(ITEM_DEFS[res], `${def.id}: ${res}`).toBeDefined();
        expect(['iron_scrap', 'crystal_shard', 'herb_green'], `${def.id} verlangt ${res}`).toContain(res);
        expect(qty, `${def.id}: ${res}`).toBeGreaterThan(0);
      }
    }
  });

  it('Baukosten enthalten den früheren Bauplan-Preis, Ausbau rechnet mit dem alten Gold weiter', () => {
    expect(BUILDING_DEFS.SMITHY.buildCost).toEqual({ gold: 100 });
    expect(BUILDING_DEFS.HERB_GARDEN.buildCost).toEqual({ gold: 90 });
    expect(BUILDING_DEFS.ARCANE_SMITHY.buildCost).toEqual({ gold: 230, iron_scrap: 5, crystal_shard: 3 });
    expect(BUILDING_DEFS.WAR_MACHINE_WORKSHOP.buildCost).toEqual({ gold: 350, iron_scrap: 20, crystal_shard: 5 });
    expect(Object.values(BUILDING_DEFS).filter(d => d.recipes.length > 0).map(d => d.ausbauGold)).toEqual([50, 40, 80, 100]);
  });
});

describe('Freischaltung der Gebäude', () => {
  it('verweist nur auf existierende Gebäude und nie auf sich selbst', () => {
    for (const def of Object.values(BUILDING_DEFS)) {
      for (const id of def.freischaltung.braucht) {
        expect(BUILDING_DEFS[id], `${def.id} braucht unbekanntes ${id}`).toBeDefined();
        expect(id, `${def.id} braucht sich selbst`).not.toBe(def.id);
      }
    }
  });

  it('verlangt keinen Gildenrang über dem Höchstrang', () => {
    for (const def of Object.values(BUILDING_DEFS)) {
      const rang = def.freischaltung.gildenrang ?? 1;
      expect(rang, def.id).toBeGreaterThanOrEqual(1);
      expect(rang, def.id).toBeLessThanOrEqual(MAX_RANG);
    }
  });

  it('hat keine Kreise (jede Stufe lässt sich berechnen)', () => {
    for (const id of Object.keys(BUILDING_DEFS)) {
      expect(() => getFreischaltStufe(id), id).not.toThrow();
    }
  });

  it('jede Kette ist von einer leeren Stadt aus erreichbar', () => {
    // Alles bauen, was frei ist, bis sich nichts mehr ändert
    const built = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of Object.keys(BUILDING_DEFS)) {
        if (!built.has(id) && isBuildingUnlocked(id, built, MAX_RANG)) {
          built.add(id);
          changed = true;
        }
      }
    }
    const unerreichbar = Object.keys(BUILDING_DEFS).filter(id => !built.has(id));
    expect(unerreichbar).toEqual([]);
  });

  it('liefert lesbare Hinweise und Status: nur der Gildenrang sperrt, sonst baubar auf dem Feld', () => {
    expect(getFreischaltHinweise('SMITHY', ['GUILD_HALL'], 1)).toEqual([]);
    expect(getFreischaltHinweise('ARCANE_SMITHY', [], 1)).toEqual(['braucht Gildenrang 2']);
    expect(getFreischaltHinweise('ARCANE_SMITHY', [], 2)).toEqual([]);
    expect(getFreischaltHinweise('WAR_MACHINE_WORKSHOP', [], 3)).toEqual(['braucht Gildenrang 4']);
    expect(getFreischaltHinweise('GUILD_HALL', [], 1)).toEqual([]);
    expect(getFreischaltStatus('GUILD_HALL', ['GUILD_HALL'], 1)).toBe('gebaut');
    expect(getFreischaltStatus('HERB_GARDEN', ['GUILD_HALL'], 1)).toBe('baubar');
    expect(getFreischaltStatus('WAR_MACHINE_WORKSHOP', ['GUILD_HALL'], 1)).toBe('gesperrt');
  });
});

describe('Der Händler', () => {
  it('führt Brot, Heiltrank und die Grundausrüstung T1 mit Preisen über dem Grundwert', () => {
    expect(HAENDLER_WAREN.map(w => w.itemId)).toEqual(['bread', 'healing_potion', 'iron_sword', 'iron_shield', 'leather_armor']);
    for (const w of HAENDLER_WAREN) {
      expect(ITEM_DEFS[w.itemId], w.itemId).toBeDefined();
      expect(w.preis, w.itemId).toBeGreaterThan(ITEM_DEFS[w.itemId].baseValue);
    }
  });

  it('gibt den Rabatt der Stadtstufe: 0 % bis Stufe 3, 10 % bis Stufe 6, 20 % auf Stufe 7', () => {
    expect(STADTSTUFEN.map(s => s.haendlerRabatt)).toEqual([0, 0, 0, 10, 10, 10, 20]);
    expect(rabattProzent(1)).toBe(0);
    expect(kaufpreis('healing_potion', 4)).toBe(9);
    expect(kaufpreis('healing_potion', 7)).toBe(8);
    expect(kaufpreis('crystal_shard')).toBe(0);
  });

  it('kauft Ausrüstung, Material und Proviant zum halben Grundwert, mindestens 1 Gold', () => {
    expect(ankaufpreis('hunter_bow')).toBe(7);
    expect(ankaufpreis('oak_staff')).toBe(5);
    expect(ankaufpreis('herb_green')).toBe(1);
    expect(ankaufpreis('crystal_shard')).toBe(10);
    expect(ankaufpreis('bread')).toBe(1);
  });

  it('kauft keine Set-Teile, kein Dungeon-Material und kein Gold', () => {
    expect(istAnkaufbar('gold')).toBe(false);
    expect(istAnkaufbar('set_wyrm_klinge')).toBe(false);
    expect(istAnkaufbar('mat_glutkern')).toBe(false);
    expect(ankaufpreis('mat_glutkern')).toBe(0);
    expect(istAnkaufbar('gibt_es_nicht')).toBe(false);
  });

  it('bleibt billiger als der Dungeon-Händler und verkauft Ausrüstung teurer, als die Schmiede sie macht', () => {
    // Sumpfdorf: Heiltrank 15, Brot 8 Beutegold (systems/ExpeditionSystem MERCHANT_PRICES)
    expect(kaufpreis('healing_potion')).toBeLessThan(15);
    expect(kaufpreis('bread')).toBeLessThan(8);
    // Schmiede: 2 Eisenschrott (Ankauf 2 Gold je Stück) + 10 Gold
    expect(kaufpreis('iron_sword')).toBeGreaterThan(RECIPE_DEFS.RCP_IRON_SWORD.inputs.gold + 2 * ankaufpreis('iron_scrap'));
  });
});
