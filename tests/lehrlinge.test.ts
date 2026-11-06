import { describe, test, expect } from 'vitest';
import { CLASS_DEFS } from '../src/data/classes';
import { LEHRLINGE } from '../src/data/lehrlinge';
import { ACHIEVEMENT_DEFS } from '../src/data/achievements';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { awardXP, MAX_HERO_LEVEL, totalXpForLevel } from '../src/systems/HeroProgression';
import { anheuerKosten } from '../src/systems/Empfehlung';
import { lehrbuchLernen } from '../src/systems/Ausbildung';
import {
  LEHRLING_AB_STUFE, hintergrundVon, kartenName, lehrlingAufnehmen, lehrlingDerKlasse, lehrlingLage, meisterDerKlasse,
} from '../src/systems/Lehrlinge';
import { kennzahlenAktualisieren } from '../src/systems/AchievementSystem';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { CURRENT_VERSION, pruefeSpielstandText } from '../src/systems/SaveSystem';
import { setzeHeld, raidStand } from '../src/systems/Raid';
import { klassenTafelHtml, lehrlingTafelHtml } from '../src/ui/components/KlassenTafel';
import { initHeroesScreen, renderHeroCard } from '../src/ui/screens/HeroesScreen';
import { bildKarte, bildKlasse, heldBildPfad } from '../src/ui/heldBild';

function neuerHeld(classId: string): GuildFighter {
  const c = CLASS_DEFS[classId];
  return createGuildFighter(c.id, c.name, c.baseStats);
}

/** Held auf Stufe 15 über echte Aufstiege */
function meister(classId: string): GuildFighter {
  const f = neuerHeld(classId);
  awardXP(f, totalXpForLevel(MAX_HERO_LEVEL));
  return f;
}

function gilde(gold: number, ...helden: GuildFighter[]): GameState {
  const state = createNewGameState();
  state.globalStock['gold'] = gold;
  helden.forEach((h, i) => { h.id = i + 1; });
  state.fighters.push(...helden);
  return state;
}

describe('Lehrlinge: Daten', () => {
  test('jede Klasse hat genau einen Lehrling mit eigenem Namen, Satz und Hintergrund', () => {
    expect(Object.keys(LEHRLINGE).sort()).toEqual(Object.keys(CLASS_DEFS).sort());
    const namen = Object.values(LEHRLINGE).map(l => l.name);
    expect(new Set(namen).size).toBe(namen.length);
    for (const [classId, l] of Object.entries(LEHRLINGE)) {
      expect(l.classId).toBe(classId);
      // nicht wie eine Klasse heissen (die ersten Helden tragen den Namen ihrer Klasse)
      expect(Object.values(CLASS_DEFS).map(c => c.name)).not.toContain(l.name);
      expect(l.kurz.length).toBeGreaterThan(10);
      expect(l.hintergrund).toContain('\n\nMotivation: ');
      // Schweizer Schreibweise
      expect(`${l.kurz} ${l.hintergrund}`).not.toMatch(/ß/);
    }
  });
});

describe('Lehrlinge: Regeln', () => {
  test('ohne Helden der Klasse kein Lehrling; unter Stufe 15 «zu früh»; ab 15 frei zum Preis eines neuen Helden', () => {
    const guardian = neuerHeld('guardian');
    const state = gilde(10_000, guardian);
    expect(lehrlingLage(state, 'ranger').art).toBe('ohne_meister');
    expect(lehrlingLage(state, 'guardian')).toMatchObject({ art: 'zu_frueh', meister: guardian });

    awardXP(guardian, totalXpForLevel(LEHRLING_AB_STUFE) - guardian.xp - 1);
    expect(guardian.level).toBe(LEHRLING_AB_STUFE - 1);
    expect(lehrlingLage(state, 'guardian').art).toBe('zu_frueh');
    awardXP(guardian, 1);
    expect(lehrlingLage(state, 'guardian')).toEqual({
      art: 'frei', meister: guardian, kosten: anheuerKosten(1), bezahlbar: true,
    });
  });

  test('Aufnehmen: Gold weg, neuer Held mit Namen des Lehrlings auf Stufe 1, hinten in der Gilde, nächste Id', () => {
    const state = gilde(1000, meister('guardian'), neuerHeld('ranger'));
    const kosten = anheuerKosten(2);
    const lehrling = lehrlingAufnehmen(state, 'guardian')!;
    expect(lehrling).toMatchObject({
      id: 3, classId: 'guardian', name: 'Bertram', level: 1, xp: 0, lehrling: true,
      gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    });
    expect(lehrling.baseStats).toEqual(CLASS_DEFS.guardian.baseStats);
    expect(lehrling.baseStats).not.toBe(CLASS_DEFS.guardian.baseStats);
    expect(state.globalStock['gold']).toBe(1000 - kosten);
    expect(state.fighters[2]).toBe(lehrling);
    expect(lehrlingDerKlasse(state, 'guardian')).toBe(lehrling);
    expect(meisterDerKlasse(state, 'guardian')).toBe(state.fighters[0]);
    // Je Klasse einer: ein zweites Mal geht nicht
    expect(lehrlingLage(state, 'guardian').art).toBe('da');
    expect(lehrlingAufnehmen(state, 'guardian')).toBeNull();
    expect(state.fighters).toHaveLength(3);
    // Neue Helden aus createGuildFighter bekommen danach keine Id, die es schon gibt
    expect(createGuildFighter('ranger', 'Ranger', CLASS_DEFS.ranger.baseStats).id).toBeGreaterThan(3);
  });

  test('zu wenig Gold, zu früh oder fremde Klasse: nichts passiert', () => {
    const state = gilde(anheuerKosten(1) - 1, meister('cleric'));
    expect(lehrlingLage(state, 'cleric')).toMatchObject({ art: 'frei', bezahlbar: false });
    expect(lehrlingAufnehmen(state, 'cleric')).toBeNull();
    expect(lehrlingAufnehmen(state, 'ranger')).toBeNull();
    expect(lehrlingAufnehmen(state, 'gibtsnicht')).toBeNull();
    expect(state.fighters).toHaveLength(1);
    expect(state.globalStock['gold']).toBe(anheuerKosten(1) - 1);
  });

  test('der Meister ist der Held der Klasse mit der höchsten Stufe, nie der Lehrling', () => {
    const a = neuerHeld('witch');
    const b = meister('witch');
    const state = gilde(5000, a, b);
    expect(meisterDerKlasse(state, 'witch')).toBe(b);
    const lehrling = lehrlingAufnehmen(state, 'witch')!;
    awardXP(lehrling, totalXpForLevel(MAX_HERO_LEVEL));
    expect(meisterDerKlasse(state, 'witch')).toBe(b);
  });

  test('das Lehrbuch bringt den Lehrling mit dem Überschuss des Meisters hoch', () => {
    const m = meister('druid');
    awardXP(m, 3000);
    const state = gilde(5000, m);
    const lehrling = lehrlingAufnehmen(state, 'druid')!;
    const ergebnis = lehrbuchLernen(state, m.id, lehrling.id)!;
    expect(ergebnis.nachStufe).toBe(MAX_HERO_LEVEL);
    expect(lehrling.level).toBe(MAX_HERO_LEVEL);
    expect(m.level).toBe(MAX_HERO_LEVEL);
  });

  test('Name, Hintergrund und Bild: der Lehrling eigen, der erste Held wie seine Klasse', () => {
    const m = meister('bard');
    const state = gilde(5000, m);
    const l = lehrlingAufnehmen(state, 'bard')!;
    expect(kartenName(m)).toBe(CLASS_DEFS.bard.name);
    expect(kartenName(l)).toBe('Benno');
    expect(hintergrundVon(m)).toBe(CLASS_DEFS.bard.background);
    expect(hintergrundVon(l)).toBe(LEHRLINGE.bard.hintergrund);
    expect(heldBildPfad('bard')).toBe('assets/heroes/hero_bard.png');
    expect(bildKarte(m)).toEqual({ klasse: '', stil: "background-image:url('assets/heroes/hero_bard.png')" });
    expect(bildKarte(l)).toEqual({ klasse: 'lehrling-bild', stil: "--held-bild:url('assets/heroes/hero_bard.png')" });
    expect(bildKlasse(m)).toBe('');
    expect(bildKlasse(l)).toBe('lehrling-bild');
    expect(bildKarte({ classId: 'gibtsnicht', lehrling: true })).toEqual({ klasse: '', stil: '' });
  });
});

describe('Lehrlinge im Kampf, im Raid und im Spielstand', () => {
  test('Kampfeinheit: Merkmal nur beim Lehrling, sonst gleich wie bisher', () => {
    const engine = new CombatEngine(new GearSystem());
    const m = meister('assassin');
    const state = gilde(5000, m);
    const l = lehrlingAufnehmen(state, 'assassin')!;
    const einheitM = engine.fighterToCombatUnit(m);
    expect('lehrling' in einheitM).toBe(false);
    expect(engine.fighterToCombatUnit(l).lehrling).toBe(true);
  });

  test('eine Expedition mit Meister und Lehrling derselben Klasse startet mit beiden', () => {
    const m = meister('guardian');
    const state = gilde(5000, m, neuerHeld('cleric'));
    const l = lehrlingAufnehmen(state, 'guardian')!;
    const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
    const run = system.startExpedition(state, 'forest_short', [m.id, l.id, 2])!;
    expect(run).not.toBeNull();
    expect(run.party.map(u => u.id)).toEqual([m.id, l.id, 2]);
    expect(run.party.filter(u => u.classId === 'guardian')).toHaveLength(2);
  });

  test('Raid: der Lehrling lässt sich aufstellen wie jeder Held', () => {
    const helden = Object.keys(CLASS_DEFS).map(meister);
    const state = gilde(50_000, ...helden);
    const l = lehrlingAufnehmen(state, 'guardian')!;
    raidStand(state);
    setzeHeld(state, helden[9].id, null);
    expect(setzeHeld(state, l.id, { reihe: 2, spalte: 5 })).toBe(true);
    expect(raidStand(state).aufstellung[String(l.id)]).toEqual({ reihe: 2, spalte: 5 });
  });

  test('Spielstand: «lehrling» bleibt erhalten und muss ja oder nein sein', () => {
    const state = gilde(5000, meister('ranger'));
    lehrlingAufnehmen(state, 'ranger');
    state.saveVersion = CURRENT_VERSION;
    const text = JSON.stringify(state);
    expect(pruefeSpielstandText(text).ok).toBe(true);
    const zurueck = JSON.parse(text) as GameState;
    expect(zurueck.fighters[1]).toMatchObject({ name: 'Wenna', lehrling: true });
    const kaputt = JSON.parse(text);
    kaputt.fighters[1].lehrling = 'ja';
    expect(pruefeSpielstandText(JSON.stringify(kaputt)).ok).toBe(false);
  });
});

describe('Lehrlinge: Erfolge', () => {
  test('erster Lehrling, ausgelernt, alle zehn', () => {
    const helden = Object.keys(CLASS_DEFS).map(meister);
    const state = gilde(1_000_000, ...helden);
    kennzahlenAktualisieren(state);
    expect(state.statistics.lehrlinge ?? 0).toBe(0);

    const erster = lehrlingAufnehmen(state, 'guardian')!;
    kennzahlenAktualisieren(state);
    expect(state.statistics.lehrlinge).toBe(1);
    expect(state.statistics.lehrlinge_ausgelernt ?? 0).toBe(0);

    awardXP(erster, totalXpForLevel(MAX_HERO_LEVEL));
    for (const classId of Object.keys(CLASS_DEFS)) lehrlingAufnehmen(state, classId);
    kennzahlenAktualisieren(state);
    expect(state.statistics.lehrlinge).toBe(10);
    expect(state.statistics.lehrlinge_ausgelernt).toBe(1);
    expect(state.statistics.helden_anzahl).toBe(20);

    const ziele = Object.fromEntries(ACHIEVEMENT_DEFS.map(d => [d.id, d.condition(state.statistics)]));
    expect(ziele).toMatchObject({ erster_lehrling: true, lehrling_ausgelernt: true, doppelt_besetzt: true });
  });
});

describe('Lehrlinge: Reiter «Anheuern» und Heldenkarte', () => {
  test('Abschnitt «Lehrlinge»: aufnehmen mit Preis, «kommt ab Stufe 15», «schon da»; leer ohne Helden', () => {
    expect(lehrlingTafelHtml(gilde(0))).toBe('');
    const wartet = neuerHeld('ranger');
    wartet.level = 12;
    const state = gilde(5000, meister('guardian'), wartet, meister('cleric'));
    lehrlingAufnehmen(state, 'cleric');
    const kosten = anheuerKosten(state.fighters.length);
    const html = lehrlingTafelHtml(state);

    expect(html).toContain('Lehrlinge · 1 von 10');
    expect(html).toContain(`data-lehrling-klasse="guardian" data-cost="${kosten}"`);
    expect(html).toContain('Bertram');
    expect(html).toContain(LEHRLINGE.guardian.kurz);
    expect(html).toContain('Kommt, sobald Ranger Stufe 15 erreicht (jetzt Stufe 12).');
    expect(html).not.toContain('data-lehrling-klasse="ranger"');
    expect(html).toContain('✓ In deiner Gilde · Cleric · Stufe 1');
    // Das Lehrbuch hat für Pirmin nichts, solange Cleric keinen Überschuss hat
    expect(html).not.toContain('kommt Pirmin');
    // Reihenfolge: aufnehmen, dann wartet, dann schon da
    expect(html.indexOf('data-kt-lehrling="guardian"')).toBeLessThan(html.indexOf('data-kt-lehrling="ranger"'));
    expect(html.indexOf('data-kt-lehrling="ranger"')).toBeLessThan(html.indexOf('data-kt-lehrling="cleric"'));
    // Gespiegeltes Bild der Klasse
    expect(html).toContain(`class="kt-bild lehrling-bild" style="--held-bild:url('assets/heroes/hero_guardian.png')"`);
  });

  test('mit Überschuss nennt die Karte, was das Lehrbuch bringt', () => {
    const m = meister('cleric');
    awardXP(m, 5000);
    const state = gilde(5000, m);
    lehrlingAufnehmen(state, 'cleric');
    expect(lehrlingTafelHtml(state)).toContain('kommt Pirmin mit dem Überschuss von Cleric auf Stufe 15.');
  });

  test('ist keine Klasse mehr anzuheuern, stehen die Lehrlinge oben, sonst unten', () => {
    const state = gilde(5000, meister('guardian'));
    let html = klassenTafelHtml(state, c => `<i data-anheuern="${c.id}"></i>`);
    expect(html.indexOf('data-anheuern=')).toBeGreaterThan(-1);
    expect(html.indexOf('kt-lehrlinge')).toBeGreaterThan(html.indexOf('data-anheuern='));

    state.classesUnlocked = Object.keys(CLASS_DEFS);
    for (const classId of Object.keys(CLASS_DEFS)) {
      if (classId !== 'guardian') state.fighters.push({ ...neuerHeld(classId), id: state.fighters.length + 1 });
    }
    html = klassenTafelHtml(state, c => `<i data-anheuern="${c.id}"></i>`);
    expect(html).not.toContain('data-anheuern=');
    expect(html.indexOf('kt-lehrlinge')).toBeLessThan(html.indexOf('data-kt-klasse='));
  });

  test('Heldenkarte: Lehrling mit Namen, «Lehrling · Klasse» und gespiegeltem Bild', () => {
    const m = meister('paladin');
    const state = gilde(5000, m);
    const l = lehrlingAufnehmen(state, 'paladin')!;
    initHeroesScreen(state);
    const karteM = renderHeroCard(m, 'my');
    const karteL = renderHeroCard(l, 'my');
    expect(karteM).toContain(`<div class="hc-nm">${CLASS_DEFS.paladin.name}</div>`);
    expect(karteM).not.toContain('lehrling-bild');
    expect(karteL).toContain('<div class="hc-nm">Gerlinde</div>');
    expect(karteL).toContain(`<span class="hc-lehrling">Lehrling · ${CLASS_DEFS.paladin.name}</span>`);
    expect(karteL).toContain(`class="hcard hcard-img lehrling-bild" data-fighter-id="${l.id}" style="--held-bild:url('assets/heroes/hero_paladin.png')"`);
  });
});
