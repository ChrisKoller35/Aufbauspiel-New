import { describe, expect, it } from 'vitest';
import {
  BUILDING_DEFS, BUILD_MENU_ORDER,
  getFreischaltHinweise, getFreischaltStatus, getFreischaltStufe, isBuildingUnlocked,
} from './buildings';
import { GUILD_RANK_DEFS } from './guildRanks';

const MAX_RANG = Math.max(...GUILD_RANK_DEFS.map(r => r.rank));

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

  it('jede Voraussetzung im Baumenü ist selbst im Baumenü kaufbar', () => {
    for (const id of BUILD_MENU_ORDER) {
      for (const req of BUILDING_DEFS[id].freischaltung.braucht) {
        expect(BUILD_MENU_ORDER, `${id} braucht ${req}`).toContain(req);
      }
    }
  });

  it('liefert lesbare Hinweise und Status', () => {
    expect(getFreischaltHinweise('SMITHY', ['LUMBER_CAMP'], 1)).toEqual(['braucht Steinbruch']);
    expect(getFreischaltHinweise('ARCANE_SMITHY', ['IRON_MINE'], 1)).toEqual(['braucht Gildenrang 2']);
    expect(getFreischaltHinweise('LUMBER_CAMP', [], 1)).toEqual([]);
    expect(getFreischaltStatus('LUMBER_CAMP', ['LUMBER_CAMP'], 1)).toBe('gebaut');
    expect(getFreischaltStatus('QUARRY', ['LUMBER_CAMP'], 1)).toBe('baubar');
    expect(getFreischaltStatus('BAKERY', ['LUMBER_CAMP'], 1)).toBe('gesperrt');
  });
});
