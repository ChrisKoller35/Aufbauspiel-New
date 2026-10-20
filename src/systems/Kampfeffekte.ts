// ─── Magic City – Kampfeffekte ──────────────────────────────────
// Wirkung der Effekte, die über die Grundregeln von Gegenständen hinausgehen:
// Set-Fähigkeiten (data/dungeonSets.ts) wie Gift, Einfrieren, Schild, Feueratem.
// CombatEngine ruft die Funktionen an festen Stellen eines Kampfs auf.
// Zeilen mit «✦ <Name> setzt <Fähigkeit> ein →» erscheinen im Kampf als grünes Banner.
// ────────────────────────────────────────────────────────────────

import { CombatUnit, ExpeditionRun, SpecialEffect } from '../models/ExpeditionRun';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { ENEMY_DEFS } from '../data/enemies';
import { SeededRNG } from '../utils/RNG';

type Log = (zeile: string) => void;

/** Schaden eines Treffers vor Krit und Effekten. Alle Kampfstellen benutzen diese Formel. */
export function grundSchaden(atk: number, def: number): number {
  return Math.max(1, atk - Math.floor(def * 0.7));
}

// ── Nachschlagen ──

export function effekt(unit: CombatUnit, id: string): SpecialEffect | undefined {
  return unit.specialEffects?.find(e => e.id === id && e.usesLeft !== 0);
}

function alleEffekte(unit: CombatUnit, id: string): SpecialEffect[] {
  return unit.specialEffects?.filter(e => e.id === id && e.usesLeft !== 0) ?? [];
}

/**
 * Stärke des Effekts für diesen Träger: der Wert aus Set oder Gegenstand, sonst der
 * Standard aus SPECIAL_EFFECT_DEFS. Hat er denselben Effekt doppelt, gilt der stärkere.
 */
export function staerke(unit: CombatUnit, id: string): number {
  const standard = SPECIAL_EFFECT_DEFS[id]?.power ?? 0;
  const liste = alleEffekte(unit, id);
  return liste.length === 0 ? standard : Math.max(...liste.map(e => e.power ?? standard));
}

/** Auslöse-Chance des Effekts für diesen Träger (bei doppeltem Effekt die höhere) */
export function chance(unit: CombatUnit, id: string): number {
  const standard = SPECIAL_EFFECT_DEFS[id]?.procChance ?? 0;
  const liste = alleEffekte(unit, id);
  return liste.length === 0 ? standard : Math.max(...liste.map(e => e.chance ?? standard));
}

/** Name des Effekts im Kampf: der Name der Set-Fähigkeit oder der Standardname */
export function anzeigeName(e: SpecialEffect): string {
  return e.name ?? SPECIAL_EFFECT_DEFS[e.id]?.name ?? e.id;
}

function istBoss(unit: CombatUnit): boolean {
  return unit.defId != null && ENEMY_DEFS[unit.defId]?.isBoss === true;
}

function lebendig(units: CombatUnit[]): CombatUnit[] {
  return units.filter(u => u.hp > 0);
}

/** Setzt einen Bonus auf Angriff oder Verteidigung, den ein Effekt gerade gibt (ersetzt den alten Wert) */
function setzeBonus(unit: CombatUnit, quelle: string, stat: 'atk' | 'def', wert: number): void {
  const boni = unit.effektBoni ?? (unit.effektBoni = {});
  const schluessel = `${quelle}:${stat}`;
  const alt = boni[schluessel] ?? 0;
  if (alt === wert) return;
  unit[stat] += wert - alt;
  if (wert === 0) delete boni[schluessel];
  else boni[schluessel] = wert;
}

// ── Schaden und Heilung ──

/** Schaden an einer Einheit: ein Schild schluckt zuerst. Gibt den Lebensverlust zurück. */
export function schadenNehmen(unit: CombatUnit, dmg: number): number {
  let rest = dmg;
  if (unit.schild && unit.schild > 0) {
    const geschluckt = Math.min(unit.schild, rest);
    unit.schild -= geschluckt;
    rest -= geschluckt;
  }
  unit.hp -= rest;
  return rest;
}

/** Text für den Teil, den ein Schild geschluckt hat: « (davon 5 vom Schild)» */
export function schildText(dmg: number, lebensverlust: number): string {
  return lebensverlust < dmg ? ` (davon ${dmg - lebensverlust} vom Schild)` : '';
}

function heilen(unit: CombatUnit, menge: number): number {
  const vorher = unit.hp;
  unit.hp = Math.min(unit.maxHp, unit.hp + menge);
  return unit.hp - vorher;
}

// ── Expedition und Kampf ──

/** Einmal beim Start der Expedition: Teamwirkungen wie der Schildwall */
export function expeditionsBeginn(party: CombatUnit[], log: Log): void {
  let wall = 0;
  for (const u of party) wall = Math.max(wall, effekt(u, 'schildwall') ? staerke(u, 'schildwall') : 0);
  if (wall > 0) {
    for (const u of party) u.def += wall;
    log(`✦ Schildwall: Das ganze Team hat +${wall} Verteidigung.`);
  }
}

/** Zu Beginn jedes Kampfs, in der ersten Runde */
export function kampfBeginn(party: CombatUnit[], gegner: CombatUnit[], run: ExpeditionRun, log: Log): void {
  const helden = lebendig(party);
  for (const u of helden) {
    u.ersterSchlag = !!effekt(u, 'schattenstoss');
    const moos = effekt(u, 'moospolster');
    if (moos) u.schild = Math.max(u.schild ?? 0, staerke(u, 'moospolster'));
    const gier = effekt(u, 'drachengier');
    if (gier) {
      const bonus = Math.min(gier.max ?? Infinity, Math.floor(run.goldEarned / Math.max(1, gier.power ?? 40)));
      setzeBonus(u, 'drachengier', 'atk', bonus);
      if (bonus > 0) log(`✦ ${u.name} setzt Drachengier ein → ${run.goldEarned} Gold im Gepäck: +${bonus} Angriff`);
    }
    const bastion = effekt(u, 'letzte_bastion');
    if (bastion) {
      u.tauntRounds = Math.max(u.tauntRounds, bastion.runden ?? 2);
      log(`✦ ${u.name} setzt Letzte Bastion ein → zieht alle Angriffe auf sich`);
    }
  }
  for (const u of helden) {
    for (const geheul of alleEffekte(u, 'rudelgeheul')) {
      const wert = geheul.power ?? 2;
      for (const h of helden) {
        h.atk += wert;
        h.buffs.push({ stat: 'atk', value: wert, remainingRounds: geheul.runden ?? 3, quelle: 'rudelgeheul' });
      }
      log(`✦ ${u.name} setzt ${anzeigeName(geheul)} ein → das ganze Team hat +${wert} Angriff`);
    }
  }
  for (const u of helden) {
    const atem = effekt(u, 'feueratem');
    if (!atem) continue;
    const ziele = lebendig(gegner);
    if (ziele.length === 0) break;
    const dmg = staerke(u, 'feueratem');
    log(`✦ ${u.name} setzt Feueratem ein → alle Gegner erleiden ${dmg} Schaden`);
    for (const z of ziele) schadenNehmen(z, dmg);
  }
}

/** Am Ende jedes Kampfs: was nur für einen Kampf gilt, fällt weg */
export function kampfEnde(party: CombatUnit[]): void {
  for (const u of party) {
    for (let i = u.buffs.length - 1; i >= 0; i--) {
      const b = u.buffs[i];
      if (b.quelle !== 'rudelgeheul') continue;
      if (b.stat === 'atk') u.atk -= b.value;
      u.buffs.splice(i, 1);
    }
    setzeBonus(u, 'glutherz', 'atk', 0);
    u.schild = 0;
    u.betaeubt = undefined;
    u.betaeubtSchutz = false;
    u.ersterSchlag = false;
    u.gift = undefined;
  }
}

/** Vor jedem Zug: Werte, die von den Leben abhängen (Tiefenrausch, Letzte Bastion) */
export function zustandAktualisieren(units: CombatUnit[]): void {
  for (const u of units) {
    if (!u.specialEffects) continue;
    const angeschlagen = u.hp > 0 && u.hp < u.maxHp / 2;
    if (effekt(u, 'tiefenrausch')) setzeBonus(u, 'tiefenrausch', 'atk', angeschlagen ? staerke(u, 'tiefenrausch') : 0);
    if (effekt(u, 'letzte_bastion')) setzeBonus(u, 'letzte_bastion', 'def', angeschlagen ? staerke(u, 'letzte_bastion') : 0);
  }
}

/** Eingefroren oder betäubt? Dann fällt dieser Zug aus (true). Bis zum nächsten eigenen Zug kann es nicht gleich wieder passieren. */
export function setztAus(unit: CombatUnit, log: Log): boolean {
  if (unit.betaeubt) {
    log(`  ${unit.name} setzt aus (${unit.betaeubt}).`);
    unit.betaeubt = undefined;
    unit.betaeubtSchutz = true;
    return true;
  }
  unit.betaeubtSchutz = false;
  return false;
}

/** Schattenstoss: Gibt den Schadens-Faktor zurück, wenn der erste Angriff des Kampfs ansteht */
export function schattenstoss(angreifer: CombatUnit): number | null {
  if (!angreifer.ersterSchlag) return null;
  angreifer.ersterSchlag = false;
  return staerke(angreifer, 'schattenstoss') || 2;
}

/** Der Träger wird von einem Grundangriff getroffen: Glutpanzer brennt den Angreifer */
export function beimGetroffenWerden(ziel: CombatUnit, angreifer: CombatUnit, log: Log): void {
  if (!effekt(ziel, 'glutpanzer') || angreifer.hp <= 0) return;
  const dmg = staerke(ziel, 'glutpanzer');
  schadenNehmen(angreifer, dmg);
  log(`  ${ziel.name}: Glutpanzer! ${angreifer.name} erleidet ${dmg} Feuerschaden.`);
}

/** Der Angreifer hat mit einem eigenen Treffer einen Gegner besiegt: Glutherz */
export function besiegt(angreifer: CombatUnit, log: Log): void {
  const glut = effekt(angreifer, 'glutherz');
  if (!glut || angreifer.hp <= 0) return;
  const alt = angreifer.effektBoni?.['glutherz:atk'] ?? 0;
  const neu = Math.min(glut.max ?? Infinity, alt + (glut.power ?? 3));
  if (neu === alt) return;
  setzeBonus(angreifer, 'glutherz', 'atk', neu);
  log(`✦ ${angreifer.name} setzt Glutherz ein → +${neu} Angriff bis Kampfende`);
}

/**
 * Nach einem Treffer (Grundangriff oder Doppelschlag) mit Schaden dmg:
 * Gift, Einfrieren und Funkenflug. Würfelt nur, wenn der Angreifer den Effekt hat.
 */
export function nachTreffer(
  angreifer: CombatUnit, ziel: CombatUnit, dmg: number,
  gegnerDesAngreifers: CombatUnit[], rng: SeededRNG, log: Log,
): void {
  const biss = effekt(angreifer, 'giftbiss');
  if (biss && ziel.hp > 0) {
    const schaden = Math.max(ziel.gift?.schaden ?? 0, biss.power ?? 4);
    ziel.gift = { schaden, runden: biss.runden ?? 3 };
  }
  const schlag = effekt(angreifer, 'stun_strike');
  if (schlag && ziel.hp > 0) {
    const c = chance(angreifer, 'stun_strike') * (istBoss(ziel) ? 0.5 : 1);
    if (rng.chance(c) && !ziel.betaeubt && !ziel.betaeubtSchutz) {
      ziel.betaeubt = anzeigeName(schlag);
      log(`✦ ${angreifer.name} setzt ${ziel.betaeubt} ein → ${ziel.name} setzt einen Zug aus`);
    }
  }
  const funken = effekt(angreifer, 'funkenflug');
  if (funken) {
    const andere = gegnerDesAngreifers.filter(g => g.hp > 0 && g !== ziel);
    if (andere.length > 0) {
      const zweiter = rng.pick(andere);
      const spritzer = Math.max(1, Math.floor(dmg * (funken.anteil ?? 0.4)));
      const verlust = schadenNehmen(zweiter, spritzer);
      log(`  ${angreifer.name}: Funkenflug! ${zweiter.name} erleidet ${spritzer}${schildText(spritzer, verlust)}`);
      if (zweiter.hp <= 0) besiegt(angreifer, log);
    }
  }
}

/** Ein Gegner ist gestorben (egal wodurch): Seelenernte heilt das Team */
export function gegnerGestorben(gestorben: CombatUnit, party: CombatUnit[], log: Log): void {
  for (const u of lebendig(party)) {
    const ernte = effekt(u, 'seelenernte');
    if (!ernte) continue;
    const menge = ernte.power ?? 8;
    let summe = 0;
    for (const h of lebendig(party)) summe += heilen(h, menge);
    if (summe > 0) log(`✦ ${u.name} setzt Seelenernte ein → ${gestorben.name} nährt das Team (+${menge} Leben)`);
  }
}

/** Am Ende jeder Runde: Gift, Gezeitenwelle, Druckwelle und Verbotene Fussnote */
export function rundenEnde(
  party: CombatUnit[], gegner: CombatUnit[], runde: number, rng: SeededRNG, log: Log,
): void {
  for (const u of [...lebendig(party), ...lebendig(gegner)]) {
    if (!u.gift) continue;
    u.hp -= u.gift.schaden;
    log(`  ${u.name}: Gift −${u.gift.schaden} Leben`);
    u.gift.runden--;
    if (u.gift.runden <= 0 || u.hp <= 0) u.gift = undefined;
  }

  for (const u of lebendig(party)) {
    const welle = effekt(u, 'gezeitenwelle');
    if (welle && runde % (welle.runden ?? 3) === 0) {
      const verletzt = lebendig(party).filter(h => h.hp < h.maxHp);
      if (verletzt.length > 0) {
        const ziel = verletzt.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
        const geheilt = heilen(ziel, Math.max(1, Math.floor(ziel.maxHp * (welle.anteil ?? 0.15))));
        log(`✦ ${u.name} setzt Gezeitenwelle ein → ${ziel.name} +${geheilt} Leben`);
      }
    }

    const druck = effekt(u, 'druckwelle');
    if (druck && runde % (druck.runden ?? 4) === 0 && lebendig(gegner).length > 0) {
      log(`✦ ${u.name} setzt Druckwelle ein → trifft alle Gegner`);
      for (const g of lebendig(gegner)) {
        const dmg = Math.max(1, Math.floor(grundSchaden(u.atk, g.def) * (druck.anteil ?? 0.6)));
        const verlust = schadenNehmen(g, dmg);
        log(`  ${g.name} erleidet ${dmg}${schildText(dmg, verlust)}`);
      }
    }

    const fussnote = effekt(u, 'fussnote');
    if (fussnote && runde % (fussnote.runden ?? 3) === 0) {
      const seite = rng.nextInt(0, 2);
      if (seite === 0 && lebendig(gegner).length > 0) {
        const dmg = fussnote.power ?? 30;
        log(`✦ ${u.name} setzt Flammenseite ein → alle Gegner erleiden ${dmg} Schaden`);
        for (const g of lebendig(gegner)) schadenNehmen(g, dmg);
      } else if (seite === 1) {
        const anteil = fussnote.anteil ?? 0.12;
        for (const h of lebendig(party)) heilen(h, Math.max(1, Math.floor(h.maxHp * anteil)));
        log(`✦ ${u.name} setzt Heilseite ein → das Team heilt ${Math.round(anteil * 100)} % Leben`);
      } else {
        const schild = fussnote.schild ?? 20;
        for (const h of lebendig(party)) h.schild = (h.schild ?? 0) + schild;
        log(`✦ ${u.name} setzt Schutzseite ein → jeder im Team erhält einen Schild von ${schild}`);
      }
    }
  }
}

/** Gold-Faktor des Teams: Klebrige Finger und Drachengier, höchstens doppeltes Gold */
export function goldFaktor(party: CombatUnit[]): number {
  let bonus = 0;
  for (const u of lebendig(party)) for (const e of alleEffekte(u, 'klebrige_finger')) bonus += e.power ?? 0;
  return 1 + Math.min(1, bonus);
}

/**
 * Meldet Gegner, die seit dem letzten Aufruf gestorben sind (Seelenernte).
 * bekannt merkt sich die schon gemeldeten Toten dieses Kampfs.
 */
export function neueToteMelden(gegner: CombatUnit[], party: CombatUnit[], bekannt: Set<CombatUnit>, log: Log): void {
  for (const g of gegner) {
    if (g.hp > 0 || bekannt.has(g)) continue;
    bekannt.add(g);
    gegnerGestorben(g, party, log);
  }
}
