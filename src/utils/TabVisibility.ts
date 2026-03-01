import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

/**
 * Set up handling for browser tab visibility changes.
 *
 * - When the tab becomes hidden: pauses the Phaser game loop and triggers
 *   an auto-save so progress is not lost if the user closes the tab.
 * - When the tab becomes visible again: resumes the game loop.
 *
 * Call this once after creating the Phaser.Game instance.
 */
export function setupTabVisibility(game: Phaser.Game): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab hidden – pause the game loop to save CPU/battery
      try {
        game.loop.sleep();
      } catch (e) {
        console.warn('[TabVisibility] Could not sleep game loop:', e);
      }

      // Trigger auto-save: find the CityScene and save its state
      try {
        const cityScene = game.scene.getScene('CityScene') as unknown as Record<string, unknown> | null;
        const state = cityScene?.['gameState'];
        if (state) {
          const ss = new SaveSystem();
          const saved = ss.save(state as Parameters<SaveSystem['save']>[0]);
          console.log('[TabVisibility] Auto-save on hide:', saved ? 'OK' : 'FAILED');
        }
      } catch (e) {
        console.warn('[TabVisibility] Auto-save on hide failed:', e);
      }
    } else {
      // Tab visible again – resume the game loop
      try {
        game.loop.wake();
      } catch (e) {
        console.warn('[TabVisibility] Could not wake game loop:', e);
      }
    }
  });
}
