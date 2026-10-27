// ─── Magic City – Erfolge ───────────────────────────────────────
// Alle Erfolge nach Gruppen, mit Zeichen, Fortschritt und Haken.
// Erreichbar über den Knopf «🏅» in der Kopfzeile (HeaderRenderer) und Taste A.
// ────────────────────────────────────────────────────────────────

import '../html/erfolge.css';
import { AchievementDef, ACHIEVEMENT_DEFS, ERFOLG_GRUPPEN, zaehlerWert } from '../../data/achievements';
import { GameState } from '../../models/GameState';
import { beiNeuenErfolgen, erfolgeAngeschaut, erfolgePruefen, ungeseheneErfolgIds } from '../../systems/AchievementSystem';
import { getCurrentScreen, getPreviousScreen, goBack, ScreenId } from '../ScreenRouter';
import { aktualisiereErfolgKnoepfe, renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;
/** Erfolge, die beim Öffnen neu waren: Ihre Karten leuchten beim Zeichnen kurz auf */
let frischIds: string[] = [];
/** Läuft gerade erfolgeGeoeffnet? Dann zeichnet der Hörer für neue Erfolge nichts (main.ts zeichnet gleich neu) */
let oeffnet = false;
let hoererAngemeldet = false;

export function initAchievementsScreen(state: GameState): void {
  gameState = state;
  if (typeof window === 'undefined' || hoererAngemeldet) return;
  hoererAngemeldet = true;
  // Vor dem Neuzeichnen durch main.ts (dessen Hörer kommt später dazu):
  // so zeigt schon die Kopfzeile des Bildschirms keine neuen Erfolge mehr.
  window.addEventListener('mc:navigate', ((e: CustomEvent) => {
    if (e.detail?.screen === 'achievements' && gameState) erfolgeGeoeffnet(gameState);
  }) as EventListener);
  // Neuer Erfolg, während der Bildschirm offen ist (Tageswechsel): Karten neu zeichnen, gilt als angeschaut
  beiNeuenErfolgen((ids, s) => {
    if (oeffnet || getCurrentScreen() !== 'achievements') return;
    const inhalt = document.querySelector<HTMLElement>('#s-achievements .erf-inhalt');
    if (!inhalt || inhalt.offsetParent === null) return;
    inhalt.innerHTML = inhaltHtml(s, ids);
    alsGesehenMerken(s);
  });
}

/**
 * Der Spieler öffnet den Bildschirm: aktuell prüfen, alles Freigeschaltete gilt als angeschaut
 * und wird gleich gespeichert (sonst stünde die Zahl am Knopf nach dem Neuladen wieder da).
 */
export function erfolgeGeoeffnet(state: GameState): void {
  oeffnet = true;
  try {
    erfolgePruefen(state, { hinweis: false });
  } finally {
    oeffnet = false;
  }
  frischIds = ungeseheneErfolgIds(state);
  alsGesehenMerken(state);
}

/** Alles Freigeschaltete gilt als angeschaut; hat sich dadurch etwas geändert, gleich speichern */
function alsGesehenMerken(state: GameState): void {
  const geaendert = erfolgeAngeschaut(state);
  aktualisiereErfolgKnoepfe(state);
  if (geaendert && typeof window !== 'undefined') window.dispatchEvent(new Event('mc:speichern'));
}

// ─── Erfolg-Karte ───────────────────────────────────────────────

function renderAchievementCard(def: AchievementDef, unlocked: boolean, stats: Record<string, number>, frisch: boolean): string {
  // Versteckt: bis zum Freischalten weder Zeichen noch Name, Beschreibung oder Balken, nur der Satz des Systems
  const versteckt = !unlocked && def.versteckt;
  const current = Math.min(zaehlerWert(def, stats), def.ziel);
  const progressHtml = !unlocked && !versteckt && def.ziel > 1
    ? `<div class="ach-progress">
        <div class="lvbar"><div class="lvfill" style="width:${Math.round((current / def.ziel) * 100)}%"></div></div>
        <span class="ach-prog-text">${current}/${def.ziel}</span>
      </div>`
    : '';

  return `
    <div class="ach-card ${unlocked ? 'ach-unlocked' : 'ach-locked'}${versteckt ? ' ach-versteckt' : ''}${frisch ? ' ach-neu' : ''}">
      <div class="ach-ico">${versteckt ? '👁️' : def.icon}</div>
      <div class="ach-info">
        <div class="ach-title">${versteckt ? '???' : def.name}</div>
        <div class="ach-desc">${versteckt || def.description}</div>
        ${progressHtml}
      </div>
      ${unlocked ? '<div class="ach-check">✅</div>' : ''}
    </div>`;
}

/** «Das System verschweigt noch 6 Erfolge.»: wie viele versteckte noch fehlen, ohne einen zu verraten */
function verschwiegenText(unlockedIds: Set<string>): string {
  const fehlen = ACHIEVEMENT_DEFS.filter(d => d.versteckt && !unlockedIds.has(d.id)).length;
  if (fehlen === 0) return 'Das System verschweigt nichts mehr. Behauptet es.';
  return `Das System verschweigt noch ${fehlen} ${fehlen === 1 ? 'Erfolg' : 'Erfolge'}.`;
}

/** Zahl und Gruppen; `frisch`: Erfolge, deren Karten kurz aufleuchten */
export function inhaltHtml(state: GameState | null, frisch: string[]): string {
  const stats = state?.statistics ?? {};
  const unlockedIds = new Set(state?.achievements ?? []);
  const neu = new Set(frisch);

  const unlockedCount = ACHIEVEMENT_DEFS.filter(d => unlockedIds.has(d.id)).length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  const gruppen = ERFOLG_GRUPPEN.map(gruppe => {
    const defs = ACHIEVEMENT_DEFS.filter(d => d.gruppe === gruppe);
    if (defs.length === 0) return '';
    const geschafft = defs.filter(d => unlockedIds.has(d.id)).length;
    // Freigeschaltete zuerst, sonst Reihenfolge der Liste
    const sorted = [...defs].sort((a, b) => Number(unlockedIds.has(b.id)) - Number(unlockedIds.has(a.id)));
    return `
      <div class="erf-gruppe">${gruppe}<span class="erf-gruppe-zahl">${geschafft}/${defs.length}</span></div>
      <div class="erf-liste">
        ${sorted.map(d => renderAchievementCard(d, unlockedIds.has(d.id), stats, neu.has(d.id))).join('')}
      </div>`;
  }).join('');

  return `
        <div class="erf-kopf">
          <span>🏅 Freigeschaltet: ${unlockedCount}/${totalCount}</span>
          <span>👁️ ${verschwiegenText(unlockedIds)}</span>
        </div>
        ${gruppen}`;
}

/** «Zurück» führt dorthin, woher der Spieler kam (Kopfzeile, Taste A); ohne Bildschirm davor ins Hauptmenü */
function zurueckZiel(): ScreenId {
  const vorher = getPreviousScreen();
  return vorher && vorher !== 'achievements' && vorher !== 'combat' ? vorher : 'main';
}

// ─── Main Render ────────────────────────────────────────────────

export function renderAchievementsScreen(container: HTMLElement): void {
  const state = gameState;
  // Kennzahlen und neue Erfolge vor dem Zeichnen, damit alles aktuell ist
  if (state) erfolgePruefen(state);
  const headerHtml = state ? renderHeader(state, zurueckZiel(), '🏅 ERFOLGE') : '';

  const el = document.createElement('div');
  el.id = 's-achievements';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="scontent erf-inhalt" style="padding:16px;">
        ${inhaltHtml(state, frischIds)}
      </div>`;
  container.appendChild(el);
  frischIds = [];

  // ─── Event Binding ──────────────────────────────────────────

  // Zurück: einen Schritt im Verlauf zurück, ohne ihn zu verlängern (ScreenRouter.goBack)
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => goBack('main'));
  }
}
