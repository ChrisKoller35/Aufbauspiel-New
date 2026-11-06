# Raid «Über dem Tag»

Ganz oben über der Dungeon-Karte, über den Pfeilern des Tages, hängt Zenit, das Uhrwerk. Der Raid ist ein
einziger grosser Kampf für 4 bis 10 Helden auf einem Feld aus 3 Reihen und 6 Spalten, in zwei Trupps geteilt.
Zenit zielt nicht auf Helden, er trifft Orte: das Pendel die vorderste Reihe eines Trupps, der Zeiger eine Spalte,
die Glocke die vollste Reihe, die Funken den besten Schadensmacher und seine Nachbarn. Die Aufstellung ist das
Spiel: Dieselbe Gilde gewinnt mit der naheliegenden «Lehrbuch»-Aufstellung nie und mit der besten gefundenen fast
immer. Diese Datei hält fest, wie der Kampf rechnet, was eine Woche bringt, was Alrunas Liste und der Kriegsrat
sagen und wie Zenit geeicht ist. Stand 6.11.2026.

Der Raid ist kein Dungeon (`RouteDef`) und Zenit kein Gegner (`EnemyDef`): Sets, Trophäensaal, Monsterbuch, Klang,
Rangliste und Härtegrade hängen nicht daran. `raidKampf` benutzt den Grundangriff, die Regeneration und die
Kampfeffekte des normalen Kampfs, aber mit Orten statt Zielen.

## So wirkt es im Spiel

- **Offen**, sobald die Pfeiler des Tages einmal bezwungen sind (`raidOffen`; ein «Sieg» am Rundenlimit, bei dem
  Orm noch steht, zählt nicht).
- **Erster Besuch:** Alle Helden stehen schon auf dem Feld, so wie sie in der Gilde stehen: vorne voll, dann die
  Mitte (`startAufstellung`). Das ist absichtlich nicht gut. Alrunas Liste hat dazu viel zu sagen, und der erste
  Kriegsrat zeigt bei der Muster-Gilde 0 von 20.
- **Aufstellen:** Held wählen, Feld wählen; steht dort schon jemand, tauschen die beiden. Alrunas Liste rechnet bei
  jeder Änderung neu.
- **Kriegsrat:** 20 Proben mit festen Samen, frei und beliebig oft. Er ändert nichts und gibt nichts.
- **Ernstkampf:** drei je Woche frei, jeder weitere kostet 10 Tagstein. Er wird beim Klick gerechnet und sofort
  gebucht (Versuch, Kosten, Bestversuch, XP, Zähler, Truhen, Erfolge); die Wiedergabe zeigt danach nur, was geschah.
  Wer sie verlässt oder neu lädt, verliert und gewinnt nichts.
- **Truhen:** je Woche einmal «Was vom Pendel fiel» (Zenit unter 50 %) und einmal «Zenits Truhe» (Sieg), zum ersten
  Sieg überhaupt dazu der Schmuck «Die Unruh».
- **Montag:** drei neue freie Ernstkämpfe, beide Truhen wieder zu haben.

## Zenit

| Leben | Angriff | Abwehr | Tempo | Krit |
|---|---|---|---|---|
| 14 000 | 110 | 24 | 1,0 | 10 % × 1,5 |

Alle Zahlen stehen in `src/data/raids.ts` (`RAID_DEFS.zenit`), die Regeln als `RaidRegeln` mit Kommentar.

## Eine Runde

Eine Runde ist eine Stunde des Tages, gerechnet in dieser Reihenfolge (`raidKampf` in `src/systems/RaidKampf.ts`):

1. **Beginn.** Vor Runde 1 je Trupp `expeditionsBeginn`, in Runde 1 je Trupp `kampfBeginn` (Schilde, Lieder und was
   sonst zu Beginn wirkt). In Runde 12 schlägt es Mittag: `wutAnfall(zenit, 1,5, 1)`, Zenits Angriff steigt von 110
   auf 165.
2. **Züge** aller lebenden Helden und Zenits nach Tempo; bei gleichem Tempo die Helden in der Reihenfolge der Gilde,
   Zenit zuletzt. Vor jedem Zug `zustandAktualisieren` je Trupp, dann `setztAus`. Ist Zenit betäubt (etwa durch einen
   Erschütterungsschlag), setzt er aus, und in dieser Runde schwingt kein Pendel; die Wiedergabe zeigt das als Ereignis
   `aussetzen` mit dem Grund (`grund`) und dem Helden, der ihn anhielt (`quelle`).
   - **Zenit** schwingt das Pendel.
   - **Heiler** heilen nach der Heilregel, sonst greifen sie an.
   - **Alle anderen** greifen Zenit an (`grundangriff`, aus jeder Reihe gleich, mit den Teamwirkungen des eigenen
     Trupps). Der direkte Schaden zählt je Held, für die Funken und für «Meister Schaden» im Ergebnis.
3. **Rundenende, solange Zenit steht:** zuerst die Funken (Runde 3, 6, 9 …), dann die Glocke (Runde 4, 8, 12 …),
   dann der Zeiger (jede Runde), bei leerer Spalte als Durchschlag.
4. **Danach wie im normalen Kampf:** `buffsAblaufen`, `regeneration`, `rundenEnde` je Trupp (Gift auf Zenit tickt nur
   beim ersten Trupp, also einmal je Runde), dann die Gefallenen (Wiedergeburt und Wachfeuer im eigenen Trupp).
5. **Ende:** Fällt Zenit, ist es ein Sieg, fallen alle Helden, eine Niederlage. Steht Zenit nach Runde 24 noch, ist
   Mitternacht: Der Tag ist um, auch das ist eine Niederlage.

Gleicher Samen, gleicher Kampf. `raidKampf` rechnet mit Kampfeinheiten und ändert die Helden nicht. Für Kriegsrat und
Eichung lässt `knapp` Wiedergabe und Protokoll weg; nur die Eichung schaltet mit `ohne` einzelne Regeln ab oder ändert
Zenit mit `werte` und `regeln`.

## Die Regeln des Uhrwerks

- **Pendel** (Zenits Zug): Runde 1 Trupp Links, Runde 2 Rechts und so weiter. Es trifft jeden lebenden Helden in der
  vordersten Reihe, in der in diesem Trupp noch jemand lebt, mit einem normalen Angriff (Wucht 110, ab Mittag 165):
  Krit, Ausweichen, Deckung, Abfangen und Vergeltung wie üblich, aber nur innerhalb des Trupps. Lenken Abfangen oder
  Deckung den Schlag auf einen anderen, zählt der Treffer für den, der Leben verlor, und fällt er daran, fiel er durch
  das Pendel. Ist der Trupp leer oder gefallen, schwingt es zum anderen und trifft dann jede Runde dieselbe Front.
  Spott hilft nicht: Zenit zielt nicht, Zenit schwingt.
- **Zeiger** (jede Runde): Runde 1 Spalte A, Runde 2 B … Runde 6 F, Runde 7 wieder A. Wucht 110 geteilt durch die
  lebenden Helden der Spalte, auf jeden davon: Zwei tragen je 55, drei je 36,67. Der Zeiger teilt genau, die Leben sind
  danach nicht immer ganze Zahlen; der Bildschirm rundet beim Anzeigen.
- **Durchschlag:** Lebt in der Spalte des Zeigers niemand, trifft er jeden lebenden Helden mit Wucht 66 (ab Mittag 99).
  Eine leere Spalte schlägt viermal am Tag durch (A in Runde 1, 7, 13 und 19 … F in Runde 6, 12, 18 und 24), und eine
  Spalte mit nur einem Helden wird leer, sobald er fällt.
- **Glocke** (Runde 4, 8, 12, 16, 20, 24): Wucht 110 (ab Mittag 165) auf jeden lebenden Helden der vollsten Reihe;
  gezählt werden die Lebenden, bei Gleichstand gilt die hintere Reihe.
- **Funken** (Runde 3, 6, 9 … 24): Wucht 110 (ab Mittag 165) auf den lebenden Helden mit dem meisten direkten Schaden
  bisher und auf seine lebenden Nachbarn im Trupp: oben, unten, links, rechts, nicht über den Gang. Bei Gleichstand
  der erste in der Reihenfolge der Gilde. Es zählt nur, was ein Held in seinem eigenen Zug an Zenit trifft, nicht
  Gift, Seuche oder Vergeltung.
- **Flächenschaden** (Zeiger, Durchschlag, Glocke, Funken): `grundSchaden(Wucht, Abwehr)`, also das Grösste aus 1,
  einem Fünftel der Wucht (gerundet) und Wucht minus 0,7 × Abwehr (das Produkt abgerundet). Flächenschutz
  (`aoe_resist`, etwa «Die Unruh») lässt davon 0,7 übrig (abgerundet, mindestens 1), Schilde schlucken zuerst.
  Ausweichen, Deckung und Abfangen helfen dagegen nicht.
- **Mittag** (Runde 12): Ab hier schlägt alles anderthalbmal so hart. Runde 12 bringt Pendel rechts, Funken, Glocke und
  Zeiger F zugleich; Spalte F fällt in den Runden 6, 12, 18 und 24 immer mit den Funken zusammen.
- **Mitternacht:** Nach Runde 24 ist der Tag um. In keiner gemessenen Zeile kam das vor.

| Zeit | Runden | Was geschieht |
|---|---|---|
| Vormittag | 1–11 | Pendel und Zeiger jede Runde, Funken in 3, 6 und 9, Glocke in 4 und 8 |
| **Mittag** | 12 | «Es schlägt zwölf»: ab hier alles × 1,5, dazu Pendel rechts, Funken, Glocke und Zeiger F zugleich |
| Nachmittag | 13–24 | alles × 1,5 (Wucht 165, Durchschlag 99) |
| Mitternacht | nach 24 | «Der Tag ist um»: Niederlage |

## Trupps, Rollen und Heilregel

Links sind die Spalten A bis C, Rechts D bis F, dazwischen der Gang. Jeder Trupp kämpft wie eine eigene Gruppe:
Lieder, Segen, Schilde, Heilung, Wachfeuer und die anderen Teamwirkungen wirken nur im eigenen Trupp, und von zwei
gleichen Teamwirkungen in einem Trupp zählt nur die stärkere (`staerksterTraeger`). Was Zenit selbst trifft (Flüche,
Gift, Seuche), hilft beiden Trupps. Abfangen (Schutzherr), Deckung (Scharfschützin), Ausweichen und Vergeltung wirken
gegen das Pendel, innerhalb des Trupps. Spott ist wirkungslos. Alrunas Liste nennt je Trupp Phalanx, Heldenlied,
Kriegssegen, Hain, Mondwall, Rudelgeheul, Schmiedetakt, Tragkraft, Seuche, Wachfeuer und Schildwall
(`TRUPP_WIRKUNGEN`).

| Rolle im Raid | Klassen | Aufgabe |
|---|---|---|
| Pendelfänger | Wächter, Berserker | allein in die vorderste Reihe eines Trupps |
| Heiler | Kleriker, Druide, Paladin | den eigenen Trupp heilen (Heilregel) |
| Trupp-Stütze | Barde, Nekromant | Lied oder Seuche für den eigenen Trupp |
| Schaden | Waldläuferin, Assassine, Hexe | Schaden machen; wer am meisten macht, zieht die Funken an |

Die Rolle hängt an der Klasse (`raidRolle`), der Weg verstärkt oder schwächt sie (siehe «Je ein Weg anders» unter
Eichung).

**Raid-Heilregel** (nur im Raid; in Dungeons heilen Heiler weiterhin nur vor dem Kampf): Kleriker («Heilung», Stärke
36, Abklingzeit 3), Druiden («Nachwachsen», 24, 4) und Paladine («Heiliger Schild», 18, 3) heilen mitten im Kampf.
Steht im eigenen Trupp ein lebender Held unter 90 % seiner Leben (genau 90 % reicht nicht) und ist die Fähigkeit
bereit, heilt der Heiler statt anzugreifen den mit dem kleinsten Anteil um Stärke + 2 × eigenen Angriff (gerundet,
höchstens bis zum vollen Leben). Danach greift er so viele Züge an, wie die Abklingzeit sagt. Die Regel trägt den
Raid: Ohne sie gewinnt «Gut» nie (Zenit bleibt bei 11 %).

## Aufstellen

- **Das Feld:** 3 Reihen × 6 Spalten. Reihe 1 ist vorn (in den Daten `reihe: 0`), Reihe 3 hinten; die Spalten A bis F
  sind `spalte` 0 bis 5. Ein Trupp darf 0 bis 9 Helden haben, die Verteilung ist Teil des Rätsels.
- **4 bis 10 Helden,** jedes Feld höchstens einer. Mit weniger als vier gibt es keinen Ernstkampf; Zenit wird mit
  weniger Helden nicht schwächer.
- **Setzen** (`setzeHeld`): Held auf ein Feld; ist es besetzt, tauschen die beiden (kommt der Held von der Bank, geht
  der andere auf die Bank). Mit `null` zurück auf die Bank. Stehen schon zehn oben, kommt von der Bank nur jemand im
  Tausch herauf. `aufstellungLeeren` stellt alle auf die Bank.
- **Gemerkt** wird die Aufstellung im Spielstand (`state.raid.aufstellung`, Held-Id → Feld). `raidStand` räumt sie bei
  jedem Aufruf auf: Entlassene Helden, Felder mit halben Zahlen oder ausserhalb des Rasters und doppelt belegte Felder
  fallen weg, mehr als zehn auch (in der Reihenfolge der Gilde).

## Alrunas Liste

`hinweise` (aus `raidLage` in `src/systems/Raid.ts`) sagt, was an der Aufstellung gefährlich ist, in den Worten von
Alrunas Liste («Was wir falsch gemacht haben. Damit ihr es besser macht.»). Jede Zeile ist an Felder gebunden,
Warnungen (☐) stehen vor erledigten Punkten (☑). Die Liste ändert nichts. Schläge zählt `schlaege(Wucht, Held)`: volles
Leben geteilt durch den Schaden eines Treffers, aufgerundet, bei Flächenschaden mit Flächenschutz.

| Art | Was sie sagt | ☐ wenn |
|---|---|---|
| Pendel (je Trupp) | wer in der vordersten besetzten Reihe steht und wie viele Schläge der Schwächste dort hält, vor und ab Mittag | dort hält jemand vor Mittag weniger als 3 Schläge («Vorn links stehen 3», wenn es mehrere sind); der Trupp ist leer, die anderen nicht |
| Zeiger (je Spalte) | «Jede Spalte ist besetzt», wenn keine Spalte warnt | eine Spalte ist leer (mit den Runden, in denen er dort durchschlägt); ein Einzelner hält weniger als 3 ganze Zeiger-Schläge (110) |
| Glocke | die vollste Reihe mit Namen | dort stehen 4 oder mehr; jemand dort hält ab Mittag keine 2 Glockenschläge (165) |
| Funken | wer sie wohl bekommt: Probelauf bis Runde 3 mit dem Samen der ersten Kriegsrat-Probe (1000) | das Ziel hat Nachbarn im Trupp (nach Feld, auch wer im Probelauf schon fiel) |
| Trupp (je Trupp) | Teamwirkungen und Heiler | kein Heiler; dieselbe Teamwirkung zweimal, von der nur die stärkere zählt |
| Zahl | wie viele hinaufgehen | weniger als vier, oder weniger, als die Gilde Helden hat (höchstens zehn) |

Die Liste der Muster-Gilde mit «Gut» (67 % Siege):

```
☐ Spalte B trägt nur Ewin. Fällt Ewin, steht B leer.
☐ Die Glocke schlägt in Reihe 3, dort stehen 4: Lia, Sina, Ysra und Morn. Sie zählt gern.
☑ Pendel links trifft Brom. Brom hält etwa 14 Schläge, ab Mittag 5.
☑ Pendel rechts trifft Grimm. Grimm hält etwa 9 Schläge, ab Mittag 5.
☑ Funken: wohl Sina. Niemand daneben.
☑ Links: Mondwall, Phalanx, Tragkraft, Heldenlied, Seuche. Heiler: Ewin.
☑ Rechts: Wachfeuer, Hain, Schmiedetakt. Heiler: Ansgar und Moos.
☑ Zehn gehen hinauf. Dafür hat die Liste keinen Punkt. Alruna hat nachgesehen.
```

Die Liste zählt Gefahren, sie bewertet nicht: «Profi» (99 %) hat drei Warnungen (Spalte F nur Morn, vier in der
Glockenreihe, Ewin neben Sina), «Gut» zwei, «Lehrbuch» (0 %) vier, die Startaufstellung fünf. Ob eine Gefahr sich
lohnt, sagt erst der Kriegsrat.

## Kriegsrat

- 20 Proben (`KRIEGSRAT_PROBEN`) mit den Samen 1000 + i × 7919 (i = 0 bis 19, `kriegsratSamen`), gerechnet mit einer
  Kopie der Aufstellung und der Schmiede-Stufen. Der Spielstand bleibt Zeichen für Zeichen gleich, und es gibt nichts:
  keine XP, keine Truhe, keinen Zähler. Gleiche Aufstellung, gleicher Rat.
- `raidKriegsrat` gibt nach jeder Probe ab, damit der Bildschirm in Häppchen rechnen kann; `kriegsratRechnen` rechnet
  alles am Stück.
- Er sagt: Siege von 20, Zenits Rest im Schnitt, die häufigste Todesursache mit Ort und Satz (`hauptursache`; endet
  mehr als die Hälfte der Proben um Mitternacht, heisst sie «Mitternacht»), wer am häufigsten fiel, wen die ersten
  Funken trafen, und er hält die erste Probe mit Wiedergabe bereit («Einen Probelauf ansehen»). `schluessel`
  (`ratSchluessel`) sagt, wofür der Rat gilt: die Felder und die Kampfwerte der Aufgestellten, wie `raidKampf` sie
  liest. Neue Ausrüstung, eine Schmiede-Stufe, eine Stufe oder ein anderer Weg eines Aufgestellten machen ihn alt,
  wer auf der Bank sitzt, nicht.
- **Hauptursache:** Alle Gefallenen werden nach Ort gezählt («Glocke (Reihe 3)», «Zeiger (Spalte C)», «Durchschlag
  (Spalte E leer)», «Pendel (Trupp links)», «Funken (um Sina)», «Rundenende»); der häufigste Ort bekommt seinen Satz.
  Beim Zeiger unterscheidet der Satz, ob einer die Spalte allein trug.

Gemessen an der Muster-Gilde «Anker»:

| Aufstellung | Siege | Zenit im Schnitt | Meist gefallen durch | Am häufigsten gefallen |
|---|---|---|---|---|
| Gut | 12 von 20 | 1 % | Glocke (Reihe 2) | Lia (20 von 20) |
| Profi | 20 von 20 | 0 % | Glocke (Reihe 2) | Liedra (20 von 20) |
| Lehrbuch | 0 von 20 | 24 % | Funken (um Sina) | Morn (20 von 20) |
| Naiv (die Startaufstellung) | 0 von 20 | 51 % | Durchschlag (Spalte E leer) | Ansgar (20 von 20) |

Die ersten Funken trafen in allen vier Sina, in jeder Probe. Mit T4 und «Gut» sind es 0 von 20 (Zenit bei 36 %), mit
Sets +5 und «Profi» 20 von 20. Rechenzeit 40 bis 100 ms für die 20 Proben (Node 22.22, die erste nach dem Start am
längsten).

## Ernstkampf und Woche

- **Möglich**, wenn der Raid offen ist, keine Expedition unterwegs ist, mindestens vier Helden oben stehen und, falls
  er etwas kostet, genug Tagstein im Lager liegt. `versuchsLage` nennt den Grund in dieser Reihenfolge.
- **Kosten:** Die ersten drei Ernstkämpfe einer Woche sind frei, jeder weitere kostet 10 Tagstein. Versuch und Kosten
  werden vor dem Rechnen gebucht.
- **Samen:** gemischt aus Spiel-Samen (`rngSeed`), Woche und Nummer des Versuchs (`raidSamen`, gerechnet wie `zufall`
  in der Rangliste); die Truhen würfeln mit einem eigenen Samen aus denselben Teilen. Neu laden ändert nichts: Derselbe
  Versuch bringt denselben Kampf und dieselben Truhen.
- **Woche** wie in der Rangliste (`wocheVon`): Montag 00:00 bis Sonntag 24:00, Uhrzeit des Geräts. Eine neue Woche
  beginnt nur, wenn ihr Montag nach dem gespeicherten liegt; eine zurückgestellte Uhr ändert nichts. Mit der neuen
  Woche sind drei Ernstkämpfe wieder frei und beide Truhen wieder zu haben.
- **Montag-Satz** (`montagSatz`): einmal je Woche, wenn es in früheren Wochen Ernstkämpfe gab. Vor dem ersten Sieg
  «Montag. Drei neue Ernstkämpfe. Zenit hat die alten nicht gezählt, Alruna schon.», danach «Montag. Zenit hat sich
  wieder aufgezogen, mit einer Ersatz-Unruh. …». Welche Woche ihn schon gezeigt hat, steht in `montagGesehen`.
- **Nach dem Wochensieg** gehen die Ernstkämpfe weiter (frei, solange welche übrig sind, sonst Tagstein) und zählen
  für XP, Erfolge, Bestversuch und Verlauf, die Truhen nicht mehr.
- **Warum diese Mischung:** Unbegrenzte freie Versuche machen jede Aufstellung über 0 % irgendwann siegreich, dann wäre
  die Aufstellung egal; eine harte Wand nach drei Versuchen passt nicht zu jemandem, der spielt, wenn er Zeit hat.
  Drei freie Versuche machen aus einer Siegchance eine Wochenchance: 67 % («Gut») werden 96 %, 20 % werden 49 %, 5 %
  werden 14 %. Wer mehr will, zahlt Tagstein, den auch die Schmiede braucht.

## Truhen

| Truhe | Wann | Inhalt |
|---|---|---|
| **Was vom Pendel fiel** | der erste Ernstkampf der Woche, nach dem Zenit unter 50 % steht | 150 Gold, 5 Tagstein und ein Set-Teil der Stufen 4 bis 8, das der Gilde fehlt; fehlt dort keins mehr, 8 Kristallsplitter statt des Teils |
| **Zenits Truhe** | der erste Sieg der Woche | je vier Würfe aus der Beute von Alruna und Orm (`loot_boss_alruna` und `loot_boss_orm`, je viermal genannt; je Wurf das feste Gold, 370 bis 510 bzw. 400 bis 560, und ein Eintrag), ein Set-Teil, das der Gilde fehlt (siehe unten), 10 Tagstein, 15 Kristallsplitter; fehlt keins mehr, 20 Kristallsplitter statt des Teils, zusammen also 35 |
| **Die Unruh** | der erste Sieg überhaupt | der Schmuck `die_unruh` (Stufe 12, legendär): Abwehr +10, Leben +52, Tempo +0,1, Flächenschutz und Regeneration; nur einmal |

- Alles geht direkt ins Lager. Ein Sieg, der zugleich der erste Ernstkampf der Woche unter 50 % ist, öffnet beide
  Truhen, zuerst «Was vom Pendel fiel».
- **Welches Set-Teil** (`fehlendesSetTeil`): Ein Teil fehlt, wenn die Gilde es weder im Lager noch an einem Helden hat.
  Gewählt wird mit dem Samen des Versuchs, aus der ersten dieser Listen, die nicht leer ist:
  1. fehlende Teile der Sets, die ein Teilnehmer zum Teil trägt (ein oder zwei Teile), bei «Was vom Pendel fiel» nur
     aus Stufe 4 bis 8, bei Zenits Truhe aus jeder Stufe;
  2. fehlende Teile aller Sets im Stufenbereich (4 bis 8 bzw. 9 bis 12);
  3. nur bei Zenits Truhe: fehlende Teile aller Sets jeder Stufe.

  Gibt es keins mehr, kommt der Ersatz. Zum Teil gehört der Satz «Teil 2 von 3» (`hinweise` der Truhe), gezählt, bevor
  es ins Lager kam.
- Der Ersatz kommt zu den übrigen Dingen dazu (`ersatz` zu `dinge`): Fehlt kein Teil mehr, gibt Zenits Truhe 15 und
  20, also 35 Kristallsplitter, «Was vom Pendel fiel» 8 (sonst gibt sie keine).
- **Was Zenits Truhe bringt** (4000-mal gezogen, die Gilde ohne Set-Teile): Ø 3680 Gold, ein Set-Teil, Ø 51
  Kristallsplitter (15 und die aus den Würfen), 10 Tagstein, Ø 17,3 Talisman-Fragmente und Ø 5,4 Stück Ausrüstung
  (Alrunas Kelle 1,33, Amulett der Wiedergeburt 1,01, Schild des Uralten 1,01, Der Schlussstein 0,92, Der Morgenstern
  0,75, Amtsstab des Mondvogts 0,35). Ein Lauf durch die Pfeiler des Tages bringt dem Musterteam «Stark» in `tagwerk0`
  (40 Läufe mit den Samen des Kriegsrats, 34 Siege) Ø 1247 Gold, 1,3 Set-Teile, 13 Tagstein, 38 Kristallsplitter und
  Ø 5,9 Stück Ausrüstung, in 29 bis 34 der 40 Läufe je Der Schlussstein, die Klinge der tausend Schatten und die
  Schattenjäger-Rüstung. Gold und Grundwert der Gegenstände zusammen (ohne Set-Teile und Tagstein): Truhe Ø 6003, Lauf
  Ø 3098. Die Truhe ist also etwa zwei Läufe bei Orm wert (1,9): dreimal so viel Gold, etwas weniger Ausrüstung,
  dazu ein Set-Teil, das der Gilde sicher fehlt. Das Werkzeug rechnet das bei jedem Lauf nach (Band 13). Mit je einem
  Wurf, wie zuerst gebaut, war sie etwa einen halben Lauf wert, mit je zwei einen.

## XP, Bestversuch und Verlauf

- **XP:** Jeder Teilnehmer bekommt 300 XP beim Sieg und 100 bei der Niederlage, auch wer gefallen ist (`awardXP`; auf
  Stufe 15 geht es als Überschuss ins Lehrbuch), die Bank nichts. Danach prüft `ClassUnlockSystem` neue Klassen. Wer
  einen schwächeren Helden mitnimmt, zieht ihn hoch und senkt die Siegchance.
- **Bestversuch** (`bestRest`): der kleinste Zenit-Rest aller Ernstkämpfe, 0 heisst besiegt. «Neuer Bestversuch!» gibt
  es erst ab dem zweiten Ernstkampf.
- **Verlauf:** die letzten zehn Ernstkämpfe, die neuesten zuerst (Zeit, Woche, Sieg, Rest, Runden, Helden, Stehende).
- **Prozent:** `restProzent` rundet Zenits Rest auf ganze Prozent auf, ein Hauch Leben ist nicht null: 0,2 % Rest
  heisst «Zenit bei 1 %».
- **Weiche Masse:** Weil der Ausgang steil ist, zeigen Zenits Rest und «Am Ende standen 4 von 10» den Fortschritt
  besser als die Siege: T4 mit «Gut» lässt Zenit bei 35 %, Sets +0 mit «Profi» bei 2 %, und mit Sets +5 stehen am
  Ende Ø 6,7 bis 7,2 von 10.

## Erfolge

Sechs Erfolge, fünf in der Gruppe «Dungeons» und der versteckte «Zu viert»; Namen, Texte und Bedingungen stehen in
`docs/ERFOLGE.md`. `ernstkampf` zählt nach jedem Ernstkampf in `state.statistics` hoch und prüft dann die Erfolge, ohne
Hinweis in der Kopfzeile (das Ergebnis zeigt sie). Kriegsrat und Probeläufe zählen nicht.

| Zähler | zählt bei jedem Ernstkampf … | Erfolg |
|---|---|---|
| `raid_versuche` | immer | 🪜 Zehn Sprossen (ab 1) |
| `raid_siege` | mit Sieg | 🕰️ Der Tag hängt gerade (ab 1) |
| `raid_punkt_zwoelf` | mit Sieg bis Runde 12 | 🔔 Punkt zwölf (ab 1) |
| `raid_mehr_als_vier` | mit Sieg, wenn am Ende mindestens fünf stehen | 🪑 Mehr als vier (ab 1) |
| `raid_wochen` | mit dem ersten Sieg einer Woche (Zenits Truhe) | 📅 Jeden Montag (ab 4) |
| `raid_zu_viert` | mit genau vier Helden, Sieg oder nicht | 4️⃣ Zu viert (versteckt, ab 1) |

Wie oft es gelingt (400 Läufe): «Punkt zwölf» mit der Anker-Gilde und «Profi» in 28 %, mit Sets +5 und «Profi» in
89 %, mit «Gut» nie; «Mehr als vier» mit «Gut» in 24 %, mit «Profi» in 28 %, mit Sets +5 in 89 bis 99 %.

## Ansagen des Stadtschreibers

Jede Art höchstens einmal je Kampf und nur, wenn das Ereignis wirklich geschah (`RAID_TEXTE.ansage`). Die Ansage hängt
am Ereignis; die ohne eigenes Ereignis (Grösse der Gruppe, Spott, Ende) stehen in der Wiedergabe als Ereignis der Art
`ansage`.

| Ansage | wann |
|---|---|
| Zahl | vor Runde 1: genau vier («Vier gehen hinauf …») oder fünf bis neun; bei zehn keine |
| Spott | Runde 1, wenn ein Held spottet («… Zenit ist eine Uhr.») |
| Pendel | vor Mittag trifft das Pendel jemanden, der keine drei Schläge hält |
| Heilung | die erste Heilung |
| Funken | die ersten Funken, mit den Nachbarn |
| Glocke | die erste Glocke, mit der Zahl in der Reihe |
| Durchschlag | der erste Durchschlag in einer Spalte, die von Anfang an leer war oder deren Einziger fiel |
| Mittag | Runde 12 |
| Bardin | der erste Gefallene ist eine Bardin mit Heldenlied |
| Ende | Sieg in Runde 12 oder davor; Mitternacht; Niederlage, ein Satz bis Runde 9 und einer danach (Alrunas Gilde kam bis Runde neun, zu viert). Ein Sieg nach Runde 12 hat keinen Schlusssatz. |
| Abriss | zum ersten Sieg überhaupt, wenn die Gilde «Abrissunternehmen» schon hat (`tat_pfeiler`) |

## Eichung

`npm run raid-eichung` (`tools/raidEichung.ts`) rechnet Zenit gegen die Muster-Gilde in ihren Aufstellungen, 400
Kämpfe je Zeile mit den Samen i × 7919 (i = 0 bis 399; die ersten 20 sind die des Tests), vergleicht Zenits Truhe
mit einem Lauf bei Orm (wie unter «Truhen») und prüft die Eichbänder unten. Verfehlt es eines, endet es mit 1. Dazu:

- `npm run raid-eichung -- --laeufe 1000`: mehr Läufe je Zeile.
- `npm run raid-eichung -- --leben 13500,14000,14500`: Zenits Leben durchprobieren (ohne Bänder).
- `npm run raid-eichung -- --ohne glocke,funken`: mehrere Regeln zusammen aus, als Zeile mehr unter «Je eine Regel aus».
- `npm run raid-eichung -- --wege`: je ein Held mit dem anderen Weg seiner Klasse. Bleibt «Profi» damit unter 90 %,
  sucht das Werkzeug ab «Gut» eine Aufstellung für diese Gilde (dieselbe Suche wie `--suche`, 300 Schritte) und zeigt
  sie.
- `npm run raid-eichung -- --suche t4`: Aufstellungssuche für eine Gilde. Ab «Gut» setzt sie 200-mal einen Helden auf
  ein zufälliges Feld (ist es besetzt, tauschen die beiden) und behält die neue Aufstellung, wenn sie in 40 Proben
  mindestens so gut abschneidet (zuerst die Siege, dann Zenits Rest); die beste misst sie am Ende mit 400 Läufen.

Nach Änderungen an Kampf, Klassen, Wegen, Sets, Schmiede, Beute oder Zenit neu laufen lassen und die Tabellen hier
nachführen; `tests/raid.test.ts` prüft die Bänder mit 20 Samen und meldet Verschiebungen sofort. Stellschraube zuerst
Zenits Leben, in Schritten von 250, erst danach Wuchten oder Heilfaktor. Gemessen am 6.11.2026; ein Kampf braucht 1,6
bis 1,8 ms (Node 22.22), das ganze Werkzeug rund 20 Sekunden, mit `--wege` und `--suche t4` rund 70.

### Muster-Gilde «Anker»

`src/data/raidMuster.ts`: zehn Helden auf Stufe 15, jeder mit Weg. Sie ist auch die Gilde des Probespiels
`?probe=raid`.

- **Kern** (wie das Musterteam «Stark» in `tagwerk0`): Brom (Wächter, Phalanx) im Pfand des Mondvogts mit dem Amtsstab
  des Mondvogts, Grimm (Berserker, Zorn) in Alrunas Wachfeuer, Sina (Assassine, Meuchlerin) in Sunnas Morgengabe, alle
  +5; Lia (Waldläuferin, Scharfschützin) in «Was den Tag trug» ohne Stufen.
- **Zweite Reihe** in den Sets, die der Kern unterwegs abgelegt hat, +3: Ansgar (Paladin, Schutzherr) im Bollwerk des
  Festungswächters mit Seelenbrecher, Ewin (Kleriker, Lichtbringer) in «Aus Ignarax' Hort», Moos (Druide, Hüterin des
  Hains) in «Was Nyxar nicht frass», Liedra (Barde, Heldenlied) in Tiefenrausch, Ysra (Hexe, Fluchweberin) in Korrunds
  Meisterstücken, Morn (Nekromant, Seuchenbringer) in der Schattenklinge der Katakomben.
- **Varianten:** `sets5` und `sets0` (die zweite Reihe +5 bzw. ohne Stufen), `t4` (die zweite Reihe in gewöhnlicher
  T4-Ausrüstung, ohne Sets), `kern` (nur die vier).

Die Aufstellungen (`RAID_AUFSTELLUNGEN`, Reihe 1 vorn, «|» ist der Gang):

```
«Gut» (Daumenregeln)                       «Profi» (Fund der Aufstellungssuche)
     A      B      C       D      E      F         A      B      C       D      E      F
 1   Brom   .      .     | .      .      Grimm   1   .      .      Brom  | .      Ansgar .
 2   .      Ewin   Liedra| Moos   Ansgar .       2   Sina   .      Lia   | Moos   .      Morn
 3   Lia    .      Morn  | Ysra   .      Sina    3   Ewin   Ysra   Grimm | Liedra .      .

«Lehrbuch» (Tanks vorn, Heiler dahinter)   «Naiv» (die Startaufstellung: vorne voll, dann Mitte)
 1   .      Brom   .     | .      Grimm  .       1   Brom   Grimm  Lia   | Sina   Ansgar Ewin
 2   Liedra Ewin   .     | Ansgar Moos   .       2   Moos   Liedra Ysra  | Morn   .      .
 3   .      Lia    Morn  | .      Sina   Ysra    3   .      .      .     | .      .      .

«Glockenfänger» (vier Zähe vorn)           «alle in die Mitte»
 1   Brom   Ansgar .     | .      Ysra   Grimm   1   .      Brom   .     | .      Grimm  .
 2   .      Liedra Ewin  | Moos   .      .       2   Lia    Liedra Ewin  | Moos   Ysra   Sina
 3   Lia    .      .     | Morn   .      Sina    3   .      .      Ansgar| Morn   .      .
```

- **Gut:** je Trupp ein Tank allein vorn, ein Heiler je Trupp, jede Spalte besetzt, Sina in der Ecke ohne Nachbarn.
  Schwäche: Die Glocke trifft hinten vier.
- **Profi:** links ein Schadens-Trupp mit sechs (Mondwall, Phalanx, Wachfeuer, Tragkraft und Schmiedetakt wirken auf
  Lia und Sina), rechts ein kleiner Hilfs-Trupp mit zwei Heilern, Hain, Heldenlied und Seuche, der jedes zweite Pendel
  mit Ansgar fängt. Nicht naheliegend; genau dafür sind Liste und Kriegsrat da.
- **Lehrbuch:** Die Funken treffen Sina und ihre Nachbarn Moos und Ysra. Vier Spalten tragen nur einen (A Liedra,
  C Morn, D Ansgar, F Ysra); fällt einer davon, schlägt der Zeiger dort durch.

### Gemessen

400 Läufe je Zeile. Ø Runde und Ø stehend im Schnitt der Siege; Sieg bis Runde 12 und «≥ 5 stehen» als Anteil aller
Läufe. «Kern allein» ist «Gut» ohne die sechs der zweiten Reihe.

| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | ≥ 5 stehen | Ø stehend | Mitternacht |
|---|---|---|---|---|---|---|---|---|
| Anker · Gut | 67 % | 16,0 | 1 % | 100 % | 0 % | 24 % | 3,9 | 0 % |
| Anker · Profi | 99 % | 13,3 | 0 % | 100 % | 28 % | 28 % | 4,0 | 0 % |
| Anker · Lehrbuch | 0 % | – | 23 % | 100 % | 0 % | 0 % | – | 0 % |
| Anker · Naiv (vorne voll) | 0 % | – | 48 % | 52 % | 0 % | 0 % | – | 0 % |
| Anker · Glockenfänger (vier Zähe vorn) | 4 % | 15,1 | 13 % | 100 % | 0 % | 2 % | 4,4 | 0 % |
| Anker · alle in die Mitte | 0 % | – | 31 % | 100 % | 0 % | 0 % | – | 0 % |
| Anker ohne Morn (9) · Gut | 0 % | – | 12 % | 100 % | 0 % | 0 % | – | 0 % |
| Anker ohne Morn (9) · Profi | 65 % | 15,0 | 1 % | 100 % | 3 % | 3 % | 2,2 | 0 % |
| Anker ohne Liedra (9) · Profi | 48 % | 14,8 | 1 % | 100 % | 0 % | 0 % | 1,9 | 0 % |
| Anker ohne Liedra und Morn (8) · Gut | 0 % | – | 17 % | 100 % | 0 % | 0 % | – | 0 % |
| Kern allein (4) · Gut | 0 % | – | 69 % | 0 % | 0 % | 0 % | – | 0 % |
| Sets +5 · Gut | 100 % | 14,4 | 0 % | 100 % | 0 % | 99 % | 6,7 | 0 % |
| Sets +5 · Profi | 100 % | 12,1 | 0 % | 100 % | 89 % | 89 % | 7,2 | 0 % |
| Sets +0 · Profi | 40 % | 15,9 | 2 % | 100 % | 0 % | 0 % | 1,7 | 0 % |
| T4 · Gut | 0 % | – | 35 % | 100 % | 0 % | 0 % | – | 0 % |

**Mit den 20 Samen des Tests:** Gut 15 von 20 (Ø Runde 15,6), Profi 20, Lehrbuch 0 (Zenit bei 23 %), Naiv 0 (Zenit bei
47 %, unter 50 % in 13), T4 0 (Zenit bei 35 %, unter 50 % in 20), Sets +5 Gut 20 (fünf oder mehr stehen in 19), Sets +5
Profi bis Runde 12 in 18, Sets +0 Profi 6, Kern allein 0 (Zenit bei 69 %), Mitternacht nie.

**Todesursachen** je Kampf (Ø, Siege und Niederlagen zusammen): «Gut» 7,4 Gefallene (Glocke 3,4 · Zeiger 1,7 ·
Durchschlag 1,3 · Pendel 0,7 · Funken 0,3), «Profi» 6,0 (Glocke 1,9 · Zeiger 1,3 · Durchschlag 1,1 · Pendel 1,0 ·
Funken 0,7), «Lehrbuch» 10 (Funken 3,4 · Glocke 2,9 · Durchschlag 2,0 · Pendel 1,7), «Naiv» 10 (Pendel 2,4 · Funken
und Durchschlag je 2,2 · Glocke 1,9 · Zeiger 1,3); ein abgefangener Pendelschlag zählt für den, der ihn abfing.
Jede Aufstellung hat ihre eigene Schwäche, darum taugen Kriegsrat und Ursachen-Satz als Lehrer. Die ersten Funken
treffen in allen vier und in jedem Lauf Sina.

**Je eine Regel aus** (`ohne`, 400 Läufe; der Zeiger nimmt den Durchschlag mit, Rundenende und Mitternacht bleiben;
Mitternacht als Anteil bei «Gut» / «Lehrbuch»):

| Ohne | Anker · Gut | gegenüber Gut | Zenit-Rest | Anker · Lehrbuch | gegenüber Lehrbuch | Mitternacht |
|---|---|---|---|---|---|---|
| Pendel | 100 % | +34 | 0 % | 0 % | +0 | 0 % / 0 % |
| Zeiger (mit Durchschlag) | 100 % | +34 | 0 % | 99 % | +99 | 0 % / 0 % |
| Durchschlag | 98 % | +31 | 0 % | 0 % | +0 | 0 % / 0 % |
| Glocke | 100 % | +34 | 0 % | 100 % | +100 | 0 % / 0 % |
| Funken | 100 % | +33 | 0 % | 53 % | +53 | 0 % / 0 % |
| Mittag | 100 % | +34 | 0 % | 1 % | +1 | 0 % / 11 % |
| Heilregel | 0 % | −67 | 11 % | 0 % | +0 | 0 % / 0 % |

Jede Regel zählt: Ohne eine davon gewinnt «Gut» fast immer, ohne die Heilregel nie. «Lehrbuch» gewinnt fast immer,
sobald die Glocke oder der Zeiger fehlt, ohne die Funken in 53 %.

**Zenits Leben** (`--leben`, 400 Läufe je Feld; die Bänder gelten für 14 000):

| Leben | Anker · Gut | Anker · Profi | Anker · Lehrbuch | Sets +0 · Profi | Anker · Naiv: Zenit < 50 % |
|---|---|---|---|---|---|
| 13 000 | 100 % | 100 % | 1 % | 92 % | 91 % |
| 13 500 | 98 % | 100 % | 0 % | 73 % | 74 % |
| 13 750 | 87 % | 100 % | 0 % | 56 % | 63 % |
| **14 000** | **67 %** | **99 %** | **0 %** | **40 %** | **52 %** |
| 14 250 | 42 % | 97 % | 0 % | 22 % | 45 % |
| 14 500 | 18 % | 91 % | 0 % | 10 % | 40 % |

Um 14 000 herum bewegen 250 Leben «Gut» um 20 bis 25 Punkte, 500 um 31 bis 49.

**Je ein Weg anders** (`--wege`, 400 Läufe; jeder Held einzeln mit dem anderen Weg seiner Klasse; bleibt «Profi» unter
90 %, sucht das Werkzeug ab «Gut» eine Aufstellung, 300 Schritte zu 40 Proben):

| Held | Weg | Anker · Gut | Anker · Profi | mit Aufstellungssuche |
|---|---|---|---|---|
| Brom | Vergelter | 47 % | 100 % | – |
| Grimm | Schlächter | 49 % | 97 % | – |
| Lia | Fährtenleserin | 100 % | 100 % | – |
| Sina | Schattentänzerin | 0 % | 0 % | 100 % |
| Ansgar | Kreuzritter | 69 % | 99 % | – |
| Ewin | Kriegspriester | 74 % | 100 % | – |
| Moos | Bärengestalt | 67 % | 99 % | – |
| Liedra | Schmählied | 77 % | 99 % | – |
| Ysra | Sturmhexe | 29 % | 98 % | – |
| Morn | Knochenherr | 59 % | 99 % | – |

Neun von zehn Wegen halten «Profi» bei 97 bis 100 %. **Sina als Schattentänzerin** passt in keine der festen
Aufstellungen: 0 % mit «Gut» und mit «Profi» (Zenit bleibt bei rund 15 % bzw. 8 %, je 40 Läufe). Ausgesperrt ist die
Gilde damit nicht, sie braucht eine andere Aufstellung. Die Suche ab «Gut» findet diese, mit 100 % Siegen (Zenit-Rest
0 %, Ø Runde 15,0, 400 Läufe):

```
  Brom   .      .      | .      .      Grimm
  Liedra Ewin   Lia    | Moos   .      .
  Sina   .      Ysra   | Morn   Ansgar .
```

Dieselbe Suche ab «Profi» kommt auf 84 % (80 % in den ersten 200 Läufen). Warum die festen Aufstellungen nicht passen:
Sie sind auf den Meister-Effekt der Meuchlerin gebaut (2,5-facher Schaden, sobald Zenit unter 60 % ist); Sina macht
damit rund 5400 bis 5800 der 14 000 Leben, als Schattentänzerin rund 3200 bis 3400. Schattentanz weicht nur normalen
Angriffen aus, und die bekommt Sina hinten nicht ab (das Pendel trifft die vorderste Reihe, alles andere ist
Flächenschaden): In den gemessenen Läufen mit «Gut» und «Profi» ist jede Zahl gleich wie ganz ohne Weg. Lia als
Fährtenleserin hebt «Gut» dagegen auf 100 %.

**Aufstellungssuche mit T4** (`--suche t4`, ab «Gut», Samen der Suche 4711):

```
  Brom   .      .      | .      .      Sina
  .      Ewin   Ysra   | Moos   Ansgar .
  Liedra .      Morn   | Grimm  Lia    .
```

Vorher («Gut»): Sieg 0 %, Zenit bei 35 % · nach der Suche: Sieg 3 %, Zenit bei 18 %. Die zweite Reihe in T4 schafft
Zenit auch mit der besten gefundenen Aufstellung nicht; sie holt aber jede Woche «Was vom Pendel fiel».

### Eichbänder

Der Test prüft mit 20 Samen, das Werkzeug mit 400 Läufen. Stand 6.11.2026:

| # | Zeile | Test (20 Samen) | gemessen | Werkzeug (400 Läufe) | gemessen |
|---|---|---|---|---|---|
| 1 | Anker · Gut | 10 bis 17 Siege, Ø Runde 15 bis 18 | 15, Ø 15,6 | 60 bis 75 % | 67 % ✓ |
| 2 | Anker · Profi | mindestens 18 Siege | 20 | mindestens 90 %; Sieg bis Runde 12 in 20 bis 45 % | 99 %, 28 % ✓ |
| 3 | Anker · Lehrbuch | höchstens 2 Siege, Zenit im Schnitt bei 15 bis 30 % | 0, 23 % | höchstens 10 % | 0 % ✓ |
| 4 | Anker · Naiv | kein Sieg, Zenit im Schnitt bei mindestens 40 % | 0, 47 % | Zenit unter 50 % in 30 bis 70 % | 52 % ✓ |
| 5 | T4 · Gut | kein Sieg, Zenit im Schnitt bei 25 bis 45 %, unter 50 % in mindestens 18 | 0, 35 %, 20 | Suche mit T4 höchstens 65 % (`--suche`) | 3 % ✓ |
| 6 | Sets +5 · Gut | 20 Siege, fünf oder mehr stehen in mindestens 15 | 20, 19 | mindestens 95 % | 100 % ✓ |
| 7 | Sets +5 · Profi | Sieg bis Runde 12 in mindestens 12 | 18 | Sieg bis Runde 12 in mindestens 60 % | 89 % ✓ |
| 8 | Sets +0 · Profi | 4 bis 13 Siege | 6 | 25 bis 55 % | 40 % ✓ |
| 9 | Kern allein (4) | kein Sieg, Zenit im Schnitt bei 60 bis 75 % | 0, 69 % | | |
| 10 | Mitternacht | höchstens einmal je Aufstellung | nie | höchstens 2 % in jeder Zeile | nie ✓ |
| 11 | Je eine Regel aus | | | Anker · Gut mindestens 20 Punkte mehr; ohne Heilregel höchstens 5 % | +31 bis +34; 0 % ✓ |
| 12 | Je ein Weg anders | | | Anker · Profi mindestens 90 %, sonst mit Aufstellungssuche ab «Gut» mindestens 90 % (`--wege`) | 97 bis 100 %; Sina als Schattentänzerin 0 %, mit Aufstellungssuche 100 % ✓ |
| 13 | Zenits Truhe | | | Wert etwa zwei bis drei Läufe bei Orm, nach Gold und Grundwert der Gegenstände (1,7 bis 3; Truhe 4000-mal gezogen, 40 Läufe) | 1,9 Läufe (6003 gegen 3098) ✓ |

Alle Bänder sind getroffen. Band 13 hält erst mit je vier Würfen aus der Beute von Alruna und Orm; mit je zwei war die
Truhe etwa einen Lauf wert.

## Grenzen

- **Steile Kurve.** Zehn Helden über 16 Runden heisst wenig Zufall: 250 Leben mehr oder weniger bewegen «Gut» um 20
  bis 25 Punkte, Sets +3 → +5 heben es von 67 auf 100 %, Sets +0 drücken «Profi» auf 40 %. Der Raid ist ein Rätsel
  mit Ausrüstungsprüfung, kein Würfelspiel. Weiche Masse sind Zenits Rest, «Was vom Pendel fiel» und der Kriegsrat.
- **In Siegen fallen viele:** Mit «Gut» stehen am Ende Ø 3,9 von 10, mit «Profi» 4,0, erst mit Sets +5 6,7 bis 7,2.
- **Die beste Aufstellung ist nicht naheliegend** (ein Sechser-Trupp links, Schützen in der Mitte), und Alrunas Liste
  bewertet nicht: «Profi» hat mehr Warnungen als «Gut». Liste, Kriegsrat und Ursachen-Satz gehören zusammen.
- **Heilregel nur im Raid.** In Dungeons heilen Heiler weiterhin nur vor dem Kampf.
- **Spott ist im Raid wertlos** (Letzte Bastion, Bärengestalt): gewollt und gesagt, nicht gelöst.
- **Ein Held je Klasse:** Wer eine Klasse noch nicht hat, spielt mit neun: «Profi» ohne Morn 65 %, ohne Liedra 48 %.
- **Wege:** Ein anderer Weg bewegt «Gut» zwischen 0 und 100 %. Mit Sina als Schattentänzerin passt keine der festen
  Aufstellungen; die Gilde braucht eine andere, die erst die Suche findet (Band 12). Die Daumenregeln passen also
  nicht für jede Gilde; Liste und Kriegsrat helfen, eine passende zu finden.
- **Wochenuhr am Gerät** ist verstellbar wie in der Rangliste; im Einzelspiel harmlos.
- **Wirtschaft:** Ein Set-Teil und Tagstein je Woche beschleunigen die zweite Reihe (gewollt). Zenits Truhe ist etwa
  zwei Läufe bei Orm wert, das meiste davon Gold (Band 13).
- **Bruchzahlen:** Schaden und Leben sind im Kampf oft gebrochen (Zeiger, Angriffswerte); erst der Bildschirm rundet.
- **Krit über 100 %:** Lia (140 %) und Sina (120 %) liegen in der Muster-Gilde darüber; der Rest verfällt.

## Ausbau

- **15 und 20 Helden** kommen mit einer Zweitbesetzung (je Klasse ein zweiter Held, etwa als Lohn des ersten
  Zenit-Siegs). Das braucht einen eigenen Schritt: Anheuern, der Spott-Rückfall im Kampf und die Klassen-Freischaltung
  nehmen heute einen Helden je Klasse an.
- **Der Raid-Code ist schon allgemein:** Spalten = 3 × `truppZahl`, das Pendel geht reihum (`(Runde − 1) mod
  truppZahl`), der Zeiger fährt alle Spalten ab, `truppName` kennt «Links», «Mitte», «Rechts» und «Aussen», die
  Spaltennamen reichen bis L. Ein 15er (3 Trupps, 9 Spalten, Leben etwa × 1,6) und ein 20er (4 Trupps, 12 Spalten,
  Leben etwa × 2,2) sind Daten und Eichung. Ein zweiter Raid braucht im Spielstand einen Stand je Raid (heute das eine
  Feld `raid`), und die Zeile «Das Pendel schlägt dann jede Runde …» der Liste nimmt bei mehr als zwei Trupps nur den
  nächsten Trupp an.
- **Ideen aus dem Konzept:** ein Kuckuck über dem Gang (Zielwahl), Raid-Befehle (einmal je Kampf eine Fähigkeit je
  Trupp, etwa Spott lenkt das Pendel eine Runde), Heil-Wege in der Heilregel stärker (heute Ewin als Kriegspriester
  74 % gegen 67 % als Lichtbringer), Sockel im Trophäensaal, Rivalen in der Rangliste, Monsterbuch, Fundbuch,
  Härtegrad «Albtraum» (Mittag ab Runde 10).

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/raids.ts` | Zenit: Werte, Regeln, Truhen, Kosten, Freischaltung, Teamwirkungen je Trupp, alle Texte (`RAID_TEXTE`) |
| `src/data/raidMuster.ts` | Muster-Gilde mit Varianten und die Muster-Aufstellungen |
| `src/models/RaidStand.ts` | Was der Spielstand vom Raid speichert |
| `src/systems/RaidKampf.ts` | Rechnung des Kampfs (rein: kein Spielstand), Hauptursache |
| `src/systems/Raid.ts` | Stand, Woche, Aufstellen, Ernstkampf, Truhen, XP, Zähler, Kriegsrat, Alrunas Liste, Rollen |
| `src/systems/CombatEngine.ts`, `src/systems/Kampfeffekte.ts` | Grundangriff, Regeneration und Buff-Ablauf für den Raid; `rundenEnde` mit `gegnerGift` |
| `src/systems/SpielstandSchema.ts` | Prüfung des Felds `raid` beim Laden einer Datei |
| `src/data/items.ts` | «Die Unruh» (`die_unruh`) |
| `src/data/achievements.ts` | die sechs Erfolge des Raids |
| `src/ui/screens/RaidScreen.ts`, `src/ui/html/raid.css` | der Raid-Bildschirm: Liste, Kriegsrat, Kopf, Uhrleiste, Feld, Bank, Wiedergabe, Ergebnis |
| `src/ui/components/ZenitUhr.ts` | Zenits Uhr, aus Code gezeichnet (Kopf, Karte, Wiedergabe) |
| `src/ui/screens/DungeonMapScreen.ts`, `src/ui/html/dungeonkarte.css` | Kartenknoten, Jorindes Leiter und der Nachthimmel über den Pfeilern |
| `src/systems/Probespiel.ts` | `?probe=raid` |
| `tools/raidEichung.ts` | Eichung |
| `tests/raid.test.ts` | Regeln, Heilregel, Trupps, Bestimmtheit, Kriegsrat, Freischalten, Woche, Truhen, XP, Zähler, Liste, Speichern, Eichbänder |

## Spielstand

Ein neues Feld, freiwillig: `raid` (`RaidStand`: Aufstellung, Woche mit Versuchen und Truhen, Bestversuch, Zahl der
Ernstkämpfe und Siege, Verlauf, gelesene Geschichten, `montagGesehen`). Fehlt es, legt `raidStand` es beim ersten
Aufruf an, mit der Startaufstellung; der Kartenknoten liest nur und legt nichts an (`raidKartenZustand`). Keine neue
SaveVersion. Die Zähler stehen in `state.statistics`, die Unruh im Lager. `SpielstandSchema` prüft das Feld beim
Laden einer Datei; Pflicht sind `aufstellung`, `woche`, `versucheGesamt`, `siege` und `verlauf`. Was die Prüfung
durchlässt, aber nicht ins Raster passt (halbe Felder, Felder neben dem Raster, doppelt belegte Felder, entlassene
Helden), räumt `raidStand` beim nächsten Aufruf weg. Fehlt `bestRest`, trägt `raidStand` null nach (noch kein
Versuch), und die Karte liest es schon vorher so.

## Bildschirm und Karte

### Auf der Dungeon-Karte
- Der Raid steht als Sechseck über «Die Pfeiler des Tages» (Ebene 12), Lage und Grösse in `ZENIT.karte`
  (x 390, y −4120, Radius 72). Im Sechseck hängt Zenits Uhr (Glocke und Pendel ragen hinaus), rechts daneben stehen
  «RAID · 4 BIS 10 HELDEN», der Name und eine Zeile. Von oben bis knapp über die Pfeiler liegt Nacht mit Sternen, die
  nach unten verblassen, hinter dem Sechseck ein goldener Schein; darüber führt ein Weg ins Unerforschte.
- Jorindes Leiter (zehn Sprossen) führt von der Spitze der Pfeiler zur unteren rechten Kante des Sechsecks,
  am Pendel vorbei.
- Gesperrt, solange Ebene 12 nicht besiegt ist: Leiter gestrichelt, Uhr blass, Schloss, Zeile «Erst die
  Pfeiler des Tages». Offen: die Zeile aus `raidKartenZustand` (noch kein Versuch, Bestversuch in Prozent,
  aufgezogen nach einem Sieg, diese Woche besiegt; dann steht die Uhr auf zwölf, und die Zeile ist grün) und ein
  pulsierender Punkt, solange Zenits Truhe dieser Woche wartet, also bis zum ersten Sieg der Woche.
  Die Karte liest den Spielstand nur, sie legt keinen Raid-Stand an.
- Klick auf das Sechseck öffnet den Raid (`navigateTo('raid')`), auch gesperrt: Dann steht dort, was fehlt. Zurück
  auf der Karte steht der Raid in der Mitte.

### Die Uhr (`src/ui/components/ZenitUhr.ts`)
- Aus Code gezeichnet (kein Bild): Zifferblatt, Zeiger, Glocke oben, Pendel unten, Zahnräder, Strahlen. Sie steht im
  Kopf des Raid-Bildschirms, auf der Karte und in der Wiedergabe.
- Kurz vor zwölf, bis Zenit in dieser Woche besiegt ist, dann auf zwölf; am Montag zieht er sich wieder auf.
- In der Wiedergabe zeigt der grosse Zeiger nach unten auf die Spalte, die er drückt (A links bis F rechts),
  der kleine auf die Stunde (Runde), das Pendel schwingt zum Trupp, den es trifft. Glocke und Funken leuchten.
  Fällt Zenit, springen die Zeiger am Ende auf zwölf.

### Der Raid-Bildschirm (`src/ui/screens/RaidScreen.ts`, `src/ui/html/raid.css`)
- PC, drei Spalten:
  - links Alrunas Liste (Hinweise zur Aufstellung; mit der Maus über einem Punkt, oder angetippt, leuchten die Felder,
    um die es geht) und der Kriegsrat (20 Proben: Siege, Zenits Rest im Schnitt, häufigste Ursache, wer am häufigsten
    fiel, wen die Funken trafen, ein Satz von Alruna, Knopf zum Probelauf);
  - in der Mitte der Kopf (Uhr, Zenits Werte, Lebensbalken mit Strichen für die letzten Ernstkämpfe und dem
    Bestversuch, freie Versuche, Tagstein im Lager, Wochentruhen), die Uhrleiste (24 Runden: welche Spalte der Zeiger
    drückt, rot, wenn sie leer ist, gelb, wenn nur einer sie trägt; wohin das Pendel schwingt; wann Funken und Glocke
    kommen; Vormittag, Mittag, Mitternacht), das Feld mit 3 Reihen und 6 Spalten (A bis C Trupp links, D bis F Trupp
    rechts, dazwischen der Gang; Marken für die Pendelziele, das Funkenziel und seine Nachbarn, ein Band auf der
    Glockenreihe) und die Knöpfe Kriegsrat und Ernstkampf;
  - rechts die Bank: alle Helden, nach Rolle geordnet, mit Rolle, Stufe, Klasse, Weg, Set, Werten und Feldmarke.
- Bedienen: am PC einen Helden auf ein Feld oder auf die Bank ziehen; sonst Held anklicken (antippen) und dann ein
  Feld. Ein besetztes Feld tauscht, die Bank oder «Auf die Bank» nimmt zurück, «Leeren» räumt nach einer Rückfrage das
  ganze Feld. Rechtsklick oder langes Drücken öffnet das Blatt des Helden. Escape hebt die Wahl auf (sonst geht Escape
  wie überall zurück), Enter oder Leertaste auf einem Feld wirkt wie Antippen.
- Handy: alles untereinander (Kopf, Uhrleiste, Feld, Liste, Bank), unter dem Feld eine Zeile, was ein Tippen gerade
  tut; die Liste zeigt zuerst nur die Warnungen, Zenits Werte und die Wochentruhen fallen weg; die Bank ist eine Reihe
  zum Wischen, Kriegsrat und Ernstkampf stehen unten fest, der Kriegsrat kommt als Fenster; kein seitliches Scrollen
  der Seite. Fenster kommen von unten, die Wiedergabe füllt den ganzen Bildschirm.
- Erster Besuch: ein Einleitungsfenster. In einer neuen Woche nach früheren Ernstkämpfen kommt ein Satz in der
  Kopfzeile (Montag). «?» öffnet die Regeln («Wie Zenit schlägt»).

### Wiedergabe, Truhe und Ergebnis
- Wiedergabe Runde für Runde (Tempo 1×, 2×, 4×, Pause): Zenits Leben, Uhr, die Lebensbalken der Helden, getroffene
  Felder mit Zahlen (Schaden rot, Heilung grün, nichts bei 0), Laufzeilen je Ereignis und die Sätze des
  Stadtschreibers. Ein Ausweichen oder Abschirmen heisst «unversehrt». Betäubt ein Held Zenit, sagt eine Zeile etwa
  «Zenit setzt aus (Erschütterungsschlag von Grimm): kein Pendel» (Ereignis `aussetzen`).
- Probelauf: die erste Probe des Kriegsrats als Wiedergabe, zählt nicht; sie bleibt am Ende stehen, bis man schliesst.
- Ernstkampf: kostet einen freien Versuch oder 10 Tagstein (dann mit Rückfrage). Die Wiedergabe geht am Ende von
  selbst weiter (oder mit «Zum Ergebnis») zur Truhe, falls eine fällig ist, und zum Ergebnis: Rest in Prozent,
  Runden, wer stand, Bestversuch, Kosten, beim ersten Sieg der Schluss der Geschichte, was ins Lager kam, XP, Stufen,
  wer am meisten Schaden und Heilung machte, Erfolge, Gefallene mit Ort und Runde und Alrunas Satz dazu, die Chronik.
  Aus dem Ergebnis lässt sich die Wiedergabe noch einmal ansehen; die Knöpfe führen zur Karte, zurück zur Aufstellung
  oder gleich zum nächsten Ernstkampf.

### Probespiel
- `?probe=raid`: alle Bosse bis Ebene 12 besiegt (die Leiter steht), die Muster-Gilde «anker» (zehn Helden auf Stufe
  15 mit Ausrüstung und Schmiede-Stufen, Ids 1 bis 10) und 40 Tagstein, in einem eigenen Speicherplatz. Der Raid ist
  offen, die Aufstellung ist die Startaufstellung.
