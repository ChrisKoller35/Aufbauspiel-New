// ─── Magic City – Gleich anlegen aus der Truhe ──────────────────
// Knopf «Lia: anlegen» in den Karten der Truhe, nur wenn das Teil über Lager und Truhe die beste Wahl ist
// (besserFuerAlle, wie die Karte im Lager). Sonst «Noch besser für …» mit dem besseren Teil.
// Expedition: Die Beute liegt noch nicht im Lager. Ruhmestruhe: schon. Regeln: docs/BEUTEVERGLEICH.md.
// ────────────────────────────────────────────────────────────────

import '../html/truhe-anlegen.css';
import { GameState } from '../../models/GameState';
import { ITEM_DEFS } from '../../data/items';
import { BesserFuer, besserFuerAlle, besserText, nochBesserAls } from '../../systems/Beutevergleich';
import { GearSystem } from '../../systems/GearSystem';
import { escapeAttr } from './SchmiedeAnzeige';

/** Expedition: Beute noch nicht eingelagert; Ruhmestruhe: schon im Lager (belohnungenAbholen) */
export type TruhenArt = 'expedition' | 'ruhm';

/** Sperre gegen Doppeltipp */
export const ANLEGEN_SPERRE_MS = 600;

export interface TruhenKarte {
  /** Grüne Zeile (null: macht niemanden stärker) */
  besser: BesserFuer | null;
  /** Knopf «‹Held›: anlegen» (nur bei bester Wahl und Rest in der Truhe) */
  anlegen: string | null;
  /** «Noch besser für Sina: Wyrmzahnklinge (im Lager)» */
  nochBesser: string | null;
  /** Wer ein Stück dieser Karte schon trägt */
  traegt: string[];
}

const gearSystem = new GearSystem();

export class TruheAnlegen {
  /** Aus der Truhe angelegt: Kennung → Namen der Helden */
  readonly angelegt = new Map<string, string[]>();
  private letztes = -Infinity;
  private readonly menge: Record<string, number>;

  /**
   * loot: Beute der Truhe ohne Gold. Bei der Expedition dasselbe Objekt, das danach `beuteEinlagern` bekommt:
   * Angelegte Stücke werden davon abgezogen (sonst lägen sie doppelt vor).
   */
  constructor(
    private readonly state: GameState,
    private readonly loot: Record<string, number>,
    private readonly art: TruhenArt,
    private readonly jetzt: () => number = () => Date.now(),
  ) {
    this.menge = { ...loot };
  }

  /** Wie viele Stücke der Truhe noch anzulegen sind */
  rest(itemId: string): number {
    if (itemId === 'gold') return 0;
    if (this.art === 'expedition') return this.loot[itemId] ?? 0;
    const offen = (this.menge[itemId] ?? 0) - (this.angelegt.get(itemId)?.length ?? 0);
    return Math.min(offen, this.state.globalStock[itemId] ?? 0);
  }

  /** Alle Karten neu gerechnet (nach jedem Anlegen aufrufen) */
  karten(): Map<string, TruhenKarte> {
    const lager = Object.keys(this.state.globalStock).filter(id => id !== 'gold' && this.state.globalStock[id] > 0);
    const truhe = Object.keys(this.menge).filter(id => this.rest(id) > 0);
    const alle = [...new Set([...lager, ...truhe])];
    const wahl = besserFuerAlle(this.state, alle);
    const karten = new Map<string, TruhenKarte>();
    for (const itemId of Object.keys(this.menge)) {
      const def = ITEM_DEFS[itemId];
      if (def?.type !== 'gear') continue;
      const besser = wahl.get(itemId) ?? null;
      const traegt = this.angelegt.get(itemId) ?? [];
      const knopf = besser?.besteWahl && this.rest(itemId) > 0 ? besser.beste.held.name : null;
      let nochBesser: string | null = null;
      if (besser && !knopf && traegt.length === 0) {
        const n = nochBesserAls(this.state, alle, itemId, besser.beste);
        if (n) {
          const wo = this.rest(n.itemId) > 0 ? 'in der Truhe' : 'im Lager';
          nochBesser = `Noch besser für ${besser.beste.held.name}: ${ITEM_DEFS[n.itemId]?.name ?? n.itemId} (${wo})`;
        }
      }
      if (besser || traegt.length > 0) karten.set(itemId, { besser, anlegen: knopf, nochBesser, traegt });
    }
    return karten;
  }

  /** Legt ein Stück dem Helden an, für den es die beste Wahl ist. false: gesperrt, keins übrig, keine beste Wahl, equip misslang */
  anlegen(itemId: string): boolean {
    if (this.jetzt() - this.letztes < ANLEGEN_SPERRE_MS) return false;
    if (this.rest(itemId) < 1) return false;
    const besser = this.karten().get(itemId)?.besser;
    if (!besser?.besteWahl) return false;
    const { held, platz } = besser.beste;
    const stock = this.state.globalStock;
    // Expedition: das Stück erst ins Lager, equip nimmt es von dort
    if (this.art === 'expedition') stock[itemId] = (stock[itemId] ?? 0) + 1;
    if (!gearSystem.equip(this.state, held, itemId, platz ?? undefined)) {
      // equip ändert beim Scheitern nichts; nur das Einlagern zurücknehmen
      if (this.art === 'expedition') stock[itemId] -= 1;
      return false;
    }
    if (this.art === 'expedition') {
      this.loot[itemId] -= 1;
      if (this.loot[itemId] <= 0) delete this.loot[itemId];
    }
    this.angelegt.set(itemId, [...(this.angelegt.get(itemId) ?? []), held.name]);
    this.letztes = this.jetzt();
    return true;
  }
}

/** Die Karten der Truhe ohne Anlegen (Lager-Abgleich wie im Spiel); leer, wenn keine Ausrüstung jemanden stärkt */
export function truhenWahl(state: GameState, loot: Record<string, number>, art: TruhenArt): Map<string, TruhenKarte> {
  return new TruheAnlegen(state, { ...loot }, art).karten();
}

/** Inhalt unter dem Namen einer Karte: grüne Zeile, «Noch besser …», Knopf bzw. «✓ … trägt es jetzt» */
export function truheAnlegenHtml(itemId: string, karte: TruhenKarte | undefined): string {
  if (!karte) return '';
  const zeilen: string[] = [];
  for (const name of karte.traegt) zeilen.push(`<span class="truhe-traegt">✓ ${escapeAttr(name)} trägt es jetzt</span>`);
  if (karte.besser && karte.traegt.length === 0) zeilen.push(`<span class="truhe-besser">${escapeAttr(besserText(karte.besser))}</span>`);
  if (karte.nochBesser) zeilen.push(`<span class="truhe-noch-besser">${escapeAttr(karte.nochBesser)}</span>`);
  if (karte.anlegen) {
    zeilen.push(`<button type="button" class="truhe-anlegen-btn" data-anlegen="${escapeAttr(itemId)}">${escapeAttr(karte.anlegen)}: anlegen</button>`);
  }
  return zeilen.join('');
}
