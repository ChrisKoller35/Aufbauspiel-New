# Beutevergleich: grüne Zeile in der Truhe

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
