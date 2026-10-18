// ─── Magic City – Produktionsnetz ───────────────────────────────
// Reine Daten für den Reiter «Produktion»: eine Mindmap in vier Reihen.
// Alles, was Rohstoffe gewinnt, führt ins Lagerhaus (Reihe 2, über die
// ganze Breite); darunter hängen die Werkstätten, zuunterst die Stadt
// (Wohnviertel, Gilde, Handel) und die Ziele. Jedes Gebäude kommt genau
// einmal vor (ein Gebäude je Art, Ausbau statt Mehrfachbau).
// Darstellung: ui/screens/ProduktionTab.ts, Engpässe: systems/EngpassSystem.ts.
// Wunsch Christoph 18.10.2026: «alle Gebäude, die Ressourcen erzeugen,
// zum Lagerhaus, dann die Crafting-Gebäude, wie eine Mindmap in Reihen».
// ────────────────────────────────────────────────────────────────

export type NetzKnoten =
  /** Ein Gebäude; `breit` = Balken über die ganze Reihe (Lagerhaus). */
  | { art: 'gebaeude'; id: string; typeId: string; breit?: boolean }
  /** Zutat, die kein Gebäude liefert (Beute aus den Dungeons). */
  | { art: 'quelle'; id: string; titel: string; items: string[]; bild: string }
  /** Wofür die Waren am Ende da sind; der Wert wird aus dem Spielstand berechnet. */
  | { art: 'ziel'; id: string; titel: string; wert: 'bauen' | 'expeditionen' };

export interface NetzReihe {
  id: string;
  titel: string;
  untertitel: string;
  knoten: NetzKnoten[];
}

export interface NetzKante {
  von: string;
  nach: string;
  /** Was fliesst (steht an der Linie). */
  ware: string;
  /** «versorgung» = gestrichelt (Wasser), sonst Warenfluss. */
  art?: 'ware' | 'versorgung';
}

export const SELTENE_KRAEUTER = ['herb_fire_root', 'herb_shimmer_shroom', 'herb_swamp_blossom', 'herb_bone_dust', 'herb_moonwort'];

export const NETZ_REIHEN: NetzReihe[] = [
  {
    id: 'rohstoffe',
    titel: 'Rohstoffe',
    untertitel: 'was die Stadt gewinnt',
    knoten: [
      { art: 'gebaeude', id: 'LUMBER_CAMP', typeId: 'LUMBER_CAMP' },
      { art: 'gebaeude', id: 'QUARRY', typeId: 'QUARRY' },
      { art: 'gebaeude', id: 'FARM_GRAIN', typeId: 'FARM_GRAIN' },
      { art: 'gebaeude', id: 'IRON_MINE', typeId: 'IRON_MINE' },
      { art: 'quelle', id: 'q:kristall', titel: 'Kristallsplitter', items: ['crystal_shard'], bild: 'exp_crystal_mines' },
      { art: 'quelle', id: 'q:kraeuter', titel: 'Seltene Kräuter', items: SELTENE_KRAEUTER, bild: 'exp_haunted_woods' },
    ],
  },
  {
    id: 'lager',
    titel: 'Lager',
    untertitel: 'alles läuft hier zusammen',
    knoten: [
      { art: 'gebaeude', id: 'WAREHOUSE', typeId: 'WAREHOUSE', breit: true },
      { art: 'ziel', id: 'z:bauen', titel: 'Bauen & Ausbauen', wert: 'bauen' },
      { art: 'gebaeude', id: 'WELL', typeId: 'WELL' },
    ],
  },
  {
    id: 'werkstaetten',
    titel: 'Werkstätten',
    untertitel: 'aus Rohstoffen wird mehr',
    knoten: [
      { art: 'gebaeude', id: 'SMITHY', typeId: 'SMITHY' },
      { art: 'gebaeude', id: 'ARCANE_SMITHY', typeId: 'ARCANE_SMITHY' },
      { art: 'gebaeude', id: 'WAR_MACHINE_WORKSHOP', typeId: 'WAR_MACHINE_WORKSHOP' },
      { art: 'gebaeude', id: 'HERB_GARDEN', typeId: 'HERB_GARDEN' },
      { art: 'gebaeude', id: 'MILL_WIND', typeId: 'MILL_WIND' },
      { art: 'gebaeude', id: 'BAKERY', typeId: 'BAKERY' },
    ],
  },
  {
    id: 'stadt',
    titel: 'Stadt',
    untertitel: 'wofür alles da ist',
    knoten: [
      { art: 'gebaeude', id: 'GUILD_HALL', typeId: 'GUILD_HALL' },
      { art: 'ziel', id: 'z:expeditionen', titel: 'Expeditionen', wert: 'expeditionen' },
      { art: 'gebaeude', id: 'HOUSE_T1', typeId: 'HOUSE_T1' },
      { art: 'gebaeude', id: 'MARKETPLACE', typeId: 'MARKETPLACE' },
      { art: 'gebaeude', id: 'BANK', typeId: 'BANK' },
    ],
  },
];

export const NETZ_KANTEN: NetzKante[] = [
  // Rohstoffe → Lager
  { von: 'LUMBER_CAMP', nach: 'WAREHOUSE', ware: 'Holz' },
  { von: 'QUARRY', nach: 'WAREHOUSE', ware: 'Stein' },
  { von: 'FARM_GRAIN', nach: 'WAREHOUSE', ware: 'Getreide' },
  { von: 'IRON_MINE', nach: 'WAREHOUSE', ware: 'Eisenschrott' },
  { von: 'q:kristall', nach: 'WAREHOUSE', ware: 'Kristalle' },
  { von: 'q:kraeuter', nach: 'WAREHOUSE', ware: 'seltene Kräuter' },
  // Lager → Bauen und Werkstätten
  { von: 'WAREHOUSE', nach: 'z:bauen', ware: 'Holz · Stein' },
  { von: 'WAREHOUSE', nach: 'SMITHY', ware: 'Eisen · Holz · Kristalle' },
  { von: 'WAREHOUSE', nach: 'ARCANE_SMITHY', ware: 'Eisen · Kristalle' },
  { von: 'WAREHOUSE', nach: 'WAR_MACHINE_WORKSHOP', ware: 'Holz · Stein · Eisen' },
  { von: 'WAREHOUSE', nach: 'HERB_GARDEN', ware: 'seltene Kräuter' },
  { von: 'WAREHOUSE', nach: 'MILL_WIND', ware: 'Getreide' },
  // Versorgung
  { von: 'WELL', nach: 'HERB_GARDEN', ware: 'Wasser', art: 'versorgung' },
  { von: 'WELL', nach: 'BAKERY', ware: 'Wasser', art: 'versorgung' },
  // Zwischenschritte
  { von: 'MILL_WIND', nach: 'BAKERY', ware: 'Mehl' },
  { von: 'ARCANE_SMITHY', nach: 'WAR_MACHINE_WORKSHOP', ware: 'Bauteile' },
  // Werkstätten → Stadt
  { von: 'SMITHY', nach: 'GUILD_HALL', ware: 'Ausrüstung' },
  { von: 'ARCANE_SMITHY', nach: 'GUILD_HALL', ware: 'Ausrüstung' },
  { von: 'WAR_MACHINE_WORKSHOP', nach: 'z:expeditionen', ware: 'Kriegsmaschinen' },
  { von: 'HERB_GARDEN', nach: 'z:expeditionen', ware: 'Tränke' },
  { von: 'BAKERY', nach: 'HOUSE_T1', ware: 'Brot' },
  // Stadt
  { von: 'GUILD_HALL', nach: 'z:expeditionen', ware: 'Helden' },
  { von: 'HOUSE_T1', nach: 'MARKETPLACE', ware: 'Steuern' },
  { von: 'MARKETPLACE', nach: 'BANK', ware: 'Handel' },
];

/** Alle Gebäude-Arten des Netzes in Leserichtung (Reihe für Reihe). */
export function netzGebaeudeIds(): string[] {
  const ids: string[] = [];
  for (const reihe of NETZ_REIHEN) {
    for (const k of reihe.knoten) if (k.art === 'gebaeude') ids.push(k.typeId);
  }
  return ids;
}

export function netzKnoten(id: string): NetzKnoten | undefined {
  for (const reihe of NETZ_REIHEN) {
    const k = reihe.knoten.find(x => x.id === id);
    if (k) return k;
  }
  return undefined;
}
