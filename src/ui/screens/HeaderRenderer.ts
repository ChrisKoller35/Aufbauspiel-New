// ─── Magic City – Reusable Header Renderer ─────────────────────
// Returns header HTML string for use across all screens.
// ────────────────────────────────────────────────────────────────

import '../html/erfolge.css';
import { GameState } from '../../models/GameState';
import { ScreenId, navigateTo } from '../ScreenRouter';
import { BUILDING_DEFS } from '../../data/buildings';
import { beiAuftragFertig } from '../../systems/Auftraege';
import { beiNeuenErfolgen, erfolgName, ungeseheneErfolge } from '../../systems/AchievementSystem';
import { klangKnopfHtml } from '../components/KlangSchalter';

const HINWEIS_MS = 4000;
let hinweisTimer: number | null = null;
/** Kommt ein zweiter Hinweis so kurz nach dem ersten (z. B. ein Erfolg nach «Zettel erledigt»), steht er daneben */
const ZUSAMMEN_MS = 600;
let letzterHinweis = { text: '', zeit: 0, ende: 0, zusammen: false };
/**
 * Wie viel Platz ein Hinweis für zwei Zeilen braucht, nach seiner Länge (gemessen an allen Hinweisen, die das Spiel
 * hier zeigen kann): bis 60 Zeichen (fertige Aufträge der Werkstätten, Erfolge, Set-Teile …) höchstens 158 px, bis
 * 90 Zeichen (ein erledigter Liefer-Zettel mit Tagesbonus, der alte Spielstand) höchstens 214 px (.hdr-note-lang).
 * Ist so viel hinter dem Namen nicht frei, liegt der Hinweis über Logo und Name (erfolge.css). Zwei Hinweise
 * nebeneinander und noch längere (.hdr-note-sehr-lang) brauchen oft mehr und liegen immer darüber. Ein neuer Hinweis
 * mit über 60 Zeichen gehört nachgemessen (docs/ERFOLGE.md).
 */
const HINWEIS_KURZ_BIS = 60;
const HINWEIS_LANG_BIS = 90;

function hinweisKlasse(text: string, zusammen: boolean): string {
  if (zusammen || text.length > HINWEIS_LANG_BIS) return 'hdr-note hdr-note-sehr-lang';
  return text.length > HINWEIS_KURZ_BIS ? 'hdr-note hdr-note-lang' : 'hdr-note';
}

/**
 * Kurzer Hinweis in jeder Kopfzeile, verschwindet von selbst (kein Popup), nach `dauerMs`
 * (4 Sekunden; ein langer Satz wie der zum alten Spielstand bekommt mehr). Er steht in .hdr-platz hinter dem
 * Bildschirm-Namen, auf höchstens zwei Zeilen: bis 1000 px Breite über Logo und Name, breiter daneben, wenn er dort
 * Platz hat (hinweisKlasse, erfolge.css). Die Kopfzeile wird nicht höher, und sonst verschiebt sich nichts.
 * Zwei Hinweise kurz nacheinander stehen nebeneinander und bleiben, bis der längere abgelaufen ist.
 */
export function zeigeKopfHinweis(text: string, dauerMs = HINWEIS_MS): void {
  if (typeof document === 'undefined') return;
  const jetzt = Date.now();
  let ende = jetzt + dauerMs;
  let zusammen = false;
  if (hinweisTimer !== null && jetzt - letzterHinweis.zeit < ZUSAMMEN_MS && !letzterHinweis.text.includes(text)) {
    text = `${letzterHinweis.text} · ${text}`;
    ende = Math.max(ende, letzterHinweis.ende);
    zusammen = true;
  }
  letzterHinweis = { text, zeit: jetzt, ende, zusammen };
  const hdrs = document.querySelectorAll('.hdr');
  for (let i = 0; i < hdrs.length; i++) {
    const hdr = hdrs[i] as HTMLElement;
    let note = hdr.querySelector('.hdr-note') as HTMLElement | null;
    if (!note) {
      note = document.createElement('span');
      note.setAttribute('role', 'status');
      (hdr.querySelector('.hdr-platz') ?? hdr).insertBefore(note, null);
    }
    note.className = hinweisKlasse(text, zusammen);
    note.textContent = text;
    hdr.classList.add('hdr-mit-hinweis');
  }
  if (hinweisTimer !== null) window.clearTimeout(hinweisTimer);
  hinweisTimer = window.setTimeout(() => {
    document.querySelectorAll('.hdr-note').forEach(n => n.remove());
    document.querySelectorAll('.hdr-mit-hinweis').forEach(h => h.classList.remove('hdr-mit-hinweis'));
    hinweisTimer = null;
  }, ende - jetzt);
}

beiAuftragFertig((b, recipe) => {
  zeigeKopfHinweis(`✔ ${recipe.name} fertig (${BUILDING_DEFS[b.typeId]?.name ?? b.typeId})`);
});

// ── Knopf «Erfolge» (🏅; 🏆 gehört dem Trophäensaal und den Pokalen der Rangliste) ──

/** Inhalt des Erfolge-Knopfs: 🏅 und die Zahl der noch nicht angeschauten Erfolge */
function erfolgKnopfInhalt(neu: number): string {
  return neu > 0 ? `🏅<span class="hdr-erfolge-neu">${neu}</span>` : '🏅';
}

/** Name des Knopfs für Vorlesehilfen, mit der Zahl der neuen Erfolge */
function erfolgKnopfName(neu: number): string {
  return neu > 0 ? `Erfolge, ${neu} neu` : 'Erfolge';
}

/** Hinweis zu neuen Erfolgen: ein oder zwei mit Namen, ab drei nur die Zahl (der Platz in der Kopfzeile ist knapp) */
export function erfolgHinweis(ids: string[]): string {
  if (ids.length >= 3) return `🏅 ${ids.length} neue Erfolge`;
  return `🏅 ${ids.length === 1 ? 'Erfolg' : 'Erfolge'}: ${ids.map(erfolgName).join(', ')}`;
}

/** Zahl an allen Erfolge-Knöpfen neu setzen (die Kopfzeilen werden sonst nur beim Navigieren neu gezeichnet). */
export function aktualisiereErfolgKnoepfe(state: GameState): void {
  if (typeof document === 'undefined') return;
  const neu = ungeseheneErfolge(state);
  document.querySelectorAll('.hdr-erfolge').forEach(k => {
    k.innerHTML = erfolgKnopfInhalt(neu);
    k.setAttribute('aria-label', erfolgKnopfName(neu));
  });
}

/** Erfolge vom Tageswechsel, als keine Kopfzeile zu sehen war (Kampf, Truhe, Bilanz einer Expedition) */
let wartendeErfolge: string[] = [];

function kopfzeileSichtbar(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>('.hdr')).some(h => h.offsetParent !== null);
}

beiNeuenErfolgen((ids, state, hinweis) => {
  aktualisiereErfolgKnoepfe(state);
  if (!hinweis || typeof document === 'undefined') return;
  if (kopfzeileSichtbar()) zeigeKopfHinweis(erfolgHinweis(ids));
  else wartendeErfolge.push(...ids);
});

// Nachholen auf dem nächsten Bildschirm, nach dessen Neuzeichnen (der Hörer in main.ts kommt später dazu);
// wer gleich die Erfolge öffnet, sieht sie dort
if (typeof window !== 'undefined') {
  window.addEventListener('mc:navigate', ((e: CustomEvent) => {
    if (wartendeErfolge.length === 0) return;
    const ids = wartendeErfolge;
    wartendeErfolge = [];
    if (e.detail?.screen !== 'achievements') window.setTimeout(() => zeigeKopfHinweis(erfolgHinweis(ids)), 0);
  }) as EventListener);
}

// Ein Klick-Hörer für alle Kopfzeilen (nicht jeder Bildschirm reicht data-nav weiter)
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const knopf = (e.target as HTMLElement | null)?.closest?.('.hdr-erfolge');
    if (knopf) navigateTo('achievements');
  });
}

/** Was die Kopfzeile aus dem Lager zeigt: Gold und die Beute der Werkstätten, dazu der Proviant. */
const VORRAT_ZEILE: { itemId: string; zeichen: string }[] = [
  { itemId: 'gold', zeichen: '\uD83E\uDE99' },
  { itemId: 'iron_scrap', zeichen: '\u2699\uFE0F' },
  { itemId: 'crystal_shard', zeichen: '\uD83D\uDC8E' },
  { itemId: 'bread', zeichen: '\uD83C\uDF5E' },
  { itemId: 'healing_potion', zeichen: '\uD83E\uDDEA' },
];

/**
 * Inhalt der Vorrats-Anzeige (.res) in jeder Kopfzeile: Gold, Eisenschrott, Kristallsplitter,
 * Brot, Heiltrank und der Tag. main.ts schreibt sie jede Sekunde neu. Zwei Gruppen zu je drei
 * (.res-gruppe): Fehlt der Platz, steht die zweite unter der ersten, nie mehr als zwei Zeilen (magic-city.css).
 */
export function vorratsZeileHtml(state: GameState): string {
  const vorrat = VORRAT_ZEILE
    .map(({ itemId, zeichen }) => `<span>${zeichen} ${(state.globalStock[itemId] ?? 0).toLocaleString('de')}</span>`);
  vorrat.push(`<span style="color:var(--mut)">Tag ${state.day}</span>`);
  return `<span class="res-gruppe">${vorrat.slice(0, 3).join('')}</span>
        <span class="res-gruppe">${vorrat.slice(3).join('')}</span>`;
}

/**
 * Renders the standard header bar with logo, optional back button, and resource display.
 */
export function renderHeader(
  state: GameState,
  backTarget?: ScreenId,
  currentLabel?: string,
): string {
  const backBtn = backTarget
    ? `<button class="btn-back hdr-back" data-nav="${backTarget}">← Zurück</button>`
    : '';

  const sep = currentLabel ? '<span class="hdr-sep">/</span>' : '';
  const label = currentLabel
    ? `<span class="hdr-cur">${currentLabel}</span>`
    : '';
  // Ein laufender Hinweis bleibt stehen, wenn sich der Bildschirm neu zeichnet (z. B. gleich nach dem Bauen)
  const note = hinweisTimer !== null && letzterHinweis.text
    ? `<span class="${hinweisKlasse(letzterHinweis.text, letzterHinweis.zusammen)}" role="status">${letzterHinweis.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`
    : '';

  // .hdr-mitte füllt den Platz zwischen «← Zurück» und den Vorräten, .hdr-platz darin den hinter dem Namen
  // (magic-city.css, Abschnitt Header)
  return `
    <div class="hdr${backTarget ? ' hdr-zurueck' : ''}${note ? ' hdr-mit-hinweis' : ''}">
      ${backBtn}
      <div class="hdr-mitte">
        <span class="hdr-logo">⚔ MAGIC CITY</span>
        ${sep}
        ${label}
        <span class="hdr-platz">${note}</span>
      </div>
      <div class="res">
        ${vorratsZeileHtml(state)}
      </div>
      ${klangKnopfHtml('hdr-klang')}
      <button type="button" class="hdr-erfolge" data-nav="achievements" title="Erfolge" aria-label="${erfolgKnopfName(ungeseheneErfolge(state))}">${erfolgKnopfInhalt(ungeseheneErfolge(state))}</button>
    </div>`;
}

