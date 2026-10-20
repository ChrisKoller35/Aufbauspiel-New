// ─── Magic City – Wege der Helden (Spezialisierung) ─────────────
// Ab Stufe 10 wählt jeder Held einen von zwei Wegen seiner Klasse, für immer.
// Ab Stufe 15 ist er Meister seines Wegs, die Wirkung wird stärker.
// Ein Weg wirkt im Kampf über Kampfeffekte (systems/Kampfeffekte.ts), manche
// geben dazu feste Werte. Regeln: systems/Spezialisierung.ts.
// ────────────────────────────────────────────────────────────────

import type { SpecialEffect } from '../models/ExpeditionRun';
import type { SetWerte } from './dungeonSets';

export const WEG_AB_STUFE = 10;
export const MEISTER_AB_STUFE = 15;

type WegEffekt = Omit<SpecialEffect, 'usesLeft'>;

export interface SpezialisierungDef {
  /** z. B. guardian_bollwerk */
  id: string;
  /** Klasse (CLASS_DEFS) */
  klasse: string;
  name: string;
  zeichen: string;
  /** Rolle in wenigen Worten, z. B. «Schützt das ganze Team» */
  kurz: string;
  /** Wirkung ab Stufe 10, mit Zahlen */
  text: string;
  /** Was die Meisterschaft ab Stufe 15 ändert */
  meisterText: string;
  effekte: WegEffekt[];
  /** Effekte ab Stufe 15 (ersetzen die von Stufe 10) */
  meisterEffekte: WegEffekt[];
  werte?: SetWerte;
  /** Werte ab Stufe 15 (ersetzen die von Stufe 10) */
  meisterWerte?: SetWerte;
}

export const SPEZIALISIERUNGEN: SpezialisierungDef[] = [
  // ── Wächter ──
  {
    id: 'guardian_bollwerk', klasse: 'guardian', name: 'Bollwerk', zeichen: '🛡️',
    kurz: 'Schützt das ganze Team',
    text: 'Zu Beginn jedes Kampfs erhält jeder im Team einen Schild von 5. Dazu +10 Leben.',
    meisterText: 'Schild von 6, +15 Leben.',
    effekte: [{ id: 'bollwerk', power: 5 }],
    meisterEffekte: [{ id: 'bollwerk', power: 6 }],
    werte: { hp: 10 },
    meisterWerte: { hp: 15 },
  },
  {
    id: 'guardian_vergelter', klasse: 'guardian', name: 'Vergelter', zeichen: '⚔️',
    kurz: 'Rächt jeden Treffer am Team',
    text: 'Trifft ein Gegner jemanden aus dem Team, schlägt er mit 30 % Chance sofort zurück. Angriffe auf alle zählen nicht. Dazu +2 Angriff.',
    meisterText: '45 % Chance, +3 Angriff.',
    effekte: [{ id: 'vergeltung', chance: 0.3 }],
    meisterEffekte: [{ id: 'vergeltung', chance: 0.45 }],
    werte: { atk: 2 },
    meisterWerte: { atk: 3 },
  },
  // ── Waldläuferin ──
  {
    id: 'ranger_scharfschuetzin', klasse: 'ranger', name: 'Scharfschützin', zeichen: '🎯',
    kurz: 'Trifft aus der Deckung',
    text: 'Zielt auf den Gegner mit den wenigsten Leben, ihr erster Schuss in jedem Kampf trifft kritisch. Angriffe auf sie treffen mit 25 % Chance einen anderen Helden. Dazu +10 % Krit-Chance.',
    meisterText: '40 % Chance, +15 % Krit-Chance und Krit-Schaden +0,3.',
    effekte: [{ id: 'zielschuss' }, { id: 'deckung', chance: 0.25 }],
    meisterEffekte: [{ id: 'zielschuss' }, { id: 'deckung', chance: 0.4 }],
    werte: { critChance: 0.1 },
    meisterWerte: { critChance: 0.15, critMult: 0.3 },
  },
  {
    id: 'ranger_faehrtenleserin', klasse: 'ranger', name: 'Fährtenleserin', zeichen: '🐾',
    kurz: 'Liest Spuren und Fallen',
    text: 'Wen sie trifft, der ist markiert: Alle Helden treffen ihn 25 % härter. Fallen machen dem Team nur halben Schaden.',
    meisterText: '35 % härter, Fallen machen gar keinen Schaden.',
    effekte: [{ id: 'faehrte', anteil: 0.25 }, { id: 'pfadfinder', anteil: 0.5 }],
    meisterEffekte: [{ id: 'faehrte', anteil: 0.35 }, { id: 'pfadfinder', anteil: 1 }],
  },
  // ── Kleriker ──
  {
    id: 'cleric_lichtbringer', klasse: 'cleric', name: 'Lichtbringer', zeichen: '✨',
    kurz: 'Heilt mitten im Kampf',
    text: 'Alle 3 Runden heilt er den Verbündeten, dem es am schlechtesten geht, um 5 % von dessen vollem Leben.',
    meisterText: '7 % des vollen Lebens.',
    effekte: [{ id: 'heilgebet', runden: 3, anteil: 0.05 }],
    meisterEffekte: [{ id: 'heilgebet', runden: 3, anteil: 0.07 }],
  },
  {
    id: 'cleric_kriegspriester', klasse: 'cleric', name: 'Kriegspriester', zeichen: '⚒️',
    kurz: 'Segnet das Team, solange er steht',
    text: 'Solange er steht, hat das ganze Team +1 Verteidigung.',
    meisterText: '+1 Angriff und +1 Verteidigung.',
    effekte: [{ id: 'kriegssegen', power: 1 }],
    meisterEffekte: [{ id: 'kriegssegen', power: 1, atk: 1 }],
  },
  // ── Berserker ──
  {
    id: 'berserker_zorn', klasse: 'berserker', name: 'Zorn', zeichen: '🔥',
    kurz: 'Wird mit jedem Hieb wilder',
    text: 'Jeder eigene Treffer gibt +2 Angriff bis Kampfende, höchstens +8.',
    meisterText: 'Höchstens +12.',
    effekte: [{ id: 'zorn', power: 2, max: 8 }],
    meisterEffekte: [{ id: 'zorn', power: 2, max: 12 }],
  },
  {
    id: 'berserker_schlaechter', klasse: 'berserker', name: 'Schlächter', zeichen: '🪓',
    kurz: 'Trifft alle auf einmal',
    text: 'Jeder Treffer trifft auch alle anderen Gegner mit 50 % des Schadens.',
    meisterText: '75 % des Schadens.',
    effekte: [{ id: 'rundumschlag', anteil: 0.5 }],
    meisterEffekte: [{ id: 'rundumschlag', anteil: 0.75 }],
  },
  // ── Assassine ──
  {
    id: 'assassin_meuchlerin', klasse: 'assassin', name: 'Meuchlerin', zeichen: '🗡️',
    kurz: 'Beendet, was andere beginnen',
    text: 'Gegner mit weniger als 50 % Leben erleiden von ihr 50 % mehr Schaden.',
    meisterText: 'Doppelter Schaden.',
    effekte: [{ id: 'meucheln', anteil: 0.5, power: 1.5 }],
    meisterEffekte: [{ id: 'meucheln', anteil: 0.5, power: 2 }],
  },
  {
    id: 'assassin_schattentaenzerin', klasse: 'assassin', name: 'Schattentänzerin', zeichen: '🌒',
    kurz: 'Weicht aus und kontert',
    text: '25 % Chance, einem Angriff auszuweichen und sofort zurückzuschlagen. Angriffen auf alle weicht sie nicht aus.',
    meisterText: '35 % Chance.',
    effekte: [{ id: 'schattentanz', chance: 0.25 }],
    meisterEffekte: [{ id: 'schattentanz', chance: 0.35 }],
  },
  // ── Paladin ──
  {
    id: 'paladin_schutzherr', klasse: 'paladin', name: 'Schutzherr', zeichen: '⛑️',
    kurz: 'Wirft sich vor Verletzte',
    text: 'Wird ein Verbündeter mit weniger als 40 % Leben angegriffen, fängt er den Angriff ab, sofern es ihm selbst besser geht. Dazu +1 Verteidigung.',
    meisterText: 'Schon unter 60 % Leben, +5 Verteidigung.',
    effekte: [{ id: 'abfangen', anteil: 0.4 }],
    meisterEffekte: [{ id: 'abfangen', anteil: 0.6 }],
    werte: { def: 1 },
    meisterWerte: { def: 5 },
  },
  {
    id: 'paladin_kreuzritter', klasse: 'paladin', name: 'Kreuzritter', zeichen: '⚜️',
    kurz: 'Heilt mit dem Schwert',
    text: 'Seine Treffer heilen den Verbündeten, dem es am schlechtesten geht, um 8 % des Schadens.',
    meisterText: '12 % des Schadens.',
    effekte: [{ id: 'kreuzheil', anteil: 0.08 }],
    meisterEffekte: [{ id: 'kreuzheil', anteil: 0.12 }],
  },
  // ── Bardin ──
  {
    id: 'bard_heldenlied', klasse: 'bard', name: 'Heldenlied', zeichen: '🎵',
    kurz: 'Spielt das Team nach vorn',
    text: 'Zu Beginn jedes Kampfs: Das ganze Team ist schneller (Tempo +0,1) und hat +1 Angriff bis Kampfende.',
    meisterText: 'Tempo +0,2 und +2 Angriff.',
    effekte: [{ id: 'heldenlied', power: 1, tempo: 0.1 }],
    meisterEffekte: [{ id: 'heldenlied', power: 2, tempo: 0.2 }],
  },
  {
    id: 'bard_schmaehlied', klasse: 'bard', name: 'Schmählied', zeichen: '🎭',
    kurz: 'Singt Gegner klein',
    text: 'Wen sie trifft, der ist so gekränkt, dass er 2 Runden lang 8 % weniger Angriff hat.',
    meisterText: '10 % weniger Angriff.',
    effekte: [{ id: 'schmaehlied', anteil: 0.08, runden: 2 }],
    meisterEffekte: [{ id: 'schmaehlied', anteil: 0.1, runden: 2 }],
  },
  // ── Hexe ──
  {
    id: 'witch_sturmhexe', klasse: 'witch', name: 'Sturmhexe', zeichen: '⚡',
    kurz: 'Ruft Blitze auf alle',
    text: 'Alle 2 Runden trifft ein Blitz jeden Gegner mit 60 % eines normalen Treffers von ihr.',
    meisterText: '90 % eines normalen Treffers.',
    effekte: [{ id: 'kettenblitz', runden: 2, anteil: 0.6 }],
    meisterEffekte: [{ id: 'kettenblitz', runden: 2, anteil: 0.9 }],
  },
  {
    id: 'witch_fluchweberin', klasse: 'witch', name: 'Fluchweberin', zeichen: '🕸️',
    kurz: 'Flucht Rüstungen weg',
    text: 'Jeder Treffer verflucht das Ziel: −1 Verteidigung bis Kampfende, höchstens −5.',
    meisterText: '−2 je Treffer.',
    effekte: [{ id: 'fluch', power: 1, max: 5 }],
    meisterEffekte: [{ id: 'fluch', power: 2, max: 5 }],
  },
  // ── Nekromant ──
  {
    id: 'necromancer_knochenherr', klasse: 'necromancer', name: 'Knochenherr', zeichen: '💀',
    kurz: 'Gefallene kämpfen für ihn',
    text: 'Gefallene Gegner stehen als Skelette wieder auf und kämpfen bis zum Ende der Expedition mit, höchstens 2. Am Ende jeder Runde trifft jedes Skelett einen Gegner mit 25 % des Angriffs des Nekromanten.',
    meisterText: 'Höchstens 3 Skelette, dafür trifft jedes mit 20 %.',
    effekte: [{ id: 'skelette', max: 2, anteil: 0.25 }],
    meisterEffekte: [{ id: 'skelette', max: 3, anteil: 0.2 }],
  },
  {
    id: 'necromancer_seuchenbringer', klasse: 'necromancer', name: 'Seuchenbringer', zeichen: '☣️',
    kurz: 'Vergiftet alle Gegner',
    text: 'Am Ende jeder Runde verlieren alle Gegner 4 Leben durch Seuche.',
    meisterText: '7 Leben.',
    effekte: [{ id: 'seuche', power: 4 }],
    meisterEffekte: [{ id: 'seuche', power: 7 }],
  },
  // ── Druidin ──
  {
    id: 'druid_baerengestalt', klasse: 'druid', name: 'Bärengestalt', zeichen: '🐻',
    kurz: 'Wird zur Bärin und hält aus',
    text: '+10 Leben und +2 Verteidigung. Zu Beginn jedes Kampfs zieht sie 2 Runden lang alle Angriffe auf sich.',
    meisterText: '+20 Leben, +4 Verteidigung, 3 Runden.',
    effekte: [{ id: 'baerengestalt', runden: 2 }],
    meisterEffekte: [{ id: 'baerengestalt', runden: 3 }],
    werte: { hp: 10, def: 2 },
    meisterWerte: { hp: 20, def: 4 },
  },
  {
    id: 'druid_hain', klasse: 'druid', name: 'Hüterin des Hains', zeichen: '🌿',
    kurz: 'Der Hain heilt das Team',
    text: 'Zu Beginn jedes Kampfs heilt das ganze Team 6 % seines vollen Lebens.',
    meisterText: '8 % des vollen Lebens.',
    effekte: [{ id: 'hain', anteil: 0.06 }],
    meisterEffekte: [{ id: 'hain', anteil: 0.08 }],
  },
];

const NACH_ID: Record<string, SpezialisierungDef> = Object.fromEntries(SPEZIALISIERUNGEN.map(s => [s.id, s]));

export function getSpezialisierung(id: string | null | undefined): SpezialisierungDef | undefined {
  return id ? NACH_ID[id] : undefined;
}

/** Die beiden Wege einer Klasse (leer für Klassen ohne Wege) */
export function wegeDerKlasse(klasse: string): SpezialisierungDef[] {
  return SPEZIALISIERUNGEN.filter(s => s.klasse === klasse);
}
