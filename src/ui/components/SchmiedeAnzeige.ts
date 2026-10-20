// ─── Magic City – Anzeige der Schmiede ──────────────────────────
// Kleine Bausteine für Heldenseite, Inventar, Sets, Truhe und Karte: das «+3» an
// verbesserten Set-Teilen, die Stufen-Punkte, Material mit Bild und die Zeile
// «⚒️ Glutkern · 6 je Sieg» für Dungeons. Der Tab selbst: ui/screens/SchmiedeTab.ts.
// ────────────────────────────────────────────────────────────────

import '../html/schmiede.css';
import { GameState } from '../../models/GameState';
import { ITEM_DEFS, ItemDef } from '../../data/items';
import { ROUTE_DEFS } from '../../data/routes';
import { MAX_SCHMIEDE_STUFE, SCHMIEDE_MATERIALIEN, SchmiedeMaterialDef, getMaterial } from '../../data/schmiede';
import { SchmiedeStufen, materialJeSieg, werteMitStufe } from '../../systems/Schmiede';

type Werte = NonNullable<ItemDef['statBonuses']>;

/** Text sicher in ein HTML-Attribut oder zwischen Tags setzen */
export function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Farbe der Stufe: +1/+2 Bronze, +3/+4 Silber, +5 Gold */
export function stufenKlasse(stufe: number): string {
  return stufe >= MAX_SCHMIEDE_STUFE ? 'gold' : stufe >= 3 ? 'silber' : 'bronze';
}

/** «+3» in der Ecke eines Gegenstandsbilds (leer bei Stufe 0) */
export function stufeAbzeichen(stufen: SchmiedeStufen | undefined, itemId: string | null): string {
  const stufe = itemId ? stufen?.[itemId] ?? 0 : 0;
  return stufe > 0 ? `<span class="schmiede-plus ${stufenKlasse(stufe)}">+${stufe}</span>` : '';
}

/** «Rudelreisser +3» */
export function nameMitStufe(itemId: string, stufen?: SchmiedeStufen): string {
  const name = ITEM_DEFS[itemId]?.name ?? itemId;
  const stufe = stufen?.[itemId] ?? 0;
  return stufe > 0 ? `${name} +${stufe}` : name;
}

/** Fünf Punkte: erreichte Stufen gefüllt */
export function stufenPunkte(stufe: number): string {
  const punkte = Array.from({ length: MAX_SCHMIEDE_STUFE }, (_, i) =>
    `<span class="schmiede-punkt${i < stufe ? ` an ${stufenKlasse(stufe)}` : ''}"></span>`).join('');
  return `<span class="schmiede-punkte" title="Stufe ${stufe} von ${MAX_SCHMIEDE_STUFE}">${punkte}</span>`;
}

/** Bild eines Materials */
export function materialBild(material: SchmiedeMaterialDef, klasse = 'mat-bild'): string {
  return `<img src="assets/sprites/final/${material.bild}.png" class="${klasse}" alt="" onerror="this.style.visibility='hidden'">`;
}

/** Die Dungeons, in denen ein Material fällt, als Namen */
export function materialFundorte(material: SchmiedeMaterialDef): string {
  return material.routen.map(id => ROUTE_DEFS[id]?.name ?? id).join(', ');
}

/** «Glutkern: 6 je Sieg» für Karte und Routenliste */
export function materialZeile(routeId: string): string {
  const jeSieg = materialJeSieg(routeId);
  if (!jeSieg) return '';
  return `<span class="mat-zeile" title="${escapeAttr(jeSieg.material.text)}">${materialBild(jeSieg.material, 'mat-bild klein')}`
    + `<b>${jeSieg.material.name}</b>&nbsp;· ${jeSieg.menge} je Sieg</span>`;
}

const STAT_ZEILEN: [keyof Werte, string, (v: number) => string][] = [
  ['atk', 'ATK', v => `${v}`],
  ['def', 'DEF', v => `${v}`],
  ['hp', 'HP', v => `${v}`],
  ['spd', 'SPD', v => `${v > 0 ? '+' : ''}${v}`],
  ['critChance', 'CRIT', v => `${Math.round(v * 100)} %`],
];

/** «ATK 5 → 6 · CRIT 5 % → 6 %»: was sich von einer Stufe zur nächsten ändert */
export function werteSprungHtml(vorher: Werte | undefined, nachher: Werte | undefined): string {
  if (!vorher || !nachher) return '';
  return STAT_ZEILEN
    .filter(([k]) => (nachher[k] ?? 0) !== 0 || (vorher[k] ?? 0) !== 0)
    .map(([k, name, fmt]) => {
      const a = vorher[k] ?? 0;
      const b = nachher[k] ?? 0;
      return a === b
        ? `<span class="sprung gleich">${name} ${fmt(b)}</span>`
        : `<span class="sprung">${name} ${fmt(a)} → <b>${fmt(b)}</b></span>`;
    }).join('');
}

/** Werte mit Stufe als «+7 ATK, +5 % CRIT» (wie gearStatsSummary auf der Heldenseite) */
export function werteKurz(itemId: string, stufen?: SchmiedeStufen): string {
  const werte = werteMitStufe(itemId, stufen);
  if (!werte) return '';
  const vz = (n: number): string => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
  const teile: string[] = [];
  if (werte.atk) teile.push(`${vz(werte.atk)} ATK`);
  if (werte.def) teile.push(`${vz(werte.def)} DEF`);
  if (werte.hp) teile.push(`${vz(werte.hp)} HP`);
  if (werte.spd) teile.push(`${vz(werte.spd)} SPD`);
  if (werte.critChance) teile.push(`${vz(Math.round(werte.critChance * 100))} % CRIT`);
  return teile.join(', ');
}

/**
 * Zeilen für die Truhe: Set-Teile mit Stufe bekommen «⚒️ +2» angehängt (die Stufe gilt auch für
 * das neue Exemplar), das Material sagt, wofür es ist.
 */
export function truhenHinweise(state: GameState, hinweise: Record<string, string>, materialId: string | null): Record<string, string> {
  const stufen = state.schmiede?.stufen ?? {};
  const neu: Record<string, string> = { ...hinweise };
  for (const [itemId, text] of Object.entries(hinweise)) {
    const stufe = stufen[itemId] ?? 0;
    if (stufe > 0) neu[itemId] = `${text} · ⚒️ +${stufe}`;
  }
  const material = materialId ? getMaterial(materialId) : undefined;
  if (material) neu[material.id] = `⚒️ Für die Schmiede: Set-Teile ${material.ausGebiet}`;
  return neu;
}

/** Alle Materialien mit Bestand, für den Kopf der Schmiede */
export function materialLeisteHtml(state: GameState): string {
  return SCHMIEDE_MATERIALIEN.map(m => {
    const n = state.globalStock[m.id] ?? 0;
    return `<div class="mat-chip${n > 0 ? '' : ' leer'}" title="${escapeAttr(`${m.name}: fällt in ${materialFundorte(m)}`)}">`
      + `${materialBild(m)}<span class="mat-chip-zahl">${n}</span><span class="mat-chip-name">${m.name}</span></div>`;
  }).join('');
}
