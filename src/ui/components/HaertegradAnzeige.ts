// ─── Magic City – Härtegrad-Wahl und Marke (systems/Haertegrade.ts) ────
// Im Team-Bildschirm drei Knöpfe «Normal · ⚔ Schwer · ☠ Albtraum» mit dem Satz
// zum gewählten Grad; auf der Routenkarte die Marke des höchsten bezwungenen Grads.
// ────────────────────────────────────────────────────────────────

import '../html/haertegrade.css';
import { GameState } from '../../models/GameState';
import { HAERTEGRADE, Haertegrad, haertegradName, haertegradSatz, hoechsterHaertegrad } from '../../systems/Haertegrade';

/** Die drei Knöpfe (✓ bis zum höchsten bezwungenen Grad) und der Satz zum gewählten Grad */
export function haertegradWahlHtml(state: GameState, routeId: string, gewaehlt: Haertegrad): string {
  const hoechster = hoechsterHaertegrad(state, routeId);
  const bis = hoechster ? HAERTEGRADE.indexOf(hoechster) : -1;
  const knoepfe = HAERTEGRADE.map((grad, i) => `<button class="haerte-knopf${grad === gewaehlt ? ' aktiv' : ''}"`
    + ` data-haertegrad="${grad}" aria-pressed="${grad === gewaehlt}">${haertegradName(grad)}${i <= bis ? ' ✓' : ''}</button>`).join('');
  const hinweis = gewaehlt !== 'normal' ? '<div class="haerte-hinweis">🎲 Der Kriegsrat rechnet noch mit Normal.</div>' : '';
  return `<div class="haerte"><div class="haerte-knoepfe" role="group" aria-label="Härtegrad">${knoepfe}</div>`
    + `<div class="haerte-text">${haertegradSatz(state, routeId, gewaehlt)}${hinweis}</div></div>`;
}

/** «☠ Albtraum bezwungen» bzw. «⚔ Schwer bezwungen» für die Routenkarte, sonst leer */
export function haertegradMarke(state: GameState, routeId: string): string {
  const grad = state.haertegrade?.[routeId];
  return grad ? `<span class="exp-haerte">${haertegradName(grad)} bezwungen</span>` : '';
}
