/**
 * processNeueIcons.ts
 * Verarbeitet alle Icons aus "Neue Icons/" → final/
 * - Center-Crop zu Quadrat
 * - Resize auf 128×128 (füllt den vollen Slot)
 * - KEIN remove-bg! Farbige Slot-Hintergründe bleiben erhalten.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR  = path.resolve('public/assets/sprites/final/Neue Icons');
const OUTPUT_DIR = path.resolve('public/assets/sprites/final');
const TARGET     = 128;

// Dateinamen-Korrekturen (Tippfehler + deutsche Namen → korrekte ITEM_* Keys)
const NAME_FIXES: Record<string, string> = {
  'ITEM_FALLEN_HUNTER_BOW':   'ITEM_FALLEN_HUNTERS_BOW',
  'ITEM_HYDRA_vENOMFANG':     'ITEM_HYDRA_VENOMFANG',
  'ITEM_IRON_SWOR':           'ITEM_IRON_SWORD',
  'ITEM_LEATHER-ARMOR':       'ITEM_LEATHER_ARMOR',
  'Kristallamulett':          'ITEM_CRYSTAL_PENDANT',
  'Schwere Lederrüstung':     'ITEM_HEAVY_LEATHER_ARMOR',
  'Stahlrüstung':             'ITEM_STEEL_ARMOR',
  'T1Robe_orig':              'ITEM_NOVIZENROBE',
  'T2Robe':                   'ITEM_BATTLE_ROBE',
  'Wolfszahn-Kette':          'ITEM_WOLF_FANG_NECKLACE',
};

async function processIcon(inputFile: string): Promise<void> {
  const baseName = path.basename(inputFile, '.png');
  const targetKey = NAME_FIXES[baseName] ?? baseName;
  const outputFile = path.join(OUTPUT_DIR, `${targetKey}.png`);

  const meta = await sharp(inputFile).metadata();
  const W = meta.width!;
  const H = meta.height!;

  // Quadratischer Center-Crop
  const size = Math.min(W, H);
  const left = Math.floor((W - size) / 2);
  const top  = Math.floor((H - size) / 2);

  await sharp(inputFile)
    .extract({ left, top, width: size, height: size })
    .resize(TARGET, TARGET, { kernel: 'lanczos3', fit: 'fill' })
    .png()
    .toFile(outputFile);

  const renamed = baseName !== targetKey ? ` → ${targetKey}` : '';
  console.log(`  ✅ ${baseName}${renamed} (${W}×${H} → ${TARGET}×${TARGET})`);
}

async function main() {
  console.log('Magic City – Neue Icons verarbeiten');
  console.log('⚠️  KEIN remove-bg — Slot-Hintergründe bleiben erhalten!');
  console.log('='.repeat(50));

  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.toLowerCase().endsWith('.png'))
    .map(f => path.join(INPUT_DIR, f));

  console.log(`${files.length} Icons gefunden\n`);

  let ok = 0, err = 0;
  for (const file of files) {
    try {
      await processIcon(file);
      ok++;
    } catch (e) {
      console.log(`  ❌ ${path.basename(file)}: ${e}`);
      err++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ ${ok} verarbeitet  ❌ ${err} Fehler`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log('\n⚠️  Bitte NICHT npm run remove-bg ausführen!');
}

main().catch(err => { console.error(err); process.exit(1); });
