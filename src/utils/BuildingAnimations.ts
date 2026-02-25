import Phaser from 'phaser';
import { BuildingInstance } from '../models/Building';
import { TILE_SIZE } from '../rendering/Colors';
import { BUILDING_DEFS } from '../data/buildings';

/**
 * Applies visual animations to building sprites.
 * Called after renderBuilding() to add life to the city.
 */
export function applyBuildingAnimation(
  scene: Phaser.Scene,
  building: BuildingInstance,
  container: Phaser.GameObjects.Container,
): void {
  if (!building.built) return;

  const def = BUILDING_DEFS[building.typeId];
  if (!def) return;
  const [fw, fh] = def.footprint;
  const pw = fw * TILE_SIZE;
  const ph = fh * TILE_SIZE;

  switch (building.typeId) {
    case 'MILL_WIND':
      addWindmillSpin(scene, container, pw, ph);
      break;
    case 'BAKERY':
      addSmokeParticles(scene, container, pw);
      break;
    case 'SMITHY':
      addGlowPulse(scene, container, pw, ph);
      break;
  }
}

/**
 * Windmill: rotating indicator on the building.
 * Uses a small '+' text that rotates continuously.
 */
function addWindmillSpin(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  pw: number,
  _ph: number,
): void {
  const blade = scene.add.text(pw - 8, 4, '+', {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#C0C0C0',
  }).setOrigin(0.5).setAlpha(0.7);

  container.add(blade);

  scene.tweens.add({
    targets: blade,
    angle: 360,
    duration: 3000,
    repeat: -1,
    ease: 'Linear',
  });
}

/**
 * Bakery: small smoke dots rising from the chimney area.
 */
function addSmokeParticles(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  pw: number,
): void {
  const spawnSmoke = () => {
    const smoke = scene.add.graphics();
    smoke.fillStyle(0xAAAAAA, 0.4);
    smoke.fillCircle(0, 0, 2);
    smoke.setPosition(pw * 0.7 + (Math.random() - 0.5) * 6, 2);
    container.add(smoke);

    scene.tweens.add({
      targets: smoke,
      y: -15 - Math.random() * 10,
      x: smoke.x + (Math.random() - 0.5) * 8,
      alpha: 0,
      duration: 1500 + Math.random() * 500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        container.remove(smoke, true);
      },
    });
  };

  // Spawn smoke periodically
  scene.time.addEvent({
    delay: 800,
    callback: spawnSmoke,
    loop: true,
  });
}

/**
 * Smithy: subtle orange glow pulse.
 */
function addGlowPulse(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  pw: number,
  ph: number,
): void {
  const glow = scene.add.graphics();
  glow.fillStyle(0xFF6600, 0.08);
  glow.fillRect(0, 0, pw, ph);
  container.add(glow);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.08, to: 0.2 },
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}
