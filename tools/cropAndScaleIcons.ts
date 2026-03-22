// ============================================================
// Magic City – Icon Crop & Scale
// Schneidet NewIcons zu und skaliert 2x für Inventar-Slots
// ============================================================
// Anleitung: npm run crop-icons [--all | FILTER]
// (Mit --all um alle NewIcons zu prozessieren)
// ============================================================

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// German name → Registry key mapping
// Basiert auf spriteRegistry.ts – Anpassung siehe Kommentare
const ICON_MAPPING: Record<string, string> = {
  // MVP Waffen/Schilde/Stäbe
  'eisenschwert': 'ITEM_IRON_SWORD',
  'eisenschild': 'ITEM_IRON_SHIELD',
  'stahlschild': 'ITEM_MAGITECH_SHIELD', // Elegant steel shield with magical enhancement
  'eichenstab': 'ITEM_OAK_STAFF',
  'jägerbogen': 'ITEM_HUNTER_BOW',

  // Post-MVP Waffen (T2/T3)
  'stahlschwert': 'ITEM_STEEL_SWORD',
  'langbogen': 'ITEM_LONGBOW',
  'kristallstab': 'ITEM_CRYSTAL_STAFF',

  // Epic Items (Boss-Drops)
  'bogen des gefallenen': 'ITEM_FALLEN_KNIGHTS_BLADE',
  'hydra-giftzahn': 'ITEM_HYDRA_VENOMFANG',
  'wyrmschuppen-schild': 'ITEM_WYRM_SCALE_SHIELD',
  'kristallgolem-stab': 'ITEM_CRYSTAL_GOLEM_CORE',

  // T4 Legendary Items
  't4schwert': 'ITEM_BLADE_OF_THOUSAND_SHADOWS',
  't4schild': 'ITEM_SHIELD_OF_THE_ANCIENT',
  't4stab': 'ITEM_CRYSTAL_STAFF',
  't4bogen': 'ITEM_LONGBOW',
};

async function cropAndScale(
  inputPath: string,
  outputPath: string,
  scale = 2
): Promise<{ success: boolean; message: string; width?: number; height?: number }> {
  try {
    // Metadaten laden
    const metadata = await sharp(inputPath).metadata();
    if (!metadata.width || !metadata.height) {
      return { success: false, message: 'Dimensionen konnten nicht gelesen werden' };
    }

    // Raw-Daten für Smart-Crop
    const image = sharp(inputPath);
    const buffer = await image.raw().toBuffer({ resolveWithObject: true });
    const { data, info } = buffer;

    // Bounding Box von Nicht-Weiß-Pixeln finden
    const threshold = 240; // Pixel >= 240 = "Weiß"
    let minX = info.width,
      maxX = 0,
      minY = info.height,
      maxY = 0;
    const channels = info.channels;

    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if pixel is not white-ish
        if (r < threshold || g < threshold || b < threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Kleiner Padding hinzufügen
    const pad = 10;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(info.width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(info.height - cropY, maxY - minY + pad * 2);

    // Zuschneiden + 2x skalieren
    const scaledW = Math.round(cropW * scale);
    const scaledH = Math.round(cropH * scale);

    await sharp(inputPath)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .resize(scaledW, scaledH, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toFile(outputPath);

    return {
      success: true,
      message: `${scaledW}×${scaledH} px (zugschnitten von ${cropW}×${cropH})`,
      width: scaledW,
      height: scaledH,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const iconDir = path.join('public', 'assets', 'sprites', 'final', 'NewIcons');
  const outputDir = path.join('public', 'assets', 'sprites', 'final');

  console.log('🎨 Magic City – Icon Crop & Scale');
  console.log('='.repeat(50));

  if (!fs.existsSync(iconDir)) {
    console.error(`❌ NewIcons-Ordner nicht gefunden: ${iconDir}`);
    process.exit(1);
  }

  // --all Flag oder Positional Argument als Filter
  const args = process.argv.slice(2);
  const processAll = args.includes('--all');
  const filter = !processAll ? args[0]?.toLowerCase() : '';

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(iconDir).filter(f => f.endsWith('.png'));

  let toProcess = files;
  if (filter) {
    toProcess = files.filter(f => f.toLowerCase().includes(filter));
    console.log(`🎯 Filter: "${filter}" → ${toProcess.length} Icon(s)`);
  } else if (processAll) {
    console.log(`📦 Alle NewIcons werden prozessiert (${files.length} Stück)`);
  } else {
    console.log(`📦 Test-Modus: Erste Icon wird als Test prozessiert`);
    toProcess = files.slice(0, 1);
    console.log(`   (--all zum Prozessieren aller Icons)`);
  }

  console.log('');

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of toProcess) {
    const baseName = path.basename(file, '.png').toLowerCase();
    const key = ICON_MAPPING[baseName];

    if (!key) {
      console.log(`   ⚠️  ${file}: Kein Mapping definiert, überspringe`);
      skipped++;
      continue;
    }

    const inputPath = path.join(iconDir, file);
    const outputPath = path.join(outputDir, `${key}.png`);

    const result = await cropAndScale(inputPath, outputPath, 2);

    if (result.success) {
      console.log(`   ✅ ${key}: ${result.message}`);
      success++;
    } else {
      console.log(`   ❌ ${key}: ${result.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('='.repeat(50));
  console.log(`🏁 Fertig!  ✅ ${success} verarbeitet  ❌ ${failed} fehler  ⏭️  ${skipped} übersprungen`);
  console.log(`📁 Output: ${outputDir}`);

  if (success > 0) {
    console.log('');
    console.log('📋 Nächster Schritt:');
    console.log('   1. Icons überprüfen im Inventar');
    console.log('   2. Falls nötig: Mappings in cropAndScaleIcons.ts anpassen');
    console.log('   3. npm run resize-sprites -- --force (zur finalen Größen-Anpassung)');
    console.log('   4. npm run remove-bg (falls weiße Hintergründe übrig sind)');
  }

  console.log('');
}

main().catch(err => {
  console.error(
    '❌ Fehler:',
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
});
