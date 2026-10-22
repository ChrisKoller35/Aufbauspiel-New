// ─── Magic City – Reusable Header Renderer ─────────────────────
// Returns header HTML string for use across all screens.
// ────────────────────────────────────────────────────────────────

import '../html/erfolge.css';
import { GameState } from '../../models/GameState';
import { ScreenId, navigateTo } from '../ScreenRouter';
import { BUILDING_DEFS } from '../../data/buildings';
import { beiAuftragFertig } from '../../systems/Auftraege';
import { beiNeuenErfolgen, erfolgName, ungeseheneErfolge } from '../../systems/AchievementSystem';

const HINWEIS_MS = 4000;
let hinweisTimer: number | null = null;

/**
 * Kurzer Hinweis in jeder Kopfzeile, verschwindet von selbst (kein Popup). Am Handy steht er an der
 * Stelle des Logos (erfolge.css, .hdr-mit-hinweis): Die Kopfzeile wird nicht höher, kein Knopf rutscht weg.
 */
export function zeigeKopfHinweis(text: string): void {
  if (typeof document === 'undefined') return;
  const hdrs = document.querySelectorAll('.hdr');
  for (let i = 0; i < hdrs.length; i++) {
    const hdr = hdrs[i] as HTMLElement;
    let note = hdr.querySelector('.hdr-note') as HTMLElement | null;
    if (!note) {
      note = document.createElement('span');
      note.className = 'hdr-note';
      note.setAttribute('role', 'status');
      hdr.insertBefore(note, hdr.querySelector('.hdr-space'));
    }
    note.textContent = text;
    hdr.classList.add('hdr-mit-hinweis');
  }
  if (hinweisTimer !== null) window.clearTimeout(hinweisTimer);
  hinweisTimer = window.setTimeout(() => {
    document.querySelectorAll('.hdr-note').forEach(n => n.remove());
    document.querySelectorAll('.hdr-mit-hinweis').forEach(h => h.classList.remove('hdr-mit-hinweis'));
    hinweisTimer = null;
  }, HINWEIS_MS);
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

/**
 * Renders the standard header bar with logo, optional back button, and resource display.
 */
export function renderHeader(
  state: GameState,
  backTarget?: ScreenId,
  currentLabel?: string,
): string {
  const gold = state.globalStock['gold'] ?? 0;
  const wood = state.globalStock['wood'] ?? 0;
  const stone = state.globalStock['stone'] ?? 0;
  const bread = state.globalStock['bread'] ?? 0;
  const grain = state.globalStock['grain'] ?? 0;
  const iron = state.globalStock['iron_scrap'] ?? 0;
  const gems = state.globalStock['crystal_shard'] ?? 0;

  const backBtn = backTarget
    ? `<button class="btn-back hdr-back" data-nav="${backTarget}">← Zurück</button>`
    : '';

  const sep = currentLabel ? '<span class="hdr-sep">/</span>' : '';
  const label = currentLabel
    ? `<span class="hdr-cur">${currentLabel}</span>`
    : '';

  return `
    <div class="hdr">
      ${backBtn}
      <span class="hdr-logo">⚔ MAGIC CITY</span>
      ${sep}
      ${label}
      <div class="hdr-space"></div>
      <div class="res">
        <span>\uD83E\uDE99 ${gold.toLocaleString('de')}</span>
        <span>\uD83E\uDEB5 ${wood}</span>
        <span>\uD83E\uDEA8 ${stone}</span>
        <span>\uD83C\uDF5E ${bread}</span>
        <span>\uD83C\uDF3E ${grain}</span>
        <span>\u2699\uFE0F ${iron}</span>
        <span>\uD83D\uDC8E ${gems}</span>
        <span style="color:var(--mut)">Tag ${state.day}</span>
      </div>
      <button type="button" class="hdr-erfolge" data-nav="achievements" title="Erfolge" aria-label="${erfolgKnopfName(ungeseheneErfolge(state))}">${erfolgKnopfInhalt(ungeseheneErfolge(state))}</button>
    </div>`;
}

