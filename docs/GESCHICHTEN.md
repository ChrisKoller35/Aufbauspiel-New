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
  was übrig bleibt, geht nach dem Lauf ins Lager. Alles andere (Kräuter, Kristalle, Talismane …) kommt in die Beute.
- **Drachenhort und Himmelsarchiv** haben schon feste Wahl-Räume (Hort-Gold, verbotene Bücher). Dort erzählt
  die Geschichte über diese Räume, ohne zusätzliche Entscheidungen.
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
Stand 20.10.2026, 200 Läufe. Drachenhort und Himmelsarchiv fehlen, sie haben keine eigenen Entscheidungen.

| Dungeon | Schwelle ohne Entscheidungen | vorsichtig | gierig |
|---|---|---|---|
| Waldpfad (kurz) | 7.06 | +0.0 % ✓ | −15.5 % ✓ |
| Verfallene Lichtung | 5.74 | +2.0 % ✓ | −15.5 % ✓ |
| Tiefwald (mittel) | 3.22 | +9.4 % ✓ | −18.3 % ✓ |
| Tiefe Höhle | 2.73 | +8.4 % ✓ | −21.8 % ✓ |
| Spinnenhoehle | 3.25 | +4.1 % ✓ | −16.1 % ✓ |
| Versunkene Küste | 3.86 | +1.9 % ✓ | −15.9 % ✓ |
| Geisterwald | 4.35 | +0.0 % ✓ | −23.2 % ✓ |
| Verschlungene Tunnel | 4.34 | +0.0 % ✓ | −20.9 % ✓ |
| Sumpfdorf | 4.62 | +0.0 % ✓ | −12.2 % ✓ |
| Giftsumpf | 2.26 | +10.2 % ✓ | −15.4 % ✓ |
| Alte Krypta | 2.33 | +4.7 % ✓ | −18.7 % ✓ |
| Die Stadtmauern | 0.95 | +9.5 % ✓ | −15.1 % ✓ |
| Abgrundtiefen | 1.49 | +4.6 % ✓ | −20.0 % ✓ |
| Kristallminen | 3.35 | +0.0 % ✓ | −21.9 % ✓ |
| Gefrorener Pass | 3.77 | +0.0 % ✓ | −21.2 % ✓ |
| Obsidiantunnel | 3.53 | +0.0 % ✓ | −13.7 % ✓ |
| Tiefe Ruinen | 3.02 | +1.1 % ✓ | −20.5 % ✓ |
| Vulkankern | 1.91 | +5.2 % ✓ | −23.0 % ✓ |
| Die Festung | 0.62 | +9.4 % ✓ | −19.9 % ✓ |
| Abyssale Tiefe | 2.60 | +1.5 % ✓ | −24.0 % ✓ |
| Schattenkatakomben | 3.19 | +4.2 % ✓ | −22.4 % ✓ |
| Aschewüste | 3.07 | +0.6 % ✓ | −15.2 % ✓ |
| Magmahöhlen | 3.00 | +6.1 % ✓ | −23.7 % ✓ |

**Jede Entscheidung einzeln** (`npm run geschichten-eichung -- einzeln`): immer vorsichtig, nur bei dieser
Entscheidung mutig. Ziel: **3 bis 15 % schwerer**. Die vorsichtige Option der anderen Entscheidungen zählt mit,
nach einer Änderung also den ganzen Dungeon nachmessen. Messrauschen etwa ±1,5 %.

| Dungeon | Entscheidung | nur hier mutig | |
|---|---|---|---|
| Waldpfad (kurz) | 1 «Die Spur» | −7.1 % | ✓ |
|  | 2 «Die Lichtung» | −11.3 % | ✓ |
| Verfallene Lichtung | 1 «Der Opferstein» | −6.9 % | ✓ |
|  | 2 «Die Platte» | −15.0 % | ✓ |
| Tiefwald (mittel) | 1 «Die Axt» | −9.5 % | ✓ |
|  | 2 «Der Schamane» | −4.7 % | ✓ |
|  | 3 «Die goldene Frucht» | −13.4 % | ✓ |
| Tiefe Höhle | 1 «Der Goblin-Stollen» | −3.3 % | ✓ |
|  | 2 «Der singende Kristall» | −12.7 % | ✓ |
|  | 3 «Die Fledermäuse» | −12.7 % | ✓ |
| Spinnenhoehle | 1 «Die Seidenfäden» | −5.5 % | ✓ |
|  | 2 «Die Brut» | −11.2 % | ✓ |
|  | 3 «Der Kokon» | −3.4 % | ✓ |
| Versunkene Küste | 1 «Das Wrack» | −9.7 % | ✓ |
|  | 2 «Die Glocke» | −10.8 % | ✓ |
| Geisterwald | 1 «Der Postsack» | −10.2 % | ✓ |
|  | 2 «Das Postamt» | −5.1 % | ✓ |
|  | 3 «Der Absender» | −11.8 % | ✓ |
| Verschlungene Tunnel | 1 «Die Wegweiser» | −10.7 % | ✓ |
|  | 2 «Der Vetter» | −11.8 % | ✓ |
| Sumpfdorf | 1 «Der Brautvater» | −9.4 % | ✓ |
|  | 2 «Das Fest» | −6.5 % | ✓ |
| Giftsumpf | 1 «Die Kräuterfrau» | −4.2 % | ✓ |
|  | 2 «Die Moorhexe» | −9.0 % | ✓ |
|  | 3 «Der Giftteich» | −11.9 % | ✓ |
| Alte Krypta | 1 «Die Grabräuber» | −4.3 % | ✓ |
|  | 2 «Der zerkratzte Stein» | −9.4 % | ✓ |
|  | 3 «Die Ehrenwache» | −13.3 % | ✓ |
| Die Stadtmauern | 1 «Der Steuereintreiber» | −5.1 % | ✓ |
|  | 2 «Die Kaserne» | −7.1 % | ✓ |
|  | 3 «Der Kommandant» | −13.7 % | ✓ |
| Abgrundtiefen | 1 «Die Luftblasen» | −3.9 % | ✓ |
|  | 2 «Der ertrunkene Ritter» | −7.8 % | ✓ |
|  | 3 «Das Gestohlene» | −11.2 % | ✓ |
| Kristallminen | 1 «Die Kristallader» | −8.6 % | ✓ |
|  | 2 «Der Stützbalken» | −7.0 % | ✓ |
|  | 3 «Die Bergleute» | −5.3 % | ✓ |
| Gefrorener Pass | 1 «Das Lagerfeuer» | −10.9 % | ✓ |
|  | 2 «Die Schneebrücke» | −10.4 % | ✓ |
| Obsidiantunnel | 1 «Der Glasgarten» | −12.0 % | ✓ |
|  | 2 «Die Glutkammer» | −6.7 % | ✓ |
| Tiefe Ruinen | 1 «Die Bibliothek» | −11.5 % | ✓ |
|  | 2 «Die Tintenquelle» | −7.9 % | ✓ |
|  | 3 «Die Krone» | −6.8 % | ✓ |
| Vulkankern | 1 «Die Schmiede der Zwerge» | −4.2 % | ✓ |
|  | 2 «Die Brüter» | −12.8 % | ✓ |
|  | 3 «Der Atem des Wyrms» | −13.6 % | ✓ |
| Die Festung | 1 «Die Vorräte» | −7.5 % | ✓ |
|  | 2 «Der Überläufer» | −8.4 % | ✓ |
|  | 3 «Der Herzstein» | −12.6 % | ✓ |
| Abyssale Tiefe | 1 «Der Anglerfisch» | −8.6 % | ✓ |
|  | 2 «Die Taucher» | −12.8 % | ✓ |
|  | 3 «Der Rausch» | −10.0 % | ✓ |
| Schattenkatakomben | 1 «Die Gläser» | −10.9 % | ✓ |
|  | 2 «Der Händler» | −9.3 % | ✓ |
|  | 3 «Die Klinge» | −12.2 % | ✓ |
| Aschewüste | 1 «Die Spur» | −6.1 % | ✓ |
|  | 2 «Die Wagen» | −10.8 % | ✓ |
|  | 3 «Der Heimweg» | −8.8 % | ✓ |
| Magmahöhlen | 1 «Der Zwergenweg» | −7.8 % | ✓ |
|  | 2 «Der Wächter der Esse» | −12.5 % | ✓ |
|  | 3 «Das ewige Feuer» | −13.2 % | ✓ |

Verlauf:
- 20.10., erste Fassung: zwei Schwächungen des Bosses in einer Geschichte oder eine um 15 % waren zu stark
  (Vulkankern +29 %, Abgrundtiefen +31 %), Gegner −20 % für zwei Kämpfe ebenso, zwei Kämpfe +30 % zu teuer (Tunnel −31 %).
- 20.10., nach der Gegenprüfung: Einzeln gemessen kosteten 19 mutige Optionen fast nichts (unter 3 %), etwa Leben
  vor einer Rast, frühe Kämpfe in Dungeons mit Boss oder die Unterschrift im Postamt, die das Spiel sogar leichter
  machte. «Um den See herum» (Magmahöhlen) war gefährlicher als die Kettenbrücke. 22 kosteten mehr als 15 %, bis
  27 % (Die Klinge). Heilungen direkt vor einem Rastplatz waren unter 1 % wert. Jetzt ist jede Entscheidung einzeln
  geeicht, die Gefahren treffen die Kämpfe, die zählen, und die Texte nennen die Gegner, die wirklich kommen.

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
als eigene Datei (`vite.config.ts`), damit die Warnung ab 500 kB weiter nur das Wachstum des Spielcodes zeigt.
