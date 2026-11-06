import { describe, test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  deckknopf, fokusSelektor, fokusMerken, fokusZurueck, eingabeBeobachten, bildschirmVerlassen, bildschirmFokussieren,
  bildschirmMarke,
} from '../src/ui/fokus';
import { fensterTaste, FENSTER_ZIELE } from '../src/ui/components/FensterHilfen';

/**
 * Tastatur (docs/TASTATUR.md): Deckknöpfe über Kacheln und Karten, Fokus über ein Neuzeichnen, Fenster der
 * Expedition. Ohne Browser: geprüft werden die Bausteine und dass die Bildschirme sie benutzen. Den Weg vom
 * Hauptmenü bis zur Bilanz nur mit Tab und Enter prüft der Rundgang im Browser (PR).
 */

const SRC = join(__dirname, '../src');
const lies = (datei: string) => readFileSync(join(SRC, datei), 'utf8');

describe('Deckknopf', () => {
  test('ist ein echter Knopf mit Namen und Schlüssel', () => {
    const html = deckknopf('Gebäude & Crafting', 'kachel-buildings');
    expect(html).toContain('<button type="button" class="deckknopf"');
    expect(html).toContain('data-fokus="kachel-buildings"');
    expect(html).toContain('aria-label="Gebäude &amp; Crafting"');
    expect(html).not.toContain('aria-disabled');
  });

  test('eine gesperrte Karte bleibt erreichbar, ihr Klick tut nichts', () => {
    const html = deckknopf('Der Sternenschlund, gesperrt: Besiege "Korrund"', 'route-x', true);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled/);
    expect(html).toContain('&quot;Korrund&quot;');
  });

  test('Maus und Finger gehen hindurch, der Rahmen zeigt sich nur mit der Tastatur', () => {
    const css = readFileSync(join(SRC, 'ui/html/tastatur.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regel = css.match(/\.deckknopf\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(regel).toMatch(/pointer-events:\s*none/);
    expect(regel).toMatch(/inset:\s*0/);
    // über Bild, Verlauf (z-index 1–2) und Schrift (z-index 3) der Kacheln
    expect(Number(regel.match(/z-index:\s*(\d+)/)?.[1])).toBeGreaterThan(3);
    expect(css).toMatch(/\.deckknopf:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--gold\)/);
  });
});

describe('Fokus über ein Neuzeichnen', () => {
  test('Schlüssel vor id vor data-Attributen', () => {
    expect(fokusSelektor({ fokus: 'held-3', id: 'x', tag: 'BUTTON', daten: [['data-a', '1']] })).toBe('[data-fokus="held-3"]');
    expect(fokusSelektor({ id: 'hdm2-name', tag: 'H2', daten: [] })).toBe('[id="hdm2-name"]');
    expect(fokusSelektor({ tag: 'BUTTON', daten: [['data-prov-action', 'inc'], ['data-prov-id', 'potion_small']] }))
      .toBe('button[data-prov-action="inc"][data-prov-id="potion_small"]');
    expect(fokusSelektor({ tag: 'BUTTON', daten: [['data-tab', 'train']] })).toBe('button[data-tab="train"]');
  });

  test('ohne Erkennungszeichen kein Ziel', () => {
    expect(fokusSelektor({ tag: 'BUTTON', daten: [] })).toBeNull();
  });

  test('Anführungszeichen und Rückstriche bleiben im Selektor eingeschlossen', () => {
    expect(fokusSelektor({ tag: 'BUTTON', daten: [['data-x', 'a"b\\c']] })).toBe('button[data-x="a\\"b\\\\c"]');
  });

  test('ohne Seite (Tests, Server) tut es nichts', () => {
    expect(fokusMerken(null)).toBeNull();
    expect(fokusZurueck({ querySelector: () => null } as unknown as ParentNode, null)).toBe(false);
  });

  test('der Preis erkennt den Knopf nicht: Er steigt durch den Klick (TRAINIEREN, ANHEUERN)', () => {
    const knopf = {
      dataset: {}, id: '', tagName: 'BUTTON',
      attributes: [{ name: 'class', value: 'btn' }, { name: 'data-fighter-id', value: '2' }, { name: 'data-cost', value: '140' }],
    };
    vi.stubGlobal('document', { activeElement: knopf });
    expect(fokusMerken({ contains: () => true } as unknown as Element)?.selektor).toBe('button[data-fighter-id="2"]');
    vi.unstubAllGlobals();
  });

  test('Knöpfe, deren Preis oder Aufschrift wechselt, tragen einen festen Schlüssel', () => {
    const helden = lies('ui/screens/HeroesScreen.ts');
    expect(helden).toContain('data-fokus="trainieren-${fighter.id}"');
    expect(helden.match(/data-fokus="anheuern-\$\{classDef\.id\}"/g)).toHaveLength(2);
    expect(lies('ui/components/KlassenTafel.ts')).toContain('data-fokus="lehrling-${c.id}"');
    const kampf = lies('ui/screens/CombatScreen.ts');
    expect(kampf).toContain('btn.dataset.fokus = `faehigkeit-${unit.id}-${skill.id}`;');
    expect(kampf).toContain('useBtn.dataset.fokus = `vorrat-${zeile.itemId}`;');
    // Wahl einer Fähigkeit und «Nutzen» zeichnen neu, der Fokus bleibt (sonst «Kampf starten!»)
    expect(kampf).toContain('this.mitFokus(() => this.buildAbilitySection(run, room));');
    expect(kampf).toContain('this.mitFokus(() => this.refreshAfterProvision());');
    expect(kampf).toContain("fokusZurueck(this.el, marke, ['.mc-co-fight-btn']);");
  });

  test('nach dem Anheuern oder Aufnehmen: der Knopf an derselben Stelle, sonst der letzte, erst dann der Reiter', () => {
    const helden = lies('ui/screens/HeroesScreen.ts');
    // Der Knopf selbst verschwindet (die Klasse steht jetzt unter «Schon in deiner Gilde»): Art und Stelle merken
    expect(helden).toContain('const art = /^(anheuern|lehrling)-/.exec(btn.dataset.fokus ?? \'\')?.[0];');
    expect(helden).toContain(".filter(k => k.dataset.fokus?.startsWith(art)).indexOf(btn) }");
    expect(helden).toContain('const ziel = reihe[Math.min(stelle, reihe.length - 1)];');
    expect(helden).toContain("fokusZurueck(el, fokus, [...(nachbar ? nachbarKnopf(el, nachbar) : []), '#s-heroes .tab.active']);");
  });
});

describe('Fenster: Tab-Falle und gehaltene Tasten', () => {
  class Ziel {
    constructor(public name: string, public sichtbar = true) {}
    focus = vi.fn();
    getClientRects(): unknown[] { return this.sichtbar ? [{}] : []; }
  }
  const zu = new Ziel('✕');
  const geschichte = new Ziel('summary');
  const versteckt = new Ziel('summary in zugeklappt', false);
  let gefragt = '';
  const fenster = Object.assign(new Ziel('fenster'), {
    querySelectorAll: (sel: string) => { gefragt = sel; return [zu, geschichte, versteckt]; },
    contains: (el: unknown) => [zu, geschichte, versteckt].includes(el as Ziel),
  });
  const taste = (key: string, mehr: Record<string, unknown> = {}) => {
    const e = { key, shiftKey: false, repeat: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn(), ...mehr };
    fensterTaste(e as unknown as KeyboardEvent, fenster as unknown as HTMLElement, () => {});
    return e;
  };
  afterEach(() => vi.unstubAllGlobals());

  test('Aufklapper zählen: Im Fenster eines gesperrten Knotens erreicht Tab die Geschichte', () => {
    vi.stubGlobal('HTMLElement', Ziel);
    expect(FENSTER_ZIELE).toContain('summary:not([tabindex="-1"])');
    expect(FENSTER_ZIELE).toContain('button:not([disabled]):not([tabindex="-1"])');
    vi.stubGlobal('document', { activeElement: zu });
    // Auf ✕ (nicht das letzte Ziel): Der Browser geht weiter zur Geschichte, die Falle greift nicht ein
    expect(taste('Tab').preventDefault).not.toHaveBeenCalled();
    expect(gefragt).toBe(FENSTER_ZIELE);
    // Auf der Geschichte (dem letzten sichtbaren Ziel): zurück zu ✕
    vi.stubGlobal('document', { activeElement: geschichte });
    expect(taste('Tab').preventDefault).toHaveBeenCalled();
    expect(zu.focus).toHaveBeenCalled();
    // Umschalt+Tab auf ✕: zur Geschichte, nicht in den versteckten Teil
    vi.stubGlobal('document', { activeElement: zu });
    taste('Tab', { shiftKey: true });
    expect(geschichte.focus).toHaveBeenCalled();
    expect(versteckt.focus).not.toHaveBeenCalled();
  });

  test('eine gehaltene Taste löst im Fenster nichts ein zweites Mal aus, im Eingabefeld schon', () => {
    expect(taste('Enter').preventDefault).not.toHaveBeenCalled();
    expect(taste('Enter', { repeat: true }).preventDefault).toHaveBeenCalled();
    expect(taste(' ', { repeat: true }).preventDefault).toHaveBeenCalled();
    const feld = { closest: (sel: string) => (sel.includes('input') ? {} : null) };
    expect(taste(' ', { repeat: true, target: feld }).preventDefault).not.toHaveBeenCalled();
  });
});

describe('Bildschirme benutzen die Bausteine', () => {
  test('jede Kachel im Hauptmenü hat einen Deckknopf', () => {
    const quelle = lies('ui/screens/MainMenuScreen.ts');
    const kacheln = quelle.split('<div class="tile').slice(1);
    expect(kacheln).toHaveLength(5);
    for (const k of kacheln) expect(k.slice(0, k.indexOf('</div>'))).toMatch(/\$\{deckknopf\(/);
  });

  test('Routenkarten, Heldenliste und Plätze im Team: der Fokus folgt dem Helden', () => {
    const quelle = lies('ui/screens/ExpeditionsScreen.ts');
    expect(quelle).toMatch(/deckknopf\(label, `route-\$\{route\.id\}`, locked\)/);
    // Derselbe Schlüssel in der Liste und auf dem Platz: Enter nimmt den Helden auf, der Fokus geht mit
    expect(quelle).toMatch(/deckknopf\(`\$\{f\.name\} ins Team`, `held-\$\{f\.id\}`\)/);
    expect(quelle).toMatch(/deckknopf\(`\$\{hero\.name\} aus dem Team nehmen`, `held-\$\{hero\.id\}`\)/);
    const neu = quelle.slice(quelle.indexOf('function refreshTeamScreen'));
    expect(neu.indexOf('fokusMerken(el)')).toBeLessThan(neu.indexOf('el.innerHTML = buildTeamHTML()'));
    expect(neu.indexOf('fokusZurueck(el, fokus)')).toBeGreaterThan(neu.indexOf('el.innerHTML = buildTeamHTML()'));
  });

  test('Helden: nach Reiterwechsel bleibt der Fokus, sonst nimmt ihn der aktive Reiter', () => {
    const quelle = lies('ui/screens/HeroesScreen.ts');
    // Eine Rückmeldung auf dem Knopf («✓ Rekrutiert!») sperrt ihn, er verlöre den Fokus: Sie merkt ihn sich vorher
    expect(quelle).toContain('const fokus = fokusMerken(prev) ?? (fokusVerloren() ? fokusVorRueckmeldung : null);');
    // Ist ein anderer Bildschirm vorne, zeichnet die Rückmeldung nicht neu; neu gezeichnet bleibt er, wo und wie er war
    expect(quelle).toContain("if (!document.getElementById('s-heroes')?.getClientRects().length) {");
    expect(quelle).toContain('if (stil !== undefined) el.style.cssText = stil;');
    expect(quelle.match(/rueckmeldung\(btn, /g)).toHaveLength(6);
    expect(quelle).toContain("fokusZurueck(el, fokus, [...(nachbar ? nachbarKnopf(el, nachbar) : []), '#s-heroes .tab.active']);");
  });

  test('Fenster der Expedition: Dialog, Fokus hinein, Tab bleibt drin, Escape nur auf «ZURÜCK»', () => {
    const dialog = lies('ui/components/ExpeditionsDialog.ts');
    expect(dialog).toContain("box.setAttribute('role', 'dialog')");
    expect(dialog).toContain("box.setAttribute('aria-modal', 'true')");
    expect(dialog).toContain('bindeFensterTasten(overlay, box,');
    expect(dialog).toContain('.focus({ preventScroll: true })');
    const flow = lies('ui/screens/ExpeditionFlow.ts');
    expect(flow.match(/abbrechen: true/g)).toHaveLength(1);
    expect(flow).toContain("{ label: 'ZURÜCK', abbrechen: true, onClick: () => {} }");
    // Geht es zu, ohne dass etwas den Fokus nimmt, bekommt ihn der Knopf von vorher zurück
    expect(dialog).toContain('zurueck.focus({ preventScroll: true })');
    // Händler: nach einem Kauf der Kauf-Knopf, nicht WEITERZIEHEN
    expect(flow).toContain('showMerchantDialog(run, i); }');
    expect(flow).toContain('[...buyButtons, leaveButton], { fokus });');
  });

  test('Fenster im Raid: Fokus auf den Hauptknopf, bei der Rückfrage auf «Nein», danach zurück', () => {
    const raid = lies('ui/screens/RaidScreen.ts');
    expect(raid).toContain("fenster.querySelector<HTMLElement>('.btn-go:not([disabled])')");
    expect(raid).toContain("{ label: t.rueckfrageTitel, fokus: '[data-zu]' }");
    expect(raid).toContain('zurueck.focus({ preventScroll: true });');
  });

  test('Kürzel des Spiels nicht mit Strg, Cmd oder Alt (Strg+A markiert alles)', () => {
    expect(lies('main.ts')).toContain('if (e.ctrlKey || e.metaKey || e.altKey) return;');
    expect(lies('ui/screens/MainMenuScreen.ts')).toContain('el.getClientRects().length === 0 || e.ctrlKey || e.metaKey || e.altKey');
  });

  test('Kampf: der Hauptknopf jeder Phase nimmt den Fokus, nur nach der Tastatur', () => {
    const quelle = lies('ui/screens/CombatScreen.ts');
    expect(quelle.match(/this\.fokusAufHauptknopf\(\);/g)).toHaveLength(3);
    expect(quelle).toMatch(/if \(knopf && tastaturZuletzt\(\)\) knopf\.focus\(\{ preventScroll: true \}\)/);
  });

  test('Bildschirmwechsel: der neue Bildschirm nimmt den Fokus (nur nach der Tastatur)', () => {
    const router = lies('ui/ScreenRouter.ts');
    expect(router.match(/bildschirmFokussieren\(`s-\$\{(screen|davor)\}`\)/g)).toHaveLength(2);
    // Vor dem Verstecken merkt sich der Bildschirm, der geht, seinen Knopf
    for (const [geht, kommt] of [['prev', 'screen'], ['aktuell', 'davor']]) {
      const merken = router.indexOf(`bildschirmVerlassen(\`s-\${${geht}}\`)`);
      expect(merken).toBeGreaterThan(0);
      expect(merken).toBeLessThan(router.indexOf(`zeigeNur(app, ${kommt})`));
    }
    expect(lies('main.ts')).toContain('eingabeBeobachten();');
  });

  test('Dungeonkarte: Tab erreicht jeden Knoten und den Raid, Enter öffnet sie, das Fenster hält den Fokus', () => {
    const karte = lies('ui/screens/DungeonMapScreen.ts');
    expect(karte).toMatch(/<g class="dmap-nd \$\{statusClass\}"[^>]*tabindex="0" role="button"\s+data-fokus="karte-\$\{route\.id\}"/);
    expect(karte).toMatch(/data-raid style="cursor:pointer" tabindex="0"\s+role="button" data-fokus="karte-raid"/);
    expect(karte.match(/\$\{fokusRing\(x, y, r \+ \d\)\}/g)).toHaveLength(2);
    // Der Ring liegt über dem Schein (sonst färbt ihn die Biomfarbe), unter Bild und Schrift
    const ring = karte.indexOf('${fokusRing(x, y, r + 7)}');
    expect(karte.indexOf('${glowRing}')).toBeGreaterThan(0);
    expect(karte.indexOf('${glowRing}')).toBeLessThan(ring);
    expect(ring).toBeLessThan(karte.indexOf('${bgHex}', ring - 200));
    expect(karte.indexOf('class="dmap-glow-ring"/>', karte.indexOf('function buildRaidKnoten')))
      .toBeLessThan(karte.indexOf('${fokusRing(x, y, r + 9)}'));
    // Doppelklick: Der zweite Klick schliesst das eben geöffnete Fenster nicht; der Hörer der alten Karte geht
    expect(karte).toContain("if (target.id === 'dmap-modal-close' || istHintergrundKlick?.(e)) {");
    expect(karte).toContain('loeseFensterTasten?.();');
    expect(karte).toContain("knoten.dispatchEvent(new MouseEvent('click', { bubbles: true }))");
    expect(karte).toContain("fenster.setAttribute('role', 'dialog')");
    expect(karte).toContain('bindeFensterTasten(modal, fenster, hideRouteModal)');
    // Hinein beim Öffnen, zurück auf den Knoten beim Schliessen
    expect(karte).toContain('start?.focus({ preventScroll: true })');
    expect(karte).toContain('if (fokusDrin && knoten?.isConnected) knoten.focus({ preventScroll: true })');
    const css = lies('ui/html/dungeonkarte.css');
    expect(css).toMatch(/\.dmap-nd:focus-visible \.dmap-fokusring\s*\{\s*opacity:\s*1/);
  });

  test('Kampf: Enter auf einem Gegner wählt das Fokus-Ziel; läuft der Kampf, sind die Knöpfe weg', () => {
    const quelle = lies('ui/screens/CombatScreen.ts');
    expect(quelle).toContain('deckknopfElement(`${unit.name} als Fokus-Ziel wählen`, `gegner-${unit.id}`)');
    expect(quelle).toContain(".setAttribute('aria-pressed', String(entry.unitId === enemyId))");
    const start = quelle.slice(quelle.indexOf('startCombatAnimation(run: ExpeditionRun'));
    const weg = start.indexOf("querySelectorAll('.deckknopf')");
    expect(weg).toBeGreaterThan(0);
    expect(weg).toBeLessThan(start.indexOf('\n  }\n'));
    // Das Ziel trägt ein Abzeichen, der Tastatur-Rahmen ist gestrichelt: Fokus und Ziel sehen verschieden aus
    const css = lies('ui/html/magic-city.css');
    expect(css).toMatch(/\.mc-co-unit\.is-targeted::after \{\s*content: '🎯 Ziel'/);
    // Am Handy links oben über dem Bild (rechts traf es lange Namen, 320 px), nicht in die Karte darüber
    expect(css).toContain(".mc-co-unit.is-targeted::after { content: '🎯'; top: -6px; left: 4px; right: auto;");
    expect(css).toContain('.mc-co-unit > .deckknopf:focus-visible { outline: 2px dashed');
  });
});

describe('Zurück auf einem Bildschirm', () => {
  const hoerer: Record<string, (e: unknown) => void> = {};
  const knopf = {
    dataset: { fokus: 'kachel-heroes' }, id: '', tagName: 'BUTTON', attributes: [{ name: 'data-fokus', value: 'kachel-heroes' }],
  };
  const body = {};
  let neu: { getClientRects: () => unknown[]; focus: ReturnType<typeof vi.fn> };
  let haupt: Record<string, unknown> & { focus: ReturnType<typeof vi.fn> };
  let seite: { activeElement: unknown; body: unknown; getElementById: (id: string) => unknown };

  function aufbauen(): void {
    vi.stubGlobal('window', { addEventListener: (art: string, f: (e: unknown) => void) => { hoerer[art] = f; } });
    eingabeBeobachten();
    neu = { getClientRects: () => [{}], focus: vi.fn() };
    haupt = {
      contains: (el: unknown) => el === knopf,
      querySelector: (sel: string) => (sel === '[data-fokus="kachel-heroes"]' ? neu : null),
      hasAttribute: () => false, focus: vi.fn(),
    };
    seite = { activeElement: knopf, body, getElementById: (id: string) => (id === 's-main' ? haupt : null) };
    vi.stubGlobal('document', seite);
  }
  afterEach(() => vi.unstubAllGlobals());

  test('mit der Tastatur: der Fokus steht wieder auf dem Knopf, mit dem man ging (die Kachel)', () => {
    aufbauen();
    hoerer.keydown({ key: 'Enter' });
    bildschirmVerlassen('s-main');
    seite.activeElement = body; // Hauptmenü versteckt, später wieder gezeigt und neu gezeichnet
    bildschirmFokussieren('s-main');
    expect(neu.focus).toHaveBeenCalledWith({ preventScroll: false });
    expect(haupt.focus).not.toHaveBeenCalled();
  });

  test('ist der Knopf von vorhin nicht zu sehen, nimmt der Bildschirm selbst den Fokus', () => {
    aufbauen();
    hoerer.keydown({ key: 'Tab' });
    bildschirmVerlassen('s-main');
    seite.activeElement = body;
    neu.getClientRects = () => []; // der Knopf ist nicht zu sehen
    seite.activeElement = body;
    bildschirmFokussieren('s-main');
    expect(neu.focus).not.toHaveBeenCalled();
    expect(haupt.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  test('verlässt man ihn ohne Fokus und ohne Klick darin, gilt die Marke eines früheren Besuchs nicht mehr', () => {
    aufbauen();
    hoerer.keydown({ key: 'Enter' });
    bildschirmVerlassen('s-main'); // erster Besuch: mit der Kachel verlassen
    seite.activeElement = body;
    bildschirmVerlassen('s-main'); // zweiter Besuch: ohne Fokus darin verlassen
    bildschirmFokussieren('s-main');
    expect(neu.focus).not.toHaveBeenCalled();
    expect(haupt.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  test('mit der Maus verlassen, mit der Tastatur zurück: der Fokus steht auf der angeklickten Karte', () => {
    aufbauen();
    const deck = { classList: { contains: (k: string) => k === 'deckknopf' }, ...knopf };
    const karte = { matches: () => false, children: [deck], parentElement: haupt };
    const bild = { closest: () => karte, isConnected: true, matches: () => false, children: [], parentElement: karte };
    haupt.contains = (el: unknown) => el === bild || el === karte || el === deck;
    hoerer.pointerdown({ target: bild });
    seite.activeElement = body;
    bildschirmVerlassen('s-main');
    hoerer.keydown({ key: 'Escape' });
    bildschirmFokussieren('s-main');
    // Zurück mit der Tastatur darf das Bild zum Knopf scrollen
    expect(neu.focus).toHaveBeenCalledWith({ preventScroll: false });
  });

  test('ein neuer Einstieg setzt die Marke selbst: eine Route, oder oben beginnen', () => {
    aufbauen();
    hoerer.keydown({ key: 'Enter' });
    seite.activeElement = body;
    bildschirmMarke('s-main', 'kachel-heroes');
    bildschirmFokussieren('s-main');
    expect(neu.focus).toHaveBeenCalledWith({ preventScroll: false });
    bildschirmMarke('s-main', null);
    bildschirmFokussieren('s-main');
    expect(haupt.focus).toHaveBeenCalledWith({ preventScroll: true });
    const team = lies('ui/screens/ExpeditionsScreen.ts');
    const waehle = team.slice(team.indexOf('function selectRoute'));
    expect(waehle).toContain("bildschirmMarke('s-team', null);");
    expect(waehle).toContain("bildschirmMarke('s-expeditions', `route-${routeId}`);");
  });

  test('nach Maus oder Finger: still der Bildschirm selbst, nie der Knopf (der erste Tab beginnt dann oben)', () => {
    aufbauen();
    hoerer.keydown({ key: 'Enter' });
    bildschirmVerlassen('s-main'); // mit der Kachel verlassen: die Marke gäbe es
    hoerer.pointerdown({});
    seite.activeElement = body;
    bildschirmFokussieren('s-main');
    expect(neu.focus).not.toHaveBeenCalled();
    expect(haupt.focus).toHaveBeenCalledWith({ preventScroll: true });
    // Ohne Rahmen: .screen:focus hat keinen Umriss
    expect(lies('ui/html/tastatur.css')).toContain('.screen:focus { outline: none; }');
  });

  test('nach Maus oder Finger mit Fokus im neuen Bildschirm (ein Fenster): bleibt dort', () => {
    aufbauen();
    hoerer.pointerdown({});
    seite.activeElement = neu; // ein sichtbarer Knopf hat den Fokus: nicht verloren
    haupt.focus.mockClear();
    bildschirmFokussieren('s-main');
    expect(haupt.focus).not.toHaveBeenCalled();
  });
});
