// ─── Magic City – Kurze Erklärungen und Bau-Reihenfolge ─────────
// Ein Satz je Kasten der Mindmap (Erklärung beim Darüberfahren oder
// langem Drücken) und die empfohlene Reihenfolge für neue Gebäude mit
// Begründung (Hervorhebung «Als Nächstes», systems/Empfehlung.ts).
// Schlüssel = Knoten-ID aus data/produktionsnetz.ts.
// ────────────────────────────────────────────────────────────────

export const ERKLAERUNG: Record<string, string> = {
  LUMBER_CAMP: 'Schlägt Holz. Holz brauchst du für fast jeden Bau und Ausbau.',
  QUARRY: 'Bricht Stein für bessere Gebäude, Ausbauten und Ausrüstung.',
  FARM_GRAIN: 'Baut Getreide an, den Anfang der Brot-Kette.',
  IRON_MINE: 'Fördert Eisenschrott für Waffen und Rüstungen der Schmiede.',
  'q:kristall': 'Kristallsplitter gibt es nur als Beute auf Expeditionen. Sie stecken in den besten Rezepten.',
  'q:kraeuter': 'Seltene Kräuter findest du nur auf Expeditionen. Der Kräutergarten braucht sie für starke Tränke.',
  WAREHOUSE: 'Hier landet alles, was die Stadt gewinnt. Jede Werkstatt nimmt sich ihre Zutaten von hier.',
  'z:bauen': 'Holz und Stein aus dem Lager bezahlen neue Gebäude und Ausbauten.',
  WELL: 'Versorgt die ganze Stadt mit Wasser. Kräutergarten und Bäckerei links und rechts davon arbeiten nur damit.',
  SMITHY: 'Schmiedet Waffen und Rüstungen für deine Helden. Sie arbeitet auf Auftrag: du sagst, was du brauchst.',
  ARCANE_SMITHY: 'Fertigt auf Auftrag magische Ausrüstung aus Eisen und Kristallsplittern. Bauteile für Kriegsmaschinen macht sie von selbst, sobald die Werkstatt welche braucht.',
  WAR_MACHINE_WORKSHOP: 'Baut auf Auftrag Kriegsmaschinen, die deinen Helden auf Expeditionen helfen.',
  HERB_GARDEN: 'Braut auf Auftrag Heiltränke und Tränke, mit Wasser vom Brunnen. Grüne Kräuter dafür zieht er von selbst.',
  MILL_WIND: 'Mahlt Getreide zu Mehl, von selbst so viel, wie die Bäckerei gerade braucht.',
  BAKERY: 'Backt Brot aus Mehl und Wasser und hält von selbst Brot für 3 Tage bereit. Deine Bewohner essen jeden Tag Brot, ohne Brot sinkt die Zufriedenheit und es kommen keine neuen Bewohner. Mehr Brot und Kraft-Brot gibt es auf Auftrag.',
  GUILD_HALL: 'Hier wohnen und trainieren deine Helden. Von hier starten die Expeditionen.',
  'z:expeditionen': 'Helden, Ausrüstung und Tränke ziehen in die Dungeons und bringen Gold und Beute zurück.',
  HOUSE_T1: 'Hier wohnen deine Bewohner. Sie arbeiten in den Werkstätten, zahlen jeden Tag Steuern und essen 1 Brot je 8 Bewohner (mindestens 1).',
  MARKETPLACE: 'Mit Arbeitern bringt der Marktplatz mehr Steuern ein.',
  BANK: 'Mit Arbeitern bringt die Bank jeden Tag zusätzlich Gold.',
};

/** Empfohlene Reihenfolge für neue Gebäude: zuerst, was am meisten freischaltet oder bremst. */
export const BAU_REIHENFOLGE: { typeId: string; warum: string }[] = [
  { typeId: 'LUMBER_CAMP', warum: 'Ohne Holz geht kein Bau.' },
  { typeId: 'QUARRY', warum: 'Stein brauchen fast alle weiteren Gebäude und Ausbauten.' },
  { typeId: 'FARM_GRAIN', warum: 'Getreide ist der Anfang der Brot-Kette, und Brot bringt neue Bewohner.' },
  { typeId: 'IRON_MINE', warum: 'Eisen schaltet die Schmiede frei.' },
  { typeId: 'WELL', warum: 'Ohne Wasser arbeiten Bäckerei und Kräutergarten nicht.' },
  { typeId: 'MILL_WIND', warum: 'Die Mühle macht aus Getreide Mehl für die Bäckerei.' },
  { typeId: 'SMITHY', warum: 'Bessere Ausrüstung macht deine Helden stärker.' },
  { typeId: 'BAKERY', warum: 'Brot bringt neue Bewohner, und Bewohner sind deine Arbeiter.' },
  { typeId: 'HERB_GARDEN', warum: 'Heiltränke halten deine Helden auf Expeditionen am Leben.' },
  { typeId: 'MARKETPLACE', warum: 'Der Marktplatz erhöht die Steuern.' },
  { typeId: 'ARCANE_SMITHY', warum: 'Die Arkanschmiede macht die stärkste Ausrüstung.' },
  { typeId: 'BANK', warum: 'Die Bank bringt jeden Tag zusätzlich Gold.' },
  { typeId: 'WAR_MACHINE_WORKSHOP', warum: 'Kriegsmaschinen helfen in schweren Dungeons.' },
];
