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

import { LOOT_TABLE_DEFS } from "../src/data/lootTables.js";
import { ITEM_DEFS } from "../src/data/items.js";
import { ROUTE_DEFS, findBauplanRoute } from "../src/data/routes.js";
import { ENEMY_DEFS } from "../src/data/enemies.js";
import { BUILDING_DEFS } from "../src/data/buildings.js";
import { BAUPLAN_BOSS, BAUPLAN_PREISE } from "../src/data/haendler.js";

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

// ─── Check 4: Baupläne ───────────────────────────────────────
// Jeder von einem Gebäude benötigte Bauplan (freischaltung.bauplan) muss als
// Item mit Tag 'bauplan' existieren, auf das Gebäude zeigen und erreichbar sein:
// beim Händler (BAUPLAN_PREISE, data/haendler.ts) oder von einem Boss
// (BAUPLAN_BOSS). Ein Boss-Bauplan kommt in genau einer Beutetabelle als
// ersterSiegBauplan vor, und diese Tabelle gehört zu einem Boss, der in einer
// Route tatsächlich auftaucht. Ein reiner Händler-Bauplan hat keine Beutetabelle.

function checkBauplan(buildingId: string, bauplan: string, errors: ValidationError[]): void {
  const source = `Gebäude '${buildingId}'`;
  const item = ITEM_DEFS[bauplan];
  if (!item) {
    errors.push({ source, message: `Bauplan '${bauplan}' nicht in items.ts!` });
    return;
  }
  if (!item.tags.includes("bauplan")) {
    errors.push({ source, message: `Item '${bauplan}' hat kein Tag 'bauplan'!` });
  }
  if (item.bauplanFuer !== buildingId) {
    errors.push({ source, message: `Item '${bauplan}' zeigt auf '${item.bauplanFuer}' statt '${buildingId}'!` });
  }

  const tables = Object.values(LOOT_TABLE_DEFS).filter(t => t.ersterSiegBauplan === bauplan);
  const beimHaendler = bauplan in BAUPLAN_PREISE;
  const vomBoss = bauplan in BAUPLAN_BOSS;
  if (!beimHaendler && !vomBoss) {
    errors.push({ source, message: `Bauplan '${bauplan}' ist weder beim Händler (BAUPLAN_PREISE) noch bei einem Boss (BAUPLAN_BOSS) – nicht erreichbar!` });
  }
  if (vomBoss && tables.length !== 1) {
    errors.push({ source, message: `Boss-Bauplan '${bauplan}' kommt in ${tables.length} Beutetabellen vor (erwartet: genau 1)!` });
    return;
  }
  if (!vomBoss && tables.length > 0) {
    errors.push({ source, message: `Händler-Bauplan '${bauplan}' steht in ${tables.map(t => t.id).join(", ")} als ersterSiegBauplan, fehlt aber in BAUPLAN_BOSS!` });
  }
  if (vomBoss && !findBauplanRoute(bauplan)) {
    errors.push({ source, message: `Bauplan '${bauplan}' (${tables[0].id}) gehört zu keinem Routen-Boss – nicht erreichbar!` });
  }
}

function checkBauplaene(): { errors: ValidationError[]; checkedCount: number } {
  const errors: ValidationError[] = [];
  let checkedCount = 0;
  const bauplaene = new Set<string>();

  for (const [buildingId, building] of Object.entries(BUILDING_DEFS)) {
    const bauplan = building.freischaltung?.bauplan;
    if (!bauplan) continue;
    checkedCount++;
    bauplaene.add(bauplan);
    checkBauplan(buildingId, bauplan, errors);
  }

  // Der Händler und die Bosse führen nur Baupläne, die ein Gebäude braucht
  for (const [liste, ids] of [["BAUPLAN_PREISE", Object.keys(BAUPLAN_PREISE)], ["BAUPLAN_BOSS", Object.keys(BAUPLAN_BOSS)]] as const) {
    for (const id of ids) {
      checkedCount++;
      if (!bauplaene.has(id)) errors.push({ source: liste, message: `Bauplan '${id}' braucht kein Gebäude (freischaltung.bauplan)!` });
    }
  }

  // Umgekehrt: jede ersterSiegBauplan-Referenz muss ein Bauplan-Item sein
  for (const [tableId, table] of Object.entries(LOOT_TABLE_DEFS)) {
    if (!table.ersterSiegBauplan) continue;
    checkedCount++;
    if (!ITEM_DEFS[table.ersterSiegBauplan]?.tags.includes("bauplan")) {
      errors.push({
        source: `LootTable '${tableId}'`,
        message: `ersterSiegBauplan '${table.ersterSiegBauplan}' ist kein Bauplan-Item!`,
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
  const check4 = checkBauplaene();

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
    console.log("\nCheck 4: Baupläne (Gebäude ↔ Beutetabellen)");
    printErrors("Fehler", check4.errors);
  }

  // Zusammenfassung
  console.log("\n" + "=".repeat(60));

  if (allErrors.length > 0) {
    console.log(
      `FEHLER: ${allErrors.length} ungueltige Referenz(en) gefunden` +
      ` (${check1.checkedCount} Items, ${check2.checkedCount} Enemies/find-Items, ${check3.checkedCount} LootTables geprueft)`
    );
    console.log("Bitte Datei-Referenzen pruefen (items.ts / enemies.ts / lootTables.ts).");
    process.exit(1);
  } else {
    console.log(
      `✓ Alle Referenzen valide` +
      ` (${check1.checkedCount} LootTable-Eintraege, ${check2.checkedCount} Route-Enemies/Items, ${check3.checkedCount} Enemy-LootTables, ${check4.checkedCount} Bauplan-Refs geprueft)`
    );
    process.exit(0);
  }
}

main();
