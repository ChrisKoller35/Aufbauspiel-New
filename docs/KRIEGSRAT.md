# Kriegsrat – Probeläufe vor dem Aufbruch

Im Team-Bildschirm rechnet «🎲 Kriegsrat» die gewählte Expedition 20-mal durch und zeigt Siege,
Niederlagen, «Boss überlebt», den gefährlichsten Raum und Ø Gold (`src/systems/Kriegsrat.ts`, Fenster in
`src/ui/components/KriegsratFenster.ts`).

## Wie gerechnet wird
- Jeder Lauf auf einer eigenen Kopie des Spielstands (einmal `JSON.stringify`, je Lauf `JSON.parse`), mit
  `activeExpedition = null` und `rngSeed = 1000 + i × 7919`. Der echte Spielstand ändert sich nicht.
- Start wie der echte Aufbruch: gewählter Proviant als Liste an `startExpedition` (ohne Auswahl füllt
  es selbst aus dem Vorrat), dazu das Geschenk 1 Brot + 1 Heiltrank.
- Dann die Schleife aus `spieleRoute` (Musterlauf.ts) mit der Spielweise «klug»: Kontrollpunkte immer
  weiter, Händler überspringen, Wagnis nur ab 85 % Gruppenleben. Einen Rückzug wählt der Rat nie.
- Sieg heisst bezwungen (`gewonnen`). «Boss überlebt» (`amRundenlimit`): Nach 20 Kampfrunden steht der
  Boss noch. Das Spiel zeigt dann «SIEG!» und zahlt die Beute, der Boss öffnet aber keinen neuen Dungeon,
  und es gibt keine Trophäe. Das Fenster zeigt diese Zeile nur, wenn es vorkam.
- Gefährlichster Raum: der Raum, in dem die meisten nicht gewonnenen Läufe endeten (bei «Boss überlebt»
  der Bossraum), mit ihrer Zahl. Bei Gleichstand der spätere: Dorthin kommen weniger Läufe.

## Proviant-Regel
Vor jedem Kampfraum (Kampf, Boss, Befestigung: nur dort zeigt das Spiel die Kampf-Vorschau mit Proviant),
solange die Gruppe unter 50 % ihrer Leben ist, setzt der Rat den ersten Proviant mit Heilwirkung ein
(Brot 8, Heiltrank 15 Leben je Held), höchstens einen je Raum.

## Nicht eingerechnet
Stärkungs-Tränke (Krafttrank, Schnelligkeitstrank …), Manatrank und Fähigkeiten, die der Spieler im
Kampf selbst auslöst. Im Drachenhort («gut» mit Heldenwegen, 20 Läufe: 13 Siege, 7 Niederlagen, alle im
Bosskampf) setzt der Rat nur einmal Proviant ein; mit 5 Brot + 5 Heiltränken mehr bleibt es gleich. Ohne
Heldenwege (`musterStand('gut', 1, undefined, false)`, wie das Team im Probespiel `?probe`) sind es
1 Sieg und 19 Niederlagen.

## Zeit
Node 22, je 20 Läufe: mit «gut» ohne Sets höchstens 86 ms (Festung), mit «stark» und `pfand5` höchstens
53 ms (Morgentor: 8 Siege, 12 Niederlagen, gefährlichster Raum 16). Das Fenster rechnet in Häppchen von
höchstens 30 ms (`kriegsratLaeufe`, ein Lauf je Schritt) und zeigt dazwischen «Der Kriegsrat tagt … 7 von
20»; so bleibt der Browser auch auf langsamen Handys bedienbar, und Escape schliesst sofort.
