import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveSystem, hebeSperreNachLadenAuf, nutzeProbespiel, pruefeSpielstandText, spielstandDateiname } from './SaveSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, resetBuildingIdCounter } from '../models/Building';
import { createCitizen } from '../models/Citizen';
import { createGuildFighter } from '../models/GuildRoster';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { BUILDING_DEFS } from '../data/buildings';
import { brettKurz } from './Auftragsbrett';

const SAVE_KEY = 'magic_city_save';

/**
 * Minimal in-memory localStorage for the node test environment. With `grenze` (characters of all
 * values together) setItem throws a QuotaExceededError like a full browser storage.
 */
function createMemoryStorage(grenze = Infinity): Storage {
  const data = new Map<string, string>();
  const belegt = () => [...data.values()].reduce((summe, v) => summe + v.length, 0);
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => { data.delete(key); },
    setItem: (key: string, value: string) => {
      if (belegt() - (data.get(key)?.length ?? 0) + String(value).length > grenze) {
        throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
      }
      data.set(key, String(value));
    },
  };
}

/** Alle Plätze im Speicher, die mit `vorne` beginnen (zum Vergleichen vorher/nachher). */
function plaetze(vorne: string): Record<string, string> {
  const alle: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(vorne)) alle[key] = localStorage.getItem(key)!;
  }
  return alle;
}

function placeBuilding(state: GameState, typeId: string, x: number, y: number) {
  const b = createBuildingInstance(typeId, x, y, true);
  state.buildings.push(b);
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      state.grid[y + dy][x + dx] = { buildingId: b.id, isRoad: false };
    }
  }
  return b;
}

/** Stores a raw (old-format) state as save without going through save(). */
function writeRawSave(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

/** Stand von Tag 12 mit Holzfällerhütte, zwei Helden und Stadtstufe 3. */
function standMitHelden(): GameState {
  const state = createNewGameState();
  placeBuilding(state, 'LUMBER_CAMP', 5, 5);
  const held = createGuildFighter(0, 'guardian', 'Brom', { hp: 50, maxHp: 50, atk: 8, def: 4, spd: 1, critChance: 0, critMult: 1.5 });
  held.level = 4;
  state.fighters.push(held, createGuildFighter(0, 'ranger', 'Lia', { hp: 30, maxHp: 30, atk: 9, def: 1, spd: 1, critChance: 0, critMult: 1.5 }));
  state.day = 12;
  state.stadtweg = { stufe: 3, herzsteine: [], gelesen: 0 };
  return state;
}

describe('SaveSystem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('speichern → laden gibt denselben Stand', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = camp.id;
    camp.assignedWorkerIds.push(worker.id);
    state.citizens.push(worker);
    state.day = 7;
    state.globalStock['wood'] = 123;
    state.globalStock['arcane_amulet'] = 1;

    expect(saveSystem.save(state)).toBe(true);
    const loaded = saveSystem.load();

    expect(loaded).toEqual(state);
  });

  it('behält das herstellbare arcane_amulet beim Laden', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.globalStock['arcane_amulet'] = 2;
    saveSystem.save(state);

    expect(saveSystem.load()?.globalStock['arcane_amulet']).toBe(2);
  });

  it('entfernt bei alten Spielständen unbekannte Gebäudetypen samt Verweisen', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 19;
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    const bank = placeBuilding(state, 'BANK_V2', 10, 10);
    placeBuilding(state, 'VAULT', 14, 10);
    placeBuilding(state, 'BANK_WITH_CHEST', 18, 10);
    const worker = createCitizen('WORKER');
    worker.assignedBuildingId = bank.id;
    state.citizens.push(worker);
    state.specialists.push({ specialistId: 'spec_test', assignedBuildingId: bank.id });
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    expect(loaded.buildings.map(b => b.id)).toEqual([camp.id]);
    expect(loaded.buildings.every(b => BUILDING_DEFS[b.typeId])).toBe(true);
    expect(loaded.grid[10][10]).toBeNull();
    expect(loaded.grid[5][5]?.buildingId).toBe(camp.id);
    expect(loaded.citizens[0].status).toBe('IDLE');
    expect(loaded.citizens[0].assignedBuildingId).toBeNull();
    expect(loaded.specialists[0].assignedBuildingId).toBeNull();
    expect(loaded.saveVersion).toBe(23);
  });

  it('legt bei der Migration kein BANK_V2 an und verschenkt keine Test-Gegenstände', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 5;
    const stockBefore = { ...state.globalStock };
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    expect(loaded.buildings.some(b => b.typeId === 'BANK_V2')).toBe(false);
    expect(loaded.buildings).toHaveLength(0);
    expect(loaded.globalStock).toEqual(stockBefore);
  });
});

describe('SaveSystem – Version 21: ein Gebäude je Art', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('alter Spielstand mit drei Holzfällerhütten lädt als eine Hütte Stufe 3', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    state.saveVersion = 20;
    const huetten = [placeBuilding(state, 'LUMBER_CAMP', 5, 5), placeBuilding(state, 'LUMBER_CAMP', 8, 5), placeBuilding(state, 'LUMBER_CAMP', 11, 5)];
    for (const h of huetten) {
      h.connected = true;
      h.activeRecipeId = 'RCP_WOOD_1';
      const worker = createCitizen('WORKER');
      worker.assignedBuildingId = h.id;
      h.assignedWorkerIds.push(worker.id);
      state.citizens.push(worker);
    }
    const brunnen = placeBuilding(state, 'WELL', 20, 20);
    writeRawSave(state);

    const loaded = saveSystem.load()!;

    const camps = loaded.buildings.filter(b => b.typeId === 'LUMBER_CAMP');
    expect(camps).toHaveLength(1);
    expect(camps[0].tier).toBe(3);
    expect(camps[0].assignedWorkerIds).toHaveLength(3);
    expect(loaded.citizens.every(c => c.status === 'WORKER' && c.assignedBuildingId === camps[0].id)).toBe(true);
    expect(loaded.buildings.map(b => b.typeId).sort()).toEqual(['LUMBER_CAMP', 'WELL']);
    expect(loaded.grid[20][20]?.buildingId).toBe(brunnen.id);
    // Kartenfelder zeigen nur noch auf Gebäude, die es gibt
    const ids = new Set(loaded.buildings.map(b => b.id));
    expect(loaded.grid.flat().every(t => !t || t.buildingId == null || ids.has(t.buildingId))).toBe(true);
    expect(loaded.saveVersion).toBe(23);
  });

  it('ein aktueller Spielstand bleibt beim Laden unverändert', () => {
    const saveSystem = new SaveSystem();
    const state = createNewGameState();
    const camp = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    camp.tier = 2;
    saveSystem.save(state);
    expect(saveSystem.load()).toEqual(state);
  });
});

describe('SaveSystem – die endlose Treppe ist weg', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  /** Spielstand aus der Zeit mit Treppe, gespeichert mitten in einem Aufstieg. */
  function alterTreppenStand(): GameState {
    const state = createNewGameState();
    const held = createGuildFighter(0, 'guardian', 'Brom', { hp: 50, maxHp: 50, atk: 8, def: 4, spd: 1, critChance: 0, critMult: 1.5 });
    state.fighters.push(held);
    state.globalStock['gold'] = 100;
    state.globalStock['wood'] = 10;
    state.globalStock['bread'] = 2;
    const run = new ExpeditionSystem(new GearSystem(), new ProvisionSystem())
      .startExpedition(state, 'forest_short', [held.id], 'normal', null, false, ['bread'])!;
    run.routeId = 'endlose_treppe';
    Object.assign(run, { treppe: { startEtage: 1, besteVorher: 0, geschafft: 7, sicher: { loot: { wood: 5 }, gold: 40 } } });
    Object.assign(state, { treppe: { geoeffnetAm: 1, besteEtage: 7, laeufe: 2, verlauf: [{ etage: 7, zeit: 2 }] } });
    const eintrag = { score: 10, difficulty: 'normal', modifier: null, status: 'retreat' as const, partyClasses: ['guardian'],
      timestamp: 1, day: 1, enemiesKilled: 3, bossesKilled: 0 };
    state.scoreboard = [{ ...eintrag, routeId: 'forest_short' }, { ...eintrag, routeId: 'endlose_treppe' }];
    return state;
  }

  it('Treppen-Stand und Ranglisten-Einträge verschwinden, die Beute vom letzten Rastplatz kommt ins Lager', () => {
    writeRawSave(alterTreppenStand());

    const loaded = new SaveSystem().load()!;

    expect('treppe' in loaded).toBe(false);
    expect(loaded.activeExpedition && 'treppe' in loaded.activeExpedition).toBe(false);
    expect(loaded.scoreboard.map(e => e.routeId)).toEqual(['forest_short']);
    expect(loaded.globalStock['gold']).toBe(140);
    expect(loaded.globalStock['wood']).toBe(15);

    // Wie in main.ts: Die unterbrochene Expedition wird abgebrochen, Proviant zurück, Held frei
    expect(new ExpeditionSystem(new GearSystem(), new ProvisionSystem()).abortExpedition(loaded)).toBe(true);
    expect(loaded.activeExpedition).toBeNull();
    expect(loaded.globalStock['bread']).toBe(2);
    expect(loaded.globalStock['gold']).toBe(140);
  });

  it('nochmals laden bucht die Beute nicht doppelt', () => {
    const saveSystem = new SaveSystem();
    writeRawSave(alterTreppenStand());
    const einmal = saveSystem.load()!;
    saveSystem.save(einmal);

    const zweimal = saveSystem.load()!;

    expect(zweimal.globalStock['gold']).toBe(140);
    expect(zweimal.globalStock['wood']).toBe(15);
  });
});

describe('SaveSystem – Spielstand herunterladen und laden', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    hebeSperreNachLadenAuf(); // jeder Test ist eine frisch geladene Seite
  });
  afterEach(() => nutzeProbespiel(false));

  it('herunterladen und wieder laden ergibt denselben Spielstand', () => {
    const saveSystem = new SaveSystem();
    const state = standMitHelden();
    saveSystem.save(state);
    const datei = saveSystem.spielstandText()!;

    vi.stubGlobal('localStorage', createMemoryStorage());
    saveSystem.save(createNewGameState());
    const ergebnis = saveSystem.schreibeSpielstandText(datei);

    expect(ergebnis).toEqual({ ok: true, zusammenfassung: { tag: 12, stadtstufe: 3, helden: 2, hoechsteHeldenstufe: 4 } });
    expect(saveSystem.load()).toEqual(state);
    // Der bisherige Stand liegt auf dem Platz vor dem Laden
    expect(saveSystem.standVorLaden()?.zusammenfassung.tag).toBe(1);
  });

  it('lehnt kaputtes JSON, fremde Dateien und neuere Versionen mit Grund ab', () => {
    expect(pruefeSpielstandText('{ kaputt')).toEqual({ ok: false, grund: 'Die Datei lässt sich nicht lesen.' });
    expect(pruefeSpielstandText('{"name":"Einkaufsliste","grid":[]}')).toEqual({ ok: false, grund: 'Das ist keine Magic-City-Datei.' });
    expect(pruefeSpielstandText('null')).toEqual({ ok: false, grund: 'Das ist keine Magic-City-Datei.' });
    const neuer = { ...createNewGameState(), saveVersion: 999 };
    expect(pruefeSpielstandText(JSON.stringify(neuer))).toEqual({ ok: false, grund: 'Diese Datei ist von einer neueren Version des Spiels.' });

    // Abgelehnt wird nichts geschrieben
    const saveSystem = new SaveSystem();
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(neuer)).ok).toBe(false);
    expect(saveSystem.hasSave()).toBe(false);
  });

  it('nimmt einen alten Stand (Version 19) an und hebt ihn beim Laden an', () => {
    const alt = standMitHelden();
    alt.saveVersion = 19;
    const saveSystem = new SaveSystem();

    expect(saveSystem.schreibeSpielstandText(JSON.stringify(alt)).ok).toBe(true);
    const geladen = saveSystem.load()!;

    expect(geladen.saveVersion).toBe(23);
    expect(geladen.day).toBe(12);
  });

  it('im Probespiel schreibt Laden unter magic_city_probe und lässt magic_city_save in Ruhe', () => {
    localStorage.setItem(SAVE_KEY, 'richtiger Spielstand');
    nutzeProbespiel();

    expect(new SaveSystem().schreibeSpielstandText(JSON.stringify(standMitHelden())).ok).toBe(true);

    expect(localStorage.getItem(SAVE_KEY)).toBe('richtiger Spielstand');
    expect(JSON.parse(localStorage.getItem('magic_city_probe')!).day).toBe(12);
    expect(spielstandDateiname(12, new Date(2026, 9, 2))).toBe('magic-city-probespiel-12-2026-10-02.json');
    nutzeProbespiel(false);
    expect(spielstandDateiname(12, new Date(2026, 9, 2))).toBe('magic-city-tag-12-2026-10-02.json');
  });

  it('ein alter Stand verliert Unwetter-Pause, Reparatur-Merker und Bau-Zustand', () => {
    const state = createNewGameState();
    state.saveVersion = 19;
    const huette = placeBuilding(state, 'LUMBER_CAMP', 5, 5);
    huette.eventPaused = true;
    const imBau = placeBuilding(state, 'WELL', 10, 10);
    imBau.built = false;
    imBau.buildProgress = 3;
    state.activeEvent = { eventId: 'storm', remainingSec: 30, pausedBuildingId: huette.id };
    const held = createGuildFighter(0, 'guardian', 'Brom', { hp: 50, maxHp: 50, atk: 8, def: 4, spd: 1, critChance: 0, critMult: 1.5 });
    held.gear.mainHand = 'iron_sword';
    const schwertBonus = (f: typeof held) => new GearSystem().getEffectiveStats(f).atk - f.baseStats.atk;
    const vollerBonus = schwertBonus(held);
    held.gearNeedsRepair = true;
    expect(schwertBonus(held)).toBeLessThan(vollerBonus);
    state.fighters.push(held);
    writeRawSave(state);

    const geladen = new SaveSystem().load()!;

    expect(geladen.activeEvent).toBeNull();
    expect(geladen.buildings).toHaveLength(2);
    expect(geladen.buildings.every(b => b.built && !b.eventPaused)).toBe(true);
    expect(geladen.fighters[0].gearNeedsRepair).toBe(false);
    expect(schwertBonus(geladen.fighters[0])).toBe(vollerBonus);
  });
});

describe('SaveSystem – Stand vor dem Laden', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    hebeSperreNachLadenAuf();
  });
  afterEach(() => nutzeProbespiel(false));

  /** Bisheriger Stand von Tag 1, dann eine Datei von Tag 12 geladen und die Seite neu geladen. */
  function dateiGeladen(): SaveSystem {
    const saveSystem = new SaveSystem();
    saveSystem.save(createNewGameState());
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(standMitHelden())).ok).toBe(true);
    hebeSperreNachLadenAuf(); // location.reload()
    return saveSystem;
  }

  it('bleibt, auch wenn das Spiel danach oft speichert und gleich beim Start neue Zettel würfelt', () => {
    const saveSystem = dateiGeladen();
    const state = saveSystem.load()!;
    // main.ts: neue Zettel am Auftragsbrett gleich beim Start speichern, dann alle 60 s, F5, nach Expeditionen
    brettKurz(state, Date.now());
    for (let i = 0; i < 5; i++) expect(saveSystem.save(state)).toBe(true);

    const vorLaden = saveSystem.standVorLaden()!;
    expect(vorLaden.zusammenfassung).toEqual({ tag: 1, stadtstufe: 1, helden: 0, hoechsteHeldenstufe: 0 });
    expect(vorLaden.gesichertAm).toBeGreaterThan(0);
    // Die Sicherung, die save() bei jedem Speichern schreibt, ist längst der geladene Stand
    expect(JSON.parse(localStorage.getItem('magic_city_save_backup')!).day).toBe(12);
  });

  it('nach dem Schreiben speichert und schreibt nichts mehr, bis die Seite neu lädt', () => {
    const saveSystem = new SaveSystem();
    const laufend = createNewGameState();
    saveSystem.save(laufend);
    const datei = JSON.stringify(standMitHelden());
    expect(saveSystem.schreibeSpielstandText(datei).ok).toBe(true);
    const nachDemLaden = plaetze('magic_city');

    laufend.day = 99;
    expect(saveSystem.save(laufend)).toBe(false); // Speichern alle 60 s bis zum Neuladen
    expect(saveSystem.schreibeSpielstandText(datei)).toEqual({ ok: false, grund: 'Das Spiel startet gerade neu.' }); // Doppelklick
    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: false, grund: 'Das Spiel startet gerade neu.' });

    expect(plaetze('magic_city')).toEqual(nachDemLaden);
    expect(saveSystem.standVorLaden()?.zusammenfassung.tag).toBe(1);
  });

  it('Zurückholen tauscht die beiden Stände und lässt sich selbst wieder zurückholen', () => {
    const saveSystem = dateiGeladen();

    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: true });
    expect(saveSystem.save(createNewGameState())).toBe(false); // gesperrt bis zum Neuladen
    hebeSperreNachLadenAuf();
    expect(saveSystem.load()!.day).toBe(1);
    expect(saveSystem.standVorLaden()?.zusammenfassung.tag).toBe(12);

    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: true });
    hebeSperreNachLadenAuf();
    expect(saveSystem.load()!.day).toBe(12);
    expect(saveSystem.standVorLaden()?.zusammenfassung.tag).toBe(1);
  });

  it('Neues Spiel legt den jetzigen Stand weg, leert den Speicherplatz und lässt sich zurückholen', () => {
    const saveSystem = dateiGeladen(); // Tag 12 läuft, Tag 1 liegt «vor dem Laden»
    expect(saveSystem.neuesSpiel()).toEqual({ ok: true });
    expect(saveSystem.save(createNewGameState())).toBe(false); // gesperrt bis zum Neuladen
    expect(saveSystem.neuesSpiel()).toEqual({ ok: false, grund: 'Das Spiel startet gerade neu.' });
    hebeSperreNachLadenAuf();

    expect(saveSystem.load()).toBeNull(); // main.ts legt eine neue Stadt an
    expect(saveSystem.hasBackup()).toBe(false);
    const vorher = saveSystem.standVorLaden()!;
    expect(vorher.zusammenfassung.tag).toBe(12);
    expect(vorher.grund).toBe('neu');

    saveSystem.save(createNewGameState());
    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: true });
    hebeSperreNachLadenAuf();
    expect(saveSystem.load()!.day).toBe(12);
    expect(saveSystem.standVorLaden()).toMatchObject({ grund: 'laden', zusammenfassung: { tag: 1 } });
  });

  it('Neues Spiel ohne gespeicherten Stand legt nichts weg', () => {
    const saveSystem = new SaveSystem();
    expect(saveSystem.neuesSpiel()).toEqual({ ok: true });
    hebeSperreNachLadenAuf();
    expect(saveSystem.load()).toBeNull();
    expect(saveSystem.standVorLaden()).toBeNull();
  });

  it('ohne Stand vor dem Laden gibt es nichts zurückzuholen', () => {
    const saveSystem = new SaveSystem();
    saveSystem.save(createNewGameState());

    expect(saveSystem.standVorLaden()).toBeNull();
    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: false, grund: 'Es gibt keinen Stand vor dem Laden.' });
  });

  it('das Probespiel hat einen eigenen Platz vor dem Laden und lässt den richtigen Spielstand in Ruhe', () => {
    dateiGeladen();
    const richtig = plaetze('magic_city_save');
    expect(Object.keys(richtig).sort()).toEqual(['magic_city_save', 'magic_city_save_vor_laden', 'magic_city_save_vor_laden_zeit']);

    nutzeProbespiel();
    const probe = new SaveSystem();
    probe.save(createNewGameState());
    expect(probe.standVorLaden()).toBeNull();
    expect(probe.schreibeSpielstandText(JSON.stringify(standMitHelden())).ok).toBe(true);
    hebeSperreNachLadenAuf();
    expect(probe.standVorLaden()?.zusammenfassung.tag).toBe(1);
    expect(probe.holeStandVorLadenZurueck().ok).toBe(true);

    expect(plaetze('magic_city_save')).toEqual(richtig);
    expect(JSON.parse(localStorage.getItem('magic_city_probe')!).day).toBe(1);
    expect(JSON.parse(localStorage.getItem('magic_city_probe_vor_laden')!).day).toBe(12);
  });

  it('ist der Speicher voll, bleibt alles, wie es war, und das Spiel speichert weiter', () => {
    const bisher = JSON.stringify({ ...createNewGameState(), day: 5 });
    const aelter = JSON.stringify({ ...createNewGameState(), day: 2 });
    const gross = JSON.stringify({ ...standMitHelden(), polster: 'p'.repeat(3 * bisher.length) });
    vi.stubGlobal('localStorage', createMemoryStorage(bisher.length * 3 + 100));
    localStorage.setItem('magic_city_save', bisher);
    localStorage.setItem('magic_city_save_vor_laden', aelter);
    localStorage.setItem('magic_city_save_vor_laden_zeit', '1000');
    const vorher = plaetze('magic_city');
    const saveSystem = new SaveSystem();

    expect(saveSystem.schreibeSpielstandText(gross)).toEqual({ ok: false, grund: 'Der Browser hat keinen Platz, um den Spielstand zu speichern.' });

    expect(plaetze('magic_city')).toEqual(vorher);
    expect(saveSystem.save(createNewGameState())).toBe(true); // keine Sperre nach einem Fehler
  });
});

describe('pruefeSpielstandText – nur Dateien, mit denen das Spiel auch startet', () => {
  const BESCHAEDIGT = { ok: false, grund: 'Die Datei ist beschädigt.' };
  const KEINE_DATEI = { ok: false, grund: 'Das ist keine Magic-City-Datei.' };

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    hebeSperreNachLadenAuf();
  });

  /** Ein Stand wie frisch heruntergeladen (aktuelle Version), den `aendern` verdirbt. */
  function datei(aendern: (s: Record<string, any>) => void = () => {}): string {
    const saveSystem = new SaveSystem();
    const state = standMitHelden();
    state.buildings[0].vonSelbst = { art: 'vorrat', fuer: 'wood' };
    state.fighters[0].wegBilanz = { schaden: 12 };
    saveSystem.save(state);
    const s = JSON.parse(saveSystem.spielstandText()!);
    localStorage.clear();
    aendern(s);
    return JSON.stringify(s);
  }

  it('ein echter Stand besteht, ohne dass etwas gespeichert wird oder sich die ID-Zähler ändern', () => {
    const text = datei();
    resetBuildingIdCounter(500);
    expect(pruefeSpielstandText(text)).toEqual({ ok: true, zusammenfassung: { tag: 12, stadtstufe: 3, helden: 2, hoechsteHeldenstufe: 4 } });
    expect(localStorage.length).toBe(0);
    expect(createBuildingInstance('WELL', 0, 0).id).toBe(500);
  });

  it('Helden, Gebäude und Bewohner müssen Objekte mit einer Zahl als id sein (sonst startet das Spiel nicht)', () => {
    expect(pruefeSpielstandText(datei(s => { s.fighters = [{}]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters = [null]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings = [null]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].id = '1'; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.citizens = [{ status: 'IDLE' }]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { delete s.fighters[0].gear; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters[0].baseStats = { hp: 5 }; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters[1].level = '7'; }))).toEqual(BESCHAEDIGT);
  });

  it('die neuen Felder (Gildenhaus, Rangliste, Schmiede …) dürfen fehlen, aber nicht falsch geformt sein', () => {
    const neu = ['geschichten', 'bezwungen', 'rangliste', 'schmiede', 'auftragsbrett', 'trophaeen'];
    expect(pruefeSpielstandText(datei(s => {
      for (const feld of neu) delete s[feld];
      delete s.buildings[0].vonSelbst;
      delete s.fighters[0].wegBilanz;
    })).ok).toBe(true);

    const falsch: Record<string, (s: Record<string, any>) => void> = {
      geschichten: s => { s.geschichten = { gelesen: [] }; },
      bezwungen: s => { s.bezwungen = ['forest_short']; },
      rangliste: s => { s.rangliste = { runde: 0 }; },
      schmiede: s => { s.schmiede = { stufen: [3] }; },
      auftragsbrett: s => { s.auftragsbrett = {}; },
      trophaeen: s => { s.trophaeen = { siege: null }; },
      vonSelbst: s => { s.buildings[0].vonSelbst = { art: 'immer', fuer: 'wood' }; },
      wegBilanz: s => { s.fighters[0].wegBilanz = { schaden: 'viel' }; },
    };
    for (const [feld, aendern] of Object.entries(falsch)) {
      expect(pruefeSpielstandText(datei(aendern)), feld).toEqual(BESCHAEDIGT);
    }
  });

  it('das Probe-Laden fängt ab, was erst beim Laden scheitern würde', () => {
    // Fehlt die Arbeiterliste, scheitert loeseHeldenBindungen (main.ts): Das Spiel begänne still von vorn
    expect(pruefeSpielstandText(datei(s => { delete s.buildings[0].assignedWorkerIds; }))).toEqual(BESCHAEDIGT);
    // Eine unterbrochene Expedition ohne Proviant lässt sich beim Start nicht abbrechen
    expect(pruefeSpielstandText(datei(s => { s.activeExpedition = {}; }))).toEqual(BESCHAEDIGT);
    // Unbekannte Gebäude-Art: alte Stände bereinigt migrate, ein aktueller bliebe stehen
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].typeId = 'BANK_V2'; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].typeId = 'BANK_V2'; s.saveVersion = 19; })).ok).toBe(true);
  });

  it('Tag und Version müssen Zahlen sein', () => {
    expect(pruefeSpielstandText(datei(s => { s.day = '12'; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { delete s.day; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei().replace('"day":12', '"day":1e999'))).toEqual(BESCHAEDIGT);
    for (const version of ['23', 'abc', 1.5, -1, true]) {
      expect(pruefeSpielstandText(datei(s => { s.saveVersion = version; })), String(version)).toEqual(KEINE_DATEI);
    }
    // Sehr alte Stände haben keine Version: load() hebt sie an
    expect(pruefeSpielstandText(datei(s => { delete s.saveVersion; })).ok).toBe(true);
  });

  it('Texte mit < > oder " werden abgelehnt, sie würden im Spiel zu HTML', () => {
    const html: Record<string, (s: Record<string, any>) => void> = {
      Tag: s => { s.day = '<img src=x onerror="alert(1)">'; },
      Heldenname: s => { s.fighters[0].name = '<img src=x onerror=alert(1)>Brom'; },
      'Gegenstand im Lager': s => { s.globalStock['x" onmouseover="alert(1)'] = 1; },
      'von selbst für': s => { s.buildings[0].vonSelbst.fuer = 'wood"><b>'; },
      'unbekanntes Feld': s => { s.notiz = '<script>alert(1)</script>'; },
    };
    for (const [wo, aendern] of Object.entries(html)) {
      expect(pruefeSpielstandText(datei(aendern)), wo).toEqual(BESCHAEDIGT);
    }
  });

  it('wirft nie, auch nicht bei seltsamen Dateien', () => {
    for (const text of ['[]', '42', '"text"', '{"grid":[],"buildings":[],"globalStock":[],"citizens":[],"fighters":[]}']) {
      expect(pruefeSpielstandText(text), text).toEqual(KEINE_DATEI);
    }
    expect(pruefeSpielstandText(datei(s => { s.grid = [[{ buildingId: 'a' }]]; }))).toEqual(BESCHAEDIGT);
  });
});
