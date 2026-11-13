// Tränke mit Restdauer im Vorräte-Bereich (src/ui/components/KampfVorraete.ts: aktiveWirkungen, vorratKnopf, vorratTitel)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createNewGameState } from '../src/models/GameState';
import { createGuildFighter } from '../src/models/GuildRoster';
import { ExpeditionSystem } from '../src/systems/ExpeditionSystem';
import { GearSystem } from '../src/systems/GearSystem';
import { ProvisionSystem } from '../src/systems/ProvisionSystem';
import { aktiveWirkungen, vorratKnopf, vorratTitel, vorratZeilen, nutzeVorrat } from '../src/ui/components/KampfVorraete';

const system = new ExpeditionSystem(new GearSystem(), new ProvisionSystem());

/** Zwei Helden auf einer Expedition mit dem gewünschten eigenen Vorrat */
function aufbruch(vorrat: Record<string, number>) {
  const state = createNewGameState();
  const ids = ['Testheld', 'Testheldin'].map(name => {
    const held = createGuildFighter('guardian', name, { hp: 500, maxHp: 500, atk: 50, def: 50, spd: 5, critChance: 0, critMult: 1 });
    state.fighters.push(held);
    return held.id;
  });
  Object.assign(state.globalStock, vorrat);
  const mitnehmen = Object.entries(vorrat).flatMap(([id, n]) => Array<string>(n).fill(id));
  const run = system.startExpedition(state, 'cave_deep', ids, 'normal', null, false, mitnehmen)!;
  expect(run).toBeTruthy();
  return { state, run };
}

const zeile = (run: ReturnType<typeof aufbruch>['run'], itemId: string) => vorratZeilen(run.provisions).find(z => z.itemId === itemId)!;

describe('Tränke mit Restdauer', () => {
  it('Kraft-Brot: noch 3 Räume direkt nach dem Essen, 1 im letzten Raum, danach kein Eintrag', () => {
    const { state, run } = aufbruch({ power_bread: 2 });
    nutzeVorrat(system, state, zeile(run, 'power_bread'));
    expect(run.trankWirkungen?.[0].bisRaum).toBe(run.currentRoom + 3);
    expect(aktiveWirkungen(run)).toEqual([{ itemId: 'power_bread', restRaeume: 3, text: 'Kraft-Brot: +2 Angriff, noch 3 Räume' }]);
    // Raum-Dauer darf nachgetrunken werden: kein «Wirkt», Tooltip mit Restdauer
    expect(vorratKnopf(zeile(run, 'power_bread'), aktiveWirkungen(run))).toBe('Nutzen');
    expect(vorratTitel(zeile(run, 'power_bread'), aktiveWirkungen(run))).toBe('Kraft-Brot: +2 Angriff, noch 3 Räume');

    const start = run.currentRoom;
    run.currentRoom = start + 2;
    expect(aktiveWirkungen(run)[0]).toMatchObject({ restRaeume: 1, text: 'Kraft-Brot: +2 Angriff, noch 1 Raum' });
    run.currentRoom = start + 3;
    expect(aktiveWirkungen(run)).toEqual([]);
  });

  it('Krafttrank bis zum Dungeon-Ende: Knopf «Wirkt», Text «bis zum Ende des Dungeons»', () => {
    const { state, run } = aufbruch({ potion_strength: 2 });
    nutzeVorrat(system, state, zeile(run, 'potion_strength'));
    const aktiv = aktiveWirkungen(run);
    expect(aktiv).toEqual([{ itemId: 'potion_strength', restRaeume: undefined, text: 'Krafttrank: +3 Angriff bis zum Ende des Dungeons' }]);
    expect(vorratKnopf(zeile(run, 'potion_strength'), aktiv)).toBe('Wirkt');
    expect(vorratTitel(zeile(run, 'potion_strength'), aktiv)).toBe('Krafttrank: +3 Angriff bis zum Ende des Dungeons');
    // Andere Vorräte bleiben nutzbar
    expect(vorratKnopf(zeile(run, 'bread'), aktiv)).toBe('Nutzen');
  });

  it('ohne aktive Wirkung ist das Modell leer und alle Knöpfe heissen «Nutzen»', () => {
    const { state, run } = aufbruch({});
    expect(aktiveWirkungen(run)).toEqual([]);
    nutzeVorrat(system, state, zeile(run, 'bread')); // Brot heilt sofort, wirkt nicht weiter
    expect(aktiveWirkungen(run)).toEqual([]);
    for (const z of vorratZeilen(run.provisions)) expect(vorratKnopf(z, [])).toBe('Nutzen');
  });
});

describe('Vorräte im Streifen: die Fensterbreite entscheidet das CSS', () => {
  const lies = (datei: string) => readFileSync(join(__dirname, '../src', datei), 'utf8');

  it('buildItemSection fragt kein matchMedia, am PC blendet magic-city.css den Bereich nur mit «Wirkt gerade» aus', () => {
    const quelle = lies('ui/screens/CombatScreen.ts');
    const start = quelle.indexOf('private buildItemSection(');
    expect(start).toBeGreaterThan(0);
    const rumpf = quelle.slice(start, quelle.indexOf('\n  }\n', start));
    expect(rumpf).toContain('mc-co-nur-wirkt');
    expect(rumpf).not.toContain('matchMedia');

    // Beide Regeln im selben Block @media (min-width: 701px), aber getrennt: Ein Browser ohne :has wendet die erste an
    const css = lies('ui/html/magic-city.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const bloecke: string[][] = [];
    const kopf = '@media (min-width: 701px) {';
    for (let i = css.indexOf(kopf); i >= 0; i = css.indexOf(kopf, i + 1)) {
      const auf = css.indexOf('{', i);
      for (let j = auf, tiefe = 0; j < css.length; j++) {
        if (css[j] === '{') tiefe++;
        else if (css[j] === '}' && --tiefe === 0) {
          bloecke.push([...css.slice(auf + 1, j).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
            .map(m => `${m[1].trim()} { ${m[2].trim()} }`.replace(/\s+/g, ' ')));
          break;
        }
      }
    }
    const regeln = [
      '.mc-co-nur-wirkt { display: none; }',
      '.mc-co-preview-strip:has(> .mc-co-nur-wirkt:only-child) { display: none; }',
    ];
    expect(bloecke.some(b => regeln.every(r => b.includes(r)))).toBe(true);
  });
});
