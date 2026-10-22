// ─── Magic City – Der Weg zur Magischen Stadt ───────────────────
// Sieben Stadtstufen vom Lagerfeuer bis zur Magischen Stadt. Jede hat
// Aufgaben, eine Abgabe, Belohnungen und ein Kapitel der Stadtchronik
// (erzählt von Stadtschreiber Ottokar). Wie das Rathaus bei Clash of
// Clans gibt die Stadtstufe vor, wie weit die Werkstätten ausgebaut
// werden dürfen, und ab Stufe 4 gibt der Händler Rabatt (Stadtrecht).
// Ab Stufe 6 liegt das Arkane Herz frei: fünf Herzsteine von
// Dungeon-Bossen wecken es. Danach geht es auf der Dungeon-Karte immer
// weiter nach oben (Endgame, docs/NEUE-DUNGEONS.md).
// Logik: systems/Stadtweg.ts. Regeln und Zahlen: docs/STADTWEG.md,
// docs/GILDENSTADT.md.
// ────────────────────────────────────────────────────────────────

import type { GameState } from '../models/GameState';

export type StadtAufgabe =
  | { art: 'gebaeude'; typeId: string }
  | { art: 'helden'; anzahl: number }
  | { art: 'siege'; anzahl: number }
  | { art: 'bosse'; anzahl: number }
  | { art: 'gildenrang'; rang: number }
  | { art: 'herz' };

/** Höchste Ausbau-Stufe, die eine Stadtstufe erlaubt, je Gebäude-Art. */
export interface AusbauGrenzen {
  werkstatt: number;
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
  /** Rabatt beim Händler in Prozent auf dieser Stufe (gilt, nicht zusammengezählt; data/haendler.ts). */
  haendlerRabatt: number;
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
    haendlerRabatt: 0,
    grenzen: { werkstatt: 1 },
  },
  {
    stufe: 2,
    name: 'Weiler',
    geschlecht: 'm',
    zeile: 'Ein Weiler. Die Ziege ist beeindruckt.',
    kapitelTitel: 'Die Steinplatte',
    kapitel: 'Wir haben jetzt Wände. Echte Wände, mit Dächern obendrauf. Beim Graben für die Schmiede stiess Jorinde '
      + 'auf eine Steinplatte mit alter Schrift: «Das Herz schläft unter dem Platz, bis die Stadt wieder eine Stadt ist.» '
      + 'Welches Herz? Welcher Platz? Ich habe die Platte poliert und neben mein Bett gestellt. Das nennt man Archivarbeit.',
    aufgaben: [
      { art: 'gebaeude', typeId: 'SMITHY' },
      { art: 'siege', anzahl: 1 },
    ],
    abgabe: { gold: 40 },
    geschenk: { gold: 100 },
    haendlerRabatt: 0,
    grenzen: { werkstatt: 1 },
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
      { art: 'gebaeude', typeId: 'HERB_GARDEN' },
      { art: 'helden', anzahl: 2 },
      { art: 'siege', anzahl: 3 },
    ],
    abgabe: { gold: 80, iron_scrap: 10 },
    geschenk: { gold: 150 },
    haendlerRabatt: 0,
    grenzen: { werkstatt: 2 },
  },
  {
    stufe: 4,
    name: 'Marktflecken',
    geschlecht: 'm',
    zeile: 'Ein Marktflecken. Die Händler kommen freiwillig.',
    kapitelTitel: 'Die Karte',
    kapitel: 'Händler kommen jetzt freiwillig zu uns, und niemand weiss genau, warum. Einer verkaufte mir eine Karte vom '
      + 'Berg über dem Dungeon. Oben ist sie leer, nur ein Satz steht da, in krakeliger Schrift: «Hier geht es weiter. '
      + 'Wohin, wissen wir noch nicht.» Ich habe drei Gold dafür bezahlt. Der Händler wollte zwei.',
    aufgaben: [
      { art: 'gildenrang', rang: 2 },
      { art: 'bosse', anzahl: 2 },
      { art: 'helden', anzahl: 3 },
    ],
    abgabe: { gold: 150, iron_scrap: 20, crystal_shard: 5 },
    geschenk: { gold: 100 },
    haendlerRabatt: 10,
    grenzen: { werkstatt: 2 },
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
      { art: 'gildenrang', rang: 3 },
    ],
    abgabe: { gold: 250, iron_scrap: 20, crystal_shard: 5 },
    geschenk: { gold: 200 },
    haendlerRabatt: 10,
    grenzen: { werkstatt: 3 },
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
      { art: 'gebaeude', typeId: 'WAR_MACHINE_WORKSHOP' },
      { art: 'gildenrang', rang: 4 },
      { art: 'bosse', anzahl: 5 },
      { art: 'helden', anzahl: 4 },
    ],
    abgabe: { gold: 400, iron_scrap: 40, crystal_shard: 10 },
    geschenk: { gold: 300 },
    haendlerRabatt: 10,
    grenzen: { werkstatt: 3 },
    extra: ['Das Arkane Herz liegt frei: setze fünf Herzsteine ein'],
  },
  {
    stufe: 7,
    name: 'Magische Stadt',
    geschlecht: 'f',
    zeile: 'Die Magische Stadt. Die Brunnen singen.',
    kapitelTitel: 'Die Karte wächst',
    kapitel: 'Das Herz ist erwacht. Die Strassen leuchten nachts, die Brunnen singen, falsch, aber mit Begeisterung, und '
      + 'die Steuerprüfer der Hauptstadt trauen sich nicht mehr her. Willkommen in Magic City. Nur die Karte vom Händler '
      + 'macht mir Sorgen: Jedes Mal, wenn ich sie aufrolle, ist sie oben ein Stück länger. Neue Gipfel, neue Namen, und '
      + 'ganz oben wieder der krakelige Satz. Der Händler sagt, das sei im Preis inbegriffen. Ich habe trotzdem ein Lineal gekauft.',
    aufgaben: [{ art: 'herz' }],
    abgabe: {},
    geschenk: { gold: 500 },
    haendlerRabatt: 20,
    grenzen: { werkstatt: 3 },
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
    kosten: { gold: 100, iron_scrap: 10 },
    text: 'Klebt ein bisschen. Ich habe nicht gefragt, warum.',
  },
  {
    id: 'herz_hydra', name: 'Herzstein der Sumpfhydra', bossId: 'boss_swamp_hydra',
    kosten: { gold: 150, iron_scrap: 20, crystal_shard: 3 },
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

/** Stadtstufe eines Spielstands; Spielstände ohne Stadtweg stehen auf 1. */
export function stadtStufeVon(state: Pick<GameState, 'stadtweg'>): number {
  const stufe = Number(state.stadtweg?.stufe);
  return Number.isFinite(stufe) ? Math.min(HOECHSTE_STADTSTUFE, Math.max(1, Math.floor(stufe))) : 1;
}

/** Erste Stadtstufe, ab der eine Gebäude-Art die Ausbau-Stufe `ziel` erreichen darf (null = nie). */
export function stadtStufeFuerAusbau(art: GrenzArt, ziel: number): StadtStufeDef | null {
  return STADTSTUFEN.find(s => s.grenzen[art] >= ziel) ?? null;
}
