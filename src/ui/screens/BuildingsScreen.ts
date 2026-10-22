// ─── Magic City – Gebäude-Seite ─────────────────────────────────
// Reiter «Produktion» (Mindmap der Stadt), «Crafting» und «Aufbau»
// (Freischalt-Baum). Jedes Gebäude gibt es genau einmal: Bauen schaltet
// es frei, danach wird es ausgebaut (systems/Ausbau.ts). Hergestellt wird
// in den Gebäuden (ProductionSystem); diese Seite wählt Rezepte, gibt
// Aufträge, baut und baut aus.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BuildingDef } from '../../data/buildings';
import { netzGebaeudeIds } from '../../data/produktionsnetz';
import { RECIPE_DEFS, RecipeDef } from '../../data/recipes';
import { ITEM_DEFS } from '../../data/items';
import { GameState } from '../../models/GameState';
import { BuildingInstance, createBuildingInstance } from '../../models/Building';
import { STARTING_BUILDING_TYPES } from '../../scenes/CityStartingLayout';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { renderAufbauTab, bindAufbauTab } from './AufbauTab';
import { renderProduktionTab, aktualisiereProduktionTab, bindProduktionTab, ProduktionZiel } from './ProduktionTab';
import {
  freischaltHinweise, itemName, stockFor, canAffordRecipe, cycleProgress, produktionsHindernis, WarteGrund,
  dasGebaeude, wachstum, tagFortschritt, wohnKapazitaet, einzelStatus, grundText, gebaeudeName, nachschub, nachschubText,
  lieferantFuer,
} from '../../systems/GebaeudeStatus';
import { engpassFuerInstanz } from '../../systems/EngpassSystem';
import {
  ausbauInfo, ausbauen, ausbauWirkung, maxStufe, stufeVon, arbeitsplaetze, besetzt, zyklusSekunden,
  erstatteLaufendenZyklus, entferneGebaeude, investiert, wirkungsStufe, marktBonusProzent, bankGoldProTag,
} from '../../systems/Ausbau';
import { EconomySystem, STEUER_PRO_BEWOHNER } from '../../systems/EconomySystem';
import { brotProTag, brotBedarfProTag, BEWOHNER_JE_BROT } from '../../systems/PeopleSystem';
import {
  MAX_AUFTRAEGE, auftragsListe, auftragGeben, auftragAbbrechen, hatAuftragsliste, kannAuftragGeben, restzeitSekunden,
  laeuftAuftrag, rezeptFuer,
} from '../../systems/Auftraege';
import { laufendVonSelbst, vonSelbstSatz, fehlendeZutaten, vorratVorAuftraegen } from '../../systems/Werkstattplan';
import { BUENDEL, HANDELSWAREN, VERKAUFSPREIS, kaufpreis } from '../../data/handel';
import { HandelsArt, handelHeute, handelZu, handle, kannHandeln, marktGesperrt, tagesmenge, vorbehalten } from '../../systems/Handel';
import '../html/handel.css';
import { hintergrundKlick, schluckeZweitenKlick } from '../components/FensterHilfen';

/** Map building typeId to card background image. */
const BUILDING_IMAGE_MAP: Record<string, string> = {
  WAREHOUSE: 'bld_warehouse',
  GUILD_HALL: 'bld_guild_hall',
  LUMBER_CAMP: 'bld_lumber_camp',
  FARM_GRAIN: 'bld_farm_grain',
  MILL_WIND: 'bld_mill_wind',
  BAKERY: 'bld_bakery',
  WELL: 'bld_well',
  HOUSE_T1: 'bld_house',
  QUARRY: 'bld_quarry',
  HERB_GARDEN: 'bld_herb_garden',
  SMITHY: 'bld_smithy',
  IRON_MINE: 'bld_iron_mine',
  ARCANE_SMITHY: 'bld_arcane_smithy',
  MARKETPLACE: 'bld_marketplace',
  WAR_MACHINE_WORKSHOP: 'bld_war_workshop',
  BANK: 'bld_bank',
};

function getBuildingImageStyle(typeId: string): string {
  const img = BUILDING_IMAGE_MAP[typeId];
  if (img) return `background-image:url('assets/buildings/${img}.png')`;
  // Fallback: use sprite from final/ folder
  const def = BUILDING_DEFS[typeId];
  if (def?.spriteKey) return `background-image:url('assets/sprites/final/${def.spriteKey}.png')`;
  return '';
}

type BuildingsTab = 'produktion' | 'crafting' | 'aufbau';

let cachedState: GameState | null = null;
let currentTab: BuildingsTab = 'produktion';
/** Laufende Aktualisierung der Mindmap (Balken, Zustände, Linien). */
let liveTimer: number | null = null;
let globalListenersBound = false;
const economy = new EconomySystem();

// ── Public API ──────────────────────────────────────────────────

export function initBuildingsScreen(state: GameState): void {
  cachedState = state;
  bindGlobalListeners();
}

export function renderBuildingsScreen(container: HTMLElement): void {
  const state = cachedState;
  if (!state) return;

  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-buildings');
  if (prev) prev.remove();

  const el = document.createElement('div');
  el.id = 's-buildings';
  el.className = 'screen';

  el.innerHTML = buildHTML(state);
  container.appendChild(el);
  bindEvents(el, state);
}

// ── Re-Render (replaces content, rebinds events) ────────────────

function reRenderBuildingsScreen(root: HTMLElement, state: GameState): void {
  root.innerHTML = buildHTML(state);
  bindEvents(root, state);
}

// ── HTML Builder ────────────────────────────────────────────────

function buildHTML(state: GameState): string {
  const tabCls = (tab: BuildingsTab) => (tab === currentTab ? 'btab active on' : 'btab');
  const panelStyle = (tab: BuildingsTab) => (tab === currentTab ? '' : ' style="display:none"');
  return `
    ${renderHeader(state, 'main', 'GEBÄUDE & CRAFTING')}

    <div class="btabs">
      <button class="${tabCls('produktion')}" data-tab="produktion">PRODUKTION</button>
      <button class="${tabCls('crafting')}" data-tab="crafting">⚗️ CRAFTING</button>
      <button class="${tabCls('aufbau')}" data-tab="aufbau">AUFBAU</button>
    </div>

    <div class="bmain" data-panel="produktion"${panelStyle('produktion')}>
      ${renderProduktionTab(state, getBuildingImageStyle)}
    </div>

    <div class="bmain" data-panel="crafting"${panelStyle('crafting')}>
      ${renderCrafting(state)}
    </div>

    <div class="bmain" data-panel="aufbau"${panelStyle('aufbau')}>
      ${renderAufbauTab(state, getBuildingImageStyle)}
    </div>
  `;
}

// ── Cost Helpers ────────────────────────────────────────────────

/** Cost chips "Holz 12/20" coloured by availability (Kauf- und Ausbau-Fenster). */
function renderCostDetail(cost: Record<string, number>, state: GameState): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return '<span class="cost-ok">Gratis</span>';
  return entries.map(([res, qty]) => {
    const have = Math.floor(state.globalStock[res] ?? 0);
    const cls = have >= qty ? 'cost-ok' : 'cost-miss';
    return `<span class="ingr ${cls}">${itemName(res)} ${have}/${qty}</span>`;
  }).join('');
}

function categoryEmoji(cat: string): string {
  switch (cat) {
    case 'producer': return '🌾';
    case 'refine': return '⚙️';
    case 'utility': return '🛠️';
    case 'storage': return '📦';
    case 'housing': return '🏠';
    case 'hub': return '🏰';
    case 'infrastructure': return '🛣️';
    default: return '🏗️';
  }
}

function stufenText(b: BuildingInstance): string {
  const max = maxStufe(b.typeId);
  return max > 1 ? `Stufe ${stufeVon(b)} von ${max}` : '';
}

// ── Crafting Tab ────────────────────────────────────────────────

/**
 * Werkstätten (arbeiten auf Auftrag) in der Reihenfolge der Mindmap. Rohstoff-Gebäude
 * laufen von selbst, es gibt bei ihnen nichts zu bestellen: Sie stehen nur im Reiter «Produktion».
 */
function craftingBuildingTypes(): string[] {
  const werkstatt = (id: string) => !!BUILDING_DEFS[id]?.manualCraft && BUILDING_DEFS[id].recipes.length > 0;
  const ordered = netzGebaeudeIds().filter(werkstatt);
  const rest = Object.keys(BUILDING_DEFS).filter(id => !ordered.includes(id) && werkstatt(id));
  return [...ordered, ...rest];
}

function renderCrafting(state: GameState): string {
  const ownedGroups: string[] = [];
  const lockedGroups: string[] = [];

  for (const typeId of craftingBuildingTypes()) {
    const html = renderCraftGruppe(state, typeId);
    if (html) (dasGebaeude(state, typeId) ? ownedGroups : lockedGroups).push(html);
  }

  const hint = ownedGroups.length === 0
    ? '<p class="craft-hint">Du besitzt noch keine Werkstatt. Baue eine im Reiter «Produktion».</p>'
    : '<p class="craft-hint">Werkstätten arbeiten auf Auftrag: «+ Auftrag» auf einem Rezept, ein Klick auf die Karte '
      + 'öffnet die Werkstatt. Gelbe Zutaten mit ↻ fehlen noch, kommen aber von selbst; rote kommen nicht von selbst '
      + '(Beute, oder ein Gebäude dafür fehlt). Rohstoffe gewinnt die Stadt weiter von selbst (Reiter «Produktion»).</p>';

  return `${hint}${ownedGroups.join('')}${lockedGroups.join('')}`;
}

/** Eine Gebäude-Gruppe im Reiter «Crafting»: Kopf, was läuft, Rezeptkarten. */
function renderCraftGruppe(state: GameState, typeId: string): string {
  const def = BUILDING_DEFS[typeId];
  const b = dasGebaeude(state, typeId);
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0) return '';

  const cards = recipes.map(rcp => renderCraftCard(rcp, def, b, state)).join('');
  const badge = b
    ? `<span class="craft-group-cnt">${stufenText(b)}${def.manualCraft ? ' · auf Auftrag' : ''}</span>`
    : `<span class="craft-lock">🔒 braucht ${def.name}</span>`;
  return `
      <div class="craft-group${b ? '' : ' locked'}" data-gruppe="${typeId}" data-sig="${craftSignatur(state, typeId)}">
        <div class="craft-group-hd">${categoryEmoji(def.category)} ${def.name} ${badge}</div>
        ${b ? `<div class="craft-lauf" data-lauf="${typeId}">${renderLaufend(state, b)}</div>` : ''}
        <div class="craft-grid">${cards}</div>
      </div>`;
}

/**
 * Wovon Aufbau und Knöpfe einer Gruppe abhängen (ohne Lager und Restzeiten): ändert es sich,
 * wird die Gruppe neu gezeichnet. Steht beim Zeichnen in data-sig (nur Zeichen ohne Maskierung).
 */
function craftSignatur(state: GameState, typeId: string): string {
  const b = dasGebaeude(state, typeId);
  if (!b) return '';
  const selbst = b.vonSelbst ? `${b.vonSelbst.art}:${b.vonSelbst.fuer}` : '';
  return [b.producing, b.activeRecipeId ?? '', (b.auftraege ?? []).join(','), selbst, b.built, b.tier, besetzt(b)].join('|');
}

/** Warum eine freie Werkstatt ohne Auftrag ruht oder wartet, kurz für die Zeile im Reiter «Crafting». */
function ruheText(state: GameState, b: BuildingInstance): string {
  const st = einzelStatus(state, b);
  if (st.laeuft) return `startet gleich: ${st.text ?? st.recipe?.name ?? ''}`;
  const g = st.grund;
  if (!g || (g.art === 'auftrag' && !g.liefert)) return 'Keine Aufträge';
  return `Keine Aufträge · ${g.art === 'auftrag' ? 'liefert bei Bedarf' : grundText(g)}`;
}

/** Was in der Werkstatt gerade läuft und was noch wartet, mit Restzeit (Reiter «Crafting»). */
function renderLaufend(state: GameState, b: BuildingInstance): string {
  const name = (id: string) => RECIPE_DEFS[id]?.name ?? id;
  if (hatAuftragsliste(b)) {
    const teile: string[] = [];
    const selbst = laufendVonSelbst(b);
    if (selbst) teile.push(`<span class="ingr craft-run craft-selbst">● ${selbst} · noch ${sekundenText(b.productionTimer)}</span>`);
    const liste = auftragsListe(b);
    if (liste.length === 0) {
      if (!selbst) teile.push(`<span class="ws-msg">${ruheText(state, b)}</span>`);
      return teile.join('');
    }
    liste.forEach((id, i) => teile.push(i === 0 && laeuftAuftrag(b)
      ? `<span class="ingr craft-run">● ${name(id)} · noch ${sekundenText(b.productionTimer)}</span>`
      : `<span class="ingr">${i + 1}. ${name(id)}</span>`));
    if (!b.producing) {
      const warten = auftragWartetText(state, b, RECIPE_DEFS[liste[0]]);
      if (warten.warn) teile.push(`<span class="ws-msg ws-warn">${warten.text}</span>`);
    }
    return `${teile.join('')}<span class="ccard-time">Aufträge ${restzeitText(b, state)}</span>`;
  }
  const st = einzelStatus(state, b);
  if (b.producing && st.recipe) {
    return `<span class="ingr craft-run">● ${st.recipe.name} · noch ${sekundenText(b.productionTimer)}</span>`;
  }
  return `<span class="ws-msg">${st.recipe ? `${st.recipe.name}: ` : ''}${st.laeuft ? 'startet gleich' : 'wartet'}</span>`;
}

/**
 * Worauf der nächste Auftrag wartet: Hindernis, Brot für die Bewohner (geht vor), Zutat aus der
 * eigenen Vorstufe oder von einer anderen Werkstatt, oder eine Zutat, die nicht von selbst kommt
 * (Beute, ein Gebäude fehlt oder steht, auch Stufen tiefer). `warn` = der Spieler muss etwas tun.
 */
function auftragWartetText(state: GameState, b: BuildingInstance, recipe: RecipeDef | undefined): { text: string; warn: boolean } {
  if (!recipe) return { text: '', warn: false };
  const blocker = productionBlocker(b, BUILDING_DEFS[b.typeId], recipe);
  if (blocker) return { text: blocker, warn: true };
  const fehlend = fehlendeZutaten(state, b, recipe).map(z => ({ ...z, n: nachschub(state, z.item) }));
  if (fehlend.length === 0) {
    const vorrat = vorratVorAuftraegen(state, b);
    if (vorrat) return { text: `zuerst Brot für die Bewohner (noch ${vorrat.zyklen}×)`, warn: false };
    return { text: b.producing ? 'Startet danach' : 'Startet beim nächsten Takt…', warn: false };
  }
  const x = fehlend.find(z => !z.n.kommt) ?? fehlend[0];
  const menge = recipe.inputs[x.item];
  const zahl = `${menge - x.fehlt}/${menge}`;
  const ware = itemName(x.item);
  if (!x.n.kommt) return { text: `fehlt: ${ware} ${zahl} · ${nachschubText(x.item, x.n)}`, warn: true };
  if (rezeptFuer(b, x.item)) return { text: `zuerst ${ware} (${zahl})`, warn: false };
  return { text: `wartet auf ${ware} ${zahl} (${gebaeudeName(lieferantFuer(x.item) ?? x.n.von)})`, warn: false };
}

function renderCraftCard(rcp: RecipeDef, def: BuildingDef, b: BuildingInstance | undefined, state: GameState): string {
  // Determine rarity from output item tags
  const outputKey = Object.keys(rcp.outputs)[0] ?? '';
  const itemDef = ITEM_DEFS[outputKey];
  const rarity = resolveRarity(itemDef);
  const ico = itemDef ? itemIcon(outputKey) : '⚗️';
  const locked = !b;

  const liste = !!b && hatAuftragsliste(b);
  const teile: string[] = [];
  if (!b) {
    teile.push(`<span class="craft-lock">braucht ${def.name}</span>`);
  } else if (b.activeRecipeId === rcp.id && b.producing) {
    // Was es von selbst macht und für wen, steht in der Zeile über den Karten
    teile.push(laufendVonSelbst(b) ? '<span class="craft-run craft-selbst">● von selbst</span>' : '<span class="craft-run">● läuft</span>');
  } else if (!liste && b.activeRecipeId === rcp.id) {
    teile.push('<span class="craft-run">► gewählt</span>');
  }
  const wartend = liste ? b!.auftraege.filter(id => id === rcp.id).length : 0;
  if (wartend > 0) teile.push(`<span class="craft-run">${wartend}× in Auftrag</span>`);
  const sekunden = Math.round(b ? zyklusSekunden(b, rcp) : rcp.cycleTimeSec);
  // Werkstätten: Auftrag direkt hier geben, ein Klick auf die Karte öffnet die Werkstatt
  const knopf = locked ? '<button class="btn-craft">GEBÄUDE BAUEN</button>'
    : liste ? `<button class="btn-craft ccard-add" data-craft-add="${rcp.id}"${kannAuftragGeben(b!, rcp.id) ? '' : ' disabled'}>+ AUFTRAG</button>`
    : '<button class="btn-craft">ZUR WERKSTATT</button>';

  return `
    <div class="ccard${locked ? ' locked' : ''}" data-rcp="${rcp.id}" data-btype="${def.id}">
      <div class="ccard-hd">
        <span class="cico">${ico}</span>
        <span class="cnm">${rcp.name}</span>
        <span class="crar ${rarity}">${rarity}</span>
      </div>
      <div class="cingr">${renderRecipeChips(rcp, state, b ?? null)}</div>
      <div class="ccard-ft"><span class="ccard-st">${teile.join(' · ')}</span><span class="ccard-time">⏱ ${sekunden}s</span></div>
      ${knopf}
    </div>`;
}

/** Output + ingredient chips (Bestand/benötigt). */
function renderRecipeChips(rcp: RecipeDef, state: GameState, b: BuildingInstance | null): string {
  const outHTML = Object.entries(rcp.outputs)
    .map(([key, qty]) => `<span class="ingr ingr-out">→ ${qty}× ${itemName(key)}</span>`)
    .join('');
  const inEntries = Object.entries(rcp.inputs);
  const inHTML = inEntries.length === 0
    ? '<span class="ingr">Keine Zutaten</span>'
    : inEntries.map(([key, qty]) => {
        const have = b ? stockFor(state, b, key) : (state.globalStock[key] ?? 0);
        // Werkstätten: gelb mit ↻, wenn die Zutat von selbst kommt, sonst rot mit dem Grund (GebaeudeStatus.nachschub)
        const n = have < qty && !!b && hatAuftragsliste(b) ? nachschub(state, key) : null;
        const cls = have >= qty ? 'cost-ok' : n?.kommt ? 'cost-auto' : 'cost-miss';
        const titel = n ? ` title="${n.kommt ? 'fehlt noch, ' : 'fehlt: '}${nachschubText(key, n)}"` : '';
        return `<span class="ingr ${cls}"${titel}>${itemName(key)} ${Math.floor(have)}/${qty}${n?.kommt ? ' ↻' : ''}</span>`;
      }).join('');
  const water = rcp.requirements?.waterSupplied ? '<span class="ingr">💧 braucht Brunnen</span>' : '';
  return outHTML + inHTML + water;
}

function resolveRarity(itemDef: { tags: string[] } | undefined): string {
  if (!itemDef) return 'common';
  const tags = itemDef.tags;
  if (tags.includes('legendary')) return 'legendary';
  if (tags.includes('epic')) return 'epic';
  if (tags.includes('rare')) return 'rare';
  if (tags.includes('uncommon')) return 'uncommon';
  return 'common';
}

function itemIcon(key: string): string {
  const map: Record<string, string> = {
    grain: '🌾', wood: '🪵', stone: '🪨',
    bread: '🍞', flour: '🫓', herb_green: '🌿',
    healing_potion: '⚗️', iron_scrap: '⚙️',
    iron_sword: '⚔️', iron_shield: '🛡️',
    leather_armor: '🧥', crystal_shard: '💎',
    power_bread: '🍞', steel_sword: '⚔️',
    longbow: '🏹', crystal_staff: '🪄',
    steel_armor: '🛡️',
  };
  return map[key] ?? '📦';
}

/** Crafting tab click: open the workshop of the building and select the recipe there. */
function openRecipeInWorkshop(root: HTMLElement, typeId: string, rcpId: string, state: GameState): void {
  const b = dasGebaeude(state, typeId);
  if (!b) {
    showBuyConfirmModal(root, typeId, state);
    return;
  }
  // Switching is lossless while idle; a running cycle is only switched after confirmation in the modal.
  // Werkstätten mit Auftragsliste: das Rezept wird nur hervorgehoben, Aufträge gibt man im Fenster.
  if (!b.producing && !hatAuftragsliste(b)) selectRecipe(state, b, rcpId);
  showBuildingModal(root, b, state, rcpId);
}

// ── Events ──────────────────────────────────────────────────────

function panelFor(root: HTMLElement, tab: BuildingsTab): HTMLElement | null {
  return root.querySelector(`.bmain[data-panel="${tab}"]`) as HTMLElement | null;
}

/** Mindmap nachführen (Zustände, Balken, Linien); nur sinnvoll, wenn sie sichtbar ist. */
function aktualisiereMindmap(root: HTMLElement, state: GameState): void {
  if (currentTab !== 'produktion') return;
  const panel = panelFor(root, 'produktion');
  if (panel) aktualisiereProduktionTab(panel, state);
}

/** Zuletzt gesetztes HTML der Stellen, die laufend nachgeführt werden. */
const gezeichnet = new WeakMap<HTMLElement, string>();

function setzeHtml(el: HTMLElement, html: string): void {
  if (gezeichnet.get(el) === html) return;
  el.innerHTML = html;
  gezeichnet.set(el, html);
}

/**
 * Reiter «Crafting» nachführen, ohne die Seite neu zu zeichnen (die Scroll-Stelle bleibt):
 * Ändert sich der Aufbau einer Werkstatt (Auftrag fertig, neuer Zyklus), kommt ihre Gruppe neu.
 * Zutaten und die Zeile mit Restzeiten werden an Ort und Stelle ersetzt, die Knöpfe bleiben
 * stehen. `sofort` zeichnet die Gruppe immer neu.
 */
function aktualisiereCrafting(root: HTMLElement, state: GameState, sofort?: string): void {
  if (currentTab !== 'crafting' && !sofort) return;
  root.querySelectorAll<HTMLElement>('.craft-group[data-gruppe]').forEach(gruppe => {
    const typeId = gruppe.dataset.gruppe!;
    const b = dasGebaeude(state, typeId);
    if (!b) return;
    if (sofort === typeId || gruppe.dataset.sig !== craftSignatur(state, typeId)) {
      const neu = document.createElement('div');
      neu.innerHTML = renderCraftGruppe(state, typeId).trim();
      gruppe.replaceWith(neu.firstElementChild as HTMLElement);
      return;
    }
    const lauf = gruppe.querySelector('.craft-lauf') as HTMLElement | null;
    if (lauf) setzeHtml(lauf, renderLaufend(state, b));
    gruppe.querySelectorAll<HTMLElement>('.ccard[data-rcp]').forEach(karte => {
      const rcp = RECIPE_DEFS[karte.dataset.rcp!];
      const chips = karte.querySelector('.cingr') as HTMLElement | null;
      if (rcp && chips) setzeHtml(chips, renderRecipeChips(rcp, state, b));
    });
  });
}

/** Wann zuletzt gedrückt und losgelassen wurde (Maus oder Finger, bindGlobalListeners). */
const druck = { seit: 0, los: 0 };

/**
 * Wird gerade gedrückt (oder eben losgelassen)? Dann wird nichts neu gezeichnet: Ein Knopf, der
 * zwischen Drücken und Loslassen ersetzt wird, verliert den Klick. Hängt das Loslassen, höchstens 2 s.
 */
function wirdGedrueckt(): boolean {
  const jetzt = Date.now();
  return (druck.seit > druck.los && jetzt - druck.seit < 2000) || jetzt - druck.los < 300;
}

function switchTab(root: HTMLElement, tabId: BuildingsTab): void {
  currentTab = tabId;
  const tabs = root.querySelectorAll('.btab');
  for (let j = 0; j < tabs.length; j++) {
    const active = (tabs[j] as HTMLElement).dataset.tab === tabId;
    tabs[j].classList.toggle('active', active);
    tabs[j].classList.toggle('on', active);
  }
  const panels = root.querySelectorAll('.bmain');
  for (let p = 0; p < panels.length; p++) {
    const panel = panels[p] as HTMLElement;
    panel.style.display = panel.dataset.panel === tabId ? '' : 'none';
  }
  // Die Linien hängen an den Kartenpositionen und können erst sichtbar gezeichnet werden
  if (cachedState) aktualisiereMindmap(root, cachedState);
}

/** Linien neu legen, wenn das Fenster seine Grösse ändert oder die Seite aufgerufen wird. */
function bindGlobalListeners(): void {
  if (globalListenersBound) return;
  globalListenersBound = true;
  window.addEventListener('pointerdown', () => { druck.seit = Date.now(); }, true);
  const los = () => { druck.los = Date.now(); };
  window.addEventListener('pointerup', los, true);
  window.addEventListener('pointercancel', los, true);
  window.addEventListener('blur', los);
  const redraw = () => {
    const root = document.getElementById('s-buildings');
    if (root && cachedState) aktualisiereMindmap(root, cachedState);
  };
  window.addEventListener('resize', redraw);
  window.addEventListener('mc:navigate', (e) => {
    if ((e as CustomEvent).detail?.screen === 'buildings') redraw();
  });
}

/** Balken und Zustände laufend nachführen, ohne die Seite neu zu zeichnen. */
function startLiveTimer(root: HTMLElement, state: GameState): void {
  if (liveTimer !== null) window.clearInterval(liveTimer);
  const timer = window.setInterval(() => {
    if (!root.isConnected) {
      window.clearInterval(timer);
      if (liveTimer === timer) liveTimer = null;
      return;
    }
    if (root.offsetParent === null && root.style.display === 'none') return;
    if (wirdGedrueckt()) return;
    aktualisiereMindmap(root, state);
    aktualisiereCrafting(root, state);
  }, 500);
  liveTimer = timer;
}

/** Gebaut → Fenster des Gebäudes, sonst Bau-Dialog (zeigt auch den Sperrgrund). */
function oeffneGebaeudeOderBau(root: HTMLElement, typeId: string, state: GameState): void {
  const b = dasGebaeude(state, typeId);
  if (b) showBuildingModal(root, b, state);
  else showBuyConfirmModal(root, typeId, state);
}

function bindEvents(root: HTMLElement, state: GameState): void {
  // Tab switching
  const tabs = root.querySelectorAll('.btab');
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', () => {
      switchTab(root, (tabs[i] as HTMLElement).dataset.tab as BuildingsTab);
    });
  }

  // Header back button
  const backBtn = root.querySelector('.hdr-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = (backBtn as HTMLElement).dataset.nav;
      if (target) navigateTo(target as 'main');
    });
  }

  // Produktion: Gebäude → Fenster, Bauplatz → Bau-Dialog, Dungeon-Zutaten und Ziele → andere Seite
  const produktion = panelFor(root, 'produktion');
  if (produktion) {
    bindProduktionTab(produktion, state, {
      oeffneGebaeude: typeId => oeffneGebaeudeOderBau(root, typeId, state),
      kaufen: typeId => showBuyConfirmModal(root, typeId, state),
      wechseln: (ziel: ProduktionZiel) => {
        if (ziel === 'aufbau') switchTab(root, 'aufbau');
        else navigateTo(ziel);
      },
    });
  }

  // Aufbau-Reiter: Karte anklicken → Fenster des Gebäudes oder Bau-Dialog
  bindAufbauTab(root, typeId => oeffneGebaeudeOderBau(root, typeId, state));

  // Rezeptkarten: «+ Auftrag» gibt den Auftrag gleich hier, sonst öffnet die Karte die Werkstatt
  // (gesperrt: Bau-Dialog). Ein Listener für den ganzen Reiter, weil Gruppen neu gezeichnet werden.
  const crafting = panelFor(root, 'crafting');
  crafting?.addEventListener('click', (e) => {
    const ziel = e.target as HTMLElement;
    const card = ziel.closest('.ccard') as HTMLElement | null;
    const { rcp, btype } = card?.dataset ?? {};
    if (!rcp || !btype) return;
    if (ziel.closest('[data-craft-add]')) {
      const b = dasGebaeude(state, btype);
      if (b && auftragGeben(b, rcp)) aktualisiereCrafting(root, state, btype);
      return;
    }
    openRecipeInWorkshop(root, btype, rcp, state);
  });

  startLiveTimer(root, state);
  aktualisiereMindmap(root, state);
}

// ── Buy Confirm Modal ───────────────────────────────────────────

function showBuyConfirmModal(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  // Es gibt jedes Gebäude nur einmal: steht es schon, geht es zum Ausbau
  const vorhanden = dasGebaeude(state, typeId);
  if (vorhanden) {
    showBuildingModal(root, vorhanden, state);
    return;
  }

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const canAfford = Object.entries(def.buildCost).every(
    ([res, qty]) => (state.globalStock[res] ?? 0) >= qty
  );

  const hinweise = freischaltHinweise(state, typeId);
  const unlocked = hinweise.length === 0;
  const canBuild = unlocked && canAfford;

  const recipeNames = def.recipes.map(id => RECIPE_DEFS[id]?.name).filter(Boolean);
  const wirkung = ausbauWirkung(typeId, 1);
  const max = maxStufe(typeId);

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal">
      <h3>${def.name} bauen?</h3>
      <p><strong>Kosten:</strong></p>
      <div class="cingr">${renderCostDetail(def.buildCost, state)}</div>
      ${wirkung ? `<p><strong>Bringt:</strong> ${wirkung}</p>` : ''}
      ${recipeNames.length > 0 ? `<p><strong>Rezepte:</strong> ${recipeNames.join(', ')}</p>` : ''}
      ${max > 1 ? `<p class="bm-info">Es gibt jedes Gebäude nur einmal. Danach lässt es sich bis Stufe ${max} ausbauen.</p>` : ''}
      ${!unlocked
        ? `<p style="color:var(--red,#dc2626)"><strong>🔒 Gesperrt:</strong> ${hinweise.join(', ')}</p>`
        : !canAfford
          ? '<p style="color:var(--red,#dc2626)">Nicht genug Ressourcen!</p>'
          : ''
      }
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${canBuild
          ? '<button class="btn-confirm-buy" style="background:var(--grn,#16a34a);color:#fff;padding:8px 16px;border:none;cursor:pointer;border-radius:4px">BAUEN</button>'
          : ''
        }
        ${!unlocked
          ? '<button class="btn-zum-aufbau" style="padding:8px 16px;border:1px solid var(--gd);background:transparent;color:var(--gold);cursor:pointer;border-radius:4px">ZUM AUFBAU</button>'
          : ''
        }
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">ABBRECHEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  // Close handlers: der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if ((target === ov && hintergrund(e)) || target.classList.contains('btn-close-modal')) {
      ov.remove();
      schluckeZweitenKlick();
    }
    if (target.classList.contains('btn-zum-aufbau')) {
      ov.remove();
      switchTab(root, 'aufbau');
    }
    if (target.classList.contains('btn-confirm-buy')) {
      ov.remove();
      executeBuy(root, typeId, state);
    }
  });
}

function executeBuy(root: HTMLElement, typeId: string, state: GameState): void {
  const def = BUILDING_DEFS[typeId];
  if (!def) return;

  // Verify resources (double-check before mutating)
  for (const [res, qty] of Object.entries(def.buildCost)) {
    if ((state.globalStock[res] ?? 0) < qty) return;
  }

  // Bauplan-Freischaltung: Bauplan muss im Lager liegen
  const bauplan = def.freischaltung?.bauplan;
  if (bauplan && (state.globalStock[bauplan] ?? 0) < 1) return;

  if (dasGebaeude(state, typeId)) return;
  if (freischaltHinweise(state, typeId).length) return;

  // Deduct resources
  for (const [res, qty] of Object.entries(def.buildCost)) {
    state.globalStock[res] = (state.globalStock[res] ?? 0) - qty;
  }
  // Bauplan wird beim Bau verbraucht
  if (bauplan) state.globalStock[bauplan] -= 1;

  // Create building instance and push to array
  const building = createBuildingInstance(typeId, 0, 0, true);
  if (def.recipes.length > 0) building.activeRecipeId = def.recipes[0];
  building.connected = true;
  state.buildings.push(building);

  // Track statistics
  state.statistics['total_buildings_built'] = (state.statistics['total_buildings_built'] ?? 0) + 1;

  // Re-render; der aktive Reiter bleibt (currentTab)
  reRenderBuildingsScreen(root, state);
}

// ── Workshop Logic ──────────────────────────────────────────────

function selectRecipe(state: GameState, b: BuildingInstance, rcpId: string): void {
  if (b.activeRecipeId === rcpId) return;
  erstatteLaufendenZyklus(state, b);
  b.activeRecipeId = rcpId;
  b.producing = false;
  b.productionTimer = 0;
  b.pendingCraft = false;
}

const BLOCKER_TEXT: Partial<Record<WarteGrund['art'], string>> = {
  'im-bau': 'Im Bau',
  unwetter: 'Pausiert durch Unwetter',
  'nicht-verbunden': 'Nicht verbunden – keine Produktion',
  'kein-arbeiter': 'Kein Arbeiter – freie Bewohner werden automatisch eingeteilt',
  'kein-wasser': 'Braucht Wasser – baue einen Brunnen',
};

/** Reason why production cannot run right now (mirrors ProductionSystem checks). */
function productionBlocker(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef): string | null {
  const grund = produktionsHindernis(b, def, recipe);
  return grund ? BLOCKER_TEXT[grund.art] ?? null : null;
}

function renderWorkshopStatus(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef | undefined, state: GameState): string {
  if (!recipe) return '<p class="ws-msg">Kein Rezept gewählt – wähle unten eines aus.</p>';

  const blocker = productionBlocker(b, def, recipe);
  let body = '';
  if (b.producing) {
    const pct = Math.round(cycleProgress(b, recipe) * 100);
    body = `
      <div class="ws-bar"><div class="ws-bar-fill" style="width:${pct}%"></div></div>
      <div class="ws-bar-txt">${blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(b.productionTimer)}s`}</div>`;
  } else if (blocker) {
    body = `<p class="ws-msg ws-warn">${blocker}</p>`;
  } else {
    body = canAffordRecipe(state, b, recipe)
      ? '<p class="ws-msg">Startet beim nächsten Takt…</p>'
      : '<p class="ws-msg ws-warn">Wartet auf Zutaten</p>';
  }

  return `<div class="ws-active">► ${recipe.name}</div>${body}`;
}

function sekundenText(sek: number): string {
  const s = Math.ceil(sek);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s}s`;
}

function restzeitText(b: BuildingInstance, state: GameState): string {
  const liste = auftragsListe(b);
  if (liste.length === 0) return `0/${MAX_AUFTRAEGE}`;
  // Brot für die Bewohner kommt vor den Aufträgen (systems/Werkstattplan.ts)
  const vorrat = vorratVorAuftraegen(state, b);
  const vorher = vorrat ? vorrat.zyklen * zyklusSekunden(b, vorrat.recipe) : 0;
  return `${liste.length}/${MAX_AUFTRAEGE} · gesamt noch ${sekundenText(restzeitSekunden(b, state) + vorher)}`;
}

/** Balken mit Restzeit des laufenden Zyklus (Auftrag oder von selbst). */
function laufBalken(b: BuildingInstance, def: BuildingDef, recipe: RecipeDef): string {
  const blocker = productionBlocker(b, def, recipe);
  const pct = Math.round(cycleProgress(b, recipe) * 100);
  return `
        <div class="ws-bar"><div class="ws-bar-fill" style="width:${pct}%"></div></div>
        <div class="ws-bar-txt">${blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(b.productionTimer)}s`}</div>`;
}

/**
 * Auftragsliste einer Werkstatt: was sie gerade von selbst macht (ohne ✕), der laufende
 * Auftrag mit Balken, dann die wartenden; darunter, was sie ohne Auftrag von selbst macht.
 */
function renderAuftragsliste(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const liste = auftragsListe(b);
  const laeuft = laeuftAuftrag(b);
  const kopf = `<div class="ws-active">AUFTRÄGE <span class="ws-rest">${restzeitText(b, state)}</span></div>`;
  const selbst = laufendVonSelbst(b);
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const selbstZeile = selbst && laufend ? `
      <div class="ws-auf ws-selbst on">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(laufend.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${selbst}</span>
          <span class="ws-von-selbst">von selbst</span>
        </div>
        ${laufBalken(b, def, laufend)}
      </div>` : '';
  const satz = vonSelbstSatz(state, b.typeId);
  const erklaerung = satz ? `<p class="ws-msg ws-selbst-satz">↻ ${satz}</p>` : '';
  if (liste.length === 0) {
    const leer = selbst ? '' : `<p class="ws-msg">${ruheText(state, b)}. Gib unten einen Auftrag (bis ${MAX_AUFTRAEGE} nacheinander).</p>`;
    return `${kopf}${selbstZeile ? `<div class="ws-list">${selbstZeile}</div>` : ''}${leer}${erklaerung}`;
  }

  const zeilen = liste.map((id, i) => {
    const recipe = RECIPE_DEFS[id];
    if (!recipe) return '';
    const laeuftDieser = laeuft && i === 0;
    let unten: string;
    if (laeuftDieser) {
      unten = laufBalken(b, def, recipe);
    } else if (i === 0) {
      const warten = auftragWartetText(state, b, recipe);
      unten = `<div class="ws-msg${warten.warn ? ' ws-warn' : ''}">${warten.text}</div>`;
    } else {
      unten = `<div class="ws-msg">wartet · ⏱ ${Math.round(zyklusSekunden(b, recipe))}s</div>`;
    }
    return `
      <div class="ws-auf${laeuftDieser ? ' on' : ''}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(recipe.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${i + 1}. ${recipe.name}</span>
          <button class="ws-cancel" data-ws-cancel="${i}" title="Abbrechen${laeuftDieser ? ' (Zutaten zurück)' : ''}">✕</button>
        </div>
        ${unten}
      </div>`;
  }).join('');
  return `${kopf}<div class="ws-list">${selbstZeile}${zeilen}</div>${erklaerung}`;
}

function renderWorkshop(b: BuildingInstance, def: BuildingDef, state: GameState, highlightId: string | null, confirmSwitchId: string | null): string {
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0) return '';
  const active = b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const liste = hatAuftragsliste(b);

  const rows = recipes.map(rcp => {
    if (liste) {
      const geht = kannAuftragGeben(b, rcp.id);
      return `
      <div class="ws-rcp ws-rcp-auf${rcp.id === highlightId ? ' hl' : ''}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(rcp.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${rcp.name}</span>
          <span class="ccard-time">⏱ ${Math.round(zyklusSekunden(b, rcp))}s</span>
          <button class="btn-craft ws-add" data-ws-add="${rcp.id}"${geht ? '' : ' disabled'}>+ AUFTRAG</button>
        </div>
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
      </div>`;
    }
    const isActive = rcp.id === b.activeRecipeId;
    const cls = ['ws-rcp', isActive ? 'on' : '', rcp.id === highlightId ? 'hl' : ''].filter(Boolean).join(' ');
    const confirm = rcp.id === confirmSwitchId
      ? '<div class="ws-msg ws-warn">Nochmal klicken: laufende Produktion abbrechen (Zutaten zurück) und wechseln.</div>'
      : '';
    return `
      <div class="${cls}" data-ws-rcp="${rcp.id}">
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(rcp.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${isActive ? '► ' : ''}${rcp.name}</span>
          <span class="ccard-time">⏱ ${Math.round(zyklusSekunden(b, rcp))}s</span>
        </div>
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
        ${confirm}
      </div>`;
  }).join('');

  return `
    <div class="ws">
      <span class="lbl">WERKSTATT</span>
      <div class="ws-status">${liste ? renderAuftragsliste(b, def, state) : renderWorkshopStatus(b, def, active, state)}</div>
      <span class="lbl">REZEPTE${liste ? ' – Zutaten werden beim Start eines Auftrags abgezogen' : ''}</span>
      <div class="ws-list">${rows}</div>
    </div>`;
}

// ── Gebäude-Fenster: Angaben, Ausbau ────────────────────────────

interface InfoZeile {
  label: string;
  wert: string;
  cls?: string;
  /** Erklärung in kleiner Schrift unter der Zeile. */
  klein?: string;
}

function prozent(wert: number): string {
  return `${Math.round(wert * 100)} %`;
}

/** Die Zeilen oben im Fenster, je nach Gebäude-Art. */
function infoZeilen(state: GameState, b: BuildingInstance, def: BuildingDef): InfoZeile[] {
  const zeilen: InfoZeile[] = [];

  if (def.workerSlots > 0) {
    const plaetze = arbeitsplaetze(b);
    const da = besetzt(b);
    zeilen.push({
      label: 'Arbeiter', wert: `${da} / ${plaetze}`, cls: da < plaetze ? 'schlecht' : 'gut',
      klein: da < plaetze ? 'Freie Bewohner werden automatisch eingeteilt.' : undefined,
    });
  }

  if (def.recipes.length > 0) {
    const selbst = laufendVonSelbst(b);
    // Steht sie, sagt der Status warum (wie die Karte in der Mindmap): wartet auf Mehl, Brot reicht 3 Tage …
    const st = b.built && !b.producing ? einzelStatus(state, b) : undefined;
    const grund = st?.grund ? grundText(st.grund) : '';
    const status = !b.built ? '🚧 Im Bau'
      : b.eventPaused ? '⚠️ Pausiert (Unwetter)'
      : selbst ? `✅ Von selbst: ${selbst}`
      : b.producing ? '✅ Produziert'
      : st?.laeuft ? '✅ Startet gleich'
      : grund ? `⏸️ ${grund.charAt(0).toUpperCase()}${grund.slice(1)}`
      : '⏸️ Leerlauf';
    zeilen.push({ label: 'Status', wert: status });
    return zeilen;
  }

  if (def.housing) {
    const bewohner = state.citizens.length;
    const plaetze = wohnKapazitaet(state);
    const arbeiten = state.citizens.filter(c => c.status === 'WORKER' || c.status === 'BUILDER').length;
    const frei = state.citizens.filter(c => c.status === 'IDLE').length;
    const r = economy.steuerRechnung(state);
    const zufrieden = Math.round(state.satisfaction ?? 0);
    let rechnung = `${r.bewohner} Bewohner × ${STEUER_PRO_BEWOHNER} Gold × ${prozent(r.zufriedenheit)} Zufriedenheit`;
    if (r.heldenBonus !== 1) rechnung += ` × ${r.heldenBonus.toFixed(2)} Helden-Bonus`;
    if (r.marktProzent) rechnung += ` + ${r.marktProzent} % Marktplatz`;
    if (r.stadtProzent) rechnung += ` + ${r.stadtProzent} % Stadtrecht`;
    if (r.bank) rechnung += ` + ${r.bank} Gold von der Bank`;
    zeilen.push({ label: 'Bewohner', wert: `${bewohner} / ${plaetze}`, cls: bewohner > plaetze ? 'schlecht' : 'gut' });
    zeilen.push({ label: 'Arbeiten · frei', wert: `${arbeiten} · ${frei}` });
    zeilen.push({ label: 'Zufriedenheit', wert: `${zufrieden} %`, cls: zufrieden >= 50 ? 'gut' : 'schlecht' });
    zeilen.push({ label: 'Brot im Lager', wert: `${Math.floor(state.globalStock.bread ?? 0)}`, cls: (state.globalStock.bread ?? 0) >= 1 ? 'gut' : 'schlecht' });
    // Wie die Bäckerei rechnet (systems/Werkstattplan.ts): essen und, solange Platz ist, 1 für den nächsten Bewohner
    const essen = brotProTag(bewohner);
    const brot = brotBedarfProTag(state);
    const reicht = Math.floor((state.globalStock.bread ?? 0) / Math.max(1, brot));
    zeilen.push({ label: 'Brot pro Tag', wert: `−${brot}`, cls: reicht >= 1 ? undefined : 'schlecht',
      klein: `${essen} essen die Bewohner (1 je ${BEWOHNER_JE_BROT}, mindestens 1)${brot > essen ? ', 1 kostet der nächste Bewohner' : ''}. `
        + `Der Vorrat reicht ${reicht === 1 ? '1 Tag' : `${reicht} Tage`}, die Bäckerei backt nach, bis es 3 Tage sind.` });
    zeilen.push({ label: 'Steuern pro Tag', wert: `${r.gesamt} Gold`, cls: 'gut', klein: rechnung });
    return zeilen;
  }

  if (def.id === 'MARKETPLACE') {
    const n = wirkungsStufe(state, def.id);
    zeilen.push({ label: 'Wirkung', wert: `+${marktBonusProzent(n)} % Steuern`, cls: n > 0 ? 'gut' : 'schlecht',
      klein: n > 0 ? undefined : 'Wirkt erst mit einem Arbeiter.' });
    const gesperrt = marktGesperrt(state);
    const rest = handelHeute(state);
    zeilen.push(gesperrt
      ? { label: 'Handel', wert: gesperrt, cls: 'schlecht' }
      : { label: 'Handel', wert: `Heute noch ${rest} Bündel`, cls: rest > 0 ? 'gut' : 'schlecht',
        klein: `${tagesmenge(state)} Bündel zu ${BUENDEL} Stück pro Tag, Kauf und Verkauf zusammen.` });
  } else if (def.id === 'BANK') {
    const n = wirkungsStufe(state, def.id);
    zeilen.push({ label: 'Wirkung', wert: `+${bankGoldProTag(n)} Gold / Tag`, cls: n > 0 ? 'gut' : 'schlecht',
      klein: n > 0 ? undefined : 'Wirkt erst mit einem Arbeiter.' });
  } else if (def.expeditions) {
    const slots = state.guildStats?.guildHallT2 ? 4 : def.expeditions.partySlots;
    zeilen.push({ label: 'Helden in der Gilde', wert: `${state.fighters.length}` });
    zeilen.push({ label: 'Helden je Expedition', wert: `${slots}` });
  } else if (def.radiusEffect?.type === 'water') {
    zeilen.push({ label: 'Wirkung', wert: 'Wasser für Kräutergarten und Bäckerei', cls: 'gut' });
  }
  return zeilen;
}

function renderZeilen(zeilen: InfoZeile[]): string {
  if (zeilen.length === 0) return '';
  return `<div class="bm-zeilen">${zeilen.map(z => `
    <div class="bm-zeile"><span>${z.label}</span><b class="${z.cls ?? ''}">${z.wert}</b>${z.klein ? `<small>${z.klein}</small>` : ''}</div>`).join('')}</div>`;
}

/** Wohnviertel: wächst die Stadt, und wann kommt der nächste Bewohner? */
function renderWachstum(state: GameState): string {
  const w = wachstum(state);
  const text = w.waechst ? 'Der nächste Bewohner kommt beim Tageswechsel.'
    : w.grund?.art === 'voll' ? 'Das Wohnviertel ist voll: baue es aus, damit neue Bewohner kommen.'
    : 'Bewohner essen jeden Tag Brot. Neue kommen nur, wenn danach noch Brot übrig ist.';
  const pct = Math.round(tagFortschritt(state) * 100);
  return `
    <div class="bm-wachs ${w.waechst ? 'gut' : 'schlecht'}">
      <span>${text}</span>
      <div class="pk-bar"${w.waechst ? '' : ' hidden'}><i style="width:${pct}%"></i></div>
    </div>`;
}

/** Lagerhaus: alles, was im Lager liegt. */
function vorratChips(state: GameState): string {
  const eintraege = Object.entries(state.globalStock)
    .map(([item, qty]) => [item, Math.floor(qty ?? 0)] as const)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => itemName(a[0]).localeCompare(itemName(b[0]), 'de'));
  if (eintraege.length === 0) return '<span class="ws-msg">Das Lager ist leer.</span>';
  return eintraege.map(([item, qty]) => `<span class="pk-chip"><b>${qty}</b> ${itemName(item)}</span>`).join('');
}

function renderVorrat(state: GameState): string {
  return `<span class="lbl">VORRAT</span><div class="pk-chips bm-vorrat">${vorratChips(state)}</div>`;
}

/**
 * Ein Knopf; geht er nicht, steht der Grund sichtbar darunter (am Handy gibt es keine Titel).
 * Was den ganzen Markt sperrt (`zu`), steht einmal über den Waren und hier nicht noch einmal.
 */
function handelKnopf(state: GameState, ware: string, art: HandelsArt, zu: string): string {
  const p = kannHandeln(state, ware, art);
  const text = art === 'verkaufen' ? `${BUENDEL} verkaufen +${VERKAUFSPREIS[ware]} Gold` : `${BUENDEL} kaufen −${kaufpreis(ware)} Gold`;
  const titel = p.ok ? `${BUENDEL} ${itemName(ware)} ${art}` : p.grund;
  const grund = p.ok || p.grund === zu ? '' : `<small class="hd-grund">${p.grund}</small>`;
  return `<span class="hd-zelle"><button class="hd-btn hd-${art}" data-handel-ware="${ware}" data-handel-art="${art}" title="${titel}"${p.ok ? '' : ' disabled'}>${text}</button>${grund}</span>`;
}

/** Marktplatz: dein Gold (am Handy deckt das Fenster die Kopfzeile zu), je Ware Vorrat, verkaufen und kaufen. */
function renderHandel(state: GameState): string {
  const zu = handelZu(state);
  const gold = Math.floor(state.globalStock.gold ?? 0) || 0;
  return `
    <div class="hd">
      <div class="hd-kopf"><span class="lbl">HANDEL</span><span class="hd-gold">🪙 ${gold.toLocaleString('de')} Gold</span></div>
      ${zu ? `<p class="hd-zu">${zu}</p>` : ''}
      ${HANDELSWAREN.map(ware => {
        const fuer = vorbehalten(state, ware);
        return `
      <div class="hd-ware">
        <span class="hd-name">${itemName(ware)} <small>${Math.floor(state.globalStock[ware] ?? 0)} im Lager${fuer > 0 ? `, ${fuer} für die Bewohner` : ''}</small></span>
        ${handelKnopf(state, ware, 'verkaufen', zu)}
        ${handelKnopf(state, ware, 'kaufen', zu)}
      </div>`;
      }).join('')}
    </div>`;
}

function renderAusbau(state: GameState, b: BuildingInstance): string {
  if (maxStufe(b.typeId) <= 1) return '';
  const info = ausbauInfo(state, b);
  if (info.naechste === null) {
    return `<div class="bm-ausbau"><span class="lbl">AUSBAU</span><p class="ws-msg">Höchste Stufe erreicht.</p></div>`;
  }
  const geht = b.built && info.bezahlbar;
  return `
    <div class="bm-ausbau">
      <span class="lbl">AUSBAU</span>
      <p class="bm-ausbau-w"><strong>Stufe ${info.naechste}:</strong> ${info.wirkung}</p>
      <div class="cingr">${renderCostDetail(info.kosten, state)}</div>
      ${info.hinweis ? `<p class="ws-msg ws-warn">🔒 ${info.hinweis}</p>` : ''}
      <button class="btn-craft btn-ausbau"${geht ? '' : ' disabled'}>⬆ AUSBAUEN AUF STUFE ${info.naechste}</button>
    </div>`;
}

/** Everything the modal body depends on, except the running bars. */
function modalSignature(b: BuildingInstance, def: BuildingDef, state: GameState): string {
  const items = new Set<string>();
  for (const id of def.recipes) {
    for (const item of Object.keys(RECIPE_DEFS[id]?.inputs ?? {})) items.add(item);
  }
  const info = ausbauInfo(state, b);
  const kopf = hatAuftragsliste(b) && !b.producing && b.auftraege.length > 0
    ? auftragWartetText(state, b, RECIPE_DEFS[b.auftraege[0]]).text : null;
  return JSON.stringify([
    b.activeRecipeId, b.producing, b.pendingCraft, b.auftraege, b.vonSelbst ?? null, kopf,
    hatAuftragsliste(b) ? [ruheText(state, b), vonSelbstSatz(state, b.typeId)] : null,
    b.built, b.connected, b.eventPaused,
    b.waterSupplied, besetzt(b), b.tier, info.bezahlbar, info.hinweis, info.kosten,
    [...items].map(item => stockFor(state, b, item)),
    infoZeilen(state, b, def),
    def.housing ? (wachstum(state).grund?.art ?? 'waechst') : null,
    def.id === 'WAREHOUSE' ? vorratChips(state) : null,
    def.id === 'MARKETPLACE' ? renderHandel(state) : null,
    engpassFuerInstanz(state, b),
  ]);
}

// ── Demolish ────────────────────────────────────────────────────

/** Startgebäude bleiben stehen (es gibt jedes Gebäude nur einmal). */
function isProtectedStartBuilding(b: BuildingInstance): boolean {
  return STARTING_BUILDING_TYPES.includes(b.typeId);
}

function executeDemolish(state: GameState, b: BuildingInstance): void {
  const def = BUILDING_DEFS[b.typeId];
  if (!def || !state.buildings.includes(b) || isProtectedStartBuilding(b)) return;

  // Die Hälfte von allem, was Bau und Ausbau gekostet haben, kommt zurück
  for (const [res, qty] of Object.entries(investiert(b.typeId, stufeVon(b)))) {
    const refund = Math.floor(qty / 2);
    if (refund > 0) state.globalStock[res] = (state.globalStock[res] ?? 0) + refund;
  }
  // Laufender Zyklus und Puffer gehen ins Lager, Arbeiter werden frei
  entferneGebaeude(state, new Set([b.id]));
}

// ── Building Detail Modal ───────────────────────────────────────

function showBuildingModal(root: HTMLElement, bInst: BuildingInstance, state: GameState, highlightRecipeId: string | null = null): void {
  const def = BUILDING_DEFS[bInst.typeId];
  if (!def) return;

  // Remove any existing modal
  const prev = root.querySelector('.ov');
  if (prev) prev.remove();

  const spriteKey = def.spriteKey ?? '';
  const isProtected = isProtectedStartBuilding(bInst);
  const hasWorkshop = def.recipes.length > 0;
  let confirmSwitchId: string | null = null;
  let confirmDemolish = false;

  const engpassZeile = (): string => {
    const eng = engpassFuerInstanz(state, bInst);
    return eng ? `<p class="ws-msg ws-warn bm-eng"><strong>Engpass:</strong> ${eng}</p>` : '';
  };

  const renderBody = (): string => `
      ${renderZeilen(infoZeilen(state, bInst, def))}
      ${def.housing ? renderWachstum(state) : ''}
      ${def.id === 'WAREHOUSE' ? renderVorrat(state) : ''}
      ${def.id === 'MARKETPLACE' ? renderHandel(state) : ''}
      ${engpassZeile()}
      ${renderWorkshop(bInst, def, state, highlightRecipeId, confirmSwitchId)}
      ${renderAusbau(state, bInst)}`;

  const renderTitle = (): string => {
    const stufen = stufenText(bInst);
    return `${def.name}${stufen ? ` <span class="bm-stufe">${stufen}</span>` : ''}`;
  };

  const renderDemolishBtn = (): string => isProtected
    ? '<span class="ws-msg">Startgebäude – kann nicht abgerissen werden</span>'
    : `<button class="btn-demolish" style="background:#991b1b;color:#fff;padding:8px 16px;border:none;cursor:pointer;border-radius:4px">${confirmDemolish ? 'WIRKLICH ABREISSEN?' : '🗑 ABREISSEN'}</button>`;

  const ov = document.createElement('div');
  ov.className = 'ov on';
  ov.innerHTML = `
    <div class="modal${hasWorkshop || def.id === 'MARKETPLACE' ? ' modal-ws' : ''}">
      <div style="text-align:center;margin-bottom:8px;">
        <img src="assets/sprites/final/${spriteKey}.png" style="width:64px;height:64px;object-fit:contain;"
             onerror="this.style.display='none'">
      </div>
      <h3 class="bm-title">${renderTitle()}</h3>
      <div class="bm-body">${renderBody()}</div>
      <div class="bm-actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
        <span class="bm-demolish">${renderDemolishBtn()}</span>
        <button class="btn-close-modal" style="padding:8px 16px;border:1px solid var(--bdr,#444);background:transparent;color:var(--txt,#e0e0e0);cursor:pointer;border-radius:4px">SCHLIESSEN</button>
      </div>
    </div>
  `;
  root.appendChild(ov);

  const body = ov.querySelector('.bm-body') as HTMLElement;
  const title = ov.querySelector('.bm-title') as HTMLElement;
  let lastSig = modalSignature(bInst, def, state);
  const refreshBody = () => {
    body.innerHTML = renderBody();
    title.innerHTML = renderTitle();
    lastSig = modalSignature(bInst, def, state);
  };

  if (highlightRecipeId) {
    body.querySelector('.ws-rcp.hl')?.scrollIntoView({ block: 'nearest' });
  }

  // Live progress: full refresh when state changes, otherwise only the bars
  const timer = window.setInterval(() => {
    if (!ov.isConnected || !state.buildings.includes(bInst)) {
      window.clearInterval(timer);
      return;
    }
    if (wirdGedrueckt()) return;
    if (modalSignature(bInst, def, state) !== lastSig) {
      refreshBody();
      return;
    }
    const recipe = bInst.activeRecipeId ? RECIPE_DEFS[bInst.activeRecipeId] : undefined;
    const fill = body.querySelector('.ws-bar-fill') as HTMLElement | null;
    const txt = body.querySelector('.ws-bar-txt') as HTMLElement | null;
    if (recipe && bInst.producing && fill && txt) {
      fill.style.width = `${Math.round(cycleProgress(bInst, recipe) * 100)}%`;
      const blocker = productionBlocker(bInst, def, recipe);
      txt.textContent = blocker ? `Angehalten: ${blocker}` : `noch ${Math.ceil(bInst.productionTimer)}s`;
    }
    const rest = body.querySelector('.ws-rest') as HTMLElement | null;
    if (rest) rest.textContent = restzeitText(bInst, state);
    const wachs = body.querySelector('.bm-wachs .pk-bar > i') as HTMLElement | null;
    if (wachs) wachs.style.width = `${Math.round(tagFortschritt(state) * 100)}%`;
  }, 500);

  const close = () => {
    window.clearInterval(timer);
    ov.remove();
    // Crafting tab shows recipe/production state → refresh
    reRenderBuildingsScreen(root, state);
  };

  // Der Hintergrund schliesst nur bei einem einfachen Klick, der dort begann (siehe hintergrundKlick)
  const hintergrund = hintergrundKlick(ov);
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov) {
      if (hintergrund(e)) {
        close();
        schluckeZweitenKlick();
      }
      return;
    }
    if (target.classList.contains('btn-close-modal')) {
      close();
      schluckeZweitenKlick();
      return;
    }

    if (target.classList.contains('btn-demolish')) {
      if (!confirmDemolish) {
        confirmDemolish = true;
        (ov.querySelector('.bm-demolish') as HTMLElement).innerHTML = renderDemolishBtn();
        return;
      }
      executeDemolish(state, bInst);
      close();
      return;
    }

    if (target.classList.contains('btn-ausbau')) {
      if (ausbauen(state, bInst)) refreshBody();
      return;
    }

    const handel = target.closest('[data-handel-ware]') as HTMLElement | null;
    if (handel) {
      if (handle(state, handel.dataset.handelWare!, handel.dataset.handelArt as HandelsArt).ok) refreshBody();
      return;
    }

    const add = target.closest('[data-ws-add]') as HTMLElement | null;
    if (add) {
      if (auftragGeben(bInst, add.dataset.wsAdd!)) refreshBody();
      return;
    }
    const cancel = target.closest('[data-ws-cancel]') as HTMLElement | null;
    if (cancel) {
      if (auftragAbbrechen(state, bInst, Number(cancel.dataset.wsCancel))) refreshBody();
      return;
    }

    const row = target.closest('[data-ws-rcp]') as HTMLElement | null;
    if (row) {
      const rcpId = row.dataset.wsRcp!;
      if (rcpId === bInst.activeRecipeId) return;
      // A running cycle is only aborted after a second click
      if (bInst.producing && confirmSwitchId !== rcpId) {
        confirmSwitchId = rcpId;
      } else {
        selectRecipe(state, bInst, rcpId);
        confirmSwitchId = null;
      }
      highlightRecipeId = null;
      refreshBody();
    }
  });
}
