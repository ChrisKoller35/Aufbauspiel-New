// ─── Magic City – Fenster «Spielstand» ──────────────────────────
// Zeigt, was gespeichert ist, lädt den Spielstand als Datei herunter
// und lädt einen Spielstand aus einer Datei (mit Bestätigung im Fenster,
// danach lädt das Spiel neu). Der Stand von vor dem Laden lässt sich
// zurückholen (er tauscht mit dem jetzigen). Geöffnet aus dem Hauptmenü.
// Was aus einer Datei kommt, steht nur als Text im Fenster (textContent).
// Logik: systems/SaveSystem.ts. Stile: ui/html/spielstand.css.
// Doku: docs/SPIELSTAND.md
// ────────────────────────────────────────────────────────────────

import '../html/spielstand.css';
import { GameState } from '../../models/GameState';
import {
  SaveSystem, SpielstandZusammenfassung, StandVorLaden, fasseSpielstandZusammen, pruefeSpielstandText,
  probespielAktiv, spielstandDateiname,
} from '../../systems/SaveSystem';

/** Grössere Dateien liest das Fenster gar nicht erst (ein Spielstand passt in die etwa 5 MB des Browsers). */
const MAX_DATEI_BYTES = 10 * 1024 * 1024;

/** Text der gewählten, geprüften Datei, bis der Spieler bestätigt oder abbricht. */
let gewaehlterText: string | null = null;

function standText(z: SpielstandZusammenfassung): string {
  const helden = z.helden === 1 ? '1 Held' : `${z.helden} Helden`;
  const stufe = z.helden > 0 ? ` (höchste Stufe ${z.hoechsteHeldenstufe})` : '';
  return `Tag ${z.tag} · Stadtstufe ${z.stadtstufe} · ${helden}${stufe}`;
}

/** z. B. «22.10.2026 um 04:35» */
function datumText(ms: number): string {
  const d = new Date(ms);
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()} um ${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/** Ein Element mit Klasse und Text; der Text wird nie als HTML gelesen. */
function element<K extends keyof HTMLElementTagNameMap>(tag: K, klasse = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text) e.textContent = text;
  return e;
}

function knopf(klasse: string, text: string): HTMLButtonElement {
  const k = element('button', `ss-knopf ${klasse}`, text);
  k.type = 'button';
  return k;
}

function knopfReihe(...knoepfe: HTMLButtonElement[]): HTMLDivElement {
  const reihe = element('div', 'ss-knoepfe');
  reihe.append(...knoepfe);
  return reihe;
}

/** Zeile «Titel: Tag … · Stadtstufe … · Helden» */
function standZeile(titel: string, z: SpielstandZusammenfassung): HTMLParagraphElement {
  const p = element('p', 'ss-stand');
  p.append(element('b', '', `${titel}:`), ` ${standText(z)}`);
  return p;
}

/**
 * Zeigt eine Meldung unter den Knöpfen, die sie ausgelöst haben: «datei» (Herunterladen, Datei
 * laden) oder «vorher» (Stand vor dem Laden). Alle anderen Meldungen und eine gewählte Datei gehen weg.
 */
function zeigeMeldung(ov: HTMLElement, wo: 'datei' | 'vorher', ...inhalt: Node[]): void {
  gewaehlterText = null;
  ov.querySelectorAll<HTMLElement>('.ss-meldung').forEach(feld => feld.replaceChildren());
  ov.querySelector<HTMLElement>(`.ss-meldung-${wo}`)?.replaceChildren(...inhalt);
}

function zeigeFehler(ov: HTMLElement, wo: 'datei' | 'vorher', grund: string): void {
  const p = element('p', 'ss-fehler', grund);
  p.setAttribute('role', 'alert');
  zeigeMeldung(ov, wo, p);
}

function herunterladen(ov: HTMLElement, state: GameState): void {
  // Erst den laufenden Stand speichern (main.ts hört auf mc:speichern)
  window.dispatchEvent(new Event('mc:speichern'));
  const text = new SaveSystem().spielstandText();
  if (!text) {
    zeigeFehler(ov, 'datei', 'Es gibt noch keinen gespeicherten Spielstand.');
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = spielstandDateiname(state.day);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  zeigeMeldung(ov, 'datei', element('p', 'ss-ok', `Heruntergeladen: ${a.download}`));
}

async function dateiGewaehlt(ov: HTMLElement, datei: File): Promise<void> {
  if (datei.size > MAX_DATEI_BYTES) {
    zeigeFehler(ov, 'datei', 'Die Datei ist zu gross für einen Spielstand.');
    return;
  }
  let text: string;
  try {
    text = await datei.text();
  } catch {
    zeigeFehler(ov, 'datei', 'Die Datei lässt sich nicht lesen.');
    return;
  }
  const pruefung = pruefeSpielstandText(text);
  if (!pruefung.ok) {
    zeigeFehler(ov, 'datei', pruefung.grund);
    return;
  }
  const bestaetigen = element('div', 'ss-bestaetigen');
  bestaetigen.append(
    standZeile('In der Datei', pruefung.zusammenfassung),
    element('p', 'ss-warnung', 'Ersetzt deinen jetzigen Spielstand. Lade ihn vorher herunter, wenn du ihn behalten willst.'),
    element('p', 'ss-erklaerung', 'Bis du wieder eine Datei lädst, kannst du ihn hier zurückholen.'),
    knopfReihe(knopf('ss-ersetzen', 'Laden und neu starten'), knopf('ss-abbrechen', 'Abbrechen')),
  );
  zeigeMeldung(ov, 'datei', bestaetigen);
  gewaehlterText = text;
}

function ersetzen(ov: HTMLElement): void {
  if (!gewaehlterText) return;
  // Den laufenden Stand zuerst speichern: Er kommt auf den Platz «vor dem Laden»
  window.dispatchEvent(new Event('mc:speichern'));
  const ergebnis = new SaveSystem().schreibeSpielstandText(gewaehlterText);
  if (!ergebnis.ok) {
    zeigeFehler(ov, 'datei', ergebnis.grund);
    return;
  }
  startetNeu(ov, 'datei');
}

/** Abschnitt «Stand vor dem Laden»: was drin ist, wann er weggelegt wurde, Knopf zum Zurückholen. */
function vorherAbschnitt(vorher: StandVorLaden): HTMLElement {
  const abschnitt = element('section', 'ss-vorher');
  abschnitt.setAttribute('aria-label', 'Stand vor dem Laden');
  abschnitt.append(standZeile('Stand vor dem Laden', vorher.zusammenfassung));
  if (vorher.gesichertAm !== null) {
    abschnitt.append(element('p', 'ss-erklaerung', `Gesichert am ${datumText(vorher.gesichertAm)}.`));
  }
  const meldung = element('div', 'ss-meldung ss-meldung-vorher');
  meldung.setAttribute('aria-live', 'polite');
  abschnitt.append(knopfReihe(knopf('ss-zurueck', 'Zurückholen')), meldung);
  return abschnitt;
}

function frageZurueckholen(ov: HTMLElement): void {
  const bestaetigen = element('div', 'ss-bestaetigen');
  bestaetigen.append(
    element('p', 'ss-warnung', 'Tauscht ihn mit deinem jetzigen Spielstand. Den jetzigen kannst du danach hier wieder zurückholen.'),
    knopfReihe(knopf('ss-zurueck-ja', 'Zurückholen und neu starten'), knopf('ss-abbrechen', 'Abbrechen')),
  );
  zeigeMeldung(ov, 'vorher', bestaetigen);
}

function zurueckholen(ov: HTMLElement): void {
  // Den laufenden Stand zuerst speichern: Er tauscht mit dem Stand vor dem Laden
  window.dispatchEvent(new Event('mc:speichern'));
  const ergebnis = new SaveSystem().holeStandVorLadenZurueck();
  if (!ergebnis.ok) {
    zeigeFehler(ov, 'vorher', ergebnis.grund);
    return;
  }
  startetNeu(ov, 'vorher');
}

/**
 * Der neue Stand ist geschrieben, SaveSystem speichert nichts mehr: alle Knöpfe sperren und
 * sofort neu laden, sonst überschreibt das laufende Spiel den Stand beim nächsten Speichern.
 */
function startetNeu(ov: HTMLElement, wo: 'datei' | 'vorher'): void {
  zeigeMeldung(ov, wo, element('p', 'ss-ok', 'Das Spiel startet neu.'));
  ov.querySelectorAll<HTMLButtonElement>('.ss-knopf').forEach(k => { k.disabled = true; });
  location.reload();
}

export function schliesseSpielstand(): void {
  gewaehlterText = null;
  const ov = document.querySelector('.ss-ov');
  window.removeEventListener('keydown', tasteImFenster, true);
  if (!ov) return;
  ov.remove();
  document.querySelector<HTMLElement>('.ss-oeffnen')?.focus();
}

/**
 * Nach dem Schliessen mit einem Klick: Der zweite Klick eines Doppelklicks (✕, Hintergrund)
 * träfe sonst das Hauptmenü dahinter und öffnete eine Kachel.
 */
function schliesseMitKlick(): void {
  schliesseSpielstand();
  const schlucke = (e: MouseEvent) => {
    if (e.detail > 1) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    window.removeEventListener('click', schlucke, true);
  };
  window.addEventListener('click', schlucke, true);
  setTimeout(() => window.removeEventListener('click', schlucke, true), 700);
}

/** Tab und Umschalt+Tab bleiben im Fenster (es ist modal). */
function halteFokusImFenster(e: KeyboardEvent, fenster: HTMLElement): void {
  const ziele = Array.from(fenster.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
  const aktiv = document.activeElement;
  const draussen = !(aktiv instanceof HTMLElement) || aktiv === fenster || !fenster.contains(aktiv);
  if (ziele.length === 0) {
    e.preventDefault();
    fenster.focus();
  } else if (e.shiftKey && (draussen || aktiv === ziele[0])) {
    e.preventDefault();
    ziele[ziele.length - 1].focus();
  } else if (!e.shiftKey && (draussen || aktiv === ziele[ziele.length - 1])) {
    e.preventDefault();
    ziele[0].focus();
  }
}

/**
 * Tasten, solange das Fenster offen ist (auf window in der Capture-Phase, also vor allen anderen):
 * Escape schliesst, Tab bleibt im Fenster. Die Tastenkürzel des Spiels dahinter (K, A, G, Escape in
 * main.ts, 1/2/3/0 im Hauptmenü) bekommen die Taste nicht. Enter und Leertaste auf Knöpfen wirken
 * weiter, sie sind kein Tastenkürzel. F5 geht durch: main.ts speichert damit statt neu zu laden.
 */
function tasteImFenster(e: KeyboardEvent): void {
  const fenster = document.querySelector<HTMLElement>('.ss-fenster');
  if (!fenster || e.key === 'F5') return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape') {
    e.preventDefault();
    schliesseSpielstand();
  } else if (e.key === 'Tab') {
    halteFokusImFenster(e, fenster);
  }
}

/** Öffnet das Fenster «Spielstand». */
export function oeffneSpielstand(state: GameState): void {
  schliesseSpielstand();
  window.dispatchEvent(new Event('mc:speichern'));
  const probe = probespielAktiv()
    ? '<p class="ss-hinweis">Probespiel: Es hat einen eigenen Speicherplatz. Dein richtiger Spielstand bleibt unberührt.</p>'
    : '';
  const ov = document.createElement('div');
  ov.className = 'ss-ov';
  ov.innerHTML = `<div class="ss-fenster" role="dialog" aria-modal="true" aria-labelledby="ss-titel" tabindex="-1">
      <button type="button" class="ss-zu" aria-label="Schliessen">✕</button>
      <h2 id="ss-titel" class="ss-titel">Spielstand</h2>
      ${probe}
      <p class="ss-erklaerung">Der Spielstand liegt nur in diesem Browser. Lade ihn herunter, um ihn zu sichern oder auf einem anderen Gerät weiterzuspielen.</p>
      <div class="ss-knoepfe">
        <button type="button" class="ss-knopf ss-herunterladen">Herunterladen</button>
        <button type="button" class="ss-knopf ss-laden">Datei laden</button>
      </div>
      <input type="file" class="ss-datei" accept=".json,application/json" hidden>
      <div class="ss-meldung ss-meldung-datei" aria-live="polite"></div>
    </div>`;
  const fenster = ov.querySelector<HTMLElement>('.ss-fenster')!;
  fenster.querySelector('.ss-titel')!.after(standZeile('Gespeichert', fasseSpielstandZusammen(state)));
  const vorher = new SaveSystem().standVorLaden();
  if (vorher) fenster.append(vorherAbschnitt(vorher));
  document.body.appendChild(ov);
  window.addEventListener('keydown', tasteImFenster, true);
  fenster.focus();

  const eingabe = ov.querySelector<HTMLInputElement>('.ss-datei')!;
  eingabe.addEventListener('change', () => {
    const datei = eingabe.files?.[0];
    eingabe.value = ''; // dieselbe Datei nochmals wählen löst wieder change aus
    if (datei) {
      dateiGewaehlt(ov, datei).catch(e => {
        console.warn('Spielstand-Datei lässt sich nicht prüfen:', e);
        zeigeFehler(ov, 'datei', 'Die Datei ist beschädigt.');
      });
    }
  });

  // Schliessen über den Hintergrund nur, wenn der Klick dort begann und kein Doppelklick ist: Der
  // zweite Klick eines Doppelklicks auf «💾 Spielstand» träfe sonst den eben geöffneten Hintergrund.
  let druckAufHintergrund = false;
  ov.addEventListener('pointerdown', e => {
    druckAufHintergrund = e.target === ov;
  });
  ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    if (ziel === ov) {
      if (druckAufHintergrund && e.detail === 1) schliesseMitKlick();
      return;
    }
    // Der zweite Klick eines Doppelklicks löst nichts ein zweites Mal aus
    if (e.detail > 1) return;
    if (ziel.closest('.ss-zu')) schliesseMitKlick();
    else if (ziel.closest('.ss-herunterladen')) herunterladen(ov, state);
    else if (ziel.closest('.ss-laden')) eingabe.click();
    else if (ziel.closest('.ss-ersetzen')) ersetzen(ov);
    else if (ziel.closest('.ss-zurueck-ja')) zurueckholen(ov);
    else if (ziel.closest('.ss-zurueck')) frageZurueckholen(ov);
    else if (ziel.closest('.ss-abbrechen')) zeigeMeldung(ov, 'datei');
  });
}
