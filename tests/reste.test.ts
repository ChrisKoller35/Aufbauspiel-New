import { describe, test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zehntel } from '../src/ui/hpAnzeige';
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
  test('Angriff und Verteidigung auf Zehntel, wie im Heldenfenster', () => {
    expect(zehntel(16.8)).toBe(16.8);
    expect(zehntel(24.6 + 0.2)).toBe(24.8); // ungerundet 24.800000000000001
    expect(zehntel(10.6 + 14)).toBe(24.6);
    expect(zehntel(42)).toBe(42);
  });

  test('Kampf und Teamwahl runden, die Teamwahl zeigt die Werte mit Ausrüstung', () => {
    expect(lies('ui/screens/CombatScreen.ts')).toContain('ATK:${zehntel(unit.atk)} DEF:${zehntel(unit.def)}');
    const team = lies('ui/screens/ExpeditionsScreen.ts');
    expect(team).toContain('gearSystem.getEffectiveStats(f, schmiedeStufen(gameState))');
    expect(team.match(/<div class="hc-st">\$\{kartenWerte\((hero|f)\)\}<\/div>/g)).toHaveLength(2);
    expect(team).not.toMatch(/baseStats\.(atk|def)/);
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
    expect(finger).toBeGreaterThan(sw.indexOf('.sw-klein-btn { width: auto; min-height: 38px'));
    expect(finger).toBeGreaterThan(sw.indexOf('.sw-kap summary, .sw-kap.zu {'));
  });

  test('ein leerer Platz im Team sieht nicht wie ein Knopf aus (er tut nichts)', () => {
    const css = ohneKommentare(lies('ui/html/magic-city.css'));
    expect(css).toMatch(/\.exp-slot-empty, \.exp-slot-empty:hover\s*\{\s*cursor:\s*default;[^}]*transform:\s*none/);
  });
});
