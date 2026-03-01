import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CityScene } from './scenes/CityScene';
import { SaveSystem } from './systems/SaveSystem';
import { setupTabVisibility } from './utils/TabVisibility';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  pixelArt: false,
  antialias: true,
  roundPixels: true,
  backgroundColor: '#3a7a32',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MainMenuScene, CityScene],
};

// Keep a reference so error handlers and tab-visibility can reach it.
let game: Phaser.Game | null = null;

// --- #32: Error Boundary helpers ---

/** Try to perform an emergency save using the CityScene's current state. */
function emergencySave(): void {
  try {
    if (!game) return;
    const cityScene = game.scene.getScene('CityScene') as unknown as Record<string, unknown> | null;
    // CityScene exposes its state via a public property; access it generically to
    // avoid a hard import cycle at the module level.
    const state = cityScene?.['gameState'];
    if (state) {
      const ss = new SaveSystem();
      ss.save(state as Parameters<SaveSystem['save']>[0]);
      console.warn('Notfall-Speicherung erfolgreich.');
    }
  } catch (saveErr) {
    console.error('Notfall-Speicherung fehlgeschlagen:', saveErr);
  }
}

/** Render a visible error overlay on the page. */
function showErrorOverlay(message: string, savedOk: boolean): void {
  try {
    // Remove any existing overlay
    const existing = document.getElementById('mc-error-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'mc-error-overlay';
    overlay.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
      'background:rgba(0,0,0,0.85)', 'color:#fff',
      'display:flex', 'flex-direction:column', 'align-items:center',
      'justify-content:center', 'z-index:99999',
      'font-family:"Segoe UI",Arial,sans-serif', 'padding:24px',
      'box-sizing:border-box',
    ].join(';');

    const title = document.createElement('h2');
    title.textContent = 'Ein Fehler ist aufgetreten';
    title.style.cssText = 'color:#e74c3c;margin-bottom:12px;font-size:24px;';

    const msg = document.createElement('pre');
    msg.textContent = message;
    msg.style.cssText = [
      'background:#1a1a1a', 'color:#f39c12', 'padding:16px',
      'border-radius:6px', 'max-width:700px', 'width:100%',
      'overflow:auto', 'font-size:13px', 'max-height:300px',
      'white-space:pre-wrap', 'word-break:break-word',
    ].join(';');

    const saveNote = document.createElement('p');
    saveNote.textContent = savedOk
      ? 'Spiel wurde notgesichert.'
      : 'Notfall-Speicherung konnte nicht durchgeführt werden.';
    saveNote.style.cssText = `color:${savedOk ? '#2ecc71' : '#e74c3c'};margin-top:12px;font-size:16px;`;

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Seite neu laden';
    reloadBtn.style.cssText = [
      'margin-top:20px', 'padding:10px 28px', 'font-size:16px',
      'background:#3498db', 'color:#fff', 'border:none',
      'border-radius:6px', 'cursor:pointer',
    ].join(';');
    reloadBtn.onclick = () => window.location.reload();

    overlay.appendChild(title);
    overlay.appendChild(msg);
    overlay.appendChild(saveNote);
    overlay.appendChild(reloadBtn);
    document.body.appendChild(overlay);
  } catch (_) {
    // Overlay creation itself failed – nothing more we can do.
  }
}

/** Central error handler shared by window.onerror and window.onunhandledrejection. */
function handleGlobalError(message: string): void {
  console.error('[Magic City] Globaler Fehler:', message);

  let savedOk = false;
  try {
    emergencySave();
    savedOk = true;
  } catch (_) { /* ignore */ }

  showErrorOverlay(message, savedOk);
}

// --- #32: Global error handlers ---
window.onerror = (event, source, lineno, colno, error) => {
  const msg = error?.stack ?? `${event} (${source}:${lineno}:${colno})`;
  handleGlobalError(String(msg));
  return false; // Let browser default logging also run
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const msg = (reason instanceof Error)
    ? (reason.stack ?? reason.message)
    : String(reason);
  handleGlobalError(`Unbehandeltes Promise-Rejection:\n${msg}`);
};

// --- #32: Initialize game with error boundary ---
try {
  game = new Phaser.Game(config);

  // --- #33: Tab visibility handling ---
  setupTabVisibility(game);
} catch (initErr: unknown) {
  const msg = (initErr instanceof Error)
    ? (initErr.stack ?? initErr.message)
    : String(initErr);
  handleGlobalError(`Spiel konnte nicht gestartet werden:\n${msg}`);
}
