# 🏰 Magic City – The Guild's Hearth  
**Game Design Document (GDD) v2.0 – Teil 3 von 3**  
**Abschnitte 11–16: UI, Balancing, MVP‑Scope, Arbeitspakete**

> **Dokumentstruktur (4 Dateien):**  
> - **Teil 1**: `Magic_City_GDD_v2_0_Teil_1_Abschnitte_0-6.md` – Abschnitte 0–6 (Tech, Grid, Logistik, Economy)  
> - **Teil 2**: `Magic_City_GDD_v2_0_Teil_2_Abschnitte_7-10.md` – Abschnitte 7–10 (Bewohner, Gebäude, Expeditionen, Datenmodelle)  
> - **Teil 3** (dieses File): `Magic_City_GDD_v2_0_Teil_3_Abschnitte_11-16.md` – Abschnitte 11–16 (UI, Balancing, MVP‑Scope, Arbeitspakete)  
> - **Teil 4**: `Magic_City_GDD_v2_0_Teil_4_Fixes_und_Systeme.md` – Fixes, Sound‑System, Browser‑Stabilität & Performance (MVP‑relevant, ergänzt Teile 1–3)

---

## 11) UI/UX Architektur (Layering & Regeln)

### 11.1 UI‑Layer
- **HUD (permanent):** Ressourcen, Gold, Workforce (idle/assigned/fighters), Tag‑Counter
- **Build Menu (overlay):** Kategorien + Suche, Tooltip „Warum nicht platzierbar"
- **Building Panel (side panel):** Inputs/Outputs, Worker slots, Connectivity status, Water supply
- **Gildenhaus (full screen / modal):** Roster, Training, Loadout (Gear + Proviant + Talisman), Expedition wählen
- **Expedition UI (overlay, Stadt läuft weiter):** Room‑Progress, Team‑HP, Event‑Log, Proviant‑Status, Auto‑Retreat Hinweis
- **Run‑Summary (modal):** Damage taken, Retreat reason, Loot (inkl. Gear‑Drops), Injuries, Survivors

### 11.2 Transparenz‑Regeln (Anti‑Frust)
- Immer anzeigen:
  - *„Fehlt Input X"*
  - *„Output voll (Buffer/Lager)"*
  - *„Kein Lageranschluss"*
  - *„Braucht Wasser (Brunnen)"*
  - *„Warum Retreat?"*
  - *„Proviant verbraucht: Heiltrank → Wächter (15 HP)"* (im Expedition‑Log)

### 11.3 HUD‑Layout (MVP‑Wireframe)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Build] [Road] [Demolish]        Magic City (Day 12)            Gold: 120   │
│ Wood: 34  Stone: 8  Grain: 12  Flour: 8  Bread: 6  Iron: 3                 │
│ Pop: 12/16 (3 Fighter)   Workers: 5 idle / 4 assigned   Tax/min: +6        │
├─────────────────────────────────────��────────────────────────────────────────┤
│                                                                              │
│                              (World + Camera)                                │
│                                                                              │
│                                                                              │
│                                           ┌──────────────────────────────┐   │
│                                           │  Building Info / Inspect      │   │
│                                           │  - connected: yes/no          │   │
│                                           │  - water supplied: yes/no     │   │
│                                           │  - buffer: 3/10              │   │
│                                           │  - recipe: [Bread ▼] (8s)   │   │
│                                           │  - workers: 1/1              │   │
│                                           └──────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Bottom Bar: Build Palette (icons + hotkeys 1..9) | Cancel (Esc)  | [📊 Stats] │
│ [Expedition aktiv: Room 4/6 – Team HP 68% – ⚡Fluch – Proviant: 2/4]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

**UI‑Regeln (MVP):**
- **Top Bar** ist permanent (Ressourcen + Pop + Fighter‑Count + Tax + Gold + Day).
- **Right Panel** zeigt Kontext (selected building/tile). Zeigt auch Warnungen.
- **Bottom Bar** zeigt Build‑Palette; wechselt je nach Modus (Build/Road/Demolish).
- **Expedition‑Status‑Leiste** erscheint in der Bottom Bar nur wenn ein Run aktiv ist. Klick → wechselt zu Expedition‑UI.
- **Modal Dialoge** nur für: Save/Load, Expedition Start, Run‑Summary, Settings.
- Tooltip‑Pflicht: Connectivity, Water, Overflows, Baukosten, Gear‑Stats.

### 11.4 Gildenhaus‑UI (MVP‑Layout)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ⚔️  GILDENHAUS  ⚔️                                  │
├────────────────────────┬─────────────────────────────────────────────────────┤
│  ROSTER                │  DETAILS                                            │
│                        │                                                     │
│  🛡️ Wächter (HP 30)    │  Klasse: Wächter (Tank)                             │
│     [Eisenschwert]     │  HP: 30 (+0)  ATK: 3 (+3)  DEF: 4 (+4)            │
│     [Eisenschild]      │  SPD: 0.95   Crit: 5%                              │
│     [leer]             │                                                     │
│                        │  Gear:                                              │
│  🏹 Waldläufer (HP 22) │   Weapon: Eisenschwert (+3 ATK)     [Ablegen]      │
│     [Jägerbogen]       │   Armor:  Eisenschild (+4 DEF)      [Ablegen]      │
│     [Lederrüstung]     │   Trinket: — [Anlegen ▼]                           │
│     [Wolfszahn‑Kette]  │                                                     │
│                        │  Skills: TAUNT (CD 3)                               │
│  ✚ Klerikerin (HP 24)  │  Status: Bereit                                    │
│     [Eichenstab]       │                                                     │
│     [leer]             │                                                     │
│     [leer]             │                                                     │
├────────────────────────┼─────────────────────────────────────────────────────┤
│  TRAINING              │  EXPEDITION                                         │
│                        │                                                     │
│  Idle Bürger: 3        │  Route: [Waldpfad ▼] [Tiefer Wald ▼]              │
│  [Trainieren →]        │         [Tiefe Höhle ▼] [Sumpfmarsch ▼]           │
│  Klasse wählen:        │  Rooms: 6 / 10 / 8 / 12   Boss: —/Treant/Golem/Hydra│
│  ( ) Wächter           │                                                     │
│  ( ) Waldläufer        │  Modifikator: (•) Keiner  ( ) Fluch  ( ) Eisern    │
│  ( ) Klerikerin        │               ( ) Todesmarsch [🔒 Rang IV]         │
│  Kosten: 15 Gold       │                                                     │
│  Dauer: 60s            │  Proviant (4 Slots):                               │
│                        │   [Brot] [Kraftbrot] [Heiltrank] [leer]            │
│                        │  Party:  [✓ Wächter] [✓ Waldläufer] [✓ Klerikerin] │
│                        │                                                     │
│                        │  [>>> EXPEDITION STARTEN <<<]                       │
├────────────────────────┴─────────────────────────────────────────────────────┤
│  [← Zurück zur Stadt]                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

**UI‑Logik (MVP):**
- **Roster** zeigt alle `GUILD_FIGHTER` Units mit aktuellem Gear.
- **Gear anlegen:** Dropdown/Liste aus globalem Lager → filtern nach `gearSlot`. Item wird aus Lager entfernt, ans Unit gehängt.
- **Gear ablegen:** Item geht zurück ins Lager.
- **Training:** nur wenn `IDLE` Bürger vorhanden + Gold reicht. Klasse wählen → Timer startet.
- **Expedition starten:** nur wenn ≥1 Fighter ausgewählt + Route gewählt.
- **Proviant laden:** aus globalem Lager, max `provisionSlots` Items mit Tag `provision`.
- **Talisman:** aus Inventar (gecraftet im Gildenhaus‑Tab) oder leer.

### 11.5 Expedition‑UI (MVP‑Layout)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  EXPEDITION: Tiefer Wald (Room 7/10)                     [← Zurück zur Stadt]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PARTY                          │  COMBAT / EVENT                            │
│                                 │                                            │
│  🛡️ Wächter    HP: 22/35       │  ⚔️ Kampf gegen:                           │
│     ████████████░░░░            │    Waldwolf (HP: 12/18)                    │
│     ATK: 6  DEF: 8  SPD: 0.95  │    Dornengeist (HP: 4/14) ← niedrig!      │
│     [TAUNT bereit]              │                                            │
│                                 │  Runde 3:                                  │
│  🏹 Waldläufer  HP: 18/22      │    Waldläufer → Dornengeist: 9 DMG         │
│     ██████████████░░            │    Wächter → Waldwolf: 4 DMG               │
│     ATK: 8  DEF: 1  SPD: 1.25  │    Waldwolf → Wächter: 3 DMG (Taunt)      │
│     [POWER_SHOT CD: 1]         │    Klerikerin → Wächter: +6 HP (Heal)      │
│                                 │                                            │
│  ✚ Klerikerin  HP: 24/29       │  Log:                                      │
│     ████████████████            │    Room 6: Rest (+10 HP alle)              │
│     ATK: 3  DEF: 2  SPD: 1.0   │    Room 5: Fund! → 3× Stein              │
│     [HEAL CD: 0 → bereit]      │    Room 4: Kampf (2× Bandit) → Sieg       │
│                                 │    Room 3: Gefahr! (-5 HP alle)           │
│                                 │                                            │
├─────────────────────────────────┴────────────────────────────────────────────┤
│  Proviant: [Brot] [Heiltrank] [leer] [leer]    Loot bisher: Wood×8, Gold×12 │
│  Auto‑Retreat bei < 20% Team‑HP                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.6 Run‑Summary (nach Expedition‑Ende)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ⚔️  EXPEDITION ABGESCHLOSSEN  ⚔️                          │
│                         Tiefer Wald (10 Rooms)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Ergebnis: SIEG ✅  (Boss: Uralter Treant besiegt!)                         │
│                                                                              │
│  Team:                                                                       │
│    🛡️ Wächter:    HP 8/35 → VERLETZT (Erholung: 120s)                      │
│    🏹 Waldläufer: HP 14/22 → Bereit                                         │
│    ✚ Klerikerin:  HP 20/29 → Bereit                                         │
│                                                                              │
│  Loot:                                                                       │
│    Wood ×12, Stone ×4, Gold ×23, Iron Scrap ×3                              │
│    ⭐ Kristallscherbe ×1 (Rare!)                                            │
│    ⭐ Eichenstab ×1 (Boss‑Drop!)                                            │
│                                                                              │
│  Proviant verbraucht: 2× Brot, 1× Heiltrank                                │
│  Proviant zurück ins Lager: 1× Brot                                         │
│                                                                              │
│  Neuer Siedler gefunden! (Room 8) → Status: IDLE                            │
│                                                                              │
│                        [OK – Zurück zur Stadt]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 12) Balancing‑Startwerte (MVP‑Pacing)

### 12.1 Bauzeiten
- Tier‑1 Gebäude: 12–60s
- Tier‑2 Upgrade (Guild Hall): 120s + Rare Mats + Gold
- Tier‑3 Upgrade: Post‑MVP

### 12.2 Expedition‑Längen
- Kurz (`forest_short`): 2–3min (6 Rooms, kein Boss) – Einstieg
- Mittel (`forest_medium`): 5–8min (10 Rooms, Boss: Elder Treant) – erster Boss‑Test
- Tief (`cave_deep`): 3–5min (8 Rooms, Boss: Crystal Golem) – DEF‑Check, kompakt
- Lang (`swamp_long`): 8–12min (12 Rooms, Boss: Swamp Hydra) – Endgame‑Marathon
- Sehr lang (`forest_long`): 10–14min (14 Rooms, Boss: Bandit Chief) – Post‑MVP

### 12.3 Loot‑Philosophie
- Stadt‑Rohstoffe (Wood/Stone/Grain/Gold): häufig, jede Expedition
- `iron_scrap`: **12% Weight** in `forest_basic` (1–2 Stück) + Eisenmine in der Stadt als Grundversorgung → Gear‑Crafting ist ein Mid‑Game‑Ziel, aber erreichbar in 2–3 Runs
- Rare mats (crystal_shard, talisman_fragment): selten (nur `rareLootTableId`, 10% bei `find`)
- Gear‑Drops (Waffen/Trinkets): sehr selten (nur `rareLootTableId` oder Boss‑Loot)
- Überlebende/Spezialisten: sehr selten (5% Encounter‑Weight), aber „run-defining"

### 12.4 Economy‑Pacing (MVP‑Referenz)
**Erwarteter Spielfluss:**
- **Min 0–3:** Roads + Lumber Camp + Quarry bauen
- **Min 3–6:** Farm + zweites House → Pop wächst, Well bauen
- **Min 6–10:** Bread‑Kette komplett (Farm → Mill → Bakery + Well)
- **Min 10–15:** Guild Hall + Smithy bauen, erste Fighter trainieren
- **Min 15–20:** Erste Expedition (forest_short), erstes Gear craften
- **Min 20–30:** Optimieren, Gear ausrüsten, forest_medium versuchen
- **Min 30–40:** Boss‑Versuch (Elder Treant), Rare Mats sammeln
- **Min 40–50:** `cave_deep` erkunden, Crystal Golem besiegen, Crystal Shards für Guild Hall T2
- **Min 50–60:** Guild Hall T2 (3× crystal_shard), 4. Held trainieren, Fernziel: Talisman craften
- **Min 60+:** `swamp_long` als Endgame, Expeditions‑Modifikatoren für wiederholten Loot‑Grind

### 12.5 Combat‑Balance (Referenzwerte)
**Ungerüstete Party (3 Helden, Basis‑Stats) vs. forest_short:**
- Erwartetes Ergebnis: **Sieg mit 40–60% Team‑HP** → machbar, aber knapp.
- Risiko: Retreat bei schlechtem RNG (2× Hollow Shade + Hazard‑Room)

**Vollgerüstete Party (3 Helden + Eisenschwert/Eisenschild/Lederrüstung) vs. forest_short:**
- Erwartetes Ergebnis: **Sieg mit 70–90% Team‑HP** → komfortabel.

**Vollgerüstete Party vs. forest_medium (mit Boss):**
- Erwartetes Ergebnis: **Sieg mit 30–50% Team‑HP** + 1–2 Proviant verbraucht.
- Boss allein: ~4–6 Runden bei 3 Helden → Enrage sollte nicht greifen.

**Ohne Heiler (2 DPS + Tank) vs. forest_medium:**
- Erwartetes Ergebnis: **Retreat wahrscheinlich** (HP < 20% nach Room 7–8).
- → Heiler ist **empfohlen** aber nicht **erzwungen**.

**Vollgerüstete Party vs. cave_deep (Crystal Golem):**
- Erwartetes Ergebnis: **Sieg mit 40–60% Team‑HP** + 1–2 Proviant.
- Crystal Golem hat hohe DEF (7) → Ranger mit POWER_SHOT ist entscheidend.
- DIAMOND_SHELL (self_buff) macht ihn für 2 Runden fast unverwundbar → Team muss Adds kontrollieren.
- Empfohlen: Full Gear + mind. 1 Heiltrank.

**Vollgerüstete Party vs. swamp_long (Swamp Hydra):**
- Erwartetes Ergebnis: **Sieg mit 20–40% Team‑HP** + 3–4 Proviant verbraucht.
- 12 Rooms bedeuten starken Ressourcen‑Drain vor dem Boss.
- Swamp Hydra heilt sich (REGENERATE: +12 HP alle 3 Runden) → DPS‑Rennen.
- TRIPLE_BITE (3× random) kann einen Helden unglücklich schnell downen.
- Empfohlen: 4‑Helden‑Party (Guild Hall T2) + voller Proviant + Talisman.
- **Mit Expeditions‑Modifikator „Todesmarsch":** Nur für optimierte Partyaufstellung empfohlen, aber ×2 Loot + garantierter Rare‑Drop.

**T2‑gerüstete Party (Lv5+) vs. ruins_crypts (Fallen Knight):**
- Erwartetes Ergebnis: **Sieg mit 30–50% Team‑HP** + 2–3 Proviant.
- Fallen Knight hat höchsten ATK aller Bosse (9) + Anti‑Heal → Cleric weniger effektiv.
- DARK_RALLY (+3 ATK auf alle Allies) macht lange Kämpfe gefährlich.
- Empfohlen: Paladin (Self‑Heal umgeht Anti‑Heal) + Berserker + Hexe (AoE für Adds).

**T2/T3‑gerüstete Party (Lv7+) vs. ruins_depths (Shadow Lich):**
- Erwartetes Ergebnis: **Sieg mit 20–40% Team‑HP** + 3–4 Proviant.
- Shadow Lich heilt sich durch SOUL_DRAIN → Burst‑Damage bevorzugt.
- RAISE_DEAD Skelette müssen als Off‑Targets gemanaged werden.
- Empfohlen: Assassine (EXECUTE auf niedrige HP) + Guardian (TAUNT) + Cleric oder Barde.

**T3‑gerüstete Party (Lv8+) vs. volcano_core (Magma Wyrm):**
- Erwartetes Ergebnis: **Sieg mit 10–30% Team‑HP** + 4–5 Proviant (Vollverbrauch).
- 14 Rooms + härteste Gegner (Ash Golem 44 HP, Flame Spirit 8 ATK) = massiver Attrition.
- Magma Wyrm hat 130 HP + INFERNO_BREATH alle 2 Runden (AoE 1.2× auf ALLE).
- Enrage ab Runde 10 → DPS‑Race.
- Empfohlen: 4‑Party mit T3‑Gear, Lv8+, voller Proviant + Talisman. Auch für erfahrene Spieler eine echte Herausforderung.
- **Auf Alptraum:** Wyrm hat effektiv 208 HP + 11.2 ATK → nur mit T4‑Gear und Lv10+ Party realistisch.

### 12.6 Gegner‑Tier‑Empfehlung (für Route‑Design)
| Gegner‑Stärke | Geeignet für | Beispiele |
|---|---|---|
| **Schwach** (HP < 16) | forest_short, Füller | Thorn Sprite, Shadow Bat, Cursed Wisp, Stalactite Bat, Ghost Mage, Fire Bat, Tomb Horror |
| **Mittel** (HP 16–28) | forest_short/medium, cave_deep, ruins_crypts | Forest Wolf, Bandit, Goblin Scout, Venomfang Spider, Wild Boar, Hollow Shade, Crystal Beetle, Deep Crawler, Toxic Toad, Leech Swarm, Skeleton Warrior, Obsidian Crab, Cursed Priest, Magma Broodling, Flame Spirit |
| **Stark** (HP > 28) | cave_deep, swamp_long, ruins_depths, volcano_core | Cave Slime, Moss Golem, Bramble Bear, Swamp Troll, Rot Walker, Bone Knight, Stone Guardian, Lava Elemental, Ash Golem |
| **Boss** (HP > 60) | letzter Room | Elder Treant, Bandit Chief, Crystal Golem, Swamp Hydra, Spider Queen, Fallen Knight, Shadow Lich, Magma Wyrm |

---

## 13) MVP‑Scope & Roadmap

### 13.1 MVP‑Phasen (3‑stufig statt monolithisch)

> **Warum Phasen?** Der ursprüngliche MVP‑Scope (22 Punkte) ist zu groß für eine einzelne Agent‑Session. Die Aufteilung in 3 Phasen stellt sicher, dass nach jeder Phase ein **spielbares Ergebnis** existiert und der Agent klare Grenzen hat.

#### 13.1.1 MVP‑0 „Spielbar in 1 Session" (Agent‑implementierbar, ~30–45min Spielzeit)
> **Ziel:** Kern‑Gameplay‑Loop komplett spielbar: Stadt bauen → Trupp ausrüsten → Expedition → Loot → Stadt erweitern.

1. Grid‑Bauen + **12 Gebäude** (Tier 1, inkl. Eisenmine) + Roads (instant, 1 Wood + 1 Gold) + Demolish (50% Refund)
2. Produktion + Lager + Connectivity + Overflow UI
3. Workforce: Assignment + Bau bindet Builder + Organisches Pop‑Growth (Brot‑Kosten)
4. Rekrutierung & Training: IDLE → GUILD_TRAINING → GUILD_FIGHTER + Fighter‑Rücktritt (→ IDLE, Gold verloren)
5. **Gear‑System:** Schmiede craftet 3 Gear‑Items (T1) + Gear wird im Gildenhaus equipped + **Gear‑Wartungskosten** (5 Gold/Item nach Run)
6. **Proviant‑System:** Brot/Kräuter/Heiltrank/Kraftbrot als Verbrauchsitems im Run, **manuell oder auto**
7. Gildenhaus: Roster, **3 Start‑Klassen** (Guardian, Ranger, Cleric), **3 Routen** (`forest_short`, `forest_medium`, `cave_deep`), **2 Bosse** (Elder Treant, Crystal Golem)
8. ExpeditionSim: Encounter‑Deck + Combat + **13 reguläre Gegner** (Forest + Cave Pools) + Rewards + Injuries + Auto‑Retreat + **Checkpoint‑Entscheidungen**
9. **1 aktiver Notfall‑Skill pro Kampf** (Party‑Skill „Verzweifelter Wille", CD 3 Runden, siehe 9.8.2)
10. **Rezept‑Wechsel:** Gebäude mit mehreren Rezepten (Bakery, Herb Garden) – Dropdown im Building Panel
11. Zufriedenheitssystem (Satisfaction) + Wasser‑Radius
12. Save/Load (versioniert, Migration mit Defaults) + seeded RNG
13. **Art‑Style:** AI‑generierte Pixel‑Art Sprites als fertige PNGs (via Google AI Studio API, geladen in BootScene per `this.load.image()`, siehe Teil 1, 6.5)
14. **Tutorial:** Endet mit erstem Expeditionserfolg + Banner „Deine erste Gilde ist geboren!" (siehe 2.4)

**Abgrenzung MVP‑0:** Kein Talisman, keine CityEvents, keine Modifikatoren, kein XP‑System, kein Gilden‑Rang, keine Achievements, kein Scoreboard. Nur 3 Klassen, 3 Routen, 2 Bosse, T1‑Gear.

#### 13.1.2 MVP‑1 „Tiefe & Wiederspielwert" (aufbauend auf MVP‑0)
> **Ziel:** Langzeit‑Motivation + 4. Route + Gilden‑Rang als Progressionsziel.

1. **Talisman:** 1 craftbarer Talisman (Fortitude)
2. **CityEvent‑System:** 3 Events (Wanderhändler, Erntesegen, Unwetter)
3. **Gilden‑Rang (I–V):** Zentrales Progressions­ziel mit Unlocks (Abschnitt 1.5)
4. **4. Route:** `swamp_long` (12 Rooms, Boss: Swamp Hydra) + 6 Sumpf‑Gegner
5. **Achievements/Meilensteine:** 12 Achievements mit Event‑Hooks + UI‑Banner bei Unlock
6. **Statistik‑Screen:** Gesamtstatistiken (produzierte Waren, besiegte Gegner, etc.)
7. 1× Tier‑2 Upgrade (Guild Hall → 4 Party Slots, braucht crystal_shard)
8. **Encounter‑Auswahl** (binäre Optionen bei find/rest Rooms)
9. **Expeditions‑Modifikatoren:** 3 Basis‑Modifikatoren (Fluch, Eisern, Todesmarsch)

#### 13.1.3 Post‑MVP „Endgame‑Tiefe"
> **Ziel:** Langfristige Sammler‑ und Optimierungs‑Motivation.

1. **Helden‑XP & Level‑System:** Helden leveln von 1–15, Skill‑Upgrades bei Lv5, 2. Skill bei Lv10
2. **7 freispielbare Klassen** (Berserker, Assassine, Paladin, Barde, Hexe, Nekromant, Druide) → 10 Klassen gesamt
3. **4 weitere Routen** (`cave_spider`, `ruins_crypts`, `ruins_depths`, `volcano_core`) → 8 Routen gesamt
4. **4 weitere Bosse** (Spider Queen, Fallen Knight, Shadow Lich, Magma Wyrm) → 8 Bosse gesamt
5. **Gear‑Tier‑System:** T2 Craft + T3 Boss‑Drop + T4 Legendary → 23 Gear‑Items
6. **Schwierigkeitsstufen:** 4 Stufen pro Route (Normal → Schwer → Alptraum → Infernal)
7. **Ehrentafel / Scoreboard:** Pro‑Route Top‑5 Bestenliste + Globale Records
8. **Wöchentliche Herausforderung:** Alle 7 Tages‑Ticks neue Challenge
9. **3 weitere Modifikatoren** (Elitewache, Geschwindmarsch, Nemesis) → 6 gesamt

### 13.2 Tests (lohnt sich sofort)
- Grid Placement + Demolish (Footprint + Occupancy + Refund + letztes Warehouse blockiert)
- Production tick (Inputs/Outputs/Overflow/Water‑Requirement)
- **Rezept‑Wechsel** (Dropdown‑Auswahl, aktives Rezept wechselt, Timer reset, korrekte In/Outputs)
- Connectivity (Path to warehouse, Rebuild‑Trigger)
- Population Growth (Tages‑Tick, Bread‑Kosten, Housing‑Cap)
- Training Pipeline (IDLE → GUILD_TRAINING → GUILD_FIGHTER)
- **Fighter‑Rücktritt** (GUILD_FIGHTER → IDLE, Gear zurück, Stats verloren)
- **Gear Equip/Unequip** (Lager ↔ Unit, Slot‑Validierung, Stats‑Berechnung)
- **Gear‑Wartung** (5 Gold/Item nach Run, 50% Malus wenn unbezahlt)
- **Proviant Manual + Auto‑Use** (HP‑Threshold, Priorität Potion > Power Bread > Bread > Herb; Buff‑Items vor erstem Combat)
- **Checkpoint‑Dialog** (alle 3 Rooms: Weiter/Retreat Entscheidung)
- **Encounter‑Auswahl** (find: riskant/sicher Wahl + Flavor‑Text erscheint; rest: Rasten vs. Formieren; Biom‑spezifischer Pool korrekt gezogen)
- **Fokusziel‑Skill** (Klick auf Gegner‑Icon während Kampf → alle DPS fokussieren Ziel; 2 Runden‑Countdown; Ziel tot → automatic reset; CD 4 Runden läuft korrekt)
- **Fighter‑Stadt‑Synergien** (1/2/3 Fighter in Stadt → korrekte Satisfaction‑/Training‑/Tax‑Boni; ON_EXPEDITION zählen nicht; UI zeigt aktive Boni)
- ExpeditionSim determinism (Seed → gleiche Ergebnisse)
- Threat/Targeting (Taunt/Threat/Role rules)
- **Boss‑Encounter** (Enrage‑Timer, AoE‑Skills, garantierter Loot)
- **Alle 8 Bosse einzeln testen** (Elder Treant, Bandit Chief, Crystal Golem, Swamp Hydra, Spider Queen, Fallen Knight, Shadow Lich, Magma Wyrm)
- **Skill‑Effect‑Resolver** (alle 9 Effect‑Types: damage, aoe_damage, heal, taunt, self_buff, buff_allies, summon, lifesteal, anti_heal)
- **Gilden‑Rang** (Aufstiegsbedingungen, Unlocks, SaveState)
- **CityEvents** (Trigger, Timer, Effekt, nicht stackbar)
- **Expeditions‑Modifikatoren** (alle 6 Modifikatoren: Stats‑Modifikation, Loot‑Mult, Pack‑Size, XP‑Mult, Boss‑HP, Unlock‑Bedingung)
- **Helden‑XP** (XP‑Verteilung pro Kill/Run, Level‑Up, Stat‑Boost, Skill‑Upgrade bei Lv5, 2. Skill bei Lv10)
- **Klassen‑Unlock** (Boss‑Kill → neue Klasse freigeschaltet, Level‑Bedingung, Kombinations‑Bedingung)
- **Gear‑Tiers** (T1 Start‑Gear, T2 Crafting, T3 Boss‑Drop, T4 Legendary, korrekte Stat‑Boni)
- **Schwierigkeitsstufen** (Stat‑Skalierung pro Stufe, Unlock‑Progression, Loot‑Bonus, Score‑Multiplikator)
- **Ehrentafel** (Score‑Berechnung, Top‑5 pro Route, Global Records, Persistenz im Save)
- **Wöchentliche Herausforderung** (Generator, Restriction‑Check, Bonus‑Reward, Countdown)
- **Achievements** (Event‑Hook feuert korrekt, Counter inkrementiert, Banner erscheint, SaveState persistiert)
- **Statistiken** (alle Zähler inkrementieren korrekt, Screen zeigt aktuelle Werte)
- **Sprite‑Loading** (alle AI‑generierten PNGs laden korrekt in BootScene, Texture‑Cache‑Keys stimmen mit Sprite‑Inventar überein)
- **Merchant‑Encounter** (bietet korrektes Item an, Preis = baseValue × 3, Gold‑Abzug funktioniert)
- **Cave‑ + Swamp‑Routen** (alle Rooms generiert, korrekte Enemy‑Pools, Boss am Ende)
- **Ruins‑ + Volcano‑Routen** (Unlock‑Bedingungen, korrekte Enemy‑Pools, neue Bosse)
- **Grandmaster Trial** (nur bei Rang V freigeschaltet; 3 Boss‑Phasen an Room 5/10/15; kein HP‑Restore zwischen Phasen; `noBossHealBetweenPhases = true`; completionReward feuert Achievement + Loot‑Bonus)
- **crystal_shard productionSource Validierung** (kein Gebäude‑Rezept darf crystal_shard als Output haben – Laufzeit‑Assert im Data‑Loader)
- **Summon‑Mechanik** (Nekromant Skelette + Spider Queen Brood + Shadow Lich Raise Dead)
- Save/Load roundtrip + Version‑Migration (v2 Format mit XP/Scoreboard/Difficulty)

### 13.3 Post‑MVP (gezielt, nicht alles)
- **Gasthof (INN):** Brot → Gold + Komfort‑Bonus
- **Badehaus (BATHHOUSE):** Komfort‑Bonus für Satisfaction 80+
- **Marktplatz:** limitierte Deals, Balancing‑Ventil
- **Set‑Bonuses:** 2/3‑teilige Gear‑Sets mit Combo‑Effekten
- **Potion‑Kette erweitert:** Mana Potion, Antidote, Buff Potions
- **Schmied T2:** Gebäude‑Upgrade für T3‑Crafting (statt nur Boss‑Drops)
- Rotation (90°‑Schritte), mehr Gebäude
- Physische Logistik (Carrier NPCs) **optional**
- Elite‑Gegner (goldene Varianten regulärer Feinde mit +Stats)
- **PvP‑Rangliste:** Online‑Scoreboard mit globalem Ranking (optional)
- **Weitere Biome:** Wüste, Unterwasser, Himmelsfestung
- **11.–15. Klasse:** Mönch, Elementarmagier, Schildknappe, Hexenjäger, Schattenläufer

### 13.4 CityEvent‑System (MVP‑Starter)
**Warum im MVP:** Ohne Events wird die Stadt‑Phase zwischen Expeditionen monoton. 3 einfache Events brechen die Routine und machen die Welt lebendiger.

**Trigger:** Alle **3 Tages‑Ticks** (also alle 180s) wird per RNG geprüft, ob ein Event stattfindet (50% Chance).

**MVP‑Events (3 Stück):**

| Event | Weight | Effekt | UI |
|-------|--------|--------|----|
| **Wanderhändler** | 40 | Bietet 3× `iron_scrap` für 20 Gold an (einmalig, 60s Timer) | Banner + Button „Kaufen" / „Ablehnen" |
| **Erntesegen** | 35 | Alle Farmen produzieren für 120s **doppelt** (Output ×2) | Banner „Die Ernte ist gesegnet!" + grüne Aura auf Farmen |
| **Unwetter** | 25 | Ein zufälliges Produktionsgebäude pausiert für 60s (Reparatur nötig, kein Worker‑Einsatz, rein Timer‑basiert) | Banner „Ein Sturm hat [Gebäude] beschädigt!" + Reparatur‑Icon |

**Event‑Schema:**
```json
{
  "id": "EVENT_MERCHANT",
  "name": "Wanderhändler",
  "weight": 40,
  "durationSec": 60,
  "effects": [
    { "type": "offer_trade", "give": { "gold": 20 }, "receive": { "iron_scrap": 3 } }
  ],
  "flavorText": "Ein Händler taucht am Stadtrand auf und bietet seltene Waren an.",
  "tags": ["trade", "positive"]
}
```

**Regeln:**
- Events sind **nicht stackbar** – es kann nur ein aktives Event gleichzeitig geben.
- Events werden im SaveState gespeichert (`activeEvent: { id, remainingSec }`).
- Wenn der Spieler in der Expedition ist, werden Events trotzdem ausgelöst (Banner erscheint beim Zurückkehren).
- **Kein Event darf Game Over verursachen** (relaxed Design). Unwetter pausiert nur, zerstört nichts.

### 13.5 Achievements / Meilensteine (MVP)

**Konzept:** Einfache Event‑basierte Achievements, die Spielfortschritt belohnen und als intrinsische Motivation dienen. Kein separater Grind – alle Achievements werden durch normales Spielen freigeschaltet.

**System‑Architektur:**
- **Event‑Hooks:** Zentrale Ereignisse (Build, Produce, Kill, Boss, Expedition, etc.) feuern Events an den `AchievementSystem`.
- **Counter‑basiert:** Jedes Achievement hat einen `counter` + `target`. Wenn `counter >= target` → Achievement unlocked.
- **Persistent:** Achievement‑State wird im SaveRoot gespeichert (`achievements: { [id]: { unlocked: boolean, counter: number } }`).
- **UI:** Bei Unlock: Banner‑Animation (goldener Rahmen, 3s sichtbar) + permanente Liste im Statistik‑Screen.

**MVP‑Achievements (12 Stück):**

| ID | Name | Bedingung | Event‑Hook |
|---|---|---|---|
| `ACH_FIRST_BREAD` | Erstes Brot | 1× bread produziert | `onProduce(bread)` |
| `ACH_BAKER_10` | Meisterbäcker | 10× bread produziert | `onProduce(bread)` |
| `ACH_FIRST_EXPEDITION` | Abenteurer | 1. Expedition abgeschlossen | `onExpeditionEnd` |
| `ACH_BOSS_FIRST` | Bossvernichter | 1 Boss besiegt | `onBossKill` |
| `ACH_BOSS_ALL` | Meister aller Bosse | Alle 4 Bosse mind. 1× besiegt | `onBossKill(id)` → Set‑Check |
| `ACH_ENEMIES_50` | Veteranentrupp | 50 Gegner besiegt (kumulativ) | `onEnemyKill` |
| `ACH_ENEMIES_200` | Legendäre Krieger | 200 Gegner besiegt | `onEnemyKill` |
| `ACH_ALL_BUILDINGS` | Stadtplaner | Alle 12 Gebäudetypen mind. 1× gebaut | `onBuild(id)` → Set‑Check |
| `ACH_GUILD_RANK_3` | Aufsteiger | Gilden‑Rang III erreicht | `onGuildRankUp` |
| `ACH_GUILD_RANK_5` | Legende der Gilde | Gilden‑Rang V erreicht | `onGuildRankUp` |
| `ACH_MODIFIER_WIN` | Risikoreicher Sieg | 1 Expedition mit Modifikator gewonnen | `onExpeditionEnd(modifier != null)` |
| `ACH_SWAMP_CLEAR` | Sumpfbezwinger | `swamp_long` mit Boss‑Kill abgeschlossen | `onExpeditionEnd(route=swamp_long, bossKilled)` |

**Achievement‑Daten‑Schema:**
```json
{
  "id": "ACH_FIRST_BREAD",
  "name": "Erstes Brot",
  "description": "Produziere dein erstes Brot.",
  "icon": "🍞",
  "target": 1,
  "eventHook": "onProduce",
  "eventFilter": { "itemId": "bread" }
}
```

### 13.6 Statistik‑Screen (MVP)

**Konzept:** Ein eigener Screen (erreichbar über HUD‑Button oder Pause‑Menü) zeigt kumulative Spielstatistiken. Dient als Langzeit‑Motivation und unterstützt das Achievement‑System.

**Anzeige‑Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         📊  STATISTIKEN  📊                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🏗️ STADT                          ⚔️ EXPEDITIONEN                           │
│  ─────────                         ──────────────                            │
│  Gebäude gebaut:       24          Expeditionen total:     18                │
│  Straßen verlegt:      87          Davon erfolgreich:      12 (67%)         │
│  Höchste Einwohnerzahl: 22         Bosse besiegt:          6                │
│  Tage überlebt:        45          Retreats:               6                │
│                                                                              │
│  📦 PRODUKTION                     🗡️ KAMPF                                 │
│  ──────────                        ──────                                    │
│  Brot produziert:     156          Gegner besiegt:        142                │
│  Heiltränke gebraut:   23          Schaden ausgeteilt:   4.280               │
│  Kraftbrot gebacken:   12          Schaden erhalten:     2.810               │
│  Gear gecraftet:        8          Proviant verbraucht:    34                │
│                                                                              │
│  🏆 ACHIEVEMENTS                                                             │
│  ──────────────                                                              │
│  Freigeschaltet: 7 / 12                                                      │
│  [🍞 Erstes Brot] [⚔️ Abenteurer] [🏗️ Stadtplaner] [💀 Bossvernichter]    │
│  [🐺 Veteranentrupp] [⭐ Aufsteiger] [🌊 Sumpfbezwinger]                    │
│                                                                              │
│                        [← Zurück]                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Statistik‑Daten im SaveRoot:**
```json
{
  "statistics": {
    "buildingsBuilt": 24,
    "roadsPlaced": 87,
    "maxPopulation": 22,
    "daysSurvived": 45,
    "totalExpeditions": 18,
    "successfulExpeditions": 12,
    "totalBossKills": 6,
    "totalRetreats": 6,
    "totalEnemiesKilled": 142,
    "totalDamageDealt": 4280,
    "totalDamageTaken": 2810,
    "totalProvisionsUsed": 34,
    "itemsProduced": {
      "bread": 156,
      "healing_potion": 23,
      "power_bread": 12,
      "iron_sword": 3,
      "iron_shield": 3,
      "leather_armor": 2
    },
    "bossesDefeated": {
      "BOSS_ELDER_TREANT": 3,
      "BOSS_BANDIT_CHIEF": 0,
      "BOSS_CRYSTAL_GOLEM": 2,
      "BOSS_SWAMP_HYDRA": 1
    }
  }
}
```

**Event‑Integration:**
- Statistiken werden über dieselben Event‑Hooks wie Achievements aktualisiert.
- Jeder Produktions‑Tick, Kampf‑Output, Bau‑Event inkrementiert den entsprechenden Counter.
- `maxPopulation` wird bei jedem Pop‑Growth‑Event geprüft (Math.max).

---

## 14) Offene Fragen – mit MVP‑Entscheidungen

1. **Stein/Eisen im Stadtgebiet?**
   MVP: Steinbruch (`QUARRY`) als Producer für Stone. **Eisenmine (`IRON_MINE`)** als langsamer Producer für `iron_scrap` (1 alle 30s). Expeditionen bleiben die Hauptquelle, aber die Mine bietet eine stetige Grundversorgung.

2. **Wie viele Lagerhäuser?**
   MVP: Mehrere erlauben, Kapazität wird addiert. Connectivity = Pfad zu *irgendeinem*. Letztes Warehouse nicht abreißbar.

3. **Steuern pro Sekunde oder Tages‑Tick?**
   MVP: **Tages‑Tick** alle 60s.

4. **Movement im Auto‑Battler?**
   MVP: Kein echtes Positionssystem, nur Rundenmodell + SPD als Initiative/Cooldown.

5. **Day/Night‑Zyklus?**
   MVP: „Day" ist nur ein Counter. **Kein** visueller Licht‑Zyklus.

6. **Expedition blockierend?**
   MVP: **Nein.** Stadt simuliert weiter. Spieler wechselt frei zwischen Stadt und Expedition.

7. **Fighter als Worker nutzbar?**
   MVP: **Nein**, aber Fighter können im Gildenhaus **entlassen** werden (→ `IDLE`, Trainingskosten verloren, Gear zurück ins Lager). Siehe Teil 2, 7.5. Das gibt dem Spieler einen Ausweg bei zu vielen Fightern.

8. **Road‑Kosten?**
   MVP: `{ wood: 1, gold: 1 }` pro Tile, instant platziert, kein Builder nötig. Abriss kostenlos, keine Rückerstattung. Die Gold‑Kosten verhindern Gold‑Inflation bei großen Straßennetzen.

9. **Was passiert beim Abriss?**
   MVP: 50% Baukosten zurück (abgerundet), Worker → IDLE, Buffer → Lager (wenn connected) oder verloren. Letztes Warehouse nicht abreißbar. Siehe Teil 1, 4.6.

10. **Save‑Migration?**
    MVP: Fehlende Felder → Schema‑Defaults, unbekannte Felder → ignorieren. Migration fehlgeschlagen → „Save inkompatibel" + Option Neues Spiel. Siehe Teil 1, 0.3.

11. **Gear verlierbar?**
    MVP: **Nein.** Gear bleibt nach dem Run erhalten, auch bei Retreat oder wenn Unit downed wird. Gear ist eine **permanente Investition**. Post‑MVP‑Option: Gear‑Degradation oder Reparatur‑Kosten.

12. **Proviant teilweise verbraucht – was passiert bei Retreat?**
    MVP: Unverbrauchter Proviant geht **zurück ins globale Lager**. Verbrauchter Proviant ist weg. Kein Proviant‑Verlust durch Retreat selbst.

13. **Können mehrere Units dasselbe Gear‑Item tragen?**
    MVP: **Nein.** Jedes Gear‑Item ist ein **Unikat‑Stack** (`stackSize: 1`). Wenn ein Eisenschwert equipped ist, muss ein zweites gecraftet werden für eine andere Unit.

14. **Talisman‑Crafting wo?**
    MVP: Im **Gildenhaus‑UI** (Tab „Crafting" oder Button). Kein separates Gebäude, kein Worker, instant. Kosten werden aus globalem Lager abgezogen.

15. **Boss immer im letzten Room?**
    MVP: **Ja.** Wenn `bossId` auf der Route definiert ist, ist Room N (letzter) immer ein Boss‑Encounter. Die `encounterWeights` gelten nur für Rooms 1 bis N-1. Wenn `bossId: null`, ist der letzte Room ein normaler gewichteter Encounter.

16. **Was passiert wenn der Boss den Trupp besiegt?**
    MVP: Gleiche Regel wie normaler Retreat. Alle Units werden `INJURED_REST`, Loot wird auf 50% reduziert (der Boss‑Loot entfällt komplett). Der Boss gilt als **nicht besiegt** – der Spieler kann die Route erneut laufen.

17. **Cursed Wisp heilt Gegner – wie funktioniert das im Targeting?**
    MVP: Gegner mit `role: "support"` nutzen **dieselbe Healer‑Logik** wie Hero‑Healer: `target = ally_lowest_hp_pct` (bezogen auf die Gegner‑Seite). Der Wisp heilt den Gegner mit niedrigstem HP%. Wenn kein Gegner Schaden hat, greift der Wisp normal an (mit seinen schwachen 2 ATK). **Spieler‑Implikation:** Wisp ist ein Prioritäts‑Kill (wie in MMOs „kill the healer first").

18. **AoE‑Damage – trifft das auch den Caster?**
    MVP: **Nein.** `targets: "all_enemies"` bezieht sich auf alle Einheiten der **gegnerischen** Fraktion (aus Sicht des Casters). Ein Boss mit AoE trifft alle Helden, nicht sich selbst oder seine Adds.

---

## 15) Nächste Arbeitspakete (direkt in VS Code umsetzbar)

### 15.1 Implementierungsreihenfolge (10 Schritte)

**Schritt 1: Projekt‑Setup + Data Schemas + AI‑Sprite‑Loading**
- Vite + Phaser 3 + TypeScript Projekt aufsetzen
- **AI‑generierte Sprites** laden: Alle 50 PNGs aus `public/assets/sprites/final/` in der `BootScene` per `this.load.image(key, path)` registrieren (siehe Teil 1, 6.5.1). Sprites werden vorab via Google AI Studio API generiert und als fertige PNG‑Dateien abgelegt.
- Alle JSON‑Daten als TS‑const oder JSON‑Files anlegen:
  - `items.ts` (alle 18 Items: 10 Ressourcen + 3 Consumables + 1 Talisman + 3 Gear‑Waffen + 2 Gear‑Rüstungen + 1 Gear‑Trinket)
  - `buildings.ts` (12 Gebäude + ROAD)
  - `recipes.ts` (12 Rezepte, inkl. RCP_POWER_BREAD)
  - `classes.ts` (3 Helden‑Klassen)
  - `enemies.ts` (24 reguläre Gegner + 4 Bosse, 3 Biome)
  - `routes.ts` (4 Routen: forest_short, forest_medium, cave_deep, swamp_long)
  - `lootTables.ts` (6 biome + 4 boss = 10 Loot‑Tables)
  - `upgrades.ts` (1 Upgrade: Guild Hall T2)
  - `events.ts` (3 CityEvents)
  - `guildRanks.ts` (5 Ränge mit Bedingungen + Unlocks)
  - `achievements.ts` (12 Achievements mit Event‑Hooks)
  - `modifiers.ts` (3 Expeditions‑Modifikatoren)
- Loader + Runtime‑Registry (ID → Objekt Lookup)
- TypeScript Interfaces für alle Schemas

**Schritt 2: Grid + Placement + Roads + Demolish**
- Tile‑Array 40×36
- Occupancy Grid (Footprint‑Belegung)
- Ghost‑Preview (grün/rot)
- Snap‑to‑Grid Placement
- Road instant placement (1 Wood + 1 Gold, kein Builder)
- Demolish (50% Refund, Worker → IDLE, Buffer‑Transfer, letztes Warehouse blockiert)
- Kamera: Pan (Bildschirmrand + MMB‑Drag), Zoom (0.75×–2.0×), Bounds‑Clamp

**Schritt 3: Connectivity (BFS)**
- `isConnected(building)` → BFS über ROAD‑Tiles zu irgendeinem WAREHOUSE
- 4‑Way Nachbarschaft
- Rebuild‑Trigger bei Road/Building/Warehouse Place/Remove
- UI‑Indikator: connected/not connected pro Gebäude

**Schritt 4: Production System**
- Recipe Timer pro Gebäude‑Instanz
- Input‑Check (globalStock oder localInputBuffer)
- Output‑Check (localOutputBuffer oder globalStock)
- Overflow → Pause
- Water‑Supply‑Check (Manhattan‑Distanz zu nächstem WELL)
- City Simulation Tick (1.0s)
- UI: Produktionsfortschritt, „Fehlt Input X", „Output voll"

**Schritt 5: People System**
- Citizen‑Liste mit States (IDLE, BUILDER, WORKER, GUILD_TRAINING, GUILD_FIGHTER, INJURED_REST, ON_EXPEDITION)
- Worker Assignment an Gebäude (drag/click)
- Builder Assignment an Bau‑Aufträge (1 Builder pro Bau)
- Bau‑Timer + Pause wenn Builder abgezogen
- Housing‑Cap Berechnung
- **Fighter‑Rücktritt:** GUILD_FIGHTER → IDLE (Gear zurück, Stats verloren, kein Gold‑Refund)
- **Fighter‑Stadt‑Synergien** (Tages‑Tick): Zähle `GUILD_FIGHTER` mit Status ≠ ON_EXPEDITION/TRAINING/INJURED → ≥1: Satisfaction +3 pro Wohnhaus; ≥2: Training −10%; ≥3: Tax‑Mult +0.05 → `FighterSynergySystem.ts`
- Bevölkerungswachstum (Tages‑Tick: Housing‑Slot frei + Bread ≥ 1 + Satisfaction ≥ 40 → +1 Bürger, -1 Bread)
- Tages‑Tick (60s): Steuern (baseTaxPerMin × satisfaction/100), Pop‑Growth, Day‑Counter

**Schritt 6: Satisfaction System**
- Pro‑Wohnhaus Berechnung (Formel aus Teil 1, 6.3)
- Water‑Radius Check (Manhattan‑Distanz, Footprint‑zu‑Footprint)
- Comfort‑Cap (+25)
- Durchschnittliche Satisfaction für Pop‑Growth‑Check
- UI: Satisfaction‑Wert pro Haus (Tooltip), Gesamt‑Durchschnitt im HUD

**Schritt 7: Guild + Expedition System**
- **Training:** IDLE → Klasse wählen → 60s Timer → GUILD_FIGHTER
- **Gear Equip/Unequip:** Lager ↔ Unit, Slot‑Validierung, Stats additiv
- **Gear‑Wartung:** Nach Expedition 5 Gold pro ausgerüstetem Gear‑Item abziehen; falls Gold fehlt → 50% Bonus‑Penalty bis bezahlt
- **Talisman Crafting (MVP‑1):** Kosten‑Check → instant erstellen *(nicht in MVP‑0 – Talisman‑Slot bleibt leer/deaktiviert)*
- **Proviant laden:** Items mit Tag `provision` aus Lager in Provision‑Slots (inkl. power_bread)
- **Expeditions‑Modifikator wählen:** Radio‑Buttons im Gildenhaus vor Start (keiner / Fluch / Eisern / Todesmarsch); Unlock per Gilden‑Rang prüfen
- **Expedition starten:** Party wählen (1–3/4 Fighter), Route wählen (5 Routen, inkl. `grandmaster_trial` wenn Rang V erreicht), Modifikator + Proviant bestätigen → Units → ON_EXPEDITION
- **Modifikator anwenden:** Bei Run‑Start `activeModifier` speichern; bei jedem Combat‑Room Gegner‑Stats × `enemyStatMods` modifizieren; bei Loot‑Roll `rolls × lootMultiplier`
- **Encounter‑Deck generieren:** Rooms 1..N-1 per encounterWeights, Room N = Boss (wenn definiert) oder normal
- **Checkpoint‑Dialog:** Alle 3 Rooms Popup mit Optionen *Weiter* oder *Retreat (Loot behalten)*; bei Retreat sofortiges Run‑Ende (keine weiteren Rooms)
- **Encounter‑Auswahl:** Bei `find`‑ und `rest`‑Rooms binäre Wahl (z.B. „Truhe öffnen / Weitergehen", „Rasten / Erkunden"); Ergebnis beeinflusst Reward/Risiko; Biom‑spezifischer Flavor‑Text (kursiv, `TEXT_DIM`) per `flavorTextPool[biome][roomType]` vorangestellt (Abschnitt 9.8.1)
- **Merchant‑Encounter:** 1 zufälliges Item aus `rareLootTableId` anbieten, Preis = `baseValue × 3` Gold; Spieler kann kaufen oder ablehnen
- **Combat Loop:**
  - Initiative/Cooldown per SPD
  - Targeting (Taunt → Threat → Role Preference → Tiebreaker)
  - Damage (ATK − DEF, min 1, Crit)
  - Heal (ally_lowest_hp_pct, capped at maxHP)
  - Threat Tracking (damage × threatMultiplier, heal × 0.25)
  - Skill‑Effect‑Resolver (6 Types: damage, aoe_damage, heal, taunt, self_buff, buff_allies)
  - Boss: Enrage nach 8 Runden (+50% ATK)
  - Enemy Support: Wisp healt Gegner (ally_lowest_hp_pct aus Gegner‑Sicht)
  - **Fokusziel‑Skill** (Abschnitt 9.8.3): `player_clicks_enemy` → `activePartySkills.focusTarget` setzen; DPS‑Units prüfen `focusTarget.active` vor normalem Targeting → Override für 2 Runden; CD‑Countdown pro Runde; auto‑clear wenn Ziel tot
  - **Grandmaster Trial** (`grandmaster_trial`‑Route): 3 sequenzielle Boss‑Phasen (Raum 5/10/15), kein HP‑Restore zwischen Phasen; `noBossHealBetweenPhases: true` in `specialRules` prüfen
  - Downed‑Check (HP ≤ 0 → DOWNED)
  - Auto‑Retreat (Team‑HP% < 20%)
- **Proviant Auto‑Use + Manual Override:** nach jedem Room Auto‑Use (HP < 50% → Potion > Power Bread > Bread > Herb; Buff‑Items vor erstem Combat). Spieler kann innerhalb 5s manuell ein Item wählen; bei Timeout greift Auto‑Logik
- **Room Rewards:** combat → loot, find → loot + 10% rare, hazard → -5HP, rest → +10HP, survivor → +1 Bürger, merchant → Kauf‑Angebot, boss → rare + boss‑loot
- **Gilden‑Rang‑Check:** Am Run‑Ende Fortschritt für Gilden‑Rang prüfen (Runs, Bosse, Loot‑Total gemäß Abschnitt 1.5)
- **Achievement‑Check:** Bei jedem relevanten Event (Kill, Boss, Produce, Build) → `AchievementSystem.check(event)` → ggf. Unlock + Banner
- **Statistik‑Update:** Bei jedem relevanten Event → `StatisticsSystem.increment(stat, value)` → Counter im SaveRoot aktualisieren
- **Run‑Ende:** Loot → Lager, Proviant‑Rest → Lager, Gear‑Wartungskosten abziehen, Units → GUILD_FIGHTER oder INJURED_REST (120s), Survivors → Pop, Achievements prüfen, Statistiken aktualisieren

**Schritt 8: Upgrade System**
- Guild Hall T2: Kosten‑Check (60 Wood, 20 Stone, 3 Crystal Shard, 80 Gold)
- Upgrade‑Timer (120s, braucht 1 Builder)
- In‑Place Upgrade (Tier 1 → 2, partySlots 3 → 4)
- UI: Upgrade‑Button im Building Panel (wenn Ressourcen reichen)

**Schritt 9: UI Assembly**
- **HUD** (Top Bar): Ressourcen, Gold, Pop, Fighters, Tax/min, Day, **Gilden‑Rang‑Anzeige** (aktueller Rang + Fortschrittsbalken), **Statistik‑Button** (📊)
- **Build Menu** (Bottom Bar): 12 Gebäude + Road, Kategorien, Hotkeys, Tooltips (Kosten, Bauzeit, Effekt)
- **Building Panel** (Right): Info, Connectivity, Water, Buffer, Recipe‑Timer, Workers, Upgrade‑Button, **Rezept‑Dropdown** (bei Gebäuden mit mehreren Rezepten)
- **Gildenhaus‑UI** (Modal/Fullscreen): Roster, Gear, Training, Proviant, Talisman, Route‑Wahl (5 Routen, `grandmaster_trial` ausgegraut bis Rang V), **Modifikator‑Wahl** (Radio‑Buttons), Start‑Button, **Gilden‑Rang‑Banner** (Rang‑Name + nächste Bedingung), **Gear‑Wartungs‑Indikator** (Kosten pro Item, Schulden‑Warnung), **Fighter‑Synergy‑Panel** (🛡️ „Stadtschutz: N Fighter aktiv" + aktive Bonus‑Icons; nur sichtbar wenn ≥1 GUILD_FIGHTER not on expedition)
- **Expedition‑UI** (Overlay): Party HP‑Bars, Combat‑Log, Proviant‑Anzeige, Room‑Progress, **aktiver Modifikator** (⚡-Icon + Name), **Checkpoint‑Dialog** (Weiter/Retreat nach 3 Rooms), **Manual Proviant Button** (5s Timer‑Bar), **Encounter‑Auswahl** (binäre Optionen bei find/rest Rooms), **Gegner‑Icons klickbar** (Fokusziel‑Click‑Handler: aktives Fokusziel orange umrahmt, CD‑Leiste unter Gegner‑Icons wenn aktiv)
- **Expedition‑Status** (Bottom Bar Leiste): Room X/Y, Team HP%, Proviant‑Count, Modifikator‑Icon → Klick öffnet Expedition‑UI
- **Run‑Summary** (Modal): Ergebnis, Team‑Status, Loot‑Liste (mit Modifikator‑Bonus markiert), Proviant‑Verbrauch, Survivors, **Gear‑Wartungskosten**, **Gilden‑Rang‑Fortschritt**, **Achievement‑Unlocks** (wenn neu)
- **Statistik‑Screen** (Modal/Fullscreen): Alle kumulativen Stats + Achievement‑Übersicht (siehe 13.6)
- **Achievement‑Banner** (Top/Center): Bei Unlock 3s goldener Banner mit Icon + Name + Beschreibung
- **CityEvent‑Banner** (Top/Center): Event‑Name + Icon + Beschreibung + Aktion‑Button (z.B. „Handel annehmen"), Auto‑Dismiss nach Ablauf
- **Demolish‑Confirm** (Modal): Warnung bei Buffer‑Verlust
- **Save/Load** (Modal): Slot‑Auswahl, Version‑Info

**Schritt 10: Save/Load + Polish**
- LocalStorage Serialisierung (SaveRoot Schema aus Teil 2, 10.8)
- Save‑Version + Migration Pipeline
- **guildStats** im SaveRoot persistieren (totalRuns, bossKills, totalLootValue, currentRank, gearDebtGold)
- **activeEvent** im SaveRoot persistieren (eventId, remainingMs, null wenn inaktiv)
- **achievements** im SaveRoot persistieren (`{ [id]: { unlocked, counter } }`)
- **statistics** im SaveRoot persistieren (alle kumulativen Zähler, siehe 13.6)
- **activeModifier** im ExpeditionRun persistieren (für Save während laufender Expedition)
- Seeded RNG (für Expedition‑Determinismus)
- Moments of Delight: Produktions‑Plopp, Expedition‑Fanfare, Boss‑Defeat‑Screen, Siedler‑Banner, **Rang‑Aufstieg‑Feier**, **CityEvent‑Einblendung**, **Achievement‑Banner** (goldener Rahmen, Sound‑Jingle)
- Balance Pass: Bauzeiten, Loot‑Weights, Enemy‑Stats, Provision‑Healing, Gear‑Boni, **Gear‑Wartungskosten**, **Gilden‑Rang‑Schwellen**, **Modifikator‑Multiplikatoren**
- Bugfixes + Edge Cases

### 15.2 Datei‑Struktur (Empfehlung)
```
src/
├── main.ts                  // Phaser Game Config + Boot
├── scenes/
│   ├── BootScene.ts
│   ├── MainMenuScene.ts
│   ├── CityScene.ts         // CITY_PLAY + BUILD_MODE
│   ├── GuildScene.ts        // GUILDHOUSE_MENU (Overlay/Modal)
│   ├── ExpeditionScene.ts   // EXPEDITION_RUN (Overlay)
│   └── StatisticsScene.ts   // Statistik-Screen (Modal/Fullscreen)
├── rendering/
│   └── Colors.ts            // UI COLOR Palette Konstante (für code‑gezeichnete UI‑Elemente, siehe Teil 1, 6.5.1)
├── systems/
│   ├── GridSystem.ts        // Occupancy, Placement, Demolish
│   ├── ConnectivitySystem.ts // BFS, rebuild triggers
│   ├── ProductionSystem.ts  // Recipe timers, buffers
│   ├── PeopleSystem.ts      // Citizens, states, assignment
│   ├── SatisfactionSystem.ts // Per-house calc, water radius
│   ├── EconomySystem.ts     // Gold, taxes, day tick
│   ├── ExpeditionSystem.ts  // Encounter deck, combat loop, modifier application
│   ├── GearSystem.ts        // Equip/unequip, stat calc
│   ├── ProvisionSystem.ts   // Auto-use logic, loading
│   ├── UpgradeSystem.ts     // Tier upgrades
│   ├── EventSystem.ts       // CityEvent-Trigger, Timer, Effekte
│   ├── GuildRankSystem.ts   // Rang-Berechnung, Unlock-Prüfung
│   ├── AchievementSystem.ts // Event-Hooks, Counter, Unlock-Logik
│   ├── StatisticsSystem.ts  // Kumulative Zähler, Event-Integration
│   ├── ModifierSystem.ts    // Expeditions-Modifikator Anwendung + Unlock-Check
│   ├── FighterSynergySystem.ts // Fighter-Stadt-Boni (Satisfaction, Training-Speed, Tax-Mult) – Tages-Tick
│   └── SaveSystem.ts        // Serialize, deserialize, migrate
├── data/
│   ├── items.ts             // 18 Items (crystal_shard mit productionSource: expedition_only)
│   ├── buildings.ts         // 12 Gebäude + ROAD
│   ├── recipes.ts           // 12 Rezepte (inkl. RCP_POWER_BREAD)
│   ├── classes.ts           // 3 Helden-Klassen
│   ├── enemies.ts           // 24 reguläre Gegner + 4 Bosse (3 Biome)
│   ├── routes.ts            // 5 Routen (forest_short, forest_medium, cave_deep, swamp_long, grandmaster_trial + 4 Post-MVP)
│   ├── lootTables.ts        // 10 Loot-Tables (6 biome + 4 boss)
│   ├── upgrades.ts          // 1 Upgrade: Guild Hall T2
│   ├── events.ts            // 3 CityEvent-Definitionen
│   ├── guildRanks.ts        // 5 Rang-Stufen + Bedingungen + Unlocks
│   ├── achievements.ts      // 12 Achievements mit Event-Hooks + Targets
│   └── modifiers.ts         // 3 Expeditions-Modifikatoren (Fluch, Eisern, Todesmarsch)
├── models/
│   ├── GameState.ts         // Central state (inkl. statistics, achievements)
│   ├── Building.ts          // Runtime building instance
│   ├── Citizen.ts           // Runtime citizen
│   ├── GuildRoster.ts       // Fighters + gear
│   └── ExpeditionRun.ts     // Active run state (inkl. activeModifier)
├── ui/
│   ├── HUD.ts               // Top Bar + Statistik-Button
│   ├── BuildMenu.ts         // Bottom Bar + Kategorien
│   ├── BuildingPanel.ts     // Right Panel + Rezept-Dropdown
│   ├── GuildUI.ts           // Roster + Modifikator-Wahl
│   ├── ExpeditionUI.ts      // Combat + Modifikator-Anzeige
│   ├── RunSummary.ts        // Ergebnis + Achievement-Unlocks
│   ├── AchievementBanner.ts // Goldener Banner bei Unlock (3s)
│   ├── StatisticsUI.ts      // Statistik-Screen Darstellung
│   └── Tooltips.ts
└── utils/
    ├── RNG.ts               // Seeded random
    ├── Pathfinding.ts       // BFS for connectivity
    └── ManhattanDist.ts     // Footprint-to-footprint distance
```

---

## 16) Änderungslog

| Version | Datum | Änderungen |
|---------|-------|------------|
| v1.6 | — | Original‑Version (8 Gebäude, 4 Rezepte, 3 Gegner, kein Gear/Proviant) |
| v1.7 | — | Deadlock‑Fixes, Steinbruch, Kräutergarten, Road‑Definition, Abriss, Pop‑Growth, Training, Save‑Migration, 2 Routen, Moments of Delight |
| **v2.0** | 2026‑02‑22 | **Neue Systeme:** Schmiede (SMITHY) als 11. Gebäude, **Gear‑System** (6 Items: 3 Waffen + 2 Rüstungen + 1 Trinket), **Proviant‑Mechanik** (Auto‑Use mit Prioritäten), **Talisman‑System** (1 craftbarer Talisman), **Boss‑System** (Enrage, AoE, garantierter Loot). **Content:** +10 neue Gegner (13 reguläre gesamt), +2 Bosse (Elder Treant, Bandit Chief), +5 Boss/Gear Loot‑Tables, +4 neue Rezepte (Healing Potion, Iron Sword, Iron Shield, Leather Armor), +7 neue Items (3 Gear + 1 Consumable + 1 Talisman + 2 Gear als Loot‑Only). **Klarstellungen:** Alle offenen Fragen beantwortet (18 statt 10), Gildenhaus‑UI Wireframe, Expedition‑UI Wireframe, Run‑Summary Wireframe, Combat‑Balance Referenzwerte, Gegner‑Tier‑Empfehlung, Datei‑Struktur‑Empfehlung. **Fixes:** Loot‑Tables aktualisiert mit Gear‑Drops und iron_scrap in basic table, Skill‑Effect‑Types als einheitliche Tabelle. **Dokument:** Aufgeteilt in 3 Teile für bessere Handhabbarkeit. |
| **v2.1** | 2025‑06‑22 | **Neue Gebäude:** Eisenmine (IRON_MINE, 12. Gebäude, produziert iron_scrap). **Neue Systeme:** Gilden‑Rang‑System (5 Ränge: Novize → Legende, Bedingungen + Unlocks, Abschnitt 1.5), CityEvent‑System MVP (3 Events: Wanderhändler, Erntesegen, Unwetter, Abschnitt 13.4), Fighter‑Rücktritt (Abschnitt 7.5), Gear‑Wartungskosten (5 Gold/Item nach Expedition). **Spieler‑Entscheidungen:** Checkpoint‑Dialog (alle 3 Rooms Weiter/Retreat), Manual Proviant Override (5s Timer), Encounter‑Auswahl (binäre Optionen bei find/rest Rooms, Abschnitt 9.8.1). **Balancing:** Start‑Pop 6 → 8 (6 Idle + 2 Builder), Road‑Kosten + 1 Gold, iron_scrap Loot‑Weight 5% → 12%, neues Rezept RCP_IRON_SCRAP_1. **Visuals:** Neuer Abschnitt 6.5 Art‑Style & Visuelle Identität (Pixel Art 32×32, Animationen‑Tabelle, Sound‑Design). **Scope:** MVP auf 12 Gebäude, 17 Items, 11 Rezepte erweitert; Datei‑Struktur um EventSystem.ts, GuildRankSystem.ts, events.ts, guildRanks.ts ergänzt. |
| **v2.2** | 2025‑06‑22 | **Massive Content‑Erweiterung:** 4 Routen statt 2 (neue Biome Cave + Swamp: `cave_deep` 8 Rooms, `swamp_long` 12 Rooms). +11 neue Gegner (5 Cave + 6 Swamp; jetzt 24 reguläre gesamt). +2 neue Bosse (Crystal Golem, Swamp Hydra; jetzt 4 gesamt). +5 neue Loot‑Tables (jetzt 10 gesamt). **Neue Systeme:** Expeditions‑Modifikatoren (3 Risk/Reward: Fluch des Waldes, Eiserne Prüfung, Todesmarsch), Achievements (12 Meilensteine mit Event‑Hooks), Statistik‑Screen (kumulative Spielstatistiken), Rezept‑Wechsel (Dropdown). **Neues Rezept:** RCP_POWER_BREAD. **Merchant‑Fix:** bietet 1× Random‑Item statt nichts. **Visuals:** AI‑generierte Pixel‑Art Sprites als fertige PNGs (via Google AI Studio API, kein SpriteFactory). **Economy:** baseTaxPerMin 1→2. **Scope:** MVP auf 18 Items, 12 Rezepte, 24+4 Gegner, 4 Routen, 10 Loot‑Tables, 12 Achievements, 3 Modifikatoren, 17 MVP‑Punkte, ~60–90min Session erweitert. +8 neue Dateien in Datei‑Struktur. |
| **v2.4** | 2026‑02‑23 | **Agent‑kritische Fixes + Spaßfaktor‑Verbesserungen:** 1) **SpriteFactory‑Widerspruch bereinigt** – Alle Referenzen auf `SpriteFactory.ts` / prozedurale Sprites aus Teil 3 (13.1, 15.1, 15.2, 13.2, Changelog) entfernt; Dokument ist jetzt konsistent auf AI‑generierte PNGs (Teil 1, 6.5). 2) **MVP in 3 Phasen aufgeteilt** (13.1): MVP‑0 (3 Klassen, 3 Routen, 2 Bosse, T1‑Gear, ~30–45min), MVP‑1 (CityEvents, Gilden‑Rang, Achievements, 4. Route), Post‑MVP (XP, 10 Klassen, Scoreboard). 3) **Aktiver Notfall‑Skill** (9.8.2): Party‑Skill „Verzweifelter Wille" (1× pro Run, +3 ATK/+2 DEF für 2 Runden, manuell ausgelöst) – bricht Auto‑Battler‑Passivität ohne Decision‑Overload. 4) **Bäckerei→Schmiede Querabhängigkeit** (8.3.4): Bäckerei hat `radiusEffect: charcoal_supply, 5 Tiles` – Schmiede im Radius produziert ×1.5 schneller. Macht Stadtlayout‑Entscheidungen interessanter. 5) **Weltgröße 64×64 → 32×32** (0.2, 2.4, 4.5, 15.1): Welt fühlt sich voller an, Straßenbau macht früher Sinn. 6) **Tutorial überarbeitet** (2.4): Von Checkliste zu geführtem Onboarding mit „Moment of Delight" – endet mit erstem Expeditionserfolg + Banner „Deine erste Gilde ist geboren!". |
| **v2.5** | 2026‑02‑23 | **Spaßfaktor‑Systemerweiterungen (7 Änderungen):** 1) **Gildenhaus als Start‑Gebäude** (2.4, Teil 1): `GUILD_HALL` wird zusammen mit Warehouse + House vorgebaut gestartet – Expedition‑Branche ist von Sekunde 1 greifbar, Motivationsbrücke zu Produktionssystem von Anfang an sichtbar. 2) **Tutorial Phase 2 angepasst** (2.4, Teil 1): Gildenhaus‑Bauschritt entfällt, Fokus liegt jetzt auf „Gold verdienen → Kämpfer trainieren". 3) **Rang V schaltet `grandmaster_trial` frei** (1.5, Teil 1 + 9.2, Teil 2): Neue Endgame‑Route mit 3 aufeinanderfolgenden Bossen (Treant/Golem/Hydra), 15 Rooms, kein HP‑Restore zwischen Phasen – echtes Skill‑Check‑Endgame für Rang‑V‑Spieler. 4) **Taktischer Zielwechsel „Fokusziel"** (9.8.3, Teil 2): Zweiter Party‑Skill – Spieler klickt auf Gegner‑Icon im Kampf, alle DPS‑Units fokussieren ihn 2 Runden. CD 4 Runden, unbegrenzte Nutzungen. Ergänzt „Verzweifelter Wille" (reaktiv/defensiv) um taktisch‑offensives Element. 5) **crystal_shard Expedition‑Anker** (8.3.12, Teil 2): Klare Regel dokumentiert: `crystal_shard` hat `productionSource: "expedition_only"` – kein Stadt‑Gebäude darf es produzieren; sichert T2‑Gear‑Motivation dauerhaft. 6) **Fighter‑Stadt‑Synergien** (7.6, Teil 2): ≥1 Fighter → Satisfaction +3; ≥2 → Training −10%; ≥3 → Tax‑Mult +5%. Macht Fighter‑Präsenz in Stadt wertvoll, mildert den Worker‑Verlust‑Frust. 7) **Tiefere Encounter‑Wahlen + Biome Flavor‑Texte** (9.8.1 Abschnitt 3, Teil 2): Encounter‑Optionen mit Kosten/Nutzen‑Spannung (riskant vs. sicher) + atmosphärische Flavor‑Texte pro Biom/Room‑Typ als Log‑Zeilen im Expedition‑UI. |

---

## Anhang A: Vollständige ID‑Referenz (Quick‑Lookup)

### Items (18)
| ID | Type | Herkunft |
|---|---|---|
| `wood` | resource | Lumber Camp |
| `stone` | resource | Quarry |
| `grain` | resource | Farm |
| `flour` | resource | Mill |
| `bread` | resource | Bakery |
| `gold` | currency | Steuern + Loot |
| `herb_green` | resource | Herb Garden + Loot |
| `crystal_shard` | resource | Rare Loot + Boss Loot |
| `iron_scrap` | resource | Iron Mine + Loot (basic + rare) |
| `talisman_fragment` | resource | Rare Loot |
| `healing_potion` | consumable | Herb Garden (Rezept RCP_HEALING_POTION) |
| `power_bread` | consumable | Bakery (Rezept RCP_POWER_BREAD) |
| `iron_sword` | gear/weapon | Smithy + Boss Loot |
| `iron_shield` | gear/armor | Smithy |
| `leather_armor` | gear/armor | Smithy |
| `hunter_bow` | gear/weapon | Boss Loot only (MVP) |
| `oak_staff` | gear/weapon | Boss Loot only (MVP) |
| `wolf_fang_necklace` | gear/trinket | Rare Loot only |
| `talisman_fortitude` | talisman | Gildenhaus Crafting |

### Gebäude (12 + Road)
| ID | Category | Workers | Connectivity |
|---|---|---|---|
| `ROAD` | infrastructure | 0 | nein |
| `FARM_GRAIN` | producer | 1 | ja |
| `WELL` | utility | 0 | nein |
| `MILL_WIND` | refine | 1 | ja |
| `BAKERY` | refine | 1 | ja |
| `LUMBER_CAMP` | producer | 1 | ja |
| `QUARRY` | producer | 1 | ja |
| `WAREHOUSE` | storage | 0 | nein |
| `HOUSE_T1` | housing | 0 | ja |
| `GUILD_HALL` | hub | 0 | ja |
| `HERB_GARDEN` | producer | 1 | ja |
| `SMITHY` | refine | 1 | ja |
| `IRON_MINE` | producer | 1 | ja |

### Rezepte (12)
| ID | Gebäude | Input → Output |
|---|---|---|
| `RCP_GRAIN_1` | FARM_GRAIN | — → 2 grain |
| `RCP_WOOD_1` | LUMBER_CAMP | — → 2 wood |
| `RCP_STONE_1` | QUARRY | — → 1 stone |
| `RCP_FLOUR_1` | MILL_WIND | 2 grain → 2 flour |
| `RCP_BREAD_1` | BAKERY | 2 flour → 1 bread (💧) |
| `RCP_POWER_BREAD` | BAKERY | 2 flour + 1 herb_green → 1 power_bread (💧) |
| `RCP_HERB_1` | HERB_GARDEN | — → 1 herb_green (💧) |
| `RCP_HEALING_POTION` | HERB_GARDEN | 3 herb_green → 1 healing_potion (💧) |
| `RCP_IRON_SCRAP_1` | IRON_MINE | — → 1 iron_scrap |
| `RCP_IRON_SWORD` | SMITHY | 2 iron_scrap + 1 wood → 1 iron_sword |
| `RCP_IRON_SHIELD` | SMITHY | 2 iron_scrap + 1 wood → 1 iron_shield |
| `RCP_LEATHER_ARMOR` | SMITHY | 1 iron_scrap + 2 wood → 1 leather_armor |

> 💧 = benötigt `waterSupplied = true`

### Gegner (24 reguläre + 4 Bosse)
| ID | Role | HP | ATK | Biom | Route |
|---|---|---|---|---|---|
| `ENEMY_FOREST_WOLF` | skirmisher | 18 | 5 | Forest | short + medium |
| `ENEMY_BANDIT_RAIDER` | fighter | 26 | 4 | Forest | short + medium |
| `ENEMY_CAVE_SLIME` | brute | 34 | 3 | Forest | short + medium |
| `ENEMY_THORN_SPRITE` | skirmisher | 14 | 4 | Forest | short + medium |
| `ENEMY_FUNGAL_CREEPER` | debuffer | 22 | 3 | Forest | short + medium |
| `ENEMY_SHADOW_BAT` | skirmisher | 12 | 5 | Forest | medium |
| `ENEMY_MOSS_GOLEM` | brute | 42 | 4 | Forest | medium |
| `ENEMY_VENOMFANG_SPIDER` | fighter | 20 | 6 | Forest | medium |
| `ENEMY_GOBLIN_SCOUT` | skirmisher | 15 | 4 | Forest | medium |
| `ENEMY_WILD_BOAR` | charger | 28 | 5 | Forest | medium |
| `ENEMY_HOLLOW_SHADE` | assassin | 16 | 7 | Forest | medium |
| `ENEMY_BRAMBLE_BEAR` | brute | 38 | 5 | Forest | medium |
| `ENEMY_CURSED_WISP` | support | 10 | 2 | Forest | medium (heilt Gegner!) |
| `ENEMY_CRYSTAL_BEETLE` | fighter | 20 | 4 | Cave | cave_deep |
| `ENEMY_DEEP_CRAWLER` | skirmisher | 16 | 6 | Cave | cave_deep |
| `ENEMY_MINE_SPECTER` | debuffer | 28 | 5 | Cave | cave_deep |
| `ENEMY_STALACTITE_BAT` | skirmisher | 10 | 5 | Cave | cave_deep |
| `ENEMY_MAGMA_SLUG` | brute | 35 | 3 | Cave | cave_deep |
| `ENEMY_BOG_WITCH` | support | 30 | 4 | Swamp | swamp_long |
| `ENEMY_SWAMP_TROLL` | brute | 40 | 5 | Swamp | swamp_long |
| `ENEMY_LEECH_SWARM` | skirmisher | 18 | 6 | Swamp | swamp_long |
| `ENEMY_MIRE_PHANTOM` | assassin | 22 | 8 | Swamp | swamp_long |
| `ENEMY_TOXIC_TOAD` | debuffer | 24 | 4 | Swamp | swamp_long |
| `ENEMY_ROT_WALKER` | charger | 32 | 5 | Swamp | swamp_long |
| `BOSS_ELDER_TREANT` | boss | 80 | 6 | Forest | medium (letzter Room) |
| `BOSS_BANDIT_CHIEF` | boss | 65 | 8 | Forest | Post‑MVP (forest_long) |
| `BOSS_CRYSTAL_GOLEM` | boss | 90 | 7 | Cave | cave_deep (letzter Room) |
| `BOSS_SWAMP_HYDRA` | boss | 100 | 6 | Swamp | swamp_long (letzter Room) |
| `BOSS_SPIDER_QUEEN` | boss | 75 | 5 | Cave | cave_spider (letzter Room) |
| `BOSS_FALLEN_KNIGHT` | boss | 95 | 9 | Ruins | ruins_crypts (letzter Room) |
| `BOSS_SHADOW_LICH` | boss | 70 | 6 | Ruins | ruins_depths (letzter Room) |
| `BOSS_MAGMA_WYRM` | boss | 130 | 8 | Volcano | volcano_core (letzter Room) |

### Routen (9 gesamt)
| ID | Biom | Rooms | Boss | Schwierigkeit | Unlock |
|---|---|---|---|---|---|
| `forest_short` | Forest | 6 | — | ★☆☆☆ Einstieg | Start |
| `forest_medium` | Forest | 10 | Elder Treant | ★★☆☆ Mittel | Rang I |
| `cave_deep` | Cave | 8 | Crystal Golem | ★★★☆ Fortgeschritten | Rang I |
| `cave_spider` | Cave | 8 | Spider Queen | ★★☆☆ Alternativ | Crystal Golem besiegt |
| `swamp_long` | Swamp | 12 | Swamp Hydra | ★★★★ Schwer | Rang II |
| `ruins_crypts` | Ruins | 10 | Fallen Knight | ★★★☆ Fortgeschritten | Treant + Golem besiegt |
| `ruins_depths` | Ruins | 12 | Shadow Lich | ★★★★ Schwer | Fallen Knight besiegt |
| `volcano_core` | Volcano | 14 | Magma Wyrm | ★★★★ Endgame | Hydra + Knight besiegt |
| `grandmaster_trial` | Mixed | 15 | **3× Bosse** | ★★★★★ Großmeister | **Rang V** |

### Loot‑Tables (18)
| ID | Typ | Verwendet in |
|---|---|---|
| `forest_basic` | Standard‑Loot (iron_scrap 12%) | Forest combat/find rooms |
| `forest_rare` | Seltener Loot (inkl. Gear) | Forest find (10%), Boss‑Bonus |
| `cave_basic` | Höhlen‑Loot (crystal_shard 8%) | Cave combat/find rooms |
| `cave_rare` | Seltener Höhlen‑Loot (Crystal‑Gear) | Cave find (10%), Boss‑Bonus |
| `swamp_basic` | Sumpf‑Loot (herb_green häufig) | Swamp combat/find rooms |
| `swamp_rare` | Seltener Sumpf‑Loot (Trinkets) | Swamp find (10%), Boss‑Bonus |
| `ruins_basic` | Ruinen‑Loot (hohe Crystal/Iron) | Ruins combat/find rooms |
| `ruins_rare` | Seltener Ruinen‑Loot (T2 Gear‑Chance) | Ruins find (10%), Boss‑Bonus |
| `volcano_basic` | Vulkan‑Loot (höchster Ertrag) | Volcano combat/find rooms |
| `volcano_rare` | Seltener Vulkan‑Loot (T2 Gear häufig, 2 Rolls) | Volcano find (10%), Boss‑Bonus |
| `boss_treant_loot` | Boss‑garantiert | Elder Treant |
| `boss_bandit_loot` | Boss‑garantiert | Bandit Chief |
| `boss_crystal_golem_loot` | Boss‑garantiert | Crystal Golem |
| `boss_swamp_hydra_loot` | Boss‑garantiert | Swamp Hydra |
| `boss_spider_queen_loot` | Boss‑garantiert | Spider Queen |
| `boss_fallen_knight_loot` | Boss‑garantiert | Fallen Knight |
| `boss_shadow_lich_loot` | Boss‑garantiert (2 Rolls) | Shadow Lich |
| `boss_magma_wyrm_loot` | Boss‑garantiert (2 Rolls) | Magma Wyrm |
| `grandmaster_basic` | Mixed‑Biom Standardloot | Grandmaster Trial combat/find |
| `grandmaster_rare` | Kombinierter Boss‑Loot (Rolls aus allen 3 Boss‑Tables) | Grandmaster Trial boss phases |

### Expeditions‑Modifikatoren (6)
| ID | Name | Malus | Bonus | Unlock |
|---|---|---|---|---|
| `curse_of_the_forest` | Fluch des Waldes | +25% ATK | ×1.5 Loot | 2 Expeditionen |
| `iron_trial` | Eiserne Prüfung | +30% HP | +15% Rare‑Chance | Rang II |
| `death_march` | Todesmarsch | +25% ATK + 30% HP | ×2.0 Loot + garantiert Rare | Rang III |
| `elite_guard` | Elitewache | +1 Gegner pro Pack | +1 Loot‑Roll pro Combat | 1 Boss besiegt |
| `speed_march` | Geschwindmarsch | Max 10 Runden | +50% XP | Held Level 5 |
| `nemesis` | Nemesis | Boss ×2 HP + Extra‑Skill | 3 Boss‑Rolls + T3‑Gear | Alle 8 Bosse besiegt |

### Achievements (18)
| ID | Name | Bedingung |
|---|---|---|
| `ACH_FIRST_BREAD` | Erstes Brot | 1× bread produziert |
| `ACH_BAKER_10` | Meisterbäcker | 10× bread produziert |
| `ACH_FIRST_EXPEDITION` | Abenteurer | 1. Expedition abgeschlossen |
| `ACH_BOSS_FIRST` | Bossvernichter | 1 Boss besiegt |
| `ACH_BOSS_ALL` | Meister aller Bosse | Alle 8 Bosse je 1× besiegt |
| `ACH_ENEMIES_50` | Veteranentrupp | 50 Gegner besiegt |
| `ACH_ENEMIES_200` | Legendäre Krieger | 200 Gegner besiegt |
| `ACH_ALL_BUILDINGS` | Stadtplaner | Alle 12 Gebäudetypen gebaut |
| `ACH_GUILD_RANK_3` | Aufsteiger | Gilden‑Rang III erreicht |
| `ACH_GUILD_RANK_5` | Legende der Gilde | Gilden‑Rang V erreicht |
| `ACH_MODIFIER_WIN` | Risikoreicher Sieg | 1 Expedition mit Modifikator gewonnen |
| `ACH_SWAMP_CLEAR` | Sumpfbezwinger | swamp_long mit Boss‑Kill abgeschlossen |
| `ACH_HERO_LV10` | Meisterheld | 1 Held erreicht Level 10 |
| `ACH_ALL_CLASSES` | Klassenmeister | Alle 10 Klassen freigeschaltet |
| `ACH_INFERNAL_WIN` | Infernaler Sieg | 1 Route auf Infernal abgeschlossen |
| `ACH_WEEKLY_DONE` | Herausforderer | 1 Wöchentliche Herausforderung abgeschlossen |
| `ACH_SCORE_5000` | Highscore‑Jäger | Score über 5.000 in einem Run |
| `ACH_WYRM_SLAYER` | Wyrmschlächter | Magma‑Wyrm auf Alptraum+ besiegt |
| `ACH_GRANDMASTER` | Gildenmeister | `grandmaster_trial` erfolgreich abgeschlossen |

### Helden‑Klassen (10)
| ID | Role | HP | ATK | DEF | SPD | Skill | Unlock |
|---|---|---|---|---|---|---|---|
| `HERO_GUARDIAN` | tank | 30 | 3 | 4 | 1.0 | TAUNT | Start |
| `HERO_RANGER` | dps | 22 | 6 | 1 | 1.15 | POWER_SHOT | Start |
| `HERO_CLERIC` | healer | 24 | 2 | 2 | 1.0 | HEAL_SMALL | Start |
| `HERO_BERSERKER` | dps | 28 | 7 | 2 | 1.1 | RAGE | Elder Treant besiegt |
| `HERO_ASSASSIN` | dps | 18 | 8 | 0 | 1.4 | EXECUTE | Bandit Chief besiegt |
| `HERO_PALADIN` | tank | 32 | 4 | 4 | 0.9 | HOLY_SHIELD | Guardian Lv5 |
| `HERO_BARD` | support | 20 | 3 | 1 | 1.1 | WARSONG | 10 Expeditionen |
| `HERO_WITCH` | dps | 19 | 5 | 0 | 1.2 | CHAIN_LIGHTNING | Crystal Golem besiegt |
| `HERO_NECROMANCER` | summoner | 20 | 4 | 1 | 1.0 | RAISE_SKELETON | Shadow Lich besiegt |
| `HERO_DRUID` | hybrid | 25 | 4 | 2 | 1.0 | NATURE_SHIFT | Treant + Hydra besiegt |

---

**Ende des Game Design Documents v2.5 (Gildenhaus‑Start + Fokusziel + Grandmaster‑Trial + Fighter‑Synergien Edition)**

> Dieses Dokument besteht aus **3 Teilen**:
> 1. `Magic_City_GDD_v2_0_Teil_1_Abschnitte_0-6.md` – Abschnitte 0–6 (Tech, Grid, Logistik, Economy)
> 2. `Magic_City_GDD_v2_0_Teil_2_Abschnitte_7-10.md` – Abschnitte 7–10 (Bewohner, Gebäude, Expeditionen, Datenmodelle)
> 3. `Magic_City_GDD_v2_0_Teil_3_Abschnitte_11-16.md` – Abschnitte 11–16 (UI, Balancing, MVP‑Scope, Arbeitspakete) + Anhang A
>
> Anhang A dient als Quick‑Reference.
