// Dungeonkarte ganz oben (Befund 4 der Prüfung von PR #78): Das Feld «Noch unerforscht» steht über dem höchsten Knoten,
// und die Zeilen neben dem Raid sind in der Weg-Maske ausgespart, weil der Weg zum Nichts da oben durch sie läuft.
// Die Karte geht beim höchsten Dungeon auf, den die Gilde betreten kann (am Handy sonst das Nichts rechts ausserhalb).
import { describe, test, expect } from 'vitest';
import { hoechsterKnoten, kartenStart, raidZeilenMaske, unerforschtFeld } from '../src/ui/screens/DungeonMapScreen';
import { DUNGEON_GRAPH, ROUTE_DEFS, isRouteAvailable } from '../src/data/routes';
import { createNewGameState } from '../src/models/GameState';
import { RAID_STUFEN, RAID_TEXTE, ZENIT, stufenTexte } from '../src/data/raids';
import type { RaidKartenZustand } from '../src/systems/Raid';

/** Die Textzeilen der Maske: Klasse, Lage und Inhalt */
function maskenZeilen(maske: string): { klasse: string; x: number; y: number; text: string }[] {
  return [...maske.matchAll(/<text class="([^"]+)" x="([\d.]+)" y="(-?[\d.]+)"[^>]*fill="black" stroke="black" stroke-width="6"[^>]*>([^<]*)<\/text>/g)]
    .map(m => ({ klasse: m[1], x: Number(m[2]), y: Number(m[3]), text: m[4] }));
}

describe('Dungeonkarte ganz oben', () => {
  test('«Noch unerforscht» steht über dem höchsten Knoten: seit Ebene 13 über dem Nichts statt links neben ihm', () => {
    const oben = hoechsterKnoten();
    expect(oben).toEqual({ x: 680, y: -4300, r: 80 });
    expect(DUNGEON_GRAPH.every(n => n.y >= oben.y)).toBe(true);
    expect(oben.y).toBeLessThan(ZENIT.karte.y);
    const feld = unerforschtFeld(900, oben);
    expect(feld).toEqual({ x: 565, y: -4530 });
    // Sechseck (Radius 44) ganz über dem Knoten, die Schrift «NOCH UNERFORSCHT» (66 darüber) noch im Rand von 330
    expect(feld.y + 44).toBeLessThan(oben.y - oben.r);
    expect(feld.y - 66 - 12).toBeGreaterThan(oben.y - 330);
    // Vorher hing das Feld am Raid und stand bei 420 / −4350, links neben dem Nichts
    expect(unerforschtFeld(900, ZENIT.karte)).toEqual({ x: 420, y: -4350 });
  });

  test('ohne offene Stufe: drei Zeilen neben dem Raid, alle in der Maske, mit denselben Klassen wie die Schrift', () => {
    const zu: RaidKartenZustand = { offen: false, zeile: 'Erst die Pfeiler', zwoelf: false, truheWartet: false };
    const zeilen = maskenZeilen(raidZeilenMaske(RAID_STUFEN.map(def => ({ def, zustand: zu }))));
    const k = RAID_TEXTE.karte;
    const { x, y } = ZENIT.karte;
    expect(zeilen).toEqual([
      { klasse: 'dmap-t-klein dmap-raid-klein', x: 474.6, y: y - 17, text: k.klein(ZENIT.minHelden, ZENIT.maxHelden) },
      { klasse: 'dmap-raid-name', x: 474.6, y: y + 3, text: k.name },
      { klasse: 'dmap-raid-zeile', x: 474.6, y: y + 20, text: 'Erst die Pfeiler' },
    ]);
    expect(x).toBe(390);
  });

  test('alle Stufen offen: eine Zeile je Stufe, 15 tiefer als die davor, auch sie in der Maske', () => {
    const zustand = (zeile: string, zwoelf = false): RaidKartenZustand => ({ offen: true, zeile, zwoelf, truheWartet: false });
    const stufen = RAID_STUFEN.map((def, i) => ({ def, zustand: zustand(i === 0 ? 'Diese Woche besiegt' : `Bester Versuch ${i}`, i === 0) }));
    const zeilen = maskenZeilen(raidZeilenMaske(stufen));
    const k = RAID_TEXTE.karte;
    const y = ZENIT.karte.y;
    expect(zeilen.map(z => z.text)).toEqual([
      k.klein(ZENIT.minHelden, RAID_STUFEN[RAID_STUFEN.length - 1].maxHelden),
      k.name,
      k.stufeZeile(stufenTexte(ZENIT).stufe, 'Diese Woche besiegt'),
      ...RAID_STUFEN.slice(1).map((def, i) => k.stufeZeile(stufenTexte(def).stufe, `Bester Versuch ${i + 1}`)),
    ]);
    expect(zeilen.map(z => z.y)).toEqual([y - 17, y + 3, y + 20, ...RAID_STUFEN.slice(1).map((_, i) => y + 35 + i * 15)]);
    expect(zeilen.slice(2).every(z => z.klasse === 'dmap-raid-zeile')).toBe(true);
  });
});

describe('Wo die Karte aufgeht', () => {
  test('beim höchsten Dungeon des Hauptpfads, den die Gilde betreten kann: am Anfang der Start, im Endspiel das Nichts', () => {
    const state = createNewGameState();
    // Die Waldruine (Nebenweg) ist auch offen und liegt höher, zählt aber nicht: am Handy läge sonst der Start ausserhalb
    expect(isRouteAvailable(ROUTE_DEFS.forest_ruins, state)).toBe(true);
    expect(kartenStart(state)).toBe('forest_short');

    // Alles bis zu den Pfeilern bezwungen: das Nichts ist offen und der höchste
    const ohneNichts = DUNGEON_GRAPH.filter(n => n.routeId !== 'nichts_da_oben');
    state.guildStats.rank = 99;
    state.guildStats.bossesDefeatedIds = ohneNichts.map(n => ROUTE_DEFS[n.routeId]?.bossId).filter((b): b is string => !!b);
    state.bezwungen = Object.fromEntries(ohneNichts.map(n => [n.routeId, 1]));
    expect(kartenStart(state)).toBe('nichts_da_oben');

    // Auch bezwungen bleibt es der höchste
    state.bezwungen.nichts_da_oben = 1;
    expect(kartenStart(state)).toBe('nichts_da_oben');
  });

  test('ein offener Dungeon weiter unten zieht die Karte nicht nach unten', () => {
    const state = createNewGameState();
    state.guildStats.rank = 99;
    // Nur der Boss unter den Pfeilern besiegt: die Pfeiler sind offen, darunter fast nichts bezwungen
    const pfeiler = ROUTE_DEFS.tagespfeiler;
    state.guildStats.bossesDefeatedIds = [...(pfeiler.unlockCondition?.bossesDefeated ?? [])];
    expect(isRouteAvailable(pfeiler, state)).toBe(true);
    expect(kartenStart(state)).toBe('tagespfeiler');
  });
});
