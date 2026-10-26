# Härtegrade

Ein bezwungener Dungeon lässt sich im Team-Bildschirm auf **⚔ Schwer** oder **☠ Albtraum** wiederholen
(`src/systems/Haertegrade.ts`, Anzeige `src/ui/components/HaertegradAnzeige.ts`). Die Werte stehen in
`src/data/difficulty.ts`, `materialJeSieg` (Schmiede.ts) und `SET_CHANCE` (DungeonSets.ts).

| Grad | Gegner | Punkte und Material | Set-Teil |
|---|---|---|---|
| Normal | wie gewohnt | ×1 | 50 % |
| ⚔ Schwer | Leben +30 %, Angriff +20 %, Verteidigung +1 | ×1,5 | 65 % |
| ☠ Albtraum | Leben +60 %, Angriff +40 %, Verteidigung +2 | ×2 | 80 % |

Der Set-Teil gilt erst, wenn die Gilde ein Teil des Sets hat (vorher immer 100 %). Nicht vom Grad abhängig:
Gold und Gegenstände, XP, Ruhm, Auftragsbrett, Geschichten, Monsterbuch, Trophäensaal. Punkte zählen ×Grad
auch bei Niederlage. **Infernal** fehlt: Selbst `sterne3` bezwingt den Drachenhort darauf nur 8 von 100 Mal.

**Merker:** `state.haertegrade` (Dungeon → `hard` | `nightmare`) hält den höchsten bezwungenen Grad
(Sieg und, wo es einen Boss gibt, Boss besiegt); ein späterer Schwer-Sieg nimmt Albtraum nicht zurück.
Er zeigt ✓ auf den Knöpfen und «☠ Albtraum bezwungen» auf der Routenkarte; beim ersten Mal steht eine Zeile
in der Bilanz. Die Wahl selbst gilt bis zum Neu-Laden der Seite. Der **Kriegsrat** rechnet noch mit Normal.

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
