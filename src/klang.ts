// ─── Magic City – Klang einhängen ──────────────────────────────
// Aus main.ts geladen. Hört auf die Ereignisse des Spiels und verteilt sie auf Musik und
// Effekte (systems/Klang.ts, Zuordnung in data/klangZuordnung.ts, Übersicht in docs/KLANG.md).
// ────────────────────────────────────────────────────────────────

import { getCurrentScreen, type ScreenId } from './ui/ScreenRouter';
import { ROUTE_DEFS } from './data/routes';
import { BOSS_MUSIK, musikFuerBildschirm, musikFuerRoute } from './data/klangZuordnung';
import { istGestartet, spieleEffekt, spieleMusik, starteKlang } from './systems/Klang';
import { bindeKlangSchalter } from './ui/components/KlangSchalter';

// Ton erlaubt der Browser erst mit einer Nutzer-Aktivierung: mit der Maus schon bei pointerdown, beim Tippen erst
// bei pointerup, touchend oder click, mit Escape nie. Jede Geste setzt den Klang fort und holt Abgelehntes nach;
// die erste startet die Musik des Bildschirms (ScreenRouter.ts getCurrentScreen).
function geste(): void {
  if (navigator.userActivation && !navigator.userActivation.isActive) return;
  const erstes = !istGestartet();
  starteKlang();
  if (erstes) spieleMusik(musikFuerBildschirm(getCurrentScreen()));
}
for (const typ of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(typ, geste, true);

// Bildschirmwechsel: ScreenRouter.ts navigateTo/goBack → mc:navigate { screen, prev }
window.addEventListener('mc:navigate', e => spieleMusik(musikFuerBildschirm((e as CustomEvent<{ screen: ScreenId }>).detail.screen)));

// Die Expedition geht los: ExpeditionFlow.ts aufbrechen → mc:aufbruch { routeId }
window.addEventListener('mc:aufbruch', e => {
  const route = ROUTE_DEFS[(e as CustomEvent<{ routeId: string }>).detail.routeId];
  spieleEffekt('expedition_start');
  if (route) spieleMusik(musikFuerRoute(route));
});

// Bosskampf: CombatScreen.ts show() für den Bossraum → mc:bosskampf
window.addEventListener('mc:bosskampf', () => {
  spieleMusik(BOSS_MUSIK);
  spieleEffekt('boss_intro');
});

// Ausgang der Expedition im Kampf: CombatScreen.ts showResult («SIEG!», «NIEDERLAGE...») → mc:kampfausgang { status }
const AUSGANG: Record<string, string> = { victory: 'boss_victory', defeat: 'party_wipe' };
window.addEventListener('mc:kampfausgang', e => {
  const effekt = AUSGANG[(e as CustomEvent<{ status: string }>).detail.status];
  if (effekt) spieleEffekt(effekt);
});

// Rückzug per Knopf im Kampf oder am Kontrollpunkt: ExpeditionFlow.ts finishExpedition → mc:rueckzug
window.addEventListener('mc:rueckzug', () => spieleEffekt('retreat_horn'));

bindeKlangSchalter();
