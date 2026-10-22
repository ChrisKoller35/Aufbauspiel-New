import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CURRENT_VERSION, SaveSystem, VOR_GILDENSTADT, alterStandVerworfenBeimStart, hebeSperreNachLadenAuf, nutzeProbespiel,
  pruefeSpielstandText, spielstandDateiname,
} from './SaveSystem';
import { createNewGameState, GameState } from '../models/GameState';
import { createBuildingInstance, resetBuildingIdCounter } from '../models/Building';
import { createGuildFighter, resetFighterIdCounter } from '../models/GuildRoster';
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

function bauen(state: GameState, typeId: string) {
  const b = createBuildingInstance(typeId);
  state.buildings.push(b);
  return b;
}

/** Schreibt einen Stand roh auf den Speicherplatz, ohne save() (z. B. mit alter Version). */
function writeRawSave(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

const WERTE = { hp: 50, maxHp: 50, atk: 8, def: 4, spd: 1, critChance: 0, critMult: 1.5 };

/** Stand von Tag 12 mit Schmiede, zwei Helden und Stadtstufe 3, wie save() ihn schreibt (Version 24). */
function standMitHelden(): GameState {
  const state = createNewGameState();
  bauen(state, 'SMITHY');
  const held = createGuildFighter(0, 'guardian', 'Brom', WERTE);
  held.level = 4;
  state.fighters.push(held, createGuildFighter(0, 'ranger', 'Lia', { ...WERTE, hp: 30, maxHp: 30 }));
  state.day = 12;
  state.stadtweg = { stufe: 3, herzsteine: [], gelesen: 0 };
  state.saveVersion = CURRENT_VERSION;
  return state;
}

/** Ein Stand aus der Zeit vor der Gildenstadt: Version 23 mit Bewohnern, Raster und Holz. */
function alterStand(): Record<string, unknown> {
  return {
    ...standMitHelden(), saveVersion: 23, grid: [[null]], citizens: [{ id: 1, status: 'IDLE' }], satisfaction: 50,
    globalStock: { gold: 100, wood: 80, stone: 20 },
  };
}

describe('SaveSystem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.spyOn(console, 'log').mockImplementation(() => {});
    hebeSperreNachLadenAuf();
  });

  it('speichern → laden gibt denselben Stand, mit Version 24', () => {
    const saveSystem = new SaveSystem();
    const state = standMitHelden();
    const schmiede = state.buildings[0];
    schmiede.auftraege = ['RCP_IRON_SWORD'];
    schmiede.tier = 2;
    state.globalStock['iron_scrap'] = 123;
    state.globalStock['arcane_amulet'] = 1;

    expect(saveSystem.save(state)).toBe(true);
    const loaded = saveSystem.load();

    expect(loaded).toEqual(state);
    expect(loaded?.saveVersion).toBe(24);
    expect(alterStandVerworfenBeimStart()).toBe(false);
  });

  it('nach dem Laden bekommen neue Gebäude und Helden IDs nach den höchsten im Stand', () => {
    const saveSystem = new SaveSystem();
    const state = standMitHelden();
    state.buildings[0].id = 7;
    state.fighters[1].id = 42;
    saveSystem.save(state);
    resetBuildingIdCounter(1);
    resetFighterIdCounter(1);

    saveSystem.load();

    expect(createBuildingInstance('HERB_GARDEN').id).toBe(8);
    expect(createGuildFighter(0, 'cleric', 'Neu', WERTE).id).toBe(43);
  });

  it('ein Stand aus der Zeit vor der Gildenstadt (Version 23) lädt wie kein Stand, nichts wird geschrieben', () => {
    const saveSystem = new SaveSystem();
    localStorage.setItem(SAVE_KEY, JSON.stringify(alterStand()));
    const vorher = plaetze('magic_city');

    expect(saveSystem.load()).toBeNull();

    expect(alterStandVerworfenBeimStart()).toBe(true);
    expect(plaetze('magic_city')).toEqual(vorher);
    // main.ts legt eine neue Stadt an; das erste Speichern legt den alten Stand auf die Sicherung
    expect(saveSystem.save(createNewGameState())).toBe(true);
    expect(JSON.parse(localStorage.getItem('magic_city_save_backup')!).saveVersion).toBe(23);
    expect(saveSystem.load()?.day).toBe(1);
  });

  it('ein sehr alter Stand ohne Versionsfeld wird ebenfalls nicht übernommen', () => {
    const { saveVersion: _weg, ...ohneVersion } = alterStand();
    localStorage.setItem(SAVE_KEY, JSON.stringify(ohneVersion));
    expect(new SaveSystem().load()).toBeNull();
    expect(alterStandVerworfenBeimStart()).toBe(true);
  });

  it('fehlt die Liste der erhaltenen Baupläne, legt das Laden sie an', () => {
    const state = standMitHelden();
    delete (state as Partial<GameState>).erhalteneBauplaene;
    writeRawSave(state);
    expect(new SaveSystem().load()?.erhalteneBauplaene).toEqual([]);
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
    expect(pruefeSpielstandText('{"name":"Einkaufsliste","buildings":[]}')).toEqual({ ok: false, grund: 'Das ist keine Magic-City-Datei.' });
    expect(pruefeSpielstandText('null')).toEqual({ ok: false, grund: 'Das ist keine Magic-City-Datei.' });
    const neuer = { ...createNewGameState(), saveVersion: 999 };
    expect(pruefeSpielstandText(JSON.stringify(neuer))).toEqual({ ok: false, grund: 'Diese Datei ist von einer neueren Version des Spiels.' });

    // Abgelehnt wird nichts geschrieben
    const saveSystem = new SaveSystem();
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(neuer)).ok).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('eine Datei aus der Zeit vor der Gildenstadt wird mit einem klaren Satz abgelehnt', () => {
    expect(VOR_GILDENSTADT).toBe('Dieser Spielstand stammt aus der Zeit vor der Gildenstadt und kann nicht geladen werden.');
    expect(pruefeSpielstandText(JSON.stringify(alterStand()))).toEqual({ ok: false, grund: VOR_GILDENSTADT });
    const { saveVersion: _weg, ...ohneVersion } = alterStand();
    expect(pruefeSpielstandText(JSON.stringify(ohneVersion))).toEqual({ ok: false, grund: VOR_GILDENSTADT });

    const saveSystem = new SaveSystem();
    saveSystem.save(createNewGameState());
    const vorher = plaetze('magic_city');
    expect(saveSystem.schreibeSpielstandText(JSON.stringify(alterStand()))).toEqual({ ok: false, grund: VOR_GILDENSTADT });
    expect(plaetze('magic_city')).toEqual(vorher);
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
    expect(localStorage.getItem('magic_city_save_backup')).toBeNull();
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

  it('ein Stand aus der Zeit vor der Gildenstadt auf dem Platz vor dem Laden wird nicht angeboten', () => {
    const saveSystem = new SaveSystem();
    saveSystem.save(createNewGameState());
    localStorage.setItem('magic_city_save_vor_laden', JSON.stringify(alterStand()));
    localStorage.setItem('magic_city_save_vor_laden_zeit', '1000');

    expect(saveSystem.standVorLaden()).toBeNull();
    expect(saveSystem.holeStandVorLadenZurueck()).toEqual({ ok: false, grund: 'Es gibt keinen Stand vor dem Laden.' });
    expect(saveSystem.load()!.day).toBe(1);
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
    state.buildings[0].vonSelbst = { art: 'zulieferung', fuer: 'WAR_MACHINE_WORKSHOP' };
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
    expect(createBuildingInstance('HERB_GARDEN').id).toBe(500);
  });

  it('Helden und Gebäude müssen Objekte mit einer Zahl als id sein (sonst startet das Spiel nicht)', () => {
    expect(pruefeSpielstandText(datei(s => { s.fighters = [{}]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters = [null]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings = [null]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].id = '1'; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].auftraege = [3]; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { delete s.fighters[0].gear; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters[0].baseStats = { hp: 5 }; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { s.fighters[1].level = '7'; }))).toEqual(BESCHAEDIGT);
  });

  it('die neuen Felder (Gildenhaus, Rangliste, Schmiede …) dürfen fehlen, aber nicht falsch geformt sein', () => {
    const neu = ['geschichten', 'bezwungen', 'rangliste', 'schmiede', 'auftragsbrett', 'trophaeen', 'erhalteneBauplaene'];
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
      erhalteneBauplaene: s => { s.erhalteneBauplaene = 'bauplan_schmiede'; },
      vonSelbst: s => { s.buildings[0].vonSelbst = { art: 'immer', fuer: 'iron_sword' }; },
      wegBilanz: s => { s.fighters[0].wegBilanz = { schaden: 'viel' }; },
    };
    for (const [feld, aendern] of Object.entries(falsch)) {
      expect(pruefeSpielstandText(datei(aendern)), feld).toEqual(BESCHAEDIGT);
    }
  });

  it('das Probe-Laden fängt ab, was erst beim Laden scheitern würde', () => {
    // Eine unterbrochene Expedition ohne Proviant lässt sich beim Start nicht abbrechen
    expect(pruefeSpielstandText(datei(s => { s.activeExpedition = {}; }))).toEqual(BESCHAEDIGT);
    // Unbekannte Gebäude-Art: Die städtischen Systeme lesen BUILDING_DEFS[typeId] ungeprüft
    expect(pruefeSpielstandText(datei(s => { s.buildings[0].typeId = 'FARM_GRAIN'; }))).toEqual(BESCHAEDIGT);
  });

  it('Tag und Version müssen Zahlen sein; alles unter Version 24 ist aus der Zeit vor der Gildenstadt', () => {
    expect(pruefeSpielstandText(datei(s => { s.day = '12'; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei(s => { delete s.day; }))).toEqual(BESCHAEDIGT);
    expect(pruefeSpielstandText(datei().replace('"day":12', '"day":1e999'))).toEqual(BESCHAEDIGT);
    for (const version of ['24', 'abc', 1.5, -1, true]) {
      expect(pruefeSpielstandText(datei(s => { s.saveVersion = version; })), String(version)).toEqual(KEINE_DATEI);
    }
    for (const version of [23, 19, 0]) {
      expect(pruefeSpielstandText(datei(s => { s.saveVersion = version; })), String(version)).toEqual({ ok: false, grund: VOR_GILDENSTADT });
    }
    expect(pruefeSpielstandText(datei(s => { delete s.saveVersion; }))).toEqual({ ok: false, grund: VOR_GILDENSTADT });
  });

  it('Texte mit < > oder " werden abgelehnt, sie würden im Spiel zu HTML', () => {
    const html: Record<string, (s: Record<string, any>) => void> = {
      Tag: s => { s.day = '<img src=x onerror="alert(1)">'; },
      Heldenname: s => { s.fighters[0].name = '<img src=x onerror=alert(1)>Brom'; },
      'Gegenstand im Lager': s => { s.globalStock['x" onmouseover="alert(1)'] = 1; },
      'von selbst für': s => { s.buildings[0].vonSelbst.fuer = 'iron_sword"><b>'; },
      'unbekanntes Feld': s => { s.notiz = '<script>alert(1)</script>'; },
    };
    for (const [wo, aendern] of Object.entries(html)) {
      expect(pruefeSpielstandText(datei(aendern)), wo).toEqual(BESCHAEDIGT);
    }
  });

  it('wirft nie, auch nicht bei seltsamen Dateien', () => {
    for (const text of ['[]', '42', '"text"', '{"buildings":[],"globalStock":[],"fighters":[]}']) {
      expect(pruefeSpielstandText(text), text).toEqual(KEINE_DATEI);
    }
    expect(pruefeSpielstandText(datei(s => { s.scoreboard = [{ routeId: 7 }]; }))).toEqual(BESCHAEDIGT);
  });
});
