// ─── Magic City – Produktionsnetz der Gildenstadt ───────────────
// Reine Daten für den Reiter «Stadt»: drei Reihen ohne Verbindungslinien.
// Oben die Beute aus den Dungeons als breiter Balken: Eisenschrott,
// Kristallsplitter, Grüne Kräuter, Seltene Kräuter und Dungeon-Material,
// jede Gruppe mit ihrem Vorrat. Darunter der Händler und die vier
// Werkstätten, zuunterst das Gildenhaus mit den Zielen Expeditionen und
// Bauen. Jedes Gebäude kommt genau einmal vor (ein Gebäude je Art,
// Ausbau statt Mehrfachbau); wofür es gut ist, sagt die Erklärung.
// Darstellung: ui/screens/ProduktionTab.ts, Engpässe: systems/EngpassSystem.ts.
// Wunsch Christoph 22.10.2026: nur noch Beute aus dem Dungeon und Gold
// (docs/GILDENSTADT.md).
// ────────────────────────────────────────────────────────────────

import { SCHMIEDE_MATERIALIEN } from './schmiede';

export type NetzKnoten =
  /** Ein Gebäude; `breit` = Balken über die ganze Reihe. */
  | { art: 'gebaeude'; id: string; typeId: string; breit?: boolean }
  /** Zutaten, die kein Gebäude liefert (Beute aus den Dungeons); `breit` = Balken über die ganze Reihe. */
  | { art: 'quelle'; id: string; titel: string; items: string[]; bild: string; breit?: boolean }
  /** Wofür die Waren am Ende da sind; der Wert wird aus dem Spielstand berechnet. */
  | { art: 'ziel'; id: string; titel: string; wert: 'bauen' | 'expeditionen' };

export interface NetzReihe {
  id: string;
  titel: string;
  untertitel: string;
  knoten: NetzKnoten[];
}

export const SELTENE_KRAEUTER = ['herb_fire_root', 'herb_shimmer_shroom', 'herb_swamp_blossom', 'herb_bone_dust', 'herb_moonwort'];

/** Die Dungeon-Materialien der Set-Schmiede (eins je Gebiet, data/schmiede.ts). */
const DUNGEON_MATERIAL = SCHMIEDE_MATERIALIEN.map(m => m.id);

export interface BeuteGruppe {
  id: string;
  titel: string;
  items: string[];
  /** Wofür die Gruppe da ist, als Halbsatz («für Schmiede, Arkanschmiede und Kriegsmaschinen»). */
  wofuer: string;
}

/** Die fünf Gruppen im Balken «Beute aus den Dungeons», in Anzeige-Reihenfolge. */
export const BEUTE_GRUPPEN: BeuteGruppe[] = [
  { id: 'beute:eisen', titel: 'Eisenschrott', items: ['iron_scrap'], wofuer: 'für Schmiede, Arkanschmiede und Kriegsmaschinen' },
  { id: 'beute:kristall', titel: 'Kristallsplitter', items: ['crystal_shard'], wofuer: 'für die besten Rezepte und den Ausbau' },
  { id: 'beute:kraeuter', titel: 'Grüne Kräuter', items: ['herb_green'], wofuer: 'für Heiltrank und Kraft-Brot' },
  { id: 'beute:seltene-kraeuter', titel: 'Seltene Kräuter', items: SELTENE_KRAEUTER, wofuer: 'für die fünf Tränke mit Wirkung' },
  { id: 'beute:material', titel: 'Dungeon-Material', items: DUNGEON_MATERIAL, wofuer: 'für die Set-Schmiede im Gildenhaus' },
];

/** ID des Beute-Balkens (erste Reihe). */
const BEUTE_KNOTEN = 'q:beute';

export const NETZ_REIHEN: NetzReihe[] = [
  {
    id: 'beute',
    titel: 'Beute',
    untertitel: 'was die Helden aus den Dungeons mitbringen',
    knoten: [
      {
        art: 'quelle', id: BEUTE_KNOTEN, titel: 'Beute aus den Dungeons',
        items: BEUTE_GRUPPEN.flatMap(g => g.items), bild: 'exp_cave_deep', breit: true,
      },
    ],
  },
  {
    id: 'werkstaetten',
    titel: 'Händler und Werkstätten',
    untertitel: 'aus Beute und Gold wird Ausrüstung',
    knoten: [
      { art: 'gebaeude', id: 'HAENDLER', typeId: 'HAENDLER' },
      { art: 'gebaeude', id: 'SMITHY', typeId: 'SMITHY' },
      { art: 'gebaeude', id: 'ARCANE_SMITHY', typeId: 'ARCANE_SMITHY' },
      { art: 'gebaeude', id: 'WAR_MACHINE_WORKSHOP', typeId: 'WAR_MACHINE_WORKSHOP' },
      { art: 'gebaeude', id: 'HERB_GARDEN', typeId: 'HERB_GARDEN' },
    ],
  },
  {
    id: 'gilde',
    titel: 'Gilde',
    untertitel: 'wofür alles da ist',
    knoten: [
      { art: 'gebaeude', id: 'GUILD_HALL', typeId: 'GUILD_HALL' },
      { art: 'ziel', id: 'z:expeditionen', titel: 'Expeditionen', wert: 'expeditionen' },
      { art: 'ziel', id: 'z:bauen', titel: 'Bauen & Ausbauen', wert: 'bauen' },
    ],
  },
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
