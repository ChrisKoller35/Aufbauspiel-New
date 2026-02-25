# 🏰 Magic City – The Guild's Hearth  
**Game Design Document (GDD) v2.0 – Teil 2 von 3**  
**Abschnitte 7–10: Bewohner, Gebäude, Expeditionen, Datenmodelle**

> **Dokumentstruktur (4 Dateien):**  
> - **Teil 1**: `Magic_City_GDD_v2_0_Teil_1_Abschnitte_0-6.md` – Abschnitte 0–6 (Tech, Grid, Logistik, Economy)  
> - **Teil 2** (dieses File): `Magic_City_GDD_v2_0_Teil_2_Abschnitte_7-10.md` – Abschnitte 7–10 (Bewohner, Gebäude, Expeditionen, Datenmodelle)  
> - **Teil 3**: `Magic_City_GDD_v2_0_Teil_3_Abschnitte_11-16.md` – Abschnitte 11–16 (UI, Balancing, MVP‑Scope, Arbeitspakete)  
> - **Teil 4**: `Magic_City_GDD_v2_0_Teil_4_Fixes_und_Systeme.md` – Fixes, Sound‑System, Browser‑Stabilität & Performance (MVP‑relevant, ergänzt Teile 1–3)

---

## 7) Bewohner, Jobs & Workforce‑Regeln

### 7.1 Bewohner‑Typen
- **Bürger**: Workforce für Bau/Produktion
- **Rekruten**: können im Gildenhaus zu Kämpfern ausgebildet werden
- **Spezialisten**: schalten Rezepte/Tiers/Perks frei

### 7.2 Workforce‑Regeln (MVP)
- Jeder Bürger ist entweder:
  - `IDLE`
  - `BUILDER` (temporär gebunden)
  - `WORKER` (an Gebäude zugewiesen)
  - `GUILD_TRAINING` (im Gildenhaus)
  - `GUILD_FIGHTER` (trainiert, kann auf Expedition gehen; arbeitet zwischen Runs **nicht** als Worker)
  - `INJURED_REST` (Erholung, keine Arbeit)
  - `ON_EXPEDITION` (auf Expedition, nicht verfügbar)

**Bau:**
- Jeder Bau‑Auftrag benötigt **1 Builder** (MVP: `buildWorkersRequired = 1` für alle Gebäude).
- Während Bauzeit ist der Builder gebunden.
- Wenn Builder abgezogen → Bau pausiert (kein Rückbau, kein Verlust; relaxed).

**Produktion:**
- Gebäude kann `workerSlots` haben.
- Produktion läuft nur, wenn (a) genug Worker assigned und (b) Inputs vorhanden und (c) Output‑Kapazität vorhanden (Buffer oder Lager).

### 7.3 Bevölkerungswachstum (MVP)
**Regel (geprüft jeden Tages‑Tick, also alle 60s):**
```
IF freie Housing‑Slots > 0            // Pop < Housing‑Cap
AND globalStock.bread >= 1
AND durchschnittliche Satisfaction >= 40
THEN:
  → 1 neuer Bürger spawnt (Status: IDLE)
  → globalStock.bread -= 1
  → UI: Banner „Ein neuer Siedler ist angekommen!"
```

**Pop‑Cap:** = Summe aller `housing.capacity` aller gebauten Housing‑Gebäude.

### 7.4 Rekrutierung & Training (MVP)
- **Rekrut werden:** Jeder `IDLE` Bürger kann im Gildenhaus zum Training angemeldet werden.
- **Trainingszeit:** 60s (MVP, eine Klasse wählen: Guardian/Ranger/Cleric)
- **Trainingskosten:** `{ gold: 15 }`
- **Status während Training:** `GUILD_TRAINING` (nicht für Bau/Produktion verfügbar)
- **Nach Training:** Status wird `GUILD_FIGHTER`, erhält Klassen‑Stats (siehe 10.4)
- **Zwischen Expeditionen:** `GUILD_FIGHTER` stehen **nicht** als Worker zur Verfügung. Das ist ein bewusster Pop‑Sink.
- **Auf Expedition:** Status `ON_EXPEDITION`, komplett nicht verfügbar.

### 7.5 Fighter‑Rücktritt (MVP)
Ein `GUILD_FIGHTER` kann im Gildenhaus‑UI zum **Rücktritt** gezwungen werden:
- **Aktion:** Button „Aus Gilde entlassen" im Roster‑Detail.
- **Effekt:** Status wechselt von `GUILD_FIGHTER` → `IDLE`. Der Bürger kann wieder als Worker/Builder eingesetzt werden.
- **Kosten:** Trainingskosten (15 Gold) gehen **verloren** (kein Refund).
- **Ausgerüstetes Gear:** geht zurück ins globale Lager.
- **Klassen‑Stats:** gehen verloren. Wenn der Bürger erneut trainiert wird, startet er bei Base‑Stats.
- **Einschränkung:** Fighter mit Status `ON_EXPEDITION`, `GUILD_TRAINING` oder `INJURED_REST` können **nicht** entlassen werden.
- **Design‑Grund:** Gibt dem Spieler einen Ausweg, wenn zu viele Fighter trainiert wurden und Worker fehlen. Der Gold‑Verlust verhindert Exploit (ständiges Hin‑und‑Her).

### 7.6 Fighter‑Stadt‑Synergien (MVP‑1)
**Problem:** `GUILD_FIGHTER` arbeiten nicht als Worker – jeder ausgebildete Kämpfer ist ein „verlorener Produktions‑Token". Das fühlt sich bestrafend an, besonders wenn die Produktion stockt.

**Lösung:** Fighter in der Stadt (Status `GUILD_FIGHTER`, nicht auf Expedition) erzeugen passive Stadtvorteile. Ihre Präsenz soll sich gut anfühlen – Krieger sind Teil der Gemeinschaft, nicht nur Expedition‑Ressourcen.

**Passive Boni (werden im Tages‑Tick berechnet, nur Fighter mit Status `GUILD_FIGHTER` zählen):**

| Anzahl Fighter in Stadt | Bonus | Flavor |
|---|---|---|
| ≥ 1 Fighter | Alle Wohnhäuser: Satisfaction **+3** | „Die Wachen patroullieren – die Bürger fühlen sich sicher." |
| ≥ 2 Fighter | Trainingszeit neuer Rekruten **−10%** | „Erfahrene Kämpfer mentoren die Neuen." |
| ≥ 3 Fighter | Steuer‑Multiplier global **+0.05** | „Wohlstand und Schutz steigern die Spendenbereitschaft." |

**Regeln:**
- Boni sind **kumulativ** (3 Fighter in Stadt = alle drei aktiv).
- `ON_EXPEDITION`, `GUILD_TRAINING` und `INJURED_REST` Fighter zählen **nicht** → Spieler möchte Fighter schnell gesund sehen, was indirekten Proviant‑Planungs‑Druck erzeugt.
- **Satisfaction‑Bonus** gilt pro Wohnhaus (wird in Satisfaction‑Formel, Abschnitt 6.3, als zusätzlicher `comfort`‑Term addiert, Cap +25 gilt weiterhin).
- **UI:** Gildenhaus‑Panel zeigt „🛡️ Stadtschutz: *N* Fighter aktiv" + aktive Bonus‑Icons als grüne Pills.

**Design‑Grund:** Der Bonus ist klein genug, um keine Balance‑Probleme zu verursachen (Satisfaction +3 ist <1 Steuergold extra), aber groß genug, um sich zu registrieren und die Fighter‑Präsenz in der Stadt wertvoll zu machen. Ein Spieler der 3 Fighter in der Gilde hat, merkt: „Ich will nicht alle immer auf Expedition schicken – die Stadt profitiert wenn einer bleibt."

---

## 8) Gebäude‑System

### 8.1 Gebäude‑Tiers
- **Tier 1 (Holz):** Basis
- **Tier 2 (Stein):** Effizienz + 1 Feature‑Slot
- **Tier 3 (Kristall):** starker Bonus + Unique Perk + Visual Upgrade

**Regel:** Upgrade ist **in‑place** (kein Abriss/Neubau).

**MVP‑Upgrade (Tier 2, nur Guild Hall):**
```json
{
  "upgradeId": "GUILD_HALL_T2",
  "targetBuildingId": "GUILD_HALL",
  "fromTier": 1,
  "toTier": 2,
  "upgradeCost": { "wood": 60, "stone": 20, "crystal_shard": 3, "gold": 80 },
  "upgradeTimeSec": 120,
  "effects": { "partySlots": 4 }
}
```

### 8.2 Produktionsmodell (MVP‑Formel)
Jedes Produktionsgebäude hat 0..n **Rezepte**.

**Ablauf pro Tick:**
- Wenn `timer <= 0` und Inputs verfügbar und Output‑space verfügbar → consume Inputs, set `timer = cycleTimeSec`.
- Wenn `timer > 0` → `timer -= dt`.
- Wenn `timer <= 0` → produce Outputs (in Lager oder Buffer).

### 8.3 Starter‑Gebäude (MVP‑11) – mit konkreten Werten

> Konvention: `footprint` ist **(w,h)** in Tiles. `workerSlots=0` bedeutet „passiv".

#### 8.3.1 Getreidefarm (`FARM_GRAIN`)
```json
{
  "id": "FARM_GRAIN",
  "name": "Getreidefarm",
  "tier": 1,
  "category": "producer",
  "footprint": [3, 3],
  "rotations": [0],
  "buildCost": {"wood": 12},
  "buildTimeSec": 20,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 10, "localInputBuffer": 10},
  "recipes": ["RCP_GRAIN_1"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["food", "farm"]
}
```

#### 8.3.2 Brunnen (`WELL`)
```json
{
  "id": "WELL",
  "name": "Brunnen",
  "tier": 1,
  "category": "utility",
  "footprint": [2, 2],
  "rotations": [0],
  "buildCost": {"wood": 8},
  "buildTimeSec": 12,
  "workerSlots": 0,
  "requiresConnectivity": false,
  "storage": null,
  "recipes": [],
  "radiusEffect": {"type": "water", "radiusTiles": 6},
  "housing": null, "expeditions": null, "training": null,
  "tags": ["utility", "water"]
}
```

#### 8.3.3 Windmühle (`MILL_WIND`)
```json
{
  "id": "MILL_WIND",
  "name": "Windmühle",
  "tier": 1,
  "category": "refine",
  "footprint": [3, 2],
  "rotations": [0],
  "buildCost": {"wood": 18},
  "buildTimeSec": 25,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 10, "localInputBuffer": 10},
  "recipes": ["RCP_FLOUR_1"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["food"]
}
```

#### 8.3.4 Bäckerei (`BAKERY`)
```json
{
  "id": "BAKERY",
  "name": "Bäckerei",
  "tier": 1,
  "category": "refine",
  "footprint": [2, 2],
  "rotations": [0],
  "buildCost": { "wood": 20, "stone": 5 },
  "buildTimeSec": 45,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": { "localOutputBuffer": 10, "localInputBuffer": 10 },
  "recipes": ["RCP_BREAD_1", "RCP_POWER_BREAD"],
  "radiusEffect": { "type": "charcoal_supply", "radiusTiles": 5 },
  "housing": null, "expeditions": null, "training": null,
  "tags": ["food"]
}
```

> **Querabhängigkeit Bäckerei → Schmiede (MVP):** Die Bäckerei erzeugt beim Backen als Nebenprodukt **Holzkohle‑Glut** (thematisch: der Ofen läuft sowieso). Diese wird nicht als Item ins Lager gelegt, sondern als **Radius‑Effekt** modelliert: Jede Schmiede innerhalb von **5 Tiles** (Manhattan‑Distanz, Footprint‑zu‑Footprint) einer **aktiv produzierenden** Bäckerei erhält einen **×1.5 Produktionsgeschwindigkeits‑Bonus** (`cycleTimeSec × 0.67`).  
> **Design‑Wirkung:** Stadtlayout‑Entscheidungen werden interessanter – stelle ich Bäckerei und Schmiede nebeneinander? Dann bekomme ich den Geschwindigkeitsbonus, aber ich verliere Flexibilität beim Wasserradius (Brunnen muss auch die Bäckerei abdecken). Das erzeugt eine echte Platzierungs‑Spannung.
> **Implementierung:** Im `ProductionSystem` bei jedem Tick prüfen: `hasActiveCharcoalSupply(building) → Schmiede.cycleTimeMult = 0.67`. Status im Building Panel anzeigen: „🔥 Holzkohle‑Glut: Produktion ×1.5".
> **Stapelt nicht:** Mehrere Bäckereien im Radius geben keinen zusätzlichen Bonus (Cap bei ×1.5).

> **Rezept‑Umschaltung (MVP):** Gebäude mit mehreren Rezepten (z.B. Bäckerei, Kräutergarten) zeigen im **Building Panel** ein **Rezept‑Dropdown**. Nur **ein Rezept** ist gleichzeitig aktiv. Wechsel ist instant, aber der aktuelle Produktionszyklus wird abgebrochen (Timer reset). UI zeigt das aktive Rezept + „Rezept wechseln ▼" Button.

#### 8.3.5 Holzfällerhütte (`LUMBER_CAMP`)
```json
{
  "id": "LUMBER_CAMP",
  "name": "Holzfällerhütte",
  "tier": 1,
  "category": "producer",
  "footprint": [2, 2],
  "rotations": [0],
  "buildCost": {"wood": 10},
  "buildTimeSec": 18,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 10, "localInputBuffer": 10},
  "recipes": ["RCP_WOOD_1"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["material"]
}
```

#### 8.3.6 Steinbruch (`QUARRY`)
```json
{
  "id": "QUARRY",
  "name": "Steinbruch",
  "tier": 1,
  "category": "producer",
  "footprint": [3, 2],
  "rotations": [0],
  "buildCost": {"wood": 14},
  "buildTimeSec": 20,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 10, "localInputBuffer": 10},
  "recipes": ["RCP_STONE_1"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["material"]
}
```

#### 8.3.7 Lagerhaus (`WAREHOUSE`)
```json
{
  "id": "WAREHOUSE",
  "name": "Lagerhaus",
  "tier": 1,
  "category": "storage",
  "footprint": [4, 3],
  "rotations": [0],
  "buildCost": {"wood": 30},
  "buildTimeSec": 40,
  "workerSlots": 0,
  "requiresConnectivity": false,
  "storage": {"capacity": 300, "stackSizeDefault": 100},
  "recipes": [],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["storage"]
}
```

#### 8.3.8 Wohnhaus (`HOUSE_T1`)
```json
{
  "id": "HOUSE_T1",
  "name": "Wohnhaus",
  "tier": 1,
  "category": "housing",
  "footprint": [2, 2],
  "rotations": [0],
  "buildCost": {"wood": 14},
  "buildTimeSec": 22,
  "workerSlots": 0,
  "requiresConnectivity": true,
  "storage": null,
  "recipes": [],
  "radiusEffect": null,
  "housing": {"capacity": 4, "baseTaxPerMin": 2},
  "expeditions": null, "training": null,
  "tags": ["housing"]
}
```

#### 8.3.9 Gildenhaus (`GUILD_HALL`)
```json
{
  "id": "GUILD_HALL",
  "name": "Gildenhaus",
  "tier": 1,
  "category": "hub",
  "footprint": [4, 4],
  "rotations": [0],
  "buildCost": {"wood": 40, "stone": 5},
  "buildTimeSec": 60,
  "workerSlots": 0,
  "requiresConnectivity": true,
  "storage": null,
  "recipes": [],
  "radiusEffect": null, "housing": null,
  "expeditions": {"partySlots": 3, "maxActiveRuns": 1},
  "training": {"trainingTimeSec": 60, "trainingCost": {"gold": 15}},
  "tags": ["hub", "guild"]
}
```

#### 8.3.10 Kräutergarten (`HERB_GARDEN`)
```json
{
  "id": "HERB_GARDEN",
  "name": "Kräutergarten",
  "tier": 1,
  "category": "producer",
  "footprint": [2, 3],
  "rotations": [0],
  "buildCost": {"wood": 10, "stone": 3},
  "buildTimeSec": 20,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 10, "localInputBuffer": 10},
  "recipes": ["RCP_HERB_1", "RCP_HEALING_POTION"],
  "requirements": {"waterSupplied": true},
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["herb", "farm"]
}
```

#### 8.3.11 Schmiede (`SMITHY`)
- Zweck: Stellt Waffen und Rüstungen her (Gear für Expeditionen)
- **Charcoal‑Bonus:** Wenn eine aktiv produzierende Bäckerei ≤ 5 Tiles entfernt ist, produziert die Schmiede **×1.5 schneller** (siehe 8.3.4).

```json
{
  "id": "SMITHY",
  "name": "Schmiede",
  "tier": 1,
  "category": "refine",
  "footprint": [3, 2],
  "rotations": [0],
  "buildCost": {"wood": 22, "stone": 10},
  "buildTimeSec": 50,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 5, "localInputBuffer": 10},
  "recipes": ["RCP_IRON_SWORD", "RCP_IRON_SHIELD", "RCP_LEATHER_ARMOR"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["craft", "gear"]
}
```

#### 8.3.12 Eisenmine (`IRON_MINE`)
- Zweck: Langsame, stetige Produktion von `iron_scrap` in der Stadt (Alternative zu reinem Expedition‑Loot)

```json
{
  "id": "IRON_MINE",
  "name": "Eisenmine",
  "tier": 1,
  "category": "producer",
  "footprint": [3, 3],
  "rotations": [0],
  "buildCost": {"wood": 20, "stone": 15, "gold": 25},
  "buildTimeSec": 55,
  "workerSlots": 1,
  "requiresConnectivity": true,
  "storage": {"localOutputBuffer": 5, "localInputBuffer": 0},
  "recipes": ["RCP_IRON_SCRAP_1"],
  "radiusEffect": null, "housing": null, "expeditions": null, "training": null,
  "tags": ["material", "mine"]
}
```

> **Design‑Grund:** Die Eisenmine produziert `iron_scrap` langsam (1 alle 30s) und deckt damit ausschließlich den **T1‑Gear‑Craftingbedarf** (Eisenschwert, Eisenschild, Lederrüstung). Sie ist ein Mid‑Game‑Puffer, der den Spieler nicht von allen Expeditionen entkoppelt – sondern nur von den einfachsten.

> **Wichtige Balancing‑Regel – crystal_shard als Expeditions‑Anker:** Alles ab T2‑Gear erfordert zwingend `crystal_shard`, das **ausschließlich aus Expeditionen** stammt (kein Stadt‑Gebäude darf es produzieren). `crystal_shard` hat im Item‑Schema `"productionSource": "expedition_only"` → der Implementierungs‑Agent validiert beim Aufbau des Rezept‑Systems, dass kein `outputItem: crystal_shard` in einem Gebäude‑Rezept vorkommt. Das stellt sicher: Wer sein Gear auf T2/T3 bringen will, **muss** auf Expedition. Die Mine macht T1‑Gear bequemer, aber das Fortschritts‑Ende liegt weiterhin draußen in der Welt.

#### 8.3.13 MVP‑Rezepte (vollständig)
```json
[
  {
    "id": "RCP_GRAIN_1",
    "name": "Getreide ernten",
    "inputs": {},
    "outputs": {"grain": 2},
    "cycleTimeSec": 10
  },
  {
    "id": "RCP_WOOD_1",
    "name": "Holz schlagen",
    "inputs": {},
    "outputs": {"wood": 2},
    "cycleTimeSec": 10
  },
  {
    "id": "RCP_STONE_1",
    "name": "Stein brechen",
    "inputs": {},
    "outputs": {"stone": 1},
    "cycleTimeSec": 12
  },
  {
    "id": "RCP_IRON_SCRAP_1",
    "name": "Eisen schürfen",
    "inputs": {},
    "outputs": {"iron_scrap": 1},
    "cycleTimeSec": 30
  },
  {
    "id": "RCP_FLOUR_1",
    "name": "Mehl mahlen",
    "inputs": {"grain": 2},
    "outputs": {"flour": 2},
    "cycleTimeSec": 12
  },
  {
    "id": "RCP_BREAD_1",
    "name": "Brot backen",
    "inputs": {"flour": 2},
    "outputs": {"bread": 1},
    "cycleTimeSec": 14,
    "requirements": {"minBuildingTier": 1, "requiresSpecialistId": null, "waterSupplied": true}
  },
  {
    "id": "RCP_HERB_1",
    "name": "Kräuter ziehen",
    "inputs": {},
    "outputs": {"herb_green": 1},
    "cycleTimeSec": 15,
    "requirements": {"waterSupplied": true}
  },
  {
    "id": "RCP_HEALING_POTION",
    "name": "Heiltrank brauen",
    "inputs": {"herb_green": 3},
    "outputs": {"healing_potion": 1},
    "cycleTimeSec": 20,
    "requirements": {"waterSupplied": true}
  },
  {
    "id": "RCP_IRON_SWORD",
    "name": "Eisenschwert schmieden",
    "inputs": {"iron_scrap": 2, "wood": 1},
    "outputs": {"iron_sword": 1},
    "cycleTimeSec": 25
  },
  {
    "id": "RCP_IRON_SHIELD",
    "name": "Eisenschild schmieden",
    "inputs": {"iron_scrap": 2, "wood": 1},
    "outputs": {"iron_shield": 1},
    "cycleTimeSec": 25
  },
  {
    "id": "RCP_LEATHER_ARMOR",
    "name": "Lederrüstung fertigen",
    "inputs": {"iron_scrap": 1, "wood": 2},
    "outputs": {"leather_armor": 1},
    "cycleTimeSec": 30
  },
  {
    "id": "RCP_POWER_BREAD",
    "name": "Kraft‑Brot backen",
    "inputs": {"flour": 2, "herb_green": 1},
    "outputs": {"power_bread": 1},
    "cycleTimeSec": 18,
    "requirements": {"minBuildingTier": 1, "requiresSpecialistId": null, "waterSupplied": true}
  }
]
```

> **Hinweis:** `RCP_HEALING_POTION` wird im Kräutergarten hergestellt (`"recipes": ["RCP_HERB_1", "RCP_HEALING_POTION"]`). `RCP_POWER_BREAD` wird in der Bäckerei hergestellt (`"recipes": ["RCP_BREAD_1", "RCP_POWER_BREAD"]`). Gebäude mit mehreren Rezepten nutzen ein **Rezept‑Dropdown** im Building Panel (siehe 8.3.4).

---

## 9) Expeditionen (Auto‑Battler) – vollständige Regeln

### 9.1 Run‑Setup & Loadout‑System (MVP – vollständig definiert)

**Truppgröße:** 1–3 Units (MVP), 4 Units nach Guild Hall T2 Upgrade.

**Loadout pro Unit (MVP):**
Jede `GUILD_FIGHTER` hat **3 Gear‑Slots**:
```json
{
  "gearSlots": {
    "weapon": null,
    "armor": null,
    "trinket": null
  }
}
```

**Gear‑Equip‑Regeln:**
- Gear wird **vor dem Run** im Gildenhaus‑UI angelegt.
- Gear wird aus dem **globalen Lager** entnommen (nicht dupliziert).
- Jedes Gear‑Item kann nur **einmal** gleichzeitig ausgerüstet sein.
- Wenn Unit verletzt zurückkehrt (`INJURED_REST`), bleibt Gear ausgerüstet (nicht verloren).
- Gear ist **nicht verbrauchbar** – es bleibt nach dem Run erhalten.

**Proviant‑Slots (Party‑weit, nicht pro Unit):**
```json
{
  "provisionSlots": 4,
  "provisions": []
}
```

- Bis zu **4 Items** (MVP, 6 nach Guild Hall T2).
- Proviant wird aus dem **globalen Lager** entnommen.
- Proviant wird **im Run verbraucht** (weg nach Nutzung).
- Proviant kann **manuell** oder **automatisch** genutzt werden (siehe 9.10).

**Talisman‑Slot (Party‑weit):**
```json
{
  "talismanSlot": null
}
```

- 1 Talisman pro Run (globaler Modifier).
- MVP: **1 Talisman verfügbar** (siehe Item‑Liste 10.1).
- Talisman wird **nicht verbraucht** (bleibt nach Run erhalten).

### 9.2 Encounter‑Deck (pro Route)
Jede Route definiert **datengetrieben**:
- `rooms` (z.B. 6 / 10 / 14)
- `encounterWeights` (combat/find/hazard/rest/merchant/survivor/boss)
- `biome` (für Gegner‑Pool & Loot)
- `enemyPoolIds` (Liste möglicher Gegner‑IDs für reguläre Kämpfe)
- `combatPackTemplates` (Templates für Gegneranzahl)
- `bossId` (optionaler Boss im letzten Room)

**Pack‑Erzeugung (MVP):** Wähle ein Template per `weight`, rolle `N` zwischen `minEnemies` und `maxEnemies`, ziehe dann `N` Gegner zufällig aus `enemyPoolIds`.

**Boss‑Regel:** Wenn `bossId` definiert ist, ist der **letzte Room** immer ein Boss‑Encounter (nicht zufällig). Der Boss kommt mit 1–2 regulären Adds aus `enemyPoolIds`.

**MVP‑Routen (4 Stück):**
```json
{
  "id": "forest_short",
  "name": "Waldpfad (Kurz)",
  "rooms": 6,
  "biome": "forest",
  "encounterWeights": { "combat": 50, "find": 20, "hazard": 10, "rest": 10, "merchant": 5, "survivor": 5 },
  "enemyPoolIds": [
    "ENEMY_FOREST_WOLF", "ENEMY_BANDIT_RAIDER", "ENEMY_CAVE_SLIME",
    "ENEMY_THORN_SPRITE", "ENEMY_FUNGAL_CREEPER"
  ],
  "combatPackTemplates": [
    { "minEnemies": 1, "maxEnemies": 2, "weight": 70 },
    { "minEnemies": 2, "maxEnemies": 3, "weight": 30 }
  ],
  "bossId": null,
  "lootTableId": "forest_basic",
  "rareLootTableId": "forest_rare"
}
```

```json
{
  "id": "forest_medium",
  "name": "Tiefer Wald",
  "rooms": 10,
  "biome": "forest",
  "encounterWeights": { "combat": 45, "find": 15, "hazard": 15, "rest": 10, "merchant": 5, "survivor": 5, "boss": 5 },
  "enemyPoolIds": [
    "ENEMY_FOREST_WOLF", "ENEMY_BANDIT_RAIDER", "ENEMY_CAVE_SLIME",
    "ENEMY_THORN_SPRITE", "ENEMY_FUNGAL_CREEPER", "ENEMY_SHADOW_BAT",
    "ENEMY_MOSS_GOLEM", "ENEMY_VENOMFANG_SPIDER", "ENEMY_GOBLIN_SCOUT",
    "ENEMY_WILD_BOAR"
  ],
  "combatPackTemplates": [
    { "minEnemies": 1, "maxEnemies": 2, "weight": 40 },
    { "minEnemies": 2, "maxEnemies": 3, "weight": 45 },
    { "minEnemies": 3, "maxEnemies": 3, "weight": 15 }
  ],
  "bossId": "BOSS_ELDER_TREANT",
  "lootTableId": "forest_basic",
  "rareLootTableId": "forest_rare"
}
```

```json
{
  "id": "cave_deep",
  "name": "Tiefe Höhlen",
  "rooms": 8,
  "biome": "cave",
  "encounterWeights": { "combat": 50, "find": 15, "hazard": 15, "rest": 10, "merchant": 5, "survivor": 5 },
  "enemyPoolIds": [
    "ENEMY_CRYSTAL_BEETLE", "ENEMY_DEEP_CRAWLER", "ENEMY_MINE_SPECTER",
    "ENEMY_STALACTITE_BAT", "ENEMY_MAGMA_SLUG",
    "ENEMY_CAVE_SLIME", "ENEMY_SHADOW_BAT"
  ],
  "combatPackTemplates": [
    { "minEnemies": 1, "maxEnemies": 2, "weight": 40 },
    { "minEnemies": 2, "maxEnemies": 3, "weight": 45 },
    { "minEnemies": 3, "maxEnemies": 3, "weight": 15 }
  ],
  "bossId": "BOSS_CRYSTAL_GOLEM",
  "bossLootTableId": "boss_crystal_golem_loot",
  "lootTableId": "cave_basic",
  "rareLootTableId": "cave_rare"
}
```

> **Design‑Grund (cave_deep):** Die Höhle bietet ein anderes Biom als der Wald – dunklere Optik, kristall‑basierte Gegner, und als Loot‑Fokus mehr `crystal_shard` und `iron_scrap`. Der Kristallgolem‑Boss belohnt mit seltenen Kristallen und Magic‑Items. Die 8 Rooms sind ein Mittelding zwischen forest_short (6) und forest_medium (10) – ideal als zweite Progressionsstufe.

```json
{
  "id": "swamp_long",
  "name": "Finsterer Sumpf",
  "rooms": 12,
  "biome": "swamp",
  "encounterWeights": { "combat": 45, "find": 10, "hazard": 20, "rest": 10, "merchant": 5, "survivor": 5, "boss": 5 },
  "enemyPoolIds": [
    "ENEMY_BOG_WITCH", "ENEMY_SWAMP_TROLL", "ENEMY_LEECH_SWARM",
    "ENEMY_MIRE_PHANTOM", "ENEMY_TOXIC_TOAD", "ENEMY_ROT_WALKER",
    "ENEMY_FUNGAL_CREEPER", "ENEMY_HOLLOW_SHADE"
  ],
  "combatPackTemplates": [
    { "minEnemies": 2, "maxEnemies": 3, "weight": 40 },
    { "minEnemies": 2, "maxEnemies": 4, "weight": 40 },
    { "minEnemies": 3, "maxEnemies": 4, "weight": 20 }
  ],
  "bossId": "BOSS_SWAMP_HYDRA",
  "bossLootTableId": "boss_swamp_hydra_loot",
  "lootTableId": "swamp_basic",
  "rareLootTableId": "swamp_rare"
}
```

> **Design‑Grund (swamp_long):** Der Sumpf ist die härteste MVP‑Route. 12 Rooms, erhöhte Hazard‑Rate (20%), größere Packs (bis 4 Gegner), und die Sumpfhydra als stärkster Boss. Der Sumpf hat Support‑Gegner (Bog Witch heilt Feinde) und Assassins (Mire Phantom), was strategisches Targeting erzwingt. Loot‑Fokus: `talisman_fragment` und `herb_green`.

```json
{
  "id": "grandmaster_trial",
  "name": "Die Großmeister‑Prüfung",
  "rooms": 15,
  "biome": "mixed",
  "encounterWeights": { "combat": 60, "find": 5, "hazard": 20, "rest": 5, "merchant": 5, "survivor": 0, "boss": 0 },
  "enemyPoolIds": [
    "ENEMY_FOREST_WOLF", "ENEMY_BANDIT_RAIDER", "ENEMY_HOLLOW_SHADE", "ENEMY_BRAMBLE_BEAR",
    "ENEMY_CRYSTAL_BEETLE", "ENEMY_DEEP_CRAWLER", "ENEMY_MINE_SPECTER",
    "ENEMY_BOG_WITCH", "ENEMY_SWAMP_TROLL", "ENEMY_MIRE_PHANTOM",
    "ENEMY_MOSS_GOLEM", "ENEMY_ROT_WALKER"
  ],
  "combatPackTemplates": [
    { "minEnemies": 2, "maxEnemies": 3, "weight": 30 },
    { "minEnemies": 3, "maxEnemies": 4, "weight": 50 },
    { "minEnemies": 3, "maxEnemies": 5, "weight": 20 }
  ],
  "specialRules": {
    "noBossHealBetweenPhases": true,
    "bossFights": [
      { "atRoom": 5,  "bossId": "BOSS_ELDER_TREANT",  "note": "Phase 1: Forest Champion" },
      { "atRoom": 10, "bossId": "BOSS_CRYSTAL_GOLEM",  "note": "Phase 2: Cave Titan" },
      { "atRoom": 15, "bossId": "BOSS_SWAMP_HYDRA",    "note": "Phase 3: Swamp Leviathan" }
    ],
    "noProvisionRestoreBetwenPhases": true,
    "enrageMod": 1.25
  },
  "bossId": null,
  "lootTableId": "grandmaster_basic",
  "rareLootTableId": "grandmaster_rare",
  "unlockCondition": { "guildRank": 5 },
  "completionReward": {
    "banner": "🏆 Gildenmeister – Alle Prüfungen bestanden!",
    "achievement": "ACH_GRANDMASTER",
    "lootBonus": { "crystal_shard": 5, "talisman_fragment": 3, "gold": 100 }
  }
}
```

> **Design‑Grund (grandmaster_trial):** Dies ist das finale Endgame‑Ziel für Rang‑V‑Spieler – kein normaler Run, sondern eine echte **Abschlussprüfung**. Drei Bosse nacheinander in 15 Rooms, kein HP‑Restore zwischen den Boss‑Phasen (Rest‑Rooms existieren, heilen aber nur die normalen +10 HP). Proviant wird nicht zwischen Phasen aufgefüllt – was du reinträgst, ist alles was du hast. Der Mixed‑Enemy‑Pool aus allen drei Biomen stellt sicher, dass keine einzelne Teamzusammensetzung dominant ist.  
> **Belohnung:** Unique Banner „Gildenmeister" + Achievement `ACH_GRANDMASTER` + Loot‑Bonus. Gear‑Drops aus allen drei Boss‑Loot‑Tables kombiniert. Kein Gold‑Penalty für Auto‑Retreat – wer die Großmeister‑Prüfung antritt, sollte fair behandelt werden, auch wenn er scheitert.

```json
{
  "id": "cave_spider",
  "name": "Spinnennest",
  "rooms": 8,
  "biome": "cave",
  "encounterWeights": { "combat": 55, "find": 15, "hazard": 10, "rest": 10, "merchant": 5, "survivor": 5 },
  "enemyPoolIds": [
    "ENEMY_CRYSTAL_BEETLE", "ENEMY_DEEP_CRAWLER", "ENEMY_STALACTITE_BAT",
    "ENEMY_VENOMFANG_SPIDER", "ENEMY_SHADOW_BAT", "ENEMY_CAVE_SLIME"
  ],
  "combatPackTemplates": [
    { "minEnemies": 1, "maxEnemies": 2, "weight": 35 },
    { "minEnemies": 2, "maxEnemies": 3, "weight": 45 },
    { "minEnemies": 3, "maxEnemies": 3, "weight": 20 }
  ],
  "bossId": "BOSS_SPIDER_QUEEN",
  "bossLootTableId": "boss_spider_queen_loot",
  "lootTableId": "cave_basic",
  "rareLootTableId": "cave_rare",
  "unlockCondition": { "bossesDefeated": ["BOSS_CRYSTAL_GOLEM"] }
}
```

> **Design‑Grund (cave_spider):** Alternative Höhlen‑Route mit der Spinnenkönigin als Boss. Mehr Combat‑lastig (55%) und belohnt AoE‑Strategien gegen die Adds der Spinnenkönigin.

```json
{
  "id": "ruins_crypts",
  "name": "Vergessene Krypta",
  "rooms": 10,
  "biome": "ruins",
  "encounterWeights": { "combat": 50, "find": 10, "hazard": 15, "rest": 10, "merchant": 5, "survivor": 5, "boss": 5 },
  "enemyPoolIds": [
    "ENEMY_SKELETON_WARRIOR", "ENEMY_GHOST_MAGE", "ENEMY_STONE_GUARDIAN",
    "ENEMY_BONE_KNIGHT", "ENEMY_CRYPT_HORROR", "ENEMY_CURSED_PRIEST"
  ],
  "combatPackTemplates": [
    { "minEnemies": 2, "maxEnemies": 3, "weight": 45 },
    { "minEnemies": 2, "maxEnemies": 4, "weight": 40 },
    { "minEnemies": 3, "maxEnemies": 4, "weight": 15 }
  ],
  "bossId": "BOSS_FALLEN_KNIGHT",
  "bossLootTableId": "boss_fallen_knight_loot",
  "lootTableId": "ruins_basic",
  "rareLootTableId": "ruins_rare",
  "unlockCondition": { "bossesDefeated": ["BOSS_ELDER_TREANT", "BOSS_CRYSTAL_GOLEM"] }
}
```

> **Design‑Grund (ruins_crypts):** Untote + Konstrukt‑Gegner mit Anti‑Heal‑Mechanik (Verwunschener Priester). Der Gefallene Ritter ist ein DEF‑Monster mit Heal‑Block – erzwingt andere Strategien als Forest/Cave.

```json
{
  "id": "ruins_depths",
  "name": "Tiefe der Ruinen",
  "rooms": 12,
  "biome": "ruins",
  "encounterWeights": { "combat": 50, "find": 10, "hazard": 20, "rest": 10, "merchant": 5, "survivor": 5 },
  "enemyPoolIds": [
    "ENEMY_SKELETON_WARRIOR", "ENEMY_GHOST_MAGE", "ENEMY_STONE_GUARDIAN",
    "ENEMY_BONE_KNIGHT", "ENEMY_CRYPT_HORROR", "ENEMY_CURSED_PRIEST"
  ],
  "combatPackTemplates": [
    { "minEnemies": 2, "maxEnemies": 3, "weight": 30 },
    { "minEnemies": 3, "maxEnemies": 4, "weight": 45 },
    { "minEnemies": 3, "maxEnemies": 5, "weight": 25 }
  ],
  "bossId": "BOSS_SHADOW_LICH",
  "bossLootTableId": "boss_shadow_lich_loot",
  "lootTableId": "ruins_basic",
  "rareLootTableId": "ruins_rare",
  "unlockCondition": { "bossesDefeated": ["BOSS_FALLEN_KNIGHT"] }
}
```

> **Design‑Grund (ruins_depths):** Die schwere Ruinen‑Route. 12 Rooms, hohe Hazard‑Rate (20%), große Packs (bis 5). Der Schattenlich ist ein Caster‑Boss mit Selbstheilung und Beschwörung – DPS‑Rennen ähnlich wie Hydra, aber mit Summons.

```json
{
  "id": "volcano_core",
  "name": "Vulkankern",
  "rooms": 14,
  "biome": "volcano",
  "encounterWeights": { "combat": 50, "find": 5, "hazard": 25, "rest": 10, "merchant": 5, "survivor": 5 },
  "enemyPoolIds": [
    "ENEMY_LAVA_ELEMENTAL", "ENEMY_FIRE_BAT", "ENEMY_ASH_GOLEM",
    "ENEMY_FLAME_WRAITH", "ENEMY_OBSIDIAN_CRAB", "ENEMY_MAGMA_BROODMOTHER"
  ],
  "combatPackTemplates": [
    { "minEnemies": 2, "maxEnemies": 3, "weight": 25 },
    { "minEnemies": 3, "maxEnemies": 4, "weight": 45 },
    { "minEnemies": 3, "maxEnemies": 5, "weight": 30 }
  ],
  "bossId": "BOSS_MAGMA_WYRM",
  "bossLootTableId": "boss_magma_wyrm_loot",
  "lootTableId": "volcano_basic",
  "rareLootTableId": "volcano_rare",
  "unlockCondition": { "bossesDefeated": ["BOSS_SWAMP_HYDRA", "BOSS_FALLEN_KNIGHT"] }
}
```

> **Design‑Grund (volcano_core):** Die härteste Route im Spiel. 14 Rooms, extreme Hazard‑Rate (25%), kaum Funde (5%). Der Magma‑Wyrm hat die höchsten HP aller Bosse (130) und häufige AoE – True Endgame Content. Erfordert Level 8+ Helden und T3‑Gear.

### 9.3 Combat: Rundenbasiert (überarbeitet)

Pro Kampf-Encounter:

1. **SETUP**
   - Alle Units (Helden + Gegner) in eine Liste
   - Sortieren nach SPD (höchste zuerst), Tiebreak: Helden vor Gegnern

2. **PRO RUNDE** (max 20 Runden als Safety-Cap)
   a) Für jede lebende Unit in Initiative-Reihenfolge:
      - Skill-Check: Hat die Unit einen Skill mit cooldown=0? → Skill ausführen
      - Sonst: Normaler Angriff auf Target (nach Targeting-Regeln)
      - Cooldowns aller Skills -1
   b) Tote entfernen
   c) Buff-Timer -1, abgelaufene Buffs entfernen
   d) Boss-Enrage prüfen (nach Runde 8)
   e) Wenn eine Seite komplett tot → Kampf Ende

3. **NACH KAMPF**
   - Loot-Roll
   - HP-Werte bleiben für nächsten Room (kein Auto-Heal zwischen Rooms)

### 9.4 Targeting‑Priorität
1. **Taunt**: Wenn ein Gegner `tauntActive=true`, muss er gewählt werden.
2. **Highest Threat on self**: (für Monster) Ziel = Einheit mit höchstem Threat.
3. **Role Preference** (für Helden):  
   - DPS: bevorzugt niedrigste HP% (Finish)  
   - Tank: bevorzugt nächstes (default)  
   - Heiler: Ziel = Ally mit niedrigster HP%
4. Tiebreaker: niedrigste aktuelle HP.

### 9.5 Threat/Aggro (MVP‑Formeln)
- `threat += damageDealt * threatMultiplier` (Default: 1.0, Tanks: 1.5)
- Tank‑Skills: `+ flatThreat`
- Heals: `threat += healAmount * 0.25`
- Monster wählen Hero‑Target mit höchstem Threat (wenn kein Taunt greift)

### 9.6 Schaden, Crit, Mitigation (MVP)
- **Base Damage:** `raw = ATK - DEF`
- **Clamp:** `damage = max(1, raw)`
- **Crit:** mit `critChance` (0..1): `damage *= critMult` (z.B. 1.5)
- **Gear‑Bonus:** ATK und DEF werden durch equipped Gear **additiv** erhöht (siehe 9.11).

### 9.7 Healing
- Heiler: `healPerRound` (klein) + Skill‑Heal (größer)
- Heilung capped: HP darf max `maxHP` erreichen.

### 9.8 Verletzungen, Retreat, Fail‑Handling
- Wenn Hero auf 0 HP:
  - Unit wird `DOWNED` (Run geht weiter, wenn andere leben)
  - Am Run‑Ende: `INJURED_REST` Status mit `injuryTimeSec = 120`
  - Während `INJURED_REST`: nicht verfügbar
  - Timer zählt in City‑Simulation‑Ticks runter
- **Auto‑Retreat:** Wenn Team‑HP% < 20%  
  → Run endet, Loot wird auf **50%** reduziert (abgerundet), aber nicht alles verloren.

### 9.8.1 Spieler‑Entscheidungen im Run (MVP)
**Problem:** Reines Zuschauen im Auto‑Battler wird nach wenigen Runs langweilig.

**Lösung:** Der Spieler trifft **zwischen den Rooms** aktive Entscheidungen:

**1) Weiter‑oder‑Retreat‑Entscheidung (nach jedem 3. Room):**
- Nach Room 3, 6, 9, … erscheint ein **Checkpoint‑Dialog:**
  - UI zeigt: Team‑HP%, Proviant‑Rest, Rooms verbleibend, bisheriger Loot
  - Optionen: `[Weiter →]` oder `[Retreat (Loot behalten)]`
  - Bei Retreat: normaler Retreat (kein HP‑Penalty, voller Loot bis dahin)
  - **Wichtig:** Nur an Checkpoints, nicht nach jedem Room (zu viel Klicken wäre nervig)

**2) Manueller Proviant‑Einsatz (optional):**
- Nach jedem Room kann der Spieler **manuell** einen Proviant‑Slot aktivieren:
  - Klick auf Proviant‑Icon im Expedition‑UI → Dropdown der verfügbaren Items
  - Wähle Ziel‑Unit (bei Heal‑Items) oder bestätige (bei Buff‑Items)
  - Wenn der Spieler **nichts tut innerhalb 5s**, greift das **Auto‑Use‑System** (wie bisher in 9.10)
- **Vorteil:** Spieler kann strategisch heilen (z.B. Tank priorisieren statt „niedrigste HP%")
- **Kein Zwang:** Wer nicht klicken will, lässt das Auto‑System arbeiten. Relaxed bleibt erhalten.

**3) Encounter‑Auswahl (bei `find` und `rest` Rooms):**

Alle Encounter-Wahlen sind **binäre Entscheidungen** (kein Decision-Overload), aber jede hat **Flavor-Text** der zum Biom passt, und eine echte Kosten-Nutzen-Spannung.

**`find`‑Room‑Wahlen (Schatzkiste / Fund):**

| Option A | Option B | Risiko/Spannung |
|---|---|---|
| `[Kiste öffnen (+1–2 Loot)]` | `[Gesicherter Pfad (+10% Rare-Chance, aber +1 Combat)]` | Sicher vs. besser, aber teuer |
| `[Kiste öffnen]` | `[Verlockend... ignorieren (kein Loot, kein Risiko)]` | Gier vs. Vorsicht wenn HP niedrig |

**Atmosphärische `find`-Texte (je nach Biom, zufällig aus Pool):**
- **Forest:** "Eure Gruppe stolpert über eine moosbedeckte Kiste unter einer alten Eiche..."
- **Forest:** "Eine glitzernde Hand ragt aus dem Laub – darunter vergraben: eine Truhe."
- **Cave:** "Im Schein eurer Fackel reflektiert ein Kristall etwas Metallisches in der Felsspalte..."
- **Cave:** "Rußflecken an der Wand – hier war jemand vor euch. Sie haben etwas zurückgelassen."
- **Swamp:** "Ein halb versunkener Kasten ragt aus dem Schlamm. Der Deckel ist mit Rost verschlossen."
- **Swamp:** "Ein Leuchten unter der Wasseroberfläche... zu riskant zu ignorieren."

**`rest`‑Room‑Wahlen (Lagerfeuer / Pause):**

| Option A | Option B | Risiko/Spannung |
|---|---|---|
| `[Rasten – alle +10 HP]` | `[Formieren – Tank: +5% Threat für 3 Räume; schnelle Taktik-Anpassung]` | HP jetzt vs. Vorteil später |
| `[Rasten – alle +10 HP]` | `[Klerikerin meditiert – +15 HP nur auf Klerikerin (ggf. Überheilung)]` | Gleichmäßig vs. gezielt |

**Atmosphärische `rest`-Texte (je nach Biom):**
- **Forest:** "Eine Lichtung öffnet sich – das Knistern eines Lagerfeuers, den Waldgeräuschen zum Trotz..."
- **Forest:** "Die alten Bäume hier scheinen zu schlafen. Für einen Moment ist der Wald still."
- **Cave:** "Eine natürliche Kammer mit Stalaktiten. Kein Wind, kein Tropfen. Nur Stille."
- **Cave:** "Das unterirdische Leuchten der Kristalle wirkt fast... friedlich."
- **Swamp:** "Ein trockener Felsvorsprung über dem Morast. Kaum Platz, aber genug für kurze Rast."
- **Swamp:** "Der Nebel lichtet sich hier kurz. Irgendwo quakt ein Frosch. Fast heimelig."

**`hazard`‑Room‑Texte (keine Wahl – automatische Sfx/Log-Einblendung):**
- **Forest:** "Giftige Ranken! Die Gruppe kämpft sich durch – alle nehmen Schaden."
- **Forest:** "Ein Hinterhalt im Dickicht – Pfeilhagel aus dem Nichts!"
- **Cave:** "Der Boden bricht ein – der Tank fängt alle auf. Jeder zahlt einen Preis."
- **Cave:** "Giftgas aus einer Felsritze. Alle huschen schnell hindurch – aber nicht ungeschoren."
- **Swamp:** "Treibsand. Die Gruppe verliert kostbare Zeit – und Energie."
- **Swamp:** "Faulende Bretter einer alten Brücke. Jemand fällt durch. Alles nass, alles schmerzt."

**`survivor`‑Room‑Texte:**
- **Forest:** "Ein Überlebender versteckt sich im hohlen Baum. Sein Blick – erst Angst, dann Hoffnung."
- **Cave:** "Hinter einem Felsblock höre ich Atemzüge. Ein Minenarbeiter. Lebendig."
- **Swamp:** "Ein einsamer Schrei aus dem Nebel. Als wir ihn finden, zittert er noch."

**Implementierungshinweis:** Flavor-Texte sind **datengetrieben** – jede Route hat ein `flavorTextPool` Objekt pro Encounter-Typ pro Biom (Array of Strings, RNG-Auswahl). Text erscheint im **Expedition-Log** oben (1–2 Sätze in kursiv) bevor die Wahl oder das Ergebnis eingeblendet wird. Kein separates Modal – einfach als Log-Zeile in anderer Farbe (`TEXT_DIM`, italic).

**Design:** Einfache binäre Entscheidungen, kein Decision‑Overload – aber durch Atmosphäre und echte Spannung (Kiste öffnen wenn HP 30%?) fühlen sie sich bedeutsamer an als trockene Knöpfe.

### 9.8.2 Aktiver Notfall‑Skill „Verzweifelter Wille" (MVP‑0)
**Problem:** Der Auto‑Battler ist komplett passiv – der Spieler schaut nur zu. Checkpoint‑Dialog und manueller Proviant (9.8.1) sind „zwischen den Rooms", aber **während** des Kampfes gibt es keine Player Agency. Nach dem 5. Run wird das langweilig.

**Lösung:** Ein **einziger aktiver Party‑Skill** pro Kampf, der die Auto‑Battler‑Natur nicht bricht.

**Mechanik:**
- **Skill‑Name:** „Verzweifelter Wille" (Desperate Resolve)
- **Typ:** Party‑Skill (nicht pro Unit, sondern pro Trupp)
- **Auslösung:** Spieler klickt Button `[⚡ Verzweifelter Wille]` im Expedition‑UI **während** eines Kampfes
- **Effekt:** Alle lebenden Helden erhalten **+3 ATK** und **+2 DEF** für die nächsten **2 Runden**
- **Cooldown:** 3 Runden nach Aktivierung (nicht pro Kampf – zählt über Runden im aktuellen Combat)
- **Pro Run nur 1× verfügbar:** Nach Nutzung wechselt der Button zu `[Verbraucht]` und ist für den Rest des Runs deaktiviert
- **Kein Zwang:** Wenn der Spieler den Skill nie drückt, läuft der Kampf normal weiter. Das Auto‑System nutzt ihn **nicht** automatisch.
- **UI:** Pulsierender goldener Button in der Expedition‑UI, wird bei HP < 40% stärker animiert (visueller Hinweis)

**Design‑Begründung:**
- **1 Knopf** = kein Decision‑Overload, aber ein echter „Mitfiebern"‑Moment
- **Pro Run nur 1×** = der Spieler muss timen: „Spare ich ihn für den Boss oder rette ich den Team‑Wipe jetzt?"
- **Kein Auto‑Use** = der Spieler muss aktiv entscheiden, das unterscheidet es von Proviant
- Bricht die Auto‑Battler‑Natur nicht: Units kämpfen weiterhin autonom, der Buff ist nur ein temporärer Modifier

**Daten‑Schema:**
```json
{
  "id": "PARTY_DESPERATE_RESOLVE",
  "name": "Verzweifelter Wille",
  "type": "party_skill",
  "usesPerRun": 1,
  "cooldownRounds": 3,
  "effects": [
    { "type": "buff_allies", "stat": "atk", "value": 3, "durationRounds": 2 },
    { "type": "buff_allies", "stat": "def", "value": 2, "durationRounds": 2 }
  ],
  "triggerCondition": "manual_player_click",
  "flavorText": "Die Gilde steht zusammen – ein letzter Kraftakt!"
}
```

### 9.8.3 Taktischer Zielwechsel „Fokusziel" (MVP‑1)
**Problem:** Verzweifelter Wille (9.8.2) ist ein Notfall‑Knopf – reaktiv, stat‑basiert, nach dem 10. Run trivial. Es fehlt ein **taktischer** Eingriff, der echte Entscheidungen erzwingt: „Wen töte ich zuerst?"

**Lösung:** Ein zweiter Party‑Skill, der das Ziel‑Targeting kurzzeitig überschreibt – ohne den Auto‑Battler grundlegend zu verändern.

**Mechanik:**
- **Skill‑Name:** „Fokusziel" (Focus Target)
- **Typ:** Party‑Skill (wirkt auf alle DPS‑Units: Ranger‑Klassen + DPS‑Klassen)
- **Auslösung:** Spieler klickt auf einen **sichtbaren Gegner** im Expedition‑UI während eines Kampfes (nicht auf einen Button, sondern direkt auf das Gegner‑Icon)
- **Effekt:** Alle DPS‑Units des Teams ignorieren für **2 Runden** ihr normales Prioritäts‑Targeting und greifen ausschließlich das gewählte Ziel an
- **Endet:** nach 2 Runden oder wenn das Ziel stirbt (automatisch → normales Targeting wieder aktiv)
- **Cooldown:** 4 Runden ab Aktivierung
- **Kosten:** keine Ressourcen, keine Ladung – **beliebig oft nutzbar**, aber begrenzt durch den 4‑Runden‑Cooldown
- **Tank‑ und Heiler‑Units sind ausgenommen:** Sie befolgen weiterhin ihre Rollen (Taunt, Heal). Nur DPS‑Classes wechseln das Ziel.
- **UI:** Gegner‑Icons im Expedition‑UI sind klickbar (aktuell aktives Fokusziel wird orange umrahmt). Cooldown‑Leiste unter den Gegner‑Icons. Tooltip: „Fokussiert für [N] Runden".
- **Kein Auto‑Use:** Das System wählt nie automatisch ein Fokusziel; wenn der Spieler nicht klickt, gilt normales Targeting.

**Kern‑Entscheidungen die der Skill erzwingt:**
| Szenario | Wahl |
|---|---|
| `ENEMY_CURSED_WISP` (10 HP, heilt Feinde) ist im Pack | → Fokusziel auf Wisp: töte den Heiler bevor er alle Feinde auffüllt |
| `BOSS_ELDER_TREANT` + 2 Adds | → Fokusziel auf Adds: reduziere zahlenmäßige Übermacht, bevor Tank stirbt |
| `ENEMY_HOLLOW_SHADE` (Assassin, greift Heiler an) | → Fokusziel auf Shade: schütze Klerikerin durch schnellen Kill |
| Gegner mit `DIAMOND_SHELL` (fast unverwundbar für 2 Runden) | → Fokusziel auf Add, dann zurück zu Boss wenn Buff abläuft |

**Design‑Begründung:**
- **Kein Decision‑Overload:** Der Spieler schaut auf das Kampf‑Log, sieht einen Heiler und klickt ihn an. Eine Sekunde, eine Entscheidung.
- **Ergänzt Verzweifelten Willen:** Wille = „Survive the round", Fokusziel = „Kill the right target". Zwei verschiedene Typen von Agency.
- **Skaliert mit Wissen:** Neue Spieler ignorieren den Skill, erfahrene Spieler nutzen ihn für ein „Aha‑ich‑gewinne‑jetzt"-Moment.
- **Differenziert Auto‑Battler vom Konkurrenten:** Gerade diese kleine Interaktion macht den Unterschied zwischen „ich schaue zu" und „ich spiele".

**Daten‑Schema:**
```json
{
  "id": "PARTY_FOCUS_TARGET",
  "name": "Fokusziel",
  "type": "party_skill",
  "usesPerRun": -1,
  "cooldownRounds": 4,
  "effects": [
    {
      "type": "override_targeting",
      "targetScope": "dps_only",
      "durationRounds": 2,
      "description": "Alle DPS‑Units greifen für 2 Runden ausschließlich das markierte Ziel an"
    }
  ],
  "triggerCondition": "player_clicks_enemy",
  "uiHint": "Klicke auf einen Gegner im Kampf‑UI, um ihn als Fokusziel zu markieren",
  "flavorText": "Alle Augen auf ein Ziel – zusammen brechen wir jeden Widerstand!"
}
```

**Implementierungshinweis:**
- Im `ExpeditionSystem` bei jedem Angriff prüfen: `if (unit.role === 'dps' && activePartySkills.focusTarget?.active) → target = focusTarget.enemyId`
- Wenn `focusTarget.enemyId` bereits tot → `focusTarget.active = false`, normales Targeting
- Cooldown läuft über dieselbe Runden‑Zählung wie Skill‑Cooldowns (−1 pro Runde)
- Gegner‑Icons im `ExpeditionUI` erhalten `onClick` Handler (nur während aktiver Kämpfe)

### 9.9 Rewards (MVP)
Nach jedem Room:
- **combat:** 1× Loot‑Roll aus `lootTableId`.
- **find:** 1× `lootTableId` + 10% Chance auf `rareLootTableId`.
- **merchant:** Der Händler bietet **1 zufälliges Item** aus der `rareLootTableId` der aktuellen Route zum **Kauf** an. Preis: `baseValue × 3` Gold. Spieler kann `[Kaufen]` oder `[Ablehnen]`. Wenn Gold reicht und gekauft → Item wird zum Run‑Loot addiert; Gold wird vom globalen Lager abgezogen. UI: „Ein Wanderhändler bietet [Item] für [Preis] Gold an!"
- **survivor:** 100% neuer Bürger (Status `IDLE`) **oder** 20% Specialist.
- **hazard:** kein Loot, jede Unit verliert `5 HP` (clamp to 1, nicht tödlich).
- **rest:** kein Loot, jede Unit heilt `10 HP` (capped at maxHP).
- **boss:** Boss‑Encounter (siehe 9.12), **garantierter** 1× `rareLootTableId` Drop + 1× `bossLootTableId` Drop.

Run‑Ende:
- Gesamt‑Loot → globales Lager.
- Survivors → Stadt‑Population.
- Units: `ON_EXPEDITION` → `GUILD_FIGHTER` (oder `INJURED_REST` wenn downed).
- **Unverbrauchter Proviant** geht zurück ins globale Lager.

### 9.10 Proviant‑Mechanik (MVP – vollständig definiert)
**Konzept:** Proviant sind **Verbrauchsitems**, die der Spieler vor dem Run aus dem globalen Lager in die Provisions‑Slots lädt. Sie werden **während** des Runs verbraucht.

**Nutzungs‑Modus (MVP):** AUTO  
- Nach jedem Room (egal welcher Typ) prüft das System:
  - Wenn **irgendeine Unit** HP < 50% hat **und** ein `healing_potion` oder `bread` in den Provisions vorhanden ist:
    - `healing_potion` hat Priorität vor `bread` (höherer Heal‑Wert)
    - Heal wird auf die Unit mit **niedrigster HP%** angewendet
    - Item wird aus Provisions entfernt (verbraucht)
  - Wenn ein **Buff‑Item** in den Provisions ist (z.B. `power_bread`):
    - Wird **automatisch vor dem ersten Combat** aktiviert
    - Buff läuft `durationRooms` Rooms lang, dann verfällt er

**Proviant‑Item‑Effekte (MVP):**
| Item | Effekt | Verbrauch |
|------|--------|-----------|
| `bread` | Heilt **8 HP** auf niedrigste Unit | Ja |
| `healing_potion` | Heilt **15 HP** auf niedrigste Unit | Ja |
| `power_bread` | Alle Units `+2 ATK` für 3 Rooms | Ja |
| `herb_green` | Heilt **5 HP** auf niedrigste Unit | Ja |

### 9.11 Gear‑System (MVP – vollständig definiert)
**Konzept:** Gear wird in der Schmiede hergestellt (oder als Expedition‑Loot gefunden), im Gildenhaus‑UI angelegt, und modifiziert die Stats der Unit **additiv**.

**Equip‑Formel:**
```
effective_ATK = base_ATK + weapon.atkBonus + (armor.atkBonus || 0) + (trinket.atkBonus || 0)
effective_DEF = base_DEF + (weapon.defBonus || 0) + armor.defBonus + (trinket.defBonus || 0)
effective_HP  = base_HP + (weapon.hpBonus || 0) + (armor.hpBonus || 0) + (trinket.hpBonus || 0)
```

**Gear‑Schema:**
```json
{
  "id": "iron_sword",
  "name": "Eisenschwert",
  "type": "gear",
  "gearSlot": "weapon",
  "stackSize": 1,
  "baseValue": 12,
  "statBonuses": { "atk": 3, "def": 0, "hp": 0, "spd": 0, "critChance": 0 },
  "tags": ["gear", "weapon", "melee"]
}
```

**MVP‑Gear‑Items (6 Stück):**

**Waffen (weapon slot):**
```json
[
  {
    "id": "iron_sword",
    "name": "Eisenschwert",
    "type": "gear",
    "gearSlot": "weapon",
    "stackSize": 1,
    "baseValue": 12,
    "statBonuses": { "atk": 3, "def": 0, "hp": 0, "spd": 0, "critChance": 0 },
    "tags": ["gear", "weapon", "melee"]
  },
  {
    "id": "hunter_bow",
    "name": "Jägerbogen",
    "type": "gear",
    "gearSlot": "weapon",
    "stackSize": 1,
    "baseValue": 14,
    "statBonuses": { "atk": 2, "def": 0, "hp": 0, "spd": 0.1, "critChance": 0.05 },
    "tags": ["gear", "weapon", "ranged"]
  },
  {
    "id": "oak_staff",
    "name": "Eichenstab",
    "type": "gear",
    "gearSlot": "weapon",
    "stackSize": 1,
    "baseValue": 10,
    "statBonuses": { "atk": 1, "def": 0, "hp": 5, "spd": 0, "critChance": 0 },
    "tags": ["gear", "weapon", "magic"]
  }
]
```

**Rüstungen (armor slot):**
```json
[
  {
    "id": "leather_armor",
    "name": "Lederrüstung",
    "type": "gear",
    "gearSlot": "armor",
    "stackSize": 1,
    "baseValue": 10,
    "statBonuses": { "atk": 0, "def": 2, "hp": 5, "spd": 0, "critChance": 0 },
    "tags": ["gear", "armor", "light"]
  },
  {
    "id": "iron_shield",
    "name": "Eisenschild",
    "type": "gear",
    "gearSlot": "armor",
    "stackSize": 1,
    "baseValue": 15,
    "statBonuses": { "atk": 0, "def": 4, "hp": 0, "spd": -0.05, "critChance": 0 },
    "tags": ["gear", "armor", "heavy"]
  }
]
```

**Trinkets (trinket slot):**
```json
[
  {
    "id": "wolf_fang_necklace",
    "name": "Wolfszahn‑Kette",
    "type": "gear",
    "gearSlot": "trinket",
    "stackSize": 1,
    "baseValue": 18,
    "statBonuses": { "atk": 1, "def": 0, "hp": 0, "spd": 0.05, "critChance": 0.05 },
    "tags": ["gear", "trinket"]
  }
]
```

**Schmiede‑Rezepte (Herstellungsweg, bereits in 8.3.12 definiert):**
- `iron_sword`: 2× `iron_scrap` + 1× `wood` → 25s
- `iron_shield`: 2× `iron_scrap` + 1× `wood` → 25s
- `leather_armor`: 1× `iron_scrap` + 2× `wood` → 30s
- `hunter_bow` und `oak_staff`: Post‑MVP (oder als Expedition‑Loot)
- `wolf_fang_necklace`: **nur Expedition‑Loot** (nicht herstellbar)

**Loot‑Drop‑Chance für Gear (in `forest_rare` Table ergänzt, siehe 10.7).**

### 9.11.1 Gear‑Tier‑System (Erweiterte Progression)

**Konzept:** Gear existiert in 4 Qualitätsstufen. Höhere Tiers haben bessere Stats und teils Spezial‑Effekte. Dies verhindert ein frühes Gear‑Plateau und gibt Expeditionen langfristig Relevanz.

| Tier | Name | Verfügbar ab | Quelle | Stat‑Level |
|---|---|---|---|---|
| **T1** | Eisen | Sofort | Schmiede T1 Crafting | Basis |
| **T2** | Stahl | Mid‑Game | Schmiede T2 Crafting (crystal_shard‑basiert) | +50% Stats |
| **T3** | Kristall | Late‑Game | Nur Boss‑Drops + Rare‑Expedition‑Loot | +100% Stats + Spezial‑Effekt |
| **T4** | Legendär | Endgame | Nur Nemesis‑Modifikator‑Runs | +120% Stats + Legendärer Effekt |

**T2 Waffen (Schmiede Tier 2):**
```json
[
  {
    "id": "steel_sword",
    "name": "Stahlschwert",
    "type": "gear", "gearSlot": "weapon", "gearTier": 2, "stackSize": 1, "baseValue": 22,
    "statBonuses": { "atk": 5, "def": 0, "hp": 0, "spd": 0, "critChance": 0 },
    "specialEffect": null,
    "tags": ["gear", "weapon", "melee", "steel"]
  },
  {
    "id": "longbow",
    "name": "Langbogen",
    "type": "gear", "gearSlot": "weapon", "gearTier": 2, "stackSize": 1, "baseValue": 24,
    "statBonuses": { "atk": 3, "def": 0, "hp": 0, "spd": 0.15, "critChance": 0.10 },
    "specialEffect": null,
    "tags": ["gear", "weapon", "ranged", "steel"]
  },
  {
    "id": "crystal_staff",
    "name": "Kristallstab",
    "type": "gear", "gearSlot": "weapon", "gearTier": 2, "stackSize": 1, "baseValue": 20,
    "statBonuses": { "atk": 2, "def": 0, "hp": 8, "spd": 0, "critChance": 0 },
    "specialEffect": { "type": "heal_boost", "value": 0.20, "description": "Heilungen +20% stärker" },
    "tags": ["gear", "weapon", "magic", "steel"]
  }
]
```

**T2 Rüstungen (Schmiede Tier 2):**
```json
[
  {
    "id": "steel_armor",
    "name": "Stahlrüstung",
    "type": "gear", "gearSlot": "armor", "gearTier": 2, "stackSize": 1, "baseValue": 25,
    "statBonuses": { "atk": 0, "def": 5, "hp": 8, "spd": -0.05, "critChance": 0 },
    "specialEffect": null,
    "tags": ["gear", "armor", "heavy", "steel"]
  },
  {
    "id": "ranger_cloak",
    "name": "Waldläufer‑Mantel",
    "type": "gear", "gearSlot": "armor", "gearTier": 2, "stackSize": 1, "baseValue": 20,
    "statBonuses": { "atk": 1, "def": 2, "hp": 3, "spd": 0.10, "critChance": 0 },
    "specialEffect": null,
    "tags": ["gear", "armor", "light", "steel"]
  }
]
```

**T2 Trinkets:**
```json
[
  {
    "id": "crystal_pendant",
    "name": "Kristallamulett",
    "type": "gear", "gearSlot": "trinket", "gearTier": 2, "stackSize": 1, "baseValue": 28,
    "statBonuses": { "atk": 2, "def": 1, "hp": 3, "spd": 0, "critChance": 0.08 },
    "specialEffect": null,
    "tags": ["gear", "trinket", "steel"]
  }
]
```

**T2 Crafting‑Rezepte (Schmiede T2):**
```json
[
  { "id": "RCP_STEEL_SWORD", "name": "Stahlschwert schmieden", "inputs": { "iron_scrap": 3, "crystal_shard": 1 }, "outputs": { "steel_sword": 1 }, "cycleTimeSec": 35, "requirements": { "minBuildingTier": 2 } },
  { "id": "RCP_LONGBOW", "name": "Langbogen fertigen", "inputs": { "iron_scrap": 2, "wood": 2, "crystal_shard": 1 }, "outputs": { "longbow": 1 }, "cycleTimeSec": 35, "requirements": { "minBuildingTier": 2 } },
  { "id": "RCP_CRYSTAL_STAFF", "name": "Kristallstab formen", "inputs": { "iron_scrap": 1, "crystal_shard": 2 }, "outputs": { "crystal_staff": 1 }, "cycleTimeSec": 40, "requirements": { "minBuildingTier": 2 } },
  { "id": "RCP_STEEL_ARMOR", "name": "Stahlrüstung schmieden", "inputs": { "iron_scrap": 3, "crystal_shard": 1 }, "outputs": { "steel_armor": 1 }, "cycleTimeSec": 40, "requirements": { "minBuildingTier": 2 } },
  { "id": "RCP_RANGER_CLOAK", "name": "Waldläufer‑Mantel nähen", "inputs": { "wood": 2, "iron_scrap": 1, "herb_green": 1 }, "outputs": { "ranger_cloak": 1 }, "cycleTimeSec": 30, "requirements": { "minBuildingTier": 2 } },
  { "id": "RCP_CRYSTAL_PENDANT", "name": "Kristallamulett schleifen", "inputs": { "crystal_shard": 2, "talisman_fragment": 1 }, "outputs": { "crystal_pendant": 1 }, "cycleTimeSec": 35, "requirements": { "minBuildingTier": 2 } }
]
```

**T3 Boss‑Drop Gear (nicht craftbar):**
```json
[
  {
    "id": "treant_heartwood_shield",
    "name": "Treant‑Herzholz‑Schild",
    "type": "gear", "gearSlot": "armor", "gearTier": 3, "stackSize": 1, "baseValue": 40,
    "statBonuses": { "atk": 0, "def": 3, "hp": 12, "spd": 0, "critChance": 0 },
    "specialEffect": { "type": "regen", "value": 2, "description": "Regeneriert +2 HP pro Runde" },
    "dropSource": "BOSS_ELDER_TREANT", "dropChance": 0.15,
    "tags": ["gear", "armor", "boss_drop", "nature"]
  },
  {
    "id": "crystal_golem_core",
    "name": "Kristallgolem‑Kern",
    "type": "gear", "gearSlot": "trinket", "gearTier": 3, "stackSize": 1, "baseValue": 45,
    "statBonuses": { "atk": 2, "def": 3, "hp": 5, "spd": 0, "critChance": 0 },
    "specialEffect": { "type": "aoe_resist", "value": 0.25, "description": "25% weniger AoE‑Schaden" },
    "dropSource": "BOSS_CRYSTAL_GOLEM", "dropChance": 0.15,
    "tags": ["gear", "trinket", "boss_drop", "crystal"]
  },
  {
    "id": "hydra_venomfang",
    "name": "Hydra‑Giftzahn",
    "type": "gear", "gearSlot": "weapon", "gearTier": 3, "stackSize": 1, "baseValue": 50,
    "statBonuses": { "atk": 7, "def": 0, "hp": 0, "spd": 0, "critChance": 0.05 },
    "specialEffect": { "type": "lifesteal", "value": 1, "description": "Jeder Angriff heilt 1 HP" },
    "dropSource": "BOSS_SWAMP_HYDRA", "dropChance": 0.15,
    "tags": ["gear", "weapon", "boss_drop", "poison"]
  },
  {
    "id": "bandit_kings_cloak",
    "name": "Banditenkönigs‑Umhang",
    "type": "gear", "gearSlot": "armor", "gearTier": 3, "stackSize": 1, "baseValue": 42,
    "statBonuses": { "atk": 0, "def": 1, "hp": 0, "spd": 0.15, "critChance": 0.15 },
    "specialEffect": null,
    "dropSource": "BOSS_BANDIT_CHIEF", "dropChance": 0.15,
    "tags": ["gear", "armor", "boss_drop", "stealth"]
  },
  {
    "id": "spider_silk_vest",
    "name": "Spinnenseiden‑Weste",
    "type": "gear", "gearSlot": "armor", "gearTier": 3, "stackSize": 1, "baseValue": 44,
    "statBonuses": { "atk": 0, "def": 3, "hp": 5, "spd": 0.10, "critChance": 0 },
    "specialEffect": { "type": "dodge", "value": 0.10, "description": "10% Chance Angriff komplett auszuweichen" },
    "dropSource": "BOSS_SPIDER_QUEEN", "dropChance": 0.15,
    "tags": ["gear", "armor", "boss_drop"]
  },
  {
    "id": "fallen_knights_blade",
    "name": "Klinge des Gefallenen",
    "type": "gear", "gearSlot": "weapon", "gearTier": 3, "stackSize": 1, "baseValue": 48,
    "statBonuses": { "atk": 6, "def": 2, "hp": 0, "spd": 0, "critChance": 0 },
    "specialEffect": { "type": "anti_heal", "value": 1, "description": "Getroffene Gegner können 1 Runde nicht geheilt werden" },
    "dropSource": "BOSS_FALLEN_KNIGHT", "dropChance": 0.15,
    "tags": ["gear", "weapon", "boss_drop", "undead"]
  },
  {
    "id": "lich_phylactery",
    "name": "Phylakterium des Lichs",
    "type": "gear", "gearSlot": "trinket", "gearTier": 3, "stackSize": 1, "baseValue": 55,
    "statBonuses": { "atk": 4, "def": 0, "hp": 0, "spd": 0.10, "critChance": 0.10 },
    "specialEffect": { "type": "spell_power", "value": 0.20, "description": "Skill‑Schaden +20%" },
    "dropSource": "BOSS_SHADOW_LICH", "dropChance": 0.15,
    "tags": ["gear", "trinket", "boss_drop", "magic"]
  },
  {
    "id": "wyrm_scale_shield",
    "name": "Wyrmschuppen‑Schild",
    "type": "gear", "gearSlot": "armor", "gearTier": 3, "stackSize": 1, "baseValue": 55,
    "statBonuses": { "atk": 0, "def": 7, "hp": 10, "spd": -0.10, "critChance": 0 },
    "specialEffect": { "type": "fire_resist", "value": 0.30, "description": "30% weniger Feuerschaden" },
    "dropSource": "BOSS_MAGMA_WYRM", "dropChance": 0.15,
    "tags": ["gear", "armor", "boss_drop", "fire"]
  }
]
```

**T4 Legendäres Gear (nur aus Nemesis‑Modifikator‑Runs):**
```json
[
  {
    "id": "blade_of_thousand_shadows",
    "name": "Klinge der tausend Schatten",
    "type": "gear", "gearSlot": "weapon", "gearTier": 4, "stackSize": 1, "baseValue": 80,
    "statBonuses": { "atk": 9, "def": -2, "hp": 0, "spd": 0.10, "critChance": 0.10 },
    "specialEffect": { "type": "double_strike", "cooldownRounds": 3, "description": "Alle 3 Runden Doppelschlag" },
    "tags": ["gear", "weapon", "legendary"]
  },
  {
    "id": "shield_of_the_ancient",
    "name": "Schild des Uralten",
    "type": "gear", "gearSlot": "armor", "gearTier": 4, "stackSize": 1, "baseValue": 85,
    "statBonuses": { "atk": 0, "def": 8, "hp": 15, "spd": -0.10, "critChance": 0 },
    "specialEffect": { "type": "reflect", "value": 0.20, "description": "Reflektiert 20% des eingehenden Schadens" },
    "tags": ["gear", "armor", "legendary"]
  },
  {
    "id": "amulet_of_rebirth",
    "name": "Amulett der Wiedergeburt",
    "type": "gear", "gearSlot": "trinket", "gearTier": 4, "stackSize": 1, "baseValue": 90,
    "statBonuses": { "atk": 0, "def": 0, "hp": 5, "spd": 0.05, "critChance": 0.05 },
    "specialEffect": { "type": "revive", "value": 0.30, "usesPerRun": 1, "description": "Einmal pro Run: Bei 0 HP → auf 30% HP wiederbelebt" },
    "tags": ["gear", "trinket", "legendary"]
  }
]
```

> **Gear‑Progression‑Übersicht:** T1 (6 Items, Schmiede T1) → T2 (6 Items, Schmiede T2) → T3 (8 Items, nur Boss‑Drops, 15% Chance) → T4 (3 Items, nur Nemesis‑Runs). Insgesamt **23 Gear‑Items** über 4 Tiers. Der Spieler hat über Stunden hinweg Gear‑Ziele. T3/T4 sind ausschließlich über Expeditionen erhältlich → Runs behalten dauerhaft Relevanz.

### 9.12 Boss‑System (MVP)
**Konzept:** Bosse sind einzigartige, starke Gegner mit eigenen Skills und garantiertem Loot. Sie erscheinen als **letzter Room** einer Route (wenn `bossId` definiert).

**Boss‑Encounter‑Ablauf:**
1. UI zeigt Boss‑Intro (Name + kurzer Flavor‑Text)
2. Boss spawnt mit **1–2 Adds** aus `enemyPoolIds` der Route
3. Combat läuft wie normal, aber Boss hat:
   - **Mehr HP** (2–3× reguläre Gegner)
   - **Spezial‑Skills** (z.B. AoE, Enrage)
   - **Enrage‑Timer:** Nach **8 Runden** erhält der Boss `+50% ATK` permanent (verhindert endlose Fights)
4. Bei Sieg: **garantierter** 1× `rareLootTableId` + 1× `bossLootTableId`

**Bosse (8 Stück):**

```json
{
  "id": "BOSS_ELDER_TREANT",
  "name": "Uralter Treant",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 80, "atk": 6, "def": 5, "spd": 0.7, "critChance": 0.08, "critMult": 2.0 },
  "initiative": 7,

  "skills": [
    { "id": "ROOT_SLAM", "cooldownRounds": 3, "effect": { "type": "aoe_damage", "mult": 1.2, "targets": "all_enemies" } },
    { "id": "BARK_SHIELD", "cooldownRounds": 5, "effect": { "type": "self_buff", "stat": "def", "value": 3, "durationRounds": 2 } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Die Wurzeln des alten Waldes erheben sich...",
  "tags": ["melee", "boss", "nature"]
}
```


```json
{
  "id": "BOSS_BANDIT_CHIEF",
  "name": "Banditenhauptmann",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 65, "atk": 8, "def": 3, "spd": 1.1, "critChance": 0.15, "critMult": 2.0 },
  "initiative": 11,

  "skills": [
    { "id": "RALLY_CRY", "cooldownRounds": 4, "effect": { "type": "buff_allies", "stat": "atk", "value": 2, "durationRounds": 2, "targets": "all_allies" } },
    { "id": "BACKSTAB", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 2.0, "targetPref": "lowest_hp_pct" } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Er mustert euch kalt. 'Euer Gold oder euer Leben.'",
  "tags": ["melee", "boss", "humanoid"]
}
```

```json
{
  "id": "BOSS_CRYSTAL_GOLEM",
  "name": "Kristallgolem",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 90, "atk": 7, "def": 7, "spd": 0.5, "critChance": 0.06, "critMult": 2.0 },
  "initiative": 5,

  "skills": [
    { "id": "CRYSTAL_BARRAGE", "cooldownRounds": 3, "effect": { "type": "aoe_damage", "mult": 1.3, "targets": "all_enemies" } },
    { "id": "DIAMOND_SHELL", "cooldownRounds": 5, "effect": { "type": "self_buff", "stat": "def", "value": 5, "durationRounds": 2 } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Kristalle brechen aus dem Boden, als der Golem erwacht...",
  "tags": ["melee", "boss", "elemental", "cave"]
}
```

> **Design‑Grund (Crystal Golem):** Extrem hohe DEF (7) + Self‑Buff DIAMOND_SHELL (+5 DEF) machen ihn zum tankigsten Boss. Spieler brauchen hohen ATK (Ranger + Gear) oder müssen den Buff‑Cooldown abwarten. Die langsame SPD (0.5) gibt dem Heiler Zeit. Die AoE (CRYSTAL_BARRAGE, 1.3×) bestraft Gruppen ohne Tank/Taunt.

```json
{
  "id": "BOSS_SWAMP_HYDRA",
  "name": "Sumpfhydra",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 100, "atk": 6, "def": 3, "spd": 0.8, "critChance": 0.10, "critMult": 1.8 },
  "initiative": 8,

  "skills": [
    { "id": "TRIPLE_BITE", "cooldownRounds": 2, "effect": { "type": "aoe_damage", "mult": 1.0, "targets": "all_enemies" } },
    { "id": "REGENERATE", "cooldownRounds": 4, "effect": { "type": "heal", "amount": 12, "target": "self" } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Drei Köpfe erheben sich aus dem trüben Wasser...",
  "tags": ["melee", "boss", "beast", "swamp"]
}
```

> **Design‑Grund (Swamp Hydra):** Höchste HP der Basis‑Bosse (100) + Selbstheilung (REGENERATE +12 HP, CD 4) machen sie zum Ausdauer‑Check. TRIPLE_BITE (AoE, CD 2!) feuert sehr häufig – der Heiler muss konstant arbeiten. Die niedrige DEF (3) belohnt aggressives DPS‑Play. Erfordert Guild Hall T2 (4 Helden) oder perfektes Gear für zuverlässigen Sieg.

```json
{
  "id": "BOSS_SPIDER_QUEEN",
  "name": "Spinnenkönigin",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 75, "atk": 5, "def": 3, "spd": 1.0, "critChance": 0.10, "critMult": 1.8 },
  "initiative": 10,

  "skills": [
    { "id": "SPAWN_BROOD", "cooldownRounds": 4, "effect": { "type": "summon", "summonId": "SUMMON_SPIDER", "count": 2, "summonStats": { "hp": 10, "atk": 4, "def": 0, "spd": 1.2 }, "durationRounds": 3 } },
    { "id": "VENOM_BURST", "cooldownRounds": 3, "effect": { "type": "aoe_damage", "mult": 0.9, "targets": "all_enemies" } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Ein Netz aus Schatten senkt sich herab, als unzählige Augen im Dunkeln aufleuchten...",
  "tags": ["melee", "boss", "beast", "cave"]
}
```

> **Design‑Grund (Spider Queen):** Summon‑Boss – testet AoE‑Fähigkeiten. SPAWN_BROOD (CD 4) ruft 2 Spinnlinge, die 3 Runden kämpfen. Ohne AoE (Hexe, Berserker) werden die Adds zum Problem. Die Queen selbst ist mittel‑stark – der Schwierigkeitstreiber sind die Adds. Idealer „Zwischenboss" für Cave.

```json
{
  "id": "BOSS_FALLEN_KNIGHT",
  "name": "Gefallener Ritter",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 95, "atk": 9, "def": 6, "spd": 0.85, "critChance": 0.10, "critMult": 2.0 },
  "initiative": 8,

  "skills": [
    { "id": "CURSED_BLADE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.8, "bonus": { "type": "anti_heal", "durationRounds": 1 } } },
    { "id": "DARK_RALLY", "cooldownRounds": 5, "effect": { "type": "buff_allies", "stat": "atk", "value": 3, "durationRounds": 2, "targets": "all_allies" } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Eine verrostete Klinge erhebt sich aus dem Sarkophag. Tote Augen glühen auf.",
  "tags": ["melee", "boss", "undead", "ruins"]
}
```

> **Design‑Grund (Fallen Knight):** Anti‑Heal‑Boss. CURSED_BLADE (1.8× + Ziel kann 1 Runde nicht geheilt werden) neutralisiert reine Healer‑Strategien. Extrem hohe DEF (6) + DARK_RALLY (+3 ATK auf Adds) macht ihn zum härtesten einzelnen Zielen. Paladin mit Selbstheilung glänzt hier. Erfordert kreative Team‑Komposition.

```json
{
  "id": "BOSS_SHADOW_LICH",
  "name": "Schattenlich",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 70, "atk": 6, "def": 2, "spd": 1.2, "critChance": 0.12, "critMult": 2.0 },
  "initiative": 12,

  "skills": [
    { "id": "SOUL_DRAIN", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.5, "bonus": { "type": "lifesteal", "value": 0.50 } } },
    { "id": "RAISE_DEAD", "cooldownRounds": 5, "effect": { "type": "summon", "summonId": "SUMMON_SKELETON", "count": 1, "summonStats": { "hp": 15, "atk": 5, "def": 1, "spd": 0.9 }, "durationRounds": 4 } }
  ],

  "enrage": { "afterRounds": 8, "atkMultiplier": 1.5 },
  "flavorText": "Die Luft wird eiskalt. Aus den Schatten formt sich eine Gestalt aus reiner Dunkelheit...",
  "tags": ["ranged", "boss", "undead", "ruins"]
}
```

> **Design‑Grund (Shadow Lich):** Caster‑Boss mit Lifesteal + Summons. SOUL_DRAIN (1.5× damage + 50% davon als Selbstheilung) macht ihn zum zweiten Ausdauer‑Check neben der Hydra. RAISE_DEAD beschwört ein Skelett, das 4 Runden hält. Schnelle SPD (1.2) – er handelt vor den meisten Helden. Niedrige DEF (2) belohnt Burst‑DPS (Assassine, Berserker). Exzellentes Phylakterium‑Trinket als T3‑Drop.

```json
{
  "id": "BOSS_MAGMA_WYRM",
  "name": "Magma‑Wyrm",
  "faction": "enemy",
  "role": "boss",
  "isBoss": true,
  "threatMultiplier": 1.0,

  "stats": { "hp": 130, "atk": 8, "def": 4, "spd": 0.7, "critChance": 0.08, "critMult": 2.0 },
  "initiative": 7,

  "skills": [
    { "id": "INFERNO_BREATH", "cooldownRounds": 2, "effect": { "type": "aoe_damage", "mult": 1.2, "targets": "all_enemies" } },
    { "id": "MOLTEN_ARMOR", "cooldownRounds": 5, "effect": { "type": "self_buff", "stat": "def", "value": 4, "durationRounds": 3 } }
  ],

  "enrage": { "afterRounds": 10, "atkMultiplier": 1.5 },
  "flavorText": "Der Berg bebt. Lava strömt aus Rissen im Stein, als der Wyrm sein Haupt erhebt...",
  "tags": ["melee", "boss", "elemental", "volcano"]
}
```

> **Design‑Grund (Magma Wyrm):** Der ultimative Boss. Höchste HP ALLER Bosse (130), INFERNO_BREATH (AoE, CD 2!) feuert jede zweite Runde – der heftigste konstante AoE‑Druck im Spiel. MOLTEN_ARMOR (+4 DEF für 3 Runden) schützt zusätzlich. Erweiterter Enrage‑Timer (nach Runde 10 statt 8) wegen der höheren HP. Erfordert Level 8+ Helden, T2/T3‑Gear und 4‑Helden‑Party mit starker Heilung. Der Wyrmschuppen‑Schild (T3‑Drop) ist eines der besten Armor‑Items im Spiel.

**Boss‑Loot‑Tables:**
```json
{
  "id": "boss_treant_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard", "amount": [1, 2], "weight": 40 },
    { "itemId": "talisman_fragment", "amount": [1, 1], "weight": 25 },
    { "itemId": "oak_staff", "amount": [1, 1], "weight": 15 },
    { "itemId": "iron_scrap", "amount": [2, 4], "weight": 20 }
  ]
}
```

```json
{
  "id": "boss_bandit_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "gold", "amount": [15, 30], "weight": 30 },
    { "itemId": "iron_sword", "amount": [1, 1], "weight": 20 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 15 },
    { "itemId": "crystal_shard", "amount": [1, 1], "weight": 20 },
    { "itemId": "hunter_bow", "amount": [1, 1], "weight": 15 }
  ]
}
```

```json
{
  "id": "boss_crystal_golem_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard", "amount": [2, 3], "weight": 35 },
    { "itemId": "talisman_fragment", "amount": [1, 2], "weight": 20 },
    { "itemId": "iron_shield", "amount": [1, 1], "weight": 15 },
    { "itemId": "oak_staff", "amount": [1, 1], "weight": 15 },
    { "itemId": "iron_scrap", "amount": [3, 5], "weight": 15 }
  ]
}
```

```json
{
  "id": "boss_swamp_hydra_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "talisman_fragment", "amount": [2, 3], "weight": 30 },
    { "itemId": "crystal_shard", "amount": [1, 2], "weight": 20 },
    { "itemId": "hunter_bow", "amount": [1, 1], "weight": 15 },
    { "itemId": "oak_staff", "amount": [1, 1], "weight": 10 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 10 },
    { "itemId": "gold", "amount": [20, 40], "weight": 15 }
  ]
}
```

**Höhlen‑Loot:**
```json
{
  "id": "cave_basic",
  "rolls": 1,
  "entries": [
    { "itemId": "stone",         "amount": [2, 4], "weight": 25 },
    { "itemId": "iron_scrap",    "amount": [1, 2], "weight": 20 },
    { "itemId": "crystal_shard", "amount": [1, 1], "weight": 12 },
    { "itemId": "gold",          "amount": [4, 10], "weight": 20 },
    { "itemId": "wood",          "amount": [1, 3], "weight": 13 },
    { "itemId": "herb_green",    "amount": [1, 2], "weight": 10 }
  ]
}
```

```json
{
  "id": "cave_rare",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard",      "amount": [1, 2], "weight": 35 },
    { "itemId": "iron_scrap",         "amount": [2, 4], "weight": 20 },
    { "itemId": "talisman_fragment",  "amount": [1, 1], "weight": 15 },
    { "itemId": "iron_shield",        "amount": [1, 1], "weight": 10 },
    { "itemId": "iron_sword",         "amount": [1, 1], "weight": 10 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 10 }
  ]
}
```

> **Design‑Grund (Cave‑Loot):** Die Höhle ist die Hauptquelle für `crystal_shard` (12% basic, 35% rare) und `iron_scrap`. Gear‑Drops fokussieren auf defensive Items (Schild, Schwert).

**Sumpf‑Loot:**
```json
{
  "id": "swamp_basic",
  "rolls": 1,
  "entries": [
    { "itemId": "herb_green",  "amount": [2, 4], "weight": 25 },
    { "itemId": "wood",        "amount": [1, 3], "weight": 18 },
    { "itemId": "gold",        "amount": [4, 12], "weight": 20 },
    { "itemId": "iron_scrap",  "amount": [1, 2], "weight": 15 },
    { "itemId": "grain",       "amount": [1, 3], "weight": 12 },
    { "itemId": "stone",       "amount": [1, 2], "weight": 10 }
  ]
}
```

```json
{
  "id": "swamp_rare",
  "rolls": 1,
  "entries": [
    { "itemId": "talisman_fragment",  "amount": [1, 2], "weight": 25 },
    { "itemId": "crystal_shard",      "amount": [1, 1], "weight": 15 },
    { "itemId": "healing_potion",     "amount": [1, 2], "weight": 15 },
    { "itemId": "hunter_bow",         "amount": [1, 1], "weight": 15 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 15 },
    { "itemId": "oak_staff",          "amount": [1, 1], "weight": 15 }
  ]
}
```

> **Design‑Grund (Swamp‑Loot):** Der Sumpf ist die Hauptquelle für `talisman_fragment` (25% rare) und `herb_green` (25% basic). Die höhere Gold‑Spanne im basic Loot (4–12) belohnt die Schwierigkeit. Rare Drops sind gleichmäßiger verteilt als in anderen Biomen.

**Neue Boss‑Loot‑Tables:**
```json
{
  "id": "boss_spider_queen_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard", "amount": [2, 3], "weight": 30 },
    { "itemId": "spider_silk_vest", "amount": [1, 1], "weight": 15 },
    { "itemId": "iron_scrap", "amount": [3, 5], "weight": 25 },
    { "itemId": "talisman_fragment", "amount": [1, 2], "weight": 15 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 15 }
  ]
}
```

```json
{
  "id": "boss_fallen_knight_loot",
  "rolls": 1,
  "entries": [
    { "itemId": "fallen_knights_blade", "amount": [1, 1], "weight": 15 },
    { "itemId": "crystal_shard", "amount": [2, 3], "weight": 25 },
    { "itemId": "talisman_fragment", "amount": [2, 3], "weight": 20 },
    { "itemId": "iron_scrap", "amount": [3, 5], "weight": 20 },
    { "itemId": "gold", "amount": [20, 40], "weight": 20 }
  ]
}
```

```json
{
  "id": "boss_shadow_lich_loot",
  "rolls": 2,
  "entries": [
    { "itemId": "lich_phylactery", "amount": [1, 1], "weight": 12 },
    { "itemId": "crystal_shard", "amount": [2, 4], "weight": 25 },
    { "itemId": "talisman_fragment", "amount": [2, 3], "weight": 25 },
    { "itemId": "gold", "amount": [30, 50], "weight": 18 },
    { "itemId": "healing_potion", "amount": [2, 3], "weight": 20 }
  ]
}
```

```json
{
  "id": "boss_magma_wyrm_loot",
  "rolls": 2,
  "entries": [
    { "itemId": "wyrm_scale_shield", "amount": [1, 1], "weight": 12 },
    { "itemId": "crystal_shard", "amount": [3, 5], "weight": 25 },
    { "itemId": "talisman_fragment", "amount": [2, 4], "weight": 20 },
    { "itemId": "gold", "amount": [40, 70], "weight": 18 },
    { "itemId": "iron_scrap", "amount": [4, 6], "weight": 15 },
    { "itemId": "healing_potion", "amount": [2, 3], "weight": 10 }
  ]
}
```

**Boss‑Skill‑Effekt‑Typen (Resolver):**
| Effect‑Type | Beschreibung | Auswertung |
|---|---|---|
| `damage` | Einzelziel‑Schaden | `raw = ATK * mult - target.DEF`, min 1 |
| `aoe_damage` | Schaden auf **alle** gegnerischen Units | Für jede Unit: `raw = ATK * mult - target.DEF`, min 1 |
| `self_buff` | Temporärer Stat‑Bonus auf sich selbst | `self.stat += value` für `durationRounds`, dann zurück |
| `buff_allies` | Temporärer Stat‑Bonus auf alle verbündeten Units | Für jede Ally: `ally.stat += value` für `durationRounds` |
| `heal` | Heilung eines Verbündeten | `target.hp += amount`, capped at `maxHP` |
| `taunt` | Zwingt Gegner, den Taunter anzugreifen | `self.tauntActive = true` für `durationRounds` |
| `summon` | Beschwört temporäre Einheiten | `count` Einheiten mit `summonStats` für `durationRounds` |
| `lifesteal` | Schaden + Selbstheilung | `self.hp += damage * value`, capped at `maxHP` |
| `anti_heal` | Blockiert Heilung am Ziel | Ziel kann `durationRounds` Runden nicht geheilt werden |

> Diese Effect‑Types decken **alle** Skills ab (Helden + Monster + Bosse). Ein Agent implementiert einen einzigen `resolveSkillEffect(skill, caster, targets)` Handler.

### 9.13 Routen‑Boss‑Zuordnung (Übersicht)
| Route | Rooms | Boss | Boss‑Loot‑Table | Schwierigkeit | Unlock |
|---|---|---|---|---|---|
| `forest_short` | 6 | keiner | — | ★☆☆☆ Einstieg | Sofort |
| `forest_medium` | 10 | `BOSS_ELDER_TREANT` | `boss_treant_loot` | ★★☆☆ Mittel | Sofort |
| `cave_deep` | 8 | `BOSS_CRYSTAL_GOLEM` | `boss_crystal_golem_loot` | ★★☆☆ Mittel‑Schwer | Sofort |
| `swamp_long` | 12 | `BOSS_SWAMP_HYDRA` | `boss_swamp_hydra_loot` | ★★★☆ Schwer | Sofort |
| `cave_spider` | 8 | `BOSS_SPIDER_QUEEN` | `boss_spider_queen_loot` | ★★★☆ Schwer | Crystal Golem besiegt |
| `ruins_crypts` | 10 | `BOSS_FALLEN_KNIGHT` | `boss_fallen_knight_loot` | ★★★☆ Schwer | Elder Treant + Crystal Golem besiegt |
| `ruins_depths` | 12 | `BOSS_SHADOW_LICH` | `boss_shadow_lich_loot` | ★★★★ Sehr Schwer | Fallen Knight besiegt |
| `volcano_core` | 14 | `BOSS_MAGMA_WYRM` | `boss_magma_wyrm_loot` | ★★★★ Endgame | Swamp Hydra + Fallen Knight besiegt |

> **Progressions‑Pfad:** `forest_short` (Lernen) → `forest_medium`/`cave_deep` (erste Bosse) → `swamp_long`/`cave_spider` (mittelschwer) → `ruins_crypts` (Anti‑Heal) → `ruins_depths` (Caster‑Boss) → `volcano_core` (True Endgame). 8 Routen × 4 Schwierigkeitsstufen × 6 Modifikatoren = **192 verschiedene Run‑Kombinationen**.

### 9.14 Expeditions‑Modifikatoren

**Konzept:** Vor dem Run‑Start kann der Spieler **einen optionalen Modifikator** aktivieren, der Risiko und Belohnung gleichzeitig erhöht. Früher Zugang zum ersten Modifikator (nach 2 Runs) sichert, dass der Spieler schnell Abwechslung erlebt.

**Auswahl‑UI:** Im Gildenhaus, nach Route‑Wahl, vor „Expedition starten": Radio‑Buttons `[Kein Modifikator]` (default) + verfügbare Modifikatoren.

**Modifikatoren (6 Stück):**

| Modifikator | Effekt (Malus) | Effekt (Bonus) | Unlock |
|---|---|---|---|
| **Fluch des Waldes** | Alle Gegner: `+25% ATK` | Loot‑Rolls: `×1.5` (aufgerundet) | 2 Expeditionen abgeschlossen |
| **Eiserne Prüfung** | Alle Gegner: `+30% HP` | Rare‑Loot‑Chance: `+15%` bei `find` Rooms (statt 10% → 25%) | Gilden‑Rang II |
| **Todesmarsch** | Alle Gegner: `+25% ATK` + `+30% HP` kombiniert | Loot‑Rolls: `×2.0`, garantiert 1× `rareLootTableId` am Ende | Gilden‑Rang III |
| **Elitewache** | Jeder Gegner‑Pack: `+1 Gegner` extra | +1 Extra Loot‑Roll pro Combat‑Room | 1 Boss besiegt |
| **Geschwindmarsch** | Max 10 Runden pro Combat (statt 20) | +50% XP für alle Helden | Held Level 5 erreicht |
| **Nemesis** | Bosse: `×2 HP` + zusätzlicher Skill | Boss‑Loot: `3 Rolls` statt 1, garantiert T3‑Gear‑Drop | Alle 8 Bosse besiegt |

**Regeln:**
- Modifikatoren sind **pro Run** aktiv (nicht persistent).
- Max. **1 Modifikator** gleichzeitig.
- Modifikator wird im Run‑State gespeichert (`activeModifier: "curse_of_the_forest" | null`).
- Modifikator‑Effekte werden bei Combat‑Start auf die Gegner‑Stats angewendet (nicht auf Helden).
- Loot‑Multiplikatoren werden auf den `rolls`‑Wert der LootTable angewendet.
- UI zeigt aktiven Modifikator in der Expedition‑Statusleiste: `⚡ Fluch des Waldes aktiv`.

**Modifikator‑Daten:**
```json
[
  {
    "id": "curse_of_the_forest",
    "name": "Fluch des Waldes",
    "description": "Gegner sind stärker (+25% ATK), aber der Loot ist reicher (×1.5).",
    "enemyStatMods": { "atk": 1.25, "hp": 1.0, "def": 1.0 },
    "lootMultiplier": 1.5,
    "rareLootChanceBonus": 0,
    "guaranteedRareLoot": false,
    "unlockCondition": { "expeditionsCompleted": 2 }
  },
  {
    "id": "iron_trial",
    "name": "Eiserne Prüfung",
    "description": "Gegner sind zäher (+30% HP), aber seltene Funde sind häufiger (+15%).",
    "enemyStatMods": { "atk": 1.0, "hp": 1.3, "def": 1.0 },
    "lootMultiplier": 1.0,
    "rareLootChanceBonus": 0.15,
    "guaranteedRareLoot": false,
    "unlockCondition": { "minGuildRank": 2 }
  },
  {
    "id": "death_march",
    "name": "Todesmarsch",
    "description": "Gegner sind deutlich stärker UND zäher, aber der Loot ist massiv gesteigert.",
    "enemyStatMods": { "atk": 1.25, "hp": 1.3, "def": 1.0 },
    "lootMultiplier": 2.0,
    "rareLootChanceBonus": 0,
    "guaranteedRareLoot": true,
    "unlockCondition": { "minGuildRank": 3 }
  },
  {
    "id": "elite_guard",
    "name": "Elitewache",
    "description": "Jeder Gegner‑Pack hat +1 Gegner, aber jeder Kampf gibt einen Extra‑Loot‑Roll.",
    "enemyStatMods": { "atk": 1.0, "hp": 1.0, "def": 1.0 },
    "packSizeBonus": 1,
    "lootMultiplier": 1.0,
    "extraLootRollsPerCombat": 1,
    "rareLootChanceBonus": 0,
    "guaranteedRareLoot": false,
    "unlockCondition": { "bossesDefeatedCount": 1 }
  },
  {
    "id": "speed_march",
    "name": "Geschwindmarsch",
    "description": "Nur 10 Runden pro Kampf, aber +50% XP für alle Helden.",
    "enemyStatMods": { "atk": 1.0, "hp": 1.0, "def": 1.0 },
    "maxRoundsOverride": 10,
    "xpMultiplier": 1.5,
    "lootMultiplier": 1.0,
    "rareLootChanceBonus": 0,
    "guaranteedRareLoot": false,
    "unlockCondition": { "heroLevelReached": 5 }
  },
  {
    "id": "nemesis",
    "name": "Nemesis",
    "description": "Bosse haben doppelte HP und einen zusätzlichen Skill, aber der Boss‑Loot ist massiv (3 Rolls + garantiert T3‑Gear).",
    "enemyStatMods": { "atk": 1.0, "hp": 1.0, "def": 1.0 },
    "bossHpMultiplier": 2.0,
    "bossExtraSkill": true,
    "bossLootRolls": 3,
    "guaranteedBossGearDrop": true,
    "lootMultiplier": 1.0,
    "rareLootChanceBonus": 0,
    "guaranteedRareLoot": false,
    "unlockCondition": { "allBossesDefeated": true }
  }
]
```

### 9.15 Helden‑XP & Level‑System

**Konzept:** Helden sammeln durch Expeditionen Erfahrungspunkte und werden stärker. Das erzeugt eine persönliche Bindung zu jedem Helden und gibt jedem Run einen Sinn – auch bei Niederlagen.

**XP‑Quellen:**
| Aktion | XP |
|---|---|
| Gegner besiegt | +5 XP (aufgeteilt auf alle **lebenden** Helden) |
| Boss besiegt | +25 XP (aufgeteilt auf alle lebenden Helden) |
| Run abgeschlossen | +10 XP Bonus (an alle Party‑Mitglieder) |
| Run mit Modifikator abgeschlossen | +15 XP extra (an alle Party‑Mitglieder) |
| Geschwindmarsch‑Modifikator | Alle XP ×1.5 |

**Level‑Formel:**
```
XP für Level N = 30 + (N-1) × 20
  Level 2:  30 XP  (~3 Runs)
  Level 3:  50 XP  (~5 Runs)
  Level 5:  90 XP  (~9 Runs)
  Level 10: 190 XP (~20 Runs)
  Max: Level 15
```

**Stat‑Boosts pro Level (alle Klassen):**
| Level | Bonus | Meilenstein |
|---|---|---|
| 2 | +2 HP | — |
| 3 | +1 ATK | — |
| 4 | +2 HP, +1 DEF | — |
| 5 | **Skill‑Upgrade** (Skill wird stärker, siehe Klassen‑Tabelle) | Schaltet Geschwindmarsch‑Modifikator frei |
| 6 | +2 HP | — |
| 7 | +1 ATK | — |
| 8 | +2 HP, +1 DEF | — |
| 9 | +0.05 Crit Chance | — |
| 10 | **2. Skill freigeschaltet** (siehe Klassen‑Tabelle) | Großer Power‑Spike |
| 11 | +3 HP | — |
| 12 | +1 ATK, +1 DEF | — |
| 13 | +3 HP | — |
| 14 | +0.05 Crit Chance | — |
| 15 | **Skill‑Upgrade 2** (2. Skill wird stärker) | Max‑Level |

**Skill‑Upgrades & 2. Skills pro Klasse:**
| Klasse | Lv5 Skill‑Upgrade | Lv10 2. Skill |
|---|---|---|
| Guardian | TAUNT: +3 flatThreat (13→16) | **SHIELD_WALL** (CD 4): Alle Allies erhalten 2 Runden +2 DEF |
| Ranger | POWER_SHOT: 1.6× → 1.8× | **MULTISHOT** (CD 4): 0.8× Schaden auf alle Gegner (AoE) |
| Cleric | HEAL_SMALL: 6 HP → 8 HP | **PURIFY** (CD 5): Heilt alle Allies +4 HP + entfernt Debuffs |
| Berserker | RAGE: +50% ATK → +60% ATK | **BLOODLUST** (CD 5): Bei Kill in dieser Runde sofort nochmal handeln |
| Assassine | EXECUTE: 2.5× → 3.0× unter 30% HP | **SHADOW_STEP** (CD 4): 2.0× Schaden, ignoriert DEF komplett |
| Paladin | HOLY_SHIELD: +6 HP → +8 HP | **DIVINE_SMITE** (CD 4): 1.5× Schaden + Heilt 50% des Schadens als HP |
| Barde | WARSONG: +2 ATK → +3 ATK | **INSPIRE** (CD 5): Alle Allies: Cooldowns aller Skills −1 |
| Hexe | CHAIN_LIGHTNING: 1.1× → 1.3× AoE | **HEX** (CD 4): Einzelziel: 1.5× Schaden + Ziel kann 2 Runden keine Skills nutzen |
| Nekromant | RAISE_SKELETON: 12 HP → 16 HP & ATK 4→5 | **DEATH_COIL** (CD 3): 1.4× Schaden + Heilt beschworene Einheiten +5 HP |
| Druide | NATURE_SHIFT: +3 ATK → +4 ATK (Bär) / +5 HP → +6 HP (Baum) | **ENTANGLE** (CD 5): Einzelziel: 1.0× Schaden + Ziel überspringt nächste Runde |

**Design‑Prinzipien:**
- **Jeder Run zählt:** Auch ein gescheiterter Run gibt XP (anteilig für besiegte Gegner).
- **Individuelle Bindung:** Ein Level‑10 Ranger ist nicht austauschbar – der Spieler investiert Stunden.
- **Fighter‑Rücktritt wird zur echten Entscheidung:** Bisher kostet es nur 15 Gold. Mit XP/Levels verliert man einen investierten Helden.
- **Level 5 und 10 als Meilensteine:** Skill‑Upgrades bzw. zweiter Skill sind klare „Wow"‑Momente.

### 9.16 Schwierigkeitsstufen pro Route

**Konzept:** Jede Route kann auf 4 Schwierigkeitsstufen gespielt werden. Höhere Stufen skalieren die Gegner‑Stats und schalten sich durch Abschluss der vorherigen Stufe frei.

| Stufe | Name | Gegner‑Skalierung | Unlock |
|---|---|---|---|
| Normal | ★☆☆☆ | Basis‑Stats | Sofort |
| **Schwer** | ★★☆☆ | +30% HP, +20% ATK, +1 DEF | Route 1× auf Normal abgeschlossen |
| **Alptraum** | ★★★☆ | +60% HP, +40% ATK, +2 DEF, Skills: −1 Cooldown | Route 1× auf Schwer abgeschlossen |
| **Infernal** | ★★★★ | +100% HP, +60% ATK, +3 DEF, Bosse: 3. Skill | Alle Routen auf Alptraum abgeschlossen |

**Regeln:**
- Schwierigkeit wird **pro Route** getrackt (z.B. `forest_short` auf Schwer, `cave_deep` noch Normal).
- Schwierigkeits‑Bonus wird **nach** Modifikator‑Effekten angewendet (multiplikativ).
- Loot skaliert mit: Schwer +20% mehr Gold, Alptraum +50% mehr Gold + +10% Rare‑Chance, Infernal +100% Gold + +25% Rare‑Chance.
- Score‑Multiplikator: Normal ×1.0, Schwer ×1.5, Alptraum ×2.5, Infernal ×4.0.
- UI: Schwierigkeits‑Dropdown im Gildenhaus nach Route‑Wahl.

**Skalierungs‑Formel:**
```
effective_stat = base_stat × modifier_mult × difficulty_mult
```

**Effekt:** 8 Routen × 4 Schwierigkeiten = **32 Challenge‑Levels**. Zusammen mit 6 Modifikatoren: theoretisch **192 einzigartige Run‑Konfigurationen**.

### 9.17 Ehrentafel / Scoreboard

**Konzept:** Im Gildenhaus als Tab „Ehrentafel" – die Gilde dokumentiert ihre besten Heldentaten. Motiviert zur Selbstverbesserung und belohnt optimale Team‑Zusammenstellungen.

**Anzeige‑Ort:** Gildenhaus → Tab „Ehrentafel" (neben Roster, Gear, Training).

**Pro‑Route Bestenliste (Top 5 Runs pro Route):**
| Rang | Party | Runden ges. | Schaden ges. | HP Rest | Gegner | Score | Modifikator |
|---|---|---|---|---|---|---|---|
| 1 | Guardian(Lv7) + Ranger(Lv5) + Cleric(Lv4) | 18 | 247 | 68% | 9/9 | 4.850 | Todesmarsch |
| 2 | Paladin(Lv3) + Hexe(Lv4) + Berserker(Lv3) | 22 | 312 | 31% | 8/9 | 3.200 | Fluch |

**Score‑Formel:**
```
RunScore = (gegnerBesiegt × 100)
         + (bossKill × 500)
         + (teamHpProzentRest × 10)
         + (unverbrauchterProviant × 50)
         - (rundenGesamt × 5)
         × modifikatorMultiplier (1.0 / 1.5 / 2.0 / 2.5 / 1.5 / 3.0)
         × difficultyMultiplier (1.0 / 1.5 / 2.5 / 4.0)
```

**Globale Records (Highlight‑Tafel):**
| Record | Beschreibung | Tracking |
|---|---|---|
| Schnellster Boss‑Kill | Wenigste Runden für einen Boss‑Kampf | `minRoundsForBossKill` |
| Höchster Einzel‑Hit | Größter Einzelschaden in einem Angriff | `maxSingleHitDamage` |
| Meiste Heilung (1 Run) | Meiste HP in einem Run geheilt | `maxHealingInOneRun` |
| Längster perfekter Run | Meiste Rooms mit 100% Team‑HP | `maxRoomsPerfectHp` |
| Meiste Gegner (1 Run) | Meiste besiegte Gegner in einem Run | `maxEnemiesInOneRun` |
| Höchster Gesamt‑Score | Bester Score über alle Runs | `maxTotalScore` |

**Score‑Daten im SaveRoot:**
```json
{
  "scoreboard": {
    "routeHighscores": {
      "forest_short": [
        { "score": 4850, "party": ["HERO_GUARDIAN_Lv7", "HERO_RANGER_Lv5", "HERO_CLERIC_Lv4"], "modifier": "death_march", "difficulty": "hard", "enemiesKilled": 9, "bossKilled": false, "roundsTotal": 18, "teamHpPct": 68, "timestamp": "2026-02-22T14:30:00Z" }
      ]
    },
    "globalRecords": {
      "minRoundsForBossKill": 4,
      "maxSingleHitDamage": 23,
      "maxHealingInOneRun": 87,
      "maxRoomsPerfectHp": 6,
      "maxEnemiesInOneRun": 19,
      "maxTotalScore": 8400
    }
  }
}
```

### 9.18 Wöchentliche Herausforderung

**Konzept:** Alle 7 Tages‑Ticks (= 420s Echtzeit) generiert das Spiel eine **zufällige Herausforderung** mit eingeschränkten Bedingungen und Bonus‑Belohnung.

**Generator:**
```
weeklyChallenge = {
  route: randomRoute(),
  modifier: randomModifier(),
  restriction: randomFrom([
    "Kein Healer",
    "Max 2 Helden",
    "Nur T1‑Gear",
    "Kein Proviant",
    "Nur Melee‑Klassen",
    "Nur Ranged/Magic‑Klassen"
  ]),
  bonusReward: { xpMultiplier: 2.0, lootMultiplier: 2.0, bonusScore: 1000 }
}
```

**UI:** Im Gildenhaus als goldener Banner „Wöchentliche Herausforderung" mit Countdown bis zur nächsten. Bei Abschluss: spezieller Score‑Eintrag mit 🏆‑Icon in der Ehrentafel.

**Design‑Grund:** Selbst wenn der Spieler alles gesehen hat, erzwingt die wöchentliche Herausforderung kreative Team‑Kompositionen. „Kein Healer auf Swamp Long" ist ein völlig anderes Erlebnis.

---

## 10) Items & Datenmodelle (data‑driven, mit Keys)

### 10.1 Item‑Schema (JSON/TS)

**MVP‑Item‑Set (vollständig – alle IDs konsistent mit Rezepten, Loot, Gear & Proviant):**

**Ressourcen:**
```json
[
  { "id": "wood",              "name": "Holz",              "type": "resource",   "stackSize": 100, "baseValue": 1,  "tags": ["material"] },
  { "id": "stone",             "name": "Stein",             "type": "resource",   "stackSize": 100, "baseValue": 2,  "tags": ["material"] },
  { "id": "grain",             "name": "Getreide",          "type": "resource",   "stackSize": 100, "baseValue": 1,  "tags": ["food", "farm"] },
  { "id": "flour",             "name": "Mehl",              "type": "resource",   "stackSize": 100, "baseValue": 2,  "tags": ["food"] },
  { "id": "bread",             "name": "Brot",              "type": "resource",   "stackSize": 100, "baseValue": 5,  "tags": ["food", "provision"] },
  { "id": "gold",              "name": "Gold",              "type": "currency",   "stackSize": 9999,"baseValue": 1,  "tags": ["currency"] },
  { "id": "herb_green",        "name": "Grünes Kraut",      "type": "resource",   "stackSize": 50,  "baseValue": 3,  "tags": ["herb", "provision"] },
  { "id": "crystal_shard",     "name": "Kristallscherbe",   "type": "resource",   "stackSize": 20,  "baseValue": 15, "productionSource": "expedition_only", "tags": ["rare", "magic"] },
  { "id": "iron_scrap",        "name": "Eisenrest",         "type": "resource",   "stackSize": 50,  "baseValue": 5,  "tags": ["rare", "material"] },
  { "id": "talisman_fragment", "name": "Talismanfragment",  "type": "resource",   "stackSize": 20,  "baseValue": 10, "tags": ["rare", "magic"] }
]
```

**Verbrauchsitems (Proviant):**
```json
[
  {
    "id": "healing_potion",
    "name": "Heiltrank",
    "type": "consumable",
    "stackSize": 20,
    "baseValue": 8,
    "use": {
      "scope": "expedition",
      "trigger": "auto_after_room",
      "condition": "any_unit_below_50pct_hp",
      "effects": [{ "type": "heal", "value": 15, "target": "ally_lowest_hp_pct" }]
    },
    "tags": ["consumable", "provision", "heal"]
  },
  {
    "id": "power_bread",
    "name": "Kraft‑Brot",
    "type": "consumable",
    "stackSize": 20,
    "baseValue": 10,
    "use": {
      "scope": "expedition",
      "trigger": "auto_before_first_combat",
      "effects": [{ "type": "party_buff", "stat": "atk", "value": 2, "durationRooms": 3 }]
    },
    "tags": ["consumable", "provision", "buff", "food"]
  }
]
```

> **Hinweis:** `bread` und `herb_green` sind in der Ressourcen‑Liste, werden aber auch als Proviant genutzt (siehe 9.10 Tabelle). `bread` heilt 8 HP, `herb_green` heilt 5 HP – diese Werte stehen in der Proviant‑Mechanik (9.10), nicht am Item selbst. Für die Implementierung: check `tags.includes("provision")` oder eine separate Proviant‑Mapping‑Tabelle.

**Talismane:**
```json
[
  {
    "id": "talisman_fortitude",
    "name": "Talisman der Ausdauer",
    "type": "talisman",
    "stackSize": 1,
    "baseValue": 25,
    "talismanEffect": {
      "scope": "expedition_global",
      "effects": [{ "type": "party_buff", "stat": "hp", "value": 10, "durationRooms": "all" }]
    },
    "craftCost": { "talisman_fragment": 2, "crystal_shard": 1 },
    "tags": ["talisman", "magic"]
  }
]
```

> **Talisman‑Crafting (MVP):** Talismane werden **nicht** in einem Gebäude hergestellt, sondern im **Gildenhaus‑UI** aus Materialien gecraftet (simpel: Button „Talisman herstellen" + Kosten‑Check). Kein Worker nötig, instant.

**Gear‑Items (bereits in 9.11 definiert, hier nur ID‑Referenz):**
- `iron_sword`, `hunter_bow`, `oak_staff` (Waffen)
- `leather_armor`, `iron_shield` (Rüstungen)
- `wolf_fang_necklace` (Trinket)

### 10.2 Building‑Schema (KANONISCH)
> Ziel: Ein Agent soll **nur ein** Building‑Schema implementieren (kein Doppel‑System).

```json
{
  "id": "BAKERY",
  "name": "Bäckerei",
  "tier": 1,
  "category": "refine",
  "footprint": [2, 2],
  "rotations": [0],
  "buildCost": { "wood": 20, "stone": 5 },
  "buildTimeSec": 45,
  "workerSlots": 1,

  "requiresConnectivity": true,
  "storage": { "localOutputBuffer": 10, "localInputBuffer": 10 },

  "recipes": ["RCP_BREAD_1"],
  "radiusEffect": null,
  "housing": null,
  "expeditions": null,
  "training": null,
  "requirements": null,
  "tags": ["food"]
}
```

**Feld‑Semantik (MVP):**
- `footprint: [w,h]` → Tile‑Maß
- `rotations` → MVP immer `[0]`
- `workerSlots` → gleichzeitig zuweisbare Worker (0 = passiv)
- `requiresConnectivity` → Road‑Verbindung zu WAREHOUSE nötig
- `storage.localInputBuffer/localOutputBuffer` → siehe Teil 1, 5.3
- `radiusEffect` → nur für Utility (z.B. WELL)
- `housing` → nur für Housing
- `expeditions` → nur für GUILD_HALL
- `training` → nur für GUILD_HALL
- `requirements` → z.B. `{ "waterSupplied": true }` für Herb Garden
- **Felder auf `null` setzen wenn nicht zutreffend** (nicht weglassen)

### 10.3 Recipe‑Schema (KANONISCH)
```json
{
  "id": "RCP_BREAD_1",
  "name": "Brot backen",
  "cycleTimeSec": 14,
  "inputs": { "flour": 2 },
  "outputs": { "bread": 1 },
  "requirements": {
    "minBuildingTier": 1,
    "requiresSpecialistId": null,
    "waterSupplied": true
  }
}
```

**Hinweis:** Welche Rezepte ein Gebäude kann, steht **am Gebäude** (`recipes: [...]`). Das Rezept enthält nur generische Requirements.

### 10.4 Class/Unit‑Schema (Helden & Gegner kompatibel)

**Guardian:**
```json
{
  "id": "HERO_GUARDIAN",
  "name": "Wächter",
  "faction": "hero",
  "role": "tank",
  "isBoss": false,
  "threatMultiplier": 1.5,
  "stats": { "hp": 30, "atk": 3, "def": 4, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [
    { "id": "TAUNT", "cooldownRounds": 3, "effect": { "type": "taunt", "taunt": true, "durationRounds": 2, "flatThreat": 10 } }
  ],
  "enrage": null,
  "tags": ["melee"]
}
```

**Ranger:**
```json
{
  "id": "HERO_RANGER",
  "name": "Waldläufer",
  "faction": "hero",
  "role": "dps",
  "isBoss": false,
  "threatMultiplier": 1.0,
  "stats": { "hp": 22, "atk": 6, "def": 1, "spd": 1.15, "critChance": 0.10, "critMult": 1.5 },
  "initiative": 12,
  "skills": [
    { "id": "POWER_SHOT", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.6 } }
  ],
  "enrage": null,
  "tags": ["ranged"]
}
```

**Cleric:**
```json
{
  "id": "HERO_CLERIC",
  "name": "Klerikerin",
  "faction": "hero",
  "role": "healer",
  "isBoss": false,
  "threatMultiplier": 1.0,
  "stats": { "hp": 24, "atk": 2, "def": 2, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [
    { "id": "HEAL_SMALL", "cooldownRounds": 2, "effect": { "type": "heal", "amount": 6, "target": "ally_lowest_hp_pct" } }
  ],
  "enrage": null,
  "tags": ["support"]
}
```

---

**7 freispielbare Klassen (Unlock durch Spielfortschritt):**

**Berserker:**
```json
{
  "id": "HERO_BERSERKER",
  "name": "Berserker",
  "faction": "hero",
  "role": "dps",
  "isBoss": false,
  "threatMultiplier": 1.2,
  "stats": { "hp": 28, "atk": 7, "def": 2, "spd": 1.1, "critChance": 0.12, "critMult": 1.8 },
  "initiative": 11,
  "skills": [
    { "id": "RAGE", "cooldownRounds": 4, "effect": { "type": "buff_self", "statMods": { "atk": 1.5 }, "durationRounds": 2 } }
  ],
  "enrage": null,
  "tags": ["melee"],
  "unlockCondition": { "bossesDefeated": ["BOSS_ELDER_TREANT"] }
}
```

> **Design‑Grund (Berserker):** Reiner Schadensfokus – RAGE gibt +50% ATK für 2 Runden. Hohe Crit‑Chance (12%) und Crit‑Mult (1.8×) machen jeden Angriff zum Glücksspiel. Fragiler als der Guardian (28 HP, 2 DEF), brilliert mit Tank‑Support.

**Assassine:**
```json
{
  "id": "HERO_ASSASSIN",
  "name": "Assassine",
  "faction": "hero",
  "role": "dps",
  "isBoss": false,
  "threatMultiplier": 0.8,
  "stats": { "hp": 18, "atk": 8, "def": 0, "spd": 1.4, "critChance": 0.20, "critMult": 2.0 },
  "initiative": 14,
  "skills": [
    { "id": "EXECUTE", "cooldownRounds": 4, "effect": { "type": "damage", "mult": 2.5, "conditional": "target_below_30pct_hp" } }
  ],
  "enrage": null,
  "tags": ["melee"],
  "unlockCondition": { "bossesDefeated": ["BOSS_BANDIT_CHIEF"] }
}
```

> **Design‑Grund (Assassine):** Glaskanone mit höchstem ATK (8) und 20% Crit (2.0× Mult). EXECUTE ist der stärkste Single‑Target‑Skill im Spiel (2.5× unter 30% HP). Braucht aber zwingend Tank‑Schutz (18 HP, 0 DEF). Niedrige Threat (×0.8) hilft beim Überleben.

**Paladin:**
```json
{
  "id": "HERO_PALADIN",
  "name": "Paladin",
  "faction": "hero",
  "role": "tank",
  "isBoss": false,
  "threatMultiplier": 1.3,
  "stats": { "hp": 32, "atk": 4, "def": 4, "spd": 0.9, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 9,
  "skills": [
    { "id": "HOLY_SHIELD", "cooldownRounds": 3, "effect": { "type": "heal", "amount": 6, "target": "self" } }
  ],
  "enrage": null,
  "tags": ["melee", "support"],
  "unlockCondition": { "heroLevelReached": 5, "classRequired": "HERO_GUARDIAN" }
}
```

> **Design‑Grund (Paladin):** Tanky Hybrid – kann sich selbst heilen (6 HP alle 3 Runden), was ihn unabhängig vom Cleric macht. Unlock erfordert einen Level‑5 Guardian, was den Spieler zwingt, erst den Guardian zu meistern. Ersetzt den Guardian nicht (keine TAUNT), sondern ergänzt ihn.

**Barde:**
```json
{
  "id": "HERO_BARD",
  "name": "Barde",
  "faction": "hero",
  "role": "support",
  "isBoss": false,
  "threatMultiplier": 0.9,
  "stats": { "hp": 20, "atk": 3, "def": 1, "spd": 1.1, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 11,
  "skills": [
    { "id": "WARSONG", "cooldownRounds": 3, "effect": { "type": "buff_allies", "statMods": { "atk": 2 }, "durationRounds": 2 } }
  ],
  "enrage": null,
  "tags": ["ranged", "support"],
  "unlockCondition": { "expeditionsCompleted": 10 }
}
```

> **Design‑Grund (Barde):** Team‑Buffer statt Healer. WARSONG gibt +2 ATK für alle Allies, was besonders mit Berserker oder Assassine extrem stark skaliert. Fragil (20 HP, 1 DEF), aber ranged und niedrige Threat (0.9). Unlock nach 10 Expeditionen = natürlicher Zeitpunkt, an dem der Spieler mehr Team‑Synergie sucht.

**Hexe:**
```json
{
  "id": "HERO_WITCH",
  "name": "Hexe",
  "faction": "hero",
  "role": "dps",
  "isBoss": false,
  "threatMultiplier": 1.0,
  "stats": { "hp": 19, "atk": 5, "def": 0, "spd": 1.2, "critChance": 0.08, "critMult": 1.6 },
  "initiative": 12,
  "skills": [
    { "id": "CHAIN_LIGHTNING", "cooldownRounds": 3, "effect": { "type": "aoe_damage", "mult": 1.1, "targets": "all_enemies" } }
  ],
  "enrage": null,
  "tags": ["ranged", "magic"],
  "unlockCondition": { "bossesDefeated": ["BOSS_CRYSTAL_GOLEM"] }
}
```

> **Design‑Grund (Hexe):** AoE‑Spezialistin – CHAIN_LIGHTNING (1.1× auf ALLE Gegner) ist der beste Skill gegen große Packs. Schwache Defensive (19 HP, 0 DEF), braucht Tank‑Schutz. Unlock über Crystal Golem = der Spieler braucht AoE, nachdem er den Tank‑Boss gemeistert hat.

**Nekromant:**
```json
{
  "id": "HERO_NECROMANCER",
  "name": "Nekromant",
  "faction": "hero",
  "role": "summoner",
  "isBoss": false,
  "threatMultiplier": 0.8,
  "stats": { "hp": 20, "atk": 4, "def": 1, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [
    { "id": "RAISE_SKELETON", "cooldownRounds": 5, "effect": { "type": "summon", "summonId": "SUMMON_SKELETON", "summonStats": { "hp": 12, "atk": 4, "def": 1, "spd": 1.0 }, "maxSummons": 2 } }
  ],
  "enrage": null,
  "tags": ["ranged", "magic"],
  "unlockCondition": { "bossesDefeated": ["BOSS_SHADOW_LICH"] }
}
```

> **Design‑Grund (Nekromant):** Einzige Summoner‑Klasse – erschafft Skelette als Tankfutter. Max 2 Skelette gleichzeitig. Langer Cooldown (5 Runden) verhindert Spam. Unlock über Schattenlich = thematisch perfekt. Skelette haben eigene Stats und handeln als eigene Einheiten.

**Druide:**
```json
{
  "id": "HERO_DRUID",
  "name": "Druide",
  "faction": "hero",
  "role": "hybrid",
  "isBoss": false,
  "threatMultiplier": 1.0,
  "stats": { "hp": 25, "atk": 4, "def": 2, "spd": 1.0, "critChance": 0.06, "critMult": 1.5 },
  "initiative": 10,
  "skills": [
    { "id": "NATURE_SHIFT", "cooldownRounds": 3, "effect": { "type": "buff_self", "modes": { "bear": { "atk": 3, "def": -1 }, "tree": { "hp_heal": 5, "def": 2, "atk": -2 } }, "durationRounds": 2 } }
  ],
  "enrage": null,
  "tags": ["melee", "magic"],
  "unlockCondition": { "bossesDefeated": ["BOSS_ELDER_TREANT", "BOSS_SWAMP_HYDRA"] }
}
```

> **Design‑Grund (Druide):** Shapeshifter – wechselt zwischen Bärenform (+3 ATK) und Baumform (+5 HP Heal, +2 DEF). Vielseitigste Klasse im Spiel. Unlock erfordert 2 Boss‑Kills = Spätphasen‑Belohnung. Nie der Beste in einer Rolle, aber extrem flexibel.

---

**Klassen‑Unlock‑Übersicht (10 Klassen):**

| Klasse | Rolle | Unlock‑Bedingung | Design‑Nische |
|---|---|---|---|
| Guardian | Tank | Sofort | Provoziert, schützt Team |
| Ranger | DPS | Sofort | Ranged Single‑Target |
| Cleric | Healer | Sofort | Team‑Heilung |
| Berserker | DPS | Elder Treant besiegt | ATK‑Buff, hohe Crits |
| Assassine | DPS | Banditenhauptmann besiegt | Execute, Glaskanone |
| Paladin | Tank | Guardian Level 5 | Self‑Heal Tank |
| Barde | Support | 10 Expeditionen | Team‑ATK‑Buffer |
| Hexe | DPS | Kristallgolem besiegt | AoE‑Spezialistin |
| Nekromant | Summoner | Schattenlich besiegt | Beschwört Skelette |
| Druide | Hybrid | Treant + Hydra besiegt | Shapeshifter, flexibel |

**Auswertung (MVP):**
- `attackCooldownSec = timings.baseAttackCooldownSec / stats.spd`
- `timeToEngageSec = timings.baseEngageSec / stats.spd`
- `role: "dps"` → Target = niedrigste HP%
- `role: "healer"` → Target = Ally niedrigste HP%, Threat = `healAmount * 0.25`
- `role: "tank"` → Default Target, Threat × 1.5

### 10.5 Expedition‑Schema
Siehe 9.2 für die vollständigen Route‑Definitionen.

Erweitertes Schema mit Boss‑Support:
```json
{
  "id": "forest_medium",
  "name": "Tiefer Wald",
  "rooms": 10,
  "biome": "forest",
  "encounterWeights": { "combat": 45, "find": 15, "hazard": 15, "rest": 10, "merchant": 5, "survivor": 5, "boss": 5 },
  "enemyPoolIds": ["..."],
  "combatPackTemplates": ["..."],
  "bossId": "BOSS_ELDER_TREANT",
  "bossLootTableId": "boss_treant_loot",
  "lootTableId": "forest_basic",
  "rareLootTableId": "forest_rare"
}
```

> **Hinweis:** `"boss"` in `encounterWeights` wird **ignoriert** für Room‑Generation (der Boss kommt immer als letzter Room). Der Wert ist nur für potenzielle Mid‑Run‑Mini‑Bosse (Post‑MVP).

### 10.6 Enemy‑Units (MVP – 36 reguläre Gegner + 8 Bosse)

> Alle Gegner nutzen **dasselbe Schema** wie Helden (`faction: "enemy"`).

**Originale 3 Gegner:**

```json
{
  "id": "ENEMY_FOREST_WOLF",
  "name": "Waldwolf",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 18, "atk": 5, "def": 1, "spd": 1.2, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 12,
  "skills": [{ "id": "FERAL_BITE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.4 } }],
  "enrage": null,
  "tags": ["melee", "beast"]
}
```

```json
{
  "id": "ENEMY_BANDIT_RAIDER",
  "name": "Bandit",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 26, "atk": 4, "def": 2, "spd": 1.0, "critChance": 0.06, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "DIRTY_STRIKE", "cooldownRounds": 4, "effect": { "type": "damage", "mult": 1.6 } }],
  "enrage": null,
  "tags": ["melee", "humanoid"]
}
```

```json
{
  "id": "ENEMY_CAVE_SLIME",
  "name": "Höhlenschleim",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 34, "atk": 3, "def": 3, "spd": 0.8, "critChance": 0.03, "critMult": 1.5 },
  "initiative": 8,
  "skills": [{ "id": "SLIME_SMASH", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.5 } }],
  "enrage": null,
  "tags": ["melee", "ooze"]
}
```

**10 neue Gegner:**

```json
{
  "id": "ENEMY_THORN_SPRITE",
  "name": "Dornengeist",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 14, "atk": 4, "def": 0, "spd": 1.4, "critChance": 0.12, "critMult": 1.8 },
  "initiative": 14,
  "skills": [{ "id": "THORN_VOLLEY", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.3 } }],
  "enrage": null,
  "tags": ["ranged", "fey"]
}
```

```json
{
  "id": "ENEMY_FUNGAL_CREEPER",
  "name": "Pilzkriecher",
  "faction": "enemy", "role": "debuffer", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 22, "atk": 3, "def": 2, "spd": 0.9, "critChance": 0.04, "critMult": 1.5 },
  "initiative": 9,
  "skills": [{ "id": "SPORE_CLOUD", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 0.8, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "fungus"]
}
```

```json
{
  "id": "ENEMY_SHADOW_BAT",
  "name": "Schattenfledermaus",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 12, "atk": 5, "def": 0, "spd": 1.5, "critChance": 0.10, "critMult": 1.6 },
  "initiative": 15,
  "skills": [{ "id": "SONIC_SCREECH", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 0.6, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "beast", "flying"]
}
```

```json
{
  "id": "ENEMY_MOSS_GOLEM",
  "name": "Moosgolem",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 42, "atk": 4, "def": 5, "spd": 0.6, "critChance": 0.02, "critMult": 1.5 },
  "initiative": 6,
  "skills": [{ "id": "GROUND_POUND", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 1.0, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "elemental"]
}
```

```json
{
  "id": "ENEMY_VENOMFANG_SPIDER",
  "name": "Giftzahnspinne",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 20, "atk": 6, "def": 1, "spd": 1.1, "critChance": 0.08, "critMult": 1.7 },
  "initiative": 11,
  "skills": [{ "id": "VENOM_BITE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.5 } }],
  "enrage": null,
  "tags": ["melee", "beast", "poison"]
}
```

```json
{
  "id": "ENEMY_GOBLIN_SCOUT",
  "name": "Goblin‑Späher",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 15, "atk": 4, "def": 1, "spd": 1.3, "critChance": 0.10, "critMult": 1.6 },
  "initiative": 13,
  "skills": [{ "id": "QUICK_STAB", "cooldownRounds": 2, "effect": { "type": "damage", "mult": 1.2 } }],
  "enrage": null,
  "tags": ["melee", "humanoid"]
}
```

```json
{
  "id": "ENEMY_WILD_BOAR",
  "name": "Wildschwein",
  "faction": "enemy", "role": "charger", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 28, "atk": 5, "def": 2, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "CHARGE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.8 } }],
  "enrage": null,
  "tags": ["melee", "beast"]
}
```

```json
{
  "id": "ENEMY_HOLLOW_SHADE",
  "name": "Hohlschatten",
  "faction": "enemy", "role": "assassin", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 16, "atk": 7, "def": 0, "spd": 1.4, "critChance": 0.15, "critMult": 2.0 },
  "initiative": 14,
  "skills": [{ "id": "SHADOW_STRIKE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.8, "targetPref": "lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["melee", "undead"]
}
```

```json
{
  "id": "ENEMY_BRAMBLE_BEAR",
  "name": "Dornenbär",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 38, "atk": 5, "def": 3, "spd": 0.85, "critChance": 0.04, "critMult": 1.5 },
  "initiative": 8,
  "skills": [{ "id": "MAUL", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.6 } }],
  "enrage": null,
  "tags": ["melee", "beast"]
}
```

```json
{
  "id": "ENEMY_CURSED_WISP",
  "name": "Verfluchtes Irrlicht",
  "faction": "enemy", "role": "support", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 10, "atk": 2, "def": 0, "spd": 1.3, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 13,
  "skills": [{ "id": "HEAL_ALLY", "cooldownRounds": 3, "effect": { "type": "heal", "amount": 8, "target": "ally_lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["ranged", "undead", "support"]
}
```

**Höhlen‑Gegner (5 neue, Biom: Cave):**

```json
{
  "id": "ENEMY_CRYSTAL_BEETLE",
  "name": "Kristallkäfer",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 16, "atk": 5, "def": 3, "spd": 1.1, "critChance": 0.08, "critMult": 1.6 },
  "initiative": 11,
  "skills": [{ "id": "CRYSTAL_CHARGE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.5 } }],
  "enrage": null,
  "tags": ["melee", "beast", "cave"]
}
```

```json
{
  "id": "ENEMY_DEEP_CRAWLER",
  "name": "Tiefenkriecher",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 24, "atk": 5, "def": 2, "spd": 0.9, "critChance": 0.06, "critMult": 1.5 },
  "initiative": 9,
  "skills": [{ "id": "TUNNEL_AMBUSH", "cooldownRounds": 4, "effect": { "type": "damage", "mult": 1.7 } }],
  "enrage": null,
  "tags": ["melee", "beast", "cave"]
}
```

```json
{
  "id": "ENEMY_MINE_SPECTER",
  "name": "Minengespenst",
  "faction": "enemy", "role": "assassin", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 13, "atk": 8, "def": 0, "spd": 1.5, "critChance": 0.14, "critMult": 2.0 },
  "initiative": 15,
  "skills": [{ "id": "SPECTRAL_SLASH", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.8, "targetPref": "lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["melee", "undead", "cave"]
}
```

```json
{
  "id": "ENEMY_STALACTITE_BAT",
  "name": "Tropfsteinfledermaus",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 11, "atk": 4, "def": 0, "spd": 1.6, "critChance": 0.10, "critMult": 1.5 },
  "initiative": 16,
  "skills": [{ "id": "DIVE_BOMB", "cooldownRounds": 2, "effect": { "type": "damage", "mult": 1.4 } }],
  "enrage": null,
  "tags": ["melee", "beast", "flying", "cave"]
}
```

```json
{
  "id": "ENEMY_MAGMA_SLUG",
  "name": "Magmaschnecke",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 36, "atk": 4, "def": 4, "spd": 0.5, "critChance": 0.03, "critMult": 1.5 },
  "initiative": 5,
  "skills": [{ "id": "LAVA_SPIT", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 0.9, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["ranged", "elemental", "cave"]
}
```

**Sumpf‑Gegner (6 neue, Biom: Swamp):**

```json
{
  "id": "ENEMY_BOG_WITCH",
  "name": "Moorhexe",
  "faction": "enemy", "role": "support", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 18, "atk": 3, "def": 1, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "DARK_MEND", "cooldownRounds": 3, "effect": { "type": "heal", "amount": 10, "target": "ally_lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["ranged", "humanoid", "support", "swamp"]
}
```

> **Hinweis (Bog Witch):** Wie der Cursed Wisp nutzt die Moorhexe Healer‑Logik für die Gegner‑Seite. Heilt **10 HP** (stärker als der Wisp mit 8), aber längerer CD. Prioritäts‑Kill im Sumpf.

```json
{
  "id": "ENEMY_SWAMP_TROLL",
  "name": "Sumpftroll",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 45, "atk": 5, "def": 4, "spd": 0.55, "critChance": 0.03, "critMult": 1.5 },
  "initiative": 6,
  "skills": [{ "id": "CLUB_SLAM", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 1.1, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "giant", "swamp"]
}
```

```json
{
  "id": "ENEMY_LEECH_SWARM",
  "name": "Blutegelschwarm",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 14, "atk": 6, "def": 0, "spd": 1.3, "critChance": 0.08, "critMult": 1.5 },
  "initiative": 13,
  "skills": [{ "id": "DRAIN_BITE", "cooldownRounds": 2, "effect": { "type": "damage", "mult": 1.3 } }],
  "enrage": null,
  "tags": ["melee", "beast", "swarm", "swamp"]
}
```

```json
{
  "id": "ENEMY_MIRE_PHANTOM",
  "name": "Sumpfphantom",
  "faction": "enemy", "role": "assassin", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 15, "atk": 8, "def": 0, "spd": 1.4, "critChance": 0.15, "critMult": 2.0 },
  "initiative": 14,
  "skills": [{ "id": "PHANTOM_STRIKE", "cooldownRounds": 4, "effect": { "type": "damage", "mult": 2.0, "targetPref": "lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["melee", "undead", "swamp"]
}
```

```json
{
  "id": "ENEMY_TOXIC_TOAD",
  "name": "Giftkröte",
  "faction": "enemy", "role": "debuffer", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 20, "atk": 3, "def": 2, "spd": 0.85, "critChance": 0.04, "critMult": 1.5 },
  "initiative": 8,
  "skills": [{ "id": "POISON_SPRAY", "cooldownRounds": 3, "effect": { "type": "aoe_damage", "mult": 0.7, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["ranged", "beast", "poison", "swamp"]
}
```

```json
{
  "id": "ENEMY_ROT_WALKER",
  "name": "Fäulniswandler",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 28, "atk": 5, "def": 2, "spd": 0.9, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 9,
  "skills": [{ "id": "DECAY_SMASH", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.6 } }],
  "enrage": null,
  "tags": ["melee", "undead", "swamp"]
}
```

**Ruinen‑Gegner (6 neue, Biom: Ruins):**

```json
{
  "id": "ENEMY_SKELETON_WARRIOR",
  "name": "Skelettkrieger",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 22, "atk": 5, "def": 3, "spd": 1.0, "critChance": 0.06, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "BONE_SLASH", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.5 } }],
  "enrage": null,
  "tags": ["melee", "undead", "ruins"]
}
```

```json
{
  "id": "ENEMY_GHOST_MAGE",
  "name": "Geistermagier",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 14, "atk": 6, "def": 0, "spd": 1.3, "critChance": 0.10, "critMult": 1.7 },
  "initiative": 13,
  "skills": [{ "id": "SPIRIT_BOLT", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.4 } }],
  "enrage": null,
  "tags": ["ranged", "undead", "ruins"]
}
```

```json
{
  "id": "ENEMY_STONE_GUARDIAN",
  "name": "Steinwächter",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 40, "atk": 4, "def": 6, "spd": 0.6, "critChance": 0.02, "critMult": 1.5 },
  "initiative": 6,
  "skills": [{ "id": "STONE_SLAM", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 1.0, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "construct", "ruins"]
}
```

```json
{
  "id": "ENEMY_BONE_KNIGHT",
  "name": "Knochenritter",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 30, "atk": 6, "def": 4, "spd": 0.9, "critChance": 0.07, "critMult": 1.6 },
  "initiative": 9,
  "skills": [{ "id": "CURSED_CHARGE", "cooldownRounds": 4, "effect": { "type": "damage", "mult": 1.7 } }],
  "enrage": null,
  "tags": ["melee", "undead", "ruins"]
}
```

```json
{
  "id": "ENEMY_TOMB_HORROR",
  "name": "Grabschrecke",
  "faction": "enemy", "role": "assassin", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 13, "atk": 7, "def": 0, "spd": 1.5, "critChance": 0.16, "critMult": 2.0 },
  "initiative": 15,
  "skills": [{ "id": "DEATH_LUNGE", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.9, "targetPref": "lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["melee", "undead", "ruins"]
}
```

```json
{
  "id": "ENEMY_CURSED_PRIEST",
  "name": "Verwunschener Priester",
  "faction": "enemy", "role": "support", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 16, "atk": 2, "def": 1, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "DARK_PRAYER", "cooldownRounds": 3, "effect": { "type": "heal", "amount": 9, "target": "ally_lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["ranged", "undead", "support", "ruins"]
}
```

> **Hinweis (Ruinen):** Die Ruinen sind ein Undead‑Biom. Steinwächter (Construct) und Knochenritter sind die härtesten regulären Mobs. Verwunschener Priester heilt Gegner (9 HP) – Prioritäts‑Kill wie Moorhexe. Grabschrecke hat den höchsten Crit‑Wert aller regulären Gegner (16%, 2.0×).

**Vulkan‑Gegner (6 neue, Biom: Volcano):**

```json
{
  "id": "ENEMY_LAVA_ELEMENTAL",
  "name": "Lavaelementar",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 35, "atk": 5, "def": 3, "spd": 0.7, "critChance": 0.04, "critMult": 1.5 },
  "initiative": 7,
  "skills": [{ "id": "MAGMA_WAVE", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 1.0, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "elemental", "volcano"]
}
```

```json
{
  "id": "ENEMY_FIRE_BAT",
  "name": "Feuerfledermaus",
  "faction": "enemy", "role": "skirmisher", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 13, "atk": 5, "def": 0, "spd": 1.5, "critChance": 0.10, "critMult": 1.6 },
  "initiative": 15,
  "skills": [{ "id": "FLAME_DIVE", "cooldownRounds": 2, "effect": { "type": "damage", "mult": 1.4 } }],
  "enrage": null,
  "tags": ["melee", "beast", "flying", "volcano"]
}
```

```json
{
  "id": "ENEMY_ASH_GOLEM",
  "name": "Aschegollem",
  "faction": "enemy", "role": "brute", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 44, "atk": 4, "def": 5, "spd": 0.5, "critChance": 0.02, "critMult": 1.5 },
  "initiative": 5,
  "skills": [{ "id": "ASH_SLAM", "cooldownRounds": 4, "effect": { "type": "aoe_damage", "mult": 1.1, "targets": "all_enemies" } }],
  "enrage": null,
  "tags": ["melee", "construct", "volcano"]
}
```

```json
{
  "id": "ENEMY_FLAME_SPIRIT",
  "name": "Flammengeist",
  "faction": "enemy", "role": "assassin", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 15, "atk": 8, "def": 0, "spd": 1.3, "critChance": 0.14, "critMult": 2.0 },
  "initiative": 13,
  "skills": [{ "id": "FIRE_BURST", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.8, "targetPref": "lowest_hp_pct" } }],
  "enrage": null,
  "tags": ["melee", "elemental", "volcano"]
}
```

```json
{
  "id": "ENEMY_OBSIDIAN_CRAB",
  "name": "Obsidiankrabbe",
  "faction": "enemy", "role": "fighter", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 25, "atk": 5, "def": 4, "spd": 0.85, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 8,
  "skills": [{ "id": "SHELL_CRUSH", "cooldownRounds": 3, "effect": { "type": "damage", "mult": 1.6 } }],
  "enrage": null,
  "tags": ["melee", "beast", "volcano"]
}
```

```json
{
  "id": "ENEMY_MAGMA_BROODLING",
  "name": "Magmabrüter",
  "faction": "enemy", "role": "support", "isBoss": false, "threatMultiplier": 1.0,
  "stats": { "hp": 18, "atk": 3, "def": 2, "spd": 1.0, "critChance": 0.05, "critMult": 1.5 },
  "initiative": 10,
  "skills": [{ "id": "FLAME_AURA", "cooldownRounds": 3, "effect": { "type": "buff_allies", "statMods": { "atk": 2 }, "durationRounds": 2 } }],
  "enrage": null,
  "tags": ["ranged", "elemental", "support", "volcano"]
}
```

> **Hinweis (Vulkan):** Der Vulkan ist das härteste Biom. Aschegollem hat die höchsten HP aller regulären Gegner (44 HP, 5 DEF). Flammengeist ist ein brutaler Assassin (8 ATK, 1.8× Mult). Magmabrüter buffed die ATK aller Gegner (+2 ATK) – Prioritäts‑Kill!

**Gegner‑Übersicht (MVP‑Komplett, 36 reguläre + 8 Bosse):**

| ID | Name | Role | HP | ATK | DEF | SPD | Biom | Besonderheit |
|---|---|---|---|---|---|---|---|---|
| ENEMY_FOREST_WOLF | Waldwolf | skirmisher | 18 | 5 | 1 | 1.2 | Forest | Schnell, Feral Bite |
| ENEMY_BANDIT_RAIDER | Bandit | fighter | 26 | 4 | 2 | 1.0 | Forest | Ausgewogen, Dirty Strike |
| ENEMY_CAVE_SLIME | Höhlenschleim | brute | 34 | 3 | 3 | 0.8 | Forest/Cave | Tanky, Slime Smash |
| ENEMY_THORN_SPRITE | Dornengeist | skirmisher | 14 | 4 | 0 | 1.4 | Forest | Glaskanone, hohe Crit |
| ENEMY_FUNGAL_CREEPER | Pilzkriecher | debuffer | 22 | 3 | 2 | 0.9 | Forest/Swamp | AoE‑Schwach‑Schaden |
| ENEMY_SHADOW_BAT | Schattenfledermaus | skirmisher | 12 | 5 | 0 | 1.5 | Forest/Cave | Ultraschnell, AoE‑schwach |
| ENEMY_MOSS_GOLEM | Moosgolem | brute | 42 | 4 | 5 | 0.6 | Forest | Extrem tanky, langsam |
| ENEMY_VENOMFANG_SPIDER | Giftzahnspinne | fighter | 20 | 6 | 1 | 1.1 | Forest | Hoher ATK, Gift‑Thema |
| ENEMY_GOBLIN_SCOUT | Goblin‑Späher | skirmisher | 15 | 4 | 1 | 1.3 | Forest | Schnelle kurze CDs |
| ENEMY_WILD_BOAR | Wildschwein | charger | 28 | 5 | 2 | 1.0 | Forest | Starke Charge (1.8×) |
| ENEMY_HOLLOW_SHADE | Hohlschatten | assassin | 16 | 7 | 0 | 1.4 | Forest/Swamp | Höchster ATK, zielt auf Schwache |
| ENEMY_BRAMBLE_BEAR | Dornenbär | brute | 38 | 5 | 3 | 0.85 | Forest | Schwerer Brocken |
| ENEMY_CURSED_WISP | Verfluchtes Irrlicht | support | 10 | 2 | 0 | 1.3 | Forest | **Heilt Gegner!** Prioritäts‑Kill |
| ENEMY_CRYSTAL_BEETLE | Kristallkäfer | skirmisher | 16 | 5 | 3 | 1.1 | Cave | Hohe DEF für Skirmisher |
| ENEMY_DEEP_CRAWLER | Tiefenkriecher | fighter | 24 | 5 | 2 | 0.9 | Cave | Starker Tunnel Ambush (1.7×) |
| ENEMY_MINE_SPECTER | Minengespenst | assassin | 13 | 8 | 0 | 1.5 | Cave | Glaskanone, zielt Schwache |
| ENEMY_STALACTITE_BAT | Tropfsteinfledermaus | skirmisher | 11 | 4 | 0 | 1.6 | Cave | Schnellster Gegner, Dive Bomb |
| ENEMY_MAGMA_SLUG | Magmaschnecke | brute | 36 | 4 | 4 | 0.5 | Cave | Langsam, AoE Lava Spit |
| ENEMY_BOG_WITCH | Moorhexe | support | 18 | 3 | 1 | 1.0 | Swamp | **Heilt Gegner** (+10 HP), Prioritäts‑Kill |
| ENEMY_SWAMP_TROLL | Sumpftroll | brute | 45 | 5 | 4 | 0.55 | Swamp | Höchste HP (regulär), AoE Club Slam |
| ENEMY_LEECH_SWARM | Blutegelschwarm | skirmisher | 14 | 6 | 0 | 1.3 | Swamp | Hoher ATK, schneller Drain |
| ENEMY_MIRE_PHANTOM | Sumpfphantom | assassin | 15 | 8 | 0 | 1.4 | Swamp | 2.0× Mult auf Schwächste |
| ENEMY_TOXIC_TOAD | Giftkröte | debuffer | 20 | 3 | 2 | 0.85 | Swamp | AoE Poison (häufig, CD 3) |
| ENEMY_ROT_WALKER | Fäulniswandler | fighter | 28 | 5 | 2 | 0.9 | Swamp | Solider Fighter, Decay Smash |
| ENEMY_SKELETON_WARRIOR | Skelettkrieger | fighter | 22 | 5 | 3 | 1.0 | Ruins | Undead Fighter, Bone Slash |
| ENEMY_GHOST_MAGE | Geistermagier | skirmisher | 14 | 6 | 0 | 1.3 | Ruins | Ranged Glaskanone |
| ENEMY_STONE_GUARDIAN | Steinwächter | brute | 40 | 4 | 6 | 0.6 | Ruins | Höchste DEF (regulär), AoE Stone Slam |
| ENEMY_BONE_KNIGHT | Knochenritter | fighter | 30 | 6 | 4 | 0.9 | Ruins | Elite Undead, Cursed Charge (1.7×) |
| ENEMY_TOMB_HORROR | Grabschrecke | assassin | 13 | 7 | 0 | 1.5 | Ruins | Höchste Crit (16%), Death Lunge (1.9×) |
| ENEMY_CURSED_PRIEST | Verw. Priester | support | 16 | 2 | 1 | 1.0 | Ruins | **Heilt Gegner** (+9 HP), Prioritäts‑Kill |
| ENEMY_LAVA_ELEMENTAL | Lavaelementar | brute | 35 | 5 | 3 | 0.7 | Volcano | AoE Magma Wave |
| ENEMY_FIRE_BAT | Feuerfledermaus | skirmisher | 13 | 5 | 0 | 1.5 | Volcano | Ultraschnell, Flame Dive (CD 2) |
| ENEMY_ASH_GOLEM | Aschegollem | brute | 44 | 4 | 5 | 0.5 | Volcano | **Höchste HP (regulär)**, AoE Ash Slam |
| ENEMY_FLAME_SPIRIT | Flammengeist | assassin | 15 | 8 | 0 | 1.3 | Volcano | Brutal (8 ATK, 1.8× Mult) |
| ENEMY_OBSIDIAN_CRAB | Obsidiankrabbe | fighter | 25 | 5 | 4 | 0.85 | Volcano | Hohe DEF, Shell Crush |
| ENEMY_MAGMA_BROODLING | Magmabrüter | support | 18 | 3 | 2 | 1.0 | Volcano | **Buffed Gegner ATK** (+2), Prioritäts‑Kill |
| BOSS_ELDER_TREANT | Uralter Treant | boss | 80 | 6 | 5 | 0.7 | Forest | AoE + Self‑Buff, Enrage 8 |
| BOSS_BANDIT_CHIEF | Banditenhauptmann | boss | 65 | 8 | 3 | 1.1 | Forest | Buff Allies + Backstab, Enrage 8 |
| BOSS_CRYSTAL_GOLEM | Kristallgolem | boss | 90 | 7 | 7 | 0.5 | Cave | Höchste DEF, AoE + Diamond Shell |
| BOSS_SWAMP_HYDRA | Sumpfhydra | boss | 100 | 6 | 3 | 0.8 | Swamp | Höchste HP (Basis), Selbstheilung, häufige AoE |
| BOSS_SPIDER_QUEEN | Spinnenkönigin | boss | 75 | 5 | 3 | 1.0 | Cave | Summon Brood + AoE Gift |
| BOSS_FALLEN_KNIGHT | Gefallener Ritter | boss | 95 | 9 | 6 | 0.85 | Ruins | Anti‑Heal + Dark Rally Buff |
| BOSS_SHADOW_LICH | Schattenlich | boss | 70 | 6 | 2 | 1.2 | Ruins | Lifesteal + Raise Dead Summon |
| BOSS_MAGMA_WYRM | Magma‑Wyrm | boss | 130 | 8 | 4 | 0.7 | Volcano | **Höchste HP gesamt**, AoE (CD 2), Enrage 10 |

### 10.7 LootTable‑Schema (MVP – aktualisiert mit 4 Biomen + Gear‑Drops)

**Wald‑Loot:**
```json
{
  "id": "forest_basic",
  "rolls": 1,
  "entries": [
    { "itemId": "wood",       "amount": [2, 5], "weight": 30 },
    { "itemId": "grain",      "amount": [1, 3], "weight": 18 },
    { "itemId": "stone",      "amount": [1, 2], "weight": 15 },
    { "itemId": "herb_green", "amount": [1, 2], "weight": 10 },
    { "itemId": "gold",       "amount": [3, 8], "weight": 20 },
    { "itemId": "iron_scrap", "amount": [1, 2], "weight": 12 }
  ]
}
```

```json
{
  "id": "forest_rare",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard",      "amount": [1, 1], "weight": 30 },
    { "itemId": "iron_scrap",         "amount": [1, 3], "weight": 25 },
    { "itemId": "talisman_fragment",  "amount": [1, 1], "weight": 15 },
    { "itemId": "herb_green",         "amount": [2, 4], "weight": 10 },
    { "itemId": "wolf_fang_necklace", "amount": [1, 1], "weight": 8 },
    { "itemId": "hunter_bow",         "amount": [1, 1], "weight": 6 },
    { "itemId": "oak_staff",          "amount": [1, 1], "weight": 6 }
  ]
}
```

**Ruinen‑Loot:**
```json
{
  "id": "ruins_basic",
  "rolls": 1,
  "entries": [
    { "itemId": "stone",              "amount": [3, 6], "weight": 25 },
    { "itemId": "iron_scrap",         "amount": [2, 4], "weight": 22 },
    { "itemId": "gold",               "amount": [5, 12], "weight": 20 },
    { "itemId": "crystal_shard",      "amount": [1, 2], "weight": 15 },
    { "itemId": "talisman_fragment",  "amount": [1, 1], "weight": 10 },
    { "itemId": "herb_green",         "amount": [1, 2], "weight": 8 }
  ]
}
```

```json
{
  "id": "ruins_rare",
  "rolls": 1,
  "entries": [
    { "itemId": "crystal_shard",      "amount": [2, 4], "weight": 25 },
    { "itemId": "talisman_fragment",  "amount": [1, 2], "weight": 20 },
    { "itemId": "iron_scrap",         "amount": [3, 6], "weight": 15 },
    { "itemId": "steel_sword",        "amount": [1, 1], "weight": 10 },
    { "itemId": "crystal_staff",      "amount": [1, 1], "weight": 8 },
    { "itemId": "crystal_pendant",    "amount": [1, 1], "weight": 8 },
    { "itemId": "steel_armor",        "amount": [1, 1], "weight": 7 },
    { "itemId": "gold",               "amount": [10, 20], "weight": 7 }
  ]
}
```

**Vulkan‑Loot:**
```json
{
  "id": "volcano_basic",
  "rolls": 1,
  "entries": [
    { "itemId": "stone",              "amount": [4, 8], "weight": 20 },
    { "itemId": "iron_scrap",         "amount": [3, 5], "weight": 22 },
    { "itemId": "gold",               "amount": [8, 15], "weight": 20 },
    { "itemId": "crystal_shard",      "amount": [2, 3], "weight": 18 },
    { "itemId": "talisman_fragment",  "amount": [1, 2], "weight": 12 },
    { "itemId": "herb_green",         "amount": [1, 3], "weight": 8 }
  ]
}
```

```json
{
  "id": "volcano_rare",
  "rolls": 2,
  "entries": [
    { "itemId": "crystal_shard",      "amount": [3, 5], "weight": 20 },
    { "itemId": "talisman_fragment",  "amount": [2, 3], "weight": 18 },
    { "itemId": "iron_scrap",         "amount": [4, 8], "weight": 12 },
    { "itemId": "steel_sword",        "amount": [1, 1], "weight": 10 },
    { "itemId": "steel_armor",        "amount": [1, 1], "weight": 8 },
    { "itemId": "crystal_staff",      "amount": [1, 1], "weight": 8 },
    { "itemId": "crystal_pendant",    "amount": [1, 1], "weight": 8 },
    { "itemId": "ranger_cloak",       "amount": [1, 1], "weight": 8 },
    { "itemId": "gold",               "amount": [15, 30], "weight": 8 }
  ]
}
```

> **Loot‑Progression:** Forest (basic) → Cave/Swamp (mehr Iron, Crystal) → Ruins (T2 Gear‑Chance, hohe Crystal) → Volcano (T2 Gear häufig, höchster Gold/Crystal‑Ertrag, 2 Rolls). Die Vulkan‑Rare‑Table hat **2 Rolls** statt 1 als Belohnung für die härteste Route.

### 10.8 Save‑Format (MVP)

**SaveRoot (v2 – erweitert mit XP, Scoreboard, Difficulty):**
```json
{
  "saveVersion": 2,
  "meta": { "createdAtIso": "2026-02-22T12:00:00Z", "seed": 123456, "playtimeSec": 0 },
  "city": {
    "day": 1,
    "globalStock": { "wood": 40, "stone": 15, "grain": 0, "flour": 0, "bread": 2, "gold": 50 },
    "roads": [ [10,10], [11,10] ],
    "buildings": [
      { "instanceId": "b1", "buildingId": "WAREHOUSE", "pos": [30,30], "tier": 1, "assignedCitizenIds": [], "localInputBuffer": {}, "localOutputBuffer": {}, "recipeTimer": 0 }
    ],
    "citizens": [
      { "id": "c1", "state": "IDLE", "assignedTo": null, "classId": null, "injuryTimerSec": 0 }
    ],
    "popGrowthCooldown": 0
  },
  "guild": {
    "roster": [
      {
        "citizenId": "c5",
        "classId": "HERO_GUARDIAN",
        "gear": { "weapon": null, "armor": null, "trinket": null },
        "currentHp": 30,
        "level": 1,
        "currentXp": 0,
        "xpToNextLevel": 30,
        "totalKills": 0,
        "totalRuns": 0,
        "unlockedSkills": ["TAUNT"]
      }
    ],
    "unlockedClasses": ["HERO_GUARDIAN", "HERO_RANGER", "HERO_CLERIC"],
    "talismanInventory": [],
    "activeRun": null,
    "expeditionsCompleted": 0,
    "bossesDefeated": [],
    "routeDifficulties": {
      "forest_short": "normal",
      "forest_medium": "normal",
      "cave_deep": "normal",
      "swamp_long": "normal",
      "cave_spider": "locked",
      "ruins_crypts": "locked",
      "ruins_depths": "locked",
      "volcano_core": "locked"
    },
    "unlockedModifiers": []
  },
  "scoreboard": {
    "routeHighscores": {},
    "globalRecords": {
      "minRoundsForBossKill": null,
      "maxSingleHitDamage": 0,
      "maxHealingInOneRun": 0,
      "maxRoomsPerfectHp": 0,
      "maxEnemiesInOneRun": 0,
      "maxTotalScore": 0
    }
  },
  "weeklyChallenge": {
    "currentChallenge": null,
    "dayCountdown": 7,
    "completedThisWeek": false
  },
  "activeExpedition": {
    "routeId": "forest_short",
    "difficulty": "normal",
    "activeModifier": null,
    "currentRoom": 3,
    "rngState": 42,
    "partyState": [],
    "lootCollected": {},
    "survivorsCollected": 0,
    "provisionsRemaining": [],
    "combatLog": []
  }
}
```

> **Hinweis:** `activeExpedition` ist `null` wenn kein Run läuft. Bei Save während eines Runs wird der komplette Run‑State serialisiert. `routeDifficulties` trackt die höchste freigeschaltete Schwierigkeit pro Route. `unlockedClasses` wird bei Boss‑Kill / Level‑Up automatisch ergänzt.

**Migrations‑Strategie:**
- `if (save.saveVersion < CURRENT_SAVE_VERSION) save = migrate(save)`
- Neue Felder bekommen **Default‑Values**
- Pipeline: `migrate_v1_to_v2(save)` → `migrate_v2_to_v3(save)` → …

---

**→ Weiter in Teil 3: `Magic_City_GDD_v2_0_Teil_3_Abschnitte_11-16.md` (UI, Balancing, MVP‑Scope, Arbeitspakete)**
