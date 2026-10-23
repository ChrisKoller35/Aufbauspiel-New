// ─── Magic City – Reiter «Crafting» ─────────────────────────────
// Je Werkstatt eine Gruppe: Kopf mit Stufe, was gerade läuft, dann die
// Rezeptkarten mit «+ Auftrag». Gruppen gesperrter Werkstätten stehen
// grau darunter; ihr Knopf öffnet den Bau-Dialog. Nachgeführt wird an
// Ort und Stelle (die Scroll-Stelle bleibt). Klicks laufen über
// Callbacks von BuildingsScreen.
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS, BuildingDef } from '../../data/buildings';
import { netzGebaeudeIds } from '../../data/produktionsnetz';
import { RECIPE_DEFS, RecipeDef } from '../../data/recipes';
import { ITEM_DEFS } from '../../data/items';
import { GameState } from '../../models/GameState';
import { BuildingInstance } from '../../models/Building';
import { dasGebaeude } from '../../systems/GebaeudeStatus';
import { maxStufe, stufeVon, zyklusSekunden } from '../../systems/Ausbau';
import { auftragsListe, auftragGeben, kannAuftragGeben, laeuftAuftrag } from '../../systems/Auftraege';
import { laufendVonSelbst } from '../../systems/Werkstattplan';
import { itemIcon, sekundenText, restzeitText, ruheText, auftragWartetText, renderRecipeChips } from './WerkstattAnzeige';

export interface CraftingCallbacks {
  /** Werkstatt steht: ihr Fenster öffnen, das Rezept hervorgehoben. */
  oeffneWerkstatt: (typeId: string, recipeId: string) => void;
  /** Werkstatt fehlt: Bau-Dialog. */
  bauen: (typeId: string) => void;
}

/** Die Werkstätten in der Reihenfolge der Mindmap. */
function craftingBuildingTypes(): string[] {
  const werkstatt = (id: string) => !!BUILDING_DEFS[id]?.manualCraft && BUILDING_DEFS[id].recipes.length > 0;
  const ordered = netzGebaeudeIds().filter(werkstatt);
  const rest = Object.keys(BUILDING_DEFS).filter(id => !ordered.includes(id) && werkstatt(id));
  return [...ordered, ...rest];
}

function stufenText(b: BuildingInstance): string {
  const max = maxStufe(b.typeId);
  return max > 1 ? `Stufe ${stufeVon(b)} von ${max}` : '';
}

export function renderCrafting(state: GameState): string {
  const ownedGroups: string[] = [];
  const lockedGroups: string[] = [];

  for (const typeId of craftingBuildingTypes()) {
    const html = renderCraftGruppe(state, typeId);
    if (html) (dasGebaeude(state, typeId) ? ownedGroups : lockedGroups).push(html);
  }

  const hint = ownedGroups.length === 0
    ? '<p class="craft-hint">Du besitzt noch keine Werkstatt. Bauen kannst du sie direkt im Reiter «Stadt» oder «Aufbau».</p>'
    : '<p class="craft-hint">Werkstätten arbeiten auf Auftrag: «+ Auftrag» auf einem Rezept, ein Klick auf die Karte '
      + 'öffnet die Werkstatt. Zutaten sind Gold und Beute aus den Dungeons. Gelbe Zutaten mit ↻ fehlen noch, '
      + 'kommen aber von selbst; rote musst du besorgen (Beute, Gold, oder ein Gebäude dafür fehlt).</p>';

  return `${hint}${ownedGroups.join('')}${lockedGroups.join('')}`;
}

/** Eine Gebäude-Gruppe: Kopf, was läuft, Rezeptkarten. */
function renderCraftGruppe(state: GameState, typeId: string): string {
  const def = BUILDING_DEFS[typeId];
  const b = dasGebaeude(state, typeId);
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0) return '';

  const cards = recipes.map(rcp => renderCraftCard(rcp, def, b, state)).join('');
  const badge = b
    ? `<span class="craft-group-cnt">${stufenText(b)} · auf Auftrag</span>`
    : `<span class="craft-lock">🔒 braucht ${def.name}</span>`;
  return `
      <div class="craft-group${b ? '' : ' locked'}" data-gruppe="${typeId}" data-sig="${craftSignatur(state, typeId)}">
        <div class="craft-group-hd">⚙️ ${def.name} ${badge}</div>
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
  return [b.producing, b.activeRecipeId ?? '', (b.auftraege ?? []).join(','), selbst, b.tier].join('|');
}

/** Was in der Werkstatt gerade läuft und was noch wartet, mit Restzeit. */
function renderLaufend(state: GameState, b: BuildingInstance): string {
  const name = (id: string) => RECIPE_DEFS[id]?.name ?? id;
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

function resolveRarity(itemDef: { tags: string[] } | undefined): string {
  if (!itemDef) return 'common';
  const tags = itemDef.tags;
  if (tags.includes('legendary')) return 'legendary';
  if (tags.includes('epic')) return 'epic';
  if (tags.includes('rare')) return 'rare';
  if (tags.includes('uncommon')) return 'uncommon';
  return 'common';
}

function renderCraftCard(rcp: RecipeDef, def: BuildingDef, b: BuildingInstance | undefined, state: GameState): string {
  const outputKey = Object.keys(rcp.outputs)[0] ?? '';
  const itemDef = ITEM_DEFS[outputKey];
  const rarity = resolveRarity(itemDef);
  const ico = itemDef ? itemIcon(outputKey) : '⚗️';

  const teile: string[] = [];
  if (!b) {
    teile.push(`<span class="craft-lock">braucht ${def.name}</span>`);
  } else if (b.activeRecipeId === rcp.id && b.producing) {
    // Was es von selbst macht und für wen, steht in der Zeile über den Karten
    teile.push(laufendVonSelbst(b) ? '<span class="craft-run craft-selbst">● von selbst</span>' : '<span class="craft-run">● läuft</span>');
  }
  const wartend = b ? b.auftraege.filter(id => id === rcp.id).length : 0;
  if (wartend > 0) teile.push(`<span class="craft-run">${wartend}× in Auftrag</span>`);
  const sekunden = Math.round(b ? zyklusSekunden(b, rcp) : rcp.cycleTimeSec);
  const knopf = b
    ? `<button class="btn-craft ccard-add" data-craft-add="${rcp.id}"${kannAuftragGeben(b, rcp.id) ? '' : ' disabled'}>+ AUFTRAG</button>`
    : '<button class="btn-craft">GEBÄUDE BAUEN</button>';

  return `
    <div class="ccard${b ? '' : ' locked'}" data-rcp="${rcp.id}" data-btype="${def.id}">
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

/** Zuletzt gesetztes HTML der Stellen, die laufend nachgeführt werden. */
const gezeichnet = new WeakMap<HTMLElement, string>();

function setzeHtml(el: HTMLElement, html: string): void {
  if (gezeichnet.get(el) === html) return;
  el.innerHTML = html;
  gezeichnet.set(el, html);
}

/**
 * Reiter nachführen, ohne die Seite neu zu zeichnen: Ändert sich der Aufbau einer Werkstatt
 * (Auftrag fertig, neuer Zyklus), kommt ihre Gruppe neu. Zutaten und die Zeile mit Restzeiten
 * werden an Ort und Stelle ersetzt, die Knöpfe bleiben stehen. `sofort` zeichnet die Gruppe immer neu.
 */
export function aktualisiereCrafting(panel: HTMLElement, state: GameState, sofort?: string): void {
  panel.querySelectorAll<HTMLElement>('.craft-group[data-gruppe]').forEach(gruppe => {
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

/**
 * Ein Listener für den ganzen Reiter, weil Gruppen neu gezeichnet werden: «+ Auftrag» gibt den
 * Auftrag gleich hier, sonst öffnet die Karte die Werkstatt (gesperrt: Bau-Dialog).
 */
export function bindCraftingTab(panel: HTMLElement, state: GameState, cb: CraftingCallbacks): void {
  panel.addEventListener('click', (e) => {
    const ziel = e.target as HTMLElement;
    const card = ziel.closest('.ccard') as HTMLElement | null;
    const { rcp, btype } = card?.dataset ?? {};
    if (!rcp || !btype) return;
    if (ziel.closest('[data-craft-add]')) {
      const b = dasGebaeude(state, btype);
      if (b && auftragGeben(b, rcp)) aktualisiereCrafting(panel, state, btype);
      return;
    }
    if (dasGebaeude(state, btype)) cb.oeffneWerkstatt(btype, rcp);
    else cb.bauen(btype);
  });
}
