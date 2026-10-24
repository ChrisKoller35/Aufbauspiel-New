// ─── Magic City – Klang einhängen ──────────────────────────────
// Eigener Einstieg (index.html), hört nur auf Ereignisse und das DOM; ändert keine Spieldatei.
import { getCurrentScreen, type ScreenId } from './ui/ScreenRouter';
import { ROUTE_DEFS } from './data/routes';
import { BOSS_MUSIK, musikFuerBildschirm, musikFuerRoute } from './data/klangZuordnung';
import { istGestartet, istStumm, spieleEffekt, spieleMusik, starteKlang } from './systems/Klang';
import { zeigeKlangSchalter } from './ui/components/KlangSchalter';

// Erste Geste: AudioContext anlegen/fortsetzen, Musik für den Startbildschirm (ScreenRouter.ts getCurrentScreen)
function geste(): void {
  const erstes = !istGestartet();
  starteKlang();
  if (erstes) spieleMusik(musikFuerBildschirm(getCurrentScreen()));
}
window.addEventListener('pointerdown', geste, true);
window.addEventListener('keydown', geste, true);

// Bildschirmwechsel: ScreenRouter.ts navigateTo/goBack → mc:navigate { screen, prev }
window.addEventListener('mc:navigate', e => spieleMusik(musikFuerBildschirm((e as CustomEvent<{ screen: ScreenId }>).detail.screen)));

// Expedition startet: ExpeditionsScreen.ts (Klick auf Start) → mc:startExpedition { routeId }
window.addEventListener('mc:startExpedition', e => {
  const route = ROUTE_DEFS[(e as CustomEvent<{ routeId: string }>).detail.routeId];
  spieleEffekt('expedition_start');
  if (route) spieleMusik(musikFuerRoute(route));
});

// Kampfausgang: CombatScreen.ts (Ende des Kampfs) legt .mc-co-outcome mit diesem Text an
const AUSGANG: Record<string, string> = { 'SIEG!': 'boss_victory', 'NIEDERLAGE...': 'party_wipe', 'RÜCKZUG': 'retreat_horn' };
const gemeldeteAusgaenge = new WeakSet<Element>();
let bossTitelGesehen = false;
let geplant = false;

function auswerten(): void {
  geplant = false;
  // Bosskampf: CombatScreen.ts show() setzt .mc-co-title auf «BOSS KAMPF!» (einmal je Kampf);
  // hide() versteckt #s-combat nur, deshalb zählt der Titel nur, solange er zu sehen ist
  const titel = document.querySelector('.mc-co-title');
  const boss = titel?.textContent === 'BOSS KAMPF!' && titel.getClientRects().length > 0;
  if (boss && !bossTitelGesehen) { spieleMusik(BOSS_MUSIK); spieleEffekt('boss_intro'); }
  bossTitelGesehen = boss;
  document.querySelectorAll('.mc-co-outcome').forEach(el => {
    const effekt = AUSGANG[el.textContent ?? ''];
    if (effekt && !gemeldeteAusgaenge.has(el)) { gemeldeteAusgaenge.add(el); spieleEffekt(effekt); }
  });
  // Truhe: ChestRevealOverlay.ts spielt ein Video mit eigener Tonspur
  if (istStumm()) document.querySelectorAll('video').forEach(v => { v.muted = true; });
}

new MutationObserver(() => {
  if (!geplant) { geplant = true; requestAnimationFrame(auswerten); }
}).observe(document.body, { childList: true, subtree: true, characterData: true });

zeigeKlangSchalter();
