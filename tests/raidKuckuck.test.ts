// ─── Raid-Stufe III «Das Kuckucksei» ──────────────────
// Der Kuckuck über den Gängen (systems/RaidKampf.ts) auf kleinen Probefeldern mit zähen Helden, dann Stufe III im
// Spielstand (systems/Raid.ts): offen nach dem ersten Sieg auf Stufe II, eigene Woche, 15 bis 20 Helden auf zwölf
// Spalten, eigene Truhen, Zähler raid3_… ohne Erfolge, Speichern. Dazu Texte und Muster-Aufstellungen, zum Schluss die
// Eichbänder mit 20 festen Samen (i · 7919) an der Muster-Gilde mit allen zehn Lehrlingen (data/raidMuster.ts,
// anker20). Die 400 Läufe rechnet tools/raidEichung.ts (--stufe III). Regeln und Zahlen: docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import type { Feld } from '../src/models/RaidStand';
import {
  DREIZEHN, KUCKUCK, RAID_DEFS, RAID_STUFEN, RAID_TEXTE, STUFEN_TEXTE, ZENIT, spaltenName, stufenNummer, stufenTexte,
} from '../src/data/raids';
import { setVonItem } from '../src/data/dungeonSets';
import { LEHRLINGE } from '../src/data/lehrlinge';
import {
  RAID_AUFSTELLUNGEN_KUCKUCK, RaidAufstellungKuckuck, baueRaidGilde, raidMusterAufstellungDreizehn, raidMusterAufstellungKuckuck,
} from '../src/data/raidMuster';
import {
  RaidEreignis, RaidErgebnis, gangSpalten, hauptursache, kuckuckGang, raidKampf, spaltenZahl, treffpunkte,
} from '../src/systems/RaidKampf';
import {
  ErnstkampfErgebnis, ernstkampf, hinweise, raidKartenZustand, raidOffen, raidStand, setzeHeld, versuchsLage,
} from '../src/systems/Raid';
import { merkeBezwungen } from '../src/systems/Bezwungen';
import { TAG_MS } from '../src/systems/Rangliste';
import { SaveSystem, hebeSperreNachLadenAuf } from '../src/systems/SaveSystem';

/** Montag, 19. Oktober 2026, 9 Uhr: Woche 2026-W43 */
const START = new Date(2026, 9, 19, 9, 0).getTime();
const WOCHE = 7 * TAG_MS;
const K = STUFEN_TEXTE.kuckuck;
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

function held(id: number, classId: string, name: string, leben = ZAEH.hp): GuildFighter {
  const h = createGuildFighter(classId, name, { ...ZAEH, hp: leben, maxHp: leben });
  h.id = id;
  return h;
}

/** Aufstellung aus [Held-Id, Reihe, Spalte] */
function felder(...liste: [number, number, number][]): Record<string, Feld> {
  return Object.fromEntries(liste.map(([id, reihe, spalte]) => [String(id), { reihe, spalte }]));
}

function ereignisse(r: RaidErgebnis, art: RaidEreignis['art']): (RaidEreignis & { runde: number })[] {
  return r.verlauf.flatMap(v => v.ereignisse.filter(e => e.art === art).map(e => ({ ...e, runde: v.runde })));
}
const ids = (e: RaidEreignis): number[] => (e.treffer ?? []).map(t => t.heldId);
const werte = (e: RaidEreignis): number[] => (e.treffer ?? []).map(t => t.wert);

/** Zenit ohne kritische Treffer: Jeder Schlag des Kuckucks zeigt seine Wucht (110 × 0,6) */
const OHNE_KRIT = { werte: { critChance: 0 } };

/** Nur der Kuckuck (und was genannt ist) schlägt zu; Heilung, Rundenende und Mitternacht bleiben */
const nurKuckuck = (...auch: string[]) =>
  (['pendel', 'zeiger', 'gegenzeiger', 'durchschlag', 'glocke', 'funken', 'mittag'] as const).filter(r => !auch.includes(r));

/**
 * Das Probefeld der Stufe III: zwölf Spalten, vier Trupps, zähe Helden ohne Ausweichen und Schutz.
 *          A  B  C  | D  E  F  | G  H  I  | J  K  L
 *   vorn   Aa .  Cc | .  Ee .  | .  Hh .  | Jj .  Ll
 *   Mitte  .  .  .  | Dd .  .  | .  .  Ii | .  .  .
 * Am Gang links (C/D) hat Dd weniger Leben als Cc. Am Gang in der Mitte (F/G) steht niemand. Am Gang rechts (I/J)
 * haben Ii und Jj gleich viel: Jj steht weiter vorn.
 */
function probefeldDrei(dd = 15000): { helden: GuildFighter[]; aufstellung: Record<string, Feld> } {
  return {
    helden: [
      held(1, 'berserker', 'Aa'), held(3, 'witch', 'Cc'), held(4, 'necromancer', 'Dd', dd), held(5, 'bard', 'Ee'),
      held(8, 'berserker', 'Hh'), held(9, 'witch', 'Ii', 18000), held(10, 'necromancer', 'Jj', 18000), held(12, 'bard', 'Ll'),
    ],
    aufstellung: felder([1, 0, 0], [3, 0, 2], [4, 1, 3], [5, 0, 4], [8, 0, 7], [9, 1, 8], [10, 0, 9], [12, 0, 11]),
  };
}

describe('Stufe III: der Kuckuck über den Gängen', () => {
  test('reihum links, Mitte, rechts; die Gänge liegen zwischen C und D, F und G, I und J; keine dreizehn auf zwölf Spalten', () => {
    expect(spaltenZahl(KUCKUCK)).toBe(12);
    expect(KUCKUCK.truppZahl).toBe(4);
    expect(Array.from({ length: 7 }, (_, i) => kuckuckGang(i + 1, 4))).toEqual([0, 1, 2, 0, 1, 2, 0]);
    expect([0, 1, 2].map(g => gangSpalten(g).map(spaltenName).join(''))).toEqual(['CD', 'FG', 'IJ']);
    expect([0, 1, 2].map(g => RAID_TEXTE.gangName(g, 4))).toEqual(['links', 'Mitte', 'rechts']);
    // Mit einem Trupp gäbe es keinen Gang; Stufe I und II haben keinen Kuckuck
    expect(kuckuckGang(1, 1)).toBeNull();
    expect([ZENIT.regeln.kuckuck, DREIZEHN.regeln.kuckuck]).toEqual([undefined, undefined]);
    // Zeiger und Gegenzeiger treffen sich auf zwölf Spalten nie
    expect(treffpunkte(KUCKUCK)).toEqual([]);
  });

  test('pickt am Gang den mit den wenigsten Leben (Gleichstand: weiter vorn); ein leerer Gang bleibt ohne Treffer', () => {
    const { helden, aufstellung } = probefeldDrei();
    const r = raidKampf(KUCKUCK, helden, {}, aufstellung, 42, { ...OHNE_KRIT, ohne: nurKuckuck() });
    expect(r).toMatchObject({ sieg: false, runden: 24, mitternacht: true, helden: 8, stehend: 8, gefallen: [] });
    const erwartet = Array.from({ length: 24 }, (_, i) => {
      const runde = i + 1;
      if (i % 3 === 0) return [runde, 0, 4, [4], [66]]; // Dd am Gang links, 110 × 0,6
      if (i % 3 === 1) return [runde, 1, null, [], []]; // Mitte: niemand da
      return [runde, 2, 10, [10], [66]]; // rechts: Jj vor Ii, danach hat Jj weniger
    });
    expect(ereignisse(r, 'kuckuck').map(e => [e.runde, e.gang, e.quelle ?? null, ids(e), werte(e)])).toEqual(erwartet);
    expect(r.ansagen).toContain(RAID_TEXTE.ansage.kuckuck('links', 'Dd'));
    expect(r.ansagen).toContain(RAID_TEXTE.ansage.kuckuckLeer('Mitte'));
    // Cc und Ii verlieren nichts: Der Kuckuck nimmt nur den Kleinsten
    const pickt = ereignisse(r, 'kuckuck').flatMap(ids);
    expect(pickt.filter(id => id === 3 || id === 9)).toEqual([]);
  });

  test('ab Mittag anderthalbmal so hart; ohne Kuckuck kein Ereignis', () => {
    const { helden, aufstellung } = probefeldDrei();
    const r = raidKampf(KUCKUCK, helden, {}, aufstellung, 42, { ...OHNE_KRIT, ohne: nurKuckuck('mittag') });
    const links = ereignisse(r, 'kuckuck').filter(e => e.gang === 0);
    expect(links.map(e => [e.runde, werte(e)[0]])).toEqual([
      [1, 66], [4, 66], [7, 66], [10, 66], [13, 99], [16, 99], [19, 99], [22, 99],
    ]);
    const ohne = raidKampf(KUCKUCK, helden, {}, aufstellung, 42, { ...OHNE_KRIT, ohne: [...nurKuckuck(), 'kuckuck'] });
    expect(ereignisse(ohne, 'kuckuck')).toEqual([]);
    // Stufe II mit denselben Helden: kein Kuckuck
    expect(ereignisse(raidKampf(DREIZEHN, helden, {}, felder([1, 0, 0], [3, 0, 2], [4, 1, 3]), 42), 'kuckuck')).toEqual([]);
  });

  test('wer am Gang fällt, fällt am Kuckuck: Ort und Hauptursache nennen den Gang', () => {
    const einer = probefeldDrei(100);
    const r = raidKampf(KUCKUCK, einer.helden, {}, einer.aufstellung, 42, { ...OHNE_KRIT, ohne: nurKuckuck() });
    expect(r.gefallen).toEqual([{ heldId: 4, runde: 4, ursache: 'kuckuck', ort: RAID_TEXTE.ort.kuckuck('links') }]);
    expect(RAID_TEXTE.ort.kuckuck('links')).toBe('Kuckuck (Gang links)');
    // In der Wiedergabe ohne Klammer in der Klammer
    expect(RAID_TEXTE.lauf.gefallen('Dd', RAID_TEXTE.ort.kuckuck('links'))).toBe('Dd fällt: Kuckuck (Gang links)');
    expect(hauptursache(r.gefallen, { 4: 'Dd' })).toEqual({
      regel: 'kuckuck', ort: 'Kuckuck (Gang links)', satz: RAID_TEXTE.hauptursache.kuckuck('links', 'Dd'),
    });
    // Nach Dd ist Cc der Kleinste am Gang
    expect(ereignisse(r, 'kuckuck').filter(e => e.gang === 0).map(e => e.quelle)).toEqual([4, 4, 3, 3, 3, 3, 3, 3]);

    // Zwei fallen am selben Gang: der Satz zählt
    const zwei = probefeldDrei(90);
    zwei.helden[1] = held(3, 'witch', 'Cc', 100);
    const z = raidKampf(KUCKUCK, zwei.helden, {}, zwei.aufstellung, 42, { ...OHNE_KRIT, ohne: nurKuckuck() });
    expect(z.gefallen.map(g => [g.heldId, g.runde, g.ursache])).toEqual([[4, 4, 'kuckuck'], [3, 10, 'kuckuck']]);
    expect(hauptursache(z.gefallen, { 3: 'Cc', 4: 'Dd' })?.satz).toBe(RAID_TEXTE.hauptursache.kuckuckViele('links', 2));
  });
});

// ── Stufe III im Spielstand ──

/** Die Gilde mit allen zehn Lehrlingen; Zenit auf Stufe I und II je einmal besiegt, Stufe III in einer Aufstellung */
function stufeDreiSpielstand(aufstellung: RaidAufstellungKuckuck, stufe = 15): GameState {
  const state = createNewGameState();
  state.rngSeed = 4711;
  const { helden, stufen } = baueRaidGilde('anker20', { stufe });
  state.fighters = helden;
  state.schmiede = { stufen };
  state.globalStock.mat_tagstein = 0;
  merkeBezwungen(state, 'tagespfeiler', 1);
  raidStand(state).siege = 1;
  raidStand(state, Date.now(), DREIZEHN).siege = 1;
  raidStand(state, Date.now(), KUCKUCK).aufstellung = raidMusterAufstellungKuckuck(aufstellung, helden);
  return state;
}

const arten = (e: ErnstkampfErgebnis): string[] => e.truhen.map(t => t.art);
const setTeile = (inhalt: Record<string, number>): string[] => Object.keys(inhalt).filter(id => setVonItem(id));

describe('Stufe III im Spielstand', () => {
  test('dritte Stufe nach der zweiten; offen erst nach dem ersten Sieg auf Stufe II, vorher ohne Stand', () => {
    expect(RAID_STUFEN.map(d => d.id)).toEqual(['zenit', 'dreizehn', 'kuckuck']);
    expect(RAID_STUFEN.map(stufenNummer)).toEqual([1, 2, 3]);
    expect(stufenTexte(KUCKUCK)).toBe(K);
    expect(KUCKUCK.freiNachRaid).toBe('dreizehn');
    expect(RAID_DEFS[KUCKUCK.freiNachRaid!]).toBe(DREIZEHN);

    const state = createNewGameState();
    state.rngSeed = 4711;
    const { helden, stufen } = baueRaidGilde('anker20');
    state.fighters = helden;
    state.schmiede = { stufen };
    merkeBezwungen(state, 'tagespfeiler', 1);
    raidStand(state).siege = 1;
    expect(raidOffen(state, DREIZEHN)).toBe(true);
    expect(raidOffen(state, KUCKUCK)).toBe(false);
    expect(versuchsLage(state, Date.now(), KUCKUCK)).toMatchObject({ moeglich: false, grund: K.nochZu });
    expect(ernstkampf(state, Date.now(), KUCKUCK)).toBeNull();
    expect(raidKartenZustand(state, Date.now(), KUCKUCK)).toEqual({ offen: false, zeile: K.zu, zwoelf: false, truheWartet: false });
    expect(state.raidStufen?.kuckuck).toBeUndefined();

    raidStand(state, Date.now(), DREIZEHN).siege = 1;
    expect(raidOffen(state, KUCKUCK)).toBe(true);
    expect(raidKartenZustand(state, Date.now(), KUCKUCK)).toEqual({
      offen: true, zeile: RAID_TEXTE.karte.keinVersuch, zwoelf: false, truheWartet: true,
    });
    // Erster Besuch: alle zwanzig, wie sie in der Gilde stehen, vorne voll, dann die Mitte (wie «Naiv»)
    expect(raidStand(state, Date.now(), KUCKUCK).aufstellung).toEqual(raidMusterAufstellungKuckuck('naiv', helden));
    expect(versuchsLage(state, Date.now(), KUCKUCK)).toEqual({ moeglich: true, frei: true, freiUebrig: 3, kosten: {} });
  });

  test('eigene Woche und Kosten; mindestens fünfzehn, höchstens zwanzig, zwölf Spalten', () => {
    const state = stufeDreiSpielstand('naiv', 1);
    const jetzt = Date.now();
    for (let i = 0; i < 3; i++) {
      expect(versuchsLage(state, jetzt, KUCKUCK)).toEqual({ moeglich: true, frei: true, freiUebrig: 3 - i, kosten: {} });
      expect(ernstkampf(state, jetzt, KUCKUCK)).toMatchObject({ frei: true, kosten: {}, truhen: [] });
    }
    expect(versuchsLage(state, jetzt, KUCKUCK)).toEqual({
      moeglich: false, frei: false, freiUebrig: 0, kosten: { mat_tagstein: 10 }, grund: B.zuWenigTagstein(0, 10),
    });
    // Stufe I und II haben ihre eigenen Wochen
    expect(versuchsLage(state, jetzt).freiUebrig).toBe(3);
    expect(versuchsLage(state, jetzt, DREIZEHN).freiUebrig).toBe(3);
    state.globalStock.mat_tagstein = 25;
    expect(ernstkampf(state, jetzt, KUCKUCK)).toMatchObject({ frei: false, kosten: { mat_tagstein: 10 } });
    expect(state.globalStock.mat_tagstein).toBe(15);
    expect(state.raidStufen!.kuckuck).toMatchObject({ versucheGesamt: 4, woche: { versuche: 4 } });
    expect(state.raidStufen!.dreizehn).toMatchObject({ versucheGesamt: 0 });

    // Ein Einundzwanzigster bleibt auf der Bank; Felder gibt es bis Spalte L
    const einundzwanzig = createGuildFighter('cleric', 'Einundzwanzig', { ...ZAEH });
    einundzwanzig.id = 300;
    state.fighters.push(einundzwanzig);
    const feld = (): Feld | undefined => raidStand(state, jetzt, KUCKUCK).aufstellung[String(einundzwanzig.id)];
    expect(setzeHeld(state, einundzwanzig.id, { reihe: 2, spalte: 11 }, KUCKUCK)).toBe(false);
    expect(feld()).toBeUndefined();
    for (const h of state.fighters.slice(14, 20)) setzeHeld(state, h.id, null, KUCKUCK);
    expect(versuchsLage(state, jetzt, KUCKUCK)).toMatchObject({ moeglich: false, grund: B.mindestens(15) });
    expect(setzeHeld(state, einundzwanzig.id, { reihe: 2, spalte: 12 }, KUCKUCK)).toBe(false);
    expect(setzeHeld(state, einundzwanzig.id, { reihe: 2, spalte: 11 }, KUCKUCK)).toBe(true);
    expect(feld()).toEqual({ reihe: 2, spalte: 11 });
    expect(versuchsLage(state, jetzt, KUCKUCK).moeglich).toBe(true);
  });

  test('eigene Truhen: «Was aus dem Nest fiel», «Das Nest», zum ersten Sieg das Kuckucksei mit einer Unruh', () => {
    const state = stufeDreiSpielstand('profi');
    state.globalStock.die_unruh = 2; // von Stufe I und II
    let sieg: ErnstkampfErgebnis | null = null;
    const alle: ErnstkampfErgebnis[] = [];
    for (let i = 0; i < 3 && !sieg; i++) {
      const e = ernstkampf(state, Date.now(), KUCKUCK)!;
      alle.push(e);
      if (e.ergebnis.sieg) sieg = e;
    }
    expect(sieg?.ersterSieg).toBe(true);
    const truhen = alle.flatMap(e => e.truhen);
    expect(truhen.map(t => t.art)).toEqual(['halb', 'sieg', 'erster']);
    const [halb, nest, erster] = truhen;
    expect(halb).toMatchObject({ name: KUCKUCK.truhen.halb.name, text: KUCKUCK.truhen.halb.text });
    // Die Muster-Gilde hat alle Set-Teile der Stufen 8 bis 12 schon: statt eines Teils kommt der Ersatz
    expect(KUCKUCK.truhen.halb.setTeil).toMatchObject({ stufeVon: 8, stufeBis: 12 });
    expect(halb.inhalt).toEqual({ gold: 350, mat_tagstein: 10, crystal_shard: 15 });

    expect(nest).toMatchObject({ name: 'Das Nest', text: KUCKUCK.truhen.sieg.text });
    expect(nest.inhalt.mat_tagstein).toBe(20);
    expect(nest.inhalt.crystal_shard).toBeGreaterThanOrEqual(35);
    const wuerfeAus = KUCKUCK.truhen.sieg.wuerfeAus;
    expect(['loot_boss_alruna', 'loot_boss_orm'].map(id => wuerfeAus.filter(w => w === id).length)).toEqual([8, 8]);
    expect(setTeile(nest.inhalt)).toHaveLength(1);
    expect(erster).toMatchObject({ art: 'erster', name: K.erster.name, text: K.erster.text, inhalt: { die_unruh: 1 } });
    expect(state.globalStock.die_unruh).toBe(3);
    // Die Truhen der Stufen I und II warten diese Woche weiter
    expect(state.raid!.woche).toMatchObject({ halbeTruhe: false, truhe: false });

    const naechste = ernstkampf(state, Date.now(), KUCKUCK)!;
    expect([naechste.ersterSieg, naechste.truhen]).toEqual([false, []]);
  });

  test('XP 600 beim Sieg, 200 bei der Niederlage; Stufe III zählt eigens (raid3_…), ohne Erfolge', () => {
    const state = stufeDreiSpielstand('profi');
    let sieg: ErnstkampfErgebnis | null = null;
    for (let i = 0; i < 3 && !sieg; i++) {
      const e = ernstkampf(state, Date.now(), KUCKUCK)!;
      if (e.ergebnis.sieg) sieg = e;
    }
    expect(sieg!.xp.map(x => x.xp)).toEqual(Array(20).fill(600));
    expect(state.statistics).toMatchObject({ raid3_siege: 1, raid3_wochen: 1 });
    for (const id of ['raid_versuche', 'raid_siege', 'raid_punkt_zwoelf', 'raid_mehr_als_vier', 'raid_wochen', 'raid2_siege', 'raid2_wochen']) {
      expect(state.statistics[id] ?? 0, id).toBe(0);
    }
    expect(sieg!.neueErfolge.filter(id => id.startsWith('raid'))).toEqual([]);

    const schwach = stufeDreiSpielstand('naiv', 1);
    const niederlage = ernstkampf(schwach, Date.now(), KUCKUCK)!;
    expect(niederlage.ergebnis.sieg).toBe(false);
    expect(niederlage.xp.map(x => x.xp)).toEqual(Array(20).fill(200));
    expect(schwach.statistics.raid3_siege ?? 0).toBe(0);

    // Nur der erste Sieg einer Woche zählt als Woche
    vi.setSystemTime(START + WOCHE);
    for (let i = 0; i < 3 && !raidStand(state, Date.now(), KUCKUCK).woche.truhe; i++) ernstkampf(state, Date.now(), KUCKUCK);
    expect(state.statistics.raid3_wochen).toBe(2);
  });

  test('Alrunas Liste: ohne Meisterin der Meuchlerinnen oben eine Warnung, nur auf Stufe III', () => {
    const warnt = (state: GameState, def = KUCKUCK): boolean =>
      hinweise(state, def).some(h => !h.ok && h.text === RAID_TEXTE.liste.ohneMeuchlerin);
    const state = stufeDreiSpielstand('gut');
    const sina = state.fighters.find(f => f.name === 'Sina')!;
    const nix = state.fighters.find(f => f.name === 'Nix')!;
    expect([sina.spezialisierung, nix.spezialisierung]).toEqual(['assassin_meuchlerin', 'assassin_schattentaenzerin']);
    expect(warnt(state)).toBe(false);
    // Es zählt nur, wer oben steht: Sina auf der Bank, Warnung
    const stand = raidStand(state, Date.now(), KUCKUCK);
    const sinaFeld = stand.aufstellung[String(sina.id)];
    delete stand.aufstellung[String(sina.id)];
    expect(warnt(state)).toBe(true);
    stand.aufstellung[String(sina.id)] = sinaFeld;
    expect(warnt(state)).toBe(false);
    // Beide Schattentänzerin: Warnung, mit dem Klingen-Zeichen
    sina.spezialisierung = 'assassin_schattentaenzerin';
    expect(warnt(state)).toBe(true);
    expect(hinweise(state, KUCKUCK).find(h => h.text === RAID_TEXTE.liste.ohneMeuchlerin)?.art).toBe('klinge');
    // Der Tausch: Nix (Stufe 15, also Meisterin) als Meuchlerin, keine Warnung
    nix.spezialisierung = 'assassin_meuchlerin';
    expect(warnt(state)).toBe(false);
    // Unter Stufe 15 fehlt der Meister-Effekt: wieder die Warnung
    nix.level = 14;
    expect(warnt(state)).toBe(true);
    // Auf Stufe II nicht (dort fand die Suche auch ohne Meuchlerin 96 %)
    raidStand(state, Date.now(), DREIZEHN).aufstellung = raidMusterAufstellungDreizehn('profi', state.fighters);
    expect(warnt(state, DREIZEHN)).toBe(false);
  });

  test('Alrunas Liste: je Gang, wen der Kuckuck laut Probelauf zuerst pickt, und ob ihn der erste Hieb fällt', () => {
    const L = RAID_TEXTE.liste;
    const zeilen = (state: GameState) => hinweise(state, KUCKUCK).filter(h => h.art === 'kuckuck');
    const feldVon = (state: GameState, name: string) =>
      raidStand(state, Date.now(), KUCKUCK).aufstellung[String(state.fighters.find(f => f.name === name)!.id)];
    // «Gut»: am Gang die Kleinsten, alle entgehen dem Schnabel manchmal. Wenna (95 Leben) teilt sich aber in Runde 3 den
    // Gegenzeiger auf J mit Farn, kurz bevor der Kuckuck kommt (49 übrig, ein Hieb 57): Warnung, und Warnungen zuerst
    const gut = stufeDreiSpielstand('gut');
    expect(zeilen(gut)).toEqual([
      { art: 'kuckuck', ok: false, text: L.kuckuckFaellt('rechts', 'Wenna', true), felder: [feldVon(gut, 'Wenna')] },
      { art: 'kuckuck', ok: true, text: L.kuckuckOk('links', 'Morn', 2, 2, true), felder: [feldVon(gut, 'Morn')] },
      { art: 'kuckuck', ok: true, text: L.kuckuckOk('Mitte', 'Liedra', 2, 2, true), felder: [feldVon(gut, 'Liedra')] },
    ]);
    expect(zeilen(gut)[0].text).toContain('ist der erste Schnabelhieb, der trifft, auch der letzte');
    // Wie im Kampf nach den Leben am Ende der Runde, nicht nach den vollen: In «Profi» trifft das Pendel in Runde 2
    // Bertram auf F (168 auf 92), dann pickt der Kuckuck ihn und nicht Benno (102); Ansgar fängt den Hieb ab
    const profi = stufeDreiSpielstand('profi');
    expect(zeilen(profi).find(h => h.text.includes('Gang Mitte'))).toEqual(
      { art: 'kuckuck', ok: true, text: L.kuckuckOk('Mitte', 'Bertram', 5, 3, false), felder: [feldVon(profi, 'Bertram')] });
    // Mit fünfzehn fällt Wenna allein auf J schon unter dem Gegenzeiger (99 auf 95): Der Kuckuck nimmt Ewin
    expect(zeilen(stufeDreiSpielstand('fuenfzehn')).find(h => h.text.includes('Gang rechts'))?.text)
      .toBe(L.kuckuckOk('rechts', 'Ewin', 4, 3, false));
    // Eine schwache Gilde (Stufe 1): Gerlinde entgeht nie und fällt ab Mittag beim ersten Hieb (Warnung); Morn hält ab
    // Mittag auch nur einen, entgeht aber manchmal (keine Warnung)
    const schwach = stufeDreiSpielstand('gut', 1);
    expect(zeilen(schwach)).toEqual([
      { art: 'kuckuck', ok: false, text: L.kuckuckZerbrechlich('Mitte', 'Gerlinde', 2), felder: [feldVon(schwach, 'Gerlinde')] },
      { art: 'kuckuck', ok: false, text: L.kuckuckFaellt('rechts', 'Wenna', true), felder: [feldVon(schwach, 'Wenna')] },
      { art: 'kuckuck', ok: true, text: L.kuckuckOk('links', 'Morn', 2, 1, true), felder: [feldVon(schwach, 'Morn')] },
    ]);
    expect(zeilen(schwach)[0].text).toContain('ab Mittag fällt Gerlinde beim ersten');
    expect(zeilen(schwach)[2].text).toContain('ab Mittag einen, und entgeht dem Schnabel manchmal');
    // Morn allein am Gang links, vorn auf C: Das Pendel fällt ihn in Runde 1, bevor der Kuckuck kommt
    const schwachStand = raidStand(schwach, Date.now(), KUCKUCK);
    for (const [id, feld] of Object.entries(schwachStand.aufstellung)) {
      if (gangSpalten(0).includes(feld.spalte)) delete schwachStand.aufstellung[id];
    }
    schwachStand.aufstellung[String(schwach.fighters.find(f => f.name === 'Morn')!.id)] = { reihe: 0, spalte: 2 };
    expect(zeilen(schwach).find(h => h.text.includes('Gang links'))).toEqual(
      { art: 'kuckuck', ok: false, text: L.kuckuckNiemandMehr('links'), felder: [{ reihe: 0, spalte: 2 }] });
    // Leerer Gang: er geht wieder hinein (der Zeiger warnt eigens für die leeren Spalten)
    const stand = raidStand(gut, Date.now(), KUCKUCK);
    for (const [id, feld] of Object.entries(stand.aufstellung)) if (gangSpalten(0).includes(feld.spalte)) delete stand.aufstellung[id];
    expect(zeilen(gut).find(h => h.text.includes('Gang links'))).toEqual({ art: 'kuckuck', ok: true, text: L.kuckuckLeer('links'), felder: [] });
    // Nur auf Stufe III
    raidStand(gut, Date.now(), DREIZEHN).aufstellung = raidMusterAufstellungDreizehn('profi', gut.fighters);
    expect(hinweise(gut, DREIZEHN).some(h => h.art === 'kuckuck')).toBe(false);
  });

  test('Stufe III kommt nach dem Speichern unverändert zurück', () => {
    const daten = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() { return daten.size; },
      clear: () => daten.clear(),
      getItem: (key: string) => daten.get(key) ?? null,
      key: (index: number) => [...daten.keys()][index] ?? null,
      removeItem: (key: string) => { daten.delete(key); },
      setItem: (key: string, value: string) => { daten.set(key, String(value)); },
    } satisfies Storage);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    hebeSperreNachLadenAuf();
    const saveSystem = new SaveSystem();
    const state = stufeDreiSpielstand('gut');
    ernstkampf(state, Date.now(), KUCKUCK);
    expect(saveSystem.save(state)).toBe(true);
    const geladen = saveSystem.load()!;
    expect(geladen.raidStufen).toEqual(state.raidStufen);
    expect(geladen.raidStufen?.kuckuck?.versucheGesamt).toBe(1);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});

// ── Texte und Muster ──

describe('Stufe III: Texte und Muster-Aufstellungen', () => {
  test('das Regelblatt nennt die Zahlen aus den Daten; keine Erfolge auf Stufe III', () => {
    const blatt = K.regelBlatt.join(' ');
    expect(K.stufe).toBe('III');
    expect(K.name).toBe(KUCKUCK.name);
    expect(blatt).toContain(`A bis ${spaltenName(spaltenZahl(KUCKUCK) - 1)}`);
    const gaenge = [0, 1, 2].map(g => gangSpalten(g).map(spaltenName).join(' und ')).join(', ');
    expect(blatt).toContain(`(${gaenge})`);
    expect(blatt).toContain(`Ab Runde ${KUCKUCK.regeln.mittagAb}`);
    expect(blatt).toContain(`Nach Runde ${KUCKUCK.regeln.mitternacht}`);
    expect([KUCKUCK.minHelden, KUCKUCK.maxHelden, KUCKUCK.freieVersucheJeWoche, KUCKUCK.kostenJeVersuch]).toEqual([15, 20, 3, { mat_tagstein: 10 }]);
    expect(blatt).toContain('Fünfzehn bis zwanzig Helden');
    expect(blatt).toContain('drei freie Ernstkämpfe, danach je zehn Tagstein');
    // Auf Stufe III gibt es keine Erfolge: Die Texte versprechen keine
    expect(K.nachWochensieg).not.toContain('Erfolg');
    // Kein ß in den Texten (Schweizer Schreibweise)
    expect(JSON.stringify(K)).not.toContain('ß');
  });

  test('Wiedergabe: der Kuckuck steht in der Legende; «stand» bei einem Nachbarn der Funken, «standen» bei mehreren', () => {
    const bildschirm = readFileSync(new URL('../src/ui/screens/RaidScreen.ts', import.meta.url), 'utf8');
    expect(bildschirm).toContain("${hatKuckuck(def) ? `<span class=\"c-kuckuck\">${ic('kuckuck')}${g.kuckuck}</span>` : ''}");
    expect(RAID_TEXTE.ansage.funken('Sina', ['Brom'])).toBe('Zenit merkt sich, wer ihm am meisten wehtut. Sina hat gewonnen. Brom stand daneben.');
    expect(RAID_TEXTE.ansage.funken('Sina', ['Brom', 'Farn'])).toMatch(/Brom.+Farn standen daneben\.$/);
    expect(RAID_TEXTE.ansage.funken('Sina', [])).toBe('Zenit merkt sich, wer ihm am meisten wehtut. Sina hat gewonnen.');
  });

  test('anker20: die fünfzehn von Stufe II und fünf weitere Lehrlinge; die Muster-Aufstellungen passen zur Gilde', () => {
    const { helden } = baueRaidGilde('anker20');
    expect(helden).toHaveLength(20);
    const lehrlinge = helden.filter(h => h.lehrling);
    expect(lehrlinge).toHaveLength(10);
    expect(lehrlinge.every(h => LEHRLINGE[h.classId]?.name === h.name)).toBe(true);
    expect(new Set(lehrlinge.map(h => h.classId)).size).toBe(10);
    expect(helden.slice(0, 15).map(h => h.name)).toEqual(baueRaidGilde('anker15').helden.map(h => h.name));

    for (const [name, plan] of Object.entries(RAID_AUFSTELLUNGEN_KUCKUCK)) {
      const felderDesPlans = Object.values(plan).map(f => `${f.reihe}:${f.spalte}`);
      expect(new Set(felderDesPlans).size, name).toBe(felderDesPlans.length);
      expect(Object.values(plan).every(f => f.reihe < KUCKUCK.reihen && f.spalte < spaltenZahl(KUCKUCK)), name).toBe(true);
      const gilde = name === 'fuenfzehn' ? baueRaidGilde('anker15').helden : helden;
      expect(Object.keys(raidMusterAufstellungKuckuck(name as RaidAufstellungKuckuck, gilde)), name)
        .toHaveLength(name === 'fuenfzehn' ? 15 : 20);
    }
    // «Gut» und «Profi» besetzen jede Spalte (der Zeiger schlägt sonst durch)
    for (const name of ['gut', 'profi'] as const) {
      const spalten = new Set(Object.values(RAID_AUFSTELLUNGEN_KUCKUCK[name]).map(f => f.spalte));
      expect(spalten.size, name).toBe(12);
    }
  });
});

// ── Eichbänder Stufe III ──

interface MessungDrei {
  siege: number;
  siegRunde: number;
  rest: number;
  mitternacht: number;
}
const gemessenDrei = new Map<string, MessungDrei>();

function messeDrei(aufstellung: RaidAufstellungKuckuck, ohne: ('kuckuck')[] = []): MessungDrei {
  const schluessel = `${aufstellung} ${ohne.join(',')}`;
  const fertig = gemessenDrei.get(schluessel);
  if (fertig) return fertig;
  const { helden, stufen } = baueRaidGilde(aufstellung === 'fuenfzehn' ? 'anker15' : 'anker20');
  const felderDerGilde = raidMusterAufstellungKuckuck(aufstellung, helden);
  const kaempfe = Array.from({ length: 20 }, (_, i) =>
    raidKampf(KUCKUCK, helden, stufen, felderDerGilde, i * 7919, { knapp: true, ohne }));
  const siege = kaempfe.filter(k => k.sieg);
  const messung: MessungDrei = {
    siege: siege.length,
    siegRunde: siege.length > 0 ? siege.reduce((s, k) => s + k.runden, 0) / siege.length : 0,
    rest: kaempfe.reduce((s, k) => s + k.zenitRest, 0) / kaempfe.length,
    mitternacht: kaempfe.filter(k => k.mitternacht).length,
  };
  gemessenDrei.set(schluessel, messung);
  return messung;
}

function zwischen(wert: number, von: number, bis: number, was: string): void {
  expect(wert, was).toBeGreaterThanOrEqual(von);
  expect(wert, was).toBeLessThanOrEqual(bis);
}

describe('Eichbänder Stufe III: 20 feste Samen an der Muster-Gilde mit allen zehn Lehrlingen', () => {
  test('anker20 + Gut: 9 bis 16 Siege, im Schnitt in Runde 12 bis 15', () => {
    const m = messeDrei('gut');
    zwischen(m.siege, 9, 16, 'Siege');
    zwischen(m.siegRunde, 12, 15, 'Siegrunde');
  });

  test('anker20 + Profi: mindestens 18 Siege', () => {
    expect(messeDrei('profi').siege).toBeGreaterThanOrEqual(18);
  });

  test('anker20 + Lehrbuch (Ordnung von Stufe II): höchstens 2 Siege, Zenit im Schnitt bei 15 bis 40 %', () => {
    const m = messeDrei('lehrbuch');
    expect(m.siege).toBeLessThanOrEqual(2);
    zwischen(m.rest, 0.15, 0.40, 'Rest');
  });

  test('anker20 + Naiv: kein Sieg, Zenit im Schnitt bei mindestens 30 %', () => {
    const m = messeDrei('naiv');
    expect(m.siege).toBe(0);
    expect(m.rest).toBeGreaterThanOrEqual(0.30);
  });

  test('fünfzehn reichen nicht: anker15 in der besten gesuchten Ordnung höchstens 2 Siege', () => {
    expect(messeDrei('fuenfzehn').siege).toBeLessThanOrEqual(2);
  });

  test('der Kuckuck zählt: ohne ihn gewinnt «Gut» mindestens 17 von 20', () => {
    expect(messeDrei('gut', ['kuckuck']).siege).toBeGreaterThanOrEqual(17);
  });

  test('Mitternacht höchstens einmal je Aufstellung', () => {
    for (const aufstellung of ['gut', 'profi', 'lehrbuch', 'naiv', 'fuenfzehn'] as const) {
      expect(messeDrei(aufstellung).mitternacht, aufstellung).toBeLessThanOrEqual(1);
    }
  });
});
