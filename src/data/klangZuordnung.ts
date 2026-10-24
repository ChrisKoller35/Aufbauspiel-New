// ─── Magic City – Klang-Zuordnung (reine Funktionen) ───────────
import type { RouteDef } from './routes';
import type { ScreenId } from '../ui/ScreenRouter';

export type Biom = 'Drachengipfel' | 'Himmel' | 'Sterne' | 'Mond' | 'Unterwasser' | 'Belagerung'
  | 'Vulkan' | 'Ruinen' | 'Sumpf' | 'Frost' | 'Höhle' | 'Wald';

/** Abgeschrieben von getBiomeTag in src/ui/screens/ExpeditionsScreen.ts: gleiche Regeln, gleiche Reihenfolge. */
export function biomFuerRoute(route: RouteDef): Biom {
  const id = route.id;
  if (route.gebiet === 'gipfel') return 'Drachengipfel';
  if (route.gebiet === 'himmel') return 'Himmel';
  if (route.gebiet === 'sterne') return 'Sterne';
  if (route.gebiet === 'mond') return 'Mond';
  if (route.isUnderwater) return 'Unterwasser';
  if (route.isSiegeRoute) return 'Belagerung';
  if (id.includes('volcano') || id.includes('obsidian') || id.includes('ash') || id.includes('magma')) return 'Vulkan';
  if (id.includes('ruins') || id.includes('shadow')) return 'Ruinen';
  if (id.includes('swamp')) return 'Sumpf';
  if (id.includes('frozen')) return 'Frost';
  if (id.includes('cave') || id.includes('crystal') || id.includes('spider')) return 'Höhle';
  return 'Wald';
}

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
