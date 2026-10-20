// ─── Magic City – Eichung der Dungeons über dem Vulkankern ──────
// Probe-Läufe der drei Musterteams (src/data/musterteams.ts) durch die Dungeons
// mit `gebiet` (Drachenhort, Himmelsarchiv …), je in drei Spielweisen
// (src/systems/Musterlauf.ts). Den Vulkankern misst sie zum Vergleich mit.
// Nach Änderungen an Kampf, Klassen, Ausrüstung oder den Gegnern neu laufen
// lassen und die Tabelle in docs/NEUE-DUNGEONS.md anpassen.
// Aufruf: npm run dungeon-eichung   (mehr Läufe: npm run dungeon-eichung -- 200)
// ────────────────────────────────────────────────────────────────

import { ROUTE_DEFS } from '../src/data/routes';
import { MUSTER_TEAMS } from '../src/data/musterteams';
import { MusterTeamName, Spielweise, siegeVon } from '../src/systems/Musterlauf';

const LAEUFE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100;
const ROUTEN = ['volcano_core', ...Object.values(ROUTE_DEFS).filter(r => r.gebiet).map(r => r.id)];
const TEAMS = Object.keys(MUSTER_TEAMS) as MusterTeamName[];
const SPIELWEISEN: Spielweise[] = ['vorsichtig', 'klug', 'gierig'];

console.log(`\nDungeon-Eichung: Siege von ${LAEUFE} Läufen je Team und Spielweise\n`);
console.log(`| Dungeon | Team | ${SPIELWEISEN.join(' | ')} |`);
console.log(`|---|---|${SPIELWEISEN.map(() => '---').join('|')}|`);
for (const routeId of ROUTEN) {
  for (const team of TEAMS) {
    const werte = SPIELWEISEN.map(sw => `${Math.round(siegeVon(routeId, team, sw, LAEUFE) / LAEUFE * 100)} %`);
    console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${werte.join(' | ')} |`);
  }
}
console.log('');
