import { describe, test, expect, vi } from 'vitest';
import { createGuildFighter, GuildFighter } from '../src/models/GuildRoster';
import { CombatSkill, CombatUnit, EncounterRoom, ExpeditionRun } from '../src/models/ExpeditionRun';
import { CombatEngine } from '../src/systems/CombatEngine';
import { GearSystem } from '../src/systems/GearSystem';
import { EncounterProcessor } from '../src/systems/EncounterProcessor';
import {
  deckung, grundSchaden, kampfBeginn, kampfEnde, nachTreffer, rundenEnde, schattentanz, vergeltung, wegAnteileZaehlen,
  wegSchaden, wegZustandDerRunde, wutAnfall, zustandAktualisieren,
} from '../src/systems/Kampfeffekte';
import {
  istMeister, kannWegWaehlen, waehleWeg, wegBilanzDazu, wegEffekte, wegVon, wegWerte,
} from '../src/systems/Spezialisierung';
import { musterStand } from '../src/systems/Musterlauf';
import { richteProbespielEin } from '../src/systems/Probespiel';
import { createNewGameState } from '../src/models/GameState';
import {
  MEISTER_AB_STUFE, SPEZIALISIERUNGEN, SpezialisierungDef, WEG_AB_STUFE, getSpezialisierung, wegeDerKlasse,
} from '../src/data/spezialisierungen';
import { CLASS_DEFS } from '../src/data/classes';
import { MUSTER_TEAMS } from '../src/data/musterteams';
import { wegAbzeichen, wegBereichHtml, wegBilanz, wegWirkungZeile, wirkungText } from '../src/ui/components/WegAnzeige';
import { SeededRNG } from '../src/utils/RNG';

const gear = new GearSystem();
const engine = new CombatEngine(gear);

const GRUND = { hp: 100, maxHp: 100, atk: 10, def: 0, spd: 1, critChance: 0, critMult: 1.5 };

/** Ein Held auf Stufe stufe, mit Weg (null: noch ohne) */
function held(name: string, classId: string, weg: string | null, stufe = WEG_AB_STUFE, werte: Partial<typeof GRUND> = {}): GuildFighter {
  const f = createGuildFighter(classId, name, { ...GRUND, ...werte });
  f.level = stufe;
  if (weg && !waehleWeg(f, weg)) throw new Error(`${weg} passt nicht zu ${classId}`);
  return f;
}

/** Kampfeinheit eines Helden; Krit ist aus. Mit sicher lösen Wege mit Chance immer aus. */
function einheit(f: GuildFighter, werte: Partial<CombatUnit> = {}, sicher = false): CombatUnit {
  const u: CombatUnit = { ...engine.fighterToCombatUnit(f), critChance: 0, ...werte };
  if (sicher) u.specialEffects = u.specialEffects?.map(e => (e.weg ? { ...e, chance: 1 } : e));
  return u;
}

let gegnerId = 7000;
function gegner(name: string, werte: Partial<CombatUnit> = {}): CombatUnit {
  return {
    id: gegnerId++, name, isPlayer: false, hp: 1000, maxHp: 1000, atk: 1, def: 0, spd: 0.5,
    critChance: 0, critMult: 1, threat: 0, tauntRounds: 0, skills: [], buffs: [], lootTableId: null,
    ...werte,
  };
}

function faehigkeit(name: string, effectType: CombatSkill['effectType'], target: string): CombatSkill[] {
  return [{ id: name.toLowerCase(), name, cooldown: 9, currentCooldown: 0, effectType, power: 1, target }];
}

function lauf(party: CombatUnit[], enemies: CombatUnit[] = []): { run: ExpeditionRun; room: EncounterRoom } {
  const room: EncounterRoom = { index: 0, type: 'combat', enemies, healPercent: 0, hazardDamage: 0, completed: false };
  const run: ExpeditionRun = {
    routeId: 'forest_short', party, rooms: [room], currentRoom: 0, combatLog: [], loot: {}, goldEarned: 0,
    provisions: [], status: 'exploring', lastCheckpoint: 0, desperateResolveUsed: false, rngSeed: 1,
    focusTarget: null, focusTargetCooldown: 0, difficulty: 'normal', activeModifier: null, score: 0,
    totalCombatRounds: 0, enemiesKilled: 0, bossesKilled: 0, abilitiesUsed: {},
  };
  return { run, room };
}

function kampf(party: CombatUnit[], enemies: CombatUnit[], seed = 7): ExpeditionRun {
  const { run, room } = lauf(party, enemies);
  engine.processCombat(run, room, new SeededRNG(seed));
  return run;
}

function runde(run: ExpeditionRun, nr: number): string[] {
  return run.combatRoundSnapshots!.find(s => s.round === nr)?.logLines ?? [];
}

/** Sammelt die Kampfzeilen einer direkt aufgerufenen Wirkung */
function zeilen(): { log: (z: string) => void; liste: string[] } {
  const liste: string[] = [];
  return { log: z => { liste.push(z); }, liste };
}

function wert(wegId: string, effektId: string, meister = false): NonNullable<SpezialisierungDef['effekte'][number]> {
  const weg = getSpezialisierung(wegId)!;
  return (meister ? weg.meisterEffekte : weg.effekte).find(e => e.id === effektId)!;
}

// ── Regeln ──

describe('Wege: Regeln', () => {
  test('jede Klasse hat zwei Wege, Namen und Zeichen gibt es je nur einmal', () => {
    for (const klasse of Object.keys(CLASS_DEFS)) {
      const wege = wegeDerKlasse(klasse);
      expect(wege, klasse).toHaveLength(2);
      for (const w of wege) {
        expect(w.id.startsWith(`${klasse}_`), w.id).toBe(true);
        expect(getSpezialisierung(w.id)).toBe(w);
      }
    }
    expect(SPEZIALISIERUNGEN).toHaveLength(2 * Object.keys(CLASS_DEFS).length);
    expect(new Set(SPEZIALISIERUNGEN.map(w => w.name)).size).toBe(SPEZIALISIERUNGEN.length);
    expect(new Set(SPEZIALISIERUNGEN.map(w => w.zeichen)).size).toBe(SPEZIALISIERUNGEN.length);
  });

  test('ab Stufe 10 wählbar, nur Wege der eigenen Klasse, und die Wahl gilt für immer', () => {
    const f = held('Brom', 'guardian', null, WEG_AB_STUFE - 1);
    expect(kannWegWaehlen(f)).toBe(false);
    expect(waehleWeg(f, 'guardian_phalanx')).toBe(false);
    f.level = WEG_AB_STUFE;
    expect(kannWegWaehlen(f)).toBe(true);
    expect(waehleWeg(f, 'ranger_scharfschuetzin')).toBe(false);
    expect(waehleWeg(f, 'gibt_es_nicht')).toBe(false);
    expect(waehleWeg(f, 'guardian_phalanx')).toBe(true);
    expect(wegVon(f)?.id).toBe('guardian_phalanx');
    expect(kannWegWaehlen(f)).toBe(false);
    expect(waehleWeg(f, 'guardian_vergelter')).toBe(false);
    expect(f.spezialisierung).toBe('guardian_phalanx');
  });

  test('Meister ab Stufe 15: Werte und Effekte des Meisters ersetzen die alten', () => {
    const f = held('Brom', 'guardian', 'guardian_phalanx', MEISTER_AB_STUFE - 1);
    expect(istMeister(f)).toBe(false);
    const weg = getSpezialisierung('guardian_phalanx')!;
    expect(wegWerte(f)).toEqual(weg.werte);
    expect(wegEffekte(f)).toEqual([{ ...weg.effekte[0], name: 'Phalanx', weg: 'guardian_phalanx', usesLeft: -1 }]);
    f.level = MEISTER_AB_STUFE;
    expect(istMeister(f)).toBe(true);
    expect(wegWerte(f)).toEqual(weg.meisterWerte);
    expect(wegEffekte(f)).toEqual([{ ...weg.meisterEffekte[0], name: 'Phalanx', weg: 'guardian_phalanx', usesLeft: -1 }]);
    expect(weg.meisterEffekte[0].power).toBeGreaterThan(weg.effekte[0].power!);
  });

  test('ein Weg, der nicht zur Klasse passt (kaputter Spielstand), gilt als keiner', () => {
    const f = held('Brom', 'guardian', null, 12);
    f.spezialisierung = 'ranger_scharfschuetzin';
    expect(wegVon(f)).toBeNull();
    expect(kannWegWaehlen(f)).toBe(true);
    expect(wegWerte(f)).toEqual({});
    expect(wegEffekte(f)).toEqual([]);
  });

  test('Werte und Effekte kommen über die Ausrüstung in den Kampf', () => {
    const mit = held('Bärbel', 'druid', 'druid_baerengestalt');
    const ohne = held('Ohne', 'druid', null);
    const { hp, def } = getSpezialisierung('druid_baerengestalt')!.werte!;
    expect(gear.getEffectiveStats(mit).maxHp).toBe(gear.getEffectiveStats(ohne).maxHp + hp!);
    expect(gear.getEffectiveStats(mit).def).toBe(gear.getEffectiveStats(ohne).def + def!);
    expect(gear.getSpecialEffects(mit).map(e => e.id)).toEqual(['baerengestalt']);
    expect(engine.fighterToCombatUnit(mit).specialEffects?.[0].weg).toBe('druid_baerengestalt');

    const meisterin = held('Lia', 'ranger', 'ranger_scharfschuetzin', MEISTER_AB_STUFE);
    const krit = getSpezialisierung('ranger_scharfschuetzin')!.meisterWerte!;
    expect(gear.getEffectiveStats(meisterin).critChance).toBeCloseTo(krit.critChance!);
    expect(gear.getEffectiveStats(meisterin).critMult).toBeCloseTo(GRUND.critMult + (krit.critMult ?? 0));
  });

  test('Musterteams gehen ihren Weg, im Probespiel wählt man selbst', () => {
    const { state } = musterStand('gut', 1);
    expect(state.fighters.map(f => f.spezialisierung)).toEqual(MUSTER_TEAMS.gut.helden.map(h => h.weg));
    const probe = createNewGameState();
    richteProbespielEin(probe);
    expect(probe.fighters.length).toBeGreaterThan(0);
    expect(probe.fighters.every(f => kannWegWaehlen(f))).toBe(true);
  });
});

// ── Texte ──

describe('Wege: Texte', () => {
  const pz = (x: number | undefined): string => `${Math.round((x ?? 0) * 100)} %`;
  const komma = (x: number | undefined): string => String(x ?? 0).replace('.', ',');
  type Teile = (e: (id: string) => Record<string, number>, w: Record<string, number>) => Record<string, string>;
  // Was im Text stehen muss, aus den Zahlen des Wegs. Der Meistertext nennt nur, was sich ändert.
  const TEILE: Record<string, Teile> = {
    guardian_phalanx: (e, w) => ({ schild: `Schild von ${e('phalanx').power}`, hp: `+${w.hp} Leben` }),
    guardian_vergelter: (e, w) => ({ chance: `${pz(e('vergeltung').chance)} Chance`, atk: `+${w.atk} Angriff` }),
    ranger_scharfschuetzin: (e, w) => ({
      deckung: `${pz(e('deckung').chance)} Chance`, krit: `+${pz(w.critChance)} Krit-Chance`,
      kritSchaden: w.critMult ? `Krit-Schaden +${komma(w.critMult)}` : '',
    }),
    ranger_faehrtenleserin: e => {
      const pfad = e('pfadfinder').anteil;
      return {
        marke: `${pz(e('faehrte').anteil)} härter`,
        fallen: pfad === 1 ? 'gar keinen Schaden' : pfad === 0.5 ? 'halben Schaden' : `${pz(1 - pfad)} Schaden`,
      };
    },
    cleric_lichtbringer: e => ({ runden: `Alle ${e('heilgebet').runden} Runden`, anteil: pz(e('heilgebet').anteil) }),
    cleric_kriegspriester: e => ({
      def: `+${e('kriegssegen').power} Verteidigung`, atk: e('kriegssegen').atk ? `+${e('kriegssegen').atk} Angriff` : '',
    }),
    berserker_zorn: e => ({ je: `+${e('zorn').power} Angriff`, max: `+${e('zorn').max}` }),
    berserker_schlaechter: e => ({ anteil: `${pz(e('rundumschlag').anteil)} des Schadens` }),
    assassin_meuchlerin: e => ({
      schwelle: `${pz(e('meucheln').anteil)} Leben`,
      mehr: e('meucheln').power === 2 ? 'doppelter schaden'
        : e('meucheln').power > 2 ? `${komma(e('meucheln').power)}-facher schaden` : `${pz(e('meucheln').power - 1)} mehr Schaden`,
    }),
    assassin_schattentaenzerin: e => ({ chance: `${pz(e('schattentanz').chance)} Chance` }),
    paladin_schutzherr: (e, w) => ({ schwelle: `${pz(e('abfangen').anteil)} Leben`, def: `+${w.def} Verteidigung` }),
    paladin_kreuzritter: e => ({ anteil: `${pz(e('kreuzheil').anteil)} des Schadens` }),
    bard_heldenlied: e => ({ tempo: `Tempo +${komma(e('heldenlied').tempo)}`, atk: `+${e('heldenlied').power} Angriff` }),
    bard_schmaehlied: e => ({ runden: `${e('schmaehlied').runden} Runden`, anteil: `${pz(e('schmaehlied').anteil)} weniger Angriff` }),
    witch_sturmhexe: e => ({ runden: `Alle ${e('kettenblitz').runden} Runden`, anteil: `${pz(e('kettenblitz').anteil)} eines normalen Treffers` }),
    witch_fluchweberin: e => ({ je: `−${e('fluch').power}`, max: `höchstens −${e('fluch').max}` }),
    necromancer_knochenherr: e => ({ max: `höchstens ${e('skelette').max}`, anteil: pz(e('skelette').anteil) }),
    necromancer_seuchenbringer: e => ({ menge: `${e('seuche').power} Leben` }),
    druid_baerengestalt: (e, w) => ({ hp: `+${w.hp} Leben`, def: `+${w.def} Verteidigung`, runden: `${e('baerengestalt').runden} Runden` }),
    druid_hain: e => ({ anteil: pz(e('hain').anteil) }),
  };

  test('Text und Meistertext nennen die Zahlen, mit denen der Weg rechnet', () => {
    expect(Object.keys(TEILE).sort()).toEqual(SPEZIALISIERUNGEN.map(w => w.id).sort());
    for (const weg of SPEZIALISIERUNGEN) {
      const teile = (effekte: SpezialisierungDef['effekte'], werte: SpezialisierungDef['werte']): Record<string, string> =>
        TEILE[weg.id](id => effekte.find(e => e.id === id) as unknown as Record<string, number>, (werte ?? {}) as Record<string, number>);
      const basis = teile(weg.effekte, weg.werte);
      const meister = teile(weg.meisterEffekte, weg.meisterWerte ?? weg.werte);
      for (const [name, text] of Object.entries(basis)) {
        if (text) expect(weg.text.toLowerCase(), `${weg.id}: ${name}`).toContain(text.toLowerCase());
      }
      for (const [name, text] of Object.entries(meister)) {
        if (text && text !== basis[name]) expect(weg.meisterText.toLowerCase(), `${weg.id} Meister: ${name}`).toContain(text.toLowerCase());
      }
      expect(Object.entries(meister).some(([name, text]) => text !== basis[name]), `${weg.id}: Meister ändert nichts`).toBe(true);
    }
  });
});

// ── Wirkung im Kampf ──

describe('Wege im Kampf', () => {
  test('Phalanx: jeder im Team bekommt zu Kampfbeginn einen Schild, zwei Phalanxen zählen einmal', () => {
    const brom = einheit(held('Brom', 'guardian', 'guardian_phalanx'));
    const bruno = einheit(held('Bruno', 'guardian', 'guardian_phalanx', MEISTER_AB_STUFE));
    const lia = einheit(held('Lia', 'ranger', null));
    const { run } = lauf([brom, bruno, lia]);
    const { log, liste } = zeilen();
    kampfBeginn([brom, bruno, lia], [], run, log);
    const schild = wert('guardian_phalanx', 'phalanx', true).power!;
    expect(schild).toBeGreaterThan(wert('guardian_phalanx', 'phalanx').power!);
    expect(liste).toEqual([`★ Bruno setzt Phalanx ein → jeder im Team erhält einen Schild von ${schild}`]);
    expect([brom.schild, bruno.schild, lia.schild]).toEqual([schild, schild, schild]);
  });

  test('Vergelter: rächt Treffer am Team, auch durch Fähigkeiten, aber nicht Angriffe auf alle', () => {
    const brom = einheit(held('Brom', 'guardian', 'guardian_vergelter'), {}, true);
    const lia = einheit(held('Lia', 'ranger', null), { threat: 10 });
    const run = kampf([brom, lia], [gegner('Ork', { atk: 20, spd: 5 })]);
    expect(runde(run, 1)).toContain('Ork greift Lia an für 20');
    expect(runde(run, 1)).toContain(`★ Brom setzt Vergelter ein → rächt Lia: Ork erleidet ${brom.atk}`);

    const allein = einheit(held('Brom', 'guardian', 'guardian_vergelter'), {}, true);
    const golem = gegner('Golem', { atk: 20, spd: 5, skills: faehigkeit('Hieb', 'damage', 'player') });
    const mitHieb = kampf([allein], [golem]);
    expect(runde(mitHieb, 1)).toContain('Golem setzt Hieb ein → Brom erleidet 20');
    expect(runde(mitHieb, 1)).toContain(`★ Brom setzt Vergelter ein → schlägt zurück: Golem erleidet ${allein.atk}`);

    const flaeche = einheit(held('Brom', 'guardian', 'guardian_vergelter'), {}, true);
    const beben = kampf([flaeche], [gegner('Golem', { atk: 20, spd: 5, skills: faehigkeit('Beben', 'aoe', 'all_players') })]);
    expect(runde(beben, 1)).toContain('Golem setzt Beben ein → Brom erleidet 20');
    expect(runde(beben, 1).some(z => z.includes('Vergelter'))).toBe(false);
  });

  test('Scharfschützin: zielt auf den schwächsten Gegner, der erste Schuss trifft kritisch', () => {
    const lia = einheit(held('Lia', 'ranger', 'ranger_scharfschuetzin'));
    const run = kampf([lia], [gegner('Riese'), gegner('Wicht', { hp: 50, maxHp: 50 })]);
    const r1 = runde(run, 1);
    const schuss = r1.indexOf('★ Lia setzt Scharfschützin ein → der erste Schuss sitzt: kritischer Treffer');
    expect(schuss).toBeGreaterThanOrEqual(0);
    expect(r1[schuss + 1]).toBe('Lia greift Wicht an für 15 KRIT!');
    expect(runde(run, 2)).toContain('Lia greift Wicht an für 10');

    // Zieht ein Gegner mit Spott alle Angriffe auf sich, gilt der Spott
    const spott = kampf([einheit(held('Lia', 'ranger', 'ranger_scharfschuetzin'))], [gegner('Wache', { tauntRounds: 2 }), gegner('Wicht', { hp: 50, maxHp: 50 })]);
    expect(runde(spott, 1)).toContain('Lia greift Wache an für 15 KRIT!');
  });

  test('Scharfschützin: aus der Deckung trifft ein Angriff den Helden mit den meisten Leben', () => {
    const lia = einheit(held('Lia', 'ranger', 'ranger_scharfschuetzin'), { threat: 10 }, true);
    const brom = einheit(held('Brom', 'guardian', null, WEG_AB_STUFE, { hp: 200, maxHp: 200 }));
    const run = kampf([lia, brom], [gegner('Ork', { atk: 20, spd: 5 })]);
    const r1 = runde(run, 1);
    expect(r1).toContain('  ★ Lia bleibt in Deckung → der Angriff gilt Brom');
    expect(r1).toContain('Ork greift Brom an für 20');
  });

  test('Fährtenleserin: markiert, wen sie trifft, und alle Helden treffen ihn härter', () => {
    const lia = einheit(held('Lia', 'ranger', 'ranger_faehrtenleserin'));
    const grimm = einheit(held('Grimm', 'berserker', null));
    const run = kampf([lia, grimm], [gegner('Puppe')]);
    const anteil = wert('ranger_faehrtenleserin', 'faehrte').anteil!;
    expect(runde(run, 1).slice(0, 3)).toEqual([
      'Lia greift Puppe an für 10',
      `★ Lia setzt Fährtenleserin ein → Puppe ist markiert: ${Math.round(anteil * 100)} % mehr Schaden von allen Helden`,
      `Grimm greift Puppe an für ${Math.floor(10 * (1 + anteil))}`,
    ]);
    expect(runde(run, 2)).toContain(`Lia greift Puppe an für ${Math.floor(10 * (1 + anteil))}`);
  });

  test('Fährtenleserin: die Kampfanzeige erkennt den Markierten an der ID, auch unter gleichnamigen Gegnern', () => {
    const lia = einheit(held('Lia', 'ranger', 'ranger_faehrtenleserin'));
    const erster = gegner('Wolf');
    const zweiter = gegner('Wolf', { tauntRounds: 5 });
    const run = kampf([lia], [erster, zweiter]);
    expect(runde(run, 1)[1]).toMatch(/^★ Lia setzt Fährtenleserin ein → Wolf ist markiert/);
    expect(run.combatRoundSnapshots![0].markiert).toEqual([zweiter.id]);
  });

  test('Fährtenleserin: Fallen machen halben Schaden, ganz vermiedene Fallen sagen es', () => {
    const fallen = (pfad: number): { hp: number[]; log: string[] } => {
      const lia = einheit(held('Lia', 'ranger', 'ranger_faehrtenleserin'));
      lia.specialEffects = lia.specialEffects!.map(e => (e.id === 'pfadfinder' ? { ...e, anteil: pfad } : e));
      const grimm = einheit(held('Grimm', 'berserker', null));
      const { run } = lauf([lia, grimm]);
      new EncounterProcessor().processHazard(run, { index: 0, type: 'hazard', enemies: [], healPercent: 0, hazardDamage: 20, completed: false });
      return { hp: [lia.hp, grimm.hp], log: run.combatLog };
    };
    expect(wert('ranger_faehrtenleserin', 'pfadfinder').anteil).toBe(0.5);
    expect(fallen(0.5)).toEqual({
      hp: [90, 90],
      log: ['>> Hazard! Team erleidet 10 Schaden.', '★ Lia setzt Fährtenleserin ein → findet einen sicheren Weg: nur halber Schaden'],
    });
    expect(fallen(1)).toEqual({
      hp: [100, 100],
      log: ['>> Hazard! Team erleidet keinen Schaden.', '★ Lia setzt Fährtenleserin ein → findet einen sicheren Weg: kein Schaden'],
    });
  });

  test('Lichtbringer: alle paar Runden heilt er den, dem es am schlechtesten geht', () => {
    const gebet = wert('cleric_lichtbringer', 'heilgebet');
    const ilse = einheit(held('Ilse', 'cleric', 'cleric_lichtbringer'), { hp: 90 });
    const lia = einheit(held('Lia', 'ranger', null), { hp: 40 });
    const { log, liste } = zeilen();
    for (let r = 1; r <= gebet.runden!; r++) rundenEnde([ilse, lia], [gegner('Fels')], r, new SeededRNG(1), log);
    const heilung = Math.floor(lia.maxHp * gebet.anteil!);
    expect(liste).toEqual([`★ Ilse setzt Lichtbringer ein → Lia +${heilung} Leben`]);
    expect(lia.hp).toBe(40 + heilung);
  });

  test('Kriegspriester: das Team hat mehr Verteidigung, solange er steht', () => {
    const ilse = einheit(held('Ilse', 'cleric', 'cleric_kriegspriester'));
    const grimm = einheit(held('Grimm', 'berserker', null));
    const { run } = lauf([ilse, grimm]);
    const { log, liste } = zeilen();
    kampfBeginn([ilse, grimm], [], run, log);
    expect(liste).toEqual(['★ Ilse setzt Kriegspriester ein → das ganze Team hat +1 Verteidigung']);
    expect([ilse.def, grimm.def]).toEqual([1, 1]);
    ilse.hp = 0;
    zustandAktualisieren([ilse, grimm], log);
    expect(liste.at(-1)).toBe('  ★ Der Segen des Kriegspriesters erlischt.');
    expect(grimm.def).toBe(0);

    const segen = wert('cleric_kriegspriester', 'kriegssegen', true);
    const meister = einheit(held('Ilse', 'cleric', 'cleric_kriegspriester', MEISTER_AB_STUFE));
    const grimm2 = einheit(held('Grimm', 'berserker', null));
    const { log: log2, liste: liste2 } = zeilen();
    kampfBeginn([meister, grimm2], [], lauf([meister, grimm2]).run, log2);
    expect(liste2).toEqual([`★ Ilse setzt Kriegspriester ein → das ganze Team hat ${segen.atk ? `+${segen.atk} Angriff und ` : ''}+${segen.power} Verteidigung`]);
    expect([grimm2.atk, grimm2.def]).toEqual([10 + (segen.atk ?? 0), segen.power]);
    kampfEnde([meister, grimm2]);
    expect([grimm2.atk, grimm2.def]).toEqual([10, 0]);
  });

  test('Zorn: jeder Treffer macht wilder, bis zum Höchstwert, nach dem Kampf ist er verraucht', () => {
    const zorn = wert('berserker_zorn', 'zorn');
    const grimm = einheit(held('Grimm', 'berserker', 'berserker_zorn'));
    const run = kampf([grimm], [gegner('Puppe', { hp: 5000, maxHp: 5000 })]);
    expect(runde(run, 1)).toContain(`  ★ Grimm: Zorn +${zorn.power} Angriff`);
    const voll = zorn.max! / zorn.power!;
    expect(runde(run, voll)).toContain(`★ Grimm setzt Zorn ein → voller Zorn: +${zorn.max} Angriff bis Kampfende`);
    expect(runde(run, voll + 1)).toContain(`Grimm greift Puppe an für ${10 + zorn.max!}`);
    expect(grimm.atk).toBe(10);
  });

  test('Schlächter: jeder Treffer trifft auch die anderen Gegner', () => {
    const anteil = wert('berserker_schlaechter', 'rundumschlag').anteil!;
    const grimm = einheit(held('Grimm', 'berserker', 'berserker_schlaechter'));
    const run = kampf([grimm], [gegner('Ork A', { threat: 10 }), gegner('Ork B')]);
    expect(runde(run, 1)).toContain('Grimm greift Ork A an für 10');
    expect(runde(run, 1)).toContain(`  ★ Grimm: Schlächter trifft alle → Ork B −${Math.floor(10 * anteil)}`);
  });

  test('Meuchlerin: angeschlagene Gegner erleiden mehr Schaden, als Meisterin noch mehr und schon früher', () => {
    const { anteil, power } = wert('assassin_meuchlerin', 'meucheln');
    const meister = wert('assassin_meuchlerin', 'meucheln', true);
    expect(meister.anteil!).toBeGreaterThan(anteil!);
    const angeschlagen = Math.floor(100 * anteil!) - 1;
    const run = kampf([einheit(held('Sina', 'assassin', 'assassin_meuchlerin'))], [gegner('Puppe', { hp: angeschlagen, maxHp: 100 })]);
    expect(runde(run, 1).slice(0, 2)).toEqual([
      `  ★ Sina: Meuchlerin! Puppe ist angeschlagen: ${Math.round((power! - 1) * 100)} % mehr Schaden`,
      `Sina greift Puppe an für ${Math.floor(10 * power!)}`,
    ]);
    const voll = kampf([einheit(held('Sina', 'assassin', 'assassin_meuchlerin'))], [gegner('Puppe', { hp: 100 * anteil! + 1, maxHp: 100 })]);
    expect(runde(voll, 1)[0]).toBe('Sina greift Puppe an für 10');
    // als Meisterin zählt schon, wer unter ihrer höheren Schwelle liegt
    const meisterin = kampf([einheit(held('Sina', 'assassin', 'assassin_meuchlerin', MEISTER_AB_STUFE))], [gegner('Puppe', { hp: 100 * anteil! + 1, maxHp: 100 })]);
    expect(runde(meisterin, 1).slice(0, 2)).toEqual([
      `  ★ Sina: Meuchlerin! Puppe ist angeschlagen: ${String(meister.power).replace('.', ',')}-facher Schaden`,
      `Sina greift Puppe an für ${Math.floor(10 * meister.power!)}`,
    ]);
  });

  test('Schattentänzerin: weicht Angriffen und Fähigkeiten aus und kontert, Angriffen auf alle nicht', () => {
    const sina = einheit(held('Sina', 'assassin', 'assassin_schattentaenzerin'), {}, true);
    const run = kampf([sina], [gegner('Ork', { atk: 20, spd: 5 })]);
    expect(runde(run, 1)[0]).toBe('★ Sina setzt Schattentänzerin ein → weicht Ork aus und kontert: 10 Schaden');
    expect(sina.hp).toBe(sina.maxHp);

    const sina2 = einheit(held('Sina', 'assassin', 'assassin_schattentaenzerin'), {}, true);
    const hieb = kampf([sina2], [gegner('Golem', { atk: 20, spd: 5, skills: faehigkeit('Hieb', 'damage', 'player') })]);
    expect(runde(hieb, 1)[0]).toBe('★ Sina setzt Schattentänzerin ein → weicht Golem aus und kontert: 10 Schaden');

    const sina3 = einheit(held('Sina', 'assassin', 'assassin_schattentaenzerin'), {}, true);
    const beben = kampf([sina3], [gegner('Golem', { atk: 20, spd: 5, skills: faehigkeit('Beben', 'aoe', 'all_players') })]);
    expect(runde(beben, 1)[0]).toBe('Golem setzt Beben ein → Sina erleidet 20');
  });

  test('Schutzherr: fängt Angriffe auf schwer verletzte Verbündete ab', () => {
    const anteil = wert('paladin_schutzherr', 'abfangen').anteil!;
    const pala = einheit(held('Pala', 'paladin', 'paladin_schutzherr'));
    const lia = einheit(held('Lia', 'ranger', null), { threat: 10, hp: Math.floor(100 * anteil) - 1 });
    const run = kampf([pala, lia], [gegner('Ork', { atk: 20, spd: 5 })]);
    expect(runde(run, 1).slice(0, 2)).toEqual([
      '★ Pala setzt Schutzherr ein → fängt den Angriff auf Lia ab',
      `Ork greift Pala an für ${20 - Math.floor(pala.def * 0.7)}`,
    ]);

    const gesund = einheit(held('Lia', 'ranger', null), { threat: 10, hp: Math.ceil(100 * anteil) });
    const run2 = kampf([einheit(held('Pala', 'paladin', 'paladin_schutzherr')), gesund], [gegner('Ork', { atk: 20, spd: 5 })]);
    expect(runde(run2, 1)[0]).toBe('Ork greift Lia an für 20');
  });

  test('Kreuzritter: seine Treffer heilen den verletztesten Verbündeten', () => {
    const anteil = wert('paladin_kreuzritter', 'kreuzheil').anteil!;
    const pala = einheit(held('Pala', 'paladin', 'paladin_kreuzritter', WEG_AB_STUFE, { atk: 50 }));
    const lia = einheit(held('Lia', 'ranger', null), { hp: 50 });
    const run = kampf([pala, lia], [gegner('Puppe', { threat: 10 })]);
    expect(runde(run, 1).slice(0, 2)).toEqual(['Pala greift Puppe an für 50', `  ★ Pala: Kreuzritter heilt Lia +${Math.floor(50 * anteil)}`]);
  });

  test('Heldenlied: das ganze Team ist schneller und stärker, bis der Kampf vorbei ist', () => {
    const lied = wert('bard_heldenlied', 'heldenlied');
    const barde = einheit(held('Barde', 'bard', 'bard_heldenlied'));
    const grimm = einheit(held('Grimm', 'berserker', null));
    const { log, liste } = zeilen();
    kampfBeginn([barde, grimm], [], lauf([barde, grimm]).run, log);
    expect(liste).toEqual([`★ Barde setzt Heldenlied ein → das ganze Team ist schneller und hat +${lied.power} Angriff`]);
    expect([grimm.atk, grimm.spd]).toEqual([10 + lied.power!, 1 + lied.tempo!]);
    kampfEnde([barde, grimm]);
    expect([grimm.atk, grimm.spd]).toEqual([10, 1]);
  });

  test('Schmählied: wer getroffen wird, hat zwei Runden weniger Angriff, ein neuer Treffer verlängert nur', () => {
    const lied = wert('bard_schmaehlied', 'schmaehlied');
    const barde = einheit(held('Barde', 'bard', 'bard_schmaehlied', WEG_AB_STUFE, { hp: 1000, maxHp: 1000 }));
    const run = kampf([barde], [gegner('Ork', { atk: 50 })]);
    const minus = Math.round(50 * lied.anteil!);
    expect(runde(run, 1)).toEqual([
      'Barde greift Ork an für 10',
      `  ★ Barde: Schmählied! Ork ist gekränkt: −${minus} Angriff`,
      `Ork greift Barde an für ${50 - minus}`,
    ]);
    expect(runde(run, 2)).toEqual(['Barde greift Ork an für 10', `Ork greift Barde an für ${50 - minus}`]);
  });

  test('Schmählied: wird ein Boss wütend, bleibt nach dem Lied kein Rest', () => {
    const barde = einheit(held('Barde', 'bard', 'bard_schmaehlied'));
    const drache = gegner('Drache', { atk: 40, spd: 2 });
    nachTreffer(barde, drache, 10, [drache], [barde], new SeededRNG(1), () => {});
    const minus = 40 - drache.atk;
    expect(minus).toBeGreaterThan(0);
    wutAnfall(drache, 1.5, 1.3);
    expect(drache.atk).toBe(Math.floor(40 * 1.5) - minus);
    expect(drache.spd).toBeCloseTo(2.6);
    // Das Lied ist aus: wie im Kampf am Rundenende
    for (const b of drache.buffs) drache.atk -= b.value;
    expect(drache.atk).toBe(Math.floor(40 * 1.5));
    // Ohne Lied wie immer
    const ork = gegner('Ork', { atk: 41 });
    wutAnfall(ork, 1.5, 1);
    expect(ork.atk).toBe(Math.floor(41 * 1.5));
  });

  test('Sturmhexe: alle paar Runden trifft ein Blitz alle Gegner', () => {
    const blitz = wert('witch_sturmhexe', 'kettenblitz');
    const hexe = einheit(held('Hexe', 'witch', 'witch_sturmhexe'));
    const { log, liste } = zeilen();
    for (let r = 1; r <= blitz.runden!; r++) rundenEnde([hexe], [gegner('A'), gegner('B', { def: 4 })], r, new SeededRNG(1), log);
    expect(liste).toEqual([
      '★ Hexe setzt Sturmhexe ein → ein Blitz trifft alle Gegner',
      `  A erleidet ${Math.floor(10 * blitz.anteil!)}`,
      `  B erleidet ${Math.floor((10 - 2) * blitz.anteil!)}`,
    ]);
  });

  test('Fluchweberin: jeder Treffer nimmt Verteidigung, bis zum Höchstwert und nie unter null', () => {
    const fluch = wert('witch_fluchweberin', 'fluch');
    const hexe = einheit(held('Hexe', 'witch', 'witch_fluchweberin'));
    const wache = gegner('Wache', { def: 10 });
    const { log, liste } = zeilen();
    const verlauf: number[] = [];
    for (let i = 0; i < 8; i++) {
      nachTreffer(hexe, wache, 5, [wache], [hexe], new SeededRNG(1), log);
      verlauf.push(wache.def);
    }
    const erwartet = Array.from({ length: 8 }, (_, i) => 10 - Math.min(fluch.max!, (i + 1) * fluch.power!));
    expect(verlauf).toEqual(erwartet);
    expect(liste[0]).toBe(`  ★ Hexe: Fluchweberin! Wache −${fluch.power} Verteidigung (jetzt ${10 - fluch.power!})`);
    expect(liste).toHaveLength(Math.ceil(fluch.max! / fluch.power!));

    const duenn = gegner('Wicht', { def: 1 });
    for (let i = 0; i < 3; i++) nachTreffer(hexe, duenn, 5, [duenn], [hexe], new SeededRNG(1), log);
    expect(duenn.def).toBe(0);
  });

  test('Knochenherr: Gefallene stehen als Skelette auf, schlagen jede Runde zu und bleiben für die Expedition', () => {
    const knochen = wert('necromancer_knochenherr', 'skelette');
    const nekro = einheit(held('Nekro', 'necromancer', 'necromancer_knochenherr'));
    const run = kampf([nekro], [gegner('Ratte', { hp: 1, maxHp: 1, threat: 10 }), gegner('Fels')]);
    const r1 = runde(run, 1);
    expect(r1).toContain('★ Nekro setzt Knochenherr ein → Ratte steht als Skelett wieder auf (1)');
    expect(r1.at(-1)).toBe(`  ★ Nekro: Sein Skelett schlägt zu → Fels −${Math.floor(10 * knochen.anteil!)}`);
    expect(nekro.skelette).toBe(1);

    // Im nächsten Kampf zieht das Skelett mit, mehr als der Höchstwert stehen nicht auf
    const zweiter = kampf([nekro], [1, 2, 3].map(i => gegner(`Ratte ${i}`, { hp: 1, maxHp: 1 })));
    expect(runde(zweiter, 1)[0]).toBe('  ★ Nekro: Ein Skelett zieht mit in den Kampf');
    expect(nekro.skelette).toBe(knochen.max);
  });

  test('Seuchenbringer: am Rundenende verlieren alle Gegner Leben, zwei Seuchen zählen einmal', () => {
    const nekro = einheit(held('Nekro', 'necromancer', 'necromancer_seuchenbringer'));
    const meister = einheit(held('Morbus', 'necromancer', 'necromancer_seuchenbringer', MEISTER_AB_STUFE));
    const a = gegner('A');
    const b = gegner('B');
    const { log, liste } = zeilen();
    rundenEnde([nekro, meister], [a, b], 1, new SeededRNG(1), log);
    const menge = wert('necromancer_seuchenbringer', 'seuche', true).power!;
    expect(liste).toEqual([`  ★ Morbus: Seuchenbringer → alle Gegner −${menge} Leben`]);
    expect([a.hp, b.hp]).toEqual([1000 - menge, 1000 - menge]);
  });

  test('Bärengestalt: zieht zu Kampfbeginn ein paar Runden lang alle Angriffe auf sich', () => {
    const runden = wert('druid_baerengestalt', 'baerengestalt').runden!;
    const baer = einheit(held('Bärbel', 'druid', 'druid_baerengestalt'));
    const lia = einheit(held('Lia', 'ranger', null, WEG_AB_STUFE, { hp: 1000, maxHp: 1000 }), { threat: 10 });
    const run = kampf([baer, lia], [gegner('Ork', { atk: 20, spd: 5 })]);
    expect(runde(run, 1)[0]).toBe(`★ Bärbel setzt Bärengestalt ein → zieht ${runden} Runden lang alle Angriffe auf sich`);
    for (let r = 1; r <= runden; r++) expect(runde(run, r)).toContain(`Ork greift Bärbel an für ${20 - Math.floor(baer.def * 0.7)}`);
    expect(runde(run, runden + 1)).toContain('Ork greift Lia an für 20');
  });

  test('Hüterin des Hains: zu Kampfbeginn heilt das ganze Team', () => {
    const anteil = wert('druid_hain', 'hain').anteil!;
    const druidin = einheit(held('Hain', 'druid', 'druid_hain'), { hp: 50 });
    const lia = einheit(held('Lia', 'ranger', null), { hp: 99 });
    const { log, liste } = zeilen();
    kampfBeginn([druidin, lia], [], lauf([druidin, lia]).run, log);
    expect(liste).toEqual([`★ Hain setzt Hüterin des Hains ein → das ganze Team heilt ${Math.round(anteil * 100)} % Leben`]);
    expect([druidin.hp, lia.hp]).toEqual([50 + Math.floor(100 * anteil), 100]);
  });

  test('Wege mit Zufall würfeln nur, wenn jemand den Weg hat', () => {
    const rng = new SeededRNG(1);
    const wuerfel = vi.spyOn(rng, 'chance');
    const brom = einheit(held('Brom', 'guardian', null));
    const lia = einheit(held('Lia', 'ranger', null));
    const ork = gegner('Ork');
    const { log } = zeilen();
    expect(deckung(lia, [brom, lia], rng, log)).toBe(lia);
    expect(schattentanz(lia, ork, rng, log)).toBe(false);
    vergeltung(lia, ork, [brom, lia], rng, log);
    expect(wuerfel).not.toHaveBeenCalled();
  });
});

// ── Anzeige ──

describe('Wege in der Anzeige', () => {
  test('Abzeichen auf der Heldenkarte: Weg wählen, Weg, Meister', () => {
    const f = held('Brom', 'guardian', null, WEG_AB_STUFE - 1);
    expect(wegAbzeichen(f)).toBe('');
    f.level = WEG_AB_STUFE;
    expect(wegAbzeichen(f)).toContain('class="hc-weg neu"');
    expect(wegAbzeichen(f)).toContain('★ Weg wählen');
    waehleWeg(f, 'guardian_phalanx');
    expect(wegAbzeichen(f)).toContain('🧱 Phalanx</span>');
    f.level = MEISTER_AB_STUFE;
    expect(wegAbzeichen(f)).toContain('class="hc-weg meister"');
    expect(wegAbzeichen(f)).toContain('Phalanx ★</span>');
  });

  test('Bereich im Heldenfenster: Vorschau, Wahl mit Bestätigung, gewählter Weg', () => {
    const f = held('Brom', 'guardian', null, WEG_AB_STUFE - 2);
    let html = wegBereichHtml(f, null);
    expect(html).toContain('noch 2 Stufen');
    expect(html.match(/hdm2-weg-karte vorschau/g)).toHaveLength(2);
    expect(html).not.toContain('data-weg-waehlen');

    f.level = WEG_AB_STUFE;
    html = wegBereichHtml(f, null);
    expect(html).toContain('data-weg-waehlen="guardian_phalanx"');
    expect(html).toContain('data-weg-waehlen="guardian_vergelter"');
    html = wegBereichHtml(f, 'guardian_vergelter');
    expect(html).toContain('Für immer Vergelter?');
    expect(html).toContain('data-weg-ja="guardian_vergelter"');
    expect(html).toContain('data-weg-waehlen="guardian_phalanx"');

    waehleWeg(f, 'guardian_vergelter');
    html = wegBereichHtml(f, null);
    expect(html.match(/hdm2-weg-karte/g)).toHaveLength(1);
    expect(html).toContain('Meister ab Stufe 15');
    f.level = MEISTER_AB_STUFE;
    expect(wegBereichHtml(f, null)).toContain('hdm2-weg-meister aktiv');
  });

  test('Bilanz nach der Expedition erinnert an die Wahl und feiert den Meister', () => {
    const f = held('Brom', 'guardian', null, WEG_AB_STUFE);
    expect(wegBilanz(f, 1)).toBe(' · ★ Weg wählen!');
    waehleWeg(f, 'guardian_phalanx');
    expect(wegBilanz(f, 1)).toBe('');
    f.level = MEISTER_AB_STUFE;
    expect(wegBilanz(f, 1)).toBe(' · ★ Meister: Phalanx!');
    expect(wegBilanz(f, 0)).toBe('');
    f.level = MEISTER_AB_STUFE + 1;
    expect(wegBilanz(f, 1)).toBe('');
  });
});

// ── Bilanz und Zustände ──

describe('Wege: Bilanz und Zustände im Kampf', () => {
  test('Bärengestalt: unter der Hälfte ihrer Leben wird sie wieder Druidin', () => {
    const baer = einheit(held('Bärbel', 'druid', 'druid_baerengestalt'));
    const lia = einheit(held('Lia', 'ranger', null, WEG_AB_STUFE, { hp: 1000, maxHp: 1000 }), { threat: 10 });
    // ein Treffer bringt sie unter die Hälfte, aber nicht um
    const ork = gegner('Ork', { atk: Math.ceil(baer.maxHp * 0.6) + Math.floor(baer.def * 0.7), spd: 5 });
    const run = kampf([baer, lia], [ork]);
    const zurueck = run.combatLog.indexOf('  ★ Bärbel fällt unter die Hälfte ihrer Leben und wird wieder Druidin');
    expect(zurueck).toBeGreaterThan(0);
    expect(run.combatLog.slice(zurueck).find(z => z.startsWith('Ork greift'))).toMatch(/^Ork greift Lia an/);
    expect(baer.wegWirkung?.angezogen).toBe(1);

    // schon schwer verletzt: keine Bärin, die Angriffe gehen wie sonst
    const wund = einheit(held('Bärbel', 'druid', 'druid_baerengestalt'));
    wund.hp = Math.floor(wund.maxHp / 2) - 1;
    const { log, liste } = zeilen();
    kampfBeginn([wund], [], lauf([wund]).run, log);
    expect(liste).toEqual([]);
    expect(wund.tauntRounds).toBe(0);
  });

  test('Schild, Heilung und Rache zählen für den Helden mit dem Weg', () => {
    const brom = einheit(held('Brom', 'guardian', 'guardian_phalanx'));
    const hain = einheit(held('Hain', 'druid', 'druid_hain'), { hp: 50 });
    const lia = einheit(held('Lia', 'ranger', null), { hp: 90 });
    kampfBeginn([brom, hain, lia], [], lauf([brom, hain, lia]).run, () => {});
    const anteil = wert('druid_hain', 'hain').anteil!;
    expect(brom.wegWirkung).toEqual({ schild: 3 * wert('guardian_phalanx', 'phalanx').power! });
    expect(hain.wegWirkung).toEqual({ heilung: Math.floor(hain.maxHp * anteil) + Math.min(10, Math.floor(lia.maxHp * anteil)) });
    expect(lia.wegWirkung).toBeUndefined();

    const raecher = einheit(held('Brom', 'guardian', 'guardian_vergelter'), {}, true);
    const opfer = einheit(held('Lia', 'ranger', null), { threat: 10 });
    const run = kampf([raecher, opfer], [gegner('Ork', { atk: 20, spd: 5 })]);
    const rachen = run.combatLog.filter(z => z.startsWith('★ Brom setzt Vergelter ein')).length;
    expect(rachen).toBeGreaterThan(0);
    expect(raecher.wegWirkung?.schaden).toBe(rachen * raecher.atk);
  });

  test('Heldenlied: der Mehrschaden aller Helden zählt für die Bardin', () => {
    const bardin = einheit(held('Bardin', 'bard', 'bard_heldenlied'));
    const lia = einheit(held('Lia', 'ranger', null));
    const run = kampf([bardin, lia], [gegner('Puppe', { hp: 300, maxHp: 300 })]);
    const treffer = run.combatLog.filter(z => /^(Bardin|Lia) greift Puppe an für/.test(z)).length;
    expect(treffer).toBeGreaterThan(0);
    expect(bardin.wegWirkung?.schaden).toBeCloseTo(treffer * wert('bard_heldenlied', 'heldenlied').power!);
    expect(lia.wegWirkung).toBeUndefined();
  });

  test('Kriegssegen und Schmählied zählen den Schaden, den sie den Helden ersparen', () => {
    const pater = einheit(held('Pater', 'cleric', 'cleric_kriegspriester'));
    const lia = einheit(held('Lia', 'ranger', null), { def: 2 });
    kampfBeginn([pater, lia], [], lauf([pater, lia]).run, () => {});
    const segen = wert('cleric_kriegspriester', 'kriegssegen').power!;
    const ork = gegner('Ork', { atk: 20 });
    const dmg = grundSchaden(ork.atk, lia.def);
    wegAnteileZaehlen(ork, lia, dmg, [pater, lia], [ork]);
    expect(pater.wegWirkung).toEqual({ verhindert: grundSchaden(ork.atk, lia.def - segen) - dmg });

    const bardin = einheit(held('Bardin', 'bard', 'bard_schmaehlied'));
    const riese = gegner('Riese', { atk: 50 });
    nachTreffer(bardin, riese, 10, [riese], [bardin, lia], new SeededRNG(1), () => {});
    const minus = 50 - riese.atk;
    expect(minus).toBeGreaterThan(0);
    wegAnteileZaehlen(riese, lia, grundSchaden(riese.atk, lia.def), [bardin, lia], [riese]);
    expect(bardin.wegWirkung?.verhindert).toBeCloseTo(grundSchaden(50, lia.def) - grundSchaden(riese.atk, lia.def));
  });

  test('Fährte und Meucheln: den Mehrschaden teilen sich Fährtenleserin und Meuchlerin', () => {
    const lia = einheit(held('Lia', 'ranger', 'ranger_faehrtenleserin'));
    const sina = einheit(held('Sina', 'assassin', 'assassin_meuchlerin'));
    const mal = wert('ranger_faehrtenleserin', 'faehrte').anteil!;
    const mehr = wert('assassin_meuchlerin', 'meucheln').power!;
    const puppe = gegner('Puppe', { hp: 100, maxHp: 1000, markiert: mal });
    expect(wegSchaden(sina, puppe, 100, () => {}, [lia, sina])).toBe(Math.floor(100 * (1 + mal) * mehr));
    expect(lia.wegWirkung?.schaden).toBeCloseTo(100 * mal * mehr);
    expect(sina.wegWirkung?.schaden).toBeCloseTo(100 * (1 + mal) * (mehr - 1));
  });

  test('nach jeder Runde: Zorn auf der Karte des Helden, Fluch und Kränkung auf der des Gegners', () => {
    const grimm = einheit(held('Grimm', 'berserker', 'berserker_zorn'));
    const puppe = gegner('Puppe', { hp: 5000, maxHp: 5000, def: 10 });
    const run = kampf([grimm], [puppe]);
    const zorn = wert('berserker_zorn', 'zorn');
    expect(run.combatRoundSnapshots![0].wegZustand?.helden[grimm.id]).toEqual([
      { zeichen: `🔥+${zorn.power}`, titel: `Zorn: +${zorn.power} Angriff bis Kampfende` },
    ]);
    expect(run.combatRoundSnapshots![0].wegZustand?.gegner[puppe.id]).toBeUndefined();

    const hexe = einheit(held('Hexe', 'witch', 'witch_fluchweberin'));
    const bardin = einheit(held('Bardin', 'bard', 'bard_schmaehlied'));
    const wache = gegner('Wache', { def: 10, atk: 50 });
    nachTreffer(hexe, wache, 5, [wache], [hexe], new SeededRNG(1), () => {});
    nachTreffer(bardin, wache, 5, [wache], [bardin], new SeededRNG(1), () => {});
    const fluch = wert('witch_fluchweberin', 'fluch').power!;
    expect(wache.def).toBe(10 - fluch);
    const zustand = wegZustandDerRunde([hexe, bardin], [wache]);
    expect(zustand?.gegner[wache.id].map(z => z.zeichen)).toEqual([`🕸️−${fluch}`, `🎭−${50 - wache.atk}`]);
    expect(zustand?.helden).toEqual({});
  });

  test('Bilanz in Worten: nach der Expedition und im Heldenfenster', () => {
    expect(wirkungText({ heilung: 380.4, schaden: 1240.6, krit: 0.2 })).toBe('1.241 Schaden, 380 Leben geheilt');
    expect(wirkungText(undefined)).toBe('');
    const f = held('Brom', 'guardian', 'guardian_phalanx');
    expect(wegWirkungZeile(f, { schild: 240, abgefangen: 2 })).toBe('🧱 Phalanx: 240 Schild verteilt, 2 Angriffe abgefangen');
    expect(wirkungText({ krit: 1, umgelenkt: 1.2 })).toBe('1 sicherer Krit, 1 Angriff umgelenkt');
    expect(wirkungText({ krit: 7, angezogen: 1 })).toBe('7 sichere Krits, 1 Angriff auf sich gezogen');
    expect(wegWirkungZeile(held('Lia', 'ranger', null), { schaden: 5 })).toBe('');
    expect(wegBereichHtml(f, null)).toContain('steht hier nach der nächsten Expedition');
    wegBilanzDazu(f, { schild: 120.4 });
    wegBilanzDazu(f, { schild: 120.6, schaden: 3 });
    expect(f.wegBilanz).toEqual({ schild: 241, schaden: 3 });
    expect(wegBereichHtml(f, null)).toContain('Bisher bewirkt: 3 Schaden, 241 Schild verteilt');
    expect(wegAbzeichen(f)).toContain(`title="Phalanx: ${getSpezialisierung('guardian_phalanx')!.text}"`);
  });
});
