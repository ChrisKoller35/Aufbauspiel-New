// Kriegsrat: Was die Zahlen voraussetzen, steht im Fenster. Die Entscheidungen unterwegs (Beute und XP hängen daran),
// Proviant in einer knappen Lage und Zahlen, die nie von ihren Wörtern wegbrechen (docs/KRIEGSRAT.md).
import { describe, it, expect } from 'vitest';
import { ROUTE_DEFS } from '../src/data/routes';
import { createNewGameState } from '../src/models/GameState';
import { placeStartingLayout } from '../src/scenes/CityStartingLayout';
import { geschichteVon } from '../src/systems/Geschichten';
import { MAX_HERO_LEVEL } from '../src/systems/HeroProgression';
import { kriegsrat, KriegsratErgebnis } from '../src/systems/Kriegsrat';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { ergebnisHtml } from '../src/ui/components/KriegsratFenster';

/** Das Probespiel `?probe`: Brom, Grimm, Lia und Sina auf Stufe 12, ohne Heldenwege */
function probe() {
  const state = createNewGameState();
  placeStartingLayout(state);
  richteProbespielEin(state, 'neu');
  const ids = ['Brom', 'Grimm', 'Lia', 'Sina'].map(name => state.fighters.find(f => f.name === name)!.id);
  return { state, ids };
}

/** Ein Ergebnis, das jede Zeile des Fensters zeigt */
function vollesErgebnis(wahlen: KriegsratErgebnis['wahlen']): KriegsratErgebnis {
  const held = { id: 1, name: 'Brom', stufe: 4, fehltXp: 120, xpSchnitt: 25, aufstiege: 0, besteStufe: 4, gefallen: 2 };
  return {
    siege: 12, niederlagen: 5, bossUeberlebt: 3,
    gefaehrlichsterRaum: { nummer: 15, gegner: ['Ignarax, der Uralte'], laeufe: 5 },
    goldSchnitt: 1234, lebenSchnitt: 42, proviantEingesetzt: 17, wahlen,
    helden: [
      held,
      { ...held, id: 2, name: 'Grimm', aufstiege: 5, besteStufe: 7 },
      { ...held, id: 3, name: 'Lia', stufe: MAX_HERO_LEVEL, besteStufe: MAX_HERO_LEVEL, gefallen: 0 },
    ],
    beute: {
      set: { zeichen: '🐉', name: 'Drachenhort-Set', gesammelt: 2 }, setLaeufe: 12, setTeile: 14,
      material: { name: 'Drachenschuppe', schnitt: 7 }, splitterSchnitt: 10,
      ausruestung: [
        { name: 'Langbogen', laeufe: 16, neu: true, legendaer: false },
        { name: 'Amulett der Wiedergeburt', laeufe: 1, neu: true, legendaer: true },
      ],
    },
  };
}

/** Text der Absätze einer Klasse, ohne Tags; geschützte Leerzeichen als   */
function absaetze(html: string, klasse: string): string[] {
  return [...html.matchAll(new RegExp(`<p class="${klasse}">([\\s\\S]*?)</p>`, 'g'))]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '));
}

describe('Kriegsrat: Entscheidungen unterwegs', () => {
  it('zählt jede Entscheidung der Geschichte und jede Fundstätte, Rastplätze nicht', () => {
    const { state, ids } = probe();
    const r = kriegsrat(state, 'haunted_woods', ids, {}, 20);
    // Alle Läufe gewonnen: Jeder kam durch jeden Raum
    expect(r.siege).toBe(20);
    const geschichte = geschichteVon('haunted_woods')!.wahlen.length;
    const fundstaetten = ROUTE_DEFS.haunted_woods.encounters.filter(e => e.type === 'find').length;
    expect(geschichte).toBeGreaterThan(0);
    expect(ROUTE_DEFS.haunted_woods.encounters.some(e => e.type === 'rest')).toBe(true);
    expect(r.wahlen.wagnis + r.wahlen.sicher).toBe(20 * (geschichte + fundstaetten));
    // Mit vollen Leben wagt der Rat es immer (docs/KRIEGSRAT.md: 80-mal, Ø 25 XP je Held)
    expect(r.wahlen).toEqual({ wagnis: 80, sicher: 0 });
    expect(r.helden.map(h => h.xpSchnitt)).toEqual([25, 25, 25, 25]);
  });

  it('wer schwach ist, nimmt die sichere Wahl: Drachenhort mit ?probe', () => {
    const { state, ids } = probe();
    const r = kriegsrat(state, 'drachenhort', ids, {}, 20);
    expect(r.wahlen.sicher).toBeGreaterThan(r.wahlen.wagnis);
  });

  it('das Fenster nennt die Entscheidungen und was daran hängt, ohne Entscheidung keine Zeile', () => {
    const beide = ergebnisHtml(vollesErgebnis({ wagnis: 38, sicher: 2 }), 20);
    expect(beide).toContain('Entscheidungen unterwegs:&nbsp;38-⁠mal das Wagnis&nbsp;· 2-⁠mal die sichere Wahl.');
    expect(beide).toContain('Der Rat wagt es nur ab&nbsp;85&nbsp;% Leben; entscheidest du anders, sehen Beute und XP anders aus.');
    expect(ergebnisHtml(vollesErgebnis({ wagnis: 0, sicher: 49 }), 20))
      .toContain('Entscheidungen unterwegs:&nbsp;49-⁠mal die sichere Wahl.');
    expect(ergebnisHtml(vollesErgebnis({ wagnis: 0, sicher: 0 }), 20)).not.toContain('Entscheidungen unterwegs');
  });
});

describe('Kriegsrat: Proviant in einer knappen Lage', () => {
  it('Drachenhort mit ?probe: mit 5 Heiltränken 3 Siege, ohne Auswahl 1 (docs/KRIEGSRAT.md)', () => {
    const { state, ids } = probe();
    const ohne = kriegsrat(state, 'drachenhort', ids, {}, 20);
    const mit = kriegsrat(state, 'drachenhort', ids, { healing_potion: 5 }, 20);
    expect([ohne.siege, ohne.proviantEingesetzt]).toEqual([1, 17]);
    expect([mit.siege, mit.proviantEingesetzt]).toEqual([3, 18]);
  });
});

describe('Kriegsrat-Fenster: Zahlen bleiben bei ihren Wörtern', () => {
  it('vor einer Zahl nie ein gewöhnliches Leerzeichen, ausser nach «·»', () => {
    const html = ergebnisHtml(vollesErgebnis({ wagnis: 38, sicher: 2 }), 20);
    const texte = [...absaetze(html, 'kr-info'), ...absaetze(html, 'kr-hinweis')];
    // Jede Zeile kommt vor (Boss, Raum, Gold, Leben, Entscheidungen, Set, Material, Ausrüstung, drei Helden, Hinweis)
    expect(texte).toHaveLength(12);
    for (const text of texte) expect(text, text).not.toMatch(/(^|[^·]) \d/);
    // Wo die Prüfliste es sah: «Langbogen (neu)» und «16 von 20» auf zwei Zeilen
    expect(html).toContain('Langbogen&nbsp;(neu)&nbsp;16&nbsp;von&nbsp;20');
  });
});
