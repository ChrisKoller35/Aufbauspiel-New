import { ROUTE_DEFS, RouteDef } from './routes';
import { DIFFICULTY_DEFS } from './difficulty';
import { MODIFIER_DEFS } from './modifiers';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ChallengeRestriction {
  type: 'max_party_size' | 'required_class' | 'no_provisions' | 'max_rounds' | 'min_difficulty';
  /** Wert der Einschraenkung (Zahl oder String je nach type) */
  value: string | number;
  /** Deutsche Beschreibung fuer die UI */
  label: string;
}

export interface WeeklyChallengeDef {
  /** Eindeutige ID, z.B. "week_2026_09" */
  id: string;
  /** ISO-Kalenderwoche */
  weekNumber: number;
  /** Jahr */
  year: number;
  /** Route-ID aus ROUTE_DEFS */
  routeId: string;
  /** Mindest-Schwierigkeit */
  difficulty: string;
  /** Optionaler Pflicht-Modifier */
  requiredModifier: string | null;
  /** Ziel-Score fuer Gold (Bronze = 60%, Silber = 80%, Gold = 100%) */
  targetScore: number;
  /** Zusatz-Einschraenkungen */
  restrictions: ChallengeRestriction[];
  /** Anzeigename, z.B. "Woche 9: Waldmeister" */
  displayName: string;
  /** Flavor-Text / Beschreibung */
  description: string;
}

// ---------------------------------------------------------------------------
// Seeded PRNG  (Mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// ISO-Kalenderwoche (ISO 8601)
// ---------------------------------------------------------------------------

function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Donnerstag der aktuellen Woche bestimmt das ISO-Jahr
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

// ---------------------------------------------------------------------------
// Konstanten & Pools
// ---------------------------------------------------------------------------

// Nur Routen bis Ebene 4 (dafür gibt es Score- und Schwierigkeits-Tabellen unten); die Dungeons
// über dem Vulkankern bleiben ausserhalb der Wochen-Herausforderungen
const ROUTE_IDS = Object.keys(ROUTE_DEFS).filter(id => ROUTE_DEFS[id].tier <= 4);
const DIFFICULTY_IDS = Object.keys(DIFFICULTY_DEFS);   // normal, hard, nightmare, infernal
const MODIFIER_IDS = Object.keys(MODIFIER_DEFS);

const CLASS_IDS = [
  'guardian', 'ranger', 'cleric',
  'berserker', 'assassin', 'paladin',
  'bard', 'witch', 'necromancer', 'druid',
];

/** Mindest-Schwierigkeit je Route-Tier (keine T4-Route auf normal) */
const MIN_DIFFICULTY_BY_TIER: Record<number, number> = {
  1: 0,  // normal
  2: 0,  // normal
  3: 1,  // hard
  4: 2,  // nightmare
};

/**
 * Geschaetzter Roh-Score pro Tier bei perfektem Run (volle HP, alle Gegner, Boss, wenig Runden).
 * Wird als Basis fuer den targetScore verwendet.
 */
const BASE_RAW_SCORE_BY_TIER: Record<number, number> = {
  1: 900,    // ~6 Gegner, kein Boss, gute HP
  2: 1800,   // ~8-10 Gegner, 1 Boss, mittlere HP
  3: 2800,   // ~11-13 Gegner, 1 Boss, etwas weniger HP
  4: 3600,   // ~12-14 Gegner, 1 Boss, deutlich haerter
};

// ---------------------------------------------------------------------------
// Flavor-Text Pools
// ---------------------------------------------------------------------------

interface ChallengeTheme {
  suffix: string;    // Wochenname-Suffix, z.B. "Waldmeister"
  description: string;
}

const THEMES_BY_ROUTE_PREFIX: Record<string, ChallengeTheme[]> = {
  forest: [
    { suffix: 'Waldmeister', description: 'Die Baeume fluuestern von einer vergessenen Bedrohung. Stelle dich dem Wald!' },
    { suffix: 'Gruene Pruefung', description: 'Das Blattwerk verdichtet sich. Nur die Besten finden den Weg.' },
    { suffix: 'Wildnis-Ruf', description: 'Der Wald ruft seine Verteidiger. Beweise deinen Mut!' },
  ],
  cave: [
    { suffix: 'Tiefensucher', description: 'In der Dunkelheit lauern unbekannte Schrecken. Wage dich in die Tiefe!' },
    { suffix: 'Steinbrecher', description: 'Der Berg bebt. Etwas Uraltes erwacht in den Hoehlen.' },
    { suffix: 'Echokammer', description: 'Jeder Schritt hallt wider. Die Hoehle testet deine Nerven.' },
  ],
  swamp: [
    { suffix: 'Sumpfkrieger', description: 'Giftiger Nebel steigt auf. Ueberlebe die Suempfe!' },
    { suffix: 'Modergeruch', description: 'Der Boden gibt unter jedem Schritt nach. Versinke nicht!' },
    { suffix: 'Nebellaeufer', description: 'Schemenhaft bewegen sich Gestalten im Dunst.' },
  ],
  ruins: [
    { suffix: 'Grabschaender', description: 'Die Toten ruhen nicht. Pluendere die alten Hallen!' },
    { suffix: 'Krypten-Held', description: 'Verfluchte Waechter bewachen uralte Schaetze.' },
    { suffix: 'Ruinen-Forscher', description: 'Zerbrochene Saeulen erzaehlen von vergangener Groesse.' },
  ],
  volcano: [
    { suffix: 'Feuertaenzer', description: 'Lava fliesst durch die Gaenge. Nur die Unerschrockenen bestehen!' },
    { suffix: 'Aschelaeufer', description: 'Die Hitze ist unertraeglich. Halte durch!' },
    { suffix: 'Glutherz', description: 'Im Kern des Vulkans wartet die ultimative Pruefung.' },
  ],
};

// ---------------------------------------------------------------------------
// Helper: Route-Prefix fuer Flavor-Lookup
// ---------------------------------------------------------------------------

function getRoutePrefix(routeId: string): string {
  if (routeId.startsWith('forest')) return 'forest';
  if (routeId.startsWith('cave')) return 'cave';
  if (routeId.startsWith('swamp')) return 'swamp';
  if (routeId.startsWith('ruins')) return 'ruins';
  if (routeId.startsWith('volcano')) return 'volcano';
  return 'forest'; // Fallback
}

// ---------------------------------------------------------------------------
// Restriction-Builder
// ---------------------------------------------------------------------------

function buildRestrictions(rng: () => number, route: RouteDef, diffIndex: number): ChallengeRestriction[] {
  const restrictions: ChallengeRestriction[] = [];

  // Jede Restriction hat eine Chance, dabei zu sein
  // Hoehere Tiers bekommen tendenziell mehr/haertere Restrictions

  // max_party_size (30% Chance, nur ab Tier 2+)
  if (route.tier >= 2 && rng() < 0.30) {
    const size = rng() < 0.4 ? 2 : 3;
    restrictions.push({
      type: 'max_party_size',
      value: size,
      label: `Maximal ${size} Kaempfer`,
    });
  }

  // required_class (40% Chance)
  if (rng() < 0.40) {
    const classId = CLASS_IDS[Math.floor(rng() * CLASS_IDS.length)];
    const classNames: Record<string, string> = {
      guardian: 'Waechter', ranger: 'Waldlaeufer', cleric: 'Kleriker',
      berserker: 'Berserker', assassin: 'Assassine', paladin: 'Paladin',
      bard: 'Barde', witch: 'Hexe', necromancer: 'Nekromant', druid: 'Druide',
    };
    restrictions.push({
      type: 'required_class',
      value: classId,
      label: `${classNames[classId] ?? classId} muss dabei sein`,
    });
  }

  // no_provisions (20% Chance, nur ab Hard+)
  if (diffIndex >= 1 && rng() < 0.20) {
    restrictions.push({
      type: 'no_provisions',
      value: 1,
      label: 'Keine Proviant-Nutzung erlaubt',
    });
  }

  // max_rounds (25% Chance)
  if (rng() < 0.25) {
    // Basis: 4 Runden pro Kampfraum + etwas Puffer
    const combatRooms = route.encounters.filter(e => e.type === 'combat' || e.type === 'boss').length;
    const maxRounds = combatRooms * 4 + Math.floor(rng() * 5) + 3;
    restrictions.push({
      type: 'max_rounds',
      value: maxRounds,
      label: `Maximal ${maxRounds} Kampfrunden gesamt`,
    });
  }

  // min_difficulty (fuer niedrige Tiers, damit es nicht trivial wird, 35% Chance)
  if (route.tier <= 2 && diffIndex === 0 && rng() < 0.35) {
    restrictions.push({
      type: 'min_difficulty',
      value: 'hard',
      label: 'Mindestens Schwierigkeit "Schwer"',
    });
  }

  return restrictions;
}

// ---------------------------------------------------------------------------
// Target-Score Berechnung
// ---------------------------------------------------------------------------

/**
 * Berechnet den Gold-Target-Score basierend auf Route-Tier, Difficulty und Modifier.
 * Bronze = 60%, Silber = 80%, Gold = 100% dieses Wertes.
 */
function calculateTargetScore(
  route: RouteDef,
  difficultyId: string,
  modifierId: string | null,
  restrictions: ChallengeRestriction[],
): number {
  const baseRaw = BASE_RAW_SCORE_BY_TIER[route.tier] ?? 1500;

  const diffDef = DIFFICULTY_DEFS[difficultyId] ?? DIFFICULTY_DEFS.normal;
  const modDef = modifierId ? MODIFIER_DEFS[modifierId] : null;

  let score = baseRaw * diffDef.scoreMult * (modDef?.scoreMult ?? 1.0);

  // Restrictions erhoehen den Target leicht (sie machen es schwerer, also belohnen wir mehr)
  const restrictionBonus = restrictions.reduce((bonus, r) => {
    switch (r.type) {
      case 'max_party_size': return bonus + (r.value === 2 ? 0.25 : 0.10);
      case 'no_provisions': return bonus + 0.15;
      case 'max_rounds': return bonus + 0.10;
      case 'required_class': return bonus + 0.05;
      case 'min_difficulty': return bonus + 0.0; // bereits im diffMult enthalten
      default: return bonus;
    }
  }, 0);

  score *= (1 + restrictionBonus);

  return Math.floor(score);
}

// ---------------------------------------------------------------------------
// Medal-Thresholds (exportiert fuer UI/Scoring)
// ---------------------------------------------------------------------------

export interface MedalThresholds {
  bronze: number;
  silver: number;
  gold: number;
}

/**
 * Gibt die Score-Schwellen fuer Bronze/Silber/Gold zurueck.
 */
export function getMedalThresholds(challenge: WeeklyChallengeDef): MedalThresholds {
  return {
    bronze: Math.floor(challenge.targetScore * 0.6),
    silver: Math.floor(challenge.targetScore * 0.8),
    gold: challenge.targetScore,
  };
}

/**
 * Bestimmt die Medaille fuer einen gegebenen Score.
 */
export function determineMedal(score: number, challenge: WeeklyChallengeDef): 'none' | 'bronze' | 'silver' | 'gold' {
  const thresholds = getMedalThresholds(challenge);
  if (score >= thresholds.gold) return 'gold';
  if (score >= thresholds.silver) return 'silver';
  if (score >= thresholds.bronze) return 'bronze';
  return 'none';
}

// ---------------------------------------------------------------------------
// Haupt-Generator
// ---------------------------------------------------------------------------

/**
 * Generiert eine deterministische Weekly Challenge basierend auf der ISO-Kalenderwoche.
 * Gleicher Montag = gleiche Challenge fuer alle Spieler.
 *
 * @param date - Optionales Datum (Default: jetzt). Die Challenge gilt fuer die Woche dieses Datums.
 */
export function generateWeeklyChallenge(date?: Date): WeeklyChallengeDef {
  const now = date ?? new Date();
  const { year, week } = getISOWeek(now);

  // Seed: year * 100 + weekNumber (deterministisch pro Woche)
  const seed = year * 100 + week;
  const rng = mulberry32(seed);

  // --- Route waehlen ---
  const routeId = ROUTE_IDS[Math.floor(rng() * ROUTE_IDS.length)];
  const route = ROUTE_DEFS[routeId];

  // --- Schwierigkeit waehlen (passend zum Tier) ---
  const minDiffIdx = MIN_DIFFICULTY_BY_TIER[route.tier] ?? 0;
  // Waehle zwischen minDiff und maxDiff (laesst Infernal seltener zu)
  const maxDiffIdx = Math.min(DIFFICULTY_IDS.length - 1, minDiffIdx + 2);
  const diffIndex = minDiffIdx + Math.floor(rng() * (maxDiffIdx - minDiffIdx + 1));
  const difficultyId = DIFFICULTY_IDS[diffIndex];

  // --- Modifier (50% Chance, keinen bei Tier 1) ---
  let requiredModifier: string | null = null;
  if (route.tier >= 2 && rng() < 0.50) {
    requiredModifier = MODIFIER_IDS[Math.floor(rng() * MODIFIER_IDS.length)];
  }

  // --- Restrictions ---
  const restrictions = buildRestrictions(rng, route, diffIndex);

  // --- Target Score ---
  const targetScore = calculateTargetScore(route, difficultyId, requiredModifier, restrictions);

  // --- Flavor-Text ---
  const prefix = getRoutePrefix(routeId);
  const themes = THEMES_BY_ROUTE_PREFIX[prefix] ?? THEMES_BY_ROUTE_PREFIX.forest;
  const theme = themes[Math.floor(rng() * themes.length)];

  const id = `week_${year}_${String(week).padStart(2, '0')}`;
  const displayName = `Woche ${week}: ${theme.suffix}`;
  const description = theme.description;

  return {
    id,
    weekNumber: week,
    year,
    routeId,
    difficulty: difficultyId,
    requiredModifier,
    targetScore,
    restrictions,
    displayName,
    description,
  };
}

/**
 * Prueft ob eine Challenge noch aktuell ist (gleiche Kalenderwoche).
 */
export function isChallengeExpired(challengeId: string, now?: Date): boolean {
  const current = generateWeeklyChallenge(now);
  return current.id !== challengeId;
}

/**
 * Gibt die verbleibende Zeit bis zum Challenge-Wechsel zurueck (in ms).
 * Challenge wechselt immer am Montag 00:00 UTC.
 */
export function getTimeUntilNextChallenge(now?: Date): number {
  const d = now ?? new Date();
  // Naechsten Montag 00:00 UTC berechnen
  const dayOfWeek = d.getUTCDay(); // 0=So, 1=Mo, ...
  // Mo=1→7, Di=2→6, Mi=3→5, Do=4→4, Fr=5→3, Sa=6→2, So=0→1
  const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
  const nextMonday = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0,
  ));
  return Math.max(0, nextMonday.getTime() - d.getTime());
}
