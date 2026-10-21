// ─── Magic City – Gildenhaus ────────────────────────────────────
// Zwei Reiter: das Auftragsbrett (drei Zettel am Tag, die Kette «Der Saal der
// Gilde», Siegel einlösen) und der Trophäensaal (Sockel je Boss, Pokale, Sets,
// Gildenbuch). Regeln: systems/Auftragsbrett.ts und systems/Trophaeensaal.ts.
// ────────────────────────────────────────────────────────────────

import '../html/gildenhaus.css';
import { getCurrentScreen, getPreviousScreen, navigateTo } from '../ScreenRouter';
import { GameState } from '../../models/GameState';
import { Auftrag, AuftragsBelohnung, AuftragsbrettStand } from '../../models/AuftragsbrettStand';
import { ROUTE_DEFS, getRouteLockReasons } from '../../data/routes';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { setTeilIds } from '../../data/dungeonSets';
import { EINLOESE_ANGEBOTE, MATERIAL_PREIS, SPLITTER_MENGE, SPLITTER_PREIS, TAGESBONUS_SIEGEL } from '../../data/auftragsbrett';
import { renderHeader, zeigeKopfHinweis } from './HeaderRenderer';
import { escapeAttr } from '../components/SchmiedeAnzeige';
import {
  belohnungText, brettGesehen, brettStand, einloesbareMaterialien, einloesbareSets, istSpielbar, kannLiefern, kapitelBelohnungVon, kapitelText,
  laufendesKapitel, liefern, materialEinloesen, saalEinleitung, saalKapitel, SAAL_SCHLUSS, setTeilEinloesen, setTeilKosten, splitterEinloesen,
  tagVon, tauschen, tauschUebrig, zettelText, zielText,
} from '../../systems/Auftragsbrett';
import { bossTrophaeen, gildenbuch, pokale, saalGlanz, setSammlung } from '../../systems/Trophaeensaal';
import { besitz } from '../../systems/DungeonSets';

type Reiter = 'brett' | 'saal';

let gameState: GameState | null = null;
let reiter: Reiter = 'brett';
let gewaehltesSet: string | null = null;
/** Bis dahin zählt kein Klick auf Tauschen, Abgeben oder Einlösen (Doppelklick, siehe unten) */
let ruheBis = 0;

export function initGildenhausScreen(state: GameState): void {
  gameState = state;
}

/** Öffnet das Gildenhaus mit diesem Reiter (Expeditionsliste, Hauptmenü) */
export function zeigeGildenhaus(r: Reiter): void {
  reiter = r;
  navigateTo('gildenhaus');
}

// ── Hilfen ──

const DREHUNG = ['-1.4deg', '0.9deg', '-0.5deg', '1.2deg'];

function restzeit(jetzt: number): string {
  const min = Math.max(1, Math.ceil((tagVon(jetzt).ende - jetzt) / 60000));
  const std = Math.floor(min / 60);
  return std > 0 ? `${std} Std. ${min % 60} Min.` : `${min} Min.`;
}

function siegelHtml(n: number | string): string {
  return `<span class="gh-siegel" aria-hidden="true"></span><b>${n}</b>`;
}

function lohnHtml(b: AuftragsBelohnung): string {
  return `<div class="gh-lohn">${belohnungText(b)}</div>`;
}

function balkenHtml(stand: number, ziel: number): string {
  const prozent = Math.round((100 * stand) / Math.max(1, ziel));
  return `<div class="gh-fortschritt"><div class="gh-balken"><span style="width:${prozent}%"></span></div><span class="gh-zahl">${stand} / ${ziel}</span></div>`;
}

// ── Auftragsbrett ──

function zettelHtml(state: GameState, stand: AuftragsbrettStand, a: Auftrag, i: number): string {
  const t = zettelText(a);
  const route = a.routeId ? ROUTE_DEFS[a.routeId] : undefined;
  const ort = route ? `📍 ${route.name} · Ebene ${route.tier}` : '🏘️ Aus der Stadt';
  const knoepfe: string[] = [];
  if (!a.fertig) {
    if (a.art === 'lieferung') {
      const lager = state.globalStock[a.itemId ?? ''] ?? 0;
      knoepfe.push(kannLiefern(state, a)
        ? `<button class="gh-knopf" data-gh-liefern="${i}">Abgeben</button>`
        : `<button class="gh-knopf" data-nav="buildings">Zur Werkstatt</button>`);
      knoepfe.push(`<span class="gh-lager">${lager} im Lager</span>`);
    } else if (route) {
      knoepfe.push(`<button class="gh-knopf" data-gh-hin="${a.routeId}">Zum Dungeon</button>`);
    }
    if (tauschUebrig(stand) > 0) knoepfe.push(`<button class="gh-knopf gh-knopf-leise" data-gh-tausch="${i}" title="Einmal am Tag: ein anderer Zettel an diese Stelle">Tauschen</button>`);
  }
  return `
    <article class="gh-zettel${a.fertig ? ' gh-fertig' : ''}" style="--dreh:${DREHUNG[i % DREHUNG.length]}">
      <span class="gh-nadel" aria-hidden="true"></span>
      <div class="gh-von">${t.zeichen} ${t.von}</div>
      <h3 class="gh-titel">${t.titel}</h3>
      <div class="gh-ort">${ort}</div>
      <p class="gh-text">${t.text}</p>
      <div class="gh-ziel">${t.ziel}</div>
      ${balkenHtml(a.stand, a.ziel)}
      ${lohnHtml(a.belohnung)}
      ${knoepfe.length ? `<div class="gh-knoepfe">${knoepfe.join('')}</div>` : ''}
      ${a.fertig ? '<div class="gh-stempel">Erledigt</div>' : ''}
    </article>`;
}

function ketteHtml(state: GameState, stand: AuftragsbrettStand): string {
  const alle = saalKapitel();
  const kapitel = laufendesKapitel(stand);
  if (!kapitel) {
    return `
      <article class="gh-kette gh-kette-voll">
        <div class="gh-kette-kopf">Kette · Der Saal der Gilde · alle ${alle.length} Sockel voll</div>
        <p class="gh-text">${SAAL_SCHLUSS}</p>
      </article>`;
  }
  const nr = stand.kette.fertig.length + 1;
  const route = ROUTE_DEFS[kapitel.routeId];
  const offen = istSpielbar(state, kapitel.routeId);
  const weg = offen
    ? `<button class="gh-knopf" data-gh-hin="${kapitel.routeId}">Zum Dungeon</button>`
    : `<span class="gh-gesperrt">🔒 ${getRouteLockReasons(route, state).join(' · ') || 'Noch nicht erreichbar'}</span>`;
  const einleitung = stand.kette.fertig.length === 0 ? `<p class="gh-text gh-einleitung">${saalEinleitung()}</p>` : '';
  return `
    <article class="gh-kette">
      <span class="gh-wachs" aria-hidden="true"></span>
      <div class="gh-kette-kopf">Kette · Der Saal der Gilde · Kapitel ${nr} von ${alle.length}</div>
      ${einleitung}
      <h3 class="gh-titel">${kapitel.prunkstueck}</h3>
      <div class="gh-ort">📍 ${route.name} · Ebene ${route.tier}</div>
      <p class="gh-schild">«${kapitel.schild}»</p>
      <p class="gh-text">${kapitelText(state, kapitel)}</p>
      <div class="gh-ziel">${zielText(kapitel.art, kapitel.routeId, kapitel.ziel)}</div>
      ${balkenHtml(stand.kette.stand, kapitel.ziel)}
      ${lohnHtml(kapitelBelohnungVon(stand, kapitel))}
      <div class="gh-lohn gh-lohn-prunk">🏺 Prunkstück für den Trophäensaal</div>
      <div class="gh-knoepfe">${weg}</div>
    </article>`;
}

function einloesenHtml(state: GameState, stand: AuftragsbrettStand): string {
  const sets = einloesbareSets(state);
  const set = sets.find(s => s.id === gewaehltesSet) ?? sets[sets.length - 1];
  const angebot = (art: string) => EINLOESE_ANGEBOTE.find(a => a.art === art)!;
  const teile = set ? setTeilIds(set).map(id => {
    const preis = setTeilKosten(id);
    const hat = besitz(state, id);
    return `
      <button class="gh-ware" data-gh-teil="${id}" ${stand.siegel < preis ? 'disabled' : ''} title="${escapeAttr(ITEM_DEFS[id]?.name ?? id)}">
        <img src="assets/sprites/final/${getItemSpriteKey(id)}.png" alt="" onerror="this.style.visibility='hidden'">
        <span class="gh-ware-name">${ITEM_DEFS[id]?.name ?? id}</span>
        <span class="gh-ware-info">${hat > 0 ? `schon ${hat}× da` : 'fehlt noch'}</span>
        <span class="gh-preis">${siegelHtml(preis)}</span>
      </button>`;
  }).join('') : '';
  const setTeil = sets.length === 0
    ? '<p class="gh-leer">Sobald die Gilde einen Dungeon mit Set bezwungen hat, gibt es hier seine Teile.</p>'
    : `<label class="gh-wahl">Set: <select data-gh-set>${sets.map(s => `<option value="${s.id}"${s === set ? ' selected' : ''}>${s.zeichen} ${s.name}</option>`).join('')}</select></label>
       <div class="gh-waren">${teile}</div>`;
  const materialien = einloesbareMaterialien(state);
  const material = materialien.length === 0
    ? '<p class="gh-leer">Material gibt es aus Gebieten, in denen die Gilde einen Dungeon bezwungen hat.</p>'
    : `<div class="gh-waren">${materialien.map(m => `
        <button class="gh-ware" data-gh-material="${m.material.id}" ${stand.siegel < MATERIAL_PREIS ? 'disabled' : ''}>
          <img src="assets/sprites/final/${m.material.bild}.png" alt="" onerror="this.style.visibility='hidden'">
          <span class="gh-ware-name">${m.material.name} ×${m.menge}</span>
          <span class="gh-ware-info">${state.globalStock[m.material.id] ?? 0} im Lager</span>
          <span class="gh-preis">${siegelHtml(MATERIAL_PREIS)}</span>
        </button>`).join('')}</div>`;
  return `
    <section class="gh-einloesen">
      <h2 class="gh-h2">Siegel einlösen <span class="gh-h2-info">${siegelHtml(stand.siegel)} Gildensiegel</span></h2>
      <div class="gh-angebot">
        <h3>${angebot('setteil').titel}</h3><p class="gh-angebot-text">${angebot('setteil').text}</p>
        ${setTeil}
      </div>
      <div class="gh-angebot">
        <h3>${angebot('material').titel}</h3><p class="gh-angebot-text">${angebot('material').text}</p>
        ${material}
      </div>
      <div class="gh-angebot">
        <h3>${angebot('splitter').titel}</h3><p class="gh-angebot-text">${angebot('splitter').text}</p>
        <div class="gh-waren">
          <button class="gh-ware" data-gh-splitter ${stand.siegel < SPLITTER_PREIS ? 'disabled' : ''}>
            <img src="assets/sprites/final/${getItemSpriteKey('crystal_shard')}.png" alt="" onerror="this.style.visibility='hidden'">
            <span class="gh-ware-name">${ITEM_DEFS.crystal_shard?.name ?? 'Kristallsplitter'} ×${SPLITTER_MENGE}</span>
            <span class="gh-ware-info">${state.globalStock.crystal_shard ?? 0} im Lager</span>
            <span class="gh-preis">${siegelHtml(SPLITTER_PREIS)}</span>
          </button>
        </div>
      </div>
    </section>`;
}

function brettHtml(state: GameState, jetzt: number): string {
  const stand = brettStand(state, jetzt);
  const erledigt = stand.auftraege.filter(a => a.fertig).length;
  const bonus = stand.tagesbonus
    ? `Tagesbonus erhalten (+${TAGESBONUS_SIEGEL} Siegel)`
    : `Tagesbonus +${TAGESBONUS_SIEGEL} Siegel, wenn alle ${stand.auftraege.length} Zettel erledigt sind (${erledigt} von ${stand.auftraege.length})`;
  return `
    <div class="gh-kopf">
      <div class="gh-siegel-stand">${siegelHtml(stand.siegel)} Gildensiegel</div>
      <div class="gh-kopf-info">
        <span>Neue Zettel in ${restzeit(jetzt)}</span>
        <span>${bonus}</span>
        <span>Tauschen: ${tauschUebrig(stand) > 0 ? '1 Zettel heute frei' : 'heute schon getauscht'}</span>
      </div>
    </div>
    <p class="gh-ottokar">Am Brett im Gildenhaus hängen die Leute ihre Sorgen auf, jeden Morgen drei neue. Ich schreibe sie leserlich ab,
      denn die Handschrift dieser Stadt ist schlimmer als ihre Sorgen. Was erledigt ist, bringt Gildensiegel, und die löst ihr unten ein.</p>
    <div class="gh-brett" data-gh-tag="${stand.tag.id}">${stand.auftraege.map((a, i) => zettelHtml(state, stand, a, i)).join('')}</div>
    ${ketteHtml(state, stand)}
    ${einloesenHtml(state, stand)}`;
}

// ── Trophäensaal ──

function saalHtml(state: GameState, jetzt: number): string {
  const trophaeen = bossTrophaeen(state, jetzt);
  const glanz = saalGlanz(trophaeen);
  const p = pokale(state, jetzt);
  const sockel = trophaeen.map(t => {
    const sterne = [t.bezwungen, t.setKomplett, t.prunk];
    const stufe = sterne.filter(Boolean).length;
    const sternTitel = ['Boss bezwungen', 'Set komplett', 'Prunkstück aus der Kette'];
    return `
      <figure class="gh-sockel gh-stufe-${stufe}${t.bezwungen ? '' : ' gh-unbekannt'}">
        <div class="gh-trophaee">
          <img src="assets/sprites/final/${t.spriteKey}.png" alt="" onerror="this.style.visibility='hidden'">
        </div>
        <figcaption>
          <span class="gh-sockel-name">${t.bezwungen ? t.boss : '???'}</span>
          <span class="gh-sockel-ort">${t.dungeon} · Ebene ${t.ebene}</span>
          <span class="gh-sterne">${sterne.map((s, i) => `<span class="${s ? 'an' : ''}" title="${sternTitel[i]}">★</span>`).join('')}</span>
          <span class="gh-sockel-info">${t.siege > 0 ? `${t.siege} ${t.siege === 1 ? 'Sieg' : 'Siege'}` : 'noch nicht bezwungen'}${t.set ? ` · Set ${t.setTeile}/3` : ''}</span>
          <span class="gh-sockel-schild">«${t.schild}»</span>
          ${t.prunk ? `<span class="gh-prunk">🏺 ${t.prunkstueck}</span>` : ''}
        </figcaption>
      </figure>`;
  }).join('');
  const sets = setSammlung(state).map(s => `
    <div class="gh-set${s.teile === 3 ? ' gh-set-komplett' : ''}">
      <span class="gh-set-zeichen">${s.set.zeichen}</span>
      <span class="gh-set-name">${s.set.name}<small>${s.dungeon}</small></span>
      <span class="gh-set-stand">${s.teile}/3${s.stufen > 0 ? ` · +${s.stufen}` : ''}</span>
    </div>`).join('');
  const buch = gildenbuch(state, jetzt).map(z => `<div class="gh-buch-zeile"><span>${z.was}</span><b>${z.wert.toLocaleString('de')}</b></div>`).join('');
  return `
    <div class="gh-glanz">
      <div class="gh-glanz-zahl">★ ${glanz.sterne} <small>von ${glanz.max}</small></div>
      <div class="gh-glanz-text">
        <b>Glanz des Saals</b>
        <span>Jede Trophäe hat drei Sterne: Boss bezwungen, Set des Dungeons komplett, Prunkstück aus der Kette am Auftragsbrett.</span>
        <div class="gh-balken"><span style="width:${Math.round((100 * glanz.sterne) / Math.max(1, glanz.max))}%"></span></div>
      </div>
    </div>
    <div class="gh-saal">${sockel}</div>
    <section class="gh-block">
      <h2 class="gh-h2">Pokale der Rangliste</h2>
      <div class="gh-pokale">
        <span class="gh-pokal" title="Gold">🥇 ${p.gold}</span>
        <span class="gh-pokal" title="Silber">🥈 ${p.silber}</span>
        <span class="gh-pokal" title="Bronze">🥉 ${p.bronze}</span>
        <span class="gh-pokal-info">Gipfel: Platz ${p.platz} von ${p.gilden}${p.besteWoche ? ` · beste Woche: Platz ${p.besteWoche}` : ''}</span>
      </div>
    </section>
    <section class="gh-block">
      <h2 class="gh-h2">Sets der Dungeons <span class="gh-h2-info">${setSammlung(state).filter(s => s.teile === 3).length} von ${setSammlung(state).length} komplett</span></h2>
      <div class="gh-sets">${sets}</div>
    </section>
    <section class="gh-block">
      <h2 class="gh-h2">Gildenbuch</h2>
      <div class="gh-buch">${buch}</div>
    </section>`;
}

// ── Bildschirm ──

function inhaltHtml(state: GameState): string {
  const jetzt = Date.now();
  if (reiter === 'saal') return saalHtml(state, jetzt);
  // Gesehen ist das Brett erst, wenn es auf dem Bildschirm steht (gezeichnet wird es schon beim Laden)
  if (getCurrentScreen() === 'gildenhaus') brettGesehen(state, jetzt);
  return brettHtml(state, jetzt);
}

function reiterHtml(): string {
  const knopf = (r: Reiter, text: string) => `<button class="gh-reiter-knopf${reiter === r ? ' aktiv' : ''}" data-gh-reiter="${r}">${text}</button>`;
  return `<div class="gh-reiter">${knopf('brett', '📜 Auftragsbrett')}${knopf('saal', '🏆 Trophäensaal')}</div>`;
}

function zeichne(el: HTMLElement, state: GameState): void {
  const inhalt = el.querySelector('.gh-inhalt');
  const leiste = el.querySelector('.gh-reiter');
  if (leiste) leiste.outerHTML = reiterHtml();
  if (inhalt) inhalt.innerHTML = inhaltHtml(state);
}

function speichern(): void {
  window.dispatchEvent(new Event('mc:speichern'));
}

export function renderGildenhausScreen(container: HTMLElement): void {
  const state = gameState;
  const el = document.createElement('div');
  el.id = 's-gildenhaus';
  el.className = 'screen';
  if (!state) {
    container.appendChild(el);
    return;
  }
  // «Zurück» führt dorthin, woher die Gilde kam: Hauptmenü, Routenübersicht oder (Taste G) ein anderer Bildschirm
  const vorher = getPreviousScreen();
  const zurueck = vorher && vorher !== 'gildenhaus' && vorher !== 'combat' ? vorher : 'main';
  el.innerHTML = `
    ${renderHeader(state, zurueck, 'GILDENHAUS')}
    ${reiterHtml()}
    <div class="gh-inhalt">${inhaltHtml(state)}</div>`;

  el.addEventListener('click', (e: MouseEvent) => {
    const ziel = e.target as HTMLElement;
    const nav = ziel.closest<HTMLElement>('[data-nav]');
    if (nav) {
      navigateTo(nav.dataset.nav as Parameters<typeof navigateTo>[0]);
      return;
    }
    const r = ziel.closest<HTMLElement>('[data-gh-reiter]');
    if (r) {
      reiter = r.dataset.ghReiter as Reiter;
      zeichne(el, state);
      return;
    }
    const hin = ziel.closest<HTMLElement>('[data-gh-hin]');
    if (hin?.dataset.ghHin) {
      window.dispatchEvent(new CustomEvent('mc:selectRoute', { detail: { routeId: hin.dataset.ghHin } }));
      navigateTo('team');
      return;
    }
    const handlung = ziel.closest<HTMLElement>('[data-gh-tausch], [data-gh-liefern], [data-gh-teil], [data-gh-material], [data-gh-splitter]');
    if (!handlung) return;
    // Ein Doppelklick löst nur einmal aus: Nach dem ersten Klick ist alles neu gezeichnet, und der
    // zweite träfe sonst den Knopf, der jetzt an derselben Stelle steht (ein zweites Set-Teil)
    const jetzt = Date.now();
    if (e.detail > 1 || jetzt < ruheBis) return;
    ruheBis = jetzt + 350;
    // Ist seit dem Zeichnen Mitternacht vorbei, hängen andere Zettel: erst zeigen, dann klicken lassen
    const tagDesBretts = handlung.closest<HTMLElement>('[data-gh-tag]')?.dataset.ghTag;
    if (tagDesBretts && tagDesBretts !== brettStand(state, jetzt).tag.id) {
      zeigeKopfHinweis('📜 Mitternacht: Neue Zettel hängen am Brett');
      zeichne(el, state);
      return;
    }
    const d = handlung.dataset;
    if (d.ghTausch !== undefined) {
      if (tauschen(state, Number(d.ghTausch), jetzt)) {
        zeigeKopfHinweis('📜 Ein neuer Zettel hängt am Brett');
        speichern();
      }
    } else if (d.ghLiefern !== undefined) {
      const ergebnis = liefern(state, Number(d.ghLiefern), jetzt);
      if (ergebnis) {
        const bonus = ergebnis.tagesbonus > 0 ? ` · Tagesbonus +${ergebnis.tagesbonus} Siegel` : '';
        zeigeKopfHinweis(`📜 ${ergebnis.meldung.titel} erledigt: ${belohnungText(ergebnis.meldung.belohnung!)}${bonus}`);
        speichern();
      }
    } else if (d.ghTeil) {
      if (setTeilEinloesen(state, d.ghTeil, jetzt)) {
        zeigeKopfHinweis(`✦ ${ITEM_DEFS[d.ghTeil]?.name ?? d.ghTeil} liegt im Lager`);
        speichern();
      }
    } else if (d.ghMaterial) {
      const menge = materialEinloesen(state, d.ghMaterial, jetzt);
      if (menge) {
        zeigeKopfHinweis(`⚒️ +${menge} ${ITEM_DEFS[d.ghMaterial]?.name ?? d.ghMaterial}`);
        speichern();
      }
    } else if (d.ghSplitter !== undefined) {
      if (splitterEinloesen(state, jetzt)) {
        zeigeKopfHinweis(`💎 +${SPLITTER_MENGE} Kristallsplitter`);
        speichern();
      }
    }
    zeichne(el, state);
  });

  el.addEventListener('change', (e: Event) => {
    const wahl = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-gh-set]');
    if (!wahl) return;
    gewaehltesSet = wahl.value;
    zeichne(el, state);
  });

  container.appendChild(el);
}
