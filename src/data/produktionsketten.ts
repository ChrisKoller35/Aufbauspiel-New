// ─── Magic City – Produktionsketten ─────────────────────────────
// Reine Daten für den Reiter «Produktion» der Gebäude-Seite:
// welche Gebäude in welcher Reihenfolge zusammenarbeiten und
// was am Ende dabei herauskommt. Darstellung: ProduktionTab.ts,
// Engpass-Suche: systems/EngpassSystem.ts.
// Vorlage: docs/entwuerfe/README.md (Entwurf 2, Christoph 18.10.2026).
// ────────────────────────────────────────────────────────────────

/** Wie ein Glied mit dem vorherigen verbunden ist. */
export type Verbindung =
  | { art: 'pfeil'; ware: string }   // Ware fliesst vom vorherigen Glied hierher
  | { art: 'plus' };                 // braucht zusätzlich (z. B. Brunnen neben Bäckerei)

export type KettenGlied =
  | { art: 'gebaeude'; typeId: string; vorher?: Verbindung }
  /** Mehrere Gebäude übereinander, die an derselben Stelle der Kette stehen. */
  | { art: 'stapel'; typeIds: string[]; vorher?: Verbindung }
  /** Zutat, die nicht aus einem Gebäude kommt (Beute aus Dungeons). */
  | { art: 'quelle'; titel: string; items: string[]; vorher?: Verbindung };

/** Was am Ende der Kette steht; der Wert wird aus dem Spielstand berechnet. */
export type KettenZiel = 'bauen' | 'gold-steuern' | 'gold-handel' | 'helden' | 'expeditionen';

export interface Produktionskette {
  id: string;
  titel: string;
  untertitel: string;
  glieder: KettenGlied[];
  ziel: { titel: string; art: KettenZiel; vorher: Verbindung };
}

export const PRODUKTIONSKETTEN: Produktionskette[] = [
  {
    id: 'holz-stein',
    titel: 'Holz & Stein',
    untertitel: 'Grundstoffe für alles',
    glieder: [
      { art: 'stapel', typeIds: ['LUMBER_CAMP', 'QUARRY'] },
      { art: 'gebaeude', typeId: 'WAREHOUSE', vorher: { art: 'pfeil', ware: 'Holz · Stein' } },
    ],
    ziel: { titel: 'Bauen & Ausbauen', art: 'bauen', vorher: { art: 'pfeil', ware: 'für Bau' } },
  },
  {
    id: 'brot',
    titel: 'Brot',
    untertitel: 'Bewohner & Wachstum',
    glieder: [
      { art: 'gebaeude', typeId: 'FARM_GRAIN' },
      { art: 'gebaeude', typeId: 'MILL_WIND', vorher: { art: 'pfeil', ware: 'Getreide' } },
      { art: 'gebaeude', typeId: 'BAKERY', vorher: { art: 'pfeil', ware: 'Mehl' } },
      { art: 'gebaeude', typeId: 'WELL', vorher: { art: 'plus' } },
      { art: 'gebaeude', typeId: 'HOUSE_T1', vorher: { art: 'pfeil', ware: 'Brot' } },
    ],
    ziel: { titel: 'Gold', art: 'gold-steuern', vorher: { art: 'pfeil', ware: 'Steuern' } },
  },
  {
    id: 'waffen',
    titel: 'Waffen & Rüstung',
    untertitel: 'für die Helden',
    glieder: [
      { art: 'gebaeude', typeId: 'IRON_MINE' },
      { art: 'gebaeude', typeId: 'SMITHY', vorher: { art: 'pfeil', ware: 'Eisenschrott' } },
      { art: 'quelle', titel: 'Kristallsplitter', items: ['crystal_shard'], vorher: { art: 'plus' } },
      { art: 'stapel', typeIds: ['ARCANE_SMITHY', 'WAR_MACHINE_WORKSHOP'], vorher: { art: 'pfeil', ware: 'Aufstieg' } },
    ],
    ziel: { titel: 'Helden', art: 'helden', vorher: { art: 'pfeil', ware: 'Ausrüstung' } },
  },
  {
    id: 'traenke',
    titel: 'Tränke',
    untertitel: 'Heilung & Stärkung',
    glieder: [
      { art: 'gebaeude', typeId: 'HERB_GARDEN' },
      { art: 'gebaeude', typeId: 'WELL', vorher: { art: 'plus' } },
      { art: 'quelle', titel: 'Seltene Kräuter', items: ['herb_fire_root', 'herb_shimmer_shroom', 'herb_swamp_blossom', 'herb_bone_dust', 'herb_moonwort'], vorher: { art: 'plus' } },
    ],
    ziel: { titel: 'Expeditionen', art: 'expeditionen', vorher: { art: 'pfeil', ware: 'Tränke' } },
  },
  {
    id: 'stadt',
    titel: 'Stadt',
    untertitel: 'Gilde & Handel',
    glieder: [
      { art: 'gebaeude', typeId: 'GUILD_HALL' },
      { art: 'gebaeude', typeId: 'MARKETPLACE', vorher: { art: 'pfeil', ware: 'Gildenrang 2' } },
      { art: 'gebaeude', typeId: 'BANK', vorher: { art: 'pfeil', ware: 'Gildenrang 3' } },
    ],
    ziel: { titel: 'Gold', art: 'gold-handel', vorher: { art: 'pfeil', ware: 'Handel' } },
  },
];

/** Alle Gebäude-Typen eines Glieds. */
export function gliedTypeIds(glied: KettenGlied): string[] {
  if (glied.art === 'gebaeude') return [glied.typeId];
  if (glied.art === 'stapel') return glied.typeIds;
  return [];
}
