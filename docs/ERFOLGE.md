# Erfolge

Daten: `src/data/achievements.ts`. Prüfung: `src/systems/AchievementSystem.ts`.
Bildschirm: `src/ui/screens/AchievementsScreen.ts`, erreichbar über den Knopf «🏅» in der Kopfzeile
(oder Taste A). 🏅 steht überall für Erfolge (Knopf, Hinweis, Titel des Bildschirms, Bilanz);
🏆 gehört dem Trophäensaal und den Pokalen der Rangliste. Einzelne Erfolge dürfen eigene Zeichen
haben («Siegreich» 🏆), nur 🏅 trägt keiner selbst.

## Wann geprüft wird

- **Am Ende jeder Expedition** (`ExpeditionFinalizer.ts`, nach Gildenrang, Monsterbuch, Rangliste
  und Auftragsbrett): Gildenrang, Kette, Gipfel-Rangliste und alles andere zählt sofort. Die neuen
  Erfolge stehen in der Bilanz («🏅 Erfolg: Veteranengilde»), die Kopfzeile zeigt dazu keinen
  Hinweis. Liegt die Beute im Lager, prüft `ExpeditionFlow.ts` noch einmal (ein ganzes Set gibt einen Stern
  im Trophäensaal); auch das steht in derselben Bilanz.
- **Bei jedem Tageswechsel** (`neuerTag` in `src/systems/Tag.ts`, alle 30 Sekunden): Hinweis in der Kopfzeile.
  Ein oder zwei Erfolge mit Namen («🏅 Erfolge: Dorf, Sammler»), ab drei nur die Zahl («🏅 5 neue Erfolge»).
  Ist gerade keine Kopfzeile zu sehen (Kampf, Truhe, Bilanz), kommt der Hinweis auf dem nächsten
  Bildschirm. Wer dann gleich die Erfolge öffnet, sieht sie dort.
- **Beim Laden des Spiels** (der Erfolge-Bildschirm wird dabei gezeichnet): Was ein Spielstand schon
  erfüllt, kommt hier dazu, mit Hinweis wie am Tageswechsel («🏅 8 neue Erfolge»).
- **Beim Öffnen des Erfolge-Bildschirms.**
- **Gleich nach der Tat**, mit Hinweis in der Kopfzeile: Gebäude bauen oder ausbauen, beim Händler kaufen,
  Held anwerben, Weg wählen, Gegenstand anlegen (ein ganzes Set), Stadt aufsteigen (Stadtweg),
  in der Schmiede verbessern, Zettel liefern und Set-Teil einlösen (Gildenhaus). Kommen zwei Hinweise fast
  gleichzeitig («📜 Zettel erledigt» und der Erfolg dazu), stehen sie nebeneinander.

Jeder Erfolg wird genau einmal gemeldet: `erfolgePruefen()` trägt ihn in `state.achievements` ein
und meldet ihn den Hörern (`beiNeuenErfolgen`). Pokale der Rangliste zählen am Ende der Expedition
oder beim nächsten Tageswechsel (höchstens 30 Sekunden).

## Angeschaut, gespeichert, offen

- Die Zahl am Knopf zeigt die Erfolge seit dem letzten Öffnen des Bildschirms
  (`statistics.erfolge_gesehen`). Vorlesehilfen hören «Erfolge, 2 neu» (`aria-label`).
- Wer den Bildschirm öffnet, hat alles angeschaut; das Spiel speichert gleich (`mc:speichern`),
  sonst stünde die Zahl nach dem Neuladen wieder am Knopf.
- Kommt ein Erfolg, während der Bildschirm offen ist, zeichnet er sich neu: Die Karte steht gleich
  bei den freigeschalteten, leuchtet kurz auf und gilt als angeschaut.
- «Zurück» führt dorthin, woher der Spieler kam (Hauptmenü, Gildenhaus, Monsterbuch …), einen
  Schritt zurück im Verlauf (`ScreenRouter.goBack`), ohne Hin und Her zwischen zwei Bildschirmen.
- Am Handy ist der Knopf mindestens 44 px gross. Der Hinweis steht dort an der Stelle des Logos
  (`.hdr-mit-hinweis` in `erfolge.css`), höchstens zwei Zeilen: Die Kopfzeile wird nicht höher,
  der Knopf bleibt, wo er ist.

## Während einer Expedition

Kein Bildschirmwechsel: `main.ts` sperrt den Router, solange eine Expedition läuft
(`setzeNavigationsSperre`). Das gilt für die Tasten K, A, G und Escape und für jeden Knopf.
Früher öffnete Taste A mitten im Kampf die Erfolge: Der Kampf war versteckt, es gab keinen Weg
zurück, und die Expedition hing bis zum Neuladen (dann brach das Spiel sie ab).

## Kennzahlen

Was niemand von selbst zählt, schreibt `kennzahlenAktualisieren(state)` vor jeder Prüfung in
`state.statistics` (jeweils der höchste je erreichte Wert, kein Balken fällt zurück):
`stadtstufe`, `helden_anzahl`, `helden_mit_weg`, `helden_meister`, `ganze_sets`,
`monsterbuch_entdeckt`, `gildenrang`, `werkstaetten` (stehende Werkstätten), `werkstatt_hoechste_stufe`,
`zettel_erledigt`, `saal_prunkstuecke`, `saal_sterne`, `rangliste_pokale`, `schmiede_hoechste_stufe`.

Die Funktion liest nur. Sie legt kein Auftragsbrett, keine Rangliste und keinen Trophäensaal an
(das täten `brettStand`, `ranglisteStand` und `bossTrophaeen` nebenbei). Die Sterne im Saal zählt
`saalSterne()` wie der Saal selbst: je Sockel einer für den bezwungenen Boss, einer für das ganze
Set des Dungeons, einer für das Prunkstück aus der Kette. `gipfel_spitze` setzt das Ende einer
Expedition, wenn die Gilde danach die Gipfel-Rangliste anführt. `total_haendler_kaeufe` zählt
`systems/Haendler.ts` bei jedem Kauf (nicht beim Verkauf).

## Aus dem Spielstand nachgeholt

Was die Daten hergeben, holt `kennzahlenAktualisieren` nach (wieder nur nach oben), etwa nach dem Laden einer
Datei:

| Zähler | woher |
|---|---|
| `total_days_survived` | `state.day - 1` (Tag 1 = noch kein Tag überstanden; `neuerTag` setzt denselben Wert) |
| `total_victories` | Gildenstatistik (`totalExpeditionsCompleted`), sonst Siege in der Bestenliste |
| `total_defeats`, `total_retreats` | Bestenliste |
| `total_bosses_killed` | Gildenstatistik (`totalBossesDefeated`), sonst Bestenliste |
| `total_enemies_killed` | Bestenliste |
| `total_expeditions` | mindestens alle beendeten |
| `total_upgrades` | Ausbaustufen der Gebäude (jede Stufe über 1 war ein Ausbau) |
| `total_buildings_built` | mindestens die Ausbauten (ein Ausbau zählt für «Baumeister» wie ein Bau) |

Stadtstufe, Gildenrang, Helden, Sets, Monsterbuch, Werkstätten, Auftragsbrett, Saal, Pokale und
Schmiede liest die Funktion ohnehin aus dem Spielstand. Die Bestenliste behält nur die 100 besten Läufe, darum
ist sie nur die untere Grenze. Ein neues Spiel bekommt nichts geschenkt.

## Liste

37 Erfolge. Seit Oktober 2026 neue sind mit «neu» markiert, die der Gildenstadt (22.10.2026) mit «Gildenstadt».
Die IDs stehen in Spielständen (`state.achievements`) und dürfen sich nicht ändern. Unbekannte IDs (wie die
gestrichenen `wohnviertel_6`, `bewohner_25`, `gebaeude_max`, `ausbau_10`, `bauplan_1`) überspringt das Spiel.

| Gruppe | Zeichen | Name | Bedingung | Zähler | ID |
|---|---|---|---|---|---|
| Stadt | 🛒 | Erster Kauf (Gildenstadt) | zum ersten Mal beim Händler kaufen: Proviant oder Ausrüstung | `total_haendler_kaeufe` ≥ 1 | `haendler_1` |
| Stadt | 🏗️ | Grundsteinlegung | 1 Gebäude gebaut | `total_buildings_built` ≥ 1 | `first_building` |
| Stadt | 🏘️ | Gildenstadt (Gildenstadt) | alle vier Werkstätten stehen | `werkstaetten` ≥ 4 | `werkstaetten_4` |
| Stadt | 🏛️ | Baumeister | 10 Mal gebaut (Neubauten und Ausbauten) | `total_buildings_built` ≥ 10 | `mass_builder` |
| Stadt | 🔨 | Ausbauer (Gildenstadt) | 5 Ausbauten | `total_upgrades` ≥ 5 | `ausbau_5` |
| Stadt | 🏰 | Meisterwerkstatt (Gildenstadt) | eine Werkstatt auf Stufe 3 | `werkstatt_hoechste_stufe` ≥ 3 | `werkstatt_3` |
| Stadt | 🛖 | Dorf (neu) | Stadtstufe 3 «Dorf» | `stadtstufe` ≥ 3 | `stadtstufe_3` |
| Stadt | 🏙️ | Stadtrecht (neu) | Stadtstufe 5 «Stadt» | `stadtstufe` ≥ 5 | `stadtstufe_5` |
| Stadt | ✨ | Magische Stadt (neu) | Stadtstufe 7 «Magische Stadt» | `stadtstufe` ≥ 7 | `stadtstufe_7` |
| Stadt | ⭐ | Überlebenskünstler | 100 Tage | `total_days_survived` ≥ 100 | `survivor_100` |
| Gilde | 🎖️ | Veteranengilde (neu) | Gildenrang III | `gildenrang` ≥ 3 | `gildenrang_3` |
| Gilde | 👑 | Gildenmeister (neu) | Gildenrang V, Titel Gildenmeister | `gildenrang` ≥ 5 | `gildenrang_5` |
| Gilde | 📌 | Fleissige Gilde (neu) | 10 Zettel am Auftragsbrett erledigt | `zettel_erledigt` ≥ 10 | `zettel_10` |
| Gilde | 🏺 | Alle Sockel voll (neu) | alle 16 Prunkstücke der Kette «Der Saal der Gilde» | `saal_prunkstuecke` ≥ 16 | `saal_kette` |
| Gilde | 🌟 | Glanz des Saals (neu) | 24 der 48 Sterne im Trophäensaal | `saal_sterne` ≥ 24 | `saal_glanz` |
| Gilde | 🥉 | Aufs Treppchen (neu) | ein Pokal der Wochenwertung (Platz 1 bis 3) | `rangliste_pokale` ≥ 1 | `rangliste_pokal` |
| Gilde | 🏔️ | Gipfelstürmer (neu) | Platz 1 der Gipfel-Rangliste nach einer Expedition | `gipfel_spitze` ≥ 1 | `gipfel_1` |
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
| Sammeln | ⚒️ | Am Amboss (neu) | ein Set-Teil in der Schmiede verbessert | `schmiede_hoechste_stufe` ≥ 1 | `schmiede_1` |
| Sammeln | 💫 | Meisterstück (neu) | ein Set-Teil auf +5 geschmiedet | `schmiede_hoechste_stufe` ≥ 5 | `schmiede_5` |
| Sammeln | 📖 | Monsterkundler (neu) | 25 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 25 | `monsterbuch_25` |
| Sammeln | 📚 | Monstergelehrter (neu) | 50 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 50 | `monsterbuch_50` |

Die Zahlen 16 (Sockel), 24 und 48 (Sterne) und +5 (Schmiede) kommen aus den Daten: ein Sockel je
Boss-Dungeon der Karte (`SAAL_SOCKEL`), drei Sterne je Sockel, die Hälfte davon für «Glanz des
Saals», `MAX_SCHMIEDE_STUFE`. Ein neuer Boss-Dungeon ändert die Ziele mit.

## Geändert gegenüber früher

- **Gildenstadt (22.10.2026):** Alle Erfolge um Bewohner, Wohnviertel, Markt, Bank und Zufriedenheit sind
  gestrichen (`wohnviertel_6`, `bewohner_25`, auch `gebaeude_max` und `ausbau_10`). Neu: «Erster Kauf», «Erster
  Bauplan», «Gildenstadt» (vier Werkstätten), «Ausbauer» mit 5 statt 10 und «Meisterwerkstatt». **Baumeister**
  will 10 statt 20 Bauten: Mehr als 4 Neubauten und 9 Ausbauten (vier Werkstätten je zwei, Gildenhaus eins) gibt es
  in der Gildenstadt nicht.
- **Ohne Baupläne (23.10.2026):** «Erster Bauplan» (`bauplan_1`, Zähler `bauplaene`) ist mit den Bauplänen
  gestrichen (`docs/GILDENSTADT.md`); wer ihn schon hatte, behält die ID im Spielstand, angezeigt wird er nicht mehr.
  «Erster Kauf» zählt nur noch Waren.
- **Überlebenskünstler** war nie erreichbar: niemand zählte `total_days_survived`. Jetzt setzt `neuerTag` den Wert
  aus `day`.
- **Armeeführer** zählte nur ausgebildete Kämpfer (`total_fighters_trained`), Anheuern zählte nicht.
  Jetzt: 10 Helden in der Gilde.
- **Veteran** zählte auch bloss gestartete Expeditionen. Jetzt nur beendete.
- **Goldhamster** meint Gold aus Expeditionen (`total_gold_earned` zählt nur dort), der Text sagt das jetzt.
- Gildenrang, Kette und Gipfel zählen am Ende der Expedition sofort, nicht erst beim nächsten Tageswechsel.

## Ziele und Grenzen

`tests/erfolgeErreichbar.test.ts` spielt ein Musterspiel mit den echten Regeln (beim Händler kaufen, Bauen,
Ausbauen, Stadtweg, Anheuern, Expeditionen, Auftragsbrett, Schmiede, Rangliste), ohne einen Zähler von Hand
zu setzen: Eine starke Gilde schafft alle 37 Erfolge in unter 60 Tagen und unter 400 Expeditionen. Dazu hat
jeder Zähler eine Obergrenze aus den Daten, kein Ziel liegt darüber, und ein neuer Zähler braucht
dort eine Zeile.

- Bauten: 4 Neubauten (die Werkstätten) und 9 Ausbauten, also höchstens 13 für «Baumeister»; Werkstätten höchstens
  4 auf Stufe 3.
- Monsterbuch: In den Routen kommen etwa 65 verschiedene Gegner vor, darum höchstens 50 statt 75.
- Sets: 29 Dungeon-Sets; 3 ganze Sets gleichzeitig getragen statt 5.
- Trophäensaal: 16 Sockel mit je 3 Sternen.
- Was mit der Zeit wächst (Tage, Expeditionen, Gegner, Zettel, Pokale, Käufe), hat keine Grenze.

## Gildenrang: Text beim Aufstieg

Welche Dungeons ein Rang öffnet, steht nur in den Routen: Ein Dungeon der Ebene `route.tier`
braucht Gildenrang `rangFuerEbene(tier)` (Ebene 1 bis 5 den gleichen Rang, alles darüber Rang V).
Die Sperre auf der Karte (`getRouteLockReasons`) und der Text beim Aufstieg
(`rangFreischaltungen` in `GuildRankSystem.ts`) lesen dieselbe Regel; eine eigene Liste je Rang
(früher `routeUnlocks`, von niemandem gelesen) gibt es nicht mehr.

Der Text steht in der Bilanz nach der Expedition, Dungeons von unten nach oben wie auf der Karte,
getrennt nach «gleich offen» und «nach Bosssiegen». Beispiel Rang II in einem neuen Spiel:

```
Gilden-Rang II: Abenteurer!
Neue Dungeons (7), gleich offen: Tiefwald (mittel), Geisterwald, Tiefe Höhle, Versunkene Küste
Nach Bosssiegen: Spinnenhöhle, Verschlungene Tunnel, Sumpfdorf
Neues Gebäude: Arkanschmiede
```

Rang II, III und IV öffnen je 7 Dungeons, Rang V den Drachenhort, das Himmelsarchiv, die
Sternenschmiede und den Sternenschlund. Dazu kommen Gebäude mit `freischaltung.gildenrang` (Rang II die
Arkanschmiede, Rang IV die Kriegsmaschinen-Werkstatt), der Ausbau des Gildenhauses (Rang III) und der Titel
Gildenmeister (Rang V).
