// ─── Magic City – Tab «Schmiede» auf der Heldenseite ───────────
// Die Set-Teile der Gilde mit Stufe, nächstem Wert und Kosten, ein Knopf zum
// Verbessern und einer zum Einschmelzen doppelter Teile; oben das Material.
// Nach dem Schmieden fliegen Funken und der Schmied sagt etwas dazu.
// Regeln: systems/Schmiede.ts. Anleitung: docs/SCHMIEDE.md.
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { DUNGEON_SETS, DungeonSetDef, SET_TEIL_NAMEN, setTeilIds, teilArtVonItem } from '../../data/dungeonSets';
import { MAX_SCHMIEDE_STUFE, PROZENT_JE_STUFE, RABATT_JE_SCHMIEDE_STUFE } from '../../data/schmiede';
import { besitz, istMeisterset } from '../../systems/DungeonSets';
import {
  einschmelzen, einschmelzenErtrag, kannEinschmelzen, materialFuerTeil, schmieden, schmiedeFehlt,
  schmiedeKosten, schmiedeRabatt, schmiedeStufe, schmiedeStufen, verbesserteWerte,
} from '../../systems/Schmiede';
import { setAbzeichen } from '../components/SetAnzeige';
import {
  escapeAttr, materialBild, materialLeisteHtml, stufeAbzeichen, stufenKlasse, stufenPunkte, werteSprungHtml,
} from '../components/SchmiedeAnzeige';

/** Was der Schmied zur neuen Stufe sagt (Index = Stufe) */
const SCHMIED_SAETZE = [
  '',
  'Ordentlich. Jetzt hält es auch einen Troll aus.',
  'Zweimal gefaltet, zweimal geflucht. Passt.',
  'Siehst du den Glanz? Das nennt man Handwerk.',
  'Davon erzählen sie noch lange in der Taverne.',
  'Besser wird es nicht. Nicht einmal bei den Zwergen.',
];
const MEISTER_SATZ = 'Ein Meisterset! So etwas habe ich seit meinem Lehrmeister nicht mehr gesehen.';

/** Was zuletzt passiert ist: Der Tab zeigt es einmal mit Funken und einem Satz des Schmieds */
let zuletzt: { itemId: string; art: 'geschmiedet' | 'eingeschmolzen'; text: string } | null = null;
/** Teil, dessen Einschmelzen gerade bestätigt werden soll */
let einschmelzenFrage: string | null = null;
/** Teil, zu dem der Tab beim nächsten Zeichnen scrollen soll (Link aus dem Heldenfenster) */
let zielTeil: string | null = null;
/** Nach dem Schmieden kurz keine weiteren Klicks: Ein schneller Doppelklick kauft sonst zwei Stufen */
let gesperrtBis = 0;
const SPERRE_MS = 600;

/** Beim nächsten Öffnen zu diesem Teil scrollen */
export function schmiedeZeigeTeil(itemId: string): void {
  zielTeil = itemId;
}

/** Wer den Tab verlässt, bekommt beim Zurückkommen keine alte Nachfrage zum Einschmelzen mehr */
export function schmiedeTabVerlassen(): void {
  einschmelzenFrage = null;
  zuletzt = null;
}

function getragenVon(state: GameState, itemId: string): string[] {
  return state.fighters
    .filter(f => Object.values(f.gear).includes(itemId))
    .map(f => escapeAttr(f.name));
}

/** Sets, von denen die Gilde Teile hat: getragene zuerst, dann die höheren Ebenen */
function setsDerGilde(state: GameState): DungeonSetDef[] {
  const getragen = (set: DungeonSetDef): boolean => setTeilIds(set).some(id => getragenVon(state, id).length > 0);
  return DUNGEON_SETS
    .filter(set => setTeilIds(set).some(id => besitz(state, id) > 0))
    .sort((a, b) => Number(getragen(b)) - Number(getragen(a)) || b.tier - a.tier);
}

function kostenHtml(state: GameState, itemId: string): string {
  const kosten = schmiedeKosten(state, itemId);
  if (!kosten) return '';
  const hat = (id: string): number => state.globalStock[id] ?? 0;
  const teil = (genug: boolean, inhalt: string): string => `<span class="schm-preis${genug ? '' : ' fehlt'}">${inhalt}</span>`;
  const mat = hat(kosten.material.id);
  return `<div class="schm-kosten">`
    + teil(mat >= kosten.menge, `${materialBild(kosten.material, 'mat-bild klein')}${kosten.material.name} <b>${mat}/${kosten.menge}</b>`)
    + teil(hat('gold') >= kosten.gold, `💰 <b>${kosten.gold}</b>`)
    + (kosten.splitter > 0 ? teil(hat('crystal_shard') >= kosten.splitter, `💎 <b>${kosten.splitter}</b>`) : '')
    + `</div>`;
}

function teilHtml(state: GameState, itemId: string): string {
  const def = ITEM_DEFS[itemId];
  const art = teilArtVonItem(itemId);
  if (!def || !art) return '';
  const stufen = schmiedeStufen(state);
  const stufe = schmiedeStufe(state, itemId);
  const max = stufe >= MAX_SCHMIEDE_STUFE;
  const imLager = state.globalStock[itemId] ?? 0;
  const traeger = getragenVon(state, itemId);
  const wo = [
    SET_TEIL_NAMEN[art],
    traeger.length ? `getragen von ${traeger.join(', ')}` : '',
    imLager > 0 ? `${imLager} im Lager` : '',
  ].filter(Boolean).join(' · ');

  const fehlt = schmiedeFehlt(state, itemId) ?? [];
  const werte = max
    ? werteSprungHtml(verbesserteWerte(itemId, stufe), verbesserteWerte(itemId, stufe))
    : werteSprungHtml(verbesserteWerte(itemId, stufe), verbesserteWerte(itemId, stufe + 1));
  const knopf = max
    ? `<span class="schm-max">✦ Höchste Stufe</span>`
    : `<button class="schm-knopf" data-schmieden="${itemId}"${fehlt.length ? ' disabled' : ''}>⚒️ AUF +${stufe + 1}</button>`;
  const fehltText = !max && fehlt.length
    ? `<div class="schm-fehlt">Es fehlen ${fehlt.map(f => `${f.fehlt} ${f.name}`).join(' und ')}.</div>`
    : '';

  const ertrag = einschmelzenErtrag(itemId);
  const schmelzen = ertrag && kannEinschmelzen(state, itemId)
    ? `<button class="schm-knopf schmelzen" data-einschmelzen="${itemId}" title="Ein doppeltes Exemplar aus dem Lager wird zu Material">🔥 Einschmelzen +${ertrag.menge}</button>`
    : '';
  // Die Nachfrage nur, solange das Einschmelzen noch geht (inzwischen angelegt? dann nicht mehr)
  const frage = einschmelzenFrage === itemId && ertrag && kannEinschmelzen(state, itemId)
    ? `<div class="schm-frage">
        <span>1 × ${def.name} einschmelzen? Du bekommst ${ertrag.menge} ${ertrag.material.name}. Danach hat die Gilde noch ${besitz(state, itemId) - 1}.</span>
        <button class="schm-knopf" data-einschmelzen-ja="${itemId}">JA, EINSCHMELZEN</button>
        <button class="schm-knopf leise" data-einschmelzen-nein>NEIN</button>
      </div>`
    : '';
  const neu = zuletzt?.itemId === itemId ? zuletzt : null;

  return `
    <div class="schm-teil${neu ? ` ${neu.art}` : ''}" data-teil="${itemId}">
      <div class="schm-bild rar-set ${stufe > 0 ? `stufe-${stufenKlasse(stufe)}` : ''}">
        <img src="assets/sprites/final/${getItemSpriteKey(itemId)}.png" alt="" onerror="this.style.display='none'">
        ${setAbzeichen(itemId)}${stufeAbzeichen(stufen, itemId)}
        <span class="schm-funken" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      </div>
      <div class="schm-info">
        <div class="schm-name">${def.name}${stufe > 0 ? ` <span class="schm-plus ${stufenKlasse(stufe)}">+${stufe}</span>` : ''} ${stufenPunkte(stufe)}</div>
        <div class="schm-wo">${wo}</div>
        <div class="schm-werte">${werte}</div>
        ${max ? '' : kostenHtml(state, itemId)}
        ${fehltText}
        ${neu ? `<div class="schm-satz">${neu.art === 'geschmiedet' ? '🔨' : '🔥'} «${neu.text}»</div>` : ''}
      </div>
      <div class="schm-knoepfe">${knopf}${schmelzen}</div>
      ${frage}
    </div>`;
}

function setHtml(state: GameState, set: DungeonSetDef): string {
  const ids = setTeilIds(set);
  const besessen = ids.filter(id => besitz(state, id) > 0);
  const aufMax = ids.filter(id => schmiedeStufe(state, id) >= MAX_SCHMIEDE_STUFE).length;
  const stufen = schmiedeStufen(state);
  const meister = state.fighters.filter(f => istMeisterset(set, f.gear, stufen)).map(f => escapeAttr(f.name));
  const material = materialFuerTeil(ids[0]);
  const meisterText = meister.length
    ? `<span class="schm-meister an">★ Meisterset bei ${meister.join(', ')}</span>`
    : `<span class="schm-meister" title="Alle drei Teile auf +${MAX_SCHMIEDE_STUFE}: Wer sie zusammen trägt, bekommt den Zwei-Teile-Bonus doppelt">Meisterset ${aufMax}/3</span>`;
  return `
    <div class="schm-set${meister.length ? ' meister' : ''}">
      <div class="schm-set-kopf">
        <span class="set-zeichen">${set.zeichen}</span>
        <div class="schm-set-titel">
          <div class="set-name">${set.name}</div>
          <div class="set-ort">Ebene ${set.tier} · ${besessen.length}/3 Teile · Material: ${material ? `${materialBild(material, 'mat-bild klein')}${material.name}` : '–'}</div>
        </div>
        ${meisterText}
      </div>
      ${besessen.map(id => teilHtml(state, id)).join('')}
    </div>`;
}

/** Inhalt des Tabs «Schmiede» */
export function schmiedeTabHtml(state: GameState): string {
  const rabatt = schmiedeRabatt(state);
  const sets = setsDerGilde(state);
  const html = `
    <div class="schmiede">
      <div class="schmiede-kopf">
        <div class="schmiede-gruss">
          <span class="schmiede-amboss" aria-hidden="true">⚒️</span>
          <p>Der Schmied wischt sich die Hände an der Schürze ab. «Zeigt her, was ihr gefunden habt. Mit Material aus den Dungeons mache ich jedes Set-Teil besser. Fast jedes.»</p>
        </div>
        <div class="mat-leiste">${materialLeisteHtml(state)}</div>
        <div class="schmiede-erklaerung">
          Jede Stufe macht alle Werte eines Set-Teils um ${PROZENT_JE_STUFE} % stärker, den wichtigsten Wert mindestens um 1, bis +${MAX_SCHMIEDE_STUFE}.
          Die Stufe gilt für alle Exemplare des Teils. Jedes Gebiet hat sein eigenes Material, ein Sieg bringt am meisten.
          Doppelte Teile lassen sich einschmelzen. Alle drei Teile eines Sets auf +${MAX_SCHMIEDE_STUFE} sind ein <b>Meisterset</b>: Wer sie trägt, bekommt den Zwei-Teile-Bonus doppelt.
        </div>
        ${rabatt > 0
          ? `<div class="schmiede-rabatt">🏛️ Eure Schmiede in der Stadt spart ${Math.round(rabatt * 100)} % Gold.</div>`
          : `<div class="schmiede-rabatt aus">Tipp: Eine Schmiede in der Stadt spart Gold, ${Math.round(RABATT_JE_SCHMIEDE_STUFE * 100)} % je Ausbaustufe.</div>`}
      </div>
      ${sets.length
        ? sets.map(set => setHtml(state, set)).join('')
        : `<div class="empty-msg">Noch keine Set-Teile. Jeder Dungeon lässt sein eigenes Set fallen, der erste Sieg bringt sicher ein Teil. Damit kommst du hierher.</div>`}
    </div>`;
  zuletzt = null;
  return html;
}

/** Knöpfe des Tabs; neuZeichnen zeichnet die ganze Heldenseite neu (Kopfzeile mit Gold und Kristallen) */
export function bindSchmiedeTab(el: HTMLElement, state: GameState, neuZeichnen: () => void): void {
  const speichernUndZeichnen = (itemId: string): void => {
    window.dispatchEvent(new CustomEvent('mc:speichern'));
    zielTeil = itemId;
    neuZeichnen();
  };
  el.querySelectorAll<HTMLButtonElement>('[data-schmieden]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      if (Date.now() < gesperrtBis) return;
      const itemId = knopf.dataset.schmieden!;
      const stufe = schmieden(state, itemId);
      if (stufe === null) return;
      gesperrtBis = Date.now() + SPERRE_MS;
      const set = DUNGEON_SETS.find(s => setTeilIds(s).includes(itemId));
      const meister = !!set && setTeilIds(set).every(id => schmiedeStufe(state, id) >= MAX_SCHMIEDE_STUFE);
      zuletzt = { itemId, art: 'geschmiedet', text: meister && stufe >= MAX_SCHMIEDE_STUFE ? MEISTER_SATZ : SCHMIED_SAETZE[stufe] };
      einschmelzenFrage = null;
      speichernUndZeichnen(itemId);
    });
  });
  el.querySelectorAll<HTMLButtonElement>('[data-einschmelzen]').forEach(knopf => {
    knopf.addEventListener('click', () => {
      einschmelzenFrage = knopf.dataset.einschmelzen!;
      zielTeil = einschmelzenFrage;
      neuZeichnen();
    });
  });
  el.querySelector('[data-einschmelzen-nein]')?.addEventListener('click', () => {
    einschmelzenFrage = null;
    neuZeichnen();
  });
  el.querySelector<HTMLButtonElement>('[data-einschmelzen-ja]')?.addEventListener('click', e => {
    if (Date.now() < gesperrtBis) return;
    const itemId = (e.currentTarget as HTMLElement).dataset.einschmelzenJa!;
    einschmelzenFrage = null;
    const ertrag = einschmelzen(state, itemId);
    if (!ertrag) return neuZeichnen();
    gesperrtBis = Date.now() + SPERRE_MS;
    zuletzt = { itemId, art: 'eingeschmolzen', text: `Zischt, knackt, fertig. ${ertrag.menge} ${ertrag.material.name} für die nächste Stufe.` };
    speichernUndZeichnen(itemId);
  });

  if (zielTeil) {
    const ziel = el.querySelector<HTMLElement>(`[data-teil="${zielTeil}"]`);
    zielTeil = null;
    ziel?.scrollIntoView({ block: 'center' });
  }
}
