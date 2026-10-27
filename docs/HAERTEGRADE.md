# Härtegrade

Ein bezwungener Dungeon lässt sich im Team-Bildschirm auf **⚔ Schwer** oder **☠ Albtraum** wiederholen
(`src/systems/Haertegrade.ts`, Anzeige `src/ui/components/HaertegradAnzeige.ts`). Die Werte stehen in
`src/data/difficulty.ts`, `materialJeSieg` (Schmiede.ts) und `SET_CHANCE` (DungeonSets.ts).

| Grad | Gegner | Punkte und Material | Set-Teil | Boss-Beute (Dungeons mit Boss) |
|---|---|---|---|---|
| Normal | wie gewohnt | ×1 | 50 % | 1 Wurf |
| ⚔ Schwer | Leben +30 %, Angriff +20 %, Verteidigung +1 | ×1,5 | 65 % | 1 Wurf |
| ☠ Albtraum | Leben +60 %, Angriff +40 %, Verteidigung +2 | ×2 | 80 % | 2 Würfe, wenn bezwungen |

Der Set-Teil gilt erst, wenn die Gilde ein Teil des Sets hat (vorher immer 100 %). Nicht vom Grad abhängig:
die übrige Kampfbeute, XP, Ruhm, Auftragsbrett, Geschichten, Monsterbuch, Trophäensaal. **Infernal** fehlt:
Selbst `sterne3` bezwingt den Drachenhort darauf nur 8 von 100 Mal.

**Merker:** `state.haertegrade` (Dungeon → `hard` | `nightmare`) hält den höchsten bezwungenen Grad
(Sieg und, wo es einen Boss gibt, Boss besiegt); ein späterer Schwer-Sieg nimmt Albtraum nicht zurück.
Er zeigt ✓ auf den Knöpfen und «☠ Albtraum bezwungen» auf der Routenkarte; beim ersten Mal steht eine Zeile
in der Bilanz. Auf der Dungeon-Karte trägt der Knoten unten im Sechseck ⚔ bzw. ☠ (`haertegradKnoten`), das
Fenster die Zeile «⚔ Schwer bezwungen» bzw. «☠ Albtraum bezwungen», und die Legende erklärt beide Marken und
zählt «☠ Albtraum bezwungen · 1 von 29». Die Wahl selbst gilt bis zum Neu-Laden der Seite. Ein Sieg am
Rundenlimit («SIEG!», der Boss steht noch) zählt nicht; die Bilanz sagt rot «⚔ Schwer nicht bezwungen: Der
Mondhof. Der Boss stand nach dem Rundenlimit noch. Das System vermerkt: Beute ja, Punkte wie auf Normal.»
Das ist häufig: Mondhof «klug» unten 63 von 100.

**Albtraum-Beute:** Wer einen Dungeon mit Boss auf Albtraum bezwingt, bekommt einen Wurf mehr auf die
Beutetabelle des Bosses (`albtraumBeute`): `rollLoot` mit Gold und einem Eintrag mit seiner Menge, eigener
Zufall aus `run.rngSeed`. `finishExpedition` würfelt direkt nach `schmiedeBeute`, also liegt die Beute in Truhe
und Lager. In der Truhe steht unter dem Fund rot «☠ Albtraum-Beute» oder, kam derselbe Fund auch aus den
Kämpfen, «☠ 9 davon aus der Albtraum-Beute»; in der Bilanz «☠ Albtraum-Beute: 192 Gold und Amulett der
Wiedergeburt». Der Kriegsrat (`vorschauNachLauf`) zählt sie mit, sobald er auf Albtraum rechnet. Messung
(Drachenhort, `sterne3`, «vorsichtig», 100 Läufe): 100 bezwungen, Ø 220 Gold je Wurf, 59-mal Ausrüstung,
Ø Gold je Lauf wie in der Truhe 646 → 867.

**Punkte:** Den Faktor des Grads (×1,5 bzw. ×2) gibt es nur, wenn der Dungeon bezwungen ist
(`calculateScore`); ältere Einträge der Bestenliste behalten ihre Punkte. Ø Punkte vorher → jetzt
(in Klammern bezwungen von 100):

| Sets, Spielweise | Dungeon | Normal | ⚔ Schwer | ☠ Albtraum |
|---|---|---|---|---|
| `sterne3`, klug | Himmelsarchiv | 3128 (100) | 3879 → 3699 (81) | 3558 → 1779 (0) |
| `mond5`, vorsichtig | Sternenschlund | 3058 (100) | 3506 → 2979 (47) | 3161 → 1580 (0) |
| `pfand5`, klug | Mondhof | 3140 (100) | 3439 → 2797 (37) | 3750 → 1875 (0) |

In zwölf gemessenen Reihen liegt jeder nicht bezwungene Lauf unter dem schwächsten Normal-Sieg: höchstens
2155 gegen mindestens 2865 Punkte.

**Messung** (Team «Stark», «vorsichtig», Startwerte `i × 7919`, i = 1 … 100, bezwungen von 100; eigenes
Mess-Skript, nicht eingecheckt):

| Sets | Dungeon (Ebene) | Normal | ⚔ Schwer | ☠ Albtraum |
|---|---|---|---|---|
| `sterne3` | Drachenhort (5) | 100 | 100 | 100 |
| `sterne3` | Himmelsarchiv (6) | 100 | 89 | 0 |
| `mond5` | Sternenschmiede (7) | 100 | 100 | 0 |
| `mond5` | Sternenschlund (8) | 100 | 47 | 0 |
| `pfand5` | Sternenschlund (8) | 100 | 100 | 98 |
| `pfand5` | Mondhof (9) | 100 | 96 | 0 |
