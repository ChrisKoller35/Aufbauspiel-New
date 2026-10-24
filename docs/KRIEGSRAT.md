# Kriegsrat – Probeläufe vor dem Aufbruch

Im Team-Bildschirm rechnet «🎲 Kriegsrat» die gewählte Expedition 20-mal durch und zeigt Siege,
Niederlagen, Rückzüge, den gefährlichsten Raum und Ø Gold (`src/systems/Kriegsrat.ts`, Fenster in
`src/ui/components/KriegsratFenster.ts`).

## Wie gerechnet wird
- Jeder Lauf auf einer eigenen Kopie des Spielstands (`JSON.parse(JSON.stringify(state))`), mit
  `activeExpedition = null` und `rngSeed = 1000 + i × 7919`. Der echte Spielstand ändert sich nicht.
- Start wie der echte Aufbruch: gewählter Proviant als Liste an `startExpedition` (ohne Auswahl füllt
  es selbst aus dem Vorrat), dazu das Geschenk 1 Brot + 1 Heiltrank.
- Dann die Schleife aus `spieleRoute` (Musterlauf.ts) mit der Spielweise «klug»: Kontrollpunkte immer
  weiter, Händler überspringen, Wagnis nur ab 85 % Gruppenleben.
- Gefährlichster Raum: der Raum, in dem die meisten nicht gewonnenen Läufe endeten.

## Proviant-Regel
Vor jedem Raum, solange die Gruppe unter 50 % ihrer Leben ist, setzt der Rat den ersten Proviant mit
Heilwirkung ein (Brot 8, Heiltrank 15), höchstens einen je Raum.

## Nicht eingerechnet
Stärkungs-Tränke (Krafttrank, Schnelligkeitstrank …), Manatrank und Fähigkeiten, die der Spieler im
Kampf selbst auslöst. Rückzug an Kontrollpunkten wählt der Rat nie. Bei Helden mit vielen hundert Leben
kippen Brot und Heiltrank selten einen Lauf: Im Drachenhort («gut», 20 Läufe) setzt der Rat 8-mal
Proviant ein, mit oder ohne 5 Brot + 5 Heiltränke mehr bleibt es bei 13 Siegen und 7 Niederlagen.

## Zeit (Node 22, gemessen)
Schwerste Route Morgentor, Team «stark» mit Sets `pfand5`: 20 Läufe in 28–46 ms (8 Siege,
12 Niederlagen, gefährlichster Raum 16). Mit «gut» ohne Sets endet jeder Lauf schon in Raum 1 (5 ms).
Langsamste Route für «gut»: Drachenhort, 47 ms. Das Fenster rechnet deshalb in einem Stück.
