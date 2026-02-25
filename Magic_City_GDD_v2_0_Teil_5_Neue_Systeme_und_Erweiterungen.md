# 🏰 Magic City – The Guild's Hearth
**Game Design Document (GDD) v2.0 – Teil 5**
**Neue Systeme, Erweiterungen & Balancing-Updates**

> **Dieses Dokument** ergänzt die Teile 1–4 und enthält alle neuen Systeme und Ideen die im Rahmen des finalen Design-Reviews erarbeitet wurden. Es hat Vorrang vor älteren Einträgen in den Teilen 1–4 wenn Konflikte bestehen.

> **Dokumentstruktur (gesamt):**
> - Teil 1: Abschnitte 0–6 (Tech, Grid, Logistik, Economy)
> - Teil 2: Abschnitte 7–10 (Bewohner, Gebäude, Expeditionen, Datenmodelle)
> - Teil 3: Abschnitte 11–16 (UI, Balancing, MVP-Scope, Arbeitspakete)
> - Teil 4: Abschnitte 17–18 (Fixes, Sound-System, Browser-Stabilität)
> - **Teil 5 (dieses File):** Abschnitte 19–32 (Neue Systeme, Dungeon-Erweiterung, Resistenzen, Aktiv-Kampf, Spielspaß-Systeme, NPC-Befreiung, Belagerungswaffen, Dungeon-Anforderungen)

---

## 19) Aktives Kampfsystem – Planungsphase & Aktive Fähigkeiten

> **Problem:** Das bisherige Auto-Battle-System ist zu passiv. Spieler schauen hauptsächlich zu. Das widerspricht dem Ziel, emotionale Bindung an die Kämpfer zu schaffen.
> **Lösung:** Rundenbasierte Planungsphase + manuelle Klassen-Skills = aktives Beobachten mit punktuellen Entscheidungen. Kein Echtzeit-Stress, aber echter taktischer Einfluss.

### 19.1 Planungsphase (Planning Phase)

Jede Kampfrunde hat eine **Planungsphase** bevor die Runde ausgeführt wird.

**Ablauf einer Runde:**
```
1. Planungsphase startet (5 Sekunden Standard, pausierbar)
   → Telegraf-Icons über Gegnern erscheinen (zeigen nächste Aktion)
   → Aktive Skills leuchten auf wenn bereit
   → Spieler kann Befehle setzen oder Skills auslösen

2. Spieler drückt "Ausführen" ODER 5 Sekunden vergehen automatisch

3. Runde läuft ab (Initiative-Reihenfolge wie gehabt)

4. Nächste Planungsphase
```

**Timing:**
- Standard-Dauer: **5 Sekunden**
- Manuell pausierbar: Spieler kann unbegrenzt lang planen
- Auto-Pause bei kritischen Ereignissen (siehe 19.3)

### 19.2 Telegrafierte Angriffe

Gegner zeigen **vor** ihrem Zug an was sie tun werden (Icon über dem Sprite):

| Icon | Bedeutung |
|------|-----------|
| ⚔️ Schwert | Normaler Angriff auf Ziel X |
| 🌀 Wirbel | AoE-Angriff nächste Runde (alle Kämpfer betroffen) |
| 🛡️ Schild | Gegner bufft sich selbst |
| 💀 Totenkopf | Spezialangriff (Boss-Fähigkeit) |
| 💚 Herz | Gegner heilt sich oder einen Verbündeten |

Der Spieler muss **nicht** reagieren – aber er **kann** es. Das schafft das Gefühl von Lesen und Antworten ohne Zwang.

### 19.3 Auto-Pause bei kritischen Ereignissen

Das Spiel pausiert die Planungsphase automatisch und zeigt eine Warnung wenn:
- Ein Kämpfer unter **25% HP** fällt
- Eine Klassen-Fähigkeit zum **ersten Mal** bereit wird (Tutorial-Hilfe)
- Ein Boss seine **Enrage-Phase** startet
- Eine **Reaktionskarte** einsetzbar ist
- Ein Kämpfer **niedergeht** (0 HP)

**Design-Grund:** Kein kritischer Moment wird verpasst, auch wenn der Spieler gerade abgelenkt war.

### 19.4 Kampfbefehle pro Kämpfer

In der Planungsphase kann jeder Kämpfer einen Befehl bekommen (per Klick auf den Kämpfer oder dedizierte Buttons):

| Befehl | Symbol | Effekt |
|--------|--------|--------|
| **Angriff** (Standard) | ⚔️ | Maximaler Schaden, normale Bedrohung |
| **Deckung** | 🛡️ | -30% erhaltener Schaden, weniger Bedrohung, kann nicht Krit machen |
| **Fokus** | 🎯 | Ignoriert alle anderen Ziele, 100% Fokus auf markiertes Ziel |

Befehle bleiben bis zur nächsten manuellen Änderung aktiv (kein Reset pro Runde).

### 19.5 Kampf-Geschwindigkeitskontrolle

Der Spieler kann die Kampfgeschwindigkeit jederzeit ändern:

| Modus | Multiplier | Nutzung |
|-------|-----------|---------|
| **1× Normal** | 1.0 | Standard, bei schwierigen Kämpfen |
| **2× Schnell** | 2.0 | Für bekannte leichte Gegner |
| **3× Blitz** | 3.0 | Für erfahrene Spieler, Farming-Runs |

Button im Kampf-UI (oben rechts), persistent über Runs (letzte Einstellung wird gespeichert).

### 19.6 Aktive Klassen-Fähigkeiten

Jede Klasse hat eine **Signature-Fähigkeit** die der Spieler **manuell auslösen** muss. Der Button leuchtet/blinkt wenn die Fähigkeit bereit ist. Cooldown startet nach Auslösung.

**MVP-Klassen:**

| Klasse | Fähigkeit | Effekt | Cooldown |
|--------|-----------|--------|----------|
| **Wächter** | Schildwall | Absorbiert den nächsten Treffer komplett + erhöht Bedrohung massiv (taunt) | 4 Runden |
| **Ranger** | Gezielter Schuss | 3× Schaden auf Ziel, ignoriert DEF komplett | 5 Runden |
| **Kleriker** | Notfall-Segen | Heilt alle Kämpfer sofort auf 60% HP + kleine Regeneration für 2 Runden | 6 Runden |

**Post-MVP-Klassen:**

| Klasse | Fähigkeit | Effekt | Cooldown |
|--------|-----------|--------|----------|
| **Berserker** | Blutraserei | 2 Runden: DEF = 0, ATK ×2, jeder Treffer heilt 5 HP | 5 Runden |
| **Assassin** | Tödlicher Stich | Springt auf schwächsten Gegner, ignoriert alle DEF, 50% Krit-Chance | 4 Runden |
| **Paladin** | Heiliges Licht | Heilt einen Kämpfer vollständig + 1 Runde Unverwundbarkeit | 7 Runden |
| **Barde** | Kampflied | Alle Kämpfer: +2 ATK, +2 DEF, Debuff-Immunität für 3 Runden | 6 Runden |
| **Hexe** | Fluch | Ziel: -50% ATK für 3 Runden, breitet sich auf benachbarte Gegner aus | 5 Runden |
| **Nekromant** | Totenbeschwörung | Beschwört gefallenen Gegner als Verbündeten für 2 Runden | 8 Runden |
| **Druide** | Naturgewalt | Trifft alle Gegner für mittleren Schaden + verlangsamt Initiative für 2 Runden | 6 Runden |

**Upgrade durch Helden-Level (Post-MVP):**
- Jede Fähigkeit bekommt einen Upgrade-Pfad über das Level-System
- Beispiel: Ranger Level 8 → "Gezielter Schuss" trifft zweimal
- Beispiel: Wächter Level 10 → "Schildwall" hält 2 Treffer ab statt 1

### 19.7 Reaktionskarten (Reaction Cards)

Pro Expedition bekommt die Party **3 Reaktionskarten** (verbrauchbar). Weitere können durch Loot oder Proviant-Crafting erhalten werden.

| Karte | Effekt | Wie erhalten |
|-------|--------|-------------|
| **Rückzugs-Rauch** | Bricht aktuellen Kampf sofort ab, kein Schaden, kein Loot | Start-Ausrüstung (1×) |
| **Zweite Luft** | Ein niedergegangener Kämpfer steht mit 20% HP auf | Loot-Drops, Crafting |
| **Konter** | Nächster Treffer gegen Party wird auf Angreifer zurückgeworfen | Seltener Loot |
| **Notfall-Proviant** | Heilt sofort den am stärksten verletzten Kämpfer um 20 HP | Händler-Encounter |

**Design-Grund:** Nimmt das Gefühl von "Ich konnte nichts tun" bei kritischen Momenten komplett weg.

---

## 20) Benannte Kämpfer mit Persönlichkeits-Traits

> **Problem:** Kämpfer sind aktuell nur Klassen-Icons ohne Identität. Emotionale Bindung entsteht nicht.
> **Lösung:** Jeder Kämpfer bekommt einen zufälligen Namen + 1-2 Persönlichkeitszüge bei der Ausbildung.

### 20.1 Namen-System

Beim Training erhält jeder Kämpfer einen zufälligen Namen aus einer klassenspezifischen Pool-Liste:

- **Wächter:** Aldric, Borin, Theron, Mira, Helga, Brant, ...
- **Ranger:** Sylva, Finn, Lyra, Darian, Nessa, Kael, ...
- **Kleriker:** Elara, Brother Tomas, Sister Mira, Aldwin, Seraph, ...
- (Jede Post-MVP-Klasse bekommt einen eigenen Namenspool)

Namen werden im SaveState gespeichert und erscheinen in:
- Kämpfer-Roster-UI
- Expeditions-Tagebuch
- Verletzungs-/Tod-Meldungen
- Stadtchronik

### 20.2 Persönlichkeits-Traits

Jeder Kämpfer bekommt beim Training **1-2 zufällige Traits** aus einem Pool. Traits sind permanent und beeinflussen Stats/Verhalten:

| Trait | Effekt | Häufigkeit |
|-------|--------|-----------|
| **Tapfer** | +8% Krit, -5 DEF | Häufig |
| **Vorsichtig** | -5% Krit, +5 DEF | Häufig |
| **Anführer** | Party-Skills: -1 Runde CD (nur wenn dieser Kämpfer aktiv ist) | Selten |
| **Gierig** | +15% Gold-Loot aus Expeditionen | Häufig |
| **Frommer** | Kleriker-Heilung +20% wenn dieser Kämpfer geheilt wird | Häufig |
| **Unerschrocken** | Angst-/Fear-Effekte haben 50% weniger Wirkung | Selten |
| **Zäh** | Wacht bei 0 HP mit 1 HP auf (1× pro Expedition) | Sehr selten |
| **Erfahrener Jäger** | +10% Schaden gegen Beast-Typ-Gegner | Häufig |
| **Magieresistent** | -20% erlittener Magieschaden | Selten |
| **Draufgänger** | +15% ATK wenn HP < 30% | Selten |

**Datenmodell-Ergänzung:**
```json
{
  "fighterId": "f_001",
  "name": "Aldric",
  "class": "GUARDIAN",
  "traits": ["BRAVE", "TOUGH"],
  "level": 1,
  "stats": { "hp": 30, "atk": 8, "def": 6, "spd": 4 }
}
```

### 20.3 Emotionale Bindung durch Trait-Events

Wenn ein Kämpfer mit dem Trait "Zäh" wirklich auf 1 HP überlebt, erscheint im Expeditions-Log:
> *"Aldric fiel – aber stand durch reine Willenskraft wieder auf!"*

Das schafft Geschichten aus prozeduralen Systemen.

---

## 21) Erweitertes Dungeon-System (Tier 1–4)

> **Problem:** MVP hat nur 3 Routen. Nach 2-3 Stunden sind diese bekannt und der Reiz lässt nach.
> **Lösung:** 11 Dungeons in 4 Tiers, neue Mechaniken pro Dungeon, Dungeon-Modifikatoren für Wiederspielwert.

### 21.1 Dungeon-Tier-Übersicht

| Tier | Guild Rank | Charakter | Raumanzahl | Besonderheit |
|------|------------|-----------|------------|--------------|
| **T1** | I–II | Einstieg, lehrreich | 6–10 Räume | Keine Sonderregeln |
| **T2** | III | Mittelschwer, neue Mechaniken | 10–14 Räume | Elementar-Umgebungseffekte |
| **T3** | IV | Gefährlich, Elite-Gegner | 14–18 Räume | Elite-Varianten, Multi-Phase Bosse |
| **T4** | V | Endgame | 18–25 Räume | Mehrere Bosse, einmalige Rewards |

### 21.2 Vollständige Dungeon-Liste (11 Dungeons)

**TIER 1 (bereits in Teil 2 definiert, hier zur Übersicht):**

| ID | Name | Räume | Boss | Freischaltung |
|----|------|-------|------|--------------|
| `forest_short` | Waldpfad | 6 | – | Spielstart (Tutorial) |
| `forest_medium` | Waldruinen | 10 | Elder Treant | Rang I |
| `cave_deep` | Tiefe Höhle | 8 | Kristall-Golem | Rang I |

**TIER 2 (neu):**

| ID | Name | Räume | Boss | Freischaltung |
|----|------|-------|------|--------------|
| `swamp_long` | Verfluchtes Sumpfgebiet | 12 | Sumpf-Hydra | Rang III |
| `ruins_crypts` | Verfallene Ruinen | 12 | Gefallener Ritter | Rang III |

**TIER 3 (neu):**

| ID | Name | Räume | Boss | Freischaltung |
|----|------|-------|------|--------------|
| `spider_nest` | Spinnennest | 14 | Spinnenkönigin | Rang IV |
| `volcano_core` | Vulkankern | 16 | Magma-Wyrm | Rang IV |
| `library_cursed` | Verfluchte Bibliothek | 14 | Archiv-Wächter | Rang IV |

**TIER 4 (Endgame, neu):**

| ID | Name | Räume | Boss | Freischaltung |
|----|------|-------|------|--------------|
| `shadow_realm` | Schattenreich | 18 | Shadow Lich + Void Walker | Rang V |
| `dragon_lair` | Drachenhort | 20 | Uralter Drache (3 Phasen) | Rang V + 8 Bosse besiegt |
| `grandmaster_trial` | Grandmaster-Prüfung | 25 | 3 sequenzielle Bosse | Rang V + Guild Hall T2 |

### 21.3 Neue Dungeon-spezifische Mechaniken

**Verfluchtes Sumpfgebiet (T2):**
- **Gift-DoT:** Jeder Raum gibt allen Kämpfern 2 Giftschaden pro Kampfrunde (nicht pro Raum)
- Antidot-Proviant neutralisiert für diesen Raum
- Neue Gegner: Bog-Witch, Swamp-Troll, Leech-Swarm, Mire-Phantom, Toxic-Toad, Rot-Walker

**Verfallene Ruinen (T2):**
- **Dunkelheit:** Manche Räume -20% Trefferchance für alle bis Fackel gezündet (kostet 1 Runde, aber lohnt sich)
- Untote Gegner: immun gegen Gift, aber +50% Schaden durch Kleriker-Heilzauber
- Neue Gegner: Skeleton-Warrior, Cursed-Knight, Tomb-Wraith, Bone-Archer

**Spinnennest (T3):**
- **Webfallen:** Manche Räume haben Webfallen → 1 zufälliger Kämpfer überspringt erste Runde. Ranger kann mit "Gezieltem Schuss" zerstören.
- **Eier-Räume:** Destroy-or-ignore Entscheidung: Eier zerstören = Bonus-Loot, ignorieren = +2 Spinnen im nächsten Kampf
- Neue Gegner: Giant-Spider, Egg-Sac-Guardian, Venomous-Lurker

**Vulkankern (T3):**
- **Hitze-Stapel:** Pro Raum +1 Hitzestapel. Ab 3 Stapeln: alle Kämpfer -3 HP/Runde im Kampf. Wasser-Proviant reduziert um 2 Stapel.
- **Lavaspalten:** Hazard-Räume können Kämpfer mit niedrigem DEF direkt treffen (DEF < 5 → +5 Schadenbonus)
- Lava-Golem-Gegner heilt sich bei Feuerschaden (Hexen-Fluch umgehen!)

**Verfluchte Bibliothek (T3):**
- **Zauberspiegel:** 30% der Gegner reflektieren Magieschaden zurück auf den Angreifer
- **Verfluchte Bücher** (Find-Encounter): Lesen = zufälliger permanenter Buff + zufällige Nebenwirkung für den Run (z.B. +5 ATK aber -10 max HP)
- **Arkane Resonanz:** Jeder eingesetzte aktive Skill gibt dem Archiv-Wächter +2 ATK wenn er als Boss erscheint

**Schattenreich (T4):**
- **Spiegelkampf** (einmal pro Run): Party kämpft gegen Spiegel-Versionen ihrer selbst (gleiche Stats, gleiche Skills)
- **Realitätsverzerrung:** Alle 3 Räume kehrt sich die Initiative-Reihenfolge um (Schnelle werden langsam)
- **Schattenklone:** Bosse spawnen bei 50% HP eine schwächere Kopie von sich

**Drachenhort (T4 - Einmaliger Endgame-Dungeon):**
- Nur **einmal pro Spielstand** vollständig bezwingbar (kann mehrfach betreten werden aber Boss respawnt nicht)
- **Uralter Drache - 3-Phasen-Bosskampf:**
  - **Phase 1 (100–60% HP):** Normale Angriffe, AoE Feuerspeien (telegrafiert)
  - **Phase 2 (60–30% HP):** Fliegt auf → nur Ranger, Druide, Barde können ihn treffen. Tank und Kleriker müssen andere Strategie fahren
  - **Phase 3 (30–0% HP):** Landet wieder, Enrage permanent (+30% ATK), ruft 2 Dracolings
- **Garantierter Reward:** 1× Legendäres Item + "Drachentöter"-Titel in der Stadtchronik
- **Moment of Delight:** Besonderer Screen mit Drachen-Portrait + Titel-Animation

### 21.4 Dungeon-Modifikatoren

Ab **Tier 2** bekommt jeder Dungeon beim Start einen zufälligen Modifikator (1 aktiv pro Run):

| Modifikator | Effekt | Häufigkeit |
|-------------|--------|-----------|
| **Elite-Invasion** | 30% der Gegner sind Elite-Varianten (+50% HP, neue Fähigkeit) | Häufig |
| **Schatz-Modus** | Doppeltes Loot aus allen Räumen, aber doppelte Hazard-Chance | Häufig |
| **Verfluchte Waffen** | Alle Angriffe verursachen auch 2 Selbstschaden pro Hit | Mittel |
| **Zeitdruck** | Alle 5 Runden ohne Boss-Kill: alle Gegner enragen (+30% ATK) | Selten |
| **Nebel des Krieges** | Encounter-Typ ist bis zum Raumbetreten unbekannt | Mittel |
| **Eisige Kälte** | Alle Initiative-Werte halbiert, Kämpfe dauern länger | Häufig |
| **Blutmond** | Crits machen 3× statt 2× – für beide Seiten | Selten |
| **Kein Modifikator** | Normaler Run | Sehr häufig (40%) |

**Implementierung:** Beim Route-Start wird 1× gewürfelt. Modifikator wird im Dungeon-Auswahl-Screen angezeigt bevor der Spieler startet.

### 21.5 Aktualisierte Gilden-Rang-Tabelle

Erweitert um neue Dungeons (ersetzt Tabelle aus Teil 1, Abschnitt 1.5):

| Rang | Name | Bedingung | Unlock |
|------|------|-----------|--------|
| **I** | Novize | Spielstart | Alle MVP-Gebäude, `forest_short`, `forest_medium`, `cave_deep` |
| **II** | Abenteurer | 3× `forest_short` abgeschlossen | Schmiede-Rezepte sichtbar, Gear-System freigeschaltet |
| **III** | Veteran | 1× Boss besiegt | `swamp_long`, `ruins_crypts`, Guild Hall T2 Upgrade, Talisman-Crafting, T2-Dungeons |
| **IV** | Champion | 3× Bosse besiegt (gesamt) | `spider_nest`, `volcano_core`, `library_cursed`, +1 Proviant-Slot, T3-Dungeons |
| **V** | Legende | 5× Bosse besiegt + Guild Hall T2 | `shadow_realm`, `dragon_lair`, `grandmaster_trial`, Endgame-Banner, Codex-Abschluss |

---

## 22) Elementar-Dungeon-System & Vollständige Resistenz-Items

> **Kernidee:** Bestimmte Dungeons haben Elementar-Umgebungsschaden der ohne die richtigen Resistenz-Items den Run massiv schwächt. Das erzwingt Vorbereitung und verbindet Stadtproduktion direkt mit Expedition-Planung.

### 22.1 Elementar-Dungeons Übersicht

Vier Dungeons haben permanenten Umgebungseffekt:

| Dungeon | Element | Effekt ohne Resistenz | Effekt mit voller Resistenz |
|---------|---------|----------------------|----------------------------|
| **Eisgruft** *(neu T2/T3)* | Eis | -6 HP pro Raum für alle Kämpfer | Keine Schaden + 15% ATK Bonus |
| **Feuerschluchten** *(neu T3)* | Feuer | -8 HP pro Raum für alle Kämpfer | Keine Schaden + 10 DEF Bonus |
| **Giftwald** *(= swamp_long)* | Gift | -3 HP pro Kampfrunde für alle (DoT im Kampf) | Keine DoT + eigene Angriffe haben 20% Gift-Chance |
| **Sturmfestung** *(neu T3)* | Blitz | 25% Chance pro Raum: 1 zufälliger Kämpfer wird für 1 Runde gelähmt | Keine Lähmung + +10% Initiative für alle |

**Skalierung:**
- **1 Kämpfer mit Resistenz:** Schaden/Effekt halbiert für alle (Party-Synergieeffekt)
- **2 Kämpfer mit Resistenz:** Schaden/Effekt um 75% reduziert
- **3 Kämpfer mit Resistenz (voll):** Kein Schaden + Bonus aktiv

### 22.2 Vollständiges Resistenz-Item-System (12 Items)

**Kategorie 1: Elementar-Resistenzen (6 Items)**
*Dungeon-spezifisch, für jeweiligen Dungeon meist nötig*

| Item | Slot | Schützt gegen | Primärer Dungeon | Crafting-Material | Crafting-Ort |
|------|------|--------------|-----------------|-------------------|-------------|
| **Frostumhang** | Rüstung | Eis-DoT pro Raum | Eisgruft | 2× Frostkristall + 2× Leder | Schmiede T1 |
| **Flammenward** | Trinket | Feuer-DoT pro Raum | Feuerschluchten | 2× Magmasplitter + 1× Eisenschrott | Schmiede T2 |
| **Antidot-Amulett** | Trinket | Gift-DoT im Kampf | Giftwald/Sumpf | 3× Heilkraut + 1× Talisman-Fragment | Kräutergarten (spez. Auftrag) |
| **Sturmmantel** | Rüstung | Blitz-Lähmung | Sturmfestung | 2× Sturmfeder + 2× Leder | Schmiede T2 |
| **Schattenschleier** | Trinket | Angst-/Fear-Effekt | Schattenreich | 2× Schattenfragment + 1× Talisman-Fragment | Schmiede T2 |
| **Magieschild** | Trinket | Arkaner Schaden (reflektiert 20%) | Verfluchte Bibliothek | 2× Arkankristall + 1× Talisman-Fragment | Schmiede T2 |

**Kategorie 2: Status-Effekt-Resistenzen (4 Items)**
*Dungeon-übergreifend, für spezifische Gegner-Typen nützlich*

| Item | Slot | Schützt gegen | Nützlich in | Crafting-Material | Crafting-Ort |
|------|------|--------------|-------------|-------------------|-------------|
| **Geronnenes Blutamulett** | Trinket | Blutungs-DoT | Ruinen, Spinnennest | 2× Eisenschrott + 1× Knochen-Fragment | Schmiede T1 |
| **Wachstein-Ring** | Trinket | Betäubung/Stun | Höhle, Golem-Dungeons | 2× Quarzsplitter + 1× Eisenschrott | Schmiede T1 |
| **Mutstein** | Trinket | Angst/Fear-Effekt | Schattenreich, Ruinen | 1× Heilkraut + 1× Schattenfragment | Kräutergarten |
| **Quecksilber-Stiefel** | Rüstung | Verlangsamung/Slow | Eisgruft, Sumpf | 2× Quecksilber + 2× Leder | Schmiede T2 |

**Kategorie 3: Allgemeine Resistenzen/Endgame (2 Items)**
*Schwer zu craften, sehr wertvoll, Endgame-relevanz*

| Item | Slot | Effekt | Crafting-Material | Crafting-Ort |
|------|------|--------|-------------------|-------------|
| **Heiliges Siegel** | Trinket | Fluch-Immunität + Untote machen -30% Schaden | 1× Heiliges Wasser + 3× Talisman-Fragment | Schmiede T2 (spez. Rezept) |
| **Stahlhaut-Talisman** | Trinket | -15% aller physischer Schaden (universal) | 4× Eisenschrott + 2× Quarzsplitter + 1× Edelstein | Schmiede T2 (spez. Rezept) |

### 22.3 Resistenz-Item-Tiers

Jedes Resistenz-Item gibt es in **zwei Stufen**:

- **T1 (Basis):** -50% des Elementarschadens / Effektchance halbiert
- **T2 (Meister):** Volle Immunität + Bonus-Effekt aktiv

**T2-Upgrade-Rezepte (alle benötigen T1-Item + zusätzliche Materialien):**

| Item T2 | Zusatz-Material | Bonus-Effekt |
|---------|----------------|-------------|
| Frostumhang T2 | +2× Frostkristall + 1× Edelstein | Eigene Angriffe: 10% Chance Gegner einfrieren (1 Runde) |
| Flammenward T2 | +2× Magmasplitter + 1× Edelstein | Bei Feuertreffern: 15% Schaden reflektiert |
| Antidot-Amulett T2 | +2× seltenes Heilkraut + 1× Edelstein | Eigene Angriffe: 20% Gift-Chance auf Gegner |
| Sturmmantel T2 | +2× Sturmfeder + 1× Edelstein | +15% Initiative für gesamte Party |
| Schattenschleier T2 | +3× Schattenfragment + 1× Edelstein | 1× pro Run: Einmal unsichtbar (gegner überspringen 1 Runde) |
| Magieschild T2 | +3× Arkankristall + 1× Edelstein | 30% Magiereflexion + eigene Skills kosten -1 CD |

### 22.4 Neue Materialien (Ergänzung zu bestehenden)

| Material | Wie erhalten | Verwendung |
|----------|-------------|-----------|
| **Frostkristall** | Drop: Tiefe Höhle, Eisgruft | Frostumhang, Quecksilber-Stiefel |
| **Magmasplitter** | Drop: Vulkankern, Feuerschluchten | Flammenward |
| **Sturmfeder** | Drop: Sturmfestung | Sturmmantel |
| **Schattenfragment** | Drop: Schattenreich, Ruinen | Schattenschleier, Mutstein |
| **Arkankristall** | Drop: Verfluchte Bibliothek | Magieschild |
| **Knochen-Fragment** | Drop: Ruinen, Krypta | Geronnenes Blutamulett |
| **Quarzsplitter** | Drop: Steinbruch (selten), Höhle | Wachstein-Ring, Stahlhaut-Talisman |
| **Quecksilber** | Drop: Höhle T3, Händler | Quecksilber-Stiefel |
| **Heiliges Wasser** | Drop: Kleriker-Event, Tempel-Encounter | Heiliges Siegel |
| **Edelstein** | Drop: Boss-Loot (selten), Händler | T2-Upgrades aller Resistenz-Items |

### 22.5 Slot-Balance & Gear-Entscheidungen

Jeder Kämpfer hat nur 3 Slots (Waffe, Rüstung, Trinket). Resistenz-Items belegen einen Slot. Das erzeugt echte Entscheidungen:

> *"Nehme ich den Angriffs-Trinket für mehr Schaden – oder den Resistenz-Trinket und überlebe den Dungeon?"*

**Empfohlene Loadouts pro Dungeon-Typ (UI-Hinweis vor dem Start):**
- Eisgruft: Frostumhang priorisieren, Wächter kann Deckung-Befehl nutzen als Alternative
- Feuerschluchten: Flammenward zwingend empfohlen, sonst sehr schwer
- Giftwald: Antidot-Amulett ODER viele Antidot-Tränke als Proviant

---

## 23) Gildenbrett – Missionssystem

> **Zweck:** Spieler wissen immer was sie als nächstes tun sollen. Das Gildenbrett lenkt den Fokus organisch auf verschiedene Systeme.

### 23.1 Grundprinzip

Das Gildenbrett (Teil des Gildenhaus-UI) zeigt **3 aktive Missionen** die täglich rotieren (alle 5 Spieltage neue Missionen):

**Missionstypen:**

| Kategorie | Beispiele | Belohnung |
|-----------|----------|----------|
| **Produktion** | "Produziere 20 Brot", "Schmelze 15 Eisenschrott" | Gold (30-60) |
| **Expedition** | "Besiege den Kristall-Golem", "Überstehe 3 Expeditionen ohne Verluste" | Talisman-Fragment, seltenes Item |
| **Stadt** | "Trainiere 2 neue Kämpfer", "Baue 3 Straßen-Tiles" | Spezialist-Token, Gold |
| **Sammler** | "Bringe 5 Frostkristalle", "Finde einen Überlebenden" | Seltenes Material, neuer Kämpfer |

**Mission-Komplexität:**
- **Einfach (1 Tag):** Kleine Belohnung, leicht erreichbar
- **Mittel (2-3 Tage):** Mittlere Belohnung
- **Schwer (5 Tage):** Große Belohnung, strategisch wertvoll

### 23.2 Missionsboard-UI

Im Gildenhaus-Panel: "Missionen"-Tab mit 3 Karten:
- Jede Karte zeigt: Missionstitel, Beschreibung, Fortschritt (z.B. 12/20 Brot), Belohnung, Ablauftimer
- Abgeschlossene Missionen können jederzeit eingelöst werden (kein Auto-Claim)
- Neue Missionen erscheinen wenn die alten abgelaufen oder eingelöst wurden

---

## 24) Saisonales Wettersystem

> **Zweck:** Natürlicher Rhythmus der dem Spieler Planungs-Spannung gibt ohne Stress zu erzeugen.

### 24.1 Jahreszeiten-Zyklus

Alle **5 Spieltage** (= 5 × 60s = 300s Echtzeit) wechselt die Jahreszeit:

| Jahreszeit | Dauer | Städtische Effekte | Expeditions-Effekte |
|-----------|-------|-------------------|---------------------|
| **Frühling** | 5 Tage | Farmen +20% Produktionsrate | Waldrouten: +10% Heilkraut-Drops |
| **Sommer** | 5 Tage | Kräutergarten kann "Wunderkraut" produzieren (seltenes Material) | Alle Routen: +5% Loot-Chance |
| **Herbst** | 5 Tage | Getreide-Output ×1.5, aber danach Winter-Vorbereitungs-Hinweis | Sumpfrouten: -10% Feinde |
| **Winter** | 5 Tage | Häuser ohne Holzversorgung: -10 Zufriedenheit, Farmen -30% Output | Höhlen/Eis-Routen: -10% Feind-HP (Kälte schwächt sie) |

**Winter-Mechanik (Details):**
- "Holzversorgung" = Holzlager hat am Anfang des Winters > 20 Holz
- Wenn ja: kein Zufriedenheits-Penalty
- Wenn nein: -10 Zufriedenheit für alle Häuser für die gesamte Winter-Dauer
- Das motiviert Herbst zur Holz-Vorbereitung

### 24.2 Saison-Anzeige im HUD

Kleines Jahreszeiten-Icon (❄️ 🌸 ☀️ 🍂) neben dem Tages-Counter im HUD. Tooltip zeigt aktive Boni/Mali.

### 24.3 Saison-Events

Pro Jahreszeit kann ein saison-spezifisches Stadtevent ausgelöst werden (30% Chance):
- **Frühlingsfest:** Alle Häuser +15 Zufriedenheit für 1 Tag, kostet 5 Brot
- **Sommerdürre:** Farmen -50% für 2 Tage (Vorbereitung wichtig)
- **Erntedankfest:** Player-ausgelöst: -10 Brot → +25 Gold + +5 Zufriedenheit für 1 Tag
- **Schneesturm:** Zufälliges Gebäude pausiert für 90s (telegrafiert 10s vorher)

---

## 25) Negative Stadtevents mit Telegrafierung

> **Problem:** Aktuelle negative Events (Gewitter, etc.) wirken willkürlich und frustrierend ohne Vorwarnung.
> **Lösung:** Alle negativen Events werden **10 Sekunden vorher angekündigt** damit der Spieler reagieren kann.

### 25.1 Event-Telegrafierung

10 Sekunden vor einem negativen Event erscheint:
- Ein **animiertes Banner** am oberen Bildschirmrand (z.B. "Dunkle Wolken ziehen auf...")
- Ein **Icon** das das Event-Typ andeutet (⛈️ für Gewitter, 🗡️ für Banditen)
- Ein **kurzer Sound** der Aufmerksamkeit erzeugt

### 25.2 Erweiterte Event-Liste (ersetzt/ergänzt bestehende Liste)

| Event | Typ | Auswirkung | Spieler-Reaktion möglich |
|-------|-----|-----------|------------------------|
| **Gewitter** | Negativ | Zufälliges Produktionsgebäude pausiert 60s | Waren manuell ins Lager transferieren |
| **Banditen-Überfall** | Negativ | -15 Gold ODER Kämpfer in Stadt = kein Überfall | Kämpfer nicht auf Expedition schicken |
| **Dürre** | Negativ | Alle Farmen -50% für 120s | Brot-Vorrat prüfen, andere Produktion priorisieren |
| **Seuche** | Negativ | 3 zufällige Arbeiter für 60s nicht verfügbar | Produktionsketten umstellen |
| **Händler** | Positiv | Bietet 3 seltene Items für Gold (60s Timer) | Kaufen oder ignorieren |
| **Erntesegen** | Positiv | Alle Farmen ×2 für 120s | Mühle/Bäckerei vorbereiten |
| **Wandernder Meister** | Positiv (selten) | Bietet sich als Spezialist an (kostet 30 Gold, 30s Timer) | Kaufen oder ablehnen |

**Häufigkeit:** Alle 3-4 Spieltage, max 1 gleichzeitig aktiv.

---

## 26) Expeditions-Tagebuch & Stadtchronik

### 26.1 Expeditions-Tagebuch

Nach jeder Expedition erscheint ein automatisch generierter **Tagebucheintrag** mit den Highlights des Runs:

**Template-System:**
```
"[NAME] führte die [PARTYGRÖSSE]-köpfige Gruppe in [DUNGEON_NAME].
Im [N]ten Raum [ENCOUNTER_EVENT].
[OPTIONALER_EXTRA_SATZ_BEI_BESONDEREN_MOMENTEN]
Am Ende [ERGEBNIS]."
```

**Beispiele:**
> *"Aldric der Tapfere führte die 3-köpfige Gruppe in die Waldruinen. Im 6. Raum fanden sie einen verletzten Überlebenden der sich der Gilde anschloss. Beim Finale besiegten sie den Ältesten Baum – aber Mira wurde schwer verletzt."*

> *"Das vorsichtige Duo Kael und Elara erkundete den Waldpfad ohne Verluste. Sie fanden 3 Eisenschrott und 12 Gold."*

**Besondere Einträge bei:**
- Ersten Boss-Kill einer Art
- Kämpfer stirbt/fällt
- Trait "Zäh" löst aus
- Party-Skill "Desperate Resolve" wendete die Niederlage ab
- Komplettes Dungeon ohne Verluste

Das Tagebuch ist einsehbar im Gildenhaus-UI unter dem "Historie"-Tab. Die letzten 10 Einträge werden gespeichert.

### 26.2 Stadtchronik

Permanentes Log besonderer Stadtmomente (im Gildenhaus, "Chronik"-Tab):

**Automatisch eingetragene Ereignisse:**
- Erste Produktion jeder Ressource ("Das erste Brot wurde gebacken – Tag 3")
- Erster Kämpfer trainiert
- Erster Boss besiegt (mit Kämpfer-Namen)
- Jeder Gilden-Rang-Aufstieg
- Erster kritischer Treffer (Krit des Runs)
- Drachentöter-Titel
- Seltene Trait-Momente

**Format:**
```
Tag 3: Das erste Brot wurde gebacken.
Tag 7: Aldric der Tapfere besiegte den Elder Treant.
Tag 12: Die Gilde stieg zu Rang II auf – Abenteurer.
```

---

## 27) Spielspaß-Verbesserungen (Visual & UX)

### 27.1 Synergy-Glow zwischen Gebäuden

Die 3 bestehenden Gebäudesynergien (Bäckerei→Schmiede, Kräutergarten↔Farm, Eisenmine→Schmiede) sind nicht entdeckbar. Lösung:

**Visuelle Anzeige:**
- Wenn zwei synergistische Gebäude in Reichweite sind: sanft pulsierende Linie zwischen ihnen
- **Grün + pulsierend:** Synergie aktiv (beide verbunden + in Reichweite)
- **Gelb + schwach:** Synergie möglich aber noch nicht aktiv (nicht verbunden oder außer Reichweite)
- **Toggle:** Spieler kann Synergy-Overlays ein/ausschalten (Hotkey: `S`)

**Design-Referenz:** Ähnlich wie Civilization VI Adjacency-Bonus-Anzeige

### 27.2 Schatz-Raum als neuer Encounter-Typ

Neuer Encounter-Typ `vault` (Schatzkammer) mit **3-5% Chance** pro Raum:

- Raum enthält garantiert 1 seltenes Item (T2 oder höher)
- ABER gesichert durch eine Wahl:
  - **Option A:** "Mit Vorsicht öffnen" → garantiertes Item, kein Risiko, 15s Verzögerung
  - **Option B:** "Schnell durchbrechen" → Item + 20% Bonus-Loot, aber 40% Chance auf Fallen-Schaden (-10 HP alle)
  - **Option C:** "Weitergehen" → Raum überspringen

### 27.3 Kämpfer-Ruhestands-System (Post-MVP)

**Level 10+ Kämpfer** können in Rente geschickt werden:

| Kämpfer-Klasse | Ruhestands-Bonus | Gebäude |
|---------------|-----------------|---------|
| Wächter | +25% Smithy-Produktion | Schmiede |
| Ranger | +30% Kräutergarten-Output | Kräutergarten |
| Kleriker | Verletzte erholen sich 40% schneller | Gildenhaus |
| Berserker | +20% Eisenmine-Output | Eisenmine |
| Druide | +20% Farm-Output | Farm |
| Barde | +5 Zufriedenheit für alle Häuser im Radius 6 | – (stadtweiter Bonus) |

**Einschränkung:** Max 1 Rentner pro Gebäude. Rentner kann nicht mehr kämpfen.

**Entscheidungs-Spannung:** Kämpfer für Expeditionen behalten (stärker, sicherer) oder für Stadtbonus opfern?

### 27.4 Atmosphärische Stadtanimationen

Reine Kosmetik die das Spielgefühl massiv verbessert:
- Bürger-Figuren die sich auf Straßen von Haus zu Gebäude bewegen
- Rauch aus aktiven Bäckerei/Schmiede-Schornsteinen
- Mühlenflügel drehen sich wenn aktiv
- Wasser-Glitzern am Brunnen
- Fackellichter an Gebäuden bei niedrigem Zufriedenheits-Level (dunkler, trauriger)

**Implementierungs-Hinweis:** Alle als Phaser-Tweens oder einfache Frame-Animationen. Keine Performance-Auswirkung bei < 20 animierten Objekten.

### 27.5 Provisions-Crafting im Lager-Camp

Vor dem Expedition-Start gibt es einen **"Vorbereitungs-Screen"** (nach Party-Auswahl, vor Route-Bestätigung):

**Crafting-Rezepte (Camp-Ebene):**
| Rezept | Input | Output | Besonderheit |
|--------|-------|--------|-------------|
| Verstärkte Ration | 2× Brot + 1× Heilkraut | Kraft-Ration (+3 ATK für 5 Räume statt 3) | Besser als normales Power-Brot |
| Heilmittel | 2× Heilkraut + 1× Wasser | Starkes Heilmittel (heilt 20 HP statt 15) | Effizienter als Standard-Trank |
| Fallen-Kit | 2× Eisenschrott | Fallen-Kit (neutralisiert Hazard-Räume) | Seltener Slot-Effekt |
| Elementar-Elixier | 1× Element-Material + 1× Heilkraut | Einzel-Resistenz-Trank (3 Räume, 1 Kämpfer) | Günstige Alternative zu Resistenz-Item |

**Design-Grund:** Verbindet Stadtproduktion noch stärker mit Expedition-Vorbereitung.

---

## 28) Fraktions-Ruf-System (Post-MVP)

> **Zweck:** Langzeitmotivation durch differenzierte Spielstile. Ruf entsteht organisch durch normale Spielweise.

### 28.1 Drei Fraktionen

**Waldwächter (Waldrouten-Fokus):**
- Ruf steigt durch: Waldrouten-Expeditionen, Kräutergarten-Produktion, Heilkraut-Drops
- Stufe 1: Waldrouten geben +10% Heilkraut-Drops
- Stufe 2: Waldwächter-Händler erscheint öfter (5% Chance pro Waldraum)
- Stufe 3: Exklusives Rezept freigeschaltet (Waldwächter-Bogen: +5 ATK, Ranger only)
- Stufe 4: Waldrouten-Feinde haben -15% ATK (sie respektieren die Gilde)
- Stufe 5: Spezialist-Geschenk (Waldwächter-Meister: +20% Kräutergarten)

**Bergbauergilde (Höhlen/Minen-Fokus):**
- Ruf steigt durch: Höhlenrouten, Eisenmine-Produktion, Stein/Erz-Mengen
- Stufe 1: Schmiede-Rezepte kosten -10% Material
- Stufe 2: Eisenmine produziert gelegentlich Quarzsplitter (Bonus)
- Stufe 3: Exklusives Rezept (Bergbauer-Hammer: +3 ATK, alle Klassen)
- Stufe 4: Höhlenrouten geben +15% Gold-Loot
- Stufe 5: Spezialist-Geschenk (Bergmeister: +25% Eisenmine)

**Händlerliga (Gold/Wirtschafts-Fokus):**
- Ruf steigt durch: Gold ausgeben, Händler-Encounters, Stadtproduktion-Menge
- Stufe 1: Händler-Encounters bieten 1 zusätzliches Item
- Stufe 2: Stadtevents "Händler" erscheinen öfter (+30%)
- Stufe 3: Marktplatz freigeschaltet (täglich 3 Items kaufen/verkaufen)
- Stufe 4: Alle Rezepte kosten -1 Gold (minimum 0)
- Stufe 5: Spezialist-Geschenk (Handelsmeister: +30% Steuereinnahmen)

### 28.2 Ruf-Tracking

```json
{
  "factionRep": {
    "waldwachter": 0,
    "bergbauergilde": 0,
    "haendlerliga": 0
  }
}
```

Jede Fraktion hat 5 Stufen (0-100 Punkte, 20 Punkte pro Stufe). Im Gildenhaus unter "Fraktionen"-Tab einsehbar.

---

## 29) NPC-Befreiungs-System

> **Kernidee:** Ab T3-Dungeons können gefangene NPCs befreit werden. Jeder NPC schaltet ein neues Stadtgebäude oder System frei. Das schafft entdeckungsbasierte Stadtentwicklung statt reiner Rang-Progression.

### 29.1 Encounter-Typ `rescue`

- Ab T3-Dungeons: neuer Encounter-Typ `rescue` (5-8% Chance pro Raum)
- Raum zeigt einen gefangenen NPC (Käfig, Kette, magische Fesselung)
- Spieler-Wahl: **Befreien** (kostenlos, kein Kampf) oder **Ignorieren**
- Befreiter NPC erscheint nach Run-Ende in der Stadt und wartet auf Zuweisung im Gildenhaus
- Sobald ein Gebäude zugewiesen: NPC ist "aktiv", Gebäude wird freigeschaltet

**Datenmodell-Ergänzung:**
```json
{
  "rescuedNPCs": [
    { "id": "npc_engineer_01", "type": "ENGINEER", "name": "Tomas der Baumeister", "status": "waiting" }
  ]
}
```

### 29.2 Alle NPC-Typen & ihre Freischaltungen

**Ingenieur** *(T3-Dungeons, Festungs-Biome)*
- Schaltet frei: **Belagerungswerkstatt**
- Produziert: Katapult, Rammbock, Belagerungsleiter, Balliste
- Materialien: Holz + Stein + Eisenschrott
- Ohne ihn: keine Belagerungswaffen craftbar, Festungs-Dungeons nicht vollständig bezwingbar

**Arkanist** *(T3-Dungeons, Bibliothek/Magiethemen)*
- Schaltet frei: **Akademie**
- In der Akademie: neue Zauber für Klassen erforschen (Zeit + Ressourcen)
- Jede Klasse kann 2 Zusatz-Zauber lernen (auf bestehenden aktiven Skill aufbauend)
- Beispiele: Kleriker lernt "Schutzsegen" (1 Runde Schadensimmunität), Ranger lernt "Pfeilregen" (halber Schaden alle Gegner)

**Alchemist** *(T2-Dungeons, Sumpf/Keller-Biome)*
- Schaltet frei: **Alchemie-Labor**
- Produziert: verbesserte Tränke, Elementar-Elixiere (Resistenz für 1 Run), seltene Buffs
- Camp-Crafting-Rezepte (Abschnitt 27.5) werden mit Labor deutlich stärker

**Runenmeister** *(T3-Dungeons, Ruinen/Bibliothek-Biome)*
- Schaltet frei: **Runen-Werkstatt**
- Verzaubert bestehende Gear-Items mit Runen-Effekten
- Beispiel: Eisenschwert + Feuer-Rune → +3 Feuerschaden (ignoriert DEF)
- Jedes Item kann nur 1 Rune tragen, Runen sind beim Craften verbrauchbar

**Tierbändiger** *(T2-Waldrouten, selten)*
- Schaltet frei: **Tiergatter**
- Tiere aus Dungeons können gebändigt werden (neuer `tame`-Encounter-Typ, 3% Chance)
- Tiere im Gatter geben passive Stadtboni: Wolf = +5% Kampfstärke, Bär = +10 Zufriedenheit
- Alternativ: Tier kann als 4. passiver Begleiter auf Expedition mitgenommen werden (kein aktiver Slot)

**Kartograph** *(T2-Dungeons)*
- Schaltet frei: **Kartenraum** (Gebäude)
- Nach Kartierung einer Route: nächster Run zeigt Encounter-Typ der nächsten 3 Räume vorab
- Reduziert Unsicherheit, besonders wertvoll für schwierige Dungeons mit Pflicht-Items

**Schamane** *(T3-Sumpf/Fluch-Routen)*
- Schaltet frei: **Ritual-Kreis** (Gebäude)
- Produziert: Schutzsteine (Pflicht-Item für Verfluchte Katakomben und Uralte Gruft)
- Ohne Schutzsteine in Fluch-Dungeons: alle Kämpfer starten mit -20 max HP

**Heiler / Arzt** *(T1/T2-Dungeons, relativ früh findbar)*
- Schaltet frei: **Hospital** (Gebäude)
- Verletzte Kämpfer erholen sich 2× schneller (statt 120s → 60s)
- Behandelt "permanente Verletzungen" (Post-MVP: manche Boss-Treffer hinterlassen permanente Stat-Mali)

**Meisterschmied** *(T4-Dungeons, sehr selten)*
- Schaltet frei: **Schmiede T3**
- Produziert: Mythril-Rüstung (Pflicht-Item für Drachenhort Phase 2)
- Rezepte für alle T3-Gear-Items freigeschalten

### 29.3 NPC-Befreiungs-UI

Im Gildenhaus: neuer Tab "Gefährten" zeigt alle befreiten NPCs mit Status:
- **Wartend:** NPC ist angekommen, wartet auf Gebäude-Zuweisung
- **Aktiv:** NPC arbeitet im zugewiesenen Gebäude
- **Portrait + Name + kurze Hintergrundgeschichte** pro NPC (Flavour-Text, 1-2 Sätze)

**Moment of Delight beim Freischalten:**
Wenn das erste Gebäude durch einen NPC freigeschaltet wird: goldenes Banner "Neues Gebäude entdeckt: Akademie!" + Fanfare

---

## 30) Belagerungswaffen-System

> **Zweck:** Neue Expedition-Ausrüstungs-Kategorie die Festungs-Dungeons ermöglicht und dem Kampf eine strategische Vor-Kampf-Ebene gibt.

### 30.1 Neuer Loadout-Slot: Kriegsausrüstung

Jede Expedition hat einen zusätzlichen Slot **"Kriegsausrüstung"** (1 Slot, nach Party-Auswahl, vor Proviant):

- Nur 1 Waffe pro Expedition mitnehmbar
- Kriegsausrüstung wird in der **Belagerungswerkstatt** gecraftet (freigeschaltet durch Ingenieur-NPC)
- Nicht verbrauchbar (kehrt nach Expedition zurück), außer bei Niederlage

### 30.2 Alle Belagerungswaffen

| Waffe | Effekt | Speziell benötigt für | Crafting-Material |
|-------|--------|----------------------|-------------------|
| **Rammbock** | Öffnet "Verstärkte Tore" die sonst Fortschritt blockieren | Banditenfestung, Orkfestung (Tor 1) | 3× Holz + 2× Eisenschrott |
| **Katapult** | Vor jedem Kampf: -8 HP auf alle Gegner (AoE). Kostet -1 Proviant-Slot | Orkfestung (Tor 2), Mauerverteidiger neutralisieren | 4× Holz + 3× Stein + 2× Eisenschrott |
| **Belagerungsleiter** | Öffnet "Hohe Mauern"-Räume (optionale Bonus-Loot-Räume) | Optional, kein Pflicht-Item | 3× Holz + 1× Seil (neues Material) |
| **Balliste** | Einmalig pro Run: tötet 1 Gegner sofort vor dem Kampf (auch Elite-Gegner) | Optional, sehr wertvoll | 2× Holz + 3× Eisenschrott + 1× Seil |

**Seil** (neues Material): crafted in Lumber Camp (2× Holz → 1× Seil, 20s)

### 30.3 Festungs-Mechaniken

**Verstärkte Tore:**
Ein Raum zeigt ein massives Tor mit HP-Balken.
- Ohne Rammbock: "Fortschritt blockiert – Rückzug oder Umweg möglich" (Run geht weiter aber Boss unerreichbar)
- Mit Rammbock: Tor wird eingerissen → Raum dahinter = garantiert seltenes Loot + Bonus-Encounter
- Tor-Einreißen kostet alle Kämpfer -10 HP (Gegenwehr der Verteidiger von der Mauer)

**Mauerverteidiger:**
In Festungs-Dungeons: Bogenschützen auf Türmen schießen bei jedem Raum-Betreten -3 HP auf alle.
- Ohne Katapult: Dauerschaden über den ganzen Dungeon
- Mit Katapult: Türme werden im ersten Einsatz zerstört (einmalig), danach kein Dauerschaden mehr

**Hohe Mauern (optional):**
Manche Räume haben eine verschlossene Tür mit "Hohe Mauern"-Symbol.
- Ohne Belagerungsleiter: Tür bleibt zu
- Mit Belagerungsleiter: Bonusraum zugänglich (garantiert T2-Item + Gold)

---

## 31) Neue Dungeons mit Item-Anforderungen (vollständige Liste)

> **Design-Prinzip:** Jeder Dungeon hat eine klare Vorbereitung. Spieler sehen im Dungeon-Auswahl-Screen was sie brauchen bevor sie starten. Rote Anforderung = harte Sperre oder starker Penalty. Gelbe Empfehlung = schwerer ohne, aber machbar.

### 31.1 Dungeon-Anforderungs-UI

Im Dungeon-Auswahl-Screen zeigt jede Route eine Anforderungsliste:

```
Banditenfestung
⚠️ Empfohlen:  Rammbock
ℹ️ Ohne Rammbock: Boss nicht erreichbar (Tor blockiert)

Verfluchte Katakomben
🔴 Benötigt:   Schutzstein
⚠️ Empfohlen:  Heiliges Siegel
ℹ️ Ohne Schutzstein: alle Kämpfer starten mit -20 max HP

Ruinen der Alten Götter
🔴 Benötigt:   Schutzstein + Arkaner Schlüssel
⚠️ Empfohlen:  T2 Resistenz-Item + Balliste
```

### 31.2 Alle 15 Dungeons – Vollständige Übersicht

**TIER 1 (Guild Rang I–II):**

| Dungeon | Räume | Boss | Pflicht-Item | Empfohlen |
|---------|-------|------|-------------|----------|
| Waldpfad | 6 | – | – | – |
| Waldruinen | 10 | Elder Treant | – | – |
| Tiefe Höhle | 8 | Kristall-Golem | – | – |

**TIER 2 (Guild Rang III):**

| Dungeon | Räume | Boss | Pflicht-Item | Empfohlen |
|---------|-------|------|-------------|----------|
| Verfluchtes Sumpfgebiet | 12 | Sumpf-Hydra | – | Antidot-Amulett |
| Verfallene Ruinen | 12 | Gefallener Ritter | – | Heiliges Siegel |
| **Banditenfestung** *(neu)* | 10 | Banditenfürst | – | Rammbock (Boss sonst nicht erreichbar) |

**TIER 3 (Guild Rang IV):**

| Dungeon | Räume | Boss | Pflicht-Item | Empfohlen |
|---------|-------|------|-------------|----------|
| Spinnennest | 14 | Spinnenkönigin | – | Blutungs-Resistenz |
| Vulkankern | 16 | Magma-Wyrm | – | Flammenward |
| Verfluchte Bibliothek | 14 | Archiv-Wächter | – | Arkaner Schlüssel (40% Räume sonst gesperrt) |
| **Magierturm** *(neu)* | 14 | Erzmagier | – | Arkaner Schlüssel (60% Räume sonst gesperrt) |
| **Verfluchte Katakomben** *(neu)* | 16 | Fluchmeister | Schutzstein (sonst -20 max HP) | Heiliges Siegel |
| **Giftmoor** *(neu, T3-Version Sumpf)* | 14 | Giftfürst | – | Universales Antidot (normales reicht nicht) |
| **Orkfestung** *(neu)* | 18 | Orkwarlord | Rammbock + Katapult (beide Tore) | Hohe-DEF-Gear |

**TIER 4 (Guild Rang V):**

| Dungeon | Räume | Boss | Pflicht-Item | Empfohlen |
|---------|-------|------|-------------|----------|
| Schattenreich | 18 | Shadow Lich + Void Walker | – | Schattenschleier |
| **Uralte Gruft** *(neu)* | 20 | Lich-König (3 Phasen) | Schutzstein + Heiliges Siegel | Balliste |
| **Ruinen der Alten Götter** *(neu)* | 22 | Avatar des Alten Gottes | Schutzstein + Arkaner Schlüssel | Balliste + T2-Resistenz |
| Drachenhort | 20 | Uralter Drache (3 Phasen) | Mythril-Rüstung (sonst Phase 2 instant-kill) | Flammenward T2 |
| Grandmaster-Prüfung | 25 | 3 sequenzielle Bosse | – | Alle Resistenz-Items |

### 31.3 Neue Bosse (vollständige Liste)

**Tier 2 – Neu:**
- **Banditenfürst** (Banditenfestung): Ruft Verstärkung wenn unter 50% HP, hat Stunn-Angriff, droppt Banditen-Gear

**Tier 3 – Neu:**
- **Erzmagier** (Magierturm): Spiegel-Illusionen von sich, nur echter Erzmagier nimmt vollen Schaden. Ranger "Gezielter Schuss" ignoriert Illusion
- **Fluchmeister** (Katakomben): Kann Kämpfer permanent verfluchen (-5 ATK bis Run-Ende). Heiliges Siegel blockiert diesen Effekt
- **Giftfürst** (Giftmoor): 4 Köpfe mit je eigener Fähigkeit, regeneriert HP wenn nicht alle Köpfe gleichzeitig angegriffen werden
- **Orkwarlord** (Orkfestung): Enormes HP-Pool, ruft Verstärkung, enragt bei 30% HP, hat Erderschütterung (betäubt alle)

**Tier 4 – Neu:**
- **Lich-König** (Uralte Gruft): 3 Phasen, Phase 3 beschwört Skelett-Armee, droppt einzigartiges Legendary-Item
- **Avatar des Alten Gottes** (Ruinen): Passt Fähigkeiten an Party-Komposition an, nutzt Klassen-Schwächen aus

### 31.4 Huhn-und-Ei-Lösung für Pflicht-Materialien

Materialien für Dungeons dürfen nicht nur in den Dungeons droppen für die man sie braucht:

| Material | Primäre Quelle | Alternative Quelle (kein Deadlock) |
|----------|---------------|-------------------------------------|
| Schutzstein | Ritual-Kreis (Stadt) | – (deshalb NPC Schamane finden bevor T3) |
| Arkaner Schlüssel | Akademie (Stadt) | Händler-Encounter (selten kaufbar) |
| Rammbock | Belagerungswerkstatt | – (Ingenieur-NPC in T3 finden) |
| Mythril-Rüstung | Schmiede T3 | – (Meisterschmied-NPC in T4 finden) |
| Sturmfeder | Sturmfestung-Drop | Auch: Bandit-Raider (Waldrouten) Drop |
| Schattenfragment | Schattenreich-Drop | Auch: Hollow Shade / Shadow Bat Drop (T1!) |
| Arkankristall | Bibliothek-Drop | Auch: Cursed Wisp Drop (T1!) |

---

## 32) Finaler Kohärenz-Check & Gesamtzusammenfassung

### 32.1 Gesamtbild – Spielfluss nach allen Änderungen

**Früh-Spiel (Rang I–II, ~0–45 Min):**
1. Tutorial führt durch Stadtaufbau und erste Expedition
2. Benannte Kämpfer mit Traits schaffen sofort emotionale Bindung
3. Synergy-Glow zwischen Gebäuden hilft beim Layout
4. Planungsphase im Kampf mit 3 einfachen Klassen – aktiv aber nicht stressig
5. Saisonwechsel kündigt sich an, kein Stress
6. Erste Expeditionen bringen einfache Materialien, kein Pflicht-Item nötig

**Mittel-Spiel (Rang III–IV, ~1–8 Std):**
1. T2-Dungeons: erste Elementar-Effekte → Resistenz-Items craften
2. Erster NPC befreit → neues Gebäude freigeschaltet (Entdeckungsmoment)
3. Banditenfestung: erste Begegnung mit Belagerungswaffe → Ingenieur-NPC gesucht
4. Gildenbrett gibt klare Richtung, keine Orientierungslosigkeit
5. Post-MVP-Klassen freischalten, neue Fähigkeiten im Kampf
6. Fraktions-Ruf wächst organisch je nach Spielstil
7. Schamane befreien → Ritual-Kreis → Katakomben betretbar

**End-Spiel (Rang V, ~8–30+ Std):**
1. T4-Dungeons: mehrere Pflicht-Items nötig, echte Vorbereitung pro Run
2. Kämpfer-Ruhestand: strategische Langzeit-Entscheidungen
3. Mythril-Rüstung craften (Meisterschmied-NPC finden)
4. Drachenhort: einmaliger Endgame-Moment mit 3-Phasen-Boss
5. Stadtchronik erzählt die eigene Geschichte

### 32.2 Core Loop – Finale Version

```
Stadt produziert Ressourcen
        ↓
Expedition erkundet Dungeon
        ↓
NPC befreit → neues Stadtgebäude freigeschaltet
        ↓
Neues Gebäude craftet Pflicht-Item
        ↓
Pflicht-Item ermöglicht neuen Dungeon
        ↓
Neuer Dungeon bringt bessere Materialien
        ↓
Bessere Materialien → stärkere Kämpfer → höherer Rang
        ↓ (zurück zum Anfang, auf höherem Level)
```

### 32.3 Balance-Überprüfung aller kritischen Systeme

**Gold-Economy:**
- Gear-Wartung (5 Gold/Item) + Training (15 Gold) eng im Frühspiel
- Fix: Erstes Gear-Item wartungsfrei (Tutorial-Entlastung)
- Gildenbrett-Missionen liefern zuverlässige Extra-Gold-Quellen

**NPC-Progression:**
- Schamane ist ab T2 findbar (wichtig für T3-Katakomben-Zugang)
- Ingenieur ab T3 (bevor Festungs-Dungeons relevanter werden)
- Meisterschmied erst T4 (Mythril-Rüstung nur für Drachenhort nötig)
- Kein NPC ist zwingend – Dungeons ohne Pflicht-Item bleiben spielbar, nur weniger lohnend

**Huhn-und-Ei:**
- Alle Pflicht-Materialien haben alternative Bezugsquellen (Händler, frühe Gegner-Drops)
- Kein Deadlock möglich wenn Spieler normal voranschreitet

**Belagerungswaffen:**
- Rammbock/Katapult aus Belagerungswerkstatt → Ingenieur-NPC nötig
- Ohne Ingenieur: Festungs-Dungeons teilweise spielbar, Boss manchmal nicht erreichbar
- Das ist gewollt: Exploration (NPC finden) wird mit neuem Content belohnt

**Dungeon-Pflicht-Items:**
- Kein Dungeon hat mehr als 2 Pflicht-Items gleichzeitig
- Immer klar im UI kommuniziert bevor der Spieler startet
- Partial-Run immer möglich (in Dungeon gehen, Pflicht-Item fehlt → zurückziehen, kein Loot-Verlust)

### 32.4 Spielspaß-Steigerung gegenüber originalem Design

| System | Original | Mit allen Änderungen |
|--------|----------|---------------------|
| Kämpfer | Klassen ohne Identität | Benannte Kämpfer mit Traits + Geschichte |
| Kampf | Reine Zuschauererfahrung | Planungsphase + aktive Skills + Reaktionskarten |
| Dungeons | 3 Routen (MVP), 8 Post-MVP | 15 Dungeons mit einzigartigen Mechaniken |
| Vorbereitung | Gear + Proviant | Gear + Proviant + Resistenz-Items + Belagerungswaffen |
| Stadtentwicklung | Rang-basierte Unlocks | Rang + NPC-Befreiung = Entdeckungsbasiert |
| Langzeitmotivation | Rang V erreichen | Rang V + alle NPCs finden + Drachenhort + Chronik |
| Emotionale Bindung | Gering | Hoch (Tagebuch, Chronik, Traits, Benannte Kämpfer) |

### 32.5 Vollständige Sprite-Anforderungen (alle Systeme)

**Neue Gebäude (durch NPC-System):**
- `BUILDING_BELAGERUNGSWERKSTATT`, `BUILDING_AKADEMIE`, `BUILDING_ALCHEMIELABOR`
- `BUILDING_RUNENWERKSTATT`, `BUILDING_TIERGATTER`, `BUILDING_KARTENRAUM`
- `BUILDING_RITUALKREIS`, `BUILDING_HOSPITAL`, `BUILDING_SCHMIEDE_T3`

**Neue NPC-Portraits (16×16 oder 32×32):**
- `NPC_ENGINEER`, `NPC_ARCANIST`, `NPC_ALCHEMIST`, `NPC_RUNESMITH`
- `NPC_BEASTMASTER`, `NPC_CARTOGRAPHER`, `NPC_SHAMAN`, `NPC_HEALER`, `NPC_MASTERSMITH`

**Neue Belagerungswaffen (16×16 Icons):**
- `ITEM_RAMBOCK`, `ITEM_KATAPULT`, `ITEM_BELAGERUNGSLEITER`, `ITEM_BALLISTE`

**Neue Dungeon-Gegner:**
- `ENEMY_SKELETON_WARRIOR`, `ENEMY_CURSED_KNIGHT`, `ENEMY_TOMB_WRAITH` (Ruinen/Katakomben)
- `ENEMY_GIANT_SPIDER`, `ENEMY_EGG_SAC_GUARDIAN` (Spinnennest)
- `ENEMY_LAVA_GOLEM`, `ENEMY_FIRE_ELEMENTAL` (Vulkankern)
- `ENEMY_STORM_ELEMENTAL`, `ENEMY_THUNDER_HAWK` (Sturmfestung)
- `ENEMY_ARCANE_CONSTRUCT`, `ENEMY_SPELL_WEAVER` (Bibliothek/Magierturm)
- `ENEMY_VOID_WRAITH`, `ENEMY_SHADOW_CLONE` (Schattenreich)
- `ENEMY_BANDIT_GUARD`, `ENEMY_ORC_WARRIOR`, `ENEMY_ORC_SHAMAN` (Festungs-Dungeons)
- `ENEMY_ANCIENT_SKELETON`, `ENEMY_LICH_MINION` (Uralte Gruft)

**Neue Bosse:**
- `BOSS_BANDIT_LORD`, `BOSS_FROST_QUEEN`, `BOSS_FIRE_GIANT`
- `BOSS_STORM_WARDEN`, `BOSS_ARCHIVE_GUARDIAN`, `BOSS_VOID_WALKER`
- `BOSS_POISON_LORD`, `BOSS_ORC_WARLORD`, `BOSS_LICH_KING`
- `BOSS_CURSE_MASTER`, `BOSS_ARCHMAGE`, `BOSS_OLD_GOD_AVATAR`
- `BOSS_ANCIENT_DRAGON` (64×64, Phasen 1–3 je eigene Variante)

**Neue Klassen-Sprites (Post-MVP):**
- `HERO_BERSERKER`, `HERO_ASSASSIN`, `HERO_PALADIN`, `HERO_BARD`
- `HERO_WITCH`, `HERO_NECROMANCER`, `HERO_DRUID`

**Neue Items & Materialien (16×16):**
- Alle 12 Resistenz-Items
- 10 neue Materialien (Frostkristall, Magmasplitter, Sturmfeder, Schattenfragment, Arkankristall, Knochen-Fragment, Quarzsplitter, Quecksilber, Heiliges Wasser, Edelstein, Seil)
- 4 Belagerungswaffen-Icons

**Hinweis:** Alle Sprites werden via `generateSprites.ts` und Google AI API automatisch generiert. Kein manueller Aufwand – nur Prompt-Beschreibungen pro Sprite + Script einmal ausführen.

---

*Ende von Teil 5 – Magic City GDD v2.0*
*Abschnitte 19–32 · Erstellt im Rahmen des finalen Design-Reviews*
*Alle Systeme sind theoretisch vollständig spezifiziert und kohärent geprüft.*
*Bereit für die Implementierungsphase ab dem nächsten Tag.*
