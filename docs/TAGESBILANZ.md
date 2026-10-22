# Tagesbilanz der Stadt

Was entsteht und was wird pro Tag (30 Sekunden, `TAG_SEKUNDEN`) verbraucht, wenn alles so weiterläuft wie jetzt?
Rechnung: `src/systems/Tagesbilanz.ts` (`tagesBilanz(state)`), Anzeige: Reiter «Produktion».

## Was gezählt wird

- **Gebäude mit festem Rezept** (ohne Auftragsliste): Ausgaben × `TAG_SEKUNDEN` / `zyklusSekunden` als erzeugt,
  die Zutaten ebenso als verbraucht. Stufe und Besetzung stecken in `zyklusSekunden` (Stufe 3 mit 3 Arbeitern = 3× so schnell).
- **Fehlende Zutaten zählen trotzdem.** So sieht man, wenn der Bedarf grösser ist als der Nachschub.
- **Bewohner** essen `brotProTag(Bewohner)` Brot.
- **Gold:** Steuern und Bank aus `EconomySystem.steuerRechnung`.

Je Ware gibt es `erzeugt`, `verbraucht`, `bilanz` und `posten` (woher die Zahlen kommen).

Beispiel: Farm, Mühle und Bäckerei mit je 1 Arbeiter und Brunnen:

| Ware | erzeugt | verbraucht | Bilanz |
|---|---|---|---|
| Getreide | Farm +6 | Mühle −5 | +1 |
| Mehl | Mühle +5 | Bäckerei −4,3 | +0,7 |
| Brot | Bäckerei +2,1 | Bewohner −`brotProTag` | je nach Bewohnern |

## Was nicht gezählt wird

- Gebäude mit Hindernis (`produktionsHindernis`): im Bau, Unwetter, nicht verbunden, kein Arbeiter, kein Wasser.
- Werkstätten mit Auftragsliste (`manualCraft`: Schmiede, Arkanschmiede, Kriegsmaschinen), ihre Aufträge sind einmalig.
- Handel und Expeditionen.
- Ertrags-Boni von Stadt-Ereignissen (`CityEventSystem.getProductionMultiplier`) und die Synergie nur, soweit sie in `zyklusSekunden` steckt.

## Anzeige

- Zeile «Pro Tag:» bei der Engpass-Leiste: ein Chip je Ware mit Bilanz ≠ 0 (gerundet auf eine Nachkommastelle), Gold zuerst.
  Rot bei minus, dazu «reicht N Tage» (Vorrat / Verbrauch, abgerundet). Maus darüber oder lange drücken zeigt die Posten.
- Lagerhaus-Karte: hinter jedem Vorrat klein die Tagesbilanz.
- Beides frischt sich mit der Mindmap jede halbe Sekunde auf (`aktualisiereProduktionTab`).
