// ─── Magic City – Rechnung des Raids «Über dem Tag» ──────────────
// Rein: kein Spielstand, kein DOM. Nutzt den Grundangriff, die Regeneration und die Kampfeffekte des normalen
// Kampfs (CombatEngine, Kampfeffekte), aber mit Orten statt Zielen: Die Helden stehen auf Reihen × Spalten in
// Trupps zu drei Spalten, der Boss trifft Orte (Pendel: vorderste Reihe eines Trupps, Zeiger: eine Spalte, Glocke:
// die vollste Reihe, Funken: der beste Schadensmacher und seine Nachbarn im Trupp). Lieder, Segen, Schilde,
// Heilung und Wachfeuer wirken nur im eigenen Trupp. Regeln und Eichung: docs/RAID.md.
// ─────────────────────────────────────────────────────────────────

import { CombatEngine, buffsAblaufen, hasEffect } from './CombatEngine';
import { GearSystem } from './GearSystem';
import {
  expeditionsBeginn, kampfBeginn, kampfEnde, neueToteMelden, rundenEnde, schadenNehmen, grundSchaden,
  setztAus, wutAnfall, zustandAktualisieren,
} from './Kampfeffekte';
import { SeededRNG } from '../utils/RNG';
import { CLASS_DEFS } from '../data/classes';
import { RAID_TEXTE, RaidDef, SPALTEN_JE_TRUPP, spaltenName, truppKlein } from '../data/raids';
import type { CombatUnit, ExpeditionRun } from '../models/ExpeditionRun';
import type { GuildFighter } from '../models/GuildRoster';
import type { Feld } from '../models/RaidStand';
import type { SchmiedeStufen } from './Schmiede';

/** Eigene Id für den Boss, damit nichts mit Helden-Ids zusammenfällt */
export const ZENIT_ID = 900000;

export type Regel = 'pendel' | 'zeiger' | 'durchschlag' | 'glocke' | 'funken' | 'rest' | 'mitternacht';

export interface RaidTreffer {
  heldId: number;
  /** Schaden (bei Heilung: geheilte Leben) */
  wert: number;
}

export interface RaidEreignis {
  /** 'ansage': nur ein Satz des Stadtschreibers, ohne Ereignis dazu (Grösse der Gruppe, Spott, Ende) */
  art: Regel | 'angriff' | 'heilung' | 'gefallen' | 'mittag' | 'ansage' | 'aussetzen';
  trupp?: number;
  reihe?: number;
  spalte?: number;
  /** Held, von dem es ausgeht (Heiler) oder um den es geht (Funkenziel, Gefallener) */
  quelle?: number;
  treffer?: RaidTreffer[];
  /** Satz des Stadtschreibers, falls diese Art zum ersten Mal kam */
  ansage?: string;
  /** 'aussetzen': der Schlag, der Zenit anhielt (Erschütterungsschlag, Einfrieren …); `quelle` ist der Held dazu */
  grund?: string;
}

export interface RaidRunde {
  runde: number;
  /** Zenits Leben am Ende der Runde */
  zenitHp: number;
  /** Leben der Helden am Ende der Runde (Held-Id → Leben, gefallen ≤ 0) */
  leben: Record<number, number>;
  ereignisse: RaidEreignis[];
}

export interface RaidGefallen {
  heldId: number;
  runde: number;
  ursache: Regel;
  /** «Glocke (Reihe 3)», «Zeiger (Spalte C)» … */
  ort: string;
}

export interface RaidErgebnis {
  sieg: boolean;
  /** Letzte gespielte Runde */
  runden: number;
  /** Zenits Rest, 0 bis 1 */
  zenitRest: number;
  helden: number;
  stehend: number;
  mitternacht: boolean;
  gefallen: RaidGefallen[];
  /** Direkter Schaden je Held (Grundangriffe auf Zenit) */
  schaden: Record<number, number>;
  /** Geheilte Leben je Heiler */
  geheilt: Record<number, number>;
  /** Ziel der ersten Funken */
  funkenZiel: number | null;
  /** Wer neben dem Ziel der ersten Funken stand */
  funkenNachbarn: number[];
  /** Ansagen des Stadtschreibers in Reihenfolge */
  ansagen: string[];
  /** Für die Wiedergabe (fehlt mit `knapp`) */
  verlauf: RaidRunde[];
  /** Kampfprotokoll (fehlt mit `knapp`) */
  protokoll: string[];
}

export interface RaidOptionen {
  /** Nur bis zu dieser Runde rechnen (Funken-Probelauf der Liste) */
  bisRunde?: number;
  /** Ohne Wiedergabe und Protokoll (Kriegsrat, Eichung) */
  knapp?: boolean;
  /** Eichung: einzelne Regeln abschalten */
  ohne?: (Regel | 'mittag' | 'heilung')[];
  /** Eichung: andere Werte des Bosses */
  werte?: Partial<RaidDef['werte']>;
  /** Eichung: andere Regeln */
  regeln?: Partial<RaidDef['regeln']>;
}

// ── Geometrie ──

/** Trupp eines Felds: Spalten 0–2 Trupp 0 (Links), 3–5 Trupp 1 (Rechts) … */
export function truppVon(feld: Feld): number {
  return Math.floor(feld.spalte / SPALTEN_JE_TRUPP);
}

export function spaltenZahl(def: RaidDef): number {
  return SPALTEN_JE_TRUPP * def.truppZahl;
}

/** Zeiger: Runde 1 Spalte A, 2 B … 6 F, 7 wieder A */
export function zeigerSpalte(runde: number, spalten: number): number {
  return (runde - 1) % spalten;
}

/** Die Reihe mit den meisten Helden; bei Gleichstand die hintere */
export function vollsteReihe(felder: Feld[], reihen: number): number {
  let beste = reihen - 1;
  let anzahl = -1;
  for (let r = reihen - 1; r >= 0; r--) {
    const k = felder.filter(f => f.reihe === r).length;
    if (k > anzahl) { anzahl = k; beste = r; }
  }
  return beste;
}

/** Trupp, auf den das Pendel in dieser Runde schwingt: reihum; ist er leer oder gefallen, der nächste */
export function pendelTrupp(runde: number, truppZahl: number, hatLebende: (trupp: number) => boolean): number | null {
  for (let k = 0; k < truppZahl; k++) {
    const trupp = (runde - 1 + k) % truppZahl;
    if (hatLebende(trupp)) return trupp;
  }
  return null;
}

/** Direkte Nachbarn (oben, unten, links, rechts) im selben Trupp; über den Gang nicht */
export function sindNachbarn(a: Feld, b: Feld): boolean {
  if (truppVon(a) !== truppVon(b)) return false;
  return Math.abs(a.reihe - b.reihe) + Math.abs(a.spalte - b.spalte) === 1;
}

/** Fähigkeit, mit der ein Held im Raid heilt (Kleriker, Druide, Paladin), sonst undefined */
export function heilFaehigkeit(classId: string | undefined): { power: number; cooldown: number } | undefined {
  return (CLASS_DEFS[classId ?? '']?.skills ?? []).find(s => s.effectType === 'heal');
}

/** Wie viele Treffer der Wucht ein Held aushält (Flächenschaden mit Flächenschutz, sonst normaler Treffer) */
export function schlaege(wucht: number, unit: Pick<CombatUnit, 'hp' | 'maxHp' | 'def'> & Partial<CombatUnit>, flaeche: boolean, schutz = 0.7): number {
  let dmg = grundSchaden(wucht, unit.def);
  if (flaeche && unit.specialEffects && hasEffect(unit as CombatUnit, 'aoe_resist')) dmg = Math.max(1, Math.floor(dmg * schutz));
  return Math.max(1, Math.ceil(unit.maxHp / Math.max(1, dmg)));
}

// ── Der Kampf ──

/**
 * Ein Raid-Kampf. Ändert die Helden nicht (rechnet mit Kampfeinheiten aus `fighterToCombatUnit`); gleicher Samen,
 * gleiches Ergebnis. Die Aufstellung nennt Held-Id (als Text) → Feld; Helden ohne Feld bleiben unten.
 */
export function raidKampf(
  def: RaidDef, helden: GuildFighter[], stufen: SchmiedeStufen, aufstellung: Record<string, Feld>, samen: number,
  optionen: RaidOptionen = {},
): RaidErgebnis {
  const werte = { ...def.werte, ...optionen.werte };
  const regeln = { ...def.regeln, ...optionen.regeln };
  const ohne = new Set(optionen.ohne ?? []);
  const knapp = optionen.knapp === true;
  const reihen = def.reihen;
  const spalten = spaltenZahl(def);
  const limit = Math.min(regeln.mitternacht, optionen.bisRunde ?? regeln.mitternacht);

  const engine = new CombatEngine(new GearSystem());
  const rng = new SeededRNG(samen);
  const party = helden.filter(h => aufstellung[String(h.id)]).map(h => engine.fighterToCombatUnit(h, stufen));
  const feld = new Map<CombatUnit, Feld>(party.map(u => [u, aufstellung[String(u.id)]]));
  const trupps: CombatUnit[][] = Array.from({ length: def.truppZahl }, (_, t) => party.filter(u => truppVon(feld.get(u)!) === t));
  const truppDes = (u: CombatUnit): CombatUnit[] => trupps[truppVon(feld.get(u)!)];

  const run = {
    combatLog: [] as string[], party, goldEarned: 0, rooms: [], loot: {}, focusTarget: null, focusTargetCooldown: 0,
  } as unknown as ExpeditionRun;
  const log = (zeile: string): void => { run.combatLog.push(zeile); };
  for (const t of trupps) expeditionsBeginn(t, log);

  const zenit: CombatUnit = {
    id: ZENIT_ID, name: 'Zenit', isPlayer: false, hp: werte.hp, maxHp: werte.hp, atk: werte.atk, def: werte.def,
    spd: werte.spd, critChance: werte.critChance, critMult: werte.critMult, threat: 0, tauntRounds: 0, skills: [],
    buffs: [], lootTableId: null,
  };
  const gegner = [zenit];
  const lebend = (l: CombatUnit[]): CombatUnit[] => l.filter(u => u.hp > 0);
  const tote = new Set<CombatUnit>([...party, zenit].filter(u => u.hp <= 0));

  const schaden: Record<number, number> = {};
  const geheilt: Record<number, number> = {};
  const heilCd = new Map<CombatUnit, number>();
  const fall = new Map<CombatUnit, { ursache: Regel; ort: string }>();
  const gefallen: RaidGefallen[] = [];
  const ansagen: string[] = [];
  const angesagt = new Set<string>();
  const verlauf: RaidRunde[] = [];
  let ereignisse: RaidEreignis[] = [];
  let funkenZiel: number | null = null;
  let funkenNachbarn: number[] = [];
  // Wer Zenit zuletzt betäubt hat: sein nächster Zug fällt aus, und mit ihm das Pendel
  let betaeubtVon: CombatUnit | null = null;
  // Spalten, die schon zu Kampfbeginn leer waren (Ansage beim ersten Durchschlag)
  const leerBeiBeginn = new Set(Array.from({ length: spalten }, (_, s) => s).filter(s => !party.some(u => feld.get(u)!.spalte === s)));
  const einzigeDerSpalte = new Map<number, CombatUnit>();
  for (let s = 0; s < spalten; s++) {
    const drin = party.filter(u => feld.get(u)!.spalte === s);
    if (drin.length === 1) einzigeDerSpalte.set(s, drin[0]);
  }

  const ansage = (art: string, text: string, ereignis?: RaidEreignis): void => {
    if (angesagt.has(art)) return;
    angesagt.add(art);
    ansagen.push(text);
    if (ereignis) ereignis.ansage = ereignis.ansage ? `${ereignis.ansage} ${text}` : text;
    else if (!knapp) ereignisse.push({ art: 'ansage', ansage: text });
  };
  const ereignis = (e: RaidEreignis): RaidEreignis => {
    if (!knapp) ereignisse.push(e);
    return e;
  };

  /** Merkt sich, was einen Helden unter null gebracht hat (für den Fall, dass er nicht wieder aufsteht) */
  const merkeFall = (u: CombatUnit, vorher: number, ursache: Regel, ort: string): void => {
    if (vorher > 0 && u.hp <= 0) fall.set(u, { ursache, ort });
  };

  let runde = 0;
  /** Neue Tote je Trupp melden (Wiedergeburt und Wachfeuer im eigenen Trupp) und als Gefallene buchen */
  const toteMelden = (): void => {
    for (const t of trupps) neueToteMelden(gegner, t, tote, log);
    for (const u of party) {
      if (!tote.has(u) || gefallen.some(g => g.heldId === u.id)) continue;
      const f = fall.get(u) ?? { ursache: 'rest' as Regel, ort: RAID_TEXTE.ort.rest };
      gefallen.push({ heldId: u.id, runde, ursache: f.ursache, ort: f.ort });
      const e = ereignis({ art: 'gefallen', quelle: u.id, treffer: [{ heldId: u.id, wert: 0 }] });
      if (gefallen.length === 1 && u.classId === 'bard' && hasEffect(u, 'heldenlied')) {
        ansage('bardin', RAID_TEXTE.ansage.bardin(u.name, runde), e);
      }
    }
  };

  const treffeFlaeche = (ziele: CombatUnit[], wucht: number, ursache: Regel, ort: string): RaidTreffer[] => {
    const treffer: RaidTreffer[] = [];
    for (const t of ziele) {
      let dmg = grundSchaden(wucht, t.def);
      if (hasEffect(t, 'aoe_resist')) dmg = Math.max(1, Math.floor(dmg * regeln.flaechenschutz));
      const vorher = t.hp;
      schadenNehmen(t, dmg);
      log(`${ort}: ${t.name} −${dmg}`);
      treffer.push({ heldId: t.id, wert: dmg });
      merkeFall(t, vorher, ursache, ort);
    }
    return treffer;
  };

  // Ansagen zur Grösse der Gruppe
  if (party.length === 4) ansage('zahl', RAID_TEXTE.ansage.vier);
  else if (party.length >= 5 && party.length < def.maxHelden) ansage('zahl', RAID_TEXTE.ansage.viele(party.length));
  const vorBeginn = ereignisse;

  let mittag = false;
  for (runde = 1; runde <= limit; runde++) {
    if (zenit.hp <= 0 || lebend(party).length === 0) { runde--; break; }
    ereignisse = runde === 1 ? vorBeginn : [];

    if (runde === 1) {
      for (const t of trupps) kampfBeginn(t, gegner, run, log);
      toteMelden();
      const spotter = party.find(u => u.hp > 0 && u.tauntRounds > 0);
      if (spotter) ansage('spott', RAID_TEXTE.ansage.spott(spotter.name));
    }
    if (runde === regeln.mittagAb && !ohne.has('mittag')) {
      wutAnfall(zenit, regeln.mittagMal, 1);
      mittag = true;
      log('!! Es schlägt zwölf: Zenit schlägt ab jetzt anderthalbmal so hart !!');
      ansage('mittag', RAID_TEXTE.ansage.mittag, ereignis({ art: 'mittag' }));
    }

    const angriffe: Record<number, number> = {};
    const reihenfolge = [...lebend(party), zenit].sort((a, b) => b.spd - a.spd);
    for (const u of reihenfolge) {
      if (u.hp <= 0 || zenit.hp <= 0) continue;
      for (const t of trupps) zustandAktualisieren(t, log);
      const grund = u === zenit ? zenit.betaeubt : undefined;
      if (setztAus(u, log)) {
        if (grund && !ohne.has('pendel')) ereignis({ art: 'aussetzen', quelle: betaeubtVon?.id, grund });
        continue;
      }

      if (u === zenit) {
        if (ohne.has('pendel')) continue;
        const trupp = pendelTrupp(runde, def.truppZahl, t => lebend(trupps[t]).length > 0);
        if (trupp === null) continue;
        const l = lebend(trupps[trupp]);
        const vorn = Math.min(...l.map(h => feld.get(h)!.reihe));
        const ort = RAID_TEXTE.ort.pendel(truppKlein(trupp, def.truppZahl));
        const treffer: RaidTreffer[] = [];
        const e = ereignis({ art: 'pendel', trupp, reihe: vorn, treffer });
        for (const ziel of l.filter(h => feld.get(h)!.reihe === vorn)) {
          if (zenit.hp <= 0) break;
          const vorher = ziel.hp;
          engine.grundangriff(zenit, ziel, trupps[trupp], gegner, run, rng);
          treffer.push({ heldId: ziel.id, wert: Math.max(0, vorher - ziel.hp) });
          merkeFall(ziel, vorher, 'pendel', ort);
          if (!mittag && schlaege(def.werte.atk, ziel, false) < 3) {
            ansage('pendelZerbrechlich', RAID_TEXTE.ansage.pendelZerbrechlich(ziel.name), e);
          }
        }
      } else {
        // Raid-Heilregel: Heiler heilen den Schwächsten im eigenen Trupp, solange jemand unter heilUnter steht
        const faehigkeit = ohne.has('heilung') ? undefined : heilFaehigkeit(u.classId);
        const cd = heilCd.get(u) ?? 0;
        if (faehigkeit && cd <= 0) {
          const verletzt = lebend(truppDes(u)).filter(h => h.hp < h.maxHp * regeln.heilUnter);
          if (verletzt.length > 0) {
            const ziel = verletzt.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
            const menge = Math.round(faehigkeit.power + regeln.heilFaktor * u.atk);
            const vorher = ziel.hp;
            ziel.hp = Math.min(ziel.maxHp, ziel.hp + menge);
            const plus = ziel.hp - vorher;
            log(`${u.name} heilt ${ziel.name} +${plus}`);
            geheilt[u.id] = (geheilt[u.id] ?? 0) + plus;
            heilCd.set(u, faehigkeit.cooldown);
            const e = ereignis({ art: 'heilung', quelle: u.id, treffer: [{ heldId: ziel.id, wert: plus }] });
            ansage('heilung', RAID_TEXTE.ansage.heilung(u.name), e);
            toteMelden();
            continue;
          }
        }
        if (faehigkeit) heilCd.set(u, cd - 1);
        const vorher = zenit.hp;
        const frei = !zenit.betaeubt;
        engine.grundangriff(u, zenit, gegner, truppDes(u), run, rng);
        if (frei && zenit.betaeubt) betaeubtVon = u;
        const getroffen = Math.max(0, vorher - zenit.hp);
        schaden[u.id] = (schaden[u.id] ?? 0) + getroffen;
        angriffe[u.id] = (angriffe[u.id] ?? 0) + getroffen;
      }
      toteMelden();
    }
    if (Object.keys(angriffe).length > 0) {
      ereignis({ art: 'angriff', treffer: Object.entries(angriffe).map(([id, wert]) => ({ heldId: Number(id), wert })) });
    }

    if (zenit.hp > 0) {
      // Funken: wer bisher am meisten Schaden gemacht hat, und seine Nachbarn im Trupp
      if (runde % regeln.funkenAlle === 0 && !ohne.has('funken')) {
        const l = lebend(party);
        if (l.length > 0) {
          const ziel = l.reduce((a, b) => ((schaden[b.id] ?? 0) > (schaden[a.id] ?? 0) ? b : a));
          const f = feld.get(ziel)!;
          const nachbarn = l.filter(h => h !== ziel && sindNachbarn(feld.get(h)!, f));
          const ort = RAID_TEXTE.ort.funken(ziel.name);
          const treffer = treffeFlaeche([ziel, ...nachbarn], zenit.atk * regeln.funken, 'funken', ort);
          const e = ereignis({ art: 'funken', quelle: ziel.id, trupp: truppVon(f), reihe: f.reihe, spalte: f.spalte, treffer });
          if (funkenZiel === null) {
            funkenZiel = ziel.id;
            funkenNachbarn = nachbarn.map(n => n.id);
            ansage('funken', RAID_TEXTE.ansage.funken(ziel.name, nachbarn.map(n => n.name)), e);
          }
        }
      }
      // Glocke: die Reihe mit den meisten lebenden Helden (Gleichstand: die hintere)
      if (runde % regeln.glockeAlle === 0 && !ohne.has('glocke')) {
        const l = lebend(party);
        if (l.length > 0) {
          const r = vollsteReihe(l.map(h => feld.get(h)!), reihen);
          const ziele = l.filter(h => feld.get(h)!.reihe === r);
          const treffer = treffeFlaeche(ziele, zenit.atk * regeln.glocke, 'glocke', RAID_TEXTE.ort.glocke(r + 1));
          const e = ereignis({ art: 'glocke', reihe: r, treffer });
          ansage('glocke', RAID_TEXTE.ansage.glocke(r + 1, ziele.length), e);
        }
      }
      // Zeiger: die Last der Spalte geteilt; leere Spalte → Durchschlag auf alle
      if (!ohne.has('zeiger')) {
        const s = zeigerSpalte(runde, spalten);
        const l = lebend(party);
        const inSpalte = l.filter(h => feld.get(h)!.spalte === s);
        if (inSpalte.length > 0) {
          const treffer = treffeFlaeche(inSpalte, (zenit.atk * regeln.zeiger) / inSpalte.length, 'zeiger',
            RAID_TEXTE.ort.zeiger(spaltenName(s)));
          ereignis({ art: 'zeiger', spalte: s, treffer });
        } else if (l.length > 0 && !ohne.has('durchschlag')) {
          const treffer = treffeFlaeche(l, zenit.atk * regeln.durchschlag, 'durchschlag', RAID_TEXTE.ort.durchschlag(spaltenName(s)));
          const e = ereignis({ art: 'durchschlag', spalte: s, treffer });
          const einziger = einzigeDerSpalte.get(s);
          if (leerBeiBeginn.has(s)) ansage('durchschlag', RAID_TEXTE.ansage.durchschlagLeer(spaltenName(s)), e);
          else if (einziger) ansage('durchschlag', RAID_TEXTE.ansage.durchschlagGefallen(einziger.name, spaltenName(s)), e);
        }
      }
      toteMelden();
    }

    // Rundenende wie im normalen Kampf; Gift auf Zenit tickt nur beim ersten Trupp
    buffsAblaufen([...lebend(party), ...lebend(gegner)]);
    engine.regeneration([...party, ...gegner], run);
    trupps.forEach((t, i) => rundenEnde(t, gegner, runde, rng, log, { gegnerGift: i === 0 }));
    toteMelden();
    for (const u of party) u.antiHealDebuff = false;

    if (!knapp) {
      verlauf.push({
        runde, zenitHp: Math.max(0, zenit.hp), leben: Object.fromEntries(party.map(u => [u.id, u.hp])), ereignisse,
      });
    }
    if (zenit.hp <= 0 || lebend(party).length === 0) break;
  }
  const gespielt = Math.min(runde, limit);
  kampfEnde(party);

  const sieg = zenit.hp <= 0;
  const stehend = lebend(party).length;
  const mitternacht = !sieg && stehend > 0 && optionen.bisRunde === undefined && gespielt >= regeln.mitternacht;
  if (optionen.bisRunde === undefined) {
    if (sieg && gespielt === regeln.mittagAb) ansage('ende', RAID_TEXTE.ansage.zwoelf);
    else if (sieg && gespielt < regeln.mittagAb) ansage('ende', RAID_TEXTE.ansage.vorZwoelf);
    else if (mitternacht) ansage('ende', RAID_TEXTE.ansage.mitternacht);
    else if (!sieg) ansage('ende', gespielt > 9 ? RAID_TEXTE.ansage.niederlageSpaet(gespielt) : RAID_TEXTE.ansage.niederlageFrueh(gespielt));
  }

  return {
    sieg, runden: gespielt, zenitRest: Math.max(0, zenit.hp) / zenit.maxHp, helden: party.length, stehend, mitternacht,
    gefallen, schaden, geheilt, funkenZiel, funkenNachbarn, ansagen,
    verlauf: knapp ? [] : verlauf, protokoll: knapp ? [] : run.combatLog,
  };
}

/** Häufigste Todesursache eines Kampfs oder mehrerer: Regel und Ort, mit dem Satz des Stadtschreibers */
export function hauptursache(
  gefallen: RaidGefallen[], namen: Record<number, string>, mitternacht = false,
): { regel: Regel; ort: string; satz: string } | null {
  if (mitternacht) return { regel: 'mitternacht', ort: RAID_TEXTE.ort.mitternacht, satz: RAID_TEXTE.hauptursache.mitternacht };
  if (gefallen.length === 0) return null;
  const zaehler = new Map<string, { regel: Regel; ort: string; anzahl: number; helden: number[] }>();
  for (const g of gefallen) {
    const eintrag = zaehler.get(g.ort) ?? { regel: g.ursache, ort: g.ort, anzahl: 0, helden: [] };
    eintrag.anzahl++;
    eintrag.helden.push(g.heldId);
    zaehler.set(g.ort, eintrag);
  }
  const top = [...zaehler.values()].sort((a, b) => b.anzahl - a.anzahl)[0];
  const name = namen[top.helden[0]] ?? '?';
  const zahl = (ort: string): number => Number(ort.match(/Reihe (\d+)/)?.[1] ?? 0);
  const spalte = (ort: string): string => ort.match(/Spalte ([A-L])/)?.[1] ?? '?';
  const seite = (ort: string): string => ort.match(/Trupp (\S+)\)/)?.[1] ?? '';
  const t = RAID_TEXTE.hauptursache;
  let satz: string;
  switch (top.regel) {
    case 'glocke': satz = t.glocke(zahl(top.ort)); break;
    case 'zeiger': satz = new Set(top.helden).size === 1 ? t.zeiger(spalte(top.ort), name) : t.zeigerViele(spalte(top.ort)); break;
    case 'durchschlag': satz = t.durchschlag(spalte(top.ort)); break;
    case 'pendel': satz = t.pendel(seite(top.ort), top.anzahl); break;
    case 'funken': satz = t.funken(top.ort.match(/um (.+)\)/)?.[1] ?? name); break;
    default: satz = t.rest(name);
  }
  return { regel: top.regel, ort: top.ort, satz };
}
