# Geschichten der Dungeons

Wunsch (20.10.2026, über den Manager): Jeder Dungeon bekommt eine kurze Geschichte mit 2 bis 3 Entscheidungen
auf dem Weg, die Beute oder Gefahr verändern. Keine Zufalls-Witz-Ereignisse, Christoph will echte Story.
Erzählt wird sie von Ottokar, dem Stadtschreiber, der auch die Stadtchronik führt (`docs/STADTWEG.md`).

## Im Spiel

- **Erster Aufbruch** in einen Dungeon: Nach Team und Proviant kommt die Einleitung des Stadtschreibers, mit
  «ZURÜCK» (nichts passiert, die Einleitung kommt beim nächsten Versuch wieder) und «AUFBRECHEN». Erst danach
  gilt sie als gelesen und steht im Fenster der Dungeon-Karte («📜 Geschichte: …», zum Aufklappen).
- **Unterwegs**, nach bestimmten Räumen: eine Entscheidung mit zwei Knöpfen, unter jedem die Folgen
  (grün der Gewinn, rot die Gefahr). Der erste Knopf ist die vorsichtige Option, der zweite die mutige.
  Darüber steht das Leben der Gruppe, weil es für die Wahl zählt.
- **Beute einer mutigen Wahl** kommt erst, wenn die Gefahr überstanden ist: Macht die Option Gegner stärker,
  zahlt der letzte betroffene Kampf sie aus («+60 Gold nach dem Kampf», «nach 2 Kämpfen»), macht sie den Boss
  stärker, sein Tod («, wenn ihr siegt»; nicht nach dem Rundenlimit). Neben «Raum geschafft!» steht dann
  «📜 Beute aus der Geschichte: +60 Gold», bei Gegnern, die nach dem Rundenlimit noch stehen, dass sie liegen bleibt.
  Wer vorher umkehrt oder fällt, lässt sie ebenfalls liegen. So lässt sich die Beute nicht mitnehmen und die Gefahr auslassen.
- **Heiltränke und Luftkristalle** aus der Geschichte kommen in den Proviant und lassen sich gleich einsetzen;
  was übrig bleibt, geht nach dem Lauf ins Lager. Alles andere (Kräuter, Kristalle, Talisman-Fragmente …) kommt in die Beute.
- **Die Dungeons über dem Vulkankern** haben schon feste Wahl-Räume (Drachenhort: Hort-Gold, Himmelsarchiv: verbotene
  Bücher, Sternenschmiede: Sternenfeuer, Sternenschlund: gefangene Sterne, Mondhof: Pfandzettel, Morgentor: die
  Sonnenuhr). Dort erzählt die Geschichte über diese Räume, ohne zusätzliche Entscheidungen.
- **Nach der Expedition** steht im Bericht die Chronik: ein Satz zu jeder Entscheidung dieses Laufs. Nach dem
  ersten Sieg kommt der Schluss dazu, danach steht er auf der Karte («✓ erlebt»). Der Schluss passt zu jeder Wahl.
- **Expeditionsfenster:** Im Band über dem Team steht «📜 Geschichte: Titel · 3 Entscheidungen unterwegs».

Ein Bosskampf kann nach dem Rundenlimit ohne Sieger enden (`CombatEngine`, 20 Runden). Der Dungeon zählt dann
als geschafft, die Geschichte aber nicht als erlebt, und das versprochene Set-Teil gibt es nicht, weil der Boss
noch lebt (`dungeonBezwungen` in `src/models/ExpeditionRun.ts`).

## Wirkungen

| Wirkung | Im Spiel | Was passiert |
|---|---|---|
| `gold(60)` | +60 Gold | Kommt zur Beute des Laufs; mit Kampf-Gefahr erst danach (siehe oben) |
| `ding('healing_potion', 2)` | +2× Heiltrank | Heiltrank und Luftkristall in den Proviant, alles andere in die Beute; mit Kampf-Gefahr erst danach |
| `heilen(15)` | Alle +15 % Leben | Jeder lebende Held, höchstens bis zum vollen Leben |
| `leben(10)` | Alle −10 % Leben | Jeder lebende Held, nie das letzte Leben |
| `gegner(25)`, `gegner(20, 2)` | Gegner im nächsten Kampf 25 % stärker | Leben und Angriff der nächsten Kämpfe (ohne Boss); negativ = schwächer |
| `boss(15)` | Uralter Treant 15 % stärker | Leben und Angriff des Bosses; negativ = schwächer |
| `setTeil` | 🌳 +1 Set-Teil, wenn ihr siegt | Ein Teil des Dungeon-Sets mehr, zum gewöhnlichen Wurf dazu, nur mit besiegtem Boss. Beim ersten Sieg (da ist ein Teil ohnehin sicher) also zwei verschiedene |
| `xp(30)` | +30 XP für alle | Für jeden lebenden Helden |

Alle Wirkungen kommen ohne Zufall aus, die übrigen Würfe einer Expedition bleiben gleich.

## Eine Geschichte schreiben

- **Stimme:** Ottokar schreibt trocken und mit Witz, aber es muss etwas passieren: ein Ziel, ein Einsatz, ein Ende.
  Keine Zufalls-Witz-Ereignisse. Figuren aus der Stadt (Jorinde, die Bäckerin, der Glaser …) dürfen wiederkommen.
- **Schweizer Schreibweise:** «ss» statt «ß» (der Test prüft das).
- **Länge:** Einleitung etwa drei Sätze, Lage ein bis drei Sätze, Knopf wenige Worte, Nachklang ein Satz
  (in der Wir-Form, er steht in der Chronik), Schluss zwei bis drei Sätze. Der Schluss muss zu jeder Wahl passen.
- **Die echten Gegner:** Wer im Text droht, steht im Kampf, den die Wirkung trifft. Welche Gegner nach einem Raum
  kommen, steht in `src/data/routes.ts` (`encounters`, Index = Raum). Ein Bär im Text, ein Bär im Kampf.
- **Platz:** `nachRaum` ist der Index des Raums (0 = erster). Danach kommt ein Kampf, eine Befestigung, eine
  Gefahr oder ein Kontrollpunkt, nie der letzte Raum. Nach Raum 2, 5, 8 … folgt gleich der Kontrollpunkt-Dialog;
  das geht (Sumpfdorf), ist aber seltener schön.
- **Jede Gefahr trifft:** Nach der Entscheidung kommt noch ein Kampf (`gegner`, `leben`), für `boss` der Boss.
  `boss` nur in Dungeons mit Boss, `setTeil` nur mit Set. Heilung und Lebenskosten nie, wenn bis zum nächsten
  Kampf ein Rastplatz kommt: Dort ist eine Heilung fast nichts wert und ein Preis an Leben fast gratis
  (gemessen: unter 1 %). Statt Heilung gibt es dort Heiltränke für den Proviant, XP oder Gold (die Tests prüfen alles).
- **Vorsichtig** (`sicher`): etwas Gutes ohne Gefahr (XP, Gold, Gegenstände, Heilung) oder eine Schwächung:
  der Boss höchstens einmal je Geschichte und um höchstens 10 %, Gegner um höchstens 20 % (zwei Kämpfe: 10 %).
- **Mutig** (`mutig`): Beute (Gold, Gegenstände, +1 Set-Teil) und eine Gefahr, die zählt. Was zählt, zeigt die
  Eichung: In Dungeons mit Boss entscheiden frühe Kämpfe fast nichts, weil danach eine Rast kommt und der Boss
  den Lauf entscheidet. Dort trifft die Gefahr den Boss («der Golem spürte jeden Splitter») oder mehrere Kämpfe
  bis zum Engpass. Wo ein später Kampf der Engpass ist (Tiefe Ruinen: Raum 8 und 10), reichen kleine Zahlen.
  Richtwerte: nächster Kampf +15 bis 40 %, zwei bis drei Kämpfe +10 bis 30 %, Boss +5 bis 15 %.
- **Jede Entscheidung einzeln eichen:** «nur hier mutig» soll den Dungeon 3 bis 15 % schwerer machen, ein Set-Teil
  eher oben, Gold eher unten (`npm run geschichten-eichung -- einzeln 200 <Dungeon>`, siehe unten).

## Eichung

`npm run geschichten-eichung` misst die **Schwelle** des Musterteams «frisch»: den Gegner-Faktor (Leben und
Angriff aller Gegner), bis zu dem ein Lauf noch gewinnt. Jeder Lauf (Startwert) hat seine eigene Schwelle, gesucht
durch Halbierung zwischen 0,1 und 40; die Tabelle zeigt ihr geometrisches Mittel aus 200 Läufen. Gewonnen heisst
bis zum Ende, mit besiegtem Boss.

Warum nicht der Faktor für 50 % Siege (wie `npm run dungeon-eichung` und die erste Fassung hier): In manchen
Dungeons entscheidet derselbe Kampf fast alle Läufe beim selben Faktor. In den Tiefen Ruinen kippen Raum 8 und 10
zwischen Faktor 2,9 und 3,0 von 84 % auf 38 % Siege. Der 50-%-Faktor blieb dort gleich, auch wenn der Boss
30 % stärker wurde, und meldete «gratis». Das Mittel der Schwellen sieht jede Verschiebung, auch eine, die nur einen
Teil der Läufe trifft.

**Ganze Spielweisen:** ohne Entscheidungen, immer vorsichtig, immer mutig (Spielweise «gierig»).
Ziel: **vorsichtig 0 bis +12 %** (etwas leichter), **gierig −12 bis −25 %** (spürbar schwerer).
Stand 23.10.2026, 200 Läufe, nach Manager #43 und #44 (20 % Mindestschaden, stärkere Startklassen), nach der
Eichung der Wege (`docs/SPEZIALISIERUNG.md`) und mit den Werten echter Helden (`docs/AUSBILDUNG.md`, «Eichung
nach dem Umbau»). Die Dungeons über dem Vulkankern fehlen, sie haben keine eigenen Entscheidungen.

| Dungeon | Schwelle ohne Entscheidungen | vorsichtig | gierig |
|---|---|---|---|
| Waldpfad (kurz) | 7.69 | +0.0 % ✓ | −15.7 % ✓ |
| Verfallene Lichtung | 6.35 | +1.5 % ✓ | −15.7 % ✓ |
| Tiefwald (mittel) | 3.42 | +9.7 % ✓ | −18.7 % ✓ |
| Tiefe Höhle | 2.89 | +8.5 % ✓ | −23.6 % ✓ |
| Spinnenhöhle | 3.11 | +6.3 % ✓ | −16.4 % ✓ |
| Versunkene Küste | 4.11 | +2.1 % ✓ | −15.2 % ✓ |
| Geisterwald | 4.76 | +0.0 % ✓ | −24.5 % ✓ |
| Verschlungene Tunnel | 4.42 | +0.0 % ✓ | −18.1 % ✓ |
| Sumpfdorf | 5.08 | +0.0 % ✓ | −13.3 % ✓ |
| Giftsumpf | 2.28 | +6.4 % ✓ | −12.0 % ✓ |
| Alte Krypta | 2.30 | +3.6 % ✓ | −18.0 % ✓ |
| Die Stadtmauern | 2.46 | +10.0 % ✓ | −17.6 % ✓ |
| Abgrundtiefen | 1.56 | +5.0 % ✓ | −19.9 % ✓ |
| Kristallminen | 3.35 | +0.8 % ✓ | −20.6 % ✓ |
| Gefrorener Pass | 3.76 | +0.0 % ✓ | −17.6 % ✓ |
| Obsidiantunnel | 3.46 | +0.9 % ✓ | −15.7 % ✓ |
| Tiefe Ruinen | 2.92 | +1.1 % ✓ | −19.5 % ✓ |
| Vulkankern | 1.81 | +5.4 % ✓ | −14.8 % ✓ |
| Die Festung | 2.34 | +9.7 % ✓ | −19.9 % ✓ |
| Abyssale Tiefe | 2.66 | +1.8 % ✓ | −24.4 % ✓ |
| Schattenkatakomben | 3.16 | +4.0 % ✓ | −23.1 % ✓ |
| Aschewüste | 3.02 | +1.3 % ✓ | −15.7 % ✓ |
| Magmahöhlen | 2.92 | +8.4 % ✓ | −22.4 % ✓ |

**Jede Entscheidung einzeln** (`npm run geschichten-eichung -- einzeln`): immer vorsichtig, nur bei dieser
Entscheidung mutig. Ziel: **3 bis 15 % schwerer**. Die vorsichtige Option der anderen Entscheidungen zählt mit,
nach einer Änderung also den ganzen Dungeon nachmessen. Messrauschen etwa ±1,5 %.

| Dungeon | Entscheidung | nur hier mutig | |
|---|---|---|---|
| Waldpfad (kurz) | 1 «Die Spur» | −6.0 % | ✓ |
|  | 2 «Die Lichtung» | −10.2 % | ✓ |
| Verfallene Lichtung | 1 «Der Opferstein» | −6.0 % | ✓ |
|  | 2 «Die Platte» | −13.5 % | ✓ |
| Tiefwald (mittel) | 1 «Die Axt» | −8.8 % | ✓ |
|  | 2 «Der Schamane» | −8.0 % | ✓ |
|  | 3 «Die goldene Frucht» | −13.6 % | ✓ |
| Tiefe Höhle | 1 «Der Goblin-Stollen» | −3.6 % | ✓ |
|  | 2 «Der singende Kristall» | −12.5 % | ✓ |
|  | 3 «Die Fledermäuse» | −11.9 % | ✓ |
| Spinnenhöhle | 1 «Die Seidenfäden» | −3.8 % | ✓ |
|  | 2 «Die Brut» | −13.1 % | ✓ |
|  | 3 «Der Kokon» | −6.7 % | ✓ |
| Versunkene Küste | 1 «Das Wrack» | −8.7 % | ✓ |
|  | 2 «Die Glocke» | −11.4 % | ✓ |
| Geisterwald | 1 «Der Postsack» | −9.8 % | ✓ |
|  | 2 «Das Postamt» | −7.9 % | ✓ |
|  | 3 «Der Absender» | −12.5 % | ✓ |
| Verschlungene Tunnel | 1 «Die Wegweiser» | −8.4 % | ✓ |
|  | 2 «Der Vetter» | −9.8 % | ✓ |
| Sumpfdorf | 1 «Der Brautvater» | −8.3 % | ✓ |
|  | 2 «Das Fest» | −7.6 % | ✓ |
| Giftsumpf | 1 «Die Kräuterfrau» | −3.5 % | ✓ |
|  | 2 «Die Moorhexe» | −7.8 % | ✓ |
|  | 3 «Der Giftteich» | −8.0 % | ✓ |
| Alte Krypta | 1 «Die Grabräuber» | −4.1 % | ✓ |
|  | 2 «Der zerkratzte Stein» | −5.3 % | ✓ |
|  | 3 «Die Ehrenwache» | −7.4 % | ✓ |
| Die Stadtmauern | 1 «Der Steuereintreiber» | −6.2 % | ✓ |
|  | 2 «Die Kaserne» | −10.2 % | ✓ |
|  | 3 «Der Kommandant» | −13.3 % | ✓ |
| Abgrundtiefen | 1 «Die Luftblasen» | −4.4 % | ✓ |
|  | 2 «Der ertrunkene Ritter» | −7.9 % | ✓ |
|  | 3 «Das Gestohlene» | −11.2 % | ✓ |
| Kristallminen | 1 «Die Kristallader» | −8.7 % | ✓ |
|  | 2 «Der Stützbalken» | −9.4 % | ✓ |
|  | 3 «Die Bergleute» | −6.1 % | ✓ |
| Gefrorener Pass | 1 «Das Lagerfeuer» | −9.9 % | ✓ |
|  | 2 «Die Schneebrücke» | −7.4 % | ✓ |
| Obsidiantunnel | 1 «Der Glasgarten» | −11.8 % | ✓ |
|  | 2 «Die Glutkammer» | −8.2 % | ✓ |
| Tiefe Ruinen | 1 «Die Bibliothek» | −10.0 % | ✓ |
|  | 2 «Die Tintenquelle» | −7.7 % | ✓ |
|  | 3 «Die Krone» | −6.6 % | ✓ |
| Vulkankern | 1 «Die Schmiede der Zwerge» | −4.4 % | ✓ |
|  | 2 «Die Brüter» | −11.2 % | ✓ |
|  | 3 «Der Atem des Wyrms» | −10.2 % | ✓ |
| Die Festung | 1 «Die Vorräte» | −7.7 % | ✓ |
|  | 2 «Der Überläufer» | −10.0 % | ✓ |
|  | 3 «Der Herzstein» | −13.2 % | ✓ |
| Abyssale Tiefe | 1 «Der Anglerfisch» | −7.5 % | ✓ |
|  | 2 «Die Taucher» | −12.7 % | ✓ |
|  | 3 «Der Rausch» | −10.9 % | ✓ |
| Schattenkatakomben | 1 «Die Gläser» | −10.6 % | ✓ |
|  | 2 «Der Händler» | −10.4 % | ✓ |
|  | 3 «Die Klinge» | −11.5 % | ✓ |
| Aschewüste | 1 «Die Spur» | −3.2 % | ✓ |
|  | 2 «Die Wagen» | −9.5 % | ✓ |
|  | 3 «Der Heimweg» | −9.1 % | ✓ |
| Magmahöhlen | 1 «Der Zwergenweg» | −8.3 % | ✓ |
|  | 2 «Der Wächter der Esse» | −14.1 % | ✓ |
|  | 3 «Das ewige Feuer» | −13.9 % | ✓ |

Verlauf:
- 20.10., erste Fassung: zwei Schwächungen des Bosses in einer Geschichte oder eine um 15 % waren zu stark
  (Vulkankern +29 %, Abgrundtiefen +31 %), Gegner −20 % für zwei Kämpfe ebenso, zwei Kämpfe +30 % zu teuer (Tunnel −31 %).
- 20.10., nach der Gegenprüfung: Einzeln gemessen kosteten 19 mutige Optionen fast nichts (unter 3 %), etwa Leben
  vor einer Rast, frühe Kämpfe in Dungeons mit Boss oder die Unterschrift im Postamt, die das Spiel sogar leichter
  machte. «Um den See herum» (Magmahöhlen) war gefährlicher als die Kettenbrücke. 22 kosteten mehr als 15 %, bis
  27 % (Die Klinge). Heilungen direkt vor einem Rastplatz waren unter 1 % wert. Jetzt ist jede Entscheidung einzeln
  geeicht, die Gefahren treffen die Kämpfe, die zählen, und die Texte nennen die Gegner, die wirklich kommen.
- 21.10., nach Manager #43 und #44: Mit Mindestschaden und stärkeren Startklassen ist «frisch» stärker, die
  Schwellen stiegen (Stadtmauern und Festung mit den neuen Belagerungsgegnern von 0.95 und 0.62 auf über 2.4). Drei
  Entscheidungen lagen danach ausserhalb: Goblin-Stollen (−2.5 %) und Kokon (−2.9 %) kosteten zu wenig, der
  Kommandant (−15.6 %) zu viel. Jetzt macht der Boss dort 7 % statt 5 %, 12 % statt 10 % und 12 % statt 15 % stärker.
- 21.10., nach der Eichung der Wege: Die Wege von «frisch» (Phalanx, Zorn, Scharfschützin) sind unter Stufe 15
  schwächer geworden, die Schwellen sanken leicht (meist um 1 bis 3 %). Der Giftsumpf gierig lag danach bei
  −11.4 % (1000 Läufe), knapp zu wenig. Jetzt macht die Kräuterfrau die Hydra 8 % statt 5 % stärker: gierig
  −12.3 %, einzeln −4.6 / −7.7 / −8.6 %. Alles andere blieb im Ziel.
- 23.10., Musterteams mit den Werten echter Helden (neue Klassen-Boni, `docs/AUSBILDUNG.md`): In «frisch»
  (Stufe 10) hat Lia mehr Krit (24 statt 15 %), Grimm mehr Leben und weniger Angriff, Brom etwas weniger
  Angriff und Verteidigung. Die Schwellen änderten sich um höchstens 3,2 % (Vulkankern 1.87 → 1.81), die Spielweisen um höchstens 2,2
  Punkte (Vulkankern gierig −17.0 → −14.8 %), die einzelnen Entscheidungen um höchstens 2,0 Punkte (Atem des
  Wyrms −12.2 → −10.2 %). Alles blieb im Ziel, nachgezogen wurde nichts.

Ändern sich Gegner eines Dungeons (z. B. die Belagerung), seine Zeilen nachmessen.

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/dungeonGeschichten.ts` | Die Geschichten (`DUNGEON_GESCHICHTEN`), eine je Route |
| `src/systems/Geschichten.ts` | Wann eine Entscheidung ansteht, was sie bewirkt, Beute nach dem Kampf (`geschichtsBeuteNachKampf`), Chronik und Spielstand |
| `src/ui/components/GeschichtsAnzeige.ts`, `src/ui/html/geschichten.css` | Einleitung, Knöpfe mit Folgen, Chronik, Block auf der Karte |
| `src/ui/screens/CombatScreen.ts` | Beute aus der Geschichte beim Ergebnis des Kampfes (`istGeschichtsBeuteZeile`) |
| `src/systems/ExpeditionSystem.ts` | Entscheidung nach dem Raum (`processCurrentRoom`), Wirkung (`applyEncounterChoice`), Chronik (`resolveChoice`) |
| `src/main.ts` | Einleitung vor dem ersten Aufbruch (`startExpeditionFlow`), Entscheidungs-Fenster, Chronik im Bericht |
| `src/systems/DungeonSets.ts` | Das versprochene Set-Teil (`setBeute`) |
| `src/systems/Musterlauf.ts` | vorsichtig = sichere Option, gierig = mutige, klug = mutig ab 85 % Leben |
| `tools/geschichtenEichung.ts` | Die Eichung oben, ganze Spielweisen und jede Entscheidung einzeln |
| `tests/geschichten.test.ts` | Daten und Regeln |

Eine Entscheidung ist eine Begegnungs-Wahl (`ExpeditionRun.pendingChoice`) mit `effect: 'geschichte'`, Option A
ist die vorsichtige. Der Spielstand merkt sich `geschichten = { gelesen, erlebt }` (fehlt bei alten Spielständen,
keine neue SaveVersion), der Lauf `chronik`, `geschichtsBeute`, `setTeilVersprochen` und `setTeilExtra`. Die Texte liegen im Build
als eigene Datei (`vite.config.ts`), seit den Sternen-Dungeons auch die übrigen Spieldaten aus `src/data`, damit die
Warnung ab 500 kB weiter nur das Wachstum des Spielcodes zeigt.
