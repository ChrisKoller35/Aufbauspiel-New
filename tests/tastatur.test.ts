import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deckknopf, fokusSelektor, fokusMerken, fokusZurueck } from '../src/ui/fokus';

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
    expect(quelle).toContain('const fokus = fokusMerken(prev) ?? fokusVorRueckmeldung;');
    expect(quelle.match(/rueckmeldung\(btn, /g)).toHaveLength(6);
    expect(quelle).toContain("fokusZurueck(el, fokus, ['#s-heroes .tab.active']);");
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
  });

  test('Kampf: der Hauptknopf jeder Phase nimmt den Fokus, nur nach der Tastatur', () => {
    const quelle = lies('ui/screens/CombatScreen.ts');
    expect(quelle.match(/this\.fokusAufHauptknopf\(\);/g)).toHaveLength(3);
    expect(quelle).toMatch(/if \(knopf && tastaturZuletzt\(\)\) knopf\.focus\(\{ preventScroll: true \}\)/);
  });

  test('Bildschirmwechsel: der neue Bildschirm nimmt den Fokus (nur nach der Tastatur)', () => {
    const router = lies('ui/ScreenRouter.ts');
    expect(router.match(/bildschirmFokussieren\(`s-\$\{(screen|davor)\}`\)/g)).toHaveLength(2);
    expect(lies('main.ts')).toContain('eingabeBeobachten();');
  });
});
