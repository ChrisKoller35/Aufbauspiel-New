import { GameState } from '../models/GameState';
import { ExpeditionRun, CombatUnit, EncounterRoom, EncounterChoice } from '../models/ExpeditionRun';
import { GuildFighter } from '../models/GuildRoster';
import { ROUTE_DEFS } from '../data/routes';
import { ITEM_DEFS } from '../data/items';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { SeededRNG } from '../utils/RNG';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { MODIFIER_DEFS } from '../data/modifiers';
import { CombatEngine } from './CombatEngine';
import { EncounterProcessor } from './EncounterProcessor';
import {
  TREPPE_ROUTE_ID, RAST_HEILUNG, RAST_AUFSTEHEN,
  istBossEtage, istRastEtage, stockwerkGegner, stockwerkGold, bossBeute,
} from '../data/treppe';
import { treppeStand, treppenStarts, treppenEtage, etageGeschafft, alsTreppenGegner } from './Treppe';

/** Wie ein Lauf auf der endlosen Treppe endete und was er gebracht hat. */
export interface TreppenErgebnis {
  start: number;
  /** Stockwerke, die dieser Lauf geschafft hat. */
  stockwerke: number;
  /** Höchstes geschaffte Stockwerk dieses Laufs (start − 1, wenn keins). */
  hoechstes: number;
  besteVorher: number;
  neueBestmarke: boolean;
  ende: 'heimgekehrt' | 'niederlage' | 'flucht' | 'patt';
  /** Beute seit dem letzten Rastplatz, die verloren ging. */
  verlorenGold: number;
  verlorenTeile: number;
}

/** Händler-Sortiment (Feature #16): Preis in Beutegold des laufenden Runs */
export const MERCHANT_PRICES: Record<string, number> = {
  healing_potion: 15,
  bread: 8,
  power_bread: 25,
};

/** Max. Käufe pro Händler */
export const MERCHANT_MAX_PURCHASES = 2;

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
   * The endless stairs has its own start: startTreppe().
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
    if (ROUTE_DEFS[routeId]?.isEndless) return null;
    return this.beginRun(state, routeId, fighterIds, difficulty, modifierId, isGrandmasterTrial, requestedConsumables);
  }

  /**
   * Startet einen Lauf auf der endlosen Treppe: ganz unten oder über einem
   * schon geschafften Boss-Stockwerk (treppenStarts). Stockwerke kommen
   * während des Laufs dazu, eines nach dem anderen.
   */
  startTreppe(
    state: GameState,
    fighterIds: number[],
    startEtage: number,
    requestedConsumables?: string[],
  ): ExpeditionRun | null {
    const stand = treppeStand(state);
    if (!stand || !treppenStarts(state).includes(startEtage)) return null;
    const run = this.beginRun(state, TREPPE_ROUTE_ID, fighterIds, 'normal', null, false, requestedConsumables);
    if (!run) return null;
    stand.laeufe++;
    run.treppe = {
      startEtage,
      besteVorher: stand.besteEtage,
      geschafft: startEtage - 1,
      sicher: { loot: {}, gold: 0 },
    };
    run.rooms.push(this.treppenRaum(startEtage, 0));
    return run;
  }

  private treppenRaum(etage: number, index: number): EncounterRoom {
    return {
      index,
      type: istBossEtage(etage) ? 'boss' : 'combat',
      enemies: stockwerkGegner(etage).map((id, platz) =>
        alsTreppenGegner(this.combatEngine.enemyToCombatUnit(id), etage, platz)),
      healPercent: 0,
      hazardDamage: 0,
      completed: false,
    };
  }

  private beginRun(
    state: GameState,
    routeId: string,
    fighterIds: number[],
    difficulty: string,
    modifierId: string | null,
    isGrandmasterTrial: boolean,
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

    // Mark citizens as on expedition
    for (const fighter of fighters) {
      const citizen = state.citizens.find(c => c.fighterId === fighter.id);
      if (citizen) citizen.status = 'ON_EXPEDITION';
    }

    // Build party combat units
    const party: CombatUnit[] = fighters.map(f => this.combatEngine.fighterToCombatUnit(f));

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
    // Guaranteed safety net (gifted: consumed or lost, never returned to stock)
    provisions.push({ itemId: 'healing_potion', qty: 1, gifted: true });
    provisions.push({ itemId: 'bread', qty: 1, gifted: true });
    provisions.push({ itemId: 'power_bread', qty: 1, gifted: true });

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
          run.combatLog.push('>> Checkpoint erreicht!');
        } else {
          run.combatLog.push('>> Todesmarsch: Checkpoint ignoriert!');
        }
        break;
      case 'find':
        this.encounterProcessor.processFind(run, room, rng);
        break;
      case 'merchant':
        this.encounterProcessor.processMerchant(run, room);
        break;
      case 'survivor':
        this.encounterProcessor.processSurvivor(run, room, rng);
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

    // Treppe: Wer bis zur Rundengrenze nicht gewonnen hat, muss umkehren
    if (run.treppe) {
      if (room.enemies.some(e => e.hp > 0)) {
        run.treppe.patt = true;
        run.status = 'retreat';
        run.combatLog.push('>> Die Gegner halten stand: Die Gruppe muss umkehren.');
        return false;
      }
      this.stockwerkGeschafft(state, run, room);
    }

    // Auto-retreat check: if team HP < 20%
    const totalHp = run.party.reduce((s, u) => s + u.hp, 0);
    const totalMaxHp = run.party.reduce((s, u) => s + u.maxHp, 0);
    if (totalHp / totalMaxHp < 0.2 && !run.desperateResolveUsed) {
      run.combatLog.push('>> Team HP kritisch! Auto-Rückzug verfügbar.');
    }

    this.raumGeschafft(run, room);
    return run.status === 'exploring' && !run.pendingCheckpoint;
  }

  /**
   * Nach einem geschafften Raum: Kontrollpunkt verlangen (Feature #15: nach
   * jedem 3. Raum, ausser bei Todesmarsch; Treppe: Rastplatz nach jedem
   * 5. Stockwerk) oder in den nächsten Raum gehen.
   */
  private raumGeschafft(run: ExpeditionRun, room: EncounterRoom): void {
    if (run.treppe) {
      if (istRastEtage(treppenEtage(run, room.index))) {
        this.rasten(run);
        run.pendingCheckpoint = true;
        return;
      }
    } else if (room.index % 3 === 2 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return;
    }
    this.naechsterRaum(run);
  }

  /** In den nächsten Raum; auf der Treppe wird das nächste Stockwerk angelegt. */
  private naechsterRaum(run: ExpeditionRun): void {
    run.currentRoom++;
    if (run.treppe && run.currentRoom >= run.rooms.length) {
      run.rooms.push(this.treppenRaum(treppenEtage(run), run.currentRoom));
    }
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
    }
  }

  /** Stockwerk geschafft: Bestmarke, Gold des Stockwerks, Boss-Beute. */
  private stockwerkGeschafft(state: GameState, run: ExpeditionRun, room: EncounterRoom): void {
    const treppe = run.treppe!;
    const etage = treppenEtage(run, room.index);
    treppe.geschafft = Math.max(treppe.geschafft, etage);
    const neu = etageGeschafft(state, etage);
    const gold = stockwerkGold(etage);
    run.goldEarned += gold;
    for (const [itemId, qty] of Object.entries(bossBeute(etage))) {
      run.loot[itemId] = (run.loot[itemId] ?? 0) + qty;
    }
    run.combatLog.push(`>> Stockwerk ${etage} geschafft! +${gold} Gold${neu ? ' · Neue Bestmarke!' : ''}`);
  }

  /**
   * Rastplatz: heilt, holt Gefallene zurück, Fähigkeiten sind wieder frei,
   * und die Beute bis hier ist sicher.
   */
  private rasten(run: ExpeditionRun): void {
    for (const unit of run.party) {
      unit.hp = unit.hp <= 0
        ? Math.max(1, Math.floor(unit.maxHp * RAST_AUFSTEHEN))
        : Math.min(unit.maxHp, unit.hp + Math.floor(unit.maxHp * RAST_HEILUNG));
    }
    run.abilitiesUsed = {};
    run.treppe!.sicher = { loot: { ...run.loot }, gold: run.goldEarned };
    run.combatLog.push('>> Rastplatz: Wunden versorgt, die Beute ist sicher.');
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
          run.loot[choice.itemId] = (run.loot[choice.itemId] ?? 0) + choice.value;
          const itemName = ITEM_DEFS[choice.itemId]?.name ?? choice.itemId;
          run.combatLog.push(`>> ${choice.label}: +${choice.value}× ${itemName} erhalten.`);
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
    }
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
      // Treppe: Heimkehr vom Rastplatz, die ganze Beute bleibt
      if (run.treppe) run.treppe.heimgekehrt = true;
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
   * Retreat from expedition (keep loot gained so far; on the stairs only
   * what was safe at the last rest stop, see treppeAbschliessen).
   * A finished run keeps its result: the combat screen's retreat button
   * stays clickable while an already decided fight is still playing.
   */
  retreat(run: ExpeditionRun): void {
    if (run.status === 'exploring') run.status = 'retreat';
  }

  /**
   * Ende eines Treppen-Laufs, vor dem Verbuchen aufrufen: Es bleibt nur die
   * Beute vom letzten Rastplatz (wer dort heimkehrt, hat nichts danach).
   * Gibt null zurück, wenn der Lauf nicht auf der Treppe war.
   */
  treppeAbschliessen(run: ExpeditionRun): TreppenErgebnis | null {
    const treppe = run.treppe;
    if (!treppe) return null;
    const verlorenGold = Math.max(0, run.goldEarned - treppe.sicher.gold);
    const verlorenTeile = Object.entries(run.loot)
      .reduce((sum, [itemId, qty]) => sum + Math.max(0, qty - (treppe.sicher.loot[itemId] ?? 0)), 0);
    run.loot = { ...treppe.sicher.loot };
    run.goldEarned = treppe.sicher.gold;
    return {
      start: treppe.startEtage,
      stockwerke: Math.max(0, treppe.geschafft - treppe.startEtage + 1),
      hoechstes: treppe.geschafft,
      besteVorher: treppe.besteVorher,
      neueBestmarke: treppe.geschafft > treppe.besteVorher,
      ende: treppe.heimgekehrt ? 'heimgekehrt'
        : treppe.patt ? 'patt'
        : run.status === 'defeat' ? 'niederlage' : 'flucht',
      verlorenGold,
      verlorenTeile,
    };
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
   * Returns provisions and war machine, releases the fighters. Loot is lost,
   * except on the stairs: what was safe at the last rest stop stays.
   */
  abortExpedition(state: GameState): boolean {
    const run = state.activeExpedition;
    if (!run) return false;

    if (run.treppe) {
      for (const [itemId, qty] of Object.entries(run.treppe.sicher.loot)) {
        state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
      }
      state.globalStock.gold = (state.globalStock.gold ?? 0) + run.treppe.sicher.gold;
    }
    this.returnProvisions(state, run);
    if (run.warMachineItemId) {
      state.globalStock[run.warMachineItemId] = (state.globalStock[run.warMachineItemId] ?? 0) + 1;
    }
    for (const unit of run.party) {
      const citizen = state.citizens.find(c => c.fighterId === unit.id);
      if (citizen && citizen.status === 'ON_EXPEDITION') citizen.status = 'IDLE';
    }

    state.activeExpedition = null;
    return true;
  }

  /**
   * Use a provision item during expedition. Applies healing effect and decrements qty.
   */
  useProvision(state: GameState, index: number): void {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') return;
    const used = this.provisionSystem.useProvision(run.provisions, index);
    if (!used) return;

    // Apply effect based on item
    const itemDef = ITEM_DEFS[used.itemId];
    const itemTags: string[] = Array.isArray((itemDef as any)?.tags) ? (itemDef as any).tags : [];

    // Air restoration (emergency_air, air_crystal)
    if (itemTags.includes('air_restore') && run.airShield !== undefined) {
      const airRestore = 40;
      run.airShield = Math.min(run.airShieldMax ?? 100, run.airShield + airRestore);
      run.combatLog.push(`💨 ${itemDef?.name ?? used.itemId}! Luftschild +${airRestore} Luft.`);
    } else if (itemDef && 'healAmount' in itemDef) {
      const heal = (itemDef as { healAmount: number }).healAmount;
      for (const unit of run.party) {
        if (unit.hp > 0) {
          unit.hp = Math.min(unit.maxHp, unit.hp + heal);
        }
      }
      run.combatLog.push(`>> ${itemDef.name} eingesetzt! Party heilt ${heal} HP.`);
    } else {
      run.combatLog.push(`>> ${itemDef?.name ?? used.itemId} eingesetzt!`);
    }

    // Remove empty provision slots
    run.provisions = run.provisions.filter(p => p.qty > 0);
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
        // Guardian's Spott: redirect all enemy attacks to Guardian this combat
        run.guardianTauntActive = true;
        result = `${unit.name} wirkt ${skill.name} → Alle Angriffe zielen auf den Guardian!`;
        break;
      }
      case 'damage': {
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
