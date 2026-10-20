// ─── Magic City – Eichung der Wege (Spezialisierung) ────────────
// Misst, wie viel ein einzelner Weg bringt: Um wie viel dürfen die Gegner
// stärker sein (Leben und Angriff), bis das Team nur noch die Hälfte der Läufe
// gewinnt? Verglichen wird dasselbe Team ohne Wege mit dem Team, in dem nur ein
// Held den gemessenen Weg geht (Spielweise vorsichtig, src/systems/Musterlauf.ts).
//   Stufe 12: Musterteam «gut» im Drachenhort
//   Stufe 15: Musterteam «stark» im Himmelsarchiv (Meister)
// Fehlt die Klasse im Musterteam, tritt sie mit denselben Werten an die Stelle
// des letzten Helden (Sina). Ziel etwa +2,5 % auf Stufe 12 und +4 % auf Stufe 15,
// Messrauschen etwa ±1 %. Zum Schluss: wie viel stärker die Musterteams mit ihren
// Wegen sind (danach richten sich die Gegner der obersten Dungeons).
// Tabelle in docs/SPEZIALISIERUNG.md nachführen.
// Aufruf: npm run weg-eichung   (mehr Läufe: npm run weg-eichung -- 200,
//         nur einzelne Wege: npm run weg-eichung -- 200 guardian_phalanx,witch_fluchweberin)
// ────────────────────────────────────────────────────────────────

import { DIFFICULTY_DEFS } from '../src/data/difficulty';
import { ROUTE_DEFS } from '../src/data/routes';
import { MUSTER_TEAMS, musterWerte } from '../src/data/musterteams';
import { SPEZIALISIERUNGEN } from '../src/data/spezialisierungen';
import type { GuildFighter } from '../src/models/GuildRoster';
import { MusterTeamName, gewonnen, musterStand, spieleRoute } from '../src/systems/Musterlauf';

const LAEUFE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100;
const AUSWAHL = process.argv[3]?.split(',');
const FAELLE: { stufe: string; route: string; team: MusterTeamName }[] = [
  { stufe: 'Stufe 12', route: 'drachenhort', team: 'gut' },
  { stufe: 'Stufe 15', route: 'himmelsarchiv', team: 'stark' },
];
const NORMAL = { ...DIFFICULTY_DEFS.normal };

type Vorbereitung = (helden: GuildFighter[]) => void;

function siege(route: string, team: MusterTeamName, faktor: number, wege: boolean, vorbereitung: Vorbereitung): number {
  DIFFICULTY_DEFS.normal.enemyHpMult = NORMAL.enemyHpMult * faktor;
  DIFFICULTY_DEFS.normal.enemyAtkMult = NORMAL.enemyAtkMult * faktor;
  let anzahl = 0;
  for (let i = 1; i <= LAEUFE; i++) {
    const { state, ids } = musterStand(team, i * 7919, undefined, wege);
    vorbereitung(state.fighters);
    if (gewonnen(spieleRoute(state, ids, route, 'vorsichtig'))) anzahl++;
  }
  return anzahl;
}

/** Gegner-Faktor, bei dem das Team die Hälfte der Läufe gewinnt (Halbierung zwischen 0,5 und 2) */
function haelfte(route: string, team: MusterTeamName, wege: boolean, vorbereitung: Vorbereitung = () => {}): number {
  let unten = 0.5, oben = 2;
  for (let schritt = 0; schritt < 11; schritt++) {
    const mitte = Math.sqrt(unten * oben);
    if (siege(route, team, mitte, wege, vorbereitung) * 2 >= LAEUFE) unten = mitte; else oben = mitte;
  }
  return Math.sqrt(unten * oben);
}

/** Platz des Helden mit dieser Klasse; fehlt sie, übernimmt sie den letzten Platz mit dessen Werten */
function platzFuer(klasse: string, team: MusterTeamName): { platz: number; vorbereitung: Vorbereitung } {
  const helden = MUSTER_TEAMS[team].helden;
  const platz = helden.findIndex(h => h.classId === klasse);
  if (platz >= 0) return { platz, vorbereitung: () => {} };
  const letzter = helden.length - 1;
  const werte = musterWerte({ ...helden[letzter], classId: klasse });
  return { platz: letzter, vorbereitung: h => { h[letzter].classId = klasse; h[letzter].baseStats = { ...werte }; } };
}

const prozent = (mit: number, ohne: number) => `${((mit / ohne - 1) * 100).toFixed(1)} %`;

console.log(`\nWeg-Eichung: Zuwachs, ${LAEUFE} Läufe je Messpunkt\n`);
console.log(`| Weg | ${FAELLE.map(f => f.stufe).join(' | ')} |`);
console.log(`|---|${FAELLE.map(() => '---').join('|')}|`);
const ohneWeg = new Map<string, number>();
for (const weg of SPEZIALISIERUNGEN.filter(s => !AUSWAHL || AUSWAHL.includes(s.id))) {
  const werte = FAELLE.map(({ route, team }) => {
    const { platz, vorbereitung } = platzFuer(weg.klasse, team);
    const schluessel = `${route}:${team}:${weg.klasse}`;
    if (!ohneWeg.has(schluessel)) ohneWeg.set(schluessel, haelfte(route, team, false, vorbereitung));
    const mit = haelfte(route, team, false, h => { vorbereitung(h); h[platz].spezialisierung = weg.id; });
    return prozent(mit, ohneWeg.get(schluessel)!);
  });
  console.log(`| ${weg.zeichen} ${weg.name} | ${werte.join(' | ')} |`);
}

console.log(`\nMusterteams mit ihren Wegen (MUSTER_TEAMS), ${LAEUFE} Läufe je Messpunkt\n`);
console.log('| Dungeon | Team | stärker als ohne Wege |');
console.log('|---|---|---|');
for (const { route, team } of FAELLE) {
  console.log(`| ${ROUTE_DEFS[route].name} | ${team} | ${prozent(haelfte(route, team, true), haelfte(route, team, false))} |`);
}
