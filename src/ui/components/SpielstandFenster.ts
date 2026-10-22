// ─── Magic City – Fenster «Spielstand» ──────────────────────────
// Zeigt, was gespeichert ist, lädt den Spielstand als Datei herunter
// und lädt einen Spielstand aus einer Datei (mit Bestätigung im Fenster,
// danach lädt das Spiel neu). Geöffnet aus dem Hauptmenü.
// Logik: systems/SaveSystem.ts. Stile: ui/html/spielstand.css.
// Doku: docs/SPIELSTAND.md
// ────────────────────────────────────────────────────────────────

import '../html/spielstand.css';
import { GameState } from '../../models/GameState';
import {
  SaveSystem, SpielstandZusammenfassung, fasseSpielstandZusammen, pruefeSpielstandText,
  probespielAktiv, spielstandDateiname,
} from '../../systems/SaveSystem';

/** Text der gewählten, geprüften Datei, bis der Spieler bestätigt oder abbricht. */
let gewaehlterText: string | null = null;

function standText(z: SpielstandZusammenfassung): string {
  const helden = z.helden === 1 ? '1 Held' : `${z.helden} Helden`;
  const stufe = z.helden > 0 ? ` (höchste Stufe ${z.hoechsteHeldenstufe})` : '';
  return `Tag ${z.tag} · Stadtstufe ${z.stadtstufe} · ${helden}${stufe}`;
}

function zeigeMeldung(ov: HTMLElement, html: string): void {
  ov.querySelector<HTMLElement>('.ss-meldung')!.innerHTML = html;
}

function zeigeFehler(ov: HTMLElement, grund: string): void {
  gewaehlterText = null;
  zeigeMeldung(ov, `<p class="ss-fehler" role="alert">${grund}</p>`);
}

function herunterladen(ov: HTMLElement, state: GameState): void {
  // Erst den laufenden Stand speichern (main.ts hört auf mc:speichern)
  window.dispatchEvent(new Event('mc:speichern'));
  const text = new SaveSystem().spielstandText();
  if (!text) {
    zeigeFehler(ov, 'Es gibt noch keinen gespeicherten Spielstand.');
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
  gewaehlterText = null;
  zeigeMeldung(ov, `<p class="ss-ok">Heruntergeladen: ${a.download}</p>`);
}

async function dateiGewaehlt(ov: HTMLElement, datei: File): Promise<void> {
  let text: string;
  try {
    text = await datei.text();
  } catch {
    zeigeFehler(ov, 'Die Datei lässt sich nicht lesen.');
    return;
  }
  const pruefung = pruefeSpielstandText(text);
  if (!pruefung.ok) {
    zeigeFehler(ov, pruefung.grund);
    return;
  }
  gewaehlterText = text;
  zeigeMeldung(ov, `<div class="ss-bestaetigen">
      <p><b>In der Datei:</b> ${standText(pruefung.zusammenfassung)}</p>
      <p class="ss-warnung">Ersetzt deinen jetzigen Spielstand. Lade ihn vorher herunter, wenn du ihn behalten willst.</p>
      <div class="ss-knoepfe">
        <button type="button" class="ss-knopf ss-ersetzen">Laden und neu starten</button>
        <button type="button" class="ss-knopf ss-abbrechen">Abbrechen</button>
      </div>
    </div>`);
}

function ersetzen(ov: HTMLElement): void {
  if (!gewaehlterText) return;
  const ergebnis = new SaveSystem().schreibeSpielstandText(gewaehlterText);
  if (!ergebnis.ok) {
    zeigeFehler(ov, ergebnis.grund);
    return;
  }
  // Sofort neu laden, sonst überschreibt das laufende Spiel den geladenen Stand
  location.reload();
}

export function schliesseSpielstand(): void {
  gewaehlterText = null;
  document.querySelector('.ss-ov')?.remove();
  document.removeEventListener('keydown', tasteImFenster, true);
  document.querySelector<HTMLElement>('.ss-oeffnen')?.focus();
}

function tasteImFenster(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation();
    schliesseSpielstand();
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
      <p class="ss-stand"><b>Gespeichert:</b> ${standText(fasseSpielstandZusammen(state))}</p>
      ${probe}
      <p class="ss-erklaerung">Der Spielstand liegt nur in diesem Browser. Lade ihn herunter, um ihn zu sichern oder auf einem anderen Gerät weiterzuspielen.</p>
      <div class="ss-knoepfe">
        <button type="button" class="ss-knopf ss-herunterladen">Herunterladen</button>
        <button type="button" class="ss-knopf ss-laden">Datei laden</button>
      </div>
      <input type="file" class="ss-datei" accept=".json,application/json" hidden>
      <div class="ss-meldung" aria-live="polite"></div>
    </div>`;
  document.body.appendChild(ov);
  document.addEventListener('keydown', tasteImFenster, true);
  ov.querySelector<HTMLElement>('.ss-fenster')!.focus();

  const eingabe = ov.querySelector<HTMLInputElement>('.ss-datei')!;
  eingabe.addEventListener('change', () => {
    const datei = eingabe.files?.[0];
    eingabe.value = ''; // dieselbe Datei nochmals wählen löst wieder change aus
    if (datei) void dateiGewaehlt(ov, datei);
  });

  ov.addEventListener('click', e => {
    const ziel = e.target as HTMLElement;
    if (ziel === ov || ziel.closest('.ss-zu')) schliesseSpielstand();
    else if (ziel.closest('.ss-herunterladen')) herunterladen(ov, state);
    else if (ziel.closest('.ss-laden')) eingabe.click();
    else if (ziel.closest('.ss-ersetzen')) ersetzen(ov);
    else if (ziel.closest('.ss-abbrechen')) {
      gewaehlterText = null;
      zeigeMeldung(ov, '');
    }
  });
}
