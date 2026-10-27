# Beutevergleich: grüner Pfeil in Truhe, Heldenfenster und Lager

Unter jedem Ausrüstungsteil, das einen Helden der Gilde stärker macht, steht in der Truhe
«⬆ Besser für Lia: ATK +12 · HP +30». Code: `src/systems/Beutevergleich.ts`, Anzeige über `truhenHinweise`.

- **Regel:** Mit dem Teil angelegt (Werte wie im Kampf: `getEffectiveStats` mit Schmiede-Stufen, Set-Boni, Weg)
  sinkt kein Wert (ATK, DEF, HP, SPD, CRIT, Krit-Schaden), keine Eigenschaft oder Set-Fähigkeit fällt weg,
  und mindestens ein Wert steigt oder eine Eigenschaft kommt dazu. Sonst steht nichts da.
- **Held:** Zugewinn = Summe der Anteile (Anstieg / Wert vorher) plus 1 je neue Eigenschaft. Es gilt der
  Held mit dem grössten Zugewinn (bei Gleichstand der erste der Gilde); «auch für 2 weitere» zählt den Rest.
- **Hände:** Platz nach `resolveEquipSlot` wie ANLEGEN. Eine Einhandwaffe wird in Haupt- und Nebenhand
  probiert (grösserer Zugewinn, bei Gleichstand die Haupthand), die Zeile nennt die Hand. Eine Zweihandwaffe
  leert die Nebenhand, ein Schild braucht eine Einhandwaffe.
- **Zählt nicht:** was schon im Lager liegt, Abwägungen (mehr ATK, aber weniger DEF: bleibt im Heldenfenster),
  Luft (`airBonus`) für Unterwasser-Dungeons.
- **Aufruf-Regel:** `truhenHinweise` vor dem Leeren von `state.activeExpedition` aufrufen (so macht es
  `finishExpedition` heute). Ohne viertes Argument nimmt es dessen Beute; ruft man es erst nach dem Leeren auf,
  fehlen die grünen Zeilen still. Ohne laufende Expedition die Beute als viertes Argument mitgeben.
- **Nebenhand mit Absicht:** Viele Zeilen gelten der Nebenhand. Eine leere Nebenhand zählt im Kampf voll,
  eine zweite Waffe oder ein Schild ist dort echter Gewinn (im Probespiel «sterne» haben Grimm und Sina sie leer).

Gemessen (26.10.2026, alle 138 Ausrüstungsteile aus `ITEM_DEFS`): im neuen Spiel (Guardian ohne Ausrüstung)
bekommen 120 die Zeile, in `?probe=sterne` 23, alle für die leere Nebenhand von Grimm oder Sina:
21 Einhandwaffen mit «(Nebenhand)», 2 Schilde (ohne Handangabe).

## Heldenfenster und Lager (dieselbe Regel)

- **Heldenfenster:** Teile im Inventar, die *diesen* Helden stärker machen, tragen oben rechts ein grünes ⬆ (`.besser-pfeil`,
  eine CSS-Form). Der Gewinn steht als letzte Zeile im `title`, nicht im `aria-label`: Vorleser lesen den `title` als
  Beschreibung nach dem Namen, und `tests/heldenfenster.test.ts` prüft das `aria-label` Zeichen für Zeichen. Ist ein Platz angetippt, gilt der Pfeil nur für ihn.
- **Nebenhand frei:** Ist die Nebenhand leer und macht sie ein Teil im Lager stärker, steht unter dem Bild «✋ Nebenhand frei» mit dem besten Teil.
  Antippen wählt die Nebenhand wie ihr Platz, öffnet das Inventar und holt es ins Bild. Neben Zweihandwaffen und ohne Einhandwaffe in der Haupthand nie.
- **Lager (Tab Inventar):** Je Held und Platz steht das Teil mit dem grössten Zugewinn vorne als breite Karte mit der grünen Zeile; sie nennt den
  Helden dieser besten Wahl (die Truhe kennt das Lager nicht und kann einen anderen nennen). Die übrigen besseren Teile tragen das ⬆, die Zeile im `title`.
  Grund (Thread, Musterspiel): gegen leere Nebenhände ist fast alles besser, sonst 17 Karten statt 3.
- **Leistung:** ein `vergleicher` je Held und Zeichnen, Werte vor Eigenschaften. Gemessen in `?probe=sterne` mit allen 138 Ausrüstungsteilen
  im Lager: Grimms Inventar 160 `getEffectiveStats` + 33 `getSpecialEffects`, das Lager 627 + 93 (2 Karten, 21 ⬆-Kacheln).
