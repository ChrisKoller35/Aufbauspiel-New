// ─── Magic City – Kriegsrat ─────────────────────────────────────
// Vor dem Aufbruch: Die gewählte Expedition läuft `anzahl`-mal auf Kopien
// des Spielstands, mit der Spielweise «klug» aus dem Musterlauf und einer
// einfachen Proviant-Regel. Der echte Spielstand bleibt unberührt
// (docs/KRIEGSRAT.md). Reine Logik, kein DOM.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../models/GameState';
import { EncounterRoom, ExpeditionRun } from '../models/ExpeditionRun';
import { ENEMY_DEFS } from '../data/enemies';
import { ITEM_DEFS } from '../data/items';
import { ExpeditionSystem } from './ExpeditionSystem';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { istGeschichtsWahl } from './Geschichten';
import { KLUG_AB_LEBEN, amRundenlimit, gewonnen } from './Musterlauf';

export interface KriegsratErgebnis {
  /** Dungeon bezwungen (Musterlauf.ts gewonnen) */
  siege: number;
  niederlagen: number;
  /**
   * Weder Sieg noch Niederlage: Nach dem Rundenlimit steht der Boss noch (Musterlauf.ts amRundenlimit).
   * Das Spiel zeigt dann «SIEG!», der Dungeon gilt aber nicht als bezwungen. Der Rat zieht sich nie zurück.
   */
  bossUeberlebt: number;
  /** Raum (Nummer ab 1), in dem die meisten nicht gewonnenen Läufe endeten, bei Gleichstand der spätere */
  gefaehrlichsterRaum: { nummer: number; gegner: string[]; laeufe: number } | null;
  /** Ø Gold je Lauf, gerundet */
  goldSchnitt: number;
}

/** Unter diesem Anteil der Gruppenleben setzt der Rat heilenden Proviant ein. */
export const PROVIANT_UNTER_LEBEN = 0.5;

/** Nur vor diesen Räumen lässt das Spiel Proviant zu: Kampf-Vorschau in ExpeditionFlow.ts showNextCombatRoom. */
const KAMPFRAEUME: EncounterRoom['type'][] = ['combat', 'boss', 'fortification'];

function gruppenLeben(run: ExpeditionRun): number {
  const max = run.party.reduce((summe, u) => summe + u.maxHp, 0);
  return max > 0 ? run.party.reduce((summe, u) => summe + Math.max(0, u.hp), 0) / max : 0;
}

/**
 * Ein Lauf auf der Kopie, wie `spieleRoute` (Musterlauf.ts) mit «klug», dazu die Proviant-Regel:
 * vor einem Kampfraum ein heilender Vorrat, wenn die Gruppe unter halben Leben ist.
 */
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
      if (KAMPFRAEUME.includes(run.rooms[run.currentRoom].type) && gruppenLeben(run) < PROVIANT_UNTER_LEBEN) {
        const index = run.provisions.findIndex(p => p.qty > 0 && (ITEM_DEFS[p.itemId]?.healAmount ?? 0) > 0);
        if (index >= 0) system.useProvision(kopie, index);
      }
      system.processCurrentRoom(kopie);
    }
  }
  return run;
}

/**
 * Spielt die Expedition `anzahl`-mal auf Kopien von `state` durch und zählt die Ausgänge, Lauf für Lauf:
 * Nach jedem Lauf gibt es die Zahl der fertigen Läufe ab, am Ende das Ergebnis. So rechnet das Fenster
 * in Häppchen und hält den Browser frei (KriegsratFenster.ts).
 */
export function* kriegsratLaeufe(
  state: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>, anzahl = 20,
): Generator<number, KriegsratErgebnis, void> {
  // Einmal kopiert: Alle Läufe gehen vom selben Stand aus, auch wenn die Stadt zwischen zwei Häppchen weiterläuft
  const basis = JSON.stringify(state);
  const ergebnis: KriegsratErgebnis = { siege: 0, niederlagen: 0, bossUeberlebt: 0, gefaehrlichsterRaum: null, goldSchnitt: 0 };
  const enden = new Map<number, { zahl: number; gegner: string[] }>();
  let gold = 0;
  for (let i = 0; i < anzahl; i++) {
    const kopie: GameState = JSON.parse(basis);
    kopie.activeExpedition = null;
    kopie.rngSeed = 1000 + i * 7919;
    const run = probelauf(kopie, routeId, heroIds, proviant);
    gold += run.goldEarned;
    if (gewonnen(run)) ergebnis.siege++;
    else {
      // Am Rundenlimit endet der Lauf im Bossraum, eine Niederlage im Raum, in dem die Gruppe fiel
      let index = Math.min(run.currentRoom, run.rooms.length - 1);
      if (run.status === 'defeat') ergebnis.niederlagen++;
      else if (amRundenlimit(run)) {
        ergebnis.bossUeberlebt++;
        index = run.rooms.findIndex(r => r.type === 'boss');
      } else throw new Error(`Probelauf endete unerwartet (${run.status})`);
      const eintrag = enden.get(index) ?? {
        zahl: 0,
        gegner: [...new Set(run.rooms[index].enemies.map(e => (e.defId && ENEMY_DEFS[e.defId]?.name) || e.name))],
      };
      eintrag.zahl++;
      enden.set(index, eintrag);
    }
    yield i + 1;
  }
  // Bei Gleichstand der spätere Raum: Dorthin kommen weniger Läufe, also scheitert dort ein grösserer Teil
  for (const [index, { zahl, gegner }] of enden) {
    const bisher = ergebnis.gefaehrlichsterRaum;
    if (!bisher || zahl > bisher.laeufe || (zahl === bisher.laeufe && index + 1 > bisher.nummer)) {
      ergebnis.gefaehrlichsterRaum = { nummer: index + 1, gegner, laeufe: zahl };
    }
  }
  ergebnis.goldSchnitt = anzahl > 0 ? Math.round(gold / anzahl) : 0;
  return ergebnis;
}

/** Alle Läufe am Stück (`kriegsratLaeufe`), etwa für Tests. */
export function kriegsrat(
  state: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>, anzahl = 20,
): KriegsratErgebnis {
  const laeufe = kriegsratLaeufe(state, routeId, heroIds, proviant, anzahl);
  let schritt = laeufe.next();
  while (!schritt.done) schritt = laeufe.next();
  return schritt.value;
}
