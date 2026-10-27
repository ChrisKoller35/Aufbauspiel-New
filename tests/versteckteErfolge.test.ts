// ─── Das System schaut zu: versteckte Erfolge ──────────────────
// Echte Läufe wie im Spiel (finishExpedition ohne Truhe), gezählt in finalizeExpeditionProgress;
// dazu der Erfolge-Bildschirm, der bis zum Freischalten nur «???» und den Satz des Systems zeigt.

import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ACHIEVEMENT_DEFS } from '../src/data/achievements';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { merkeHaertegrad } from '../src/systems/Haertegrade';
import { inhaltHtml } from '../src/ui/screens/AchievementsScreen';
import { renderHeader } from '../src/ui/screens/HeaderRenderer';

const STARK = { hp: 99999, maxHp: 99999, atk: 9999, def: 9999, spd: 99, critChance: 0, critMult: 1 };
const VERSTECKT = ACHIEVEMENT_DEFS.filter(d => d.versteckt);
const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

function spielstand(...helden: object[]): GameState {
  const state = createNewGameState();
  state.fighters = helden.map((werte, i) => createGuildFighter('guardian', `Held ${i + 1}`, { ...STARK, ...werte }));
  return state;
}

/** Ein Lauf bis zum Ende (erste Option, Händler übergehen), dann wie finishExpedition */
function lauf(state: GameState, ids: number[], routeId: string, grad = 'normal', rueckzug?: 'sofort' | 'kontrollpunkt') {
  const run = system.startExpedition(state, routeId, ids, grad)!;
  if (rueckzug === 'sofort') system.retreat(run);
  for (let s = 0; s < 500 && run.status === 'exploring'; s++) {
    const step = system.nextStep(run);
    if (step === 'checkpoint') system.resolveCheckpoint(run, rueckzug === 'kontrollpunkt');
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') system.resolveChoice(run, 0);
    else if (step === 'room') system.processCurrentRoom(state);
    else break;
  }
  const bilanz = finalizeExpeditionProgress(state, run, system).newAchievements;
  merkeHaertegrad(state, run);
  state.activeExpedition = null;
  return { run, bilanz };
}

function zeile(id: string): string {
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id)!;
  return `${def.name} – ${def.description}`;
}

const versteckteFrei = (state: GameState): string[] => VERSTECKT.map(d => d.id).filter(id => state.achievements.includes(id));
const ids = (state: GameState): number[] => state.fighters.map(f => f.id);

describe('Das System schaut zu: gezählt am Ende der Expedition', () => {
  test('«Kalte Füsse»: nur ein Rückzug, bevor ein Gegner fiel', () => {
    const state = spielstand({});
    const amKontrollpunkt = lauf(state, ids(state), 'forest_medium', 'normal', 'kontrollpunkt');
    expect(amKontrollpunkt.run.status).toBe('retreat');
    expect(amKontrollpunkt.run.enemiesKilled).toBe(4);
    expect(versteckteFrei(state)).toEqual([]);
    const sofort = lauf(state, ids(state), 'forest_medium', 'normal', 'sofort');
    expect(sofort.bilanz).toContain(zeile('kalte_fuesse'));
    expect(versteckteFrei(state)).toEqual(['kalte_fuesse']);
  });

  test('«Unentschieden»: Rundenlimit im Bossraum, kein «Keine Zeugen»', () => {
    const state = spielstand({ atk: 0 });
    const { run, bilanz } = lauf(state, ids(state), 'forest_medium');
    expect(run).toMatchObject({ status: 'victory', bossesKilled: 0, enemiesKilled: 0 });
    expect(bilanz).toContain(zeile('unentschieden'));
    expect(versteckteFrei(state)).toEqual(['unentschieden']);
  });

  test('«Wörtlich genommen»: nur eine Niederlage auf Albtraum', () => {
    const state = spielstand({ hp: 1, maxHp: 1, atk: 1, def: 0, spd: 1 });
    const normal = lauf(state, ids(state), 'forest_medium');
    expect(normal.run.status).toBe('defeat');
    expect(versteckteFrei(state)).toEqual([]);
    const albtraum = lauf(state, ids(state), 'forest_medium', 'nightmare');
    expect(albtraum.run.status).toBe('defeat');
    expect(albtraum.bilanz).toContain(zeile('woertlich_genommen'));
  });

  test('«Keine Zeugen» und «Ohne Hose»: nur mit besiegtem Boss', () => {
    const state = spielstand({}, {});
    state.fighters.forEach(f => { f.gear.armor = 'leather_armor'; });
    expect(lauf(state, ids(state), 'forest_medium').run.bossesKilled).toBe(1);
    expect(lauf(state, [state.fighters[0].id], 'forest_short').run.status).toBe('victory');
    expect(versteckteFrei(state)).toEqual([]);
    expect(lauf(state, [state.fighters[0].id], 'forest_medium').bilanz).toContain(zeile('keine_zeugen'));
    state.fighters[1].gear.armor = null;
    expect(lauf(state, ids(state), 'forest_medium').bilanz).toContain(zeile('ohne_hose'));
    expect(versteckteFrei(state)).toEqual(['keine_zeugen', 'ohne_hose']);
  });

  test('«Schlafstörung»: drei verschiedene Dungeons auf Albtraum, auch aus älteren Spielständen', () => {
    const state = spielstand({});
    for (const id of ['forest_short', 'forest_short', 'forest_medium']) lauf(state, ids(state), id, 'nightmare');
    expect(state.statistics.albtraum_dungeons).toBe(2);
    expect(lauf(state, ids(state), 'forest_ruins', 'hard').run.status).toBe('victory');
    expect(state.achievements).not.toContain('schlafstoerung');
    // Dieser Lauf zählt, obwohl merkeHaertegrad ihn erst danach einträgt
    expect(lauf(state, ids(state), 'forest_ruins', 'nightmare').bilanz).toContain(zeile('schlafstoerung'));

    const alt = spielstand({});
    alt.haertegrade = { ...state.haertegrade };
    expect(lauf(alt, ids(alt), 'forest_short', 'normal', 'sofort').bilanz).toContain(zeile('schlafstoerung'));
  });
});

describe('Das System schaut zu: der Erfolge-Bildschirm verrät nichts', () => {
  test('gesperrt: 👁️, «???» und der Satz des Systems, oben die Zählung', () => {
    const state = createNewGameState();
    const html = inhaltHtml(state, []);
    expect(html).toContain(`🏅 Freigeschaltet: 0/${ACHIEVEMENT_DEFS.length}`);
    expect(ACHIEVEMENT_DEFS.length).toBe(51);
    expect(html).toContain('👁️ Das System verschweigt noch 6 Erfolge.');
    expect(html).toContain('Das System schaut zu<span class="erf-gruppe-zahl">0/6</span>');
    expect(html.match(/ach-versteckt/g)).toHaveLength(6);
    expect(html.match(/<div class="ach-ico">👁️<\/div>/g)).toHaveLength(6);
    expect(html.match(/<div class="ach-title">\?\?\?<\/div>/g)).toHaveLength(6);
    const kopf = renderHeader(state);
    for (const d of VERSTECKT) {
      expect(html).toContain(`<div class="ach-desc">${d.versteckt}</div>`);
      expect(html).not.toContain(d.name);
      expect(html).not.toContain(d.description);
      expect(html).not.toContain(d.icon);
      expect(kopf).not.toContain(d.name);
    }
  });

  test('freigeschaltet: die Karte wie jede andere, die Zählung läuft herunter', () => {
    const state = createNewGameState();
    state.achievements = ['kalte_fuesse'];
    let html = inhaltHtml(state, []);
    expect(html).toMatch(/ach-unlocked">\s*<div class="ach-ico">🐔<\/div>\s*<div class="ach-info">\s*<div class="ach-title">Kalte Füsse</);
    expect(html).toContain('Das System verschweigt noch 5 Erfolge.');
    expect(html.match(/\?\?\?/g)).toHaveLength(5);

    state.achievements = VERSTECKT.slice(0, 5).map(d => d.id);
    expect(inhaltHtml(state, [])).toContain('Das System verschweigt noch 1 Erfolg.');

    state.achievements = VERSTECKT.map(d => d.id);
    html = inhaltHtml(state, []);
    expect(html).toContain('👁️ Das System verschweigt nichts mehr. Behauptet es.');
    expect(html).not.toContain('???');
  });
});
