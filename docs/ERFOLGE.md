# Erfolge

Daten: `src/data/achievements.ts`. Prüfung: `src/systems/AchievementSystem.ts`.
Bildschirm: `src/ui/screens/AchievementsScreen.ts`, erreichbar über den Knopf «🏆» in der Kopfzeile
(oder Taste A). Die Zahl am Knopf zeigt die Erfolge seit dem letzten Öffnen des Bildschirms
(`statistics.erfolge_gesehen`).

## Wann geprüft wird

- nach jeder Expedition (`ExpeditionFinalizer.ts`, Meldung in der Bilanz)
- bei jedem Tageswechsel (`EconomySystem.dayTick`, Hinweis in der Kopfzeile)
- vor dem Zeichnen des Erfolge-Bildschirms

Was niemand von selbst zählt, schreibt `kennzahlenAktualisieren(state)` vor jeder Prüfung beim
Tageswechsel und am Bildschirm in `state.statistics` (jeweils der höchste je erreichte Wert):
`stadtstufe`, `helden_anzahl`, `helden_mit_weg`, `helden_meister`, `ganze_sets`,
`monsterbuch_entdeckt`, `gildenrang`, `hoechste_wohnstufe`, `gebaeude_auf_hoechststufe`.
Die Prüfung nach einer Expedition sieht diese Werte vom letzten Tageswechsel.

## Liste

Neue Erfolge ab Oktober 2026 sind mit «neu» markiert. Die IDs der alten Erfolge stehen in
alten Spielständen (`state.achievements`) und dürfen sich nicht ändern.

| Gruppe | Zeichen | Name | Bedingung | Zähler | ID |
|---|---|---|---|---|---|
| Stadt | 🏗️ | Grundsteinlegung | 1 Gebäude gebaut | `total_buildings_built` ≥ 1 | `first_building` |
| Stadt | 🏛️ | Baumeister | 20 Mal gebaut (Neubauten und Ausbauten) | `total_buildings_built` ≥ 20 | `mass_builder` |
| Stadt | 🔨 | Ausbauer (neu) | 10 Ausbauten | `total_upgrades` ≥ 10 | `ausbau_10` |
| Stadt | 🏰 | Ganz oben (neu) | ein Gebäude auf seiner Höchststufe | `gebaeude_auf_hoechststufe` ≥ 1 | `gebaeude_max` |
| Stadt | 🏘️ | Volles Viertel (neu) | Wohnviertel auf Stufe 6 | `hoechste_wohnstufe` ≥ 6 | `wohnviertel_6` |
| Stadt | 👶 | Wachsende Stadt (neu) | 50 neue Bewohner | `total_citizens_born` ≥ 50 | `bewohner_50` |
| Stadt | 🛖 | Dorf (neu) | Stadtstufe 3 «Dorf» | `stadtstufe` ≥ 3 | `stadtstufe_3` |
| Stadt | 🏙️ | Stadtrecht (neu) | Stadtstufe 5 «Stadt» | `stadtstufe` ≥ 5 | `stadtstufe_5` |
| Stadt | ✨ | Magische Stadt (neu) | Stadtstufe 7 «Magische Stadt» | `stadtstufe` ≥ 7 | `stadtstufe_7` |
| Stadt | ⭐ | Überlebenskünstler | 100 Tage | `total_days_survived` ≥ 100 | `survivor_100` |
| Gilde | 🎖️ | Veteranengilde (neu) | Gildenrang III | `gildenrang` ≥ 3 | `gildenrang_3` |
| Gilde | 👑 | Gildenmeister (neu) | Gildenrang V, Titel Gildenmeister | `gildenrang` ≥ 5 | `gildenrang_5` |
| Helden | 🛡️ | Armeeführer | 10 Helden in der Gilde | `helden_anzahl` ≥ 10 | `army_builder` |
| Helden | 🧭 | Wegbereiter (neu) | ein Held hat seinen Weg gewählt (ab Stufe 10) | `helden_mit_weg` ≥ 1 | `erster_weg` |
| Helden | 🥋 | Meister seines Wegs (neu) | ein Held ist Meister (Stufe 15) | `helden_meister` ≥ 1 | `erster_meister` |
| Dungeons | 🗺️ | Abenteuerlust | 1 Expedition gestartet | `total_expeditions` ≥ 1 | `first_expedition` |
| Dungeons | 🏆 | Siegreich | 1 Expedition gewonnen | `total_victories` ≥ 1 | `first_victory` |
| Dungeons | ⚔️ | Veteran | 10 Expeditionen beendet (Sieg, Niederlage oder Rückzug) | `total_victories` + `total_defeats` + `total_retreats` ≥ 10 | `veteran_explorer` |
| Dungeons | 💎 | Perfektionist | ein Sieg, ohne dass ein Held fällt | `total_flawless_victories` ≥ 1 | `perfectionist` |
| Dungeons | 💀 | Bossbekämpfer | 1 Boss besiegt | `total_bosses_killed` ≥ 1 | `first_boss` |
| Dungeons | 🔥 | Bosskiller | 5 Bosse besiegt | `total_bosses_killed` ≥ 5 | `boss_slayer` |
| Dungeons | 🐉 | Bossjäger (neu) | 10 Bosse besiegt | `total_bosses_killed` ≥ 10 | `bosse_10` |
| Dungeons | ☠️ | Schrecken der Tiefe (neu) | 25 Bosse besiegt | `total_bosses_killed` ≥ 25 | `bosse_25` |
| Dungeons | 💰 | Goldhamster | 500 Gold auf Expeditionen erbeutet | `total_gold_earned` ≥ 500 | `gold_hoarder` |
| Dungeons | 💠 | Hundertfacher Tod | 100 Gegner besiegt | `total_enemies_killed` ≥ 100 | `kill_100` |
| Dungeons | 🗡️ | Tausendfacher Tod (neu) | 1000 Gegner besiegt | `total_enemies_killed` ≥ 1000 | `kill_1000` |
| Sammeln | 🧩 | Komplett (neu) | ein Held trägt ein ganzes Dungeon-Set (3 Teile) | `ganze_sets` ≥ 1 | `ganzes_set` |
| Sammeln | 🎒 | Sammler (neu) | Helden tragen 3 verschiedene ganze Sets | `ganze_sets` ≥ 3 | `ganze_sets_3` |
| Sammeln | 📖 | Monsterkundler (neu) | 25 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 25 | `monsterbuch_25` |
| Sammeln | 📚 | Monstergelehrter (neu) | 50 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 50 | `monsterbuch_50` |

## Geändert gegenüber früher

- **Überlebenskünstler** war nie erreichbar: niemand zählte `total_days_survived`. Jetzt zählt der Tageswechsel.
- **Armeeführer** zählte nur ausgebildete Kämpfer (`total_fighters_trained`), Anheuern zählte nicht.
  Jetzt: 10 Helden in der Gilde.
- **Veteran** zählte auch bloss gestartete Expeditionen. Jetzt nur beendete.
- **Goldhamster** meint Gold aus Expeditionen (`total_gold_earned` zählt nur dort), der Text sagt das jetzt.

## Ziele und Grenzen

- Monsterbuch: In den Routen kommen etwa 65 verschiedene Gegner vor, darum höchstens 50 statt 75.
- Sets: 25 Dungeon-Sets; 3 ganze Sets gleichzeitig getragen statt 5.
- `tests/erfolge.test.ts` prüft, dass jeder Erfolg mit einem erreichbaren Spielstand gelingt
  und kein Zähler fehlt.
