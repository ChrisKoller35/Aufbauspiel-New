// ─── Magic City – Monsterbuch ───────────────────────────────────
// Eine Seite je Dungeon (Reihenfolge der Karte), Kenntnisstufen je Gegner,
// Seitenprämien. Rechnen tut systems/Monsterkunde.ts, hier wird nur gezeigt
// (docs/MONSTERBUCH.md). In innerHTML stehen nur Texte aus den Datendateien
// und Zahlen; IDs aus dem Spielstand dienen nur als Schlüssel.
// ────────────────────────────────────────────────────────────────

import '../html/monsterbuch.css';
import { EnemyDef, ENEMY_DEFS, ENEMY_LORE } from '../../data/enemies';
import { ITEM_DEFS } from '../../data/items';
import { MONSTERBUCH_NOTIZEN } from '../../data/monsterbuchNotizen';
import { GameState } from '../../models/GameState';
import { BestiariumSystem } from '../../systems/BestiariumSystem';
import {
  FAEHIGKEIT_ART, PraemienArt, Seite, Stufe, balken, beuteChancen, einsatzRunden, faehigkeitText, fundorte, goldSpanne,
  kampfRunden, mindestens, praemieAbgeholt, praemieAbholen, praemieBetrag, praemieFaellig, seiten, seitenStand, stufe,
  wutVorziehbar,
} from '../../systems/Monsterkunde';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { navigateTo } from '../ScreenRouter';
import { renderHeader, vorratsZeileHtml } from './HeaderRenderer';

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;
/** Die zuletzt gewählte Seite (bleibt beim Neuzeichnen und beim Wiederkommen) */
let gewaehlteSeite: string | null = null;
const bestiarium = new BestiariumSystem();

export function initBestiariumScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const ROLE_LABELS: Record<EnemyDef['role'], string> = {
  melee: '⚔️ Nahkampf',
  ranged: '🏹 Fernkampf',
  support: '✨ Unterstützung',
  boss: '💀 Boss',
};

const STUFE_NAMEN: Record<Stufe, string> = {
  unbekannt: 'Unbekannt',
  gesichtet: 'Gesichtet',
  bekannt: 'Bekannt',
  erforscht: 'Erforscht',
  gemeistert: 'Gemeistert',
};

function zahl(n: number): string {
  return n.toLocaleString('de');
}

function prozent(anteil: number): string {
  return `${(Math.round(anteil * 1000) / 10).toLocaleString('de')} %`;
}

function bildHtml(enemy: EnemyDef): string {
  return `<img src="assets/sprites/final/${enemy.spriteKey}.png" alt="" onerror="this.style.display='none'">`;
}

function balkenHtml(state: GameState, id: string): string {
  const { besiegt, ziel } = balken(state, id);
  return `<span class="mb-balken"><span class="mb-balken-spur"><span class="mb-balken-fuell" style="width:${Math.round(100 * besiegt / ziel)}%"></span></span>${besiegt}/${ziel}</span>`;
}

function aktuelleSeite(): Seite {
  const alle = seiten();
  return alle.find(s => s.routeId === gewaehlteSeite) ?? alle[0];
}

// ─── Karten und Seite ───────────────────────────────────────────

function karteHtml(state: GameState, enemy: EnemyDef): string {
  const st = stufe(state, enemy.id);
  if (st === 'unbekannt') {
    return `
      <button type="button" class="mb-karte mb-unbekannt" disabled>
        <span class="mb-bild">${bildHtml(enemy)}</span>
        <span class="mb-name">???</span>
        <span class="mb-stufe">Noch nicht gesichtet</span>
      </button>`;
  }
  const gemeistert = st === 'gemeistert';
  return `
    <button type="button" class="mb-karte${gemeistert ? ' mb-gemeistert-karte' : ''}" data-enemy-id="${enemy.id}">
      <span class="mb-bild">${bildHtml(enemy)}${gemeistert ? '<span class="mb-stern">⭐</span>' : ''}</span>
      <span class="mb-name">${enemy.name}</span>
      <span class="mb-rolle">${ROLE_LABELS[enemy.role] ?? ''}</span>
      <span class="mb-stufe">${STUFE_NAMEN[st]}</span>
      ${balkenHtml(state, enemy.id)}
    </button>`;
}

function praemieHtml(state: GameState, seite: Seite, art: PraemienArt): string {
  const gold = zahl(praemieBetrag(seite.routeId, art));
  const name = art === 'erforscht' ? 'Erforscht' : 'Gemeistert';
  if (praemieAbgeholt(state, seite.routeId, art)) {
    return `<span class="mb-praemie-info mb-ok">✓ Prämie «${name}» abgeholt (+${gold} Gold)</span>`;
  }
  if (praemieFaellig(state, seite.routeId, art)) {
    return `<button type="button" class="mb-praemie" data-praemie="${art}">Prämie abholen: +${gold} Gold</button>`;
  }
  const bedingung = art === 'erforscht' ? 'Alle erforscht' : 'Alle gemeistert';
  return `<span class="mb-praemie-info">${bedingung}: +${gold} Gold</span>`;
}

/** Ottokars Randnotiz, sichtbar ab «Erforscht» (alle Gegner der Seite) */
function notizHtml(seite: Seite, erforscht: boolean): string {
  if (!erforscht) {
    return '<div class="mb-notiz mb-zu">Ottokars Randnotiz steht hier, sobald alle Gegner dieser Seite erforscht sind.</div>';
  }
  const notiz = MONSTERBUCH_NOTIZEN.find(n => n.routeId === seite.routeId);
  if (!notiz) return '<div class="mb-notiz mb-zu">Ottokar hat hier noch nichts notiert.</div>';
  return `<div class="mb-notiz">${notiz.text}<span class="mb-sig">Ottokar, Stadtschreiber</span></div>`;
}

function seiteHtml(state: GameState, seite: Seite): string {
  const stand = seitenStand(state, seite);
  const gemeistert = stand.gemeistert === stand.gesamt;
  const karten = seite.gegner.map(id => ENEMY_DEFS[id]).filter(e => e !== undefined).map(e => karteHtml(state, e)).join('');
  return `
    <section class="mb-seite" aria-labelledby="mb-seitentitel">
      <div class="mb-seitenkopf">
        <h2 id="mb-seitentitel" tabindex="-1">${seite.name}</h2>
        <span class="mb-erforscht">${stand.erforscht} von ${stand.gesamt} erforscht</span>
        ${gemeistert ? '<span class="mb-gemeistert">⭐ Gemeistert</span>' : ''}
      </div>
      <div class="mb-praemien">
        ${praemieHtml(state, seite, 'erforscht')}
        ${praemieHtml(state, seite, 'gemeistert')}
      </div>
      ${notizHtml(seite, stand.erforscht === stand.gesamt)}
      <div class="mb-karten">${karten}</div>
    </section>`;
}

/** Stand einer Seite für Knopf und Liste: «5/7», gemeistert mit Stern */
function standText(state: GameState, seite: Seite): string {
  const stand = seitenStand(state, seite);
  return `${stand.erforscht}/${stand.gesamt}${stand.gemeistert === stand.gesamt ? ' ⭐' : ''}`;
}

/**
 * Die Seitenwahl, zweimal: am PC eine Knopfleiste, am Handy (schmal oder quer) eine Auswahlliste
 * mit Pfeilen zum Blättern, damit die Seite gleich darunter im Bild steht. monsterbuch.css zeigt
 * je nach Grösse eine davon. Die gewählte Seite ist gedrückt bzw. ausgewählt (verglichen wird die
 * Route, denn seiten() baut bei jedem Aufruf neue Objekte).
 */
export function seitenwahlHtml(state: GameState, aktuell: Seite): string {
  const alle = seiten();
  const index = alle.findIndex(s => s.routeId === aktuell.routeId);
  const staende = alle.map(s => standText(state, s));
  const knoepfe = alle.map((s, i) =>
    `<button type="button" class="mb-seitenknopf" data-seite="${s.routeId}" aria-pressed="${i === index}">${s.name}<small>${staende[i]}</small></button>`).join('');
  const optionen = alle.map((s, i) =>
    `<option value="${s.routeId}"${i === index ? ' selected' : ''}>${s.name} · ${staende[i]}</option>`).join('');
  return `
    <nav class="mb-seiten" aria-label="Seiten des Monsterbuchs">${knoepfe}</nav>
    <div class="mb-seitenwahl">
      <button type="button" class="mb-blaettern" data-blaettern="-1" aria-label="Vorige Seite"${index <= 0 ? ' disabled' : ''}>‹</button>
      <select class="mb-seitenliste" aria-label="Seite des Monsterbuchs">${optionen}</select>
      <button type="button" class="mb-blaettern" data-blaettern="1" aria-label="Nächste Seite"${index >= alle.length - 1 ? ' disabled' : ''}>›</button>
    </div>`;
}

function inhaltHtml(state: GameState): string {
  const fortschritt = bestiarium.getProgress(state);
  const aktuell = aktuelleSeite();
  return `
    <div class="mb-kopf">Gesichtet <b>${fortschritt.discovered}/${fortschritt.total}</b> · Besiegt <b>${fortschritt.defeated}/${fortschritt.total}</b></div>
    ${seitenwahlHtml(state, aktuell)}
    <div class="mb-blatt">${seiteHtml(state, aktuell)}</div>`;
}

// ─── Detailfenster ──────────────────────────────────────────────

/** «Einsatz in Runde 1, 5, 9 …» bzw. «Einsatz in Runde 3 und 14» (ohne ausgesetzten Zug, bis zur letzten Kampfrunde) */
function rundenText(runden: number[]): string {
  if (runden.length === 0) return '';
  if (runden.length > 3) return `Einsatz in Runde ${runden.slice(0, 3).join(', ')} …`;
  if (runden.length === 1) return `Einsatz in Runde ${runden[0]}.`;
  return `Einsatz in Runde ${runden.slice(0, -1).join(', ')} und ${runden[runden.length - 1]}.`;
}

/** Fähigkeiten nach der Kampfregel (Monsterkunde.faehigkeitText), nicht nach den Texten in enemies.ts */
function faehigkeitenHtml(enemy: EnemyDef): string {
  if (enemy.skills.length === 0) return '';
  const runden = einsatzRunden(enemy.skills, kampfRunden(enemy.id));
  const zeilen = enemy.skills.map((sk, i) => {
    const abklingzeit = sk.cooldown === 1 ? '1 Runde' : `${sk.cooldown} Runden`;
    // Die Art nur, wenn sie nicht schon der Name ist (die «Heilung» des Waldschamanen)
    const art = FAEHIGKEIT_ART[sk.effectType];
    return `
      <div class="md-skill">
        <span class="md-skill-name">${sk.name}</span>
        <span class="md-skill-cd">${art && art !== sk.name ? `${art} · ` : ''}Abklingzeit ${abklingzeit}</span>
        <div class="md-skill-desc">${faehigkeitText(enemy.id, sk)} ${rundenText(runden[i])}</div>
      </div>`;
  }).join('');
  return `<div class="md-section"><div class="lbl">FÄHIGKEITEN</div>${zeilen}</div>`;
}

/** Wut-Runde aus enemies.ts, dazu, wo Wahlen unterwegs sie vorziehen (die Sonnenuhr im Morgentor) */
function wutHtml(enemy: EnemyDef): string {
  if (!enemy.enrage) return '';
  const vorziehbar = wutVorziehbar(enemy.id).map(v =>
    `<p class="mb-klein">Im Dungeon «${v.name}» können Wahlen unterwegs die Wut bis auf Runde ${v.abRunde} vorziehen.</p>`).join('');
  return `<div class="md-section"><div class="lbl">WUT</div><p>Wut ab Runde ${enemy.enrage.afterRound}: Angriff ×${zahl(enemy.enrage.atkMult)}, Tempo ×${zahl(enemy.enrage.spdMult)}</p>${vorziehbar}</div>`;
}

function beuteHtml(state: GameState, enemy: EnemyDef): string {
  const { min, max } = goldSpanne(enemy.id);
  const gold = min === max ? zahl(min) : `${zahl(min)}–${zahl(max)}`;
  let fund = '<div class="mb-klein">Die Beutetabelle steht hier, sobald der Gegner erforscht ist.</div>';
  if (mindestens(state, enemy.id, 'erforscht')) {
    const zeilen = beuteChancen(enemy.id).map(c => {
      const menge = c.minQty === c.maxQty ? zahl(c.minQty) : `${zahl(c.minQty)}–${zahl(c.maxQty)}`;
      return `<tr><td>${ITEM_DEFS[c.itemId]?.name ?? 'Unbekannter Fund'}</td><td class="mb-zahl">${prozent(c.chance)}</td><td class="mb-zahl">${menge}</td></tr>`;
    }).join('');
    fund = `<table class="mb-tabelle"><thead><tr><th>Gegenstand</th><th class="mb-zahl">Chance</th><th class="mb-zahl">Menge</th></tr></thead><tbody>${zeilen}</tbody></table>`;
  }
  return `
    <div class="md-section"><div class="lbl">BEUTE</div>
      <div>💰 ${gold} Gold je Sieg</div>
      <div class="mb-klein">Klebrige Finger bringt mehr.</div>
      <div style="margin-top:6px">🎁 Ein Fund je Sieg</div>
      ${fund}
      <div style="margin-top:6px">⭐ ${zahl(enemy.xpReward)} XP, geteilt unter den Helden, die den Kampf überleben</div>
    </div>`;
}

/** Der Inhalt des Detailfensters (das ✕ steht als erstes darin und bleibt beim Scrollen oben, monsterbuch.css) */
export function detailHtml(state: GameState, enemy: EnemyDef): string {
  const st = stufe(state, enemy.id);
  const orte = fundorte(enemy.id).map(s => s.name).join(', ');
  // Die Rolle «💀 Boss» sagt es schon; nur ein Boss mit anderer Rolle bekommt den Zusatz
  const boss = enemy.isBoss && enemy.role !== 'boss' ? ` · ${ROLE_LABELS.boss}` : '';
  const kopf = `
    <div class="bst-header">
      <img src="assets/sprites/final/${enemy.spriteKey}.png" class="bst-sprite" alt="" onerror="this.style.display='none'">
      <div class="bst-header-info">
        <div class="mt" id="mb-detail-titel">${enemy.name}${st === 'gemeistert' ? ' ⭐' : ''}</div>
        <div class="ms">${ROLE_LABELS[enemy.role] ?? ''}${boss}</div>
        <div class="mb-stufe">${STUFE_NAMEN[st]}</div>
        ${balkenHtml(state, enemy.id)}
      </div>
    </div>`;
  const ortHtml = `<div class="md-section"><div class="lbl">FUNDORTE</div><p>${orte}</p></div>`;

  let wissen = '<p class="mb-klein">Besiege einen, um mehr über ihn zu erfahren.</p>';
  if (mindestens(state, enemy.id, 'bekannt')) {
    const lore = ENEMY_LORE[enemy.id]?.lore ?? enemy.lore;
    wissen = `
      ${lore ? `<div class="md-section"><div class="lbl">HINTERGRUND</div><p>${lore}</p></div>` : ''}
      <div class="md-section">
        <div class="lbl">WERTE</div>
        <div class="md-stats">
          <span class="bst-stat">❤️ <b>${zahl(enemy.hp)}</b> Leben</span>
          <span class="bst-stat">⚔️ <b>${zahl(enemy.atk)}</b> Angriff</span>
          <span class="bst-stat">🛡️ <b>${zahl(enemy.def)}</b> Abwehr</span>
          <span class="bst-stat">⚡ <b>${zahl(enemy.spd)}</b> Tempo</span>
          <span class="bst-stat">🎯 <b>${Math.round(enemy.critChance * 100)} %</b> Kritisch</span>
        </div>
      </div>
      ${faehigkeitenHtml(enemy)}
      ${wutHtml(enemy)}
      ${beuteHtml(state, enemy)}`;
  }

  return `
    <div class="modal bst-detail mb-detail" role="dialog" aria-modal="true" aria-labelledby="mb-detail-titel" tabindex="-1">
      <button type="button" class="mcl" aria-label="Schliessen">✕</button>
      ${kopf}
      <div class="md">${ortHtml}${wissen}</div>
    </div>`;
}

function oeffneDetail(el: HTMLElement, state: GameState, enemy: EnemyDef): void {
  el.querySelector('#bestiarium-detail-ov')?.remove();
  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.id = 'bestiarium-detail-ov';
  ov.innerHTML = detailHtml(state, enemy);
  el.appendChild(ov);
  const fenster = ov.querySelector('.modal') as HTMLElement;

  const schliessen = () => {
    tastenLoesen();
    ov.remove();
    // Fokus zurück auf die Karte (die ID stammt aus ENEMY_DEFS, nicht aus dem Spielstand)
    el.querySelector<HTMLElement>(`.mb-karte[data-enemy-id="${enemy.id}"]`)?.focus();
  };
  // Escape schliesst nur dieses Fenster; K, A, G und Escape des Spiels wirken nicht, solange es offen ist
  const tastenLoesen = bindeFensterTasten(ov, fenster, schliessen);

  // Der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann (siehe hintergrundKlick)
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov && hintergrund(e)) {
      schliessen();
      schluckeZweitenKlick();
    }
  });
  const zu = ov.querySelector('.mcl') as HTMLButtonElement;
  zu.addEventListener('click', e => {
    // Der zweite Klick eines Doppelklicks auf die Karte darunter schliesst nicht (wie SpielstandFenster)
    if (e.detail > 1) return;
    schliessen();
    schluckeZweitenKlick();
  });
  zu.focus();
}

// ─── Main Render ────────────────────────────────────────────────

export function renderBestiariumScreen(container: HTMLElement): void {
  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-bestiarium');
  if (prev) prev.remove();

  const state = gameState;
  const el = document.createElement('div');
  el.id = 's-bestiarium';
  el.className = 'screen';
  el.innerHTML = `
      ${state ? renderHeader(state, 'main', 'MONSTERBUCH') : ''}
      <div class="scontent mb"><div class="mb-inhalt"></div></div>`;
  container.appendChild(el);

  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }
  if (!state) return;

  const inhalt = el.querySelector('.mb-inhalt') as HTMLElement;
  inhalt.innerHTML = inhaltHtml(state);
  const blatt = inhalt.querySelector('.mb-blatt') as HTMLElement;
  const liste = inhalt.querySelector('.mb-seitenliste') as HTMLSelectElement;
  const [zurueck, weiter] = Array.from(inhalt.querySelectorAll<HTMLButtonElement>('.mb-blaettern'));

  /**
   * Zeigt eine andere Seite. Neu gezeichnet wird nur das Blatt darunter: Knöpfe, Liste und Pfeile
   * bleiben stehen und behalten den Fokus (auch eine offene Auswahl am Handy wird nicht ersetzt).
   */
  const zeigeSeite = (routeId: string | undefined) => {
    const alle = seiten();
    const index = alle.findIndex(s => s.routeId === routeId);
    if (index < 0 || alle[index].routeId === aktuelleSeite().routeId) return;
    gewaehlteSeite = alle[index].routeId;
    inhalt.querySelectorAll<HTMLElement>('.mb-seitenknopf').forEach(knopf => {
      knopf.setAttribute('aria-pressed', String(knopf.dataset.seite === gewaehlteSeite));
    });
    liste.value = gewaehlteSeite;
    // Wird der Pfeil mit dem Fokus am Buchende gesperrt, geht der Fokus auf die Liste
    const fokusPfeil = [zurueck, weiter].find(pfeil => pfeil === document.activeElement);
    zurueck.disabled = index === 0;
    weiter.disabled = index === alle.length - 1;
    if (fokusPfeil?.disabled) liste.focus();
    blatt.innerHTML = seiteHtml(state, alle[index]);
  };

  liste.addEventListener('change', () => zeigeSeite(liste.value));

  // Ein Doppelklick markiert kein Wort: Sein zweiter Druck träfe sonst den eben gezeichneten Text
  // (das Fenster über der Karte, die Zeile «Prämie abgeholt»). Markieren durch Ziehen geht weiter.
  el.addEventListener('mousedown', e => {
    if (e.detail > 1 && !(e.target instanceof HTMLSelectElement)) e.preventDefault();
  });

  inhalt.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;

    const seitenKnopf = ziel.closest<HTMLElement>('.mb-seitenknopf');
    if (seitenKnopf) {
      zeigeSeite(seitenKnopf.dataset.seite);
      return;
    }

    const pfeil = ziel.closest<HTMLButtonElement>('.mb-blaettern');
    if (pfeil) {
      const alle = seiten();
      const index = alle.findIndex(s => s.routeId === aktuelleSeite().routeId);
      zeigeSeite(alle[index + Number(pfeil.dataset.blaettern)]?.routeId);
      return;
    }

    const praemie = ziel.closest<HTMLButtonElement>('.mb-praemie');
    if (praemie) {
      if (praemie.disabled) return;
      praemie.disabled = true; // der zweite Klick eines Doppelklicks trifft einen gesperrten Knopf
      const art: PraemienArt = praemie.dataset.praemie === 'gemeistert' ? 'gemeistert' : 'erforscht';
      // praemieAbholen prüft selbst, ob die Prämie schon abgeholt ist
      const gold = praemieAbholen(state, aktuelleSeite().routeId, art);
      schluckeZweitenKlick();
      if (gold > 0) window.dispatchEvent(new Event('mc:speichern'));
      el.querySelectorAll<HTMLElement>('.res').forEach(bar => { bar.innerHTML = vorratsZeileHtml(state); });
      blatt.innerHTML = seiteHtml(state, aktuelleSeite());
      (blatt.querySelector<HTMLElement>('.mb-praemie') ?? blatt.querySelector<HTMLElement>('#mb-seitentitel'))?.focus();
      return;
    }

    const karte = ziel.closest<HTMLElement>('.mb-karte');
    const enemy = karte?.dataset.enemyId ? ENEMY_DEFS[karte.dataset.enemyId] : undefined;
    if (enemy && stufe(state, enemy.id) !== 'unbekannt') oeffneDetail(el, state, enemy);
  });
}
