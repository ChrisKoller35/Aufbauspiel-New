// ─── Magic City – Klang einhängen ──────────────────────────────
// Aus main.ts geladen. Hört auf die Ereignisse des Spiels und verteilt sie auf Musik und
// Effekte (systems/Klang.ts, Zuordnung in data/klangZuordnung.ts, Übersicht in docs/KLANG.md).
// ────────────────────────────────────────────────────────────────

import { getCurrentScreen, type ScreenId } from './ui/ScreenRouter';
import { ROUTE_DEFS } from './data/routes';
import { BOSS_MUSIK, musikFuerBildschirm, musikFuerRoute } from './data/klangZuordnung';
import { istGestartet, merkeMusik, spieleEffekt, spieleMusik, starteKlang } from './systems/Klang';
import { bindeKlangSchalter, istStummTaste, type TasteInfo } from './ui/components/KlangSchalter';

// Ton erlaubt der Browser erst mit einer Nutzer-Aktivierung: mit der Maus schon bei pointerdown, beim Tippen erst
// bei pointerup, touchend oder click, mit Escape nie. Jede Geste setzt den Klang fort und holt Abgelehntes nach;
// die erste startet die Musik des Bildschirms (ScreenRouter.ts getCurrentScreen). Eine Geste auf 🔊 (Zeiger, Enter,
// Leertaste), die Taste M und Tab starten nichts: Erst der Klick bzw. die Taste entscheidet über «stumm» (am PC käme
// sonst beim Drücken kurz Musik), und mit Tab sucht jemand erst den Weg; der erste Halt ist oft 🔊. Andere Tasten
// lösen 🔊 nicht aus, auch wenn es den Fokus hat: Sie sind gewöhnliche Gesten.
// Zusatztasten allein (Shift, Strg, Alt, Cmd, Feststelltaste) zählen gar nicht: Vor Shift+Tab kommt Shift als eigenes
// keydown, und die Aktivierung durch den Tab davor gilt dann noch (5 s).
const ZUSATZTASTEN = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'CapsLock', 'Fn']);
function geste(e: Event): void {
  const taste = e.type === 'keydown' ? (e as unknown as TasteInfo) : null;
  if (taste && ZUSATZTASTEN.has(taste.key)) return;
  if (navigator.userActivation && !navigator.userActivation.isActive) return;
  const erstes = !istGestartet();
  const aufKnopf = Boolean((e.target as Element | null)?.closest?.('.klang-knopf'))
    && (taste === null || taste.key === 'Enter' || taste.key === ' ');
  const nurFreigeben = aufKnopf || (taste !== null && (istStummTaste(taste) || taste.key === 'Tab'));
  starteKlang(!nurFreigeben);
  if (erstes) (nurFreigeben ? merkeMusik : spieleMusik)(musikFuerBildschirm(getCurrentScreen()));
}
for (const typ of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(typ, geste, true);

// Bildschirmwechsel: ScreenRouter.ts navigateTo/goBack → mc:navigate { screen, prev }
window.addEventListener('mc:navigate', e => spieleMusik(musikFuerBildschirm((e as CustomEvent<{ screen: ScreenId }>).detail.screen)));

// Ausgang der Expedition, ein Ton je Expedition: Sieg, Niederlage oder ein echter Rückzug (Horn)
const AUSGANG: Record<string, string> = { victory: 'boss_victory', defeat: 'party_wipe', retreat: 'retreat_horn' };
let ausgangGespielt = false;

// Die Expedition geht los: ExpeditionFlow.ts aufbrechen → mc:aufbruch { routeId }
window.addEventListener('mc:aufbruch', e => {
  const route = ROUTE_DEFS[(e as CustomEvent<{ routeId: string }>).detail.routeId];
  ausgangGespielt = false;
  spieleEffekt('expedition_start');
  if (route) spieleMusik(musikFuerRoute(route));
});

// Bosskampf: CombatScreen.ts show() für den Bossraum → mc:bosskampf
window.addEventListener('mc:bosskampf', () => {
  spieleMusik(BOSS_MUSIK);
  spieleEffekt('boss_intro');
});

// Der Ausgang kommt zuerst im Kampf, sobald «SIEG!» oder «NIEDERLAGE...» erscheint: CombatScreen.ts showResult →
// mc:kampfausgang { status }
window.addEventListener('mc:kampfausgang', e => {
  const effekt = AUSGANG[(e as CustomEvent<{ status: string }>).detail.status];
  if (!effekt || ausgangGespielt) return;
  spieleEffekt(effekt);
  ausgangGespielt = true;
});

// Sonst zur Bilanz: ExpeditionFlow.ts finishExpedition → mc:expeditionsende { status }. So erklingt er auch nach
// einem Rückzug aus einem schon entschiedenen Kampf, nach einem letzten Raum ohne Kampf (Rast, Fund) und beim
// Rückzug per Knopf im Kampf oder am Kontrollpunkt (Horn)
window.addEventListener('mc:expeditionsende', e => {
  const effekt = AUSGANG[(e as CustomEvent<{ status: string }>).detail.status];
  if (effekt && !ausgangGespielt) spieleEffekt(effekt);
  ausgangGespielt = false;
});

bindeKlangSchalter();
