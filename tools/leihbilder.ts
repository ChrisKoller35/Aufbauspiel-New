// ============================================================
// Magic City – Leihbilder für Gegenstände ohne eigenes Bild
// ============================================================
// Färbt ein vorhandenes Bild aus public/assets/sprites/final/ um und speichert
// es unter dem Schlüssel des Gegenstands (getItemSpriteKey). So hat jede
// Truhenkarte, jeder Trank im Kampf und jede Kachel im Lager ein Bild, und
// gleiche Gegenstände sehen gleich aus. Keine KI, kein Netz, kostet nichts.
//
// Nutzung:
//   npm run leihbilder                    # fehlende Leihbilder anlegen
//   npm run leihbilder -- --ueberschreiben # auch vorhandene neu färben
//
// Bestehende Dateien bleibt unberührt (ohne --ueberschreiben): Kommt ein
// echtes Bild (Kosten-Regel: KI-Bilder nur mit Christophs Okay, oder er
// zeichnet es selbst), den Eintrag hier löschen und das Bild ersetzen.
// Die Leihbilder sind nicht in tools/spriteRegistry.ts.
// ============================================================

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const FINAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/sprites/final');

interface Leihbild {
  /** Vorlage in final/ (ohne .png) */
  quelle: string;
  /** Farbton drehen, in Grad */
  farbton?: number;
  /** Sättigung und Helligkeit als Faktor (1 = wie die Vorlage) */
  saettigung?: number;
  helligkeit?: number;
}

// Tränke aus dem roten Heiltrank, Kräuter aus dem grünen Kraut, Kristalle aus dem violetten Splitter;
// das Tiefsee-Set (Unterwasser-Dungeons) in Meeresgrün aus den Bildern derselben Art
export const LEIHBILDER: Record<string, Leihbild> = {
  ITEM_POTION_STRENGTH: { quelle: 'ITEM_HEALING_POTION', farbton: 25, saettigung: 1.2 },
  ITEM_POTION_MANA: { quelle: 'ITEM_HEALING_POTION', farbton: 220 },
  ITEM_POTION_ANTIDOTE: { quelle: 'ITEM_HEALING_POTION', farbton: 120 },
  ITEM_POTION_TITAN: { quelle: 'ITEM_HEALING_POTION', farbton: 295, saettigung: 1.2 },
  ITEM_POTION_SPEED: { quelle: 'ITEM_HEALING_POTION', farbton: 70, helligkeit: 1.45 },
  ITEM_EMERGENCY_AIR: { quelle: 'ITEM_HEALING_POTION', farbton: 180, saettigung: 0.55, helligkeit: 1.35 },
  ITEM_HERB_FIRE_ROOT: { quelle: 'ITEM_HERB_GREEN', farbton: 270, saettigung: 1.3 },
  ITEM_HERB_SWAMP_BLOSSOM: { quelle: 'ITEM_HERB_GREEN', farbton: 190 },
  ITEM_HERB_MOONWORT: { quelle: 'ITEM_HERB_GREEN', farbton: 110, saettigung: 0.45, helligkeit: 1.3 },
  ITEM_HERB_BONE_DUST: { quelle: 'ITEM_STONE', saettigung: 0.3, helligkeit: 1.6 },
  ITEM_HERB_SHIMMER_SHROOM: { quelle: 'DECO_MUSHROOM', farbton: 200 },
  ITEM_SEA_CRYSTAL: { quelle: 'ITEM_CRYSTAL_SHARD', farbton: 260 },
  ITEM_AIR_CRYSTAL: { quelle: 'ITEM_CRYSTAL_SHARD', farbton: 250, saettigung: 0.45, helligkeit: 1.4 },
  ITEM_CORAL_BLADE: { quelle: 'ITEM_STEEL_SWORD', farbton: 320, saettigung: 1.1 },
  ITEM_DEEP_SEA_BOW: { quelle: 'ITEM_HUNTER_BOW', farbton: 60 },
  ITEM_OCEAN_MAGE_STAFF: { quelle: 'ITEM_CRYSTAL_STAFF', farbton: 320, saettigung: 1.1 },
  ITEM_NEPTUNE_SHIELD: { quelle: 'ITEM_STEEL_SHIELD', farbton: 320, saettigung: 1.1 },
  ITEM_DEEPWATER_PLATE: { quelle: 'ITEM_STEEL_ARMOR', farbton: 320, saettigung: 1.1 },
  ITEM_ABYSSAL_LEATHER: { quelle: 'ITEM_LEATHER_ARMOR', farbton: 60 },
  ITEM_TIDE_ROBE: { quelle: 'ITEM_BATTLE_ROBE', farbton: 320, saettigung: 1.1 },
  ITEM_ABYSS_AMULET: { quelle: 'ITEM_ARCANE_AMULET', farbton: 250 },
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const ueberschreiben = args.includes('--ueberschreiben');
  const zielIdx = args.indexOf('--ziel');
  const ziel = zielIdx >= 0 ? path.resolve(args[zielIdx + 1]) : FINAL;
  let neu = 0;
  for (const [key, b] of Object.entries(LEIHBILDER)) {
    const datei = path.join(ziel, `${key}.png`);
    if (fs.existsSync(datei) && !ueberschreiben) continue;
    await sharp(path.join(FINAL, `${b.quelle}.png`))
      .modulate({ hue: b.farbton ?? 0, saturation: b.saettigung ?? 1, brightness: b.helligkeit ?? 1 })
      .png()
      .toFile(datei);
    console.log(`  ${key} ← ${b.quelle}`);
    neu++;
  }
  console.log(`${neu} Leihbild(er) geschrieben, ${Object.keys(LEIHBILDER).length - neu} schon da.`);
}

main().catch(e => { console.error(e); process.exit(1); });
