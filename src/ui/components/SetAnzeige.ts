// ─── Magic City – Anzeige der Dungeon-Sets ──────────────────────
// Gemeinsame Bausteine für Heldenseite, Sammlung, Truhe, Routen und Karte:
// Set-Boni mit aktiv/inaktiv, Kurzinfo «🐺 Rudel des Waldpfads 1/3» und Tooltips.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { DUNGEON_SETS, DungeonSetDef, SET_TEIL_NAMEN, setTeilIds, setVonItem, setWerteText } from '../../data/dungeonSets';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { ROUTE_DEFS, isRouteAvailable, isRouteCompleted } from '../../data/routes';
import { gesammelteTeile, setChance } from '../../systems/DungeonSets';

/** Die zwei Bonus-Zeilen eines Sets; getragen = so viele Teile trägt der Held (für aktiv/inaktiv) */
export function setBoniHtml(set: DungeonSetDef, getragen = 0): string {
  const zwei = `<div class="set-bonus${getragen >= 2 ? ' aktiv' : ''}"><b>2 Teile:</b> ${setWerteText(set.zweiTeile)}</div>`;
  const drei = `<div class="set-bonus${getragen >= 3 ? ' aktiv' : ''}"><b>3 Teile: ${set.dreiTeile.name}</b> – ${set.dreiTeile.text}</div>`;
  return zwei + drei;
}

/** «🐺 Rudel des Waldpfads · 1 von 3» für Routen-Karten und Dungeon-Karte */
export function setKurzinfo(state: GameState, set: DungeonSetDef, mitChance = false): string {
  const n = gesammelteTeile(state, set).length;
  const chance = mitChance ? ` · ${Math.round(setChance(state, set, 'normal') * 100)} % pro Sieg` : '';
  return `${set.zeichen} ${set.name} · ${n === 3 ? 'komplett ✓' : `${n} von 3`}${chance}`;
}

/** Text für title-Attribute: Name, Werte, Set und Boni (mehrzeilig) */
export function setTooltip(itemId: string): string {
  const set = setVonItem(itemId);
  if (!set) return '';
  return [
    `Set: ${set.zeichen} ${set.name}`,
    `2 Teile: ${setWerteText(set.zweiTeile)}`,
    `3 Teile: ${set.dreiTeile.name} – ${set.dreiTeile.text}`,
  ].join('\n');
}

/** Kleines Abzeichen mit dem Set-Zeichen für Bilder von Set-Teilen */
export function setAbzeichen(itemId: string | null): string {
  const set = setVonItem(itemId);
  return set ? `<span class="set-abzeichen" title="${set.name}">${set.zeichen}</span>` : '';
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Die drei Teile als Bilder: gesammelte farbig, fehlende als Schatten */
export function setTeileHtml(state: GameState, set: DungeonSetDef): string {
  const gesammelt = new Set(gesammelteTeile(state, set));
  return setTeilIds(set).map((id, i) => {
    const def = ITEM_DEFS[id];
    const hat = gesammelt.has(id);
    const teil = set.teile[i];
    const titel = escapeAttr(`${def.name} (${SET_TEIL_NAMEN[teil.art]})${hat ? '' : ' – noch nicht gefunden'}\n«${teil.text}»`);
    return `
      <div class="set-teil${hat ? ' hat' : ''}" title="${titel}">
        <img src="assets/sprites/final/${getItemSpriteKey(id)}.png" onerror="this.style.display='none'">
        <span class="set-teil-name">${hat ? def.name : SET_TEIL_NAMEN[teil.art]}</span>
      </div>`;
  }).join('');
}

/** Sammlung aller Dungeon-Sets (Tab «Sets» auf der Heldenseite) */
export function setSammlungHtml(state: GameState): string {
  let teileGesamt = 0;
  let komplett = 0;
  for (const set of DUNGEON_SETS) {
    const n = gesammelteTeile(state, set).length;
    teileGesamt += n;
    if (n === 3) komplett++;
  }

  const ebenen = [...new Set(DUNGEON_SETS.map(s => s.tier))].sort((a, b) => a - b);
  const abschnitte = ebenen.map(tier => {
    const karten = DUNGEON_SETS.filter(s => s.tier === tier).map(set => {
      const route = ROUTE_DEFS[set.routeId];
      const n = gesammelteTeile(state, set).length;
      const offen = route ? isRouteAvailable(route, state) || isRouteCompleted(route.id, state) : false;
      return `
        <div class="set-karte${n === 3 ? ' komplett' : ''}${offen ? '' : ' gesperrt'}">
          <div class="set-karte-kopf">
            <span class="set-zeichen">${set.zeichen}</span>
            <div class="set-karte-titel">
              <div class="set-name">${set.name}</div>
              <div class="set-ort">${offen ? '' : '🔒 '}${route?.name ?? set.routeId}</div>
            </div>
            <span class="set-zahl">${n}/3</span>
          </div>
          <div class="set-teile">${setTeileHtml(state, set)}</div>
          ${setBoniHtml(set)}
        </div>`;
    }).join('');
    return `<div class="sets-ebene">Ebene ${tier}</div><div class="sets-grid">${karten}</div>`;
  }).join('');

  return `
    <div class="sets-kopf">
      <div class="sets-zahlen"><b>${teileGesamt}</b> von ${DUNGEON_SETS.length * 3} Set-Teilen · <b>${komplett}</b> von ${DUNGEON_SETS.length} Sets komplett</div>
      <div class="sets-erklaerung">Jeder Dungeon lässt sein eigenes Set fallen: Ein Sieg bringt ein Teil, fehlende Teile zuerst. Der erste Sieg bringt sicher eins, danach ist es Glückssache (schwerere Stufen erhöhen die Chance). Zwei Teile geben Werte, alle drei die Set-Fähigkeit, die im Kampf grün aufleuchtet.</div>
    </div>
    ${abschnitte}`;
}
