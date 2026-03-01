import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY, UI_TEXT_STYLES } from '../rendering/Colors';
import { drawGlassPanel, createGlassButton } from '../rendering/UIHelper';
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
    const hasSave = this.saveSystem.hasSave();

    // ── Background ──────────────────────────────────────────
    if (this.textures.exists('BG_MAIN_MENU')) {
      this.add.image(cx, cy, 'BG_MAIN_MENU')
        .setDisplaySize(this.scale.width, this.scale.height);
    }
    // Dark overlay for readability
    const darkOverlay = this.add.graphics();
    darkOverlay.fillStyle(0x02080A, 0.75);
    darkOverlay.fillRect(0, 0, this.scale.width, this.scale.height);

    // ── Glass Panel ─────────────────────────────────────────
    const panelW = 380;
    const panelH = hasSave ? 360 : 310;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const panelGfx = this.add.graphics();
    drawGlassPanel(panelGfx, panelX, panelY, panelW, panelH, UI_COLORS.GLASS_ACCENT_MENU, 16);

    // ── Floating Particles ───────────────────────────────────
    this.createFloatingParticles(cx, cy);

    // ── Logo / Titel ─────────────────────────────────────────
    this.add.text(cx, panelY + 52, 'The Guild Hard', {
      fontFamily: FONT_FAMILY, fontSize: '36px', color: UI_STR_COLORS.GLASS_MENU,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, panelY + 112, "The Guild's Hearth", {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: UI_STR_COLORS.GLASS_DIM,
    }).setOrigin(0.5);

    // Separator line
    const sepGfx = this.add.graphics();
    sepGfx.fillStyle(UI_COLORS.GLASS_ACCENT_MENU, 0.25);
    sepGfx.fillRect(panelX + 24, panelY + 132, panelW - 48, 1);

    // ── Primary Buttons ──────────────────────────────────────
    const btnW = panelW - 48;
    const btnH = 44;
    const btnX = panelX + 24;
    let nextY = panelY + 148;

    createGlassButton(this, {
      x: btnX, y: nextY, width: btnW, height: btnH,
      label: 'Neues Spiel',
      accentColor: UI_COLORS.GLASS_ACCENT_MENU,
      accentStr: UI_STR_COLORS.GLASS_MENU,
      fontSize: '16px',
      variant: 'primary',
      onClick: () => {
        this.sound.stopAll();
        this.saveSystem.deleteSave();
        this.scene.start('CityScene');
      },
    });
    nextY += btnH + 10;

    if (hasSave) {
      createGlassButton(this, {
        x: btnX, y: nextY, width: btnW, height: btnH,
        label: 'Fortsetzen',
        accentColor: UI_COLORS.GLASS_ACCENT_MENU,
        accentStr: UI_STR_COLORS.GLASS_MENU,
        fontSize: '16px',
        variant: 'secondary',
        onClick: () => {
          this.sound.stopAll();
          this.scene.start('CityScene');
        },
      });
      nextY += btnH + 10;
    }

    // ── Save Utility Buttons ─────────────────────────────────
    // Small separator
    nextY += 4;
    const sepGfx2 = this.add.graphics();
    sepGfx2.fillStyle(0xFFFFFF, 0.06);
    sepGfx2.fillRect(panelX + 24, nextY, panelW - 48, 1);
    nextY += 12;

    const utilBtnH = 28;
    const utilFontSize = '11px';

    if (hasSave) {
      const halfW = Math.floor((btnW - 8) / 2);
      createGlassButton(this, {
        x: btnX, y: nextY, width: halfW, height: utilBtnH,
        label: 'Export Save',
        accentColor: UI_COLORS.GLASS_ACCENT_MENU,
        accentStr: UI_STR_COLORS.GLASS_DIM,
        fontSize: utilFontSize,
        variant: 'secondary',
        onClick: () => this.saveSystem.exportSave(),
      });
      createGlassButton(this, {
        x: btnX + halfW + 8, y: nextY, width: halfW, height: utilBtnH,
        label: 'Import Save',
        accentColor: UI_COLORS.GLASS_ACCENT_MENU,
        accentStr: UI_STR_COLORS.GLASS_DIM,
        fontSize: utilFontSize,
        variant: 'secondary',
        onClick: async () => {
          const ok = await this.saveSystem.importSave();
          if (ok) this.scene.restart();
        },
      });
    } else {
      createGlassButton(this, {
        x: cx - Math.floor(btnW * 0.4), y: nextY, width: Math.floor(btnW * 0.8), height: utilBtnH,
        label: 'Import Save',
        accentColor: UI_COLORS.GLASS_ACCENT_MENU,
        accentStr: UI_STR_COLORS.GLASS_DIM,
        fontSize: utilFontSize,
        variant: 'secondary',
        onClick: async () => {
          const ok = await this.saveSystem.importSave();
          if (ok) this.scene.restart();
        },
      });
    }

    // ── Credits ──────────────────────────────────────────────
    this.add.text(cx, this.scale.height - 24, 'MVP-0 \u2013 Fantasy City Builder', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GLASS_DISABLED,
    }).setOrigin(0.5);

    // ── Music ─────────────────────────────────────────────────
    if (this.cache.audio.has('music_menu')) {
      this.sound.play('music_menu', { volume: 0.3, loop: true });
    }
  }

  private createFloatingParticles(cx: number, cy: number): void {
    for (let i = 0; i < 8; i++) {
      const dot = this.add.graphics();
      const radius = 1.5 + Math.random() * 2;
      // Mix gold and blue particles
      const color = i % 3 === 0 ? 0x4CC9F0 : i % 3 === 1 ? 0xFFD700 : 0xA855F7;
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, radius);
      dot.setAlpha(0);

      const animateParticle = () => {
        const startX = cx + (Math.random() - 0.5) * 420;
        const startY = cy + 150 + Math.random() * 100;
        const floatDist = 200 + Math.random() * 80;
        const duration = 3200 + Math.random() * 2500;

        dot.setPosition(startX, startY);
        dot.setAlpha(0);

        this.tweens.chain({
          targets: dot,
          tweens: [
            { y: startY - floatDist * 0.4, alpha: 0.7, duration: duration * 0.3, ease: 'Sine.easeOut' },
            { y: startY - floatDist * 0.8, duration: duration * 0.4, ease: 'Linear' },
            { y: startY - floatDist, alpha: 0, duration: duration * 0.3, ease: 'Sine.easeIn' },
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
