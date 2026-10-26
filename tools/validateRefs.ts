// ============================================================
// Magic City – Reference Validator
// ============================================================
// Prüft zur Build-Zeit ob alle Item-IDs, Enemy-IDs und
// LootTable-IDs korrekt referenziert werden.
//
// Nutzung:
//   npm run validate-refs
//
// Exit-Code:
//   0 → Alles valide
//   1 → Fehler gefunden
// ============================================================

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { LOOT_TABLE_DEFS } from "../src/data/lootTables.js";
import { ITEM_DEFS, getItemSpriteKey } from "../src/data/items.js";
import { ROUTE_DEFS } from "../src/data/routes.js";
import { ENEMY_DEFS } from "../src/data/enemies.js";

// ─── Typen ────────────────────────────────────────────────────

interface ValidationError {
  source: string;
  message: string;
}

// ─── Check 1: LootTable Item-IDs ─────────────────────────────
// Prüft ob alle itemIds in LOOT_TABLE_DEFS.entries in ITEM_DEFS existieren

function checkLootTableItems(): { errors: ValidationError[]; checkedCount: number } {
  const errors: ValidationError[] = [];
  let checkedCount = 0;

  for (const [tableId, table] of Object.entries(LOOT_TABLE_DEFS)) {
    for (const entry of table.entries) {
      checkedCount++;
      if (!(entry.itemId in ITEM_DEFS)) {
        errors.push({
          source: `LootTable '${tableId}'`,
          message: `Item '${entry.itemId}' nicht in items.ts!`,
        });
      }
    }
  }

  return { errors, checkedCount };
}

// ─── Check 2: Route Enemy-IDs ────────────────────────────────
// Prüft ob alle enemy-IDs in ROUTE_DEFS.encounters und bossId in ENEMY_DEFS existieren

function checkRouteEnemies(): { errors: ValidationError[]; checkedCount: number } {
  const errors: ValidationError[] = [];
  let checkedCount = 0;
  const checked = new Set<string>(); // Duplikate nur einmal zählen

  for (const [routeId, route] of Object.entries(ROUTE_DEFS)) {
    // encounters[].enemies[]
    for (const encounter of route.encounters) {
      if (encounter.enemies) {
        for (const enemyId of encounter.enemies) {
          checkedCount++;
          if (!(enemyId in ENEMY_DEFS)) {
            errors.push({
              source: `Route '${routeId}'`,
              message: `Enemy '${enemyId}' nicht in enemies.ts!`,
            });
          }
        }
      }

      // find encounters: findItems[].itemId
      if (encounter.findItems) {
        for (const findItem of encounter.findItems) {
          checkedCount++;
          if (!(findItem.itemId in ITEM_DEFS)) {
            errors.push({
              source: `Route '${routeId}' (find-Encounter)`,
              message: `Item '${findItem.itemId}' nicht in items.ts!`,
            });
          }
        }
      }
    }

    // bossId
    if (route.bossId !== null) {
      checkedCount++;
      if (!(route.bossId in ENEMY_DEFS)) {
        errors.push({
          source: `Route '${routeId}'`,
          message: `Boss '${route.bossId}' nicht in enemies.ts!`,
        });
      }
    }
  }

  return { errors, checkedCount };
}

// ─── Check 3: Enemy LootTable-IDs ────────────────────────────
// Prüft ob alle lootTableIds in ENEMY_DEFS in LOOT_TABLE_DEFS existieren

function checkEnemyLootTables(): { errors: ValidationError[]; checkedCount: number } {
  const errors: ValidationError[] = [];
  let checkedCount = 0;

  for (const [enemyId, enemy] of Object.entries(ENEMY_DEFS)) {
    checkedCount++;
    if (!(enemy.lootTableId in LOOT_TABLE_DEFS)) {
      errors.push({
        source: `Enemy '${enemyId}'`,
        message: `LootTable '${enemy.lootTableId}' nicht definiert!`,
      });
    }
  }

  return { errors, checkedCount };
}

// ─── Check 4: Bilder der Gegenstände ─────────────────────────
// Prüft ob es zu jedem Gegenstand das Bild gibt (getItemSpriteKey → public/assets/sprites/final/KEY.png).
// Fehlt es, fällt das nirgends auf: Die Truhe zeigt die Karte ohne Bild (onerror blendet es aus), im Kampf
// sehen Tränke ohne Bild gleich aus. Ein Leihbild ohne KI und ohne Kosten macht tools/leihbilder.ts.

function checkItemSprites(): { errors: ValidationError[]; checkedCount: number } {
  const errors: ValidationError[] = [];
  let checkedCount = 0;
  const final = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/assets/sprites/final");

  for (const itemId of Object.keys(ITEM_DEFS)) {
    checkedCount++;
    const key = getItemSpriteKey(itemId);
    if (!fs.existsSync(path.join(final, `${key}.png`))) {
      errors.push({
        source: `Item '${itemId}'`,
        message: `Bild '${key}.png' fehlt in public/assets/sprites/final/ (Leihbild: tools/leihbilder.ts)`,
      });
    }
  }

  return { errors, checkedCount };
}

// ─── Ausgabe ──────────────────────────────────────────────────

function printErrors(label: string, errors: ValidationError[]) {
  if (errors.length === 0) return;

  console.log(`\n  ${label}:`);
  for (const err of errors) {
    console.log(`  [FEHLER] ${err.source}: ${err.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────

function main() {
  console.log("Magic City – Referenz-Validator");
  console.log("=".repeat(60));

  const check1 = checkLootTableItems();
  const check2 = checkRouteEnemies();
  const check3 = checkEnemyLootTables();
  const check4 = checkItemSprites();

  const allErrors = [
    ...check1.errors,
    ...check2.errors,
    ...check3.errors,
    ...check4.errors,
  ];

  const totalChecked =
    check1.checkedCount + check2.checkedCount + check3.checkedCount + check4.checkedCount;

  // Fehler ausgeben
  if (check1.errors.length > 0) {
    console.log("\nCheck 1: LootTable Item-IDs");
    printErrors("Fehler", check1.errors);
  }

  if (check2.errors.length > 0) {
    console.log("\nCheck 2: Route Enemy-IDs und find-Items");
    printErrors("Fehler", check2.errors);
  }

  if (check3.errors.length > 0) {
    console.log("\nCheck 3: Enemy LootTable-IDs");
    printErrors("Fehler", check3.errors);
  }

  if (check4.errors.length > 0) {
    console.log("\nCheck 4: Bilder der Gegenstände");
    printErrors("Fehler", check4.errors);
  }

  // Zusammenfassung
  console.log("\n" + "=".repeat(60));

  if (allErrors.length > 0) {
    console.log(
      `FEHLER: ${allErrors.length} ungueltige Referenz(en) gefunden` +
      ` (${check1.checkedCount} Items, ${check2.checkedCount} Enemies/find-Items, ${check3.checkedCount} LootTables,` +
      ` ${check4.checkedCount} Item-Bilder geprueft)`
    );
    console.log("Bitte Datei-Referenzen pruefen (items.ts / enemies.ts / lootTables.ts / sprites/final).");
    process.exit(1);
  } else {
    console.log(
      `✓ Alle Referenzen valide` +
      ` (${check1.checkedCount} LootTable-Eintraege, ${check2.checkedCount} Route-Enemies/Items, ${check3.checkedCount} Enemy-LootTables,` +
      ` ${check4.checkedCount} Item-Bilder geprueft)`
    );
    process.exit(0);
  }
}

main();
