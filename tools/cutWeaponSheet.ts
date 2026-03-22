/**
 * cutWeaponSheet.ts
 * Cuts the 4x4 weapon icon sheet into individual item sprites.
 * IMPORTANT: Does NOT run remove-bg — the colored slot backgrounds are intentional!
 *
 * Sheet layout (col=tier, row=weapon type):
 *   Col 0 = T1 (green), Col 1 = T2 (blue), Col 2 = T3 (purple), Col 3 = T4 (orange)
 *   Row 0 = Swords, Row 1 = Shields, Row 2 = Bows, Row 3 = Staves
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

const INPUT = path.resolve('public/assets/sprites/WaffenIcons t1-t4 sheet gründ blau violet und orang.png');
const OUTPUT_FINAL = path.resolve('public/assets/sprites/final');
const OUTPUT_GEN   = path.resolve('public/assets/sprites/generated');

// Target size for final sprites
const TARGET_SIZE = 128;

// Sheet is 2050×2050, 4 cols × 4 rows
// Each cell starts at: col * 512, row * 512 — but the last col/row gets the remaining pixels
const COLS = 4;
const ROWS = 4;

// Mapping: [row][col] = output key (matches ITEM_DEF ids → ITEM_KEY in sprite system)
const MAPPING: (string | null)[][] = [
  // Row 0: Swords (1h)
  ['ITEM_IRON_SWORD',         'ITEM_STEEL_SWORD',         'ITEM_HYDRA_VENOMFANG',      'ITEM_SOULBREAKER'],
  // Row 1: Shields
  ['ITEM_IRON_SHIELD',        'ITEM_STEEL_SHIELD',        'ITEM_WYRM_SCALE_SHIELD',    'ITEM_AETHER_GUARDIAN_SHIELD'],
  // Row 2: Bows (2h ranged)
  ['ITEM_HUNTER_BOW',         'ITEM_LONGBOW',             'ITEM_FALLEN_HUNTERS_BOW',   'ITEM_ETERNAL_HUNTER_BOW'],
  // Row 3: Staves (2h magic)
  ['ITEM_OAK_STAFF',          'ITEM_CRYSTAL_STAFF',       'ITEM_CRYSTAL_GOLEM_CORE',   'ITEM_WORLDEND_STAFF'],
];

async function cut() {
  const meta = await sharp(INPUT).metadata();
  const W = meta.width!;
  const H = meta.height!;

  const cellW = Math.floor(W / COLS);
  const cellH = Math.floor(H / ROWS);

  console.log(`Sheet: ${W}×${H} → cells: ${cellW}×${cellH}`);

  const results: { key: string; file: string }[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = MAPPING[row][col];
      if (!key) continue;

      const left = col * cellW;
      const top  = row * cellH;
      // Last col/row: use remaining pixels
      const width  = col === COLS - 1 ? W - left : cellW;
      const height = row === ROWS - 1 ? H - top  : cellH;

      const outFinal = path.join(OUTPUT_FINAL, `${key}.png`);
      const outGen   = path.join(OUTPUT_GEN,   `${key}.png`);

      // Cut and resize to target size
      await sharp(INPUT)
        .extract({ left, top, width, height })
        .resize(TARGET_SIZE, TARGET_SIZE, { kernel: 'lanczos3' })
        .toFile(outFinal);

      // Also copy to generated/
      fs.copyFileSync(outFinal, outGen);

      results.push({ key, file: outFinal });
      console.log(`✓ ${key} (row ${row}, col ${col}) → ${TARGET_SIZE}×${TARGET_SIZE}px`);
    }
  }

  console.log(`\nDone! ${results.length} icons cut.`);
  console.log('⚠️  DO NOT run remove-bg — colored slot backgrounds are intentional!');
}

cut().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
