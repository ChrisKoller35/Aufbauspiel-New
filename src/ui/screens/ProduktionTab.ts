// ─── Magic City – Reiter «Stadt» (Mindmap) ──────────────────────
// Drei Reihen von oben nach unten, ohne Verbindungslinien: Beute aus den
// Dungeons (Balken über die ganze Breite mit den fünf Beute-Gruppen) →
// Händler und Werkstätten → Gilde. Ein Bauplatz wird direkt auf seiner
// Karte freigeschaltet (Bau-Dialog). Jedes Gebäude kommt genau einmal
// vor; statt «×N» steht die Ausbau-Stufe. Daten: data/produktionsnetz.ts.
// Klicks werden über BuildingsScreen angebunden (Callbacks). Grösse: MindmapGroesse.ts, Texte:
// MindmapTexte.ts, Erklärung beim Darüberfahren oder langen Drücken:
// MindmapTipp.ts. Das empfohlene nächste Gebäude ist golden markiert
// (systems/Empfehlung.ts); empfiehlt sie keinen Bau, sondern einen
// Helden (typeId leer), führen Engpass-Zeile und Ziel «Bauen» zu den Helden.
// ────────────────────────────────────────────────────────────────

import { NETZ_REIHEN, NetzKnoten, netzKnoten, BEUTE_GRUPPEN } from '../../data/produktionsnetz';
import { GameState } from '../../models/GameState';
import { getGebaeudeStatus, gebaeudeName, GebaeudeStatus } from '../../systems/GebaeudeStatus';
import { naechsterBau } from '../../systems/Empfehlung';
import { engpaesseDerStadt } from '../../systems/EngpassSystem';
import { quellenVorrat, quellenText, stufeText, zielWert } from './MindmapTexte';
import { passeMindmapAn } from './MindmapGroesse';
import { zeigeTipp, versteckeTipp, frischeTippAuf } from './MindmapTipp';

export type ProduktionZiel = 'expeditions' | 'heroes' | 'aufbau';

export interface ProduktionCallbacks {
  /** Gebautes Gebäude: Fenster mit Werkstatt und Ausbau öffnen. */
  oeffneGebaeude: (typeId: string) => void;
  /** Bauplatz oder gesperrt: Kauf-Dialog (zeigt Sperrgrund). */
  kaufen: (typeId: string) => void;
  /** Zutat aus den Dungeons oder Ziel-Kasten: anderer Bildschirm oder Reiter. */
  wechseln: (ziel: ProduktionZiel) => void;
}

/** Zeichen der fünf Beute-Gruppen im Balken oben (data/produktionsnetz.ts). */
const BEUTE_SYMBOL: Record<string, string> = {
  'beute:eisen': '⚙️', 'beute:kristall': '💎', 'beute:kraeuter': '🌿', 'beute:seltene-kraeuter': '🌸', 'beute:material': '🧱',
};

type Bild = (typeId: string) => string;

// ── HTML ────────────────────────────────────────────────────────

function balken(fortschritt: number | null): string {
  const pct = fortschritt === null ? 0 : Math.round(fortschritt * 100);
  return `<div class="pk-bar"${fortschritt === null ? ' hidden' : ''}><i style="width:${pct}%"></i></div>`;
}

/** Die fünf Beute-Gruppen mit ihrem Vorrat; data-knoten gibt jedem Chip seine Erklärung (beute:…). */
function beuteChips(state: GameState): string {
  return BEUTE_GRUPPEN.map(g => `<span class="pk-chip" data-knoten="${g.id}" tabindex="0" role="img" aria-label="${g.titel}: ${quellenVorrat(state, g.items)} im Lager">${BEUTE_SYMBOL[g.id] ?? ''} <b>${quellenVorrat(state, g.items)}</b> ${g.titel}</span>`).join('');
}

function kartenKlasse(s: GebaeudeStatus, empfohlen: boolean): string {
  return `pk-karte z-${s.zustand}${empfohlen ? ' empfohlen' : ''}`;
}

function gebaeudeKarte(state: GameState, typeId: string, bild: Bild, empfohlen: string | null): string {
  const s = getGebaeudeStatus(state, typeId);
  const stufe = stufeText(s);
  return `
    <div class="${kartenKlasse(s, empfohlen === typeId)}" data-knoten="${typeId}" data-type-id="${typeId}" tabindex="0" role="button" aria-label="${gebaeudeName(typeId)}">
      <div class="pk-img" style="${bild(typeId)}"></div>
      <span class="pk-lock">🔒</span>
      <span class="pk-tipp">Als Nächstes</span>
      <span class="pk-stufe"${stufe ? '' : ' hidden'}>${stufe}</span>
      <div class="pk-nm">${gebaeudeName(typeId)}</div>
      <div class="pk-st">${s.text}</div>
      ${balken(s.fortschritt)}
    </div>`;
}

function quellenKlasse(state: GameState, k: Extract<NetzKnoten, { art: 'quelle' }>): string {
  return `pk-karte pk-quelle${k.breit ? ' pk-breit' : ''} z-${quellenVorrat(state, k.items) > 0 ? 'bereit' : 'wartet'}`;
}

/** Beute aus den Dungeons; `breit` = Balken über die ganze Reihe mit den fünf Gruppen als Chips. */
function quellenKarte(state: GameState, k: Extract<NetzKnoten, { art: 'quelle' }>): string {
  const kopf = `<div class="pk-nm">${k.titel}</div><div class="pk-st">${quellenText(state, k.items)}</div>`;
  const knopf = `data-knoten="${k.id}" data-quelle="${k.id}" tabindex="0" role="button" aria-label="${k.titel}"`;
  if (k.breit) {
    return `
    <div class="${quellenKlasse(state, k)}" ${knopf}>
      <div class="pk-img" style="background-image:url('assets/tiles/${k.bild}.png')"></div>
      <div class="pk-breit-txt">${kopf}</div>
      <div class="pk-chips">${beuteChips(state)}</div>
    </div>`;
  }
  return `
    <div class="${quellenKlasse(state, k)}" ${knopf}>
      <div class="pk-img" style="background-image:url('assets/tiles/${k.bild}.png')"></div>
      ${kopf}
    </div>`;
}

function zielKarte(state: GameState, k: Extract<NetzKnoten, { art: 'ziel' }>): string {
  return `
    <div class="pk-ziel link" data-knoten="${k.id}" data-ziel="${k.wert}" tabindex="0" role="button" aria-label="${k.titel}">
      <b>${k.titel}</b><span class="pk-ziel-w">${zielWert(state, k.wert)}</span>
    </div>`;
}

function knotenHTML(state: GameState, k: NetzKnoten, bild: Bild, empfohlen: string | null): string {
  if (k.art === 'gebaeude') return gebaeudeKarte(state, k.typeId, bild, empfohlen);
  if (k.art === 'quelle') return quellenKarte(state, k);
  return zielKarte(state, k);
}

function engpaesseHTML(state: GameState): string {
  const liste = engpaesseDerStadt(state, 3);
  if (liste.length === 0) return '<span class="pk-eng-ok">✓ Alles läuft rund.</span>';
  return liste.map(e => `<button class="pk-eng-item" data-type-id="${e.typeId}">⚠ ${e.satz}</button>`).join('');
}

export function renderProduktionTab(state: GameState, bild: Bild): string {
  const empfohlen = naechsterBau(state)?.typeId ?? null;
  const reihen = NETZ_REIHEN.map(r => `
    <section class="pk-reihe" data-reihe="${r.id}">
      <div class="pk-kopf"><h3>${r.titel}</h3><small>${r.untertitel}</small></div>
      <div class="pk-row">${r.knoten.map(k => knotenHTML(state, k, bild, empfohlen)).join('')}</div>
    </section>`).join('');
  return `
    <div class="pk">
      <div class="pk-top">
        <p class="pk-hint">Oben die Beute aus den Dungeons, in der Mitte machen Händler und Werkstätten daraus Ausrüstung
          und Tränke, unten die Gilde. Klick auf den Händler öffnet seinen Laden, auf ein Gebäude Werkstatt und Ausbau,
          auf einen Bauplatz den Bau-Dialog: Dort schaltest du die Werkstatt direkt frei.
          <span class="nur-maus">Fahre mit der Maus über ein Gebäude, dann steht da kurz, wofür es gut ist.</span>
          <span class="nur-touch">Lange drücken zeigt kurz, wofür ein Gebäude gut ist.</span>
          Golden umrandet: das Gebäude, das sich als Nächstes lohnt.</p>
        <div class="pk-engpaesse">${engpaesseHTML(state)}</div>
      </div>
      <div class="pk-rahmen">
        <div class="pk-netz">
          ${reihen}
        </div>
      </div>
      <div class="pk-tip" role="tooltip" hidden></div>
    </div>`;
}

// ── Laufende Aktualisierung (ohne Neuzeichnen) ──────────────────

function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

function aktualisiereKarte(karte: HTMLElement, s: GebaeudeStatus, empfohlen: string | null): void {
  const cls = kartenKlasse(s, empfohlen === s.typeId);
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), s.text);
  const stufe = karte.querySelector('.pk-stufe') as HTMLElement | null;
  if (stufe) {
    const text = stufeText(s);
    stufe.hidden = !text;
    setText(stufe, text);
  }
  const bar = karte.querySelector('.pk-bar') as HTMLElement | null;
  if (bar) {
    bar.hidden = s.fortschritt === null;
    const fill = bar.firstElementChild as HTMLElement;
    const width = `${Math.round((s.fortschritt ?? 0) * 100)}%`;
    if (fill.style.width !== width) fill.style.width = width;
  }
}

/** Beute-Balken: Zustand, Zeile und die Zahlen der Gruppen-Chips (die Chips bleiben, der Fokus auch). */
function aktualisiereQuelle(karte: HTMLElement, state: GameState): void {
  const k = netzKnoten(karte.dataset.quelle!);
  if (!k || k.art !== 'quelle') return;
  const cls = quellenKlasse(state, k);
  if (karte.className !== cls) karte.className = cls;
  setText(karte.querySelector('.pk-st'), quellenText(state, k.items));
  karte.querySelectorAll<HTMLElement>('.pk-chip[data-knoten]').forEach(chip => {
    const g = BEUTE_GRUPPEN.find(x => x.id === chip.dataset.knoten);
    if (g) setText(chip.querySelector('b'), String(quellenVorrat(state, g.items)));
  });
}

export function aktualisiereProduktionTab(panel: HTMLElement, state: GameState): void {
  const empfohlen = naechsterBau(state)?.typeId ?? null;
  panel.querySelectorAll<HTMLElement>('.pk-karte[data-type-id]').forEach(karte => {
    aktualisiereKarte(karte, getGebaeudeStatus(state, karte.dataset.typeId!), empfohlen);
  });
  panel.querySelectorAll<HTMLElement>('.pk-quelle[data-quelle]').forEach(karte => aktualisiereQuelle(karte, state));
  panel.querySelectorAll<HTMLElement>('.pk-ziel[data-ziel]').forEach(ziel => {
    setText(ziel.querySelector('.pk-ziel-w'), zielWert(state, ziel.dataset.ziel as 'bauen' | 'expeditionen'));
  });
  const eng = panel.querySelector('.pk-engpaesse');
  if (eng) {
    const neu = engpaesseHTML(state);
    if (eng.innerHTML !== neu) eng.innerHTML = neu;
  }
  frischeTippAuf(panel, state);
  passeMindmapAn(panel);
}

// ── Klicks ──────────────────────────────────────────────────────

/** Kästen mit Erklärung: Karten der Mindmap und Chips des Beute-Balkens. */
const TIPP_ZIEL = '[data-knoten]';

/** Langes Drücken (Touch) zeigt die Erklärung statt zu öffnen. */
const LANG_DRUECKEN_MS = 450;

export function bindProduktionTab(panel: HTMLElement, state: GameState, cb: ProduktionCallbacks): void {
  let druckTimer: number | null = null;
  let klickSchlucken = false;
  const stopDruck = () => {
    if (druckTimer !== null) window.clearTimeout(druckTimer);
    druckTimer = null;
  };

  panel.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('pointerout', (e) => {
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node | null)) versteckeTipp(panel);
  });
  panel.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (el) zeigeTipp(panel, el, state);
  });
  panel.addEventListener('focusout', () => versteckeTipp(panel));
  panel.addEventListener('scroll', () => versteckeTipp(panel), true);

  panel.addEventListener('pointerdown', (e) => {
    // Ein neuer Druck beginnt: ein altes «Klick schlucken» gilt nicht mehr (nicht jeder Browser klickt nach langem Drücken)
    klickSchlucken = false;
    versteckeTipp(panel);
    if (e.pointerType !== 'touch') return;
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (!el) return;
    stopDruck();
    druckTimer = window.setTimeout(() => {
      druckTimer = null;
      klickSchlucken = true;
      zeigeTipp(panel, el, state);
    }, LANG_DRUECKEN_MS);
  });
  panel.addEventListener('pointerup', stopDruck);
  panel.addEventListener('pointercancel', stopDruck);
  panel.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement).closest(TIPP_ZIEL)) e.preventDefault();
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = (e.target as HTMLElement).closest(TIPP_ZIEL) as HTMLElement | null;
    if (!el) return;
    e.preventDefault();
    el.click();
  });

  panel.addEventListener('click', (e) => {
    if (klickSchlucken) {
      klickSchlucken = false;
      return;
    }
    versteckeTipp(panel);
    const target = e.target as HTMLElement;
    const mitTyp = target.closest('[data-type-id]') as HTMLElement | null;
    if (mitTyp) {
      const typeId = mitTyp.dataset.typeId;
      // Engpass ohne Gebäude (Held anheuern): zu den Helden
      if (!typeId) cb.wechseln('heroes');
      else if (getGebaeudeStatus(state, typeId).anzahl > 0) cb.oeffneGebaeude(typeId);
      else cb.kaufen(typeId);
      return;
    }
    if (target.closest('.pk-quelle')) {
      cb.wechseln('expeditions');
      return;
    }
    const ziel = target.closest('.pk-ziel[data-ziel]') as HTMLElement | null;
    if (!ziel) return;
    if (ziel.dataset.ziel !== 'bauen') cb.wechseln('expeditions');
    else cb.wechseln(naechsterBau(state)?.typeId === '' ? 'heroes' : 'aufbau');
  });
}
