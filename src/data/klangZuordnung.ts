// ─── Magic City – Klang-Zuordnung (reine Funktionen) ───────────
import { biomFuerRoute, type Biom, type RouteDef } from './routes';
import type { ScreenId } from '../ui/ScreenRouter';

/** Offen und hell → Wald, nass → Sumpf, eng und dunkel → Höhle (Begründung in docs/KLANG.md). */
const MUSIK_JE_BIOM: Record<Biom, string> = {
  Wald: 'ambient_forest', Himmel: 'ambient_forest', Sterne: 'ambient_forest', Mond: 'ambient_forest',
  Belagerung: 'ambient_forest',
  Sumpf: 'ambient_swamp', Unterwasser: 'ambient_swamp', Ruinen: 'ambient_swamp',
  Höhle: 'Ecambient_cave', Vulkan: 'Ecambient_cave', Frost: 'Ecambient_cave', Drachengipfel: 'Ecambient_cave',
};

export function musikFuerRoute(route: RouteDef): string {
  return MUSIK_JE_BIOM[biomFuerRoute(route)];
}

/** Jeder Bildschirm ausser dem Kampf → Stadtmusik; `null` heisst: Musik nicht ändern. */
export function musikFuerBildschirm(screen: ScreenId): string | null {
  return screen === 'combat' ? null : 'ambient_city';
}

export const BOSS_MUSIK = 'ambient_boss';
