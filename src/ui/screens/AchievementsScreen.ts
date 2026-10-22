// ─── Magic City – Erfolge ───────────────────────────────────────
// Alle Erfolge nach Gruppen, mit Zeichen, Fortschritt und Haken.
// Erreichbar über den Knopf «🏆» in der Kopfzeile (HeaderRenderer).
// ────────────────────────────────────────────────────────────────

import '../html/erfolge.css';
import { AchievementDef, ACHIEVEMENT_DEFS, ERFOLG_GRUPPEN, zaehlerWert } from '../../data/achievements';
import { GameState } from '../../models/GameState';
import { erfolgeAngeschaut, erfolgePruefen } from '../../systems/AchievementSystem';
import { navigateTo } from '../ScreenRouter';
import { aktualisiereErfolgKnoepfe, renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initAchievementsScreen(state: GameState): void {
  gameState = state;
  // Vor dem Neuzeichnen durch main.ts (dessen Hörer kommt später dazu):
  // so zeigt schon die Kopfzeile des Bildschirms keine neuen Erfolge mehr.
  if (typeof window !== 'undefined') {
    window.addEventListener('mc:navigate', ((e: CustomEvent) => {
      if (e.detail?.screen === 'achievements' && gameState) erfolgeGeoeffnet(gameState);
    }) as EventListener);
  }
}

/** Der Spieler öffnet den Bildschirm: aktuell prüfen, alles Freigeschaltete gilt als angeschaut. */
export function erfolgeGeoeffnet(state: GameState): void {
  erfolgePruefen(state);
  erfolgeAngeschaut(state);
  aktualisiereErfolgKnoepfe(state);
}

// ─── Erfolg-Karte ───────────────────────────────────────────────

function renderAchievementCard(def: AchievementDef, unlocked: boolean, stats: Record<string, number>): string {
  const current = Math.min(zaehlerWert(def, stats), def.ziel);
  const progressHtml = !unlocked && def.ziel > 1
    ? `<div class="ach-progress">
        <div class="lvbar"><div class="lvfill" style="width:${Math.round((current / def.ziel) * 100)}%"></div></div>
        <span class="ach-prog-text">${current}/${def.ziel}</span>
      </div>`
    : '';

  return `
    <div class="ach-card ${unlocked ? 'ach-unlocked' : 'ach-locked'}">
      <div class="ach-ico">${def.icon}</div>
      <div class="ach-info">
        <div class="ach-title">${def.name}</div>
        <div class="ach-desc">${def.description}</div>
        ${progressHtml}
      </div>
      ${unlocked ? '<div class="ach-check">✅</div>' : ''}
    </div>`;
}

// ─── Main Render ────────────────────────────────────────────────

export function renderAchievementsScreen(container: HTMLElement): void {
  const state = gameState;
  // Kennzahlen und neue Erfolge vor dem Zeichnen, damit alles aktuell ist
  if (state) erfolgePruefen(state);
  const headerHtml = state ? renderHeader(state, 'main', 'ERFOLGE') : '';
  const stats = state?.statistics ?? {};
  const unlockedIds = new Set(state?.achievements ?? []);

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
        ${sorted.map(d => renderAchievementCard(d, unlockedIds.has(d.id), stats)).join('')}
      </div>`;
  }).join('');

  const el = document.createElement('div');
  el.id = 's-achievements';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="scontent" style="padding:16px;">
        <div class="erf-kopf">
          <span>Freigeschaltet: ${unlockedCount}/${totalCount}</span>
        </div>
        ${gruppen}
      </div>`;
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────

  // Back button
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }
}
