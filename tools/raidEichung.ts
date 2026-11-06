// ─── Magic City – Eichung der Raids «Über dem Tag», «Die dreizehnte Stunde» und «Das Kuckucksei» ──────
// Rechnet Zenit (src/data/raids.ts) gegen die Muster-Gilde (src/data/raidMuster.ts) in ihren Aufstellungen,
// je Zeile 400 Kämpfe mit den Samen i · 7919; die ersten 20 sind die von tests/raid.test.ts. Die erste
// Tabelle zeigt Siege, Siegrunde, Zenits Rest, wie oft Zenit unter die Hälfte kam, Siege bis Runde 12,
// Siege mit fünf oder mehr Stehenden, wie viele beim Sieg noch stehen und Mitternacht; die zweite schaltet
// je eine Regel ab (Ablation). Darunter die Eichbänder aus docs/RAID.md mit ✓ oder ✗: Ist eines verfehlt,
// endet das Werkzeug mit 1. Zum Schluss vergleicht es Zenits Truhe mit einem Lauf bei Orm (Gold und Grundwert
// der Gegenstände). Nach Änderungen an Kampf, Klassen, Wegen, Sets, Schmiede, Beute oder an Zenit neu laufen
// lassen und die Tabellen in docs/RAID.md nachführen. Stellschraube zuerst Zenits Leben, in Schritten von 250,
// erst danach Wuchten oder Heilfaktor. Danach dasselbe für Stufe II (Zenit mit Gegenzeiger, die Muster-Gilde mit
// fünf Lehrlingen, anker15, auf neun Spalten): Tabelle, je eine Regel aus und ihre Bänder, die dreizehnte Truhe
// gegen Zenits Truhe. Und für Stufe III (Zenit mit Kuckuck, die Muster-Gilde mit allen zehn Lehrlingen, anker20,
// auf zwölf Spalten; dazu anker15 in der besten gesuchten Ordnung für fünfzehn): Tabelle, Regeln, Bänder, das Nest.
// Aufruf: npm run raid-eichung
//         mehr Läufe:                  npm run raid-eichung -- --laeufe 1000
//         Zenits Leben durchprobieren: npm run raid-eichung -- --leben 13500,14000,14500   (ohne Bänder)
//         Regeln zusammen abschalten:  npm run raid-eichung -- --ohne glocke,funken       (eine Zeile mehr)
//         je ein Weg anders:           npm run raid-eichung -- --wege                     (Profi ≥ 90 %, sonst
//                                      eine Aufstellungssuche ab «Gut», 300 Schritte, mit ≥ 90 %; auf Stufe II
//                                      mit anker15, jeder der fünfzehn einzeln, 600 Schritte; die Suche setzt
//                                      dort in drei von zehn Schritten zwei Helden; auf Stufe III mit anker20,
//                                      jeder der zwanzig, 600 Schritte ab «Profi»; ohne Meuchlerin in der
//                                      Gilde ≥ 60 %, dazu der Tausch Sina/Nix ≥ 90 %)
//         Aufstellungssuche:           npm run raid-eichung -- --suche t4                 (T4 ≤ 65 %)
//         nur eine Stufe:              npm run raid-eichung -- --stufe II                 (I, II oder III; mit --leben:
//                                      das Leben dieser Stufe durchprobieren)
//         die besten zehn neu suchen:  npm run raid-eichung -- --suche zehn               (Stufe II ohne Lehrlinge,
//                                      600 Schritte ab «zehn»: ≤ 15 %)
// ────────────────────────────────────────────────────────────────

import { ITEM_DEFS } from '../src/data/items';
import { DREIZEHN, KUCKUCK, RaidDef, ZENIT } from '../src/data/raids';
import {
  RaidAufstellungDreizehn, RaidAufstellungKuckuck, RaidAufstellungName, RaidMusterName, baueRaidGilde, raidMusterAufstellung,
  raidMusterAufstellungDreizehn, raidMusterAufstellungKuckuck,
} from '../src/data/raidMuster';
import { wegeDerKlasse } from '../src/data/spezialisierungen';
import { createNewGameState } from '../src/models/GameState';
import type { GuildFighter } from '../src/models/GuildRoster';
import type { Feld } from '../src/models/RaidStand';
import { gewonnen, musterStand, spieleRoute } from '../src/systems/Musterlauf';
import { truheZiehen } from '../src/systems/Raid';
import type { SchmiedeStufen } from '../src/systems/Schmiede';
import { RaidOptionen, raidKampf, spaltenZahl } from '../src/systems/RaidKampf';
import { SeededRNG } from '../src/utils/RNG';

type Abschaltbar = NonNullable<RaidOptionen['ohne']>[number];

/** Was sich abschalten lässt (Rundenende und Mitternacht nicht); Zeiger aus nimmt den Durchschlag mit */
const REGELN: Abschaltbar[] = ['pendel', 'zeiger', 'durchschlag', 'glocke', 'funken', 'mittag', 'heilung'];
const REGEL_NAME: Record<Abschaltbar, string> = {
  pendel: 'Pendel', zeiger: 'Zeiger (mit Durchschlag)', gegenzeiger: 'Gegenzeiger (mit Durchschlag)', durchschlag: 'Durchschlag',
  glocke: 'Glocke', funken: 'Funken', kuckuck: 'Kuckuck', mittag: 'Mittag', heilung: 'Heilregel', rest: 'Rundenende',
  mitternacht: 'Mitternacht',
};
const GILDEN: RaidMusterName[] = ['anker', 'sets5', 'sets0', 't4', 'kern'];
const DIE_SECHS = ['Ansgar', 'Ewin', 'Moos', 'Liedra', 'Ysra', 'Morn'];

// ── Aufruf ──

const ARGUMENTE = process.argv.slice(2);
const MIT_WERT = ['--laeufe', '--leben', '--ohne', '--stufe'];

function abbruch(text: string): never {
  console.error(text);
  console.error('Aufruf: npm run raid-eichung -- [--laeufe 400] [--leben 13500,14500] [--ohne glocke,funken] [--wege] '
    + '[--suche t4|zehn] [--stufe I|II|III]');
  process.exit(1);
}

for (let i = 0; i < ARGUMENTE.length; i++) {
  const a = ARGUMENTE[i];
  if (MIT_WERT.includes(a)) {
    if (ARGUMENTE[i + 1] === undefined) abbruch(`${a} braucht einen Wert.`);
    i++;
  } else if (a === '--suche') {
    if (GILDEN.includes(ARGUMENTE[i + 1] as RaidMusterName) || ARGUMENTE[i + 1] === 'zehn') i++;
  } else if (a !== '--wege') {
    abbruch(`Unbekannt: ${a}`);
  }
}
const wertVon = (schalter: string): string | undefined => {
  const i = ARGUMENTE.indexOf(schalter);
  return i >= 0 ? ARGUMENTE[i + 1] : undefined;
};

const LAEUFE = Number(wertVon('--laeufe') ?? 400);
if (!Number.isInteger(LAEUFE) || LAEUFE < 1) abbruch(`--laeufe: eine ganze Zahl ab 1, nicht «${wertVon('--laeufe')}».`);
const LEBEN = wertVon('--leben')?.split(',').map(Number) ?? [];
if (LEBEN.some(hp => !Number.isFinite(hp) || hp < 1)) abbruch(`--leben: Zahlen wie 13500,14500, nicht «${wertVon('--leben')}».`);
const OHNE = (wertVon('--ohne')?.split(',') ?? []) as Abschaltbar[];
const unbekannteRegeln = OHNE.filter(r => !REGELN.includes(r));
if (unbekannteRegeln.length > 0) abbruch(`--ohne: ${unbekannteRegeln.join(', ')} gibt es nicht (abschaltbar: ${REGELN.join(', ')}).`);
const WEGE = ARGUMENTE.includes('--wege');
const ZEHN_SUCHE = ARGUMENTE.includes('--suche') && wertVon('--suche') === 'zehn';
const SUCHE: RaidMusterName | null = ARGUMENTE.includes('--suche') && !ZEHN_SUCHE
  ? (GILDEN.find(g => g === wertVon('--suche')) ?? 't4')
  : null;
const STUFE = wertVon('--stufe');
if (STUFE !== undefined && STUFE !== 'I' && STUFE !== 'II' && STUFE !== 'III') abbruch(`--stufe: I, II oder III, nicht «${STUFE}».`);
/** Welche Stufen gerechnet werden (ohne --stufe alle) */
const STUFE_EINS = STUFE === undefined || STUFE === 'I';
const STUFE_ZWEI = STUFE === undefined || STUFE === 'II';
const STUFE_DREI = STUFE === undefined || STUFE === 'III';

// ── Messen ──

interface Aufbau {
  helden: GuildFighter[];
  stufen: SchmiedeStufen;
  aufstellung: Record<string, Feld>;
  /** Welche Stufe (fehlt: Zenit, Stufe I) */
  def?: RaidDef;
}

interface Lauf {
  sieg: boolean;
  runden: number;
  rest: number;
  stehend: number;
  mitternacht: boolean;
}

/** Anteile von 0 bis 1 über alle Läufe; Siegrunde und Stehende im Schnitt der Siege (null ohne Sieg) */
interface Messung {
  n: number;
  sieg: number;
  siegRunde: number | null;
  rest: number;
  unterHalb: number;
  bisZwoelf: number;
  fuenf: number;
  stehend: number | null;
  mitternacht: number;
}

let kaempfe = 0;
let rechenzeit = 0;

/** Die Muster-Gilde in einer Muster-Aufstellung; wer in `ohneHelden` steht, bleibt unten */
function aufbau(gilde: RaidMusterName, aufstellung: RaidAufstellungName, ohneHelden: string[] = []): Aufbau {
  const { helden, stufen } = baueRaidGilde(gilde);
  return { helden, stufen, aufstellung: raidMusterAufstellung(aufstellung, helden, ohneHelden) };
}

/** Die Muster-Gilde `anker15` (oder `anker`) in einer Aufstellung von Stufe II */
function aufbauZwei(gilde: RaidMusterName, aufstellung: RaidAufstellungDreizehn, ohneHelden: string[] = []): Aufbau {
  const { helden, stufen } = baueRaidGilde(gilde);
  return { helden, stufen, aufstellung: raidMusterAufstellungDreizehn(aufstellung, helden, ohneHelden), def: DREIZEHN };
}

/** Eine Muster-Gilde (anker20, für fünfzehn anker15) in einer Aufstellung von Stufe III */
function aufbauDrei(gilde: RaidMusterName, aufstellung: RaidAufstellungKuckuck, ohneHelden: string[] = []): Aufbau {
  const { helden, stufen } = baueRaidGilde(gilde);
  return { helden, stufen, aufstellung: raidMusterAufstellungKuckuck(aufstellung, helden, ohneHelden), def: KUCKUCK };
}

/** `anzahl` Kämpfe mit den Samen (versatz + i) · 7919 */
function laeufe(a: Aufbau, optionen: RaidOptionen = {}, anzahl = LAEUFE, versatz = 0): Lauf[] {
  const t0 = performance.now();
  const liste = Array.from({ length: anzahl }, (_, i) => {
    const r = raidKampf(a.def ?? ZENIT, a.helden, a.stufen, a.aufstellung, (versatz + i) * 7919, { knapp: true, ...optionen });
    return { sieg: r.sieg, runden: r.runden, rest: r.zenitRest, stehend: r.stehend, mitternacht: r.mitternacht };
  });
  rechenzeit += performance.now() - t0;
  kaempfe += anzahl;
  return liste;
}

function fasse(liste: Lauf[], def: RaidDef = ZENIT): Messung {
  const n = liste.length;
  const siege = liste.filter(l => l.sieg);
  const schnitt = (werte: number[]): number | null => (werte.length > 0 ? werte.reduce((s, w) => s + w, 0) / werte.length : null);
  return {
    n,
    sieg: siege.length / n,
    siegRunde: schnitt(siege.map(l => l.runden)),
    rest: schnitt(liste.map(l => l.rest)) ?? 0,
    unterHalb: liste.filter(l => l.rest < def.halbUnter).length / n,
    bisZwoelf: siege.filter(l => l.runden <= def.regeln.mittagAb).length / n,
    fuenf: siege.filter(l => l.stehend >= 5).length / n,
    stehend: schnitt(siege.map(l => l.stehend)),
    mitternacht: liste.filter(l => l.mitternacht).length / n,
  };
}

const prozent = (anteil: number): string => `${Math.round(anteil * 100)} %`;
const komma = (zahl: number | null, stellen = 1): string => (zahl === null ? '–' : zahl.toFixed(stellen).replace('.', ','));
const punkte = (anteil: number): string => `${anteil >= 0 ? '+' : '−'}${Math.round(Math.abs(anteil) * 100)}`;
const vonZwanzig = (liste: Lauf[], wie: (l: Lauf) => boolean): string => `${liste.slice(0, 20).filter(wie).length}/20`;

// ── Eichbänder ──

interface Band {
  text: string;
  wert: string;
  ok: boolean;
}
const baender: Band[] = [];
/** Ein Band; `von`/`bis` als Anteil (0,6 = 60 %) */
function band(text: string, wert: number, von: number, bis: number, anzeige = prozent(wert)): void {
  const eps = 1e-9;
  baender.push({ text, wert: anzeige, ok: wert >= von - eps && wert <= bis + eps });
}

// ── Zenits Leben durchprobieren (ohne Bänder) ──

if (LEBEN.length > 0 && STUFE === 'III') {
  console.log(`\nRaid-Eichung Stufe III: Zenits Leben, ${LAEUFE} Läufe je Feld (die Bänder gelten für `
    + `${KUCKUCK.werte.hp.toLocaleString('de-CH')} Leben)\n`);
  console.log('| Leben | anker20 · Gut | anker20 · Profi | anker20 · Lehrbuch | anker20 · Naiv | anker15 · die beste für fünfzehn |');
  console.log('|---|---|---|---|---|---|');
  for (const hp of LEBEN) {
    const mit = { werte: { hp } };
    const [gut, profi, lehrbuch, naiv, fuenfzehn] = [
      aufbauDrei('anker20', 'gut'), aufbauDrei('anker20', 'profi'), aufbauDrei('anker20', 'lehrbuch'), aufbauDrei('anker20', 'naiv'),
      aufbauDrei('anker15', 'fuenfzehn'),
    ].map(a => fasse(laeufe(a, mit), KUCKUCK));
    console.log(`| ${hp.toLocaleString('de-CH')} | ${prozent(gut.sieg)} | ${prozent(profi.sieg)} | ${prozent(lehrbuch.sieg)} | `
      + `${prozent(naiv.sieg)} | ${prozent(fuenfzehn.sieg)} |`);
  }
  console.log(`\nRechenzeit: ${komma(rechenzeit / kaempfe, 2)} ms je Kampf (${kaempfe} Kämpfe)\n`);
  process.exit(0);
}

if (LEBEN.length > 0 && STUFE === 'II') {
  console.log(`\nRaid-Eichung Stufe II: Zenits Leben, ${LAEUFE} Läufe je Feld (die Bänder gelten für `
    + `${DREIZEHN.werte.hp.toLocaleString('de-CH')} Leben)\n`);
  console.log('| Leben | anker15 · Gut | anker15 · Profi | anker15 · Lehrbuch | anker15 · Naiv | Anker · die besten zehn |');
  console.log('|---|---|---|---|---|---|');
  for (const hp of LEBEN) {
    const mit = { werte: { hp } };
    const [gut, profi, lehrbuch, naiv, zehn] = [
      aufbauZwei('anker15', 'gut'), aufbauZwei('anker15', 'profi'), aufbauZwei('anker15', 'lehrbuch'), aufbauZwei('anker15', 'naiv'),
      aufbauZwei('anker', 'zehn'),
    ].map(a => fasse(laeufe(a, mit), DREIZEHN));
    console.log(`| ${hp.toLocaleString('de-CH')} | ${prozent(gut.sieg)} | ${prozent(profi.sieg)} | ${prozent(lehrbuch.sieg)} | `
      + `${prozent(naiv.sieg)} | ${prozent(zehn.sieg)} |`);
  }
  console.log(`\nRechenzeit: ${komma(rechenzeit / kaempfe, 2)} ms je Kampf (${kaempfe} Kämpfe)\n`);
  process.exit(0);
}

if (LEBEN.length > 0) {
  console.log(`\nRaid-Eichung: Zenits Leben, ${LAEUFE} Läufe je Feld (die Bänder gelten für ${ZENIT.werte.hp.toLocaleString('de-CH')} Leben)\n`);
  console.log('| Leben | Anker · Gut | Anker · Profi | Anker · Lehrbuch | Sets +0 · Profi | Anker · Naiv: Zenit < 50 % |');
  console.log('|---|---|---|---|---|---|');
  for (const hp of LEBEN) {
    const mit = { werte: { hp } };
    const [gut, profi, lehrbuch, sets0, naiv] = [
      aufbau('anker', 'gut'), aufbau('anker', 'profi'), aufbau('anker', 'lehrbuch'), aufbau('sets0', 'profi'), aufbau('anker', 'naiv'),
    ].map(a => fasse(laeufe(a, mit)));
    console.log(`| ${hp.toLocaleString('de-CH')} | ${prozent(gut.sieg)} | ${prozent(profi.sieg)} | ${prozent(lehrbuch.sieg)} | ${prozent(sets0.sieg)} | ${prozent(naiv.unterHalb)} |`);
  }
  console.log(`\nRechenzeit: ${komma(rechenzeit / kaempfe, 2)} ms je Kampf (${kaempfe} Kämpfe)\n`);
  process.exit(0);
}

// ── Erste Tabelle: die Gilde in ihren Aufstellungen ──

const ZEILEN: { id: string; titel: string; gilde: RaidMusterName; aufstellung: RaidAufstellungName; ohneHelden?: string[] }[] = [
  { id: 'gut', titel: 'Anker · Gut', gilde: 'anker', aufstellung: 'gut' },
  { id: 'profi', titel: 'Anker · Profi', gilde: 'anker', aufstellung: 'profi' },
  { id: 'lehrbuch', titel: 'Anker · Lehrbuch', gilde: 'anker', aufstellung: 'lehrbuch' },
  { id: 'naiv', titel: 'Anker · Naiv (vorne voll)', gilde: 'anker', aufstellung: 'naiv' },
  { id: 'glocke', titel: 'Anker · Glockenfänger (vier Zähe vorn)', gilde: 'anker', aufstellung: 'glocke' },
  { id: 'halb', titel: 'Anker · alle in die Mitte', gilde: 'anker', aufstellung: 'halb' },
  { id: 'ohneMornGut', titel: 'Anker ohne Morn (9) · Gut', gilde: 'anker', aufstellung: 'gut', ohneHelden: ['Morn'] },
  { id: 'ohneMornProfi', titel: 'Anker ohne Morn (9) · Profi', gilde: 'anker', aufstellung: 'profi', ohneHelden: ['Morn'] },
  { id: 'ohneLiedraProfi', titel: 'Anker ohne Liedra (9) · Profi', gilde: 'anker', aufstellung: 'profi', ohneHelden: ['Liedra'] },
  { id: 'ohneZweiGut', titel: 'Anker ohne Liedra und Morn (8) · Gut', gilde: 'anker', aufstellung: 'gut', ohneHelden: ['Liedra', 'Morn'] },
  { id: 'kern', titel: 'Kern allein (4) · Gut', gilde: 'anker', aufstellung: 'gut', ohneHelden: DIE_SECHS },
  { id: 'sets5gut', titel: 'Sets +5 · Gut', gilde: 'sets5', aufstellung: 'gut' },
  { id: 'sets5profi', titel: 'Sets +5 · Profi', gilde: 'sets5', aufstellung: 'profi' },
  { id: 'sets0profi', titel: 'Sets +0 · Profi', gilde: 'sets0', aufstellung: 'profi' },
  { id: 't4', titel: 'T4 · Gut', gilde: 't4', aufstellung: 'gut' },
];

const roh = new Map<string, Lauf[]>();
const m = new Map<string, Messung>();
const g = (id: string): Messung => m.get(id)!;
if (STUFE_EINS) {
  const w = ZENIT.werte;
  console.log(`\nRaid-Eichung: Zenit ${w.hp.toLocaleString('de-CH')} Leben, Angriff ${w.atk}, Abwehr ${w.def}; `
    + `${LAEUFE} Läufe je Zeile (Samen i · 7919)\n`);
  console.log('| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | ≥ 5 stehen | Ø stehend | Mitternacht |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const zeile of ZEILEN) {
    const liste = laeufe(aufbau(zeile.gilde, zeile.aufstellung, zeile.ohneHelden));
    const x = fasse(liste);
    roh.set(zeile.id, liste);
    m.set(zeile.id, x);
    console.log(`| ${zeile.titel} | ${prozent(x.sieg)} | ${komma(x.siegRunde)} | ${prozent(x.rest)} | ${prozent(x.unterHalb)} | `
      + `${prozent(x.bisZwoelf)} | ${prozent(x.fuenf)} | ${komma(x.stehend)} | ${prozent(x.mitternacht)} |`);
  }
  console.log('\nØ Runde und Ø stehend im Schnitt der Siege; Sieg ≤ R12 und ≥ 5 stehen als Anteil aller Läufe.');

  if (LAEUFE >= 20) {
    const r = (id: string): Lauf[] => roh.get(id)!;
    const rest20 = (id: string): string => prozent(fasse(r(id).slice(0, 20)).rest);
    console.log(`\nMit den 20 Samen des Tests: Gut ${vonZwanzig(r('gut'), l => l.sieg)} (Ø Runde ${komma(fasse(r('gut').slice(0, 20)).siegRunde)}), `
      + `Profi ${vonZwanzig(r('profi'), l => l.sieg)}, Lehrbuch ${vonZwanzig(r('lehrbuch'), l => l.sieg)} (Rest ${rest20('lehrbuch')}), `
      + `Naiv ${vonZwanzig(r('naiv'), l => l.sieg)} (Rest ${rest20('naiv')}, unter 50 % in ${vonZwanzig(r('naiv'), l => l.rest < 0.5)}), `
      + `T4 ${vonZwanzig(r('t4'), l => l.sieg)} (Rest ${rest20('t4')}, unter 50 % in ${vonZwanzig(r('t4'), l => l.rest < 0.5)}), `
      + `Sets +5 Gut ${vonZwanzig(r('sets5gut'), l => l.sieg)} (≥ 5 stehen ${vonZwanzig(r('sets5gut'), l => l.sieg && l.stehend >= 5)}), `
      + `Sets +5 Profi bis R12 ${vonZwanzig(r('sets5profi'), l => l.sieg && l.runden <= 12)}, `
      + `Sets +0 Profi ${vonZwanzig(r('sets0profi'), l => l.sieg)}, Kern ${vonZwanzig(r('kern'), l => l.sieg)} (Rest ${rest20('kern')}).`);
  }

  band('Anker · Gut: Siege 60 bis 75 %', g('gut').sieg, 0.60, 0.75);
  band('Anker · Profi: Siege mindestens 90 %', g('profi').sieg, 0.90, 1);
  band('Anker · Profi: Sieg bis Runde 12 in 20 bis 45 %', g('profi').bisZwoelf, 0.20, 0.45);
  band('Anker · Lehrbuch: Siege höchstens 10 %', g('lehrbuch').sieg, 0, 0.10);
  band('Anker · Naiv: Zenit unter 50 % in 30 bis 70 %', g('naiv').unterHalb, 0.30, 0.70);
  band('Sets +5 · Gut: Siege mindestens 95 %', g('sets5gut').sieg, 0.95, 1);
  band('Sets +5 · Profi: Sieg bis Runde 12 in mindestens 60 %', g('sets5profi').bisZwoelf, 0.60, 1);
  band('Sets +0 · Profi: Siege 25 bis 55 %', g('sets0profi').sieg, 0.25, 0.55);
  const spaetesteZeile = ZEILEN.reduce((a, b) => (g(b.id).mitternacht > g(a.id).mitternacht ? b : a));
  const spaeteste = g(spaetesteZeile.id).mitternacht;
  band('Mitternacht höchstens 2 % in jeder Zeile', spaeteste, 0, 0.02,
    spaeteste > 0 ? `${prozent(spaeteste)} (höchste: ${spaetesteZeile.titel})` : 'in keiner Zeile');

  // ── Zweite Tabelle: je eine Regel aus ──

  console.log(`\nJe eine Regel aus (${LAEUFE} Läufe; Zeiger aus nimmt den Durchschlag mit, Rundenende und Mitternacht bleiben)\n`);
  console.log('| Ohne | Anker · Gut | gegenüber Gut | Zenit-Rest | Anker · Lehrbuch | gegenüber Lehrbuch | Mitternacht |');
  console.log('|---|---|---|---|---|---|---|');
  const zusammen = OHNE.length > 0 ? [OHNE] : [];
  for (const ohne of [...REGELN.map(r => [r]), ...zusammen]) {
    const gut = fasse(laeufe(aufbau('anker', 'gut'), { ohne }));
    const lehrbuch = fasse(laeufe(aufbau('anker', 'lehrbuch'), { ohne }));
    console.log(`| ${ohne.map(r => REGEL_NAME[r]).join(' und ')} | ${prozent(gut.sieg)} | ${punkte(gut.sieg - g('gut').sieg)} | `
      + `${prozent(gut.rest)} | ${prozent(lehrbuch.sieg)} | ${punkte(lehrbuch.sieg - g('lehrbuch').sieg)} | `
      + `${prozent(gut.mitternacht)} / ${prozent(lehrbuch.mitternacht)} |`);
    if (ohne.length !== 1) continue;
    if (ohne[0] === 'heilung') {
      band('ohne Heilregel: Anker · Gut höchstens 5 % Siege', gut.sieg, 0, 0.05);
    } else {
      band(`ohne ${REGEL_NAME[ohne[0]]}: Anker · Gut mindestens 20 Punkte mehr Siege`, gut.sieg - g('gut').sieg, 0.20, 1,
        `${punkte(gut.sieg - g('gut').sieg)} Punkte`);
    }
  }
}

// ── Aufstellungssuche (für --wege und --suche) ──

/** Proben je Schritt der Suche, mit eigenen Samen (100000 + i) · 7919 */
const SUCH_PROBEN = 40;

/**
 * Ab drei Trupps (Stufe II und III) zieht die Suche in drei von zehn Schritten zwei Helden statt einem: Auf Stufe II
 * (15 Helden auf 27 Feldern) blieb sie einzeln stecken (Sina als Schattentänzerin: 33 % nach 300 Schritten; mit zwei
 * Helden 90 % nach 300 und 96 % nach 600). Stufe I zieht wie bisher einen, ihre Funde bleiben gleich.
 */
const ZWEI_HELDEN_ANTEIL = (def: RaidDef): number => (def.truppZahl > 2 ? 0.3 : 0);

/** Ein Held (ab drei Trupps manchmal zwei) auf ein zufälliges Feld; steht dort schon jemand, tauschen die beiden */
function mutiere(aufstellung: Record<string, Feld>, rng: SeededRNG, def: RaidDef = ZENIT): Record<string, Feld> {
  const neu = Object.fromEntries(Object.entries(aufstellung).map(([id, f]) => [id, { ...f }]));
  const ids = Object.keys(neu);
  const anteil = ZWEI_HELDEN_ANTEIL(def);
  const zuege = anteil > 0 && rng.next() < anteil ? 2 : 1;
  for (let zug = 0; zug < zuege; zug++) {
    const id = rng.pick(ids);
    const ziel = { reihe: rng.nextInt(0, def.reihen - 1), spalte: rng.nextInt(0, spaltenZahl(def) - 1) };
    const besetzer = ids.find(k => k !== id && neu[k].reihe === ziel.reihe && neu[k].spalte === ziel.spalte);
    if (besetzer) neu[besetzer] = { ...neu[id] };
    neu[id] = ziel;
  }
  return neu;
}

/** Die Aufstellung als Raster wie in data/raidMuster.ts (Reihe 1 vorn), mit «|» zwischen den Trupps */
function raster(helden: GuildFighter[], aufstellung: Record<string, Feld>, def: RaidDef = ZENIT): string[] {
  return Array.from({ length: def.reihen }, (_, reihe) => {
    const zellen = Array.from({ length: spaltenZahl(def) }, (_, spalte) =>
      (helden.find(h => aufstellung[String(h.id)]?.reihe === reihe && aufstellung[String(h.id)]?.spalte === spalte)?.name ?? '.')
        .padEnd(def.truppZahl > 2 ? 9 : 7));
    const trupps = Array.from({ length: def.truppZahl }, (_, t) => zellen.slice(3 * t, 3 * t + 3).join(''));
    return `  ${trupps.join('| ')}`.trimEnd();
  });
}

/**
 * Schritt für Schritt ab der Aufstellung von `start` (Zufall 4711): je Schritt ein Held auf ein zufälliges Feld; die
 * neue Aufstellung bleibt, wenn sie in den Proben mindestens so gut abschneidet (zuerst Siege, dann Zenits Rest).
 * Gemessen wird die gefundene danach mit den Samen der Tabelle.
 */
function aufstellungsSuche(start: Aufbau, schritte: number): Record<string, Feld> {
  const rng = new SeededRNG(4711);
  const bewerte = (aufstellung: Record<string, Feld>): Messung => fasse(laeufe({ ...start, aufstellung }, {}, SUCH_PROBEN, 100000));
  const besser = (a: Messung, b: Messung): boolean => a.sieg > b.sieg || (a.sieg === b.sieg && a.rest <= b.rest);
  let beste = start.aufstellung;
  let wertung = bewerte(beste);
  for (let schritt = 0; schritt < schritte; schritt++) {
    const neu = mutiere(beste, rng, start.def);
    const neuWertung = bewerte(neu);
    if (besser(neuWertung, wertung)) {
      beste = neu;
      wertung = neuWertung;
    }
  }
  return beste;
}

// ── Je ein Weg anders (--wege) ──

/** Schritte der Suche für einen Weg, mit dem «Profi» unter 90 % bleibt */
const WEG_SUCHE_SCHRITTE = 300;
/**
 * Auf Stufe II und III doppelt so viele: Auf Stufe II lag Sina als Schattentänzerin nach 300 Schritten bei 90 %, knapp
 * am Band
 */
const WEG_SUCHE_SCHRITTE_ZWEI = 600;

if (WEGE && STUFE_EINS) {
  // Bleibt «Profi» mit dem anderen Weg unter 90 %, passt vielleicht nur die Aufstellung nicht: dann sucht das Werkzeug
  // ab «Gut» eine für diese Gilde, und das Band gilt als getroffen, wenn die gefundene mindestens 90 % schafft.
  console.log(`\nJe ein Weg anders als im Anker (${LAEUFE} Läufe; bleibt «Profi» unter 90 %, sucht das Werkzeug ab «Gut» `
    + `eine Aufstellung, ${WEG_SUCHE_SCHRITTE} Schritte zu ${SUCH_PROBEN} Proben)\n`);
  console.log('| Held | Weg | Anker · Gut | Anker · Profi | mit Aufstellungssuche |');
  console.log('|---|---|---|---|---|');
  const funde: string[] = [];
  for (const held of baueRaidGilde('anker').helden) {
    for (const weg of wegeDerKlasse(held.classId)) {
      if (weg.id === held.spezialisierung) continue;
      const mitWeg = (name: RaidAufstellungName): Aufbau => {
        const a = aufbau('anker', name);
        a.helden.find(h => h.name === held.name)!.spezialisierung = weg.id;
        return a;
      };
      const gut = fasse(laeufe(mitWeg('gut')));
      const profi = fasse(laeufe(mitWeg('profi')));
      let gesucht: Messung | null = null;
      if (profi.sieg < 0.90) {
        const start = mitWeg('gut');
        const gefunden: Aufbau = { ...start, aufstellung: aufstellungsSuche(start, WEG_SUCHE_SCHRITTE) };
        gesucht = fasse(laeufe(gefunden));
        funde.push(`${held.name} als ${weg.name}, gefunden ab «Gut»: Sieg ${prozent(gesucht.sieg)}, `
          + `Zenit-Rest ${prozent(gesucht.rest)}, Ø Runde ${komma(gesucht.siegRunde)}`, '', ...raster(gefunden.helden, gefunden.aufstellung), '');
      }
      console.log(`| ${held.name} | ${weg.name} | ${prozent(gut.sieg)} | ${prozent(profi.sieg)} | ${gesucht ? prozent(gesucht.sieg) : '–'} |`);
      band(`Weg ${weg.name} für ${held.name}: Anker · Profi oder mit Aufstellungssuche mindestens 90 %`,
        Math.max(profi.sieg, gesucht?.sieg ?? 0), 0.90, 1,
        gesucht ? `${prozent(profi.sieg)}, mit Aufstellungssuche ${prozent(gesucht.sieg)}` : prozent(profi.sieg));
    }
  }
  if (funde.length > 0) console.log(`\n${funde.join('\n').trimEnd()}`);
}

// ── Aufstellungssuche mit einer Gilde (--suche) ──

if (SUCHE && STUFE_EINS) {
  const SCHRITTE = 200;
  const start = aufbau(SUCHE, 'gut');
  const beste = aufstellungsSuche(start, SCHRITTE);
  const vorher = fasse(laeufe(start));
  const nachher = fasse(laeufe({ ...start, aufstellung: beste }));
  console.log(`\nAufstellungssuche mit ${SUCHE} (${SCHRITTE} Schritte zu ${SUCH_PROBEN} Proben, ab «Gut»; gemessen mit ${LAEUFE} Läufen)\n`);
  for (const zeile of raster(start.helden, beste)) console.log(zeile);
  console.log(`\nVorher («Gut»): Sieg ${prozent(vorher.sieg)}, Zenit-Rest ${prozent(vorher.rest)} · `
    + `nach der Suche: Sieg ${prozent(nachher.sieg)}, Zenit-Rest ${prozent(nachher.rest)}`);
  if (SUCHE === 't4') band('Suche mit T4: Siege höchstens 65 %', nachher.sieg, 0, 0.65);
}

// ── Zenits Truhe gegen einen Lauf bei Orm ──

interface Beute {
  gold: number;
  /** Gold und Grundwert der Gegenstände, ohne Set-Teile und Tagstein */
  wert: number;
  ausruestung: number;
}

function beute(dinge: Record<string, number>): Beute {
  const b: Beute = { gold: 0, wert: 0, ausruestung: 0 };
  for (const [id, menge] of Object.entries(dinge)) {
    if (id === 'gold') {
      b.gold += menge;
      b.wert += menge;
    } else if (!id.startsWith('set_') && id !== 'mat_tagstein') {
      b.wert += (ITEM_DEFS[id]?.baseValue ?? 0) * menge;
      if (ITEM_DEFS[id]?.type === 'gear') b.ausruestung += menge;
    }
  }
  return b;
}

function beuteSchnitt(liste: Beute[]): Beute {
  const schnitt = (feld: keyof Beute): number => liste.reduce((s, b) => s + b[feld], 0) / liste.length;
  return { gold: schnitt('gold'), wert: schnitt('wert'), ausruestung: schnitt('ausruestung') };
}

/** Eine Truhe `ZIEHUNGEN`-mal gezogen, für eine Gilde ohne Set-Teile (es fehlt also immer eins; Samen i · 7919 + 3) */
const ZIEHUNGEN = 4000;
function truhenSchnitt(def: RaidDef, art: 'halb' | 'sieg'): Beute {
  return beuteSchnitt(Array.from({ length: ZIEHUNGEN }, (_, i) => {
    const spiel = createNewGameState();
    spiel.globalStock = {};
    return beute(truheZiehen(spiel, art, def.truhen[art], [], new SeededRNG(i * 7919 + 3)).inhalt);
  }));
}
const ganz = (zahl: number): string => String(Math.round(zahl));
const beuteZeile = (b: Beute): string => `Ø ${ganz(b.wert)} (Gold ${ganz(b.gold)}, Ausrüstung ${komma(b.ausruestung)} Stück)`;

if (STUFE_EINS) {
  const ORM_LAEUFE = 40;
  const truhe = truhenSchnitt(ZENIT, 'sieg');
  // Das Musterteam «Stark» in tagwerk0 durch die Pfeiler des Tages, mit den Samen des Kriegsrats (1000 + i · 7919)
  let siege = 0;
  const lauf = beuteSchnitt(Array.from({ length: ORM_LAEUFE }, (_, i) => {
    const { state, ids } = musterStand('stark', 1000 + i * 7919, 'tagwerk0');
    const run = spieleRoute(state, ids, ZENIT.freiAb, 'klug');
    if (gewonnen(run)) siege++;
    return beute({ ...run.loot, gold: (run.loot.gold ?? 0) + run.goldEarned });
  }));
  console.log('\nZenits Truhe gegen einen Lauf bei Orm (Gold und Grundwert der Gegenstände, ohne Set-Teile und Tagstein)\n');
  console.log(`  Truhe, ${ZIEHUNGEN}-mal gezogen (die Gilde ohne Set-Teile): ${beuteZeile(truhe)}`);
  console.log(`  Lauf, «Stark» in tagwerk0 (${ORM_LAEUFE} Läufe, ${siege} Siege): ${beuteZeile(lauf)}`);
  const wieViele = truhe.wert / lauf.wert;
  band('Zenits Truhe: Wert 1,7 bis 3 Läufe bei Orm', wieViele, 1.7, 3, `${komma(wieViele)} Läufe`);
}

// ── Stufe II: «Die dreizehnte Stunde» (Zenit mit Gegenzeiger, drei Trupps auf neun Spalten) ──

/** Zeilen von Stufe II: die Muster-Gilde mit fünf Lehrlingen (anker15), dazu die besten zehn ohne Lehrlinge */
const ZEILEN_ZWEI: { id: string; titel: string; gilde: RaidMusterName; aufstellung: RaidAufstellungDreizehn }[] = [
  { id: 'gut', titel: 'anker15 · Gut', gilde: 'anker15', aufstellung: 'gut' },
  { id: 'profi', titel: 'anker15 · Profi', gilde: 'anker15', aufstellung: 'profi' },
  { id: 'lehrbuch', titel: 'anker15 · Lehrbuch', gilde: 'anker15', aufstellung: 'lehrbuch' },
  { id: 'naiv', titel: 'anker15 · Naiv (vorne voll)', gilde: 'anker15', aufstellung: 'naiv' },
  { id: 'zehn', titel: 'Anker (10, ohne Lehrlinge) · die besten zehn', gilde: 'anker', aufstellung: 'zehn' },
];
/** Was sich auf Stufe II abschalten lässt: dazu der Gegenzeiger */
const REGELN_ZWEI: Abschaltbar[] = ['pendel', 'zeiger', 'gegenzeiger', 'durchschlag', 'glocke', 'funken', 'mittag', 'heilung'];

if (STUFE_ZWEI) {
  const w2 = DREIZEHN.werte;
  console.log(`\nStufe II, «${DREIZEHN.name}»: ${DREIZEHN.bossName} ${w2.hp.toLocaleString('de-CH')} Leben, Angriff ${w2.atk}, `
    + `Abwehr ${w2.def}, Gegenzeiger × ${komma(DREIZEHN.regeln.gegenzeiger ?? 0)}; ${LAEUFE} Läufe je Zeile (Samen i · 7919)\n`);
  console.log('| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | alle 15 stehen | Ø stehend | Mitternacht |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  const roh2 = new Map<string, Lauf[]>();
  const m2 = new Map<string, Messung>();
  for (const zeile of ZEILEN_ZWEI) {
    const liste = laeufe(aufbauZwei(zeile.gilde, zeile.aufstellung));
    const x = fasse(liste, DREIZEHN);
    roh2.set(zeile.id, liste);
    m2.set(zeile.id, x);
    const alle = liste.filter(l => l.sieg && l.stehend >= DREIZEHN.maxHelden).length / liste.length;
    console.log(`| ${zeile.titel} | ${prozent(x.sieg)} | ${komma(x.siegRunde)} | ${prozent(x.rest)} | ${prozent(x.unterHalb)} | `
      + `${prozent(x.bisZwoelf)} | ${prozent(alle)} | ${komma(x.stehend)} | ${prozent(x.mitternacht)} |`);
  }
  console.log('\nØ Runde und Ø stehend im Schnitt der Siege; Sieg ≤ R12 und alle 15 stehen als Anteil aller Läufe.');
  if (LAEUFE >= 20) {
    const r = (id: string): Lauf[] => roh2.get(id)!;
    const rest20 = (id: string): string => prozent(fasse(r(id).slice(0, 20), DREIZEHN).rest);
    console.log(`\nMit den 20 Samen des Tests: Gut ${vonZwanzig(r('gut'), l => l.sieg)} `
      + `(Ø Runde ${komma(fasse(r('gut').slice(0, 20), DREIZEHN).siegRunde)}), Profi ${vonZwanzig(r('profi'), l => l.sieg)}, `
      + `Lehrbuch ${vonZwanzig(r('lehrbuch'), l => l.sieg)} (Rest ${rest20('lehrbuch')}), `
      + `Naiv ${vonZwanzig(r('naiv'), l => l.sieg)} (Rest ${rest20('naiv')}, unter 50 % in ${vonZwanzig(r('naiv'), l => l.rest < 0.5)}), `
      + `die besten zehn ${vonZwanzig(r('zehn'), l => l.sieg)} (Rest ${rest20('zehn')}).`);
  }
  const g2 = (id: string): Messung => m2.get(id)!;
  band('Stufe II · anker15 · Gut: Siege 55 bis 75 %', g2('gut').sieg, 0.55, 0.75);
  band('Stufe II · anker15 · Profi: Siege mindestens 90 %', g2('profi').sieg, 0.90, 1);
  band('Stufe II · anker15 · Lehrbuch: Siege höchstens 10 %', g2('lehrbuch').sieg, 0, 0.10);
  band('Stufe II · anker15 · Naiv: keine Siege', g2('naiv').sieg, 0, 0);
  band('Stufe II · die besten zehn ohne Lehrlinge: Siege höchstens 15 %', g2('zehn').sieg, 0, 0.15);
  const spaet2 = ZEILEN_ZWEI.reduce((a, b) => (g2(b.id).mitternacht > g2(a.id).mitternacht ? b : a));
  const spaeteste2 = g2(spaet2.id).mitternacht;
  band('Stufe II · Mitternacht höchstens 2 % in jeder Zeile', spaeteste2, 0, 0.02,
    spaeteste2 > 0 ? `${prozent(spaeteste2)} (höchste: ${spaet2.titel})` : 'in keiner Zeile');

  // Je eine Regel aus, mit «Gut»: Der Gegenzeiger muss zählen
  console.log(`\nStufe II, je eine Regel aus (${LAEUFE} Läufe, anker15 · Gut; Zeiger aus nimmt nur den Durchschlag des Zeigers mit)\n`);
  console.log('| Ohne | anker15 · Gut | gegenüber Gut | Zenit-Rest | Mitternacht |');
  console.log('|---|---|---|---|---|');
  for (const regel of REGELN_ZWEI) {
    const gut = fasse(laeufe(aufbauZwei('anker15', 'gut'), { ohne: [regel] }), DREIZEHN);
    console.log(`| ${REGEL_NAME[regel]} | ${prozent(gut.sieg)} | ${punkte(gut.sieg - g2('gut').sieg)} | ${prozent(gut.rest)} | `
      + `${prozent(gut.mitternacht)} |`);
    if (regel === 'gegenzeiger') {
      band('Stufe II · ohne Gegenzeiger: anker15 · Gut mindestens 20 Punkte mehr Siege', gut.sieg - g2('gut').sieg, 0.20, 1,
        `${punkte(gut.sieg - g2('gut').sieg)} Punkte`);
    } else if (regel === 'heilung') {
      band('Stufe II · ohne Heilregel: anker15 · Gut höchstens 5 % Siege', gut.sieg, 0, 0.05);
    }
  }

  // Die dreizehnte Truhe gegen Zenits Truhe (Stufe I)
  const truheEins = truhenSchnitt(ZENIT, 'sieg');
  const truheZwei = truhenSchnitt(DREIZEHN, 'sieg');
  const halbEins = truhenSchnitt(ZENIT, 'halb');
  const halbZwei = truhenSchnitt(DREIZEHN, 'halb');
  console.log('\nTruhen von Stufe II gegen die von Stufe I (Gold und Grundwert der Gegenstände, ohne Set-Teile und Tagstein)\n');
  console.log(`  ${DREIZEHN.truhen.sieg.name}: ${beuteZeile(truheZwei)} · ${ZENIT.truhen.sieg.name}: ${beuteZeile(truheEins)}`);
  console.log(`  ${DREIZEHN.truhen.halb.name}: ${beuteZeile(halbZwei)} · ${ZENIT.truhen.halb.name}: ${beuteZeile(halbEins)}`);
  const mal = truheZwei.wert / truheEins.wert;
  band(`Stufe II · ${DREIZEHN.truhen.sieg.name}: Wert 1,4- bis 2-mal ${ZENIT.truhen.sieg.name}`, mal, 1.4, 2, `${komma(mal)}-mal`);
}

// ── Stufe II: je ein Weg anders (--wege) ──

if (WEGE && STUFE_ZWEI) {
  // Wie auf Stufe I, mit anker15: jeder der fünfzehn einzeln mit dem anderen Weg seiner Klasse, auch die Lehrlinge
  console.log(`\nStufe II, je ein Weg anders als in anker15 (${LAEUFE} Läufe; bleibt «Profi» unter 90 %, sucht das Werkzeug `
    + `ab «Gut» eine Aufstellung, ${WEG_SUCHE_SCHRITTE_ZWEI} Schritte zu ${SUCH_PROBEN} Proben, in drei von zehn zwei Helden)\n`);
  console.log('| Held | Weg | anker15 · Gut | anker15 · Profi | mit Aufstellungssuche |');
  console.log('|---|---|---|---|---|');
  const funde: string[] = [];
  for (const held of baueRaidGilde('anker15').helden) {
    for (const weg of wegeDerKlasse(held.classId)) {
      if (weg.id === held.spezialisierung) continue;
      const mitWeg = (name: RaidAufstellungDreizehn): Aufbau => {
        const a = aufbauZwei('anker15', name);
        a.helden.find(h => h.name === held.name)!.spezialisierung = weg.id;
        return a;
      };
      const gut = fasse(laeufe(mitWeg('gut')), DREIZEHN);
      const profi = fasse(laeufe(mitWeg('profi')), DREIZEHN);
      let gesucht: Messung | null = null;
      if (profi.sieg < 0.90) {
        const start = mitWeg('gut');
        const gefunden: Aufbau = { ...start, aufstellung: aufstellungsSuche(start, WEG_SUCHE_SCHRITTE_ZWEI) };
        gesucht = fasse(laeufe(gefunden), DREIZEHN);
        funde.push(`${held.name} als ${weg.name}, gefunden ab «Gut»: Sieg ${prozent(gesucht.sieg)}, `
          + `Zenit-Rest ${prozent(gesucht.rest)}, Ø Runde ${komma(gesucht.siegRunde)}`, '',
        ...raster(gefunden.helden, gefunden.aufstellung, DREIZEHN), '');
      }
      console.log(`| ${held.name}${held.lehrling ? ' (Lehrling)' : ''} | ${weg.name} | ${prozent(gut.sieg)} | `
        + `${prozent(profi.sieg)} | ${gesucht ? prozent(gesucht.sieg) : '–'} |`);
      band(`Stufe II · Weg ${weg.name} für ${held.name}: anker15 · Profi oder mit Aufstellungssuche mindestens 90 %`,
        Math.max(profi.sieg, gesucht?.sieg ?? 0), 0.90, 1,
        gesucht ? `${prozent(profi.sieg)}, mit Aufstellungssuche ${prozent(gesucht.sieg)}` : prozent(profi.sieg));
    }
  }
  if (funde.length > 0) console.log(`\n${funde.join('\n').trimEnd()}`);
}

// ── Stufe III: «Das Kuckucksei» (Zenit mit Kuckuck, vier Trupps auf zwölf Spalten) ──

/** Zeilen von Stufe III: die Muster-Gilde mit allen zehn Lehrlingen (anker20), dazu die fünfzehn von Stufe II */
const ZEILEN_DREI: { id: string; titel: string; gilde: RaidMusterName; aufstellung: RaidAufstellungKuckuck }[] = [
  { id: 'gut', titel: 'anker20 · Gut', gilde: 'anker20', aufstellung: 'gut' },
  { id: 'profi', titel: 'anker20 · Profi', gilde: 'anker20', aufstellung: 'profi' },
  { id: 'lehrbuch', titel: 'anker20 · Lehrbuch (Ordnung von Stufe II)', gilde: 'anker20', aufstellung: 'lehrbuch' },
  { id: 'naiv', titel: 'anker20 · Naiv (vorne voll)', gilde: 'anker20', aufstellung: 'naiv' },
  { id: 'fuenfzehn', titel: 'anker15 (15) · die beste gesuchte Ordnung', gilde: 'anker15', aufstellung: 'fuenfzehn' },
];
/** Was sich auf Stufe III abschalten lässt: dazu der Kuckuck */
const REGELN_DREI: Abschaltbar[] = ['pendel', 'zeiger', 'gegenzeiger', 'kuckuck', 'glocke', 'funken', 'mittag', 'heilung'];

if (STUFE_DREI) {
  const w3 = KUCKUCK.werte;
  console.log(`\nStufe III, «${KUCKUCK.name}»: ${KUCKUCK.bossName} ${w3.hp.toLocaleString('de-CH')} Leben, Angriff ${w3.atk}, `
    + `Abwehr ${w3.def}, Kuckuck × ${komma(KUCKUCK.regeln.kuckuck ?? 0)}; ${LAEUFE} Läufe je Zeile (Samen i · 7919)\n`);
  console.log('| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | alle 20 stehen | Ø stehend | Mitternacht |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  const roh3 = new Map<string, Lauf[]>();
  const m3 = new Map<string, Messung>();
  for (const zeile of ZEILEN_DREI) {
    const liste = laeufe(aufbauDrei(zeile.gilde, zeile.aufstellung));
    const x = fasse(liste, KUCKUCK);
    roh3.set(zeile.id, liste);
    m3.set(zeile.id, x);
    const alle = liste.filter(l => l.sieg && l.stehend >= KUCKUCK.maxHelden).length / liste.length;
    console.log(`| ${zeile.titel} | ${prozent(x.sieg)} | ${komma(x.siegRunde)} | ${prozent(x.rest)} | ${prozent(x.unterHalb)} | `
      + `${prozent(x.bisZwoelf)} | ${prozent(alle)} | ${komma(x.stehend)} | ${prozent(x.mitternacht)} |`);
  }
  console.log('\nØ Runde und Ø stehend im Schnitt der Siege; Sieg ≤ R12 und alle 20 stehen als Anteil aller Läufe.');
  if (LAEUFE >= 20) {
    const r = (id: string): Lauf[] => roh3.get(id)!;
    const rest20 = (id: string): string => prozent(fasse(r(id).slice(0, 20), KUCKUCK).rest);
    console.log(`\nMit den 20 Samen des Tests: Gut ${vonZwanzig(r('gut'), l => l.sieg)} `
      + `(Ø Runde ${komma(fasse(r('gut').slice(0, 20), KUCKUCK).siegRunde)}), Profi ${vonZwanzig(r('profi'), l => l.sieg)}, `
      + `Lehrbuch ${vonZwanzig(r('lehrbuch'), l => l.sieg)} (Rest ${rest20('lehrbuch')}), `
      + `Naiv ${vonZwanzig(r('naiv'), l => l.sieg)} (Rest ${rest20('naiv')}), `
      + `fünfzehn ${vonZwanzig(r('fuenfzehn'), l => l.sieg)} (Rest ${rest20('fuenfzehn')}).`);
  }
  const g3 = (id: string): Messung => m3.get(id)!;
  band('Stufe III · anker20 · Gut: Siege 55 bis 75 %', g3('gut').sieg, 0.55, 0.75);
  band('Stufe III · anker20 · Profi: Siege mindestens 90 %', g3('profi').sieg, 0.90, 1);
  band('Stufe III · anker20 · Lehrbuch: Siege höchstens 10 %', g3('lehrbuch').sieg, 0, 0.10);
  band('Stufe III · anker20 · Naiv: keine Siege', g3('naiv').sieg, 0, 0);
  band('Stufe III · fünfzehn (anker15) in der besten gesuchten Ordnung: Siege höchstens 10 %', g3('fuenfzehn').sieg, 0, 0.10);
  const spaet3 = ZEILEN_DREI.reduce((a, b) => (g3(b.id).mitternacht > g3(a.id).mitternacht ? b : a));
  const spaeteste3 = g3(spaet3.id).mitternacht;
  band('Stufe III · Mitternacht höchstens 2 % in jeder Zeile', spaeteste3, 0, 0.02,
    spaeteste3 > 0 ? `${prozent(spaeteste3)} (höchste: ${spaet3.titel})` : 'in keiner Zeile');

  // Je eine Regel aus, mit «Gut»: Der Kuckuck muss zählen
  console.log(`\nStufe III, je eine Regel aus (${LAEUFE} Läufe, anker20 · Gut; Zeiger aus nimmt nur den Durchschlag des Zeigers mit)\n`);
  console.log('| Ohne | anker20 · Gut | gegenüber Gut | anker20 · Lehrbuch | Zenit-Rest | Mitternacht |');
  console.log('|---|---|---|---|---|---|');
  for (const regel of REGELN_DREI) {
    const gut = fasse(laeufe(aufbauDrei('anker20', 'gut'), { ohne: [regel] }), KUCKUCK);
    const lehrbuch = fasse(laeufe(aufbauDrei('anker20', 'lehrbuch'), { ohne: [regel] }), KUCKUCK);
    console.log(`| ${REGEL_NAME[regel]} | ${prozent(gut.sieg)} | ${punkte(gut.sieg - g3('gut').sieg)} | ${prozent(lehrbuch.sieg)} | `
      + `${prozent(gut.rest)} | ${prozent(gut.mitternacht)} |`);
    if (regel === 'kuckuck') {
      band('Stufe III · ohne Kuckuck: anker20 · Gut mindestens 15 Punkte mehr Siege', gut.sieg - g3('gut').sieg, 0.15, 1,
        `${punkte(gut.sieg - g3('gut').sieg)} Punkte`);
    } else if (regel === 'heilung') {
      band('Stufe III · ohne Heilregel: anker20 · Gut höchstens 5 % Siege', gut.sieg, 0, 0.05);
    }
  }

  // Das Nest gegen die dreizehnte Truhe (Stufe II)
  const truheZwei = truhenSchnitt(DREIZEHN, 'sieg');
  const truheDrei = truhenSchnitt(KUCKUCK, 'sieg');
  const halbZwei = truhenSchnitt(DREIZEHN, 'halb');
  const halbDrei = truhenSchnitt(KUCKUCK, 'halb');
  console.log('\nTruhen von Stufe III gegen die von Stufe II (Gold und Grundwert der Gegenstände, ohne Set-Teile und Tagstein)\n');
  console.log(`  ${KUCKUCK.truhen.sieg.name}: ${beuteZeile(truheDrei)} · ${DREIZEHN.truhen.sieg.name}: ${beuteZeile(truheZwei)}`);
  console.log(`  ${KUCKUCK.truhen.halb.name}: ${beuteZeile(halbDrei)} · ${DREIZEHN.truhen.halb.name}: ${beuteZeile(halbZwei)}`);
  const mal3 = truheDrei.wert / truheZwei.wert;
  band(`Stufe III · ${KUCKUCK.truhen.sieg.name}: Wert 1,2- bis 1,6-mal ${DREIZEHN.truhen.sieg.name}`, mal3, 1.2, 1.6, `${komma(mal3)}-mal`);
}

// ── Stufe III: je ein Weg anders (--wege) ──

/** Der Weg, den Stufe III braucht (siehe unten): die Meuchlerin, Meister oder Lehrling */
const MEUCHLERIN = 'assassin_meuchlerin';

if (WEGE && STUFE_DREI) {
  // Wie auf Stufe II, mit anker20: jeder der zwanzig einzeln mit dem anderen Weg seiner Klasse, auch die Lehrlinge.
  // Die Suche beginnt hier bei «Profi»: Mit zwanzig Helden auf 36 Feldern braucht schon «Gut» eine andere Ordnung,
  // und gefragt ist, ob die gesuchte Ordnung der Stufe sich an einen anderen Weg anpassen lässt.
  console.log(`\nStufe III, je ein Weg anders als in anker20 (${LAEUFE} Läufe; bleibt «Profi» unter 90 %, sucht das Werkzeug `
    + `ab «Profi» eine Aufstellung, ${WEG_SUCHE_SCHRITTE_ZWEI} Schritte zu ${SUCH_PROBEN} Proben, in drei von zehn zwei Helden)\n`);
  console.log('| Held | Weg | anker20 · Gut | anker20 · Profi | mit Aufstellungssuche |');
  console.log('|---|---|---|---|---|');
  const funde: string[] = [];
  for (const held of baueRaidGilde('anker20').helden) {
    for (const weg of wegeDerKlasse(held.classId)) {
      if (weg.id === held.spezialisierung) continue;
      const mitWeg = (name: RaidAufstellungKuckuck): Aufbau => {
        const a = aufbauDrei('anker20', name);
        a.helden.find(h => h.name === held.name)!.spezialisierung = weg.id;
        return a;
      };
      const gut = fasse(laeufe(mitWeg('gut')), KUCKUCK);
      const profi = fasse(laeufe(mitWeg('profi')), KUCKUCK);
      let gesucht: Messung | null = null;
      if (profi.sieg < 0.90) {
        const start = mitWeg('profi');
        const gefunden: Aufbau = { ...start, aufstellung: aufstellungsSuche(start, WEG_SUCHE_SCHRITTE_ZWEI) };
        gesucht = fasse(laeufe(gefunden), KUCKUCK);
        funde.push(`${held.name} als ${weg.name}, gefunden ab «Profi»: Sieg ${prozent(gesucht.sieg)}, `
          + `Zenit-Rest ${prozent(gesucht.rest)}, Ø Runde ${komma(gesucht.siegRunde)}`, '',
        ...raster(gefunden.helden, gefunden.aufstellung, KUCKUCK), '');
      }
      console.log(`| ${held.name}${held.lehrling ? ' (Lehrling)' : ''} | ${weg.name} | ${prozent(gut.sieg)} | `
        + `${prozent(profi.sieg)} | ${gesucht ? prozent(gesucht.sieg) : '–'} |`);
      // Stufe III braucht eine Meuchlerin (ihr Meister-Effekt trägt den Schaden, wenn Zenit unter 60 % ist): Nimmt der
      // Wechsel der Gilde die einzige, gilt 60 % statt 90 %, und der Tausch unten (der Lehrling nimmt den Weg) 90 %
      const ohneMeuchlerin = !mitWeg('profi').helden.some(h => h.spezialisierung === MEUCHLERIN);
      const mindestens = ohneMeuchlerin ? 0.60 : 0.90;
      band(`Stufe III · Weg ${weg.name} für ${held.name}: anker20 · Profi oder mit Aufstellungssuche mindestens `
        + `${prozent(mindestens)}${ohneMeuchlerin ? ' (danach ohne Meuchlerin)' : ''}`,
        Math.max(profi.sieg, gesucht?.sieg ?? 0), mindestens, 1,
        gesucht ? `${prozent(profi.sieg)}, mit Aufstellungssuche ${prozent(gesucht.sieg)}` : prozent(profi.sieg));
    }
  }
  if (funde.length > 0) console.log(`\n${funde.join('\n').trimEnd()}`);

  // Der Tausch: Sina als Schattentänzerin, Nix (Lehrling) als Meuchlerin; so behält die Gilde ihre Meuchlerin
  const tausch = (name: RaidAufstellungKuckuck): Aufbau => {
    const a = aufbauDrei('anker20', name);
    a.helden.find(h => h.name === 'Sina')!.spezialisierung = 'assassin_schattentaenzerin';
    a.helden.find(h => h.name === 'Nix')!.spezialisierung = MEUCHLERIN;
    return a;
  };
  const tauschProfi = fasse(laeufe(tausch('profi')), KUCKUCK);
  let tauschGesucht: Messung | null = null;
  if (tauschProfi.sieg < 0.90) {
    const start = tausch('profi');
    const gefunden: Aufbau = { ...start, aufstellung: aufstellungsSuche(start, WEG_SUCHE_SCHRITTE_ZWEI) };
    tauschGesucht = fasse(laeufe(gefunden), KUCKUCK);
    console.log(`\nTausch: Sina als Schattentänzerin, Nix als Meuchlerin, gefunden ab «Profi»: Sieg ${prozent(tauschGesucht.sieg)}, `
      + `Zenit-Rest ${prozent(tauschGesucht.rest)}, Ø Runde ${komma(tauschGesucht.siegRunde)}\n`);
    for (const zeile of raster(gefunden.helden, gefunden.aufstellung, KUCKUCK)) console.log(zeile);
  } else {
    console.log(`\nTausch: Sina als Schattentänzerin, Nix als Meuchlerin: Profi ${prozent(tauschProfi.sieg)}`);
  }
  band('Stufe III · Tausch (Sina Schattentänzerin, Nix Meuchlerin): Profi oder mit Aufstellungssuche mindestens 90 %',
    Math.max(tauschProfi.sieg, tauschGesucht?.sieg ?? 0), 0.90, 1,
    tauschGesucht ? `${prozent(tauschProfi.sieg)}, mit Aufstellungssuche ${prozent(tauschGesucht.sieg)}` : prozent(tauschProfi.sieg));
}

// ── Die besten zehn neu suchen (--suche zehn) ──

if (ZEHN_SUCHE && STUFE_ZWEI) {
  const SCHRITTE = 600;
  const start = aufbauZwei('anker', 'zehn');
  const beste = aufstellungsSuche(start, SCHRITTE);
  const vorher = fasse(laeufe(start), DREIZEHN);
  const nachher = fasse(laeufe({ ...start, aufstellung: beste }), DREIZEHN);
  console.log(`\nStufe II, Aufstellungssuche mit den zehn des Ankers (${SCHRITTE} Schritte zu ${SUCH_PROBEN} Proben, ab «zehn»; `
    + `gemessen mit ${LAEUFE} Läufen)\n`);
  for (const zeile of raster(start.helden, beste, DREIZEHN)) console.log(zeile);
  console.log(`\nVorher («zehn»): Sieg ${prozent(vorher.sieg)}, Zenit-Rest ${prozent(vorher.rest)} · `
    + `nach der Suche: Sieg ${prozent(nachher.sieg)}, Zenit-Rest ${prozent(nachher.rest)}`);
  band('Stufe II · Suche mit den zehn des Ankers: Siege höchstens 15 %', nachher.sieg, 0, 0.15);
}

// ── Ergebnis ──

console.log('\nEichbänder (docs/RAID.md)\n');
for (const b of baender) console.log(`${b.ok ? '✓' : '✗'} ${b.text}: ${b.wert}`);
const verfehlt = baender.filter(b => !b.ok).length;
console.log(`\n${verfehlt === 0 ? 'Alle Bänder getroffen.' : `${verfehlt} von ${baender.length} Bändern verfehlt.`} `
  + `Rechenzeit: ${komma(rechenzeit / kaempfe, 2)} ms je Kampf (${kaempfe} Kämpfe).\n`);
if (verfehlt > 0) process.exit(1);
