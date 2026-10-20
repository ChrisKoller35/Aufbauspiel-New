// ─── Magic City – Eichung der Rangliste ─────────────────────────
// Spielt das Rennen gegen die Rivalen-Gilden (data/rivalen.ts) mit einer
// Muster-Gilde durch: Sie bezwingt die Dungeons von unten nach oben und
// braucht je neuen Dungeon so viele Expeditionen, wie MUSTER_EXPEDITIONEN
// für seine Ebene sagt (mal Tempo: schnell 0,6, normal 1, gemütlich 1,6).
// Gezeigt wird, wann sie an welcher Gilde vorbeizieht, wann die Rivalen die
// obersten Dungeons erreichen und welcher Wochenplatz mit wie vielen
// Expeditionen pro Woche drinliegt. Ziele in docs/RANGLISTE.md.
// Drei Spielstände beim Start: «frisch» (noch kein Dungeon), «mitte»
// (Waldgebiet, Höhle und Sumpfpfad) und «probe» (wie das Probespiel).
// Das Rennen läuft mit einem festen Samen (gleiche Ausgabe bei jedem Aufruf),
// die Wochenwertung mit 50 Samen: Die Form der Rivalen schwankt von Woche zu Woche.
// Aufruf: npm run rangliste-eichung   (nur einer: npm run rangliste-eichung -- probe)
// ────────────────────────────────────────────────────────────────

import { createNewGameState, GameState } from '../src/models/GameState';
import { DUNGEON_GRAPH, ROUTE_DEFS } from '../src/data/routes';
import { RIVALEN } from '../src/data/rivalen';
import {
  TAG_MS, dungeonHoehe, dungeonSterne, gipfelRangliste, ranglisteStand, rivalenLauf, ruhmJeSieg, spielerEbenen, wocheVon,
  wochenRangliste,
} from '../src/systems/Rangliste';

/** Montag, 2. November 2026, 08:00: Das Rennen beginnt an einem Wochenanfang */
const START = new Date(2026, 10, 2, 8, 0).getTime();
const MEILENSTEINE = ['volcano_core', 'drachenhort', 'himmelsarchiv'];

/** Expeditionen bis zum ersten Sieg in einem neuen Dungeon dieser Ebene (normales Tempo, Üben eingerechnet) */
const MUSTER_EXPEDITIONEN: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 9, 5: 14, 6: 20 };
const TEMPI = { schnell: 0.6, normal: 1, gemuetlich: 1.6 };
/** Expeditionen pro Woche je Tempo */
const PRO_WOCHE = { schnell: 80, normal: 40, gemuetlich: 15 };
/** Anteil Siege bei den Expeditionen zwischendurch */
const SIEGQUOTE = 0.85;
/** Samen des Rennens; die Wochenwertung nimmt dazu noch 49 weitere */
const SAMEN = Array.from({ length: 50 }, (_, i) => 12345 + i * 7919);

/** Bezwungene Dungeons der eigenen Gilde je Spielstand */
const SPIELSTAENDE: Record<string, string[]> = {
  frisch: [],
  mitte: ['forest_short', 'forest_ruins', 'forest_medium', 'cave_deep', 'haunted_woods', 'ocean_shallows', 'swamp_long'],
  probe: DUNGEON_GRAPH.map(n => n.routeId).filter(id => ROUTE_DEFS[id].tier <= 4 && !!ROUTE_DEFS[id].bossId),
};

function neuerStand(bezwungen: string[], samen = SAMEN[0]): GameState {
  const state = createNewGameState();
  state.rngSeed = samen;
  state.guildStats.bossesDefeatedIds = bezwungen.map(id => ROUTE_DEFS[id].bossId).filter((b): b is string => !!b);
  state.bezwungen = Object.fromEntries(bezwungen.map(id => [id, 0]));
  ranglisteStand(state, START);
  return state;
}

type Stil = 'sammler' | 'kletterer';

/**
 * Nächster Dungeon der Muster-Gilde, soweit ihre Bosse ihn erlauben. «sammler»: die niedrigste Ebene,
 * darin der höchste (räumt jede Ebene ab); «kletterer»: zuerst die Dungeons mit Boss (der Weg nach
 * oben), sonst wie der Sammler.
 */
function naechsterDungeon(bezwungen: Set<string>, stil: Stil): string | null {
  const bosse = new Set([...bezwungen].map(id => ROUTE_DEFS[id].bossId).filter(Boolean));
  const frei = DUNGEON_GRAPH.map(n => n.routeId).filter(id =>
    !bezwungen.has(id) && (ROUTE_DEFS[id].unlockCondition?.bossesDefeated ?? []).every(b => bosse.has(b)));
  const mitBoss = frei.filter(id => !!ROUTE_DEFS[id].bossId);
  const auswahl = stil === 'kletterer' && mitBoss.length > 0 ? mitBoss : frei;
  if (auswahl.length === 0) return null;
  return auswahl.reduce((a, b) =>
    (dungeonSterne(b) < dungeonSterne(a) || (dungeonSterne(b) === dungeonSterne(a) && dungeonHoehe(b) > dungeonHoehe(a)) ? b : a));
}

/** Die Siege der Muster-Gilde: Dungeon und Runde */
function musterPlan(start: string[], faktor: number, stil: Stil = 'sammler'): { routeId: string; runde: number }[] {
  const bezwungen = new Set(start);
  const plan: { routeId: string; runde: number }[] = [];
  let runde = 0;
  for (let id = naechsterDungeon(bezwungen, stil); id; id = naechsterDungeon(bezwungen, stil)) {
    runde += Math.max(1, Math.round(MUSTER_EXPEDITIONEN[dungeonSterne(id)] * faktor));
    plan.push({ routeId: id, runde });
    bezwungen.add(id);
  }
  return plan;
}

function kurz(routeId: string | null): string {
  if (!routeId) return '–';
  const name = ROUTE_DEFS[routeId].name.replace(/\s*\(.*\)/, '').replace(/^(Der|Die|Das) /, '');
  return name.length > 12 ? name.slice(0, 11) + '…' : name;
}

const auswahl = process.argv[2];
for (const [name, start] of Object.entries(SPIELSTAENDE)) {
  if (auswahl && auswahl !== name) continue;
  const probe = neuerStand(start);
  const r = probe.rangliste!;
  console.log(`\n═══ ${name}: eigene Gilde mit ${r.startSterne} Sternen, höchste Ebene ${r.startEbene} ═══`);

  // Startplätze
  console.log('Start: ' + gipfelRangliste(probe, START).map((g, i) => `${i + 1}. ${g.wappen} ${kurz(g.hoechster)} ${g.sterne}★`).join(' · '));

  // Das Rennen gegen die Muster-Gilde in drei Tempi, normal auch als Kletterer
  const laeufe: [string, number, Stil][] = [
    ...Object.entries(TEMPI).map(([tempo, faktor]): [string, number, Stil] => [tempo, faktor, 'sammler']),
    ['normal als Kletterer', TEMPI.normal, 'kletterer'],
  ];
  for (const [tempo, faktor, stil] of laeufe) {
    const plan = musterPlan(start, faktor, stil);
    const ende = plan.length > 0 ? plan[plan.length - 1].runde : 0;
    const state = neuerStand(start);
    const stand = state.rangliste!;
    let platz = gipfelRangliste(state, START).findIndex(g => g.spieler) + 1;
    const ereignisse: string[] = [];
    for (let runde = 1; runde <= ende + 20; runde++) {
      for (const sieg of plan.filter(s => s.runde === runde)) state.bezwungen![sieg.routeId] = runde;
      const vorher = gipfelRangliste(state, START);
      stand.runde = runde;
      const nachher = gipfelRangliste(state, START);
      const neu = nachher.findIndex(g => g.spieler) + 1;
      if (neu !== platz) {
        const wer = neu < platz
          ? vorher.slice(neu - 1, platz - 1).filter(g => !g.spieler).map(g => g.wappen).join('')
          : nachher.slice(platz - 1, neu - 1).filter(g => !g.spieler).map(g => g.wappen).join('');
        ereignisse.push(`${runde}: ${neu < platz ? '▲' : '▼'}${neu} ${wer}`);
        platz = neu;
      }
    }
    const himmel = plan.find(s => s.routeId === 'himmelsarchiv')?.runde ?? '-';
    console.log(`\n${tempo} (Himmelsarchiv bei Expedition ${himmel}, ganze Karte bei ${ende}):`);
    console.log('  Platz: ' + (ereignisse.join(' · ') || 'keine Änderung'));

    // Wann die Gilden die obersten Dungeons erreichen (die Rivalen nach der Ebene der Muster-Gilde)
    console.log('  Expedition des Siegs: ' + MEILENSTEINE.map(id => `${kurz(id)} (${dungeonHoehe(id)} m)`).join(' · ') + ' · ganze Karte');
    const zeile = (name: string, siege: { routeId: string; runde: number }[]): void => {
      const runde = (id: string): string => String(siege.find(s => s.routeId === id)?.runde ?? '–');
      const alle = siege.length === DUNGEON_GRAPH.length ? String(Math.max(...siege.map(s => s.runde))) : '–';
      console.log(`  ${name}`.padEnd(34) + [...MEILENSTEINE.map(runde), alle].map(x => x.padStart(8)).join(''));
    };
    zeile('⭐ Muster-Gilde', [...start.map(routeId => ({ routeId, runde: 0 })), ...plan]);
    for (const rivale of RIVALEN) zeile(`${rivale.wappen} ${rivale.name}`, rivalenLauf(rivale, stand, spielerEbenen(state), ende + 300).siege);
  }

  // Wochenwertung: Platz mit den Expeditionen pro Woche je Tempo, in Woche 1, 2, 4 und 8.
  // Mittlerer Platz über alle Samen, in Klammern der beste und schlechteste und wie oft es eine Truhe gibt.
  console.log('\nWochenplatz je Tempo (mittlerer Platz, Spanne, Wochen mit Truhe, Ruhm):');
  console.log(''.padEnd(22) + ['Woche 1', 'Woche 2', 'Woche 4', 'Woche 8'].map(w => w.padEnd(25)).join(''));
  for (const [tempo, faktor] of Object.entries(TEMPI)) {
    const plan = musterPlan(start, faktor);
    const proWoche = PRO_WOCHE[tempo as keyof typeof PRO_WOCHE];
    const zellen: string[] = [];
    for (const woche of [1, 2, 4, 8]) {
      const plaetze: number[] = [];
      let ruhm = 0;
      for (const samen of SAMEN) {
        const state = neuerStand(start, samen);
        const stand = state.rangliste!;
        const beginn = (woche - 1) * proWoche;
        for (const sieg of plan.filter(s => s.runde <= beginn)) state.bezwungen![sieg.routeId] = sieg.runde;
        stand.runde = beginn;
        // Neue Woche: Ziele der Rivalen nach dem Stand am Montag
        const montag = wocheVon(START + (woche - 1) * 7 * TAG_MS);
        ranglisteStand(state, montag.start + 1);
        ruhm = 0;
        for (let i = 1; i <= proWoche; i++) {
          const runde = beginn + i;
          const erster = plan.find(s => s.runde === runde);
          const bester = [...Object.keys(state.bezwungen!), ...(erster ? [erster.routeId] : [])]
            .reduce((a, b) => (ruhmJeSieg(b) > ruhmJeSieg(a) ? b : a), 'forest_short');
          if (erster) {
            state.bezwungen![erster.routeId] = runde;
            ruhm += ruhmJeSieg(erster.routeId) * 2;
          } else {
            ruhm += Math.round(SIEGQUOTE * ruhmJeSieg(bester) + (1 - SIEGQUOTE) * ruhmJeSieg(bester) / 4);
          }
        }
        stand.runde = beginn + proWoche;
        stand.woche.ruhm = ruhm;
        plaetze.push(wochenRangliste(state, montag.start + 1).zeilen.findIndex(z => z.spieler) + 1);
      }
      plaetze.sort((a, b) => a - b);
      const mitte = plaetze[Math.floor(plaetze.length / 2)];
      const truhe = Math.round((100 * plaetze.filter(p => p <= 3).length) / plaetze.length);
      zellen.push(`${mitte}. (${plaetze[0]}–${plaetze[plaetze.length - 1]}, ${truhe} %) ${ruhm}`.padEnd(25));
    }
    console.log(`${tempo} ${proWoche}/Woche`.padEnd(22) + zellen.join(''));
  }
  const state = neuerStand(start);
  const zeilen = wochenRangliste(state, START).zeilen.filter(z => !z.spieler);
  console.log('Wochenruhm der Rivalen beim Start: ' + zeilen.map(z => `${z.wappen} ${z.ruhm}`).join(' · '));
}
