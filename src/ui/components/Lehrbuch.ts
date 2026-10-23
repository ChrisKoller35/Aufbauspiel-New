// ─── Magic City – Lehrbuch im Reiter «Training» ────────────────
// Ein Held auf Stufe 15 gibt seinen Überschuss an einen Helden unter
// Stufe 15 weiter. Man wählt Lehrer und Schüler, sieht vorher, was passiert
// («+800 XP → Stufe 9 auf 11»), und drückt «Lernen». Die Rechnung steht in
// systems/Ausbildung.ts. Anleitung: docs/AUSBILDUNG.md.
// ────────────────────────────────────────────────────────────────

import '../html/ausbildung.css';
import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { CLASS_DEFS } from '../../data/classes';
import { MAX_HERO_LEVEL, ueberschuss } from '../../systems/HeroProgression';
import { lehrbuchLernen, lehrbuchVorschau } from '../../systems/Ausbildung';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { escapeAttr } from './SchmiedeAnzeige';

/** Gewählter Lehrer und Schüler (bleiben beim Neuzeichnen erhalten) */
let lehrerWahl: number | null = null;
let schuelerWahl: number | null = null;
/** Was «Lernen» zuletzt bewirkt hat: einmal anzeigen */
let zuletzt: string | null = null;
/** Nach dem Lernen kurz keine weiteren Klicks: Ein Doppelklick verschiebt sonst zweimal */
let gesperrtBis = 0;
const SPERRE_MS = 600;

function name(f: GuildFighter): string {
  return escapeAttr(f.name);
}

/** Lehrer und Schüler, wie der Spieler sie gewählt hat; sonst der erste Lehrer mit Überschuss und der schwächste Schüler */
function auswahl(state: GameState): { lehrer?: GuildFighter; schueler?: GuildFighter } {
  const lehrer = state.fighters.filter(f => f.level >= MAX_HERO_LEVEL);
  const schueler = state.fighters.filter(f => f.level < MAX_HERO_LEVEL);
  return {
    lehrer: lehrer.find(f => f.id === lehrerWahl) ?? lehrer.find(f => ueberschuss(f) > 0) ?? lehrer[0],
    schueler: schueler.find(f => f.id === schuelerWahl) ?? [...schueler].sort((a, b) => a.xp - b.xp)[0],
  };
}

function wahlKnopf(rolle: 'lehrer' | 'schueler', f: GuildFighter, gewaehlt: boolean, info: string): string {
  const klasse = CLASS_DEFS[f.classId]?.name ?? f.classId;
  return `<button type="button" class="lb-wahl${gewaehlt ? ' gewaehlt' : ''}" data-lb-${rolle}="${f.id}" aria-pressed="${gewaehlt}">`
    + `<b>${name(f)}</b><small>${escapeAttr(klasse)} · ${info}</small></button>`;
}

/** Lehrbuch über den Trainingskarten; leer, solange es keinen Lehrer oder keinen Schüler gibt */
export function lehrbuchHtml(state: GameState): string {
  const lehrerListe = state.fighters.filter(f => f.level >= MAX_HERO_LEVEL);
  const schuelerListe = state.fighters.filter(f => f.level < MAX_HERO_LEVEL);
  if (lehrerListe.length === 0 || schuelerListe.length === 0) return '';

  const { lehrer, schueler } = auswahl(state);
  const vorschau = lehrer && schueler ? lehrbuchVorschau(lehrer, schueler) : null;
  const meldung = zuletzt;
  zuletzt = null;
  const vorschauText = vorschau
    ? `+${vorschau.xp} XP → Stufe ${vorschau.vonStufe} auf ${vorschau.nachStufe}`
    : `${lehrer ? name(lehrer) : 'Der Lehrer'} hat noch keinen Überschuss. Jede Expedition auf Stufe 15 bringt welchen.`;

  return `
    <section class="lehrbuch" aria-labelledby="lb-titel">
      <h3 id="lb-titel" class="lb-titel">📖 Lehrbuch</h3>
      <p class="lb-text">Ein Held auf Stufe 15 gibt seine überschüssigen XP an einen Helden unter Stufe 15 weiter, 1&nbsp;:&nbsp;1.
        Der Schüler steigt mit den Boni seiner Klasse auf, der Lehrer bleibt auf Stufe 15.</p>
      ${meldung ? `<p class="lb-meldung" role="status" tabindex="-1">${meldung}</p>` : ''}
      <div class="lb-gruppe" role="group" aria-label="Lehrer">
        <span class="lb-lbl">Lehrer</span>
        ${lehrerListe.map(f => wahlKnopf('lehrer', f, f === lehrer, `${ueberschuss(f)} XP Überschuss`)).join('')}
      </div>
      <div class="lb-gruppe" role="group" aria-label="Schüler">
        <span class="lb-lbl">Schüler</span>
        ${schuelerListe.map(f => wahlKnopf('schueler', f, f === schueler, `Stufe ${f.level}`)).join('')}
      </div>
      <div class="lb-fuss">
        <span class="lb-vorschau">${vorschauText}</span>
        <button type="button" class="btn lb-lernen" data-lb-lernen${vorschau ? '' : ' disabled'}>Lernen</button>
      </div>
    </section>`;
}

/** Knöpfe des Lehrbuchs; neuZeichnen baut die ganze Heldenseite neu */
export function bindLehrbuch(el: HTMLElement, state: GameState, neuZeichnen: () => void): void {
  // Beim Neuzeichnen bleibt die Liste, wo sie war, und der Fokus auf dem gedrückten Knopf
  const zeichnen = (fokus: string): void => {
    const fenster = document.scrollingElement;
    const scroll = el.scrollTop + (fenster?.scrollTop ?? 0);
    neuZeichnen();
    const neu = document.getElementById('s-heroes');
    if (!neu) return;
    neu.scrollTop = scroll;
    if (fenster) fenster.scrollTop = scroll - neu.scrollTop;
    const ziel = neu.querySelector<HTMLElement>(`${fokus}:not(:disabled)`) ?? neu.querySelector<HTMLElement>('.lb-meldung');
    ziel?.focus({ preventScroll: true });
  };

  el.querySelectorAll<HTMLButtonElement>('[data-lb-lehrer]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      lehrerWahl = Number(knopf.dataset.lbLehrer);
      zeichnen(`[data-lb-lehrer="${lehrerWahl}"]`);
    });
  });
  el.querySelectorAll<HTMLButtonElement>('[data-lb-schueler]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      schuelerWahl = Number(knopf.dataset.lbSchueler);
      zeichnen(`[data-lb-schueler="${schuelerWahl}"]`);
    });
  });

  const lernen = el.querySelector<HTMLButtonElement>('[data-lb-lernen]');
  lernen?.addEventListener('click', () => {
    if (lernen.disabled || Date.now() < gesperrtBis) return;
    lernen.disabled = true; // erster Klick sperrt; lehrbuchLernen prüft den Überschuss selbst
    const { lehrer, schueler } = auswahl(state);
    const r = lehrer && schueler ? lehrbuchLernen(state, lehrer.id, schueler.id) : null;
    if (!lehrer || !schueler || !r) return zeichnen('[data-lb-lernen]');
    gesperrtBis = Date.now() + SPERRE_MS;
    const neueKlassen = r.neueKlassen.map(id => CLASS_DEFS[id]?.name ?? id);
    zuletzt = `${name(schueler)} lernt von ${name(lehrer)}: +${r.xp} XP, Stufe ${r.vonStufe} auf ${r.nachStufe}.`
      + (neueKlassen.length ? ` Neu anzuheuern: ${neueKlassen.join(', ')}.` : '');
    erfolgePruefen(state);
    window.dispatchEvent(new Event('mc:speichern'));
    zeichnen('[data-lb-lernen]');
  });
}
