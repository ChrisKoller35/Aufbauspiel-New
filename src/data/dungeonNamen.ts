// ─── Magic City – Dungeon-Namen im Satz ─────────────────────────
// Die Rangliste baut Sätze mit Dungeon-Namen: «Ein Sieg im Vulkankern bringt
// dich vorbei», «Die Sturmadler bezwingen den Drachenhort». Dafür steht hier
// für jeden Dungeon der Karte, wo man siegt (wo) und was man bezwingt (wen).
// Ein neuer Dungeon bekommt hier eine Zeile (der Test verlangt sie, Anleitung
// in docs/NEUE-DUNGEONS.md); fehlt sie, baut das Spiel die Formen aus dem Namen.
// ────────────────────────────────────────────────────────────────

import { ROUTE_DEFS } from './routes';

export interface DungeonImSatz {
  /** Wo? «im Vulkankern», «an der Versunkenen Küste» */
  wo: string;
  /** Wen? «den Vulkankern», «die Versunkene Küste» */
  wen: string;
}

export const DUNGEON_IM_SATZ: Record<string, DungeonImSatz> = {
  forest_short: { wo: 'im Waldpfad', wen: 'den Waldpfad' },
  forest_ruins: { wo: 'in der Verfallenen Lichtung', wen: 'die Verfallene Lichtung' },
  forest_medium: { wo: 'im Tiefwald', wen: 'den Tiefwald' },
  haunted_woods: { wo: 'im Geisterwald', wen: 'den Geisterwald' },
  ocean_shallows: { wo: 'an der Versunkenen Küste', wen: 'die Versunkene Küste' },
  ocean_depths: { wo: 'in den Abgrundtiefen', wen: 'die Abgrundtiefen' },
  ocean_abyss: { wo: 'in der Abyssalen Tiefe', wen: 'die Abyssale Tiefe' },
  cave_deep: { wo: 'in der Tiefen Höhle', wen: 'die Tiefe Höhle' },
  cave_spider: { wo: 'in der Spinnenhöhle', wen: 'die Spinnenhöhle' },
  cave_tunnels: { wo: 'in den Verschlungenen Tunneln', wen: 'die Verschlungenen Tunnel' },
  crystal_mines: { wo: 'in den Kristallminen', wen: 'die Kristallminen' },
  swamp_long: { wo: 'im Giftsumpf', wen: 'den Giftsumpf' },
  swamp_village: { wo: 'im Sumpfdorf', wen: 'das Sumpfdorf' },
  siege_walls: { wo: 'an den Stadtmauern', wen: 'die Stadtmauern' },
  frozen_pass: { wo: 'am Gefrorenen Pass', wen: 'den Gefrorenen Pass' },
  siege_fortress: { wo: 'in der Festung', wen: 'die Festung' },
  ruins_crypts: { wo: 'in der Alten Krypta', wen: 'die Alte Krypta' },
  ruins_depths: { wo: 'in den Tiefen Ruinen', wen: 'die Tiefen Ruinen' },
  shadow_catacombs: { wo: 'in den Schattenkatakomben', wen: 'die Schattenkatakomben' },
  obsidian_tunnels: { wo: 'im Obsidiantunnel', wen: 'den Obsidiantunnel' },
  ash_wastes: { wo: 'in der Aschewüste', wen: 'die Aschewüste' },
  magma_caverns: { wo: 'in den Magmahöhlen', wen: 'die Magmahöhlen' },
  volcano_core: { wo: 'im Vulkankern', wen: 'den Vulkankern' },
  drachenhort: { wo: 'im Drachenhort', wen: 'den Drachenhort' },
  himmelsarchiv: { wo: 'im Himmelsarchiv', wen: 'das Himmelsarchiv' },
};

/**
 * Formen aus dem Namen, für Dungeons ohne Zeile oben: «Der Drachenhort» → «im Drachenhort»;
 * «Die …» auf -en, -ern oder -eln gilt als Mehrzahl; ohne Artikel bleibt der Name («in Sternwarte»).
 */
function ausDemNamen(routeId: string): DungeonImSatz {
  const voll = (ROUTE_DEFS[routeId]?.name ?? routeId).replace(/\s*\(.*\)$/, '');
  const m = /^(Der|Die|Das) (.+)$/.exec(voll);
  if (!m) return { wo: `in ${voll}`, wen: voll };
  const name = m[2];
  if (m[1] === 'Der') return { wo: `im ${name}`, wen: `den ${name}` };
  if (m[1] === 'Das') return { wo: `im ${name}`, wen: `das ${name}` };
  return /(e|er|el)n$/.test(name) ? { wo: `in den ${name}`, wen: `die ${name}` } : { wo: `in der ${name}`, wen: `die ${name}` };
}

/** Wo? «im Vulkankern», «in der Festung», «an den Stadtmauern» */
export function imDungeon(routeId: string): string {
  return (DUNGEON_IM_SATZ[routeId] ?? ausDemNamen(routeId)).wo;
}

/** Wen? «den Vulkankern», «das Himmelsarchiv», «die Stadtmauern» */
export function dungeonWen(routeId: string): string {
  return (DUNGEON_IM_SATZ[routeId] ?? ausDemNamen(routeId)).wen;
}
