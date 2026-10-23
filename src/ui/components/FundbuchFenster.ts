// ─── Magic City – Fenster «📜 Fundbuch» ──────────────────────────
// Links (am Handy oben) Suchfeld und Liste aller Einträge, gruppiert;
// rechts (am Handy darunter) «Woher» und «Wofür» des gewählten
// Gegenstands oder die Beute eines Dungeons. Ein Klick auf einen Dungeon
// oder einen Gegenstand springt zum passenden Eintrag im Fundbuch. Ändert den
// Spielstand nicht. Die Suche filtert nur, ihr Text kommt nie in HTML.
// Rechnung: systems/Fundbuch.ts. Stile: ui/html/fundbuch.css.
// Doku: docs/FUNDBUCH.md
// ────────────────────────────────────────────────────────────────

import '../html/fundbuch.css';
import { GameState } from '../../models/GameState';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { ROUTE_DEFS, getRouteLockReasons, isRouteAvailable } from '../../data/routes';
import { BUILDING_DEFS } from '../../data/buildings';
import { ANTEIL_OHNE_SIEG } from '../../data/schmiede';
import {
  FundbuchGruppe, Fundorte, GRUPPEN_NAMEN, RAST_KRAEUTER, VERSTECK_CHANCE, dungeonBeute, fundbuchEintraege, fundorte,
  gruppeVon, mengeText, prozentText, verwendung, zahlText,
} from '../../systems/Fundbuch';
import { materialJeSieg } from '../../systems/Schmiede';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from './FensterHilfen';

type Fortschritt = Pick<GameState, 'guildStats' | 'scoreboard' | 'bezwungen'>;
/** link: der wievielte Link im Eintrag zum nächsten Ziel führte (bekommt beim Zurückkommen den Fokus) */
type Ziel = { art: 'item' | 'dungeon'; id: string; link?: number };

const EMOJI: Record<FundbuchGruppe, string> = {
  material: '🪨', verbrauch: '🧪', ausruestung: '⚔️', sonstiges: '💎',
};

let loeseTasten: (() => void) | null = null;
/** Was vor dem Öffnen den Fokus hatte («📜 Fundbuch»), bekommt ihn beim Schliessen zurück. */
let vorherFokus: HTMLElement | null = null;

function esc(text: string | number): string {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Bild des Gegenstands, darunter das Emoji, falls die Datei fehlt. */
function bild(itemId: string): string {
  const emoji = ITEM_DEFS[itemId]?.tags.includes('herb') ? '🌿' : EMOJI[gruppeVon(itemId)];
  return `<span class="fb-bild"><img loading="lazy" src="assets/sprites/final/${esc(getItemSpriteKey(itemId))}.png" alt=""
    onerror="this.style.display='none';this.nextElementSibling.hidden=false"><span hidden>${emoji}</span></span>`;
}

function itemLink(itemId: string): string {
  const name = esc(ITEM_DEFS[itemId]?.name ?? itemId);
  return ITEM_DEFS[itemId] ? `<button type="button" class="fb-link" data-item="${esc(itemId)}">${name}</button>` : name;
}

function dungeonLink(routeId: string, stand: Fortschritt): string {
  const route = ROUTE_DEFS[routeId];
  if (!route) return esc(routeId);
  const schloss = isRouteAvailable(route, stand) ? '' : '🔒 ';
  return `<button type="button" class="fb-link" data-route="${esc(routeId)}">${schloss}${esc(route.name)}</button>`;
}

/** Gebäude als Text (bis 22.10.2026 ein Link zu ihrem Bauplan; Baupläne gibt es nicht mehr). */
function gebaeudeName(buildingId: string): string {
  const def = BUILDING_DEFS[buildingId];
  return def ? esc(def.name) : '';
}

function abschnitt(titel: string, zeilen: string[], leer: string): string {
  const inhalt = zeilen.length ? `<ul class="fb-zeilen">${zeilen.map(z => `<li>${z}</li>`).join('')}</ul>` : `<p class="fb-leer">${leer}</p>`;
  return `<section class="fb-abschnitt"><h3>${titel}</h3>${inhalt}</section>`;
}

function woherZeilen(f: Fundorte, stand: Fortschritt): string[] {
  const z: string[] = [];
  if (f.haendler) z.push(`Beim Händler der Stadt · ${f.haendler} Gold`);
  if (f.dungeonHaendler) z.push(`Beim Dungeon-Händler · ${f.dungeonHaendler.preis} Gold (höchstens ${f.dungeonHaendler.max} Käufe)`);
  for (const h of f.hergestellt) z.push(`${gebaeudeName(h.buildingId)} · ${esc(h.name)} · ${h.menge} je Durchgang`);
  for (const e of f.ersterSieg) z.push(`${esc(e.bossName)} (Boss) in ${dungeonLink(e.routeId, stand)} · 1 Stück beim ersten Sieg`);
  for (const s of f.jedenSieg) z.push(`Jeder Sieg in ${dungeonLink(s.routeId, stand)} · ${s.menge} Stück`);
  // Zeilenform aus dem Auftrag: «‹Gegner› · 35 % je Sieg über ihn · Ø 1,4 je Sieg in ‹Dungeon›»; die Zeilen
  // eines Dungeons stehen beisammen (Ø gilt für den ganzen Dungeon), dazu Anzahl im Dungeon und Menge.
  // Nach «Ø» ein geschütztes Leerzeichen, damit die Zahl nicht allein auf die nächste Zeile rutscht
  for (const d of f.dungeons) {
    const gegner = d.gegner.map(g => `<li>${esc(g.name)}${g.anzahl > 1 ? ` (${g.anzahl}×)` : ''} · ${prozentText(g.chance)} je Sieg `
      + `über ihn, ${mengeText(g.minQty, g.maxQty)} Stück · Ø\u00a0${zahlText(d.jeSieg)} je Sieg in ${dungeonLink(d.routeId, stand)}</li>`).join('');
    z.push(`<ul class="fb-gegner">${gegner}</ul>`);
  }
  for (const r of f.fundRaeume) {
    const wann = r.art === 'zufall'
      ? `Versteck durchsuchen: ${r.menge} Stück, angeboten in etwa ${prozentText(VERSTECK_CHANCE)} der Besuche`
      : `zur Wahl: ${r.menge} Stück${r.nachSieg ? ', wenn der Boss fällt' : ''}`;
    z.push(`${dungeonLink(r.routeId, stand)} · Fund in Raum ${r.raum} · ${wann}`);
  }
  if (f.rastplaetze.length) {
    const dungeons = new Set(f.rastplaetze.map(r => r.routeId)).size;
    const wo = dungeons === Object.keys(ROUTE_DEFS).length ? 'in jedem Dungeon' : `in ${dungeons} Dungeons`;
    z.push(`Rastplatz ${wo} · Kräuter sammeln: ${RAST_KRAEUTER.menge} Stück, `
      + `angeboten in etwa ${prozentText(RAST_KRAEUTER.chance)} der Besuche`);
  }
  for (const e of f.einschmelzen) z.push(`Einschmelzen: doppeltes Set-Teil aus ${dungeonLink(e.routeId, stand)} · ${e.menge} Stück`);
  return z;
}

/** [0, 0, 3, 6, 12] → «3 / 6 / 12 Stück für +3 bis +5» */
function stufenText(mengen: number[]): string {
  const ab = Math.max(0, mengen.findIndex(n => n > 0));
  return `${mengen.slice(ab).join(' / ')} Stück für +${ab + 1} bis +${mengen.length}`;
}

function wofuerZeilen(itemId: string, stand: Fortschritt): string[] {
  const v = verwendung(itemId);
  const z: string[] = [];
  for (const r of v.rezepte) z.push(`${gebaeudeName(r.buildingId)} · ${esc(r.name)} · ${r.menge} je Durchgang → ${itemLink(r.ergebnis)}`);
  for (const b of v.bau) z.push(`Bau: ${gebaeudeName(b.buildingId)} · ${b.menge}`);
  for (const a of v.ausbau) z.push(`Ausbau: ${gebaeudeName(a.buildingId)} auf Stufe ${a.stufe} · ${a.menge}`);
  for (const a of v.abgaben) z.push(`Abgabe für Stadtstufe ${a.stufe} «${esc(a.name)}» · ${a.menge}`);
  for (const h of v.herzsteine) z.push(`${esc(h.name)} · ${h.menge}`);
  for (const s of v.schmiede) {
    const teile = s.routeId ? `Set-Teile aus ${dungeonLink(s.routeId, stand)}` : 'jedes Set-Teil';
    z.push(`Schmiede: ${teile} verbessern · ${stufenText(s.mengen)}`);
  }
  if (v.proviant) z.push('Proviant für Expeditionen');
  if (ITEM_DEFS[itemId]?.gearSlot) z.push('Ausrüstung für deine Helden');
  if (v.ankauf > 0) z.push(`Der Händler zahlt ${v.ankauf} Gold je Stück`);
  return z;
}

/** Die Regeln hinter den Zahlen, nur für die Quellen, die der Eintrag hat */
function regelText(f: Fundorte): string {
  const saetze: string[] = [];
  if (f.dungeons.length) {
    saetze.push('Jeder besiegte Gegner gibt Gold und einen Wurf aus seiner Beute: meist einen Gegenstand, manchmal '
      + 'stattdessen noch mehr Gold. «Ø\u00a0je Sieg» zählt die Beute aller Gegner des Dungeons zusammen.');
  }
  if (f.jedenSieg.length) {
    saetze.push('Schmiede-Material kommt nach jeder Expedition in die Truhe: nach einem Sieg die volle Menge, '
      + `sonst ${prozentText(ANTEIL_OHNE_SIEG)} davon im Verhältnis der geschafften Räume.`);
  }
  return saetze.length ? `<p class="fb-regel">${saetze.join(' ')}</p>` : '';
}

function itemSeite(itemId: string, stand: Fortschritt): string {
  const def = ITEM_DEFS[itemId];
  const f = fundorte(itemId);
  const text = def.flavorText ? `<p class="fb-text">${esc(def.flavorText)}</p>` : '';
  return `<header class="fb-kopf">${bild(itemId)}<div><h2 class="fb-name" tabindex="-1">${esc(def.name)}</h2>
      <span class="fb-gruppe">${GRUPPEN_NAMEN[gruppeVon(itemId)]}</span></div></header>${text}
    ${abschnitt('Woher', woherZeilen(f, stand), 'Keine Quelle bekannt.')}
    ${abschnitt('Wofür', wofuerZeilen(itemId, stand), 'Keine Werkstatt, kein Bau, keine Stadtstufe und keine Schmiede braucht das.')}
    ${regelText(f)}`;
}

function dungeonSeite(routeId: string, stand: Fortschritt): string {
  const route = ROUTE_DEFS[routeId];
  const gruende = getRouteLockReasons(route, stand);
  const sperre = gruende.length ? `<p class="fb-sperre">🔒 ${esc(gruende.join(' · '))}</p>` : '';
  const material = materialJeSieg(routeId);
  const schmiede = material
    ? abschnitt('Schmiede-Material', [`${itemLink(material.material.id)} · ${material.menge} Stück je Sieg`], '') : '';
  const zeilen = dungeonBeute(routeId).map(b => `${itemLink(b.itemId)} · Ø\u00a0${zahlText(b.jeSieg)} je Sieg`);
  return `<header class="fb-kopf"><span class="fb-bild"><span>🗺️</span></span><div><h2 class="fb-name" tabindex="-1">${esc(route.name)}</h2>
      <span class="fb-gruppe">Dungeon · Ebene ${route.tier}</span></div></header>${sperre}${schmiede}
    ${abschnitt('Beute der Gegner', zeilen, 'Hier lassen die Gegner keine Gegenstände fallen.')}`;
}

function listeHtml(eintraege: string[]): string {
  const gruppen = Object.keys(GRUPPEN_NAMEN) as FundbuchGruppe[];
  return gruppen.map(g => {
    const ids = eintraege.filter(id => gruppeVon(id) === g);
    if (!ids.length) return '';
    const knoepfe = ids.map(id => `<li><button type="button" class="fb-eintrag-knopf" data-item="${esc(id)}"
      data-name="${esc(ITEM_DEFS[id].name.toLocaleLowerCase('de'))}">${bild(id)}<span>${esc(ITEM_DEFS[id].name)}</span></button></li>`).join('');
    return `<section class="fb-gruppe-liste"><h3>${GRUPPEN_NAMEN[g]}</h3><ul>${knoepfe}</ul></section>`;
  }).join('');
}

export function schliesseFundbuch(): void {
  loeseTasten?.();
  loeseTasten = null;
  const ov = document.querySelector('.fb-ov');
  if (!ov) return;
  ov.remove();
  (vorherFokus?.isConnected ? vorherFokus : document.querySelector<HTMLElement>('.fb-oeffnen'))?.focus();
  vorherFokus = null;
}

/** Öffnet das Fundbuch, auf Wunsch gleich beim Gegenstand `itemId`. */
export function oeffneFundbuch(stand: Fortschritt, itemId?: string): void {
  schliesseFundbuch();
  vorherFokus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const eintraege = fundbuchEintraege();
  const ov = document.createElement('div');
  ov.className = 'fb-ov';
  ov.innerHTML = `<div class="fb-fenster" role="dialog" aria-modal="true" aria-labelledby="fb-titel" tabindex="-1">
      <button type="button" class="fb-zu" aria-label="Schliessen">✕</button>
      <h2 id="fb-titel" class="fb-titel">📜 Fundbuch</h2>
      <div class="fb-spalten">
        <nav class="fb-links" aria-label="Einträge">
          <input type="search" class="fb-suche" placeholder="Suchen …" aria-label="Fundbuch durchsuchen" autocomplete="off">
          <p class="fb-keine" hidden>Nichts gefunden.</p>
          <div class="fb-liste">${listeHtml(eintraege)}</div>
        </nav>
        <article class="fb-eintrag" aria-live="polite"></article>
      </div>
    </div>`;
  const fenster = ov.querySelector<HTMLElement>('.fb-fenster')!;
  const eintrag = ov.querySelector<HTMLElement>('.fb-eintrag')!;
  const suche = ov.querySelector<HTMLInputElement>('.fb-suche')!;
  let zurueck: Ziel | null = null;
  let aktuell: Ziel | null = null;

  /** wie: aus der Liste, über einen Link im Eintrag, mit «← zurück» oder beim Öffnen */
  const zeige = (ziel: Ziel, wie: 'liste' | 'link' | 'zurueck' | 'start') => {
    if (ziel.art === 'item' ? !ITEM_DEFS[ziel.id] : !ROUTE_DEFS[ziel.id]) return;
    zurueck = wie === 'link' ? aktuell : null;
    aktuell = ziel;
    const knopf = zurueck ? '<button type="button" class="fb-zurueck">← zurück</button>' : '';
    eintrag.innerHTML = knopf + (ziel.art === 'item' ? itemSeite(ziel.id, stand) : dungeonSeite(ziel.id, stand));
    ov.querySelectorAll<HTMLElement>('.fb-eintrag-knopf').forEach(k => {
      const an = ziel.art === 'item' && k.dataset.item === ziel.id;
      k.classList.toggle('aktiv', an);
      if (an) k.setAttribute('aria-current', 'true'); else k.removeAttribute('aria-current');
    });
    eintrag.scrollTop = 0;
    // Am Handy steht der Eintrag unter der Liste: dorthin springen
    if (wie !== 'start' && window.matchMedia('(max-width: 700px)').matches) eintrag.scrollIntoView({ block: 'start' });
    // Der zweite Klick eines Doppelklicks (auch Doppeltipp) träfe sonst, was jetzt an derselben Stelle liegt,
    // etwa einen anderen Link der neuen Seite, und spränge gleich weiter
    if (wie !== 'start') schluckeZweitenKlick();
    // Der gedrückte Knopf im Eintrag ist eben ersetzt worden, der Fokus bleibt trotzdem im Eintrag (Tastatur):
    // nach einem Sprung auf «← zurück», nach «← zurück» auf dem Link, über den man gegangen war
    if (wie === 'link') eintrag.querySelector<HTMLElement>('.fb-zurueck')?.focus({ preventScroll: true });
    if (wie === 'zurueck') {
      (eintrag.querySelectorAll<HTMLElement>('.fb-link')[ziel.link ?? -1] ?? eintrag.querySelector<HTMLElement>('.fb-name'))?.focus();
    }
  };

  suche.addEventListener('input', () => {
    const wort = suche.value.trim().toLocaleLowerCase('de');
    let treffer = 0;
    ov.querySelectorAll<HTMLElement>('.fb-gruppe-liste').forEach(gruppe => {
      let sichtbar = 0;
      gruppe.querySelectorAll<HTMLButtonElement>('.fb-eintrag-knopf').forEach(k => {
        const passt = !wort || (k.dataset.name ?? '').includes(wort);
        k.parentElement!.hidden = !passt;
        k.disabled = !passt; // Tab (FensterHilfen) springt nur zwischen sichtbaren Knöpfen
        if (passt) sichtbar++;
      });
      gruppe.hidden = sichtbar === 0;
      treffer += sichtbar;
    });
    ov.querySelector<HTMLElement>('.fb-keine')!.hidden = treffer > 0;
  });

  const schliesseMitKlick = () => { schliesseFundbuch(); schluckeZweitenKlick(); };
  const aufHintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e: MouseEvent) => {
    if (aufHintergrund(e)) { schliesseMitKlick(); return; }
    const ziel = e.target as HTMLElement;
    if (ziel.closest('.fb-zu')) { schliesseMitKlick(); return; }
    if (ziel.closest('.fb-zurueck') && zurueck) { zeige(zurueck, 'zurueck'); return; }
    const listenKnopf = ziel.closest<HTMLElement>('.fb-eintrag-knopf');
    if (listenKnopf?.dataset.item) { zeige({ art: 'item', id: listenKnopf.dataset.item }, 'liste'); return; }
    const link = ziel.closest<HTMLElement>('.fb-link');
    if (!link || !aktuell) return;
    aktuell.link = Array.from(eintrag.querySelectorAll('.fb-link')).indexOf(link);
    if (link.dataset.item) zeige({ art: 'item', id: link.dataset.item }, 'link');
    else if (link.dataset.route) zeige({ art: 'dungeon', id: link.dataset.route }, 'link');
  });

  document.body.appendChild(ov);
  // Der zweite Klick eines Doppelklicks auf «📜 Fundbuch» träfe sonst schon das offene Fenster (Listeneintrag)
  schluckeZweitenKlick();
  loeseTasten = bindeFensterTasten(ov, fenster, schliesseFundbuch);
  const start = itemId && eintraege.includes(itemId) ? itemId : ov.querySelector<HTMLElement>('.fb-eintrag-knopf')?.dataset.item;
  if (start) zeige({ art: 'item', id: start }, 'start');
  ov.querySelector('.fb-eintrag-knopf.aktiv')?.scrollIntoView({ block: 'nearest' });
  if (itemId && window.matchMedia('(max-width: 700px)').matches) eintrag.scrollIntoView({ block: 'start' });
  // Am Touch-Gerät nicht gleich die Tastatur aufklappen
  if (itemId || window.matchMedia('(pointer: coarse)').matches) fenster.focus(); else suche.focus();
}
