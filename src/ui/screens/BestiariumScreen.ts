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
  FAEHIGKEIT_ART, PraemienArt, Seite, Stufe, balken, beuteChancen, fundorte, goldSpanne, mindestens,
  praemieAbgeholt, praemieAbholen, praemieBetrag, praemieFaellig, seiten, seitenStand, stufe,
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

function inhaltHtml(state: GameState): string {
  const fortschritt = bestiarium.getProgress(state);
  const aktuell = aktuelleSeite();
  const knoepfe = seiten().map(s => {
    const stand = seitenStand(state, s);
    const stern = stand.gemeistert === stand.gesamt ? ' ⭐' : '';
    return `<button type="button" class="mb-seitenknopf" data-seite="${s.routeId}" aria-pressed="${s === aktuell}">${s.name}<small>${stand.erforscht}/${stand.gesamt}${stern}</small></button>`;
  }).join('');
  return `
    <div class="mb-kopf">Gesichtet <b>${fortschritt.discovered}/${fortschritt.total}</b> · Besiegt <b>${fortschritt.defeated}/${fortschritt.total}</b></div>
    <nav class="mb-seiten" aria-label="Seiten des Monsterbuchs">${knoepfe}</nav>
    ${seiteHtml(state, aktuell)}`;
}

// ─── Detailfenster ──────────────────────────────────────────────

function faehigkeitenHtml(enemy: EnemyDef): string {
  if (enemy.skills.length === 0) return '';
  const beschreibungen = ENEMY_LORE[enemy.id]?.skillDescriptions ?? {};
  const zeilen = enemy.skills.map(sk => {
    const desc = sk.description ?? beschreibungen[sk.id] ?? '';
    const runden = sk.cooldown === 1 ? '1 Runde' : `${sk.cooldown} Runden`;
    return `
      <div class="md-skill">
        <span class="md-skill-name">${sk.name}</span>
        <span class="md-skill-cd">${FAEHIGKEIT_ART[sk.effectType] ?? ''} · Abklingzeit ${runden}</span>
        ${desc ? `<div class="md-skill-desc">${desc}</div>` : ''}
      </div>`;
  }).join('');
  return `<div class="md-section"><div class="lbl">FÄHIGKEITEN</div>${zeilen}</div>`;
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

function detailHtml(state: GameState, enemy: EnemyDef): string {
  const st = stufe(state, enemy.id);
  const orte = fundorte(enemy.id).map(s => s.name).join(', ');
  const kopf = `
    <div class="bst-header">
      <img src="assets/sprites/final/${enemy.spriteKey}.png" class="bst-sprite" alt="" onerror="this.style.display='none'">
      <div class="bst-header-info">
        <div class="mt" id="mb-detail-titel">${enemy.name}${st === 'gemeistert' ? ' ⭐' : ''}</div>
        <div class="ms">${ROLE_LABELS[enemy.role] ?? ''}${enemy.isBoss ? ' · <span style="color:#d4a017">BOSS</span>' : ''}</div>
        <div class="mb-stufe">${STUFE_NAMEN[st]}</div>
        ${balkenHtml(state, enemy.id)}
      </div>
    </div>`;
  const ortHtml = `<div class="md-section"><div class="lbl">FUNDORTE</div><p>${orte}</p></div>`;

  let wissen = '<p class="mb-klein">Besiege einen, um mehr über ihn zu erfahren.</p>';
  if (mindestens(state, enemy.id, 'bekannt')) {
    const lore = ENEMY_LORE[enemy.id]?.lore ?? enemy.lore;
    const wut = enemy.enrage
      ? `<div class="md-section"><div class="lbl">WUT</div><p>Wut ab Runde ${enemy.enrage.afterRound}: Angriff ×${zahl(enemy.enrage.atkMult)}, Tempo ×${zahl(enemy.enrage.spdMult)}</p></div>`
      : '';
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
      ${wut}
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
  zu.addEventListener('click', () => {
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
  const zeichne = () => {
    inhalt.innerHTML = inhaltHtml(state);
  };
  zeichne();

  inhalt.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;

    const seitenKnopf = ziel.closest<HTMLElement>('.mb-seitenknopf');
    if (seitenKnopf) {
      const seite = seiten().find(s => s.routeId === seitenKnopf.dataset.seite);
      if (!seite) return;
      gewaehlteSeite = seite.routeId;
      zeichne();
      inhalt.querySelector<HTMLElement>('.mb-seitenknopf[aria-pressed="true"]')?.focus();
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
      zeichne();
      (inhalt.querySelector<HTMLElement>('.mb-praemie') ?? inhalt.querySelector<HTMLElement>('#mb-seitentitel'))?.focus();
      return;
    }

    const karte = ziel.closest<HTMLElement>('.mb-karte');
    const enemy = karte?.dataset.enemyId ? ENEMY_DEFS[karte.dataset.enemyId] : undefined;
    if (enemy && stufe(state, enemy.id) !== 'unbekannt') oeffneDetail(el, state, enemy);
  });
}
