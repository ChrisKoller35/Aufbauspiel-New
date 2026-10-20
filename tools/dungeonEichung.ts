// ─── Magic City – Eichung der Dungeons über dem Vulkankern ──────
// Probe-Läufe der drei Musterteams (src/data/musterteams.ts) durch die Dungeons
// mit `gebiet` (Drachenhort, Himmelsarchiv …), je in drei Spielweisen
// (src/systems/Musterlauf.ts). Den Vulkankern misst sie zum Vergleich mit.
// Die zweite Tabelle misst dieselben Teams in vollen Dungeon-Sets (MUSTER_SETS).
// Nach Änderungen an Kampf, Klassen, Ausrüstung oder den Gegnern neu laufen
// lassen und die Tabellen in docs/NEUE-DUNGEONS.md und docs/DUNGEON-SETS.md anpassen.
// Aufruf: npm run dungeon-eichung   (mehr Läufe: npm run dungeon-eichung -- 200)
// ────────────────────────────────────────────────────────────────

import { ROUTE_DEFS } from '../src/data/routes';
import { MUSTER_SETS, MUSTER_TEAMS } from '../src/data/musterteams';
import { MusterSetName, MusterTeamName, Spielweise, siegeVon } from '../src/systems/Musterlauf';

const LAEUFE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100;
const ROUTEN = ['volcano_core', ...Object.values(ROUTE_DEFS).filter(r => r.gebiet).map(r => r.id)];
const TEAMS = Object.keys(MUSTER_TEAMS) as MusterTeamName[];
const SPIELWEISEN: Spielweise[] = ['vorsichtig', 'klug', 'gierig'];

console.log(`\nDungeon-Eichung: Siege von ${LAEUFE} Läufen je Team und Spielweise\n`);
console.log(`| Dungeon | Team | ${SPIELWEISEN.join(' | ')} |`);
console.log(`|---|---|${SPIELWEISEN.map(() => '---').join('|')}|`);
const quote = (routeId: string, team: MusterTeamName, sw: Spielweise, sets?: MusterSetName) =>
  `${Math.round(siegeVon(routeId, team, sw, LAEUFE, sets) / LAEUFE * 100)} %`;
for (const routeId of ROUTEN) {
  for (const team of TEAMS) {
    console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${SPIELWEISEN.map(sw => quote(routeId, team, sw)).join(' | ')} |`);
  }
}

console.log(`\nMit Dungeon-Sets (MUSTER_SETS), ${LAEUFE} Läufe\n`);
console.log(`| Dungeon | Team | Ausrüstung | ${SPIELWEISEN.join(' | ')} |`);
console.log(`|---|---|---|${SPIELWEISEN.map(() => '---').join('|')}|`);
for (const routeId of ROUTEN.filter(id => ROUTE_DEFS[id].gebiet)) {
  for (const team of TEAMS) {
    for (const sets of Object.keys(MUSTER_SETS) as MusterSetName[]) {
      console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${MUSTER_SETS[sets].name} | ${SPIELWEISEN.map(sw => quote(routeId, team, sw, sets)).join(' | ')} |`);
    }
  }
}
console.log('');
