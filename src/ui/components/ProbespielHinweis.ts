// ─── Magic City – Hinweis «Probespiel» ──────────────────────────
// Steht im Hauptmenü unter dem Titel, solange das Probespiel läuft
// (systems/Probespiel.ts), mit dem Weg zurück zum richtigen Spielstand.
// Stil: .mc-probe-hinweis in magic-city.css.
// ────────────────────────────────────────────────────────────────

import { istProbespiel } from '../../systems/Probespiel';

export function probespielHinweisHtml(): string {
  if (!istProbespiel(location.search)) return '';
  return `<p class="mc-probe-hinweis" title="Ein eigenes Spiel zum Ausprobieren der Dungeons ganz oben. Dein richtiger Spielstand bleibt unberührt.">`
    + `Probespiel · <a href="${location.pathname}">zum richtigen Spiel</a></p>`;
}
