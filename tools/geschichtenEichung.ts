// ─── Magic City – Eichung der Geschichten ───────────────────────
// Misst, wie stark die Entscheidungen der Dungeon-Geschichten (data/dungeonGeschichten.ts)
// einen Dungeon leichter oder schwerer machen. Massstab ist die Schwelle: Um wie viel dürfen
// die Gegner stärker sein (Leben und Angriff), bis das Musterteam «frisch» einen Lauf nicht
// mehr gewinnt? Jeder Lauf (Startwert) hat seine eigene Schwelle; die Tabelle zeigt ihr
// geometrisches Mittel. Anders als der Faktor für 50 % Siege (tools/dungeonEichung.ts) sieht
// das Mittel auch Folgen, die nur einen Teil der Läufe treffen, etwa wenn ein Kampf vor dem
// Boss die meisten Läufe entscheidet. Verglichen wird die Route ohne Entscheidungen mit der
// vorsichtigen Spielweise (immer die sichere Option) und der gierigen (immer die mutige),
// src/systems/Musterlauf.ts. «einzeln» misst jede Entscheidung für sich: vorsichtig, nur hier mutig.
// Ziele in docs/GESCHICHTEN.md.
// Aufruf: npm run geschichten-eichung   (mehr Läufe: npm run geschichten-eichung -- 300,
//         nur einzelne Dungeons: npm run geschichten-eichung -- 200 forest_short,cave_deep,
//         jede Entscheidung einzeln: npm run geschichten-eichung -- einzeln [200] [Dungeons])
// ────────────────────────────────────────────────────────────────

import { DIFFICULTY_DEFS } from '../src/data/difficulty';
import { ROUTE_DEFS } from '../src/data/routes';
import { DUNGEON_GESCHICHTEN } from '../src/data/dungeonGeschichten';
import { Spielweise, gewonnen, musterStand, spieleRoute } from '../src/systems/Musterlauf';

const ARGUMENTE = process.argv.slice(2);
const EINZELN = ARGUMENTE.includes('einzeln');
const ZAHL = Number(ARGUMENTE.find(a => /^\d+$/.test(a)));
const LAEUFE = ZAHL > 0 ? ZAHL : 200;
const AUSWAHL = ARGUMENTE.find(a => a !== 'einzeln' && !/^\d+$/.test(a))?.split(',');
/** Ziel der ganzen Spielweisen: so viel Prozent leichter (vorsichtig) oder schwerer (gierig) */
const ZIEL = { vorsichtig: { mindestens: 0, hoechstens: 12 }, gierig: { mindestens: 12, hoechstens: 25 } };
/** Ziel im Modus «einzeln»: Nur hier mutig macht den Dungeon um so viel Prozent schwerer */
const ZIEL_EINZELN = { mindestens: 3, hoechstens: 15 };
/** Halbierungsschritte je Lauf zwischen Faktor 0,1 und 40: genau auf etwa 0,3 % */
const SCHRITTE = 11;
const NORMAL = { ...DIFFICULTY_DEFS.normal };

function gewinnt(route: string, startwert: number, faktor: number, spielweise: Spielweise): boolean {
  DIFFICULTY_DEFS.normal.enemyHpMult = NORMAL.enemyHpMult * faktor;
  DIFFICULTY_DEFS.normal.enemyAtkMult = NORMAL.enemyAtkMult * faktor;
  const { state, ids } = musterStand('frisch', startwert);
  return gewonnen(spieleRoute(state, ids, route, spielweise));
}

/** Höchster Gegner-Faktor, bei dem der Lauf mit diesem Startwert noch gewonnen wird */
function schwelleEinesLaufs(route: string, startwert: number, spielweise: Spielweise): number {
  let unten = 0.1, oben = 40;
  for (let schritt = 0; schritt < SCHRITTE; schritt++) {
    const mitte = Math.sqrt(unten * oben);
    if (gewinnt(route, startwert, mitte, spielweise)) unten = mitte; else oben = mitte;
  }
  return Math.sqrt(unten * oben);
}

/** Schwelle der Route: geometrisches Mittel über die Läufe (Startwerte 1 × 7919, 2 × 7919 …) */
function schwelle(route: string, spielweise: Spielweise, laeufe: number): number {
  let summe = 0;
  for (let i = 1; i <= laeufe; i++) summe += Math.log(schwelleEinesLaufs(route, i * 7919, spielweise));
  return Math.exp(summe / laeufe);
}

/** Um so viel Prozent leichter (plus) oder schwerer (minus) als der Vergleich */
const aenderung = (mit: number, ohne: number) => (mit / ohne - 1) * 100;
const prozent = (wert: number) => `${wert >= 0 ? '+' : '−'}${Math.abs(wert).toFixed(1)} %`;
const urteil = (wert: number, ziel: { mindestens: number; hoechstens: number }) =>
  wert < ziel.mindestens ? 'zu wenig' : wert > ziel.hoechstens ? 'zu viel' : '✓';
const geschichten = DUNGEON_GESCHICHTEN.filter(g => g.wahlen.length > 0 && (!AUSWAHL || AUSWAHL.includes(g.routeId)));

if (!EINZELN) {
  console.log(`\nGeschichten-Eichung: Schwelle des Teams «frisch» (Gegner-Faktor, bis zu dem ein Lauf gewinnt, Mittel aus ${LAEUFE} Läufen)`);
  console.log('Plus: die Gegner dürfen so viel stärker sein (leichter), minus: so viel schwächer (schwerer).');
  console.log(`Ziel: vorsichtig ${ZIEL.vorsichtig.mindestens} bis +${ZIEL.vorsichtig.hoechstens} %, gierig −${ZIEL.gierig.mindestens} bis −${ZIEL.gierig.hoechstens} %.\n`);
  console.log('| Dungeon | Schwelle ohne Entscheidungen | vorsichtig | gierig |');
  console.log('|---|---|---|---|');
  for (const geschichte of geschichten) {
    const wahlen = geschichte.wahlen;
    geschichte.wahlen = [];
    const ohne = schwelle(geschichte.routeId, 'vorsichtig', LAEUFE);
    geschichte.wahlen = wahlen;
    const vorsichtig = aenderung(schwelle(geschichte.routeId, 'vorsichtig', LAEUFE), ohne);
    const gierig = aenderung(schwelle(geschichte.routeId, 'gierig', LAEUFE), ohne);
    const urteilV = urteil(vorsichtig, ZIEL.vorsichtig);
    const urteilG = urteil(-gierig, ZIEL.gierig);
    console.log(`| ${ROUTE_DEFS[geschichte.routeId].name} | ${ohne.toFixed(2)} | ${prozent(vorsichtig)} ${urteilV} | ${prozent(gierig)} ${urteilG} |`);
  }
} else {
  console.log(`\nGeschichten-Eichung, jede Entscheidung einzeln: Schwelle des Teams «frisch», Mittel aus ${LAEUFE} Läufen.`);
  console.log('Vorsichtig, nur bei dieser Entscheidung mutig, verglichen mit immer vorsichtig. Minus: so viel schwerer.');
  console.log(`Ziel: ${ZIEL_EINZELN.mindestens} bis ${ZIEL_EINZELN.hoechstens} % schwerer.\n`);
  console.log('| Dungeon | Entscheidung | nur hier mutig | |');
  console.log('|---|---|---|---|');
  for (const geschichte of geschichten) {
    const vorsichtig = schwelle(geschichte.routeId, 'vorsichtig', LAEUFE);
    const wahlen = geschichte.wahlen;
    wahlen.forEach((wahl, i) => {
      // Die vorsichtige Spielweise nimmt bei dieser Entscheidung die mutige Option
      geschichte.wahlen = wahlen.map((w, k) => (k === i ? { ...w, sicher: w.mutig } : w));
      const mutig = aenderung(schwelle(geschichte.routeId, 'vorsichtig', LAEUFE), vorsichtig);
      geschichte.wahlen = wahlen;
      const name = i === 0 ? ROUTE_DEFS[geschichte.routeId].name : '';
      console.log(`| ${name} | ${i + 1} «${wahl.titel}» | ${prozent(mutig)} | ${urteil(-mutig, ZIEL_EINZELN)} |`);
    });
  }
}
