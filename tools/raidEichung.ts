// ─── Magic City – Eichung des Raids «Über dem Tag» ──────────────
// Rechnet Zenit (src/data/raids.ts) gegen die Muster-Gilde (src/data/raidMuster.ts) in ihren Aufstellungen,
// je Zeile 400 Kämpfe mit den Samen i · 7919; die ersten 20 sind die von tests/raid.test.ts. Die erste
// Tabelle zeigt Siege, Siegrunde, Zenits Rest, wie oft Zenit unter die Hälfte kam, Siege bis Runde 12,
// Siege mit fünf oder mehr Stehenden, wie viele beim Sieg noch stehen und Mitternacht; die zweite schaltet
// je eine Regel ab (Ablation). Darunter die Eichbänder aus docs/RAID.md mit ✓ oder ✗: Ist eines verfehlt,
// endet das Werkzeug mit 1. Zum Schluss vergleicht es Zenits Truhe mit einem Lauf bei Orm (Gold und Grundwert
// der Gegenstände). Nach Änderungen an Kampf, Klassen, Wegen, Sets, Schmiede, Beute oder an Zenit neu laufen
// lassen und die Tabellen in docs/RAID.md nachführen. Stellschraube zuerst Zenits Leben, in Schritten von 250,
// erst danach Wuchten oder Heilfaktor.
// Aufruf: npm run raid-eichung
//         mehr Läufe:                  npm run raid-eichung -- --laeufe 1000
//         Zenits Leben durchprobieren: npm run raid-eichung -- --leben 13500,14000,14500   (ohne Bänder)
//         Regeln zusammen abschalten:  npm run raid-eichung -- --ohne glocke,funken       (eine Zeile mehr)
//         je ein Weg anders:           npm run raid-eichung -- --wege                     (Profi ≥ 90 %, sonst
//                                      eine Aufstellungssuche ab «Gut», 300 Schritte, mit ≥ 90 %)
//         Aufstellungssuche:           npm run raid-eichung -- --suche t4                 (T4 ≤ 65 %)
// ────────────────────────────────────────────────────────────────

import { ITEM_DEFS } from '../src/data/items';
import { ZENIT } from '../src/data/raids';
import { RaidAufstellungName, RaidMusterName, baueRaidGilde, raidMusterAufstellung } from '../src/data/raidMuster';
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
  pendel: 'Pendel', zeiger: 'Zeiger (mit Durchschlag)', durchschlag: 'Durchschlag', glocke: 'Glocke', funken: 'Funken',
  mittag: 'Mittag', heilung: 'Heilregel', rest: 'Rundenende', mitternacht: 'Mitternacht',
};
const GILDEN: RaidMusterName[] = ['anker', 'sets5', 'sets0', 't4', 'kern'];
const DIE_SECHS = ['Ansgar', 'Ewin', 'Moos', 'Liedra', 'Ysra', 'Morn'];

// ── Aufruf ──

const ARGUMENTE = process.argv.slice(2);
const MIT_WERT = ['--laeufe', '--leben', '--ohne'];

function abbruch(text: string): never {
  console.error(text);
  console.error('Aufruf: npm run raid-eichung -- [--laeufe 400] [--leben 13500,14500] [--ohne glocke,funken] [--wege] [--suche t4]');
  process.exit(1);
}

for (let i = 0; i < ARGUMENTE.length; i++) {
  const a = ARGUMENTE[i];
  if (MIT_WERT.includes(a)) {
    if (ARGUMENTE[i + 1] === undefined) abbruch(`${a} braucht einen Wert.`);
    i++;
  } else if (a === '--suche') {
    if (GILDEN.includes(ARGUMENTE[i + 1] as RaidMusterName)) i++;
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
const SUCHE: RaidMusterName | null = ARGUMENTE.includes('--suche')
  ? (GILDEN.find(g => g === wertVon('--suche')) ?? 't4')
  : null;

// ── Messen ──

interface Aufbau {
  helden: GuildFighter[];
  stufen: SchmiedeStufen;
  aufstellung: Record<string, Feld>;
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

/** `anzahl` Kämpfe mit den Samen (versatz + i) · 7919 */
function laeufe(a: Aufbau, optionen: RaidOptionen = {}, anzahl = LAEUFE, versatz = 0): Lauf[] {
  const t0 = performance.now();
  const liste = Array.from({ length: anzahl }, (_, i) => {
    const r = raidKampf(ZENIT, a.helden, a.stufen, a.aufstellung, (versatz + i) * 7919, { knapp: true, ...optionen });
    return { sieg: r.sieg, runden: r.runden, rest: r.zenitRest, stehend: r.stehend, mitternacht: r.mitternacht };
  });
  rechenzeit += performance.now() - t0;
  kaempfe += anzahl;
  return liste;
}

function fasse(liste: Lauf[]): Messung {
  const n = liste.length;
  const siege = liste.filter(l => l.sieg);
  const schnitt = (werte: number[]): number | null => (werte.length > 0 ? werte.reduce((s, w) => s + w, 0) / werte.length : null);
  return {
    n,
    sieg: siege.length / n,
    siegRunde: schnitt(siege.map(l => l.runden)),
    rest: schnitt(liste.map(l => l.rest)) ?? 0,
    unterHalb: liste.filter(l => l.rest < ZENIT.halbUnter).length / n,
    bisZwoelf: siege.filter(l => l.runden <= ZENIT.regeln.mittagAb).length / n,
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

const w = ZENIT.werte;
console.log(`\nRaid-Eichung: Zenit ${w.hp.toLocaleString('de-CH')} Leben, Angriff ${w.atk}, Abwehr ${w.def}; `
  + `${LAEUFE} Läufe je Zeile (Samen i · 7919)\n`);
console.log('| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | ≥ 5 stehen | Ø stehend | Mitternacht |');
console.log('|---|---|---|---|---|---|---|---|---|');
const roh = new Map<string, Lauf[]>();
const m = new Map<string, Messung>();
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

const g = (id: string): Messung => m.get(id)!;
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

// ── Aufstellungssuche (für --wege und --suche) ──

/** Proben je Schritt der Suche, mit eigenen Samen (100000 + i) · 7919 */
const SUCH_PROBEN = 40;

/** Ein Held auf ein zufälliges Feld; steht dort schon jemand, tauschen die beiden */
function mutiere(aufstellung: Record<string, Feld>, rng: SeededRNG): Record<string, Feld> {
  const neu = Object.fromEntries(Object.entries(aufstellung).map(([id, f]) => [id, { ...f }]));
  const ids = Object.keys(neu);
  const id = rng.pick(ids);
  const ziel = { reihe: rng.nextInt(0, ZENIT.reihen - 1), spalte: rng.nextInt(0, spaltenZahl(ZENIT) - 1) };
  const besetzer = ids.find(k => k !== id && neu[k].reihe === ziel.reihe && neu[k].spalte === ziel.spalte);
  if (besetzer) neu[besetzer] = { ...neu[id] };
  neu[id] = ziel;
  return neu;
}

/** Die Aufstellung als Raster wie in data/raidMuster.ts (Reihe 1 vorn) */
function raster(helden: GuildFighter[], aufstellung: Record<string, Feld>): string[] {
  return Array.from({ length: ZENIT.reihen }, (_, reihe) => {
    const zellen = Array.from({ length: spaltenZahl(ZENIT) }, (_, spalte) =>
      (helden.find(h => aufstellung[String(h.id)]?.reihe === reihe && aufstellung[String(h.id)]?.spalte === spalte)?.name ?? '.')
        .padEnd(7));
    return `  ${zellen.slice(0, 3).join('')}| ${zellen.slice(3).join('')}`.trimEnd();
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
    const neu = mutiere(beste, rng);
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

if (WEGE) {
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

if (SUCHE) {
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

{
  const ZIEHUNGEN = 4000;
  const ORM_LAEUFE = 40;
  // Die Gilde hat kein Set-Teil, es fehlt also immer eins (Samen i · 7919 + 3)
  const truhe = beuteSchnitt(Array.from({ length: ZIEHUNGEN }, (_, i) => {
    const spiel = createNewGameState();
    spiel.globalStock = {};
    return beute(truheZiehen(spiel, 'sieg', ZENIT.truhen.sieg, [], new SeededRNG(i * 7919 + 3)).inhalt);
  }));
  // Das Musterteam «Stark» in tagwerk0 durch die Pfeiler des Tages, mit den Samen des Kriegsrats (1000 + i · 7919)
  let siege = 0;
  const lauf = beuteSchnitt(Array.from({ length: ORM_LAEUFE }, (_, i) => {
    const { state, ids } = musterStand('stark', 1000 + i * 7919, 'tagwerk0');
    const run = spieleRoute(state, ids, ZENIT.freiAb, 'klug');
    if (gewonnen(run)) siege++;
    return beute({ ...run.loot, gold: (run.loot.gold ?? 0) + run.goldEarned });
  }));
  const ganz = (zahl: number): string => String(Math.round(zahl));
  const zeile = (b: Beute): string => `Ø ${ganz(b.wert)} (Gold ${ganz(b.gold)}, Ausrüstung ${komma(b.ausruestung)} Stück)`;
  console.log('\nZenits Truhe gegen einen Lauf bei Orm (Gold und Grundwert der Gegenstände, ohne Set-Teile und Tagstein)\n');
  console.log(`  Truhe, ${ZIEHUNGEN}-mal gezogen (die Gilde ohne Set-Teile): ${zeile(truhe)}`);
  console.log(`  Lauf, «Stark» in tagwerk0 (${ORM_LAEUFE} Läufe, ${siege} Siege): ${zeile(lauf)}`);
  const wieViele = truhe.wert / lauf.wert;
  band('Zenits Truhe: Wert 1,7 bis 3 Läufe bei Orm', wieViele, 1.7, 3, `${komma(wieViele)} Läufe`);
}

// ── Ergebnis ──

console.log('\nEichbänder (docs/RAID.md)\n');
for (const b of baender) console.log(`${b.ok ? '✓' : '✗'} ${b.text}: ${b.wert}`);
const verfehlt = baender.filter(b => !b.ok).length;
console.log(`\n${verfehlt === 0 ? 'Alle Bänder getroffen.' : `${verfehlt} von ${baender.length} Bändern verfehlt.`} `
  + `Rechenzeit: ${komma(rechenzeit / kaempfe, 2)} ms je Kampf (${kaempfe} Kämpfe).\n`);
if (verfehlt > 0) process.exit(1);
