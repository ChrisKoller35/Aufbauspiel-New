// ─── Magic City – Raid «Über dem Tag»: der Bildschirm ───────────
// Ganz oben über der Dungeon-Karte (Knoten in DungeonMapScreen.ts). Zwei Stufen mit eigenem Stand: Stufe I «Über dem
// Tag», Stufe II «Die dreizehnte Stunde» (offen nach dem ersten Sieg auf Stufe I); umgeschaltet wird am PC links über
// Alrunas Liste, am Handy ganz oben. Am PC drei Spalten: links Alrunas Liste und der Kriegsrat, in der Mitte Zenit (Uhr,
// Lebensbalken mit den bisherigen Versuchen, Wochentruhen), die Uhrleiste (wann was wo schlägt, auf Stufe II
// auch der Gegenzeiger), das Feld mit 3 Reihen × 6 Spalten in zwei Trupps (Stufe II: × 9 in drei) und die zwei
// Knöpfe, rechts die Bank. Am Handy steht alles untereinander, der Kriegsrat kommt als Fenster (raid.css).
// Aufstellen: Held antippen, dann Feld (besetzt: die beiden tauschen), «Auf die Bank» oder die Bank nimmt ihn zurück;
// am PC lassen sich Helden auch ziehen. Lange drücken oder Rechtsklick zeigt sein Blatt. Darüberfahren (antippen) auf
// einem Punkt der Liste leuchtet die Felder, um die es geht.
// Ein Ernstkampf wird beim Klick gerechnet und gebucht (Raid.ts ernstkampf) und sofort gespeichert; danach zeigen die
// Wiedergabe, die Truhe (ChestRevealOverlay) und das Ergebnis, was geschah. Der Kriegsrat rechnet seine 20 Proben in
// Häppchen (KriegsratFenster.rechneImHintergrund) und hört auf, sobald sich die Aufstellung ändert. Fenster liegen im
// Bildschirm (.r-ov, position: fixed), nie zwei übereinander. Texte: data/raids.ts RAID_TEXTE, Regeln: docs/RAID.md.
// ────────────────────────────────────────────────────────────────

import '../html/raid.css';
import { GameState } from '../../models/GameState';
import type { GuildFighter } from '../../models/GuildRoster';
import type { CombatUnit } from '../../models/ExpeditionRun';
import type { Feld, RaidStand } from '../../models/RaidStand';
import {
  RAID_DEFS, RAID_STUFEN, RAID_TEXTE, RaidDef, SPALTEN_JE_TRUPP, ZENIT, spaltenName, stufenTexte, truppKlein, truppName,
} from '../../data/raids';
import { CLASS_DEFS } from '../../data/classes';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { getSpezialisierung } from '../../data/spezialisierungen';
import { setTeilIds, setVonItem } from '../../data/dungeonSets';
import { getrageneSets } from '../../systems/DungeonSets';
import { erfolgBilanzZeile, erfolgePruefen } from '../../systems/AchievementSystem';
import { CombatEngine } from '../../systems/CombatEngine';
import { GearSystem } from '../../systems/GearSystem';
import { SchmiedeStufen, schmiedeStufen } from '../../systems/Schmiede';
import {
  ErnstkampfErgebnis, KRIEGSRAT_PROBEN, RaidLage, RaidRat, RaidRolle, VersuchsLage, aufstellungLeeren,
  ernstkampf, freiDieseWoche, gespeicherterStand, montagSatz, raidKartenZustand, raidKriegsrat, raidLage, raidOffen,
  raidRolle, raidStand, ratSchluessel, restProzent, setzeHeld, versuchsLage,
} from '../../systems/Raid';
import {
  RaidErgebnis, RaidEreignis, RaidRunde, Regel, gegenzeigerSpalte, hauptursache, pendelTrupp, spaltenZahl, treffpunkte,
  truppVon, zeigerSpalte,
} from '../../systems/RaidKampf';
import { ScreenId, navigateTo } from '../ScreenRouter';
import { aktualisiereErfolgKnoepfe, renderHeader, zeigeKopfHinweis } from './HeaderRenderer';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { haeppchenweise, rechneImHintergrund } from '../components/KriegsratFenster';
import { geschichtsText } from '../components/GeschichtsAnzeige';
import { showChestReveal } from '../components/ChestRevealOverlay';
import { TruheAnlegen } from '../components/TruheAnlegen';
import {
  ANGEHALTEN, AUF_ZWOELF, KURZ_VOR_DREIZEHN, KURZ_VOR_ZWOELF, UhrStellung, stundeAufRunde, zeigerAufSpalte, zenitUhrSvg,
} from '../components/ZenitUhr';
import { BildTraeger, bildKarte } from '../heldBild';

const t = RAID_TEXTE.bildschirm;
const L = RAID_TEXTE.liste;
const K = RAID_TEXTE.kriegsrat;
const W = RAID_TEXTE.lauf;
const E = RAID_TEXTE.ergebnis;

/** Eine Runde der Wiedergabe dauert bei 1× so lange */
const RUNDE_MS = 1400;
/** So lange drücken, bis das Blatt eines Helden aufgeht */
const LANG_MS = 520;

// ── Zustand der Seite (nicht im Spielstand) ──

let gameState: GameState | null = null;
/** Gewählter Held: antippen, dann Feld */
let gewaehlt: number | null = null;
/** Die gezeigte Stufe (Umschalter oben); bis zur ersten Wahl die höchste offene */
let stufeId: string | null = null;
/** Alrunas Liste am Handy mit allen Punkten, nicht nur den Warnungen */
let listeAlle = false;
/** Der letzte fertige Kriegsrat je Stufe; er gilt, solange die Aufstellung gleich bleibt */
const letzteRaete = new Map<string, RaidRat>();
/** Ein Kriegsrat, der gerade rechnet (für welche Stufe und Aufstellung) */
let ratLauf: { schluessel: string; def: RaidDef } | null = null;
/** Tempo der Wiedergabe (1×, 2×, 4×) */
let tempo = 1;
let hoererGebunden = false;
let speichernTimer: ReturnType<typeof setTimeout> | null = null;
/** «Leeren» fragt einmal nach: so lange steht «Wirklich leeren?» da */
let leerenBis = 0;
/** Die Punkte der Liste, wie zuletzt gezeichnet (Darüberfahren leuchtet ihre Felder) */
let aktuelleHinweise: RaidLage['hinweise'] = [];
/** Langes Drücken auf einen Helden */
let druck: { timer: ReturnType<typeof setTimeout>; x: number; y: number } | null = null;
let langGedrueckt = false;
/** Held, der gerade gezogen wird (PC) */
let gezogen: number | null = null;

export function initRaidScreen(state: GameState): void {
  gameState = state;
  // Ein anderer Spielstand: wieder die höchste offene Stufe, kein alter Kriegsrat
  stufeId = null;
  letzteRaete.clear();
  ratLauf = null;
}

// ── Kleine Helfer ──

const esc = (text: string): string =>
  text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const ic = (id: string, klasse = ''): string => `<svg class="i ${klasse}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const ROLLE_IC: Record<RaidRolle, string> = { tank: 'schild', heil: 'kreuz', dps: 'klinge', stuetze: 'note' };
/** Reihenfolge der Bank: erst die Pendelfänger, dann Heiler, Stützen, Schaden */
const ROLLEN_FOLGE: RaidRolle[] = ['tank', 'heil', 'stuetze', 'dps'];
const REGEL_IC: Partial<Record<Regel, string>> = {
  pendel: 'pendel', zeiger: 'zeiger', gegenzeiger: 'gegen', durchschlag: 'zeiger', glocke: 'glocke', funken: 'funken',
  mitternacht: 'zeiger',
};
const feldName = (f: Feld): string => `${spaltenName(f.spalte)}${f.reihe + 1}`;
/** Bild eines Helden als Hintergrund (der Lehrling gespiegelt: heldBild.ts); `klasse` kommt dazu */
const heldBildDiv = (held: BildTraeger, tag = 'div', klasse = 'r-bild'): string => {
  const b = bildKarte(held);
  return `<${tag} class="${klasse}${b.klasse ? ` ${b.klasse}` : ''}" style="${b.stil}"></${tag}>`;
};
const bild = (key: string): string => `assets/sprites/final/${key}.png`;
const zahl = (n: number): string => Math.round(n).toLocaleString('de-CH');
const komma = (n: number): string => n.toFixed(1).replace('.', ',');
const klassenName = (classId: string): string => CLASS_DEFS[classId]?.name ?? classId;
const istHandy = (): boolean => window.matchMedia('(max-width: 700px)').matches;
/** Spalte des Felds im Gitter: Spalte 1 sind die Reihenköpfe, zwischen den Trupps liegt der Gang */
const gitterSpalte = (spalte: number): number => spalte + 2 + truppVon({ reihe: 0, spalte });
const tagstein = (def: RaidDef): number => def.kostenJeVersuch.mat_tagstein ?? 0;
const bildschirm = (): HTMLElement | null => document.getElementById('s-raid');
const hatGegenzeiger = (def: RaidDef): boolean => def.regeln.gegenzeiger !== undefined;
/** Name im Feld; lange Namen rücken in den schmalen Spalten von Stufe II am Handy enger zusammen (raid.css) */
const nameKlasse = (name: string, def: RaidDef): string => (def.truppZahl === 3 && name.length >= 7 ? 'r-name r-lang' : 'r-name');

/** Die Uhr: kurz vor zwölf, diese Woche besiegt auf zwölf; auf Stufe II mit dem Gegenzeiger (vor dreizehn, angehalten) */
function uhrStellung(def: RaidDef, besiegt: boolean): UhrStellung {
  if (hatGegenzeiger(def)) return besiegt ? ANGEHALTEN : KURZ_VOR_DREIZEHN;
  return besiegt ? AUF_ZWOELF : KURZ_VOR_ZWOELF;
}

/** Die gezeigte Stufe: die gewählte, sonst die höchste offene */
function aktuelleStufe(state: GameState): RaidDef {
  const gewaehlteStufe = RAID_STUFEN.find(d => d.id === stufeId);
  if (gewaehlteStufe) return gewaehlteStufe;
  const def = [...RAID_STUFEN].reverse().find(d => raidOffen(state, d)) ?? ZENIT;
  stufeId = def.id;
  return def;
}

/** Kampfwerte aller Helden der Gilde (Ausrüstung, Sets, Schmiede, Weg) */
function kampfwerte(state: GameState): Map<number, CombatUnit> {
  const engine = new CombatEngine(new GearSystem());
  const stufen = schmiedeStufen(state);
  return new Map(state.fighters.map(f => [f.id, engine.fighterToCombatUnit(f, stufen)]));
}

/** Gleich speichern (nach einem Ernstkampf) oder kurz nach der letzten Änderung (Aufstellung) */
function speichern(sofort = false): void {
  if (speichernTimer) clearTimeout(speichernTimer);
  speichernTimer = null;
  const los = (): void => { window.dispatchEvent(new Event('mc:speichern')); };
  if (sofort) los();
  else speichernTimer = setTimeout(() => { speichernTimer = null; los(); }, 1200);
}

/** Symbole des Raids, einmal je Seite (Pendel, Zeiger, Glocke, Funken, Rollen …) */
const SYMBOLE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-pendel" viewBox="0 0 16 16"><path d="M4 1.6h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/><path d="M8 1.6 5.6 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="5.1" cy="11.9" r="3" fill="currentColor"/></symbol>
<symbol id="i-zeiger" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 8V3.4M8 8l3.1 1.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></symbol>
<symbol id="i-gegen" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.2 1.6"/><path d="M8 8V3.4M8 8 4.9 9.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></symbol>
<symbol id="i-glocke" viewBox="0 0 16 16"><path d="M8 1.4c-2.7 0-4.4 2.1-4.4 4.8v2.7L2.1 11.6h11.8l-1.5-2.7V6.2c0-2.7-1.7-4.8-4.4-4.8z" fill="currentColor"/><circle cx="8" cy="13.6" r="1.7" fill="currentColor"/></symbol>
<symbol id="i-funken" viewBox="0 0 16 16"><path d="M8 .6 9.8 6.2 15.4 8 9.8 9.8 8 15.4 6.2 9.8.6 8l5.6-1.8z" fill="currentColor"/></symbol>
<symbol id="i-trupp" viewBox="0 0 16 16"><path d="M3.6 1.4v13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.2 2.2h9l-2.4 3.1 2.4 3.1h-9z" fill="currentColor"/></symbol>
<symbol id="i-zahl" viewBox="0 0 16 16"><path d="M4.6 1v14M11.4 1v14M4.6 3.8h6.8M4.6 7.4h6.8M4.6 11h6.8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></symbol>
<symbol id="i-herz" viewBox="0 0 16 16"><path d="M8 14.2S1.5 10.1 1.5 5.6C1.5 3.3 3.2 1.8 5.1 1.8c1.3 0 2.3.7 2.9 1.7.6-1 1.6-1.7 2.9-1.7 1.9 0 3.6 1.5 3.6 3.8 0 4.5-6.5 8.6-6.5 8.6z" fill="currentColor"/></symbol>
<symbol id="i-schild" viewBox="0 0 16 16"><path d="M8 1 2.5 3v4.4c0 3.6 2.5 6.1 5.5 7.6 3-1.5 5.5-4 5.5-7.6V3z" fill="currentColor"/></symbol>
<symbol id="i-kreuz" viewBox="0 0 16 16"><path d="M6 1.5h4v4.5h4.5v4H10v4.5H6V10H1.5V6H6z" fill="currentColor"/></symbol>
<symbol id="i-klinge" viewBox="0 0 16 16"><path d="M14.6 1.4 6.9 9.1l-1.1-1.1-1 1 1.6 1.6-3.2 3.2 1.1 1.1 3.2-3.2 1.6 1.6 1-1-1.1-1.1 7.7-7.7z" fill="currentColor"/></symbol>
<symbol id="i-note" viewBox="0 0 16 16"><path d="M6 2.5 14 1v9.6a2.4 2.1 0 1 1-1.6-2V4.2L7.6 5.1v7.5a2.4 2.1 0 1 1-1.6-2z" fill="currentColor"/></symbol>
<symbol id="i-abwehr" viewBox="0 0 16 16"><path d="M8 1 2.5 3v4.4c0 3.6 2.5 6.1 5.5 7.6 3-1.5 5.5-4 5.5-7.6V3z" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol>
</defs></svg>`;

// ── Bildschirm ──

export function renderRaidScreen(container: HTMLElement): void {
  const el = document.createElement('div');
  el.id = 's-raid';
  el.className = 'screen';
  container.appendChild(el);
  const state = gameState;
  if (!state) return;
  el.innerHTML = `${renderHeader(state, 'dungeon', RAID_TEXTE.karte.name)}
    <div class="raid-grund">${SYMBOLE}<main class="raid"></main></div>`;
  zeichne(el);
  bindeBildschirm(el);
  // Einmal: main.ts zeichnet den Bildschirm beim Wechsel zuerst neu (sein Hörer kam vorher), dann kommt dieser
  if (!hoererGebunden) {
    hoererGebunden = true;
    window.addEventListener('mc:navigate', ((e: CustomEvent) => {
      if (e.detail?.screen === 'raid') beimOeffnen();
    }) as EventListener);
    // Escape mit einem gewählten Helden wählt ihn ab, statt ins Hauptmenü zu gehen (main.ts hört auf window,
    // document kommt vorher). Ein offenes Fenster fängt Escape schon in der Capture-Phase ab.
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || gewaehlt === null) return;
      const jetzt = bildschirm();
      if (!jetzt || jetzt.getClientRects().length === 0 || jetzt.querySelector('.r-ov')) return;
      e.stopPropagation();
      gewaehlt = null;
      zeichne(jetzt);
    });
  }
}

/**
 * Beim Hinaufsteigen und beim Umschalten auf eine Stufe: ihre Einleitung beim ersten Mal, ihr Schluss nach dem ersten
 * Sieg, sonst ihr Montag-Satz
 */
function beimOeffnen(): void {
  const state = gameState;
  const el = bildschirm();
  if (!state || !el || el.querySelector('.r-ov')) return;
  const def = aktuelleStufe(state);
  if (!raidOffen(state, def)) return;
  const stand = raidStand(state, Date.now(), def);
  const texte = stufenTexte(def);
  if (!stand.einleitungGelesen) {
    zeigeGeschichte(el, texte.name.toUpperCase(), texte.einleitung, () => {
      stand.einleitungGelesen = true;
      speichern(true);
      const jetzt = bildschirm();
      if (jetzt) zeichne(jetzt);
    });
    return;
  }
  if (stand.siege > 0 && !stand.schlussGelesen) {
    zeigeGeschichte(el, texte.sieg, texte.schluss, () => {
      stand.schlussGelesen = true;
      speichern(true);
    });
    return;
  }
  const montag = montagSatz(stand, def);
  if (montag) {
    stand.montagGesehen = stand.woche.id;
    speichern(true);
    zeigeKopfHinweis(montag, 9000);
  }
}

/** Zeichnet den Inhalt neu (Kopfzeile und offene Fenster bleiben) */
function zeichne(el: HTMLElement): void {
  const state = gameState;
  const haupt = el.querySelector<HTMLElement>('main.raid');
  if (!state || !haupt) return;
  // Vor den Pfeilern des Tages ist schon Stufe I zu: kein Umschalter
  if (!raidOffen(state)) {
    haupt.classList.remove('r-drei');
    haupt.innerHTML = zuHtml(ZENIT);
    return;
  }
  const def = aktuelleStufe(state);
  haupt.classList.toggle('r-drei', def.truppZahl === 3);
  if (!raidOffen(state, def)) {
    haupt.innerHTML = zuHtml(def, stufenHtml(state, def));
    return;
  }
  const neu = !gespeicherterStand(state, def);
  const stand = raidStand(state, Date.now(), def);
  if (neu) speichern();
  if (gewaehlt !== null && !state.fighters.some(f => f.id === gewaehlt)) gewaehlt = null;
  const bankLinks = haupt.querySelector<HTMLElement>('.r-karten')?.scrollLeft ?? 0;
  const lage = raidLage(state, def);
  const versuch = versuchsLage(state, Date.now(), def);
  const schluessel = ratSchluessel(state, stand.aufstellung, def);
  haupt.innerHTML = `
    <div class="r-links">${stufenHtml(state, def)}${listeHtml(lage)}<aside class="r-panel r-rat" data-rat-inhalt>${ratInhalt(state, schluessel, def)}</aside></div>
    <div class="r-mitte">${kopfHtml(state, stand, versuch, def)}${leisteHtml(lage, def)}${feldHtml(state, stand, lage, def)}${wahlHinweisHtml(state, stand)}${knoepfeHtml(state, stand, versuch, schluessel, def)}</div>
    ${bankHtml(state, stand, kampfwerte(state), def)}`;
  const karten = haupt.querySelector<HTMLElement>('.r-karten');
  if (karten) karten.scrollLeft = bankLinks;
  // Ein offenes Kriegsrat-Fenster (Handy) zeigt denselben Stand
  for (const ziel of Array.from(el.querySelectorAll<HTMLElement>('.r-ov [data-rat-inhalt]'))) ziel.innerHTML = ratInhalt(state, schluessel, def);
}

/**
 * Die Stufen zum Umschalten (am PC über Alrunas Liste untereinander, am Handy ganz oben nebeneinander): Name, Helden
 * und was diese Woche noch offen ist (besiegt, freie Ernstkämpfe; zu: was fehlt). «Neu» an einer offenen Stufe, deren
 * Einleitung noch niemand gelesen hat. Liest nur, legt keinen Stand an.
 */
function stufenHtml(state: GameState, def: RaidDef): string {
  const jetzt = Date.now();
  const knoepfe = RAID_STUFEN.map(d => {
    const texte = stufenTexte(d);
    const zustand = raidKartenZustand(state, jetzt, d);
    const neu = zustand.offen && !gespeicherterStand(state, d)?.einleitungGelesen;
    const frei = freiDieseWoche(state, jetzt, d);
    const status = !zustand.offen ? `🔒 ${esc(texte.zu)}`
      : zustand.zwoelf ? `✓ ${esc(RAID_TEXTE.karte.besiegtDieseWoche)}`
        : frei > 0 ? esc(t.stufeFrei(frei, d.freieVersucheJeWoche)) : esc(t.stufeKosten(tagstein(d)));
    const klassen = ['r-stufe', d.id === def.id ? 'an' : '', zustand.offen ? '' : 'zu', zustand.zwoelf ? 'besiegt' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${klassen}" data-stufe="${d.id}" aria-pressed="${d.id === def.id}">`
      + `<b class="r-stufe-nr">${t.stufen} ${texte.stufe}</b><span class="r-stufe-name">${esc(texte.name)}</span>`
      + `${neu ? `<i class="r-stufe-neu">${t.stufeNeuMarke}</i>` : ''}`
      + `<span class="r-stufe-status">${status}</span><span class="r-stufe-zahl">${t.stufeHelden(d.minHelden, d.maxHelden)}</span></button>`;
  }).join('');
  return `<nav class="r-stufen" aria-label="${t.stufenNav}">${knoepfe}</nav>`;
}

/**
 * Eine Stufe, die noch zu ist: ihre Uhr, ihr Name und was fehlt (vor den Pfeilern des Tages: wo die Leiter steht).
 * Über Stufe I geht es zurück zur Karte, über Stufe II zur Stufe davor; `stufen`: der Umschalter, oben im Fenster.
 */
function zuHtml(def: RaidDef, stufen = ''): string {
  const texte = stufenTexte(def);
  const davor = def.freiNachRaid ? RAID_DEFS[def.freiNachRaid] : undefined;
  const knopf = davor
    ? `<button type="button" class="btn-go" data-stufe="${davor.id}">${t.zurStufe(stufenTexte(davor).stufe)}</button>`
    : `<button type="button" class="btn-go" data-nav="dungeon">${E.zurKarte}</button>`;
  return `<section class="r-panel r-zu">${stufen}
    <div class="r-uhr">${zenitUhrSvg(uhrStellung(def, false), 'r-zu-uhr', texte.uhr.vor)}</div>
    <div class="r-kicker">${RAID_TEXTE.karte.klein(def.minHelden, def.maxHelden)}</div>
    <h1 class="r-titel">${texte.titel}</h1>
    <p>${esc(texte.nochZu)}</p>
    <p class="r-mut">${esc(davor ? RAID_TEXTE.karte.tooltipBeide : RAID_TEXTE.karte.tooltip)}</p>
    ${knopf}
  </section>`;
}

// ── Zenit oben ──

const prozent = (rest: number): string => (Math.max(0, Math.min(1, rest)) * 100).toFixed(1);

function kopfHtml(state: GameState, stand: RaidStand, versuch: VersuchsLage, def: RaidDef): string {
  const texte = stufenTexte(def);
  const besiegt = stand.woche.truhe;
  const uhr = zenitUhrSvg(uhrStellung(def, besiegt), 'r-kopf-uhr', besiegt ? texte.uhr.auf : texte.uhr.vor);
  // Striche: wo die letzten Ernstkämpfe Zenit gelassen haben; golden der Bestversuch (oder wie oft er fiel)
  const best = stand.bestRest;
  let marken = stand.verlauf.filter(v => v.rest !== best).map(v => `<i class="r-marke-v" style="left:${prozent(v.rest)}%"></i>`).join('');
  if (best !== null) {
    const p = Number(prozent(best));
    const kante = p < 14 ? ' links' : p > 86 ? ' rechts' : '';
    const text = stand.siege > 0 ? t.besiegt(stand.siege) : t.bestMarke(restProzent(best));
    marken += `<i class="r-marke-v best${kante}" style="left:${p}%"><span>${text}</span></i>`;
  }
  const w = t.werte;
  return `<section class="r-panel r-kopf">
    <div class="r-uhr">${uhr}</div>
    <div class="r-kopf-mitte">
      <div class="r-titelzeile">
        <div><div class="r-kicker">${RAID_TEXTE.karte.klein(def.minHelden, def.maxHelden)}</div><h1 class="r-titel">${texte.titel}</h1></div>
        <button type="button" class="r-klein-knopf rund r-handy-hilfe" data-hilfe aria-label="${t.hilfe}" title="${t.hilfe}">?</button>
      </div>
      <div class="r-werte"><span>${w.angriff} <b>${def.werte.atk}</b></span><span>${w.abwehr} <b>${def.werte.def}</b></span>
        <span>${w.tempo} <b>${komma(def.werte.spd)}</b></span><span>${w.krit} <b>${Math.round(def.werte.critChance * 100)} %</b></span></div>
      <div class="r-leben" title="${t.lebenTitel}"><div class="r-leben-spur"></div><div class="r-leben-zahl">${t.leben(def.werte.hp)}</div>${marken}</div>
      <div class="r-zeile">${t.freiLabel} <b>${t.freiWert(versuch.freiUebrig, def.freieVersucheJeWoche)}</b>
        <span class="r-mut">${t.freiDanach(tagstein(def))}</span><img class="r-tagstein" src="${bild('MAT_TAGSTEIN')}" alt="">
        <span class="r-mut">${t.lager(state.globalStock.mat_tagstein ?? 0)}</span></div>
    </div>
    ${truhenHtml(stand, def)}
  </section>`;
}

function truhenHtml(stand: RaidStand, def: RaidDef): string {
  const texte = stufenTexte(def);
  const zeile = (geholt: boolean, sprite: string, name: string, wann: string, inhalt: string): string => (geholt
    ? `<div class="r-truhe geholt"><div class="r-truhe-bild"><img src="${sprite}" alt=""><span class="r-truhe-haken">✓</span></div>
        <div><div class="r-truhe-name">${esc(name)}</div><div class="r-truhe-geholt">✓ ${t.truheGeholt}</div></div></div>`
    : `<div class="r-truhe"><img src="${sprite}" alt="">
        <div><div class="r-truhe-name">${esc(name)} <span class="r-truhe-status">${wann}</span></div><div class="r-truhe-inhalt">${inhalt}</div></div></div>`);
  const unruh = stand.siege > 0
    ? `<div class="r-truhe geholt"><div class="r-truhe-bild"><img src="${bild(getItemSpriteKey(def.ersterSiegBeute))}" alt=""><span class="r-truhe-haken">✓</span></div>
        <div><div class="r-truhe-name">${texte.ersterZeile}</div><div class="r-truhe-geholt">✓ ${t.unruhGeholt}</div></div></div>`
    : `<div class="r-truhe"><img src="${bild(getItemSpriteKey(def.ersterSiegBeute))}" alt="">
        <div><div class="r-truhe-name">${texte.ersterZeile}</div><div class="r-truhe-inhalt">${texte.ersterInhalt}</div></div></div>`;
  return `<div class="r-truhen">
    <div class="r-truhen-kopf"><span>${t.wochentruhen}</span><span class="r-mut">${t.kw(Number(stand.woche.id.slice(-2)))}</span></div>
    ${zeile(stand.woche.halbeTruhe, bild('ISO_TREASURE_CHEST'), def.truhen.halb.name, t.halbWann, texte.halbInhalt)}
    ${zeile(stand.woche.truhe, bild('ISO_TREASURE_CHEST_V2'), def.truhen.sieg.name, t.siegWann, texte.siegInhalt)}
    ${unruh}
  </div>`;
}

// ── Uhrleiste: wann was wo schlägt ──

function leisteHtml(lage: RaidLage, def: RaidDef): string {
  const r = def.regeln;
  const spalten = spaltenZahl(def);
  const gegen = hatGegenzeiger(def);
  const treffen = new Set(treffpunkte(def).flatMap(x => x.runden));
  const hatHelden = (trupp: number): boolean => (lage.trupps[trupp]?.anzahl ?? 0) > 0;
  const farbe = (spalte: number): string => {
    const warnung = lage.spalten[spalte]?.warnung;
    return warnung === 'leer' ? ' r-rot' : warnung === 'einzeln' ? ' r-gelb' : '';
  };
  // Lage des Pendelstrichs: links und rechts, mit drei Trupps auch die Mitte
  const pendelLage = (trupp: number): string => (def.truppZahl === 3 ? ['r-l', 'r-m', 'r-r'][trupp] : trupp === 0 ? 'r-l' : 'r-r');
  let runden = '';
  for (let runde = 1; runde <= r.mitternacht; runde++) {
    const s = zeigerSpalte(runde, spalten);
    const gs = gegen ? gegenzeigerSpalte(runde, spalten) : null;
    const zeichen: string[] = [];
    const extra: string[] = [];
    if (runde % r.funkenAlle === 0) { zeichen.push(`<span class="c-funken">${ic('funken')}</span>`); extra.push(t.legende.funken); }
    if (runde % r.glockeAlle === 0) { zeichen.push(`<span class="c-glocke">${ic('glocke')}</span>`); extra.push(t.legende.glocke); }
    // Stufe II: Hier stehen beide Zeiger auf derselben Spalte
    if (treffen.has(runde)) { zeichen.push('<span class="c-gegen r-rd-13">13</span>'); extra.push(t.dreizehnMarke); }
    const zeit = runde === r.mittagAb ? ' r-mittag' : runde > r.mittagAb ? ' r-nach' : '';
    // Das Pendel schwingt reihum; ist ein Trupp leer, trifft es jede Runde den nächsten
    const trupp = lage.helden.length > 0 ? pendelTrupp(runde, def.truppZahl, hatHelden) : (runde - 1) % def.truppZahl;
    const seite = trupp === null ? '' : truppKlein(trupp, def.truppZahl);
    const pendel = trupp === null ? '' : `<i class="r-rd-pd ${pendelLage(trupp)}"></i>`;
    const titel = t.rundeTitel(runde, spaltenName(s), seite, extra, gs === null ? undefined : spaltenName(gs));
    runden += `<div class="r-rd${zeit}${treffen.has(runde) ? ' r-dreizehn' : ''}" title="${esc(titel)}">`
      + `${zeichen.length > 0 ? `<div class="r-rd-ev">${zeichen.join('')}</div>` : ''}`
      + `<span class="r-rd-nr">${runde}</span><b class="r-rd-sp${farbe(s)}">${spaltenName(s)}</b>`
      + `${gs === null ? '' : `<b class="r-rd-gg${farbe(gs)}">${spaltenName(gs)}</b>`}${pendel}</div>`;
  }
  const g = t.legende;
  const seiten = def.truppZahl === 3
    ? `<span class="r-legende-lang">${g.seitenDreiLang}</span><span class="r-legende-kurz">${g.seitenDreiKurz}</span>`
    : `<span class="r-legende-lang">${g.seitenLang}</span><span class="r-legende-kurz">${g.seitenKurz}</span>`;
  const gegenLegende = gegen
    ? `<span><b class="r-lg-gg">${spaltenName(spalten - 1)}–${spaltenName(0)}</b> ${g.gegenzeiger}</span>
      <span><span class="r-lg-13">13</span> <span class="r-legende-lang">${g.dreizehnLang}</span><span class="r-legende-kurz">${g.dreizehnKurz}</span></span>`
    : '';
  return `<section class="r-panel r-leiste${gegen ? ' r-zwei-zeiger' : ''}${def.truppZahl === 3 ? ' r-drei' : ''}">
    <div class="r-leiste-kopf"><span class="r-lk-vm">${t.vormittag}</span><span class="r-lk-mt">${t.mittag}</span><span class="r-lk-mn" title="${t.legendeTag}">${t.mitternacht}</span></div>
    <div class="r-runden">${runden}</div>
    <div class="r-legende">
      <span class="c-funken">${ic('funken')}<span class="r-mut">${g.funken}</span></span>
      <span class="c-glocke">${ic('glocke')}<span class="r-mut">${g.glocke}</span></span>
      <span><b class="r-lg-sp">${spaltenName(0)}–${spaltenName(spalten - 1)}</b> ${g.zeiger}</span>
      ${gegenLegende}
      <span><i class="r-lg-pd"></i> ${g.pendel} ${seiten}</span>
      <span><i class="r-lg-mt"></i> <span class="r-legende-lang">${g.mittagLang}</span><span class="r-legende-kurz">${g.mittagKurz}</span></span>
      <span class="r-legende-lang r-lg-tag r-mut">· ${t.legendeTag}</span>
    </div>
  </section>`;
}

// ── Das Feld ──

function leerenKnopf(anzahl: number): string {
  const sicher = leerenBis > Date.now();
  return `<button type="button" class="r-klein-knopf${sicher ? ' r-sicher' : ''}" data-leeren ${anzahl === 0 ? 'disabled' : ''}>${sicher ? t.leerenSicher : t.leeren}</button>`;
}

function feldHtml(state: GameState, stand: RaidStand, lage: RaidLage, def: RaidDef): string {
  const spalten = spaltenZahl(def);
  const treffen = new Set(treffpunkte(def).map(x => x.spalte));
  const T = (reihe: number | string, spalte: number | string): string => `grid-row:${reihe};grid-column:${spalte}`;
  const unten = 3 + def.reihen;
  const rechts = 2 + spalten + def.truppZahl - 1;
  let h = '';
  for (const trupp of lage.trupps) {
    const von = 2 + trupp.trupp * (SPALTEN_JE_TRUPP + 1);
    const bis = von + SPALTEN_JE_TRUPP;
    const ohneHeiler = trupp.anzahl > 0 && trupp.heiler.length === 0;
    h += `<div class="r-trupp-name" style="${T(1, `${von} / ${bis}`)}">${truppName(trupp.trupp, def.truppZahl).toUpperCase()}`
      + `<small${ohneHeiler ? ' class="r-warn-t"' : ''}>${esc(t.truppZeile(trupp.anzahl, trupp.heiler))}</small></div>`;
    h += `<div class="r-trupp-rahmen" style="${T(`2 / ${unten}`, `${von} / ${bis}`)}"></div>`;
    if (trupp.trupp > 0) h += `<div class="r-gang" style="${T(`2 / ${unten}`, von - 1)}"><span>${t.gang}</span></div>`;
  }
  if (lage.glockenReihe !== null) h += `<div class="r-reihenband" style="${T(lage.glockenReihe + 3, `2 / ${rechts}`)}"></div>`;
  for (const sp of lage.spalten) {
    const farbe = sp.warnung === 'leer' ? ' r-rot' : sp.warnung === 'einzeln' ? ' r-gelb' : '';
    const klein = sp.warnung === 'einzeln' && sp.name ? t.spalteNur(sp.name) : sp.anzahl === 0 ? t.spalteLeer : t.spalteHelden(sp.anzahl);
    // Stufe II: Auf dieser Spalte treffen sich Zeiger und Gegenzeiger. Die schmalen Spalten kürzen den kleinen Text,
    // ganz steht er dann im Titel.
    const dreizehn = treffen.has(sp.spalte) ? `<span class="r-13" title="${esc(t.legende.dreizehnLang)}">13</span>` : '';
    const titel = def.truppZahl === 3 ? ` title="${esc(`${spaltenName(sp.spalte)}: ${klein}`)}"` : '';
    h += `<div class="r-skopf${farbe}${dreizehn ? ' r-treff' : ''}" style="${T(2, gitterSpalte(sp.spalte))}"${titel}>${spaltenName(sp.spalte)}<small>${esc(klein)}</small>${dreizehn}</div>`;
  }
  for (let r = 0; r < def.reihen; r++) {
    const glocke = r === lage.glockenReihe;
    const klein = r === 0 ? t.vorn : r === def.reihen - 1 ? t.hinten : '';
    h += `<div class="r-rkopf${glocke ? ' r-glockenreihe' : ''}" style="${T(r + 3, 1)}"><b>${r + 1}</b>${klein ? `<small>${klein}</small>` : ''}`
      + `${glocke ? `<span class="r-glocke" title="${t.legende.glocke}">${ic('glocke')}</span>` : ''}</div>`;
  }
  const pendel = new Set(lage.pendelZiele);
  const nachbarn = new Set(lage.funkenNachbarn);
  const aufFeld = new Map(lage.helden.map(x => [`${x.feld.reihe}:${x.feld.spalte}`, x]));
  for (let r = 0; r < def.reihen; r++) {
    for (let s = 0; s < spalten; s++) {
      const pos = T(r + 3, gitterSpalte(s));
      const name = feldName({ reihe: r, spalte: s });
      const da = aufFeld.get(`${r}:${s}`);
      if (!da) {
        h += `<div class="r-zelle r-leer${gewaehlt !== null ? ' r-ziel' : ''}" style="${pos}" data-feld="${r}:${s}" role="button" tabindex="0" aria-label="${esc(t.feldLabel(name))}"></div>`;
        continue;
      }
      const held = da.held;
      const klassen = ['r-zelle', 'r-besetzt', pendel.has(held.id) ? 'r-pendel' : '', held.id === lage.funkenZiel ? 'r-funken' : '',
        nachbarn.has(held.id) ? 'r-nachbar' : '', held.id === gewaehlt ? 'r-gewaehlt' : ''].filter(Boolean).join(' ');
      h += `<div class="${klassen}" style="${pos}" data-feld="${r}:${s}" data-held="${held.id}" role="button" tabindex="0" draggable="true"
          aria-pressed="${held.id === gewaehlt}" title="${esc(t.zelleTitel(held.name, klassenName(held.classId), name))}">
        ${pendel.has(held.id) ? `<span class="r-marke r-m-pendel">${ic('pendel')}</span>` : ''}
        ${held.id === lage.funkenZiel ? `<span class="r-marke r-m-funken">${ic('funken')}</span>` : ''}
        ${heldBildDiv(held)}
        <div class="${nameKlasse(held.name, def)}">${esc(held.name)}</div>
        <div class="r-hp">${ic('herz')}${zahl(da.einheit.maxHp)}</div>
      </div>`;
    }
  }
  const auswahl = gewaehlt !== null ? state.fighters.find(f => f.id === gewaehlt) : undefined;
  const zurueck = auswahl && stand.aufstellung[String(auswahl.id)]
    ? `<button type="button" class="r-klein-knopf" data-zurueck>${t.aufDieBank}</button>` : '';
  return `<section class="r-panel r-feld">
    <div class="r-feld-kopf"><h2 class="r-h2">${t.aufstellung}</h2>
      <div class="r-knopfgruppe"><span class="r-info">${auswahl ? esc(t.gewaehltKurz(auswahl.name)) : t.tippen}</span>${zurueck}
        <button type="button" class="r-klein-knopf rund" data-hilfe aria-label="${t.hilfe}" title="${t.hilfe}">?</button>
        ${leerenKnopf(Object.keys(stand.aufstellung).length)}</div></div>
    <div class="r-gitter${def.truppZahl === 3 ? ' r-drei' : ''}">${h}</div>
  </section>`;
}

/** Am Handy unter dem Feld: wer gewählt ist und was ein Tippen jetzt tut */
function wahlHinweisHtml(state: GameState, stand: RaidStand): string {
  const auswahl = gewaehlt !== null ? state.fighters.find(f => f.id === gewaehlt) : undefined;
  if (!auswahl) return `<div class="r-wahl-hinweis r-ruhig">${t.tippenKurz}</div>`;
  const zurueck = stand.aufstellung[String(auswahl.id)]
    ? `<button type="button" class="r-klein-knopf" data-zurueck>${t.aufDieBank}</button>` : '';
  return `<div class="r-wahl-hinweis"><span class="r-punkt"></span><span>${esc(t.gewaehlt(auswahl.name))}</span>${zurueck}</div>`;
}

function knoepfeHtml(state: GameState, stand: RaidStand, versuch: VersuchsLage, schluessel: string, def: RaidDef): string {
  const zuWenig = Object.keys(stand.aufstellung).length < def.minHelden;
  const letzter = letzteRaete.get(def.id);
  const rat = letzter?.schluessel === schluessel ? letzter : null;
  const laeuft = ratLauf?.schluessel === schluessel;
  const ratPc = zuWenig ? t.mindestens(def.minHelden) : laeuft ? t.ratUnterLaeuft
    : rat ? K.letzter(rat.siege, rat.proben, restProzent(rat.schnittRest)) : t.ratUnterLeer;
  const ratHandy = zuWenig ? t.mindestens(def.minHelden) : laeuft ? t.ratUnterLaeuft : t.ratUnterKurz(rat ? rat.siege : null);
  const hat = state.globalStock.mat_tagstein ?? 0;
  const max = def.freieVersucheJeWoche;
  const ernstPc = versuch.frei ? t.ernstkampfFrei(versuch.freiUebrig, max) : t.ernstkampfKosten(tagstein(def));
  const ernstUnterPc = !versuch.moeglich ? versuch.grund ?? ''
    : versuch.frei ? t.ernstFreiUnter(versuch.freiUebrig, max, tagstein(def)) : t.ernstKostenUnter(hat);
  const ernstUnterHandy = !versuch.moeglich ? versuch.grund ?? ''
    : versuch.frei ? t.ernstFreiKurz(versuch.freiUebrig, max) : t.ernstKostenUnter(hat);
  return `<section class="r-knoepfe">
    <button type="button" class="btn-kriegsrat" data-rat ${zuWenig ? 'disabled' : ''}>
      <span class="r-pc">${t.kriegsrat}</span><span class="r-handy">${t.kriegsratKurz}</span>
      <small><span class="r-pc">${esc(ratPc)}</span><span class="r-handy">${esc(ratHandy)}</span></small></button>
    <button type="button" class="btn-go" data-ernst ${versuch.moeglich ? '' : 'disabled'}>
      <span class="r-pc">${ernstPc}</span><span class="r-handy">${t.ernstkampfKurz}</span>
      <small><span class="r-pc">${esc(ernstUnterPc)}</span><span class="r-handy">${esc(ernstUnterHandy)}</span></small></button>
  </section>`;
}

// ── Alrunas Liste und der Kriegsrat ──

function listeHtml(lage: RaidLage): string {
  const liste = lage.hinweise;
  aktuelleHinweise = liste;
  const warnungen = liste.filter(h => !h.ok).length;
  const alle = listeAlle || warnungen === 0;
  const zeilen = liste.map((h, i) => `<li class="r-hinweis ${h.ok ? 'r-ok' : 'r-warn'}${h.felder.length > 0 ? ' r-mit-feldern' : ''}" data-hinweis="${i}">`
    + `<span class="r-box ${h.ok ? 'r-ok' : 'r-warn'}" aria-hidden="true">${h.ok ? '✓' : ''}</span>${ic(h.art, `c-${h.art}`)}<span>${esc(h.text)}</span></li>`).join('');
  const mehr = warnungen > 0 && warnungen < liste.length
    ? `<button type="button" class="r-liste-mehr" data-liste-mehr aria-expanded="${listeAlle}">${listeAlle ? t.wenigerZeigen : t.alleZeigen(liste.length - warnungen, liste.length)}</button>`
    : '';
  const vorige = ['ENEMY_ECHO_SCHILDTRAEGER', 'ENEMY_ECHO_BOGENSCHUETZIN', 'ENEMY_ECHO_MESSERSTECHER', 'ENEMY_ECHO_STADTHEILERIN']
    .map(key => `<img src="${bild(key)}" alt="">`).join('');
  return `<aside class="r-panel r-liste${alle ? ' r-alle' : ''}">
    <div class="r-liste-kopf">
      <h2 class="r-h2">${L.kopf}</h2>
      ${mehr}
      <div class="r-vorige" title="${t.vorigeTitel}"><div class="r-vorige-bilder">${vorige}</div><span class="r-vorige-lbl">${t.vorige}</span></div>
      <p class="r-liste-zitat">«${L.unterzeile}»</p>
    </div>
    <ul class="r-hinweise">${zeilen}</ul>
  </aside>`;
}

/** Inhalt des Kriegsrats (am PC links, am Handy im Fenster): leer, am Rechnen oder mit dem Rat */
function ratInhalt(state: GameState, schluessel: string, def: RaidDef): string {
  const stand = raidStand(state, Date.now(), def);
  const letzterRat = letzteRaete.get(def.id) ?? null;
  const kopf = `<div class="r-kopfzeile"><h2 class="r-h2">${t.kriegsratKurz}</h2><span class="r-info">${t.proben(KRIEGSRAT_PROBEN)}</span></div>`;
  if (ratLauf?.schluessel === schluessel) {
    return `${kopf}<p class="r-rat-text">${K.rechnet}</p>
      <div class="kr-zeile"><span class="kr-spur"><i class="kr-balken laeuft" data-rat-balken style="width:0%"></i></span>
        <span class="kr-zahl" data-rat-zahl>${t.ratSiege(0, KRIEGSRAT_PROBEN)}</span></div>`;
  }
  const rat = letzterRat?.schluessel === schluessel ? letzterRat : null;
  if (!rat) {
    const zuWenig = Object.keys(stand.aufstellung).length < def.minHelden;
    const vorige = letzterRat
      ? `<p class="r-rat-text">${esc(t.ratVorige(letzterRat.siege, letzterRat.proben, restProzent(letzterRat.schnittRest)))}</p>` : '';
    return `${kopf}<p class="r-rat-text">${zuWenig ? t.mindestens(def.minHelden) : t.ratLeer}</p>${vorige}
      <button type="button" class="btn-kriegsrat" data-rat ${zuWenig ? 'disabled' : ''}>${t.ratBefragen}</button>`;
  }
  const name = (id: number): string => state.fighters.find(f => f.id === id)?.name ?? '?';
  const p = Math.round((100 * rat.siege) / Math.max(1, rat.proben));
  const ursache = rat.ursache;
  const ursacheIc = ursache && REGEL_IC[ursache.regel] ? `<span class="c-${REGEL_IC[ursache.regel]}">${ic(REGEL_IC[ursache.regel]!)}</span> ` : '';
  const l = t.ratLabel;
  return `${kopf}
    <div class="kr-zeile"><span class="kr-name">${l.sieg}</span><span class="kr-spur"><i class="kr-balken sieg" style="width:${p}%"></i><i class="kr-balken niederlage" style="width:${100 - p}%"></i></span>
      <span class="kr-zahl">${t.ratSiege(rat.siege, rat.proben)}</span></div>
    <div class="r-rat-z"><span class="r-rat-lbl">${l.rest}</span><b>${restProzent(rat.schnittRest)} %</b></div>
    ${ursache ? `<div class="r-rat-z"><span class="r-rat-lbl">${l.ursache}</span><b>${ursacheIc}${esc(ursache.ort)}</b></div>` : ''}
    <div class="r-rat-z"><span class="r-rat-lbl">${l.meist}</span><b>${rat.meistGefallen ? esc(t.ratOft(name(rat.meistGefallen.heldId), rat.meistGefallen.anzahl, rat.proben)) : t.ratNiemand}</b></div>
    <div class="r-rat-z"><span class="r-rat-lbl">${l.funken}</span><b><span class="c-funken">${ic('funken')}</span> ${rat.funken ? esc(t.ratOft(name(rat.funken.heldId), rat.funken.anzahl, rat.proben)) : t.ratNiemand}</b></div>
    ${ursache ? `<p class="r-rat-satz">«${esc(ursache.satz)}»<span>${t.alruna}</span></p>` : ''}
    <button type="button" class="btn-kriegsrat" data-rat-probe>${t.ratProbe}</button>
    <p class="kr-hinweis">${K.gleich}</p>`;
}

// ── Die Bank ──

function bankHtml(state: GameState, stand: RaidStand, einheiten: Map<number, CombatUnit>, def: RaidDef): string {
  const anzahl = Object.keys(stand.aufstellung).length;
  const stufen = schmiedeStufen(state);
  const helden = [...state.fighters].sort((a, b) => ROLLEN_FOLGE.indexOf(raidRolle(a.classId)) - ROLLEN_FOLGE.indexOf(raidRolle(b.classId)));
  const karten = helden.map(held => karteHtml(held, stand.aufstellung[String(held.id)], einheiten.get(held.id), stufen)).join('');
  const legende = ROLLEN_FOLGE.map(r => `<span class="r-nw">${ic(ROLLE_IC[r], `rolle-${r}`)} ${t.rollen[r]}</span>`).join(' · ');
  return `<aside class="r-panel r-bank" data-bank>
    <div class="r-kopfzeile"><h2 class="r-h2">${t.bank}</h2><span class="r-info">${t.bankZahl(anzahl, def.maxHelden)}<span class="r-bank-leeren">${leerenKnopf(anzahl)}</span></span></div>
    <p class="r-bank-tipp">${t.bankTipp} ${legende}</p>
    <div class="r-karten">${karten}</div>
    <p class="r-bank-fuss">${t.bankFuss}</p>
  </aside>`;
}

/** Bestes getragenes Set eines Helden mit der höchsten Schmiede-Stufe seiner Teile: «🏛️ 3/3 +5» */
function setZeile(held: GuildFighter, stufen: SchmiedeStufen): string {
  const set = getrageneSets(held.gear).sort((a, b) => b.teile - a.teile)[0];
  if (!set) return '';
  const plus = Math.max(0, ...Object.values(held.gear).filter(id => id && setVonItem(id)?.id === set.set.id).map(id => stufen[id!] ?? 0));
  return ` · ${set.set.zeichen} ${set.teile}/${setTeilIds(set.set).length}${plus > 0 ? ` +${plus}` : ''}`;
}

function karteHtml(held: GuildFighter, feld: Feld | undefined, einheit: CombatUnit | undefined, stufen: SchmiedeStufen): string {
  const rolle = raidRolle(held.classId);
  const klasse = klassenName(held.classId);
  const weg = getSpezialisierung(held.spezialisierung);
  const wegText = weg ? `${weg.zeichen} <b>${esc(weg.name)}</b>` : `<b>${esc(klasse)}</b>`;
  const werte = einheit
    ? `<span class="r-karte-werte"><span>${ic('herz', 'r-hp-i')}${zahl(einheit.maxHp)}</span><span>${ic('abwehr', 'r-def-i')}${zahl(einheit.def)}</span><span>${ic('klinge', 'r-atk-i')}${zahl(einheit.atk)}</span></span>`
    : '';
  return `<button type="button" class="r-karte${feld ? ' r-gesetzt' : ''}${held.id === gewaehlt ? ' r-gewaehlt' : ''}" data-held="${held.id}" data-karte draggable="true"
      aria-pressed="${held.id === gewaehlt}" title="${esc(t.karteTitel(held.name, klasse, t.rollen[rolle], feld ? feldName(feld) : null))}">
    ${heldBildDiv(held, 'span')}
    <span class="r-karte-text">
      <span class="r-karte-name">${esc(held.name)}<small>St. ${held.level} · ${esc(klasse)}</small></span>
      <span class="r-karte-zeile">${wegText}${setZeile(held, stufen)}</span>
      ${werte}
    </span>
    ${feld ? `<span class="r-feldmarke">${feldName(feld)}</span>` : ''}
    <svg class="r-rolle rolle-${rolle}" role="img" aria-label="${t.rollen[rolle]}"><use href="#i-${ROLLE_IC[rolle]}"/></svg>
  </button>`;
}

// ── Bedienung ──

function bindeBildschirm(el: HTMLElement): void {
  el.addEventListener('click', e => klick(el, e));
  el.addEventListener('keydown', e => taste(el, e));
  el.addEventListener('pointerover', e => hinweisMaus(el, e, true));
  el.addEventListener('pointerout', e => hinweisMaus(el, e, false));
  el.addEventListener('pointerdown', e => druckBeginn(el, e));
  el.addEventListener('pointermove', druckBewegt);
  el.addEventListener('pointerup', druckEnde);
  el.addEventListener('pointercancel', druckEnde);
  el.addEventListener('contextmenu', e => {
    const ziel = (e.target as HTMLElement).closest<HTMLElement>('[data-held]');
    if (!ziel || ziel.closest('.r-ov')) return;
    e.preventDefault();
    druckEnde();
    zeigeBlatt(el, Number(ziel.dataset.held));
  });
  bindeZiehen(el);
}

function klick(el: HTMLElement, e: MouseEvent): void {
  const ziel = e.target as HTMLElement;
  // Fenster haben eigene Hörer
  if (ziel.closest('.r-ov')) return;
  const nav = ziel.closest<HTMLElement>('[data-nav]');
  if (nav) {
    navigateTo(nav.dataset.nav as ScreenId);
    return;
  }
  // Der Klick nach dem langen Drücken öffnet nichts mehr
  if (langGedrueckt) {
    langGedrueckt = false;
    return;
  }
  if (!gameState || ziel.closest('button:disabled')) return;
  const stufeKnopf = ziel.closest<HTMLElement>('[data-stufe]');
  if (stufeKnopf) {
    stufeWechseln(el, stufeKnopf.dataset.stufe ?? '');
    return;
  }
  if (ziel.closest('[data-hilfe]')) zeigeRegeln(el);
  else if (ziel.closest('[data-leeren]')) leeren(el);
  else if (ziel.closest('[data-zurueck]')) { if (gewaehlt !== null) setze(el, gewaehlt, null); }
  else if (ziel.closest('[data-liste-mehr]')) { listeAlle = !listeAlle; zeichne(el); }
  else if (ziel.closest('[data-rat-probe]')) probelauf(el);
  else if (ziel.closest('[data-rat]')) kriegsrat(el);
  else if (ziel.closest('[data-ernst]')) ernstkampfStarten(el);
  else if (ziel.closest('[data-hinweis]')) {
    const li = ziel.closest<HTMLElement>('[data-hinweis]')!;
    leuchte(el, li.classList.contains('r-hover') ? null : li);
  } else if (ziel.closest('[data-karte]')) {
    const id = Number(ziel.closest<HTMLElement>('[data-karte]')!.dataset.held);
    gewaehlt = gewaehlt === id ? null : id;
    zeichne(el);
  } else if (ziel.closest('[data-feld]')) {
    feldAntippen(el, ziel.closest<HTMLElement>('[data-feld]')!);
  } else if (ziel.closest('[data-bank]') && gewaehlt !== null) {
    // Bank zum Zurücknehmen
    setze(el, gewaehlt, null);
  }
}

/** Auf eine andere Stufe umschalten: Wahl und laufender Kriegsrat bleiben bei der alten, ihre Einleitung kommt beim ersten Mal */
function stufeWechseln(el: HTMLElement, id: string): void {
  if (id === stufeId || !RAID_STUFEN.some(d => d.id === id)) return;
  stufeId = id;
  gewaehlt = null;
  listeAlle = false;
  zeichne(el);
  beimOeffnen();
}

/** Enter und Leertaste auf einem Feld wie ein Tippen (Escape hebt die Wahl auf: Hörer auf document, renderRaidScreen) */
function taste(el: HTMLElement, e: KeyboardEvent): void {
  const ziel = e.target as HTMLElement;
  if (ziel.closest('.r-ov')) return;
  if ((e.key === 'Enter' || e.key === ' ') && ziel.matches('[data-feld]')) {
    e.preventDefault();
    feldAntippen(el, ziel);
    el.querySelector<HTMLElement>(`[data-feld="${ziel.dataset.feld}"]`)?.focus();
  }
}

function feldAntippen(el: HTMLElement, zelle: HTMLElement): void {
  const [reihe, spalte] = (zelle.dataset.feld ?? '').split(':').map(Number);
  const dort = zelle.dataset.held ? Number(zelle.dataset.held) : null;
  if (gewaehlt === null) {
    if (dort !== null) {
      gewaehlt = dort;
      zeichne(el);
    }
    return;
  }
  if (dort === gewaehlt) {
    gewaehlt = null;
    zeichne(el);
    return;
  }
  setze(el, gewaehlt, { reihe, spalte });
}

/** Stellt einen Helden (null: auf die Bank); ein laufender Kriegsrat hört dann auf */
function setze(el: HTMLElement, heldId: number, feld: Feld | null): void {
  const state = gameState;
  if (!state) return;
  const def = aktuelleStufe(state);
  const ok = setzeHeld(state, heldId, feld, def);
  if (!ok && feld !== null && Object.keys(raidStand(state, Date.now(), def).aufstellung).length >= def.maxHelden) {
    zeigeKopfHinweis(t.voll(def.maxHelden));
  }
  gewaehlt = null;
  if (ok) {
    ratLauf = null;
    speichern();
  }
  zeichne(el);
}

function leeren(el: HTMLElement): void {
  const state = gameState;
  if (!state) return;
  if (leerenBis <= Date.now()) {
    // Erst nachfragen: der Knopf sagt drei Sekunden lang «Wirklich leeren?»
    leerenBis = Date.now() + 3000;
    zeichne(el);
    setTimeout(() => { if (leerenBis <= Date.now()) { const jetzt = bildschirm(); if (jetzt) zeichne(jetzt); } }, 3100);
    return;
  }
  leerenBis = 0;
  aufstellungLeeren(state, aktuelleStufe(state));
  gewaehlt = null;
  ratLauf = null;
  speichern();
  zeichne(el);
}

// Mit der Maus über einen Punkt der Liste: seine Felder leuchten. Nur die Maus: Ein Finger fährt beim Tippen
// auch darüber, und dann schaltete der Klick gleich danach das Leuchten wieder aus (klick schaltet es um)
function hinweisMaus(el: HTMLElement, e: PointerEvent, an: boolean): void {
  if (e.pointerType !== 'mouse') return;
  const li = (e.target as HTMLElement).closest<HTMLElement>('[data-hinweis]');
  if (!li || li.closest('.r-ov')) return;
  if (!an && e.relatedTarget instanceof Node && li.contains(e.relatedTarget)) return;
  leuchte(el, an ? li : null);
}

function leuchte(el: HTMLElement, li: HTMLElement | null): void {
  for (const x of Array.from(el.querySelectorAll('.r-hinweis.r-hover'))) x.classList.remove('r-hover');
  for (const z of Array.from(el.querySelectorAll('.r-zelle.r-hl'))) z.classList.remove('r-hl');
  const hinweis = li ? aktuelleHinweise[Number(li.dataset.hinweis)] : undefined;
  if (!li || !hinweis) return;
  li.classList.add('r-hover');
  for (const f of hinweis.felder) el.querySelector(`.r-zelle[data-feld="${f.reihe}:${f.spalte}"]`)?.classList.add('r-hl');
}

// Lange drücken: das Blatt des Helden
function druckBeginn(el: HTMLElement, e: PointerEvent): void {
  langGedrueckt = false;
  const ziel = (e.target as HTMLElement).closest<HTMLElement>('[data-held]');
  if (!ziel || ziel.closest('.r-ov') || e.button !== 0) return;
  druckEnde();
  const id = Number(ziel.dataset.held);
  druck = {
    x: e.clientX, y: e.clientY,
    timer: setTimeout(() => {
      druck = null;
      langGedrueckt = true;
      zeigeBlatt(el, id);
    }, LANG_MS),
  };
}

function druckBewegt(e: PointerEvent): void {
  if (druck && Math.hypot(e.clientX - druck.x, e.clientY - druck.y) > 10) druckEnde();
}

function druckEnde(): void {
  if (!druck) return;
  clearTimeout(druck.timer);
  druck = null;
}

/** Am PC: Helden auf ein Feld ziehen (tauscht) oder auf die Bank */
function bindeZiehen(el: HTMLElement): void {
  const ablage = (e: DragEvent): HTMLElement | null => (e.target as HTMLElement).closest<HTMLElement>('main.raid [data-feld], main.raid .r-bank');
  const aufraeumen = (): void => {
    for (const x of Array.from(el.querySelectorAll('.r-drueber'))) x.classList.remove('r-drueber');
    for (const x of Array.from(el.querySelectorAll('.r-zelle.r-ziel, .r-bank.r-ziel'))) x.classList.remove('r-ziel');
  };
  el.addEventListener('dragstart', e => {
    const ziel = (e.target as HTMLElement).closest<HTMLElement>('[data-held]');
    if (!ziel || !e.dataTransfer || ziel.closest('.r-ov')) return;
    druckEnde();
    gezogen = Number(ziel.dataset.held);
    e.dataTransfer.setData('text/plain', String(gezogen));
    e.dataTransfer.effectAllowed = 'move';
    for (const z of Array.from(el.querySelectorAll('.r-zelle.r-leer'))) z.classList.add('r-ziel');
    el.querySelector('.r-bank')?.classList.add('r-ziel');
  });
  el.addEventListener('dragover', e => {
    if (gezogen === null) return;
    const ziel = ablage(e);
    if (!ziel) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (!ziel.classList.contains('r-drueber')) {
      for (const x of Array.from(el.querySelectorAll('.r-drueber'))) x.classList.remove('r-drueber');
      ziel.classList.add('r-drueber');
    }
  });
  el.addEventListener('drop', e => {
    const ziel = ablage(e);
    const id = gezogen;
    gezogen = null;
    aufraeumen();
    if (id === null || !ziel) return;
    e.preventDefault();
    if (ziel.matches('[data-feld]')) {
      if (Number(ziel.dataset.held) === id) return;
      const [reihe, spalte] = (ziel.dataset.feld ?? '').split(':').map(Number);
      setze(el, id, { reihe, spalte });
    } else {
      setze(el, id, null);
    }
  });
  el.addEventListener('dragend', () => {
    gezogen = null;
    aufraeumen();
  });
}

// ── Fenster ──

interface Fenster { ov: HTMLElement; fenster: HTMLElement; zu: () => void }

/**
 * Öffnet ein Fenster über dem Raid. Escape schliesst, Tab bleibt drin (FensterHilfen), der dunkle Rand schliesst
 * nur, wo `hintergrund` (nicht in der Wiedergabe). `beimSchliessen` läuft nach dem Schliessen, auf jedem Weg.
 */
function oeffneFenster(
  el: HTMLElement, html: string,
  { klasse = '', label, beimSchliessen, hintergrund = true }: { klasse?: string; label: string; beimSchliessen?: () => void; hintergrund?: boolean },
): Fenster {
  const ov = document.createElement('div');
  ov.className = 'r-ov';
  ov.innerHTML = `<div class="r-fenster ${klasse}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1">${html}</div>`;
  el.appendChild(ov);
  const fenster = ov.querySelector<HTMLElement>('.r-fenster')!;
  let offen = true;
  const zu = (): void => {
    if (!offen) return;
    offen = false;
    loesen();
    ov.remove();
    schluckeZweitenKlick();
    beimSchliessen?.();
  };
  const loesen = bindeFensterTasten(ov, fenster, zu);
  const aufHintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', e => {
    if (hintergrund && aufHintergrund(e)) zu();
    else if ((e.target as HTMLElement).closest('[data-zu]')) zu();
  });
  schluckeZweitenKlick();
  fenster.focus();
  return { ov, fenster, zu };
}

const knopfZeile = (inhalt: string): string => `<div class="r-fenster-knoepfe">${inhalt}</div>`;

function zeigeGeschichte(el: HTMLElement, titel: string, text: string, gelesen: () => void): void {
  oeffneFenster(el, `<h2 class="r-fenster-titel">${titel}</h2>${geschichtsText(text)}<div class="gs-sig">${RAID_TEXTE.unterschrift}</div>
    ${knopfZeile(`<button type="button" class="btn-go" data-zu>${t.weiter}</button>`)}`, { label: titel, beimSchliessen: gelesen });
}

function zeigeRegeln(el: HTMLElement): void {
  if (!gameState) return;
  const texte = stufenTexte(aktuelleStufe(gameState));
  oeffneFenster(el, `<h2 class="r-fenster-titel">${t.hilfe}</h2><p class="r-fenster-unter">${esc(t.stufeKnopf(texte.stufe, texte.name))}</p>
    <ol class="r-regeln">${texte.regelBlatt.map(z => `<li>${esc(z)}</li>`).join('')}</ol>
    ${knopfZeile(`<button type="button" class="btn-go" data-zu>${t.schliessen}</button>`)}`, { label: t.hilfe });
}

function zeigeBlatt(el: HTMLElement, heldId: number): void {
  const state = gameState;
  if (!state || el.querySelector('.r-ov')) return;
  const held = state.fighters.find(f => f.id === heldId);
  const einheit = kampfwerte(state).get(heldId);
  if (!held || !einheit) return;
  const feld = raidStand(state, Date.now(), aktuelleStufe(state)).aufstellung[String(heldId)];
  const rolle = raidRolle(held.classId);
  const weg = getSpezialisierung(held.spezialisierung);
  const sets = getrageneSets(held.gear);
  const b = t.blatt;
  const setText = sets.length > 0
    ? sets.map(s => `${s.set.zeichen} ${esc(s.set.name)} (${b.setTeile(s.teile, setTeilIds(s.set).length)})`).join(', ')
    : b.keineSets;
  oeffneFenster(el, `
    <div class="r-blatt-kopf">${heldBildDiv(held)}
      <div><div class="r-blatt-name">${esc(held.name)}</div><div class="r-blatt-unter">${esc(b.unter(klassenName(held.classId), held.level))}</div></div></div>
    <div class="r-blatt-zeilen">
      <div class="r-blatt-werte"><span>${ic('herz', 'r-hp-i')} ${b.leben} <b>${zahl(einheit.maxHp)}</b></span>
        <span>${ic('abwehr', 'r-def-i')} ${b.abwehr} <b>${zahl(einheit.def)}</b></span>
        <span>${ic('klinge', 'r-atk-i')} ${b.angriff} <b>${zahl(einheit.atk)}</b></span>
        <span>${b.tempo} <b>${komma(einheit.spd)}</b></span></div>
      <div>${b.weg} <b>${weg ? `${weg.zeichen} ${esc(weg.name)}` : b.keinWeg}</b>${weg ? ` · ${esc(weg.kurz)}` : ''}</div>
      <div>${b.sets} <b>${setText}</b></div>
      <div>${b.rolle} <b>${ic(ROLLE_IC[rolle], `rolle-${rolle}`)} ${t.rollen[rolle]}</b> · ${t.rollenText[rolle]}</div>
      <div class="r-mut">${feld ? b.steht(feldName(feld)) : b.bank}</div>
    </div>
    ${knopfZeile(`<button type="button" class="btn-go" data-zu>${t.schliessen}</button>`)}`, { klasse: 'r-blatt', label: held.name });
}

// ── Kriegsrat ──

/** Befragt den Kriegsrat für die Aufstellung von jetzt (am Handy im Fenster) */
function kriegsrat(el: HTMLElement): void {
  const state = gameState;
  if (!state) return;
  const def = aktuelleStufe(state);
  const stand = raidStand(state, Date.now(), def);
  if (Object.keys(stand.aufstellung).length < def.minHelden) return;
  const schluessel = ratSchluessel(state, stand.aufstellung, def);
  if (istHandy() && !el.querySelector('.r-rat-fenster')) zeigeRatFenster(el);
  if (letzteRaete.get(def.id)?.schluessel === schluessel || ratLauf?.schluessel === schluessel) return;
  ratLauf = { schluessel, def };
  zeichne(el);
  const lauf = ratLauf;
  const naechstes = haeppchenweise(raidKriegsrat(state, def));
  const fortschritt = (k: number): void => {
    for (const b of Array.from(document.querySelectorAll<HTMLElement>('#s-raid [data-rat-balken]'))) b.style.width = `${(100 * k) / KRIEGSRAT_PROBEN}%`;
    for (const z of Array.from(document.querySelectorAll<HTMLElement>('#s-raid [data-rat-zahl]'))) z.textContent = t.ratSiege(k, KRIEGSRAT_PROBEN);
  };
  const weiter = (): boolean => ratLauf === lauf && ratSchluessel(state, raidStand(state, Date.now(), def).aufstellung, def) === schluessel;
  rechneImHintergrund(naechstes, weiter, {
    zwischen: fortschritt,
    fertig: rat => {
      letzteRaete.set(def.id, rat);
      ratLauf = null;
      const jetzt = bildschirm();
      if (jetzt) zeichne(jetzt);
    },
    fehler: err => {
      console.error('Kriegsrat des Raids fehlgeschlagen:', err);
      ratLauf = null;
      const jetzt = bildschirm();
      if (jetzt) zeichne(jetzt);
    },
  });
}

function zeigeRatFenster(el: HTMLElement): void {
  const state = gameState;
  if (!state) return;
  const def = aktuelleStufe(state);
  const schluessel = ratSchluessel(state, raidStand(state, Date.now(), def).aufstellung, def);
  const f = oeffneFenster(el, `<div class="r-rat-inhalt" data-rat-inhalt>${ratInhalt(state, schluessel, def)}</div>
    ${knopfZeile(`<button type="button" class="r-zweit" data-zu>${t.schliessen}</button>`)}`, { klasse: 'r-rat-fenster', label: t.kriegsratKurz });
  f.ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    if (ziel.closest('button:disabled')) return;
    if (ziel.closest('[data-rat-probe]')) {
      f.zu();
      probelauf(el);
    } else if (ziel.closest('[data-rat]')) {
      kriegsrat(el);
    }
  });
}

/** Die erste Probe des Kriegsrats als Wiedergabe (zählt nicht) */
function probelauf(el: HTMLElement): void {
  const state = gameState;
  if (!state || el.querySelector('.r-ov')) return;
  const def = aktuelleStufe(state);
  const rat = letzteRaete.get(def.id);
  if (!rat || rat.schluessel !== ratSchluessel(state, raidStand(state, Date.now(), def).aufstellung, def)) return;
  zeigeWiedergabe(el, rat.probe, teilnehmerBild(state, def), 'probe', def, () => undefined);
}

// ── Ernstkampf ──

/** Wer hinaufgeht, wie er vor dem Kampf dasteht (die Wiedergabe braucht Feld, Bild und volles Leben) */
interface WgHeld { id: number; name: string; classId: string; lehrling?: boolean; feld: Feld; maxHp: number }

function teilnehmerBild(state: GameState, def: RaidDef): WgHeld[] {
  const stand = raidStand(state, Date.now(), def);
  const einheiten = kampfwerte(state);
  return state.fighters.filter(f => stand.aufstellung[String(f.id)]).map(f => ({
    id: f.id, name: f.name, classId: f.classId, lehrling: f.lehrling, feld: { ...stand.aufstellung[String(f.id)] },
    maxHp: einheiten.get(f.id)?.maxHp ?? 1,
  }));
}

function ernstkampfStarten(el: HTMLElement): void {
  const state = gameState;
  if (!state || el.querySelector('.r-ov')) return;
  const def = aktuelleStufe(state);
  const lage = versuchsLage(state, Date.now(), def);
  if (!lage.moeglich) {
    zeichne(el);
    return;
  }
  if (lage.frei) {
    kaempfen(el);
    return;
  }
  const kosten = lage.kosten.mat_tagstein ?? tagstein(def);
  const hat = state.globalStock.mat_tagstein ?? 0;
  const f = oeffneFenster(el, `<h2 class="r-fenster-titel">${t.rueckfrageTitel}</h2>
    <p class="r-rueckfrage">${esc(t.rueckfrage(kosten, hat))}</p>
    ${knopfZeile(`<button type="button" class="r-zweit" data-zu>${t.rueckfrageNein}</button><button type="button" class="btn-go" data-ja>${t.rueckfrageJa}</button>`)}`,
  { label: t.rueckfrageTitel });
  f.ov.addEventListener('click', e => {
    if (!(e.target as HTMLElement).closest('[data-ja]')) return;
    f.zu();
    kaempfen(el);
  });
}

/** Rechnet und bucht den Ernstkampf, speichert und zeigt dann Wiedergabe, Truhe und Ergebnis */
function kaempfen(el: HTMLElement): void {
  const state = gameState;
  if (!state) return;
  const def = aktuelleStufe(state);
  const helden = teilnehmerBild(state, def);
  const erg = ernstkampf(state, Date.now(), def);
  if (!erg) {
    zeichne(el);
    return;
  }
  gewaehlt = null;
  ratLauf = null;
  speichern(true);
  aktualisiereErfolgKnoepfe(state);
  zeichne(el);
  zeigeWiedergabe(el, erg.ergebnis, helden, 'ernst', def, () => nachDemKampf(el, erg, helden, def));
}

/** Nach der Wiedergabe: die Truhe öffnet sich (falls eine da ist), dann das Ergebnis */
function nachDemKampf(el: HTMLElement, erg: ErnstkampfErgebnis, helden: WgHeld[], def: RaidDef): void {
  const state = gameState;
  if (!state) return;
  if (erg.truhen.length === 0) {
    zeigeErgebnis(el, erg, helden, def);
    return;
  }
  const beute: Record<string, number> = {};
  const hinweise: Record<string, string> = {};
  let gold = 0;
  for (const truhe of erg.truhen) {
    for (const [id, menge] of Object.entries(truhe.inhalt)) {
      if (id === 'gold') gold += menge;
      else beute[id] = (beute[id] ?? 0) + menge;
    }
    Object.assign(hinweise, truhe.hinweise);
  }
  // Gleich anlegen wie in der Ruhmestruhe: Die Beute liegt schon im Lager (truheZiehen), angelegt wird höchstens die
  // Menge der Truhe. Danach Erfolge zählen (ein ganzes Set) und das Angelegte sichern; der Ernstkampf ist schon gesichert.
  const anlegen = new TruheAnlegen(state, beute, 'ruhm');
  void showChestReveal(beute, gold, hinweise, E.truhenTitel(erg.truhen.map(x => x.name)), schmiedeStufen(state), anlegen)
    .then(() => {
      if (anlegen.angelegt.size > 0) {
        erfolgePruefen(state);
        aktualisiereErfolgKnoepfe(state);
        speichern(true);
        // Neue Ausrüstung: die Werte auf der Bank und der Schlüssel des Kriegsrats (ratSchluessel) sind neu
        zeichne(el);
      }
      zeigeErgebnis(el, erg, helden, def);
    });
}

// ── Wiedergabe ──

/**
 * Spielt einen Kampf Runde für Runde ab: Uhr (Zeiger auf der Spalte, auf Stufe II auch der Gegenzeiger, Pendel zum
 * Trupp, Glocke, Funken), Zenits Leben, die Felder mit Treffern und Heilung, darunter die Laufzeile mit den Sätzen
 * des Stadtschreibers. `ernst`: am Ende geht es von selbst weiter (`fertig`), `probe`: bleibt stehen, bis jemand
 * schliesst.
 */
function zeigeWiedergabe(
  el: HTMLElement, r: RaidErgebnis, helden: WgHeld[], art: 'ernst' | 'probe', def: RaidDef, fertig: () => void,
): void {
  const spalten = spaltenZahl(def);
  const gegen = hatGegenzeiger(def);
  const texte = stufenTexte(def);
  const proHeld = new Map(helden.map(h => [h.id, h]));
  const name = (id: number | undefined): string => (id === undefined ? '?' : proHeld.get(id)?.name ?? '?');
  const gang = (s: number): string => (s > 0 && s % SPALTEN_JE_TRUPP === 0 ? '<div></div>' : '');
  let gitter = '<div></div>';
  for (let s = 0; s < spalten; s++) gitter += `${gang(s)}<div class="r-wg-kopfzeile" data-wg-spalte="${s}">${spaltenName(s)}</div>`;
  for (let reihe = 0; reihe < def.reihen; reihe++) {
    gitter += `<div class="r-wg-reihe" data-wg-reihe="${reihe}">${reihe + 1}</div>`;
    for (let s = 0; s < spalten; s++) {
      const h = helden.find(x => x.feld.reihe === reihe && x.feld.spalte === s);
      gitter += gang(s) + (h
        ? `<div class="r-wg-zelle besetzt" data-wg="${h.id}">${heldBildDiv(h)}`
          + `<div class="${nameKlasse(h.name, def)}">${esc(h.name)}</div><div class="r-wg-hp"><i style="width:100%"></i></div></div>`
        : '<div class="r-wg-zelle"></div>');
    }
  }
  const g = t.legende;
  const html = `
    <div class="r-wg-kopf"><span class="r-wg-art${art === 'probe' ? ' probe' : ''}">${art === 'probe' ? W.probelauf : W.ernstkampf}</span>
      <span class="r-wg-runde" data-wg-runde>${W.start}</span></div>
    <div class="r-wg-oben">
      <div class="r-wg-uhr" data-wg-uhr>${zenitUhrSvg({ ...uhrStellung(def, false), glocke: true, funken: true }, `r-wg-uhr-${art}`, texte.uhr.vor)}</div>
      <div>
        <div class="r-wg-zenit-name"><span>${texte.titel}</span><span data-wg-zenit>${zahl(def.werte.hp)}</span></div>
        <div class="r-wg-zenit-spur"><div class="r-wg-zenit-balken" data-wg-balken style="width:100%"></div></div>
        <div class="r-wg-legende"><span class="c-pendel">${ic('pendel')}${g.pendel}</span><span class="c-zeiger">${ic('zeiger')}${g.zeiger}</span>
          ${gegen ? `<span class="c-gegen">${ic('gegen')}${g.gegenzeiger}</span>` : ''}
          <span class="c-glocke">${ic('glocke')}${g.glocke}</span><span class="c-funken">${ic('funken')}${g.funken}</span>
          <span class="rolle-heil">${ic('kreuz')}${g.heilung}</span></div>
      </div>
    </div>
    <div class="r-wg-gitter${def.truppZahl === 3 ? ' r-drei' : ''}">${gitter}</div>
    <div class="r-wg-lauf" data-wg-lauf aria-live="polite"></div>
    <div class="r-fenster-knoepfe r-wg-knoepfe">
      <div class="r-wg-tempo">${[1, 2, 4].map(n => `<button type="button" class="r-zweit${tempo === n ? ' an' : ''}" data-tempo="${n}">${W.tempo(n)}</button>`).join('')}
        <button type="button" class="r-zweit" data-pause>${W.pause}</button></div>
      <button type="button" class="btn-go" data-zu>${art === 'probe' ? W.schliessen : W.ueberspringen}</button>
    </div>`;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let index = -1;
  let pausiert = false;
  const halt = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const f = oeffneFenster(el, html, {
    klasse: `r-wg${def.truppZahl === 3 ? ' r-drei' : ''}`, label: W.dialog, hintergrund: false,
    beimSchliessen: () => {
      halt();
      fertig();
    },
  });
  const q = <T extends Element = HTMLElement>(sel: string): T | null => f.fenster.querySelector<T>(sel);
  const rundeEl = q('[data-wg-runde]')!;
  const lauf = q('[data-wg-lauf]')!;
  const balken = q('[data-wg-balken]')!;
  const zenitZahl = q('[data-wg-zenit]')!;
  const uhrBox = q('[data-wg-uhr]')!;
  // Zeiger und Pendel drehen über CSS (gleitend), nicht über das SVG-Attribut
  const hand = (klasse: string): SVGGElement | null => {
    const g = uhrBox.querySelector<SVGGElement>(`.${klasse}`);
    g?.removeAttribute('transform');
    return g;
  };
  const minute = hand('zu-minute');
  const stunde = hand('zu-stunde');
  const pendel = hand('zu-pendel');
  const gegenHand = hand('zu-gegen');
  const stelle = (s: UhrStellung): void => {
    if (minute) minute.style.transform = `rotate(${s.minute}deg)`;
    if (stunde) stunde.style.transform = `rotate(${s.stunde}deg)`;
    if (pendel) pendel.style.transform = `rotate(${s.pendel}deg)`;
    if (gegenHand && s.gegen !== undefined) gegenHand.style.transform = `rotate(${s.gegen}deg)`;
    uhrBox.classList.toggle('glocke', !!s.glocke);
    uhrBox.classList.toggle('funken', !!s.funken);
  };
  stelle({ ...uhrStellung(def, false), funken: false });

  const zellen = new Map<number, HTMLElement>();
  for (const z of Array.from(f.fenster.querySelectorAll<HTMLElement>('[data-wg]'))) zellen.set(Number(z.dataset.wg), z);
  const markiere = (id: number, klasse: string): void => { zellen.get(id)?.classList.add(klasse); };
  const trefferText = (e: RaidEreignis): string => (e.treffer ?? []).map(x => W.treffer(name(x.heldId), Math.round(x.wert))).join(', ');
  const ort = (id: number | undefined): string => r.gefallen.find(x => x.heldId === id)?.ort ?? RAID_TEXTE.ort.rest;

  const zeigeRunde = (rd: RaidRunde): void => {
    const regeln = def.regeln;
    const zeit = rd.runde < regeln.mittagAb ? W.zeiten.vormittag : rd.runde === regeln.mittagAb ? W.zeiten.mittag : W.zeiten.nachmittag;
    rundeEl.textContent = W.runde(rd.runde, regeln.mitternacht, zeit);
    rundeEl.classList.toggle('mittag', rd.runde >= regeln.mittagAb);
    for (const z of zellen.values()) {
      z.classList.remove('wg-pendel', 'wg-zeiger', 'wg-gegen', 'wg-glocke', 'wg-funken', 'wg-heil');
      for (const n of Array.from(z.querySelectorAll('.r-wg-zahl'))) n.remove();
    }
    for (const k of Array.from(f.fenster.querySelectorAll('.r-wg-kopfzeile, .r-wg-reihe'))) k.classList.remove('an', 'gegen', 'durch');
    const schaden = new Map<number, number>();
    const heilung = new Map<number, number>();
    const plus = (karte: Map<number, number>, id: number, wert: number): void => { karte.set(id, (karte.get(id) ?? 0) + wert); };
    const zeilen: string[] = [];
    const uhr: UhrStellung = {
      minute: zeigerAufSpalte(zeigerSpalte(rd.runde, spalten), spalten), stunde: stundeAufRunde(rd.runde), pendel: 0,
      ...(gegen ? { gegen: zeigerAufSpalte(gegenzeigerSpalte(rd.runde, spalten), spalten) } : {}),
    };
    for (const e of rd.ereignisse) {
      const treffer = e.treffer ?? [];
      switch (e.art) {
        case 'pendel':
          // Nach links oder rechts; mit drei Trupps hängt es für die Mitte gerade
          uhr.pendel = def.truppZahl === 3 ? [18, 0, -18][e.trupp ?? 0] ?? 0 : e.trupp === 0 ? 18 : -18;
          for (const x of treffer) { markiere(x.heldId, 'wg-pendel'); plus(schaden, x.heldId, x.wert); }
          if (treffer.length > 0) zeilen.push(`<div>${esc(W.pendel(truppKlein(e.trupp ?? 0, def.truppZahl), trefferText(e)))}</div>`);
          break;
        case 'zeiger':
          f.fenster.querySelector(`[data-wg-spalte="${e.spalte}"]`)?.classList.add('an');
          for (const x of treffer) { markiere(x.heldId, 'wg-zeiger'); plus(schaden, x.heldId, x.wert); }
          zeilen.push(`<div>${esc(W.zeiger(spaltenName(e.spalte ?? 0), trefferText(e)))}</div>`);
          break;
        case 'gegenzeiger':
          f.fenster.querySelector(`[data-wg-spalte="${e.spalte}"]`)?.classList.add('gegen');
          for (const x of treffer) { markiere(x.heldId, 'wg-gegen'); plus(schaden, x.heldId, x.wert); }
          zeilen.push(`<div>${esc(W.gegenzeiger(spaltenName(e.spalte ?? 0), trefferText(e)))}</div>`);
          break;
        case 'durchschlag': {
          f.fenster.querySelector(`[data-wg-spalte="${e.spalte}"]`)?.classList.add('durch');
          for (const x of treffer) { markiere(x.heldId, e.gegen ? 'wg-gegen' : 'wg-zeiger'); plus(schaden, x.heldId, x.wert); }
          const werte = treffer.map(x => Math.round(x.wert));
          const zeile = e.gegen ? W.durchschlagGegen : W.durchschlag;
          if (werte.length > 0) zeilen.push(`<div>${esc(zeile(spaltenName(e.spalte ?? 0), Math.min(...werte), Math.max(...werte)))}</div>`);
          break;
        }
        case 'glocke':
          uhr.glocke = true;
          f.fenster.querySelector(`[data-wg-reihe="${e.reihe}"]`)?.classList.add('an');
          for (const x of treffer) { markiere(x.heldId, 'wg-glocke'); plus(schaden, x.heldId, x.wert); }
          zeilen.push(`<div>${esc(W.glocke((e.reihe ?? 0) + 1, trefferText(e)))}</div>`);
          break;
        case 'funken':
          uhr.funken = true;
          for (const x of treffer) { markiere(x.heldId, 'wg-funken'); plus(schaden, x.heldId, x.wert); }
          zeilen.push(`<div>${esc(W.funken(trefferText(e)))}</div>`);
          break;
        case 'heilung':
          for (const x of treffer) {
            markiere(x.heldId, 'wg-heil');
            plus(heilung, x.heldId, x.wert);
            zeilen.push(`<div>${esc(W.heilung(name(e.quelle), name(x.heldId), Math.round(x.wert)))}</div>`);
          }
          break;
        case 'angriff': {
          const summe = treffer.reduce((a, x) => a + x.wert, 0);
          if (summe > 0) zeilen.push(`<div>${esc(W.angriff(Math.round(summe)))}</div>`);
          break;
        }
        case 'gefallen':
          zeilen.push(`<div class="gefallen">${esc(W.gefallen(name(e.quelle), ort(e.quelle)))}</div>`);
          break;
        case 'mittag':
          zeilen.push(`<div>${esc(W.mittag)}</div>`);
          break;
        case 'aussetzen':
          zeilen.push(`<div>${esc(W.aussetzen(e.grund ?? '', e.quelle === undefined ? null : name(e.quelle)))}</div>`);
          break;
        default:
          break;
      }
      if (e.ansage) zeilen.push(`<div class="ansage">${esc(e.ansage)}</div>`);
    }
    for (const [id, z] of zellen) {
      const leben = rd.leben[id] ?? 0;
      const anteil = Math.max(0, leben) / (proHeld.get(id)?.maxHp ?? 1);
      const i = z.querySelector<HTMLElement>('.r-wg-hp i');
      if (i) {
        i.style.width = `${Math.min(100, anteil * 100)}%`;
        i.classList.toggle('mittel', anteil < 0.6 && anteil >= 0.3);
        i.classList.toggle('wenig', anteil < 0.3);
      }
      z.classList.toggle('tot', leben <= 0);
      const minus = Math.round(schaden.get(id) ?? 0);
      if (minus > 0) z.insertAdjacentHTML('beforeend', `<span class="r-wg-zahl">−${minus}</span>`);
      const dazu = Math.round(heilung.get(id) ?? 0);
      if (dazu > 0) z.insertAdjacentHTML('beforeend', `<span class="r-wg-zahl plus">+${dazu}</span>`);
    }
    balken.style.width = `${(100 * Math.max(0, rd.zenitHp)) / def.werte.hp}%`;
    zenitZahl.textContent = zahl(Math.max(0, rd.zenitHp));
    stelle(uhr);
    lauf.innerHTML = zeilen.join('');
  };

  const schritt = (): void => {
    timer = null;
    index++;
    if (index >= r.verlauf.length) {
      // Zenit auf zwölf (Stufe II: angehalten), wenn er fiel; am Ende geht der Ernstkampf von selbst zum Ergebnis
      if (r.sieg) stelle(uhrStellung(def, true));
      if (art === 'ernst') timer = setTimeout(() => f.zu(), (RUNDE_MS * 1.3) / tempo);
      return;
    }
    zeigeRunde(r.verlauf[index]);
    if (!pausiert) timer = setTimeout(schritt, RUNDE_MS / tempo);
  };

  f.ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    const knopf = ziel.closest<HTMLElement>('[data-tempo]');
    if (knopf) {
      tempo = Number(knopf.dataset.tempo) || 1;
      for (const b of Array.from(f.fenster.querySelectorAll('[data-tempo]'))) b.classList.toggle('an', b === knopf);
      if (!pausiert && index < r.verlauf.length) {
        halt();
        timer = setTimeout(schritt, RUNDE_MS / tempo);
      }
    } else if (ziel.closest('[data-pause]')) {
      pausiert = !pausiert;
      ziel.closest('[data-pause]')!.textContent = pausiert ? W.weiter : W.pause;
      halt();
      if (!pausiert) timer = setTimeout(schritt, 250);
    }
  });
  timer = setTimeout(schritt, 700);
}

// ── Ergebnis ──

function dingHtml(id: string, menge: number, hinweis?: string): string {
  if (id === 'gold') return `<span class="r-erg-ding"><img src="${bild('ICON_GOLD')}" alt="">${E.gold(menge)}</span>`;
  const name = ITEM_DEFS[id]?.name ?? id;
  return `<span class="r-erg-ding"><img src="${bild(getItemSpriteKey(id))}" alt="" onerror="this.style.visibility='hidden'">`
    + `${menge > 1 ? `${menge}× ` : ''}${esc(name)}${hinweis ? ` <small class="r-mut">${esc(hinweis)}</small>` : ''}</span>`;
}

function zeigeErgebnis(el: HTMLElement, erg: ErnstkampfErgebnis, helden: WgHeld[], def: RaidDef): void {
  const state = gameState;
  if (!state) return;
  const r = erg.ergebnis;
  const texte = stufenTexte(def);
  const namen = Object.fromEntries(helden.map(h => [h.id, h.name])) as Record<number, string>;
  const name = (id: number): string => namen[id] ?? '?';
  const stand = raidStand(state, Date.now(), def);
  const lage = versuchsLage(state, Date.now(), def);

  const kopf = r.sieg
    ? `<div class="r-erg-titel">${texte.sieg}</div><div class="r-erg-zeile">${E.siegZeile(r.runden, r.stehend, r.helden)}</div>`
    : `<div class="r-erg-titel niederlage">${E.niederlage(restProzent(r.zenitRest))}</div><div class="r-erg-zeile">${E.niederlageZeile(r.runden, r.stehend, r.helden)}</div>`;
  const vorher = !r.sieg && erg.bestVorher !== null
    ? `${E.vorher(restProzent(erg.bestVorher))}${erg.neuerBest ? ` <span class="r-erg-best">${E.neuerBest}</span>` : ''} · ` : '';
  const kosten = erg.frei ? E.frei(lage.freiUebrig, def.freieVersucheJeWoche) : E.bezahlt(erg.kosten.mat_tagstein ?? tagstein(def));

  // Der Schluss der Geschichte beim ersten Sieg, und was er öffnet (Stufe II nach dem ersten Sieg auf Stufe I)
  let schluss = '';
  if (erg.ersterSieg) {
    const naechste = RAID_STUFEN.find(d => d.freiNachRaid === def.id && raidOffen(state, d));
    const neu = naechste
      ? `<div class="r-erg-neu"><span>${esc(t.stufeNeu(stufenTexte(naechste).stufe, naechste.name))}</span>
          <button type="button" class="r-klein-knopf" data-zur-stufe="${naechste.id}">${t.zurStufe(stufenTexte(naechste).stufe)}</button></div>`
      : '';
    schluss = `${neu}<div class="r-erg-abschnitt">${geschichtsText(texte.schluss)}<div class="gs-sig">${RAID_TEXTE.unterschrift}</div></div>`;
    // Gelesen erst, wenn der Raid auch zu sehen ist: sonst kommt der Schluss beim nächsten Hinaufsteigen (beimOeffnen)
    if (el.isConnected && el.getClientRects().length > 0) {
      stand.schlussGelesen = true;
      speichern();
    }
  }

  let lager = '';
  for (const truhe of erg.truhen) {
    if (truhe.art === 'erster') {
      lager += `<div class="r-erg-truhe r-erg-unruh"><img src="${bild(getItemSpriteKey(def.ersterSiegBeute))}" alt="">
        <div><div class="r-erg-truhe-name">${esc(truhe.name)}</div><div class="r-erg-truhe-text">${esc(truhe.text)}</div></div></div>`;
      continue;
    }
    const dinge = Object.entries(truhe.inhalt).map(([id, menge]) => dingHtml(id, menge, truhe.hinweise[id])).join('');
    lager += `<div class="r-erg-truhe"><div class="r-erg-truhe-name">${esc(truhe.name)}</div>
      <div class="r-erg-truhe-text">${esc(truhe.text)}</div><div class="r-erg-dinge">${dinge}</div></div>`;
  }
  if (!lager) {
    const satz = r.sieg ? texte.nachWochensieg : r.zenitRest >= def.halbUnter ? texte.keineTruheHalb : texte.halbSchonGeholt;
    lager = `<p class="r-erg-truhe-text">${esc(satz)}</p>`;
  }

  const gilde: string[] = [];
  if (erg.xp.length > 0) gilde.push(E.xp(erg.xp[0].xp, erg.xp.length));
  for (const x of erg.xp) if (x.levelUps > 0) gilde.push(E.stufe(name(x.heldId), x.stufe));
  for (const k of erg.neueKlassen) gilde.push(E.klasse(klassenName(k)));
  const meister = (werte: Record<number, number>): [number, number] | null => {
    const liste = Object.entries(werte).map(([id, w]): [number, number] => [Number(id), w]).filter(([, w]) => w > 0);
    return liste.length > 0 ? liste.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  };
  const summe = Object.values(r.schaden).reduce((a, b) => a + b, 0);
  const schaden = meister(r.schaden);
  if (schaden && summe > 0) gilde.push(E.meisterSchaden(name(schaden[0]), Math.round((100 * schaden[1]) / summe)));
  const heiler = meister(r.geheilt);
  if (heiler) gilde.push(E.meisteHeilung(name(heiler[0]), Math.round(heiler[1])));

  const erfolge = erg.neueErfolge.length > 0
    ? `<div class="r-erg-abschnitt"><h3>${E.erfolgeKopf}</h3><div class="r-erg-liste">${erg.neueErfolge.map(id => `<div>🏆 ${esc(erfolgBilanzZeile(id))}</div>`).join('')}</div></div>`
    : '';
  const gefallen = r.gefallen.length > 0
    ? r.gefallen.map(x => `<div>${esc(E.gefallenZeile(name(x.heldId), x.ort, x.runde))}</div>`).join('')
    : `<div>${E.keinerGefallen}</div>`;
  const ursache = hauptursache(r.gefallen, namen, r.mitternacht, def.regeln.gegenzeiger !== undefined);
  const chronik = r.ansagen.length > 0
    ? `<div class="r-erg-abschnitt"><h3>${E.chronikKopf}</h3>${r.ansagen.map(geschichtsText).join('')}<div class="gs-sig">${RAID_TEXTE.unterschrift}</div></div>`
    : '';
  const nochmal = lage.frei ? E.nochmalFrei(lage.freiUebrig, def.freieVersucheJeWoche) : E.nochmalKosten(tagstein(def));

  const f = oeffneFenster(el, `
    <div class="r-erg-kopf">${kopf}<div class="r-erg-vorher">${vorher}${esc(kosten)}</div>
      <button type="button" class="r-klein-knopf r-erg-wg" data-erg-wg>${E.wiedergabe}</button></div>
    ${schluss}
    <div class="r-erg-abschnitt"><h3>${E.truhenKopf}</h3>${lager}</div>
    <div class="r-erg-abschnitt"><h3>${E.gildeKopf}</h3><div class="r-erg-liste">${gilde.map(z => `<div>${esc(z)}</div>`).join('')}</div></div>
    ${erfolge}
    <div class="r-erg-abschnitt"><h3>${E.gefallenKopf}</h3><div class="r-erg-liste">${gefallen}</div>
      ${ursache ? `<p class="r-rat-satz r-erg-satz">«${esc(ursache.satz)}»<span>${t.alruna}</span></p>` : ''}</div>
    ${chronik}
    ${knopfZeile(`<button type="button" class="r-zweit" data-nav-karte>${E.zurKarte}</button>
      <button type="button" class="r-zweit" data-zu>${E.aendern}</button>
      <button type="button" class="btn-go" data-nochmal ${lage.moeglich ? '' : `disabled title="${esc(lage.grund ?? '')}"`}>${nochmal}</button>`)}`,
  { klasse: 'r-erg', label: E.dialog });
  f.ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    if (ziel.closest('button:disabled')) return;
    if (ziel.closest('[data-erg-wg]')) {
      // Nie zwei Fenster übereinander: das Ergebnis geht zu und kommt nach der Wiedergabe wieder
      f.zu();
      zeigeWiedergabe(el, r, helden, 'ernst', def, () => zeigeErgebnis(el, erg, helden, def));
    } else if (ziel.closest('[data-zur-stufe]')) {
      f.zu();
      stufeWechseln(el, ziel.closest<HTMLElement>('[data-zur-stufe]')!.dataset.zurStufe ?? '');
    } else if (ziel.closest('[data-nav-karte]')) {
      f.zu();
      navigateTo('dungeon');
    } else if (ziel.closest('[data-nochmal]')) {
      f.zu();
      ernstkampfStarten(el);
    }
  });
}
