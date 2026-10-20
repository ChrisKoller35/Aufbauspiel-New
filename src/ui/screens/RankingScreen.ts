// ─── Magic City – Ranking Screen ────────────────────────────────
// Rangliste mit Rivalen (systems/Rangliste.ts): Ruhmestruhe zum Abholen,
// Gipfel-Rangliste, Wochenwertung, Neues von der Karte, Pokale und darunter
// die besten eigenen Expeditionen.
// ────────────────────────────────────────────────────────────────

import '../html/rangliste.css';
import { GameState } from '../../models/GameState';
import { ScoreboardEntry } from '../../models/ScoreboardEntry';
import { WochenErgebnis } from '../../models/RanglisteStand';
import { ROUTE_DEFS } from '../../data/routes';
import { ENEMY_DEFS } from '../../data/enemies';
import { RIVALEN } from '../../data/rivalen';
import { setFuerRoute, setVonItem } from '../../data/dungeonSets';
import { imDungeon } from '../../data/dungeonNamen';
import { bezwungeneDungeons } from '../../systems/Bezwungen';
import { setTeilHinweise } from '../../systems/DungeonSets';
import {
  GildenStand, RUHMESTRUHEN, WochenZeile, belohnungenAbholen, besterRuhmDungeon, gipfelRangliste, naechsteBedrohung,
  neuigkeiten, ranglisteStand, ruhmJeSieg, truhenDungeon, wegVorbei, wochenRangliste,
} from '../../systems/Rangliste';
import { showChestReveal } from '../components/ChestRevealOverlay';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;
/** Was gerade abgeholt wurde: einmal oben gezeigt */
let abgeholt: WochenErgebnis[] = [];

export function initRankingScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const STUNDE_MS = 3_600_000;
const POKAL_ZEICHEN: Record<NonNullable<WochenErgebnis['pokal']>, string> = { gold: '🥇', silber: '🥈', bronze: '🥉' };
const POKAL_NAME: Record<NonNullable<WochenErgebnis['pokal']>, string> = { gold: 'Goldpokal', silber: 'Silberpokal', bronze: 'Bronzepokal' };

function routeName(routeId: string): string {
  const def = ROUTE_DEFS[routeId];
  return def ? def.name : routeId;
}

function meter(hoehe: number): string {
  return `${hoehe.toLocaleString('de')} m`;
}

function zahl(n: number): string {
  return n.toLocaleString('de');
}

function rankClass(rank: number): string {
  if (rank === 1) return 'r1';
  if (rank === 2) return 'r2';
  if (rank === 3) return 'r3';
  return '';
}

function wocheNummer(wocheId: string): string {
  return `KW ${Number(wocheId.slice(-2))}`;
}

/** «noch 4 Tage», «noch 5 Std.», «noch 12 Min.» */
function restzeit(ms: number): string {
  const stunden = ms / STUNDE_MS;
  if (stunden >= 24) {
    const tage = Math.floor(stunden / 24);
    return `noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'}`;
  }
  if (stunden >= 1) return `noch ${Math.floor(stunden)} Std.`;
  return `noch ${Math.max(1, Math.ceil(ms / 60_000))} Min.`;
}

/** «bei deiner letzten Expedition», «vor 3 Expeditionen» */
function vorExpeditionen(vor: number): string {
  if (vor <= 0) return 'bei deiner letzten Expedition';
  return `vor ${vor} ${vor === 1 ? 'Expedition' : 'Expeditionen'}`;
}

/** «in 3 Expeditionen», «nach deiner nächsten Expedition» */
function inExpeditionen(runden: number): string {
  return runden <= 1 ? 'nach deiner nächsten Expedition' : `in ${runden} Expeditionen`;
}

/** «zieht» oder «ziehen», je nach Name der Gilde */
function verb(g: { mehrzahl: boolean }, einzahl: string, mehrzahl: string): string {
  return g.mehrzahl ? mehrzahl : einzahl;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gildeHtml(g: { wappen: string; name: string }): string {
  return `${g.wappen} ${escapeHtml(g.name)}`;
}

// ─── Abschnitte ─────────────────────────────────────────────────

function abholenHtml(offen: WochenErgebnis[]): string {
  if (abgeholt.length > 0) {
    const pokale = abgeholt.map(e => (e.pokal ? POKAL_ZEICHEN[e.pokal] : '')).join(' ');
    return `
      <section class="rl-abholen rl-abgeholt">
        <div class="rl-abholen-pokal">${pokale}</div>
        <div class="rl-abholen-text"><b>Abgeholt!</b> Die Beute liegt im Lager, ${abgeholt.length === 1 ? 'der Pokal steht' : 'die Pokale stehen'} unten bei deinen Pokalen.</div>
      </section>`;
  }
  if (offen.length === 0) return '';
  const zeilen = offen.map(e =>
    `<div>${e.pokal ? POKAL_ZEICHEN[e.pokal] : ''} <b>${wocheNummer(e.wocheId)}: Platz ${e.platz}</b> mit ${zahl(e.ruhm)} Ruhm</div>`,
  ).join('');
  return `
    <section class="rl-abholen">
      <div class="rl-abholen-text">
        <div class="rl-abholen-titel">Ruhmestruhe bereit!</div>
        ${zeilen}
      </div>
      <button class="rl-abholen-knopf" data-abholen>ÖFFNEN</button>
    </section>`;
}

function gipfelHtml(state: GameState, jetzt: number, gipfel: GildenStand[]): string {
  const platz = gipfel.findIndex(g => g.spieler) + 1;
  const du = gipfel[platz - 1];

  let ziel: string;
  if (platz === 1) {
    const zweiter = gipfel[1];
    ziel = `<b>Du stehst ganz oben!</b> Dicht hinter dir: ${gildeHtml(zweiter)}`
      + (zweiter.hoechster ? ` auf ${meter(zweiter.hoehe)} (${escapeHtml(routeName(zweiter.hoechster))}).` : '.');
  } else {
    const vor = gipfel[platz - 2];
    const wo = vor.hoechster ? ` auf ${meter(vor.hoehe)} (${escapeHtml(routeName(vor.hoechster))})` : '';
    const weg = wegVorbei(state, vor);
    let wie: string;
    if (weg) wie = `Ein Sieg <b>${escapeHtml(imDungeon(weg))}</b> bringt dich vorbei.`;
    else if (vor.hoehe > du.hoehe) wie = `Du musst höher hinauf als ${meter(vor.hoehe)}.`;
    else wie = `Gleich hoch wie du, aber dir fehlen ${vor.sterne - du.sterne} Sterne.`;
    ziel = `Vor dir: ${gildeHtml(vor)}${wo}. ${wie}`;
  }

  const bedrohung = naechsteBedrohung(state, jetzt);
  const warnung = bedrohung
    ? `<p class="rl-warnung">⚠️ ${gildeHtml(bedrohung.gilde)} ${verb(bedrohung.gilde, 'zieht', 'ziehen')} ${inExpeditionen(bedrohung.runden)}
        an dir vorbei (mit einem Sieg ${escapeHtml(imDungeon(bedrohung.routeId))}), wenn du bis dahin nicht weiter kletterst.</p>`
    : '';

  return `
    <section class="rl-karte rl-gipfel">
      <div class="rl-kopf">
        <h2>Gipfel-Rangliste</h2>
        <span class="rl-kopf-info">Platz ${platz} von ${gipfel.length}</span>
      </div>
      <p class="rl-ziel">${ziel}</p>
      ${warnung}
      <ol class="rl-liste">${gipfel.map((g, i) => gipfelZeileHtml(g, i + 1)).join('')}</ol>
      <details class="rl-regel">
        <summary>So funktioniert die Gipfel-Rangliste</summary>
        <p>Es zählt der höchste Dungeon, den eine Gilde bezwungen hat: je weiter oben auf der Karte, desto mehr Meter.
        Bezwungen heisst gewonnen, und wo es einen Boss gibt, mit besiegtem Boss. Bei gleicher Höhe zählen die Sterne:
        Jeder bezwungene Dungeon bringt so viele Sterne, wie unter ihm auf der Karte stehen.</p>
        <p>Mit jeder Expedition, die du beendest, klettern auch die Rivalen ein Stück weiter. Machst du Pause, warten sie.
        Ihre Wappen siehst du auf der Dungeon-Karte.</p>
      </details>
    </section>`;
}

function gipfelZeileHtml(g: GildenStand, platz: number): string {
  const unter = g.spieler ? escapeHtml(g.stadt) : `${escapeHtml(g.stadt)} · «${escapeHtml(g.motto ?? '')}»`;
  const wo = g.hoechster ? escapeHtml(routeName(g.hoechster)) : 'noch kein Dungeon';
  return `
    <li class="rl-zeile ${rankClass(platz)}${g.spieler ? ' rl-du' : ''}">
      <span class="rl-platz">${platz}</span>
      <span class="rl-wappen"${g.farbe ? ` style="--rl-farbe:${g.farbe}"` : ''}>${g.wappen}</span>
      <span class="rl-name">${escapeHtml(g.name)}<small>${unter}</small></span>
      <span class="rl-wert"><b>${g.hoechster ? meter(g.hoehe) : '–'}</b><small>${wo} · ${g.sterne}&nbsp;★</small></span>
    </li>`;
}

function wochenHtml(state: GameState, jetzt: number): string {
  const { woche, zeilen } = wochenRangliste(state, jetzt);
  const platz = zeilen.findIndex(z => z.spieler) + 1;
  const ich = zeilen[platz - 1];

  // Ziel: ab Platz 4 der dritte (dort gibt es die erste Truhe), sonst der Platz direkt darüber
  let ziel: string;
  if (platz === 1) {
    const zweiter = zeilen[1];
    ziel = `<b>Du führst diese Woche!</b> ${gildeHtml(zweiter)} ${verb(zweiter, 'liegt', 'liegen')} ${zahl(ich.ruhm - zweiter.ruhm)} Ruhm
      hinter dir, und der Ruhm der Rivalen wächst diese Woche nicht mehr: Platz 1 ist dir sicher.`;
  } else {
    const zielPlatz = Math.min(platz - 1, 3);
    const vor = zeilen[zielPlatz - 1];
    // Bei Gleichstand gewinnt die eigene Gilde
    const fehlt = vor.ruhm - ich.ruhm;
    const dungeon = besterRuhmDungeon(state);
    const siege = Math.max(1, Math.ceil(fehlt / Math.max(1, ruhmJeSieg(dungeon))));
    const wofuer = platz > 3 ? 'Platz 3 und damit eine Ruhmestruhe' : `Platz ${zielPlatz} und eine bessere Truhe`;
    ziel = `Für ${wofuer} fehlen dir noch <b>${zahl(fehlt)} Ruhm</b>,
      etwa ${siege} ${siege === 1 ? 'Sieg' : 'Siege'} ${escapeHtml(imDungeon(dungeon))}.`;
  }

  const truhe = truhenDungeon(state);
  const boss = escapeHtml(ENEMY_DEFS[ROUTE_DEFS[truhe]?.bossId ?? '']?.name ?? '');
  const zurzeit = truhe in bezwungeneDungeons(state) ? 'zurzeit' : 'bis du einen Boss besiegst';
  const set = setFuerRoute(truhe);
  const setTeil = set ? `, ein Teil von «${set.zeichen} ${escapeHtml(set.name)}» (eins, das dir noch fehlt)` : '';
  const belohnungen = RUHMESTRUHEN.map(t =>
    `${POKAL_ZEICHEN[t.pokal]} Gold und ${t.wuerfe} Beutestücke${t.setTeil ? setTeil : ''}, ${t.kristalle} Kristallsplitter und ein ${POKAL_NAME[t.pokal]}`,
  ).join('<br>');

  return `
    <section class="rl-karte rl-woche">
      <div class="rl-kopf">
        <h2>Wochenwertung</h2>
        <span class="rl-kopf-info">${wocheNummer(woche.id)} · ${restzeit(woche.ende - jetzt)}</span>
      </div>
      <p class="rl-ziel">${ziel}</p>
      <ol class="rl-liste">${zeilen.map((z, i) => wochenZeileHtml(z, i + 1)).join('')}</ol>
      <details class="rl-regel">
        <summary>So funktioniert die Woche</summary>
        <p>Jede Expedition bringt Ruhm: Ebene des Dungeons mal geschaffte Räume. Ein Sieg zählt doppelt,
        der allererste Sieg in einem Dungeon noch einmal doppelt. Der Ruhm der Rivalen steht ab Montag fest,
        du siehst also genau, wie viel dir fehlt.</p>
        <p>Die Woche läuft von Montag bis Sonntag. Danach wartet für Platz 1 bis 3 eine Ruhmestruhe. Sie würfelt
        aus der Beute des höchsten Bosses, den du besiegt hast (${zurzeit}: ${boss}):</p>
        <p class="rl-belohnungen">${belohnungen}</p>
      </details>
    </section>`;
}

function wochenZeileHtml(z: WochenZeile, platz: number): string {
  return `
    <li class="rl-zeile ${rankClass(platz)}${z.spieler ? ' rl-du' : ''}">
      <span class="rl-platz">${platz}</span>
      <span class="rl-wappen">${z.wappen}</span>
      <span class="rl-name">${escapeHtml(z.name)}</span>
      <span class="rl-wert"><b>${zahl(z.ruhm)}</b> Ruhm</span>
    </li>`;
}

function neuigkeitenHtml(state: GameState, jetzt: number): string {
  const liste = neuigkeiten(state, jetzt);
  const inhalt = liste.length === 0
    ? '<p class="rl-leer">Noch ist es ruhig auf der Karte. Hier steht, sobald eine Gilde einen neuen Dungeon bezwingt.</p>'
    : `<ul class="rl-news">${liste.map(n => `
        <li class="${n.spieler ? 'rl-du' : ''}">
          <span class="rl-wappen">${n.wappen}</span>
          <span class="rl-news-text"><b>${escapeHtml(n.wer)}:</b> ${escapeHtml(n.text)}<small>${vorExpeditionen(n.vor)}</small></span>
        </li>`).join('')}</ul>`;
  return `
    <section class="rl-karte">
      <div class="rl-kopf"><h2>Neues von der Karte</h2></div>
      ${inhalt}
    </section>`;
}

function pokaleHtml(state: GameState, jetzt: number): string {
  const stand = ranglisteStand(state, jetzt);
  const { gold, silber, bronze } = stand.pokale;
  const verlauf = stand.verlauf.slice(0, 5)
    .map(e => `<span class="rl-verlauf">${wocheNummer(e.wocheId)}: Platz ${e.platz}</span>`).join('');
  return `
    <section class="rl-karte rl-pokale">
      <div class="rl-kopf"><h2>Deine Pokale</h2></div>
      <div class="rl-pokal-reihe">
        <span>🥇 ${gold}</span><span>🥈 ${silber}</span><span>🥉 ${bronze}</span>
      </div>
      ${verlauf ? `<div class="rl-verlauf-reihe">${verlauf}</div>` : '<p class="rl-leer">Die erste Wochenwertung endet am Montag.</p>'}
    </section>`;
}

// ─── Table Rows from Scoreboard ─────────────────────────────────

function renderScoreboardRows(entries: ScoreboardEntry[]): string {
  // Sort by score descending
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 20);

  return top.map((entry, i) => {
    const rank = i + 1;
    const rc = rankClass(rank);
    const statusIcon = entry.status === 'victory' ? '✅'
      : entry.status === 'defeat' ? '❌' : '\u{1F3F3}️';

    return `
      <tr class="${rc}">
        <td class="rn">${rank}</td>
        <td class="rnm">Tag ${entry.day}</td>
        <td>${routeName(entry.routeId)}</td>
        <td>${entry.partyClasses.length}</td>
        <td>${statusIcon} ${entry.score}</td>
        <td class="rgold">${entry.enemiesKilled} ⚔</td>
      </tr>`;
  }).join('');
}

// ─── Main Render ────────────────────────────────────────────────

export function renderRankingScreen(container: HTMLElement): void {
  const state = gameState;
  const el = document.createElement('div');
  el.id = 's-ranking';
  el.className = 'screen';
  if (!state) {
    container.appendChild(el);
    return;
  }

  const jetzt = Date.now();
  const stand = ranglisteStand(state, jetzt);
  const gipfel = gipfelRangliste(state, jetzt);
  const hasScoreboard = state.scoreboard && state.scoreboard.length > 0;

  const myScoreSection = hasScoreboard ? `
    <details class="rl-karte rl-bestenliste">
      <summary class="rl-kopf"><h2>Deine besten Expeditionen</h2><span class="rl-kopf-info rl-auf">anzeigen</span></summary>
      <div class="rl-tabelle-rahmen">
        <table class="rtable">
          <thead><tr><th>#</th><th>Tag</th><th>Route</th><th>Helden</th><th>Score</th><th>Kills</th></tr></thead>
          <tbody>${renderScoreboardRows(state.scoreboard)}</tbody>
        </table>
      </div>
    </details>
  ` : '';

  const seitStart = stand.runde === 0
    ? 'Das Rennen beginnt mit deiner nächsten Expedition.'
    : `Seit dem Start des Rennens: ${zahl(stand.runde)} ${stand.runde === 1 ? 'Expedition' : 'Expeditionen'}.`;

  el.innerHTML = `
      ${renderHeader(state, 'main', 'RANGLISTE')}
      <div class="scontent rl">
        ${abholenHtml(stand.offen)}
        ${gipfelHtml(state, jetzt, gipfel)}
        ${wochenHtml(state, jetzt)}
        ${neuigkeitenHtml(state, jetzt)}
        ${pokaleHtml(state, jetzt)}
        ${myScoreSection}
        <p class="rl-fuss">${RIVALEN.length} Rivalen-Gilden klettern mit dir um die Wette. ${seitStart}</p>
      </div>`;
  abgeholt = [];
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────
  let oeffnet = false;
  el.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const nav = target.closest<HTMLElement>('[data-nav]');
    if (nav) {
      navigateTo(nav.dataset.nav as Parameters<typeof navigateTo>[0]);
      return;
    }
    if (target.closest('[data-abholen]') && !oeffnet) {
      oeffnet = true;
      // Set-Teile zählen, solange sie noch nicht im Lager liegen («Teil 2 von 3»)
      const offen = ranglisteStand(state, Date.now()).offen;
      const setTeile = offen.flatMap(e => Object.keys(e.belohnung)).filter(id => !!setVonItem(id));
      const hinweise = setTeilHinweise(state, setTeile);
      // Erst ins Lager und speichern, dann die Truhe zeigen: Beim Neuladen geht nichts verloren
      const ergebnisse = belohnungenAbholen(state, Date.now());
      window.dispatchEvent(new Event('mc:speichern'));
      const beute: Record<string, number> = {};
      let gold = 0;
      for (const ergebnis of ergebnisse) {
        for (const [id, menge] of Object.entries(ergebnis.belohnung)) {
          if (id === 'gold') gold += menge;
          else beute[id] = (beute[id] ?? 0) + menge;
        }
      }
      void showChestReveal(beute, gold, hinweise, truhenTitel(ergebnisse)).then(() => {
        abgeholt = ergebnisse;
        neuZeichnen(el);
      });
    }
  });
}

/** «🏆 Ruhmestruhe für Platz 1 in KW 42!», bei mehreren Wochen alle Plätze */
function truhenTitel(ergebnisse: WochenErgebnis[]): string {
  if (ergebnisse.length === 1) {
    const e = ergebnisse[0];
    return `🏆 Ruhmestruhe für Platz ${e.platz} in ${wocheNummer(e.wocheId)}!`;
  }
  return `🏆 ${ergebnisse.length} Ruhmestruhen: ${ergebnisse.map(e => `${wocheNummer(e.wocheId)} Platz ${e.platz}`).join(', ')}`;
}

/**
 * Zeichnet die Rangliste an derselben Stelle neu (der Router zeichnet nur beim Wechsel des Bildschirms,
 * main.ts replaceScreen): Nach dem Abholen stehen oben «Abgeholt!» und unten die neuen Pokale.
 */
function neuZeichnen(alt: HTMLElement): void {
  const app = alt.parentElement;
  if (!app) return;
  const style = alt.style.cssText;
  const scroll = alt.scrollTop;
  const danach = alt.nextSibling;
  alt.remove();
  try {
    renderRankingScreen(app);
  } finally {
    // Geht das Zeichnen schief, bleibt die alte Rangliste stehen statt einer leeren Seite
    const neu = document.getElementById('s-ranking') ?? alt;
    app.insertBefore(neu, danach);
    neu.style.cssText = style;
    neu.scrollTop = scroll;
  }
}
