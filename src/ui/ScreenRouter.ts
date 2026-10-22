// ─── Magic City – Screen Router ────────────────────────────────
// Simple SPA screen navigation using inline styles.
// ────────────────────────────────────────────────────────────────

export type ScreenId =
  | 'main'
  | 'expeditions'
  | 'team'
  | 'heroes'
  | 'buildings'
  | 'ranking'
  | 'bestiarium'
  | 'achievements'
  | 'combat'
  | 'dungeon'
  | 'gildenhaus';

const SCREEN_STYLE_ACTIVE = 'display:flex;flex-direction:column;width:100vw;height:100vh;overflow-y:auto;overflow-x:hidden;background:#060810;';
const SCREEN_STYLE_HIDDEN = 'display:none;';

const navHistory: ScreenId[] = ['main'];

/** Liefert true, solange kein Bildschirmwechsel erlaubt ist (setzeNavigationsSperre) */
let gesperrt: () => boolean = () => false;

/**
 * Sperrt jeden Bildschirmwechsel, solange `sperre` true liefert. main.ts sperrt während einer
 * Expedition: Den Kampf zeigt main.ts am Router vorbei, ein Wechsel würde ihn verstecken, und
 * es gäbe keinen Weg zurück (die Expedition hinge bis zum Neuladen). Die Sperre gilt hier für
 * alle gleich: Tasten (K, A, G, Escape), Knöpfe der Kopfzeile und jeder andere Aufruf.
 */
export function setzeNavigationsSperre(sperre: () => boolean): void {
  gesperrt = sperre;
}

/** Apply active/hidden styles to all screens. Call after DOM is ready. */
export function initScreenStyles(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const screens = app.children;
  for (let i = 0; i < screens.length; i++) {
    const el = screens[i] as HTMLElement;
    if (el.id === 's-main') {
      el.style.cssText = SCREEN_STYLE_ACTIVE;
    } else {
      el.style.cssText = SCREEN_STYLE_HIDDEN;
    }
  }
}

/** Hide all screens, show target */
function zeigeNur(app: HTMLElement, screen: ScreenId): void {
  const screens = app.children;
  for (let i = 0; i < screens.length; i++) {
    const el = screens[i] as HTMLElement;
    if (el.id === `s-${screen}`) {
      el.style.cssText = SCREEN_STYLE_ACTIVE;
    } else {
      el.style.cssText = SCREEN_STYLE_HIDDEN;
    }
  }
}

export function navigateTo(screen: ScreenId): void {
  if (gesperrt()) return;
  const prev = navHistory[navHistory.length - 1];
  if (prev === screen) return;

  const app = document.getElementById('app');
  if (!app) return;

  zeigeNur(app, screen);

  navHistory.push(screen);
  window.dispatchEvent(new CustomEvent('mc:navigate', { detail: { screen, prev } }));
}

/**
 * «Zurück»: zum Bildschirm davor, ohne ihn noch einmal in den Verlauf zu legen. Sonst führen zwei
 * Bildschirme, deren «Zurück» dem Verlauf folgt, endlos zueinander zurück (Gildenhaus ⇄ Erfolge).
 * Gibt es keinen Bildschirm davor (oder war es der Kampf), geht es nach `ersatz`.
 */
export function goBack(ersatz: ScreenId = 'main'): void {
  if (gesperrt()) return;
  const aktuell = navHistory[navHistory.length - 1];
  const davor = navHistory[navHistory.length - 2];
  if (!davor || davor === 'combat') {
    navigateTo(ersatz);
    return;
  }

  const app = document.getElementById('app');
  if (!app) return;

  navHistory.pop();
  zeigeNur(app, davor);
  window.dispatchEvent(new CustomEvent('mc:navigate', { detail: { screen: davor, prev: aktuell } }));
}

export function getCurrentScreen(): ScreenId {
  return navHistory[navHistory.length - 1];
}

/** Der Bildschirm davor, für «Zurück» in Bildschirmen, die von mehreren Orten aus erreichbar sind */
export function getPreviousScreen(): ScreenId | undefined {
  return navHistory[navHistory.length - 2];
}
