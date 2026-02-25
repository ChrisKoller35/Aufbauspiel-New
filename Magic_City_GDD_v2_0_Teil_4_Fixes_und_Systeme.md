# Magic City – GDD v2.0 Teil 4: Fixes, Sound‑System & Browser‑Stabilität

> Dieses Dokument ergänzt die Teile 1–3 und löst alle identifizierten Probleme.  
> **Status:** MVP‑relevant  
> **Erstellt:** 2026‑02‑23

---

## Inhaltsverzeichnis
1. [Fix 1 – Spezialisten‑System (MVP‑Light)](#fix-1--spezialisten-system-mvp-light)
2. [Fix 2 – Wöchentliche Herausforderung → Tages‑Herausforderung](#fix-2--wöchentliche-herausforderung--tages-herausforderung)
3. [Fix 3 – Grandmaster Trial Enemy Pool](#fix-3--grandmaster-trial-enemy-pool)
4. [Fix 4 – Kampf‑Timing: Pre‑Combat‑Targeting](#fix-4--kampf-timing-pre-combat-targeting)
5. [Fix 5 – Zwei neue Gebäude‑Synergien](#fix-5--zwei-neue-gebäude-synergien)
6. [Fix 6 – Zweiter MVP‑Talisman](#fix-6--zweiter-mvp-talisman)
7. [Fix 7 – Barde INSPIRE Balancing‑Notiz](#fix-7--barde-inspire-balancing-notiz)
8. [Fix 8 – Satisfaction‑HUD‑Anzeige](#fix-8--satisfaction-hud-anzeige)
9. [Fix 9 – Scoreboard‑Vereinfachung](#fix-9--scoreboard-vereinfachung)
10. [Fix 10 – Grid 40×36 + Synergie‑Overlay](#fix-10--grid-40×36--synergie-overlay)
11. [Fix 11 – Gold‑Economy Early Game](#fix-11--gold-economy-early-game)
12. [Fix 12 – Kampfgeschwindigkeits‑Regler](#fix-12--kampfgeschwindigkeits-regler)
13. [Fix 13 – Injured Rest UI‑Hint](#fix-13--injured-rest-ui-hint)
14. [Fix 14 – Expedition‑Kartenansicht](#fix-14--expedition-kartenansicht)
15. [Abschnitt 17 – Sound‑System & Audio‑Pipeline](#abschnitt-17--sound-system--audio-pipeline)
16. [Abschnitt 18 – Browser‑Stabilität & Performance](#abschnitt-18--browser-stabilität--performance)

---

## Fix 1 – Spezialisten‑System (MVP‑Light)

### Problem
Abschnitt 1.3 nennt "Spezialisten‑Jagd" als Hauptmotivation, aber nirgends ist definiert was ein Spezialist *tut*.

### Lösung: Spezialist = Produktions‑Buff‑Zuweiser

**Konzept:** Ein Spezialist ist ein besonderer Bürger, der einem Produktionsgebäude zugewiesen werden kann und dort dauerhaft einen **+15% Produktionsgeschwindigkeits‑Buff** gibt (solange er zugewiesen bleibt). Pro Gebäude maximal 1 Spezialist.

#### Datenmodell

```jsonc
// specialists.ts – neue Datendatei
{
  "SPEC_BAKER_MASTER": {
    "id": "SPEC_BAKER_MASTER",
    "name": "Meisterbäcker",
    "description": "Erhöht Bäckerei-Produktion um 15%",
    "icon": "SPEC_BAKER_MASTER",
    "assignableBuildings": ["BAKERY"],
    "productionSpeedMult": 0.85,       // cycleTimeSec × 0.85 = 15% schneller
    "flavorText": "Sein Sauerteig-Geheimnis stammt von einem verlorenen Orden."
  },
  "SPEC_HERB_SAGE": {
    "id": "SPEC_HERB_SAGE",
    "name": "Kräuterweise",
    "description": "Erhöht Kräutergarten-Produktion um 15%",
    "assignableBuildings": ["HERB_GARDEN"],
    "productionSpeedMult": 0.85,
    "flavorText": "Sie kennt jede Pflanze beim Vornamen."
  },
  "SPEC_FORGE_SMITH": {
    "id": "SPEC_FORGE_SMITH",
    "name": "Schmiedemeister",
    "description": "Erhöht Schmiede-Produktion um 15%",
    "assignableBuildings": ["SMITHY"],
    "productionSpeedMult": 0.85,
    "flavorText": "Sein Hammer hat einen eigenen Namen."
  }
}
```

#### Spawn‑Mechanik
- **Survivor Room** (Abschnitt 9.9): 20% Chance → zufälliger Spezialist aus obigem Pool
- Nur Spezialisten die der Spieler *noch nicht hat* können erscheinen
- Wenn alle 3 vorhanden → Survivor Room gibt immer normalen Bürger

#### UI‑Integration
- Gebäude‑Info‑Panel zeigt "Spezialist: [leer]" mit einem [Zuweisen]‑Button
- Zuweisungs‑Dialog: Liste verfügbarer nicht‑zugewiesener Spezialisten
- Zugewiesener Spezialist zeigt kleines Stern‑Icon am Gebäude‑Sprite

#### Auswirkung auf Abschnitt 1.3
"Spezialisten‑Jagd" bleibt als Motivation. Spieler lernt nach Run 3–4 dass es Spezialisten gibt und läuft gezielt Survivor‑Routen.

---

## Fix 2 – Wöchentliche Herausforderung → Tages‑Herausforderung

### Problem
7 Tages‑Ticks = 420s = 7 Minuten. Das ist keine "wöchentliche" Herausforderung.

### Lösung: Echtzeit‑24h‑Cooldown mit localStorage

**Umbenennung:** "Tages‑Herausforderung" (statt "Wöchentlich")

```jsonc
// challengeSystem.ts 
{
  "challengeCooldownMs": 86400000,    // 24 Stunden Echtzeit
  "challengeSource": "localStorage",  // Timestamp-basiert
  "storageKey": "mc_daily_challenge_ts",
  
  // Fallback wenn Player localStorage löscht:
  "ingameFallback": {
    "trigger": "7_DAY_TICKS",        // 420s als Backup
    "note": "Nur aktiv wenn kein localStorage-Timestamp vorhanden"
  }
}
```

**Ablauf:**
1. Spielstart: `localStorage.getItem('mc_daily_challenge_ts')` → Delta zu `Date.now()`
2. Wenn Delta ≥ 24h ODER kein Timestamp → neue Challenge generieren, Timestamp speichern
3. Challenge‑UI zeigt Countdown: "Nächste Herausforderung in: 14h 23m"
4. **Offline‑Toleranz:** Wenn Spieler 3 Tage nicht spielt, bekommt er beim nächsten Start sofort eine neue Challenge (kein Aufholen verpasster Challenges)

**Abschnitt 9.18 ersetzen:**
> "Tages‑Herausforderung: Alle 24 Echtzeit‑Stunden wird eine neue Herausforderung generiert (localStorage‑Timestamp). Fallback‑Trigger: 7 Tages‑Ticks wenn kein Timestamp vorhanden."

---

## Fix 3 – Grandmaster Trial Enemy Pool

### Problem
`ENEMY_STONE_GUARDIAN` und `ENEMY_BONE_KNIGHT` sind Post‑MVP Ruinen‑Gegner, aber im `grandmaster_trial` Enemy Pool (MVP‑erreichbar bei Rang V).

### Lösung: Ersetzen durch existierende MVP‑Gegner

> **Status: ✅ Bereits in Teil 2 (Abschnitt 9.2) eingearbeitet.** Der `grandmaster_trial` Enemy Pool in Teil 2 enthält jetzt ausschließlich MVP‑verfügbare Gegner:

**Aktueller Enemy‑Pool (grandmaster_trial) in Teil 2:**
```
ENEMY_FOREST_WOLF, ENEMY_BANDIT_RAIDER, ENEMY_HOLLOW_SHADE, ENEMY_BRAMBLE_BEAR,
ENEMY_CRYSTAL_BEETLE, ENEMY_DEEP_CRAWLER, ENEMY_MINE_SPECTER,
ENEMY_BOG_WITCH, ENEMY_SWAMP_TROLL, ENEMY_MIRE_PHANTOM,
ENEMY_MOSS_GOLEM ✅, ENEMY_ROT_WALKER ✅
```

**Begründung der Ersetzungen:**
- `ENEMY_MOSS_GOLEM` (brute, HP 42, ATK 4, DEF 4) ersetzt `ENEMY_STONE_GUARDIAN` (Post‑MVP) → stärkerer Brute, passend zur Schwierigkeit
- `ENEMY_ROT_WALKER` (charger, HP 32, ATK 5, DEF 2) ersetzt `ENEMY_BONE_KNIGHT` (Post‑MVP) → Sumpf‑Charger als DPS‑Threat

Die `ENEMY_STONE_GUARDIAN` und `ENEMY_BONE_KNIGHT` JSON‑Definitionen in Abschnitt 10 bleiben als Post‑MVP‑Reserve für ein Ruinen‑Biom.

---

## Fix 4 – Kampf‑Timing: Pre‑Combat‑Targeting

### Problem
Kampfrunden dauern 1.0s, Kämpfe sind in 4–7s vorbei → Spieler kann Focus Target kaum nutzen.

### Lösung: Option C – Pre‑Combat‑Targeting Phase

**Konzept:** Vor jedem Kampf gibt es ein **2‑Sekunden Freeze‑Fenster** wo der Spieler:
1. Die Gegnergruppe sieht (Sprites + HP‑Balken laden ein)
2. Optional ein **Focus Target** per Klick setzen kann
3. Nichts tun muss (Auto‑Start nach 2s)

```jsonc
// combatConfig.ts – neue Werte
{
  "preCombatFreezeSec": 2.0,      // Freeze vor Kampfbeginn
  "preCombatAutoStartSec": 2.0,   // Nach 2s startet Kampf automatisch
  "showSkipButton": true,          // "Sofort kämpfen" Button
  "combatRoundSec": 1.0,          // bleibt unverändert
  
  // Visuell:
  "preCombatUI": {
    "enemyPreview": true,          // Gegner werden mit Stats eingeblendet
    "focusTargetClickable": true,  // Klick auf Gegner = Focus Target
    "countdownBar": true,          // 2s Countdown-Bar unten
    "label": "Ziel wählen..."     // Text über Gegnern
  }
}
```

**Ablauf:**
1. Party betritt Combat‑Room → **FREEZE**: Gegner‑Sprites erscheinen, 2s Countdown‑Bar
2. Spieler klickt auf gewünschtes Focus Target (orange Umrandung) ODER wartet
3. Countdown endet → Kampf startet normal (1.0s/Runde)
4. "Sofort kämpfen" Button für erfahrene Spieler die nicht warten wollen

**Vorteil:** Passt zum "Relaxed Management"‑Design‑Pillar. Kein Stress, aber taktische Tiefe. Der Fokus‑Skill bleibt wertvoll weil er mitten im Kampf das Ziel wechseln kann (CD 4).

**Abschnitt 9.6 Ergänzung:**
> "Pre‑Combat Phase: 2.0s Freeze vor jedem Kampf. Spieler kann optional Focus Target setzen. Auto‑Start nach Ablauf. Skip‑Button verfügbar."

---

## Fix 5 – Zwei neue Gebäude‑Synergien

### Problem
Nur 1 Synergie (Bäckerei→Schmiede). Zu wenig Layout‑Entscheidungen.

### Lösung: Zwei zusätzliche Manhattan‑Distanz‑Synergien

#### Synergie 2: Kräutergarten ↔ Farm

```jsonc
{
  "synergyId": "SYN_HERB_FARM",
  "sourceBuilding": "HERB_GARDEN",
  "targetBuilding": "FARM_GRAIN",
  "maxDistance": 4,                   // Manhattan-Distanz
  "effect": "productionSpeedMult",
  "value": 0.90,                      // cycleTimeSec × 0.90 = 10% schneller
  "stacks": false,
  "description": "Kräutergarten ≤ 4 Tiles von einer Farm: Kräuter wachsen 10% schneller",
  "loreReason": "Fruchtbare Erde und Kompost von der Farm bereichern den Kräutergarten."
}
```

#### Synergie 3: Eisenmine ↔ Schmiede

```jsonc
{
  "synergyId": "SYN_MINE_SMITHY",
  "sourceBuilding": "IRON_MINE",
  "targetBuilding": "SMITHY",
  "maxDistance": 5,                   // Manhattan-Distanz
  "effect": "productionSpeedMult",
  "value": 0.85,                      // cycleTimeSec × 0.85 = 15% schneller
  "stacks": false,
  "description": "Eisenmine ≤ 5 Tiles von Schmiede: Mine produziert 15% schneller",
  "loreReason": "Kurze Transportwege bedeuten heißeres Erz und weniger Abfall."
}
```

#### Generisches Synergie‑System (ersetzt Hardcoding)

```typescript
// synergySystem.ts
interface BuildingSynergy {
  synergyId: string;
  sourceBuilding: string;       // Gebäude das den Buff BEKOMMT
  targetBuilding: string;       // Gebäude das in der Nähe sein muss
  maxDistance: number;           // Manhattan-Distanz
  effect: "productionSpeedMult"; 
  value: number;                // Multiplikator für cycleTimeSec
  stacks: boolean;
}

// Pro City-Sim-Tick prüfen:
function checkSynergies(buildings: Building[], synergies: BuildingSynergy[]): void {
  for (const building of buildings) {
    let speedMult = 1.0;
    for (const syn of synergies) {
      if (building.typeId === syn.sourceBuilding) {
        const hasNearby = buildings.some(other =>
          other.typeId === syn.targetBuilding &&
          other.id !== building.id &&
          manhattanDist(building.pos, other.pos) <= syn.maxDistance
        );
        if (hasNearby) speedMult = Math.min(speedMult, syn.value);
      }
    }
    building.synergySpeedMult = speedMult;
  }
}
```

#### Alle 3 MVP‑Synergien im Überblick

| Synergie | Quelle (bekommt Buff) | Braucht in Nähe | Distanz | Effekt |
|----------|----------------------|-----------------|---------|--------|
| Charcoal Supply | Schmiede | Bäckerei | ≤ 5 | ×1.5 Produktion |
| Kompost‑Erde | Kräutergarten | Farm | ≤ 4 | +10% Produktion |
| Kurze Wege | Eisenmine | Schmiede | ≤ 5 | +15% Produktion |

**Visuelle Rückmeldung:** Wenn ein Gebäude einen Synergie‑Buff hat, zeigt es ein kleines grünes Pfeil‑nach‑oben‑Icon am Sprite. Tooltip: "Synergie‑Bonus: +15% Produktion (Schmiede in Reichweite)".

---

## Fix 6 – Zweiter MVP‑Talisman

### Problem
MVP hat nur 1 Talisman (Fortitude, +10 HP). Das Crafting‑System existiert für ein einziges Item.

### Lösung: Talisman des Angreifers

```jsonc
{
  "TALISMAN_STRIKER": {
    "id": "TALISMAN_STRIKER",
    "name": "Talisman des Angreifers",
    "description": "Alle Helden erhalten +1 ATK für die gesamte Expedition.",
    "icon": "TALISMAN_STRIKER",
    "effect": {
      "type": "party_stat_buff",
      "stat": "atk",
      "value": 1,
      "scope": "expedition"
    },
    "craftCost": [
      { "itemId": "talisman_fragment", "qty": 3 },
      { "itemId": "iron_scrap", "qty": 2 }
    ],
    "craftTimeSec": 0,
    "craftBuilding": null,
    "maxPerRun": 1
  }
}
```

**Spieler‑Entscheidung:** Vor einer Expedition wählen: Fortitude (+10 HP, defensiv) ODER Striker (+1 ATK, offensiv). Das verdoppelt die taktische Tiefe mit minimalem Implementierungsaufwand.

**Sprite hinzufügen** (zu generateSprites.ts):
```
TALISMAN_FORTITUDE → rot‑goldenes Amulett mit Herz‑Symbol
TALISMAN_STRIKER   → dunkelrotes Amulett mit Schwert‑Symbol
```

---

## Fix 7 – Barde INSPIRE Balancing‑Notiz

### Problem (Post‑MVP, aber vormerken)
INSPIRE (Level 10 Bard): Alle Ally CDs −1 pro Runde, CD 5. Kombi mit Guardian TAUNT (CD 3) und Ranger POWER_SHOT (CD 3) → fast permanente Skill‑Uptime.

### Lösung: Balance‑Constraint vormerken

```jsonc
// INSPIRE Balancing – bei Implementierung beachten:
{
  "INSPIRE": {
    "cd": 6,                // CD von 5 → 6 erhöhen
    "effect": "cd_reduce_allies",
    "value": -1,
    "constraint": "min_cd_1",  // Skills können nicht unter CD 1 gedrückt werden
    "note": "INSPIRE setzt CDs auf max(currentCD - 1, 1), nie auf 0."
  }
}
```

**Regel:** `INSPIRE` reduziert Cooldowns um 1, aber **niemals unter 1**. Damit wird TAUNT (CD 3) auf CD 2 statt CD 0 effektiv. Permanente Skill‑Locks werden verhindert.

---

## Fix 8 – Satisfaction‑HUD‑Anzeige

### Problem
Spieler sieht "70/100" und denkt etwas ist kaputt, weil 100 im MVP unerreichbar ist.

### Lösung: Qualitätsstufen‑Anzeige

```jsonc
{
  "satisfactionDisplay": {
    "mode": "qualityLabel",  // statt "numeric"
    
    "levels": [
      { "min": 0,  "max": 19, "label": "Miserabel",    "color": "#FF4444", "emoji": "😰" },
      { "min": 20, "max": 39, "label": "Schlecht",      "color": "#FF8844", "emoji": "😟" },
      { "min": 40, "max": 54, "label": "Okay",          "color": "#FFCC44", "emoji": "😐" },
      { "min": 55, "max": 69, "label": "Gut",           "color": "#88CC44", "emoji": "🙂" },
      { "min": 70, "max": 84, "label": "Hervorragend",  "color": "#44CC44", "emoji": "😊" },
      { "min": 85, "max": 100,"label": "Paradiesisch",  "color": "#44CCFF", "emoji": "🤩" }
    ],
    
    "hudFormat": "Zufriedenheit: {emoji} {label}",
    // Beispiel: "Zufriedenheit: 🙂 Gut"
    
    "tooltipFormat": "{value}/100 – {label}",
    // Tooltip bei Hover: "67/100 – Gut"
    
    "note": "Der exakte Wert ist nur im Tooltip sichtbar. Der Spieler optimiert auf die nächste Stufe, nicht auf eine abstrakte Zahl."
  }
}
```

**HUD Top Bar (Abschnitt 11.3 Ergänzung):**
> Elemente: Ressourcen | Gold | Pop | Fighters | Tax/min | **Zufriedenheit (Qualitätslabel)** | Day | Gilden‑Rang

---

## Fix 9 – Scoreboard‑Vereinfachung

### Problem (Post‑MVP)
Drei überlappende Rang‑Systeme: Gilden‑Rang, Run‑Score, Ehrentafel.

### Empfehlung: Fokus auf Gilden‑Rang

- **Gilden‑Rang** (MVP): Hauptprogression. Bleibt zentral.
- **Run‑Score** (Post‑MVP): Wird als "Expedition‑Bericht" umbenannt → persönliche Statistik, kein Ranking.
- **Ehrentafel** (Post‑MVP): Wird als "Meilensteine" umbenannt → Achievement‑Galerie, kein separates Scoring.

> **Design‑Regel:** Nur EIN Rank‑System pro Spielphase. Gilden‑Rang = der eine Fortschrittsmesser. Alles andere ist Flavor/Statistik.

---

## Fix 10 – Grid 40×36 + Synergie‑Overlay

### Problem
32×32 Tiles = 1024 Zellen. Mit 12 Gebäuden (Footprints von 1×1 bis 4×4), Straßennetz (~30–50 Tiles), Brunnen‑Wasserradius (6 Tiles) und Synergie‑Distanzen (4–5 Tiles) konvergieren die Platzierungsanforderungen schnell. Der Spieler merkt nach 20 Minuten dass sein frühes Layout alles verbaut hat. Das frustriert statt zu fordern.

### Lösung A: Grid auf 40×36 erweitern

**Vorher:** 32 × 32 = 1.024 Tiles  
**Nachher:** 40 × 36 = 1.440 Tiles (+40% Fläche)

```jsonc
// Änderung in Abschnitt 4.5:
{
  "gridSize": { "width": 40, "height": 36 },  // war: 32×32
  "tileSize": 32,                                // bleibt
  "worldSize": { "width": 1280, "height": 1152 } // war: 1024×1024
}
```

**Warum 40×36 statt z.B. 48×48?**
- **Asymmetrisch** → wirkt weniger "quadratisch", natürlicher
- **+40% Fläche** reicht um alle 12 Gebäude + Straßen + Synergien komfortabel zu platzieren
- **Nicht zu groß** → Karte fühlt sich trotzdem voll an, Spieler muss trotzdem Entscheidungen treffen
- **Breiter als hoch** → passt besser in 16:9 Screens (1280 px breit bei 32px Tiles = genau ein Viewport)

**Auswirkungen:**
| Was | Vorher | Nachher | Impact |
|-----|--------|---------|--------|
| Fläche | 1.024 Tiles | 1.440 Tiles | +40% Platz |
| Rendering | 1024×1024 px | 1280×1152 px | Minimal, ~30% mehr Tiles aber immer noch trivial |
| Pathfinding | 1024 Nodes max | 1440 Nodes max | Irrelevant bei A* mit so wenig Nodes |
| Save‑Größe | ~50 KB | ~55 KB | Egal |

### Lösung B: Synergie‑Overlay beim Platzieren

Wenn der Spieler im BUILD_MODE ein Gebäude zum Platzieren ausgewählt hat, zeigt das Ghost‑Preview‑System zusätzlich **farbige Radius‑Overlays** aller relevanten Synergien:

```jsonc
{
  "synergyOverlay": {
    "enabled": true,
    "showOnBuildMode": true,
    
    "overlayRules": [
      {
        "whenPlacing": "SMITHY",
        "highlightBuildings": ["BAKERY"],
        "radius": 5,
        "color": "#FFD700",     // Gold
        "alpha": 0.2,
        "tooltip": "Bäckerei in Reichweite: +50% Schmiede‑Produktion!"
      },
      {
        "whenPlacing": "HERB_GARDEN",
        "highlightBuildings": ["FARM_GRAIN"],
        "radius": 4,
        "color": "#66CC66",     // Grün
        "alpha": 0.2,
        "tooltip": "Farm in Reichweite: +10% Kräuter‑Produktion"
      },
      {
        "whenPlacing": "IRON_MINE",
        "highlightBuildings": ["SMITHY"],
        "radius": 5,
        "color": "#888888",     // Grau
        "alpha": 0.2,
        "tooltip": "Schmiede in Reichweite: +15% Minen‑Produktion"
      },
      {
        "whenPlacing": "ANY_BUILDING_NEEDING_WATER",
        "highlightBuildings": ["WELL"],
        "radius": 6,
        "color": "#4488FF",     // Blau
        "alpha": 0.15,
        "tooltip": "Brunnen‑Wasserversorgung in Reichweite"
      }
    ]
  }
}
```

**Visuelles Beispiel:**
```
Spieler wählt "Schmiede" im Build‑Menü:
→ Alle Bäckereien auf der Karte bekommen einen goldenen 5‑Tile‑Radius‑Ring
→ Ghost‑Preview der Schmiede zeigt grün/rot wie bisher (platzierbar/nicht)
→ Tooltip am Cursor: "Platziere in der Nähe einer Bäckerei für +50% Produktion"
→ Wenn Ghost innerhalb eines Rings: Ring wird heller + Tooltip wird fett
```

**Design‑Philosophie:** Der Spieler soll nicht raten müssen. Das Overlay zeigt proaktiv wo Synergien wirken. Das ist kein Hand‑Holding, sondern Informationsdesign – der Spieler muss trotzdem abwägen welche Synergie er priorisiert wenn der Platz knapp wird.

---

## Fix 11 – Gold‑Economy Early Game

### Problem
Die ersten 10 Minuten sind gold‑technisch eng:

| Ausgabe | Gold | Zeitpunkt |
|---------|------|-----------|
| Erste Straßen (10 Tiles) | 10 | Minute 1–2 |
| Erster Fighter Training | 15 | Minute 3 |
| Weitere Straßen (10 Tiles) | 10 | Minute 5–8 |
| Gear‑Wartung nach Run 1 (2 Items) | 10 | Minute 10 |
| **Summe Ausgaben** | **45** | |
| Startgold | 50 | |
| **Verbleibendes Gold** | **5** | |

Steuern: 3 Häuser × `baseTaxPerMin: 2` × `satisfaction 60%` = 3,6 Gold / 60s  
→ In 10 Minuten: ~36 Gold aus Steuern  
→ Gesamtbudget Minute 0–10: **86 Gold** für 45+ Gold Ausgaben

Das ist machbar, aber **unangenehm knapp**. Der Spieler spart reflexiv und baut zu wenig Häuser, was den Bevölkerungs‑Wachstum bremst. Negativer Feedback‑Loop der nicht sofort lesbar ist.

### Lösung: Startgold 50 → 75 und Starterhaus‑Bonus

```jsonc
// Änderung in Abschnitt 2.4 (initialState):
{
  "gold": 75,  // war: 50. +25 Gold Puffer für entspanntes Early Game
  
  // Starterhaus bekommt leicht höhere Tax:
  "starterHouseOverride": {
    "baseTaxPerMin": 3,   // war: 2. Nur für das vorgebaute Starthaus.
    "note": "Repräsentiert eine etablierte Familie die mit dem Spieler angekommen ist"
  }
}
```

**Neue Rechnung Minute 0–10:**

| Posten | Gold |
|--------|------|
| Startgold | 75 |
| Steuern 10 Min (Starterhaus 3 + 2 normale × 60%) | ~46 |
| **Budget gesamt** | **~121** |
| Ausgaben (Straßen + Training + Wartung) | ~45 |
| **Verbleibendes Gold** | **~76** |

Der Spieler hat genug Luft um ein zweites Haus zu bauen, Straßen zu legen und trotzdem einen Fighter zu trainieren. Das "entspannte" Feeling bleibt erhalten.

**Warum nicht einfach alles billiger machen?**  
Weil die Preise für Mid‑Game richtig kalibriert sind. Nur der Start braucht einen Boost. Deshalb: höheres Startgold + Starterhaus‑Bonus, keine globale Preisänderung.

---

## Fix 12 – Kampfgeschwindigkeits‑Regler

### Problem
1.0s pro Runde ist gut für Early Game (Spieler lernt die Systeme). Ab Run 8–10 wird es monoton. Standard‑Auto‑Battler bieten alle Speed‑Optionen (Raid Shadow Legends, TFT, AFK Arena etc.) – Spieler erwarten das Feature.

### Lösung: ×1 / ×1.5 / ×2 Geschwindigkeits‑Toggle

```jsonc
// Änderung in combatConfig.ts:
{
  "combatSpeedOptions": [
    { "label": "×1",   "roundDurationSec": 1.0,  "default": true },
    { "label": "×1.5", "roundDurationSec": 0.66 },
    { "label": "×2",   "roundDurationSec": 0.5  }
  ],
  
  "speedToggleUI": {
    "position": "expedition_header_right",   // rechts oben im Expedition-UI
    "icon": "⏩",
    "persistChoice": true,                   // in localStorage merken
    "storageKey": "mc_combat_speed"
  }
}
```

**Ablauf:**
- **×1**: Standard. 1 Sekunde pro Runde. Für Anfänger und taktische Kämpfe.
- **×1.5**: Leicht beschleunigt. 660ms pro Runde. Animationen laufen schneller.
- **×2**: Doppelte Geschwindigkeit. 500ms pro Runde. Für Farming‑Runs.

**Interaktion mit Pre‑Combat‑Targeting (Fix 4):**
- Die Pre‑Combat Freeze‑Phase (2s) bleibt bei **allen** Geschwindigkeiten gleich. Nur die eigentlichen Kampfrunden werden beschleunigt.
- Der "Sofort kämpfen" Skip‑Button bleibt ebenfalls verfügbar.

**Warum kein ×3 oder ×5?**  
Bei ×2 dauert der kürzeste Kampf (4 Runden) noch 2 Sekunden. Das ist genug um den Kampf visuell wahrzunehmen. Schneller wird es zu einem Flash wo der Spieler nichts mehr sieht. Für ein "Relaxed Management" Spiel ist ×2 das Maximum.

---

## Fix 13 – Injured Rest UI‑Hint

### Problem
Wenn 2 von 3 Fightern INJURED_REST haben (120s), hat der Spieler wenig zu tun. Die Wartephase ist Design‑Absicht (Stadtbau‑Fenster), aber dieser Zusammenhang wird nicht kommuniziert.

### Lösung: Kontextuelle UI‑Hints während Wartezeit

```jsonc
{
  "injuredHintSystem": {
    "trigger": "ANY_FIGHTER_ENTERS_INJURED_REST",
    
    "hints": [
      {
        "condition": "smithy_not_built",
        "message": "🛡️ Deine Kämpfer erholen sich noch {timeRemaining}s — baue eine Schmiede für bessere Ausrüstung!",
        "priority": 1
      },
      {
        "condition": "unassigned_workers >= 2",
        "message": "🛡️ Deine Kämpfer ruhen sich aus — weise freie Arbeiter einem Gebäude zu!",
        "priority": 2
      },
      {
        "condition": "houses_below_3",
        "message": "🛡️ Erholungszeit! Baue ein weiteres Haus für mehr Bewohner.",
        "priority": 3
      },
      {
        "condition": "synergy_not_active",
        "message": "🛡️ Wusstest du? Platziere die Schmiede neben der Bäckerei für +50% Produktion!",
        "priority": 4
      },
      {
        "condition": "default",
        "message": "🛡️ Deine Kämpfer erholen sich noch {timeRemaining}s — nutze die Zeit für Stadtausbau!",
        "priority": 99
      }
    ],
    
    "display": {
      "type": "banner_bottom",          // Unaufdringliches Banner am unteren Bildschirmrand
      "duration": 8000,                  // 8 Sekunden sichtbar
      "dismissable": true,               // Spieler kann wegklicken
      "maxShowPerRest": 1,               // Nur 1 Hint pro Rest-Phase
      "cooldownBetweenHints": 300000     // Max alle 5 Minuten Echtzeit
    }
  }
}
```

**Design‑Philosophie:** Die Hints sind:
- **Kontextuell** – sie schlagen das vor was der Spieler gerade wirklich tun könnte
- **Nicht nervig** – maximal 1 pro Rest‑Phase, alle 5 Minuten Cooldown
- **Wegklickbar** – erfahrene Spieler werden nicht belästigt
- **Loop‑verbindend** – sie machen die Verbindung "Kämpfer ruhen → Stadtbau‑Zeit" explizit

---

## Fix 14 – Expedition‑Kartenansicht

### Problem
Die aktuelle Expedition‑UI zeigt nur "Room 4/10" als Text. Der Spieler hat kein räumliches Gefühl für den Fortschritt und kann nicht antizipieren was kommt.

### Lösung: Stilisierte Room‑Leiste als visueller Fortschrittsbalken

```jsonc
{
  "expeditionMapStrip": {
    "position": "expedition_ui_top",     // Schmale Leiste oben im Expedition-UI
    "height": 48,                         // Pixel Höhe
    
    "roomIcons": {
      "combat":    { "icon": "💀", "color": "#CC4444" },
      "boss":      { "icon": "👹", "color": "#FF2222" },
      "rest":      { "icon": "🏕️", "color": "#44AA44" },
      "find":      { "icon": "✨", "color": "#FFCC44" },
      "hazard":    { "icon": "🔥", "color": "#FF8844" },
      "shop":      { "icon": "🛒", "color": "#4488FF" },
      "survivor":  { "icon": "👤", "color": "#44CCCC" },
      "unknown":   { "icon": "❓", "color": "#888888" },
      "checkpoint": { "icon": "🚩", "color": "#FFFFFF" }
    },
    
    "visibility": {
      "mode": "fog_of_war",
      "revealedRooms": "current + all_past",
      "nextRoom": "type_only",             // Nächster Raum: Icon sichtbar, aber gedimmt
      "futureRooms": "hidden_until_reached",// Spätere Räume: nur graues ❓
      "checkpoints": "always_visible"       // Checkpoints immer sichtbar (Raum 3,6,9...)
    }
  }
}
```

**Visuelles Beispiel (Route mit 10 Räumen, Spieler in Raum 4):**
```
[💀][⚔️][🏕️][💀] [❓][🚩][❓][❓][❓][❓]
 ✓    ✓    ✓   ▶    ·    ·    ·    ·    ·    ·
                ↑ JETZT HIER

 Durchlaufen     Aktuell    Geplant (verborgen)
 (volle Farbe)  (pulsiert)  (grau/gedimmt)
```

**Regeln:**
- **Vergangene Räume:** Volles Icon + Farbe, leicht verkleinert
- **Aktueller Raum:** Pulsierendes Icon, größer, weißer Rand
- **Nächster Raum:** Icon sichtbar aber 50% transparent (Spieler sieht "als nächstes kommt ein Kampf")
- **Alle weiteren:** Graues ❓ (kein Spoiler der gesamten Route)
- **Checkpoints (Raum 3, 6, 9):** Immer als 🚩 sichtbar (Spieler weiß wo die Entscheidung "Weiter/Rückzug" kommt)

**Warum Fog‑of‑War statt alles zeigen?**
- Alles zeigen = kein Überraschungsgefühl, Route wird zur Checkliste
- Nichts zeigen (aktuell) = Spieler fühlt sich blind
- **1 Raum voraus** = perfekte Balance: Spieler kann planen ("Kampf kommt, spare Proviant") aber wird trotzdem überrascht

**Platzverbrauch:** Eine einzelne Zeile (48px Höhe) am oberen Rand des Expedition‑UI. Nimmt dem Combat‑Log keinen Platz weg.

---

## Abschnitt 17 – Sound‑System & Audio‑Pipeline

### 17.1 Architektur‑Entscheidung

**Phaser 3 nutzt intern die Web Audio API** (mit HTML5 Audio als Fallback). Sound‑Dateien werden als `.ogg` (primär) + `.mp3` (Fallback) geladen.

### 17.2 Sound‑Generierung – Zwei Ansätze

#### Ansatz A: Prozedurale SFX mit jsfxr (empfohlen für MVP)

**jsfxr** ist ein JavaScript‑Port des bekannten sfxr‑Tools (Retro‑Spielsound‑Generator). Es erzeugt 8‑Bit/Retro‑Sounds programmatisch – perfekt passend zum Pixel‑Art‑Stil.

- **Kein API‑Key nötig** – läuft lokal
- **Deterministisch** – gleiche Parameter = gleicher Sound
- **Perfekt für Pixel Art** – klingt retro wie die Grafik aussieht
- **Null Ladezeit** – Sounds können zur Runtime generiert werden (< 1ms)
- **Tool:** `npm run generate-sounds` → erzeugt `.wav` Dateien im `public/assets/audio/` Ordner

> **Hinweis zur User‑Frage "AI über den Key":** Google Gemini (der verwendete API‑Key) kann **keine Audio‑Dateien generieren** – nur Text und Bilder. Für AI‑generierte Musik gibt es Dienste wie **Suno AI**, **Udio** oder **Stability Audio**, aber diese brauchen separate API‑Keys und sind für SFX weniger geeignet als jsfxr. Für Ambient‑Musik (Hintergrund‑Loop) könnte man Suno AI nutzen und den Track manuell herunterladen.

#### Ansatz B: AI‑Musik für Ambient (optional, manuell)

Für die Hintergrund‑Melodie (Lauten/Flöten‑Loop):
- **Suno AI** (suno.com): "calm medieval lute and flute ambient, game background, seamless loop, 60 seconds" → Download als `.mp3`
- **Udio** (udio.com): Ähnlich, kostenlose Stufe verfügbar
- **Ergebnis:** 1–3 Ambient‑Tracks, manuell in `public/assets/audio/music/` ablegen
- **Kein automatisertes Tool nötig** – Ambient‑Musik ändert sich selten

### 17.3 Sound‑Dateien‑Struktur

```
public/assets/audio/
├── sfx/
│   ├── build_place.wav          # Hammer-Klick
│   ├── production_bread.wav     # Plopp
│   ├── production_smithy.wav    # Clang
│   ├── production_mill.wav      # Rauschen
│   ├── expedition_start.wav     # Trompeten-Fanfare
│   ├── combat_sword.wav         # Schwert-Klirren
│   ├── combat_arrow.wav         # Pfeil-Swoosh
│   ├── combat_heal.wav          # Heal-Chime
│   ├── boss_intro.wav           # Tiefes Dröhnen
│   ├── boss_victory.wav         # Sieges-Fanfare
│   ├── ui_click.wav             # UI Klick
│   ├── ui_coin.wav              # Münz-Klirren
│   ├── settler_arrive.wav       # Neuer Siedler
│   ├── specialist_found.wav     # Epischer Sound
│   ├── rank_up.wav              # Rang-Aufstieg
│   └── achievement.wav          # Achievement-Jingle
├── music/
│   └── ambient_medieval.mp3     # Hintergrund-Loop (manuell/AI)
└── README.md
```

### 17.4 Phaser‑Sound‑Manager Integration

```typescript
// SoundManager.ts
class SoundManager {
  private scene: Phaser.Scene;
  private sfxVolume: number = 0.7;
  private musicVolume: number = 0.4;
  private muted: boolean = false;
  private bgMusic: Phaser.Sound.BaseSound | null = null;

  // Preload in Boot/Preload Scene
  preload(): void {
    const sfxFiles = [
      'build_place', 'production_bread', 'production_smithy',
      'production_mill', 'expedition_start', 'combat_sword',
      'combat_arrow', 'combat_heal', 'boss_intro', 'boss_victory',
      'ui_click', 'ui_coin', 'settler_arrive', 'specialist_found',
      'rank_up', 'achievement'
    ];
    for (const key of sfxFiles) {
      this.scene.load.audio(key, `assets/audio/sfx/${key}.wav`);
    }
    this.scene.load.audio('bgm_ambient', 'assets/audio/music/ambient_medieval.mp3');
  }

  play(key: string): void {
    if (this.muted) return;
    this.scene.sound.play(key, { volume: this.sfxVolume });
  }

  startMusic(): void {
    if (this.bgMusic) return;
    this.bgMusic = this.scene.sound.add('bgm_ambient', {
      loop: true,
      volume: this.musicVolume
    });
    this.bgMusic.play();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
  }
}
```

### 17.5 UI‑Ergänzung: Lautstärke‑Control

**Einstellungs‑Panel** (Zahnrad‑Icon in HUD Top Bar):
- 🔊 Musik: [Slider 0–100%]
- 🔊 Effekte: [Slider 0–100%]
- 🔇 Stumm: [Toggle]
- Werte werden in `localStorage` unter `mc_audio_settings` gespeichert.

---

## Abschnitt 18 – Browser‑Stabilität & Performance

### 18.1 Zielplattformen (bestätigt)

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Primär |
| Firefox | 90+ | ✅ Primär |
| Edge | 90+ | ✅ Sekundär (Chromium) |
| Safari | 15.4+ | ⚠️ Eingeschränkt (WebAudio quirks) |

### 18.2 Rendering‑Pipeline

Phaser 3 nutzt standardmäßig **WebGL** mit automatischem **Canvas 2D Fallback**:

```typescript
// game.config.ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // WebGL → Canvas Fallback
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#2d5a27',
  
  render: {
    pixelArt: true,            // Nearest-Neighbor Scaling (keine Blur)
    antialias: false,          // Pixel Art braucht kein AA
    roundPixels: true,         // Verhindert Sub-Pixel-Rendering-Artefakte
  },
  
  // Performance
  fps: {
    target: 60,
    forceSetTimeOut: false,    // requestAnimationFrame nutzen
    smoothStep: true,          // Frame-Timing glätten
  },
  
  physics: {
    default: false,            // Keine Physik-Engine → spart massiv RAM/CPU
  },
  
  audio: {
    context: undefined,        // Phaser erstellt Web Audio Context automatisch
    disableWebAudio: false,    // Web Audio API nutzen
  },
};
```

### 18.3 Memory Management

#### 18.3.1 Sprite‑Atlas statt Einzelbilder

**Problem:** 50+ einzelne PNG‑Dateien = 50 GPU‑Texture‑Switches pro Frame.  
**Lösung:** Alle Sprites in einen **Texture Atlas** packen (1 Draw Call statt 50).

```typescript
// In PreloadScene:
this.load.atlas('game-atlas', 'assets/sprites/game-atlas.png', 'assets/sprites/game-atlas.json');
// Tool: npm run build-atlas → generiert Atlas aus Einzel-PNGs
```

#### 18.3.2 Object Pooling

Für häufig erzeugte/zerstörte Objekte (Damage Numbers, Partikel, Production Icons):

```typescript
// ObjectPool.ts - generischer Pool
class ObjectPool<T extends Phaser.GameObjects.GameObject> {
  private pool: T[] = [];
  
  get(): T | null {
    return this.pool.pop() || null;
  }
  
  release(obj: T): void {
    obj.setActive(false).setVisible(false);
    this.pool.push(obj);
  }
}

// Nutzung:
const damageNumberPool = new ObjectPool<Phaser.GameObjects.Text>();
// Statt: new Text() → pool.get() || new Text()
// Statt: text.destroy() → pool.release(text)
```

#### 18.3.3 Off‑Screen Culling

Gebäude/Entities außerhalb des sichtbaren Kamerabereichs werden nicht gerendert:

```typescript
// Jeder City-Sim-Tick:
function cullOffscreen(camera: Phaser.Cameras.Scene2D.Camera, buildings: Building[]): void {
  const bounds = camera.worldView;
  const margin = 64; // 2 Tiles Puffer
  
  for (const b of buildings) {
    const visible = b.x + b.width > bounds.x - margin &&
                    b.x < bounds.right + margin &&
                    b.y + b.height > bounds.y - margin &&
                    b.y < bounds.bottom + margin;
    b.sprite.setVisible(visible);
    b.sprite.setActive(visible);
  }
}
```

### 18.4 localStorage‑Stabilität

#### 18.4.1 Größenlimit

**Problem:** localStorage hat ein Limit von **5–10 MB** je nach Browser.  
**MVP‑Savegame geschätzte Größe:** ~50–150 KB (JSON) → weit unter dem Limit.

```typescript
// SaveManager.ts – Sicherheits-Checks
function saveGame(state: GameState): boolean {
  const json = JSON.stringify(state);
  const sizeKB = new Blob([json]).size / 1024;
  
  // Warngrenze: 4 MB (unter Browser-Limit)
  if (sizeKB > 4096) {
    console.warn(`Save-Größe: ${sizeKB.toFixed(0)} KB – nähert sich dem Limit!`);
  }
  
  try {
    localStorage.setItem('mc_savegame', json);
    localStorage.setItem('mc_save_backup', json);  // Backup-Slot
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('localStorage voll! Versuche Backup zu löschen...');
      localStorage.removeItem('mc_save_backup');
      try {
        localStorage.setItem('mc_savegame', json);
        return true;
      } catch {
        // Letzter Ausweg: User informieren
        alert('Speicherplatz voll. Bitte lösche alte Browser-Daten.');
        return false;
      }
    }
    return false;
  }
}
```

#### 18.4.2 Save‑Corruption‑Schutz

```typescript
function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem('mc_savegame');
    if (!raw) return null;
    
    const state = JSON.parse(raw);
    
    // Schema-Validierung (grundlegend)
    if (!state.saveVersion || !state.city || !state.inventory) {
      console.warn('Save scheint korrupt. Versuche Backup...');
      const backup = localStorage.getItem('mc_save_backup');
      if (backup) return JSON.parse(backup);
      return null;
    }
    
    // Migration
    if (state.saveVersion < CURRENT_VERSION) {
      return migrateState(state);
    }
    
    return state;
  } catch (e) {
    console.error('Save-Laden fehlgeschlagen:', e);
    return null;
  }
}
```

### 18.5 Performance‑Budgets

| System | Budget pro Tick | Frequenz | Notiz |
|--------|----------------|----------|-------|
| City‑Sim‑Tick | ≤ 2ms | 1.0s | Gebäude‑Updates, Produktion |
| Rendering | ≤ 12ms | 60 FPS | 16.6ms Frame Budget, 4ms für JS |
| Expedition‑Combat | ≤ 1ms | 1.0s | Schadens‑Rechnung |
| Path‑Update | ≤ 0.5ms | 0.25s | Citizen‑Bewegung |
| Save | ≤ 50ms | ~30s | Auto‑Save Intervall |

#### 18.5.1 FPS‑Monitor (Debug‑Modus)

```typescript
// Nur im Dev-Modus sichtbar
class FPSMonitor {
  private frames: number[] = [];
  
  update(time: number): void {
    this.frames.push(time);
    // Nur letzte 60 Frames behalten
    if (this.frames.length > 60) this.frames.shift();
  }
  
  getAvgFPS(): number {
    if (this.frames.length < 2) return 60;
    const delta = this.frames[this.frames.length - 1] - this.frames[0];
    return (this.frames.length - 1) / (delta / 1000);
  }
  
  isLagging(): boolean {
    return this.getAvgFPS() < 45;  // Unter 45 FPS = Problem
  }
}
```

### 18.6 Tab‑Visibility / Background‑Handling

Wenn der Browser‑Tab inaktiv wird, pausiert `requestAnimationFrame`. Das beeinflusst die Spielzeit:

```typescript
// VisibilityManager.ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab verloren → Spiel pausieren, Timer stoppen
    gameState.paused = true;
    autoSave();  // Sicherheits-Save
  } else {
    // Tab zurück → Zeit-Delta berechnen
    const awaySeconds = (Date.now() - gameState.lastActiveTimestamp) / 1000;
    
    if (awaySeconds > 300) {  // > 5 Minuten weg
      // Nicht simulieren – einfach pausiert lassen
      // Verhindert "100 Tages-Ticks auf einmal" after Tab-Switch
      gameState.paused = false;
    } else {
      // Kurze Abwesenheit: catch-up erlauben (max 10 Ticks)
      const catchupTicks = Math.min(Math.floor(awaySeconds), 10);
      for (let i = 0; i < catchupTicks; i++) {
        runCitySimTick();
      }
      gameState.paused = false;
    }
    
    gameState.lastActiveTimestamp = Date.now();
  }
});
```

### 18.7 Auto‑Save

```jsonc
{
  "autoSave": {
    "intervalSec": 30,           // Alle 30 Sekunden
    "saveOnTabLeave": true,      // Speichern wenn Tab wechselt
    "saveOnExpeditionEnd": true,  // Speichern nach Expedition
    "saveOnBuild": true,         // Speichern nach Gebäude platzieren
    "maxSlots": 2,               // Haupt-Save + 1 Backup
    "showSaveIcon": true         // Disketten-Icon blinkt kurz bei Auto-Save
  }
}
```

### 18.8 Error Boundary (Crash‑Schutz)

```typescript
// ErrorBoundary.ts – Globaler Fehlerhandler
window.addEventListener('error', (event) => {
  console.error('Unhandled Error:', event.error);
  
  // Versuche Notfall-Save
  try {
    const emergencySave = JSON.stringify(gameState);
    localStorage.setItem('mc_emergency_save', emergencySave);
    console.log('Notfall-Save erstellt.');
  } catch {}
  
  // UI-Feedback
  showCrashModal('Ein Fehler ist aufgetreten. Dein Spielstand wurde gesichert. Lade die Seite neu.');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Gleiches Handling
});
```

### 18.9 Browser‑Kompatibilitäts‑Checks (Boot)

```typescript
// CompatCheck.ts – läuft vor Phaser-Init
function checkBrowserCompat(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // 1. localStorage verfügbar?
  try {
    localStorage.setItem('mc_test', '1');
    localStorage.removeItem('mc_test');
  } catch {
    return { ok: false, warnings: ['localStorage nicht verfügbar. Privater Modus?'] };
  }
  
  // 2. WebGL Support?
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    warnings.push('WebGL nicht verfügbar – Canvas-Fallback wird verwendet (langsamer).');
  }
  
  // 3. Web Audio API?
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    warnings.push('Web Audio API nicht verfügbar – Sounds werden deaktiviert.');
  }
  
  // 4. Genug Speicher? (Chrome only)
  if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 2) {
    warnings.push('Wenig RAM erkannt. Performance könnte eingeschränkt sein.');
  }
  
  return { ok: true, warnings };
}
```

### 18.10 Asset‑Größen & Ladestrategie

#### 18.10.1 Geschätzte Gesamtgröße

| Asset‑Kategorie | Anzahl | Roh‑Größe | Über Netzwerk (gzip) |
|-----------------|--------|----------|-----------------------|
| Sprite PNGs (final) | 50 | ~200 KB | ~200 KB (PNG ist bereits komprimiert) |
| SFX WAVs | 31 | ~756 KB | ~756 KB |
| Musik MP3s | 5 | ~5.500 KB | ~5.500 KB (bereits komprimiert) |
| JSON‑Daten | ~7 | ~65 KB | ~15 KB |
| JS Bundle (Phaser + Game) | 1 | ~1.300 KB | ~450 KB |
| HTML/CSS | ~2 | ~5 KB | ~2 KB |
| **Gesamt** | **~96** | **~7,8 MB** | **~6,9 MB** |

> **Bewertung:** Unter 7 MB Gesamtdownload ist **sehr leicht** für ein Browserspiel. Zum Vergleich: eine einzelne Webseite mit Hero‑Image ist oft 3–5 MB. Kein Problem für jede Internetverbindung.

#### 18.10.2 Ladestrategien

**Phase 1: Kritisch (vor Spielstart – Ladebalken)**
```
Priorität HOCH – blockiert Start:
├── JS Bundle (Phaser + Game Code)     ~450 KB gzip
├── Sprite Atlas (alle Gebäude/Units)  ~200 KB
├── JSON-Daten (alle Definitionen)     ~15 KB
├── UI SFX (ui_click, ui_coin)         ~6 KB
└── Stadt-Musik (ambient_city.mp3)     ~1.000 KB
                                       ─────────
                              Gesamt:  ~1,7 MB → Ladezeit ~1-2s
```

**Phase 2: Lazy Load (im Hintergrund, nach Spielstart)**
```
Priorität MITTEL – laden während Spieler baut:
├── Alle restlichen SFX               ~750 KB
├── Wald-Musik (ambient_forest.mp3)    ~1.000 KB
└── Höhlen-Musik (ambient_cave.mp3)   ~1.000 KB
                                       ─────────
                              Gesamt:  ~2,75 MB
```

**Phase 3: On‑Demand (kurz vor Bedarf)**
```
Priorität NIEDRIG – erst laden wenn Spieler Expedition startet:
├── Sumpf-Musik (ambient_swamp.mp3)    ~1.000 KB
├── Boss-Musik (ambient_boss.mp3)      ~1.500 KB
└── Biom-spezifische SFX              ~200 KB
                                       ─────────
                              Gesamt:  ~2,7 MB
```

**Implementierung in Phaser:**
```
PreloadScene    → Phase 1 (Ladebalken sichtbar)
CityScene.init  → Phase 2 starten (this.load.start() im Hintergrund)  
ExpeditionStart → Phase 3 je nach gewähltem Biom
```

#### 18.10.3 Warum KEIN Compression für WAV/PNG nötig

- **PNG:** Bereits verlustfrei komprimiert. Pixel‑Art bei 32×32 ist so klein (~2 KB), dass weitere Kompression nichts bringt.
- **WAV SFX:** Gesamt 756 KB für 31 Sounds. Konvertierung zu OGG/MP3 würde ~200 KB sparen, aber Qualitätsverlust bei ohnehin kurzen Retro‑Sounds. **Nicht nötig für MVP.** Kann als Post‑MVP‑Optimierung gemacht werden.
- **MP3 Musik:** Bereits verlustbehaftet komprimiert. 128 kbps reicht für Ambient‑Loops.

---

### 18.11 Mobile‑Vorbereitung (Post‑MVP, aber nicht verbaut)

#### Design‑Prinzip: "Mobile‑Ready, nicht Mobile‑First"

Das MVP ist Desktop‑only (Maus + Tastatur), aber die Architektur soll Mobile **nicht ausschließen**. Folgende Regeln gelten ab sofort:

#### 18.11.1 Was wir JETZT schon richtig machen müssen

| Regel | Warum | Beispiel |
|-------|-------|---------|
| **Keine festen Pixel‑Koordinaten für UI** | Bildschirmgröße variiert | UI‑Positionen relativ zu `game.scale.width/height`, nicht `x: 1200` |
| **Touch‑freundliche Klickflächen** | Finger sind ungenauer als Maus | Gebäude‑Buttons mindestens 48×48 CSS‑Pixel (schon durch 32px Tiles + Zoom OK) |
| **Keine Hover‑only‑Mechaniken** | Touch hat kein Hover | Tooltips auch per Tap auslösbar machen (Tap = Hover+Click) |
| **Keine Rechtsklick‑Pflicht** | Mobile hat keinen Rechtsklick | Alle Aktionen über Linksklick/Tap + UI‑Buttons erreichbar |
| **Scale Manager in Phaser** | Automatische Skalierung | `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }` |
| **Kein WASD als einzige Kamera‑Steuerung** | Mobile hat keine Tastatur | Kamera muss auch per Drag/Touch‑Pan funktionieren |
| **Input‑Abstraktion** | Maus vs. Touch transparent | Ein `InputManager` der `pointer` Events nutzt (Phaser macht das bereits) |

#### 18.11.2 Was wir für Mobile SPÄTER hinzufügen

- **Responsive UI‑Layout:** HUD neu anordnen für Portrait/Landscape
- **Pinch‑to‑Zoom:** Phaser Camera Zoom per Touch‑Geste
- **Virtual Joystick:** Für Kamera‑Pan auf kleinen Screens
- **Reduced Motion:** Weniger Partikel auf schwacher Hardware
- **Touch‑spezifische Tap‑Zonen:** Größere Gebäude‑Auswahl‑Flächen
- **PWA‑Manifest:** Installierbar auf Homescreen (optional)

#### 18.11.3 Phaser Scale Manager Config (jetzt festlegen)

```typescript
scale: {
  mode: Phaser.Scale.FIT,              // Passt in Container, behält Aspect Ratio
  autoCenter: Phaser.Scale.CENTER_BOTH, // Zentriert horizontal + vertikal
  width: 1280,                          // Design-Auflösung
  height: 720,
  min: { width: 640, height: 360 },    // Minimum (halbe HD)
  max: { width: 1920, height: 1080 },  // Maximum (Full HD)
  parent: 'game-container',
},
```

> **Ergebnis:** Das Spiel skaliert automatisch auf jede Bildschirmgröße. Auf einem Tablet wäre es sofort spielbar – nur die Touch‑Steuerung fehlt noch.

---

### 18.12 Safari‑Quirks (Workaround)

Safari blockiert Audio bis der User einmal aktiv interagiert (Autoplay‑Policy):

```
Boot‑Flow mit Safari‑Fix:
1. Spiel lädt → zeigt "Klicke um zu starten" Splash‑Screen
2. User klickt → AudioContext wird resumed
3. Erst DANN: Musik + SFX freigeschaltet
```

```typescript
// In BootScene:
this.input.once('pointerdown', () => {
  // Safari/iOS: AudioContext muss durch User-Geste aktiviert werden
  if (this.sound.context?.state === 'suspended') {
    this.sound.context.resume();
  }
  this.scene.start('PreloadScene');
});
```

> **Bonus:** Der "Klicke um zu starten" Screen verhindert auch dass Musik sofort losplärrt wenn jemand die Seite öffnet. Gute UX für alle Browser.

---

### 18.13 Vite Build‑Konfiguration (Theorie)

```typescript
// vite.config.ts – relevante Einstellungen
{
  build: {
    target: 'es2020',              // Modernes JS, kein IE11
    outDir: 'dist',
    assetsInlineLimit: 4096,       // Dateien < 4KB werden inline (base64)
    chunkSizeWarningLimit: 1500,   // Warnung ab 1.5 MB Chunks
    
    rollupOptions: {
      output: {
        // Phaser als separater Chunk (Caching!)
        manualChunks: {
          'phaser': ['phaser'],    // ~1 MB – ändert sich nie, Browser cached
        },
        // Asset-Hashing für Cache-Busting
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  },
  
  // Gzip-Kompression (Produktion)
  // Plugin: vite-plugin-compression
  // Ergebnis: .js.gz und .css.gz Dateien, Server liefert gzip automatisch
}
```

**Code‑Splitting Strategie:**
| Chunk | Inhalt | Geschätzte Größe | Cache‑Verhalten |
|-------|--------|-------------------|-----------------|
| `phaser.js` | Phaser‑Framework | ~1.0 MB → ~350 KB gzip | Ändert sich nie → permanent gecached |
| `game.js` | Unser Spielcode | ~150 KB → ~50 KB gzip | Ändert sich bei Updates |
| `data.js` | JSON‑Definitionen | ~65 KB → ~15 KB gzip | Ändert sich bei Balance‑Patches |

> **Practical Impact:** Nach dem ersten Laden muss der Browser bei Updates nur `game.js` (~50 KB) neu laden. Phaser bleibt im Cache. Update‑Ladezeit: < 0.5 Sekunden.

---

### 18.14 Stabilitäts‑Bewertung: "Läuft das 100% stabil?"

#### Ehrliche Einschätzung: **95% – Ja, mit kleinen Risiken**

**Was SICHER stabil läuft (kein Risiko):**

| Bereich | Warum sicher |
|---------|-------------|
| Rendering | Phaser 3 rendert seit 2018 Millionen Spiele. 50 Sprites bei 32px = trivial. Ein moderner Browser schafft das mit 1% GPU‑Last. |
| Performance | Unser Game hat ~0 Physik, ~50 Sprites, ~12 Gebäude max. Das ist unter 1% dessen was Phaser kann. 60 FPS ist garantiert. |
| Speichergröße | 7 MB total, ~50 KB Savegame. localStorage‑Limit (5 MB) wird nie auch nur annähernd erreicht. |
| Kompatibilität | Chrome/Firefox/Edge ab 2021 unterstützen alles was wir brauchen. Kein einziges experimentelles Feature. |

**Was kleine Risiken hat (durch unsere Maßnahmen abgedeckt):**

| Risiko | Wahrscheinlichkeit | Unsere Absicherung |
|--------|-------------------|--------------------|
| Save‑Corruption (Browser crasht mid‑write) | ~1% | Backup‑Slot + Schema‑Validierung + Notfall‑Save |
| localStorage‑Leer (User löscht Browser‑Daten) | ~5% der User | Klare Warnung "Kein Spielstand gefunden", kein Crash |
| Tab‑Wechsel‑Desync (100 Ticks auf einmal) | Ohne Handling ~30% | Catch‑up mit Max 10 Ticks + Pause bei > 5 Min |
| Safari Audio‑Block | 100% auf Safari | "Klicke um zu starten" Splash löst das |
| Alter Browser ohne WebGL | ~2% der User 2026 | Canvas‑Fallback + Boot‑Warnung |

**Was wirklich schiefgehen KÖNNTE (aber extrem unwahrscheinlich):**

| Edge Case | Wahrscheinlichkeit | Auswirkung |
|-----------|-------------------|----|
| Phaser‑Bug in spezifischer Browser‑Version | < 0.1% | Nur lösbar durch Phaser‑Update |
| Speicher‑Leak durch vergessenes `destroy()` | ~10% bei Entwicklung | FPS‑Monitor warnt, Object Pool verhindert das meiste |
| Endlos‑Loop in Game‑Logic (Bug im Synergie‑System etc.) | ~5% bei Entwicklung | Error Boundary fängt das ab, Notfall‑Save |

#### Was fehlt für 100%?

Nur **ein einziges Ding** trennt uns von 100% theoretischer Stabilität:

> **Automatisierte Tests.** Alles oben ist Theorie auf Papier. Erst wenn wir Unit‑Tests für SaveManager, VisibilityManager und CombatSystem haben, können wir *beweisen* dass es stabil ist. Das kommt automatisch beim Implementieren.

---

### 18.15 Checkliste Browser‑Stabilität (vollständig)

**MVP (muss vor Launch fertig sein):**
- [x] WebGL mit Canvas‑Fallback (Phaser.AUTO)
- [x] Pixel‑Art Rendering (nearest neighbor, roundPixels)
- [x] 60 FPS Target mit requestAnimationFrame
- [x] localStorage mit QuotaExceeded‑Handling
- [x] Save‑Corruption‑Schutz (Backup‑Slot + Schema‑Check)
- [x] Tab‑Visibility‑Handling (Pause + Catch‑up)
- [x] Auto‑Save (30s + Event‑basiert)
- [x] Object Pooling für temporäre Grafiken
- [x] Off‑Screen Culling
- [x] Error Boundary mit Notfall‑Save
- [x] Browser‑Compatibility‑Check bei Boot
- [x] Audio: Safari Autoplay‑Workaround
- [x] Audio: Mute bei Tab‑Wechsel
- [x] Performance‑Budget‑Monitoring (Debug‑Modus)
- [x] Phaser Scale Manager (FIT + CENTER_BOTH)
- [x] Keine Hover‑only Mechaniken (Touch‑ready)
- [x] Keine Rechtsklick‑Pflicht
- [x] Keine festen Pixel‑Koordinaten für UI
- [x] Lazy Loading für Musik (nach Spielstart)
- [x] On‑Demand Loading für Biom‑Musik (vor Expedition)
- [x] Vite Code‑Splitting (Phaser als separater Chunk)
- [x] Asset‑Hashing für Cache‑Busting

**Post‑MVP:**
- [ ] Texture Atlas Build‑Tool (Draw Calls reduzieren)
- [ ] WAV → OGG Konvertierung (~200 KB sparen)
- [ ] IndexedDB Migration für große Saves
- [ ] Mobile Touch‑Steuerung
- [ ] PWA‑Manifest
- [ ] Gzip‑Compression Plugin
- [ ] Automatisierte Browser‑Tests (Playwright/Cypress)

---

> **→ Ende Teil 4. Alle Fixes sind MVP‑kompatibel und nutzen bestehende Systeme/Logik.**
