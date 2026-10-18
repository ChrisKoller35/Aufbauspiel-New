// ─── Magic City – Der Weg zur Magischen Stadt ───────────────────
// Sieben Stadtstufen vom Lagerfeuer bis zur Magischen Stadt. Jede hat
// Aufgaben, eine Abgabe, Belohnungen und ein Kapitel der Stadtchronik
// (erzählt von Stadtschreiber Ottokar). Wie das Rathaus bei Clash of
// Clans gibt die Stadtstufe vor, wie weit Gebäude ausgebaut werden
// dürfen. Ab Stufe 6 liegt das Arkane Herz frei: fünf Herzsteine von
// Dungeon-Bossen wecken es. Das letzte Kapitel öffnet die endlose
// Treppe über dem Dungeon (Endgame mit Rangliste, folgt).
// Logik: systems/Stadtweg.ts. Regeln und Zahlen: docs/STADTWEG.md.
// ────────────────────────────────────────────────────────────────

import type { GameState } from '../models/GameState';

export type StadtAufgabe =
  | { art: 'gebaeude'; typeId: string }
  | { art: 'bewohner'; anzahl: number }
  | { art: 'siege'; anzahl: number }
  | { art: 'bosse'; anzahl: number }
  | { art: 'gildenrang'; rang: number }
  | { art: 'herz' };

/** Höchste Ausbau-Stufe, die eine Stadtstufe erlaubt, je Gebäude-Art. */
export interface AusbauGrenzen {
  wohnen: number;
  werkstatt: number;
  handel: number;
}

export type GrenzArt = keyof AusbauGrenzen;

export interface StadtStufeDef {
  stufe: number;
  name: string;
  /** Grammatisches Geschlecht des Namens, für «aus dem Weiler wird ein Dorf». */
  geschlecht: 'm' | 'f' | 'n';
  /** Kurze Beschreibung im Hauptmenü («zurzeit: …»). */
  zeile: string;
  kapitelTitel: string;
  /** Kapitel der Stadtchronik, das mit dieser Stufe erscheint. */
  kapitel: string;
  /** Was erfüllt sein muss, um diese Stufe zu erreichen. */
  aufgaben: StadtAufgabe[];
  /** Wird beim Aufstieg aus dem Lager bezahlt. */
  abgabe: Record<string, number>;
  /** Kommt beim Aufstieg ins Lager. */
  geschenk: Record<string, number>;
  /** Zusätzliche Steuern in Prozent ab dieser Stufe (zählt mit den früheren zusammen). */
  steuerProzent: number;
  grenzen: AusbauGrenzen;
  /** Weitere Belohnungen in Worten. */
  extra?: string[];
}

export const STADTSTUFEN: StadtStufeDef[] = [
  {
    stufe: 1,
    name: 'Lagerfeuer',
    geschlecht: 'n',
    zeile: 'Drei Zelte, ein Feuer und ein sehr optimistisches Schild.',
    kapitelTitel: 'Das Schild',
    kapitel: 'Das Schild steckte schon in der Asche, als wir ankamen. «Magic City» stand darauf, in goldener Farbe, '
      + 'die keiner von uns besass. Wir waren sechs Leute, drei Zelte und eine Ziege. Ich beschloss, das Schild ernst '
      + 'zu nehmen, und ernannte mich zum Stadtschreiber. Widerspruch gab es keinen. Die Ziege enthielt sich.',
    aufgaben: [],
    abgabe: {},
    geschenk: {},
    steuerProzent: 0,
    grenzen: { wohnen: 1, werkstatt: 1, handel: 1 },
  },
  {
    stufe: 2,
    name: 'Weiler',
    geschlecht: 'm',
    zeile: 'Ein Weiler. Die Ziege ist beeindruckt.',
    kapitelTitel: 'Die Steinplatte',
    kapitel: 'Wir haben jetzt Wände. Echte Wände, mit Dächern obendrauf. Beim Graben für den Steinbruch stiess Jorinde '
      + 'auf eine Steinplatte mit alter Schrift: «Das Herz schläft unter dem Platz, bis die Stadt wieder eine Stadt ist.» '
      + 'Welches Herz? Welcher Platz? Ich habe die Platte poliert und neben mein Bett gestellt. Das nennt man Archivarbeit.',
    aufgaben: [
      { art: 'gebaeude', typeId: 'QUARRY' },
      { art: 'gebaeude', typeId: 'FARM_GRAIN' },
      { art: 'siege', anzahl: 1 },
    ],
    abgabe: { wood: 40 },
    geschenk: { gold: 60 },
    steuerProzent: 0,
    grenzen: { wohnen: 2, werkstatt: 1, handel: 1 },
  },
  {
    stufe: 3,
    name: 'Dorf',
    geschlecht: 'n',
    zeile: 'Ein Dorf, mit Dorfplatz und Dorfklatsch.',
    kapitelTitel: 'Das Brummen',
    kapitel: 'Ein Dorf, mit Dorfplatz, Dorfbäckerei und Dorfklatsch. Die Hälfte des Klatsches stimmt sogar. Seit einer '
      + 'Woche brummt nachts der Boden unter dem Dorfplatz, leise und gleichmässig, wie eine sehr grosse Katze. '
      + 'Die Bäckerin sagt, das sei ihr Ofen. Ihr Ofen steht drei Strassen weiter.',
    aufgaben: [
      { art: 'gebaeude', typeId: 'BAKERY' },
      { art: 'gebaeude', typeId: 'IRON_MINE' },
      { art: 'bewohner', anzahl: 10 },
      { art: 'siege', anzahl: 3 },
    ],
    abgabe: { wood: 80, stone: 30, gold: 50 },
    geschenk: { gold: 120 },
    steuerProzent: 0,
    grenzen: { wohnen: 3, werkstatt: 2, handel: 1 },
  },
  {
    stufe: 4,
    name: 'Marktflecken',
    geschlecht: 'm',
    zeile: 'Ein Marktflecken. Die Händler kommen freiwillig.',
    kapitelTitel: 'Die Karte',
    kapitel: 'Händler kommen jetzt freiwillig zu uns, und niemand weiss genau, warum. Einer verkaufte mir eine Karte vom '
      + 'Berg über dem Dungeon. Ganz oben ist eine Treppe eingezeichnet, daneben steht in krakeliger Schrift: «Hört nicht '
      + 'auf. Wirklich nicht. Wir haben nachgesehen.» Ich habe drei Gold dafür bezahlt. Der Händler wollte zwei.',
    aufgaben: [
      { art: 'gebaeude', typeId: 'SMITHY' },
      { art: 'gebaeude', typeId: 'MARKETPLACE' },
      { art: 'bewohner', anzahl: 16 },
    ],
    abgabe: { wood: 120, stone: 60, gold: 150, iron_scrap: 10 },
    geschenk: {},
    steuerProzent: 10,
    grenzen: { wohnen: 4, werkstatt: 2, handel: 2 },
  },
  {
    stufe: 5,
    name: 'Stadt',
    geschlecht: 'f',
    zeile: 'Eine Stadt. An den Geruch gewöhnt man sich.',
    kapitelTitel: 'Mehr',
    kapitel: 'Stadtmauer, Stadtwache, Stadtgeruch. Man gewöhnt sich an alles. Heute Nacht hat das Brummen unter dem Platz '
      + 'zum ersten Mal gesprochen. Es sagte: «Mehr.» Ich fragte höflich nach, mehr wovon. Keine Antwort. Ich habe es '
      + 'trotzdem ins Protokoll aufgenommen, mit dem Vermerk «unhöflich».',
    aufgaben: [
      { art: 'gebaeude', typeId: 'ARCANE_SMITHY' },
      { art: 'bosse', anzahl: 3 },
      { art: 'bewohner', anzahl: 22 },
    ],
    abgabe: { stone: 200, gold: 250, iron_scrap: 20, crystal_shard: 5 },
    geschenk: { gold: 200 },
    steuerProzent: 10,
    grenzen: { wohnen: 5, werkstatt: 3, handel: 2 },
  },
  {
    stufe: 6,
    name: 'Grossstadt',
    geschlecht: 'f',
    zeile: 'Eine Grossstadt. Die Hauptstadt ist nervös.',
    kapitelTitel: 'Das Herz',
    kapitel: 'Die Hauptstadt hat uns einen Brief geschickt. Er ist sehr höflich und ein bisschen nervös. Unter dem Platz '
      + 'liegt jetzt ein Kristall frei, gross wie ein Ochsenkarren, und er schlägt wie ein Herz. Langsam. Er will fünf '
      + 'Herzsteine, sagt er, von fünf alten Ungeheuern aus dem Dungeon. Ich habe eine Liste angelegt. Mit Kästchen zum Abhaken.',
    aufgaben: [
      { art: 'gebaeude', typeId: 'BANK' },
      { art: 'gildenrang', rang: 4 },
      { art: 'bosse', anzahl: 5 },
      { art: 'bewohner', anzahl: 28 },
    ],
    abgabe: { stone: 300, gold: 400, iron_scrap: 40, crystal_shard: 10 },
    geschenk: { gold: 300 },
    steuerProzent: 10,
    grenzen: { wohnen: 6, werkstatt: 3, handel: 3 },
    extra: ['Das Arkane Herz liegt frei: setze fünf Herzsteine ein'],
  },
  {
    stufe: 7,
    name: 'Magische Stadt',
    geschlecht: 'f',
    zeile: 'Die Magische Stadt. Die Brunnen singen.',
    kapitelTitel: 'Die Treppe',
    kapitel: 'Das Herz ist erwacht. Die Strassen leuchten nachts, die Brunnen singen, falsch, aber mit Begeisterung, und '
      + 'die Steuerprüfer der Hauptstadt trauen sich nicht mehr her. Willkommen in Magic City. Dann öffnete das Herz die '
      + 'Treppe über dem Dungeon, die von der Karte. Sie hört nicht auf. Gilden aus aller Welt steigen dort hinauf, und '
      + 'wer am höchsten kommt, steht oben auf der Rangliste. Ich habe uns Platz eins schon reserviert. Gefragt habe ich niemanden.',
    aufgaben: [{ art: 'herz' }],
    abgabe: {},
    geschenk: { gold: 500 },
    steuerProzent: 20,
    grenzen: { wohnen: 6, werkstatt: 3, handel: 3 },
    extra: ['Die endlose Treppe über dem Dungeon öffnet sich'],
  },
];

export const HOECHSTE_STADTSTUFE = STADTSTUFEN.length;

/** Ab dieser Stadtstufe lassen sich Herzsteine einsetzen. */
export const HERZ_AB_STUFE = 6;

export interface HerzsteinDef {
  id: string;
  name: string;
  /** Boss, der besiegt sein muss (ENEMY_DEFS-ID). */
  bossId: string;
  kosten: Record<string, number>;
  /** Ottokars Vermerk beim Einsetzen. */
  text: string;
}

export const HERZSTEINE: HerzsteinDef[] = [
  {
    id: 'herz_spinne', name: 'Herzstein der Spinnenkönigin', bossId: 'boss_spider_queen',
    kosten: { stone: 150, gold: 100 },
    text: 'Klebt ein bisschen. Ich habe nicht gefragt, warum.',
  },
  {
    id: 'herz_hydra', name: 'Herzstein der Sumpfhydra', bossId: 'boss_swamp_hydra',
    kosten: { wood: 200, gold: 150, crystal_shard: 3 },
    text: 'Riecht nach Sumpf. Das Herz hat sich trotzdem bedankt.',
  },
  {
    id: 'herz_leviathan', name: 'Herzstein des Leviathans', bossId: 'boss_leviathan',
    kosten: { iron_scrap: 30, gold: 200, crystal_shard: 5 },
    text: 'Tropft noch. Das Herz fand das erfrischend.',
  },
  {
    id: 'herz_wyrm', name: 'Herzstein des Magma-Wyrms', bossId: 'boss_magma_wyrm',
    kosten: { gold: 300, crystal_shard: 8 },
    text: 'Ist warm. Sehr warm. Ich trage jetzt Handschuhe zur Arbeit.',
  },
  {
    id: 'herz_waechter', name: 'Herzstein des Festungswächters', bossId: 'boss_fortress_warden',
    kosten: { iron_scrap: 50, gold: 400, crystal_shard: 10 },
    text: 'Der schwerste von allen. Vier Leute, ein Ochse und erstaunlich viele neue Schimpfwörter.',
  },
];

/** Daten einer Stadtstufe (gedeckelt auf 1 bis HOECHSTE_STADTSTUFE). */
export function stufeDef(stufe: number): StadtStufeDef {
  const i = Math.min(HOECHSTE_STADTSTUFE, Math.max(1, Math.floor(stufe))) - 1;
  return STADTSTUFEN[i];
}

/** Stadtstufe eines Spielstands; ältere Spielstände ohne Stadtweg stehen auf 1. */
export function stadtStufeVon(state: GameState): number {
  const stufe = Number(state.stadtweg?.stufe);
  return Number.isFinite(stufe) ? Math.min(HOECHSTE_STADTSTUFE, Math.max(1, Math.floor(stufe))) : 1;
}

/** Erste Stadtstufe, ab der eine Gebäude-Art die Ausbau-Stufe `ziel` erreichen darf (null = nie). */
export function stadtStufeFuerAusbau(art: GrenzArt, ziel: number): StadtStufeDef | null {
  return STADTSTUFEN.find(s => s.grenzen[art] >= ziel) ?? null;
}
