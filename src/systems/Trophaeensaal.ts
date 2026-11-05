// ─── Magic City – Trophäensaal ──────────────────────────────────
// Der Saal hinter dem Gildenhaus: ein Sockel je Boss, von unten nach oben wie
// auf der Dungeon-Karte. Jede Trophäe hat drei Sterne: Boss bezwungen, Set des
// Dungeons komplett, Prunkstück aus der Kette «Der Saal der Gilde» (Auftragsbrett).
// Die Bosse ab Ebene 11 stehen im Anbau; den zeigt der Saal erst, wenn er dasteht
// (saalAnsicht). Dazu die Sets aller Dungeons, die Pokale der Rangliste und das
// Gildenbuch. Der Saal zeigt nur, er verändert keine Kampfwerte.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { TrophaeenStand } from '../models/AuftragsbrettStand';
import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../data/routes';
import { ENEMY_DEFS } from '../data/enemies';
import { DungeonSetDef, setFuerRoute, setTeilIds } from '../data/dungeonSets';
import { bezwungeneDungeons } from './Bezwungen';
import { gesammelteTeile } from './DungeonSets';
import { KettenTeil, alleKapitel, brettStand, kapitelDesTeils, kapitelSchild, kettenTeil } from './Auftragsbrett';
import { ranglisteKurz } from './Rangliste';

/**
 * Siege je Boss-Dungeon. Legt den Zähler beim ersten Aufruf an: so viele Siege mit Boss, wie die
 * Bestenliste kennt, mindestens einer für jeden bezwungenen Dungeon (frühe Siege fallen aus der Bestenliste).
 */
export function trophaeenStand(state: GameState): TrophaeenStand {
  if (!state.trophaeen) {
    const merker = bezwungeneDungeons(state);
    const siege: Record<string, number> = {};
    for (const n of DUNGEON_GRAPH) {
      if (!ROUTE_DEFS[n.routeId]?.bossId) continue;
      const bestenliste = (state.scoreboard ?? [])
        .filter(e => e.routeId === n.routeId && e.status === 'victory' && e.bossesKilled > 0).length;
      const anzahl = Math.max(n.routeId in merker ? 1 : 0, bestenliste);
      if (anzahl > 0) siege[n.routeId] = anzahl;
    }
    state.trophaeen = { siege };
  }
  return state.trophaeen;
}

/**
 * Nach einer Expedition: zählt einen Sieg über einen Boss-Dungeon. Vor der Rangliste aufrufen, damit
 * ein älterer Spielstand den Zähler ohne diesen Sieg anlegt. true bei der ersten Trophäe dieses Bosses.
 */
export function trophaeeNachExpedition(state: GameState, run: ExpeditionRun): boolean {
  const stand = trophaeenStand(state);
  if (!ROUTE_DEFS[run.routeId]?.bossId || !dungeonBezwungen(run)) return false;
  const vorher = stand.siege[run.routeId] ?? 0;
  stand.siege[run.routeId] = vorher + 1;
  return vorher === 0;
}

export interface BossTrophaee {
  routeId: string;
  boss: string;
  dungeon: string;
  ebene: number;
  spriteKey: string;
  siege: number;
  /** Die drei Sterne */
  bezwungen: boolean;
  setKomplett: boolean;
  prunk: boolean;
  set: DungeonSetDef | undefined;
  setTeile: number;
  prunkstueck: string;
  /** Das Messingschild, so weit es lesbar ist (kapitelSchild), und was den Rest verdeckt */
  schild: string;
  schildWarum?: string;
  /** Saal (bis Ebene 10) oder Anbau */
  teil: KettenTeil;
}

/** Die Sockel des Saals und seines Anbaus, von unten nach oben wie die Kette */
export function bossTrophaeen(state: GameState, jetzt: number): BossTrophaee[] {
  const stand = trophaeenStand(state);
  const brett = brettStand(state, jetzt);
  const merker = bezwungeneDungeons(state);
  return alleKapitel().map(k => {
    const route = ROUTE_DEFS[k.routeId];
    const boss = ENEMY_DEFS[route.bossId ?? ''];
    const set = setFuerRoute(k.routeId);
    const setTeile = set ? gesammelteTeile(state, set).length : 0;
    const bezwungen = k.routeId in merker || (stand.siege[k.routeId] ?? 0) > 0;
    const schild = kapitelSchild(state, k, bezwungen);
    return {
      routeId: k.routeId, boss: boss?.name ?? route.bossId ?? '', dungeon: route.name, ebene: route.tier,
      spriteKey: boss?.spriteKey ?? '', siege: stand.siege[k.routeId] ?? 0,
      bezwungen,
      setKomplett: !!set && setTeile >= setTeilIds(set).length,
      prunk: brett.kette.fertig.includes(k.routeId),
      set, setTeile, prunkstueck: k.prunkstueck, schild: schild.text,
      ...(schild.warum ? { schildWarum: schild.warum } : {}),
      teil: kettenTeil(k),
    };
  });
}

export interface SaalAnsicht {
  /** Die 16 Sockel des Saals */
  saal: BossTrophaee[];
  /** Die Sockel des Anbaus; leer, solange er nicht dasteht */
  anbau: BossTrophaee[];
  /** Das letzte Prunkstück des Saals liegt (Ottokars Schluss mit der Platte «Für die Nächsten») */
  saalVoll: boolean;
  anbauVoll: boolean;
  /** Glanz der Sockel, die zu sehen sind */
  glanz: { sterne: number; max: number };
}

/**
 * Was der Trophäensaal zeigt. Der Anbau steht erst, wenn der Saal voll ist (so erzählt es die Kette), oder schon
 * früher, sobald einer seiner Sockel einen Stern hat (ein Sieg dort oben): Eine verdiente Trophäe bleibt nie
 * unsichtbar. Darum zählt der Glanz der sichtbaren Sockel dieselben Sterne wie der aller Sockel (saalSterne).
 */
export function saalAnsicht(state: GameState, jetzt: number): SaalAnsicht {
  const alle = bossTrophaeen(state, jetzt);
  const fertig = brettStand(state, jetzt).kette.fertig;
  const voll = (teil: KettenTeil): boolean => kapitelDesTeils(teil).every(k => fertig.includes(k.routeId));
  const saal = alle.filter(t => t.teil === 'saal');
  const anbauSockel = alle.filter(t => t.teil === 'anbau');
  const saalVoll = voll('saal');
  const anbauDa = saalVoll || anbauSockel.some(t => t.bezwungen || t.setKomplett || t.prunk);
  const anbau = anbauDa ? anbauSockel : [];
  return { saal, anbau, saalVoll, anbauVoll: anbau.length > 0 && voll('anbau'), glanz: saalGlanz([...saal, ...anbau]) };
}

/** Glanz des Saals: gesammelte Sterne aller Sockel */
export function saalGlanz(trophaeen: BossTrophaee[]): { sterne: number; max: number } {
  const sterne = trophaeen.reduce((s, t) => s + Number(t.bezwungen) + Number(t.setKomplett) + Number(t.prunk), 0);
  return { sterne, max: trophaeen.length * 3 };
}

export interface SetSammlung {
  set: DungeonSetDef;
  dungeon: string;
  teile: number;
  /** Summe der Schmiede-Stufen der gesammelten Teile */
  stufen: number;
}

/** Alle Sets, von unten nach oben auf der Karte */
export function setSammlung(state: GameState): SetSammlung[] {
  return [...DUNGEON_GRAPH]
    .sort((a, b) => b.y - a.y)
    .flatMap(n => {
      const set = setFuerRoute(n.routeId);
      if (!set) return [];
      const gesammelt = gesammelteTeile(state, set);
      const stufen = gesammelt.reduce((s, id) => s + (state.schmiede?.stufen[id] ?? 0), 0);
      return [{ set, dungeon: ROUTE_DEFS[n.routeId].name, teile: gesammelt.length, stufen }];
    });
}

export interface Pokale {
  gold: number;
  silber: number;
  bronze: number;
  /** Platz in der Gipfel-Rangliste und Zahl der Gilden */
  platz: number;
  gilden: number;
  /** Bester Platz einer abgeschlossenen Woche, null = noch keine */
  besteWoche: number | null;
}

export function pokale(state: GameState, jetzt: number): Pokale {
  const kurz = ranglisteKurz(state, jetzt);
  const verlauf = state.rangliste?.verlauf ?? [];
  return {
    gold: state.rangliste?.pokale.gold ?? 0,
    silber: state.rangliste?.pokale.silber ?? 0,
    bronze: state.rangliste?.pokale.bronze ?? 0,
    platz: kurz.platz, gilden: kurz.gilden,
    besteWoche: verlauf.length > 0 ? Math.min(...verlauf.map(w => w.platz)) : null,
  };
}

/** Zeilen fürs Gildenbuch */
export function gildenbuch(state: GameState, jetzt: number): { was: string; wert: number }[] {
  const s = state.statistics ?? {};
  const brett = brettStand(state, jetzt);
  return [
    { was: 'Expeditionen', wert: s.total_expeditions ?? state.guildStats?.totalExpeditionsCompleted ?? 0 },
    { was: 'Siege', wert: s.total_victories ?? 0 },
    { was: 'Siege ohne Verlust', wert: s.total_flawless_victories ?? 0 },
    { was: 'Besiegte Gegner', wert: s.total_enemies_killed ?? 0 },
    { was: 'Besiegte Bosse', wert: s.total_bosses_killed ?? 0 },
    { was: 'Bezwungene Dungeons', wert: Object.keys(bezwungeneDungeons(state)).length },
    { was: 'Erledigte Zettel', wert: brett.erledigt },
    { was: 'Gildensiegel verdient', wert: brett.siegelGesamt },
  ];
}
