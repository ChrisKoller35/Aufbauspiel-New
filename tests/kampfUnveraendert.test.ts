// Der normale Kampf rechnet gleich wie vor dem Raid (docs/RAID.md, «Wo es steht»): Der Raid hat aus der
// Kampfmaschine Grundangriff, Regeneration, den Ablauf der Stärkungen und das Rundenende mitbenutzt
// (CombatEngine.buffsAblaufen, rundenEnde mit gegnerGift). Jede Route mit dem Musterteam «Stark» und den Sets
// von tagwerk0, drei Samen, Spielweise «klug»: Alle Kampfprotokolle hintereinander ergeben einen Hash (FNV-1a).
// Aufgenommen auf master 2061d8d vor dem Raid und gleich auf dem Raid-Stand.
//
// Schlägt der Test fehl, hat sich ein Kampf verändert. Ist das gewollt (neue Route, Gegner, Ausrüstung,
// Balance), den Hash aus der Fehlermeldung hier eintragen. Sonst ist etwas im Kampf ungewollt anders.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { musterStand, spieleRoute } from '../src/systems/Musterlauf';

const ERWARTET = { hash: '18922bb0', routen: 31, zeilen: 11994 };
const SAMEN = [1, 7919, 15838];

/** FNV-1a über die Zeichen eines Texts, fortgesetzt ab `h` */
function fnv(h: number, text: string): number {
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Fester Ersatz für Math.random, falls irgendwo im Kampf noch ein Zufall ohne Samen steckt */
function festerZufall(): () => number {
  let z = 0x2545f491;
  return () => {
    z = (Math.imul(z, 1664525) + 1013904223) >>> 0;
    return z / 4294967296;
  };
}

describe('Kampf unverändert', () => {
  afterEach(() => vi.restoreAllMocks());

  it('alle Routen mit Musterteam «Stark» ergeben dieselben Kampfprotokolle', () => {
    vi.spyOn(Math, 'random').mockImplementation(festerZufall());
    let h = 0x811c9dc5;
    let zeilen = 0;
    const routen = Object.keys(ROUTE_DEFS).sort();
    for (const routeId of routen) {
      for (const samen of SAMEN) {
        const { state, ids } = musterStand('stark', samen, 'tagwerk0');
        const log = spieleRoute(state, ids, routeId, 'klug').combatLog;
        zeilen += log.length;
        h = fnv(h, `${routeId}#${samen}\n${log.join('\n')}\n`);
      }
    }
    expect({ hash: h.toString(16).padStart(8, '0'), routen: routen.length, zeilen }).toEqual(ERWARTET);
  });
});
