// ─── Magic City – Form eines Spielstands aus einer Datei ────────
// Wie in models/*.ts. Ein Feld darf fehlen (load() und die Systeme legen es an),
// aber was da ist, hat die Form, mit der das Spiel rechnet. Pflichtfelder stehen in
// der Liste hinter den Feldern. Wer die Form eines gespeicherten Felds ändert, passt
// sie hier an; der Test «echte Spielstände» (tests/spielstandDatei.test.ts) schlägt
// sonst an. Genutzt von systems/SaveSystem.ts (pruefeSpielstandText).
// ────────────────────────────────────────────────────────────────

import type { GameState } from '../models/GameState';

type Form = (wert: unknown) => boolean;

export function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

const ZAHL: Form = w => typeof w === 'number' && Number.isFinite(w);
const TEXT: Form = w => typeof w === 'string';
const JA_NEIN: Form = w => typeof w === 'boolean';
const OBJEKT: Form = istObjekt;
const oderNull = (form: Form): Form => w => w === null || form(w);
const einerVon = (...werte: string[]): Form => w => typeof w === 'string' && werte.includes(w);
const liste = (form: Form): Form => w => Array.isArray(w) && w.every(e => form(e));
const tabelle = (form: Form): Form => w => istObjekt(w) && Object.values(w).every(e => form(e));
const objekt = (felder: Record<string, Form>, pflicht: string[] = []): Form => w =>
  istObjekt(w)
  && pflicht.every(name => w[name] !== undefined)
  && Object.entries(felder).every(([name, form]) => w[name] === undefined || form(w[name]));

const ZAEHLER = tabelle(ZAHL);
const TEXTE = liste(TEXT);

/** models/Building.ts */
const GEBAEUDE = objekt({
  id: ZAHL, typeId: TEXT, built: JA_NEIN, activeRecipeId: oderNull(TEXT), productionTimer: ZAHL, producing: JA_NEIN,
  vonSelbst: oderNull(objekt({ art: einerVon('vorstufe', 'zulieferung'), fuer: TEXT }, ['art', 'fuer'])),
  tier: ZAHL, pendingCraft: JA_NEIN, auftraege: TEXTE,
}, ['id', 'typeId']);

/** models/GuildRoster.ts */
const HELD = objekt({
  id: ZAHL, classId: TEXT, name: TEXT,
  baseStats: objekt({ hp: ZAHL, maxHp: ZAHL, atk: ZAHL, def: ZAHL, spd: ZAHL, critChance: ZAHL, critMult: ZAHL }, ['maxHp']),
  gear: tabelle(oderNull(TEXT)), // mainHand, offHand, armor, trinket
  xp: ZAHL, level: ZAHL, spezialisierung: TEXT, wegBilanz: ZAEHLER,
}, ['id', 'baseStats', 'gear']);

const BESTENLISTE_EINTRAG = objekt({
  routeId: TEXT, score: ZAHL, difficulty: TEXT, modifier: oderNull(TEXT), status: TEXT, partyClasses: TEXTE,
  timestamp: ZAHL, day: ZAHL, enemiesKilled: ZAHL, bossesKilled: ZAHL,
});

const WOCHEN_ERGEBNIS = objekt({
  wocheId: TEXT, platz: ZAHL, ruhm: ZAHL, belohnung: ZAEHLER, pokal: oderNull(einerVon('gold', 'silber', 'bronze')),
}, ['wocheId', 'platz', 'ruhm', 'belohnung']);

const RANGLISTE = objekt({
  runde: ZAHL, samen: ZAHL, startSterne: ZAHL, startEbene: ZAHL, bekannt: ZAEHLER,
  woche: objekt({ id: TEXT, start: ZAHL, ruhm: ZAHL, ziele: ZAEHLER }, ['id', 'start', 'ruhm', 'ziele']),
  offen: liste(WOCHEN_ERGEBNIS), verlauf: liste(WOCHEN_ERGEBNIS),
  pokale: objekt({ gold: ZAHL, silber: ZAHL, bronze: ZAHL }, ['gold', 'silber', 'bronze']),
}, ['runde', 'samen', 'startSterne', 'startEbene', 'bekannt', 'woche', 'offen', 'verlauf', 'pokale']);

const AUFTRAG = objekt({
  art: einerVon('sieg', 'makellos', 'jagd', 'set', 'lieferung'), vorlage: TEXT, routeId: TEXT,
  gegnerId: TEXT, itemId: TEXT, ziel: ZAHL, stand: ZAHL, fertig: JA_NEIN,
  belohnung: objekt({ siegel: ZAHL, gold: ZAHL, dinge: ZAEHLER }, ['siegel', 'gold', 'dinge']),
}, ['art', 'vorlage', 'routeId', 'ziel', 'stand', 'fertig', 'belohnung']);

const AUFTRAGSBRETT = objekt({
  samen: ZAHL, tag: objekt({ id: TEXT, start: ZAHL }, ['id', 'start']), auftraege: liste(AUFTRAG),
  getauscht: ZAHL, tagesbonus: JA_NEIN, gesehen: TEXT, siegel: ZAHL, erledigt: ZAHL, siegelGesamt: ZAHL,
  kette: objekt({ routeId: TEXT, stand: ZAHL, fertig: TEXTE }, ['routeId', 'stand', 'fertig']),
}, ['samen', 'tag', 'auftraege', 'getauscht', 'tagesbonus', 'siegel', 'erledigt', 'siegelGesamt', 'kette']);

/** models/GameState.ts: die Gildenstadt (sechs Gebäude, ein Lager, Helden, Expeditionen). */
export const SPIELSTAND = objekt({
  buildings: liste(GEBAEUDE),
  globalStock: ZAEHLER,
  fighters: liste(HELD),
  activeExpedition: oderNull(OBJEKT), // bricht der Start ab (main.ts), das Probe-Laden prüft den Rest
  day: ZAHL,
  cityTickAccumulator: ZAHL, dayTickAccumulator: ZAHL,
  rngSeed: ZAHL,
  scoreboard: liste(BESTENLISTE_EINTRAG),
  weeklyChallenge: objekt({ currentChallengeId: TEXT, bestScore: ZAHL, medal: TEXT, attempts: ZAHL, completedAt: oderNull(ZAHL) }),
  statistics: ZAEHLER,
  bestiarium: objekt({ discovered: TEXTE, defeated: TEXTE }),
  achievements: TEXTE,
  guildStats: objekt({
    rank: ZAHL, forestShortCompleted: ZAHL, forestMediumBossDefeated: JA_NEIN, totalBossesDefeated: ZAHL,
    totalExpeditionsCompleted: ZAHL, bossesDefeatedIds: TEXTE, guildHallT2: JA_NEIN,
  }),
  classesUnlocked: TEXTE,
  uiTheme: TEXT,
  pendingChestLoot: objekt({ items: ZAEHLER, expeditionCount: ZAHL }),
  stadtweg: objekt({ stufe: ZAHL, herzsteine: TEXTE, gelesen: ZAHL }),
  geschichten: objekt({ gelesen: TEXTE, erlebt: TEXTE }, ['gelesen', 'erlebt']),
  bezwungen: ZAEHLER,
  rangliste: RANGLISTE,
  schmiede: objekt({ stufen: ZAEHLER }, ['stufen']),
  auftragsbrett: AUFTRAGSBRETT,
  trophaeen: objekt({ siege: ZAEHLER }, ['siege']),
  erhalteneBauplaene: TEXTE,
}, ['buildings', 'globalStock', 'fighters', 'day']);

/**
 * Zeichen, mit denen ein Text aus der Datei zu HTML würde: < und > öffnen Tags, " beendet ein
 * Attribut (z. B. data-item-id="…" im Heldenhaus). Viele Bildschirme setzen Namen und IDs aus dem
 * Spielstand ungeschützt ins HTML; Spielstände aus dem Spiel enthalten keines dieser Zeichen.
 */
const HTML_ZEICHEN = /[<>"]/;

/** true, wenn kein Text und kein Schlüssel im Stand eines der HTML_ZEICHEN enthält. */
export function nurSichereTexte(wert: unknown): boolean {
  if (typeof wert === 'string') return !HTML_ZEICHEN.test(wert);
  if (Array.isArray(wert)) return wert.every(nurSichereTexte);
  if (istObjekt(wert)) return Object.entries(wert).every(([name, w]) => !HTML_ZEICHEN.test(name) && nurSichereTexte(w));
  return true;
}

/** Hat der gelesene Inhalt die Pflichtfelder eines Spielstands (auch eines aus der Zeit vor der Gildenstadt)? */
export function istMagicCityStand(s: unknown): s is GameState {
  return istObjekt(s) && Array.isArray(s.buildings) && istObjekt(s.globalStock) && Array.isArray(s.fighters);
}
