import { describe, test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hundertstel, kampfwert, zehntel } from '../src/ui/hpAnzeige';
import { bildKarte } from '../src/ui/heldBild';
import { werteSprungHtml } from '../src/ui/components/SchmiedeAnzeige';
import { setWerteText } from '../src/data/dungeonSets';

/**
 * Kleine Reste vom 6.11. (Suche über alle Bildschirme, PC und Handy): Zahlen ohne Rundungsreste, Lehrlingsbilder im
 * fertigen Spiel, Tippflächen am Finger. Die Tastatur prüft tests/tastatur.test.ts.
 */

const SRC = join(__dirname, '../src');
const lies = (datei: string) => readFileSync(join(SRC, datei), 'utf8');
const ohneKommentare = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Alle Regeln innerhalb von @media (pointer: coarse) einer CSS-Datei, als «Selektor { Werte }» */
function fingerRegeln(datei: string): string {
  const css = ohneKommentare(lies(datei));
  let text = '';
  for (let i = css.indexOf('@media (pointer: coarse)'); i >= 0; i = css.indexOf('@media (pointer: coarse)', i + 1)) {
    let tiefe = 0;
    const start = css.indexOf('{', i);
    for (let j = start; j < css.length; j++) {
      if (css[j] === '{') tiefe++;
      else if (css[j] === '}' && --tiefe === 0) { text += css.slice(start + 1, j) + '\n'; break; }
    }
  }
  return text;
}

describe('Zahlen ohne Rundungsreste', () => {
  test('Zehntel und Hundertstel ohne Gleitkomma-Reste', () => {
    // Ungerundet: 16.900000000000002, 14.000000000000002, 0.7999999999999999, 0.30000000000000004
    expect(16.8 + 0.1).not.toBe(16.9);
    expect(zehntel(16.8 + 0.1)).toBe(16.9);
    expect(zehntel(24.6 - 10.6)).toBe(14);
    expect(zehntel(0.1 + 0.7)).toBe(0.8);
    expect(zehntel(42)).toBe(42);
    expect(hundertstel(0.1 + 0.2)).toBe(0.3);
    expect(hundertstel(0.93)).toBe(0.93);
  });

  test('Angriff und Verteidigung: unter 100 auf Zehntel, ab 100 ganz', () => {
    expect(kampfwert(16.8 + 0.1)).toBe(16.9);
    expect(kampfwert(99.94)).toBe(99.9);
    expect(kampfwert(99.96)).toBe(100);
    expect(kampfwert(104.3)).toBe(104);
    expect(kampfwert(116.5)).toBe(117);
    expect(kampfwert(-104.4)).toBe(-104);
  });

  test('Heldenfenster, Heldenkarte, Teamwahl, Kampf und das Blatt im Raid zeigen dieselbe Zahl', () => {
    expect(lies('ui/screens/CombatScreen.ts')).toContain('ATK:${kampfwert(unit.atk)} DEF:${kampfwert(unit.def)} SPD:${hundertstel(unit.spd)}');
    const team = lies('ui/screens/ExpeditionsScreen.ts');
    expect(team).toContain('gearSystem.getEffectiveStats(f, schmiedeStufen(gameState))');
    const karte = team.slice(team.indexOf('function kartenWerte'), team.indexOf('\n}\n', team.indexOf('function kartenWerte')));
    expect(karte).toContain('${kampfwert(w.atk)}');
    expect(karte).toContain('${kampfwert(w.def)}');
    expect(team.match(/<div class="hc-st">\$\{kartenWerte\((hero|f)\)\}<\/div>/g)).toHaveLength(2);
    expect(team).not.toMatch(/baseStats\.(atk|def)/);
    const helden = lies('ui/screens/HeroesScreen.ts');
    expect(helden).toContain('\\u2694 ${kampfwert(werte.atk)}');
    expect(helden).toContain('\\uD83D\\uDEE1 ${kampfwert(werte.def)}');
    expect(helden).toContain("wertHtml('⚔', 'ATK', String(kampfwert(eff.atk))");
    expect(helden).toContain("wertHtml('🛡', 'DEF', String(kampfwert(eff.def))");
    const raid = lies('ui/screens/RaidScreen.ts');
    expect(raid).toContain('${b.abwehr} <b>${kampfKomma(einheit.def)}</b>');
    expect(raid).toContain('${b.angriff} <b>${kampfKomma(einheit.atk)}</b>');
    expect(raid).toContain('${b.tempo} <b>${tempoKomma(einheit.spd)}</b>');
  });

  test('Zahlen im Kampf mit echtem Minus', () => {
    expect(lies('ui/screens/CombatScreen.ts')).toContain('`−${diffZahl}`');
  });

  test('negatives Tempo mit echtem Minus (−), wie überall sonst', () => {
    const html = werteSprungHtml({ spd: -0.05 }, { spd: -0.05 });
    expect(html).toContain('SPD −0.05');
    expect(html).not.toContain('-0.05');
    expect(setWerteText({ spd: -0.05 })).toBe('−0.05 Tempo');
    expect(setWerteText({ spd: 0.05 })).toBe('+0.05 Tempo');
  });
});

describe('Lehrlingsbilder im fertigen Spiel', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('das Bild in --held-bild hat die ganze Adresse der Seite (sonst sucht der Browser neben dem Stylesheet)', () => {
    vi.stubGlobal('document', { baseURI: 'http://localhost:4173/spiel/?probe=sterne' });
    expect(bildKarte({ classId: 'bard', lehrling: true }).stil)
      .toBe("--held-bild:url('http://localhost:4173/spiel/assets/heroes/hero_bard.png')");
    // Das Bild des Meisters steht direkt im style der Karte: relativ zur Seite, wie bisher
    expect(bildKarte({ classId: 'bard' }).stil).toBe("background-image:url('assets/heroes/hero_bard.png')");
  });

  test('ohne Seite (Tests, Server) bleibt die Adresse relativ', () => {
    expect(bildKarte({ classId: 'bard', lehrling: true }).stil).toBe("--held-bild:url('assets/heroes/hero_bard.png')");
  });

  test("' und & im Pfad der Seite beenden weder url() noch werden sie im HTML zu einem Zeichen", () => {
    vi.stubGlobal('document', { baseURI: "http://host/o'brien/a&not/spiel/" });
    expect(bildKarte({ classId: 'bard', lehrling: true }).stil)
      .toBe("--held-bild:url('http://host/o%27brien/a%26not/spiel/assets/heroes/hero_bard.png')");
  });
});

describe('Tippflächen am Finger (pointer: coarse) mindestens 44 px', () => {
  test('Tempo im Kampf auch breit genug', () => {
    expect(fingerRegeln('ui/html/magic-city.css')).toMatch(/\.mc-co-speed\s*\{\s*min-width:\s*44px/);
  });

  test('Probelauf im Kriegsrat des Raids', () => {
    expect(fingerRegeln('ui/html/raid.css'))
      .toMatch(/\.r-rat \.btn-kriegsrat, \.r-rat-fenster \.btn-kriegsrat\s*\{\s*min-height:\s*44px/);
  });

  test('«alle 12 ▾» im Raid: seine Tippfläche reicht nicht mehr in den ersten Punkt der Liste', () => {
    const css = ohneKommentare(lies('ui/html/raid.css'));
    const hoehe = Number(css.match(/\.r-liste-mehr::after\s*\{[^}]*height:\s*(\d+)px/)?.[1]);
    const knopf = Number(css.match(/\.r-liste-mehr\s*\{[^}]*min-height:\s*(\d+)px/)?.[1]);
    const abstand = Number(css.match(/\.r-hinweise\s*\{\s*margin-top:\s*(\d+)px/)?.[1]);
    expect(hoehe).toBe(44);
    expect((hoehe - knopf) / 2).toBeLessThanOrEqual(abstand);
  });

  test('Geschichte im Fenster der Dungeonkarte, Kapitel der Stadtchronik und «Einsetzen»', () => {
    expect(fingerRegeln('ui/html/geschichten.css')).toMatch(/\.gs-karte summary\s*\{\s*min-height:\s*44px/);
    expect(fingerRegeln('ui/html/stadtweg.css')).toMatch(/\.sw-kap summary, \.sw-klein-btn\s*\{\s*min-height:\s*44px/);
    // Die Finger-Regel steht nach der Grundregel (38 px), sonst gälte wieder diese
    const sw = ohneKommentare(lies('ui/html/stadtweg.css'));
    const finger = sw.indexOf('.sw-kap summary, .sw-klein-btn { min-height: 44px; }');
    expect(finger).toBeGreaterThan(0);
    // Jede Grundregel mit min-height für diese Knöpfe steht davor (sonst gälte sie am Finger)
    const grundregeln = [...sw.matchAll(/(\.sw-klein-btn|\.sw-kap summary)[^{]*\{[^}]*min-height:\s*(\d+)px/g)]
      .filter(m => m[2] !== '44');
    expect(grundregeln.length).toBeGreaterThan(0);
    for (const m of grundregeln) expect(m.index ?? -1).toBeLessThan(finger);
  });

  test('Bis 340 px: «BOSS KAMPF!» bleibt einzeilig neben den breiteren Tempo-Knöpfen', () => {
    const css = ohneKommentare(lies('ui/html/magic-city.css'));
    expect(css).toMatch(/@media \(max-width: 340px\) and \(pointer: coarse\) \{\s*\.mc-co-title \{ letter-spacing: 0; font-size: 0\.9rem; \}/);
  });

  test('Werte im Team: Zeichen und Zahl brechen nicht auseinander', () => {
    expect(ohneKommentare(lies('ui/html/magic-city.css'))).toMatch(/\.hc-st span \{ white-space: nowrap; \}/);
  });

  test('ein leerer Platz im Team sieht nicht wie ein Knopf aus (er tut nichts)', () => {
    const css = ohneKommentare(lies('ui/html/magic-city.css'));
    expect(css).toMatch(/\.exp-slot-empty, \.exp-slot-empty:hover\s*\{\s*cursor:\s*default;[^}]*transform:\s*none/);
  });
});
