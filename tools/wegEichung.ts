// ─── Magic City – Eichung der Wege (Spezialisierung) ────────────
// Misst, wie viel ein einzelner Weg bringt: Um wie viel dürfen die Gegner
// stärker sein (Leben und Angriff), bis das Team nur noch die Hälfte der Läufe
// gewinnt? Verglichen wird dasselbe Team ohne Wege mit dem Team, in dem nur ein
// Held den gemessenen Weg geht (Spielweise vorsichtig, src/systems/Musterlauf.ts).
// Zwei Prüfstände je Stufe, damit kein Weg an einem einzelnen Dungeon hängt:
//   Stufe 12: Musterteam «gut» im Drachenhort und im Himmelsarchiv
//   Stufe 15: Musterteam «stark» (Meister) im Drachenhort und im Himmelsarchiv
// Zählt das Mittel der beiden. Das Spiel rundet Leben und Angriff der Gegner ab, und ein
// Angriffspunkt sind hier 3 bis 6 %: Darum rundet jeder Lauf mit einem eigenen festen Rest
// (Zufallsrundung), sonst springen die Siege stufenweise, und viele Wege landen auf derselben
// Stufe. Fehlt die Klasse im Musterteam, tritt sie mit
// denselben Werten an die Stelle des letzten Helden (Sina). Ziel etwa +2,5 % auf
// Stufe 12 und +4 % auf Stufe 15, Messrauschen etwa ±1 %. Zum Schluss: wie viel
// stärker die Musterteams mit ihren Wegen sind (danach richten sich die Gegner der
// obersten Dungeons). Tabelle in docs/SPEZIALISIERUNG.md nachführen.
// Aufruf: npm run weg-eichung   (mehr Läufe: npm run weg-eichung -- 400,
//         nur einzelne Wege, ohne Musterteams: npm run weg-eichung -- 400 guardian_phalanx,witch_fluchweberin,
//         nur die Musterteams: npm run weg-eichung -- 400 teams)
// ────────────────────────────────────────────────────────────────

import { DIFFICULTY_DEFS } from '../src/data/difficulty';
import { ENEMY_DEFS } from '../src/data/enemies';
import { ROUTE_DEFS } from '../src/data/routes';
import { MUSTER_TEAMS, musterWerte } from '../src/data/musterteams';
import { SPEZIALISIERUNGEN } from '../src/data/spezialisierungen';
import type { GuildFighter } from '../src/models/GuildRoster';
import { MusterTeamName, gewonnen, musterStand, spieleRoute } from '../src/systems/Musterlauf';

const LAEUFE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100;
const AUSWAHL = process.argv[3]?.split(',');
const NUR_TEAMS = AUSWAHL?.[0] === 'teams';
const DUNGEONS = ['drachenhort', 'himmelsarchiv'];
const STUFEN: { stufe: string; team: MusterTeamName; ziel: number }[] = [
  { stufe: 'Stufe 12', team: 'gut', ziel: 2.5 },
  { stufe: 'Stufe 15', team: 'stark', ziel: 4 },
];
const NORMAL = { ...DIFFICULTY_DEFS.normal };

const GEGNER = Object.values(ENEMY_DEFS).map(def => ({ def, hp: def.hp, atk: def.atk }));

type Vorbereitung = (helden: GuildFighter[]) => void;

/** Fester Wert zwischen 0 und 1 je Lauf und Zahl: mit und ohne Weg derselbe */
function rest(lauf: number, nummer: number): number {
  let x = Math.imul(lauf, 0x9e3779b1) ^ Math.imul(nummer + 1, 0x85ebca77);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  return ((x ^ (x >>> 15)) >>> 0) / 2 ** 32;
}

/** Gegner um den Faktor stärker; abgerundet wird wie im Spiel, aber vom Wert plus Rest des Laufs */
function gegnerStaerke(faktor: number, lauf: number): void {
  const hpMult = NORMAL.enemyHpMult * faktor, atkMult = NORMAL.enemyAtkMult * faktor;
  DIFFICULTY_DEFS.normal.enemyHpMult = hpMult;
  DIFFICULTY_DEFS.normal.enemyAtkMult = atkMult;
  GEGNER.forEach((g, nummer) => {
    g.def.hp = g.hp + rest(lauf, 2 * nummer) / hpMult;
    g.def.atk = g.atk + rest(lauf, 2 * nummer + 1) / atkMult;
  });
}

function siege(route: string, team: MusterTeamName, faktor: number, wege: boolean, vorbereitung: Vorbereitung): number {
  let anzahl = 0;
  for (let i = 1; i <= LAEUFE; i++) {
    gegnerStaerke(faktor, i);
    const { state, ids } = musterStand(team, i * 7919, undefined, wege);
    vorbereitung(state.fighters);
    if (gewonnen(spieleRoute(state, ids, route, 'vorsichtig'))) anzahl++;
  }
  return anzahl;
}

/**
 * Gegner-Faktor, bei dem das Team die Hälfte der Läufe gewinnt: Halbierung zwischen 0,5 und 2,
 * oder mit `um` nur bis 30 % darüber oder darunter (genauer und schneller)
 */
function haelfte(route: string, team: MusterTeamName, wege: boolean, vorbereitung: Vorbereitung = () => {}, um?: number): number {
  let unten = um ? um / 1.3 : 0.5, oben = um ? um * 1.3 : 2;
  for (let schritt = 0; schritt < (um ? 8 : 11); schritt++) {
    const mitte = Math.sqrt(unten * oben);
    if (siege(route, team, mitte, wege, vorbereitung) * 2 >= LAEUFE) unten = mitte; else oben = mitte;
  }
  return Math.sqrt(unten * oben);
}

/**
 * Platz des Helden mit dieser Klasse; fehlt sie, übernimmt sie den letzten Platz mit dessen Werten.
 * `team` benennt die Aufstellung (für den Vergleich ohne Weg, den alle Wege derselben Aufstellung teilen).
 */
function platzFuer(klasse: string, team: MusterTeamName): { platz: number; vorbereitung: Vorbereitung; aufstellung: string } {
  const helden = MUSTER_TEAMS[team].helden;
  const platz = helden.findIndex(h => h.classId === klasse);
  if (platz >= 0) return { platz, vorbereitung: () => {}, aufstellung: team };
  const letzter = helden.length - 1;
  const werte = musterWerte({ ...helden[letzter], classId: klasse });
  return {
    platz: letzter, aufstellung: `${team}:${klasse}`,
    vorbereitung: h => { h[letzter].classId = klasse; h[letzter].baseStats = { ...werte }; },
  };
}

const zuwachs = (mit: number, ohne: number) => (mit / ohne - 1) * 100;
const zahl = (wert: number) => `${wert.toFixed(1)} %`;
/** Mittel neben dem Ziel: ab 1 Prozentpunkt mit Pfeil, damit Ausreisser auffallen */
const markiert = (wert: number, ziel: number) =>
  `**${zahl(wert)}**${wert > ziel + 1 ? ' ↑' : wert < ziel - 1 ? ' ↓' : ''}`;

if (!NUR_TEAMS) {
  console.log(`\nWeg-Eichung: Zuwachs, ${LAEUFE} Läufe je Messpunkt (Hort = Drachenhort, Archiv = Himmelsarchiv)\n`);
  console.log(`| Weg | ${STUFEN.map(s => `${s.stufe}: Hort | Archiv | Mittel`).join(' | ')} |`);
  console.log(`|---|${STUFEN.map(() => '---|---|---').join('|')}|`);
}
const ohneWeg = new Map<string, number>();
for (const weg of SPEZIALISIERUNGEN.filter(s => !NUR_TEAMS && (!AUSWAHL || AUSWAHL.includes(s.id)))) {
  const spalten = STUFEN.map(({ team, ziel }) => {
    const { platz, vorbereitung, aufstellung } = platzFuer(weg.klasse, team);
    const werte = DUNGEONS.map(route => {
      const schluessel = `${route}:${aufstellung}`;
      if (!ohneWeg.has(schluessel)) ohneWeg.set(schluessel, haelfte(route, team, false, vorbereitung));
      const ohne = ohneWeg.get(schluessel)!;
      return zuwachs(haelfte(route, team, false, h => { vorbereitung(h); h[platz].spezialisierung = weg.id; }, ohne), ohne);
    });
    const mittel = werte.reduce((a, b) => a + b, 0) / werte.length;
    return [...werte.map(zahl), markiert(mittel, ziel)].join(' | ');
  });
  console.log(`| ${weg.zeichen} ${weg.name} | ${spalten.join(' | ')} |`);
}

if (!AUSWAHL || NUR_TEAMS) {
  console.log(`\nMusterteams mit ihren Wegen (MUSTER_TEAMS), ${LAEUFE} Läufe je Messpunkt\n`);
  console.log('| Dungeon | Team | stärker als ohne Wege |');
  console.log('|---|---|---|');
  for (const { team } of STUFEN) {
    for (const route of DUNGEONS) {
      const ohne = haelfte(route, team, false);
      console.log(`| ${ROUTE_DEFS[route].name} | ${team} | ${zahl(zuwachs(haelfte(route, team, true, undefined, ohne), ohne))} |`);
    }
  }
}
