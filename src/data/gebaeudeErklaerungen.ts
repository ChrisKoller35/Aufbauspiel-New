// ─── Magic City – Kurze Erklärungen und Bau-Reihenfolge ─────────
// Ein Satz je Kasten der Mindmap (Erklärung beim Darüberfahren oder
// langem Drücken) und die empfohlene Reihenfolge für neue Gebäude mit
// Begründung (Hervorhebung «Als Nächstes», systems/Empfehlung.ts).
// Schlüssel = Knoten-ID aus data/produktionsnetz.ts; die fünf Gruppen
// des Beute-Balkens haben ihre eigenen Schlüssel (beute:eisen …).
// ────────────────────────────────────────────────────────────────

export const ERKLAERUNG: Record<string, string> = {
  'q:beute': 'Alles, was deine Werkstätten brauchen, bringen die Helden aus den Dungeons mit. Dazu kommt nur noch Gold.',
  'beute:eisen': 'Eisenschrott fällt in fast jedem Dungeon, am meisten in Höhlen, Ruinen und bei der Belagerung. Schmiede, Arkanschmiede und Kriegsmaschinen brauchen ihn, dazu jeder Ausbau.',
  'beute:kristall': 'Kristallsplitter gibt es nur als Beute, sicher in den Kristallminen. Sie stecken in den besten Rezepten und im Ausbau von Gildenhaus und Arkanschmiede.',
  'beute:kraeuter': 'Grüne Kräuter wachsen in Wald und Sumpf. Die Kräuterküche braut daraus Heiltränke und backt Kraft-Brot.',
  'beute:seltene-kraeuter': 'Seltene Kräuter findest du nur in ihrem Gebiet: Glutwurzel im Vulkan, Schimmerpilz in der Höhle, Sumpfblüte im Sumpf, Knochenstaub und Mondkraut in den Ruinen. Die Kräuterküche macht daraus Tränke mit echter Wirkung.',
  'beute:material': 'Dungeon-Material lässt jeder Dungeon fallen, eins je Gebiet. Damit verbessert die Set-Schmiede im Gildenhaus deine Set-Teile bis +5. Der Händler kauft es nicht.',
  SMITHY: 'Schmiedet auf Auftrag Waffen und Rüstungen aus Eisenschrott, Kristallsplittern und Gold. Billiger als beim Händler, und ab Stufe 2 gibt es die Stahl- und Kristall-Ausrüstung. Steht sie, verlangt die Set-Schmiede weniger Gold.',
  ARCANE_SMITHY: 'Fertigt auf Auftrag magische Ausrüstung aus Eisen und Kristallsplittern. Bauteile für Kriegsmaschinen macht sie von selbst, sobald die Werkstatt welche braucht.',
  WAR_MACHINE_WORKSHOP: 'Baut auf Auftrag Katapult und Kanone, die deinen Helden in den Belagerungs-Dungeons helfen.',
  HERB_GARDEN: 'Braut auf Auftrag Heiltränke aus Grünen Kräutern, backt Kraft-Brot und macht aus seltenen Kräutern die fünf Tränke mit Wirkung: Kraft, Mana, Gegengift, Titan, Schnelligkeit.',
  HAENDLER: 'Verkauft Brot, Heiltränke und Grundausrüstung. Kauft Beute, die niemand trägt, zum halben Wert. Ab Stadtstufe 4 gibt er Rabatt.',
  GUILD_HALL: 'Hier wohnen und trainieren deine Helden, hier hängt das Auftragsbrett, hier steht die Set-Schmiede. Von hier starten die Expeditionen.',
  'z:expeditionen': 'Helden, Ausrüstung, Tränke und Kriegsmaschinen ziehen in die Dungeons und bringen Gold und Beute zurück.',
  'z:bauen': 'Gold, Eisenschrott und Kristallsplitter bezahlen neue Werkstätten und ihren Ausbau. Eine Werkstatt schaltest du direkt auf ihrem Feld frei, die späteren ab einem Gildenrang.',
};

/** Empfohlene Reihenfolge für neue Gebäude: zuerst, was am meisten freischaltet oder bremst. */
export const BAU_REIHENFOLGE: { typeId: string; warum: string }[] = [
  { typeId: 'SMITHY', warum: 'Eigene Ausrüstung ist billiger als beim Händler und macht deine Helden stärker.' },
  { typeId: 'HERB_GARDEN', warum: 'Heiltränke und Tränke mit Wirkung halten deine Helden auf Expeditionen am Leben.' },
  { typeId: 'ARCANE_SMITHY', warum: 'Die Arkanschmiede macht die stärkste Ausrüstung.' },
  { typeId: 'WAR_MACHINE_WORKSHOP', warum: 'Kriegsmaschinen helfen in den Belagerungs-Dungeons.' },
];
