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
- **Lager:** `truhenHinweise` allein kennt das Lager nicht. Die Truhe im Spiel gleicht aber ab: Ihre grüne Zeile
  und der Knopf kommen aus `TruheAnlegen` (`besserFuerAlle` über Lager ∪ Truhe, siehe «Gleich anlegen aus der Truhe»).
- **Zählt nicht:** Abwägungen (mehr ATK, aber weniger DEF: bleibt im Heldenfenster),
  Luft (`airBonus`) für Unterwasser-Dungeons.
- **Aufruf-Regel:** `truhenHinweise` vor dem Leeren von `state.activeExpedition` aufrufen (so macht es
  `finishExpedition` heute). Ohne viertes Argument nimmt es dessen Beute; ruft man es erst nach dem Leeren auf,
  fehlen die grünen Zeilen still. Ohne laufende Expedition die Beute als viertes Argument mitgeben.
- **Nebenhand mit Absicht:** Viele Zeilen gelten der Nebenhand. Eine leere Nebenhand zählt im Kampf voll,
  eine zweite Waffe oder ein Schild ist dort echter Gewinn (im Probespiel «sterne» haben Grimm und Sina sie leer).

Gemessen (26.10.2026, alle 138 Ausrüstungsteile aus `ITEM_DEFS`): im neuen Spiel (Guardian ohne Ausrüstung)
bekommen 120 die Zeile, in `?probe=sterne` 23, alle für die leere Nebenhand von Grimm oder Sina:
21 Einhandwaffen mit «(Nebenhand)», 2 Schilde (ohne Handangabe).

## Gleich anlegen aus der Truhe

Code: `src/ui/components/TruheAnlegen.ts`, Tests: `tests/truheAnlegen.test.ts`.

- **Regel:** Der Knopf «‹Held›: anlegen» steht in der Karte nur, wenn das Teil über Lager ∪ Truhe die beste Wahl ist
  (`besserFuerAlle(...).besteWahl`, wie die breite Karte im Lager), nie nach `besserFuer` allein: In alten Dungeons
  legte er sonst das Schlechtere an. Er nennt den Helden dieser besten Wahl.
- **Sonst:** unter der grünen Zeile «Noch besser für Sina: Wyrmzahnklinge (im Lager)» bzw. «(in der Truhe)»: gleicher Held
  und Platz, grösster Zugewinn (`nochBesserAls`). Hellgelb #fde68a auf #111828, Kontrast etwa 13 : 1.
- **Nach jedem Anlegen** rechnet die Truhe alle Karten neu. Angelegte Teile zeigen «✓ Grimm trägt es jetzt», ihre grüne
  Zeile verschwindet. Bei zwei Stück bekommt erst der beste Held eins, dann der nächste (Knopf «Sina: anlegen»).
- **Expedition:** Die Beute kommt erst nach «Einsammeln» ins Lager (`beuteEinlagern` in `applyLootAndFinish`).
  `anlegen` legt ein Stück aus `loot` ins Lager, legt an (`equip`) und zieht es von `loot` ab, sonst läge es doppelt
  vor. Misslingt `equip`, wird das Einlagern zurückgenommen. Während dieser Truhe kein `mc:speichern`: Der Spielstand
  hätte weder Expedition noch Beute. Erfolge prüft `applyLootAndFinish` wie bisher, danach speichert es.
- **Ruhmestruhe:** Die Beute liegt schon im Lager (`belohnungenAbholen` vor der Truhe). Angelegt wird direkt aus dem
  Lager, höchstens so viele Stücke, wie die Truhe gebracht hat. Nach dem Schliessen `erfolgePruefen(state)` (wie ANLEGEN
  im Heldenfenster) und `mc:speichern`.
- **Raid (Zenits Truhen):** wie die Ruhmestruhe, die Beute legt `truheZiehen` schon im Ernstkampf ins Lager
  (`RaidScreen.nachDemKampf`). Wurde etwas angelegt: `erfolgePruefen`, speichern und den Raid-Bildschirm neu zeichnen
  (neue Werte auf der Bank, der Kriegsrat davor gilt nicht mehr).
- **Tasten:** Die Truhe ist modal wie ein Fenster (`bindeFensterTasten`): Escape überspringt das Video und sammelt
  danach ein, Tab bleibt in der Truhe, die Tastenkürzel dahinter (Escape ins Hauptmenü, K, A, G) kommen nicht durch.
  Der Fokus liegt in der Truhe, mit der Beute auf «Einsammeln».
- **Sperre:** Ein zweites Anlegen innerhalb von 600 ms (`ANLEGEN_SPERRE_MS`) gibt `false`. Die Sperre liegt im Modul,
  nicht im DOM, und ist mit Fake-Timern getestet.
- **Knopf:** mindestens 44 px hoch bei `pointer: coarse`, 32 px am PC, in der Karte (nicht im Fuss), Name über `escapeAttr`.

## Heldenfenster und Lager (dieselbe Regel)

- **Heldenfenster:** Teile im Inventar, die *diesen* Helden stärker machen, tragen oben rechts ein grünes ⬆ (`.besser-pfeil`,
  eine CSS-Form). Der Gewinn steht als letzte Zeile im `title`, nicht im `aria-label`: Vorleser lesen den `title` als
  Beschreibung nach dem Namen, und `tests/heldenfenster.test.ts` prüft das `aria-label` Zeichen für Zeichen. Ist ein Platz angetippt, gilt der Pfeil nur für ihn.
- **Nebenhand frei:** Ist die Nebenhand leer und macht sie ein Teil im Lager stärker, steht unter dem Bild «✋ Nebenhand frei» mit dem besten Teil.
  Antippen wählt die Nebenhand wie ihr Platz, öffnet das Inventar und holt es ins Bild. Neben Zweihandwaffen und ohne Einhandwaffe in der Haupthand nie.
  Ins Bild holen heisst ein gezieltes `scrollTo` (`inventarInsBild` in `HeroesScreen.ts`): Das Inventar kommt unten ganz ins
  Bild. Läge der eben erschienene Kasten «Nebenhand: leer …» dann im Streifen des klebenden ✕ (oberste 60 px), scrollt das
  Fenster weiter, bis er ganz weg ist; der Kopf des Inventars sagt dasselbe. Am Handy 390 × 844 vorher: Kasten bei y = 26–80
  unter dem ✕ (18–62), «leuchten» verdeckt; nachher scrollTop 339, Kasten über dem Rand, Inventar bis y = 764.
- **Lager (Tab Inventar):** Je Held und Platz steht das Teil mit dem grössten Zugewinn vorne als breite Karte mit der grünen Zeile; sie nennt den
  Helden dieser besten Wahl (die Truhe kennt das Lager nicht und kann einen anderen nennen). Die übrigen besseren Teile tragen das ⬆, die Zeile im `title`.
  Grund (Thread, Musterspiel): gegen leere Nebenhände ist fast alles besser, sonst 17 Karten statt 3.
- **Lager antippbar:** Kacheln mit ⬆ und die Karten sind `<button type="button">` (`data-lager-teil`, `data-held`, `data-platz` aus
  der grünen Zeile), alle anderen bleiben `<div>`. Name (`aria-label`) wie im Heldenfenster («Wyrmzahnklinge, 2 Stück»), der `title`
  endet mit der grünen Zeile, auch bei der Karte. Antippen öffnet das Heldenfenster dieses Helden (`oeffneAusLager`): Inventar
  offen, das Teil für den Platz der Zeile gewählt, Fokus auf dem Teil (nicht auf ANLEGEN), ANLEGEN im Bild; so sind es 2 Tipps bis
  angelegt, mit dem ganzen +/−-Vergleich. Schliessen zeichnet das Lager neu (keine veraltete ⬆), Fokus auf die Kachel oder den Reiter.
  `button.inv-cell` setzt Schrift, Farbe, Ausrichtung, Breite und Rand der Browser-Knöpfe zurück, das Aussehen bleibt gleich.
- **Leistung:** ein `vergleicher` je Held und Zeichnen, Werte vor Eigenschaften. Gemessen in `?probe=sterne` mit allen 138 Ausrüstungsteilen
  im Lager: Grimms Inventar 160 `getEffectiveStats` + 33 `getSpecialEffects`, das Lager 627 + 93 (2 Karten, 21 ⬆-Kacheln).
