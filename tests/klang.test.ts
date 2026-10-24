import { describe, test, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { ROUTE_DEFS } from '../src/data/routes';
import { biomFuerRoute, musikFuerBildschirm, musikFuerRoute } from '../src/data/klangZuordnung';
import { KLANG_SPEICHER_KEY, ladeEinstellungen, speichereEinstellungen } from '../src/systems/Klang';
import { istStummTaste } from '../src/ui/components/KlangSchalter';

describe('Klang-Zuordnung', () => {
  test('jede Route bekommt ein Musikstück, das es als Datei gibt', () => {
    for (const route of Object.values(ROUTE_DEFS)) {
      expect(existsSync(`public/assets/audio/music/${musikFuerRoute(route)}.mp3`), route.id).toBe(true);
    }
  });

  test('Biome wie auf der Routenkarte', () => {
    expect(biomFuerRoute(ROUTE_DEFS.forest_short)).toBe('Wald');
    expect(biomFuerRoute(ROUTE_DEFS.swamp_long)).toBe('Sumpf');
    expect(biomFuerRoute(ROUTE_DEFS.cave_deep)).toBe('Höhle');
    expect(biomFuerRoute(ROUTE_DEFS.ocean_depths)).toBe('Unterwasser');
    expect(biomFuerRoute(ROUTE_DEFS.drachenhort)).toBe('Drachengipfel');
  });

  test('Bildschirme: Stadtmusik, Kampf ändert nichts', () => {
    expect(musikFuerBildschirm('main')).toBe('ambient_city');
    expect(existsSync('public/assets/audio/music/ambient_city.mp3')).toBe(true);
    expect(musikFuerBildschirm('combat')).toBeNull();
  });
});

describe('Klang-Einstellungen', () => {
  const speicher = () => {
    const daten = new Map<string, string>();
    return { getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => { daten.set(k, v); } };
  };
  const werfend = { getItem: () => { throw new Error('gesperrt'); }, setItem: () => { throw new Error('gesperrt'); } };

  test('Vorgabe ist nicht stumm', () => {
    expect(ladeEinstellungen(speicher())).toEqual({ stumm: false });
    expect(ladeEinstellungen(null)).toEqual({ stumm: false });
  });

  test('Speichern und Laden', () => {
    const s = speicher();
    speichereEinstellungen({ stumm: true }, s);
    expect(ladeEinstellungen(s)).toEqual({ stumm: true });
  });

  test('kaputter Wert ergibt die Vorgabe', () => {
    for (const roh of ['{kaputt', '"ja"', '{"stumm":"ja"}', 'null']) {
      const s = speicher();
      s.setItem(KLANG_SPEICHER_KEY, roh);
      expect(ladeEinstellungen(s)).toEqual({ stumm: false });
    }
  });

  test('werfendes localStorage: keine Ausnahme, Vorgabe', () => {
    expect(() => speichereEinstellungen({ stumm: true }, werfend)).not.toThrow();
    expect(ladeEinstellungen(werfend)).toEqual({ stumm: false });
  });
});

describe('Taste M', () => {
  const taste = (key: string, target: { tagName?: string; isContentEditable?: boolean } | null = { tagName: 'BODY' }, mod = {}) =>
    istStummTaste({ key, target, ctrlKey: false, altKey: false, metaKey: false, ...mod });

  test('M und m schalten auf der Stadt, andere Tasten nicht', () => {
    expect(taste('m')).toBe(true);
    expect(taste('M', null)).toBe(true);
    expect(taste('k')).toBe(false);
  });

  test('nicht in Eingabefeldern', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) expect(taste('m', { tagName })).toBe(false);
    expect(taste('m', { tagName: 'DIV', isContentEditable: true })).toBe(false);
  });

  test('nicht mit Strg, Alt oder Cmd', () => {
    expect(taste('m', undefined, { ctrlKey: true })).toBe(false);
    expect(taste('m', undefined, { altKey: true })).toBe(false);
    expect(taste('m', undefined, { metaKey: true })).toBe(false);
  });
});
