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
  | 'dungeon';

const SCREEN_STYLE_ACTIVE = 'display:flex;flex-direction:column;width:100vw;height:100vh;overflow-y:auto;overflow-x:hidden;background:#060810;';
const SCREEN_STYLE_HIDDEN = 'display:none;';

const navHistory: ScreenId[] = ['main'];

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

export function navigateTo(screen: ScreenId): void {
  const prev = navHistory[navHistory.length - 1];
  if (prev === screen) return;

  const app = document.getElementById('app');
  if (!app) return;

  // Hide all screens, show target
  const screens = app.children;
  for (let i = 0; i < screens.length; i++) {
    const el = screens[i] as HTMLElement;
    if (el.id === `s-${screen}`) {
      el.style.cssText = SCREEN_STYLE_ACTIVE;
    } else {
      el.style.cssText = SCREEN_STYLE_HIDDEN;
    }
  }

  navHistory.push(screen);
  window.dispatchEvent(new CustomEvent('mc:navigate', { detail: { screen, prev } }));
}

export function goBack(): void {
  if (navHistory.length <= 1) return;
  navHistory.pop();
  const prev = navHistory[navHistory.length - 1];
  // Navigate without adding to history again
  const app = document.getElementById('app');
  if (!app) return;
  const screens = app.children;
  for (let i = 0; i < screens.length; i++) {
    const el = screens[i] as HTMLElement;
    if (el.id === `s-${prev}`) {
      el.style.cssText = SCREEN_STYLE_ACTIVE;
    } else {
      el.style.cssText = SCREEN_STYLE_HIDDEN;
    }
  }
}

export function getCurrentScreen(): ScreenId {
  return navHistory[navHistory.length - 1];
}
