import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY, UI_TEXT_STYLES } from '../rendering/Colors';
import { createButton, createNineSlice } from '../rendering/UIHelper';
import { SaveSystem } from '../systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  private saveSystem!: SaveSystem;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.saveSystem = new SaveSystem();
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // ─── Background ───────────────────────────────────────────
    // Full-color BG_MAIN_MENU sprite, NO alpha dimming on the image itself
    if (this.textures.exists('BG_MAIN_MENU')) {
      this.add.image(cx, cy, 'BG_MAIN_MENU')
        .setDisplaySize(this.scale.width, this.scale.height);
    }

    // Dark overlay OVER the image for text readability
    const darkOverlay = this.add.graphics();
    darkOverlay.fillStyle(0x000000, 0.35);
    darkOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    // ─── Goldener Rahmen (NineSlice) ──────────────────────────
    const frameX = cx - 200;
    const frameY = cy - 170;
    const frame = createNineSlice(
      this, frameX, frameY, 400, 340,
      'UI_FRAME_GOLD',
      UI_COLORS.PANEL_BORDER,
      0.6,
    );
    if (frame instanceof Phaser.GameObjects.NineSlice) {
      frame.setAlpha(0.6);
    }

    // ─── Partikel-Effekt (goldene schwebende Punkte) ──────────
    this.createFloatingParticles(cx, cy);

    // ─── Logo / Titel ─────────────────────────────────────────
    if (this.textures.exists('UI_LOGO')) {
      // Glow-Effekt: grösseres, getintetes Logo dahinter
      this.add.image(cx, cy - 120, 'UI_LOGO')
        .setDisplaySize(420, 110)
        .setAlpha(0.3)
        .setTint(0xFFD700);

      // Eigentliches Logo darueber
      this.add.image(cx, cy - 120, 'UI_LOGO')
        .setDisplaySize(400, 100);
    } else {
      // Fallback: Text
      this.add.text(cx, cy - 120, 'Magic City', UI_TEXT_STYLES.TITLE)
        .setOrigin(0.5);
    }

    // Subtitle
    this.add.text(cx, cy - 60, 'The Guild\'s Hearth', UI_TEXT_STYLES.SUBTITLE)
      .setOrigin(0.5);

    // ─── Main Buttons (Neues Spiel / Fortsetzen) ──────────────
    createButton(this, {
      x: cx - 120,
      y: cy - 10,
      width: 240,
      height: 40,
      label: 'Neues Spiel',
      textStyle: { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.LIGHT },
      onClick: () => {
        this.sound.stopAll();
        this.saveSystem.deleteSave();
        this.scene.start('CityScene');
      },
    });

    if (this.saveSystem.hasSave()) {
      createButton(this, {
        x: cx - 120,
        y: cy + 40,
        width: 240,
        height: 40,
        label: 'Fortsetzen',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '16px', color: UI_STR_COLORS.LIGHT },
        onClick: () => {
          this.sound.stopAll();
          this.scene.start('CityScene');
        },
      });
    }

    // ─── Save Management Buttons (Export / Import) ────────────
    const saveBtnY = cy + 110;
    const saveBtnW = 130;
    const saveBtnGap = 8;
    const hasSave = this.saveSystem.hasSave();

    if (hasSave) {
      // Zwei Buttons nebeneinander: Export links, Import rechts
      createButton(this, {
        x: cx - saveBtnGap / 2 - saveBtnW,
        y: saveBtnY,
        width: saveBtnW,
        height: 28,
        label: 'Export Save',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM },
        onClick: () => {
          this.saveSystem.exportSave();
        },
      });

      createButton(this, {
        x: cx + saveBtnGap / 2,
        y: saveBtnY,
        width: saveBtnW,
        height: 28,
        label: 'Import Save',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM },
        onClick: async () => {
          const ok = await this.saveSystem.importSave();
          if (ok) {
            this.scene.restart();
          }
        },
      });
    } else {
      // Nur Import-Button, zentriert
      createButton(this, {
        x: cx - saveBtnW / 2,
        y: saveBtnY,
        width: saveBtnW,
        height: 28,
        label: 'Import Save',
        textStyle: { fontFamily: FONT_FAMILY, fontSize: '10px', color: UI_STR_COLORS.DIM },
        onClick: async () => {
          const ok = await this.saveSystem.importSave();
          if (ok) {
            this.scene.restart();
          }
        },
      });
    }

    // ─── Credits ──────────────────────────────────────────────
    this.add.text(cx, this.scale.height - 30, 'MVP-0 \u2013 Fantasy City Builder', UI_TEXT_STYLES.CREDITS)
      .setOrigin(0.5);

    // ─── Musik ────────────────────────────────────────────────
    if (this.cache.audio.has('music_menu')) {
      this.sound.play('music_menu', { volume: 0.3, loop: true });
    }
  }

  /**
   * Erstellt 6 kleine goldene Kreise die langsam nach oben schweben.
   * Jeder Partikel: fade in -> float up -> fade out -> reset -> repeat
   */
  private createFloatingParticles(cx: number, cy: number): void {
    for (let i = 0; i < 6; i++) {
      const dot = this.add.graphics();
      const radius = 1.5 + Math.random() * 1.5;
      dot.fillStyle(0xFFD700, 1);
      dot.fillCircle(0, 0, radius);
      dot.setAlpha(0);

      const animateParticle = () => {
        const startX = cx + (Math.random() - 0.5) * 300;
        const startY = cy + 100 + Math.random() * 80;
        const floatDist = 180 + Math.random() * 60;
        const duration = 3000 + Math.random() * 2000;

        dot.setPosition(startX, startY);
        dot.setAlpha(0);

        // Single timeline: fade in, float up, fade out
        this.tweens.chain({
          targets: dot,
          tweens: [
            // Phase 1: fade in + start floating
            {
              y: startY - floatDist * 0.4,
              alpha: 0.6,
              duration: duration * 0.3,
              ease: 'Sine.easeOut',
            },
            // Phase 2: continue floating, hold alpha
            {
              y: startY - floatDist * 0.8,
              duration: duration * 0.4,
              ease: 'Linear',
            },
            // Phase 3: fade out + finish float
            {
              y: startY - floatDist,
              alpha: 0,
              duration: duration * 0.3,
              ease: 'Sine.easeIn',
            },
          ],
          onComplete: () => {
            // Loop: restart nach kurzer Pause
            this.time.delayedCall(200 + Math.random() * 600, animateParticle);
          },
        });
      };

      // Gestaffelter Start
      this.time.delayedCall(i * 500 + Math.random() * 400, animateParticle);
    }
  }
}
