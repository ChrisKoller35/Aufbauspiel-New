// ─── Der Raid «Über dem Tag» und seine Stufe II ─────────────────
// Die Regeln des Uhrwerks auf kleinen Probefeldern mit zähen Helden (systems/RaidKampf.ts), Heilregel und
// Trupps, Bestimmtheit und Kriegsrat, dann der Raid im Spielstand (systems/Raid.ts): Freischalten, Aufstellen,
// Woche und Kosten, Truhen, XP, Zähler, Bestversuch, Alrunas Liste, Speichern. Danach Stufe II, «Die dreizehnte
// Stunde»: Gegenzeiger und drei Trupps, eigener Stand, eigene Woche, eigene Truhen, Liste, Kriegsrat, Speichern.
// Zum Schluss die Eichbänder beider Stufen mit 20 festen Samen (i · 7919) an der Muster-Gilde
// (data/raidMuster.ts); die 400 Läufe rechnet tools/raidEichung.ts. Regeln und Zahlen: docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import type { Feld, RaidStand } from '../src/models/RaidStand';
import {
  DREIZEHN, RAID_TEXTE, STUFEN_TEXTE, TRUPP_WIRKUNGEN, ZENIT, rundenListe, spaltenName, truppKlein, truppName,
} from '../src/data/raids';
import { DUNGEON_SETS, setTeilIds, setVonItem } from '../src/data/dungeonSets';
import { LOOT_TABLE_DEFS } from '../src/data/lootTables';
import {
  RAID_AUFSTELLUNGEN_DREIZEHN, RaidAufstellungDreizehn, RaidAufstellungName, RaidMusterName, baueRaidGilde,
  raidMusterAufstellung, raidMusterAufstellungDreizehn,
} from '../src/data/raidMuster';
import {
  RaidEreignis, RaidErgebnis, gegenzeigerSpalte, hauptursache, heilFaehigkeit, pendelTrupp, raidKampf, sindNachbarn,
  spaltenZahl, treffpunkte, vollsteReihe, zeigerRunden, zeigerSpalte,
} from '../src/systems/RaidKampf';
import {
  ErnstkampfErgebnis, KRIEGSRAT_PROBEN, VERLAUF_LAENGE, aufstellungLeeren, aufstellungSchluessel, ernstkampf,
  fehlendesSetTeil, hinweise, kriegsratRechnen, kriegsratSamen, montagSatz, raidKartenZustand, raidKriegsrat, raidLage,
  raidOffen, raidSamen, raidStand, raidTeilnehmer, ratSchluessel, restProzent, setzeHeld, startAufstellung, truheZiehen,
  versuchsLage,
} from '../src/systems/Raid';
import { besitz } from '../src/systems/DungeonSets';
import { awardXP, totalXpForLevel } from '../src/systems/HeroProgression';
import { merkeBezwungen } from '../src/systems/Bezwungen';
import { TAG_MS, wocheVon } from '../src/systems/Rangliste';
import { SaveSystem, hebeSperreNachLadenAuf } from '../src/systems/SaveSystem';
import { SeededRNG } from '../src/utils/RNG';

/** Montag, 19. Oktober 2026, 9 Uhr: Woche 2026-W43 */
const START = new Date(2026, 9, 19, 9, 0).getTime();
const WOCHE = 7 * TAG_MS;
const A = RAID_TEXTE.ansage;
const L = RAID_TEXTE.liste;
const B = RAID_TEXTE.bildschirm;

beforeEach(() => {
  vi.useFakeTimers({ now: START, toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

// ── Probefelder ──

/** Zähe Helden: viel Leben, kaum Angriff, keine Abwehr; jeder Treffer zeigt die Wucht des Uhrwerks */
const ZAEH = { hp: 20000, maxHp: 20000, atk: 1, def: 0, spd: 1, critChance: 0, critMult: 1 };

function held(id: number, classId: string, name: string, werte: Partial<typeof ZAEH> = {}): GuildFighter {
  const h = createGuildFighter(classId, name, { ...ZAEH, ...werte });
  h.id = id;
  return h;
}

/** Ein Held mit Weg (Stufe 15, Meister) */
function meister(id: number, classId: string, name: string, weg: string, werte: Partial<typeof ZAEH> = {}): GuildFighter {
  const h = held(id, classId, name, werte);
  h.level = 15;
  h.spezialisierung = weg;
  return h;
}

/** Aufstellung aus [Held-Id, Reihe, Spalte] */
function felder(...liste: [number, number, number][]): Record<string, Feld> {
  return Object.fromEntries(liste.map(([id, reihe, spalte]) => [String(id), { reihe, spalte }]));
}

/** Alle Ereignisse einer Art, mit ihrer Runde */
function ereignisse(r: RaidErgebnis, art: RaidEreignis['art']): (RaidEreignis & { runde: number })[] {
  return r.verlauf.flatMap(v => v.ereignisse.filter(e => e.art === art).map(e => ({ ...e, runde: v.runde })));
}
const ids = (e: RaidEreignis): number[] => (e.treffer ?? []).map(t => t.heldId);
const werte = (e: RaidEreignis): number[] => (e.treffer ?? []).map(t => t.wert);
const inRunde = (r: RaidErgebnis, art: RaidEreignis['art'], runde: number): RaidEreignis =>
  ereignisse(r, art).find(e => e.runde === runde)!;

/** Nur die genannten Regeln schlagen zu (Mittag gilt als Regel, Mitternacht und Heilung bleiben) */
const nurDie = (...bleiben: string[]) =>
  (['pendel', 'zeiger', 'durchschlag', 'glocke', 'funken', 'mittag'] as const).filter(r => !bleiben.includes(r));

/**
 * Das Probefeld: sechs zähe Helden, Spalte E leer, in der Mitte stehen drei, Cc macht den meisten Schaden.
 *          A    B    C   |  D    E    F
 *   vorn   Aa   .    .   |  .    .    .
 *   Mitte  .    Bb   Cc  |  Dd   .    .
 *   hinten .    .    Ee  |  .    .    Ff
 */
function probefeld(): { helden: GuildFighter[]; aufstellung: Record<string, Feld> } {
  return {
    helden: [
      held(1, 'guardian', 'Aa'), held(2, 'berserker', 'Bb'), held(3, 'ranger', 'Cc', { atk: 50 }),
      held(4, 'assassin', 'Dd'), held(5, 'witch', 'Ee'), held(6, 'bard', 'Ff'),
    ],
    aufstellung: felder([1, 0, 0], [2, 1, 1], [3, 1, 2], [4, 1, 3], [5, 2, 2], [6, 2, 5]),
  };
}

describe('Die Regeln des Uhrwerks', () => {
  test('Zeiger A bis F und wieder A, vollste Reihe (Gleichstand: die hintere), Pendel reihum, Nachbarn nur im Trupp', () => {
    expect(Array.from({ length: 13 }, (_, i) => zeigerSpalte(i + 1, 6))).toEqual([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]);
    const f = (reihe: number, spalte: number): Feld => ({ reihe, spalte });
    expect(vollsteReihe([f(0, 0), f(1, 0), f(1, 4)], 3)).toBe(1);
    expect(vollsteReihe([f(0, 0), f(0, 1), f(1, 5)], 3)).toBe(0);
    expect(vollsteReihe([f(0, 0), f(2, 5)], 3)).toBe(2);
    expect(vollsteReihe([f(0, 0), f(0, 3), f(1, 1), f(1, 2)], 3)).toBe(1);
    expect(pendelTrupp(1, 2, () => true)).toBe(0);
    expect(pendelTrupp(2, 2, () => true)).toBe(1);
    expect(pendelTrupp(2, 2, t => t === 0)).toBe(0);
    expect(pendelTrupp(3, 2, () => false)).toBeNull();
    expect(sindNachbarn(f(1, 1), f(1, 2))).toBe(true);
    expect(sindNachbarn(f(1, 2), f(2, 2))).toBe(true);
    expect(sindNachbarn(f(1, 2), f(1, 3))).toBe(false); // über den Gang
    expect(sindNachbarn(f(1, 1), f(2, 2))).toBe(false); // schräg
    expect(sindNachbarn(f(1, 1), f(1, 1))).toBe(false);
  });

  test('auf dem Probefeld: Pendel, Zeiger, Durchschlag, Glocke, Funken, Mittag und Mitternacht', () => {
    const { helden, aufstellung } = probefeld();
    const r = raidKampf(ZENIT, helden, {}, aufstellung, 42);

    // Alle stehen noch, Zenit auch: Nach Runde 24 ist der Tag um
    expect(r).toMatchObject({ sieg: false, runden: 24, mitternacht: true, helden: 6, stehend: 6, gefallen: [] });
    expect(r.verlauf).toHaveLength(24);
    expect(hauptursache(r.gefallen, {}, r.mitternacht)).toEqual({
      regel: 'mitternacht', ort: RAID_TEXTE.ort.mitternacht, satz: RAID_TEXTE.hauptursache.mitternacht,
    });

    // Pendel: ungerade Runden links (vorderste Reihe: Aa), gerade rechts (vorn steht niemand, also die Mitte: Dd)
    const pendel = ereignisse(r, 'pendel');
    expect(pendel).toHaveLength(24);
    for (const e of pendel) expect([e.trupp, e.reihe, ids(e)]).toEqual(e.runde % 2 === 1 ? [0, 0, [1]] : [1, 1, [4]]);

    // Zeiger: Runde 1 Spalte A … Runde 6 F, Runde 7 wieder A; in der leeren Spalte E schlägt er durch
    const zeiger = [...ereignisse(r, 'zeiger'), ...ereignisse(r, 'durchschlag')].sort((a, b) => a.runde - b.runde);
    expect(zeiger.map(e => [e.runde, e.spalte])).toEqual(Array.from({ length: 24 }, (_, i) => [i + 1, i % 6]));
    expect(ereignisse(r, 'durchschlag').map(e => e.runde)).toEqual([5, 11, 17, 23]);
    // Allein trägt Aa die ganze Wucht, in Spalte C teilen sich Cc und Ee; ab Mittag × 1,5
    expect([ids(inRunde(r, 'zeiger', 1)), werte(inRunde(r, 'zeiger', 1))]).toEqual([[1], [110]]);
    expect([ids(inRunde(r, 'zeiger', 3)), werte(inRunde(r, 'zeiger', 3))]).toEqual([[3, 5], [55, 55]]);
    expect([ids(inRunde(r, 'zeiger', 4)), werte(inRunde(r, 'zeiger', 4))]).toEqual([[4], [110]]);
    expect(werte(inRunde(r, 'zeiger', 12))).toEqual([165]);
    expect(werte(inRunde(r, 'zeiger', 13))).toEqual([165]);
    // Durchschlag: 0,6 der Wucht auf jeden, ab Mittag ebenfalls × 1,5
    for (const e of ereignisse(r, 'durchschlag')) {
      expect([ids(e), werte(e)]).toEqual([[1, 2, 3, 4, 5, 6], Array(6).fill(e.runde < 12 ? 66 : 99)]);
    }

    // Glocke: alle vier Runden auf die vollste Reihe (die Mitte: Bb, Cc, Dd), über den Gang hinweg
    expect(ereignisse(r, 'glocke').map(e => [e.runde, e.reihe, ids(e), werte(e)])).toEqual(
      [4, 8, 12, 16, 20, 24].map(runde => [runde, 1, [2, 3, 4], Array(3).fill(runde < 12 ? 110 : 165)]),
    );

    // Funken: alle drei Runden auf Cc (meister direkter Schaden) und seine Nachbarn Bb und Ee; Dd steht über den Gang
    expect(r.schaden[3]).toBe(Math.max(...Object.values(r.schaden)));
    expect(ereignisse(r, 'funken').map(e => [e.runde, e.quelle, ids(e), werte(e)])).toEqual(
      [3, 6, 9, 12, 15, 18, 21, 24].map(runde => [runde, 3, [3, 2, 5], Array(3).fill(runde < 12 ? 110 : 165)]),
    );
    expect([r.funkenZiel, r.funkenNachbarn]).toEqual([3, [2, 5]]);

    // Mittag schlägt in Runde 12; jede Ansage kommt einmal, die ohne eigenes Ereignis als «ansage»
    expect(ereignisse(r, 'mittag').map(e => [e.runde, e.ansage])).toEqual([[12, A.mittag]]);
    expect(ereignisse(r, 'ansage').map(e => [e.runde, e.ansage])).toEqual([[1, A.viele(6)], [24, A.mitternacht]]);
    expect(r.ansagen).toEqual([
      A.viele(6), A.funken('Cc', ['Bb', 'Ee']), A.glocke(2, 3), A.durchschlagLeer('E'), A.mittag, A.mitternacht,
    ]);
  });

  test('ohne Mittag bleibt die Wucht bei 110; nur bis Runde 3 gerechnet gibt es keine Mitternacht', () => {
    const { helden, aufstellung } = probefeld();
    const r = raidKampf(ZENIT, helden, {}, aufstellung, 42, { ohne: ['mittag'] });
    expect(ereignisse(r, 'mittag')).toEqual([]);
    expect(r.ansagen).not.toContain(A.mittag);
    expect(werte(inRunde(r, 'zeiger', 13))).toEqual([110]);
    expect(werte(inRunde(r, 'durchschlag', 17))).toEqual(Array(6).fill(66));
    expect(werte(inRunde(r, 'glocke', 16))).toEqual([110, 110, 110]);

    const kurz = raidKampf(ZENIT, helden, {}, aufstellung, 42, { bisRunde: 3 });
    expect(kurz).toMatchObject({ sieg: false, runden: 3, mitternacht: false, stehend: 6 });
    expect(kurz.verlauf).toHaveLength(3);
    expect(kurz.ansagen).not.toContain(A.mitternacht);
  });

  test('der Zeiger teilt seine Last unter den Lebenden der Spalte', () => {
    // Fels und Blatt stehen beide in Spalte A; Blatt fällt in Runde 7, danach trägt Fels allein
    const helden = [held(1, 'guardian', 'Fels'), held(2, 'ranger', 'Blatt', { hp: 100, maxHp: 100 })];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 0], [2, 1, 0]), 7, { ohne: nurDie('zeiger'), bisRunde: 13 });
    expect(ereignisse(r, 'zeiger').map(e => [e.runde, ids(e), werte(e)])).toEqual([
      [1, [1, 2], [55, 55]], [7, [1, 2], [55, 55]], [13, [1], [110]],
    ]);
    expect(r.gefallen).toEqual([{ heldId: 2, runde: 7, ursache: 'zeiger', ort: RAID_TEXTE.ort.zeiger('A') }]);
    expect(ereignisse(r, 'gefallen').map(e => [e.runde, e.quelle])).toEqual([[7, 2]]);
  });

  test('Durchschlag nur bei leerer Spalte; fällt der Einzige einer Spalte, schlägt der Zeiger dort durch', () => {
    // Spalte B trägt nur Halm; die anderen Spalten sind besetzt
    const helden = [
      held(1, 'guardian', 'Aa'), held(2, 'ranger', 'Halm', { hp: 100, maxHp: 100 }), held(3, 'berserker', 'Cc'),
      held(4, 'assassin', 'Dd'), held(5, 'witch', 'Ee'), held(6, 'bard', 'Ff'),
    ];
    const aufstellung = felder([1, 0, 0], [2, 1, 1], [3, 0, 2], [4, 0, 3], [5, 0, 4], [6, 0, 5]);
    const r = raidKampf(ZENIT, helden, {}, aufstellung, 7, { ohne: nurDie('zeiger', 'durchschlag'), bisRunde: 8 });
    expect(r.gefallen).toEqual([{ heldId: 2, runde: 2, ursache: 'zeiger', ort: RAID_TEXTE.ort.zeiger('B') }]);
    expect(ereignisse(r, 'zeiger').map(e => e.spalte)).toEqual([0, 1, 2, 3, 4, 5, 0]);
    expect(ereignisse(r, 'durchschlag').map(e => [e.runde, e.spalte, ids(e), werte(e)])).toEqual([
      [8, 1, [1, 3, 4, 5, 6], Array(5).fill(66)],
    ]);
    expect(r.ansagen).toContain(A.durchschlagGefallen('Halm', 'B'));
    expect(r.ansagen).not.toContain(A.durchschlagLeer('B'));
  });

  test('das Pendel trifft die vorderste lebende Reihe; ist ein Trupp leer, schwingt es jede Runde zum anderen', () => {
    // Nur Trupp Links: vorn Vorn (hält keinen Schlag), Mitte Mitte, hinten Hinten
    const helden = [held(1, 'ranger', 'Vorn', { hp: 100, maxHp: 100 }), held(2, 'guardian', 'Mitte'), held(3, 'bard', 'Hinten')];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 1], [2, 1, 1], [3, 2, 0]), 7, { ohne: nurDie('pendel'), bisRunde: 4 });
    expect(ereignisse(r, 'pendel').map(e => [e.runde, e.trupp, e.reihe, ids(e)])).toEqual([
      [1, 0, 0, [1]], [2, 0, 1, [2]], [3, 0, 1, [2]], [4, 0, 1, [2]],
    ]);
    expect(r.gefallen).toEqual([{ heldId: 1, runde: 1, ursache: 'pendel', ort: RAID_TEXTE.ort.pendel('links') }]);
    expect(r.ansagen).toContain(A.pendelZerbrechlich('Vorn'));
  });

  test('ist Zenit betäubt, setzt er aus: in dieser Runde kein Pendel, die Wiedergabe nennt Grund und Helden', () => {
    // Startaufstellung der Muster-Gilde (Ids 1 bis 10), Brom und Grimm nach hinten rechts; Samen 1000:
    // Grimms Hammer hält Zenit schon in Runde 1 an
    const { helden, stufen } = baueRaidGilde('anker', { ersteId: 1 });
    const aufstellung: Record<string, Feld> = Object.fromEntries(
      helden.map((h, i) => [String(h.id), { reihe: Math.floor(i / 6), spalte: i % 6 }]));
    aufstellung['1'] = { reihe: 1, spalte: 4 };
    aufstellung['2'] = { reihe: 2, spalte: 5 };
    const r = raidKampf(ZENIT, helden, stufen, aufstellung, 1000);
    const runde1 = r.verlauf[0].ereignisse;
    expect(runde1.filter(e => e.art === 'aussetzen')).toEqual([{ art: 'aussetzen', quelle: 2, grund: 'Erschütterungsschlag' }]);
    expect(runde1.some(e => e.art === 'pendel')).toBe(false);
    // In keiner Runde beides, und jedes Aussetzen nennt Grund und Helden
    const ausgesetzt = r.verlauf.filter(v => v.ereignisse.some(e => e.art === 'aussetzen'));
    expect(ausgesetzt.length).toBeGreaterThan(1);
    for (const v of ausgesetzt) {
      expect(v.ereignisse.filter(e => e.art === 'aussetzen'), `Runde ${v.runde}`).toHaveLength(1);
      expect(v.ereignisse.some(e => e.art === 'pendel'), `Runde ${v.runde}`).toBe(false);
      expect(v.ereignisse.find(e => e.art === 'aussetzen')).toMatchObject({ quelle: 2, grund: 'Erschütterungsschlag' });
    }
    // Nur die Wiedergabe kennt das Ereignis: Der Kampf ist derselbe; ohne Pendel gibt es auch nichts auszusetzen
    const knapp = raidKampf(ZENIT, helden, stufen, aufstellung, 1000, { knapp: true });
    expect({ ...knapp, verlauf: [], protokoll: [] }).toEqual({ ...r, verlauf: [], protokoll: [] });
    const ohnePendel = raidKampf(ZENIT, helden, stufen, aufstellung, 1000, { ohne: ['pendel'] });
    expect(ohnePendel.verlauf.some(v => v.ereignisse.some(e => e.art === 'aussetzen'))).toBe(false);
  });

  test('fängt einer den Pendelschlag ab, zählt der Treffer für ihn, und fällt er daran, fiel er durch das Pendel', () => {
    // Muster-Gilde in «Lehrbuch», Samen 1: In Runde 12 schwingt das Pendel auf Grimm (allein vorn im Trupp rechts),
    // Ansgar fängt als Schutzherr ab und fällt (früher als «Rundenende» gebucht, mit 0 für Grimm)
    const { helden, stufen } = baueRaidGilde('anker');
    const id = (name: string): number => helden.find(h => h.name === name)!.id;
    const r = raidKampf(ZENIT, helden, stufen, raidMusterAufstellung('lehrbuch', helden), 1);
    expect(r.protokoll).toContain('★ Ansgar setzt Schutzherr ein → fängt den Angriff auf Grimm ab');
    const pendel = r.verlauf.find(v => v.runde === 12)!.ereignisse.find(e => e.art === 'pendel')!;
    expect(pendel.trupp).toBe(1);
    expect(pendel.treffer!.map(x => x.heldId)).toEqual([id('Ansgar')]);
    expect(pendel.treffer![0].wert).toBeGreaterThan(0);
    expect(r.gefallen.find(g => g.heldId === id('Ansgar'))).toEqual({
      heldId: id('Ansgar'), runde: 12, ursache: 'pendel', ort: RAID_TEXTE.ort.pendel(truppKlein(1, ZENIT.truppZahl)),
    });
  });

  test('Glocke: bei Gleichstand die hintere Reihe', () => {
    const helden = [held(1, 'guardian', 'Aa'), held(2, 'ranger', 'Bb'), held(3, 'witch', 'Cc'), held(4, 'bard', 'Dd')];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 0], [2, 0, 4], [3, 2, 1], [4, 2, 3]), 7, {
      ohne: nurDie('glocke'), bisRunde: 8,
    });
    expect(ereignisse(r, 'glocke').map(e => [e.runde, e.reihe, ids(e)])).toEqual([[4, 2, [3, 4]], [8, 2, [3, 4]]]);
    expect(r.ansagen).toContain(A.glocke(3, 2));
  });
});

describe('Heilregel und Trupps', () => {
  test('Heiler heilen den Schwächsten im eigenen Trupp um Fähigkeit + 2 × Angriff und warten dann ihre Abklingzeit', () => {
    expect([heilFaehigkeit('cleric'), heilFaehigkeit('druid'), heilFaehigkeit('paladin')].map(f => [f?.power, f?.cooldown]))
      .toEqual([[36, 3], [24, 4], [18, 3]]);
    expect(heilFaehigkeit('ranger')).toBeUndefined();
    expect(heilFaehigkeit(undefined)).toBeUndefined();

    // Links: Wand (Spalte A) und Kleri (Spalte B); rechts Fern (Spalte D) ohne Heiler. Nur der Zeiger schlägt.
    const helden = [
      held(1, 'guardian', 'Wand', { hp: 500, maxHp: 500 }), held(2, 'cleric', 'Kleri', { hp: 5000, maxHp: 5000, atk: 10 }),
      held(3, 'ranger', 'Fern', { hp: 500, maxHp: 500 }),
    ];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 0], [2, 1, 1], [3, 0, 3]), 7, { ohne: nurDie('zeiger'), bisRunde: 10 });
    const menge = heilFaehigkeit('cleric')!.power + ZENIT.regeln.heilFaktor * 10;
    expect(menge).toBe(56);
    // Runde 2: Wand +56 (390 → 446, noch unter 90 %), Runden 3 bis 5 Abklingzeit, Runde 6 wieder (bis 500 voll),
    // Runde 10 nach dem nächsten Zeiger auf A
    expect(ereignisse(r, 'heilung').map(e => [e.runde, e.quelle, ids(e), werte(e)])).toEqual([
      [2, 2, [1], [56]], [6, 2, [1], [54]], [10, 2, [1], [56]],
    ]);
    expect(r.verlauf.slice(1, 5).map(v => v.leben[1])).toEqual([446, 446, 446, 446]);
    // Fern steht rechts: Kleri heilt ihn nie, auch wenn er der Schwächste von allen ist
    expect(r.verlauf.map(v => v.leben[3])).toEqual([500, 500, 500, 390, 390, 390, 390, 390, 390, 280]);
    expect(r.geheilt).toEqual({ 2: 56 + 54 + 56 });
    // Wer heilt, greift in dieser Runde nicht an
    expect(ids(inRunde(r, 'angriff', 2))).toEqual([1, 3]);
    expect(ids(inRunde(r, 'angriff', 3))).toEqual([1, 2, 3]);
    expect(r.ansagen).toEqual([A.heilung('Kleri')]);
  });

  test('bei genau neun Zehnteln wird noch nicht geheilt', () => {
    // Der Zeiger nimmt Wand 110 von 1100: genau 90 %. Erst nach dem zweiten Zeiger auf A (Runde 7) heilt Kleri.
    const helden = [held(1, 'guardian', 'Wand', { hp: 1100, maxHp: 1100 }), held(2, 'cleric', 'Kleri', { hp: 5000, maxHp: 5000, atk: 10 })];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 0], [2, 1, 1]), 7, { ohne: nurDie('zeiger'), bisRunde: 8 });
    expect(r.verlauf[0].leben[1]).toBe(990);
    expect(ereignisse(r, 'heilung').map(e => [e.runde, ids(e), werte(e)])).toEqual([[8, [1], [56]]]);
  });

  test('Heldenlied und Phalanx wirken nur im eigenen Trupp', () => {
    // Zwei gleiche Schützinnen, Lia links, Lio rechts; die Bardin mit dem Heldenlied steht einmal links, einmal rechts
    const schuetzen = [held(2, 'ranger', 'Lia', { atk: 50 }), held(3, 'ranger', 'Lio', { atk: 50 })];
    const lied = (spalte: number) => {
      const helden = [meister(1, 'bard', 'Liedra', 'bard_heldenlied'), ...schuetzen];
      const r = raidKampf(ZENIT, helden, {}, felder([1, 2, spalte], [2, 0, 1], [3, 0, 4]), 7, { ohne: nurDie(), bisRunde: 3 });
      return [r.schaden[2], r.schaden[3]];
    };
    const [liaLinks, lioLinks] = lied(0);
    expect(liaLinks).toBeGreaterThan(lioLinks);
    expect(lied(5)).toEqual([lioLinks, liaLinks]);

    // Phalanx: Spalte A ist leer, der Durchschlag in Runde 1 trifft alle mit 66; der Schild des Wächters nur im Trupp
    const phalanx = (spalte: number) => {
      const helden = [meister(1, 'guardian', 'Brom', 'guardian_phalanx'), ...schuetzen];
      const r = raidKampf(ZENIT, helden, {}, felder([1, 0, spalte], [2, 1, 2], [3, 1, 4]), 7, {
        ohne: nurDie('zeiger', 'durchschlag'), bisRunde: 1,
      });
      expect(werte(inRunde(r, 'durchschlag', 1))).toEqual([66, 66, 66]);
      return [ZAEH.hp - r.verlauf[0].leben[2], ZAEH.hp - r.verlauf[0].leben[3]];
    };
    const [liaVerlust, lioVerlust] = phalanx(1);
    expect(lioVerlust).toBe(66);
    expect(liaVerlust).toBeLessThan(66);
    expect(phalanx(5)).toEqual([66, liaVerlust]);
  });

  test('Spott ändert das Pendel nicht: Zenit zielt nicht, Zenit schwingt', () => {
    // Brom (Amtsstab: Letzte Bastion) ruft zum Zweikampf, steht aber hinten; das Pendel trifft vorn
    const { helden: gilde, stufen } = baueRaidGilde('anker');
    const brom = gilde.find(h => h.name === 'Brom')!;
    const helden = [brom, held(1, 'ranger', 'Vorn'), held(2, 'ranger', 'Drüben')];
    const r = raidKampf(ZENIT, helden, stufen, felder([brom.id, 2, 0], [1, 0, 1], [2, 1, 4]), 7, {
      ohne: nurDie('pendel'), bisRunde: 4,
    });
    expect(r.ansagen).toContain(A.spott('Brom'));
    expect(ereignisse(r, 'pendel').map(e => ids(e))).toEqual([[1], [2], [1], [2]]);
  });

  test('Gift auf Zenit tickt einmal je Runde, auch mit zwei Trupps', () => {
    const spinne = held(1, 'assassin', 'Spinne', { atk: 30 });
    spinne.gear = { mainHand: 'set_spinne_dolch', offHand: null, armor: 'set_spinne_robe', trinket: 'set_spinne_ring' };
    const helden = [spinne, held(2, 'ranger', 'Lia', { atk: 30 })];
    const r = raidKampf(ZENIT, helden, {}, felder([1, 0, 0], [2, 0, 3]), 7, { ohne: nurDie(), bisRunde: 6 });
    const gift = r.protokoll.filter(z => z.includes('Zenit: Gift'));
    expect(gift).toHaveLength(6);
    const jeTick = Number(gift[0].match(/−(\d+)/)![1]);
    let vorher = ZENIT.werte.hp;
    for (const v of r.verlauf) {
      const angriff = werte(inRunde(r, 'angriff', v.runde)).reduce((s, w) => s + w, 0);
      expect(vorher - v.zenitHp).toBe(angriff + jeTick);
      vorher = v.zenitHp;
    }
  });
});

describe('Bestimmtheit und Kriegsrat', () => {
  test('gleicher Samen, gleicher Kampf; «knapp» lässt nur Wiedergabe und Protokoll weg; die Helden bleiben, wie sie sind', () => {
    const { helden, stufen } = baueRaidGilde('anker');
    const aufstellung = raidMusterAufstellung('gut', helden);
    const vorher = JSON.stringify({ helden, stufen, aufstellung });
    for (const samen of [0, 7919, 4711]) {
      const r = raidKampf(ZENIT, helden, stufen, aufstellung, samen);
      expect(raidKampf(ZENIT, helden, stufen, aufstellung, samen)).toEqual(r);
      expect(raidKampf(ZENIT, helden, stufen, aufstellung, samen, { knapp: true })).toEqual({ ...r, verlauf: [], protokoll: [] });
      expect(r.verlauf).toHaveLength(r.runden);
      expect(r.protokoll.length).toBeGreaterThan(0);
    }
    expect(raidKampf(ZENIT, helden, stufen, aufstellung, 1).protokoll)
      .not.toEqual(raidKampf(ZENIT, helden, stufen, aufstellung, 2).protokoll);
    expect(JSON.stringify({ helden, stufen, aufstellung })).toBe(vorher);
  });

  test('der Kriegsrat rechnet 20 Proben mit festen Samen, einen Schritt je Probe, und ändert den Spielstand nicht', () => {
    const state = raidSpielstand('anker', 'gut');
    const vorher = JSON.stringify(state);
    const rat = kriegsratRechnen(state);
    expect(JSON.stringify(state)).toBe(vorher);

    const stand = state.raid!;
    const proben = Array.from({ length: KRIEGSRAT_PROBEN }, (_, i) =>
      raidKampf(ZENIT, raidTeilnehmer(state, stand), state.schmiede!.stufen, stand.aufstellung, kriegsratSamen(i), { knapp: true }));
    expect(rat.proben).toBe(20);
    expect(rat.siege).toBe(proben.filter(p => p.sieg).length);
    expect(rat.schnittRest).toBeCloseTo(proben.reduce((s, p) => s + p.zenitRest, 0) / 20, 12);
    expect(rat.funken).toEqual({ heldId: heldNamens(state, 'Sina').id, anzahl: 20 });
    expect(rat.probe.verlauf).toHaveLength(rat.probe.runden);
    expect(rat.schluessel).toBe(ratSchluessel(state, stand.aufstellung));
    expect(kriegsratRechnen(state)).toEqual(rat);

    const schritte = raidKriegsrat(state);
    const gezaehlt: number[] = [];
    for (let s = schritte.next(); !s.done; s = schritte.next()) gezaehlt.push(s.value);
    expect(gezaehlt).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test('der Rat gilt für Felder und Kampfwerte: Ausrüstung, Stufe, Schmiede und Feld eines Aufgestellten ändern den Schlüssel', () => {
    const state = raidSpielstand('anker', 'gut');
    const aufstellung = (): Record<string, Feld> => state.raid!.aufstellung;
    const schluessel = ratSchluessel(state, aufstellung());
    expect(ratSchluessel(state, aufstellung())).toBe(schluessel);
    expect(schluessel.startsWith(`${aufstellungSchluessel(aufstellung())}|`)).toBe(true);

    // Ausrüstung: Grimm legt seine Waffe ab und wieder an
    const grimm = heldNamens(state, 'Grimm');
    const waffe = grimm.gear.mainHand;
    grimm.gear.mainHand = null;
    expect(ratSchluessel(state, aufstellung())).not.toBe(schluessel);
    grimm.gear.mainHand = waffe;
    expect(ratSchluessel(state, aufstellung())).toBe(schluessel);

    // Schmiede: eine Stufe weniger auf einem seiner Teile
    const teil = Object.values(grimm.gear).find(id => id && state.schmiede!.stufen[id] !== undefined)!;
    state.schmiede!.stufen[teil]--;
    expect(ratSchluessel(state, aufstellung())).not.toBe(schluessel);
    state.schmiede!.stufen[teil]++;
    expect(ratSchluessel(state, aufstellung())).toBe(schluessel);

    // Feld: Grimm auf ein freies Feld
    const besetzt = new Set(Object.values(aufstellung()).map(f => `${f.reihe}:${f.spalte}`));
    const frei = Array.from({ length: 18 }, (_, i) => ({ reihe: Math.floor(i / 6), spalte: i % 6 })).find(f => !besetzt.has(`${f.reihe}:${f.spalte}`))!;
    expect(ratSchluessel(state, { ...aufstellung(), [String(grimm.id)]: frei })).not.toBe(schluessel);

    // Wer auf der Bank sitzt, zählt nicht
    const bank = held(999, 'ranger', 'Bankwart');
    state.fighters.push(bank);
    expect(ratSchluessel(state, aufstellung())).toBe(schluessel);
    bank.gear.mainHand = waffe;
    expect(ratSchluessel(state, aufstellung())).toBe(schluessel);

    // Stufe: dieselbe Gilde eine Stufe tiefer, dann steigt Grimm auf (awardXP hebt seine Werte)
    const jung = raidSpielstand('anker', 'gut', 14);
    const vorher = ratSchluessel(jung, jung.raid!.aufstellung);
    const grimm14 = heldNamens(jung, 'Grimm');
    expect(awardXP(grimm14, totalXpForLevel(15) - grimm14.xp)).toBe(1);
    expect(ratSchluessel(jung, jung.raid!.aufstellung)).not.toBe(vorher);
  });
});

// ── Der Raid im Spielstand ──

/** Spielstand mit der Muster-Gilde (Stufe 15), die Pfeiler des Tages bezwungen, Aufstellung nach Muster */
function raidSpielstand(gilde: RaidMusterName, aufstellung: RaidAufstellungName, stufe = 15): GameState {
  const state = createNewGameState();
  state.rngSeed = 4711;
  const { helden, stufen } = baueRaidGilde(gilde, { stufe });
  state.fighters = helden;
  state.schmiede = { stufen };
  state.globalStock.mat_tagstein = 0;
  merkeBezwungen(state, 'tagespfeiler', 1);
  raidStand(state).aufstellung = raidMusterAufstellung(aufstellung, helden);
  return state;
}

const heldNamens = (state: GameState, name: string): GuildFighter => state.fighters.find(f => f.name === name)!;
const arten = (e: ErnstkampfErgebnis): string[] => e.truhen.map(t => t.art);
const setTeile = (inhalt: Record<string, number>): string[] => Object.keys(inhalt).filter(id => setVonItem(id));

describe('Freischalten und Aufstellen', () => {
  test('offen erst, wenn die Pfeiler des Tages bezwungen sind (ein Sieg nur über das Rundenlimit zählt nicht)', () => {
    const state = createNewGameState();
    state.fighters = baueRaidGilde('anker').helden;
    expect(raidOffen(state)).toBe(false);
    expect(versuchsLage(state)).toMatchObject({ moeglich: false, grund: B.nochZu });
    expect(ernstkampf(state)).toBeNull();
    expect(state.raid!.versucheGesamt).toBe(0);

    const eintrag = {
      routeId: 'tagespfeiler', score: 1, difficulty: 'normal', modifier: null, status: 'victory' as const, partyClasses: [],
      timestamp: START, day: 1, enemiesKilled: 9, bossesKilled: 0,
    };
    state.scoreboard.push(eintrag);
    merkeBezwungen(state, 'erste_stadt', 1);
    expect(raidOffen(state)).toBe(false);
    state.scoreboard.push({ ...eintrag, bossesKilled: 1 });
    expect(raidOffen(state)).toBe(true);

    const neu = createNewGameState();
    merkeBezwungen(neu, 'tagespfeiler', 2);
    expect(raidOffen(neu)).toBe(true);
  });

  test('erster Besuch: alle, wie sie in der Gilde stehen, vorne voll, dann die Mitte (bei der Muster-Gilde «Naiv»)', () => {
    const state = createNewGameState();
    const { helden } = baueRaidGilde('anker');
    state.fighters = helden;
    expect(startAufstellung(state)).toEqual(raidMusterAufstellung('naiv', helden));
    expect(raidStand(state)).toEqual({
      aufstellung: raidMusterAufstellung('naiv', helden),
      woche: { id: wocheVon(START).id, start: wocheVon(START).start, versuche: 0, halbeTruhe: false, truhe: false },
      bestRest: null, versucheGesamt: 0, siege: 0, verlauf: [], einleitungGelesen: false, schlussGelesen: false,
    });
    expect(state.raid!.woche.id).toBe('2026-W43');
  });

  test('setzeHeld: tauschen, auf die Bank, höchstens zehn; entlassene Helden fallen aus der Aufstellung', () => {
    const state = createNewGameState();
    const { helden } = baueRaidGilde('anker');
    const neu = held(200, 'cleric', 'Neu');
    state.fighters = [...helden, neu];
    const feld = (id: number): Feld | undefined => raidStand(state).aufstellung[String(id)];
    const [brom, grimm] = helden;

    expect(feld(neu.id)).toBeUndefined(); // der Elfte sitzt auf der Bank
    expect(setzeHeld(state, neu.id, { reihe: 2, spalte: 5 })).toBe(false); // zehn stehen schon
    expect(setzeHeld(state, neu.id, { reihe: 0, spalte: 0 })).toBe(true); // auf Broms Feld: Brom geht auf die Bank
    expect([feld(neu.id), feld(brom.id)]).toEqual([{ reihe: 0, spalte: 0 }, undefined]);
    expect(setzeHeld(state, grimm.id, { reihe: 0, spalte: 0 })).toBe(true); // zwei Aufgestellte tauschen
    expect([feld(grimm.id), feld(neu.id)]).toEqual([{ reihe: 0, spalte: 0 }, { reihe: 0, spalte: 1 }]);

    // Dasselbe Feld, ausserhalb des Rasters, halbe Felder, Unbekannte, wer schon sitzt: nichts geschieht
    const vorher = JSON.stringify(state.raid);
    expect(setzeHeld(state, grimm.id, { reihe: 0, spalte: 0 })).toBe(false);
    expect(setzeHeld(state, grimm.id, { reihe: 3, spalte: 0 })).toBe(false);
    expect(setzeHeld(state, grimm.id, { reihe: 0, spalte: 6 })).toBe(false);
    expect(setzeHeld(state, grimm.id, { reihe: 0.5, spalte: 1 })).toBe(false);
    expect(setzeHeld(state, 999, { reihe: 2, spalte: 5 })).toBe(false);
    expect(setzeHeld(state, brom.id, null)).toBe(false);
    expect(JSON.stringify(state.raid)).toBe(vorher);

    expect(setzeHeld(state, neu.id, null)).toBe(true);
    expect(setzeHeld(state, brom.id, { reihe: 2, spalte: 5 })).toBe(true);
    expect(Object.keys(raidStand(state).aufstellung)).toHaveLength(10);

    state.fighters = state.fighters.filter(f => f.id !== brom.id);
    expect(feld(brom.id)).toBeUndefined();
    expect(Object.keys(raidStand(state).aufstellung)).toHaveLength(9);
    aufstellungLeeren(state);
    expect(raidStand(state).aufstellung).toEqual({});
  });
});

describe('Woche und Kosten', () => {
  test('drei freie Ernstkämpfe, dann 10 Tagstein; mit zu wenig Tagstein bleibt alles, wie es war', () => {
    // Die Vier allein bringen Zenit nie unter die Hälfte: keine Truhe, kein Tagstein dazwischen
    const state = raidSpielstand('kern', 'gut');
    for (let i = 0; i < 3; i++) {
      expect(versuchsLage(state)).toEqual({ moeglich: true, frei: true, freiUebrig: 3 - i, kosten: {} });
      expect(ernstkampf(state)).toMatchObject({ frei: true, kosten: {}, truhen: [] });
    }
    expect(versuchsLage(state)).toEqual({
      moeglich: false, frei: false, freiUebrig: 0, kosten: { mat_tagstein: 10 }, grund: B.zuWenigTagstein(0, 10),
    });
    state.globalStock.mat_tagstein = 9;
    const vorher = JSON.stringify(state);
    expect(ernstkampf(state)).toBeNull();
    expect(JSON.stringify(state)).toBe(vorher);
    expect(versuchsLage(state).grund).toBe(B.zuWenigTagstein(9, 10));

    state.globalStock.mat_tagstein = 25;
    expect(versuchsLage(state)).toEqual({ moeglich: true, frei: false, freiUebrig: 0, kosten: { mat_tagstein: 10 } });
    expect(ernstkampf(state)).toMatchObject({ frei: false, kosten: { mat_tagstein: 10 } });
    expect(state.globalStock.mat_tagstein).toBe(15);
    expect(state.raid!).toMatchObject({ versucheGesamt: 4, woche: { versuche: 4 } });
  });

  test('gesperrt, solange eine Expedition unterwegs ist oder weniger als vier Helden oben stehen', () => {
    const state = raidSpielstand('kern', 'gut');
    setzeHeld(state, heldNamens(state, 'Sina').id, null);
    expect(versuchsLage(state)).toMatchObject({ moeglich: false, grund: B.mindestens(4) });
    expect(ernstkampf(state)).toBeNull();
    setzeHeld(state, heldNamens(state, 'Sina').id, { reihe: 2, spalte: 5 });
    expect(versuchsLage(state).moeglich).toBe(true);
    state.activeExpedition = { routeId: 'forest_short' } as unknown as NonNullable<GameState['activeExpedition']>;
    expect(versuchsLage(state)).toMatchObject({ moeglich: false, grund: B.unterwegs });
    expect(ernstkampf(state)).toBeNull();
    expect(state.raid!.versucheGesamt).toBe(0);
  });

  test('am Montag beginnt eine neue Woche; eine zurückgestellte Uhr ändert nichts; der Montag-Satz', () => {
    const state = raidSpielstand('kern', 'gut');
    for (let i = 0; i < 3; i++) ernstkampf(state);
    expect(montagSatz(state.raid!)).toBeNull(); // noch keine frühere Woche

    vi.setSystemTime(new Date(2026, 9, 25, 23, 59).getTime()); // Sonntagabend: dieselbe Woche
    expect(raidStand(state).woche).toMatchObject({ id: '2026-W43', versuche: 3 });
    expect(versuchsLage(state).frei).toBe(false);

    vi.setSystemTime(new Date(2026, 9, 26, 0, 0).getTime()); // Montag, 0 Uhr
    const montag = wocheVon(Date.now());
    expect(raidStand(state).woche).toEqual({ id: '2026-W44', start: montag.start, versuche: 0, halbeTruhe: false, truhe: false });
    expect(versuchsLage(state)).toMatchObject({ moeglich: true, frei: true, freiUebrig: 3 });
    expect(state.raid!.versucheGesamt).toBe(3);
    expect(montagSatz(state.raid!)).toBe(RAID_TEXTE.montagVorSieg);
    state.raid!.montagGesehen = '2026-W44';
    expect(montagSatz(state.raid!)).toBeNull();
    ernstkampf(state);

    vi.setSystemTime(START); // Uhr zurück: es bleibt die neue Woche
    expect(raidStand(state).woche).toMatchObject({ id: '2026-W44', versuche: 1 });
    expect(versuchsLage(state).freiUebrig).toBe(2);
  });

  test('der Samen hängt an Spielstand, Woche und Versuch: nach dem Neuladen derselbe Kampf', () => {
    const state = raidSpielstand('anker', 'gut');
    const geladen = JSON.parse(JSON.stringify(state)) as GameState;
    const samen = raidSamen(state, state.raid!);
    expect(raidSamen(geladen, geladen.raid!)).toBe(samen);
    expect(raidSamen(state, state.raid!, 'truhe')).not.toBe(samen);
    const a = ernstkampf(state)!;
    const b = ernstkampf(geladen)!;
    expect(b.ergebnis).toEqual(a.ergebnis);
    expect(b.truhen).toEqual(a.truhen);
    expect(a.ergebnis).toEqual(raidKampf(ZENIT, state.fighters, state.schmiede!.stufen, state.raid!.aufstellung, samen));
    expect(raidSamen(state, state.raid!)).not.toBe(samen); // der nächste Versuch hat einen anderen
  });
});

describe('Truhen', () => {
  test('«Was vom Pendel fiel» einmal je Woche, sobald Zenit unter die Hälfte kommt', () => {
    const state = raidSpielstand('anker', 'lehrbuch');
    const erste = ernstkampf(state)!;
    expect(erste.ergebnis.sieg).toBe(false);
    expect(erste.ergebnis.zenitRest).toBeLessThan(ZENIT.halbUnter);
    expect(arten(erste)).toEqual(['halb']);
    const truhe = erste.truhen[0];
    expect(truhe).toMatchObject({ name: ZENIT.truhen.halb.name, text: ZENIT.truhen.halb.text });
    // Ein fehlendes Teil der Stufen 4 bis 8 (die Muster-Gilde trägt nur ganze Sets), dazu Gold und Tagstein
    const [teil] = setTeile(truhe.inhalt);
    expect(setVonItem(teil)!.tier).toBeGreaterThanOrEqual(4);
    expect(setVonItem(teil)!.tier).toBeLessThanOrEqual(8);
    expect(truhe.inhalt).toEqual({ gold: 150, [teil]: 1, mat_tagstein: 5 });
    expect(besitz(state, teil)).toBe(1);
    expect(state.globalStock.mat_tagstein).toBe(5);

    expect(arten(ernstkampf(state)!)).toEqual([]);
    expect(arten(ernstkampf(state)!)).toEqual([]);
    vi.setSystemTime(START + WOCHE);
    expect(arten(ernstkampf(state)!)).toEqual(['halb']);

    // Die Vier allein bringen Zenit nie unter die Hälfte
    const kern = raidSpielstand('kern', 'gut');
    const k = ernstkampf(kern)!;
    expect(k.ergebnis.zenitRest).toBeGreaterThanOrEqual(ZENIT.halbUnter);
    expect(k.truhen).toEqual([]);
  });

  test('«Zenits Truhe» einmal je Woche beim Sieg; die Unruh nur zum ersten Sieg überhaupt', () => {
    const state = raidSpielstand('sets5', 'profi');
    state.statistics.tat_pfeiler = 1; // Orm hat die Pfeiler gezählt
    const goldVorher = state.globalStock.gold ?? 0;
    const erste = ernstkampf(state)!;
    expect(erste.ergebnis.sieg).toBe(true);
    expect(erste.ersterSieg).toBe(true);
    // Ein Sieg ist auch der erste Kampf unter der Hälfte: beide Truhen, dazu die Unruh
    expect(arten(erste)).toEqual(['halb', 'sieg', 'erster']);
    const sieg = erste.truhen[1];
    expect(sieg).toMatchObject({ name: ZENIT.truhen.sieg.name, text: ZENIT.truhen.sieg.text });
    expect(sieg.inhalt.mat_tagstein).toBe(10);
    expect(sieg.inhalt.crystal_shard).toBeGreaterThanOrEqual(15);
    // Je Nennung in wuerfeAus ein Wurf mit dem festen Gold seiner Tabelle: viermal genannt, viermal gewürfelt
    const wuerfe = ZENIT.truhen.sieg.wuerfeAus.map(id => LOOT_TABLE_DEFS[id].guaranteedGold);
    expect(sieg.inhalt.gold).toBeGreaterThanOrEqual(wuerfe.reduce((s, g) => s + g.min, 0));
    expect(sieg.inhalt.gold).toBeLessThanOrEqual(wuerfe.reduce((s, g) => s + g.max, 0));
    expect(setTeile(sieg.inhalt)).toHaveLength(1);
    expect(erste.truhen[2]).toMatchObject({ art: 'erster', name: RAID_TEXTE.unruh.name, inhalt: { die_unruh: 1 } });
    expect(state.globalStock.die_unruh).toBe(1);
    expect(state.globalStock.gold - goldVorher).toBe(erste.truhen.reduce((s, t) => s + (t.inhalt.gold ?? 0), 0));
    expect(erste.ergebnis.ansagen).toContain(A.abriss);

    const zweite = ernstkampf(state)!;
    expect([zweite.ergebnis.sieg, zweite.ersterSieg, zweite.truhen]).toEqual([true, false, []]);
    expect(zweite.ergebnis.ansagen).not.toContain(A.abriss);

    vi.setSystemTime(START + WOCHE);
    const naechste = ernstkampf(state)!;
    expect([naechste.ergebnis.sieg, naechste.ersterSieg, arten(naechste)]).toEqual([true, false, ['halb', 'sieg']]);
    expect(state.globalStock.die_unruh).toBe(1);
    expect(state.raid!.siege).toBe(3);
  });

  test('Set-Teil: zuerst aus angefangenen Sets, dann aus dem Stufenbereich, sonst jede Stufe (nur Zenits Truhe)', () => {
    const { halb, sieg } = ZENIT.truhen;
    const state = raidSpielstand('anker', 'gut');
    const ysra = heldNamens(state, 'Ysra');
    const grimm = heldNamens(state, 'Grimm');
    const ganzesSet = { ...ysra.gear };
    const ziehe = (regel: typeof halb.setTeil, samen = 1): string | null =>
      fehlendesSetTeil(state, state.fighters, regel, new SeededRNG(samen));
    const stufe = (teil: string | null): number => setVonItem(teil ?? '')!.tier;

    // Ysra trägt zwei Teile aus dem Himmelsarchiv (Stufe 6): beide Truhen geben das dritte
    ysra.gear = { mainHand: 'set_archiv_stab', offHand: null, armor: 'set_archiv_robe', trinket: null };
    for (const samen of [1, 2, 3]) {
      expect(ziehe(halb.setTeil, samen)).toBe('set_archiv_amulett');
      expect(ziehe(sieg.setTeil, samen)).toBe('set_archiv_amulett');
    }

    // Zwei Teile der Spinne (Stufe 2): Zenits Truhe nimmt angefangene Sets jeder Stufe,
    // «Was vom Pendel fiel» nur aus den Stufen 4 bis 8
    ysra.gear = { mainHand: 'set_spinne_dolch', offHand: null, armor: 'set_spinne_robe', trinket: null };
    expect(ziehe(sieg.setTeil)).toBe('set_spinne_ring');
    for (const samen of [1, 2, 3, 4, 5]) {
      const teil = ziehe(halb.setTeil, samen);
      expect(stufe(teil)).toBeGreaterThanOrEqual(4);
      expect(stufe(teil)).toBeLessThanOrEqual(8);
      expect(besitz(state, teil!)).toBe(0);
    }

    // Nichts angefangen: aus dem Bereich (Grimm hat das Wachfeuer, Stufe 11, abgelegt)
    ysra.gear = ganzesSet;
    grimm.gear = { mainHand: null, offHand: null, armor: null, trinket: null };
    for (const samen of [1, 2, 3, 4, 5]) {
      expect(['set_wachfeuer_hammer', 'set_wachfeuer_platte', 'set_wachfeuer_talisman']).toContain(ziehe(sieg.setTeil, samen));
    }

    // Im Bereich fehlt nichts mehr: Zenits Truhe nimmt jede Stufe, «Was vom Pendel fiel» nichts
    for (const set of DUNGEON_SETS) for (const id of setTeilIds(set)) if (id !== 'set_rudel_klinge') state.globalStock[id] = 1;
    expect(ziehe(sieg.setTeil)).toBe('set_rudel_klinge');
    expect(ziehe(halb.setTeil)).toBeNull();
    state.globalStock.set_rudel_klinge = 1;
    expect(ziehe(sieg.setTeil)).toBeNull();
  });

  test('fehlt kein Set-Teil mehr, gibt es Kristallsplitter statt des Teils', () => {
    const state = raidSpielstand('anker', 'gut');
    for (const set of DUNGEON_SETS) for (const id of setTeilIds(set)) state.globalStock[id] = 1;
    const lagerVorher = { ...state.globalStock };
    const halb = truheZiehen(state, 'halb', ZENIT.truhen.halb, state.fighters, new SeededRNG(1));
    expect(halb.inhalt).toEqual({ gold: 150, mat_tagstein: 5, crystal_shard: 8 });
    for (const [id, menge] of Object.entries(halb.inhalt)) expect(state.globalStock[id]).toBe((lagerVorher[id] ?? 0) + menge);

    const sieg = truheZiehen(state, 'sieg', ZENIT.truhen.sieg, state.fighters, new SeededRNG(1));
    expect(setTeile(sieg.inhalt)).toEqual([]);
    expect(sieg.inhalt.mat_tagstein).toBe(10);
    expect(sieg.inhalt.crystal_shard).toBeGreaterThanOrEqual(35);

    // Mit einem fehlenden Teil: das Teil und keine Splitter
    delete state.globalStock.set_lich_stab;
    const mitTeil = truheZiehen(state, 'halb', ZENIT.truhen.halb, state.fighters, new SeededRNG(1));
    expect(mitTeil.inhalt).toEqual({ gold: 150, set_lich_stab: 1, mat_tagstein: 5 });
    expect(state.globalStock.set_lich_stab).toBe(1);
  });

  test('Zenits Truhe ohne fehlendes Teil: die 20 Kristallsplitter kommen zu den 15 dazu, zusammen 35', () => {
    const allesDa = (): GameState => {
      const state = raidSpielstand('anker', 'gut');
      for (const set of DUNGEON_SETS) for (const id of setTeilIds(set)) state.globalStock[id] = 1;
      return state;
    };
    // Ohne die Würfe bleiben nur Tagstein und Splitter: 15 aus den Dingen und 20 statt des Teils
    const state = allesDa();
    const ohneWuerfe = { ...ZENIT.truhen.sieg, wuerfeAus: [] };
    expect(truheZiehen(state, 'sieg', ohneWuerfe, state.fighters, new SeededRNG(1)).inhalt)
      .toEqual({ mat_tagstein: 10, crystal_shard: 35 });

    // Mit den Würfen (gleicher Samen, also dieselben Würfe): ohne fehlendes Teil genau 20 Splitter mehr als mit einem
    const ziehe = (spiel: GameState): Record<string, number> =>
      truheZiehen(spiel, 'sieg', ZENIT.truhen.sieg, spiel.fighters, new SeededRNG(7)).inhalt;
    const voll = ziehe(allesDa());
    const ohneStab = allesDa();
    delete ohneStab.globalStock.set_lich_stab;
    const { set_lich_stab: stab, ...rest } = ziehe(ohneStab);
    expect(stab).toBe(1);
    expect(voll).toEqual({ ...rest, crystal_shard: (rest.crystal_shard ?? 0) + 20 });
  });
});

describe('XP, Zähler und Bestversuch', () => {
  test('XP: 300 für jeden Teilnehmer beim Sieg, 100 bei der Niederlage, nichts für die Bank', () => {
    const state = raidSpielstand('sets5', 'profi');
    const bank = held(200, 'cleric', 'Banko');
    state.fighters.push(bank);
    const xpVorher = new Map(state.fighters.map(f => [f.id, f.xp]));
    const sieg = ernstkampf(state)!;
    expect(sieg.ergebnis.sieg).toBe(true);
    expect(sieg.xp.map(x => [x.heldId, x.xp])).toEqual(raidTeilnehmer(state, state.raid!).map(h => [h.id, ZENIT.xp.sieg]));
    expect(sieg.xp).toHaveLength(10);
    for (const f of state.fighters) expect(f.xp - xpVorher.get(f.id)!).toBe(f === bank ? 0 : 300);

    const kern = raidSpielstand('kern', 'gut');
    const kernVorher = kern.fighters.map(f => f.xp);
    const niederlage = ernstkampf(kern)!;
    expect(niederlage.ergebnis.sieg).toBe(false);
    expect(niederlage.xp.map(x => x.xp)).toEqual([100, 100, 100, 100]);
    expect(kern.fighters.map((f, i) => f.xp - kernVorher[i])).toEqual([100, 100, 100, 100]);
  });

  test('Zähler in state.statistics und die Erfolge des Raids', () => {
    const state = raidSpielstand('anker', 'profi');
    state.globalStock.mat_tagstein = 100;
    const kaempfe = Array.from({ length: 5 }, () => ernstkampf(state)!);
    const siege = kaempfe.map(k => k.ergebnis).filter(e => e.sieg);
    const zahl = (id: string): number => state.statistics[id] ?? 0;
    expect(siege.length).toBeGreaterThan(0);
    expect(['raid_versuche', 'raid_siege', 'raid_punkt_zwoelf', 'raid_mehr_als_vier', 'raid_wochen', 'raid_zu_viert'].map(zahl))
      .toEqual([5, siege.length, siege.filter(e => e.runden <= 12).length, siege.filter(e => e.stehend >= 5).length, 1, 0]);
    expect(kaempfe[0].neueErfolge).toContain('raid_versuch');
    expect(state.achievements).toContain('raid_sieg');
    expect(state.achievements.includes('raid_punkt_zwoelf')).toBe(zahl('raid_punkt_zwoelf') > 0);
    expect(state.achievements.includes('raid_mehr_als_vier')).toBe(zahl('raid_mehr_als_vier') > 0);
    expect(state.achievements).not.toContain('raid_zu_viert');

    // Zu viert (versteckt)
    for (const h of state.fighters.slice(4)) setzeHeld(state, h.id, null);
    const viert = ernstkampf(state)!;
    expect(viert.ergebnis.helden).toBe(4);
    expect(zahl('raid_zu_viert')).toBe(1);
    expect(viert.neueErfolge).toContain('raid_zu_viert');
    expect(viert.ergebnis.ansagen).toContain(A.vier);
  });

  test('«Jeden Montag»: raid_wochen zählt nur den ersten Sieg einer Woche', () => {
    const state = raidSpielstand('sets5', 'profi');
    for (let woche = 0; woche < 4; woche++) {
      vi.setSystemTime(START + woche * WOCHE);
      expect(ernstkampf(state)!.ergebnis.sieg).toBe(true);
      expect(ernstkampf(state)!.ergebnis.sieg).toBe(true);
      expect(state.statistics.raid_wochen).toBe(woche + 1);
    }
    expect(state.statistics.raid_siege).toBe(8);
    expect(state.achievements).toContain('raid_montage');
  });

  test('Bestversuch und Verlauf: kleinster Rest, höchstens zehn Einträge, die neuesten zuerst', () => {
    const state = raidSpielstand('anker', 'lehrbuch');
    state.globalStock.mat_tagstein = 100;
    const reste: number[] = [];
    let best: number | null = null;
    for (let i = 0; i < 12; i++) {
      vi.setSystemTime(START + i * 60_000);
      const e = ernstkampf(state)!;
      const rest = e.ergebnis.zenitRest;
      expect([e.bestVorher, e.neuerBest]).toEqual([best, best !== null && rest < best]);
      best = best === null ? rest : Math.min(best, rest);
      reste.push(rest);
    }
    const stand = state.raid!;
    expect(stand.bestRest).toBe(Math.min(...reste));
    expect(stand.verlauf).toHaveLength(VERLAUF_LAENGE);
    expect(stand.verlauf.map(v => v.rest)).toEqual(reste.slice(-10).reverse());
    expect(stand.verlauf[0]).toMatchObject({ zeit: START + 11 * 60_000, woche: '2026-W43', sieg: false, helden: 10, stehend: 0 });

    expect([0, 0.00001, 0.234, 0.5, 1].map(restProzent)).toEqual([0, 1, 24, 50, 100]);
  });
});

describe('Alrunas Liste', () => {
  test('«Gut»: Funken wohl auf Sina, niemand daneben; «Lehrbuch»: Sina mit Moos und Ysra; Warnungen zuerst', () => {
    const gut = raidSpielstand('anker', 'gut');
    const vorher = JSON.stringify(gut);
    const lage = raidLage(gut);
    expect(JSON.stringify(gut)).toBe(vorher);
    const id = (name: string): number => heldNamens(gut, name).id;
    expect(lage.pendelZiele).toEqual([id('Brom'), id('Grimm')]);
    expect(lage.glockenReihe).toBe(2);
    expect([lage.funkenZiel, lage.funkenNachbarn]).toEqual([id('Sina'), []]);
    expect(lage.trupps.map(t => [t.anzahl, t.heiler])).toEqual([[5, ['Ewin']], [5, ['Ansgar', 'Moos']]]);
    expect(lage.hinweise).toContainEqual({ art: 'funken', ok: true, text: L.funkenOk('Sina'), felder: [{ reihe: 2, spalte: 5 }] });
    expect(lage.hinweise).toContainEqual(expect.objectContaining({ art: 'zahl', ok: true, text: L.zahl(10, 10) }));

    const lehrbuch = hinweise(raidSpielstand('anker', 'lehrbuch'));
    expect(lehrbuch).toContainEqual(expect.objectContaining({ art: 'funken', ok: false, text: L.funkenNachbarn('Sina', ['Moos', 'Ysra']) }));

    for (const liste of [lage.hinweise, lehrbuch]) {
      const erstesOk = liste.findIndex(h => h.ok);
      expect(erstesOk).toBeGreaterThan(0);
      expect(liste.slice(erstesOk).every(h => h.ok)).toBe(true);
    }
  });

  test('leere Spalten mit ihren Runden, Trupps ohne Heiler; vier sind erlaubt, sechs von zehn zu wenig', () => {
    const kern = hinweise(raidSpielstand('kern', 'gut'));
    for (const [spalte, runden] of [['B', [2, 8, 14, 20]], ['C', [3, 9, 15, 21]], ['D', [4, 10, 16, 22]], ['E', [5, 11, 17, 23]]] as const) {
      expect(kern).toContainEqual({ art: 'zeiger', ok: false, text: L.zeigerLeer(spalte, [...runden]), felder: [] });
    }
    expect(kern).toContainEqual(expect.objectContaining({ art: 'trupp', ok: false, text: L.truppOhneHeiler('Links') }));
    expect(kern).toContainEqual(expect.objectContaining({ art: 'trupp', ok: false, text: L.truppOhneHeiler('Rechts') }));
    expect(kern[kern.length - 1]).toEqual({ art: 'zahl', ok: true, text: L.zahl(4, 10), felder: [] });

    const sechs = raidSpielstand('anker', 'gut');
    for (const name of ['Liedra', 'Ysra', 'Morn', 'Moos']) setzeHeld(sechs, heldNamens(sechs, name).id, null);
    expect(hinweise(sechs)).toContainEqual({ art: 'zahl', ok: false, text: L.zahl(6, 10), felder: [] });
  });

  test('zweimal Phalanx in einem Trupp: es zählt nur die stärkere', () => {
    const state = raidSpielstand('anker', 'gut');
    const [bruno] = baueRaidGilde('kern', { ersteId: 300 }).helden; // ein zweiter Wächter mit Phalanx-Weg, ohne Ausrüstung
    bruno.name = 'Bruno';
    bruno.gear = { mainHand: null, offHand: null, armor: null, trinket: null };
    state.fighters.push(bruno);
    expect(hinweise(state).some(h => h.text === L.truppDoppelt('Links', TRUPP_WIRKUNGEN.phalanx))).toBe(false);
    expect(setzeHeld(state, bruno.id, { reihe: 2, spalte: 0 })).toBe(true); // Lias Feld, Lia geht auf die Bank
    expect(hinweise(state)).toContainEqual({
      art: 'trupp', ok: false, text: L.truppDoppelt('Links', TRUPP_WIRKUNGEN.phalanx), felder: [{ reihe: 0, spalte: 0 }, { reihe: 2, spalte: 0 }],
    });
  });
});

describe('Speichern und Laden', () => {
  /** Speicher im Arbeitsspeicher statt localStorage (wie in SaveSystem.test.ts) */
  function speicher(): Storage {
    const daten = new Map<string, string>();
    return {
      get length() { return daten.size; },
      clear: () => daten.clear(),
      getItem: (key: string) => daten.get(key) ?? null,
      key: (index: number) => [...daten.keys()][index] ?? null,
      removeItem: (key: string) => { daten.delete(key); },
      setItem: (key: string, value: string) => { daten.set(key, String(value)); },
    };
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', speicher());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    hebeSperreNachLadenAuf();
  });
  afterEach(() => {
    hebeSperreNachLadenAuf();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('der Raid kommt unverändert zurück; Entlassene, halbe Felder, Felder neben dem Raster und doppelte fallen weg', () => {
    const saveSystem = new SaveSystem();
    const state = raidSpielstand('anker', 'gut');
    ernstkampf(state);
    expect(saveSystem.save(state)).toBe(true);
    expect(saveSystem.load()!.raid).toEqual(state.raid);

    // Eine Datei: Morn entlassen, Lia auf einem halben Feld, Sina neben dem Raster, Ysra auf Broms Feld
    const datei = JSON.parse(saveSystem.spielstandText()!) as GameState;
    const id = (name: string): string => String(heldNamens(state, name).id);
    datei.fighters = datei.fighters.filter(f => f.name !== 'Morn');
    datei.raid!.aufstellung[id('Lia')] = { reihe: 1.5, spalte: 0 };
    datei.raid!.aufstellung[id('Sina')] = { reihe: 2, spalte: 6 };
    datei.raid!.aufstellung[id('Ysra')] = { reihe: 0, spalte: 0 };
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(datei)).ok).toBe(true);

    const geladen = saveSystem.load()!;
    const erwartet = raidMusterAufstellung('gut', state.fighters, ['Morn', 'Lia', 'Sina', 'Ysra']);
    expect(raidStand(geladen).aufstellung).toEqual(erwartet);
    expect(geladen.raid).toEqual({ ...state.raid, aufstellung: erwartet });
  });

  test('fehlt der Bestversuch in einer Datei, steht auf der Karte «Noch kein Versuch», nicht «NaN %»', () => {
    const saveSystem = new SaveSystem();
    const state = raidSpielstand('anker', 'gut');
    expect(saveSystem.save(state)).toBe(true);
    const datei = JSON.parse(saveSystem.spielstandText()!) as GameState;
    delete (datei.raid as Partial<RaidStand>).bestRest;
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(datei)).ok).toBe(true);

    const geladen = saveSystem.load()!;
    expect(geladen.raid!.bestRest).toBeUndefined();
    // Die Karte liest nur und legt nichts an
    expect(raidKartenZustand(geladen)).toEqual({ offen: true, zeile: RAID_TEXTE.karte.keinVersuch, zwoelf: false, truheWartet: true });
    expect(geladen.raid!.bestRest).toBeUndefined();
    // raidStand trägt «noch keiner» nach; der erste Ernstkampf setzt ihn
    expect(raidStand(geladen).bestRest).toBeNull();
    const e = ernstkampf(geladen)!;
    expect(geladen.raid!.bestRest).toBe(e.ergebnis.zenitRest);
    expect(raidKartenZustand(geladen).zeile).not.toContain('NaN');
  });

  test('Stufe II kommt unverändert zurück, Felder neben ihrem Raster fallen weg; eine Datei ohne raidStufen lädt', () => {
    const saveSystem = new SaveSystem();
    const state = stufeZweiSpielstand('gut');
    ernstkampf(state, Date.now(), DREIZEHN);
    expect(saveSystem.save(state)).toBe(true);
    const geladen = saveSystem.load()!;
    expect(geladen.raidStufen).toEqual(state.raidStufen);
    expect(geladen.raid).toEqual(state.raid);

    // Eine Datei: Sina auf einer zehnten Spalte, die es nicht gibt
    const datei = JSON.parse(saveSystem.spielstandText()!) as GameState;
    datei.raidStufen!.dreizehn.aufstellung[String(heldNamens(state, 'Sina').id)] = { reihe: 1, spalte: 9 };
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(datei)).ok).toBe(true);
    expect(raidStand(saveSystem.load()!, Date.now(), DREIZEHN).aufstellung)
      .toEqual(raidMusterAufstellungDreizehn('gut', state.fighters, ['Sina']));

    // Eine Datei von vor Stufe II, ohne raidStufen: Stufe I bleibt, wie sie war, Stufe II beginnt beim ersten Besuch
    hebeSperreNachLadenAuf(); // im Spiel: die Seite lädt neu
    delete datei.raidStufen;
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(datei)).ok).toBe(true);
    const alt = saveSystem.load()!;
    expect(alt.raidStufen).toBeUndefined();
    expect(alt.raid).toEqual(state.raid);
    expect(raidKartenZustand(alt, Date.now(), DREIZEHN)).toEqual({
      offen: true, zeile: RAID_TEXTE.karte.keinVersuch, zwoelf: false, truheWartet: true,
    });
    expect(alt.raidStufen).toBeUndefined();
    expect(raidStand(alt, Date.now(), DREIZEHN)).toMatchObject({ aufstellung: startAufstellung(alt, DREIZEHN), versucheGesamt: 0, siege: 0 });
    expect(alt.raidStufen?.dreizehn).toBeDefined();
  });
});

// ── Stufe II: Die dreizehnte Stunde ──

const D = STUFEN_TEXTE.dreizehn;

/** Nur die genannten Regeln schlagen zu, mit dem Gegenzeiger der Stufe II (wie nurDie) */
const nurDieZwei = (...bleiben: string[]) =>
  (['pendel', 'zeiger', 'gegenzeiger', 'durchschlag', 'glocke', 'funken', 'mittag'] as const).filter(r => !bleiben.includes(r));

/**
 * Das Probefeld der Stufe II: neun Spalten, drei Trupps, zähe Helden. Spalte H ist leer; auf E, wo sich die Zeiger
 * treffen, stehen zwei.
 *          A    B    C   |  D    E    F   |  G    H    I
 *   vorn   Aa   Bb   Cc  |  Dd   .    Ff  |  Gg   .    Ii
 *   Mitte  .    .    .   |  .    Ee   .   |  .    .    .
 *   hinten .    .    .   |  .    Ez   .   |  .    .    .
 */
function probefeldZwei(): { helden: GuildFighter[]; aufstellung: Record<string, Feld> } {
  return {
    helden: [
      held(1, 'guardian', 'Aa'), held(2, 'berserker', 'Bb'), held(3, 'ranger', 'Cc'), held(4, 'assassin', 'Dd'),
      held(5, 'witch', 'Ee'), held(6, 'bard', 'Ez'), held(7, 'necromancer', 'Ff'), held(8, 'guardian', 'Gg'),
      held(9, 'berserker', 'Ii'),
    ],
    aufstellung: felder([1, 0, 0], [2, 0, 1], [3, 0, 2], [4, 0, 3], [5, 1, 4], [6, 2, 4], [7, 0, 5], [8, 0, 6], [9, 0, 8]),
  };
}

/** Jede Spalte mit einem Helden vorn, nur auf E steht Halm (mit `leben`) in der Mitte */
function jedeSpalteEiner(leben: number): { helden: GuildFighter[]; aufstellung: Record<string, Feld> } {
  const klassen = ['guardian', 'berserker', 'ranger', 'assassin', 'witch', 'bard', 'necromancer', 'guardian', 'berserker'];
  const helden = klassen.map((k, i) => held(i + 1, k, i === 4 ? 'Halm' : `S${spaltenName(i)}`, i === 4 ? { hp: leben, maxHp: leben } : {}));
  return { helden, aufstellung: felder(...helden.map((h, i): [number, number, number] => [h.id, i === 4 ? 1 : 0, i])) };
}

/**
 * Spielstand mit der Muster-Gilde «anker15» (Stufe 15, sonst `stufe`), die Pfeiler bezwungen, Zenit auf Stufe I einmal
 * besiegt (Stufe II offen), Stufe II nach Muster aufgestellt
 */
function stufeZweiSpielstand(aufstellung: RaidAufstellungDreizehn, stufe = 15): GameState {
  const state = createNewGameState();
  state.rngSeed = 4711;
  const { helden, stufen } = baueRaidGilde('anker15', { stufe });
  state.fighters = helden;
  state.schmiede = { stufen };
  state.globalStock.mat_tagstein = 0;
  merkeBezwungen(state, 'tagespfeiler', 1);
  raidStand(state).siege = 1;
  raidStand(state, Date.now(), DREIZEHN).aufstellung = raidMusterAufstellungDreizehn(aufstellung, helden);
  return state;
}

describe('Stufe II: die Regeln mit Gegenzeiger und drei Trupps', () => {
  test('Gegenzeiger I bis A und wieder I; mit dem Zeiger auf E in Runde 5, 14 und 23; Pendel reihum über drei Trupps', () => {
    expect(spaltenZahl(DREIZEHN)).toBe(9);
    expect(Array.from({ length: 19 }, (_, i) => gegenzeigerSpalte(i + 1, 9)))
      .toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0, 8, 7, 6, 5, 4, 3, 2, 1, 0, 8]);
    expect(zeigerRunden(4, 9, 24)).toEqual([5, 14, 23]);
    expect(zeigerRunden(4, 9, 24, true)).toEqual([5, 14, 23]);
    expect(zeigerRunden(0, 9, 24, true)).toEqual([9, 18]);
    expect(zeigerRunden(8, 9, 24, true)).toEqual([1, 10, 19]);
    expect(treffpunkte(DREIZEHN)).toEqual([{ spalte: 4, runden: [5, 14, 23] }]);
    // Stufe I hat keinen Gegenzeiger (und mit sechs Spalten träfen sich zwei Zeiger nie auf einer)
    expect(ZENIT.regeln.gegenzeiger).toBeUndefined();
    expect(treffpunkte(ZENIT)).toEqual([]);
    expect(treffpunkte({ ...ZENIT, regeln: { ...ZENIT.regeln, gegenzeiger: 1 } })).toEqual([]);

    expect([0, 1, 2].map(t => truppName(t, 3))).toEqual(['Links', 'Mitte', 'Rechts']);
    expect([1, 2, 3, 4].map(r => pendelTrupp(r, 3, () => true))).toEqual([0, 1, 2, 0]);
    // Ist die Mitte leer, nimmt das Pendel ihre Runden mit nach rechts
    expect([1, 2, 3, 4].map(r => pendelTrupp(r, 3, t => t !== 1))).toEqual([0, 2, 2, 0]);
  });

  test('auf dem Probefeld II: Zeiger vorwärts, Gegenzeiger rückwärts, auf E beide nacheinander, leere Spalte H von beiden', () => {
    const { helden, aufstellung } = probefeldZwei();
    const r = raidKampf(DREIZEHN, helden, {}, aufstellung, 42, { ohne: nurDieZwei('zeiger', 'gegenzeiger', 'durchschlag', 'mittag') });
    expect(r).toMatchObject({ sieg: false, runden: 24, mitternacht: true, helden: 9, stehend: 9, gefallen: [] });

    const jedeRunde = (spalte: (runde: number) => number): number[][] =>
      Array.from({ length: 24 }, (_, i) => [i + 1, spalte(i + 1)]).filter(([, s]) => s !== 7);
    expect(ereignisse(r, 'zeiger').map(e => [e.runde, e.spalte])).toEqual(jedeRunde(runde => (runde - 1) % 9));
    expect(ereignisse(r, 'gegenzeiger').map(e => [e.runde, e.spalte])).toEqual(jedeRunde(runde => 8 - ((runde - 1) % 9)));
    // H ist leer: Durchschlag, vom Gegenzeiger in Runde 2, 11 und 20, vom Zeiger in Runde 8 und 17; ab Mittag × 1,5
    expect(ereignisse(r, 'durchschlag').map(e => [e.runde, e.spalte, e.gegen === true, werte(e)])).toEqual([
      [2, 7, true, Array(9).fill(66)], [8, 7, false, Array(9).fill(66)], [11, 7, true, Array(9).fill(66)],
      [17, 7, false, Array(9).fill(99)], [20, 7, true, Array(9).fill(99)],
    ]);

    // Runde 5: Es schlägt dreizehn. Zuerst der Zeiger, dann der Gegenzeiger, beide geteilt auf Ee und Ez
    const fuenf = r.verlauf[4].ereignisse.filter(e => e.art === 'zeiger' || e.art === 'gegenzeiger');
    expect(fuenf.map(e => [e.art, e.spalte, ids(e), werte(e)])).toEqual([
      ['zeiger', 4, [5, 6], [55, 55]], ['gegenzeiger', 4, [5, 6], [55, 55]],
    ]);
    expect(fuenf[1].ansage).toBe(A.dreizehn('E'));
    expect(werte(inRunde(r, 'gegenzeiger', 14))).toEqual([82.5, 82.5]);
    // Allein trägt einer die ganze Wucht: Ii in Runde 1 (I), Ff in Runde 13 (F, ab Mittag)
    expect([ids(inRunde(r, 'gegenzeiger', 1)), werte(inRunde(r, 'gegenzeiger', 1))]).toEqual([[9], [110]]);
    expect([ids(inRunde(r, 'gegenzeiger', 13)), werte(inRunde(r, 'gegenzeiger', 13))]).toEqual([[7], [165]]);
    expect(r.ansagen).toEqual([D.ansage.viele(9), A.durchschlagLeer('H'), A.dreizehn('E'), A.mittag, A.mitternacht]);
  });

  test('wer auf E den Zeiger hält, kann am Gegenzeiger fallen; fällt er schon am Zeiger, schlägt der Gegenzeiger durch', () => {
    const ohne = nurDieZwei('zeiger', 'gegenzeiger', 'durchschlag');
    const zaeh = jedeSpalteEiner(150);
    const r = raidKampf(DREIZEHN, zaeh.helden, {}, zaeh.aufstellung, 7, { ohne, bisRunde: 6 });
    expect(r.gefallen).toEqual([{ heldId: 5, runde: 5, ursache: 'gegenzeiger', ort: RAID_TEXTE.ort.gegenzeiger('E') }]);
    expect(RAID_TEXTE.ort.gegenzeiger('E')).toBe('Gegenzeiger (Spalte E)');
    expect(hauptursache(r.gefallen, { 5: 'Halm' })).toEqual({
      regel: 'gegenzeiger', ort: 'Gegenzeiger (Spalte E)', satz: RAID_TEXTE.hauptursache.gegenzeiger('E', 'Halm'),
    });
    expect(ereignisse(r, 'durchschlag')).toEqual([]);

    const duenn = jedeSpalteEiner(100);
    const d = raidKampf(DREIZEHN, duenn.helden, {}, duenn.aufstellung, 7, { ohne, bisRunde: 5 });
    expect(d.gefallen).toEqual([{ heldId: 5, runde: 5, ursache: 'zeiger', ort: RAID_TEXTE.ort.zeiger('E') }]);
    expect(ereignisse(d, 'durchschlag').map(e => [e.runde, e.spalte, e.gegen, ids(e), werte(e)])).toEqual([
      [5, 4, true, [1, 2, 3, 4, 6, 7, 8, 9], Array(8).fill(66)],
    ]);
    expect(inRunde(d, 'durchschlag', 5).ansage).toBe(`${A.durchschlagGefallen('Halm', 'E')} ${A.dreizehn('E')}`);

    // Eine leere Spalte schlägt unter beiden Zeigern durch: Auf Stufe II nennt der Satz beide, auf Stufe I bleibt er
    const leer = [{ heldId: 1, runde: 8, ursache: 'durchschlag' as const, ort: RAID_TEXTE.ort.durchschlag('H') }];
    expect(hauptursache(leer, {})?.satz).toBe(RAID_TEXTE.hauptursache.durchschlag('H'));
    expect(hauptursache(leer, {}, false, true)?.satz).toBe(RAID_TEXTE.hauptursache.durchschlagBeide('H'));
  });

  test('Stufe I bleibt ohne Gegenzeiger: kein Ereignis, kein Durchschlag von ihm, keine dreizehn', () => {
    const { helden, aufstellung } = probefeld();
    const r = raidKampf(ZENIT, helden, {}, aufstellung, 42);
    expect(ereignisse(r, 'gegenzeiger')).toEqual([]);
    expect(ereignisse(r, 'durchschlag').every(e => e.gegen === undefined)).toBe(true);
    expect(r.ansagen).not.toContain(A.dreizehn('E'));
    expect(r.ansagen[0]).toBe(A.viele(6));
  });
});

describe('Stufe II im Spielstand', () => {
  test('offen erst nach dem ersten Sieg auf Stufe I; bis dahin legt sie keinen Stand an', () => {
    const state = createNewGameState();
    state.rngSeed = 4711;
    const { helden, stufen } = baueRaidGilde('anker15');
    state.fighters = helden;
    state.schmiede = { stufen };
    merkeBezwungen(state, 'tagespfeiler', 1);
    expect(raidOffen(state)).toBe(true);
    expect(raidOffen(state, DREIZEHN)).toBe(false);
    expect(versuchsLage(state, Date.now(), DREIZEHN)).toMatchObject({ moeglich: false, grund: D.nochZu });
    expect(ernstkampf(state, Date.now(), DREIZEHN)).toBeNull();
    expect(raidKartenZustand(state, Date.now(), DREIZEHN)).toEqual({ offen: false, zeile: D.zu, zwoelf: false, truheWartet: false });
    expect(setzeHeld(state, helden[0].id, { reihe: 2, spalte: 8 }, DREIZEHN)).toBe(true); // wirkt nirgends
    expect(state.raidStufen).toBeUndefined();

    // Der erste Sieg auf Stufe I öffnet sie («Profi» gewinnt fast immer, sonst der nächste freie Versuch)
    raidStand(state).aufstellung = raidMusterAufstellung('profi', helden);
    let sieg: ErnstkampfErgebnis | null = null;
    for (let i = 0; i < 3 && !sieg; i++) {
      const e = ernstkampf(state)!;
      if (e.ergebnis.sieg) sieg = e;
    }
    expect(sieg?.ersterSieg).toBe(true);
    expect(raidOffen(state, DREIZEHN)).toBe(true);
    expect(raidKartenZustand(state, Date.now(), DREIZEHN)).toEqual({
      offen: true, zeile: RAID_TEXTE.karte.keinVersuch, zwoelf: false, truheWartet: true,
    });
    // Erster Besuch: alle fünfzehn, wie sie in der Gilde stehen, vorne voll, dann die Mitte (wie «Naiv»)
    expect(raidStand(state, Date.now(), DREIZEHN).aufstellung).toEqual(raidMusterAufstellungDreizehn('naiv', helden));
    expect(state.raidStufen?.dreizehn?.woche.id).toBe('2026-W43');
    expect(versuchsLage(state, Date.now(), DREIZEHN)).toEqual({ moeglich: true, frei: true, freiUebrig: 3, kosten: {} });
  });

  test('eigene Woche, eigene Versuche und Kosten; mindestens zehn, höchstens fünfzehn, neun Spalten', () => {
    // Auf Stufe 1 bringt die Gilde Zenit nie unter die Hälfte: keine Truhe, kein Tagstein dazwischen
    const state = stufeZweiSpielstand('naiv', 1);
    const jetzt = Date.now();
    for (let i = 0; i < 3; i++) {
      expect(versuchsLage(state, jetzt, DREIZEHN)).toEqual({ moeglich: true, frei: true, freiUebrig: 3 - i, kosten: {} });
      expect(ernstkampf(state, jetzt, DREIZEHN)).toMatchObject({ frei: true, kosten: {}, truhen: [] });
    }
    expect(versuchsLage(state, jetzt, DREIZEHN)).toEqual({
      moeglich: false, frei: false, freiUebrig: 0, kosten: { mat_tagstein: 10 }, grund: B.zuWenigTagstein(0, 10),
    });
    // Stufe I hat ihre eigene Woche
    expect(versuchsLage(state, jetzt)).toEqual({ moeglich: true, frei: true, freiUebrig: 3, kosten: {} });
    state.globalStock.mat_tagstein = 25;
    expect(ernstkampf(state, jetzt, DREIZEHN)).toMatchObject({ frei: false, kosten: { mat_tagstein: 10 } });
    expect(state.globalStock.mat_tagstein).toBe(15);
    expect(state.raidStufen!.dreizehn).toMatchObject({ versucheGesamt: 4, woche: { versuche: 4 } });
    expect(state.raid!).toMatchObject({ versucheGesamt: 0, woche: { versuche: 0 } });

    // Ein Sechzehnter bleibt auf der Bank; Felder gibt es bis Spalte I, auf Stufe I nur bis F
    const sechzehn = held(300, 'cleric', 'Sechzehn');
    state.fighters.push(sechzehn);
    const feld = (): Feld | undefined => raidStand(state, jetzt, DREIZEHN).aufstellung[String(sechzehn.id)];
    expect(feld()).toBeUndefined();
    expect(setzeHeld(state, sechzehn.id, { reihe: 2, spalte: 8 }, DREIZEHN)).toBe(false);
    expect(setzeHeld(state, sechzehn.id, { reihe: 2, spalte: 9 }, DREIZEHN)).toBe(false);
    expect(setzeHeld(state, sechzehn.id, { reihe: 2, spalte: 8 })).toBe(false);
    for (const h of state.fighters.slice(9, 15)) setzeHeld(state, h.id, null, DREIZEHN);
    expect(versuchsLage(state, jetzt, DREIZEHN)).toMatchObject({ moeglich: false, grund: B.mindestens(10) });
    expect(setzeHeld(state, sechzehn.id, { reihe: 2, spalte: 8 }, DREIZEHN)).toBe(true);
    expect(feld()).toEqual({ reihe: 2, spalte: 8 });
    expect(versuchsLage(state, jetzt, DREIZEHN).moeglich).toBe(true);
  });

  test('am Montag beginnen beide Wochen neu; der Montag-Satz der Stufe II; eigener Samen, nach dem Neuladen derselbe', () => {
    const state = stufeZweiSpielstand('naiv', 1);
    for (let i = 0; i < 3; i++) ernstkampf(state, Date.now(), DREIZEHN);
    expect(montagSatz(raidStand(state, Date.now(), DREIZEHN), DREIZEHN)).toBeNull();
    vi.setSystemTime(START + WOCHE);
    const zwei = raidStand(state, Date.now(), DREIZEHN);
    expect(zwei.woche).toMatchObject({ id: '2026-W44', versuche: 0 });
    expect(montagSatz(zwei, DREIZEHN)).toBe(D.montagVorSieg);
    expect(montagSatz(raidStand(state))).toBeNull(); // auf Stufe I gab es keinen Ernstkampf

    const gut = stufeZweiSpielstand('gut');
    const eins = raidStand(gut);
    const stand = raidStand(gut, Date.now(), DREIZEHN);
    expect([eins.woche.id, eins.versucheGesamt]).toEqual([stand.woche.id, stand.versucheGesamt]);
    const samen = raidSamen(gut, stand, 'kampf', DREIZEHN);
    expect(samen).not.toBe(raidSamen(gut, eins));
    expect(raidSamen(gut, stand, 'truhe', DREIZEHN)).not.toBe(samen);
    const geladen = JSON.parse(JSON.stringify(gut)) as GameState;
    const a = ernstkampf(gut, Date.now(), DREIZEHN)!;
    const b = ernstkampf(geladen, Date.now(), DREIZEHN)!;
    expect(b.ergebnis).toEqual(a.ergebnis);
    expect(b.truhen).toEqual(a.truhen);
    expect(a.ergebnis).toEqual(raidKampf(DREIZEHN, gut.fighters, gut.schmiede!.stufen, stand.aufstellung, samen));
  });

  test('eigene Truhen: «Was der Gegenzeiger verlor», «Die dreizehnte Truhe», zum ersten Sieg die Ersatz-Unruh', () => {
    const state = stufeZweiSpielstand('profi');
    state.globalStock.die_unruh = 1; // vom ersten Sieg auf Stufe I
    const goldVorher = state.globalStock.gold ?? 0;
    const erste = ernstkampf(state, Date.now(), DREIZEHN)!;
    expect([erste.ergebnis.sieg, erste.ersterSieg]).toEqual([true, true]);
    expect(arten(erste)).toEqual(['halb', 'sieg', 'erster']);
    const [halb, sieg, erster] = erste.truhen;
    expect(halb).toMatchObject({ name: DREIZEHN.truhen.halb.name, text: DREIZEHN.truhen.halb.text });
    const [teil] = setTeile(halb.inhalt);
    expect(setVonItem(teil)!.tier).toBeGreaterThanOrEqual(6);
    expect(setVonItem(teil)!.tier).toBeLessThanOrEqual(10);
    expect(halb.inhalt).toEqual({ gold: 250, [teil]: 1, mat_tagstein: 8 });

    expect(sieg).toMatchObject({ name: DREIZEHN.truhen.sieg.name, text: DREIZEHN.truhen.sieg.text });
    expect(sieg.inhalt.mat_tagstein).toBe(15);
    expect(sieg.inhalt.crystal_shard).toBeGreaterThanOrEqual(25);
    // Zwölf Würfe, je sechs auf Alrunas und Orms Beute, mit dem festen Gold ihrer Tabellen
    const wuerfeAus = DREIZEHN.truhen.sieg.wuerfeAus;
    expect(['loot_boss_alruna', 'loot_boss_orm'].map(id => wuerfeAus.filter(w => w === id).length)).toEqual([6, 6]);
    expect(wuerfeAus).toHaveLength(12);
    const wuerfe = wuerfeAus.map(id => LOOT_TABLE_DEFS[id].guaranteedGold);
    expect(sieg.inhalt.gold).toBeGreaterThanOrEqual(wuerfe.reduce((s, g) => s + g.min, 0));
    expect(sieg.inhalt.gold).toBeLessThanOrEqual(wuerfe.reduce((s, g) => s + g.max, 0));
    expect(setTeile(sieg.inhalt)).toHaveLength(1);
    expect(erster).toMatchObject({ art: 'erster', name: D.erster.name, text: D.erster.text, inhalt: { die_unruh: 1 } });
    expect(state.globalStock.die_unruh).toBe(2);
    expect(state.globalStock.gold - goldVorher).toBe(erste.truhen.reduce((s, t) => s + (t.inhalt.gold ?? 0), 0));
    expect(erste.ergebnis.ansagen).not.toContain(A.abriss);
    // Die Truhen der Stufe I warten diese Woche weiter
    expect(state.raid!.woche).toMatchObject({ halbeTruhe: false, truhe: false });

    const zweite = ernstkampf(state, Date.now(), DREIZEHN)!;
    expect([zweite.ersterSieg, zweite.truhen]).toEqual([false, []]);
    vi.setSystemTime(START + WOCHE);
    const naechste = ernstkampf(state, Date.now(), DREIZEHN)!;
    expect(arten(naechste)).toEqual(naechste.ergebnis.sieg ? ['halb', 'sieg'] : ['halb']);
    expect(state.globalStock.die_unruh).toBe(2);
  });

  test('XP 450 beim Sieg, 150 bei der Niederlage; Stufe II zählt eigens, die Zähler der Stufe I bleiben stehen', () => {
    const state = stufeZweiSpielstand('profi');
    const sieg = ernstkampf(state, Date.now(), DREIZEHN)!;
    expect(sieg.ergebnis.sieg).toBe(true);
    expect(sieg.xp.map(x => x.xp)).toEqual(Array(15).fill(450));
    expect(state.statistics).toMatchObject({ raid2_siege: 1, raid2_wochen: 1 });
    for (const id of ['raid_versuche', 'raid_siege', 'raid_punkt_zwoelf', 'raid_mehr_als_vier', 'raid_wochen', 'raid_zu_viert']) {
      expect(state.statistics[id] ?? 0, id).toBe(0);
    }
    expect(sieg.neueErfolge).toContain('raid_dreizehn');
    expect(sieg.neueErfolge).not.toContain('raid_sieg');

    const schwach = stufeZweiSpielstand('naiv', 1);
    const niederlage = ernstkampf(schwach, Date.now(), DREIZEHN)!;
    expect(niederlage.ergebnis.sieg).toBe(false);
    expect(niederlage.xp.map(x => x.xp)).toEqual(Array(15).fill(150));
    expect(schwach.statistics.raid2_siege ?? 0).toBe(0);

    // «Doppelschicht»: die dreizehnte Truhe in vier verschiedenen Wochen, nur der erste Sieg einer Woche zählt
    ernstkampf(state, Date.now(), DREIZEHN);
    expect(state.statistics.raid2_wochen).toBe(1);
    for (let woche = 1; woche < 4; woche++) {
      vi.setSystemTime(START + woche * WOCHE);
      for (let i = 0; i < 3 && !raidStand(state, Date.now(), DREIZEHN).woche.truhe; i++) ernstkampf(state, Date.now(), DREIZEHN);
      expect(state.statistics.raid2_wochen).toBe(woche + 1);
    }
    expect(state.achievements).toContain('raid_doppelschicht');
  });

  test('Alrunas Liste auf Stufe II: beide Zeiger mit ihren Runden, der Treffpunkt E, drei Trupps, eine leere Mitte', () => {
    const gut = stufeZweiSpielstand('gut');
    const vorher = JSON.stringify(gut);
    const lage = raidLage(gut, DREIZEHN);
    expect(JSON.stringify(gut)).toBe(vorher);
    const id = (name: string): number => heldNamens(gut, name).id;
    expect(lage.pendelZiele).toEqual([id('Brom'), id('Bertram'), id('Grimm')]);
    expect(lage.spalten).toHaveLength(9);
    expect(lage.trupps.map(t => [t.anzahl, t.heiler])).toEqual([[6, ['Ewin']], [5, ['Ansgar', 'Moos']], [4, ['Pirmin']]]);
    const treffen = treffpunkte(DREIZEHN)[0].runden;
    expect(lage.hinweise).toContainEqual(expect.objectContaining({ art: 'zeiger', ok: true, text: L.treffpunktOk('E', treffen, ['Ansgar', 'Bertram']) }));
    expect(lage.hinweise).toContainEqual({ art: 'zeiger', ok: true, text: L.zeigerOkBeide, felder: [] });
    expect(lage.hinweise).toContainEqual(expect.objectContaining({
      art: 'glocke', ok: false, text: L.glockeVoll(2, ['Sina', 'Ansgar', 'Ewin', 'Moos', 'Ysra', 'Morn', 'Pirmin']),
    }));
    expect(lage.hinweise).toContainEqual(expect.objectContaining({ art: 'trupp', ok: true, text: expect.stringMatching(/^Mitte: /) }));
    expect(lage.hinweise[lage.hinweise.length - 1]).toEqual({ art: 'zahl', ok: true, text: D.zahl(15, 15), felder: [] });

    // Profi: Grimm allein auf E hält beide; D und H tragen je nur einen, gegen beide Zeiger
    const profi = hinweise(stufeZweiSpielstand('profi'), DREIZEHN);
    expect(profi).toContainEqual(expect.objectContaining({ ok: true, text: L.treffpunktOk('E', treffen, ['Grimm']) }));
    expect(profi).toContainEqual(expect.objectContaining({ ok: false, text: L.zeigerEinzelnBeide('D', 'Liedra', [4, 13, 22], [6, 15, 24]) }));
    expect(profi).toContainEqual(expect.objectContaining({ ok: false, text: L.zeigerEinzelnBeide('H', 'Morn', [8, 17], [2, 11, 20]) }));
    expect(profi).toContainEqual(expect.objectContaining({ ok: false, text: L.truppOhneHeiler('Mitte') }));
    // Naiv: Benno hält auf E ab Mittag keine zwei Doppelrunden
    expect(hinweise(stufeZweiSpielstand('naiv'), DREIZEHN))
      .toContainEqual(expect.objectContaining({ ok: false, text: L.treffpunktZerbrechlich('E', treffen, 'Benno') }));

    // Ysra auf die Bank: F ist leer; ohne Ansgar und Bertram ist E leer; ohne Moos und Benno die ganze Mitte
    setzeHeld(gut, id('Ysra'), null, DREIZEHN);
    expect(hinweise(gut, DREIZEHN)).toContainEqual({ art: 'zeiger', ok: false, text: L.zeigerLeerBeide('F', [6, 15, 24], [4, 13, 22]), felder: [] });
    for (const name of ['Ansgar', 'Bertram']) setzeHeld(gut, id(name), null, DREIZEHN);
    expect(hinweise(gut, DREIZEHN)).toContainEqual({ art: 'zeiger', ok: false, text: L.treffpunktLeer('E', treffen), felder: [] });
    for (const name of ['Moos', 'Benno']) setzeHeld(gut, id(name), null, DREIZEHN);
    const leer = hinweise(gut, DREIZEHN);
    expect(leer).toContainEqual({ art: 'pendel', ok: false, text: L.pendelLeerWeiter('Mitte', 'nach rechts', 2), felder: [] });
    expect(leer).toContainEqual({ art: 'zahl', ok: false, text: D.zahl(10, 15), felder: [] });
  });

  test('der Kriegsrat der Stufe II hat seinen eigenen Schlüssel und zeigt im Probelauf den Gegenzeiger', () => {
    const state = stufeZweiSpielstand('gut');
    const stand = raidStand(state, Date.now(), DREIZEHN);
    const schluessel = ratSchluessel(state, stand.aufstellung, DREIZEHN);
    expect(schluessel.startsWith('dreizehn#')).toBe(true);
    expect(schluessel.slice('dreizehn#'.length)).toBe(ratSchluessel(state, stand.aufstellung));
    const vorher = JSON.stringify(state);
    const rat = kriegsratRechnen(state, DREIZEHN, 3);
    expect(JSON.stringify(state)).toBe(vorher);
    expect([rat.proben, rat.schluessel]).toEqual([3, schluessel]);
    expect(rat.probe).toEqual(raidKampf(DREIZEHN, state.fighters, state.schmiede!.stufen, stand.aufstellung, kriegsratSamen(0)));
    expect(ereignisse(rat.probe, 'gegenzeiger').length).toBeGreaterThan(0);
  });

  test('das Regelblatt der Stufe II nennt die Zahlen aus den Daten; die Muster-Aufstellungen passen zur Gilde', () => {
    const blatt = D.regelBlatt.join(' ');
    const [treffen] = treffpunkte(DREIZEHN);
    expect(blatt).toContain(`In Runde ${rundenListe(treffen.runden)} stehen beide auf Spalte ${spaltenName(treffen.spalte)}`);
    expect(blatt).toContain(`A bis ${spaltenName(spaltenZahl(DREIZEHN) - 1)}`);
    expect(blatt).toContain(`Ab Runde ${DREIZEHN.regeln.mittagAb}`);
    expect(blatt).toContain(`Nach Runde ${DREIZEHN.regeln.mitternacht}`);
    expect([DREIZEHN.minHelden, DREIZEHN.maxHelden, DREIZEHN.freieVersucheJeWoche, DREIZEHN.kostenJeVersuch]).toEqual([10, 15, 3, { mat_tagstein: 10 }]);
    expect(blatt).toContain('Zehn bis fünfzehn Helden');
    expect(blatt).toContain('drei freie Ernstkämpfe, danach je zehn Tagstein');

    const { helden } = baueRaidGilde('anker15');
    expect(helden.filter(h => h.lehrling).map(h => h.name)).toEqual(['Bertram', 'Pirmin', 'Wenna', 'Benno', 'Mirabell']);
    for (const [name, plan] of Object.entries(RAID_AUFSTELLUNGEN_DREIZEHN)) {
      const felderDesPlans = Object.values(plan).map(f => `${f.reihe}:${f.spalte}`);
      expect(new Set(felderDesPlans).size, name).toBe(felderDesPlans.length);
      expect(Object.values(plan).every(f => f.reihe < DREIZEHN.reihen && f.spalte < spaltenZahl(DREIZEHN)), name).toBe(true);
      expect(Object.keys(raidMusterAufstellungDreizehn(name as RaidAufstellungDreizehn, helden)), name)
        .toHaveLength(name === 'zehn' ? 10 : 15);
    }
    expect(Object.keys(RAID_AUFSTELLUNGEN_DREIZEHN.zehn).some(n => helden.find(h => h.name === n)!.lehrling)).toBe(false);
  });
});

// ── Eichbänder ──

interface Messung {
  siege: number;
  /** Runde des Siegs im Schnitt */
  siegRunde: number;
  /** Zenits Rest im Schnitt, 0 bis 1 */
  rest: number;
  unterHalb: number;
  bisZwoelf: number;
  fuenfStehen: number;
  mitternacht: number;
}

const gemessen = new Map<string, Messung>();

/** 20 Kämpfe mit den Samen i · 7919 (i = 0 bis 19), wie das Werkzeug, nur kürzer */
function messe(gilde: RaidMusterName, aufstellung: RaidAufstellungName, ohne: string[] = []): Messung {
  const schluessel = `${gilde} ${aufstellung} ${ohne.join(',')}`;
  const fertig = gemessen.get(schluessel);
  if (fertig) return fertig;
  const { helden, stufen } = baueRaidGilde(gilde);
  const felderDerGilde = raidMusterAufstellung(aufstellung, helden, ohne);
  const kaempfe = Array.from({ length: 20 }, (_, i) => raidKampf(ZENIT, helden, stufen, felderDerGilde, i * 7919, { knapp: true }));
  const siege = kaempfe.filter(k => k.sieg);
  const messung: Messung = {
    siege: siege.length,
    siegRunde: siege.length > 0 ? siege.reduce((s, k) => s + k.runden, 0) / siege.length : 0,
    rest: kaempfe.reduce((s, k) => s + k.zenitRest, 0) / kaempfe.length,
    unterHalb: kaempfe.filter(k => k.zenitRest < 0.5).length,
    bisZwoelf: siege.filter(k => k.runden <= 12).length,
    fuenfStehen: siege.filter(k => k.stehend >= 5).length,
    mitternacht: kaempfe.filter(k => k.mitternacht).length,
  };
  gemessen.set(schluessel, messung);
  return messung;
}

function zwischen(wert: number, von: number, bis: number, was: string): void {
  expect(wert, was).toBeGreaterThanOrEqual(von);
  expect(wert, was).toBeLessThanOrEqual(bis);
}

const DIE_SECHS = ['Ansgar', 'Ewin', 'Moos', 'Liedra', 'Ysra', 'Morn'];

describe('Eichbänder: 20 feste Samen an der Muster-Gilde', () => {
  test('Anker + Gut: 10 bis 17 Siege, im Schnitt in Runde 15 bis 18', () => {
    const m = messe('anker', 'gut');
    zwischen(m.siege, 10, 17, 'Siege');
    zwischen(m.siegRunde, 15, 18, 'Siegrunde');
  });

  test('Anker + Profi: mindestens 18 Siege', () => {
    expect(messe('anker', 'profi').siege).toBeGreaterThanOrEqual(18);
  });

  test('Anker + Lehrbuch: höchstens 2 Siege, Zenit im Schnitt bei 15 bis 30 %', () => {
    const m = messe('anker', 'lehrbuch');
    expect(m.siege).toBeLessThanOrEqual(2);
    zwischen(m.rest, 0.15, 0.30, 'Rest');
  });

  test('Anker + Naiv: kein Sieg, Zenit im Schnitt bei mindestens 40 %', () => {
    const m = messe('anker', 'naiv');
    expect(m.siege).toBe(0);
    expect(m.rest).toBeGreaterThanOrEqual(0.40);
  });

  test('T4 + Gut: kein Sieg, Zenit im Schnitt bei 25 bis 45 %, in mindestens 18 unter der Hälfte', () => {
    const m = messe('t4', 'gut');
    expect(m.siege).toBe(0);
    zwischen(m.rest, 0.25, 0.45, 'Rest');
    expect(m.unterHalb).toBeGreaterThanOrEqual(18);
  });

  test('Sets +5 + Gut: 20 Siege, in mindestens 15 stehen am Ende fünf oder mehr', () => {
    const m = messe('sets5', 'gut');
    expect(m.siege).toBe(20);
    expect(m.fuenfStehen).toBeGreaterThanOrEqual(15);
  });

  test('Sets +5 + Profi: in mindestens 12 Sieg bis Runde 12', () => {
    expect(messe('sets5', 'profi').bisZwoelf).toBeGreaterThanOrEqual(12);
  });

  test('Sets +0 + Profi: 4 bis 13 Siege', () => {
    zwischen(messe('sets0', 'profi').siege, 4, 13, 'Siege');
  });

  test('der Kern allein (vier, «Gut» ohne die sechs anderen): kein Sieg, Zenit im Schnitt bei 60 bis 75 %', () => {
    const m = messe('anker', 'gut', DIE_SECHS);
    expect(m.siege).toBe(0);
    zwischen(m.rest, 0.60, 0.75, 'Rest');
  });

  test('Mitternacht höchstens einmal je Aufstellung', () => {
    const zeilen: [RaidMusterName, RaidAufstellungName, string[]][] = [
      ['anker', 'gut', []], ['anker', 'profi', []], ['anker', 'lehrbuch', []], ['anker', 'naiv', []], ['t4', 'gut', []],
      ['sets5', 'gut', []], ['sets5', 'profi', []], ['sets0', 'profi', []], ['anker', 'gut', DIE_SECHS],
    ];
    for (const [gilde, aufstellung, ohne] of zeilen) {
      expect(messe(gilde, aufstellung, ohne).mitternacht, `${gilde} ${aufstellung}`).toBeLessThanOrEqual(1);
    }
  });
});

interface MessungZwei {
  siege: number;
  siegRunde: number;
  rest: number;
  mitternacht: number;
}

const gemessenZwei = new Map<string, MessungZwei>();

/** Stufe II: 20 Kämpfe mit den Samen i · 7919 an «anker15» (die besten zehn: «anker», ohne Lehrlinge) */
function messeZwei(aufstellung: RaidAufstellungDreizehn): MessungZwei {
  const fertig = gemessenZwei.get(aufstellung);
  if (fertig) return fertig;
  const { helden, stufen } = baueRaidGilde(aufstellung === 'zehn' ? 'anker' : 'anker15');
  const felderDerGilde = raidMusterAufstellungDreizehn(aufstellung, helden);
  const kaempfe = Array.from({ length: 20 }, (_, i) => raidKampf(DREIZEHN, helden, stufen, felderDerGilde, i * 7919, { knapp: true }));
  const siege = kaempfe.filter(k => k.sieg);
  const messung: MessungZwei = {
    siege: siege.length,
    siegRunde: siege.length > 0 ? siege.reduce((s, k) => s + k.runden, 0) / siege.length : 0,
    rest: kaempfe.reduce((s, k) => s + k.zenitRest, 0) / kaempfe.length,
    mitternacht: kaempfe.filter(k => k.mitternacht).length,
  };
  gemessenZwei.set(aufstellung, messung);
  return messung;
}

describe('Eichbänder Stufe II: 20 feste Samen an der Muster-Gilde mit fünf Lehrlingen', () => {
  test('Anker15 + Gut: 11 bis 18 Siege, im Schnitt in Runde 12 bis 15', () => {
    const m = messeZwei('gut');
    zwischen(m.siege, 11, 18, 'Siege');
    zwischen(m.siegRunde, 12, 15, 'Siegrunde');
  });

  test('Anker15 + Profi: mindestens 18 Siege', () => {
    expect(messeZwei('profi').siege).toBeGreaterThanOrEqual(18);
  });

  test('Anker15 + Lehrbuch: höchstens 2 Siege, Zenit im Schnitt bei 15 bis 35 %', () => {
    const m = messeZwei('lehrbuch');
    expect(m.siege).toBeLessThanOrEqual(2);
    zwischen(m.rest, 0.15, 0.35, 'Rest');
  });

  test('Anker15 + Naiv: kein Sieg, Zenit im Schnitt bei mindestens 35 %', () => {
    const m = messeZwei('naiv');
    expect(m.siege).toBe(0);
    expect(m.rest).toBeGreaterThanOrEqual(0.35);
  });

  test('die besten zehn ohne Lehrlinge: höchstens 3 Siege', () => {
    expect(messeZwei('zehn').siege).toBeLessThanOrEqual(3);
  });

  test('Mitternacht höchstens einmal je Aufstellung', () => {
    for (const aufstellung of ['gut', 'profi', 'lehrbuch', 'naiv', 'zehn'] as const) {
      expect(messeZwei(aufstellung).mitternacht, aufstellung).toBeLessThanOrEqual(1);
    }
  });
});
