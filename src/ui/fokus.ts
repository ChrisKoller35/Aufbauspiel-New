// ─── Magic City – Tastatur: Deckknöpfe und Fokus über ein Neuzeichnen ─────────
// Kacheln und Karten tippt man mit Maus oder Finger irgendwo an (Hauptmenü, Routen, Team). Für die Tastatur liegt
// über ihnen ein unsichtbarer Knopf (.deckknopf in html/tastatur.css): Tab erreicht ihn, Enter und Leertaste lösen
// denselben Klick aus, Maus und Finger gehen durch ihn hindurch auf die Karte.
// Viele Bildschirme bauen ihr HTML nach einem Klick neu. Der fokussierte Knopf verschwindet dabei, der Fokus fiele
// auf die Seite, und Tab begänne wieder oben. fokusMerken() hält fest, wofür der Knopf steht, fokusZurueck() setzt
// den Fokus im neuen HTML auf den Knopf, der dafür steht. Beschrieben in docs/TASTATUR.md.
// ──────────────────────────────────────────────────────────────

import './html/tastatur.css';

const attr = (text: string): string => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Unsichtbarer Knopf über einer ganzen Kachel oder Karte. `fokus` sagt, wofür er steht (etwa «held-3»): Zieht der
 * Held vom Team in die Liste, findet der Fokus ihn dort wieder. Gesperrte Karten bleiben erreichbar (Sperrgrund
 * im Namen), ihr Klick tut nichts.
 */
export function deckknopf(label: string, fokus: string, gesperrt = false): string {
  return `<button type="button" class="deckknopf" data-fokus="${attr(fokus)}" aria-label="${attr(label)}"`
    + `${gesperrt ? ' aria-disabled="true"' : ''}></button>`;
}

/** Derselbe Deckknopf als Element, für Bildschirme, die mit createElement bauen (Gegner im Kampf) */
export function deckknopfElement(label: string, fokus: string): HTMLButtonElement {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'deckknopf';
  knopf.dataset.fokus = fokus;
  knopf.setAttribute('aria-label', label);
  return knopf;
}

/** Ein fokussierter Knopf, ohne DOM beschrieben */
export interface FokusBeschreibung {
  /** data-fokus des Knopfs (Deckknöpfe) */
  fokus?: string;
  id?: string;
  tag: string;
  /** Die übrigen data-Attribute des Knopfs, etwa data-tab oder data-prov-id und data-prov-action */
  daten: Array<[string, string]>;
}

const zitat = (wert: string): string => `"${wert.replace(/["\\]/g, '\\$&').replace(/\n/g, '\\a ')}"`;

/**
 * Selektor für den gleichwertigen Knopf im neu gezeichneten HTML: zuerst data-fokus, dann die id, dann Tag und
 * alle data-Attribute zusammen. Null, wenn nichts den Knopf wiedererkennt (dann bleibt der Fokus, wo er fällt).
 */
export function fokusSelektor(b: FokusBeschreibung): string | null {
  if (b.fokus) return `[data-fokus=${zitat(b.fokus)}]`;
  if (b.id) return `[id=${zitat(b.id)}]`;
  if (b.daten.length === 0) return null;
  return b.tag.toLowerCase() + b.daten.map(([name, wert]) => `[${name}=${zitat(wert)}]`).join('');
}

export interface FokusMarke {
  selektor: string;
  /** Kam der Fokus von der Tastatur, darf das Bild zum Knopf scrollen. Nach Maus oder Finger bleibt es stehen. */
  tastatur: boolean;
}

/** data-Attribute, die der Klick selbst ändert (der Preis steigt nach dem Anheuern): Sie erkennen den Knopf nicht wieder */
const WECHSELNDE_DATEN = new Set(['data-cost']);

/** Selektor für den Knopf `el` im neu gezeichneten HTML (fokusSelektor) */
function selektorFuer(el: HTMLElement): string | null {
  return fokusSelektor({
    fokus: el.dataset.fokus,
    id: el.id || undefined,
    tag: el.tagName,
    daten: Array.from(el.attributes)
      .filter(a => a.name.startsWith('data-') && a.name !== 'data-fokus' && !WECHSELNDE_DATEN.has(a.name))
      .map(a => [a.name, a.value] as [string, string]),
  });
}

/** Merkt sich den fokussierten Knopf in `wurzel`, bevor sie neu gezeichnet wird (null: kein Fokus darin) */
export function fokusMerken(wurzel: Element | null): FokusMarke | null {
  if (typeof document === 'undefined' || !wurzel || typeof wurzel.contains !== 'function') return null;
  // Ohne instanceof: Die Tests bauen ein kleines DOM ohne HTMLElement (tests/heldenfenster.test.ts)
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === wurzel || !el.dataset || !wurzel.contains(el)) return null;
  const selektor = selektorFuer(el);
  return selektor ? { selektor, tastatur: tastaturZuletzt() } : null;
}

/** Liegt der Fokus nirgends: auf der Seite oder auf einem Knopf, den man nicht (mehr) sieht? */
export function fokusVerloren(): boolean {
  if (typeof document === 'undefined') return false;
  const aktiv = document.activeElement as HTMLElement | null;
  return !aktiv || aktiv === document.body || typeof aktiv.getClientRects !== 'function' || aktiv.getClientRects().length === 0;
}

/**
 * Setzt den Fokus nach dem Neuzeichnen auf den gemerkten Knopf, sonst auf den ersten vorhandenen `ersatz`.
 * Gesperrte und unsichtbare Knöpfe zählen nicht. Liefert, ob ein Knopf den Fokus bekam.
 */
export function fokusZurueck(wurzel: ParentNode, marke: FokusMarke | null, ersatz: string[] = []): boolean {
  if (!marke) return false;
  for (const sel of [marke.selektor, ...ersatz]) {
    const ziel = wurzel.querySelector<HTMLElement>(sel);
    if (!ziel || (ziel as HTMLButtonElement).disabled || ziel.getClientRects().length === 0) continue;
    ziel.focus({ preventScroll: !marke.tastatur });
    return true;
  }
  return false;
}

// ── Womit zuletzt bedient wurde ──

let tastatur = false;
/** Worauf Maus oder Finger zuletzt drückten (ein Element in der Seite) */
let letzterDruck: Element | null = null;

/** Achtet auf Tasten und Zeiger (einmal beim Start, main.ts). Tab, Enter, Leertaste, Pfeile und Escape zählen als Tastatur. */
export function eingabeBeobachten(): void {
  window.addEventListener('keydown', e => {
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key.startsWith('Arrow')
      || (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)) tastatur = true;
  }, true);
  window.addEventListener('pointerdown', e => {
    tastatur = false;
    const ziel = e.target as Element | null;
    letzterDruck = ziel && typeof ziel.closest === 'function' ? ziel : null;
  }, true);
}

/** Wurde zuletzt mit der Tastatur bedient? */
export function tastaturZuletzt(): boolean {
  return tastatur;
}

// ── Bildschirmwechsel ──

/** Je Bildschirm der Knopf, der beim Verlassen den Fokus hatte (Kachel, Routenkarte, Knoten der Dungeonkarte) */
const fokusBeimVerlassen = new Map<string, FokusMarke>();

/** Was Tab erreicht: der Knopf selbst, auf den man drückte (ein Deckknopf liegt in der Karte daneben) */
const ERREICHBAR = 'button, a[href], summary, [tabindex]:not([tabindex="-1"])';

/**
 * Mit Maus oder Finger hat kein Knopf den Fokus: Kacheln und Karten fangen den Druck, ihr Deckknopf lässt ihn
 * durch. Es zählt dann, worauf zuletzt gedrückt wurde: ein Knopf selbst oder der Deckknopf der Karte, in der der
 * Druck lag. Kommt man später mit der Tastatur zurück, steht der Fokus auf der Karte, die man angeklickt hat.
 */
function druckMerken(wurzel: Element): FokusMarke | null {
  const druck = letzterDruck;
  if (!druck || !druck.isConnected || !wurzel.contains(druck)) return null;
  for (let el: Element | null = druck; el && el !== wurzel; el = el.parentElement) {
    const knopf = el.matches(ERREICHBAR) ? el : Array.from(el.children).find(k => k.classList.contains('deckknopf'));
    if (!knopf) continue;
    const selektor = selektorFuer(knopf as HTMLElement);
    return selektor ? { selektor, tastatur: false } : null;
  }
  return null;
}

/**
 * Vor einem Bildschirmwechsel (ScreenRouter): merkt sich den fokussierten Knopf im Bildschirm, der geht, sonst den
 * zuletzt angeklickten. Ohne beides gilt auch die Marke eines früheren Besuchs nicht mehr: Der Bildschirm nimmt
 * beim nächsten Mal selbst den Fokus.
 */
export function bildschirmVerlassen(id: string): void {
  if (typeof document === 'undefined') return;
  const wurzel = document.getElementById(id);
  const marke = fokusMerken(wurzel) ?? (wurzel ? druckMerken(wurzel) : null);
  if (marke) fokusBeimVerlassen.set(id, marke);
  else fokusBeimVerlassen.delete(id);
}

/**
 * Ein neuer Einstieg statt eines Zurück: Ohne `fokus` beginnt `id` beim nächsten Mal oben (das Team für eine andere
 * Route). Mit `fokus` (data-fokus eines Knopfs) steht der Fokus dann auf diesem Knopf, als hätte man `id` damit
 * verlassen (die Routenliste nach der Expedition auf der gespielten Route, auch wenn man über die Karte kam).
 */
export function bildschirmMarke(id: string, fokus: string | null): void {
  const selektor = fokus ? fokusSelektor({ fokus, tag: '', daten: [] }) : null;
  if (selektor) fokusBeimVerlassen.set(id, { selektor, tastatur: true });
  else fokusBeimVerlassen.delete(id);
}

/**
 * Nach einem Bildschirmwechsel mit der Tastatur: Zurück auf einem Bildschirm steht der Fokus auf dem Knopf, mit dem
 * man ihn verlassen hat (nach der Expedition auf ihrer Routenkarte, nach «Zurück» auf der Kachel im Hauptmenü). Ein
 * neuer Bildschirm nimmt den Fokus selbst, ohne Rahmen: Der nächste Tab landet auf seinem ersten Knopf, nicht hinter
 * dem alten Bildschirm oder in der Adresszeile. Maus und Finger: nichts.
 */
export function bildschirmFokussieren(id: string): void {
  if (!tastatur || typeof document === 'undefined') return;
  const el = document.getElementById(id);
  // Nur einen verlorenen Fokus (Seite oder ein Knopf im eben versteckten Bildschirm): Hat der neue Bildschirm schon
  // etwas fokussiert, etwa ein Fenster beim ersten Besuch, bleibt der Fokus dort
  if (!el || !fokusVerloren()) return;
  // Zurück mit der Tastatur: Das Bild darf zum Knopf scrollen, auch wenn man den Bildschirm mit der Maus verliess
  const marke = fokusBeimVerlassen.get(id);
  if (marke && fokusZurueck(el, { ...marke, tastatur: true })) return;
  if (!el.hasAttribute('tabindex')) el.tabIndex = -1;
  el.focus({ preventScroll: true });
}
