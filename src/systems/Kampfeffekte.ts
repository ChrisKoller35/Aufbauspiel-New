// ─── Magic City – Kampfeffekte ──────────────────────────────────
// Wirkung der Effekte, die über die Grundregeln von Gegenständen hinausgehen:
// Set-Fähigkeiten (data/dungeonSets.ts) wie Gift, Einfrieren, Schild, Feueratem
// und die Wege der Helden (data/spezialisierungen.ts) wie Phalanx oder Zorn.
// CombatEngine ruft die Funktionen an festen Stellen eines Kampfs auf.
// Zeilen mit «✦ <Name> setzt <Fähigkeit> ein →» erscheinen im Kampf als grünes Banner,
// Wege mit «★ <Name> setzt <Weg> ein →» als goldenes. Zeilen «  ★ …» sind Wege ohne Banner.
// ────────────────────────────────────────────────────────────────

import { CombatRoundSnapshot, CombatUnit, ExpeditionRun, SpecialEffect, WegWirkungArt, WegZustand } from '../models/ExpeditionRun';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { ENEMY_DEFS } from '../data/enemies';
import { SeededRNG } from '../utils/RNG';

type Log = (zeile: string) => void;

/** Schaden eines Treffers vor Krit und Effekten. Alle Kampfstellen benutzen diese Formel. */
export function grundSchaden(atk: number, def: number): number {
  return Math.max(1, Math.round(atk * 0.2), atk - Math.floor(def * 0.7));
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

/** Setzt einen Bonus auf Angriff, Verteidigung oder Tempo, den ein Effekt gerade gibt (ersetzt den alten Wert) */
function setzeBonus(unit: CombatUnit, quelle: string, stat: 'atk' | 'def' | 'spd', wert: number): void {
  const boni = unit.effektBoni ?? (unit.effektBoni = {});
  const schluessel = `${quelle}:${stat}`;
  const alt = boni[schluessel] ?? 0;
  if (alt === wert) return;
  unit[stat] = stat === 'spd' ? Math.round((unit[stat] + wert - alt) * 100) / 100 : unit[stat] + wert - alt;
  if (wert === 0) delete boni[schluessel];
  else boni[schluessel] = wert;
}

function bonus(unit: CombatUnit, quelle: string, stat: 'atk' | 'def' | 'spd'): number {
  return unit.effektBoni?.[`${quelle}:${stat}`] ?? 0;
}

/** Der Held im Team mit der stärksten Ausprägung eines Effekts (bei Teamwirkungen zählt nur einer) */
function staerksterTraeger(party: CombatUnit[], id: string): CombatUnit | undefined {
  let bester: CombatUnit | undefined;
  for (const u of lebendig(party)) {
    if (effekt(u, id) && (!bester || staerke(u, id) > staerke(bester, id))) bester = u;
  }
  return bester;
}

/** Wie staerksterTraeger, aber auch Gefallene: Ihr Lied wirkt bis Kampfende weiter (für die Bilanz) */
function quelle(seite: CombatUnit[], id: string): CombatUnit | undefined {
  let bester: CombatUnit | undefined;
  for (const u of seite) {
    if (effekt(u, id) && (!bester || staerke(u, id) > staerke(bester, id))) bester = u;
  }
  return bester;
}

/** Der Verbündete mit dem kleinsten Anteil Leben, der Heilung braucht */
function verletztester(party: CombatUnit[]): CombatUnit | undefined {
  const verletzt = lebendig(party).filter(h => h.hp < h.maxHp);
  return verletzt.length > 0 ? verletzt.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b)) : undefined;
}

// ── Bilanz der Wege (wird nur gezählt, ändert nichts am Kampf) ──

/** Zählt für die Bilanz nach der Expedition, was der Weg eines Helden bewirkt hat */
export function wegZaehlen(held: CombatUnit | undefined, art: WegWirkungArt, menge: number): void {
  if (!held?.isPlayer || !(menge > 0)) return;
  const wirkung = held.wegWirkung ?? (held.wegWirkung = {});
  wirkung[art] = (wirkung[art] ?? 0) + menge;
}

/**
 * Wege, die Angriff oder Verteidigung verschieben (Zorn, Heldenlied, Kriegssegen, Fluch, Schmählied):
 * Wie viel mehr Schaden macht dieser Treffer wegen ihnen, oder wie viel weniger muss ein Held
 * einstecken? Zählt für den Helden mit dem Weg. Vor dem Schaden aufrufen.
 */
export function wegAnteileZaehlen(
  unit: CombatUnit, target: CombatUnit, dmg: number, gegner: CombatUnit[], verbuendete: CombatUnit[],
): void {
  const basis = grundSchaden(unit.atk, target.def);
  const mehr = (atk: number, def: number): number => (basis - grundSchaden(atk, def)) * dmg / basis;
  if (unit.isPlayer) {
    const zorn = bonus(unit, 'zorn', 'atk');
    if (zorn > 0) wegZaehlen(unit, 'schaden', mehr(unit.atk - zorn, target.def));
    const lied = bonus(unit, 'heldenlied', 'atk');
    if (lied > 0) wegZaehlen(quelle(verbuendete, 'heldenlied'), 'schaden', mehr(unit.atk - lied, target.def));
    const segen = bonus(unit, 'kriegssegen', 'atk');
    if (segen > 0) wegZaehlen(quelle(verbuendete, 'kriegssegen'), 'schaden', mehr(unit.atk - segen, target.def));
    const fluch = bonus(target, 'fluch', 'def');
    if (fluch < 0) wegZaehlen(quelle(verbuendete, 'fluch'), 'schaden', mehr(unit.atk, target.def - fluch));
  } else if (target.isPlayer) {
    const segen = bonus(target, 'kriegssegen', 'def');
    if (segen > 0) wegZaehlen(quelle(gegner, 'kriegssegen'), 'verhindert', -mehr(unit.atk, target.def - segen));
    const kraenkung = gekraenkt(unit);
    if (kraenkung < 0) wegZaehlen(quelle(gegner, 'schmaehlied'), 'verhindert', -mehr(unit.atk - kraenkung, target.def));
  }
}

/** Schmählied: so viel Angriff fehlt dem Gegner gerade (negativ) */
function gekraenkt(unit: CombatUnit): number {
  return unit.buffs.reduce((summe, b) => summe + (b.quelle === 'schmaehlied' ? b.value : 0), 0);
}

/** Zustände aus den Wegen für die Karten im Kampf nach einer Runde (undefined, wenn keiner gilt) */
export function wegZustandDerRunde(helden: CombatUnit[], gegner: CombatUnit[]): CombatRoundSnapshot['wegZustand'] {
  const zustand = { helden: wegZustaende(helden), gegner: wegZustaende(gegner) };
  return Object.keys(zustand.helden).length + Object.keys(zustand.gegner).length > 0 ? zustand : undefined;
}

/** Zorn, Bärin, Skelette, Fluch und Kränkung je Einheit (nach ID) */
function wegZustaende(units: CombatUnit[]): Record<number, WegZustand[]> {
  const alle: Record<number, WegZustand[]> = {};
  for (const u of units) {
    if (u.hp <= 0) continue;
    const liste: WegZustand[] = [];
    const zorn = bonus(u, 'zorn', 'atk');
    if (zorn > 0) liste.push({ zeichen: `🔥+${zorn}`, titel: `Zorn: +${zorn} Angriff bis Kampfende` });
    if (u.baerin && u.tauntRounds > 0) liste.push({ zeichen: '🐻', titel: 'Bärengestalt: zieht alle Angriffe auf sich' });
    if (u.skelette) liste.push({ zeichen: `💀${u.skelette}`, titel: `${u.skelette === 1 ? 'Ein Skelett kämpft' : `${u.skelette} Skelette kämpfen`} mit` });
    const fluch = bonus(u, 'fluch', 'def');
    if (fluch < 0) liste.push({ zeichen: `🕸️−${-fluch}`, titel: `Verflucht: −${-fluch} Verteidigung bis Kampfende` });
    const kraenkung = gekraenkt(u);
    if (kraenkung < 0) liste.push({ zeichen: `🎭−${-kraenkung}`, titel: `Gekränkt: −${-kraenkung} Angriff` });
    if (liste.length > 0) alle[u.id] = liste;
  }
  return alle;
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
    u.zielschuss = !!effekt(u, 'zielschuss');
    if (u.skelette) log(`  ★ ${u.name}: ${u.skelette === 1 ? 'Ein Skelett zieht' : `${u.skelette} Skelette ziehen`} mit in den Kampf`);
    const baer = effekt(u, 'baerengestalt');
    if (baer && u.hp >= u.maxHp / 2) {
      u.tauntRounds = Math.max(u.tauntRounds, baer.runden ?? 2);
      u.baerin = true;
      log(`★ ${u.name} setzt Bärengestalt ein → zieht ${baer.runden ?? 2} Runden lang alle Angriffe auf sich`);
    }
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
  const phalanx = staerksterTraeger(helden, 'phalanx');
  if (phalanx) {
    const schild = staerke(phalanx, 'phalanx');
    for (const h of helden) h.schild = (h.schild ?? 0) + schild;
    wegZaehlen(phalanx, 'schild', schild * helden.length);
    log(`★ ${phalanx.name} setzt Phalanx ein → jeder im Team erhält einen Schild von ${schild}`);
  }
  mondwall(party, log);
  const lied = staerksterTraeger(helden, 'heldenlied');
  if (lied) {
    const e = effekt(lied, 'heldenlied')!;
    const atk = staerke(lied, 'heldenlied');
    const tempo = e.tempo ?? 0.2;
    for (const h of helden) {
      setzeBonus(h, 'heldenlied', 'atk', atk);
      setzeBonus(h, 'heldenlied', 'spd', tempo);
    }
    log(`★ ${lied.name} setzt Heldenlied ein → das ganze Team ist schneller und hat +${atk} Angriff`);
  }
  let hain: CombatUnit | undefined;
  for (const u of helden) {
    const e = effekt(u, 'hain');
    if (e && (!hain || (e.anteil ?? 0) > (effekt(hain, 'hain')!.anteil ?? 0))) hain = u;
  }
  if (hain) {
    const anteil = effekt(hain, 'hain')!.anteil ?? 0.05;
    let summe = 0;
    for (const h of helden) summe += heilen(h, Math.max(1, Math.floor(h.maxHp * anteil)));
    wegZaehlen(hain, 'heilung', summe);
    if (summe > 0) log(`★ ${hain.name} setzt ${anzeigeName(effekt(hain, 'hain')!)} ein → das ganze Team heilt ${Math.round(anteil * 100)} % Leben`);
  }
  const segen = kriegssegenAktualisieren(party);
  if (segen) log(`★ ${segen.name} setzt ${anzeigeName(effekt(segen, 'kriegssegen')!)} ein → das ganze Team hat ${segenText(segen)}`);
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

/**
 * Mondwall (Set «Pfand des Mondvogts»): Zu Beginn jedes Kampfes und danach alle 3 Runden erhält
 * jeder im Team einen Schild, der sich auf andere Schilde (Phalanx, Moospolster, Fussnote) dazulegt.
 * Bei mehreren Trägern zählt der stärkste.
 */
function mondwall(party: CombatUnit[], log: Log): void {
  const traeger = staerksterTraeger(party, 'mondwall');
  const e = traeger && effekt(traeger, 'mondwall');
  if (!traeger || !e) return;
  const schild = e.schild ?? staerke(traeger, 'mondwall');
  for (const h of lebendig(party)) h.schild = (h.schild ?? 0) + schild;
  log(`✦ ${traeger.name} setzt ${anzeigeName(e)} ein → jeder im Team erhält einen Schild von ${schild}`);
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
    for (const quelle of ['zorn', 'heldenlied', 'kriegssegen', 'schmiedetakt']) {
      setzeBonus(u, quelle, 'atk', 0);
      setzeBonus(u, quelle, 'def', 0);
      setzeBonus(u, quelle, 'spd', 0);
    }
    u.schild = 0;
    u.betaeubt = undefined;
    u.betaeubtSchutz = false;
    u.ersterSchlag = false;
    u.zielschuss = false;
    u.tauntRounds = 0;
    u.baerin = false;
    u.gift = undefined;
    u.sternenTreffer = 0;
  }
}

/**
 * Kriegspriester: Solange ein Held mit dem Segen steht, hat das ganze Team mehr Angriff und
 * Verteidigung. Gibt den Träger zurück, dessen Segen gerade gilt.
 */
function kriegssegenAktualisieren(party: CombatUnit[]): CombatUnit | undefined {
  const traeger = staerksterTraeger(party, 'kriegssegen');
  const def = traeger ? staerke(traeger, 'kriegssegen') : 0;
  const atk = traeger ? effekt(traeger, 'kriegssegen')!.atk ?? 0 : 0;
  for (const h of party) {
    setzeBonus(h, 'kriegssegen', 'atk', h.hp > 0 ? atk : 0);
    setzeBonus(h, 'kriegssegen', 'def', h.hp > 0 ? def : 0);
  }
  return traeger;
}

/** Text des Kriegssegens: «+1 Verteidigung» oder «+1 Angriff und +1 Verteidigung» */
function segenText(traeger: CombatUnit): string {
  const atk = effekt(traeger, 'kriegssegen')?.atk ?? 0;
  const def = staerke(traeger, 'kriegssegen');
  return atk > 0 ? `+${atk} Angriff und +${def} Verteidigung` : `+${def} Verteidigung`;
}

/**
 * Vor jedem Zug: Werte, die von den Leben abhängen (Tiefenrausch, Letzte Bastion, Segen des Kriegspriesters).
 * Die Bärin wird unter der Hälfte ihrer Leben wieder Druidin, sonst stirbt sie für das Team.
 */
export function zustandAktualisieren(units: CombatUnit[], log?: Log): void {
  for (const u of units) {
    if (!u.specialEffects) continue;
    const angeschlagen = u.hp > 0 && u.hp < u.maxHp / 2;
    if (effekt(u, 'tiefenrausch')) setzeBonus(u, 'tiefenrausch', 'atk', angeschlagen ? staerke(u, 'tiefenrausch') : 0);
    if (effekt(u, 'letzte_bastion')) setzeBonus(u, 'letzte_bastion', 'def', angeschlagen ? staerke(u, 'letzte_bastion') : 0);
    if (u.baerin && (u.tauntRounds <= 0 || angeschlagen)) {
      u.baerin = false;
      if (angeschlagen && u.tauntRounds > 0 && !effekt(u, 'letzte_bastion')) {
        u.tauntRounds = 0;
        log?.(`  ★ ${u.name} fällt unter die Hälfte ihrer Leben und wird wieder Druidin`);
      }
    }
  }
  if (!units.some(u => u.effektBoni?.['kriegssegen:def'] || effekt(u, 'kriegssegen'))) return;
  const vorher = Math.max(0, ...units.map(u => bonus(u, 'kriegssegen', 'def')));
  const traeger = kriegssegenAktualisieren(units);
  if (vorher > 0 && !traeger) log?.(`  ★ Der Segen des Kriegspriesters erlischt.`);
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

/**
 * Ein Boss wird wütend: mehr Angriff und Tempo. Schwächungen durch Helden (Schmählied) wachsen nicht mit,
 * sonst bliebe nach ihrem Ende ein Rest des Abzugs.
 */
export function wutAnfall(unit: CombatUnit, atkMult: number, spdMult: number): void {
  const geschwaecht = unit.buffs.reduce((s, b) => s + (b.quelle && b.stat === 'atk' ? b.value : 0), 0);
  unit.atk = Math.floor((unit.atk - geschwaecht) * atkMult) + geschwaecht;
  unit.spd *= spdMult;
}

/** Schattenstoss: Gibt den Schadens-Faktor zurück, wenn der erste Angriff des Kampfs ansteht */
export function schattenstoss(angreifer: CombatUnit): number | null {
  if (!angreifer.ersterSchlag) return null;
  angreifer.ersterSchlag = false;
  return staerke(angreifer, 'schattenstoss') || 2;
}

/**
 * Scharfschützin: zielt auf den Gegner mit den wenigsten Leben, ausser ein Gegner zieht mit Spott
 * alle Angriffe auf sich (undefined: Ziel wie sonst wählen). Ohne Zufall.
 */
export function schwaechstesZiel(angreifer: CombatUnit, ziele: CombatUnit[]): CombatUnit | undefined {
  if (!effekt(angreifer, 'zielschuss')) return undefined;
  const lebende = lebendig(ziele);
  if (lebende.length === 0 || lebende.some(z => z.tauntRounds > 0)) return undefined;
  return lebende.reduce((a, b) => (b.hp < a.hp ? b : a));
}

/** Scharfschützin: Der erste Angriff des Kampfs trifft sicher kritisch (true, wenn er jetzt ansteht) */
export function zielschuss(angreifer: CombatUnit, log: Log): boolean {
  if (!angreifer.zielschuss) return false;
  angreifer.zielschuss = false;
  const e = effekt(angreifer, 'zielschuss');
  wegZaehlen(angreifer, 'krit', 1);
  log(`★ ${angreifer.name} setzt ${e ? anzeigeName(e) : 'Scharfschützin'} ein → der erste Schuss sitzt: kritischer Treffer`);
  return true;
}

/**
 * Schaden eines Grundangriffs nach den Wegen: Fährtenleserin (markiertes Ziel erleidet von
 * Helden mehr) und Meuchlerin (angeschlagene Gegner erleiden mehr). verbuendete: das Team des
 * Angreifers, damit die Bilanz den Mehrschaden der Fährtenleserin gutschreibt.
 */
export function wegSchaden(angreifer: CombatUnit, ziel: CombatUnit, dmg: number, log: Log, verbuendete: CombatUnit[] = []): number {
  const mal = angreifer.isPlayer ? ziel.markiert ?? 0 : 0;
  let mehr = 1;
  const meucheln = effekt(angreifer, 'meucheln');
  if (meucheln && ziel.hp > 0 && ziel.hp < ziel.maxHp * (meucheln.anteil ?? 0.5)) {
    mehr = meucheln.power ?? 1.5;
    log(`  ★ ${angreifer.name}: ${anzeigeName(meucheln)}! ${ziel.name} ist angeschlagen: ${mehr === 2 ? 'doppelter' : mehr > 2 ? `${String(mehr).replace('.', ',')}-facher` : `${Math.round((mehr - 1) * 100)} % mehr`} Schaden`);
  }
  if (mal === 0 && mehr === 1) return dmg;
  if (mal > 0) wegZaehlen(quelle(verbuendete, 'faehrte'), 'schaden', dmg * mal * mehr);
  if (mehr > 1) wegZaehlen(angreifer, 'schaden', dmg * (1 + mal) * (mehr - 1));
  const faktor = (1 + mal) * mehr;
  return Math.max(1, Math.floor(dmg * faktor));
}

/**
 * Schattentänzerin: Das Ziel weicht dem Angriff (Grundangriff oder Fähigkeit auf ein Ziel) aus
 * und kontert sofort (true = ausgewichen). Würfelt nur, wenn das Ziel den Weg hat.
 */
export function schattentanz(ziel: CombatUnit, angreifer: CombatUnit, rng: SeededRNG, log: Log): boolean {
  const tanz = effekt(ziel, 'schattentanz');
  if (!tanz || ziel.hp <= 0 || !rng.chance(chance(ziel, 'schattentanz'))) return false;
  const dmg = grundSchaden(ziel.atk, angreifer.def);
  const verlust = schadenNehmen(angreifer, dmg);
  wegZaehlen(ziel, 'ausgewichen', 1);
  wegZaehlen(ziel, 'schaden', dmg);
  log(`★ ${ziel.name} setzt ${anzeigeName(tanz)} ein → weicht ${angreifer.name} aus und kontert: ${dmg} Schaden${schildText(dmg, verlust)}`);
  if (angreifer.hp <= 0) besiegt(ziel, log);
  return true;
}

/**
 * Scharfschützin: Aus der Deckung. Ein Angriff auf sie trifft mit etwas Glück den Helden mit den
 * meisten Leben (gibt das Ziel zurück). Würfelt nur, wenn das Ziel den Weg hat.
 */
export function deckung(ziel: CombatUnit, helden: CombatUnit[], rng: SeededRNG, log: Log): CombatUnit {
  const e = effekt(ziel, 'deckung');
  if (!e || !ziel.isPlayer || ziel.hp <= 0) return ziel;
  const andere = lebendig(helden).filter(h => h !== ziel && !h.isWarMachine);
  if (andere.length === 0 || !rng.chance(e.chance ?? 0.25)) return ziel;
  const neu = andere.reduce((a, b) => (b.hp > a.hp ? b : a));
  wegZaehlen(ziel, 'umgelenkt', 1);
  log(`  ★ ${ziel.name} bleibt in Deckung → der Angriff gilt ${neu.name}`);
  return neu;
}

/**
 * Schutzherr: Greift ein Gegner einen schwer verletzten Helden an, fängt ein Held mit dem
 * Weg den Angriff ab (gibt das neue Ziel zurück). Er springt nur ein, wenn es ihm selbst besser geht.
 */
export function abfangen(ziel: CombatUnit, helden: CombatUnit[], log: Log): CombatUnit {
  if (!ziel.isPlayer || ziel.isWarMachine || ziel.hp <= 0) return ziel;
  for (const u of lebendig(helden)) {
    const schutz = effekt(u, 'abfangen');
    if (!schutz || u === ziel) continue;
    if (ziel.hp >= ziel.maxHp * (schutz.anteil ?? 0.3) || u.hp / u.maxHp <= ziel.hp / ziel.maxHp) continue;
    wegZaehlen(u, 'abgefangen', 1);
    log(`★ ${u.name} setzt ${anzeigeName(schutz)} ein → fängt den Angriff auf ${ziel.name} ab`);
    return u;
  }
  return ziel;
}

/**
 * Das Ziel wird von einem Grundangriff getroffen (seite = das Team des Ziels):
 * Glutpanzer brennt den Angreifer, ein Vergelter im Team schlägt zurück.
 */
export function beimGetroffenWerden(
  ziel: CombatUnit, angreifer: CombatUnit, seite: CombatUnit[], rng: SeededRNG, log: Log,
): void {
  if (effekt(ziel, 'glutpanzer') && angreifer.hp > 0) {
    const dmg = staerke(ziel, 'glutpanzer');
    schadenNehmen(angreifer, dmg);
    log(`  ${ziel.name}: Glutpanzer! ${angreifer.name} erleidet ${dmg} Feuerschaden.`);
  }
  vergeltung(ziel, angreifer, seite, rng, log);
}

/**
 * Vergelter: Wird jemand aus seinem Team getroffen (Grundangriff oder Fähigkeit auf ein Ziel),
 * schlägt der Held mit dem Weg zurück. Würfelt nur, wenn ein Vergelter im Team steht.
 */
export function vergeltung(
  ziel: CombatUnit, angreifer: CombatUnit, seite: CombatUnit[], rng: SeededRNG, log: Log,
): void {
  let raecher: CombatUnit | undefined;
  for (const u of lebendig(seite)) {
    if (effekt(u, 'vergeltung') && (!raecher || chance(u, 'vergeltung') > chance(raecher, 'vergeltung'))) raecher = u;
  }
  if (raecher && angreifer.hp > 0 && rng.chance(chance(raecher, 'vergeltung'))) {
    const dmg = grundSchaden(raecher.atk, angreifer.def);
    const verlust = schadenNehmen(angreifer, dmg);
    wegZaehlen(raecher, 'schaden', dmg);
    const was = raecher === ziel ? 'schlägt zurück' : `rächt ${ziel.name}`;
    log(`★ ${raecher.name} setzt ${anzeigeName(effekt(raecher, 'vergeltung')!)} ein → ${was}: ${angreifer.name} erleidet ${dmg}${schildText(dmg, verlust)}`);
    if (angreifer.hp <= 0) besiegt(raecher, log);
  }
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
 * Gift, Einfrieren, Funkenflug und die Wege (Zorn, Schlächter, Fährte, Schmählied, Fluch,
 * Kreuzritter). Würfelt nur, wenn der Angreifer den Effekt hat.
 */
export function nachTreffer(
  angreifer: CombatUnit, ziel: CombatUnit, dmg: number,
  gegnerDesAngreifers: CombatUnit[], verbuendete: CombatUnit[], rng: SeededRNG, log: Log,
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
  const fall = effekt(angreifer, 'sternenfall');
  if (fall && angreifer.hp > 0) sternenfall(angreifer, fall, dmg, gegnerDesAngreifers, log);
  const stich = effekt(angreifer, 'sonnenstich');
  if (stich && angreifer.hp > 0) sonnenstich(angreifer, stich, ziel, log);
  if (angreifer.specialEffects?.some(e => e.weg)) wegNachTreffer(angreifer, ziel, dmg, gegnerDesAngreifers, verbuendete, log);
}

/**
 * Sonnenstich (Set «Sunnas Morgengabe»): Jeder Treffer des Trägers auf einen Gegner, dem es noch gut
 * geht (nach dem Treffer über dem Anteil `power` seiner Leben), brennt zusätzlich `anteil` seiner
 * vollen Leben weg, höchstens `max`. Ohne Zufall; arbeitet genau oberhalb der Grenze, unter der die
 * Meuchlerin 2,5-fach trifft.
 */
function sonnenstich(angreifer: CombatUnit, stich: SpecialEffect, ziel: CombatUnit, log: Log): void {
  const schwelle = staerke(angreifer, 'sonnenstich');
  if (ziel.hp <= 0 || ziel.hp <= ziel.maxHp * schwelle) return;
  const brand = Math.min(stich.max ?? 60, Math.max(1, Math.floor(ziel.maxHp * (stich.anteil ?? 0.05))));
  const verlust = schadenNehmen(ziel, brand);
  log(`✦ ${angreifer.name} setzt ${anzeigeName(stich)} ein → ${ziel.name} brennt: −${brand}${schildText(brand, verlust)}`);
  if (ziel.hp <= 0) besiegt(angreifer, log);
}

/** Wege, die nach einem eigenen Treffer wirken. Ohne Zufall. */
function wegNachTreffer(
  angreifer: CombatUnit, ziel: CombatUnit, dmg: number,
  gegner: CombatUnit[], verbuendete: CombatUnit[], log: Log,
): void {
  const zorn = effekt(angreifer, 'zorn');
  if (zorn && angreifer.hp > 0) {
    const alt = bonus(angreifer, 'zorn', 'atk');
    const max = zorn.max ?? 6;
    const neu = Math.min(max, alt + (zorn.power ?? 1));
    if (neu > alt) {
      setzeBonus(angreifer, 'zorn', 'atk', neu);
      if (neu === max) log(`★ ${angreifer.name} setzt ${anzeigeName(zorn)} ein → voller Zorn: +${neu} Angriff bis Kampfende`);
      else log(`  ★ ${angreifer.name}: Zorn +${neu} Angriff`);
    }
  }

  const schlag = effekt(angreifer, 'rundumschlag');
  if (schlag) {
    const andere = gegner.filter(g => g.hp > 0 && g !== ziel);
    const anteil = schlag.anteil ?? 0.25;
    const treffer: string[] = [];
    for (const g of andere) {
      const wucht = Math.max(1, Math.floor(dmg * anteil));
      schadenNehmen(g, wucht);
      wegZaehlen(angreifer, 'schaden', wucht);
      treffer.push(`${g.name} −${wucht}`);
      if (g.hp <= 0) besiegt(angreifer, log);
    }
    if (treffer.length > 0) log(`  ★ ${angreifer.name}: ${anzeigeName(schlag)} trifft alle → ${treffer.join(', ')}`);
  }

  if (ziel.hp <= 0) {
    heilenMitSchwert(angreifer, dmg, verbuendete, log);
    return;
  }

  const faehrte = effekt(angreifer, 'faehrte');
  if (faehrte) {
    const anteil = faehrte.anteil ?? 0.15;
    if ((ziel.markiert ?? 0) < anteil) {
      if (!ziel.markiert) log(`★ ${angreifer.name} setzt ${anzeigeName(faehrte)} ein → ${ziel.name} ist markiert: ${Math.round(anteil * 100)} % mehr Schaden von allen Helden`);
      ziel.markiert = anteil;
    }
  }

  const lied = effekt(angreifer, 'schmaehlied');
  if (lied) {
    const laufend = ziel.buffs.find(b => b.quelle === 'schmaehlied');
    if (laufend) laufend.remainingRounds = Math.max(laufend.remainingRounds, lied.runden ?? 2);
    else {
      const minus = Math.min(Math.max(1, Math.round(ziel.atk * (lied.anteil ?? 0.08))), Math.max(0, ziel.atk - 1));
      if (minus > 0) {
        ziel.atk -= minus;
        ziel.buffs.push({ stat: 'atk', value: -minus, remainingRounds: lied.runden ?? 2, quelle: 'schmaehlied' });
        log(`  ★ ${angreifer.name}: ${anzeigeName(lied)}! ${ziel.name} ist gekränkt: −${minus} Angriff`);
      }
    }
  }

  const fluch = effekt(angreifer, 'fluch');
  if (fluch) {
    const alt = bonus(ziel, 'fluch', 'def');
    const neu = Math.max(-(fluch.max ?? 8), alt - (fluch.power ?? 2), alt - ziel.def);
    if (neu < alt) {
      setzeBonus(ziel, 'fluch', 'def', neu);
      log(`  ★ ${angreifer.name}: ${anzeigeName(fluch)}! ${ziel.name} −${alt - neu} Verteidigung (jetzt ${ziel.def})`);
    }
  }

  heilenMitSchwert(angreifer, dmg, verbuendete, log);
}

/** Kreuzritter: Der Treffer heilt den Verbündeten mit den wenigsten Leben */
function heilenMitSchwert(angreifer: CombatUnit, dmg: number, verbuendete: CombatUnit[], log: Log): void {
  const kreuz = effekt(angreifer, 'kreuzheil');
  if (!kreuz || angreifer.hp <= 0) return;
  const ziel = verletztester(verbuendete);
  if (!ziel) return;
  const geheilt = heilen(ziel, Math.max(1, Math.floor(dmg * (kreuz.anteil ?? 0.4))));
  wegZaehlen(angreifer, 'heilung', geheilt);
  if (geheilt > 0) log(`  ★ ${angreifer.name}: ${anzeigeName(kreuz)} heilt ${ziel.name} +${geheilt}`);
}

/** Ein Gegner ist gestorben (egal wodurch): Seelenernte heilt das Team, der Knochenherr erhebt ein Skelett */
export function gegnerGestorben(gestorben: CombatUnit, party: CombatUnit[], log: Log): void {
  for (const u of lebendig(party)) {
    const knochen = effekt(u, 'skelette');
    if (knochen && (u.skelette ?? 0) < (knochen.max ?? 3)) {
      u.skelette = (u.skelette ?? 0) + 1;
      log(`★ ${u.name} setzt ${anzeigeName(knochen)} ein → ${gestorben.name} steht als Skelett wieder auf (${u.skelette})`);
    }
  }
  for (const u of lebendig(party)) {
    const ernte = effekt(u, 'seelenernte');
    if (!ernte) continue;
    const menge = ernte.power ?? 8;
    let summe = 0;
    for (const h of lebendig(party)) summe += heilen(h, menge);
    if (summe > 0) log(`✦ ${u.name} setzt Seelenernte ein → ${gestorben.name} nährt das Team (+${menge} Leben)`);
  }
}

/** Am Ende jeder Runde: Gift, Gezeitenwelle, Druckwelle, Verbotene Fussnote und die Wege mit Rundenwirkung */
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

    const gebet = effekt(u, 'heilgebet');
    if (gebet && runde % (gebet.runden ?? 2) === 0) {
      const ziel = verletztester(party);
      if (ziel) {
        const geheilt = heilen(ziel, Math.max(1, Math.floor(ziel.maxHp * (gebet.anteil ?? 0.12))));
        wegZaehlen(u, 'heilung', geheilt);
        log(`★ ${u.name} setzt ${anzeigeName(gebet)} ein → ${ziel.name} +${geheilt} Leben`);
      }
    }

    const blitz = effekt(u, 'kettenblitz');
    if (blitz && runde % (blitz.runden ?? 3) === 0 && lebendig(gegner).length > 0) {
      log(`★ ${u.name} setzt ${anzeigeName(blitz)} ein → ein Blitz trifft alle Gegner`);
      for (const g of lebendig(gegner)) {
        const dmg = Math.max(1, Math.floor(grundSchaden(u.atk, g.def) * (blitz.anteil ?? 0.7)));
        const verlust = schadenNehmen(g, dmg);
        wegZaehlen(u, 'schaden', dmg);
        log(`  ${g.name} erleidet ${dmg}${schildText(dmg, verlust)}`);
      }
    }

    const knochen = effekt(u, 'skelette');
    if (knochen && (u.skelette ?? 0) > 0 && lebendig(gegner).length > 0) {
      const wucht = Math.max(1, Math.floor(u.atk * (knochen.anteil ?? 0.3)));
      const treffer: string[] = [];
      for (let i = 0; i < (u.skelette ?? 0); i++) {
        const ziele = lebendig(gegner);
        if (ziele.length === 0) break;
        const ziel = rng.pick(ziele);
        schadenNehmen(ziel, wucht);
        wegZaehlen(u, 'schaden', wucht);
        treffer.push(`${ziel.name} −${wucht}`);
      }
      log(`  ★ ${u.name}: ${u.skelette === 1 ? 'Sein Skelett schlägt' : `${u.skelette} Skelette schlagen`} zu → ${treffer.join(', ')}`);
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
  teamRundenEnde(party, gegner, runde, log);
}

/**
 * Am Rundenende, nach den Effekten der einzelnen Helden, fürs ganze Team einmal (bei mehreren
 * Trägern zählt der stärkste): die Seuche, der Schmiedetakt und der Mondwall.
 */
function teamRundenEnde(party: CombatUnit[], gegner: CombatUnit[], runde: number, log: Log): void {
  const wall = staerksterTraeger(party, 'mondwall');
  const wallEffekt = wall && effekt(wall, 'mondwall');
  if (wallEffekt && runde % (wallEffekt.runden ?? 3) === 0 && lebendig(gegner).length > 0) mondwall(party, log);

  const seuche = staerksterTraeger(party, 'seuche');
  if (seuche && lebendig(gegner).length > 0) {
    const menge = staerke(seuche, 'seuche');
    const ziele = lebendig(gegner);
    for (const g of ziele) g.hp -= menge;
    wegZaehlen(seuche, 'schaden', menge * ziele.length);
    log(`  ★ ${seuche.name}: ${anzeigeName(effekt(seuche, 'seuche')!)} → alle Gegner −${menge} Leben`);
  }

  const takt = staerksterTraeger(party, 'schmiedetakt');
  const e = takt && effekt(takt, 'schmiedetakt');
  if (takt && e && runde % (e.runden ?? 3) === 0 && lebendig(gegner).length > 0) {
    const helden = lebendig(party);
    const alt = Math.max(...helden.map(h => bonus(h, 'schmiedetakt', 'atk')));
    const neu = Math.min(e.max ?? 9, alt + staerke(takt, 'schmiedetakt'));
    if (neu > alt) {
      for (const h of helden) setzeBonus(h, 'schmiedetakt', 'atk', neu);
      log(`✦ ${takt.name} setzt ${anzeigeName(e)} ein → das ganze Team hat +${neu} Angriff bis Kampfende`);
    }
  }
}

/**
 * Sternenfall: Jeder dritte Treffer des Trägers in einem Kampf holt einen Stern vom Himmel, der
 * alle Gegner mit einem Anteil des Schadens trifft, auch das Ziel des Treffers. Ohne Zufall.
 */
function sternenfall(angreifer: CombatUnit, fall: SpecialEffect, dmg: number, gegner: CombatUnit[], log: Log): void {
  angreifer.sternenTreffer = (angreifer.sternenTreffer ?? 0) + 1;
  if (angreifer.sternenTreffer < (fall.treffer ?? 3)) return;
  angreifer.sternenTreffer = 0;
  const ziele = lebendig(gegner);
  if (ziele.length === 0) return;
  const wucht = Math.max(1, Math.floor(dmg * (fall.anteil ?? 0.5)));
  const treffer = ziele.map(g => `${g.name} −${wucht}${schildText(wucht, schadenNehmen(g, wucht))}`);
  log(`✦ ${angreifer.name} setzt ${anzeigeName(fall)} ein → ein Stern trifft alle Gegner: ${treffer.join(', ')}`);
  for (const g of ziele) if (g.hp <= 0) besiegt(angreifer, log);
}

/**
 * Fährtenleserin: Eine Heldin mit dem Weg führt das Team an Fallen vorbei. Gibt den Anteil des
 * Fallenschadens zurück, den das Team vermeidet (0 ohne Fährtenleserin).
 */
export function sichererWeg(party: CombatUnit[], log: Log): number {
  let fuehrer: CombatUnit | undefined;
  let anteil = 0;
  for (const u of lebendig(party)) {
    const e = effekt(u, 'pfadfinder');
    if (e && (e.anteil ?? 0.5) > anteil) { fuehrer = u; anteil = e.anteil ?? 0.5; }
  }
  if (!fuehrer) return 0;
  const rest = Math.round((1 - anteil) * 100);
  const schaden = rest === 0 ? 'kein Schaden' : rest === 50 ? 'nur halber Schaden' : `nur ${rest} % Schaden`;
  log(`★ ${fuehrer.name} setzt ${anzeigeName(effekt(fuehrer, 'pfadfinder')!)} ein → findet einen sicheren Weg: ${schaden}`);
  return anteil;
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
