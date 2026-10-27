# Kriegsrat – Probeläufe vor dem Aufbruch

Im Team-Bildschirm rechnet «🎲 Kriegsrat» die gewählte Expedition 20-mal durch und zeigt Siege,
Niederlagen, «Boss überlebt», den gefährlichsten Raum, Ø Gold, Ø Leben am Ende, die Entscheidungen unterwegs,
Beute und Helden (`src/systems/Kriegsrat.ts`, `src/systems/KriegsratVorschau.ts`, Fenster in
`src/ui/components/KriegsratFenster.ts`).

## Beute und Helden
Nach jedem Lauf rechnet die Kopie dieselben Funktionen in derselben Reihenfolge wie `finishExpedition`:
`setBeute`, `schmiedeBeute`, `albtraumBeute` (nur nach einem bezwungenen ☠ Albtraum mit Boss), dann die XP wie
`finalizeExpeditionProgress` (`awardXP` auf den Helden der Kopie).
- **Beute:** in wie vielen Läufen ein Set-Teil fällt (und wie viele Teile die Gilde schon hat), Ø Schmiede-Material
  und Kristallsplitter, die drei wichtigsten Ausrüstungen ohne Set-Teile. «(neu)»: Die Gilde hat sie weder im Lager
  noch an einem Helden; diese stehen zuerst, dann die in den meisten Läufen.
- **Helden:** Ø XP, in wie vielen Läufen der Held aufsteigt (sonst wie viel XP fehlen, auf Stufe 15 Überschuss
  fürs Lehrbuch) und wie oft er fällt. Läufe mit «Boss überlebt» bringen wie im Spiel Beute und +10 XP.
- Ø Gold zählt wie die Truhe das Gold aus der Beute mit (Drachenhort «gut»: 578 statt 519).

## Wie gerechnet wird
- Jeder Lauf auf einer eigenen Kopie des Spielstands (einmal `JSON.stringify` beim Klick, je Lauf `JSON.parse`),
  mit `activeExpedition = null` und `rngSeed = 1000 + i × 7919`. Der echte Spielstand ändert sich nicht, und was
  die Stadt während des Rechnens tut, ändert das Ergebnis nicht.
- Start wie der echte Aufbruch: gewählter Härtegrad und Proviant als Liste an `startExpedition` (ohne Auswahl füllt
  es selbst aus dem Vorrat), dazu das Geschenk 1 Brot + 1 Heiltrank.
- Dann die Schleife aus `spieleRoute` (Musterlauf.ts) mit der Spielweise «klug»: Kontrollpunkte immer
  weiter, Händler überspringen, Wagnis nur ab 85 % Gruppenleben. Einen Rückzug wählt der Rat nie.
- Entscheidungen unterwegs (Geschichte und Fundstätten; am Rastplatz rastet der Rat immer): Das Fenster zählt,
  wie oft er das Wagnis nahm und wie oft die sichere Wahl, denn Beute und XP hängen daran. Bei der Geschichte
  bringt das Wagnis immer Gold, Gegenstände oder ein Set-Teil (oft mit stärkeren Gegnern), die sichere Option XP,
  Heilung oder schwächere Gegner. Geisterwald mit `?probe` (Brom, Grimm, Lia, Sina): 80-mal das Wagnis, Ø 25 XP je
  Held; mit der sicheren Option bei jeder Entscheidung der Geschichte wären es Ø 120.
- Sieg heisst bezwungen (`gewonnen`). «Boss überlebt» (`amRundenlimit`): Nach 20 Kampfrunden steht der
  Boss noch. Das Spiel zeigt dann «SIEG!» und zahlt die Beute, der Boss öffnet aber keinen neuen Dungeon,
  und es gibt keine Trophäe. Das Fenster zeigt diese Zeile nur, wenn es vorkam.
- Gefährlichster Raum: der Raum, in dem die meisten nicht gewonnenen Läufe endeten (bei «Boss überlebt»
  der Bossraum), mit ihrer Zahl. Bei Gleichstand der spätere: Dorthin kommen weniger Läufe.

## Härtegrad
Der Rat rechnet auf dem Grad, mit dem «EXPEDITION STARTEN» aufbrechen würde (`gewaehlterHaertegrad`); der Titel
nennt ihn ausser bei Normal («🎲 Kriegsrat: Der Drachenhort · ☠ Albtraum»). Gegner, Material und Set-Chance folgen
`run.difficulty` wie beim echten Aufbruch. Je 20 Läufe, `musterStand('stark', 1, 'sterne3')` wie `?probe=sterne` (Brom, Grimm, Lia, Sina, ohne Proviant):

| Dungeon, Grad | Siege | Ø Leben | Läufe mit Set-Teil | Ø Material |
|---|---|---|---|---|
| Drachenhort, Normal / ⚔ Schwer / ☠ Albtraum | 20 / 20 / 19 | 83 / 68 / 32 % | 9 / 16 / 19 | 7 / 11 / 14 Drachenschuppe |
| Himmelsarchiv, Normal / ⚔ Schwer / ☠ Albtraum | 20 / 14 / 0 | 61 / 20 / 0 % | 20 / 14 / 0 | 8 / 10 / 8 Himmelstinte |

Eine Niederlage bringt die Hälfte des Materials nach geschafften Räumen; der Raum, in dem die Gruppe fällt, zählt
mit (`processCurrentRoom` setzt `completed` vor der Prüfung auf Niederlage), und ×1,5 bzw. ×2 gelten auch dann.
Auf Albtraum bringt im Himmelsarchiv eine Niederlage im Bossraum 8 Himmelstinte, so viel wie ein Sieg auf Normal;
ohne einen Sieg sind es Ø 8.
Nach einem bezwungenen ☠ Albtraum zählt der Rat den Wurf mehr auf die Boss-Beute mit (`albtraumBeute`,
docs/HAERTEGRADE.md): Drachenhort ☠ Ø Gold 1032 statt 822 ohne diesen Wurf (Normal 907), Ø Kristallsplitter 11
statt 10. Bei «Boss überlebt» gibt es keine Albtraum-Beute, und die Punkte zählen wie auf Normal.

## Der letzte Rat
Unter «🎲 Kriegsrat» steht der letzte fertige Rat («Letzter Rat · ☠ Albtraum: 19 Siege · 1 Niederlage»), solange
`kriegsratSchluessel` gleich bleibt: der erste Probelauf gleich nach dem Start, ohne die Kennungen der Gegner. Darin
stehen Dungeon, Grad, die Helden in ihrer Reihenfolge mit allen Werten (Stufe, Ausrüstung, Weg, Sets,
Schmiede-Stufen), die Gegner, der Proviant und die Kriegsmaschine. Ändert sich davon etwas, verschwindet die Zeile,
auch wenn nur die Reihenfolge wechselt (Drachenhort Albtraum rückwärts: 18 statt 19 Siege) oder Brom seinen
Talisman ablegt (4 Siege). Gold, Tag und XP unter der nächsten Stufe ändern ihn nicht. Ohne Auswahl nimmt der Start
den Proviant aus dem Vorrat, bis zu 4 Sorten zu je höchstens 3: 30 Brot im Lager statt 5 ändern nichts, 1 Brot
schon. Gemerkt wird nur der letzte Rat und nur im Speicher der Seite, nicht im Spielstand; schliesst das Fenster
vor dem Ende, merkt es nichts.

## Proviant-Regel
Vor jedem Kampfraum (Kampf, Boss, Befestigung: nur dort zeigt das Spiel die Kampf-Vorschau mit Proviant),
solange die Gruppe unter 50 % ihrer Leben ist, setzt der Rat den ersten Proviant mit Heilwirkung ein
(Brot 8, Heiltrank 15 Leben je Held), höchstens einen je Raum.

Was der Proviant am Ausgang ändert, je 20 Läufe: Drachenhort mit `?probe` (Brom, Grimm, Lia, Sina, ohne
Heldenwege) ohne Auswahl 1 Sieg (17-mal eingesetzt), mit 5 Heiltränken 3 Siege (18-mal), mit 5 Brot 1 Sieg.
Oft ändert er nichts: Drachenhort «gut» mit Heldenwegen (13 Siege, 7 Niederlagen, alle im Bosskampf) setzt ihn nur
einmal ein, vor den Kämpfen ist die Gruppe kaum je unter halben Leben; mit 5 Brot und 5 Heiltränken mehr bleibt
es gleich. Sternenschlund («stark», `sterne3`): nur das Geschenk 39-mal, mit 10 Heiltränken 48-mal, kein Sieg.

## Nicht eingerechnet
Stärkungs-Tränke (Krafttrank, Schnelligkeitstrank …), Manatrank und Fähigkeiten, die der Spieler im
Kampf selbst auslöst.

## Zeit
Node 22, je 20 Läufe: mit «gut» ohne Sets höchstens 86 ms (Festung), mit «stark» und `pfand5` höchstens
53 ms (Morgentor: 8 Siege, 12 Niederlagen, gefährlichster Raum 16). Beute und Helden kosten je 20 Läufe
0,6–1,1 ms dazu (Node 22.23, Morgentor, Festung, Drachenhort). Das Fenster rechnet in Häppchen
(`rechneImHintergrund`, `haeppchenweise`, `rechneHaeppchen`): Schritt für Schritt (`kriegsratLaeufe`: der Start
eines Laufs, dann ein Raum, eine Wahl, ein Kontrollpunkt oder ein Händler je Schritt), bis 30 ms um sind; der
letzte Schritt rechnet noch fertig, ein Häppchen dauert also 30 ms plus einen Schritt. Das erste Häppchen rechnet
nur den Start des ersten Laufs. Dazwischen zeigt es «Der Kriegsrat tagt … 7 von 20» (fertige Läufe); so bleibt der
Browser auch auf langsamen Handys bedienbar, und Escape schliesst sofort. Gemessen in Chromium mit 6-fach
gedrosseltem Prozessor, beim ersten Kriegsrat nach dem Laden der Seite: Der erste Kampfraum ist dann ein einzelner
Schritt über 30 ms und füllt sein Häppchen allein (30–52 ms). Die übrigen Häppchen dauern 30 ms plus einen Schritt,
einzelne bis gut 60 ms, unter Last bis rund 100 ms; der Klick zum Öffnen sperrt in einem Drittel der Läufe 51–98 ms
am Stück.
