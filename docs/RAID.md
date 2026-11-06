# Raid «Über dem Tag»

Ganz oben über der Dungeon-Karte, über den Pfeilern des Tages, hängt Zenit, das Uhrwerk. Der Raid ist ein
einziger grosser Kampf für 4 bis 10 Helden auf einem Feld aus 3 Reihen und 6 Spalten, in zwei Trupps geteilt.
Zenit zielt nicht auf Helden, er trifft Orte: das Pendel die vorderste Reihe eines Trupps, der Zeiger eine Spalte,
die Glocke die vollste Reihe, die Funken den besten Schadensmacher und seine Nachbarn. Die Aufstellung ist das
Spiel: Dieselbe Gilde gewinnt mit der naheliegenden «Lehrbuch»-Aufstellung nie und mit der besten gefundenen fast
immer. Diese Datei hält fest, wie der Kampf rechnet, was eine Woche bringt, was Alrunas Liste und der Kriegsrat
sagen und wie Zenit geeicht ist. Stand 6.11.2026.

Nach dem ersten Sieg öffnet sich Stufe II, «Die dreizehnte Stunde»: Zenit mit einem zweiten Zeiger, der rückwärts läuft,
gegen 10 bis 15 Helden in drei Trupps. Nach dem ersten Sieg dort öffnet sich Stufe III, «Das Kuckucksei»: Zenit mit
beiden Zeigern und einem Kuckuck, der an den Gängen pickt, gegen 15 bis 20 Helden in vier Trupps. Was hier ohne Stufe
steht, gilt für Stufe I («Über dem Tag»); was auf den höheren Stufen anders ist, steht in ihren Abschnitten.

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
Hinweis in der Kopfzeile (das Ergebnis zeigt sie). Kriegsrat und Probeläufe zählen nicht. Die Zähler unten zählen nur
Ernstkämpfe auf Stufe I; Stufe II hat zwei eigene Erfolge mit eigenen Zählern (Abschnitt «Stufe II»).

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
mit einem Lauf bei Orm (wie unter «Truhen») und prüft die Eichbänder unten; danach dasselbe für Stufe II (Abschnitt
«Stufe II»). Verfehlt es eines, endet es mit 1. Dazu:

- `npm run raid-eichung -- --stufe I` (oder `II`): nur eine Stufe; mit `--leben` das Leben dieser Stufe.

- `npm run raid-eichung -- --laeufe 1000`: mehr Läufe je Zeile.
- `npm run raid-eichung -- --leben 13500,14000,14500`: Zenits Leben durchprobieren (ohne Bänder).
- `npm run raid-eichung -- --ohne glocke,funken`: mehrere Regeln zusammen aus, als Zeile mehr unter «Je eine Regel aus».
- `npm run raid-eichung -- --wege`: je ein Held mit dem anderen Weg seiner Klasse. Bleibt «Profi» damit unter 90 %,
  sucht das Werkzeug ab «Gut» eine Aufstellung für diese Gilde (dieselbe Suche wie `--suche`, 300 Schritte) und zeigt
  sie. Auf Stufe II mit `anker15`, jeder der fünfzehn einzeln, auch die Lehrlinge.
- `npm run raid-eichung -- --suche t4`: Aufstellungssuche für eine Gilde. Ab «Gut» setzt sie 200-mal einen Helden auf
  ein zufälliges Feld (ist es besetzt, tauschen die beiden) und behält die neue Aufstellung, wenn sie in 40 Proben
  mindestens so gut abschneidet (zuerst die Siege, dann Zenits Rest); die beste misst sie am Ende mit 400 Läufen. Auf
  Stufe II (15 Helden, 27 Felder) setzt sie in drei von zehn Schritten zwei Helden statt einem; einzeln blieb sie dort
  stecken (Abschnitt «Eichung von Stufe II», «Je ein Weg anders»).

Nach Änderungen an Kampf, Klassen, Wegen, Sets, Schmiede, Beute oder Zenit neu laufen lassen und die Tabellen hier
nachführen; `tests/raid.test.ts` prüft die Bänder mit 20 Samen und meldet Verschiebungen sofort. Stellschraube zuerst
Zenits Leben, in Schritten von 250, erst danach Wuchten oder Heilfaktor. Gemessen am 6.11.2026; ein Kampf braucht 1,6
bis 1,8 ms (Node 22.22), das Werkzeug für Stufe I rund 20 Sekunden (mit `--wege` und `--suche t4` rund 70), mit
Stufe II zusammen rund 45; `--stufe II --wege` braucht rund zwei Minuten (15 Helden, eine Suche über 600 Schritte).

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

## Stufe II: Die dreizehnte Stunde

Nach dem ersten Sieg zieht sich Zenit wieder auf, mit einer Ersatz-Unruh, und seither hat er zwei Zeiger. Stufe II ist
derselbe Raid auf einem breiteren Feld: «Zenit, aufgezogen» gegen 10 bis 15 Helden auf 3 Reihen und 9 Spalten (A bis I)
in drei Trupps. Alles in den Abschnitten oben gilt auch hier; dieser Abschnitt nennt, was anders ist. Die Zahlen stehen in
`RAID_DEFS.dreizehn` (`DREIZEHN`), die Texte in `STUFEN_TEXTE.dreizehn` (`src/data/raids.ts`). Stufe I rechnet Zeichen für
Zeichen wie vorher: Verlauf, Protokoll, Ansagen und Hauptursache von 510 Kämpfen (alle Muster-Gilden und
-Aufstellungen, mit und ohne einzelne Regeln) haben vor und nach dem Umbau denselben Fingerabdruck, und
`tests/kampfUnveraendert.test.ts` läuft unverändert.

### So wirkt es im Spiel

- **Offen** nach dem ersten Sieg auf Stufe I (`freiNachRaid: 'zenit'`, dazu wie dort die Pfeiler des Tages). Bis dahin
  steht Stufe II im Umschalter mit Schloss («Erst Zenit einmal anhalten»), ihr Bildschirm sagt, was fehlt, mit einem
  Knopf «Zu Stufe I», und der Spielstand bekommt für sie nichts. Das Ergebnis des ersten Siegs auf Stufe I meldet «Neu
  offen: Stufe II, «Die dreizehnte Stunde»» und führt mit einem Knopf hin.
- **Erster Besuch:** eine eigene Einleitung (Ersatz-Unruh, Gegenzeiger, drei Trupps, die Hocker im Gildenhaus) und
  die Startaufstellung wie auf Stufe I: vorne voll, dann die Mitte, die ersten fünfzehn in der Reihenfolge der Gilde.
- **Eigene Woche:** drei freie Ernstkämpfe, danach je 10 Tagstein, getrennt von Stufe I gezählt. Eigene Truhen, eigener
  Bestversuch, Verlauf, Montag-Satz und Kriegsrat (sein Schlüssel beginnt mit `dreizehn#`, ein Rat von Stufe I gilt hier
  nicht). Samen wie auf Stufe I, mit der Id der Stufe gemischt.
- **10 bis 15 Helden.** Mit einem Helden je Klasse hat eine Gilde genau zehn; mehr bringen die Lehrlinge
  (`docs/AUSBILDUNG.md`, je Klasse ein zweiter Held). Mit zehn ist Stufe II gewollt kaum zu schaffen (die besten
  gefundenen zehn: 5 %, Band S5).

### Zenit, aufgezogen

| Leben | Angriff | Abwehr | Tempo | Krit |
|---|---|---|---|---|
| 15 250 | 110 | 12 | 1,0 | 10 % × 1,5 |

Die Regeln wie auf Stufe I, dazu `gegenzeiger: 1,0`. Die Abwehr ist halbiert: Die Ersatz-Unruh ist grösser als die alte,
und der Deckel geht nicht mehr ganz zu. Annahme: Mit Abwehr 24 hätte Zenit für dieselben Siegchancen nur rund 13 000
Leben gebraucht, weniger als auf Stufe I; mit 12 zählen die Treffer der Lehrlinge, und der grössere Lebensbalken passt
zur höheren Stufe. XP: 450 beim Sieg, 150 bei der Niederlage, je Teilnehmer.

### Gegenzeiger und dreizehn

- **Gegenzeiger** (jede Runde, gleich nach dem Zeiger): Runde 1 Spalte I, Runde 2 H … Runde 9 A, Runde 10 wieder I
  (`gegenzeigerSpalte`). Sonst wie der Zeiger: Wucht 110 (ab Mittag 165), geteilt durch die Lebenden der Spalte; ist sie
  leer, schlägt er durch, Wucht 66 (ab Mittag 99) auf alle. Fehlt `regeln.gegenzeiger`, gibt es ihn nicht (Stufe I);
  die Eichung schaltet ihn mit `ohne: ['gegenzeiger']` ab.
- **Es schlägt dreizehn** (Runde 5, 14 und 23, `treffpunkte`): Beide Zeiger stehen auf Spalte E. Zuerst drückt der
  Zeiger, dann der Gegenzeiger, beide geteilt auf die Lebenden der Spalte. Fällt der Einzige auf E schon unter dem Zeiger,
  schlägt der Gegenzeiger durch, auf alle. E trägt also nur in drei Runden, dann aber doppelt.
- **Mittag** (Runde 12): Pendel rechts, Funken, Glocke, Zeiger C und Gegenzeiger G zugleich.

| Spalte | Zeiger in Runde | Gegenzeiger in Runde | Schläge am Tag |
|---|---|---|---|
| A | 1, 10, 19 | 9, 18 | 5 |
| B | 2, 11, 20 | 8, 17 | 5 |
| C | 3, 12, 21 | 7, 16 | 5 |
| D | 4, 13, 22 | 6, 15, 24 | 6 |
| **E** | 5, 14, 23 | 5, 14, 23 | 6, in drei Runden |
| F | 6, 15, 24 | 4, 13, 22 | 6 |
| G | 7, 16 | 3, 12, 21 | 5 |
| H | 8, 17 | 2, 11, 20 | 5 |
| I | 9, 18 | 1, 10, 19 | 5 |

Die Mitte (D bis F) trägt 18 Zeigerschläge am Tag, jeder Trupp aussen 15.

- **In Wiedergabe, Ursache und Ansagen:** Der Gegenzeiger ist ein eigenes Ereignis (`gegenzeiger`), sein Durchschlag
  ein `durchschlag` mit `gegen: true`. Gefallene heissen «Gegenzeiger (Spalte E)» oder, wie auf Stufe I, «Durchschlag
  (Spalte C leer)»; der Satz zum Durchschlag nennt auf Stufe II beide Zeiger («… wer von den beiden Zeigern dort
  vorbeikam, ging durch alle»), denn eine leere Spalte schlägt unter beiden durch. Die Ansage «Es schlägt dreizehn:
  Beide Zeiger stehen auf Spalte E. Zenit tut, als sei das Absicht.» kommt einmal je Kampf; Zahl und Ende haben eigene
  Sätze (`STUFEN_TEXTE.dreizehn.ansage`), mit fünfzehn gibt es keine Zahl-Ansage.

### Drei Trupps

- **Links** A bis C, **Mitte** D bis F, **Rechts** G bis I, dazwischen zwei Gänge. Teamwirkungen, Heilregel, Abfangen
  und Deckung wirken wie auf Stufe I, je Trupp, und Spott hilft auch hier nicht; die Funken springen über keinen der
  beiden Gänge.
- **Pendel** reihum: Runde 1 links, 2 Mitte, 3 rechts, 4 wieder links (`pendelTrupp`). Jede Front fängt es also nur
  jede dritte Runde (Stufe I: jede zweite). Ein leerer Trupp gibt seine Runden an den nächsten weiter, nach rechts und
  von rechts wieder nach links; Alrunas Liste sagt dann, wohin, und ob es dort doppelt oder dreimal so oft schlägt.

### Alrunas Liste und Kriegsrat

Die Liste rechnet wie auf Stufe I, mit drei Trupps und zwei Zeigern: Eine leere Spalte nennt die Durchschläge beider
Zeiger mit ihren Runden, ein Einzelner, der keine drei Zeigerschläge hält, die Runden beider Zeiger. Eine eigene Zeile
sagt, wer auf E die dreizehn trägt: ☐, wenn dort niemand steht (dann schlagen beide durch), wenn einer allein dort ab
Mittag keine zwei solchen Runden hält (fällt er unter dem Zeiger, schlägt der Gegenzeiger durch) oder wenn einer von
mehreren sie nicht hält; sonst ☑. Die Zahl-Zeile kennt zehn bis fünfzehn. Die Liste der Muster-Gilde mit «Gut» (68 %):

```
☐ Die Glocke schlägt in Reihe 2, dort stehen 7: Sina, Ansgar, Ewin, Moos, Ysra, Morn und Pirmin. Sie zählt gern.
☑ Pendel links trifft Brom. Brom hält etwa 14 Schläge, ab Mittag 5.
☑ Pendel Mitte trifft Bertram. Bertram hält etwa 3 Schläge, ab Mittag 2.
☑ Pendel rechts trifft Grimm. Grimm hält etwa 9 Schläge, ab Mittag 5.
☑ Auf Spalte E treffen sich die Zeiger, in Runde 5, 14 und 23. Dort teilen sich Ansgar und Bertram beide.
☑ Jede Spalte ist besetzt. Zeiger und Gegenzeiger finden überall jemanden.
☑ Funken: wohl Sina. Niemand daneben.
☑ Links: Mondwall, Phalanx, Tragkraft, Heldenlied, Seuche. Heiler: Ewin.
☑ Mitte: Hain, Schmiedetakt, Schildwall, Phalanx, Heldenlied. Heiler: Ansgar und Moos.
☑ Rechts: Wachfeuer, Kriegssegen. Heiler: Pirmin.
☑ Fünfzehn gehen hinauf. Für so viele hatte Alruna nie eine Liste. Sie schreibt gerade eine.
```

Auch hier bewertet die Liste nicht: «Gut» hat eine Warnung, «Profi» (99 %) sechs (Wenna allein vorn rechts hält einen
Schlag, D und H tragen je nur einen, sechs in der Glockenreihe, Lia neben Sina, die Mitte ohne Heiler), «Lehrbuch» (0 %)
sechs, «Naiv» neun. Der Kriegsrat (20 Proben, Samen wie auf Stufe I):

| Aufstellung | Siege | Zenit im Schnitt | Meist gefallen durch | Am häufigsten gefallen |
|---|---|---|---|---|
| anker15 · Gut | 14 von 20 | 1 % | Glocke (Reihe 3) | Morn (20 von 20) |
| anker15 · Profi | 20 von 20 | 0 % | Pendel (Trupp rechts) | Wenna (20 von 20) |
| anker15 · Lehrbuch | 0 von 20 | 26 % | Durchschlag (Spalte C leer) | Morn (20 von 20) |
| anker15 · Naiv (die Startaufstellung) | 0 von 20 | 44 % | Glocke (Reihe 2) | Liedra (20 von 20) |
| Anker · die besten zehn | 3 von 20 | 16 % | Durchschlag (Spalte A leer) | Liedra (20 von 20) |

Die ersten Funken trafen in allen fünf Sina, in jeder Probe. Rechenzeit 60 bis 160 ms für die 20 Proben (Node 22.22).

### Truhen, Erster Sieg, Erfolge

| Truhe | Wann | Inhalt |
|---|---|---|
| **Was der Gegenzeiger verlor** | der erste Ernstkampf der Woche auf Stufe II, nach dem Zenit unter 50 % steht | 250 Gold, 8 Tagstein und ein Set-Teil der Stufen 6 bis 10, das der Gilde fehlt; fehlt dort keins mehr, 12 Kristallsplitter statt des Teils |
| **Die dreizehnte Truhe** | der erste Sieg der Woche auf Stufe II | je sechs Würfe aus der Beute von Alruna und Orm (Stufe I: je vier), ein Set-Teil, das der Gilde fehlt (gewählt wie bei Zenits Truhe, aber aus den Stufen 10 bis 12 statt 9 bis 12), 15 Tagstein, 25 Kristallsplitter; fehlt keins mehr, 30 Kristallsplitter statt des Teils |
| **Die Ersatz-Unruh** | der erste Sieg auf Stufe II | ein zweiter Schmuck `die_unruh` (Stufe 12, legendär), nur einmal |

- **Wert** (4000-mal gezogen, die Gilde ohne Set-Teile; Gold und Grundwert der Gegenstände, ohne Set-Teile und
  Tagstein): Die dreizehnte Truhe Ø 9046 (Gold 5521, 8,1 Stück Ausrüstung), Zenits Truhe Ø 6003 (Gold 3680, 5,4 Stück),
  also das 1,5-Fache und dazu ein höheres Set-Teil. «Was der Gegenzeiger verlor» Ø 250 gegen 150.
- **Wochenchance:** Drei freie Versuche machen aus 68 % («Gut») 97 %, aus 5 % (die besten zehn) 14 %.
- **Erfolge** (Gruppe «Dungeons», `docs/ERFOLGE.md`): 🕐 «Es schlägt nicht dreizehn» (`raid2_siege` ≥ 1) und 🗓️
  «Doppelschicht» (`raid2_wochen` ≥ 4, die dreizehnte Truhe in vier verschiedenen Wochen). Die sechs Zähler von Stufe I
  zählen nur Ernstkämpfe auf Stufe I: Auf Stufe II gewinnt «Profi» in 96 % bis Runde 12 mit Ø 6,6 Stehenden, «Punkt
  zwölf» und «Mehr als vier» wären dort geschenkt, und vier Helden gibt es dort nicht. Ein Erfolg «alle fünfzehn
  stehen» wäre unerreichbar (0 % in jeder Zeile, auch mit «Profi»).

### Spielstand

`raidStufen` (freiwillig): je höherer Stufe ein `RaidStand` wie `raid`, nach Id (`raidStufen.dreizehn`); Stufe I bleibt
in `raid`, `gespeicherterStand` wählt das Feld. `raidStand` legt den Eintrag erst an, wenn die Stufe offen ist, vorher
gibt es einen Stand, der nirgends hängt; Karte und Umschalter lesen nur (`raidKartenZustand`, `freiDieseWoche`). Ältere
Spielstände laden unverändert, keine neue SaveVersion. `SpielstandSchema` prüft jeden Eintrag wie `raid`.

### Bildschirm und Karte

- **Umschalter** «Stufe I» / «Stufe II» (`.r-stufen`): am PC links über Alrunas Liste, am Handy oben, auf einer
  gesperrten Stufe über dem Hinweis, was fehlt. Jeder Knopf nennt Stufe, Name, Helden und den Stand der Woche
  (Schloss mit Grund; frei n von 3; Ernstkampf je 10 Tagstein; ✓ diese Woche besiegt) und trägt «neu», bis die
  Einleitung der Stufe gelesen ist. Beim Öffnen gilt die höchste offene Stufe, die Wahl hält bis zum Neuladen.
  Wechseln hebt die Wahl eines Helden auf; jede Stufe hat ihren eigenen Kriegsrat und merkt sich ihren letzten Rat.
- **Alles nach der Stufe:** Titel «ZENIT, AUFGEZOGEN», Uhr, Werte, Truhen, Liste, Kriegsrat, Regeln, Wiedergabe,
  Ergebnis und Bank lesen die gewählte Stufe. Feld, Bank, Blatt und Wiedergabe zeigen die Helden mit ihrem Bild
  (`bildKarte` aus `src/ui/heldBild.ts`; Lehrlinge gespiegelt).
- **Feld** mit 9 Spalten und zwei Gängen, am PC (1400 × 900) nebeneinander. Am Handy (390 px) stehen die drei Trupps
  untereinander, je Trupp Name (mit Heilern), Spaltenköpfe und drei Reihen über die ganze Breite, mit Reihenköpfen und
  Glockenband je Trupp: Zellen von 105 × 44 Pixeln (vorher 34 × 50, neun Spalten nebeneinander), Bild links, Name und
  Leben rechts, Namen in Crimson Text; «Nekromant», der längste Klassenname, passt ganz hinein. Das Feld ist am Handy
  so rund 585 statt 195 Pixel hoch. Das Gitter liest seine Lage aus Variablen (`--gr`/`--gc`, am Handy `--hr`/`--hc`,
  `feldHtml` in `RaidScreen.ts`). Stufe I bleibt am Handy nebeneinander (sechs Spalten, Zellen um 52 Pixel). Spalte E
  trägt im Kopf eine «13».
- **Uhrleiste** mit zwei Zeilen je Runde (Zeiger, Gegenzeiger in Türkis), Runde 5, 14 und 23 als «13» markiert, Pendel
  links, Mitte, rechts.
- **Uhr:** ein zweiter, türkiser Zeiger. Kurz vor dreizehn, bis Zenit auf Stufe II in dieser Woche besiegt ist, dann
  angehalten zwischen zwölf und dreizehn. In der Wiedergabe läuft der Gegenzeiger rückwärts über die Spalten.
- **Karte:** Bis Stufe II offen ist, bleibt der Knoten wie oben beschrieben. Danach zeigt er die Uhr von Stufe II,
  «RAID · 4 BIS 15 HELDEN» und zwei Zeilen, «Stufe I · …» und «Stufe II · …» (grün, wenn Stufe II diese Woche
  besiegt ist); der goldene Punkt pulsiert, solange auf einer der beiden Stufen die Siegtruhe der Woche wartet.
- **Probespiel** `?probe=raid2`: wie `?probe=raid`, dazu die fünf Lehrlinge (Gilde `anker15`, 15 Helden), Zenit auf
  Stufe I in der Woche davor einmal besiegt (die Unruh liegt im Lager), 60 Tagstein; Stufe II ist offen und noch nicht
  besucht.

### Eichung von Stufe II

`npm run raid-eichung` rechnet nach Stufe I dieselben Tabellen für Stufe II; `-- --stufe II` nur diese, mit
`--leben` deren Leben, `-- --suche zehn` sucht die besten zehn neu (600 Schritte ab «zehn»). `tests/raid.test.ts` prüft
die Bänder mit den 20 Samen.

**Muster-Gilde «anker15»** (`raidMusterHelden('anker15')`): der Anker und fünf Lehrlinge auf Stufe 15 mit Weg, ohne
Schmiede-Stufen, in dem, was im Lager lag, während der Kern die neuen Sets bekam: Bertram (Wächter, Phalanx) im
Rüstzeug des Eisernen Kommandanten mit Seelenbrecher, Pirmin (Kleriker, Kriegspriester) im Nachlass des Schattenlichs,
Wenna (Waldläuferin, Scharfschützin) in den Köpfen der Hydra, Benno (Barde, Heldenlied) in T4 (Bogen der Ewigen Jagd,
Schattenjäger-Rüstung, Arkan-Amulett), Mirabell (Hexe, Sturmhexe) in der Glut des Magma-Wyrms. Ein zweiter Schild und
ein zweiter Salbentopf für den dritten Trupp, dazu Bogen, Lied und Hexe.

Die Aufstellungen (`RAID_AUFSTELLUNGEN_DREIZEHN`, Reihe 1 vorn, «|» sind die Gänge):

```
«Gut» (Daumenregeln für drei Trupps)
     A        B        C        | D        E        F        | G        H        I
 1   Brom     .        .        | .        Bertram  .        | .        Grimm    .
 2   .        Ewin     Morn     | Moos     Ansgar   Ysra     | Pirmin   .        Sina
 3   Lia      Liedra   Mirabell | Benno    .        .        | Wenna    .        .

«Profi» (Fund der Aufstellungssuche ab «Gut»)
     A        B        C        | D        E        F        | G        H        I
 1   .        Sina     .        | .        Grimm    .        | .        .        Wenna
 2   Brom     Lia      Ewin     | .        .        Bertram  | Mirabell Morn     .
 3   Moos     Ansgar   Ysra     | Liedra   .        .        | Pirmin   .        Benno

«Lehrbuch» (Tanks vorn, Heiler dahinter, ohne Rücksicht auf die Zeiger)
     A        B        C        | D        E        F        | G        H        I
 1   .        Brom     .        | .        Bertram  .        | .        Grimm    .
 2   Liedra   Ewin     .        | Ansgar   Moos     .        | Benno    Pirmin   .
 3   .        Lia      Morn     | .        Sina     Ysra     | .        Wenna    Mirabell

«Naiv» (die Startaufstellung: vorne voll, dann Mitte)
     A        B        C        | D        E        F        | G        H        I
 1   Brom     Grimm    Lia      | Sina     Ansgar   Ewin     | Moos     Liedra   Ysra
 2   Morn     Bertram  Pirmin   | Wenna    Benno    Mirabell | .        .        .

«die besten zehn» (Anker ohne Lehrlinge, Fund der Aufstellungssuche)
     A        B        C        | D        E        F        | G        H        I
 1   Liedra   .        Grimm    | Ysra     .        .        | .        Brom     .
 2   .        .        .        | .        Morn     Ansgar   | Moos     .        .
 3   .        Ewin     .        | .        .        .        | Lia      .        Sina
```

- **Gut:** je Trupp ein Tank allein vorn und ein Heiler, jede Spalte besetzt, auf E zwei Zähe (Bertram und Ansgar), Sina
  in der Ecke ohne Nachbarn. Schwäche: sieben in der Glockenreihe.
- **Profi:** Die Suche stellt Sina und Wenna allein nach vorn: Wenna hält das Pendel rechts etwa einen Schlag lang
  (sie fällt in jeder Probe des Kriegsrats), danach trifft es die Reihe dahinter; Grimm trägt auf E die dreizehn allein.
  Nicht naheliegend, wie auf Stufe I.
- **Lehrbuch:** vier Spalten mit nur einem (A, C, G, I), die Funken treffen Sina, Moos und Ysra.
- **Die besten zehn:** fast jede Spalte mit nur einem; die Suche ab hier findet in 600 Schritten nichts Besseres (5 %,
  Zenit bei 16 %).

**Gemessen** (400 Läufe je Zeile, Samen i × 7919; Ø Runde und Ø stehend im Schnitt der Siege):

| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Zenit < 50 % | Sieg ≤ R12 | alle 15 stehen | Ø stehend | Mitternacht |
|---|---|---|---|---|---|---|---|---|
| anker15 · Gut | 68 % | 13,3 | 1 % | 100 % | 20 % | 0 % | 4,4 | 0 % |
| anker15 · Profi | 99 % | 11,5 | 0 % | 100 % | 96 % | 0 % | 6,6 | 0 % |
| anker15 · Lehrbuch | 0 % | – | 24 % | 100 % | 0 % | 0 % | – | 0 % |
| anker15 · Naiv (vorne voll) | 0 % | – | 44 % | 93 % | 0 % | 0 % | – | 0 % |
| Anker (10, ohne Lehrlinge) · die besten zehn | 5 % | 13,6 | 16 % | 100 % | 0 % | 0 % | 1,9 | 0 % |

**Mit den 20 Samen des Tests:** Gut 16 von 20 (Ø Runde 13,1), Profi 19, Lehrbuch 0 (Zenit bei 25 %), Naiv 0 (Zenit bei
44 %, unter 50 % in 19), die besten zehn 2 (Zenit bei 14 %).

**Je eine Regel aus** (400 Läufe, anker15 · Gut; der Zeiger nimmt nur seinen eigenen Durchschlag mit, der Gegenzeiger
seinen):

| Ohne | anker15 · Gut | gegenüber Gut | Zenit-Rest | Mitternacht |
|---|---|---|---|---|
| Pendel | 100 % | +32 | 0 % | 0 % |
| Zeiger (mit Durchschlag) | 100 % | +32 | 0 % | 0 % |
| Gegenzeiger (mit Durchschlag) | 100 % | +32 | 0 % | 0 % |
| Durchschlag | 99 % | +31 | 0 % | 0 % |
| Glocke | 100 % | +32 | 0 % | 0 % |
| Funken | 100 % | +32 | 0 % | 0 % |
| Mittag | 96 % | +28 | 0 % | 0 % |
| Heilregel | 0 % | −68 | 9 % | 0 % |

**Zenits Leben** (`--stufe II --leben`, 400 Läufe je Feld; die Bänder gelten für 15 250):

| Leben | anker15 · Gut | anker15 · Profi | anker15 · Lehrbuch | anker15 · Naiv | Anker · die besten zehn |
|---|---|---|---|---|---|
| 14 750 | 96 % | 100 % | 0 % | 0 % | 17 % |
| 15 000 | 86 % | 99 % | 0 % | 0 % | 10 % |
| **15 250** | **68 %** | **99 %** | **0 %** | **0 %** | **5 %** |
| 15 500 | 42 % | 98 % | 0 % | 0 % | 0 % |
| 15 750 | 21 % | 97 % | 0 % | 0 % | 0 % |

Um 15 250 herum bewegen 250 Leben «Gut» um 18 bis 26 Punkte, wie auf Stufe I.

**Je ein Weg anders** (`--stufe II --wege`, 400 Läufe; jeder der fünfzehn aus anker15 einzeln mit dem anderen Weg
seiner Klasse, auch die Lehrlinge; bleibt «Profi» unter 90 %, sucht das Werkzeug ab «Gut» eine Aufstellung, 600
Schritte zu 40 Proben, in drei von zehn Schritten zwei Helden):

| Held | Weg | anker15 · Gut | anker15 · Profi | mit Aufstellungssuche |
|---|---|---|---|---|
| Brom | Vergelter | 68 % | 98 % | – |
| Grimm | Schlächter | 54 % | 99 % | – |
| Lia | Fährtenleserin | 100 % | 100 % | – |
| Sina | Schattentänzerin | 1 % | 8 % | 96 % |
| Ansgar | Kreuzritter | 75 % | 92 % | – |
| Ewin | Kriegspriester | 74 % | 92 % | – |
| Moos | Bärengestalt | 81 % | 99 % | – |
| Liedra | Schmählied | 100 % | 100 % | – |
| Ysra | Sturmhexe | 8 % | 98 % | – |
| Morn | Knochenherr | 62 % | 99 % | – |
| Bertram (Lehrling) | Vergelter | 69 % | 99 % | – |
| Pirmin (Lehrling) | Lichtbringer | 100 % | 99 % | – |
| Wenna (Lehrling) | Fährtenleserin | 100 % | 100 % | – |
| Benno (Lehrling) | Schmählied | 100 % | 100 % | – |
| Mirabell (Lehrling) | Fluchweberin | 48 % | 99 % | – |

Vierzehn von fünfzehn Wegen halten «Profi» bei 92 bis 100 %; «Gut» schwankt stärker (Ysra als Sturmhexe 8 %,
Mirabell als Fluchweberin 48 %). **Sina als Schattentänzerin** passt wie auf Stufe I in keine der festen
Aufstellungen (Gut 1 %, Profi 8 %): Ihr fehlt der Meister-Effekt der Meuchlerin (2,5-facher Schaden, sobald Zenit
unter 60 % ist). Mit «Profi» macht Sina als Meuchlerin im Schnitt rund 5900 der 15 250 Leben, als Schattentänzerin
rund 3500 (mit «Gut» 3100 gegen 2100; je 100 Läufe). Die Suche ab «Gut» findet eine Aufstellung mit 96 % (Zenit-Rest
0 %, Ø Runde 12,8):

```
  .        Moos     .        | .        .        Bertram  | .        Grimm    .
  .        Ewin     Ysra     | Brom     Benno    Ansgar   | Liedra   .        Pirmin
  Lia      Wenna    Mirabell | .        Morn     .        | .        Sina     .
```

Die Suche von Stufe I (ein Held je Schritt, 300 Schritte) blieb hier bei 33 % stecken: 15 Helden auf 27 Feldern
sind ein grösseres Feld als 10 auf 18. Mit zwei Helden in drei von zehn Schritten kam sie nach 300 Schritten auf
90 %, nach 600 auf 96 %; Probesuchen mit anderen Samen und ab «Profi» (1000 Schritte) auf 91 bis 100 %. Dieselbe
Suche ab «zehn» (`--suche zehn`) findet für die besten zehn ohne Lehrlinge weiterhin nichts Besseres als 5 %; auch
vier Probesuchen über 1000 Schritte mit anderen Samen blieben dort (Band S5 hält).

**Eichbänder von Stufe II** (Stand 6.11.2026):

| # | Zeile | Test (20 Samen) | gemessen | Werkzeug (400 Läufe) | gemessen |
|---|---|---|---|---|---|
| S1 | anker15 · Gut | 11 bis 18 Siege, Ø Runde 12 bis 15 | 16, Ø 13,1 | 55 bis 75 % | 68 % ✓ |
| S2 | anker15 · Profi | mindestens 18 Siege | 19 | mindestens 90 % | 99 % ✓ |
| S3 | anker15 · Lehrbuch | höchstens 2 Siege, Zenit im Schnitt bei 15 bis 35 % | 0, 25 % | höchstens 10 % | 0 % ✓ |
| S4 | anker15 · Naiv | kein Sieg, Zenit im Schnitt bei mindestens 35 % | 0, 44 % | kein Sieg | 0 % ✓ |
| S5 | Anker · die besten zehn (ohne Lehrlinge) | höchstens 3 Siege | 2 | höchstens 15 %; Suche ab «zehn» (`--suche zehn`) höchstens 15 % | 5 %; 5 % ✓ |
| S6 | Mitternacht | höchstens einmal je Aufstellung | nie | höchstens 2 % in jeder Zeile | nie ✓ |
| S7 | Ohne Gegenzeiger | | | anker15 · Gut mindestens 20 Punkte mehr | +32 ✓ |
| S8 | Ohne Heilregel | | | anker15 · Gut höchstens 5 % | 0 % ✓ |
| S9 | Die dreizehnte Truhe | | | Wert 1,4- bis 2-mal Zenits Truhe | 1,5-mal ✓ |
| S10 | Je ein Weg anders | | | anker15 · Profi mindestens 90 %, sonst mit Aufstellungssuche ab «Gut» mindestens 90 % (`--stufe II --wege`, je Held ein Band) | 92 bis 100 %; Sina als Schattentänzerin 8 %, mit Aufstellungssuche 96 % ✓ |

Alle Bänder beider Stufen sind getroffen; die Tabellen von Stufe I oben sind nach dem Umbau gleich geblieben.

### Grenzen von Stufe II

- **Ohne Lehrlinge zehn Helden:** Mit einem Helden je Klasse kommt eine Gilde kaum durch (Band S5). Stufe II braucht
  die Lehrlinge: Heldenhaus, Reiter «Anheuern», sobald der Meister einer Klasse Stufe 15 hat; das Lehrbuch bringt sie
  mit dem Überschuss der Meister hoch (`docs/AUSBILDUNG.md`).
- **Steile Kurve** wie auf Stufe I: Der Kampf entscheidet sich um Mittag, 250 Leben bewegen «Gut» um 18 bis 26 Punkte.
- **«Profi» ist nicht naheliegend:** zwei Zerbrechliche allein vorn, sechs Warnungen in der Liste. Liste, Kriegsrat und
  Ursachen-Satz gehören zusammen.
- **Handy:** Die Trupps stehen untereinander (Felder 105 × 44 Pixel). Dafür ist das Feld rund 585 Pixel hoch, zwischen
  Bank und Feld rollt man weiter als auf Stufe I, und Reihe 1 von «Mitte» steht unter Reihe 3 von «Links»: «vorn» heisst
  je Trupp oben. Ziehen gibt es am Handy nicht, man tippt Held und Feld. Auf 360 Pixeln (Zellen 95 Pixel) kürzt nur
  «Nekromant» mit «…», alle übrigen Klassen- und Lehrlingsnamen passen.
- **Wege:** Alle fünfzehn Wege sind einzeln gemessen (Band S10). Mit Sina als Schattentänzerin passt wie auf Stufe I
  keine der festen Aufstellungen; die gesuchte gewinnt 96 %, ist aber nicht naheliegend. Liste und Kriegsrat helfen,
  eine passende zu finden; einen Weg wechseln kann ein Held nicht.

## Stufe III: Das Kuckucksei

Zenit stand still, bis ihm jemand ein Ei ins Gehäuse gelegt hat. Stufe III ist derselbe Raid auf dem breitesten Feld:
«Zenit, mit Kuckuck» gegen 15 bis 20 Helden auf 3 Reihen und 12 Spalten (A bis L) in vier Trupps (Links A bis C,
Halblinks D bis F, Halbrechts G bis I, Rechts J bis L). Alles von Stufe II gilt auch hier, mit Gegenzeiger; neu ist
der Kuckuck. Zahlen in `RAID_DEFS.kuckuck` (`KUCKUCK`), Texte in `STUFEN_TEXTE.kuckuck` (`src/data/raids.ts`). Die
Regel steht nur im Pfad des Raids: Stufe I und II rechnen Zeichen für Zeichen wie vorher, und
`tests/kampfUnveraendert.test.ts` läuft unverändert.

### So wirkt es im Spiel

- **Offen** nach dem ersten Sieg auf Stufe II (`freiNachRaid: 'dreizehn'`). Bis dahin steht Stufe III im Umschalter mit
  Schloss («Erst Zenit auf Stufe II anhalten»), und der Spielstand bekommt für sie nichts.
- **Erster Besuch:** eigene Einleitung (das Ei, die Türen über den Gängen, zwanzig Bänke) und die Startaufstellung wie
  auf den anderen Stufen: vorne voll, dann die Mitte.
- **Eigene Woche:** drei freie Ernstkämpfe, danach je 10 Tagstein; eigene Truhen, Bestversuch, Verlauf, Montag-Satz und
  Kriegsrat (Schlüssel `kuckuck#`).
- **15 bis 20 Helden.** Zwanzig hat eine Gilde mit allen zehn Lehrlingen. Mit fünfzehn ist Stufe III gewollt nicht zu
  schaffen (die beste gesuchte Ordnung: 0 %, Band K5).

### Zenit, mit Kuckuck

| Leben | Angriff | Abwehr | Tempo | Krit |
|---|---|---|---|---|
| 19 000 | 110 | 12 | 1,0 | 10 % × 1,5 |

Die Regeln wie auf Stufe II, dazu `kuckuck: 0,6`. Auf zwölf Spalten treffen sich Zeiger und Gegenzeiger nie: Es schlägt
nicht dreizehn. XP: 600 beim Sieg, 200 bei der Niederlage, je Teilnehmer.

### Der Kuckuck

- **Wann und wo:** jede Runde, nach dem Gegenzeiger, über einem Gang, reihum links, Mitte, rechts
  (`kuckuckGang`: Runde 1 links, 2 Mitte, 3 rechts, 4 wieder links). Am Gang stehen die zwei Spalten links und rechts
  davon: C und D, F und G, I und J (`gangSpalten`).
- **Wen:** den Lebenden mit den wenigsten Leben in diesen zwei Spalten; bei Gleichstand den weiter vorn, dann den
  weiter links. Er zielt also, anders als Pendel und Zeiger: Wer am Gang steht, sollte nicht der Kleinste sein.
- **Wie hart:** ein Grundangriff mit 0,6 × Angriff (66, ab Mittag 99), mit Krit, Ausweichen, Schutzherr und Deckung
  wie beim Pendel. Steht am Gang niemand, geht er wieder hinein (Ereignis ohne Treffer, Ansage
  «…schaut beleidigt…»).
- **Fällt einer daran**, heisst die Ursache «Kuckuck (Gang links)»; die Hauptursache nennt den Gang, bei mehreren
  Gefallenen am selben Gang die Zahl.
- **Was er verlangt:** Jede Spalte bleibt besetzt (sonst schlägt der Zeiger durch), aber an den sechs Gang-Spalten
  stehen Zähe, Ausweichende oder Geheilte, keine Zerbrechlichen. Die Ordnung von Stufe II, auf vier Trupps verlängert
  («Lehrbuch»), gewinnt nie, auch ohne Kuckuck nicht.

### Truhen und erster Sieg

| Truhe | Wann | Inhalt |
|---|---|---|
| **Was aus dem Nest fiel** | der erste Ernstkampf der Woche auf Stufe III, nach dem Zenit unter 50 % steht | 350 Gold, 10 Tagstein und ein Set-Teil der Stufen 8 bis 12, das der Gilde fehlt; fehlt dort keins mehr, 15 Kristallsplitter statt des Teils |
| **Das Nest** | der erste Sieg der Woche auf Stufe III | je acht Würfe aus der Beute von Alruna und Orm, ein Set-Teil (wie bei der dreizehnten Truhe aus den Stufen 10 bis 12), 20 Tagstein, 35 Kristallsplitter; fehlt keins mehr, 40 Kristallsplitter statt des Teils |
| **Das Kuckucksei** | der erste Sieg auf Stufe III | ein dritter Schmuck `die_unruh` (Stufe 12, legendär), nur einmal: Im Ei war kein Küken |

- **Wert** (4000-mal gezogen): Das Nest Ø 12 095 (Gold 7362, 10,7 Stück Ausrüstung), die dreizehnte Truhe Ø 9046,
  also das 1,3-Fache. «Was aus dem Nest fiel» Ø 350 gegen 250. Die Muster-Gilde trägt alle Set-Teile der Stufen 8 bis
  12 schon; sie bekommt dort den Ersatz.
- **Wochenchance:** Drei freie Versuche machen aus 67 % («Gut») 96 %.
- **Keine Erfolge.** Stufe III zählt eigens (`raid3_siege`, `raid3_wochen`), die Zähler von Stufe I und II bleiben
  stehen; kein Erfolg liest `raid3_…`. Annahme: Erfolge für Stufe III kommen später, zusammen mit den Erfolgen, die
  auszahlen.

### Spielstand

`raidStufen.kuckuck`, ein `RaidStand` wie die anderen; ältere Spielstände laden unverändert, keine neue SaveVersion.

### Bildschirm und Karte

- **Umschalter** mit drei Stufen; Titel «ZENIT, MIT KUCKUCK».
- **Feld** mit 12 Spalten und drei Gängen; im Gang am PC ein kleiner Vogel, die sechs Gang-Spalten tragen ihn im Kopf,
  mit rosa Rand unten und dem Titel «Am Gang links pickt der Kuckuck den mit den wenigsten Leben.». Am Handy stehen die
  vier Trupps untereinander wie auf Stufe II.
- **Uhrleiste:** je Runde ein rosa Punkt über dem Gang des Kuckucks (bei einem, zwei und drei Vierteln der Breite), in
  der Legende «Kuckuck am Gang links / Mitte / rechts».
- **Wiedergabe:** Wen er pickt, leuchtet rosa; über dem Gang erscheint der Vogel in der Kopfzeile; die Laufzeile sagt
  «Kuckuck am Gang links: Nix −66» oder «niemand da, er geht wieder hinein».
- **Probespiel** `?probe=raid3`: die Gilde mit allen zehn Lehrlingen (`anker20`, 20 Helden), Zenit auf Stufe I und II
  in der Woche davor je einmal besiegt (die Unruh liegt zweimal im Lager), 80 Tagstein; Stufe III ist offen.

### Eichung von Stufe III

`npm run raid-eichung -- --stufe III` (ohne `--stufe` nach Stufe I und II); mit `--leben` das Leben dieser Stufe.
`tests/raidKuckuck.test.ts` prüft die Bänder mit den 20 Samen.

**Muster-Gilde «anker20»:** `anker15` und die übrigen fünf Lehrlinge auf Stufe 15 mit Weg, ohne Schmiede-Stufen, in
dem, was im Lager lag: Ragna (Berserker, Zorn) im Obsidianpanzer mit Seelenbrecher, Nix (Assassine, Schattentänzerin)
im Frostwanderer, Gerlinde (Paladin, Kreuzritter) im Eid des Gefallenen Ritters mit Arkan-Amulett, Edgar (Nekromant,
Seuchenbringer) im Aschewanderer, Farn (Druide, Bärengestalt) in den Schuppen des Leviathan.

Die Aufstellungen (`RAID_AUFSTELLUNGEN_KUCKUCK`, Reihe 1 vorn, «|» sind die Gänge):

```
«Gut» (je Trupp ein Tank allein vorn; jede Spalte besetzt; an den Gängen keine Zerbrechlichen)
     A      B      C      | D      E       F        | G        H      I      | J      K      L
 1   .      Brom   .      | .      Bertram .        | .        Grimm  .      | .      Ragna  .
 2   .      Benno  Lia    | Morn   .       Gerlinde | Liedra   .      Nix    | Wenna  .      Mirabell
 3   Sina   .      Pirmin | Ansgar .       Ewin     | Ysra     .      Moos   | Farn   .      Edgar

«Profi» (Fund der Aufstellungssuche)
 1   .      Ysra   .      | .      Ewin    Bertram  | .        Grimm  .      | .      Liedra .
 2   .      Morn   Lia    | Edgar  .       Mirabell | Benno    .      Nix    | Pirmin .      .
 3   Sina   Brom   Farn   | Ansgar .       .        | .        .      Gerlinde | Wenna Moos  Ragna

«Lehrbuch» (die Ordnung von Stufe II, auf vier Trupps verlängert)
 1   .      Brom   .      | .      Bertram .        | .        Grimm  .        | .        Ragna  .
 2   Liedra Ewin   .      | Ansgar Moos    .        | Benno    Pirmin .        | Gerlinde Farn   .
 3   .      Lia    Morn   | .      Sina    Ysra     | .        Wenna  Mirabell | .        Nix    Edgar

«fünfzehn» (anker15, die beste von 400 Schritten der Suche)
 1   .      Brom   .      | .      Pirmin  .        | .        Grimm  .      | .      .       .
 2   .      Moos   Lia    | Morn   .       .        | Mirabell .      .      | .      .       Liedra
 3   Sina   Benno  Ysra   | .      .       Ansgar   | .        .      Ewin   | Wenna  Bertram .
```

«Naiv» ist die Startaufstellung: alle zwanzig der Reihe nach, vorne voll, dann die Mitte.

**Gemessen** (400 Läufe je Zeile, Samen i · 7919):

| Gilde · Aufstellung | Sieg | Ø Runde | Zenit-Rest | Sieg ≤ R12 | Ø stehend | Mitternacht |
|---|---|---|---|---|---|---|
| anker20 · Gut | 67 % | 13,1 | 1 % | 30 % | 8,1 | 0 % |
| anker20 · Profi | 97 % | 12,2 | 0 % | 84 % | 13,3 | 0 % |
| anker20 · Lehrbuch | 0 % | – | 29 % | 0 % | – | 0 % |
| anker20 · Naiv | 0 % | – | 35 % | 0 % | – | 0 % |
| anker15 · fünfzehn | 0 % | – | 15 % | 0 % | – | 0 % |

Mit den 20 Samen des Tests: Gut 12/20 (Ø Runde 13,1), Profi 20/20, Lehrbuch 0/20 (Rest 29 %), Naiv 0/20 (Rest 36 %),
fünfzehn 0/20 (Rest 16 %).

**Je eine Regel aus** (anker20 · Gut, daneben Lehrbuch): Pendel 98 % (+31), Zeiger 100 % (+33), Gegenzeiger 100 %
(+33), **Kuckuck 98 % (+31)**, Glocke 100 % (+33), Funken 80 % (+13), Mittag 90 % (+23), Heilregel 0 % (−67). Lehrbuch
bleibt ohne jede einzelne Regel bei 0 % (ohne Glocke 5 %).

**Eichbänder** (`tools/raidEichung.ts`, alle getroffen): K1 Gut 55 bis 75 % (67 %), K2 Profi ≥ 90 % (97 %), K3
Lehrbuch ≤ 10 % (0 %), K4 Naiv 0 %, K5 fünfzehn ≤ 10 % (0 %), K6 Mitternacht ≤ 2 % in jeder Zeile (keine), K7 ohne
Kuckuck Gut mindestens 15 Punkte mehr (+31), K8 ohne Heilregel Gut ≤ 5 % (0 %), K9 Das Nest 1,2- bis 1,6-mal die
dreizehnte Truhe (1,3).

### Grenzen von Stufe III

- **Nur mit Lehrlingen:** Zwanzig Helden gibt es nur mit allen zehn Lehrlingen; mit fünfzehn kommt keine gesuchte
  Ordnung durch. Das ist gewollt, heisst aber: Stufe III ist das Ziel für eine voll ausgebildete Gilde.
- **Wege nicht einzeln gemessen:** Anders als auf Stufe I und II gibt es für Stufe III noch keine Messung «je ein Weg
  anders» (`--wege`). Annahme: Wie auf Stufe II findet die Suche für jeden Weg eine Ordnung; geprüft ist das nicht.
- **Handy:** vier Trupps untereinander, das Feld ist rund ein Drittel höher als auf Stufe II.
- **Keine Erfolge** für Stufe III (siehe oben).

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

- **15 Helden** gibt es mit Stufe II; die Zweitbesetzung sind die Lehrlinge (`docs/AUSBILDUNG.md`, je Klasse ein
  zweiter Held). **20 Helden** (4 Trupps, 12 Spalten) hat eine Gilde mit allen zehn Lehrlingen schon: Platz für eine
  Stufe III, ohne neue Helden.
- **Der Raid-Code ist allgemein:** Spalten = 3 × `truppZahl`, das Pendel geht reihum (`(Runde − 1) mod truppZahl`, ein
  leerer Trupp gibt seine Runden weiter), der Zeiger fährt alle Spalten ab, der Gegenzeiger ist eine Regel
  (`gegenzeiger`), `truppName` kennt «Links», «Mitte», «Rechts» und «Aussen», die Spaltennamen reichen bis L. Eine
  weitere Stufe ist ein Eintrag in `RAID_DEFS`, `RAID_STUFEN` und `STUFEN_TEXTE` mit eigener Eichung; ihr Stand kommt
  nach `raidStufen`, Umschalter, Liste, Kriegsrat und Ergebnis lesen die Stufe. Nur der Kartenknoten zeigt fest zwei
  Stufen.
- **Ideen aus dem Konzept:** ein Kuckuck über dem Gang (Zielwahl), Raid-Befehle (einmal je Kampf eine Fähigkeit je
  Trupp, etwa Spott lenkt das Pendel eine Runde), Heil-Wege in der Heilregel stärker (heute Ewin als Kriegspriester
  74 % gegen 67 % als Lichtbringer), Sockel im Trophäensaal, Rivalen in der Rangliste, Monsterbuch, Fundbuch,
  Härtegrad «Albtraum» (Mittag ab Runde 10).

## Wo es steht

| Datei | Inhalt |
|---|---|
| `src/data/raids.ts` | Alle drei Stufen (`RAID_DEFS`, `RAID_STUFEN`): Werte, Regeln, Truhen, Kosten, Freischaltung; Teamwirkungen je Trupp, alle Texte (`RAID_TEXTE`, je Stufe `STUFEN_TEXTE`) |
| `src/data/raidMuster.ts` | Muster-Gilde mit Varianten (`anker15` mit fünf Lehrlingen, `anker20` mit zehn) und die Muster-Aufstellungen aller Stufen |
| `src/models/RaidStand.ts` | Was der Spielstand je Stufe vom Raid speichert |
| `src/systems/RaidKampf.ts` | Rechnung des Kampfs (rein: kein Spielstand) mit Gegenzeiger, dreizehn und Kuckuck, Hauptursache |
| `src/systems/Raid.ts` | Stand je Stufe, Freischalten, Woche, Aufstellen, Ernstkampf, Truhen, XP, Zähler, Kriegsrat, Alrunas Liste, Rollen |
| `src/systems/CombatEngine.ts`, `src/systems/Kampfeffekte.ts` | Grundangriff, Regeneration und Buff-Ablauf für den Raid; `rundenEnde` mit `gegnerGift` |
| `src/systems/SpielstandSchema.ts` | Prüfung der Felder `raid` und `raidStufen` beim Laden einer Datei |
| `src/data/items.ts` | «Die Unruh» (`die_unruh`; zum ersten Sieg auf Stufe II ein zweites Mal) |
| `src/data/achievements.ts` | die acht Erfolge des Raids (sechs für Stufe I, zwei für Stufe II) |
| `src/ui/screens/RaidScreen.ts`, `src/ui/html/raid.css` | der Raid-Bildschirm: Umschalter der Stufen, Liste, Kriegsrat, Kopf, Uhrleiste, Feld, Bank, Wiedergabe, Ergebnis |
| `src/ui/components/ZenitUhr.ts` | Zenits Uhr mit Gegenzeiger, aus Code gezeichnet (Kopf, Karte, Wiedergabe) |
| `src/ui/screens/DungeonMapScreen.ts`, `src/ui/html/dungeonkarte.css` | Kartenknoten (eine oder beide Stufen), Jorindes Leiter und der Nachthimmel über den Pfeilern |
| `src/systems/Probespiel.ts` | `?probe=raid`, `?probe=raid2`, `?probe=raid3` |
| `tools/raidEichung.ts` | Eichung aller Stufen |
| `tests/raid.test.ts` | Regeln, Heilregel, Trupps, Bestimmtheit, Kriegsrat, Freischalten, Woche, Truhen, XP, Zähler, Liste, Speichern, Eichbänder; dasselbe für Stufe II mit Gegenzeiger und drei Trupps |
| `tests/raidKuckuck.test.ts`, `tests/raidVierTrupps.test.ts` | Stufe III: Kuckuck, Spielstand, Truhen, Zähler, Texte, Muster, Eichbänder; vier Trupps, Uhr, Kartenknoten, Umschalter |

## Spielstand

Ein neues Feld, freiwillig: `raid` (`RaidStand`: Aufstellung, Woche mit Versuchen und Truhen, Bestversuch, Zahl der
Ernstkämpfe und Siege, Verlauf, gelesene Geschichten, `montagGesehen`). Fehlt es, legt `raidStand` es beim ersten
Aufruf an, mit der Startaufstellung; der Kartenknoten liest nur und legt nichts an (`raidKartenZustand`). Keine neue
SaveVersion. Die Zähler stehen in `state.statistics`, die Unruh im Lager. `SpielstandSchema` prüft das Feld beim
Laden einer Datei; Pflicht sind `aufstellung`, `woche`, `versucheGesamt`, `siege` und `verlauf`. Was die Prüfung
durchlässt, aber nicht ins Raster passt (halbe Felder, Felder neben dem Raster, doppelt belegte Felder, entlassene
Helden), räumt `raidStand` beim nächsten Aufruf weg. Fehlt `bestRest`, trägt `raidStand` null nach (noch kein
Versuch), und die Karte liest es schon vorher so. Stufe II hat ihren eigenen Stand in `raidStufen.dreizehn`
(Abschnitt «Stufe II»).

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
- Ist Stufe II offen, zeigt der Knoten beide Stufen (Abschnitt «Stufe II»).

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
- Über allem (am PC links über der Liste) der Umschalter der Stufen, Stufe II bis zum ersten Sieg mit Schloss
  (Abschnitt «Stufe II»).

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
- `?probe=raid2`: dasselbe mit den fünf Lehrlingen (Gilde «anker15», 15 Helden) und 60 Tagstein, Stufe I einmal
  gewonnen; Stufe II ist offen und noch nicht besucht.
- `?probe=raid3`: dasselbe mit allen zehn Lehrlingen (Gilde «anker20», 20 Helden) und 80 Tagstein, Stufe I und II je
  einmal gewonnen; Stufe III ist offen und noch nicht besucht.
