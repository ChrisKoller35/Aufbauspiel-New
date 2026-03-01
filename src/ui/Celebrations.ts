import Phaser from 'phaser';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';

/**
 * Visual celebration effects: confetti, banners, flash text.
 * Used for Moment-of-Delight: boss kills, rank-ups, settler arrivals.
 */
export class Celebrations {
  /**
   * Gold confetti burst from top of screen (boss victory).
   * Creates ~30 falling particles with random drift.
   */
  static bossConfetti(scene: Phaser.Scene): void {
    const cam = scene.cameras.main;
    const screenW = scene.scale.width;
    const colors = [0xFFD700, 0xE8C34A, 0xFFA500, 0xFFFFFF, 0xD4A54A];

    for (let i = 0; i < 30; i++) {
      const x = cam.worldView.x + Math.random() * screenW;
      const y = cam.worldView.y - 10;
      const size = 3 + Math.random() * 5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const particle = scene.add.graphics().setDepth(999);
      particle.fillStyle(color, 1);
      particle.fillRect(0, 0, size, size);
      particle.setPosition(x, y);

      scene.tweens.add({
        targets: particle,
        y: y + 500 + Math.random() * 300,
        x: x + (Math.random() - 0.5) * 200,
        alpha: 0,
        angle: Math.random() * 720,
        duration: 1500 + Math.random() * 1500,
        ease: 'Cubic.easeIn',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Gold flash text banner at screen center (rank-up, milestone).
   * Text scales up, holds, then fades.
   */
  static flashBanner(scene: Phaser.Scene, text: string, color: string = UI_STR_COLORS.GOLD): void {
    const cam = scene.cameras.main;
    const cx = cam.worldView.x + scene.scale.width / 2;
    const cy = cam.worldView.y + scene.scale.height / 3;

    const banner = scene.add.text(cx, cy, text, {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(998).setAlpha(0).setScale(0.5);

    scene.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(1500, () => {
          scene.tweens.add({
            targets: banner,
            alpha: 0,
            y: cy - 40,
            duration: 600,
            ease: 'Cubic.easeIn',
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  /**
   * Small floating notification at screen top (settler arrival, class unlock).
   */
  static floatingNotification(scene: Phaser.Scene, text: string, color: string = UI_STR_COLORS.LOOT): void {
    const cam = scene.cameras.main;
    const cx = cam.worldView.x + scene.scale.width / 2;
    const y = cam.worldView.y + 50;

    // Background
    const bg = scene.add.graphics().setDepth(997);
    const textObj = scene.add.text(cx, y, text, {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(998).setAlpha(0);

    const padX = 16;
    const padY = 6;
    const tw = textObj.width + padX * 2;
    const th = textObj.height + padY * 2;
    bg.fillStyle(UI_COLORS.PANEL_BG_DARK, 0.85);
    bg.fillRoundedRect(cx - tw / 2, y - th / 2, tw, th, 6);
    bg.lineStyle(1, UI_COLORS.PANEL_BORDER, 0.6);
    bg.strokeRoundedRect(cx - tw / 2, y - th / 2, tw, th, 6);
    bg.setAlpha(0);

    scene.tweens.add({
      targets: [textObj, bg],
      alpha: 1,
      duration: 300,
      onComplete: () => {
        scene.time.delayedCall(2500, () => {
          scene.tweens.add({
            targets: [textObj, bg],
            alpha: 0,
            y: '-=20',
            duration: 500,
            onComplete: () => {
              textObj.destroy();
              bg.destroy();
            },
          });
        });
      },
    });
  }

  /**
   * Quick gold sparkle ring around a world position (building upgrade, synergy).
   */
  static sparkleRing(scene: Phaser.Scene, worldX: number, worldY: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 20;
      const px = worldX + Math.cos(angle) * radius;
      const py = worldY + Math.sin(angle) * radius;

      const dot = scene.add.graphics().setDepth(800);
      dot.fillStyle(0xFFD700, 1);
      dot.fillCircle(0, 0, 2);
      dot.setPosition(px, py);

      scene.tweens.add({
        targets: dot,
        x: worldX + Math.cos(angle) * (radius + 15),
        y: worldY + Math.sin(angle) * (radius + 15),
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
