import { describe, test, expect } from 'vitest';
import { createNewGameState, GameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionRun } from '../src/models/ExpeditionRun';
import { Auftrag, AuftragsArt } from '../src/models/AuftragsbrettStand';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { finalizeExpeditionProgress } from '../src/systems/ExpeditionFinalizer';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { createBuildingInstance } from '../src/models/Building';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../src/data/routes';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ITEM_DEFS } from '../src/data/items';
import { setFuerRoute, setTeilIds } from '../src/data/dungeonSets';
import {
  AUFTRAGGEBER, AUFTRAGS_VORLAGEN, EINLOESE_ANGEBOTE, FERNE_DUNGEONS, GOLD_ANTEIL, LIEFER_WAREN, MATERIAL_PREIS,
  SAAL_EINLEITUNG, SAAL_KAPITEL, SAAL_SCHLUSS, SAAL_SCHLUSS_SIEGEL, SIEGEL_JE_ART, SPLITTER_MENGE, SPLITTER_PREIS, TAGESBONUS_SIEGEL,
  setTeilPreis,
} from '../src/data/auftragsbrett';
import {
  auftraegeFuerDungeon, auftraegeNachExpedition, brettGesehen, brettKurz, brettStand, einloesbareMaterialien, einloesbareSets,
  goldJeLauf, istSpielbar, kannLiefern, kapitelBelohnungVon, kapitelText, laufendesKapitel, lieferbareWaren, lieferGold, liefern,
  materialEinloesen, saalEinleitung, saalKapitel, setTeilEinloesen, spielbareDungeons, splitterEinloesen, tagVon, tauschen, tauschUebrig,
  zettelText,
} from '../src/systems/Auftragsbrett';
import { bossTrophaeen, gildenbuch, saalGlanz, setSammlung, trophaeenStand } from '../src/systems/Trophaeensaal';
import { bezwungeneDungeons } from '../src/systems/Bezwungen';
import { materialJeSieg } from '../src/systems/Schmiede';
import { EINSCHMELZEN_GRUNDMENGEN } from '../src/data/schmiede';
import { auftragsZeilen } from '../src/ui/components/AuftragsBilanzAnzeige';

/** Mittwoch, 21. Oktober 2026, 12:00 (Ortszeit) */
const MITTAG = new Date(2026, 9, 21, 12, 0).getTime();
const TAG = 86_400_000;

/** Neues Spiel wie im Browser; mit 'probe' oder 'sterne' wie ?probe und ?probe=sterne */
function spielstand(art: 'neu' | 'probe' | 'sterne' = 'neu', samen = 12345): GameState {
  const state = createNewGameState();
  state.rngSeed = samen;
  placeStartingLayout(state);
  if (art !== 'neu') richteProbespielEin(state, art === 'sterne' ? 'sterne' : 'neu');
  return state;
}

/** Eine beendete Expedition, so weit Brett und Saal sie lesen */
function lauf(routeId: string, opt: {
  status?: ExpeditionRun['status']; gefallen?: boolean; kills?: Record<string, number>; setTeil?: string | null;
  /** Die Wiedergeburt eines Helden: 'verbraucht' (er fiel und stand wieder auf) oder 'bereit' (ungenutzt) */
  wiedergeburt?: 'verbraucht' | 'bereit';
} = {}): ExpeditionRun {
  const status = opt.status ?? 'victory';
  const mitBoss = !!ROUTE_DEFS[routeId].bossId;
  const enemies = Object.entries(opt.kills ?? {}).flatMap(([defId, n]) => Array.from({ length: n }, () => ({ defId, hp: 0 })));
  const rooms = [
    { index: 0, type: 'combat', completed: true, enemies: [...enemies, { defId: 'lebt_noch', hp: 30 }] },
    ...(mitBoss ? [{ index: 1, type: 'boss', completed: status === 'victory', enemies: [] }] : []),
  ];
  const effekte = opt.wiedergeburt ? [{ id: 'revive', usesLeft: opt.wiedergeburt === 'verbraucht' ? 0 : 1 }] : [];
  return {
    routeId, status, rooms, party: [{ id: 1, hp: 50, specialEffects: effekte }, { id: 2, hp: opt.gefallen ? 0 : 40 }],
    bossesKilled: mitBoss && status === 'victory' ? 1 : 0, setTeil: opt.setTeil ?? null, setTeilExtra: null,
  } as unknown as ExpeditionRun;
}

/** Ein Zettel von Hand, mit fester Belohnung */
function zettel(art: AuftragsArt, routeId: string, ziel = 1, extra: Partial<Auftrag> = {}): Auftrag {
  return {
    art, vorlage: AUFTRAGS_VORLAGEN.find(v => v.art === art)?.id ?? '', routeId, ziel, stand: 0, fertig: false,
    belohnung: { siegel: 2, gold: 100, dinge: { mat_glutkern: 5 } }, ...extra,
  };
}

/** Eine Gegnerart, die in diesem Dungeon mindestens zweimal kommt (ohne Boss) */
function rudel(routeId: string): string {
  const anzahl: Record<string, number> = {};
  for (const enc of ROUTE_DEFS[routeId].encounters) {
    for (const id of enc.enemies ?? []) if (!ENEMY_DEFS[id]?.isBoss) anzahl[id] = (anzahl[id] ?? 0) + 1;
  }
  return Object.entries(anzahl).find(([, n]) => n >= 2)![0];
}

describe('Auftragsbrett: Texte und Daten', () => {
  test('jeder Boss-Dungeon der Karte hat ein Kapitel der Kette, von unten nach oben', () => {
    const bossRouten = DUNGEON_GRAPH.filter(n => ROUTE_DEFS[n.routeId]?.bossId);
    for (const n of bossRouten) expect(SAAL_KAPITEL.some(k => k.routeId === n.routeId), n.routeId).toBe(true);
    expect(new Set(SAAL_KAPITEL.map(k => k.routeId)).size).toBe(SAAL_KAPITEL.length);
    const kette = saalKapitel();
    expect(kette).toHaveLength(bossRouten.length);
    expect(kette.map(k => k.routeId)).toEqual([...bossRouten].sort((a, b) => b.y - a.y).map(n => n.routeId));
    expect(kette[0].routeId).toBe('forest_medium');
    for (const k of kette) {
      expect(k.ziel, k.routeId).toBeGreaterThan(0);
      if (k.art === 'set') expect(setFuerRoute(k.routeId), k.routeId).toBeDefined();
    }
    expect(saalEinleitung()).toContain('Sechzehn leere Sockel');
  });

  test('Auftraggeber, Vorlagen und Waren passen zusammen', () => {
    for (const v of AUFTRAGS_VORLAGEN) expect(AUFTRAGGEBER[v.von], v.id).toBeDefined();
    expect(new Set(AUFTRAGS_VORLAGEN.map(v => v.id)).size).toBe(AUFTRAGS_VORLAGEN.length);
    for (const art of ['sieg', 'makellos', 'jagd', 'set'] as const) {
      expect(AUFTRAGS_VORLAGEN.filter(v => v.art === art).length, art).toBeGreaterThanOrEqual(2);
    }
    for (const w of LIEFER_WAREN) {
      expect(ITEM_DEFS[w.itemId], w.itemId).toBeDefined();
      expect(AUFTRAGGEBER[w.von], w.itemId).toBeDefined();
      expect(w.menge).toBeGreaterThan(0);
    }
  });

  test('Schweizer Schreibweise, und jeder Zettel ist ganz ausgefüllt', () => {
    const texte = [
      SAAL_EINLEITUNG, SAAL_SCHLUSS,
      ...Object.values(AUFTRAGGEBER).map(a => a.name),
      ...AUFTRAGS_VORLAGEN.flatMap(v => [v.titel, v.text]),
      ...LIEFER_WAREN.flatMap(w => [w.titel, w.text]),
      ...SAAL_KAPITEL.flatMap(k => [k.prunkstueck, k.schild, k.text, k.vorSieg ?? '']),
      ...EINLOESE_ANGEBOTE.flatMap(a => [a.titel, a.text]),
    ];
    for (const t of texte) expect(t, t).not.toMatch(/ß/);
    for (const v of AUFTRAGS_VORLAGEN) {
      for (const n of DUNGEON_GRAPH) {
        if (v.art === 'set' && !setFuerRoute(n.routeId)) continue;
        const gegnerId = v.art === 'jagd' ? Object.keys(ENEMY_DEFS)[0] : undefined;
        const t = zettelText(zettel(v.art, n.routeId, 2, { vorlage: v.id, gegnerId }));
        for (const teil of [t.titel, t.text, t.ziel]) expect(teil, `${v.id} ${n.routeId}: ${teil}`).not.toMatch(/[{}]|undefined/);
      }
    }
    for (const w of LIEFER_WAREN) {
      const t = zettelText(zettel('lieferung', '', w.menge, { vorlage: `ware_${w.itemId}`, itemId: w.itemId }));
      expect(t.titel).toBe(w.titel);
      expect(t.ziel).toBe(`Gebt ${w.menge}× ${ITEM_DEFS[w.itemId].name} am Brett ab`);
    }
  });

  test('Karawane und Grabung nur, wo man hinkommt; jede Art passt trotzdem in jeden Dungeon', () => {
    for (const id of FERNE_DUNGEONS) expect(ROUTE_DEFS[id], id).toBeDefined();
    for (const n of DUNGEON_GRAPH) {
      for (const art of ['sieg', 'makellos', 'jagd', 'set'] as const) {
        const passend = AUFTRAGS_VORLAGEN.filter(v => v.art === art && !v.nichtIn?.includes(n.routeId));
        expect(passend.length, `${art} ${n.routeId}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('Kapitel vor dem ersten Sieg: der Text verrät nichts, was erst der Sieg erzählt', () => {
    const neu = spielstand('neu');
    const probe = spielstand('probe');
    const bezwungen = bezwungeneDungeons(probe);
    for (const k of SAAL_KAPITEL) {
      expect(kapitelText(neu, k), k.routeId).toBe(k.vorSieg ?? k.text);
      expect(kapitelText(probe, k), k.routeId).toBe(k.routeId in bezwungen ? k.text : (k.vorSieg ?? k.text));
      // Den Namen des Ritters in der Krypta erfährt die Gilde erst nach dem Sieg
      for (const t of [k.prunkstueck, k.schild, k.vorSieg ?? (k.routeId === 'ruins_crypts' ? k.text : '')]) expect(t).not.toMatch(/Aldric/);
    }
    const golem = SAAL_KAPITEL.find(k => k.routeId === 'cave_deep')!;
    expect(golem.vorSieg).toBeDefined();
    expect(kapitelText(neu, golem)).not.toContain('Dorfplatz, auf den Sockel');
  });
});

describe('Auftragsbrett: Zettel des Tages', () => {
  test('drei Zettel, fest aus Samen und Tag; Neuladen würfelt nichts neu', () => {
    const a = spielstand('probe');
    const b = spielstand('probe');
    expect(brettStand(a, MITTAG).auftraege).toHaveLength(3);
    expect(brettStand(a, MITTAG).auftraege).toEqual(brettStand(b, MITTAG).auftraege);
    const geladen = JSON.parse(JSON.stringify(a)) as GameState;
    expect(brettStand(geladen, MITTAG + 3_600_000)).toEqual(brettStand(a, MITTAG + 3_600_000));
  });

  test('ab Mitternacht neue Zettel, Tausch und Bonus wieder frei; eine zurückgestellte Uhr ändert nichts', () => {
    const state = spielstand('probe');
    const heute = brettStand(state, MITTAG);
    heute.getauscht = 1;
    heute.tagesbonus = true;
    const alteZettel = JSON.stringify(heute.auftraege);

    // Kurz vor Mitternacht noch derselbe Tag
    expect(brettStand(state, tagVon(MITTAG).ende - 1).tag.id).toBe('2026-10-21');
    const morgen = brettStand(state, MITTAG + TAG);
    expect(morgen.tag.id).toBe('2026-10-22');
    expect(morgen.getauscht).toBe(0);
    expect(morgen.tagesbonus).toBe(false);
    expect(JSON.stringify(morgen.auftraege)).not.toBe(alteZettel);

    const zurueck = brettStand(state, MITTAG);
    expect(zurueck.tag.id).toBe('2026-10-22');
  });

  test('gültige, abwechslungsreiche Zettel in 600 Spielständen', () => {
    const arten = new Set<string>();
    for (const art of ['neu', 'probe', 'sterne'] as const) {
      for (let samen = 1; samen <= 200; samen++) {
        const state = spielstand(art, samen);
        const spielbar = spielbareDungeons(state);
        const zettel = brettStand(state, MITTAG).auftraege;
        expect(zettel).toHaveLength(3);
        expect(spielbar.slice(0, 3)).toContain(zettel[0].routeId);
        const dungeonZettel = zettel.filter(z => z.art !== 'lieferung');
        expect(new Set(dungeonZettel.map(z => `${z.art}/${z.routeId}`)).size).toBe(dungeonZettel.length);
        const jagd = zettel.filter(z => z.art === 'jagd').map(z => z.gegnerId);
        expect(new Set(jagd).size).toBe(jagd.length);
        for (const z of zettel) {
          arten.add(z.art);
          expect(z.belohnung.siegel).toBeGreaterThan(0);
          expect(z.belohnung.gold).toBeGreaterThanOrEqual(5);
          if (z.art === 'lieferung') {
            expect(lieferbareWaren(state).map(w => w.itemId)).toContain(z.itemId);
            continue;
          }
          expect(spielbar).toContain(z.routeId);
          expect(AUFTRAGS_VORLAGEN.find(v => v.id === z.vorlage)?.nichtIn ?? [], `${z.vorlage} ${z.routeId}`).not.toContain(z.routeId);
          if (z.art === 'set') expect(setFuerRoute(z.routeId)).toBeDefined();
          if (z.art === 'jagd') {
            expect(ENEMY_DEFS[z.gegnerId!]?.isBoss).toBeFalsy();
            expect(z.ziel).toBeGreaterThanOrEqual(4);
            expect(z.ziel).toBeLessThanOrEqual(16);
          }
        }
      }
    }
    expect([...arten].sort()).toEqual(['jagd', 'lieferung', 'makellos', 'set', 'sieg']);
  });

  test('eine Expedition über Mitternacht zählt für die Zettel vom Aufbruch, danach hängen neue', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('sieg', 'volcano_core'), zettel('sieg', 'ash_wastes')];
    const nachMitternacht = tagVon(MITTAG).ende + 600_000;
    const bilanz = auftraegeNachExpedition(state, lauf('volcano_core'), nachMitternacht);
    expect(bilanz.meldungen[0]).toMatchObject({ fertig: true });
    expect(stand.siegel).toBe(2);
    expect(state.auftragsbrett!.tag.id).toBe('2026-10-21');
    expect(brettStand(state, nachMitternacht).tag.id).toBe('2026-10-22');
  });

  test('Tauschen: einmal am Tag, dann hängt ein anderer Zettel', () => {
    const state = spielstand('sterne');
    const stand = brettStand(state, MITTAG);
    const alt = stand.auftraege[1];
    expect(tauschUebrig(stand)).toBe(1);
    const neu = tauschen(state, 1, MITTAG)!;
    expect(neu).toBeTruthy();
    expect(stand.auftraege[1]).toBe(neu);
    expect(`${neu.vorlage}/${neu.routeId}/${neu.gegnerId}`).not.toBe(`${alt.vorlage}/${alt.routeId}/${alt.gegnerId}`);
    expect(tauschUebrig(stand)).toBe(0);
    expect(tauschen(state, 2, MITTAG)).toBeNull();

    // Am nächsten Tag wieder frei, aber nicht für einen erledigten Zettel
    const morgen = brettStand(state, MITTAG + TAG);
    morgen.auftraege[0].fertig = true;
    expect(tauschen(state, 0, MITTAG + TAG)).toBeNull();
    expect(tauschen(state, 1, MITTAG + TAG)).toBeTruthy();
  });

  test('Hauptmenü: neue Zettel, bis jemand das Brett anschaut', () => {
    const state = spielstand('probe');
    expect(brettKurz(state, MITTAG).neu).toBe(true);
    brettGesehen(state, MITTAG);
    expect(brettKurz(state, MITTAG).neu).toBe(false);
    expect(brettKurz(state, MITTAG + TAG).neu).toBe(true);
  });
});

describe('Auftragsbrett: Fortschritt nach der Expedition', () => {
  test('Sieg und makelloser Sieg: ein Lauf erledigt beide und zahlt aus', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('sieg', 'volcano_core'), zettel('makellos', 'volcano_core'), zettel('sieg', 'drachenhort')];
    const gold = state.globalStock.gold ?? 0;
    const glut = state.globalStock.mat_glutkern ?? 0;

    const bilanz = auftraegeNachExpedition(state, lauf('volcano_core'), MITTAG);
    expect(bilanz.meldungen.filter(m => m.fertig)).toHaveLength(2);
    expect(stand.auftraege.map(a => a.fertig)).toEqual([true, true, false]);
    expect(stand.siegel).toBe(4);
    expect(stand.erledigt).toBe(2);
    expect(state.globalStock.gold).toBe(gold + 200);
    expect(state.globalStock.mat_glutkern).toBe(glut + 10);
    expect(bilanz.tagesbonus).toBe(0);
  });

  test('makellos zählt nur, wenn kein Held fällt; eine Niederlage zählt nicht als Sieg', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('sieg', 'volcano_core'), zettel('makellos', 'volcano_core')];
    auftraegeNachExpedition(state, lauf('volcano_core', { gefallen: true }), MITTAG);
    expect(stand.auftraege.map(a => a.fertig)).toEqual([true, false]);
    auftraegeNachExpedition(state, lauf('volcano_core', { status: 'defeat' }), MITTAG);
    expect(stand.auftraege[1].fertig).toBe(false);
    // Wer fiel und dank «Wiedergeburt» wieder aufstand, ist trotzdem gefallen
    auftraegeNachExpedition(state, lauf('volcano_core', { wiedergeburt: 'verbraucht' }), MITTAG);
    expect(stand.auftraege[1].fertig).toBe(false);
    auftraegeNachExpedition(state, lauf('volcano_core', { wiedergeburt: 'bereit' }), MITTAG);
    expect(stand.auftraege[1].fertig).toBe(true);
  });

  test('Jagd zählt jeden besiegten Gegner der Art, auch bei Rückzug, bis zum Ziel', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    const gegner = rudel('volcano_core');
    stand.auftraege = [zettel('jagd', 'volcano_core', 8, { gegnerId: gegner })];
    const erste = auftraegeNachExpedition(state, lauf('ash_wastes', { status: 'retreat', kills: { [gegner]: 3, anderer: 4 } }), MITTAG);
    expect(erste.meldungen).toEqual([expect.objectContaining({ stand: 3, ziel: 8, fertig: false })]);
    auftraegeNachExpedition(state, lauf('volcano_core', { kills: { [gegner]: 9 } }), MITTAG);
    expect(stand.auftraege[0]).toMatchObject({ stand: 8, fertig: true });
    // Ein erledigter Zettel zählt nicht weiter und zahlt nicht zweimal
    const siegel = stand.siegel;
    expect(auftraegeNachExpedition(state, lauf('volcano_core', { kills: { [gegner]: 5 } }), MITTAG).meldungen).toHaveLength(0);
    expect(stand.siegel).toBe(siegel);
  });

  test('Set-Zettel: ein gefundenes Teil aus dem Set des Dungeons', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    const set = setFuerRoute('volcano_core')!;
    stand.auftraege = [zettel('set', 'volcano_core')];
    auftraegeNachExpedition(state, lauf('volcano_core', { setTeil: null }), MITTAG);
    expect(stand.auftraege[0].fertig).toBe(false);
    auftraegeNachExpedition(state, lauf('drachenhort', { setTeil: setTeilIds(set)[0] }), MITTAG);
    expect(stand.auftraege[0].fertig).toBe(false);
    auftraegeNachExpedition(state, lauf('volcano_core', { setTeil: setTeilIds(set)[1] }), MITTAG);
    expect(stand.auftraege[0].fertig).toBe(true);
  });

  test('Tagesbonus, sobald alle drei erledigt sind, einmal am Tag', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('sieg', 'volcano_core'), zettel('makellos', 'volcano_core'), zettel('sieg', 'ash_wastes')];
    expect(auftraegeNachExpedition(state, lauf('volcano_core'), MITTAG).tagesbonus).toBe(0);
    const bilanz = auftraegeNachExpedition(state, lauf('ash_wastes'), MITTAG);
    expect(bilanz.tagesbonus).toBe(TAGESBONUS_SIEGEL);
    expect(stand.siegel).toBe(6 + TAGESBONUS_SIEGEL);
    expect(auftraegeNachExpedition(state, lauf('ash_wastes'), MITTAG).tagesbonus).toBe(0);
    expect(stand.siegel).toBe(6 + TAGESBONUS_SIEGEL);
  });

  test('Lieferung: abgeben nur mit genug Ware im Lager, die Ware geht weg', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('lieferung', '', 3, { vorlage: 'ware_healing_potion', itemId: 'healing_potion' })];
    state.globalStock.healing_potion = 2;
    expect(kannLiefern(state, stand.auftraege[0])).toBe(false);
    expect(liefern(state, 0, MITTAG)).toBeNull();
    state.globalStock.healing_potion = 5;
    expect(brettKurz(state, MITTAG).abgeben).toBe(true);
    const gold = state.globalStock.gold ?? 0;
    const ergebnis = liefern(state, 0, MITTAG)!;
    expect(ergebnis.meldung.fertig).toBe(true);
    expect(ergebnis.tagesbonus).toBe(TAGESBONUS_SIEGEL);
    expect(state.globalStock.healing_potion).toBe(2);
    expect(state.globalStock.gold).toBe(gold + 100);
    expect(liefern(state, 0, MITTAG)).toBeNull();
    expect(brettKurz(state, MITTAG).abgeben).toBe(false);
  });

  test('Lieferung: fester Lohn je Ware, mehr als ein Zettel für den leichtesten Dungeon', () => {
    const erwartet: Record<string, number> = { healing_potion: 45, power_bread: 40, iron_sword: 60, iron_shield: 60, leather_armor: 50 };
    expect(LIEFER_WAREN.map(w => w.itemId).sort()).toEqual(Object.keys(erwartet).sort());
    const leichtesterDungeon = Math.min(...DUNGEON_GRAPH.map(n => Math.max(5, Math.round(goldJeLauf(n.routeId) * GOLD_ANTEIL / 5) * 5)));
    for (const w of LIEFER_WAREN) {
      expect(lieferGold(w.itemId), w.itemId).toBe(erwartet[w.itemId]);
      expect(w.gold, w.itemId).toBe(erwartet[w.itemId]);
      // Nicht langweilig: so viele Siegel wie ein Sieg, mehr Gold als ein Zettel für den leichtesten Dungeon
      expect(SIEGEL_JE_ART.lieferung).toBe(SIEGEL_JE_ART.sieg);
      expect(w.gold, w.itemId).toBeGreaterThan(leichtesterDungeon);
    }
    expect(lieferGold('steel_sword')).toBe(0);
  });

  test('Lieferung am Brett: das Gold hängt an der Ware, nicht am höchsten Dungeon', () => {
    const gefunden: Record<string, Set<number>> = {};
    const ebenen = new Set<number>();
    for (const art of ['probe', 'sterne'] as const) {
      for (let samen = 1; samen <= 120; samen++) {
        const state = spielstand(art, samen);
        ebenen.add(ROUTE_DEFS[spielbareDungeons(state)[0]].tier);
        for (const z of brettStand(state, MITTAG).auftraege.filter(a => a.art === 'lieferung')) {
          expect(z.belohnung.gold, z.itemId).toBe(lieferGold(z.itemId!));
          expect(z.belohnung.dinge).toEqual({});
          (gefunden[z.itemId!] ??= new Set()).add(z.belohnung.gold);
        }
      }
    }
    expect(ebenen.size).toBeGreaterThan(1);
    expect(Object.keys(gefunden).length).toBeGreaterThan(1);
    for (const [ware, gold] of Object.entries(gefunden)) expect(gold.size, ware).toBe(1);
  });

  test('Lieferung: nur Waren, die eine stehende Werkstatt herstellt oder die schon im Lager liegen', () => {
    const state = spielstand('neu');
    expect(lieferbareWaren(state)).toEqual([]); // 2 Heiltränke im Lager, der Zettel will 3; keine Werkstatt steht
    state.globalStock.healing_potion = 3;
    expect(lieferbareWaren(state).map(w => w.itemId)).toEqual(['healing_potion']);
    state.buildings.push(createBuildingInstance('SMITHY'));
    expect(lieferbareWaren(state).map(w => w.itemId).sort()).toEqual(['healing_potion', 'iron_shield', 'iron_sword', 'leather_armor']);
    state.globalStock.healing_potion = 0;
    state.buildings.push(createBuildingInstance('HERB_GARDEN'));
    expect(lieferbareWaren(state).map(w => w.itemId).sort()).toEqual(LIEFER_WAREN.map(w => w.itemId).sort());
    // Ohne lieferbare Ware hängt am dritten Platz ein Dungeon-Zettel
    const ohne = spielstand('neu');
    expect(brettStand(ohne, MITTAG).auftraege.every(a => a.art !== 'lieferung' && Number.isFinite(a.belohnung.gold))).toBe(true);
  });

  test('Expeditionsliste und Karte: welche Zettel in einem Dungeon zählen', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    const gegner = rudel('volcano_core');
    stand.auftraege = [zettel('sieg', 'ash_wastes'), zettel('jagd', 'volcano_core', 6, { gegnerId: gegner }), zettel('makellos', 'drachenhort')];
    const titel = (id: string) => AUFTRAGS_VORLAGEN.find(v => v.id === id)!.titel;
    expect(auftraegeFuerDungeon(state, 'ash_wastes', MITTAG)).toContain(titel(stand.auftraege[0].vorlage));
    expect(auftraegeFuerDungeon(state, 'volcano_core', MITTAG)).toEqual([titel(stand.auftraege[1].vorlage)]);
    expect(auftraegeFuerDungeon(state, 'drachenhort', MITTAG)).toEqual([titel(stand.auftraege[2].vorlage)]);
    expect(auftraegeFuerDungeon(state, 'forest_short', MITTAG)).toEqual([]);
    // Das laufende Kapitel der Kette zählt im Tiefwald
    expect(auftraegeFuerDungeon(state, 'forest_medium', MITTAG)).toEqual(['Der Saal der Gilde (Ein Zweig des Uralten)']);
    // Eine Jagd steht nicht bei einem Dungeon, in den die Gilde noch nicht kann
    expect(istSpielbar(state, 'sternenschlund')).toBe(false);
    stand.auftraege = [zettel('jagd', 'volcano_core', 6, { gegnerId: rudel('sternenschlund') })];
    expect(auftraegeFuerDungeon(state, 'sternenschlund', MITTAG)).toEqual([]);
  });
});

describe('Kette: Der Saal der Gilde', () => {
  test('ein Kapitel nach dem anderen, der Stand gehört nur seinem Kapitel', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    expect(laufendesKapitel(stand)?.routeId).toBe('forest_medium');
    // Siege anderswo zählen nicht
    expect(auftraegeNachExpedition(state, lauf('cave_deep'), MITTAG).meldungen.filter(m => m.titel.startsWith('Der Saal'))).toHaveLength(0);
    const eins = auftraegeNachExpedition(state, lauf('forest_medium'), MITTAG).meldungen.find(m => m.titel.startsWith('Der Saal'))!;
    expect(eins).toMatchObject({ stand: 1, ziel: 2, fertig: false });
    const zwei = auftraegeNachExpedition(state, lauf('forest_medium'), MITTAG).meldungen.find(m => m.titel.startsWith('Der Saal'))!;
    expect(zwei).toMatchObject({ stand: 2, fertig: true, prunkstueck: 'Ein Zweig des Uralten' });
    expect(zwei.belohnung!.siegel).toBe(3 + Math.ceil(ROUTE_DEFS.forest_medium.tier / 2));
    expect(zwei.belohnung!.dinge).toEqual({ [materialJeSieg('forest_medium')!.material.id]: materialJeSieg('forest_medium')!.menge * 2 });
    expect(stand.kette).toMatchObject({ routeId: 'cave_deep', stand: 0, fertig: ['forest_medium'] });
    // Kapitel 2 verlangt einen Sieg, ohne dass ein Held fällt
    auftraegeNachExpedition(state, lauf('cave_deep', { gefallen: true }), MITTAG);
    expect(stand.kette.stand).toBe(0);
  });

  test('das letzte Prunkstück: der Saal ist voll, dazu Bonus-Siegel', () => {
    const state = spielstand('sterne');
    const stand = brettStand(state, MITTAG);
    const alle = saalKapitel();
    stand.kette.fertig = alle.slice(0, -1).map(k => k.routeId);
    const letztes = alle[alle.length - 1];
    expect(brettStand(state, MITTAG).kette.routeId).toBe(letztes.routeId);
    stand.kette.stand = letztes.ziel - 1;
    const angezeigt = kapitelBelohnungVon(stand, letztes);
    expect(kapitelBelohnungVon(stand, alle[0]).siegel).toBe(3 + Math.ceil(ROUTE_DEFS[alle[0].routeId].tier / 2));
    // Das letzte Kapitel (Morgentor) verlangt ein Teil aus Sunnas Morgengabe, kein zweites Mal den Sieg
    expect(letztes).toMatchObject({ routeId: 'morgentor', art: 'set', ziel: 1 });
    const bilanz = auftraegeNachExpedition(state, lauf(letztes.routeId, { setTeil: setTeilIds(setFuerRoute(letztes.routeId)!)[0] }), MITTAG);
    expect(bilanz.saalVoll).toBe(true);
    const meldung = bilanz.meldungen.find(m => m.prunkstueck)!;
    expect(meldung.belohnung!.siegel).toBe(3 + Math.ceil(ROUTE_DEFS[letztes.routeId].tier / 2) + SAAL_SCHLUSS_SIEGEL);
    // Am Brett stand vorher schon dieselbe Belohnung, mit den Siegeln für den vollen Saal
    expect(angezeigt).toEqual(meldung.belohnung);
    expect(laufendesKapitel(stand)).toBeNull();
    expect(auftragsZeilen(bilanz, false).some(z => z.text.includes('Alle Sockel'))).toBe(true);
  });
});

describe('Siegel einlösen', () => {
  test('Set-Teile nur aus bezwungenen Dungeons, der Preis steigt mit der Ebene', () => {
    expect(einloesbareSets(spielstand('neu'))).toHaveLength(0);
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    const sets = einloesbareSets(state);
    expect(sets.map(s => s.routeId)).toContain('volcano_core');
    expect(sets.map(s => s.routeId)).not.toContain('sternenschlund');
    const teil = setTeilIds(setFuerRoute('volcano_core')!)[0];
    const preis = setTeilPreis(ROUTE_DEFS.volcano_core.tier);
    expect(setTeilPreis(1)).toBeLessThan(preis);
    stand.siegel = preis - 1;
    expect(setTeilEinloesen(state, teil, MITTAG)).toBe(false);
    stand.siegel = preis + 1;
    const vorher = state.globalStock[teil] ?? 0;
    expect(setTeilEinloesen(state, teil, MITTAG)).toBe(true);
    expect(state.globalStock[teil]).toBe(vorher + 1);
    expect(stand.siegel).toBe(1);
    // Aus einem Dungeon, den die Gilde noch nicht bezwungen hat: nichts
    stand.siegel = 99;
    expect(setTeilEinloesen(state, setTeilIds(setFuerRoute('sternenschlund')!)[0], MITTAG)).toBe(false);
    expect(stand.siegel).toBe(99);
  });

  test('Material: so viel wie ein Sieg im höchsten bezwungenen Dungeon des Gebiets; Kristallsplitter', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    const merker = bezwungeneDungeons(state);
    const angebote = einloesbareMaterialien(state);
    expect(angebote.length).toBeGreaterThan(0);
    for (const a of angebote) {
      const hoechste = Math.max(...a.material.routen.filter(id => id in merker).map(id => materialJeSieg(id)!.menge));
      expect(a.menge, a.material.id).toBe(hoechste);
    }
    stand.siegel = MATERIAL_PREIS + SPLITTER_PREIS;
    const m = angebote[0];
    const vorher = state.globalStock[m.material.id] ?? 0;
    expect(materialEinloesen(state, m.material.id, MITTAG)).toBe(m.menge);
    expect(state.globalStock[m.material.id]).toBe(vorher + m.menge);
    const splitter = state.globalStock.crystal_shard ?? 0;
    expect(splitterEinloesen(state, MITTAG)).toBe(true);
    expect(state.globalStock.crystal_shard).toBe(splitter + SPLITTER_MENGE);
    expect(stand.siegel).toBe(0);
    expect(splitterEinloesen(state, MITTAG)).toBe(false);
    expect(materialEinloesen(state, m.material.id, MITTAG)).toBeNull();
  });

  test('ein Set-Teil zu kaufen und einzuschmelzen ist nie billiger als Material direkt', () => {
    // Einschmelzen bringt zwei Siege Material der Ebene des Sets, direkt kostet ein Sieg MATERIAL_PREIS
    for (const n of DUNGEON_GRAPH) {
      const set = setFuerRoute(n.routeId);
      if (set) expect(setTeilPreis(set.tier), set.id).toBeGreaterThanOrEqual(EINSCHMELZEN_GRUNDMENGEN * MATERIAL_PREIS);
    }
  });
});

describe('Trophäensaal', () => {
  /** Ein Held, der jeden Kampf gewinnt (wie in expeditionProgress.test.ts) */
  function mitHeld(state: GameState): { system: ExpeditionSystem; heroId: number } {
    const hero = createGuildFighter(1, 'guardian', 'Testheld', {
      hp: 9999, maxHp: 9999, atk: 999, def: 999, spd: 99, critChance: 0, critMult: 1,
    });
    state.fighters.push(hero);
    state.guildStats.rank = 2;
    return { system: new ExpeditionSystem(new GearSystem(), new ProvisionSystem()), heroId: hero.id };
  }

  function spiele(state: GameState, system: ExpeditionSystem, routeId: string, heroId: number): ExpeditionRun {
    const run = system.startExpedition(state, routeId, [heroId])!;
    expect(run).toBeTruthy();
    for (let guard = 0; guard < 100; guard++) {
      const step = system.nextStep(run);
      if (step === 'finish') break;
      if (step === 'checkpoint') system.resolveCheckpoint(run, false);
      else if (step === 'merchant') system.merchantSkip(run);
      else if (step === 'choice') system.resolveChoice(run, 0);
      else system.processCurrentRoom(state);
    }
    return run;
  }

  test('erster Sieg über einen Boss: neue Trophäe; ein Zettel im selben Lauf zahlt Gold aus', () => {
    const state = createNewGameState();
    const { system, heroId } = mitHeld(state);
    brettStand(state, Date.now()).auftraege = [zettel('sieg', 'forest_medium')];
    const gold = state.globalStock.gold ?? 0;
    const run = spiele(state, system, 'forest_medium', heroId);
    expect(run.status).toBe('victory');
    const progress = finalizeExpeditionProgress(state, run, system);
    expect(progress.neueTrophaee).toBe(true);
    expect(trophaeenStand(state).siege.forest_medium).toBe(1);
    expect(progress.auftraege.meldungen[0]).toMatchObject({ fertig: true });
    // Nur die Belohnung des Zettels; das Gold aus dem Lauf bucht main.ts beim Öffnen der Truhe
    expect(state.globalStock.gold).toBe(gold + 100);
    expect(auftragsZeilen(progress.auftraege, progress.neueTrophaee).map(z => z.text)).toEqual(expect.arrayContaining([
      '🏆 Eine neue Trophäe steht im Saal des Gildenhauses', expect.stringContaining('📜 Zettel erledigt'),
    ]));
    expect(bossTrophaeen(state, Date.now())[0]).toMatchObject({ routeId: 'forest_medium', bezwungen: true, siege: 1 });

    state.activeExpedition = null;
    const zweiter = finalizeExpeditionProgress(state, spiele(state, system, 'forest_medium', heroId), system);
    expect(zweiter.neueTrophaee).toBe(false);
    expect(trophaeenStand(state).siege.forest_medium).toBe(2);
  });

  test('älterer Spielstand: Zähler aus der Bestenliste, der laufende Sieg zählt genau einmal', () => {
    const state = createNewGameState();
    const { system, heroId } = mitHeld(state);
    state.guildStats.bossesDefeatedIds = ['boss_elder_treant'];
    state.scoreboard = [1, 2].map(i => ({
      routeId: 'forest_medium', score: 100 * i, difficulty: 'normal', modifier: null, status: 'victory' as const,
      partyClasses: [], timestamp: i, day: 1, enemiesKilled: 5, bossesKilled: 1,
    }));
    expect(state.trophaeen).toBeUndefined();
    const progress = finalizeExpeditionProgress(state, spiele(state, system, 'forest_medium', heroId), system);
    expect(progress.neueTrophaee).toBe(false);
    expect(state.trophaeen!.siege.forest_medium).toBe(3);
  });

  test('Glanz des Saals: drei Sterne je Sockel', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.kette.fertig = ['forest_medium', 'cave_deep'];
    const trophaeen = bossTrophaeen(state, MITTAG);
    expect(trophaeen).toHaveLength(saalKapitel().length);
    const glanz = saalGlanz(trophaeen);
    expect(glanz.max).toBe(3 * trophaeen.length);
    const erwartet = trophaeen.filter(t => t.bezwungen).length + trophaeen.filter(t => t.setKomplett).length + 2;
    expect(glanz.sterne).toBe(erwartet);
    expect(trophaeen.find(t => t.routeId === 'sternenschlund')).toMatchObject({ bezwungen: false, prunk: false });
    expect(setSammlung(state).length).toBeGreaterThanOrEqual(trophaeen.length);
  });

  test('Gildenbuch: erledigte Zettel und verdiente Siegel', () => {
    const state = spielstand('probe');
    const stand = brettStand(state, MITTAG);
    stand.auftraege = [zettel('sieg', 'volcano_core')];
    auftraegeNachExpedition(state, lauf('volcano_core'), MITTAG);
    stand.siegel = 0;
    const buch = Object.fromEntries(gildenbuch(state, MITTAG).map(z => [z.was, z.wert]));
    expect(buch['Erledigte Zettel']).toBe(1);
    expect(buch['Siege ohne Verlust']).toBeDefined();
    // Der einzige Zettel des Tages ist erledigt: dazu der Tagesbonus
    expect(buch['Gildensiegel verdient']).toBe(2 + TAGESBONUS_SIEGEL);
  });
});
