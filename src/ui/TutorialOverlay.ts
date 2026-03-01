import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UI_COLORS, UI_STR_COLORS, FONT_FAMILY } from '../rendering/Colors';
import { Sidebar } from './Sidebar';

interface TutorialStep {
  text: string;
  highlightSidebar?: number; // Index des Sidebar-Buttons (0-5) zum Hervorheben
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    text: 'Willkommen in Magic City!\nDu hast ein Lagerhaus, Wohnhaus\nund Gilde - verbunden per Strasse.\nBaue nun deine Wirtschaft auf!',
  },
  {
    text: 'Baue zuerst eine Holzfaellerhuette!\nHolz brauchst du fuer fast alles.\nKlicke auf "Bauen" und waehle sie.',
    highlightSidebar: 0,
  },
  {
    text: 'Verbinde die Huette per Strasse\nmit dem Lagerhaus (Mitte der Karte).\nOhne Strasse wird nichts geliefert!',
    highlightSidebar: 1,
  },
  {
    text: 'Baue nun eine Getreidefarm und\nverbinde sie ebenfalls per Strasse.\nFarmen produzieren Getreide.',
    highlightSidebar: 0,
  },
  {
    text: 'Jetzt die Produktionskette:\n1. Brunnen bauen (liefert Wasser)\n2. Muehle (Getreide → Mehl)\n3. Baeckerei (Mehl → Brot)\nBrunnen NAH an Baeckerei setzen!',
    highlightSidebar: 0,
  },
  {
    text: 'Brot ernaehrt neue Buerger.\nBuerger arbeiten automatisch in\nGebaeuden. Baue Wohnhaeuser fuer\nmehr Kapazitaet! Schau ins Lager.',
    highlightSidebar: 4,
  },
  {
    text: 'Deine Gilde ist schon gebaut!\nBilde freie Buerger zu Kaempfern\naus. Waehle eine Klasse und\nbezahle Gold fuer das Training.',
    highlightSidebar: 2,
  },
  {
    text: 'Wenn ein Kaempfer bereit ist:\nStarte eine Expedition! Waehle\neine Route und kaempfe dich\ndurch die Raeume.',
    highlightSidebar: 3,
  },
  {
    text: 'Viel Erfolg! Druecke "Hilfe"\nfuer diese Tipps.\n\nHolz → Getreide → Mehl → Brot\n→ Buerger → Training → Expedition!',
    highlightSidebar: 5,
  },
];

/**
 * Special banner messages triggered by milestones (not part of step sequence).
 * Called externally via TutorialOverlay.showMilestoneBanner().
 */
export const MILESTONE_BANNERS: Record<string, string> = {
  first_guild_training: 'Deine erste Gilde ist geboren!',
  first_expedition_victory: 'Erster Sieg! Ruhm und Beute!',
  first_boss_kill: 'Bosskampf gewonnen!',
  rank_up: 'Gildenrang aufgestiegen!',
};

/**
 * Nicht-blockierendes Tutorial als Hint-Box oben rechts.
 * Spieler kann waehrend des Tutorials normal bauen und interagieren.
 */
export class TutorialOverlay {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  private currentStep = 0;

  public onComplete?: () => void;

  // Box-Position: oben rechts, neben der HUD-Leiste
  private boxW = 290;
  private boxH = 160;
  private screenX = 0;
  private screenY = 38; // unter der HUD-Leiste

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.screenX = scene.scale.width - this.boxW - 12;
    this.create();
  }

  private create(): void {
    this.container = this.scene.add.container(this.screenX, this.screenY)
      .setDepth(970) // unter Modals (980+), ueber Spielwelt
      .setVisible(false);

    // Sidebar-Highlight (separat, da es sich an Welt-Coords orientiert)
    this.highlightGraphics = this.scene.add.graphics()
      .setDepth(905) // knapp ueber Sidebar (910)
      .setVisible(false);
  }

  updatePosition(cam: Phaser.Cameras.Scene2D.Camera): void {
    const z = cam.zoom;
    this.container.setPosition(cam.worldView.x + this.screenX / z, cam.worldView.y + this.screenY / z);
    this.container.setScale(1 / z);
    if (this.highlightGraphics.visible) {
      this.highlightGraphics.setPosition(cam.worldView.x, cam.worldView.y);
      this.highlightGraphics.setScale(1 / z);
    }
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  show(state: GameState): void {
    this.currentStep = state.tutorial.done ? 0 : state.tutorial.currentStep;
    this.renderStep();
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
    this.highlightGraphics.setVisible(false);
    // Alle laufenden Tweens auf dem Highlight stoppen
    this.scene.tweens.killTweensOf(this.highlightGraphics);
  }

  private renderStep(): void {
    this.container.removeAll(true);
    this.highlightGraphics.clear();
    this.highlightGraphics.setVisible(false);
    this.scene.tweens.killTweensOf(this.highlightGraphics);

    const step = TUTORIAL_STEPS[this.currentStep];
    if (!step) {
      this.completeTutorial();
      return;
    }

    // ── Hint-Box Hintergrund ──
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.PANEL_BG_DARK, 0.92);
    bg.fillRoundedRect(0, 0, this.boxW, this.boxH, 6);
    bg.lineStyle(2, UI_COLORS.PANEL_BORDER, 0.8);
    bg.strokeRoundedRect(0, 0, this.boxW, this.boxH, 6);
    this.container.add(bg);

    // Schritt-Anzeige + Titel
    this.container.add(
      this.scene.add.text(10, 8, `Tipp ${this.currentStep + 1}/${TUTORIAL_STEPS.length}`, {
        fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.MUTED,
      }),
    );

    // Tutorial-Text
    this.container.add(
      this.scene.add.text(10, 24, step.text, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.LIGHT,
        lineSpacing: 3, wordWrap: { width: this.boxW - 20 },
      }),
    );

    // ── Buttons (unten in der Box) ──
    const btnY = this.boxH - 30;

    // Weiter-Button
    const nextLabel = this.currentStep < TUTORIAL_STEPS.length - 1 ? 'Weiter >' : 'Fertig!';
    this.addButton(this.boxW - 80, btnY, 70, nextLabel, () => {
      this.nextStep();
    }, UI_COLORS.SUCCESS_BTN_BG);

    // Schliessen-Button
    this.addButton(10, btnY, 70, 'Schliessen', () => {
      this.completeTutorial();
    }, UI_COLORS.BTN_NORMAL);

    // ── Sidebar-Button Highlight (pulsierend) ──
    if (step.highlightSidebar !== undefined) {
      const btnIndex = step.highlightSidebar;
      const spotY = 32 + btnIndex * (56 + 6); // btnH + gap aus Sidebar

      this.highlightGraphics.clear();
      this.highlightGraphics.lineStyle(3, UI_COLORS.GOLD_MID, 1);
      this.highlightGraphics.strokeRect(2, spotY + 2, Sidebar.WIDTH - 4, 52);
      this.highlightGraphics.setVisible(true);
      this.highlightGraphics.setAlpha(1);

      this.scene.tweens.add({
        targets: this.highlightGraphics,
        alpha: { from: 1, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private nextStep(): void {
    this.currentStep++;
    if (this.currentStep >= TUTORIAL_STEPS.length) {
      this.completeTutorial();
    } else {
      this.renderStep();
    }
  }

  private completeTutorial(): void {
    this.hide();
    this.onComplete?.();
  }

  /**
   * Show a one-time milestone banner (not part of the tutorial step sequence).
   * Auto-hides after 3 seconds. Used for "Deine erste Gilde ist geboren!" etc.
   */
  showMilestoneBanner(message: string): void {
    // Create temporary banner container
    const bannerContainer = this.scene.add.container(
      this.screenX, this.screenY - 10,
    ).setDepth(975).setAlpha(0);

    const bannerW = this.boxW;
    const bannerH = 50;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_COLORS.GOLD_MID, 0.15);
    bg.fillRoundedRect(0, 0, bannerW, bannerH, 8);
    bg.lineStyle(2, UI_COLORS.GOLD_MID, 0.8);
    bg.strokeRoundedRect(0, 0, bannerW, bannerH, 8);
    bannerContainer.add(bg);

    // Star icon
    bannerContainer.add(
      this.scene.add.text(12, bannerH / 2, '\u2605', {
        fontFamily: FONT_FAMILY, fontSize: '20px', color: UI_STR_COLORS.GOLD,
      }).setOrigin(0, 0.5),
    );

    // Message text
    bannerContainer.add(
      this.scene.add.text(36, bannerH / 2, message, {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: UI_STR_COLORS.GOLD,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5),
    );

    // Fade in
    this.scene.tweens.add({
      targets: bannerContainer,
      alpha: 1,
      y: this.screenY - 20,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Auto-hide after 3s
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: bannerContainer,
        alpha: 0,
        y: this.screenY - 40,
        duration: 500,
        ease: 'Cubic.easeIn',
        onComplete: () => bannerContainer.destroy(),
      });
    });
  }

  private addButton(x: number, y: number, w: number, label: string, onClick: () => void, bgColor: number): void {
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(bgColor, 1);
    btnBg.fillRoundedRect(x, y, w, 22, 3);

    const text = this.scene.add.text(x + w / 2, y + 11, label, {
      fontFamily: FONT_FAMILY, fontSize: '12px', color: UI_STR_COLORS.LIGHT,
    }).setOrigin(0.5);

    const hitArea = this.scene.add.zone(x + w / 2, y + 11, w, 22).setInteractive();
    hitArea.on('pointerdown', onClick);
    const hoverColor = Math.min(bgColor + 0x111111, 0xFFFFFF);
    hitArea.on('pointerover', () => btnBg.clear().fillStyle(hoverColor, 1).fillRoundedRect(x, y, w, 22, 3));
    hitArea.on('pointerout', () => btnBg.clear().fillStyle(bgColor, 1).fillRoundedRect(x, y, w, 22, 3));

    this.container.add([btnBg, text, hitArea]);
  }
}
