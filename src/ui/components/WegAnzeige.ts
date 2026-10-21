// ─── Magic City – Wege der Helden in der Anzeige ────────────────
// Abzeichen für die Heldenkarten und der Bereich «Weg» im Heldenfenster:
// Vorschau unter Stufe 10, Wahl mit Bestätigung im Spiel (kein confirm()),
// danach der gewählte Weg mit seiner Meisterschaft ab Stufe 15 und seiner
// Bilanz (was er bisher bewirkt hat, gezählt in systems/Kampfeffekte.ts).
// ────────────────────────────────────────────────────────────────

import { GuildFighter } from '../../models/GuildRoster';
import { WegWirkung, WegWirkungArt } from '../../models/ExpeditionRun';
import { MEISTER_AB_STUFE, SpezialisierungDef, WEG_AB_STUFE, wegeDerKlasse } from '../../data/spezialisierungen';
import { istMeister, kannWegWaehlen, wegVon } from '../../systems/Spezialisierung';

/** Bilanz in Worten, in dieser Reihenfolge: «1.240 Schaden, 380 Leben geheilt» */
const WIRKUNG: [WegWirkungArt, (zahl: string) => string][] = [
  ['schaden', z => `${z} Schaden`],
  ['verhindert', z => `${z} Schaden verhindert`],
  ['heilung', z => `${z} Leben geheilt`],
  ['schild', z => `${z} Schild verteilt`],
  ['krit', z => `${z} sichere Krits`],
  ['umgelenkt', z => `${z} Angriffe umgelenkt`],
  ['abgefangen', z => `${z} Angriffe abgefangen`],
  ['angezogen', z => `${z} Angriffe auf sich gezogen`],
  ['ausgewichen', z => `${z}× ausgewichen`],
];

/** Was ein Weg bewirkt hat, in Worten (leer, wenn nichts zusammenkam) */
export function wirkungText(wirkung: WegWirkung | undefined): string {
  if (!wirkung) return '';
  return WIRKUNG
    .filter(([art]) => Math.round(wirkung[art] ?? 0) > 0)
    .map(([art, text]) => text(Math.round(wirkung[art]!).toLocaleString('de')))
    .join(', ');
}

/** Zeile in der Bilanz nach einer Expedition: «🧱 Phalanx: 240 Schild verteilt» (leer ohne Wirkung) */
export function wegWirkungZeile(fighter: GuildFighter, wirkung: WegWirkung | undefined): string {
  const weg = wegVon(fighter);
  const text = wirkungText(wirkung);
  return weg && text ? `${weg.zeichen} ${weg.name}: ${text}` : '';
}

/** Abzeichen auf der Heldenkarte: der Weg (★ als Meister) oder «★ Weg wählen» ab Stufe 10 */
export function wegAbzeichen(fighter: GuildFighter): string {
  const weg = wegVon(fighter);
  if (weg) {
    const meister = istMeister(fighter);
    const titel = `${weg.name}${meister ? ', Meister' : ''}: ${weg.text}${meister ? ` Als Meister: ${weg.meisterText}` : ''}`;
    return `<span class="hc-weg${meister ? ' meister' : ''}" title="${titel}">${weg.zeichen} ${weg.name}${meister ? ' ★' : ''}</span>`;
  }
  if (kannWegWaehlen(fighter)) {
    return `<span class="hc-weg neu" title="Stufe ${WEG_AB_STUFE} erreicht: im Heldenfenster einen Weg wählen">★ Weg wählen</span>`;
  }
  return '';
}

/** Zusatz in der Bilanz nach einer Expedition: Erinnerung an die Wahl oder die frische Meisterschaft */
export function wegBilanz(fighter: GuildFighter, levelUps: number): string {
  if (kannWegWaehlen(fighter)) return ' · ★ Weg wählen!';
  const neuMeister = levelUps > 0 && fighter.level - levelUps < MEISTER_AB_STUFE;
  if (neuMeister && istMeister(fighter)) return ` · ★ Meister: ${wegVon(fighter)?.name}!`;
  return '';
}

function meisterZeile(weg: SpezialisierungDef, meister: boolean): string {
  return meister
    ? `<div class="hdm2-weg-meister aktiv">★ Meister: ${weg.meisterText}</div>`
    : `<div class="hdm2-weg-meister">★ Meister ab Stufe ${MEISTER_AB_STUFE}: ${weg.meisterText}</div>`;
}

function karte(weg: SpezialisierungDef, art: 'gewaehlt' | 'waehlbar' | 'vorschau', unten: string): string {
  return `
    <div class="hdm2-weg-karte ${art}">
      <div class="hdm2-weg-kopf"><span>${weg.zeichen}</span><b>${weg.name}</b><span class="hdm2-weg-kurz">${weg.kurz}</span></div>
      <div class="hdm2-weg-text">${weg.text}</div>
      ${unten}
    </div>`;
}

/**
 * Bereich «Weg» im Heldenfenster. `bestaetigen` ist der Weg, dessen Wahl gerade
 * bestätigt werden soll (nach dem ersten Antippen), sonst null.
 */
export function wegBereichHtml(fighter: GuildFighter, bestaetigen: string | null): string {
  const wege = wegeDerKlasse(fighter.classId);
  if (wege.length === 0) return '';
  const weg = wegVon(fighter);
  let inhalt: string;
  if (weg) {
    const bisher = wirkungText(fighter.wegBilanz);
    inhalt = karte(weg, 'gewaehlt', meisterZeile(weg, istMeister(fighter)) + (bisher
      ? `<div class="hdm2-weg-bilanz">Bisher bewirkt: ${bisher}</div>`
      : '<div class="hdm2-weg-bilanz leer">Was der Weg bewirkt, steht hier nach der nächsten Expedition.</div>'));
  } else if (kannWegWaehlen(fighter)) {
    const karten = wege.map(w => karte(w, 'waehlbar', meisterZeile(w, false) + (bestaetigen === w.id
      ? `<div class="hdm2-weg-frage">Für immer ${w.name}?
           <button class="weg-knopf" data-weg-ja="${w.id}">Ja, für immer</button>
           <button class="weg-knopf nein" data-weg-nein>Abbrechen</button>
         </div>`
      : `<button class="weg-knopf" data-weg-waehlen="${w.id}">${w.name} wählen</button>`))).join('');
    inhalt = `
      <div class="hdm2-weg-hinweis neu">${fighter.name} kann jetzt einen Weg wählen. Die Wahl gilt für immer.</div>
      <div class="hdm2-weg-karten">${karten}</div>`;
  } else {
    const noch = WEG_AB_STUFE - fighter.level;
    inhalt = `
      <div class="hdm2-weg-hinweis">Ab Stufe ${WEG_AB_STUFE} wählt ${fighter.name} einen dieser Wege (noch ${noch} ${noch === 1 ? 'Stufe' : 'Stufen'}).</div>
      <div class="hdm2-weg-karten">${wege.map(w => karte(w, 'vorschau', meisterZeile(w, false))).join('')}</div>`;
  }
  return `
    <div class="hdm2-weg-area" id="hdm2-weg">
      <div class="lbl">Weg</div>
      ${inhalt}
    </div>`;
}
