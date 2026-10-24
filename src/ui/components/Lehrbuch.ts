// ─── Magic City – Lehrbuch im Reiter «Training» ────────────────
// Ein Held auf Stufe 15 gibt seinen Überschuss an einen Helden unter
// Stufe 15 weiter. Man wählt Lehrer und Schüler, sieht vorher, was passiert
// («+800 XP → Stufe 9 auf 12»), und drückt «Lernen». Die Rechnung steht in
// systems/Ausbildung.ts. Anleitung: docs/AUSBILDUNG.md.
// ────────────────────────────────────────────────────────────────

import '../html/ausbildung.css';
import { GameState } from '../../models/GameState';
import { GuildFighter } from '../../models/GuildRoster';
import { CLASS_DEFS } from '../../data/classes';
import { MAX_HERO_LEVEL, totalXpForLevel, ueberschuss } from '../../systems/HeroProgression';
import { lehrbuchLernen, lehrbuchVorschau } from '../../systems/Ausbildung';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { escapeAttr } from './SchmiedeAnzeige';
import { schluckeZweitenKlick } from './FensterHilfen';

/** Gewählter Lehrer und Schüler (bleiben beim Neuzeichnen erhalten) */
let lehrerWahl: number | null = null;
let schuelerWahl: number | null = null;
/** Was «Lernen» zuletzt bewirkt hat: einmal anzeigen */
let zuletzt: string | null = null;
/**
 * Nach dem Lernen nimmt das Lehrbuch kurz keinen Klick an: Der zweite Klick eines Doppelklicks
 * verschiebt sonst nochmals oder wählt einen anderen Lehrer oder Schüler
 */
let gesperrtBis = 0;
const SPERRE_MS = 600;

function name(f: GuildFighter): string {
  return escapeAttr(f.name);
}

/** «Stufe 9 auf 12»; ohne Aufstieg «bleibt auf Stufe 6 (noch 40 XP bis Stufe 7)». xp: Gesamt-XP des Schülers danach */
function stufenText(von: number, nach: number, xp: number): string {
  if (nach > von) return `Stufe ${von} auf ${nach}`;
  return `bleibt auf Stufe ${von} (noch ${totalXpForLevel(von + 1) - xp} XP bis Stufe ${von + 1})`;
}

/**
 * Lehrer und Schüler, wie der Spieler sie gewählt hat; sonst der erste Lehrer mit Überschuss und der
 * schwächste Schüler. Hat der gewählte Schüler Stufe 15 erreicht, rückt kein anderer an seine Stelle:
 * «Lernen» bleibt aus, bis der Spieler den nächsten wählt (ein zweiter Klick gäbe die XP sonst einem
 * Helden, den er nie gewählt hat)
 */
function auswahl(state: GameState): { lehrer?: GuildFighter; schueler?: GuildFighter } {
  const lehrer = state.fighters.filter(f => f.level >= MAX_HERO_LEVEL);
  const schueler = state.fighters.filter(f => f.level < MAX_HERO_LEVEL);
  return {
    lehrer: lehrer.find(f => f.id === lehrerWahl) ?? lehrer.find(f => ueberschuss(f) > 0) ?? lehrer[0],
    schueler: schuelerWahl === null
      ? [...schueler].sort((a, b) => a.xp - b.xp)[0]
      : schueler.find(f => f.id === schuelerWahl),
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
  const meldung = zuletzt;
  zuletzt = null;
  if (lehrerListe.length === 0 || schuelerListe.length === 0) {
    // Der letzte Schüler hat gerade Stufe 15 erreicht: die Meldung trotzdem zeigen, nicht später veraltet
    return meldung ? `<section class="lehrbuch"><p class="lb-meldung" role="status" tabindex="-1">${meldung}</p></section>` : '';
  }

  const { lehrer, schueler } = auswahl(state);
  const vorschau = lehrer && schueler ? lehrbuchVorschau(lehrer, schueler) : null;
  const vorschauText = vorschau && schueler
    ? `+${vorschau.xp} XP → ${stufenText(vorschau.vonStufe, vorschau.nachStufe, schueler.xp + vorschau.xp)}`
    : !schueler && lehrer && ueberschuss(lehrer) > 0
      ? 'Wähle den nächsten Schüler.'
      : `${lehrer ? name(lehrer) : 'Der Lehrer'} hat noch keinen Überschuss. Jede Expedition auf Stufe 15 bringt welchen.`;

  // Die Meldung steht unter «Lernen»: Darüber verschiebt sich nichts, wenn sie kommt oder geht
  return `
    <section class="lehrbuch" aria-labelledby="lb-titel">
      <h3 id="lb-titel" class="lb-titel">📖 Lehrbuch</h3>
      <p class="lb-text">Ein Held auf Stufe 15 gibt seine überschüssigen XP an einen Helden unter Stufe 15 weiter, 1&nbsp;:&nbsp;1.
        Der Schüler steigt mit den Boni seiner Klasse auf, der Lehrer bleibt auf Stufe 15.</p>
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
      ${meldung ? `<p class="lb-meldung" role="status" tabindex="-1">${meldung}</p>` : ''}
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
    // Die Meldung (nur gleich nach «Lernen») steht unter dem Knopf. Am Handy quer liegt sie dort oft unter dem
    // Bildrand: so weit scrollen, dass sie ganz zu sehen ist. Steht sie schon im Bild, bewegt sich nichts
    neu.querySelector<HTMLElement>('.lb-meldung')?.scrollIntoView({ block: 'nearest' });
  };

  el.querySelectorAll<HTMLButtonElement>('[data-lb-lehrer]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      if (Date.now() < gesperrtBis) return;
      lehrerWahl = Number(knopf.dataset.lbLehrer);
      zeichnen(`[data-lb-lehrer="${lehrerWahl}"]`);
    });
  });
  el.querySelectorAll<HTMLButtonElement>('[data-lb-schueler]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      if (Date.now() < gesperrtBis) return;
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
    // Bis dahin löst ein zweiter Klick nichts aus (Maus-Doppelklick: schluckeZweitenKlick, sonst prüfen die
    // Knöpfe gesperrtBis), und kein Druck nimmt den Fokus weg oder markiert Text, wo er auch landet: auch
    // neben dem Lehrbuch, wenn es nach dem letzten Schüler zur Meldung schrumpft
    schluckeZweitenKlick();
    const halte = (e: PointerEvent): void => e.preventDefault();
    window.addEventListener('pointerdown', halte, true);
    setTimeout(() => window.removeEventListener('pointerdown', halte, true), SPERRE_MS);
    const neueKlassen = r.neueKlassen.map(id => CLASS_DEFS[id]?.name ?? id);
    zuletzt = `${name(schueler)} lernt von ${name(lehrer)}: +${r.xp} XP, ${stufenText(r.vonStufe, r.nachStufe, schueler.xp)}.`
      + (neueKlassen.length ? ` Neu anzuheuern: ${neueKlassen.join(', ')}.` : '');
    erfolgePruefen(state);
    window.dispatchEvent(new Event('mc:speichern'));
    zeichnen('[data-lb-lernen]');
  });
}
