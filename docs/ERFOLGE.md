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
- **Nach jedem Ernstkampf im Raid** (`ernstkampf` in `src/systems/Raid.ts`): ohne Hinweis in der Kopfzeile, das
  Ergebnis des Kampfs zeigt die neuen Erfolge wie die Bilanz einer Expedition (`erfolgBilanzZeile`).
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
- Am Handy ist der Knopf mindestens 44 px gross. Der Hinweis steht in `.hdr-platz`, dem freien Platz
  hinter dem Bildschirm-Namen, auf höchstens zwei Zeilen, und verschiebt nichts: `.hdr-platz` zählt für
  die Breite von `.hdr-mitte` nicht mit, die Kopfzeile wird nicht höher, «← Zurück», die Vorräte und der
  Knopf bleiben, wo sie sind. Bis 1000 px Breite (Handy hoch und quer, Tablet, schmales Fenster) liegt er
  über Logo und Name, die so lange unsichtbar sind, aber ihren Platz behalten (`.hdr-mit-hinweis` in
  `erfolge.css`). Breiter steht er daneben, wenn er dort auf zwei Zeilen passt. Das schätzt
  `hinweisKlasse` (`HeaderRenderer.ts`) an der Länge, gemessen an allen Hinweisen, die das Spiel dort
  zeigen kann (882 einzelne und 11.770 Paare aus zwei Hinweisen kurz nacheinander): Die bis 60 Zeichen
  brauchen höchstens 158 px, die bis 90 Zeichen (`.hdr-note-lang`: ein erledigter Liefer-Zettel mit
  Tagesbonus, bis 83 Zeichen und 203 px, und der Satz zum alten Spielstand, 88 Zeichen und 214 px)
  höchstens 214 px, mit dem Abstand zum Namen und etwas Reserve also 190 und 250 px. Ist weniger frei
  (langer Name, grosse Vorräte, viele neue Erfolge), liegt er auch dort über Logo und Name und deckt sie
  zu (`@container` in `erfolge.css`); dabei blendet nur die Schrift ein, die Decke steht sofort. Zwei
  Hinweise kurz nacheinander (und alles über 90 Zeichen, `.hdr-note-sehr-lang`) liegen dort immer
  darüber: Zusammen brauchen sie oft mehr Platz, als ihre Länge vermuten lässt (60 Zeichen bis 185 px).
  In die Kopfzeile kommen nur Liefer-Zettel; die anderen Zettel und die Kapitel des Saals meldet die
  Bilanz nach der Expedition. Ein neuer Hinweis mit über 60 Zeichen gehört nachgemessen.
- Auch die Zahl am Knopf ändert die Höhe nicht: Am Handy sitzt sie auf der Ecke von 🏅, ragt 4 px über
  dessen obere und rechte Kante, bleibt 2 px unter der Oberkante der Kopfzeile und zählt für die Breite
  nicht mit. Dort füllt das Logo die erste Zeile zwischen «← Zurück» und 🔊 🏅 (je 44 × 44 px, 4 px
  auseinander) und zählt beim Umbrechen nicht mit; neben «← Zurück» ist es unter 375 px kleiner (14 px,
  122 px breit), unter 340 px noch kleiner (12 px, 100 px breit), notfalls endet es mit «…»
  (`magic-city.css`, Abschnitt Header). Über
  700 px steht alles in einer Zeile, «← Zurück», Logo und 🏅 brechen nie um. Fehlt Platz, stehen erst
  die Vorräte auf zwei Zeilen (zwei Gruppen zu drei, `vorratsZeileHtml`), dann der Bildschirm-Name,
  beide nicht höher als 🏅; erst wenn auch das nicht reicht, endet der Name mit «…». So ragt 🏅 auch
  neben sehr grossen Vorräten nie hinaus. Von 701 bis 860 px ist neben «← Zurück» das Logo kleiner
  und der Abstand etwas enger (`.hdr-zurueck`), ab 861 px ist alles wie am PC. Die Kopfzeile des
  Hauptmenüs (ohne «← Zurück» und Namen) bleibt dort, wie sie war.
  Gemessen mit den Web-Schriften auf neun Bildschirmen und vier Team-Auswahlen, mit 0, 9, 25 und 125
  neuen Erfolgen, ohne, mit kurzem und mit langem Hinweis: 79 px hoch von 320 bis 700 px, 65 px quer
  (844 × 390) und am Tablet (768 × 1024, 820 × 1180, 1000 × 800), 53 px am PC (701 bis 1400 px). Mit
  sehr grossen Vorräten (1.234.567 Gold, Tag 1234) sind es am Handy von 320 bis 360 px 103 px (die
  Vorräte brauchen dort zwei Zeilen), sonst bleibt die Höhe gleich.
  Mit gewohnten Vorräten ist kein Name gekürzt. Neben grossen Vorräten und vielen neuen Erfolgen enden
  von 701 bis 732 px einzelne lange Namen mit «…»: «Schattenkatakomben» (mit 25.000 Gold nur bei 701 px
  und 125 neuen Erfolgen, mit 1.234.567 Gold bis 732 px), «ROUTENÜBERSICHT» (bis 707 px) und «Die
  Sternenschmiede» (bei 701 px); mit 12.345.678 Gold bis 751 px, dann auch «DUNGEONKARTE» und
  «Verschlungene Tunnel».
  Über 1000 px endet kein Hinweis mit «…», auch zwei zusammen nicht (1001 bis 1401 px, Vorräte bis
  12.345.678 Gold). Bis 1000 px ist der Platz über Logo und Name schmaler, neben «← Zurück» am Handy bei
  320 px 116 px, bei 360 px 156 px, bei 390 px 186 px, bei 412 px 208 px (im Hauptmenü 204, 244, 274 und
  296 px). Neben «← Zurück» steht ein Hinweis darum bis 551 px auf höchstens drei Zeilen zu 11 px statt
  zwei zu 12 px (3 × 11,9 px in den 36 px der ersten Zeile, die Kopfzeile bleibt 79 px hoch). Ein farbiges
  Emoji am Anfang (🏅 📜 ⚒️ 💎) ragt bis knapp 3 px über eine solche Zeile: Der Hinweis hat darum 4 px Luft nach
  oben, und `.hdr-mitte` schneidet dort nur unten und seitlich ab (`clip-path`, `erfolge.css`). Ab 552 px
  (Handy quer) endet auch mit zwei Zeilen zu 12 px keiner der 1585 gemessenen Hinweise mit «…», dort bleibt es
  wie im Hauptmenü. Neben «← Zurück» endet so nur noch ein erledigter Liefer-Zettel mit Tagesbonus bis 338 px
  nach drei Zeilen mit «…», der Satz zum alten Spielstand bis 342 px und ein Zettel zusammen mit zwei Erfolgen
  (bis 134 Zeichen) bis 411 px, mit Tagesbonus und langen Namen (bis 138 Zeichen) bis 417 px; ein Hinweis bis
  60 Zeichen (Aufträge der Werkstätten, Erfolge mit einem oder zwei Namen, Set-Teile, Zettel ohne Tagesbonus)
  nie. Im Hauptmenü endet der Satz zum alten Spielstand bis 329 px nach zwei Zeilen mit «…» (bei 320 px fehlt
  «werden.»), ein Zettel mit zwei Erfolgen bis 463 px. Mit zwei Zeilen zu 12 px endeten neben «← Zurück» bei
  320 px 29 der 170 Hinweise des Gildenhauses und 639 der 1332 Erfolge mit zwei Namen mit «…» (gemessen im
  Gildenhaus in 2-px-Schritten, ohne und mit Zahl am 🏅 gleich). Von 701 bis 1000 px (Handy quer, Tablet,
  schmales Fenster) passt jeder einzelne Hinweis, nur der Satz zum alten Spielstand endet bis 703 px mit «…»
  (neben sehr grossen Vorräten bis 789 px); ein Zettel mit zwei Erfolgen endet bis 841 px und von 861 bis
  863 px mit «…», mit 1.234.567 Gold bis 945 px.
  Gemessen in Chromium mit den Web-Schriften auf zwölf Bildschirmen, mit 0, 9 und 125 neuen Erfolgen, in
  Schritten von 2 bis 8 px (die Grenzen von 329 bis 463 px auf den Pixel), ohne Scrollbalken. Am PC nimmt
  einer der Kopfzeile 5 px (im Monsterbuch steht er immer), die Grenzen liegen dann bis zu 5 px höher. Was
  dazukam, zeigen trotzdem die Zahl am Knopf, das Lager und die Bildschirme.
  Bei 1400 px sieht die Kopfzeile aus wie vorher, nur zwei Hinweise nebeneinander liegen jetzt über Logo
  und Name. Früher sprang sie bei 320 und 360 px von 79 auf 121 px, sobald der Hinweis verschwand, und
  knapp über 1000 px war ein Hinweis neben einem langen Namen bis auf wenige Buchstaben gekürzt
  («✔ Br…»).

## Während einer Expedition

Kein Bildschirmwechsel: `main.ts` sperrt den Router, solange eine Expedition läuft
(`setzeNavigationsSperre`). Das gilt für die Tasten K, A, G und Escape und für jeden Knopf.
Früher öffnete Taste A mitten im Kampf die Erfolge: Der Kampf war versteckt, es gab keinen Weg
zurück, und die Expedition hing bis zum Neuladen (dann brach das Spiel sie ab).

## Kennzahlen

Was niemand von selbst zählt, schreibt `kennzahlenAktualisieren(state)` vor jeder Prüfung in
`state.statistics` (jeweils der höchste je erreichte Wert, kein Balken fällt zurück):
`stadtstufe`, `helden_anzahl`, `helden_mit_weg`, `helden_meister`, `lehrlinge`, `lehrlinge_ausgelernt`, `ganze_sets`,
`monsterbuch_entdeckt`, `gildenrang`, `werkstaetten` (stehende Werkstätten), `werkstatt_hoechste_stufe`,
`zettel_erledigt`, `saal_prunkstuecke`, `anbau_prunkstuecke`, `saal_sterne`, `rangliste_pokale`, `schmiede_hoechste_stufe`.

Die Funktion liest nur. Sie legt kein Auftragsbrett, keine Rangliste und keinen Trophäensaal an
(das täten `brettStand`, `ranglisteStand` und `bossTrophaeen` nebenbei). Die Sterne im Saal zählt
`saalSterne()` wie der Saal selbst: je Sockel einer für den bezwungenen Boss, einer für das ganze
Set des Dungeons, einer für das Prunkstück aus der Kette. `gipfel_spitze` setzt das Ende einer
Expedition, wenn die Gilde danach die Gipfel-Rangliste anführt. `total_haendler_kaeufe` zählt
`systems/Haendler.ts` bei jedem Kauf (nicht beim Verkauf). Die Zähler des Raids (`raid_versuche`, `raid_siege`,
`raid_punkt_zwoelf`, `raid_mehr_als_vier`, `raid_wochen`, `raid_zu_viert`) zählt `ernstkampf` in `systems/Raid.ts`
bei jedem Ernstkampf hoch; Probeläufe und der Kriegsrat zählen nicht (`docs/RAID.md`). Sie zählen nur Stufe I
(«Über dem Tag»): Auf Stufe II gewinnt die Muster-Aufstellung «Profi» fast immer bis Runde 12 und mit mehr als
vier Stehenden, dort wären «Punkt zwölf» und «Mehr als vier» geschenkt. Stufe II («Die dreizehnte Stunde») zählt
ihre Siege (`raid2_siege`) und die Wochen mit offener dreizehnter Truhe (`raid2_wochen`) eigens.

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

## Belohnung

Jeder Erfolg bringt einmalig Kristallsplitter (`erfolgBelohnung(def)` in `data/achievements.ts`):

| Splitter | Erfolge |
|---|---|
| 1 | erste Schritte: `haendler_1`, `first_building`, `stadtstufe_3`, `first_expedition`, `first_victory`, `veteran_explorer`, `perfectionist`, `first_boss`, `gold_hoarder`, `schmiede_1` (10) |
| 3 | alle übrigen (29), auch `gipfel_kleingedrucktes` und `gipfel_einsturz` (Boss nicht besiegt) |
| 6 | grosse Ziele: `stadtstufe_7`, `gildenrang_5`, `saal_kette`, `saal_glanz`, `gipfel_1`, `erster_meister`, `bosse_25`, `kill_1000`, `ganze_sets_3`, `schmiede_5`, `monsterbuch_50` und die acht Gipfel-Taten mit besiegtem Boss (19) |
| 12 | «Hat alles» (`gipfel_alle`) |
| 2 | jeder versteckte Erfolg (7) |

Zusammen 237. Ausgezahlt wird nie je neuer ID, sondern über die Summe: `belohnungAuszahlen(state)` in
`systems/AchievementSystem.ts` legt `verdienteSplitter(state)` (nur bekannte, freigeschaltete IDs) minus die schon
gezahlte Summe in `statistics.erfolg_splitter` ins Lager (`crystal_shard`). `erfolgePruefen` ruft es nach dem
Eintragen neuer Erfolge auf. So zahlt jeder Erfolg genau einmal, egal wie oft geprüft wird.

**Nachzahlung:** Ein Stand aus der Zeit vor der Belohnung hat noch kein `erfolg_splitter`. `main.ts` zahlt beim
Laden einmal nach, speichert gleich und zeigt in der Kopfzeile «💎 Nachzahlung für deine Erfolge: +N
Kristallsplitter». Beim nächsten Laden fehlt nichts mehr, also kein Hinweis.

**Wo man sie sieht:** In der Bilanz nach der Expedition steht nach den 🏅-Zeilen «💎 Belohnung: +N Kristallsplitter»
(hellblau; `ExpeditionFlow.ts` merkt den Stand vor `finalizeExpeditionProgress`). Auf dem Erfolge-Bildschirm zeigt
jede Karte «💎 N», freigeschaltet «💎 N erhalten»; gesperrte versteckte verraten auch die Belohnung nicht. Der Kopf
nennt «💎 X Kristallsplitter erhalten».

## Liste

59 Erfolge, die sieben versteckten stehen im Abschnitt «Das System schaut zu» (zusammen 66). Seit Oktober 2026 neue sind mit «neu» markiert, die der Gildenstadt (22.10.2026) mit «Gildenstadt».
Die IDs stehen in Spielständen (`state.achievements`) und dürfen sich nicht ändern. Unbekannte IDs (wie die
gestrichenen `wohnviertel_6`, `bewohner_25`, `gebaeude_max`, `ausbau_10`, `bauplan_1`) überspringt das Spiel.

| Gruppe | Zeichen | Name | Bedingung | Zähler | ID |
|---|---|---|---|---|---|
| Stadt | 🛒 | Erster Kauf (Gildenstadt) | zum ersten Mal beim Händler in der Stadt kaufen: Proviant oder Ausrüstung (der Händler im Dungeon zählt nicht) | `total_haendler_kaeufe` ≥ 1 | `haendler_1` |
| Stadt | 🏗️ | Grundsteinlegung | 1 Gebäude gebaut | `total_buildings_built` ≥ 1 | `first_building` |
| Stadt | 🏘️ | Gildenstadt (Gildenstadt) | alle vier Werkstätten stehen | `werkstaetten` ≥ 4 | `werkstaetten_4` |
| Stadt | 🏛️ | Baumeister | 10 Mal gebaut (Neubauten und Ausbauten) | `total_buildings_built` ≥ 10 | `mass_builder` |
| Stadt | 🔨 | Ausbauer (Gildenstadt) | 5 Ausbauten (Werkstätten und Gildenhaus zählen) | `total_upgrades` ≥ 5 | `ausbau_5` |
| Stadt | 🏰 | Meisterwerkstatt (Gildenstadt) | eine Werkstatt auf Stufe 3 | `werkstatt_hoechste_stufe` ≥ 3 | `werkstatt_3` |
| Stadt | 🛖 | Dorf (neu) | Stadtstufe 3 «Dorf» | `stadtstufe` ≥ 3 | `stadtstufe_3` |
| Stadt | 🏙️ | Stadtrecht (neu) | Stadtstufe 5 «Stadt» | `stadtstufe` ≥ 5 | `stadtstufe_5` |
| Stadt | ✨ | Magische Stadt (neu) | Stadtstufe 7 «Magische Stadt» | `stadtstufe` ≥ 7 | `stadtstufe_7` |
| Stadt | ⭐ | Überlebenskünstler | 100 Tage | `total_days_survived` ≥ 100 | `survivor_100` |
| Gilde | 🎖️ | Veteranengilde (neu) | Gildenrang III | `gildenrang` ≥ 3 | `gildenrang_3` |
| Gilde | 👑 | Gildenmeister (neu) | Gildenrang V, Titel Gildenmeister | `gildenrang` ≥ 5 | `gildenrang_5` |
| Gilde | 📌 | Fleissige Gilde (neu) | 10 Zettel am Auftragsbrett erledigt | `zettel_erledigt` ≥ 10 | `zettel_10` |
| Gilde | 🏺 | Alle Sockel voll (neu) | alle 16 Prunkstücke der Kette «Der Saal der Gilde» | `saal_prunkstuecke` ≥ 16 | `saal_kette` |
| Gilde | 🧱 | Angebaut (neu) | auch die 2 Prunkstücke im Anbau des Saals (Erste Stadt, Pfeiler des Tages) | `anbau_prunkstuecke` ≥ 2 | `anbau_kette` |
| Gilde | 🌟 | Glanz des Saals (neu) | 27 der 54 Sterne im Trophäensaal (Saal und Anbau) | `saal_sterne` ≥ 27 | `saal_glanz` |
| Gilde | 🥉 | Aufs Treppchen (neu) | ein Pokal der Wochenwertung (Platz 1 bis 3) | `rangliste_pokale` ≥ 1 | `rangliste_pokal` |
| Gilde | 🏔️ | Gipfelstürmer (neu) | Platz 1 der Gipfel-Rangliste nach einer Expedition | `gipfel_spitze` ≥ 1 | `gipfel_1` |
| Helden | 🛡️ | Armeeführer | 10 Helden in der Gilde | `helden_anzahl` ≥ 10 | `army_builder` |
| Helden | 🧭 | Wegbereiter (neu) | ein Held hat seinen Weg gewählt (ab Stufe 10) | `helden_mit_weg` ≥ 1 | `erster_weg` |
| Helden | 🥋 | Meister seines Wegs (neu) | ein Held ist Meister (Stufe 15) | `helden_meister` ≥ 1 | `erster_meister` |
| Helden | 🎓 | Lehrjahre (neu) | der erste Lehrling ist aufgenommen (sein Meister braucht Stufe 15, docs/AUSBILDUNG.md) | `lehrlinge` ≥ 1 | `erster_lehrling` |
| Helden | 📜 | Ausgelernt (neu) | ein Lehrling hat Stufe 15 | `lehrlinge_ausgelernt` ≥ 1 | `lehrling_ausgelernt` |
| Helden | 👥 | Doppelt besetzt (neu) | alle zehn Klassen haben ihren Lehrling | `lehrlinge` ≥ 10 | `doppelt_besetzt` |
| Dungeons | 🗺️ | Abenteuerlust | 1 Expedition gestartet | `total_expeditions` ≥ 1 | `first_expedition` |
| Dungeons | 🏆 | Siegreich | 1 Expedition gewonnen | `total_victories` ≥ 1 | `first_victory` |
| Dungeons | ⚔️ | Veteran | 10 Expeditionen beendet (Sieg, Niederlage oder Rückzug) | `total_victories` + `total_defeats` + `total_retreats` ≥ 10 | `veteran_explorer` |
| Dungeons | 💎 | Perfektionist | ein Sieg, ohne dass ein Held fällt (auch nicht für kurz: wer am Wachfeuer oder durch «Wiedergeburt» wieder aufstand, ist gefallen; `einHeldGefallen`) | `total_flawless_victories` ≥ 1 | `perfectionist` |
| Dungeons | 💀 | Bossbekämpfer | 1 Boss besiegt | `total_bosses_killed` ≥ 1 | `first_boss` |
| Dungeons | 🔥 | Bosskiller | 5 Bosse besiegt | `total_bosses_killed` ≥ 5 | `boss_slayer` |
| Dungeons | 🐉 | Bossjäger (neu) | 10 Bosse besiegt | `total_bosses_killed` ≥ 10 | `bosse_10` |
| Dungeons | ☠️ | Schrecken der Tiefe (neu) | 25 Bosse besiegt | `total_bosses_killed` ≥ 25 | `bosse_25` |
| Dungeons | 💰 | Goldhamster | 500 Gold auf Expeditionen erbeutet (alles Gold der Truhe: `goldEarned` und `loot.gold`) | `total_gold_earned` ≥ 500 | `gold_hoarder` |
| Dungeons | 💠 | Hundertfacher Tod | 100 Gegner besiegt | `total_enemies_killed` ≥ 100 | `kill_100` |
| Dungeons | 🗡️ | Tausendfacher Tod (neu) | 1000 Gegner besiegt | `total_enemies_killed` ≥ 1000 | `kill_1000` |
| Dungeons | 🪜 | Zehn Sprossen (neu) | der erste Ernstkampf im Raid «Über dem Tag» | `raid_versuche` ≥ 1 | `raid_versuch` |
| Dungeons | 🕰️ | Der Tag hängt gerade (neu) | Zenit besiegt | `raid_siege` ≥ 1 | `raid_sieg` |
| Dungeons | 🔔 | Punkt zwölf (neu) | Zenit in Runde 12 oder früher besiegt, bevor es Mittag schlägt | `raid_punkt_zwoelf` ≥ 1 | `raid_punkt_zwoelf` |
| Dungeons | 🪑 | Mehr als vier (neu) | Zenit besiegt, und am Ende stehen mindestens fünf | `raid_mehr_als_vier` ≥ 1 | `raid_mehr_als_vier` |
| Dungeons | 📅 | Jeden Montag (neu) | Zenits Truhe in vier verschiedenen Wochen (der erste Sieg der Woche öffnet sie) | `raid_wochen` ≥ 4 | `raid_montage` |
| Dungeons | 🕐 | Es schlägt nicht dreizehn (neu) | Zenit auf Stufe II besiegt («Die dreizehnte Stunde», offen nach dem ersten Sieg auf Stufe I) | `raid2_siege` ≥ 1 | `raid_dreizehn` |
| Dungeons | 🗓️ | Doppelschicht (neu) | die dreizehnte Truhe in vier verschiedenen Wochen (der erste Sieg der Woche auf Stufe II öffnet sie) | `raid2_wochen` ≥ 4 | `raid_doppelschicht` |
| Gipfel-Taten | 🪙 | Ehrlicher Finder (neu) | Drachenhort: dreimal das Risiko, Ignarax besiegt | `tat_hort` ≥ 1 | `gipfel_hort` |
| Gipfel-Taten | 📕 | Ohne Leseausweis (neu) | Himmelsarchiv: dreimal das Risiko, Oberarchivar besiegt | `tat_archiv` ≥ 1 | `gipfel_archiv` |
| Gipfel-Taten | ☄️ | Nicht anfassen (neu) | Sternenschmiede: dreimal das Risiko, Korrund besiegt | `tat_esse` ≥ 1 | `gipfel_esse` |
| Gipfel-Taten | ⛏️ | Sternenmetzger (neu) | Sternenschlund: dreimal das Risiko, Nyxar besiegt | `tat_schlund` ≥ 1 | `gipfel_schlund` |
| Gipfel-Taten | ✍️ | Pfandleiher des Jahres (neu) | Mondhof: dreimal das Risiko, Argentis besiegt | `tat_pfand` ≥ 1 | `gipfel_pfand` |
| Gipfel-Taten | 🕛 | Zeitumstellung (neu) | Morgentor: dreimal das Risiko, Sunna besiegt | `tat_uhr` ≥ 1 | `gipfel_uhr` |
| Gipfel-Taten | 🏮 | Mit blossen Händen (neu) | Erste Stadt: dreimal ins Wachfeuer gegriffen, Alruna besiegt | `tat_feuer` ≥ 1 | `gipfel_feuer` |
| Gipfel-Taten | 🏛️ | Abrissunternehmen (neu) | Pfeiler des Tages: alle drei Pfeiler gebrochen, Orm besiegt | `tat_pfeiler` ≥ 1 | `gipfel_pfeiler` |
| Gipfel-Taten | 🐲 | Hat alles (neu) | alle acht Gipfel-Taten | `tat_hort` + … + `tat_pfeiler` ≥ 8 | `gipfel_alle` |
| Gipfel-Taten | 🧾 | Kleingedrucktes (neu) | Mondhof: dreimal das Risiko, Argentis nicht besiegt | `tat_kleingedrucktes` ≥ 1 | `gipfel_kleingedrucktes` |
| Gipfel-Taten | 🧱 | Einsturzgefahr (neu) | Pfeiler des Tages: alle drei Pfeiler gebrochen, Orm nicht besiegt | `tat_einsturz` ≥ 1 | `gipfel_einsturz` |
| Sammeln | 🧩 | Komplett (neu) | ein Held trägt ein ganzes Dungeon-Set (3 Teile) | `ganze_sets` ≥ 1 | `ganzes_set` |
| Sammeln | 🎒 | Sammler (neu) | Helden tragen 3 verschiedene ganze Sets | `ganze_sets` ≥ 3 | `ganze_sets_3` |
| Sammeln | ⚒️ | Am Amboss (neu) | ein Set-Teil in der Schmiede verbessert | `schmiede_hoechste_stufe` ≥ 1 | `schmiede_1` |
| Sammeln | 💫 | Meisterstück (neu) | ein Set-Teil auf +5 geschmiedet | `schmiede_hoechste_stufe` ≥ 5 | `schmiede_5` |
| Sammeln | 📖 | Monsterkundler (neu) | 25 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 25 | `monsterbuch_25` |
| Sammeln | 📚 | Monstergelehrter (neu) | 50 Monster im Monsterbuch | `monsterbuch_entdeckt` ≥ 50 | `monsterbuch_50` |

Die Zahlen 16 und 2 (Sockel), 27 und 54 (Sterne) und +5 (Schmiede) kommen aus den Daten: ein Sockel je
Boss-Dungeon der Karte, bis Ebene 10 im Saal (`SAAL_SOCKEL`), ab Ebene 11 im Anbau (`ANBAU_SOCKEL`,
`ANBAU_AB_EBENE`), drei Sterne je Sockel in beiden, die Hälfte davon für «Glanz des Saals»,
`MAX_SCHMIEDE_STUFE`. Ein neuer Boss-Dungeon ab Ebene 13 ändert «Angebaut» und den Glanz mit; «Alle Sockel
voll» bleibt bei sechzehn, auch wer den Saal schon voll hatte, behält den Erfolg.

## Gipfel-Taten

- **Regel:** In den acht Dungeons über dem Vulkankern in allen drei festen Wahl-Räumen die erste Option (das
  Risiko) nehmen und den Boss besiegen (`dungeonBezwungen`). Ein Sieg am Rundenlimit zählt nicht, der Boss lebt.
- **Aus der Chronik gezählt** (`src/systems/GipfelTaten.ts`, am Ende in `finalizeExpeditionProgress`): Die Wahl
  steht nur dort, als Satz `nachklang.a` oder `nachklang.b`; ein eigenes Feld im Lauf gibt es nicht.
- Jede Tat setzt ihren Zähler auf 1, nie höher: Achtmal dieselbe Tat bringt nicht «Hat alles».
- **Kleingedrucktes:** Im Mondhof alle drei Pfandzettel unterschrieben, Argentis lebt: jeder Rückzug nach dem
  dritten Pfandzettel (am letzten Kontrollpunkt «Raum 15 von 16» oder im Bosskampf mit «Rückzug» statt
  «Kampf starten!»), Niederlage oder Rundenlimit (dann steht über der Bilanz «SIEG»).
- **Einsturzgefahr:** dasselbe bei den Pfeilern des Tages: alle drei Pfeiler gebrochen, Orm lebt. Wer bricht,
  holt Orms Wut auf Runde 4; die Tat ist also eher ein Unfall als ein Plan, darum steht sie neben «Kleingedrucktes».
- Die Bilanz zeigt bei diesen elf Erfolgen Name und Satz («🏅 Erfolg: Name – Beschreibung», `erfolgBilanzZeile`).
  Einen Hinweis in der Kopfzeile gibt es dafür nicht (Ende der Expedition, `hinweis: false`, wie unter
  «Wann geprüft wird»); dort steigt nur die Zahl am 🏅.
- Gezählt wird erst ab jetzt; frühere Läufe holt kein Spielstand nach.
- Wie schwer das ist: Spielweise «gierig» in `docs/NEUE-DUNGEONS.md`.

## Das System schaut zu (versteckte Erfolge)

Achtung, verrät sie. Bis zum Freischalten zeigt der Erfolge-Bildschirm statt Zeichen, Name, Beschreibung und Balken
nur 👁️, «???» und den Satz des Systems (`versteckt`, kursiv, gestrichelter Rand); danach ist die Karte wie jede
andere. Oben zählt `.erf-kopf` mit: «👁️ Das System verschweigt noch 7 Erfolge.» bis «… nichts mehr. Behauptet es.».
Die Bilanz zeigt Name und Satz wie bei den Gipfel-Taten, die Kopfzeile verrät nichts (nur die Zahl am 🏅).
Gezählt wird in `finalizeExpeditionProgress` (`versteckteTatenZaehlen`), jede Tat auf 1 und nur ab jetzt;
`albtraum_dungeons` kommt aus `state.haertegrade` und diesem Lauf, darum bringt ein älterer Spielstand mit drei
Albtraum-Dungeons «Schlafstörung» am Ende der nächsten Expedition. Rückzug zwischen den Runden: Der Kampf ist schon
ganz gerechnet; fällt darin ein Gegner, gibt es kein «Kalte Füsse». Der siebte kommt aus dem Raid: `ernstkampf`
zählt `raid_zu_viert` bei jedem Ernstkampf mit genau vier Helden (dem Mindestmass), Sieg oder nicht.

| Zeichen | Name | Tat | Zähler | ID |
|---|---|---|---|---|
| 🐔 | Kalte Füsse | Rückzug, bevor ein Gegner fiel (Vorschau des ersten Kampfs) | `kalte_fuesse` ≥ 1 | `kalte_fuesse` |
| 🤝 | Unentschieden | «Sieg» am Rundenlimit, der Boss lebt | `unentschieden` ≥ 1 | `unentschieden` |
| 😱 | Wörtlich genommen | Niederlage auf ☠ Albtraum | `woertlich_genommen` ≥ 1 | `woertlich_genommen` |
| 🛌 | Schlafstörung | drei verschiedene Dungeons auf ☠ Albtraum bezwungen | `albtraum_dungeons` ≥ 3 | `schlafstoerung` |
| 👤 | Keine Zeugen | Boss mit einem einzigen Helden besiegt | `keine_zeugen` ≥ 1 | `keine_zeugen` |
| 🩲 | Ohne Hose | Boss besiegt, ein Held trug keine Rüstung | `ohne_hose` ≥ 1 | `ohne_hose` |
| 4️⃣ | Zu viert | ein Ernstkampf im Raid mit genau vier Helden | `raid_zu_viert` ≥ 1 | `raid_zu_viert` |

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
- **Belohnung (7.11.2026):** Erfolge bringen Kristallsplitter (Abschnitt «Belohnung»), ältere Stände bekommen sie
  beim ersten Laden nachgezahlt. **Goldhamster** zählt jetzt alles Gold der Truhe: früher nur `goldEarned`, das
  Gold aus den Beutetabellen (`loot.gold`) fehlte. Texte von «Erster Kauf» (Händler in der Stadt) und «Ausbauer»
  (Gildenhaus zählt mit) sagen jetzt, was zählt.

## Ziele und Grenzen

`tests/erfolgeErreichbar.test.ts` spielt ein Musterspiel mit den echten Regeln (beim Händler kaufen, Bauen,
Ausbauen, Stadtweg, Anheuern, Expeditionen, Auftragsbrett, Schmiede, Rangliste), ohne einen Zähler von Hand
zu setzen: Eine starke Gilde schafft alle 66 Erfolge in 29 Tagen, 129 Expeditionen und 8 Ernstkämpfen im Raid
(Grenze im Test: unter 60 Tagen und unter 400 Expeditionen). Beim Anheuern nimmt sie auch jeden Lehrling auf,
sobald sein Meister Stufe 15 hat, und bringt ihn mit dem Lehrbuch hoch (zuerst die Meister, dann die Lehrlinge). Für die Schmiede nimmt sie das Teil, das bis +5 am
wenigsten Material braucht, alle Stufen zusammengezählt; bis zum Raid zählte der Test nur die nächste Stufe, dann
zog jedes neue Set-Teil vor, und «Meisterstück» kam erst nach 41 Tagen und 255 Expeditionen. In Wahl-Räumen nimmt sie immer das Risiko, für «Kleingedrucktes» kehrt sie einmal
im Mondhof am letzten Kontrollpunkt um, für «Einsturzgefahr» einmal bei den Pfeilern des Tages. Die versteckten holt `versteckteTaten()` mit sieben Expeditionen: an Tag 1
«Ohne Hose» (von selbst beim ersten Boss), «Kalte Füsse», «Keine Zeugen», «Unentschieden» und «Schlafstörung», an
Tag 2 «Wörtlich genommen» (ein frisch angeheuerter Held). Für «Unentschieden» kämpft der Guardian einmal ohne
Angriff (für eine Gruppe, die den Boss nicht klein kriegt). Im Raid (offen ab Tag 8) werden die Aufgestellten so stark
wie der Trupp; einmal kämpfen genau vier («Zu viert»), danach alle, bis Zenits Truhe in vier Wochen offen war. Nach
dem ersten Sieg ist Stufe II offen; dort kämpfen alle zehn (einer je Klasse), bis die dreizehnte Truhe in vier Wochen
offen war.
«Jeden Montag» braucht darum mindestens drei Wochen und einen Tag nach dem ersten Sieg; fehlt nur noch der Raid,
zieht die Gilde nicht mehr aus und wartet auf den Montag. Dazu hat
jeder Zähler eine Obergrenze aus den Daten, kein Ziel liegt darüber, und ein neuer Zähler braucht
dort eine Zeile.

- Bauten: 4 Neubauten (die Werkstätten) und 9 Ausbauten, also höchstens 13 für «Baumeister»; Werkstätten höchstens
  4 auf Stufe 3.
- Monsterbuch: In den Routen kommen etwa 65 verschiedene Gegner vor, darum höchstens 50 statt 75.
- Sets: 31 Dungeon-Sets; 3 ganze Sets gleichzeitig getragen statt 5.
- Trophäensaal: 16 Sockel im Saal und 2 im Anbau, je mit 3 Sternen.
- Gipfel-Taten und versteckte Erfolge: je Tat höchstens 1; Albtraum höchstens in allen 31 Dungeons der Karte.
- Was mit der Zeit wächst (Tage, Expeditionen, Gegner, Zettel, Pokale, Käufe, Ernstkämpfe im Raid), hat keine Grenze.

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
