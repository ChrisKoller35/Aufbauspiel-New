import { describe, test, expect } from 'vitest';
import { createNewGameState } from '../src/models/GameState';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { ITEM_DEFS } from '../src/data/items';
import { CLASS_DEFS } from '../src/data/classes';
import { buildInventoryHtml, initHeroesScreen, renderHeroCard } from '../src/ui/screens/HeroesScreen';

// Heldenseite und Heldenfenster ohne Browser: das HTML der Karten und des Inventars (Tastatur, Vorleseprogramme).
// Fokus, Tab im Fenster und Scrollen brauchen einen Browser; die Tests laufen ohne.

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0.05, critMult: 1.5 };

function held(classId: string, name: string, stufe = 5): GuildFighter {
  const f = createGuildFighter(classId, name, { ...GRUND });
  f.level = stufe;
  return f;
}

/** Ein Tag; ein > in Anführungszeichen (Wert eines Attributs) beendet ihn nicht */
const TAG = String.raw`(?:[^>"]|"[^"]*")*>`;

/** Öffnende Tags aller Knöpfe */
function knoepfe(html: string): string[] {
  return [...html.matchAll(new RegExp(String.raw`<button\b` + TAG, 'g'))].map(m => m[0]);
}

/** Wie tief Knöpfe ineinander stecken (1: keiner in einem anderen) */
function knopfTiefe(html: string): number {
  let tiefe = 0;
  let max = 0;
  for (const [tag] of html.matchAll(new RegExp(String.raw`<\/?button\b` + TAG, 'g'))) {
    tiefe += tag.startsWith('</') ? -1 : 1;
    max = Math.max(max, tiefe);
  }
  return max;
}

describe('Heldenkarte: Knopf für die Tastatur', () => {
  // guardian: Karte mit Bild; eine Klasse ohne Bild bekommt die Karte mit Sprite
  for (const classId of ['guardian', 'ohne_bild']) {
    test(`${classId}: leerer Knopf vorne in der Karte, TRAINIEREN daneben und nicht darin`, () => {
      const html = renderHeroCard(held(classId, 'Brom'), 'train');
      const k = knoepfe(html);
      expect(k).toHaveLength(2);
      expect(k[0]).toContain('class="hcard-oeffnen"');
      expect(k[0]).toContain('type="button"');
      expect(k[1]).toContain('btn-train');
      // Der Knopf ist leer und das erste Kind der Karte; kein Knopf steckt in einem anderen
      expect(html).toMatch(new RegExp(String.raw`<div class="hcard[^"]*" data-fighter-id="\d+"` + TAG + String.raw`\s*<button type="button" class="hcard-oeffnen"` + TAG + '</button>'));
      expect(knopfTiefe(html)).toBe(1);
    });
  }

  test('ohne TRAINIEREN (Reiter «Meine Helden») nur der Knopf zum Öffnen', () => {
    const k = knoepfe(renderHeroCard(held('ranger', 'Lia'), 'my'));
    expect(k).toHaveLength(1);
    expect(k[0]).toContain('hcard-oeffnen');
  });

  test('Name: Held, Klasse und Stufe, mit maskiertem Namen', () => {
    const html = renderHeroCard(held('guardian', 'Mia "die <Flinke>" & Co', 12), 'my');
    expect(knoepfe(html)[0]).toContain(`aria-label="Heldenfenster: Mia &quot;die &lt;Flinke>&quot; &amp; Co, ${CLASS_DEFS.guardian.name}, Stufe 12"`);
  });
});

describe('Heldenfenster: Inventar als Knöpfe', () => {
  // Zwei Gegenstände für verschiedene Plätze, einer doppelt
  const ausruestung = Object.entries(ITEM_DEFS).filter(([, d]) => d.type === 'gear' && d.gearSlot);
  const [a, b] = [ausruestung[0][0], ausruestung.find(([, d]) => d.gearSlot !== ausruestung[0][1].gearSlot)![0]];

  function stand(): GuildFighter {
    const state = createNewGameState();
    const f = held('guardian', 'Brom');
    state.fighters.push(f);
    // Nur diese zwei (ein neues Spiel hat schon eine Robe im Lager)
    for (const id of Object.keys(state.globalStock)) if (ITEM_DEFS[id]?.type === 'gear') delete state.globalStock[id];
    state.globalStock[a] = 2;
    state.globalStock[b] = 1;
    initHeroesScreen(state);
    return f;
  }

  test('offen: jeder Gegenstand ist ein Knopf mit Namen (und Anzahl), ohne Text im Bild', () => {
    const html = buildInventoryHtml(stand(), true);
    const k = knoepfe(html);
    expect(k).toHaveLength(2);
    expect(html).not.toContain('<div class="hdm2-inv-slot');
    for (const tag of k) {
      expect(tag).toContain('type="button"');
      expect(tag).toContain('class="hdm2-inv-slot');
      expect(tag).toContain('aria-pressed="false"');
      expect(tag).not.toContain('disabled');
    }
    expect(html).toContain(`aria-label="${ITEM_DEFS[a].name}, 2 Stück"`);
    expect(html).toContain(`aria-label="${ITEM_DEFS[b].name}"`);
    expect(html.match(/<img [^>]*alt=""/g)).toHaveLength(2);
  });

  test('zu: alle Knöpfe gesperrt, damit Tab im Fenster sie überspringt', () => {
    const k = knoepfe(buildInventoryHtml(stand(), false));
    expect(k).toHaveLength(2);
    for (const tag of k) expect(tag).toMatch(/ disabled>$/);
  });
});
