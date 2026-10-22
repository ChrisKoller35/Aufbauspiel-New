// ─── Magic City – Der Weg zur Magischen Stadt (Anzeige) ─────────
// Banner im Hauptmenü (Stadtstufe, Fortschritt, wachsende Stadt) und
// das Fenster mit Weg, Aufgaben, Stadtchronik und dem Arkanen Herz.
// Ein kurzer Hinweis unten links meldet, wenn ein Aufstieg bereit ist.
// Logik: systems/Stadtweg.ts. Daten: data/stadtstufen.ts.
// ────────────────────────────────────────────────────────────────

import '../html/stadtweg.css';
import { GameState } from '../../models/GameState';
import { STADTSTUFEN, HOECHSTE_STADTSTUFE, StadtStufeDef, stufeDef, stadtStufeVon } from '../../data/stadtstufen';
import {
  stadtweg, aufstiegStand, steigeAuf, belohnungsZeilen, abgabeZeilen, neuesKapitel, kapitelGelesen,
  herzOffen, herzsteinZeilen, setzeHerzsteinEin, AufstiegStand,
} from '../../systems/Stadtweg';
import { kostenText } from '../../systems/GebaeudeStatus';
import { stadtSilhouette } from './StadtSilhouette';
import { SaveSystem } from '../../systems/SaveSystem';
import { navigateTo } from '../ScreenRouter';
import { erfolgePruefen } from '../../systems/AchievementSystem';
import { fensterTaste, hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';
import { gipfelDungeons, isRouteAvailable, isRouteCompleted, getRouteLockReasons } from '../../data/routes';

let spielstand: GameState | null = null;
let takt: number | null = null;
let gemeldetFuer = 0;
let bildNummer = 0;

function escape(text: string): string {
  return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function neueBildId(): string {
  bildNummer += 1;
  return `sw${bildNummer}`;
}

function speichern(state: GameState): void {
  new SaveSystem().save(state);
}

// ── Banner im Hauptmenü ─────────────────────────────────────────

function bannerSignatur(state: GameState): string {
  const stand = aufstiegStand(state);
  const sw = stadtweg(state);
  return [sw.stufe, sw.herzsteine.length, stand?.erledigt, stand?.gesamt, stand?.bereit, neuesKapitel(state),
    stand ? 0 : gipfelBesiegt(state)].join('|');
}

/** Endgame: wie viele Dungeons über dem Vulkankern die Gilde schon besiegt hat. */
function gipfelBesiegt(state: GameState): number {
  return gipfelDungeons().filter(r => isRouteCompleted(r.id, state)).length;
}

function bannerInhalt(state: GameState): string {
  const stufe = stadtStufeVon(state);
  const def = stufeDef(stufe);
  const stand = aufstiegStand(state);
  let ziel: string;
  if (!stand) {
    const gesamt = gipfelDungeons().length;
    const besiegt = gipfelBesiegt(state);
    ziel = `<span class="sw-klein">Endgame: Immer weiter nach oben</span>`
      + `<span class="sw-banner-stand">${besiegt < gesamt ? `Ganz oben: ${besiegt} von ${gesamt} Dungeons besiegt` : 'Ganz oben ist alles besiegt'}</span>`;
  } else {
    const prozent = Math.round((stand.erledigt / Math.max(1, stand.gesamt)) * 100);
    ziel = `<span class="sw-klein">Nächste Stufe: ${escape(stand.ziel.name)}</span>`
      + `<span class="sw-balken"><i style="width:${prozent}%"></i></span>`
      + `<span class="sw-banner-stand">${stand.bereit ? 'Aufstieg bereit!' : `${stand.erledigt} von ${stand.gesamt} erledigt`}</span>`;
  }
  const badge = neuesKapitel(state) ? '<span class="sw-badge">📜 Neues Kapitel</span>' : '';
  return `<span class="sw-banner-bild">${stadtSilhouette(stufe, stadtweg(state).herzsteine.length, { idPraefix: neueBildId(), klein: true })}</span>
    <span class="sw-banner-text">
      <span class="sw-klein">Stadtstufe ${stufe} von ${HOECHSTE_STADTSTUFE}</span>
      <span class="sw-banner-name">${escape(def.name)}</span>
      <span class="sw-banner-zeile">${escape(def.zeile)}</span>
    </span>
    <span class="sw-banner-ziel">${badge}${ziel}</span>`;
}

/** Leerer Platzhalter für das Banner; `bindeStadtBanner` füllt ihn. */
export function stadtBannerHtml(): string {
  return '<button type="button" class="sw-banner" aria-label="Der Weg zur Magischen Stadt öffnen"></button>';
}

function zeichneBanner(banner: HTMLElement, state: GameState): void {
  const signatur = bannerSignatur(state);
  if (banner.dataset.sig === signatur) return;
  banner.dataset.sig = signatur;
  banner.innerHTML = bannerInhalt(state);
  const stand = aufstiegStand(state);
  banner.classList.toggle('bereit', !!stand?.bereit);
}

/** Banner im Hauptmenü füllen, Klick öffnet das Fenster, und den Takt für Banner und Hinweis starten. */
export function bindeStadtBanner(root: HTMLElement, state: GameState): void {
  if (spielstand !== state) gemeldetFuer = 0; // anderer Spielstand: Hinweise neu zählen
  spielstand = state;
  const banner = root.querySelector<HTMLElement>('.sw-banner');
  if (banner) {
    zeichneBanner(banner, state);
    banner.addEventListener('click', () => oeffneStadtweg(state));
  }
  if (takt === null) {
    takt = window.setInterval(tick, 1000);
    window.addEventListener('mc:navigate', () => {
      schliesseStadtweg();
      aktualisiereBanner();
    });
  }
}

/** Sichtbare Banner sofort auf den neuen Stand bringen. */
function aktualisiereBanner(): void {
  const state = spielstand;
  if (!state) return;
  document.querySelectorAll<HTMLElement>('.sw-banner').forEach(banner => {
    if (banner.offsetParent) zeichneBanner(banner, state);
  });
}

function tick(): void {
  const state = spielstand;
  if (!state) return;
  aktualisiereBanner();
  aktualisiereFenster(state);
  meldeAufstieg(state);
}

// ── Hinweis «Aufstieg bereit» ───────────────────────────────────

function meldeAufstieg(state: GameState): void {
  const stand = aufstiegStand(state);
  if (!stand?.bereit || gemeldetFuer >= stand.ziel.stufe || state.activeExpedition) return;
  if (document.querySelector('.sw-ov')) return;
  gemeldetFuer = stand.ziel.stufe;
  // Im Hauptmenü zeigt das Banner den Aufstieg schon
  if (document.querySelector<HTMLElement>('.sw-banner')?.offsetParent) return;
  document.querySelector('.sw-toast')?.remove();
  const toast = document.createElement('button');
  toast.type = 'button';
  toast.className = 'sw-toast';
  toast.innerHTML = `<b>Aufstieg bereit!</b> Aus ${escape(ausDem(stufeDef(stand.ziel.stufe - 1)))} wird ${escape(wirdEin(stand.ziel))}. <u>Ansehen</u>`;
  toast.addEventListener('click', () => {
    toast.remove();
    oeffneStadtweg(state);
  });
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 9000);
}

// ── Fenster ─────────────────────────────────────────────────────

/** «dem Weiler», «der Stadt» (nach «aus»). */
function ausDem(def: StadtStufeDef): string {
  return `${def.geschlecht === 'f' ? 'der' : 'dem'} ${def.name}`;
}

/** «ein Dorf», «eine Stadt», am Ende «die Magische Stadt». */
function wirdEin(def: StadtStufeDef): string {
  if (def.stufe === HOECHSTE_STADTSTUFE) return `die ${def.name}`;
  return `${def.geschlecht === 'f' ? 'eine' : 'ein'} ${def.name}`;
}

function wegHtml(stufe: number): string {
  return STADTSTUFEN.map(s => {
    const klasse = s.stufe < stufe ? 'fertig' : s.stufe === stufe ? 'jetzt' : s.stufe === stufe + 1 ? 'ziel' : 'spaeter';
    const zeichen = s.stufe < stufe ? '✓' : s.stufe === HOECHSTE_STADTSTUFE ? '✦' : String(s.stufe);
    return `<li class="sw-knoten ${klasse}"><span class="sw-punkt">${zeichen}</span><span class="sw-knoten-name">${escape(s.name)}</span></li>`;
  }).join('');
}

function aufgabenHtml(state: GameState, stand: AufstiegStand): string {
  const zeilen = stand.aufgaben.map(a => {
    const zahl = a.soll !== undefined && a.soll > 1
      ? `<span class="sw-zahl">${a.ist}/${a.soll}</span><span class="sw-mini"><i style="width:${Math.round(((a.ist ?? 0) / a.soll) * 100)}%"></i></span>`
      : '';
    const hinweis = a.hinweis && !a.erledigt ? `<span class="sw-hinw">${escape(a.hinweis)}</span>` : '';
    return `<li class="${a.erledigt ? 'ok' : ''}"><span class="sw-haken">${a.erledigt ? '✓' : '○'}</span><span class="sw-aufgabe">${escape(a.text)}${hinweis}</span>${zahl}</li>`;
  }).join('');
  const abgabe = abgabeZeilen(state, stand.ziel.abgabe);
  const abgabeZeile = abgabe.length
    ? `<li class="${stand.abgabeBezahlbar ? 'ok' : ''}"><span class="sw-haken">${stand.abgabeBezahlbar ? '✓' : '○'}</span>`
      + `<span class="sw-aufgabe">Abgabe beim Aufstieg<span class="sw-hinw">${abgabe.map(x => `<span class="${x.genug ? 'genug' : 'fehlt'}">${escape(x.text)}</span>`).join(' · ')}</span></span></li>`
    : '';
  return `<ul class="sw-aufgaben">${zeilen}${abgabeZeile}</ul>`;
}

function zielHtml(state: GameState): string {
  const stand = aufstiegStand(state);
  if (!stand) {
    const gipfel = gipfelDungeons().map(r => {
      const besiegt = isRouteCompleted(r.id, state);
      const hinweis = besiegt ? 'Besiegt' : isRouteAvailable(r, state) ? 'Offen: Die Gilde kann aufbrechen' : getRouteLockReasons(r, state).join(' · ');
      return `<li class="${besiegt ? 'ok' : ''}"><span class="sw-haken">${besiegt ? '✓' : '○'}</span>`
        + `<span class="sw-aufgabe">${escape(r.name)}<span class="sw-hinw">${escape(hinweis)}</span></span></li>`;
    }).join('');
    return `<h3 class="sw-h">Die Magische Stadt</h3>
      <p class="sw-text">Das Herz ist erwacht, die Stadt hat ihr Ziel erreicht. Jetzt geht es auf der Dungeon-Karte
      immer weiter nach oben: Über dem Vulkankern warten neue Dungeons, und die Karte wächst mit der Zeit.</p>
      <ul class="sw-aufgaben">${gipfel}</ul>
      <button type="button" class="sw-btn sw-zur-karte">Zur Dungeon-Karte</button>`;
  }
  const belohnung = belohnungsZeilen(stand.ziel).map(z => `<li>${escape(z)}</li>`).join('');
  return `<h3 class="sw-h">Nächste Stufe: ${escape(stand.ziel.name)}</h3>
    ${aufgabenHtml(state, stand)}
    <div class="sw-belohnung"><span class="sw-klein">Belohnung</span><ul>${belohnung}</ul></div>
    <button type="button" class="sw-btn sw-auf" ${stand.bereit ? '' : 'disabled'}>${stand.bereit ? `Aufsteigen: ${escape(stand.ziel.name)}` : 'Noch nicht bereit'}</button>`;
}

function chronikHtml(state: GameState): string {
  const stufe = stadtStufeVon(state);
  const kapitel = STADTSTUFEN.map(s => {
    if (s.stufe > stufe) {
      return `<li class="sw-kap zu"><span class="sw-klein">Kapitel ${s.stufe}</span> <span class="sw-kap-titel">???</span></li>`;
    }
    const offen = s.stufe === stufe ? ' open' : '';
    return `<li class="sw-kap"><details${offen}><summary><span class="sw-klein">Kapitel ${s.stufe}</span> <span class="sw-kap-titel">${escape(s.kapitelTitel)}</span></summary>
      <p class="sw-kap-text">${escape(s.kapitel)}</p><p class="sw-sig">Ottokar, Stadtschreiber</p></details></li>`;
  }).join('');
  return `<h3 class="sw-h">Stadtchronik</h3><ol class="sw-kapitel">${kapitel}</ol>`;
}

function herzHtml(state: GameState): string {
  if (!herzOffen(state)) return '';
  const zeilen = herzsteinZeilen(state);
  const drin = zeilen.filter(z => z.eingesetzt).length;
  const steine = zeilen.map(z => {
    if (z.eingesetzt) {
      return `<li class="sw-stein ok"><span class="sw-stein-name">💎 ${escape(z.def.name)}</span><span class="sw-hinw">«${escape(z.def.text)}»</span></li>`;
    }
    const boss = `<span class="${z.bossBesiegt ? 'genug' : 'fehlt'}">${z.bossBesiegt ? '✓ ' : ''}Boss: ${escape(z.bossName)} (${escape(z.ort)})</span>`;
    const knopf = `<button type="button" class="sw-btn sw-klein-btn" data-herz="${z.def.id}" ${z.bossBesiegt && z.bezahlbar ? '' : 'disabled'}>Einsetzen</button>`;
    return `<li class="sw-stein"><span class="sw-stein-name">${escape(z.def.name)}</span>`
      + `<span class="sw-hinw">${boss} · <span class="${z.bezahlbar ? 'genug' : 'fehlt'}">${escape(kostenText(z.def.kosten))}</span></span>${knopf}</li>`;
  }).join('');
  return `<h3 class="sw-h">Das Arkane Herz <span class="sw-klein">${drin} von ${zeilen.length} Herzsteinen</span></h3><ul class="sw-steine">${steine}</ul>`;
}

function kopfHtml(state: GameState): string {
  const stufe = stadtStufeVon(state);
  const def = stufeDef(stufe);
  return `<div class="sw-bild">${stadtSilhouette(stufe, stadtweg(state).herzsteine.length, { idPraefix: neueBildId() })}
      <div class="sw-bild-titel"><span class="sw-klein">Stadtstufe ${stufe} von ${HOECHSTE_STADTSTUFE}</span>
      <span class="sw-name" id="sw-titel">${escape(def.name)}</span><span class="sw-zeile">${escape(def.zeile)}</span></div></div>
    <ol class="sw-weg">${wegHtml(stufe)}</ol>`;
}

function fensterSignatur(state: GameState): string {
  const stand = aufstiegStand(state);
  const teile = [stadtStufeVon(state), stadtweg(state).herzsteine.join(',')];
  if (stand) {
    teile.push(stand.aufgaben.map(a => `${a.erledigt}${a.ist}${a.hinweis ?? ''}`).join(','));
    teile.push(abgabeZeilen(state, stand.ziel.abgabe).map(x => x.text).join(','));
  }
  if (herzOffen(state)) teile.push(herzsteinZeilen(state).map(z => `${z.bossBesiegt}${z.bezahlbar}`).join(','));
  return teile.join('|');
}

function zeichneFenster(ov: HTMLElement, state: GameState): void {
  const fenster = ov.querySelector<HTMLElement>('.sw-fenster')!;
  ov.dataset.sig = fensterSignatur(state);
  ov.dataset.ansicht = 'weg';
  const scroll = fenster.scrollTop;
  fenster.innerHTML = `<button type="button" class="sw-zu" aria-label="Schliessen">✕</button>
    ${kopfHtml(state)}
    <div class="sw-spalten"><section class="sw-ziel">${zielHtml(state)}</section><section class="sw-chronik">${chronikHtml(state)}</section></div>
    <section class="sw-herz">${herzHtml(state)}</section>`;
  fenster.scrollTop = scroll;
  kapitelGelesen(state, stadtStufeVon(state));
}

function zeichneFest(ov: HTMLElement, state: GameState, neu: StadtStufeDef): void {
  const fenster = ov.querySelector<HTMLElement>('.sw-fenster')!;
  ov.dataset.ansicht = 'fest';
  const vorher = stufeDef(neu.stufe - 1);
  const titel = neu.stufe === HOECHSTE_STADTSTUFE ? 'Willkommen in Magic City!' : `Aus ${ausDem(vorher)} wird ${wirdEin(neu)}!`;
  const belohnung = belohnungsZeilen(neu).map(z => `<li>${escape(z)}</li>`).join('');
  fenster.innerHTML = `<button type="button" class="sw-zu" aria-label="Schliessen">✕</button>
    <div class="sw-fest">
      <div class="sw-bild">${stadtSilhouette(neu.stufe, stadtweg(state).herzsteine.length, { idPraefix: neueBildId(), neu: true })}</div>
      <p class="sw-klein">Stadtstufe ${neu.stufe} von ${HOECHSTE_STADTSTUFE}</p>
      <h2 class="sw-fest-titel" id="sw-titel">${escape(titel)}</h2>
      <div class="sw-brief"><p class="sw-klein">Kapitel ${neu.stufe} · ${escape(neu.kapitelTitel)}</p>
        <p class="sw-kap-text">${escape(neu.kapitel)}</p><p class="sw-sig">Ottokar, Stadtschreiber</p></div>
      <div class="sw-belohnung"><span class="sw-klein">Belohnung</span><ul>${belohnung}</ul></div>
      <button type="button" class="sw-btn sw-weiter">Weiter</button>
    </div>`;
  fenster.scrollTop = 0;
  kapitelGelesen(state, neu.stufe);
  fenster.querySelector<HTMLElement>('.sw-weiter')?.focus();
}

function aktualisiereFenster(state: GameState): void {
  const ov = document.querySelector<HTMLElement>('.sw-ov');
  if (!ov || ov.dataset.ansicht !== 'weg') return;
  if (ov.dataset.sig !== fensterSignatur(state)) zeichneFenster(ov, state);
}

export function schliesseStadtweg(): void {
  const ov = document.querySelector<HTMLElement>('.sw-ov');
  if (!ov) return;
  ov.remove();
  window.removeEventListener('keydown', tasteImFenster, true);
  aktualisiereBanner();
  const banner = document.querySelector<HTMLElement>('.sw-banner');
  if (banner?.offsetParent) banner.focus();
}

/** Tasten, solange das Fenster offen ist (siehe fensterTaste): K, A und G gehen nicht ans Spiel dahinter. */
function tasteImFenster(e: KeyboardEvent): void {
  fensterTaste(e, document.querySelector<HTMLElement>('.sw-fenster'), schliesseStadtweg);
}

/** Schliesst nach einem Klick, ohne dass der zweite Klick eines Doppelklicks dahinter etwas öffnet. */
function schliesseMitKlick(): void {
  schliesseStadtweg();
  schluckeZweitenKlick();
}

/** Öffnet das Fenster «Der Weg zur Magischen Stadt». */
export function oeffneStadtweg(state: GameState): void {
  spielstand = state;
  schliesseStadtweg();
  document.querySelector('.sw-toast')?.remove();
  const ov = document.createElement('div');
  ov.className = 'sw-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-labelledby', 'sw-titel');
  ov.innerHTML = '<div class="sw-fenster" tabindex="-1"></div>';
  document.body.appendChild(ov);
  zeichneFenster(ov, state);
  window.addEventListener('keydown', tasteImFenster, true);

  // Der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann (siehe hintergrundKlick)
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    if (ziel === ov) {
      if (hintergrund(e)) schliesseMitKlick();
      return;
    }
    // Der zweite Klick eines Doppelklicks löst nichts ein zweites Mal aus (Aufsteigen, Herzstein)
    if (e.detail > 1) return;
    if (ziel.closest('.sw-zu')) {
      schliesseMitKlick();
      return;
    }
    if (ziel.closest('.sw-auf')) {
      const neu = steigeAuf(state);
      if (neu) {
        zeichneFest(ov, state, neu);
        erfolgePruefen(state); // Stadtstufe gleich zählen, nicht erst beim Tageswechsel
        speichern(state);
      }
      return;
    }
    if (ziel.closest('.sw-weiter')) {
      zeichneFenster(ov, state);
      return;
    }
    if (ziel.closest('.sw-zur-karte')) {
      schliesseMitKlick();
      navigateTo('dungeon');
      return;
    }
    const herz = ziel.closest<HTMLElement>('[data-herz]');
    if (herz && setzeHerzsteinEin(state, herz.dataset.herz!)) {
      speichern(state);
      zeichneFenster(ov, state);
    }
  });
  ov.querySelector<HTMLElement>('.sw-zu')?.focus();
}
