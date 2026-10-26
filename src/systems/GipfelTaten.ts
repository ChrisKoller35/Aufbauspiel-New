// ─── Gipfel-Taten: dreimal das Risiko in den sechs obersten Dungeons ───
// Welche Option in einem festen Wahl-Raum gewählt wurde, steht nur in der Chronik des Laufs
// (chronikNachWahl hängt den Satz nachklang.a oder nachklang.b an). Gezählt wird am Ende der
// Expedition (ExpeditionFinalizer), solange der Lauf noch ganz da ist. Jede Tat zählt nur einmal.

import { ExpeditionRun, dungeonBezwungen } from '../models/ExpeditionRun';
import { geschichteVon } from './Geschichten';

/** Wie viele feste Wahl-Räume dieses Laufs mit der ersten Option (dem Risiko) entschieden wurden */
export function ersteOptionen(run: ExpeditionRun): number {
  const chronik = run.chronik ?? [];
  const wahlen = Object.values(geschichteVon(run.routeId)?.raumWahlen ?? {});
  return wahlen.filter(w => chronik.includes(w.nachklang.a)).length;
}

/**
 * Dreimal die erste Option und der Boss tot: die Tat des Dungeons. Dreimal die erste Option im Mondhof,
 * aber Argentis lebt (Rückzug, Niederlage, Rundenlimit): «Kleingedrucktes». Immer auf 1, nie hochzählen,
 * sonst brächte eine Tat sechsmal gemacht «Hat alles».
 */
export function gipfelTatenZaehlen(stats: Record<string, number>, run: ExpeditionRun): void {
  if (ersteOptionen(run) < 3) return;
  if (!dungeonBezwungen(run)) {
    if (run.routeId === 'mondhof') stats.tat_kleingedrucktes = 1;
    return;
  }
  switch (run.routeId) {
    case 'drachenhort': stats.tat_hort = 1; break;
    case 'himmelsarchiv': stats.tat_archiv = 1; break;
    case 'sternenschmiede': stats.tat_esse = 1; break;
    case 'sternenschlund': stats.tat_schlund = 1; break;
    case 'mondhof': stats.tat_pfand = 1; break;
    case 'morgentor': stats.tat_uhr = 1; break;
  }
}
