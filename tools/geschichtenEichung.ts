// ─── Magic City – Eichung der Geschichten ───────────────────────
// Misst, wie stark die Entscheidungen der Dungeon-Geschichten (data/dungeonGeschichten.ts)
// einen Dungeon leichter oder schwerer machen: Um wie viel dürfen die Gegner stärker
// sein (Leben und Angriff), bis das Musterteam «frisch» nur noch die Hälfte der Läufe
// gewinnt? Verglichen wird die Route ohne Entscheidungen mit der vorsichtigen Spielweise
// (immer die sichere Option) und der gierigen (immer die mutige), src/systems/Musterlauf.ts.
// Ziel: vorsichtig etwas leichter, gierig spürbar schwerer (docs/GESCHICHTEN.md).
// Aufruf: npm run geschichten-eichung   (mehr Läufe: npm run geschichten-eichung -- 200,
//         nur einzelne Dungeons: npm run geschichten-eichung -- 100 forest_short,cave_deep)
// ────────────────────────────────────────────────────────────────

import { DIFFICULTY_DEFS } from '../src/data/difficulty';
import { ROUTE_DEFS } from '../src/data/routes';
import { DUNGEON_GESCHICHTEN } from '../src/data/dungeonGeschichten';
import { Spielweise, gewonnen, musterStand, spieleRoute } from '../src/systems/Musterlauf';

const LAEUFE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100;
const AUSWAHL = process.argv[3]?.split(',');
const NORMAL = { ...DIFFICULTY_DEFS.normal };

function siege(route: string, faktor: number, spielweise: Spielweise): number {
  DIFFICULTY_DEFS.normal.enemyHpMult = NORMAL.enemyHpMult * faktor;
  DIFFICULTY_DEFS.normal.enemyAtkMult = NORMAL.enemyAtkMult * faktor;
  let anzahl = 0;
  for (let i = 1; i <= LAEUFE; i++) {
    const { state, ids } = musterStand('frisch', i * 7919);
    if (gewonnen(spieleRoute(state, ids, route, spielweise))) anzahl++;
  }
  return anzahl;
}

/** Gegner-Faktor, bei dem das Team die Hälfte der Läufe gewinnt (Halbierung zwischen 0,1 und 40) */
function haelfte(route: string, spielweise: Spielweise): number {
  let unten = 0.1, oben = 40;
  for (let schritt = 0; schritt < 14; schritt++) {
    const mitte = Math.sqrt(unten * oben);
    if (siege(route, mitte, spielweise) * 2 >= LAEUFE) unten = mitte; else oben = mitte;
  }
  return Math.sqrt(unten * oben);
}

const prozent = (mit: number, ohne: number) => `${mit >= ohne ? '+' : '−'}${Math.abs((mit / ohne - 1) * 100).toFixed(1)} %`;

console.log(`\nGeschichten-Eichung: Gegner-Faktor für 50 % Siege (Team «frisch»), ${LAEUFE} Läufe je Messpunkt`);
console.log('Plus: die Gegner dürfen so viel stärker sein (leichter), minus: so viel schwächer (schwerer).\n');
console.log('| Dungeon | Faktor ohne Entscheidungen | vorsichtig | gierig |');
console.log('|---|---|---|---|');
for (const geschichte of DUNGEON_GESCHICHTEN) {
  if (geschichte.wahlen.length === 0 || (AUSWAHL && !AUSWAHL.includes(geschichte.routeId))) continue;
  const wahlen = geschichte.wahlen;
  geschichte.wahlen = [];
  const ohne = haelfte(geschichte.routeId, 'vorsichtig');
  geschichte.wahlen = wahlen;
  const vorsichtig = haelfte(geschichte.routeId, 'vorsichtig');
  const gierig = haelfte(geschichte.routeId, 'gierig');
  console.log(`| ${ROUTE_DEFS[geschichte.routeId].name} | ${ohne.toFixed(2)} | ${prozent(vorsichtig, ohne)} | ${prozent(gierig, ohne)} |`);
}
