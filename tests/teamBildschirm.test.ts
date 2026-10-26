// Team-Bildschirm: Der gewählte Härtegrad ist beim Start zu sehen (Knöpfe oben im Bild, Grad auf dem Start-Knopf),
// mit einem kleinen Ersatz für Fenster und Seite (die Tests laufen ohne Browser). Dass der Browser die Scroll-Lage
// eines versteckten Bildschirms wiederherstellt, prüft nur Playwright (Prüfliste im PR).
// Hier ruft der Test das Neuzeichnen selbst auf; dass main.ts es bei jedem Wechsel auf den Bildschirm tut, prüft
// tests/neuzeichnen.test.ts.
import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest';
import { createNewGameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { haertegradWahlHtml, startKnopfHaerte } from '../src/ui/components/HaertegradAnzeige';

type Klick = (e: { target: unknown }) => void;
class Bildschirm {
  id = '';
  className = '';
  innerHTML = '';
  scrollTop = 0;
  style = { display: 'none' };
  klick: Klick | null = null;
  addEventListener(art: string, f: Klick) { if (art === 'click') this.klick = f; }
}

const bildschirme: Record<string, Bildschirm> = {};
const seite = {
  addEventListener: () => {},
  createElement: () => new Bildschirm(),
  getElementById: (id: string) => bildschirme[id] ?? null,
  querySelector: () => null,
  querySelectorAll: () => [],
};
const fenster = Object.assign(new EventTarget(), {
  setTimeout: (f: () => void, ms: number) => globalThis.setTimeout(f, ms),
  clearTimeout: (t: number) => globalThis.clearTimeout(t),
});

let ex: typeof import('../src/ui/screens/ExpeditionsScreen');

beforeAll(async () => {
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('document', seite);
  ex = await import('../src/ui/screens/ExpeditionsScreen');
});

afterAll(() => { vi.unstubAllGlobals(); });

/** Probespiel «sterne»: Das Himmelsarchiv ist bezwungen, die Härtegrade sind wählbar */
function stand() {
  const state = createNewGameState();
  placeStartingLayout(state);
  richteProbespielEin(state, 'sterne');
  return state;
}

/** Ein Klick auf den Knopf des Grads (nur `closest('[data-haertegrad]')` trifft) */
function waehleGrad(team: Bildschirm, grad: string): void {
  const knopf = { dataset: { haertegrad: grad } };
  team.klick?.({ target: { closest: (sel: string) => (sel === '[data-haertegrad]' ? knopf : null) } });
}

describe('Team-Bildschirm: Härtegrad beim Start', () => {
  test('Name und ✓ in eigenen Spans (nur das Markup; ob das ✓ bei 320 px sichtbar bleibt, misst Playwright)', () => {
    const state = stand();
    state.haertegrade = { ...state.haertegrade, himmelsarchiv: 'nightmare' };
    const html = haertegradWahlHtml(state, 'himmelsarchiv', 'nightmare');
    expect(html.match(/<span class="haerte-haken">✓<\/span>/g)).toHaveLength(3);
    expect(html).toContain('<span class="haerte-name">☠ Albtraum</span> <span class="haerte-haken">✓</span></button>');
    expect(html.replace(/<[^>]+>/g, '')).toContain('☠ Albtraum ✓');
  });

  test('Start-Knopf: zweite Zeile nur bei Schwer und Albtraum', () => {
    expect(startKnopfHaerte('normal')).toBe('');
    expect(startKnopfHaerte('hard')).toBe('<span class="btn-go-haerte">⚔ Schwer</span>');
    expect(startKnopfHaerte('nightmare')).toBe('<span class="btn-go-haerte">☠ Albtraum</span>');
  });

  test('Routenwahl: oben beginnen, sobald der Bildschirm sichtbar ist; der Grad steht auf dem Start-Knopf', () => {
    const state = stand();
    ex.initExpeditionsScreen(state);
    ex.renderExpeditionsScreen({ appendChild: (el: Bildschirm) => { bildschirme[el.id] = el; } } as unknown as HTMLElement);
    const team = bildschirme['s-team'];
    expect(team).toBeDefined();

    ex.setSelectedRoute('himmelsarchiv');
    team.style.display = 'flex';
    ex.refreshExpeditionsScreens();
    expect(team.innerHTML).toContain('<button class="btn-go">EXPEDITION STARTEN</button>');

    // Albtraum wählen, zum Start-Knopf scrollen: Ein Neuzeichnen im Bildschirm lässt die Lage stehen
    waehleGrad(team, 'nightmare');
    expect(team.innerHTML).toContain('<button class="btn-go btn-go-nightmare">EXPEDITION STARTEN<span class="btn-go-haerte">☠ Albtraum</span></button>');
    team.scrollTop = 390;
    ex.refreshExpeditionsScreens();
    expect(team.scrollTop).toBe(390);

    // Nach der Expedition (versteckt) wieder dieselbe Route: Am versteckten Bildschirm wirkt scrollTop nicht ...
    team.style.display = 'none';
    ex.initExpeditionsScreen(state);
    ex.setSelectedRoute('himmelsarchiv');
    expect(team.scrollTop).toBe(390);
    // ... beim ersten Neuzeichnen im Bild beginnt er oben, die alte Wahl steht weiter auf dem Knopf
    team.style.display = 'flex';
    ex.refreshExpeditionsScreens();
    expect(team.scrollTop).toBe(0);
    expect(team.innerHTML).toContain('btn-go-nightmare');
    team.scrollTop = 200;
    ex.refreshExpeditionsScreens();
    expect(team.scrollTop).toBe(200);
  });
});
