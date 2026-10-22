import { GameState } from '../models/GameState';
import { ExpeditionRun, CombatUnit, EncounterRoom, EncounterChoice, TrankWirkung } from '../models/ExpeditionRun';
import { GuildFighter } from '../models/GuildRoster';
import { ROUTE_DEFS } from '../data/routes';
import { ITEM_DEFS } from '../data/items';
import { ENEMY_DEFS } from '../data/enemies';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { SeededRNG } from '../utils/RNG';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { MODIFIER_DEFS } from '../data/modifiers';
import { CombatEngine, bossWut, wutAbRunde } from './CombatEngine';
import { EncounterProcessor } from './EncounterProcessor';
import { expeditionsBeginn, setzeBonus } from './Kampfeffekte';
import { beuteNachBoss, chronikNachWahl, geschichteWirkt, geschichtsBeuteNachKampf, geschichtsWahlStellen, wirkungZeile } from './Geschichten';
import { schmiedeStufen } from './Schmiede';

/** Händler-Sortiment (Feature #16): Preis in Beutegold des laufenden Runs */
export const MERCHANT_PRICES: Record<string, number> = {
  healing_potion: 15,
  bread: 8,
  power_bread: 25,
};

/** Max. Käufe pro Händler */
export const MERCHANT_MAX_PURCHASES = 2;

/** «+3 Angriff», «+0,2 Tempo», «+10 maximale Leben»: der Wert einer Trank-Wirkung in Spielersprache */
function trankWertText(wirkung: Pick<TrankWirkung, 'stat' | 'wert'>): string {
  const name = { atk: 'Angriff', spd: 'Tempo', maxHp: 'maximale Leben' }[wirkung.stat];
  return `${wirkung.wert > 0 ? '+' : ''}${String(wirkung.wert).replace('.', ',')} ${name}`;
}

/**
 * Expedition orchestrator: start/advance/finalize expeditions.
 * Combat logic → CombatEngine. Encounter logic → EncounterProcessor.
 */
export class ExpeditionSystem {
  private combatEngine: CombatEngine;
  private encounterProcessor: EncounterProcessor;
  private provisionSystem: ProvisionSystem;

  constructor(gearSystem: GearSystem, provisionSystem: ProvisionSystem) {
    this.combatEngine = new CombatEngine(gearSystem);
    this.encounterProcessor = new EncounterProcessor();
    this.provisionSystem = provisionSystem;
  }

  /**
   * Start an expedition. Marks fighters as ON_EXPEDITION.
   */
  startExpedition(
    state: GameState,
    routeId: string,
    fighterIds: number[],
    difficulty: string = 'normal',
    modifierId: string | null = null,
    isGrandmasterTrial: boolean = false,
    requestedConsumables?: string[],
  ): ExpeditionRun | null {
    const route = ROUTE_DEFS[routeId];
    if (!route) return null;
    if (fighterIds.length === 0) return null;
    if (state.activeExpedition) return null;

    const fighters = fighterIds
      .map(id => state.fighters.find(f => f.id === id))
      .filter((f): f is GuildFighter => f != null);

    if (fighters.length === 0) return null;

    // Build party combat units (mit den Stufen der Schmiede)
    const stufen = schmiedeStufen(state);
    const party: CombatUnit[] = fighters.map(f => this.combatEngine.fighterToCombatUnit(f, stufen));

    // Apply iron_trial modifier: halve party DEF
    if (modifierId === 'iron_trial') {
      for (const unit of party) {
        unit.def = Math.floor(unit.def / 2);
      }
    }

    // Build encounter rooms from route
    const rooms: EncounterRoom[] = route.encounters.map((enc, i) => {
      let enemyIds = enc.enemies ?? [];
      // elite_guard modifier: add 1 extra enemy per combat/boss room
      if (modifierId === 'elite_guard' && enc.type === 'combat' && enemyIds.length > 0) {
        enemyIds = [...enemyIds, enemyIds[0]]; // Ersten Gegner duplizieren
      }
      return {
        index: i,
        type: enc.type,
        enemies: enemyIds.map(eid => this.combatEngine.enemyToCombatUnit(eid, difficulty)),
        healPercent: enc.healPercent ?? 0,
        hazardDamage: enc.damage ?? 0,
        completed: false,
        findGold: enc.findGold ?? 0,
        findItems: enc.findItems ?? [],
        fortification: enc.fortification ? {
          name: enc.fortification.name,
          hp: enc.fortification.hp,
          maxHp: enc.fortification.hp,
          armor: enc.fortification.armor,
          spriteKey: enc.fortification.spriteKey,
        } : undefined,
      };
    });

    // Apply nemesis modifier: Boss-HP verdoppeln
    if (modifierId === 'nemesis') {
      for (const room of rooms) {
        if (room.type === 'boss') {
          for (const e of room.enemies) {
            e.maxHp *= 2;
            e.hp = e.maxHp;
          }
        }
      }
    }

    // Load provisions: use player-selected consumables or auto-fill from stock
    let provisions: ExpeditionRun['provisions'];
    if (requestedConsumables && requestedConsumables.length > 0) {
      // Manual selection: take one of each requested item from stock
      provisions = [];
      for (const itemId of requestedConsumables) {
        const available = state.globalStock[itemId] ?? 0;
        if (available > 0) {
          const existing = provisions.find(p => p.itemId === itemId);
          if (existing) {
            existing.qty += 1;
          } else {
            provisions.push({ itemId, qty: 1 });
          }
          state.globalStock[itemId] = available - 1;
        }
      }
    } else {
      // Legacy auto-fill
      provisions = this.provisionSystem.loadProvisions(state, 4, []);
    }
    // Wegzehrung der Gilde: ein Brot und ein Heiltrank (gifted: verbraucht oder verloren, nie zurück ins Lager).
    // Kraft-Brot gibt es nicht mehr geschenkt, es kommt aus der Kräuterküche (docs/GILDENSTADT.md).
    provisions.push({ itemId: 'healing_potion', qty: 1, gifted: true });
    provisions.push({ itemId: 'bread', qty: 1, gifted: true });

    const rng = new SeededRNG(state.rngSeed++);

    const run: ExpeditionRun = {
      routeId,
      party,
      rooms,
      currentRoom: 0,
      combatLog: [],
      loot: {},
      goldEarned: 0,
      provisions,
      status: 'exploring',
      lastCheckpoint: 0,
      desperateResolveUsed: false,
      rngSeed: rng.nextInt(1, 2147483647),
      focusTarget: null,
      focusTargetCooldown: 0,
      difficulty,
      activeModifier: modifierId,
      score: 0,
      totalCombatRounds: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      isGrandmasterTrial: isGrandmasterTrial || undefined,
      abilitiesUsed: {},
    };

    // Set-Fähigkeiten, die die ganze Expedition wirken (Schildwall)
    expeditionsBeginn(run.party, zeile => run.combatLog.push(zeile));

    // Belagerungs-System initialisieren (nur für Siege-Routen)
    if (route.isSiegeRoute) {
      // Auto-detect war machine from globalStock (cannon preferred)
      const wmId = (['war_cannon', 'war_catapult'] as const)
        .find(id => (state.globalStock[id] ?? 0) > 0) ?? null;
      if (wmId) {
        run.warMachineUnit = this.combatEngine.warMachineToCombatUnit(wmId);
        run.warMachineItemId = wmId;
        // Consume from stock
        state.globalStock[wmId] = Math.max(0, (state.globalStock[wmId] ?? 0) - 1);
        run.combatLog.push(`⚙️ Kriegsmaschine bereit: ${run.warMachineUnit.name}`);
      }
    }

    // Luft-System initialisieren (nur für Unterwasser-Routen)
    if (route.isUnderwater) {
      let airBonus = 0;
      for (const fighter of fighters) {
        const gear = fighter.gear;
        for (const slot of ['mainHand', 'offHand', 'armor', 'trinket'] as const) {
          const itemId = gear[slot];
          if (itemId) {
            const itemDef = ITEM_DEFS[itemId];
            if (itemDef && 'airBonus' in itemDef && typeof (itemDef as { airBonus?: number }).airBonus === 'number') {
              airBonus += (itemDef as { airBonus: number }).airBonus;
            }
          }
        }
      }
      run.airShieldMax = 100 + airBonus;
      run.airShield = run.airShieldMax;
      run.combatLog.push(`💨 Luftschild aktiviert! (${run.airShield} Luft)`);
    }

    state.activeExpedition = run;
    return run;
  }

  /**
   * Process the current room of the expedition.
   * Returns true if the expedition is still active.
   */
  processCurrentRoom(state: GameState): boolean {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') return false;

    // Feature #11: Warte auf Auflösung einer Begegnungs-Wahl
    if (run.pendingChoice) return false;

    // Feature #15: Warte auf Checkpoint-Dialog
    if (run.pendingCheckpoint) return false;

    // Feature #16: Warte auf Händler-Interaktion
    if (run.pendingMerchant) return false;

    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
      return false;
    }

    const room = run.rooms[run.currentRoom];
    const rng = new SeededRNG(run.rngSeed);

    switch (room.type) {
      case 'combat':
      case 'boss':
        this.combatEngine.processCombat(run, room, rng);
        break;
      case 'rest':
        this.encounterProcessor.processRest(run, room, rng);
        break;
      case 'hazard':
        this.encounterProcessor.processHazard(run, room);
        break;
      case 'checkpoint':
        if (run.activeModifier !== 'death_march') {
          run.lastCheckpoint = run.currentRoom;
          run.combatLog.push('>> Kontrollpunkt erreicht!');
        } else {
          run.combatLog.push('>> Todesmarsch: Kontrollpunkt ignoriert!');
        }
        break;
      case 'find':
        this.encounterProcessor.processFind(run, room, rng);
        break;
      case 'merchant':
        this.encounterProcessor.processMerchant(run, room);
        break;
      case 'survivor':
        this.encounterProcessor.processSurvivor(run);
        break;
      case 'fortification':
        this.combatEngine.processFortificationCombat(run, room, rng);
        break;
    }

    run.rngSeed = rng.nextInt(1, 2147483647);

    // Luft-Decay für Unterwasser-Routen (nach jedem Raum, außer bei ausstehendem Händler/Wahl)
    const currentRoute = ROUTE_DEFS[run.routeId];
    if (currentRoute?.isUnderwater && run.airShield !== undefined && !run.pendingMerchant && !run.pendingChoice) {
      const decay = currentRoute.airDecayPerRoom ?? 8;
      run.airShield = Math.max(0, run.airShield - decay);
      run.combatLog.push(`💨 Luftschild: ${run.airShield} Luft verbleibend.`);
    }

    // Feature #16: Falls Händler ausstehend, Raum NICHT als abgeschlossen markieren
    if (run.pendingMerchant) return false;

    // Feature #11: Falls Wahl ausstehend, Raum NICHT als abgeschlossen markieren
    if (run.pendingChoice) return false;

    room.completed = true;

    // Check team wipe
    const aliveParty = run.party.filter(u => u.hp > 0);
    if (aliveParty.length === 0) {
      run.status = 'defeat';
      return false;
    }

    // Geschichte: Beute einer mutigen Wahl, die auf diesen Kampf gewartet hat
    geschichtsBeuteNachKampf(run, room);

    if (room.type === 'boss') this.ersterSiegBeute(state, run, room);

    // Auto-retreat check: if team HP < 20%
    const totalHp = run.party.reduce((s, u) => s + u.hp, 0);
    const totalMaxHp = run.party.reduce((s, u) => s + u.maxHp, 0);
    if (totalHp / totalMaxHp < 0.2 && !run.desperateResolveUsed) {
      run.combatLog.push('>> Team HP kritisch! Auto-Rückzug verfügbar.');
    }

    // Geschichte: Steht nach diesem Raum eine Entscheidung an, wartet der Lauf darauf
    if (geschichtsWahlStellen(run, room)) return false;

    this.raumGeschafft(run, room);
    return run.status === 'exploring' && !run.pendingCheckpoint;
  }

  /**
   * Nach einem geschafften Raum: Kontrollpunkt verlangen (Feature #15: nach
   * jedem 3. Raum, ausser nach dem letzten und bei Todesmarsch) oder in den
   * nächsten Raum gehen.
   */
  private raumGeschafft(run: ExpeditionRun, room: EncounterRoom): void {
    if (room.index % 3 === 2 && room.index < run.rooms.length - 1 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return;
    }
    this.naechsterRaum(run);
  }

  /** In den nächsten Raum; nach dem letzten ist die Expedition gewonnen. Beim Betreten laufen Tränke ab. */
  private naechsterRaum(run: ExpeditionRun): void {
    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
      return;
    }
    this.traenkeVerdauen(run);
  }

  // ─── Feature #11: Encounter-Auswahl ─────────────────────────────

  /**
   * Löst die ausstehende Begegnungs-Wahl auf (0 = Option A, 1 = Option B).
   */
  resolveChoice(run: ExpeditionRun, choiceIndex: 0 | 1): boolean {
    if (!run.pendingChoice) return false;

    const choice = choiceIndex === 0
      ? run.pendingChoice.optionA
      : run.pendingChoice.optionB;

    const room = run.rooms[run.pendingChoice.roomIndex];
    run.pendingChoice = undefined;

    this.applyEncounterChoice(run, choice);
    chronikNachWahl(run, room.index, choiceIndex, choice);

    room.completed = true;
    this.raumGeschafft(run, room);
    return true;
  }

  private applyEncounterChoice(run: ExpeditionRun, choice: EncounterChoice): void {
    const aliveParty = run.party.filter(u => u.hp > 0);

    switch (choice.effect) {
      case 'heal': {
        for (const unit of aliveParty) {
          const healAmt = Math.floor(unit.maxHp * choice.value / 100);
          unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
        }
        run.combatLog.push(`>> ${choice.label}: Party heilt ${choice.value}% HP.`);
        break;
      }
      case 'risky_heal': {
        // 60% Chance auf doppelte Heilung, 40% Chance auf Schaden
        const rng = new SeededRNG(run.rngSeed);
        run.rngSeed = rng.nextInt(1, 2147483647);
        const success = rng.chance(0.6);
        if (success) {
          for (const unit of aliveParty) {
            const healAmt = Math.floor(unit.maxHp * choice.value * 2 / 100);
            unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
          }
          run.combatLog.push(`>> ${choice.label}: Erfolg! Party heilt ${choice.value * 2}% HP.`);
        } else {
          for (const unit of aliveParty) {
            const dmg = Math.floor(unit.maxHp * choice.value / 100);
            unit.hp = Math.max(1, unit.hp - dmg);
          }
          run.combatLog.push(`>> ${choice.label}: Fehlschlag! Party erleidet ${choice.value}% HP Schaden.`);
        }
        break;
      }
      case 'gold': {
        run.goldEarned += choice.value;
        run.combatLog.push(`>> ${choice.label}: +${choice.value} Gold erhalten.`);
        break;
      }
      case 'item': {
        if (choice.itemId) {
          const itemName = ITEM_DEFS[choice.itemId]?.name ?? choice.itemId;
          if (choice.nachSieg) {
            beuteNachBoss(run, { [choice.itemId]: choice.value });
            run.combatLog.push(`>> ${choice.label}: ${choice.value}× ${itemName} kommen mit, wenn ${this.bossKurzname(run.routeId, 'der Boss')} fällt.`);
          } else {
            run.loot[choice.itemId] = (run.loot[choice.itemId] ?? 0) + choice.value;
            run.combatLog.push(`>> ${choice.label}: +${choice.value}× ${itemName} erhalten.`);
          }
        }
        break;
      }
      case 'xp': {
        if (!run.xpEarned) run.xpEarned = {};
        for (const unit of aliveParty) {
          run.xpEarned[unit.id] = (run.xpEarned[unit.id] ?? 0) + choice.value;
        }
        run.combatLog.push(`>> ${choice.label}: +${choice.value} XP für alle.`);
        break;
      }
      case 'geschichte':
        geschichteWirkt(run, choice.wirkung ?? []);
        break;
      case 'angriff':
        this.gruppenAngriffWaechst(run, choice);
        break;
      case 'kein':
        break;
    }

    // Preis der Wahl (verbotene Bücher, Sternenfeuer, befreite Sterne): kostet Leben, aber nie das letzte
    if (choice.kostetLeben) {
      for (const unit of aliveParty) {
        unit.hp = Math.max(1, unit.hp - Math.floor(unit.maxHp * choice.kostetLeben / 100));
      }
      run.combatLog.push(`>> Das hat seinen Preis: Die Gruppe verliert ${choice.kostetLeben}% HP.`);
    }
    // Preis in Angriff (Pfandzettel): wie das Sternenfeuer, nur nach unten
    if (choice.kostetAngriff) this.gruppenAngriffWaechst(run, { ...choice, value: -choice.kostetAngriff });

    // Zusage eines Set-Teils (Pfandbuch): zählt wie in den Geschichten, nur mit besiegtem Boss (systems/DungeonSets.ts)
    if (choice.setTeil) {
      run.setTeilVersprochen = true;
      run.combatLog.push(`>> ${choice.label}: ${wirkungZeile(run.routeId, { art: 'setTeil' })}.`);
    }

    // Preis in Geduld (Sonnenuhr): Die Wut-Runde des Bosses kommt früher, nie vor Runde 1 (CombatEngine.wutAbRunde)
    if (choice.bossWutFrueher) {
      run.bossWutFrueher = (run.bossWutFrueher ?? 0) + choice.bossWutFrueher;
      const wut = bossWut(ROUTE_DEFS[run.routeId]?.bossId ?? undefined);
      run.combatLog.push(`>> Das hat seinen Preis: ${this.bossKurzname(run.routeId, 'Der Boss')} wird ab Runde ${wutAbRunde(wut, run)} wütend.`);
    }

    if (choice.gier) this.hortGierWaechst(run, choice.gier);
  }

  /**
   * Sternenfeuer (EncounterChoice 'angriff'): Die ganze Gruppe hat bis zum Ende des Dungeons
   * `value` Prozent mehr Angriff, auch wer gerade am Boden liegt. Mehrmals gewählt zählen die
   * Prozente zusammen, gerechnet auf den Angriff vor dem ersten Mal. Boni aus Kämpfen, die
   * bleiben (Drachengier, Tiefenrausch), wachsen nicht mit: Sie kommen später wieder genau weg.
   * Mit negativem `value` ist es der Preis einer Wahl (EncounterChoice.kostetAngriff, Pfandzettel):
   * Die Gruppe schlägt schwächer zu, die flachen Boni (Zorn, Schmiedetakt, Heldenlied) bleiben ganz.
   */
  private gruppenAngriffWaechst(run: ExpeditionRun, choice: EncounterChoice): void {
    const vorher = run.gruppenAngriff ?? 0;
    const jetzt = vorher + choice.value;
    run.gruppenAngriff = jetzt;
    for (const unit of run.party) {
      if (unit.isWarMachine) continue;
      const boni = Object.entries(unit.effektBoni ?? {}).reduce((summe, [k, v]) => summe + (k.endsWith(':atk') ? v : 0), 0);
      unit.atk = Math.max(1, Math.round((unit.atk - boni) * (100 + jetzt) / (100 + vorher))) + boni;
    }
    if (jetzt < 0) {
      run.combatLog.push(`>> Das hat seinen Preis: Die Gruppe schlägt jetzt bis zum Ende des Dungeons ${-jetzt}% schwächer zu.`);
    } else {
      run.combatLog.push(`>> ${choice.label}: Die Gruppe hat jetzt ${jetzt}% mehr Angriff bis zum Ende des Dungeons.`);
    }
  }

  /**
   * Hort-Gier (RouteDef.hortGier): Jeder Punkt macht den Boss um feste Anteile seiner
   * Startwerte stärker, Punkte unter 0 schwächer (Sternenschlund). Wirkt sofort, damit
   * die Kampf-Vorschau die echten Werte zeigt.
   */
  private hortGierWaechst(run: ExpeditionRun, punkte: number): void {
    const route = ROUTE_DEFS[run.routeId];
    const regel = route?.hortGier;
    if (!regel) return;
    const vorher = run.gier ?? 0;
    const jetzt = vorher + punkte;
    run.gier = jetzt;
    // Verhältnis zum bisherigen Stand: so bleibt es bei Start × (1 + Punkte × Anteil)
    const faktor = (anteil: number): number => (1 + jetzt * anteil) / (1 + vorher * anteil);
    for (const room of run.rooms) {
      if (room.type !== 'boss' || room.completed) continue;
      for (const boss of room.enemies) {
        boss.atk = Math.round(boss.atk * faktor(regel.angriffProPunkt));
        const maxHp = Math.round(boss.maxHp * faktor(regel.lebenProPunkt));
        boss.hp += maxHp - boss.maxHp;
        boss.maxHp = maxHp;
      }
    }
    const bossName = this.bossKurzname(run.routeId, 'Der Boss');
    const prozent = (anteil: number): string => {
      const p = Math.round(jetzt * anteil * 100);
      return p < 0 ? `−${-p}` : `+${p}`;
    };
    const was = punkte > 0 ? 'wittert den Diebstahl' : 'wird schwächer';
    run.combatLog.push(`>> ${bossName} ${was}: ${prozent(regel.angriffProPunkt)}% Angriff, ${prozent(regel.lebenProPunkt)}% Leben.`);
  }

  /** Name des Routen-Bosses ohne Beinamen, für Sätze: «Nyxar wird schwächer», nicht «Nyxar, der Sternenfresser wird schwächer» */
  private bossKurzname(routeId: string, ohneBoss: string): string {
    const bossId = ROUTE_DEFS[routeId]?.bossId;
    const name = bossId ? ENEMY_DEFS[bossId]?.name : undefined;
    return name ? name.split(',')[0] : ohneBoss;
  }

  /** Erster Sieg der Gilde über den Routen-Boss: garantierte Beute (RouteDef.ersterSiegBeute). */
  private ersterSiegBeute(state: GameState, run: ExpeditionRun, room: EncounterRoom): void {
    const route = ROUTE_DEFS[run.routeId];
    const itemId = route?.ersterSiegBeute;
    const bossId = route?.bossId;
    if (!itemId || !bossId) return;
    const besiegt = room.enemies.some(e => e.defId === bossId && e.hp <= 0);
    if (!besiegt || state.guildStats.bossesDefeatedIds.includes(bossId)) return;
    run.loot[itemId] = (run.loot[itemId] ?? 0) + 1;
    run.combatLog.push(`>> Erster Sieg über ${ENEMY_DEFS[bossId]?.name ?? bossId}: ${ITEM_DEFS[itemId]?.name ?? itemId} gehört euch!`);
  }

  // ─── Feature #15: Checkpoint-Dialog ─────────────────────────────

  /**
   * Löst den Checkpoint-Dialog auf.
   * Bei retreat=true wird die Expedition abgebrochen.
   */
  resolveCheckpoint(run: ExpeditionRun, retreat: boolean): void {
    if (!run.pendingCheckpoint) return;
    run.pendingCheckpoint = undefined;

    if (retreat) {
      this.retreat(run);
      return;
    }

    this.naechsterRaum(run);
  }

  // ─── Feature #16: Händler-Encounter ─────────────────────────────

  /**
   * Kauft einen Gegenstand beim Händler.
   * Verfügbar: healing_potion (15 Gold), bread (8 Gold), power_bread (25 Gold)
   */
  merchantBuy(run: ExpeditionRun, itemId: string): boolean {
    if (!run.pendingMerchant) return false;
    if ((run.merchantPurchases ?? 0) >= MERCHANT_MAX_PURCHASES) {
      run.combatLog.push('>> Händler: Du kannst maximal 2 Gegenstände kaufen.');
      return false;
    }

    const price = MERCHANT_PRICES[itemId];
    if (price === undefined) {
      run.combatLog.push(`>> Händler: Unbekannter Artikel "${itemId}".`);
      return false;
    }

    if (run.goldEarned < price) {
      run.combatLog.push(`>> Händler: Nicht genug Gold! (Benötigt: ${price}, Vorhanden: ${run.goldEarned})`);
      return false;
    }

    run.goldEarned = Math.max(0, run.goldEarned - price);
    run.loot[itemId] = (run.loot[itemId] ?? 0) + 1;
    run.merchantPurchases = (run.merchantPurchases ?? 0) + 1;

    const itemName = ITEM_DEFS[itemId]?.name ?? itemId;
    run.combatLog.push(`>> Händler: ${itemName} gekauft für ${price} Gold.`);
    return true;
  }

  /**
   * Überspringt den Händler und erhält die kostenlose 15%-Heilung.
   */
  merchantSkip(run: ExpeditionRun): void {
    if (!run.pendingMerchant) return;
    run.pendingMerchant = undefined;
    run.merchantPurchases = undefined;

    // Kostenlose 15% Heilung wie bisher
    for (const unit of run.party) {
      if (unit.hp > 0) {
        const heal = Math.floor(unit.maxHp * 0.15);
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      }
    }
    run.combatLog.push('>> Händler: Ihr lehnt das Angebot ab. Er heilt eure Wunden kostenlos. (+15% HP)');

    const room = run.rooms[run.currentRoom];
    room.completed = true;
    this.raumGeschafft(run, room);
  }

  /**
   * Schließt den Händler nach Einkäufen ab.
   */
  merchantClose(run: ExpeditionRun): void {
    if (!run.pendingMerchant) return;
    run.pendingMerchant = undefined;
    run.merchantPurchases = undefined;
    run.combatLog.push('>> Händler: Auf Wiedersehen, Abenteurer!');

    const room = run.rooms[run.currentRoom];
    room.completed = true;
    this.raumGeschafft(run, room);
  }

  /**
   * Verzweifelter Entschluss: Gibt allen lebenden Party-Mitgliedern +3 ATK +2 DEF für 2 Runden.
   */
  desperateResolve(run: ExpeditionRun): boolean {
    if (run.desperateResolveUsed) return false;
    run.desperateResolveUsed = true;
    for (const unit of run.party) {
      if (unit.hp > 0) {
        unit.atk += 3;
        unit.def += 2;
        unit.buffs.push({ stat: 'atk', value: 3, remainingRounds: 2 });
        unit.buffs.push({ stat: 'def', value: 2, remainingRounds: 2 });
      }
    }
    run.combatLog.push('>> VERZWEIFELTER ENTSCHLUSS! Party erhält +3 ATK +2 DEF für 2 Runden!');
    return true;
  }

  /**
   * Retreat from expedition (keep loot gained so far).
   * A finished run keeps its result: the combat screen's retreat button
   * stays clickable while an already decided fight is still playing.
   */
  retreat(run: ExpeditionRun): void {
    if (run.status === 'exploring') run.status = 'retreat';
  }

  /**
   * What the UI has to do next after a room (combat or not) was processed.
   * Pending dialogs take precedence over advancing.
   */
  nextStep(run: ExpeditionRun): 'checkpoint' | 'merchant' | 'choice' | 'room' | 'finish' {
    if (run.status !== 'exploring') return 'finish';
    if (run.pendingCheckpoint) return 'checkpoint';
    if (run.pendingMerchant) return 'merchant';
    if (run.pendingChoice) return 'choice';
    if (run.currentRoom >= run.rooms.length) return 'finish';
    return 'room';
  }

  /**
   * Return unused provisions to stock. Gifted provisions are not returned.
   */
  returnProvisions(state: GameState, run: ExpeditionRun): void {
    this.provisionSystem.returnProvisions(state, run.provisions.filter(p => !p.gifted));
  }

  /**
   * Abort an expedition that can no longer be continued (e.g. after reloading the page).
   * Returns provisions and war machine, releases the fighters. Loot is lost.
   */
  abortExpedition(state: GameState): boolean {
    const run = state.activeExpedition;
    if (!run) return false;

    this.returnProvisions(state, run);
    if (run.warMachineItemId) {
      state.globalStock[run.warMachineItemId] = (state.globalStock[run.warMachineItemId] ?? 0) + 1;
    }
    state.activeExpedition = null;
    return true;
  }

  // ─── Tränke mit Wirkung (docs/GILDENSTADT.md) ─────────────────

  /**
   * Vorrat vor einem Kampf nutzen. Jede Wirkung gilt für alle lebenden Helden, nie für die Kriegsmaschine.
   * Brot und Heiltrank heilen sofort, Manatrank macht alle Fähigkeiten wieder bereit, Gegengift nimmt das
   * Gift weg und heilt 5. Kraft-Brot und Schnelligkeitstrank geben einen flachen Bonus für die nächsten
   * Räume (dieser Raum zählt mit), Krafttrank und Titan-Gebräu bis zum Ende des Dungeons.
   * Ein Trank, der schon bis zum Ende wirkt, wird nicht noch einmal getrunken: der Vorrat bleibt. Ein
   * Trank mit Raum-Dauer darf nachgetrunken werden, dann läuft die Dauer neu; stapeln tut er nie.
   */
  useProvision(state: GameState, index: number): void {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') return;
    const slot = run.provisions[index];
    if (!slot || slot.qty <= 0) return;
    const itemDef = ITEM_DEFS[slot.itemId];
    const name = itemDef?.name ?? slot.itemId;

    const bestehend = run.trankWirkungen?.find(w => w.itemId === slot.itemId);
    if (bestehend && bestehend.bisRaum === undefined) {
      run.combatLog.push(`>> ${name} wirkt schon bis zum Ende des Dungeons – der Vorrat bleibt.`);
      return;
    }

    const used = this.provisionSystem.useProvision(run.provisions, index);
    if (!used) return;
    const tags = itemDef?.tags ?? [];
    const trinker = run.party.filter(u => u.hp > 0 && !u.isWarMachine);

    if (tags.includes('air_restore') && run.airShield !== undefined) {
      // Luft (Notluft, Luftkristall) auf Unterwasser-Routen
      const airRestore = 40;
      run.airShield = Math.min(run.airShieldMax ?? 100, run.airShield + airRestore);
      run.combatLog.push(`💨 ${name}! Luftschild +${airRestore} Luft.`);
    } else if (itemDef?.buffEffect) {
      this.trankTrinken(run, slot.itemId, itemDef.buffEffect, bestehend, trinker);
    } else if (tags.includes('cooldown_reset')) {
      for (const unit of trinker) {
        for (const skill of unit.skills) skill.currentCooldown = 0;
        delete run.abilitiesUsed[unit.id];
      }
      run.combatLog.push(`>> ${name}: Alle Fähigkeiten sind wieder bereit.`);
    } else if (tags.includes('cleanse')) {
      const heal = 5;
      for (const unit of trinker) {
        unit.gift = undefined;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      }
      run.combatLog.push(`>> ${name}: Das Gift ist weg, die Gruppe heilt ${heal} Leben.`);
    } else if (itemDef?.healAmount) {
      const heal = itemDef.healAmount;
      for (const unit of trinker) unit.hp = Math.min(unit.maxHp, unit.hp + heal);
      run.combatLog.push(`>> ${name}: Die Gruppe heilt ${heal} Leben.`);
    } else {
      run.combatLog.push(`>> ${name} eingesetzt!`);
    }

    // Leere Vorratsplätze weg
    run.provisions = run.provisions.filter(p => p.qty > 0);
  }

  /**
   * Trank oder Kraft-Brot mit Dauer: Bonus auf Angriff, Tempo oder maximale Leben für alle Trinker, die
   * ihn noch nicht haben, und die Dauer neu setzen. Reicht die Dauer ohnehin bis zum letzten Raum (in
   * items.ts steht dafür 99), gilt der Trank bis zum Ende des Dungeons und wird nicht nachgetrunken.
   */
  private trankTrinken(
    run: ExpeditionRun,
    itemId: string,
    buff: { stat: string; value: number; durationRooms: number },
    bestehend: TrankWirkung | undefined,
    trinker: CombatUnit[],
  ): void {
    const stat: TrankWirkung['stat'] = buff.stat === 'hp' ? 'maxHp' : buff.stat === 'spd' ? 'spd' : 'atk';
    const bisZumEnde = run.currentRoom + buff.durationRooms >= run.rooms.length;
    const wirkung: TrankWirkung = bestehend ?? { itemId, stat, wert: buff.value, helden: [] };
    if (!bestehend) (run.trankWirkungen ??= []).push(wirkung);
    wirkung.bisRaum = bisZumEnde ? undefined : run.currentRoom + buff.durationRooms;
    for (const unit of trinker) {
      if (wirkung.helden.includes(unit.id)) continue; // hat ihn schon: stapelt nicht
      wirkung.helden.push(unit.id);
      this.trankBonus(unit, wirkung, 1);
    }
    const name = ITEM_DEFS[itemId]?.name ?? itemId;
    const dauer = bisZumEnde
      ? 'bis zum Ende des Dungeons'
      : buff.durationRooms === 1 ? 'für diesen Raum' : `für die nächsten ${buff.durationRooms} Räume`;
    run.combatLog.push(`>> ${name}: ${trankWertText(wirkung)} ${dauer}.`);
  }

  /** Gibt (richtung 1) oder nimmt (richtung -1) einem Helden den Bonus einer Trank-Wirkung */
  private trankBonus(unit: CombatUnit, wirkung: TrankWirkung, richtung: 1 | -1): void {
    if (wirkung.stat === 'maxHp') {
      unit.maxHp += wirkung.wert * richtung;
      unit.hp = richtung > 0 ? unit.hp + wirkung.wert : Math.min(unit.hp, unit.maxHp);
      return;
    }
    const alt = unit.effektBoni?.[`trank:${wirkung.stat}`] ?? 0;
    setzeBonus(unit, 'trank', wirkung.stat, Math.round((alt + wirkung.wert * richtung) * 100) / 100);
  }

  /** Beim Betreten eines Raums: Wirkungen, deren Dauer um ist, zurücknehmen («Kraft-Brot ist verdaut.») */
  private traenkeVerdauen(run: ExpeditionRun): void {
    if (!run.trankWirkungen?.length) return;
    const bleiben: TrankWirkung[] = [];
    for (const wirkung of run.trankWirkungen) {
      if (wirkung.bisRaum === undefined || run.currentRoom < wirkung.bisRaum) {
        bleiben.push(wirkung);
        continue;
      }
      for (const unit of run.party) {
        if (wirkung.helden.includes(unit.id)) this.trankBonus(unit, wirkung, -1);
      }
      const def = ITEM_DEFS[wirkung.itemId];
      run.combatLog.push(`>> ${def?.name ?? wirkung.itemId} ist ${def?.tags.includes('food') ? 'verdaut' : 'verflogen'}.`);
    }
    run.trankWirkungen = bleiben;
  }

  // ─── Pre-Combat Ability Use ────────────────────────────────────

  /**
   * Use a hero's class ability in the pre-combat preview phase.
   * Each hero can use their ability only once per expedition.
   * Returns a human-readable result string (shown in the UI).
   */
  useAbilityInPreview(run: ExpeditionRun, unitId: number, skillId: string, room: EncounterRoom): string {
    if (run.abilitiesUsed[unitId]) return 'Bereits eingesetzt!';

    const unit = run.party.find(u => u.id === unitId);
    if (!unit || unit.hp <= 0) return 'Held nicht verfügbar.';

    const skill = unit.skills.find(s => s.id === skillId);
    if (!skill) return 'Fähigkeit nicht gefunden.';

    const aliveParty = run.party.filter(u => u.hp > 0);
    let result = '';

    switch (skill.effectType) {
      case 'heal': {
        const lowest = aliveParty.reduce((a, b) => a.hp < b.hp ? a : b);
        const healAmt = Math.floor(skill.power);
        lowest.hp = Math.min(lowest.maxHp, lowest.hp + healAmt);
        result = `${unit.name} wirkt ${skill.name} → ${lowest.name} heilt ${healAmt} HP!`;
        break;
      }
      case 'buff':
      case 'summon': {
        const rounds = skill.effectType === 'summon' ? 4 : 3;
        unit.atk += skill.power;
        unit.buffs.push({ stat: 'atk', value: skill.power, remainingRounds: rounds });
        result = `${unit.name} wirkt ${skill.name} → +${skill.power} ATK für ${rounds} Runden!`;
        break;
      }
      case 'taunt': {
        // Spott: redirect all enemy attacks to the caster this combat
        run.guardianTauntActive = true;
        run.tauntUnitId = unit.id;
        result = `${unit.name} wirkt ${skill.name} → Alle Angriffe zielen auf ${unit.name}!`;
        break;
      }
      case 'damage': {
        if (skill.target === 'all_enemies') {
          // z.B. Pfeilhagel: trifft jeden lebenden Gegner
          const aliveEnemies = room.enemies.filter(e => e.hp > 0);
          for (const e of aliveEnemies) {
            e.hp -= Math.max(1, Math.floor(Math.max(1, unit.atk - e.def) * skill.power));
          }
          result = aliveEnemies.length > 0
            ? `${unit.name} wirkt ${skill.name} → Alle Gegner erleiden Schaden!`
            : `${unit.name} wirkt ${skill.name} → Kein Ziel verfügbar.`;
          break;
        }
        const enemy = room.enemies.find(e => e.hp > 0);
        if (enemy) {
          const dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - enemy.def) * skill.power));
          enemy.hp -= dmg;
          result = `${unit.name} wirkt ${skill.name} → ${enemy.name} erleidet ${dmg} Schaden!`;
        } else {
          result = `${unit.name} wirkt ${skill.name} → Kein Ziel verfügbar.`;
        }
        break;
      }
      case 'aoe': {
        const aliveEnemies = room.enemies.filter(e => e.hp > 0);
        for (const e of aliveEnemies) {
          const dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - e.def) * skill.power));
          e.hp -= dmg;
        }
        result = `${unit.name} wirkt ${skill.name} → Alle Gegner erleiden Schaden!`;
        break;
      }
      default:
        result = `${unit.name} wirkt ${skill.name}.`;
    }

    run.abilitiesUsed[unitId] = true;
    run.combatLog.push(`[Vorbereitung] ${result}`);
    return result;
  }

  /**
   * Setzt ein Fokusziel für DPS-Einheiten für 2 Runden.
   */
  setFocusTarget(run: ExpeditionRun, enemyId: number): boolean {
    if (run.focusTargetCooldown > 0) return false;
    const enemy = run.rooms[run.currentRoom]?.enemies.find(e => e.id === enemyId && e.hp > 0);
    if (!enemy) return false;
    run.focusTarget = { enemyId, roundsLeft: 2 };
    run.focusTargetCooldown = 4;
    run.combatLog.push(`>> Fokusziel: ${enemy.name}!`);
    return true;
  }

  /**
   * Berechnet den finalen Score am Ende eines Expeditions-Runs.
   * Formel: (enemies×100 + bosses×500 + hpPct×10 + provisions×50 - rounds×5) × modMult × diffMult
   */
  calculateScore(run: ExpeditionRun): number {
    const diffDef = DIFFICULTY_DEFS[run.difficulty] ?? DIFFICULTY_DEFS.normal;
    const modDef = run.activeModifier ? MODIFIER_DEFS[run.activeModifier] : null;

    const aliveParty = run.party.filter(u => u.hp > 0);
    const hpPct = aliveParty.length > 0
      ? Math.floor(aliveParty.reduce((s, u) => s + u.hp / u.maxHp, 0) / run.party.length * 100)
      : 0;
    const provisionsLeft = run.provisions.reduce((s, p) => s + p.qty, 0);

    const raw =
      run.enemiesKilled * 100 +
      run.bossesKilled * 500 +
      hpPct * 10 +
      provisionsLeft * 50 -
      run.totalCombatRounds * 5;

    const score = Math.max(0, Math.floor(raw * (modDef?.scoreMult ?? 1.0) * diffDef.scoreMult));
    run.score = score;
    return score;
  }
}
