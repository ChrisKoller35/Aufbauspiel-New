// ─── Magic City – Werkstatt im Gebäude-Fenster ──────────────────
// Auftragsliste (laufender Auftrag mit Balken, wartende, was die
// Werkstatt von selbst macht) und die Rezepte mit «+ Auftrag». Dazu die
// Texte, die auch der Reiter «Crafting» braucht: Zutaten-Chips, worauf
// der nächste Auftrag wartet, Restzeiten. Nur HTML; Klicks bindet
// GebaeudeFenster.ts. Alle Werkstätten arbeiten auf Auftrag
// (systems/Auftraege.ts, systems/Werkstattplan.ts).
// ────────────────────────────────────────────────────────────────

import { BUILDING_DEFS } from '../../data/buildings';
import { RECIPE_DEFS, RecipeDef } from '../../data/recipes';
import { GameState } from '../../models/GameState';
import { BuildingInstance } from '../../models/Building';
import {
  itemName, cycleProgress, einzelStatus, grundText, gebaeudeName, nachschub, nachschubText, lieferantFuer,
} from '../../systems/GebaeudeStatus';
import { zyklusSekunden } from '../../systems/Ausbau';
import {
  MAX_AUFTRAEGE, auftragsListe, hatAuftragsliste, kannAuftragGeben, restzeitSekunden, laeuftAuftrag, rezeptFuer,
} from '../../systems/Auftraege';
import { laufendVonSelbst, vonSelbstSatz, fehlendeZutaten } from '../../systems/Werkstattplan';

/** Zeichen der Waren auf Rezeptkarten und in der Auftragsliste. */
export function itemIcon(key: string): string {
  const map: Record<string, string> = {
    bread: '🍞', power_bread: '🥖', herb_green: '🌿',
    healing_potion: '⚗️', iron_scrap: '⚙️',
    iron_sword: '⚔️', iron_shield: '🛡️',
    leather_armor: '🧥', crystal_shard: '💎',
    steel_sword: '⚔️', longbow: '🏹', crystal_staff: '🪄', steel_armor: '🛡️',
  };
  return map[key] ?? '📦';
}

export function sekundenText(sek: number): string {
  const s = Math.ceil(sek);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s}s`;
}

/** «3/5 · gesamt noch 2:10 min» */
export function restzeitText(b: BuildingInstance, state: GameState): string {
  const liste = auftragsListe(b);
  if (liste.length === 0) return `0/${MAX_AUFTRAEGE}`;
  return `${liste.length}/${MAX_AUFTRAEGE} · gesamt noch ${sekundenText(restzeitSekunden(b, state))}`;
}

/** Warum eine freie Werkstatt ohne Auftrag ruht oder wartet, kurz. */
export function ruheText(state: GameState, b: BuildingInstance): string {
  const st = einzelStatus(state, b);
  if (st.laeuft) return `startet gleich: ${st.text ?? st.recipe?.name ?? ''}`;
  const g = st.grund;
  if (!g || g.art === 'auftrag') return 'Keine Aufträge';
  return `Keine Aufträge · ${grundText(g)}`;
}

/**
 * Worauf der nächste Auftrag wartet: eine Zutat aus der eigenen Vorstufe oder von einer anderen
 * Werkstatt, oder eine Zutat, die nicht von selbst kommt (Gold, Beute, ein Gebäude fehlt).
 * `warn` = der Spieler muss etwas tun.
 */
export function auftragWartetText(state: GameState, b: BuildingInstance, recipe: RecipeDef | undefined): { text: string; warn: boolean } {
  if (!recipe) return { text: '', warn: false };
  const fehlend = fehlendeZutaten(state, recipe).map(z => ({ ...z, n: nachschub(state, z.item) }));
  if (fehlend.length === 0) return { text: b.producing ? 'Startet danach' : 'Startet beim nächsten Takt…', warn: false };
  const x = fehlend.find(z => !z.n.kommt) ?? fehlend[0];
  const menge = recipe.inputs[x.item];
  const zahl = `${menge - x.fehlt}/${menge}`;
  const ware = itemName(x.item);
  if (!x.n.kommt) return { text: `fehlt: ${ware} ${zahl} · ${nachschubText(x.item, x.n)}`, warn: true };
  if (rezeptFuer(b, x.item)) return { text: `zuerst ${ware} (${zahl})`, warn: false };
  return { text: `wartet auf ${ware} ${zahl} (${gebaeudeName(lieferantFuer(x.item) ?? x.n.von)})`, warn: false };
}

/** Ergebnis und Zutaten als Chips (Bestand/benötigt): grün reicht, gelb ↻ kommt von selbst, rot fehlt. */
export function renderRecipeChips(rcp: RecipeDef, state: GameState, b: BuildingInstance | null): string {
  const outHTML = Object.entries(rcp.outputs)
    .map(([key, qty]) => `<span class="ingr ingr-out">→ ${qty}× ${itemName(key)}</span>`)
    .join('');
  const inEntries = Object.entries(rcp.inputs);
  const inHTML = inEntries.length === 0
    ? '<span class="ingr">Keine Zutaten</span>'
    : inEntries.map(([key, qty]) => {
        const have = state.globalStock[key] ?? 0;
        const n = have < qty && !!b ? nachschub(state, key) : null;
        const cls = have >= qty ? 'cost-ok' : n?.kommt ? 'cost-auto' : 'cost-miss';
        const titel = n ? ` title="${n.kommt ? 'fehlt noch, ' : 'fehlt: '}${nachschubText(key, n)}"` : '';
        return `<span class="ingr ${cls}"${titel}>${itemName(key)} ${Math.floor(have)}/${qty}${n?.kommt ? ' ↻' : ''}</span>`;
      }).join('');
  return outHTML + inHTML;
}

/** Balken mit Restzeit des laufenden Zyklus (Auftrag oder von selbst). */
function laufBalken(b: BuildingInstance, recipe: RecipeDef): string {
  const pct = Math.round(cycleProgress(b, recipe) * 100);
  return `
        <div class="ws-bar"><div class="ws-bar-fill" style="width:${pct}%"></div></div>
        <div class="ws-bar-txt">noch ${Math.ceil(b.productionTimer)}s</div>`;
}

function rezeptKopf(recipe: RecipeDef, name: string, rechts: string): string {
  return `
        <div class="ws-rcp-hd">
          <span class="cico">${itemIcon(Object.keys(recipe.outputs)[0] ?? '')}</span>
          <span class="ws-rcp-nm">${name}</span>
          ${rechts}
        </div>`;
}

/**
 * Auftragsliste einer Werkstatt: was sie gerade von selbst macht (ohne ✕), der laufende
 * Auftrag mit Balken, dann die wartenden; darunter, was sie ohne Auftrag von selbst macht.
 */
function renderAuftragsliste(b: BuildingInstance, state: GameState): string {
  const liste = auftragsListe(b);
  const laeuft = laeuftAuftrag(b);
  const kopf = `<div class="ws-active">AUFTRÄGE <span class="ws-rest">${restzeitText(b, state)}</span></div>`;
  const selbst = laufendVonSelbst(b);
  const laufend = b.producing && b.activeRecipeId ? RECIPE_DEFS[b.activeRecipeId] : undefined;
  const selbstZeile = selbst && laufend ? `
      <div class="ws-auf ws-selbst on">
        ${rezeptKopf(laufend, selbst, '<span class="ws-von-selbst">von selbst</span>')}
        ${laufBalken(b, laufend)}
      </div>` : '';
  const satz = vonSelbstSatz(b.typeId);
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
      unten = laufBalken(b, recipe);
    } else if (i === 0) {
      const warten = auftragWartetText(state, b, recipe);
      unten = `<div class="ws-msg${warten.warn ? ' ws-warn' : ''}">${warten.text}</div>`;
    } else {
      unten = `<div class="ws-msg">wartet · ⏱ ${Math.round(zyklusSekunden(b, recipe))}s</div>`;
    }
    const abbrechen = `<button class="ws-cancel" data-ws-cancel="${i}" title="Abbrechen${laeuftDieser ? ' (Zutaten zurück)' : ''}">✕</button>`;
    return `
      <div class="ws-auf${laeuftDieser ? ' on' : ''}">
        ${rezeptKopf(recipe, `${i + 1}. ${recipe.name}`, abbrechen)}
        ${unten}
      </div>`;
  }).join('');
  return `${kopf}<div class="ws-list">${selbstZeile}${zeilen}</div>${erklaerung}`;
}

/** Werkstatt-Teil des Gebäude-Fensters: Auftragsliste und Rezepte; leer für Gebäude ohne Rezepte. */
export function renderWorkshop(b: BuildingInstance, state: GameState, highlightId: string | null): string {
  const def = BUILDING_DEFS[b.typeId];
  const recipes = def.recipes.map(id => RECIPE_DEFS[id]).filter((r): r is RecipeDef => !!r);
  if (recipes.length === 0 || !hatAuftragsliste(b)) return '';

  const rows = recipes.map(rcp => {
    const geht = kannAuftragGeben(b, rcp.id);
    const rechts = `<span class="ccard-time">⏱ ${Math.round(zyklusSekunden(b, rcp))}s</span>
          <button class="btn-craft ws-add" data-ws-add="${rcp.id}"${geht ? '' : ' disabled'}>+ AUFTRAG</button>`;
    return `
      <div class="ws-rcp ws-rcp-auf${rcp.id === highlightId ? ' hl' : ''}">
        ${rezeptKopf(rcp, rcp.name, rechts)}
        <div class="cingr">${renderRecipeChips(rcp, state, b)}</div>
      </div>`;
  }).join('');

  return `
    <div class="ws">
      <span class="lbl">WERKSTATT</span>
      <div class="ws-status">${renderAuftragsliste(b, state)}</div>
      <span class="lbl">REZEPTE – Zutaten werden beim Start eines Auftrags abgezogen</span>
      <div class="ws-list">${rows}</div>
    </div>`;
}
