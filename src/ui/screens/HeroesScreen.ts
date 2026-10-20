// ─── Magic City – Heroes Screen ─────────────────────────────────
// Shows the player's heroes with stats, gear, and hire/train options.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { GuildFighter, FighterStats } from '../../models/GuildRoster';
import { CLASS_DEFS, ClassDef, HERO_IMAGE_MAP } from '../../data/classes';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { itemEigenschaften } from '../../data/specialEffects';
import { setVonItem } from '../../data/dungeonSets';
import { GearSystem, EquipSlot } from '../../systems/GearSystem';
import { getrageneSets, istMeisterset } from '../../systems/DungeonSets';
import { SchmiedeStufen, schmiedeStufe, schmiedeStufen } from '../../systems/Schmiede';
import { MAX_SCHMIEDE_STUFE } from '../../data/schmiede';
import { setAbzeichen, setBoniHtml, setSammlungHtml, setTooltip } from '../components/SetAnzeige';
import { nameMitStufe, stufeAbzeichen, werteKurz } from '../components/SchmiedeAnzeige';
import { bindSchmiedeTab, schmiedeTabHtml, schmiedeTabVerlassen, schmiedeZeigeTeil } from './SchmiedeTab';
import { wegAbzeichen, wegBereichHtml } from '../components/WegAnzeige';
import { waehleWeg } from '../../systems/Spezialisierung';
import { ClassUnlockSystem } from '../../systems/ClassUnlockSystem';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { xpProgress, xpForNextLevel, totalXpForLevel, MAX_HERO_LEVEL } from '../../systems/HeroProgression';

const gearSystem = new GearSystem();
const classUnlockSystem = new ClassUnlockSystem();

// ─── State ──────────────────────────────────────────────────────
let gameState: GameState | null = null;

export function initHeroesScreen(state: GameState): void {
  gameState = state;
}

// ─── Helpers ────────────────────────────────────────────────────

const ROLE_EMOJI: Record<string, string> = {
  tank: '\uD83D\uDEE1\uFE0F',
  dps: '\u2694\uFE0F',
  healer: '\uD83D\uDC9A',
  support: '\u2728',
};

function getHeroImageStyle(classId: string): string {
  const img = HERO_IMAGE_MAP[classId];
  return img ? `background-image:url('assets/heroes/${img}.png')` : '';
}

function emojiForClass(classDef: ClassDef): string {
  return ROLE_EMOJI[classDef.role] ?? '\u2694\uFE0F';
}

function gearName(itemId: string | null): string {
  if (!itemId) return '—';
  return ITEM_DEFS[itemId] ? nameMitStufe(itemId, stufen()) : itemId;
}

/** Stufen der Schmiede: verbesserte Set-Teile zeigen ihre höheren Werte und ein «+3» */
function stufen(): SchmiedeStufen | undefined {
  return gameState ? schmiedeStufen(gameState) : undefined;
}

function vorzeichen(n: number): string {
  return n > 0 ? `+${n}` : `\u2212${Math.abs(n)}`;
}

/** «+7 ATK, +5 % CRIT», mit der Stufe aus der Schmiede */
function gearStatsSummary(itemId: string | null): string {
  return itemId ? werteKurz(itemId, stufen()) : '';
}

/** Eigenschaften eines Gegenstands (Doppelschlag, Reflexion …) als Zeilen für title-Attribute */
function eigenschaftenText(itemId: string | null): string {
  if (!itemId) return '';
  return itemEigenschaften(ITEM_DEFS[itemId]?.tags ?? []).map(e => `${e.name}: ${e.description}`).join('\n');
}

/** Eigenschaften, die ein Held durch seine Gegenstände hat (ohne Set-Fähigkeiten) */
function eigenschaftenVon(fighter: GuildFighter): Map<string, { name: string; description: string }> {
  const liste = new Map<string, { name: string; description: string }>();
  for (const platz of ['mainHand', 'offHand', 'armor', 'trinket'] as const) {
    const itemId = fighter.gear[platz];
    if (!itemId) continue;
    for (const e of itemEigenschaften(ITEM_DEFS[itemId]?.tags ?? [])) liste.set(e.id, e);
  }
  return liste;
}

// ─── Tab IDs ────────────────────────────────────────────────────
type HeroTab = 'my' | 'hire' | 'train' | 'inventar' | 'sets' | 'schmiede';

let activeTab: HeroTab = 'my';

// ─── Hero Card HTML ─────────────────────────────────────────────

function renderHeroCard(fighter: GuildFighter, mode: 'my' | 'train'): string {
  const classDef = CLASS_DEFS[fighter.classId];
  const className = classDef ? classDef.name : fighter.classId;
  const emoji = classDef ? emojiForClass(classDef) : '\u2694\uFE0F';
  const spriteKey = classDef ? classDef.spriteKey : '';
  const pct = fighter.level >= MAX_HERO_LEVEL ? 100 : Math.round(xpProgress(fighter) * 100);
  const xpLabel = fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${pct}%`;

  const trainingCost = 20 + fighter.level * 10;
  const actionBtn = mode === 'train'
    ? `<button class="btn btn-sm btn-train" data-fighter-id="${fighter.id}" data-cost="${trainingCost}">TRAINIEREN (${trainingCost}G)</button>`
    : '';

  const hasImage = !!HERO_IMAGE_MAP[fighter.classId];
  const bgStyle = getHeroImageStyle(fighter.classId);

  if (hasImage) {
    // Image card: full illustration background, name overlay at bottom
    return `
      <div class="hcard hcard-img" data-fighter-id="${fighter.id}" style="${bgStyle}">
        <div class="hcard-overlay">
          <div class="hc-nm">${className}</div>
          <span class="hc-lv">Lv ${fighter.level}</span>
          ${wegAbzeichen(fighter)}
          ${actionBtn}
        </div>
      </div>`;
  }

  // Fallback: sprite-based card (for classes without illustrations)
  return `
    <div class="hcard" data-fighter-id="${fighter.id}">
      <div class="hc-ico">
        <img src="assets/sprites/final/${spriteKey}.png" class="hc-sprite"
             onerror="this.style.display='none'">
        <span class="hc-emoji">${emoji}</span>
      </div>
      <div class="hc-nm">${fighter.name}</div>
      <div class="hc-cl">${className}</div>
      <span class="hc-lv">Lv ${fighter.level}</span>
      ${wegAbzeichen(fighter)}
      <div class="lvbar"><div class="lvfill" style="width:${pct}%"></div></div>
      <div class="hc-xp">${xpLabel}</div>
      <div class="hc-st">
        <span>\u2694 ${fighter.baseStats.atk}</span>
        <span>\uD83D\uDEE1 ${fighter.baseStats.def}</span>
        <span>\u2764 ${fighter.baseStats.hp}/${fighter.baseStats.maxHp}</span>
      </div>
      ${actionBtn}
    </div>`;
}

// ─── Hire Card (template for recruitable heroes) ────────────────

function renderHireCard(classDef: ClassDef, cost: number): string {
  const emoji = emojiForClass(classDef);
  const hasImage = !!HERO_IMAGE_MAP[classDef.id];
  const bgStyle = getHeroImageStyle(classDef.id);

  if (hasImage) {
    return `
      <div class="hcard-wrap">
        <div class="hcard hcard-img" style="${bgStyle}">
          <div class="hcard-overlay">
            <div class="hc-nm">${classDef.name}</div>
          </div>
        </div>
        <div class="hcard-footer">
          <span class="hc-cost">\uD83D\uDCB0 ${cost} Gold</span>
          <button class="btn btn-sm btn-hire" data-class-id="${classDef.id}"
                  data-cost="${cost}">ANHEUERN</button>
        </div>
      </div>`;
  }

  return `
    <div class="hcard-wrap">
      <div class="hcard hcard-hire">
        <div class="hc-ico">
          <img src="assets/sprites/final/${classDef.spriteKey}.png" class="hc-sprite"
               onerror="this.style.display='none'">
          <span class="hc-emoji">${emoji}</span>
        </div>
        <div class="hc-nm">${classDef.name}</div>
        <div class="hc-cl">${classDef.role}</div>
        <span class="hc-lv">Lv 1</span>
        <div class="hc-st">
          <span>\u2694 ${classDef.baseStats.atk}</span>
          <span>\uD83D\uDEE1 ${classDef.baseStats.def}</span>
          <span>\u2764 ${classDef.baseStats.hp}</span>
        </div>
      </div>
      <div class="hcard-footer">
        <span class="hc-cost">\uD83D\uDCB0 ${cost} Gold</span>
        <button class="btn btn-sm btn-hire" data-class-id="${classDef.id}"
                data-cost="${cost}">ANHEUERN</button>
      </div>
    </div>`;
}

// ─── Hero Detail Modal ──────────────────────────────────────────

// ─── Shared data builders for detail modals ─────────────────────

function buildModalData(fighter: GuildFighter) {
  const classDef = CLASS_DEFS[fighter.classId];
  const className = classDef ? classDef.name : fighter.classId;
  const heroImg = HERO_IMAGE_MAP[fighter.classId];
  const portraitUrl = heroImg ? `assets/heroes/${heroImg}.png` : '';
  const pct = fighter.level >= MAX_HERO_LEVEL ? 100 : Math.round(xpProgress(fighter) * 100);
  const xpLabel = fighter.level >= MAX_HERO_LEVEL ? 'MAX' : `${pct}%`;

  const gearSlots: { label: string; emoji: string; key: string | null; slot: string }[] = [
    { label: 'Haupthand', emoji: '\u2694\uFE0F', key: fighter.gear.mainHand, slot: 'mainHand' },
    { label: 'Nebenhand', emoji: '\uD83D\uDEE1\uFE0F', key: fighter.gear.offHand, slot: 'offHand' },
    { label: 'R\u00FCstung', emoji: '\uD83D\uDC55', key: fighter.gear.armor, slot: 'armor' },
    { label: 'Talisman', emoji: '\uD83D\uDC8D', key: fighter.gear.trinket, slot: 'trinket' },
  ];

  return { classDef, className, portraitUrl, pct, xpLabel, gearSlots };
}

function gearSlotIconHtml(slot: { label: string; emoji: string; key: string | null; slot: string }): string {
  const gewaehlt = auswahl?.art === 'slot' && auswahl.slot === slot.slot ? ' gewaehlt' : '';
  if (!slot.key) {
    return `<button class="hdm-gear-icon hdm-gear-empty${gewaehlt}" data-slot="${slot.slot}" title="${slot.label}: leer"><span class="hdm-gear-emoji">${slot.emoji}</span></button>`;
  }
  const def = ITEM_DEFS[slot.key];
  const sprKey = getItemSpriteKey(slot.key);
  const titel = [gearName(slot.key), gearStatsSummary(slot.key), eigenschaftenText(slot.key), setTooltip(slot.key)].filter(Boolean).join('\n');
  return `<button class="hdm-gear-icon ${rarityClass(def?.tags ?? [])}${gewaehlt}" data-slot="${slot.slot}" title="${titel}"><img src="assets/sprites/final/${sprKey}.png" onerror="this.style.display='none'">${setAbzeichen(slot.key)}${stufeAbzeichen(stufen(), slot.key)}</button>`;
}

// ─── Auswahl, Vergleich und Set-Boni im Heldenfenster ───────────

/**
 * Was im Heldenfenster ausgewählt ist: ein Platz am Helden oder ein Gegenstand aus dem Inventar.
 * platz: der zuvor angetippte Platz; der Gegenstand kommt dann dorthin (z. B. die Haupthand).
 */
type Auswahl = { art: 'slot'; slot: EquipSlot } | { art: 'inventar'; itemId: string; platz?: EquipSlot };
let auswahl: Auswahl | null = null;
let inventarOffen = false;
/** Weg, dessen Wahl im Heldenfenster gerade bestätigt werden soll */
let wegFrage: string | null = null;

const PLATZ_NAMEN: Record<EquipSlot, string> = {
  mainHand: 'Haupthand', offHand: 'Nebenhand', armor: 'Rüstung', trinket: 'Talisman',
};

function artText(itemId: string): string {
  const def = ITEM_DEFS[itemId];
  if (!def) return '';
  const art = def.weaponSlotType === '2h' ? 'Zweihandwaffe'
    : def.weaponSlotType === '1h' ? 'Einhandwaffe'
    : def.weaponSlotType === 'shield' ? 'Schild'
    : def.gearSlot === 'armor' ? 'Rüstung'
    : def.gearSlot === 'trinket' ? 'Schmuck' : 'Ausrüstung';
  return [art, def.tier ? `Ebene ${def.tier}` : '', setVonItem(itemId) ? 'Set-Teil' : rarityLabel(def.tags)]
    .filter(Boolean).join(' · ');
}

const PLATZ_IN: Record<EquipSlot, string> = {
  mainHand: 'in die Haupthand', offHand: 'in die Nebenhand', armor: 'als Rüstung', trinket: 'als Talisman',
};

/** Der angetippte Platz, in den ein Gegenstand aus dem Inventar kommen soll */
function wunschPlatz(): EquipSlot | undefined {
  return auswahl?.art === 'slot' ? auswahl.slot : auswahl?.platz;
}

/** Der Held, wie er mit diesem Gegenstand aussähe (null: passt gerade nicht) */
function mitGegenstand(fighter: GuildFighter, itemId: string, wunsch?: EquipSlot): GuildFighter | null {
  const slot = gearSystem.resolveEquipSlot(fighter, itemId, wunsch);
  if (!slot) return null;
  const def = ITEM_DEFS[itemId];
  const gear = { ...fighter.gear };
  if (def?.gearSlot === 'mainHand' && def.weaponSlotType === '2h') gear.offHand = null;
  gear[slot] = itemId;
  return { ...fighter, gear };
}

const WERT_ZEILEN: [keyof FighterStats, string, (n: number) => string][] = [
  ['atk', 'ATK', n => vorzeichen(n)],
  ['def', 'DEF', n => vorzeichen(n)],
  ['maxHp', 'HP', n => vorzeichen(n)],
  ['spd', 'SPD', n => vorzeichen(Math.round(n * 100) / 100)],
  ['critChance', 'CRIT', n => `${vorzeichen(Math.round(n * 100))} %`],
  ['critMult', 'Krit-Schaden', n => `${vorzeichen(Math.round(n * 100))} %`],
];

/** «ATK +3 · DEF −2» und was sich bei den Sets ändert, wenn aus vorher nachher wird */
function vergleichHtml(vorher: GuildFighter, nachher: GuildFighter): string {
  const a = gearSystem.getEffectiveStats(vorher, stufen());
  const b = gearSystem.getEffectiveStats(nachher, stufen());
  const werte = WERT_ZEILEN
    .map(([k, name, fmt]) => {
      const d = Math.round((b[k] - a[k]) * 100) / 100;
      return d === 0 ? '' : `<span class="${d > 0 ? 'wert-plus' : 'wert-minus'}">${name} ${fmt(d)}</span>`;
    })
    .filter(Boolean);

  const zaehle = (f: GuildFighter): Map<string, number> => new Map(getrageneSets(f.gear).map(g => [g.set.id, g.teile]));
  const vor = zaehle(vorher);
  const nach = zaehle(nachher);
  const setZeilen: string[] = [];
  for (const id of new Set([...vor.keys(), ...nach.keys()])) {
    const set = getrageneSets(nach.has(id) ? nachher.gear : vorher.gear).find(g => g.set.id === id)!.set;
    const n1 = vor.get(id) ?? 0;
    const n2 = nach.get(id) ?? 0;
    if (n2 >= 3 && n1 < 3) setZeilen.push(`<div class="wert-plus">✦ ${set.dreiTeile.name} wird aktiv (${set.zeichen} 3/3)</div>`);
    else if (n2 >= 2 && n1 < 2) setZeilen.push(`<div class="wert-plus">✦ Zwei-Teile-Bonus von ${set.zeichen} ${set.name} wird aktiv</div>`);
    if (n1 >= 3 && n2 < 3) setZeilen.push(`<div class="wert-minus">✗ ${set.dreiTeile.name} geht verloren</div>`);
    else if (n1 >= 2 && n2 < 2) setZeilen.push(`<div class="wert-minus">✗ Zwei-Teile-Bonus von ${set.zeichen} ${set.name} geht verloren</div>`);
    const m1 = istMeisterset(set, vorher.gear, stufen());
    const m2 = istMeisterset(set, nachher.gear, stufen());
    if (m2 && !m1) setZeilen.push(`<div class="wert-plus">★ Meisterset ${set.zeichen} wird aktiv</div>`);
    if (m1 && !m2) setZeilen.push(`<div class="wert-minus">✗ Meisterset ${set.zeichen} geht verloren</div>`);
  }
  // Eigenschaften der Gegenstände; was über ein Set oder ein anderes Teil bleibt, zählt nicht als Verlust
  const alle = (f: GuildFighter): Set<string> => new Set(gearSystem.getSpecialEffects(f).map(e => e.id));
  const vorherAlle = alle(vorher);
  const nachherAlle = alle(nachher);
  for (const [id, e] of eigenschaftenVon(nachher)) {
    if (!vorherAlle.has(id)) setZeilen.push(`<div class="wert-plus">✦ ${e.name} kommt dazu</div>`);
  }
  for (const [id, e] of eigenschaftenVon(vorher)) {
    if (!nachherAlle.has(id)) setZeilen.push(`<div class="wert-minus">✗ ${e.name} geht verloren</div>`);
  }
  if (werte.length === 0 && setZeilen.length === 0) return '<div class="hdm2-vergleich">Keine Veränderung.</div>';
  return `<div class="hdm2-vergleich">${werte.join(' ')}${setZeilen.join('')}</div>`;
}

/** Kasten unter dem Bild: der gewählte Gegenstand mit Werten, Vergleich und Knopf */
function auswahlHtml(fighter: GuildFighter): string {
  if (!auswahl) return '';
  const itemId = auswahl.art === 'slot' ? fighter.gear[auswahl.slot] : auswahl.itemId;
  if (!itemId) {
    const platz = auswahl.art === 'slot' ? PLATZ_NAMEN[auswahl.slot] : '';
    return `<div class="hdm2-auswahl" id="hdm2-auswahl"><div class="hdm2-auswahl-leer">${platz}: leer. Wähle im Inventar einen Gegenstand, passende leuchten hell.</div></div>`;
  }
  const def = ITEM_DEFS[itemId];
  if (!def) return '';
  const set = setVonItem(itemId);
  const getragen = set ? getrageneSets(fighter.gear).find(g => g.set.id === set.id)?.teile ?? 0 : 0;

  let vergleich: string;
  let knopf: string;
  if (auswahl.art === 'slot') {
    const ohne = { ...fighter, gear: { ...fighter.gear, [auswahl.slot]: null } };
    vergleich = `<div class="hdm2-vergleich-titel">${PLATZ_NAMEN[auswahl.slot]} · ohne dieses Teil:</div>${vergleichHtml(fighter, ohne)}`;
    knopf = `<button class="hdm2-aktion" data-aktion="ablegen">ABLEGEN</button>`;
  } else {
    const mit = mitGegenstand(fighter, itemId, auswahl.platz);
    if (mit) {
      const plaetze = Object.keys(PLATZ_NAMEN) as EquipSlot[];
      const ziel = plaetze.find(p => mit.gear[p] === itemId && fighter.gear[p] !== itemId) ?? plaetze.find(p => mit.gear[p] === itemId);
      const ersetzt = plaetze
        .filter(p => fighter.gear[p] && fighter.gear[p] !== mit.gear[p])
        .map(p => ITEM_DEFS[fighter.gear[p]!]?.name ?? fighter.gear[p]);
      const wohin = ersetzt.length ? `ersetzt ${ersetzt.join(' und ')}` : 'Platz ist frei';
      vergleich = `<div class="hdm2-vergleich-titel">${ziel ? `${PLATZ_NAMEN[ziel]}: ` : ''}${wohin}</div>${vergleichHtml(fighter, mit)}`;
      knopf = `<button class="hdm2-aktion" data-aktion="anlegen">ANLEGEN</button>`;
    } else {
      vergleich = '<div class="hdm2-vergleich wert-minus">Passt gerade nicht: Ein Schild braucht eine Einhandwaffe in der Haupthand.</div>';
      knopf = '';
    }
  }

  const schmiede = set && gameState
    ? `<button class="hdm2-schmiede-link" data-schmiede-teil="${itemId}">⚒️ ${schmiedeStufe(gameState, itemId) >= MAX_SCHMIEDE_STUFE
      ? 'In der Schmiede: höchste Stufe' : `In der Schmiede auf +${schmiedeStufe(gameState, itemId) + 1} verbessern`}</button>`
    : '';

  return `
    <div class="hdm2-auswahl" id="hdm2-auswahl">
      <div class="hdm2-auswahl-kopf">
        <div class="hdm-gear-icon ${rarityClass(def.tags)}"><img src="assets/sprites/final/${getItemSpriteKey(itemId)}.png" onerror="this.style.display='none'">${setAbzeichen(itemId)}${stufeAbzeichen(stufen(), itemId)}</div>
        <div class="hdm2-auswahl-titel">
          <div class="hdm2-auswahl-name ${rarityClass(def.tags)}">${gearName(itemId)}</div>
          <div class="hdm2-auswahl-art">${artText(itemId)}</div>
          <div class="hdm2-auswahl-werte">${gearStatsSummary(itemId)}</div>
          ${itemEigenschaften(def.tags).map(e => `<div class="hdm2-eigenschaft">✦ <b>${e.name}:</b> ${e.description}</div>`).join('')}
        </div>
        ${knopf}
      </div>
      ${vergleich}
      ${schmiede}
      ${set ? `<div class="hdm2-auswahl-set"><div class="hdm2-set-kopf">${set.zeichen} ${set.name} <span class="hdm2-set-zahl">${getragen}/3 getragen</span></div>${setBoniHtml(set, getragen)}</div>` : ''}
      ${def.flavorText ? `<div class="hdm2-auswahl-text">«${def.flavorText}»</div>` : ''}
    </div>`;
}

function buildInventoryHtml(fighter: GuildFighter): string {
  if (!gameState) return '';

  // Collect equippable gear items from globalStock
  const items: { id: string; name: string; qty: number; sprKey: string; rarCls: string; slot: string }[] = [];
  for (const [id, qty] of Object.entries(gameState.globalStock)) {
    if (qty <= 0) continue;
    const def = ITEM_DEFS[id];
    if (!def || def.type !== 'gear' || !def.gearSlot) continue;
    items.push({
      id,
      name: def.name,
      qty,
      sprKey: getItemSpriteKey(id),
      rarCls: rarityClass(def.tags),
      slot: def.gearSlot,
    });
  }

  // Sort by slot then tier
  items.sort((a, b) => {
    const slotOrder: Record<string, number> = { mainHand: 0, offHand: 1, armor: 2, trinket: 3 };
    const sa = slotOrder[a.slot] ?? 9;
    const sb = slotOrder[b.slot] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = ITEM_DEFS[a.id];
    const db = ITEM_DEFS[b.id];
    return ((db?.tier ?? 0) - (da?.tier ?? 0));
  });

  if (items.length === 0) {
    return '<div class="hdm2-inv-empty">Keine Ausrüstung im Inventar</div>';
  }

  // Ist ein Platz angetippt, treten Gegenstände für andere Plätze zurück
  const platz = wunschPlatz();
  return items.map(item => {
    const gewaehlt = auswahl?.art === 'inventar' && auswahl.itemId === item.id ? ' gewaehlt' : '';
    const mit = mitGegenstand(fighter, item.id, platz);
    const passt = !mit ? ' passt-nicht' : platz && mit.gear[platz] !== item.id ? ' anderer-platz' : '';
    const titel = [gearName(item.id), gearStatsSummary(item.id), eigenschaftenText(item.id), setTooltip(item.id)].filter(Boolean).join('\n');
    return `
    <div class="hdm2-inv-slot ${item.rarCls}${gewaehlt}${passt}" data-item-id="${item.id}" title="${titel}">
      <img src="assets/sprites/final/${item.sprKey}.png" onerror="this.style.display='none'">
      ${setAbzeichen(item.id)}${stufeAbzeichen(stufen(), item.id)}
      ${item.qty > 1 ? `<span class="hdm2-inv-qty">${item.qty}</span>` : ''}
    </div>`;
  }).join('');
}

/** Wert mit dem Anteil aus Ausrüstung und Sets: «ATK 22 +12» */
function wertHtml(symbol: string, name: string, wert: string, bonus: number, bonusText?: string): string {
  const plus = bonus !== 0 ? ` <small class="${bonus > 0 ? 'wert-plus' : 'wert-minus'}">${bonusText ?? vorzeichen(bonus)}</small>` : '';
  return `<span>${symbol} ${name} ${wert}${plus}</span>`;
}

function statsHtml(fighter: GuildFighter): string {
  const base = fighter.baseStats;
  const eff = gearSystem.getEffectiveStats(fighter, stufen());
  const spdBonus = Math.round((eff.spd - base.spd) * 100) / 100;
  const critBonus = Math.round((eff.critChance - base.critChance) * 100);
  const kritSchaden = Math.round(eff.critMult * 100) / 100;
  return `
    <div class="hdm2-stats" title="Werte mit Ausrüstung, Set-Boni und Weg; die kleine Zahl kommt von dort">
      ${wertHtml('⚔', 'ATK', String(eff.atk), eff.atk - base.atk)}
      ${wertHtml('🛡', 'DEF', String(eff.def), eff.def - base.def)}
      ${wertHtml('❤', 'HP', String(eff.maxHp), eff.maxHp - base.maxHp)}
      ${wertHtml('⚡', 'SPD', String(Math.round(eff.spd * 100) / 100), spdBonus)}
      ${wertHtml('🎯', 'CRIT', `${Math.round(eff.critChance * 100)}%`, critBonus, `${vorzeichen(critBonus)} %`)}
      <span>💥 KRIT ×${kritSchaden}</span>
    </div>`;
}

/** Eigenschaften der Gegenstände und getragene Sets mit ihren Boni (leer, wenn der Held keins von beidem hat) */
function setsHtml(fighter: GuildFighter): string {
  const eigenschaften = [...eigenschaftenVon(fighter).values()];
  const sets = getrageneSets(fighter.gear);
  if (sets.length === 0 && eigenschaften.length === 0) return '';
  const zeilen = eigenschaften.map(e => `<div class="hdm2-eigenschaft">✦ <b>${e.name}:</b> ${e.description}</div>`).join('');
  const karten = sets.map(({ set, teile }) => `
    <div class="hdm2-set${teile >= 2 ? ' aktiv' : ''}">
      <div class="hdm2-set-kopf">${set.zeichen} ${set.name} <span class="hdm2-set-zahl">${teile}/3</span></div>
      ${setBoniHtml(set, teile)}
      ${istMeisterset(set, fighter.gear, stufen()) ? `<div class="set-bonus aktiv set-meister">★ <b>Meisterset:</b> alle drei Teile auf +${MAX_SCHMIEDE_STUFE}, der Zwei-Teile-Bonus zählt doppelt</div>` : ''}
    </div>`).join('');
  return `
    <div class="hdm2-sets-area">
      ${zeilen ? `<div class="lbl">Eigenschaften der Ausrüstung</div><div class="hdm2-eigenschaften">${zeilen}</div>` : ''}
      ${karten ? `<div class="lbl">Set-Boni</div><div class="hdm2-sets">${karten}</div>` : ''}
    </div>`;
}

function renderDetailModal(fighter: GuildFighter): string {
  const { classDef, className, portraitUrl, pct, xpLabel, gearSlots } = buildModalData(fighter);

  const skillsHtml = classDef ? classDef.skills.map(sk => `
    <div class="hdm2-skill">
      <div class="hdm2-skill-name">${sk.name}</div>
      <div class="hdm2-skill-cd">CD: ${sk.cooldown}</div>
      <div class="hdm2-skill-desc">${sk.description}</div>
    </div>`).join('') : '';

  const bgHtml = classDef?.background
    ? `<div class="hdm2-sidebar"><div class="lbl">Hintergrund</div><p>${classDef.background.replace(/\n/g, '<br>')}</p></div>`
    : '';

  return `
    <div class="ov" id="hero-detail-ov">
    <div class="hdm2-outer">
      <div class="hdm2-inv-panel" id="hdm2-inv-panel" style="display:${inventarOffen ? 'flex' : 'none'}">
        <div class="hdm2-inv-header">
          <span class="lbl">🎒 Inventar</span>
          <span class="hdm2-inv-hint">${wunschPlatz() ? `Hell: passt ${PLATZ_IN[wunschPlatz()!]}` : 'Antippen zeigt Werte und Vergleich'}</span>
        </div>
        <div class="hdm2-inv-grid">
          ${buildInventoryHtml(fighter)}
        </div>
      </div>
      <div class="hdm2">
        <button class="mcl" id="hero-detail-close">✕</button>
        <button class="hdm2-inv-btn${inventarOffen ? ' active' : ''}" id="hdm2-inv-toggle">🎒 Inventar</button>
        <div class="hdm2-header">
          <div class="hdm2-name">${fighter.name}</div>
          <div class="hdm2-sub">${className} · Lv ${fighter.level}</div>
        </div>
        <div class="hdm2-portrait-area">
          <div class="hdm2-gear-col hdm2-gear-left">
            ${gearSlotIconHtml(gearSlots[0])}
            <span class="hdm2-slot-label">${gearSlots[0].label}</span>
            ${gearSlotIconHtml(gearSlots[2])}
            <span class="hdm2-slot-label">${gearSlots[2].label}</span>
          </div>
          <div class="hdm2-portrait" style="background-image:url('${portraitUrl}')"></div>
          <div class="hdm2-gear-col hdm2-gear-right">
            ${gearSlotIconHtml(gearSlots[1])}
            <span class="hdm2-slot-label">${gearSlots[1].label}</span>
            ${gearSlotIconHtml(gearSlots[3])}
            <span class="hdm2-slot-label">${gearSlots[3].label}</span>
          </div>
        </div>
        ${auswahlHtml(fighter)}
        <div class="hdm2-xp-row">
          <div class="hdm2-xpbar"><div class="hdm2-xpfill" style="width:${pct}%"></div></div>
          <div class="hdm2-xplabel">XP ${xpLabel}</div>
        </div>
        ${statsHtml(fighter)}
        ${wegBereichHtml(fighter, wegFrage)}
        ${setsHtml(fighter)}
        <div class="hdm2-skills-area">
          <div class="lbl">Fähigkeiten</div>
          <div class="hdm2-skills">${skillsHtml}</div>
        </div>
      </div>
      ${bgHtml}
    </div>
    </div>`;
}

// ─── Tab Content ────────────────────────────────────────────────

function renderMyHeroes(): string {
  if (!gameState || gameState.fighters.length === 0) {
    return '<div class="empty-msg">Noch keine Helden rekrutiert.</div>';
  }
  const cards = gameState.fighters.map(f => renderHeroCard(f, 'my')).join('');
  return `<div class="hcards">${cards}</div>`;
}

function renderHireTab(): string {
  if (!gameState) return '<div class="empty-msg">Kein Spielstand geladen.</div>';
  const state = gameState;
  const ownedClassIds = new Set(state.fighters.map(f => f.classId));
  const available = Object.values(CLASS_DEFS).filter(
    c => !ownedClassIds.has(c.id) && classUnlockSystem.isClassUnlocked(state, c.id),
  );

  if (available.length === 0) {
    const allUnlocked = Object.values(CLASS_DEFS).every(c => classUnlockSystem.isClassUnlocked(state, c.id));
    return allUnlocked
      ? '<div class="empty-msg">Alle Klassen bereits rekrutiert!</div>'
      : '<div class="empty-msg">Alle freigeschalteten Klassen bereits rekrutiert. Weitere Klassen werden durch Expeditionen freigeschaltet.</div>';
  }

  // Cost scales with how many heroes you already own
  const owned = state.fighters.length;
  const cards = available.map(c => {
    const cost = 50 + owned * 30;
    return renderHireCard(c, cost);
  }).join('');

  return `<div class="hcards">${cards}</div>`;
}

function renderTrainTab(): string {
  if (!gameState || gameState.fighters.length === 0) {
    return '<div class="empty-msg">Noch keine Helden zum Trainieren.</div>';
  }
  const cards = gameState.fighters
    .filter(f => f.level < MAX_HERO_LEVEL)
    .map(f => renderHeroCard(f, 'train'))
    .join('');

  if (!cards) {
    return '<div class="empty-msg">Alle Helden haben das Maximallevel erreicht!</div>';
  }
  return `<div class="hcards">${cards}</div>`;
}

// ─── Inventar Tab ──────────────────────────────────────────────

interface ItemCategory {
  label: string;
  emoji: string;
  filter: (id: string, def: { type: string; tags: string[] }) => boolean;
}

const ITEM_CATEGORIES: ItemCategory[] = [
  { label: 'Waffen', emoji: '\u2694\uFE0F', filter: (_id, def) => def.type === 'gear' && def.tags.includes('weapon') },
  { label: 'R\u00FCstungen & Schilde', emoji: '\uD83D\uDEE1\uFE0F', filter: (_id, def) => def.type === 'gear' && (def.tags.includes('armor') || def.tags.includes('robe') || def.tags.includes('shield')) },
  { label: 'Schmuck', emoji: '\uD83D\uDC8D', filter: (_id, def) => def.type === 'gear' && def.tags.includes('trinket') },
  { label: 'Tr\u00E4nke & Proviant', emoji: '\u2697\uFE0F', filter: (_id, def) => def.type === 'consumable' },
  { label: 'Materialien', emoji: '\uD83D\uDCE6', filter: (_id, def) => def.type === 'material' || def.type === 'special' },
  { label: 'Ressourcen', emoji: '\uD83C\uDF3E', filter: (_id, def) => def.type === 'resource' },
];

function rarityClass(tags: string[]): string {
  if (tags.includes('set')) return 'rar-set';
  if (tags.includes('legendary')) return 'rar-legendary';
  if (tags.includes('epic')) return 'rar-epic';
  if (tags.includes('rare')) return 'rar-rare';
  if (tags.includes('uncommon')) return 'rar-uncommon';
  return 'rar-common';
}

function rarityLabel(tags: string[]): string {
  if (tags.includes('set')) return 'Set-Teil';
  if (tags.includes('legendary')) return 'Legendär';
  if (tags.includes('epic')) return 'Episch';
  if (tags.includes('rare')) return 'Selten';
  if (tags.includes('uncommon')) return 'Ungewöhnlich';
  return '';
}

function renderInventarTab(): string {
  if (!gameState) return '<div class="empty-msg">Kein Spielstand geladen.</div>';

  const stock = gameState.globalStock;

  // Collect all items the player has (qty > 0)
  const ownedItems: { id: string; def: typeof ITEM_DEFS[string]; qty: number }[] = [];
  for (const [id, qty] of Object.entries(stock)) {
    if (qty <= 0) continue;
    const def = ITEM_DEFS[id];
    if (!def) continue;
    ownedItems.push({ id, def, qty });
  }

  if (ownedItems.length === 0) {
    return `
      <div class="empty-msg">Dein Inventar ist leer.</div>
      ${import.meta.env.DEV ? `<button id="inv-debug-fill" style="margin:12px auto;display:block;background:var(--s3);border:1px solid var(--bdr);color:var(--gold);padding:6px 16px;border-radius:6px;font-size:0.78rem;cursor:pointer;">\uD83D\uDD13 Alle Items einf\u00FCgen (Debug)</button>` : ''}`;
  }

  // Which items are equipped by any hero
  const equippedItems = new Set<string>();
  for (const f of gameState.fighters) {
    if (f.gear.mainHand) equippedItems.add(f.gear.mainHand);
    if (f.gear.offHand) equippedItems.add(f.gear.offHand);
    if (f.gear.armor) equippedItems.add(f.gear.armor);
    if (f.gear.trinket) equippedItems.add(f.gear.trinket);
  }

  let html = '';

  for (const cat of ITEM_CATEGORIES) {
    const items = ownedItems.filter(i => cat.filter(i.id, i.def));
    if (items.length === 0) continue;

    // Sort: higher tier first, then alphabetical
    items.sort((a, b) => (b.def.tier ?? 0) - (a.def.tier ?? 0) || a.def.name.localeCompare(b.def.name));

    const itemCards = items.map(item => {
      const rc = rarityClass(item.def.tags);
      const rl = rarityLabel(item.def.tags);
      const isEquipped = equippedItems.has(item.id);
      const statsStr = gearStatsSummary(item.id);
      const tierStr = item.def.tier ? `T${item.def.tier}` : '';
      const isStackable = (item.def.stackSize ?? 1) > 1;
      const tooltip = [
        gearName(item.id),
        rl,
        tierStr,
        statsStr,
        eigenschaftenText(item.id),
        setTooltip(item.id),
        item.def.flavorText,
        isEquipped ? 'Ausger\u00FCstet' : '',
      ].filter(Boolean).join('\n');

      const isGear = item.def.type === 'gear';

      return `
        <div class="inv-cell ${rc}${isEquipped ? ' inv-cell-eq' : ''}${isGear ? ' inv-cell-gear' : ''}" title="${tooltip}">
          <img src="assets/sprites/final/${getItemSpriteKey(item.id)}.png" class="${isGear ? 'inv-cell-bg' : 'inv-cell-img'}"
               onerror="this.style.display='none'">
          ${isStackable && item.qty > 1 ? `<span class="inv-cell-qty">\u00D7${item.qty}</span>` : ''}
          ${isEquipped ? '<span class="inv-cell-eqbadge">E</span>' : ''}
          ${setAbzeichen(item.id)}${stufeAbzeichen(stufen(), item.id)}
          <span class="inv-cell-nm">${gearName(item.id)}</span>
        </div>`;
    }).join('');

    html += `
      <div class="inv-cat">
        <div class="inv-cat-hd">${cat.emoji} ${cat.label} <span class="inv-cat-count">(${items.length})</span></div>
        <div class="inv-grid">${itemCards}</div>
      </div>`;
  }

  const totalItems = ownedItems.reduce((s, i) => s + i.qty, 0);
  const totalTypes = ownedItems.length;

  return `
    <div class="inv-summary">
      ${totalTypes} Gegenst\u00E4nde (${totalItems} gesamt)
      ${import.meta.env.DEV ? `<button id="inv-debug-fill" style="margin-left:auto;background:var(--s3);border:1px solid var(--bdr);color:var(--gold);padding:4px 12px;border-radius:6px;font-size:0.72rem;cursor:pointer;float:right;">\uD83D\uDD13 Alle Items (Debug)</button>` : ''}
    </div>
    ${html}`;
}

// ─── Main Render ────────────────────────────────────────────────

export function renderHeroesScreen(container: HTMLElement): void {
  // Remove previous instance to avoid duplicates on re-render
  const prev = document.getElementById('s-heroes');
  if (prev) prev.remove();

  const state = gameState;
  const headerHtml = state ? renderHeader(state, 'main', 'HELDEN') : '';

  function tabClass(tab: HeroTab): string {
    return `tab${activeTab === tab ? ' active' : ''}`;
  }

  function tabContent(): string {
    switch (activeTab) {
      case 'my': return renderMyHeroes();
      case 'hire': return renderHireTab();
      case 'train': return renderTrainTab();
      case 'inventar': return renderInventarTab();
      case 'sets': return state ? setSammlungHtml(state) : '';
      case 'schmiede': return state ? schmiedeTabHtml(state) : '';
    }
  }

  const el = document.createElement('div');
  el.id = 's-heroes';
  el.className = 'screen';
  el.innerHTML = `
      ${headerHtml}
      <div class="tabs">
        <button class="${tabClass('my')}" data-tab="my">MEINE HELDEN</button>
        <button class="${tabClass('hire')}" data-tab="hire">ANHEUERN</button>
        <button class="${tabClass('train')}" data-tab="train">TRAINIEREN</button>
        <button class="${tabClass('inventar')}" data-tab="inventar">\uD83C\uDF92 INVENTAR</button>
        <button class="${tabClass('sets')}" data-tab="sets">\u2726 SETS</button>
        <button class="${tabClass('schmiede')}" data-tab="schmiede">\u2692\uFE0F SCHMIEDE</button>
      </div>
      <div class="tab-content">
        ${tabContent()}
      </div>`;
  container.appendChild(el);

  // ─── Event Binding ──────────────────────────────────────────

  if (activeTab === 'schmiede' && state) bindSchmiedeTab(el, state, () => renderHeroesScreen(container));

  // Back button
  const backBtn = el.querySelector('.hdr-back') as HTMLElement | null;
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      const target = backBtn.getAttribute('data-nav');
      if (target) navigateTo(target as any);
    });
  }

  // Tab switching
  const tabs = el.querySelectorAll('.tab');
  for (let i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', () => {
      const tab = tabs[i].getAttribute('data-tab') as HeroTab;
      if (tab && tab !== activeTab) {
        if (activeTab === 'schmiede') schmiedeTabVerlassen();
        activeTab = tab;
        renderHeroesScreen(container);
      }
    });
  }

  // Hero card click → detail modal
  const heroCards = el.querySelectorAll('.hcard:not(.hcard-hire)');
  for (let i = 0; i < heroCards.length; i++) {
    heroCards[i].addEventListener('click', (e) => {
      // Don't open modal if clicking a button inside the card
      if ((e.target as HTMLElement).closest('button')) return;

      const fid = Number(heroCards[i].getAttribute('data-fighter-id'));
      const fighter = gameState?.fighters.find(f => f.id === fid);
      if (!fighter) return;

      auswahl = null;
      inventarOffen = false;
      wegFrage = null;
      openDetailModal(fighter, container);
    });
  }

  // Train buttons
  const trainBtns = el.querySelectorAll('.btn-train');
  for (let i = 0; i < trainBtns.length; i++) {
    trainBtns[i].addEventListener('click', () => {
      const fid = Number(trainBtns[i].getAttribute('data-fighter-id'));
      const btn = trainBtns[i] as HTMLElement;
      handleTrain(fid, container, btn);
    });
  }

  // Hire buttons
  const hireBtns = el.querySelectorAll('.btn-hire');
  for (let i = 0; i < hireBtns.length; i++) {
    hireBtns[i].addEventListener('click', () => {
      const classId = hireBtns[i].getAttribute('data-class-id') ?? '';
      const cost = Number(hireBtns[i].getAttribute('data-cost'));
      const btn = hireBtns[i] as HTMLElement;
      handleHire(classId, cost, container, btn);
    });
  }

  // Debug: fill all items into inventory (dev builds only)
  const debugFill = el.querySelector('#inv-debug-fill') as HTMLElement | null;
  if (import.meta.env.DEV && debugFill && gameState) {
    debugFill.addEventListener('click', () => {
      if (!gameState) return;
      for (const [id, def] of Object.entries(ITEM_DEFS)) {
        if (!gameState.globalStock[id] || gameState.globalStock[id] <= 0) {
          gameState.globalStock[id] = (def.stackSize ?? 1) > 1 ? 5 : 1;
        }
      }
      renderHeroesScreen(container);
    });
  }
}

// ─── Modal ──────────────────────────────────────────────────────

function openDetailModal(fighter: GuildFighter, container: HTMLElement): void {
  // Remove any existing modal
  const existing = container.querySelector('#hero-detail-ov');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderDetailModal(fighter);
  const overlay = wrapper.firstElementChild as HTMLElement;
  overlay.classList.add('on');
  container.appendChild(overlay);

  // Close button
  const closeBtn = overlay.querySelector('#hero-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  // Click overlay background to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Inventory panel toggle
  const invToggle = overlay.querySelector('#hdm2-inv-toggle') as HTMLElement | null;
  const invPanel = overlay.querySelector('#hdm2-inv-panel') as HTMLElement | null;
  if (invToggle && invPanel) {
    invToggle.addEventListener('click', () => {
      inventarOffen = invPanel.style.display === 'none';
      invPanel.style.display = inventarOffen ? 'flex' : 'none';
      invToggle.classList.toggle('active', inventarOffen);
      if (inventarOffen) invPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  // Neu zeichnen und die Auswahl ins Bild holen (am Handy liegt das Inventar unter dem Helden)
  const neuZeichnen = (): void => {
    openDetailModal(fighter, container);
    const box = container.querySelector('#hdm2-auswahl') as HTMLElement | null;
    box?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // Platz am Helden antippen: Gegenstand zeigen (nochmal antippen schliesst); ein leerer Platz öffnet das Inventar
  overlay.querySelectorAll<HTMLElement>('.hdm-gear-icon[data-slot]').forEach(el => {
    el.addEventListener('click', () => {
      const slot = el.dataset.slot as EquipSlot;
      auswahl = auswahl?.art === 'slot' && auswahl.slot === slot ? null : { art: 'slot', slot };
      if (auswahl && !fighter.gear[slot]) inventarOffen = true;
      neuZeichnen();
    });
  });

  // Gegenstand im Inventar antippen: Werte und Vergleich zeigen (für den zuvor angetippten Platz)
  overlay.querySelectorAll<HTMLElement>('.hdm2-inv-slot[data-item-id]').forEach(el => {
    el.addEventListener('click', () => {
      const itemId = el.dataset.itemId!;
      const platz = wunschPlatz();
      // Der angetippte Platz gilt nur für Gegenstände, die dort hineinpassen
      const passt = platz && mitGegenstand(fighter, itemId, platz)?.gear[platz] === itemId ? platz : undefined;
      auswahl = auswahl?.art === 'inventar' && auswahl.itemId === itemId
        ? (platz ? { art: 'slot', slot: platz } : null)
        : { art: 'inventar', itemId, platz: passt };
      neuZeichnen();
    });
  });

  // Weg wählen: erst antippen, dann bestätigen, denn die Wahl gilt für immer
  const zumWeg = (): void => {
    openDetailModal(fighter, container);
    container.querySelector('#hdm2-weg')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  overlay.querySelectorAll<HTMLElement>('[data-weg-waehlen]').forEach(el => {
    el.addEventListener('click', () => {
      wegFrage = el.dataset.wegWaehlen ?? null;
      zumWeg();
    });
  });
  overlay.querySelector('[data-weg-nein]')?.addEventListener('click', () => {
    wegFrage = null;
    zumWeg();
  });
  overlay.querySelector<HTMLElement>('[data-weg-ja]')?.addEventListener('click', e => {
    const wegId = (e.currentTarget as HTMLElement).dataset.wegJa ?? '';
    wegFrage = null;
    if (!waehleWeg(fighter, wegId)) return;
    window.dispatchEvent(new CustomEvent('mc:speichern'));
    renderHeroesScreen(container); // die Heldenkarte zeigt jetzt den Weg
    zumWeg();
  });

  // Set-Teil in der Schmiede zeigen: Fenster zu, Tab «Schmiede» auf, dort zum Teil
  overlay.querySelector<HTMLElement>('[data-schmiede-teil]')?.addEventListener('click', e => {
    schmiedeZeigeTeil((e.currentTarget as HTMLElement).dataset.schmiedeTeil!);
    overlay.remove();
    activeTab = 'schmiede';
    renderHeroesScreen(container);
  });

  // Anlegen oder Ablegen
  const aktion = overlay.querySelector('.hdm2-aktion') as HTMLElement | null;
  aktion?.addEventListener('click', () => {
    if (!gameState || !auswahl) return;
    if (auswahl.art === 'slot') {
      gearSystem.unequip(gameState, fighter, auswahl.slot);
      auswahl = null;
      inventarOffen = true;
    } else {
      const itemId = auswahl.itemId;
      if (!gearSystem.equip(gameState, fighter, itemId, auswahl.platz)) return;
      const slot = (Object.keys(PLATZ_NAMEN) as EquipSlot[]).find(p => fighter.gear[p] === itemId);
      auswahl = slot ? { art: 'slot', slot } : null;
    }
    neuZeichnen();
  });
}

// ─── Actions ────────────────────────────────────────────────────

function handleTrain(fighterId: number, container: HTMLElement, btn: HTMLElement): void {
  if (!gameState) return;
  const fighter = gameState.fighters.find(f => f.id === fighterId);
  if (!fighter || fighter.level >= MAX_HERO_LEVEL) return;

  const trainingCost = 20 + fighter.level * 10;
  const gold = gameState.globalStock['gold'] ?? 0;

  // Not enough gold — show error feedback on button
  if (gold < trainingCost) {
    const originalText = btn.textContent ?? 'TRAINIEREN';
    const originalBg = btn.style.background;
    btn.textContent = 'Nicht genug Gold!';
    btn.style.background = '#991b1b';
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg;
      btn.removeAttribute('disabled');
    }, 1500);
    return;
  }

  gameState.globalStock['gold'] = gold - trainingCost;
  const xpGain = 10 + fighter.level * 5;
  fighter.xp += xpGain;

  // Check level-up
  let didLevelUp = false;
  while (fighter.level < MAX_HERO_LEVEL) {
    const needed = xpForNextLevel(fighter.level);
    const xpInLevel = fighter.xp - totalXpForLevel(fighter.level);
    if (xpInLevel >= needed) {
      fighter.level++;
      // Stat growth on level up
      fighter.baseStats.maxHp += 2;
      fighter.baseStats.hp = fighter.baseStats.maxHp;
      fighter.baseStats.atk += 1;
      fighter.baseStats.def += 1;
      didLevelUp = true;
    } else {
      break;
    }
  }

  // Show success feedback, then re-render
  const successText = didLevelUp ? '\u2605 Level Up!' : '\u2713 Trainiert!';
  btn.textContent = successText;
  btn.style.background = '#166534';
  btn.setAttribute('disabled', 'true');
  setTimeout(() => {
    renderHeroesScreen(container);
  }, 600);
}

function handleHire(classId: string, cost: number, container: HTMLElement, btn: HTMLElement): void {
  if (!gameState) return;
  const gold = gameState.globalStock['gold'] ?? 0;

  // Not enough gold — show error feedback on button
  if (gold < cost) {
    const originalText = btn.textContent ?? 'ANHEUERN';
    const originalBg = btn.style.background;
    btn.textContent = 'Nicht genug Gold!';
    btn.style.background = '#991b1b';
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = originalBg;
      btn.removeAttribute('disabled');
    }, 1500);
    return;
  }

  const classDef = CLASS_DEFS[classId];
  if (!classDef) return;

  // Check if already owned
  if (gameState.fighters.some(f => f.classId === classId)) return;

  gameState.globalStock['gold'] = gold - cost;

  // Create a new fighter — use a simple incrementing ID
  const maxId = gameState.fighters.reduce((m, f) => Math.max(m, f.id), 0);
  const newFighter: GuildFighter = {
    id: maxId + 1,
    citizenId: 0,
    classId: classDef.id,
    name: classDef.name,
    baseStats: { ...classDef.baseStats },
    gear: { mainHand: null, offHand: null, armor: null, trinket: null },
    gearNeedsRepair: false,
    xp: 0,
    level: 1,
  };

  gameState.fighters.push(newFighter);

  // Show success feedback, then re-render
  btn.textContent = '\u2713 Rekrutiert!';
  btn.style.background = '#166534';
  btn.setAttribute('disabled', 'true');
  setTimeout(() => {
    renderHeroesScreen(container);
  }, 600);
}
