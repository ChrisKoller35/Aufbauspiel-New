// ─── Magic City – Eichung der Dungeons über dem Vulkankern ──────
// Probe-Läufe der drei Musterteams (src/data/musterteams.ts) durch die Dungeons
// mit `gebiet` (Drachenhort, Himmelsarchiv …), je in drei Spielweisen
// (src/systems/Musterlauf.ts). Den Vulkankern misst sie zum Vergleich mit.
// Die zweite Tabelle misst dieselben Teams in vollen Dungeon-Sets (MUSTER_SETS, die
// Sets mit Schmiede-Stufen erst ab ihrer Ebene `abEbene`), dazu die Läufe, die am
// Rundenlimit des Bosskampfs enden, und die Siege vor der Wut-Runde des Bosses;
// die dritte ohne Wege (Spezialisierung), damit man sieht, was die Wege ausmachen.
// Nach Änderungen an Kampf, Klassen, Ausrüstung oder den Gegnern neu laufen
// lassen und die Tabellen in docs/NEUE-DUNGEONS.md und docs/DUNGEON-SETS.md anpassen.
// Aufruf: npm run dungeon-eichung   (mehr Läufe: npm run dungeon-eichung -- 200,
//         nur einzelne Dungeons: npm run dungeon-eichung -- 1000 mondhof,morgentor,
//         nur ein Team: npm run dungeon-eichung -- 1000 mondhof,morgentor stark)
// ────────────────────────────────────────────────────────────────

import { ROUTE_DEFS } from '../src/data/routes';
import { MUSTER_SETS, MUSTER_TEAMS } from '../src/data/musterteams';
import { Messung, MusterSetName, MusterTeamName, Spielweise, messeLaeufe } from '../src/systems/Musterlauf';

const ARGUMENTE = process.argv.slice(2);
const ZAHL = Number(ARGUMENTE.find(a => /^\d+$/.test(a)));
const LAEUFE = ZAHL > 0 ? ZAHL : 100;
const WORTE = ARGUMENTE.filter(a => !/^\d+$/.test(a)).flatMap(a => a.split(','));
const ALLE_ROUTEN = ['volcano_core', ...Object.values(ROUTE_DEFS).filter(r => r.gebiet).map(r => r.id)];
const ALLE_TEAMS = Object.keys(MUSTER_TEAMS) as MusterTeamName[];
const ROUTEN = ALLE_ROUTEN.filter(id => WORTE.includes(id));
const TEAMS = ALLE_TEAMS.filter(t => WORTE.includes(t));
const unbekannt = WORTE.filter(w => !ALLE_ROUTEN.includes(w) && !ALLE_TEAMS.includes(w as MusterTeamName));
if (unbekannt.length > 0) {
  console.error(`Unbekannt: ${unbekannt.join(', ')} (Dungeons: ${ALLE_ROUTEN.join(', ')}; Teams: ${ALLE_TEAMS.join(', ')})`);
  process.exit(1);
}
const ROUTEN_GEWAEHLT = ROUTEN.length > 0 ? ROUTEN : ALLE_ROUTEN;
const TEAMS_GEWAEHLT = TEAMS.length > 0 ? TEAMS : ALLE_TEAMS;
const SPIELWEISEN: Spielweise[] = ['vorsichtig', 'klug', 'gierig'];

const prozent = (zahl: number) => `${Math.round(zahl / LAEUFE * 100)} %`;
const quote = (routeId: string, team: MusterTeamName, sw: Spielweise, sets?: MusterSetName, wege = true) =>
  prozent(messeLaeufe(routeId, team, sw, LAEUFE, sets, wege).siege);

console.log(`\nDungeon-Eichung: Siege von ${LAEUFE} Läufen je Team und Spielweise\n`);
console.log(`| Dungeon | Team | ${SPIELWEISEN.join(' | ')} |`);
console.log(`|---|---|${SPIELWEISEN.map(() => '---').join('|')}|`);
for (const routeId of ROUTEN_GEWAEHLT) {
  for (const team of TEAMS_GEWAEHLT) {
    console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${SPIELWEISEN.map(sw => quote(routeId, team, sw)).join(' | ')} |`);
  }
}

console.log(`\nMit Dungeon-Sets (MUSTER_SETS), ${LAEUFE} Läufe: Siege, Läufe am Rundenlimit des Bosskampfs, Siege vor der Wut-Runde (je ${SPIELWEISEN.join(' / ')})\n`);
console.log('| Dungeon | Team | Ausrüstung | Siege | am Rundenlimit | Siege vor der Wut |');
console.log('|---|---|---|---|---|---|');
for (const routeId of ROUTEN_GEWAEHLT.filter(id => ROUTE_DEFS[id].gebiet)) {
  for (const team of TEAMS_GEWAEHLT) {
    for (const sets of (Object.keys(MUSTER_SETS) as MusterSetName[]).filter(s => ROUTE_DEFS[routeId].tier >= (MUSTER_SETS[s].abEbene ?? 0))) {
      const messungen: Messung[] = SPIELWEISEN.map(sw => messeLaeufe(routeId, team, sw, LAEUFE, sets));
      const vorWut = messungen.map(m => (m.siege > 0 ? `${m.siegeVorWut} von ${m.siege}` : '–')).join(' / ');
      console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${MUSTER_SETS[sets].name} | ${messungen.map(m => prozent(m.siege)).join(' / ')} | ${messungen.map(m => prozent(m.rundenlimit)).join(' / ')} | ${vorWut} |`);
    }
  }
}

console.log(`\nOhne Wege (Vergleich zur ersten Tabelle), ${LAEUFE} Läufe\n`);
console.log(`| Dungeon | Team | ${SPIELWEISEN.join(' | ')} |`);
console.log(`|---|---|${SPIELWEISEN.map(() => '---').join('|')}|`);
for (const routeId of ROUTEN_GEWAEHLT.filter(id => ROUTE_DEFS[id].gebiet)) {
  for (const team of TEAMS_GEWAEHLT) {
    console.log(`| ${ROUTE_DEFS[routeId].name} | ${team} | ${SPIELWEISEN.map(sw => quote(routeId, team, sw, undefined, false)).join(' | ')} |`);
  }
}
console.log('');
