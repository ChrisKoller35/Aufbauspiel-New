// ─── Raid: vier Trupps und mehr als zwei Stufen ──────────────────
// Was Stufe III braucht, bevor es um ihre Regeln geht: Namen und Pendel für vier Trupps, die Uhr je Stufe, der
// Titel des Kartenknotens je Zahl offener Stufen, das Raster mit zwölf Spalten (Klassen r-viele/r-vier) und der
// Umschalter mit drei Stufen. Die Regeln der Stufen stehen in tests/raid.test.ts, Zahlen in docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DREIZEHN, RAID_TEXTE, ZENIT, spaltenName, truppKlein, truppName, truppRichtung } from '../src/data/raids';
import {
  ANGEHALTEN, AUF_ZWOELF, KURZ_VOR_DREIZEHN, KURZ_VOR_ZWOELF, pendelAufTrupp, uhrStellungFuer,
} from '../src/ui/components/ZenitUhr';
import { pendelTrupp } from '../src/systems/RaidKampf';

const quelle = (pfad: string): string => readFileSync(new URL(`../${pfad}`, import.meta.url), 'utf8');

describe('Vier Trupps: Namen, Spalten und Pendel', () => {
  test('Links, Halblinks, Halbrechts, Rechts; in Sätzen klein, mit «nach»', () => {
    expect([0, 1, 2, 3].map(t => truppName(t, 4))).toEqual(['Links', 'Halblinks', 'Halbrechts', 'Rechts']);
    expect([0, 1, 2, 3].map(t => truppKlein(t, 4))).toEqual(['links', 'halblinks', 'halbrechts', 'rechts']);
    expect(truppRichtung(1, 4)).toBe('nach halblinks');
    expect(RAID_TEXTE.ort.pendel(truppKlein(2, 4))).toBe('Pendel (Trupp halbrechts)');
    // Zwei und drei Trupps wie bisher
    expect([0, 1].map(t => truppName(t, 2))).toEqual(['Links', 'Rechts']);
    expect([0, 1, 2].map(t => truppName(t, 3))).toEqual(['Links', 'Mitte', 'Rechts']);
    expect(truppRichtung(1, 3)).toBe('in die Mitte');
  });

  test('Spalten A bis L', () => {
    expect(Array.from({ length: 12 }, (_, s) => spaltenName(s)).join('')).toBe('ABCDEFGHIJKL');
  });

  test('Pendel reihum über vier Trupps, ein leerer Trupp gibt seine Runden dem nächsten', () => {
    expect([1, 2, 3, 4, 5].map(r => pendelTrupp(r, 4, () => true))).toEqual([0, 1, 2, 3, 0]);
    expect([1, 2, 3, 4].map(r => pendelTrupp(r, 4, t => t !== 2))).toEqual([0, 1, 3, 3]);
  });

  test('Pendel der Uhr: links 18 Grad, rechts −18, dazwischen gleichmässig', () => {
    expect([0, 1].map(t => pendelAufTrupp(t, 2))).toEqual([18, -18]);
    expect([0, 1, 2].map(t => pendelAufTrupp(t, 3))).toEqual([18, 0, -18]);
    expect([0, 1, 2, 3].map(t => pendelAufTrupp(t, 4))).toEqual([18, 6, -6, -18]);
  });
});

describe('Mehr als zwei Stufen: Uhr, Kartenknoten, Umschalter', () => {
  test('Uhr je Stufe: ohne Gegenzeiger vor zwölf und auf zwölf, mit Gegenzeiger vor dreizehn und angehalten', () => {
    expect(uhrStellungFuer(ZENIT, false)).toBe(KURZ_VOR_ZWOELF);
    expect(uhrStellungFuer(ZENIT, true)).toBe(AUF_ZWOELF);
    expect(uhrStellungFuer(DREIZEHN, false)).toBe(KURZ_VOR_DREIZEHN);
    expect(uhrStellungFuer(DREIZEHN, true)).toBe(ANGEHALTEN);
  });

  test('Titel des Kartenknotens: eine Stufe, zwei, drei', () => {
    const k = RAID_TEXTE.karte;
    expect(k.tooltipStufen(1)).toBe('Zenit, das Uhrwerk über dem Tag. Ein Kampf für bis zu zehn Helden.');
    expect(k.tooltipStufen(2)).toBe('Zenit, das Uhrwerk über dem Tag. Stufe I für bis zu zehn Helden, Stufe II für bis zu fünfzehn.');
    expect(k.tooltipStufen(3)).toContain('Stufe III für bis zu zwanzig.');
  });

  test('Kartenknoten: eine Zeile je offene Stufe, Uhr und Heldenzahl der höchsten (keine feste zweite Stufe mehr)', () => {
    const karte = quelle('src/ui/screens/DungeonMapScreen.ts');
    expect(karte).toContain('RAID_STUFEN.map(def => ({ def, zustand: raidKartenZustand(state, Date.now(), def) }))');
    expect(karte).toContain('offeneStufen.slice(1).map((st, i) =>');
    expect(karte).toContain('uhrStellungFuer(hoechste.def, hoechste.zustand.zwoelf)');
    expect(karte).toContain('k.klein(ZENIT.minHelden, hoechste.def.maxHelden)');
    expect(karte).not.toMatch(/\bDREIZEHN\b/);
  });

  test('Raster: ab drei Trupps r-viele, dazu r-drei oder r-vier; am Handy vier Trupps untereinander', () => {
    const bildschirm = quelle('src/ui/screens/RaidScreen.ts');
    // Die Klassen kommen nur noch aus truppKlassen, nicht mehr aus «drei Trupps oder nicht»
    expect(bildschirm).not.toMatch(/truppZahl === 3 \? ' r-drei'|toggle\('r-drei'|const stapel = def\.truppZahl === 3/);
    expect(bildschirm).toContain("def.truppZahl >= 3 ? ['r-viele', def.truppZahl >= 4 ? 'r-vier' : 'r-drei'] : []");
    expect(bildschirm).toContain('uhr.pendel = pendelAufTrupp(e.trupp ?? 0, def.truppZahl);');
    const css = quelle('src/ui/html/raid.css');
    expect(css).toMatch(/\.r-gitter\.r-vier \{\s*grid-template-columns: 40px repeat\(3, minmax\(0, 1fr\)\) 14px/);
    expect(css).toContain('.r-gitter.r-vier { grid-template-rows: repeat(4, 24px 20px 44px 44px 44px); }');
    expect(css).toContain('.r-rd-pd.r-hl { left: 27%; } .r-rd-pd.r-hr { right: 27%; }');
    // Was ab drei Trupps gilt, steht unter r-viele (das Stapeln am Handy), nicht mehr unter r-drei
    expect(css).toContain('.r-gitter.r-viele > * { grid-row: var(--hr, var(--gr)); grid-column: var(--hc, var(--gc)); }');
  });

  test('Bank am PC: läuft mit und rollt für sich, damit man bei zwanzig Helden auch von unten ins Feld ziehen kann', () => {
    const css = quelle('src/ui/html/raid.css');
    expect(css).toMatch(/@media \(min-width: 701px\) \{\s*\.r-bank \{\s*position: sticky; top: 12px; max-height: calc\(100vh - 80px\); overflow-y: auto;/);
  });

  test('Umschalter: ab drei Stufen zu dritt nebeneinander (Handy und Fenster einer Stufe, die zu ist)', () => {
    const bildschirm = quelle('src/ui/screens/RaidScreen.ts');
    expect(bildschirm).toContain("RAID_STUFEN.length >= 3 ? ' r-stufen-drei' : ''");
    expect(bildschirm).toContain('RAID_TEXTE.karte.tooltipStufen(davor ? RAID_STUFEN.indexOf(def) + 1 : 1)');
    const css = quelle('src/ui/html/raid.css');
    expect(css).toContain('.r-stufen.r-stufen-drei { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }');
    expect(css).toContain('.r-zu .r-stufen.r-stufen-drei { grid-template-columns: repeat(3, minmax(0, 1fr)); }');
  });
});
