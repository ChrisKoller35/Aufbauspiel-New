import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { HTMLMainMenu } from '../ui/html/HTMLMainMenu';

export class MainMenuScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;
  private htmlMenu: HTMLMainMenu | null = null;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const hasSave = this.saveSystem.hasSave();

    // ── Background image ─────────────────────────────────────
    if (this.textures.exists('BG_MAIN_MENU')) {
      this.add.image(cx, cy, 'BG_MAIN_MENU')
        .setDisplaySize(this.scale.width, this.scale.height);
    }

    // Dark overlay for depth / readability
    const darkOverlay = this.add.graphics();
    darkOverlay.fillStyle(0x02080A, 0.78);
    darkOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    // ── Floating particles (Phaser tweens keep the bg alive) ─
    this.createFloatingParticles(cx, cy);

    // ── HTML main menu ───────────────────────────────────────
    this.htmlMenu = new HTMLMainMenu(
      hasSave,
      // Neues Spiel
      () => {
        this.sound.stopAll();
        this.saveSystem.deleteSave();
        this.scene.start('CityScene');
      },
      // Fortsetzen
      () => {
        this.sound.stopAll();
        this.scene.start('CityScene');
      },
      // Export Save
      () => this.saveSystem.exportSave(),
      // Import Save
      async () => {
        const ok = await this.saveSystem.importSave();
        if (ok) this.scene.restart();
      },
    );

    // Cleanup HTML on scene shutdown
    this.events.once('shutdown', () => {
      this.htmlMenu?.destroy();
      this.htmlMenu = null;
    });

    // ── Menu music ───────────────────────────────────────────
    if (this.cache.audio.has('music_menu')) {
      this.sound.play('music_menu', { volume: 0.3, loop: true });
    }
  }

  private createFloatingParticles(cx: number, cy: number): void {
    for (let i = 0; i < 8; i++) {
      const dot = this.add.graphics();
      const radius = 1.5 + Math.random() * 2;
      // Mix gold, blue and purple particles
      const color = i % 3 === 0 ? 0x4CC9F0 : i % 3 === 1 ? 0xFFD700 : 0xA855F7;
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, radius);
      dot.setAlpha(0);

      const animateParticle = () => {
        const startX = cx + (Math.random() - 0.5) * 420;
        const startY = cy + 150 + Math.random() * 100;
        const floatDist = 200 + Math.random() * 80;
        const duration  = 3200 + Math.random() * 2500;

        dot.setPosition(startX, startY);
        dot.setAlpha(0);

        this.tweens.chain({
          targets: dot,
          tweens: [
            { y: startY - floatDist * 0.4, alpha: 0.7, duration: duration * 0.3, ease: 'Sine.easeOut' },
            { y: startY - floatDist * 0.8,              duration: duration * 0.4, ease: 'Linear' },
            { y: startY - floatDist,        alpha: 0,   duration: duration * 0.3, ease: 'Sine.easeIn' },
          ],
          onComplete: () => {
            this.time.delayedCall(150 + Math.random() * 500, animateParticle);
          },
        });
      };
      this.time.delayedCall(i * 400 + Math.random() * 300, animateParticle);
    }
  }
}
