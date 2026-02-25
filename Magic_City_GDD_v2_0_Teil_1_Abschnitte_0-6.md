# 🏰 Magic City – The Guild's Hearth  
**Game Design Document (GDD) v2.0 – Teil 1 von 3**  
**Abschnitte 0–6: Fundament, Grid, Logistik, Economy**

> **Kurzpitch:** Entschleunigtes Top‑Down‑Aufbauspiel auf einem **strikten Grid**. Du baust eine autarke magische Stadt, produzierst Proviant & Ausrüstung und schickst Trupps aus dem **Gildenhaus** in Expeditionen, die als **Auto‑Battler** simuliert werden. Expeditionen liefern seltene Materialien und vor allem **Überlebende / Spezialisten**, die neue Produktionsketten, Upgrades und Klassen freischalten.

> **Dokumentstruktur (4 Dateien):**  
> - **Teil 1** (dieses File): `Magic_City_GDD_v2_0_Teil_1_Abschnitte_0-6.md` – Abschnitte 0–6 (Tech, Grid, Logistik, Economy)  
> - **Teil 2**: `Magic_City_GDD_v2_0_Teil_2_Abschnitte_7-10.md` – Abschnitte 7–10 (Bewohner, Gebäude, Expeditionen, Datenmodelle)  
> - **Teil 3**: `Magic_City_GDD_v2_0_Teil_3_Abschnitte_11-16.md` – Abschnitte 11–16 (UI, Balancing, MVP‑Scope, Arbeitspakete)  
> - **Teil 4**: `Magic_City_GDD_v2_0_Teil_4_Fixes_und_Systeme.md` – Fixes, Sound‑System, Browser‑Stabilität & Performance (MVP‑relevant, ergänzt Teile 1–3)

---

## 0) Zweck dieses Dokuments (Scope & Lesart)

### 0.1 Tech‑Stack (für Agent/Implementierung festgelegt)
Damit ein Implementierungs‑Agent **nicht raten** muss, ist der MVP‑Stack hier fest definiert:

- **Language:** TypeScript
- **Engine/Rendering:** Phaser 3 (2D, Web)
- **Build Tool:** Vite
- **Architecture:** Simple ECS‑Style Systems + zentrale GameState‑Machine (siehe Abschnitt 2.3)
- **Data:** JSON (oder TS‑const) → Loader → Runtime‑Registry (siehe Abschnitt 10)
- **Persistenz:** LocalStorage (MVP), Save‑Versioning via `saveVersion` number

> Wenn du später auf Pixi/Canvas oder Unity wechselst, muss vor allem Abschnitt 11 (UI) und das Rendering/Camera‑Kapitel angepasst werden — die Datenmodelle bleiben fast identisch.

### 0.2 Ziel‑Plattform & Input
- **Plattform:** Desktop Web (Chrome/Firefox)
- **Input:** Maus + Tastatur (WASD/Edge‑Pan optional)
- **Performance‑Ziel:** stabil 60 FPS bei 40×36 Tiles (MVP)

### 0.3 Save‑Migration (MVP)
- Saves enthalten ein `saveVersion: number` Feld.
- Beim Laden: Wenn `saveVersion < CURRENT_VERSION` → Migrationsfunktion pro Version wird sequenziell angewendet.
- **Fehlende Felder** werden mit Schema‑Defaults gefüllt.
- **Unbekannte Felder** werden ignoriert (nicht gelöscht, falls Downgrade nötig).
- Wenn Migration fehlschlägt → UI zeigt „Save inkompatibel" + Option „Neues Spiel".

---

Dieses Dokument ist **kein Pitch**, sondern eine **arbeitsfähige Spezifikation**:
- **Was** das Spiel ist (Design & Regeln)
- **Wie** es als Systeme/States abgebildet wird (State‑Machine, Tick‑Raten, Datenmodelle)
- Werte/Numbers sind **MVP‑Startwerte** und werden später gebalanced.

---

## 1) Vision & Design‑Pillars

### 1.1 Spielgefühl
- **Relaxed Management** statt Stress: Keine plötzlichen „Game Over"-Spikes.
- **Satisfying Chains:** „Getreide → Mehl → Brot → Expedition‑Buff" muss sich wie eine Maschine anfühlen.
- **Planung > Reaktion:** Skill liegt in Layout, Upgrades und Loadouts (vor dem Run).

### 1.2 Core Fantasy
- Du führst eine kleine magische Stadt.
- Das **Gildenhaus** ist das Herz: Du rekrutierst, trainierst, rüstest aus, schickst los, wertest aus.

### 1.3 Erfolgsdefinition (nach 10+ Stunden)
- Höherer **Gilden‑Rang** (I → V) schaltet neue Routen, Klassen, Tiers frei (siehe 1.5).
- **Codex‑Progression** (Items/Gebäude/Rezepte/Events) als Sammler‑Motivation.
- **Spezialisten‑Jagd**: gezielt Runs für bestimmte Meister/Rezepte.

### 1.5 Gilden‑Rang‑System (MVP)
Der **Gilden‑Rang** ist das zentrale Progressions‑Ziel. Er steigt durch besiegte Bosse und abgeschlossene Expeditionen.

**Rang‑Tabelle (MVP):**
| Rang | Name | Bedingung (kumulativ) | Unlock |
|------|------|-----------------------|--------|
| I | Novize | Spielstart | Alle MVP‑Gebäude, Route `forest_short` |
| II | Abenteurer | 3× `forest_short` abgeschlossen | Route `forest_medium`, Schmiede‑Rezepte sichtbar |
| III | Veteran | 1× `forest_medium` Boss besiegt | Guild Hall T2 Upgrade freigeschaltet, Talisman‑Crafting |
| IV | Champion | 3× Bosse besiegt (gesamt) | Route `forest_long` (Post‑MVP Vorbereitung), +1 Proviant‑Slot |
| V | Legende | Guild Hall T2 + 5× Bosse besiegt | Route `grandmaster_trial` freigeschaltet, Endgame‑Banner „Gildenmeister", Codex‑Abschluss‑Tracking |

**Regeln:**
- Rang wird im **Gildenhaus‑UI** prominent angezeigt (Banner + Fortschrittsbalken).
- Rang‑Aufstiege lösen ein **Moment of Delight** aus: Fanfare + goldenes Banner + Unlock‑Liste.
- `guildRank` wird im SaveState gespeichert.
- Bedingungen werden gegen `stats.expeditionsCompleted`, `stats.bossesDefeated` etc. geprüft.
- Rang‑Unlock‑Check geschieht beim **Run‑Ende** (nach Loot‑Verteilung).

**Tracking‑Daten (im SaveState):**
```json
{
  "guildStats": {
    "rank": 1,
    "expeditionsCompleted": 0,
    "bossesDefeated": 0,
    "forestShortCompleted": 0,
    "forestMediumCompleted": 0
  }
}
```

### 1.4 Moments of Delight (damit das Spiel sich lebendig anfühlt)
- **Erste Produktion (z.B. Brot):** kurzer „Plopp"‑Sound + aufsteigendes Icon (`+1 🍞`) über dem Gebäude.
- **Expedition erfolgreich beendet:** Sieges‑Fanfare + Konfetti‑Partikel im Loot‑Screen.
- **Spezialist/Überlebender gefunden:** leichter Screen‑Shake, goldene Aura im UI, epischer Sound.
- **Neuer Siedler angekommen:** Banner‑Text „Ein neuer Siedler ist angekommen!" + dezenter Sound.
- **Boss besiegt:** besonderer Loot‑Screen mit Boss‑Portrait + garantierter Rare‑Drop.

> Wichtig: Agent/Implementierung soll diese Hooks als Events aus den Systemen feuern (z.B. `onFirstBreadProduced`, `onBossDefeated`), nicht „UI‑hardcoded".

---

## 2) Game Loops & Game States

### 2.1 Haupt‑Loop (Stadt)
1. Rohstoffe gewinnen → 2. veredeln → 3. Lager/Versorgung sichern  
4. Trupp ausrüsten → 5. Expedition starten → 6. Belohnung einsammeln  
7. Stadt ausbauen → repeat

### 2.2 Zweit‑Loop (Expedition)
1. Route wählen → 2. Encounter‑Deck abspielen → 3. Kämpfe/Events lösen  
4. Verletzungen/Heilung managen → 5. Loot/Überlebende → zurück

### 2.3 Global Game State Machine (Implementations‑Blueprint)
**States (High‑Level):**
- `BOOT` → `MAIN_MENU` → `LOAD_OR_NEW`
- `CITY_PLAY` (Standard)
- `BUILD_MODE` (Overlays innerhalb CITY_PLAY)
- `GUILDHOUSE_MENU` (Roster/Training/Loadout)
- `EXPEDITION_RUN` (Simulation + UI)
- `PAUSE_MENU`
- `SAVE_LOAD` (kurz, modal)
- `GAME_OVER` (nicht als Fail, nur optionaler Abspann / „Du hast gewonnen"-State)

**State‑Wechsel (Kurz):**
- `CITY_PLAY` ↔ `BUILD_MODE` (Hotkey/Button)
- `CITY_PLAY` ↔ `GUILDHOUSE_MENU` (Click auf Gildenhaus oder UI‑Button)
- `GUILDHOUSE_MENU` → `EXPEDITION_RUN` (Start Run)
- `EXPEDITION_RUN` → `CITY_PLAY` (Return, Rewards applied)

**Wichtig: Expeditionen sind NICHT blockierend.**  
Die Stadt‑Simulation (Produktion, Bau, Tages‑Tick) läuft weiter, während eine Expedition aktiv ist. Der Spieler kann zwischen `EXPEDITION_RUN` UI und `CITY_PLAY` frei wechseln. Die Expedition simuliert im Hintergrund.

### 2.4 Neues Spiel – Startzustand (MVP)
**New‑Game Defaults:**
- **Map:** 40×36 Tiles, Seed random (UI zeigt Seed an)
- **Start‑Gebäude:** 1× `WAREHOUSE` + 1× `HOUSE_T1` + 1× `GUILD_HALL` werden **automatisch** auf der Map‑Mitte platziert (Warehouse zentral, House adjacent, Guild Hall links vom Warehouse). Alle drei sind **fertig gebaut** (keine Bauzeit).  
  **Design‑Grund:** Das Gildenhaus ist das Herzstück des Spiels – der Spieler soll es von Sekunde 1 sehen, anklicken und verstehen, warum er baut. Auch ohne Gear oder Proviant kann sofort der erste Rekrut trainiert werden, was die Expedition als Ziel von Minute 1 greifbar macht. Das verlegt den emotionalen Hook des Spiels nach vorn, anstatt ihn hinter 10–15 Minuten Aufbauarbeit zu verstecken.
- **Start‑Ressourcen (globalStock):**
  - `wood`: 40, `stone`: 15, `grain`: 0, `flour`: 0, `bread`: 2, `gold`: 75
  - Alle anderen Items: 0
- **Start‑Bevölkerung:** 8 Bewohner (6 idle + 2 builder), Housing‑Cap = 4 (durch Start‑House)
  - **Hinweis:** Pop (8) > Housing‑Cap (4) ist absichtlich. Die 4 „Obdachlosen" arbeiten normal, aber es kommen keine neuen Siedler bis Housing‑Cap ≥ Pop. Kein Penalty, nur Growth‑Stopp. Das motiviert sofort weitere Häuser zu bauen.
  - **Design‑Grund:** 8 Start‑Pop erlaubt 3 Fighter + 5 Worker, was den Fighter‑Lock (GUILD_FIGHTER kann nicht arbeiten) erträglicher macht.
- **Freigeschaltet:** alle MVP‑0‑Gebäude + alle MVP‑0‑Rezepte + Routen `forest_short`, `forest_medium`, `cave_deep`
- **Tutorial (geführtes Onboarding mit Moment of Delight):**  
  Das Tutorial ist **keine reine Checkliste**, sondern eine geführte Story, die mit dem **ersten echten Erfolgserlebnis** endet.

  **Phase 1 – Stadt aufbauen (geführt, ~5–8min):**
  - Schritt‑für‑Schritt‑Hinweise (kein Zwang, nur Highlights):
    1. „Baue eine Straße zum Waldrand" → Road
    2. „Errichte eine Holzfällerhütte" → Lumber Camp
    3. „Deine Stadt braucht Stein" → Steinbruch
    4. „Getreide ist die Basis für Nahrung" → Farm
    5. **„Baue einen Brunnen in Reichweite der zukünftigen Bäckerei!"** → Well (expliziter Hinweis auf `waterSupplied`)
    6. „Mahle das Getreide zu Mehl" → Mühle
    7. „Backe dein erstes Brot" → Bäckerei
  - **Wichtig:** Brunnen muss **vor** der Bäckerei gebaut werden, da `RCP_BREAD_1` das Requirement `waterSupplied: true` hat.

  **Phase 2 – Erste Expedition (geführt, ~5min):**
  - „Das Gildenhaus steht bereits – klicke es an!" *(kein Bau nötig, direkter Hinweis auf vorhandenes Gebäude)*
  - „Trainiere deinen ersten Kämpfer – du brauchst 15 Gold, also produziere erst ein paar Waren!"
  - „Rüste ihn mit Ausrüstung aus der Schmiede aus und starte deine erste Expedition" → `forest_short`
  - **Wichtig (Tutorial-Reihenfolge):** Da das Gildenhaus schon steht, entfällt Bauschritt 8 aus Phase 1. Der Spieler merkt: Kämpfen ist immer möglich, er muss nur die Stadt soweit ausbauen, dass er sich Fighter leisten kann. Das schafft eine klare Motivationsbrücke zwischen Stadt und Expedition.

  **Phase 3 – Moment of Delight (automatisch bei erstem Expeditionserfolg):**
  - Sobald die erste Expedition erfolgreich abgeschlossen wird (Run‑Ende mit Loot):
    - **Cutscene‑Banner:** „🏰 Deine erste Gilde ist geboren!" (goldener Rahmen, Fanfare, 3s)
    - Konfetti‑Partikel + epischer Sound
    - Einblendung: „Du bist nun Gilden‑Rang I: Novize"
    - Tutorial‑Checkliste verschwindet; ab jetzt freies Spiel
  - **Design‑Grund:** Das Onboarding bekommt einen **emotionalen Abschluss** statt einfach auszufaden. Der Spieler hat seinen ersten Loop komplett erlebt (bauen → produzieren → ausrüsten → kämpfen → gewinnen) und wird mit einem „Wow"‑Moment belohnt.

  **Implementierung:**
  - Tutorial‑State: `{ phase: 1|2|3|done, currentStep: number }` im SaveRoot
  - Schritte sind **optional übersprungbar** (Button „Tutorial überspringen"), aber empfohlen
  - Phase 3 feuert als Event (`onFirstExpeditionSuccess`) und zeigt den Banner

---

## 3) Zeitmodell & Tick‑Raten (wichtig für Programmierung)

### 3.1 Grundprinzip
- **Render‑Loop:** variabel (requestAnimationFrame)
- **Simulation‑Tick:** fix (damit deterministisch & testbar)

### 3.2 Ticks (MVP‑Default)
- **City Simulation Tick:** `1.0s`  
  Dinge: Produktion, Verbrauch, Zufriedenheit, Verletzungs‑Timer.
- **Tages‑Tick (Day Tick):** `60.0s`  
  Dinge: Steuern/Gold‑Generierung, Bevölkerungswachstum‑Check (siehe 7.3).  
  **Hinweis:** „Day 12" im HUD ist nur ein Counter. Es gibt im MVP **keinen** visuellen Tag/Nacht‑Zyklus und keine gameplay-relevanten Tageszeiten.
- **Path/Worker Update Tick:** `0.25s`  
  Dinge: Wegsuche/Animation, „finde nächstes Ziel", UI‑Hover‑Updates.
- **Expedition Combat Round:** `1.0s`  
  Dinge: Attack/Heal/Cooldown‑Reduktion, Threat‑Update, Death‑Checks.

> **Determinismus:** RNG ist seeded. Gleicher Seed + gleiche Inputs = gleiche Run‑Resultate.

---

## 4) Grid‑Welt, Platzierung & Kollision

### 4.1 STRIKTES Array‑Grid
- Welt ist ein **Tile‑Array** `width x height`.
- Gebäude belegen **Footprints** (z.B. 2×3 Tiles).
- Kollision = **Tile‑Belegung** (Occupancy Grid), keine Bounding‑Box‑Physik.

### 4.2 Platzierungs‑Regeln
- Snap‑to‑Grid, Ghost‑Preview (grün/rot)
- Platzierung ist nur erlaubt, wenn:
  1. alle Footprint‑Tiles im Weltbereich liegen  
  2. keine Footprint‑Tiles belegt sind  
  3. **optionale** Regel: mindestens 1 Tile adjacency zu Straße oder „Bau‑Zone" (MVP: nur Empfehlung, kein Muss)

### 4.3 Rotation
- MVP: **keine Rotation** (reduziert Komplexität)
- Später: Rotation nur in 90°‑Schritten, Footprint wird gedreht.

### 4.4 Wege / Straßen (Connectivity statt Transport‑Simulation)
- Straßen sind ebenfalls Tiles (Typ `ROAD`).
- Gebäude können ein `roadConnectionPoints`‑Set haben (MVP: „any adjacent road tile").

**Road‑Definition (MVP):**
```json
{
  "id": "ROAD",
  "name": "Straße",
  "tier": 0,
  "category": "infrastructure",
  "footprint": [1, 1],
  "rotations": [0],
  "buildCost": { "wood": 1, "gold": 1 },
  "buildTimeSec": 0,
  "workerSlots": 0,
  "requiresConnectivity": false,
  "tags": ["road", "walkable"]
}
```

**Wichtig:** Roads werden **instant** platziert (buildTimeSec = 0), brauchen **keinen Builder**, kosten aber 1 Wood pro Tile.

### 4.5 Weltgröße, Viewport & Kamera (MVP‑Defaults)
**Welt (MVP):**
- Grid‑Size: **40 × 36 Tiles**
- Tile‑Size (Render): **32 px**
- Ursprung: (0,0) oben links
- **Weltgröße:** 40×36 = 1280×1152 px. Asymmetrisch (breiter als hoch) → passt besser in 16:9 Screens. +40% Fläche gegenüber 32×32 → genug Platz für Synergien + Straßennetz, ohne zu leer zu wirken.

**Kamera:**
- Pan: Maus an Bildschirmrand **oder** MMB‑Drag
- Zoom: Mausrad (Clamp 0.75× – 2.0×)
- Bounds: Kamera darf **nicht** außerhalb der Welt scrollen (clamp)

**Fog/Visibility:** keine (MVP)

### 4.6 Abriss‑Regeln (Demolish)
- **Dauer:** instant (MVP)
- **Rückerstattung:** 50% der `buildCost` (abgerundet) → ins globale Lager (wenn Platz; sonst verloren)
- **Zugewiesene Worker/Builder:** wechseln auf Status `IDLE`
- **Lokaler Buffer‑Inhalt:**
  - Wenn `connected` → Transfer ins globale Lager (wenn Platz)
  - Wenn nicht `connected` oder Lager voll → **verloren**
  - UI‑Warnung vor Abriss: „Buffer‑Inhalt (X Items) geht verloren!" (wenn zutreffend)
- **Bewohner aus abgerissenem HOUSE:**
  - Housing‑Cap sinkt um `housing.capacity`
  - Wenn Pop > Housing‑Cap: Bewohner arbeiten weiter normal, aber kein Bevölkerungswachstum bis Cap wieder ≥ Pop
  - Kein sofortiger Penalty (relaxed Design)
- **Roads:** Abriss kostenlos, instant, Rückerstattung = 0
- **Letztes WAREHOUSE:** Abriss **nicht erlaubt** (UI: „Mindestens ein Lagerhaus benötigt")

---

## 5) Logistik (MVP: „Logistik light")

### 5.1 Items werden NICHT physisch getragen (MVP)
- Es gibt ein **globales Lager** (`GlobalStockpile`) stadtweit. Lagerhäuser erhöhen Kapazität.
- Gebäude produzieren/verbrauchern Items über **Input/Output‑Regeln**.

### 5.2 Connectivity‑Regel
Ein Gebäude gilt als **connected**, wenn es über **Straßen‑Tiles** einen Pfad zu **mindestens einem Lagerhaus** hat.

**Regeln (MVP‑exakt):**
- **Walkable Tiles:** ausschließlich `ROAD` (plus *Access‑Tiles* direkt am Gebäude).
- **Nachbarschaft:** nur **4‑Way** (kein diagonal).
- **Access‑Tiles:** alle *ROAD‑Tiles*, die orthogonal an den Gebäude‑Footprint angrenzen.
- **Mehrere Lagerhäuser:** Pfad zu **irgendeinem** Lagerhaus reicht.
- **Rebuild‑Trigger:** Connectivity wird neu berechnet bei
  - Platzieren/Entfernen von `ROAD`
  - Platzieren/Entfernen von `WAREHOUSE`
  - Platzieren/Entfernen eines Gebäudes

**Effekte:**
- Connected: Produktion legt Output direkt ins **globale Lager**.
- Not connected: Output geht in **lokalen Output‑Buffer** des Gebäudes. Wenn der Buffer voll ist, **pausiert** die Produktion.  
  UI muss deutlich zeigen: „Kein Lageranschluss" + „Output voll (lokal)".

**Referenz‑Pseudocode (BFS):**
```ts
function isConnected(building): boolean {
  const start = accessRoadTiles(building); // adjacent ROAD tiles
  const q = [...start];
  const seen = new Set(start.map(tileKey));
  while (q.length) {
    const t = q.shift()!;
    if (isWarehouseTile(t)) return true;
    for (const n of neighbors4(t)) {
      const k = tileKey(n);
      if (!seen.has(k) && isRoadTile(n)) { seen.add(k); q.push(n); }
    }
  }
  return false;
}
```

### 5.3 Lokale Buffer (MVP‑Default)
- Jedes Gebäude kann optional eine lokale **Input‑** und **Output‑Pufferung** haben:
  - `storage.localInputBuffer` (z.B. 10)
  - `storage.localOutputBuffer` (z.B. 10)
- **Producer** schreiben fertige Waren zuerst in `localOutputBuffer`.  
- **Consumer** ziehen Zutaten zuerst aus `localInputBuffer`; wenn leer, dürfen sie (MVP) **direkt** aus dem globalen Lager ziehen – aber nur wenn `requiresConnectivity=true` und `connected=true`.
- Overflow‑Regel (MVP): Ist `localOutputBuffer` voll, pausiert der Producer.

---

## 6) Economy: Ressourcen, Gold, Engpässe

### 6.1 Drei Soft‑Limiter
1. **Arbeitskraft** (freie Bewohner)
2. **Platz** (Grid & Layout)
3. **Lagerkapazität** (Overflow‑Risiko)

### 6.2 Gold: Quellen & Sinks
**Gold‑Quellen (MVP):**
- **Steuern aus Wohnhäusern** über den **Tages‑Tick (alle 60s)**.  
  Steuerhöhe pro Tages‑Tick = `baseTaxPerMin * satisfactionMultiplier`.  
  `satisfactionMultiplier = satisfaction / 100` (bei Satisfaction 70 → Multiplier 0.7).  
  **Balancing‑Hinweis:** `baseTaxPerMin = 2` (pro Wohnhaus). Bei 3 Häusern + Satisfaction 70 = 4.2 Gold/Tages‑Tick. Das deckt Gear‑Wartung + Training langfristig, aber nicht sofort – Expeditions‑Gold bleibt essenziell.
- **Expedition‑Loot:** Gold ist als Item in den LootTables enthalten (siehe Teil 2, 10.7).

**Gold‑Sinks (MVP):**
- Upgrades (Tier 2/3)
- Training neuer Klassen (Gildenhaus, siehe Teil 2, 7.4)
- **Gear‑Kauf** (Schmied‑Rezepte kosten Materialien; Gold wird für Upgrades gebraucht)
- **Road‑Bau:** jede Road kostet `{ wood: 1, gold: 1 }` (verhindert Gold‑Inflation bei großen Straßennetzen)
- **Gear‑Wartung:** nach jeder Expedition werden **5 Gold pro ausgerüstetem Gear‑Item** fällig (Reparaturkosten). Wenn nicht bezahlt → Gear verliert temporär 50% Bonus bis Reparatur bezahlt wird. UI zeigt „⚠️ Reparatur nötig" am Gear‑Item.

**Gold‑Quellen (Post‑MVP):**
- Gasthof konvertiert Proviant in Gold
- Marktplatz: limitierte Deals
- Händler‑Encounter im Run

### 6.3 Zufriedenheit (Satisfaction)
Zufriedenheit wird **pro Wohnhaus** berechnet: `0–100`.

**Distanz‑Regel:**
- Distanz = **Manhattan‑Distanz** (Tile‑Schritte, 4‑Way)
- Ein Gebäude „wirkt", wenn `dist <= radiusTiles`

**Basisformel (MVP):**
```
base = 50
food = (globalStock.bread > 0) ? +10 : -20
water = (hasWellInRadius) ? +10 : -10
comfort = sum(activeComfortBonusesInRadius) // capped at +25
overcrowd = -10 * max(0, residents - capacity)
infra = (connectedToWarehouse) ? +0 : -10

satisfaction = clamp(0, 100, base + food + water + comfort + overcrowd + infra)
```

**Komfort‑Bonuses (MVP‑Start):**
- `WELL` (Brunnen): Radius **6**, Bonus `water=true` (siehe oben)
- `INN` (Gasthof, post‑MVP): Radius **5**, `+15` (max 1 zählt)
- `BATHHOUSE` (Badehaus, post‑MVP): Radius **5**, `+10` (max 1 zählt)

**Hinweis:** Komfort‑Bonuses sind **gecappt** (max +25), damit Satisfaction nicht trivial 100 wird.

**MVP‑Realität:** Im MVP erreicht man realistisch **50–70 Satisfaction** (base + food + water). Komfort‑Gebäude (Post‑MVP) geben dann den Hebel für 80–100.

Satisfaction beeinflusst:
- **Steuer‑Multiplier** (siehe 6.2)
- **Bevölkerungswachstum** (siehe Teil 2, 7.3)

### 6.4 Wasser‑Versorgung
Ein Gebäude gilt als `waterSupplied=true`, wenn **mindestens ein** Wasser‑Radius es abdeckt.

**MVP‑Quelle:** `WELL` mit `radiusEffect: { "type": "water", "radiusTiles": N }`.

**Distanz‑Messung (exakt):**
- Nutze Manhattan‑Distanz zwischen dem **nächstgelegenen Tile** der beiden Footprints.
- Formal: Für alle Tiles `a` in Building‑Footprint und alle Tiles `b` im WELL‑Footprint:  
  `dist = min(|ax-bx| + |ay-by|)`  
  `waterSupplied = (dist <= radiusTiles)`

---

## 6.5 Art‑Style & Visuelle Identität (MVP)

### 6.5.1 Grafik‑Stil: AI‑generierte Pixel‑Art Sprites (Pre‑Built Assets)

> **Kernentscheidung:** Alle Sprites werden **vorab als PNG‑Dateien** generiert (via Google AI Studio API, Modell `gemini-2.5-flash-image`). Die fertigen Sprites liegen im Ordner `public/assets/sprites/final/` und werden in der Phaser 3 `BootScene` per `this.load.image()` geladen. **Keine Code‑Generierung zur Laufzeit, kein SpriteFactory.ts nötig.**

- **Tile‑Size:** 32×32 px Basis (passt zu Grid aus 4.5)
- **Perspektive:** Top‑Down mit leichter ¾‑Andeutung (SNES/GBA RPG‑Stil)
- **Farbpalette:** 12–24 Farben pro Sprite (limitierte Palette für Pixel‑Art‑Konsistenz)
- **Hintergrund:** Alle Sprites werden mit schwarzem Hintergrund generiert (transparent nach Bedarf via Alpha‑Keying)

**Rendering‑Pipeline (für den Implementierungs‑Agent):**
1. In der `BootScene` bzw. `PreloadScene`: Alle Sprites per `this.load.image(key, path)` laden
2. Sprite‑Keys entsprechen den Dateinamen (z.B. `FARM_GRAIN`, `HERO_GUARDIAN`)
3. Zur Laufzeit: Standard‑Phaser‑Sprites aus dem Texture‑Cache rendern
4. **Kein** `SpriteFactory.ts` nötig – **keine** `Graphics.generateTexture()`‑Aufrufe

**Lade‑Code (BootScene):**
```ts
// src/scenes/BootScene.ts – preload()
// Gebäude
const buildings = [
  'FARM_GRAIN', 'MILL_WIND', 'BAKERY', 'LUMBER_CAMP', 'QUARRY',
  'WAREHOUSE', 'HOUSE_T1', 'GUILD_HALL', 'WELL', 'HERB_GARDEN',
  'SMITHY', 'IRON_MINE', 'ROAD'
];
buildings.forEach(key => {
  this.load.image(key, `assets/sprites/final/${key}.png`);
});

// Helden
['HERO_GUARDIAN', 'HERO_RANGER', 'HERO_CLERIC'].forEach(key => {
  this.load.image(key, `assets/sprites/final/${key}.png`);
});

// Bosse
['BOSS_ELDER_TREANT', 'BOSS_BANDIT_CHIEF', 'BOSS_CRYSTAL_GOLEM', 'BOSS_SWAMP_HYDRA'].forEach(key => {
  this.load.image(key, `assets/sprites/final/${key}.png`);
});

// Gegner (Forest, Cave, Swamp)
const enemies = [
  'ENEMY_FOREST_WOLF', 'ENEMY_BANDIT_RAIDER', 'ENEMY_CAVE_SLIME',
  'ENEMY_THORN_SPRITE', 'ENEMY_FUNGAL_CREEPER', 'ENEMY_SHADOW_BAT',
  'ENEMY_MOSS_GOLEM', 'ENEMY_VENOMFANG_SPIDER', 'ENEMY_GOBLIN_SCOUT',
  'ENEMY_WILD_BOAR', 'ENEMY_HOLLOW_SHADE', 'ENEMY_BRAMBLE_BEAR',
  'ENEMY_CURSED_WISP', 'ENEMY_CRYSTAL_BEETLE', 'ENEMY_DEEP_CRAWLER',
  'ENEMY_MINE_SPECTER', 'ENEMY_STALACTITE_BAT', 'ENEMY_MAGMA_SLUG',
  'ENEMY_BOG_WITCH', 'ENEMY_SWAMP_TROLL', 'ENEMY_LEECH_SWARM',
  'ENEMY_MIRE_PHANTOM', 'ENEMY_TOXIC_TOAD', 'ENEMY_ROT_WALKER'
];
enemies.forEach(key => {
  this.load.image(key, `assets/sprites/final/${key}.png`);
});

// Items
['ITEM_BREAD', 'ITEM_HEALING_POTION', 'ITEM_IRON_SWORD',
 'ITEM_IRON_SHIELD', 'ITEM_LEATHER_ARMOR', 'ITEM_CRYSTAL_SHARD'].forEach(key => {
  this.load.image(key, `assets/sprites/final/${key}.png`);
});
```

**Sprite‑Inventar (50 Stück, alle als fertige PNG vorhanden):**

| Kategorie | Key | Beschreibung | Finale Größe |
|-----------|-----|-------------|-------------|
| Gebäude | `FARM_GRAIN` | Getreide‑Farm mit Weizenfeldern, Holzzaun | 96×96 |
| Gebäude | `MILL_WIND` | Steinerne Windmühle mit 4 Flügeln | 96×64 |
| Gebäude | `BAKERY` | Bäckerei mit Ofen‑Glühen, Schornstein | 64×64 |
| Gebäude | `LUMBER_CAMP` | Holzfäller‑Lager mit Blockhütte, Axt | 64×64 |
| Gebäude | `QUARRY` | Steinbruch mit Lore, Spitzhacke | 96×64 |
| Gebäude | `WAREHOUSE` | Großes Lagerhaus mit Kisten & Fässer | 128×96 |
| Gebäude | `HOUSE_T1` | Mittelalterliches Wohnhaus, Reetdach | 64×64 |
| Gebäude | `GUILD_HALL` | Imposante Gildenhalle mit Banner & Wappen | 128×128 |
| Gebäude | `WELL` | Steinbrunnen mit magisch leuchtendem Wasser | 64×64 |
| Gebäude | `HERB_GARDEN` | Kräutergarten mit bunten Pflanzen | 64×96 |
| Gebäude | `SMITHY` | Schmiede mit Amboss, Feuerglut | 96×64 |
| Gebäude | `IRON_MINE` | Eisenmine‑Eingang im Fels | 96×96 |
| Terrain | `ROAD` | Kopfsteinpflaster‑Tile | 32×32 |
| Held | `HERO_GUARDIAN` | Ritter/Tank, Plattenrüstung, blauer Schild | 32×32 |
| Held | `HERO_RANGER` | Waldläufer, grüner Umhang, Bogen | 32×32 |
| Held | `HERO_CLERIC` | Kleriker/Heiler, weiße Robe, Stab | 32×32 |
| Boss | `BOSS_ELDER_TREANT` | Uralte Baumkreatur | 64×64 |
| Boss | `BOSS_BANDIT_CHIEF` | Banditen‑Anführer mit Doppeldolchen | 64×64 |
| Boss | `BOSS_CRYSTAL_GOLEM` | Kristallgolem mit lila Kern | 64×64 |
| Boss | `BOSS_SWAMP_HYDRA` | Dreiköpfige Sumpfhydra | 64×64 |
| Gegner | `ENEMY_FOREST_WOLF` | Grauer Wolf | 32×32 |
| Gegner | `ENEMY_BANDIT_RAIDER` | Bandit mit Dolch | 32×32 |
| Gegner | `ENEMY_CAVE_SLIME` | Grüner Schleim | 32×32 |
| Gegner | `ENEMY_THORN_SPRITE` | Dornen‑Feen‑Wesen | 28×28 |
| Gegner | `ENEMY_FUNGAL_CREEPER` | Pilzkopf‑Kreatur | 32×32 |
| Gegner | `ENEMY_SHADOW_BAT` | Dunkle Fledermaus | 28×28 |
| Gegner | `ENEMY_MOSS_GOLEM` | Moos‑Felsgolem | 36×36 |
| Gegner | `ENEMY_VENOMFANG_SPIDER` | Giftspinne | 32×32 |
| Gegner | `ENEMY_GOBLIN_SCOUT` | Goblin‑Späher | 28×28 |
| Gegner | `ENEMY_WILD_BOAR` | Wildschwein | 32×32 |
| Gegner | `ENEMY_HOLLOW_SHADE` | Geisterhafter Schatten | 32×32 |
| Gegner | `ENEMY_BRAMBLE_BEAR` | Dornenbär | 36×36 |
| Gegner | `ENEMY_CURSED_WISP` | Verfluchtes Irrlicht | 28×28 |
| Gegner | `ENEMY_CRYSTAL_BEETLE` | Kristallkäfer | 32×32 |
| Gegner | `ENEMY_DEEP_CRAWLER` | Höhlen‑Tausendfüßler | 32×32 |
| Gegner | `ENEMY_MINE_SPECTER` | Geist eines Bergmanns | 32×32 |
| Gegner | `ENEMY_STALACTITE_BAT` | Steinige Fledermaus | 28×28 |
| Gegner | `ENEMY_MAGMA_SLUG` | Lava‑Schnecke | 36×36 |
| Gegner | `ENEMY_BOG_WITCH` | Sumpfhexe | 32×32 |
| Gegner | `ENEMY_SWAMP_TROLL` | Sumpftroll | 36×36 |
| Gegner | `ENEMY_LEECH_SWARM` | Blutegel‑Schwarm | 28×28 |
| Gegner | `ENEMY_MIRE_PHANTOM` | Sumpfgeist | 32×32 |
| Gegner | `ENEMY_TOXIC_TOAD` | Giftkröte | 32×32 |
| Gegner | `ENEMY_ROT_WALKER` | Sumpf‑Zombie | 32×32 |
| Item | `ITEM_BREAD` | Brotlaib | 16×16 |
| Item | `ITEM_HEALING_POTION` | Heiltrank (rote Flasche) | 16×16 |
| Item | `ITEM_IRON_SWORD` | Eisenschwert | 16×16 |
| Item | `ITEM_IRON_SHIELD` | Eisenschild | 16×16 |
| Item | `ITEM_LEATHER_ARMOR` | Lederrüstung | 16×16 |
| Item | `ITEM_CRYSTAL_SHARD` | Kristallsplitter (lila, magisch) | 16×16 |

**Stil‑Beschreibung (für Konsistenz‑Referenz):**
- Alle Sprites im klassischen **SNES/GBA Pixel‑Art‑Stil**, ¾ Top‑Down‑Perspektive
- Warme erdige Farbpalette mit magischen Akzenten (Kristall‑Lila, Heiler‑Gold)
- Gebäude: detaillierte medieval‑fantasy Strukturen mit erkennbaren Funktionen
- Helden: Chibi‑Proportionen, klassentypische Silhouetten (Tank breit, Ranger schlank)
- Gegner: biom‑spezifische Farbpaletten (Wald=Grün/Braun, Höhle=Grau/Lila, Sumpf=Dunkelgrün/Braun)
- Bosse: doppelte Größe, mehr Detail (24 Farben), imposante Präsenz
- Items: klare Icon‑Silhouetten, sofort erkennbar

**UI‑Rendering (weiterhin Code‑gezeichnet):**
- **Panels:** `fillRect` mit `PANEL_BG` (0x3E2723) + 2px `lineStyle` mit `PANEL_BORDER` (0xFFD54F)
- **Buttons:** `fillRoundedRect` + Hover‑Tint (hellere Variante)
- **HP‑Bars:** Grüner `fillRect` über rotem Hintergrund, proportional zu HP%
- **Tooltips:** Semi‑transparentes Panel (`alpha: 0.9`) + Phaser `Text` Objekt

**UI‑Farb‑Referenz (für Code‑gezeichnete UI‑Elemente):**
```ts
export const UI_COLORS = {
  PANEL_BG:     0x3E2723,
  PANEL_BORDER: 0xFFD54F,
  TEXT_LIGHT:   0xFAFAFA,
  TEXT_DIM:     0xBDBDBD,
  GOLD_MID:     0xFFC107,
  DAMAGE_RED:   0xEF5350,
  HEAL_GREEN:   0x66BB6A,
} as const;
```

**Vorteile des AI‑Sprite‑Ansatzes:**
1. **Professionelle Optik** – echte Pixel‑Art statt geometrischer fillRect‑Formen
2. **Asset‑Ordner statt Code** – Sprites sind PNG‑Dateien, kein fehleranfälliger Zeichencode
3. **Einfach austauschbar** – einzelne PNGs jederzeit durch bessere Versionen ersetzbar
4. **Konsistenter Stil** – alle Sprites mit gleichem AI‑Prompt‑Stil generiert
5. **Standard‑Phaser‑Workflow** – `this.load.image()` ist der offizielle, bestdokumentierte Weg
6. **Kein Lizenz‑Risiko** – alle Sprites via eigener API generiert

**Performance:** Alle 50 Sprites werden in der `PreloadScene` geladen (~2 MB total, <1s). Phaser cached sie automatisch im Texture‑Manager.

**Referenz‑Ästhetik:** Der Stil erinnert an klassische **SNES RPGs** (Final Fantasy, Secret of Mana) und **GBA‑Taktikspiele** (Fire Emblem, Golden Sun), kombiniert mit der Wärme von ¾‑Top‑Down‑Aufbauspielen wie Stardew Valley.

### 6.5.2 Animationen (MVP‑Pflicht)
| Element | Animation | Dauer |
|---------|-----------|-------|
| **Getreidefarm** | Getreide wiegt im Wind (2‑Frame Loop) | 1.5s |
| **Windmühle** | Flügel drehen sich (4‑Frame Loop) | 2s |
| **Bäckerei** | Rauch aus Schornstein (3‑Frame Partikel) | 2s |
| **Schmiede** | Funken + Glühen am Amboss (3‑Frame) | 1.5s |
| **Brunnen** | Wasser‑Glitzern (2‑Frame) | 1s |
| **Produktion fertig** | `+1 Icon` steigt auf + „Plopp" Sound | 0.5s |
| **Gebäude platziert** | Staubwolke + Hammer‑Sound | 0.3s |
| **Siedler ankommt** | Figur läuft von Kartenrand zum Haus | 2s |
| **Expedition‑Kampf** | Hit‑Flash (weiß, 0.1s) + Schadenszahl + Shake | 0.3s |
| **Heilung** | Grünes Glühen + aufsteigende „+HP" Zahl | 0.4s |
| **Boss‑Intro** | Zoom auf Boss‑Sprite + kurzer Shake + Name‑Banner | 1.5s |
| **Boss besiegt** | Explosion‑Partikel + Loot‑Rain‑Animation | 2s |
| **Rang‑Aufstieg** | Goldener Blitz + Banner‑Einblendung | 2s |

### 6.5.3 Sound‑Design (MVP‑Mindest)
- **Hintergrund:** Ruhige ambient‑Melodie (Lauten/Flöte), loopt sanft
- **Build:** Hammer‑Klick, Holz‑Creak
- **Produktion:** Plopp (Brot), Clang (Schmiede), Rauschen (Mühle)
- **Expedition‑Start:** Trompeten‑Fanfare (kurz)
- **Kampf:** Schwert‑Klirren, Pfeil‑Swoosh, Heal‑Chime
- **Boss:** tiefes Dröhnen bei Intro, Sieges‑Fanfare bei Kill
- **UI:** dezente Klick‑Sounds, Münz‑Klirren bei Gold‑Änderung

---

**→ Weiter in Teil 2: `Magic_City_GDD_v2_0_Teil_2_Abschnitte_7-10.md` (Bewohner, Gebäude, Expeditionen, Datenmodelle)**