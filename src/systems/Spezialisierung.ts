// ─── Magic City – Spezialisierung der Helden ────────────────────
// Ab Stufe 10 wählt ein Held einen von zwei Wegen seiner Klasse
// (data/spezialisierungen.ts), die Wahl gilt für immer. Ab Stufe 15 ist er
// Meister seines Wegs. Werte und Kampfeffekte des Wegs kommen über
// GearSystem in den Kampf, die Wirkung steht in systems/Kampfeffekte.ts.
// ────────────────────────────────────────────────────────────────

import { GuildFighter } from '../models/GuildRoster';
import { SpecialEffect, WegWirkung, WegWirkungArt } from '../models/ExpeditionRun';
import { SetWerte } from '../data/dungeonSets';
import {
  MEISTER_AB_STUFE, SpezialisierungDef, WEG_AB_STUFE, getSpezialisierung, wegeDerKlasse,
} from '../data/spezialisierungen';

/** Der gewählte Weg des Helden (null, solange er keinen hat oder unter Stufe 10 ist) */
export function wegVon(fighter: GuildFighter): SpezialisierungDef | null {
  const weg = getSpezialisierung(fighter.spezialisierung);
  return weg && weg.klasse === fighter.classId && fighter.level >= WEG_AB_STUFE ? weg : null;
}

/** Darf der Held jetzt einen Weg wählen? */
export function kannWegWaehlen(fighter: GuildFighter): boolean {
  return fighter.level >= WEG_AB_STUFE && !wegVon(fighter) && wegeDerKlasse(fighter.classId).length > 0;
}

/** Wählt den Weg für immer. false, wenn der Held noch nicht darf, schon einen hat oder der Weg nicht zur Klasse passt. */
export function waehleWeg(fighter: GuildFighter, wegId: string): boolean {
  const weg = getSpezialisierung(wegId);
  if (!weg || weg.klasse !== fighter.classId || !kannWegWaehlen(fighter)) return false;
  fighter.spezialisierung = weg.id;
  return true;
}

/** Meister seines Wegs (Stufe 15)? */
export function istMeister(fighter: GuildFighter): boolean {
  return !!wegVon(fighter) && fighter.level >= MEISTER_AB_STUFE;
}

/** Feste Werte des Wegs (Leben, Verteidigung, Krit-Schaden …) */
export function wegWerte(fighter: GuildFighter): SetWerte {
  const weg = wegVon(fighter);
  if (!weg) return {};
  return { ...(istMeister(fighter) ? weg.meisterWerte ?? weg.werte : weg.werte) };
}

/** Kampfeffekte des Wegs für den Helden */
export function wegEffekte(fighter: GuildFighter): SpecialEffect[] {
  const weg = wegVon(fighter);
  if (!weg) return [];
  const effekte = istMeister(fighter) ? weg.meisterEffekte : weg.effekte;
  return effekte.map(e => ({ ...e, name: e.name ?? weg.name, weg: weg.id, usesLeft: -1 }));
}

/** Zählt die Bilanz einer Expedition zur Bilanz aller Expeditionen des Helden dazu */
export function wegBilanzDazu(fighter: GuildFighter, wirkung: WegWirkung | undefined): void {
  if (!wirkung) return;
  const bilanz = fighter.wegBilanz ?? (fighter.wegBilanz = {});
  for (const [art, menge] of Object.entries(wirkung) as [WegWirkungArt, number][]) {
    bilanz[art] = Math.round((bilanz[art] ?? 0) + menge);
  }
}
