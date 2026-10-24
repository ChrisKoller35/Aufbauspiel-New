// ─── Magic City – Kriegsrat ─────────────────────────────────────
// Vor dem Aufbruch: Die gewählte Expedition läuft `anzahl`-mal auf Kopien
// des Spielstands, mit der Spielweise «klug» aus dem Musterlauf und einer
// einfachen Proviant-Regel. Der echte Spielstand bleibt unberührt
// (docs/KRIEGSRAT.md). Reine Logik, kein DOM.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { ExpeditionRun } from '../models/ExpeditionRun';
import { ENEMY_DEFS } from '../data/enemies';
import { ITEM_DEFS } from '../data/items';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { istGeschichtsWahl } from './Geschichten';
import { KLUG_AB_LEBEN, gewonnen } from './Musterlauf';

export interface KriegsratErgebnis {
  siege: number;
  niederlagen: number;
  rueckzuege: number;
  /** Raum (Nummer ab 1), in dem die meisten nicht gewonnenen Läufe endeten */
  gefaehrlichsterRaum: { nummer: number; gegner: string[] } | null;
  /** Ø Gold je Lauf, gerundet */
  goldSchnitt: number;
}

/** Unter diesem Anteil der Gruppenleben setzt der Rat heilenden Proviant ein. */
export const PROVIANT_UNTER_LEBEN = 0.5;

function gruppenLeben(run: ExpeditionRun): number {
  const max = run.party.reduce((summe, u) => summe + u.maxHp, 0);
  return max > 0 ? run.party.reduce((summe, u) => summe + Math.max(0, u.hp), 0) / max : 0;
}

/** Ein Lauf auf der Kopie, wie `spieleRoute` (Musterlauf.ts) mit «klug», dazu die Proviant-Regel. */
function probelauf(kopie: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>): ExpeditionRun {
  const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());
  const consumables: string[] = [];
  for (const [itemId, qty] of Object.entries(proviant)) {
    for (let i = 0; i < qty; i++) consumables.push(itemId);
  }
  const run = system.startExpedition(kopie, routeId, heroIds, 'normal', null, false, consumables);
  if (!run) throw new Error(`Route ${routeId} lässt sich nicht starten`);
  for (let schritt = 0; schritt < 500; schritt++) {
    const step = system.nextStep(run);
    if (step === 'finish') break;
    if (step === 'checkpoint') system.resolveCheckpoint(run, false);
    else if (step === 'merchant') system.merchantSkip(run);
    else if (step === 'choice') {
      const raum = run.rooms[run.pendingChoice!.roomIndex];
      const risiko = gruppenLeben(run) >= KLUG_AB_LEBEN;
      if (istGeschichtsWahl(run.pendingChoice)) system.resolveChoice(run, risiko ? 1 : 0);
      else system.resolveChoice(run, raum.type === 'rest' || risiko ? 0 : 1);
    } else {
      if (gruppenLeben(run) < PROVIANT_UNTER_LEBEN) {
        const index = run.provisions.findIndex(p => p.qty > 0 && (ITEM_DEFS[p.itemId]?.healAmount ?? 0) > 0);
        if (index >= 0) system.useProvision(kopie, index);
      }
      system.processCurrentRoom(kopie);
    }
  }
  return run;
}

/** Spielt die Expedition `anzahl`-mal auf Kopien von `state` durch und zählt die Ausgänge. */
export function kriegsrat(
  state: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>, anzahl = 20,
): KriegsratErgebnis {
  const ergebnis: KriegsratErgebnis = { siege: 0, niederlagen: 0, rueckzuege: 0, gefaehrlichsterRaum: null, goldSchnitt: 0 };
  const enden = new Map<number, { zahl: number; gegner: string[] }>();
  let gold = 0;
  for (let i = 0; i < anzahl; i++) {
    const kopie: GameState = JSON.parse(JSON.stringify(state));
    kopie.activeExpedition = null;
    kopie.rngSeed = 1000 + i * 7919;
    const run = probelauf(kopie, routeId, heroIds, proviant);
    gold += run.goldEarned;
    if (gewonnen(run)) {
      ergebnis.siege++;
      continue;
    }
    if (run.status === 'defeat') ergebnis.niederlagen++;
    else ergebnis.rueckzuege++;
    const index = Math.min(run.currentRoom, run.rooms.length - 1);
    const eintrag = enden.get(index) ?? {
      zahl: 0,
      gegner: [...new Set(run.rooms[index].enemies.map(e => (e.defId && ENEMY_DEFS[e.defId]?.name) || e.name))],
    };
    eintrag.zahl++;
    enden.set(index, eintrag);
  }
  let meiste = 0;
  for (const [index, { zahl, gegner }] of enden) {
    if (zahl > meiste) {
      meiste = zahl;
      ergebnis.gefaehrlichsterRaum = { nummer: index + 1, gegner };
    }
  }
  ergebnis.goldSchnitt = anzahl > 0 ? Math.round(gold / anzahl) : 0;
  return ergebnis;
}
