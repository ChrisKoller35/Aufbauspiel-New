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
// Bestehende Dateien bleiben unberührt (ohne --ueberschreiben): Kommt ein
// echtes Bild (Kosten-Regel: KI-Bilder nur mit Christophs Okay, oder er
// zeichnet es selbst), den Eintrag hier löschen und das Bild ersetzen.
// Die Leihbilder sind nicht in tools/spriteRegistry.ts.
// ============================================================

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const FINAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/sprites/final');

/** Für sharp recomb: die drei Zeilen ergeben neues Rot, Grün und Blau aus R, G, B der Vorlage */
type Mischung = [[number, number, number], [number, number, number], [number, number, number]];

interface Leihbild {
  /** Vorlage in final/ (ohne .png) */
  quelle: string;
  /** Farbton drehen, in Grad */
  farbton?: number;
  /** Sättigung und Helligkeit als Faktor (1 = wie die Vorlage) */
  saettigung?: number;
  helligkeit?: number;
  /** Farbkanäle mischen, vor dem Drehen */
  mischung?: Mischung;
}

// Ergibt jede Zeile zusammen 1, bleibt Grau grau (Stahl, Silber, Glas).
// Blau wird Türkis: Grün und Blau mischen sich, Rot bleibt. Den Farbton drehen reicht bei blauen Vorlagen
// nicht: modulate dreht im LCh-Raum, um 40 Grad bleibt es blau, ab etwa 80 Grad werden helle Glanzlichter gelbgrün.
const BLAU_ZU_TUERKIS: Mischung = [[1, 0, 0], [0, 0.3, 0.7], [0, 0.4, 0.6]];
// Rot wird hell (Pfirsich): Rot steigt um den Rotüberschuss (R − G), Blau um 0,6 davon, Grün übernimmt das Rot.
// So ist der Krafttrank viel heller als der Heiltrank, auch bei Rot-Grün-Schwäche; für Orange ist
// zwischen Heiltrank (Rot) und Schnelligkeitstrank (Gold) kein Platz.
const ROT_ZU_PFIRSICH: Mischung = [[2, -1, 0], [1, 0, 0], [0.6, -0.6, 1]];

// Tränke aus dem roten Heiltrank, Kräuter aus dem grünen Kraut, Kristalle aus dem violetten Splitter;
// das Tiefsee-Set (Unterwasser-Dungeons) in Türkis aus den Bildern derselben Art
export const LEIHBILDER: Record<string, Leihbild> = {
  ITEM_POTION_STRENGTH: { quelle: 'ITEM_HEALING_POTION', mischung: ROT_ZU_PFIRSICH },
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
  ITEM_CORAL_BLADE: { quelle: 'ITEM_STEEL_SWORD', mischung: BLAU_ZU_TUERKIS },
  ITEM_DEEP_SEA_BOW: { quelle: 'ITEM_HUNTER_BOW', farbton: 60 },
  ITEM_OCEAN_MAGE_STAFF: { quelle: 'ITEM_CRYSTAL_STAFF', mischung: BLAU_ZU_TUERKIS },
  ITEM_NEPTUNE_SHIELD: { quelle: 'ITEM_STEEL_SHIELD', mischung: BLAU_ZU_TUERKIS },
  ITEM_DEEPWATER_PLATE: { quelle: 'ITEM_STEEL_ARMOR', mischung: BLAU_ZU_TUERKIS },
  ITEM_ABYSSAL_LEATHER: { quelle: 'ITEM_LEATHER_ARMOR', farbton: 60 },
  ITEM_TIDE_ROBE: { quelle: 'ITEM_BATTLE_ROBE', mischung: BLAU_ZU_TUERKIS },
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
    let bild = sharp(path.join(FINAL, `${b.quelle}.png`));
    // sharp mischt immer zuerst die Kanäle und dreht danach, egal in welcher Reihenfolge aufgerufen
    if (b.mischung) bild = bild.recomb(b.mischung);
    await bild
      .modulate({ hue: b.farbton ?? 0, saturation: b.saettigung ?? 1, brightness: b.helligkeit ?? 1 })
      .png()
      .toFile(datei);
    console.log(`  ${key} ← ${b.quelle}`);
    neu++;
  }
  console.log(`${neu} Leihbild(er) geschrieben, ${Object.keys(LEIHBILDER).length - neu} schon da.`);
}

// Nur bei direktem Aufruf färben (npm run leihbilder), nicht wenn ein Skript oder Test LEIHBILDER importiert.
// Über realpath verglichen, damit es auch unter Windows und über verknüpfte Ordner stimmt.
function direktAufgerufen(): boolean {
  try {
    return fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (direktAufgerufen()) main().catch(e => { console.error(e); process.exit(1); });
