import { GameState } from '../models/GameState';
import { ExpeditionRun, CombatUnit, EncounterRoom, EncounterChoice } from '../models/ExpeditionRun';
import { GuildFighter, FighterStats } from '../models/GuildRoster';
import { ENEMY_DEFS } from '../data/enemies';
import { ROUTE_DEFS } from '../data/routes';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { ITEM_DEFS } from '../data/items';
import { CLASS_DEFS } from '../data/classes';
import { GearSystem } from './GearSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { awardXP } from './HeroProgression';
import { SeededRNG } from '../utils/RNG';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { MODIFIER_DEFS } from '../data/modifiers';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';
import { pickRandomSpecialist } from '../data/specialists';

/**
 * Full expedition engine: encounter processing, auto-battler combat, loot.
 */
export class ExpeditionSystem {
  private gearSystem: GearSystem;
  private provisionSystem: ProvisionSystem;

  constructor(gearSystem: GearSystem, provisionSystem: ProvisionSystem) {
    this.gearSystem = gearSystem;
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
    const party: CombatUnit[] = fighters.map(f => this.fighterToCombatUnit(f));

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
        enemies: enemyIds.map(eid => this.enemyToCombatUnit(eid, difficulty)),
        healPercent: enc.healPercent ?? 0,
        hazardDamage: enc.damage ?? 0,
        completed: false,
        findGold: enc.findGold ?? 0,
        findItems: enc.findItems ?? [],
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

    // Load provisions
    const provisions = this.provisionSystem.loadProvisions(state, 4, []);

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
    };

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
        this.processCombat(run, room, rng);
        break;
      case 'rest':
        this.processRest(run, room, rng);
        break;
      case 'hazard':
        this.processHazard(run, room);
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
        this.processFind(run, room, rng);
        break;
      case 'merchant':
        this.processMerchant(run, room);
        break;
      case 'survivor':
        this.processSurvivor(run, room, rng);
        break;
    }

    run.rngSeed = rng.nextInt(1, 2147483647);

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

    // Auto-retreat check: if team HP < 20%
    const totalHp = run.party.reduce((s, u) => s + u.hp, 0);
    const totalMaxHp = run.party.reduce((s, u) => s + u.maxHp, 0);
    if (totalHp / totalMaxHp < 0.2 && !run.desperateResolveUsed) {
      run.combatLog.push('>> Team HP kritisch! Auto-Rückzug verfügbar.');
    }

    // Feature #15: Nach jedem 3. Raum Checkpoint-Dialog setzen (außer bei Todesmarsch)
    if (room.index % 3 === 2 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return false;
    }

    // Advance to next room
    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
      return false;
    }

    return true;
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

    // Feature #15: Checkpoint nach 3. Raum prüfen
    if (room.index % 3 === 2 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return true;
    }

    // Nächsten Raum betreten
    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
    }

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
      this.retreat(run);
      return;
    }

    // Weiter zur nächsten Kammer
    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
    }
  }

  // ─── Feature #16: Händler-Encounter ─────────────────────────────

  /**
   * Kauft einen Gegenstand beim Händler.
   * Verfügbar: healing_potion (15 Gold), bread (8 Gold), power_bread (25 Gold)
   */
  merchantBuy(run: ExpeditionRun, itemId: string): boolean {
    if (!run.pendingMerchant) return false;
    if ((run.merchantPurchases ?? 0) >= 2) {
      run.combatLog.push('>> Händler: Du kannst maximal 2 Gegenstände kaufen.');
      return false;
    }

    const MERCHANT_PRICES: Record<string, number> = {
      healing_potion: 15,
      bread: 8,
      power_bread: 25,
    };

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

    // Feature #15: Checkpoint nach 3. Raum
    if (room.index % 3 === 2 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return;
    }

    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
    }
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

    // Feature #15: Checkpoint nach 3. Raum
    if (room.index % 3 === 2 && run.activeModifier !== 'death_march') {
      run.pendingCheckpoint = true;
      return;
    }

    run.currentRoom++;
    if (run.currentRoom >= run.rooms.length) {
      run.status = 'victory';
    }
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
   */
  retreat(run: ExpeditionRun): void {
    run.status = 'retreat';
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
    if (itemDef && 'healAmount' in itemDef) {
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

  // ─── Combat ─────────────────────────────────────────────────────

  private processCombat(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    const enemies = room.enemies;
    const party = run.party.filter(u => u.hp > 0);

    run.combatLog.push(`── Room ${room.index + 1}: ${room.type === 'boss' ? 'BOSS' : 'Combat'} ──`);

    let round = 0;
    // speed_march: maximal 10 Runden; Standard: 20 Runden
    const maxRounds = run.activeModifier === 'speed_march' ? 10 : 20;

    while (round < maxRounds) {
      round++;
      const aliveParty = party.filter(u => u.hp > 0);
      const aliveEnemies = enemies.filter(u => u.hp > 0);

      if (aliveParty.length === 0 || aliveEnemies.length === 0) break;

      // Build turn order by SPD (descending)
      const allUnits = [...aliveParty, ...aliveEnemies];
      allUnits.sort((a, b) => b.spd - a.spd);

      // Boss enrage: per-enemy config via defId, fallback to round 8 / 1.5× ATK / 1.3× SPD
      if (room.type === 'boss') {
        for (const e of aliveEnemies) {
          const enemyDef = e.defId ? ENEMY_DEFS[e.defId] : undefined;
          const enrage = enemyDef?.enrage ?? { afterRound: 8, atkMult: 1.5, spdMult: 1.3 };
          if (round === enrage.afterRound) {
            e.atk = Math.floor(e.atk * enrage.atkMult);
            e.spd *= enrage.spdMult;
            run.combatLog.push(`!! ${e.name} ENRAGE !!`);
          }
        }
      }

      for (const unit of allUnits) {
        if (unit.hp <= 0) continue;

        const isPlayer = party.includes(unit);
        const targets = isPlayer
          ? enemies.filter(u => u.hp > 0)
          : party.filter(u => u.hp > 0);

        if (targets.length === 0) break;

        // Check skills
        let usedSkill = false;
        for (const skill of unit.skills) {
          if (skill.currentCooldown > 0) {
            skill.currentCooldown--;
            continue;
          }

          if (skill.effectType === 'heal' && !isPlayer) {
            // Enemy healer: heal lowest HP ally
            const allies = enemies.filter(u => u.hp > 0);
            const lowest = allies.reduce((a, b) => a.hp < b.hp ? a : b);
            let healAmt = skill.power;
            // anti_heal debuff reduces healing by 50%
            if (lowest.antiHealDebuff) healAmt = Math.floor(healAmt * 0.5);
            lowest.hp = Math.min(lowest.maxHp, lowest.hp + healAmt);
            run.combatLog.push(`${unit.name} uses ${skill.name} → heals ${lowest.name} for ${healAmt}`);
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'heal' && isPlayer) {
            // Feature #18: Grandmaster Trial – keine Heilungs-Skills während Boss-Kämpfen
            if (run.isGrandmasterTrial && room.type === 'boss') {
              run.combatLog.push(`${unit.name}: GROSSMEISTER-PRÜFUNG! Heilung blockiert!`);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true;
              break;
            }
            const allies = party.filter(u => u.hp > 0);
            const lowest = allies.reduce((a, b) => a.hp < b.hp ? a : b);
            // F5: anti_heal debuff reduces player healing by 50%
            let healAmt = skill.power;
            if (lowest.antiHealDebuff) healAmt = Math.floor(healAmt * 0.5);
            lowest.hp = Math.min(lowest.maxHp, lowest.hp + healAmt);
            run.combatLog.push(`${unit.name} uses ${skill.name} → heals ${lowest.name} for ${healAmt}`);
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'damage') {
            // spell_power: +25% skill damage
            const spellMult = this.hasEffect(unit, 'spell_power') ? 1.25 : 1.0;
            if (skill.target === 'all_enemies' || skill.target === 'all_players') {
              for (const t of targets) {
                let dmg = Math.max(1, Math.floor(unit.atk * skill.power * spellMult) - t.def);
                // aoe_resist: target takes 30% less AoE damage
                if (this.hasEffect(t, 'aoe_resist')) dmg = Math.max(1, Math.floor(dmg * 0.7));
                t.hp -= dmg;
                run.combatLog.push(`${unit.name} uses ${skill.name} → ${t.name} takes ${dmg}`);
              }
            } else {
              const target = this.selectTarget(targets, rng);
              const dmg = Math.max(1, Math.floor(unit.atk * skill.power * spellMult) - target.def);
              target.hp -= dmg;
              run.combatLog.push(`${unit.name} uses ${skill.name} → ${target.name} takes ${dmg}`);
              // lifesteal on skill damage
              this.applyOnDealDamage(unit, target, dmg, rng, run);
            }
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'taunt') {
            unit.tauntRounds = skill.power;
            run.combatLog.push(`${unit.name} uses ${skill.name} → Taunt for ${skill.power} rounds`);
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'aoe') {
            // spell_power: +25% AoE skill damage
            const spellMult = this.hasEffect(unit, 'spell_power') ? 1.25 : 1.0;
            for (const t of targets) {
              let dmg = Math.max(1, Math.floor(unit.atk * skill.power * spellMult) - t.def);
              // aoe_resist: target takes 30% less AoE damage
              if (this.hasEffect(t, 'aoe_resist')) {
                dmg = Math.max(1, Math.floor(dmg * 0.7));
                run.combatLog.push(`  ${t.name}: AoE-Resistenz! (-30%)`);
              }
              t.hp -= dmg;
              run.combatLog.push(`${unit.name} uses ${skill.name} → ${t.name} takes ${dmg}`);
              // F4: lifesteal + anti_heal on AoE damage
              this.applyOnDealDamage(unit, t, dmg, rng, run);
            }
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'summon') {
            unit.atk += skill.power;
            unit.buffs.push({ stat: 'atk', value: skill.power, remainingRounds: 4 });
            run.combatLog.push(
              `${unit.name} setzt ${skill.name} ein → Verstärkung beschworen! (+${skill.power} ATK für 4 Runden)`,
            );
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }

          if (skill.effectType === 'buff') {
            unit.atk += skill.power;
            unit.buffs.push({ stat: 'atk', value: skill.power, remainingRounds: 3 });
            run.combatLog.push(`${unit.name} setzt ${skill.name} ein → +${skill.power} ATK für 3 Runden`);
            skill.currentCooldown = skill.cooldown;
            usedSkill = true;
            break;
          }
        }

        // Basic attack if no skill used
        if (!usedSkill) {
          let target: CombatUnit;
          const isDps = !unit.skills.some(s => s.effectType === 'heal' || s.effectType === 'taunt' || s.effectType === 'buff');
          if (isPlayer && isDps && run.focusTarget) {
            const focused = targets.find(t => t.id === run.focusTarget!.enemyId && t.hp > 0);
            target = focused ?? this.selectTarget(targets, rng);
          } else {
            target = this.selectTarget(targets, rng);
          }

          // dodge: target has 15% chance to evade
          if (this.hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
            run.combatLog.push(`${unit.name} attacks ${target.name} → AUSGEWICHEN!`);
          } else {
            const isCrit = rng.chance(unit.critChance);
            let dmg = Math.max(1, unit.atk - target.def);
            if (isCrit) dmg = Math.floor(dmg * unit.critMult);

            // reflect: target reflects 20% damage back
            if (this.hasEffect(target, 'reflect')) {
              const reflectDmg = Math.max(1, Math.floor(dmg * SPECIAL_EFFECT_DEFS.reflect.power));
              unit.hp -= reflectDmg;
              run.combatLog.push(`  ${target.name}: Reflexion! ${reflectDmg} Schaden zurück!`);
              // F1: revive check if reflect killed attacker
              if (unit.hp <= 0) this.checkRevive(unit, run);
            }

            target.hp -= dmg;
            run.combatLog.push(
              `${unit.name} attacks ${target.name} for ${dmg}${isCrit ? ' CRIT!' : ''}`,
            );

            // on_deal_damage effects (lifesteal, anti_heal)
            this.applyOnDealDamage(unit, target, dmg, rng, run);

            // double_strike: 30% chance for a second attack
            if (this.hasEffect(unit, 'double_strike') && rng.chance(SPECIAL_EFFECT_DEFS.double_strike.procChance)) {
              if (target.hp > 0 && unit.hp > 0) {
                // F3: dodge check for second hit
                if (this.hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
                  run.combatLog.push(`  ${unit.name}: DOPPELSCHLAG → AUSGEWICHEN!`);
                } else {
                  const dmg2 = Math.max(1, unit.atk - target.def);
                  // F2: reflect check for second hit
                  if (this.hasEffect(target, 'reflect')) {
                    const reflectDmg2 = Math.max(1, Math.floor(dmg2 * SPECIAL_EFFECT_DEFS.reflect.power));
                    unit.hp -= reflectDmg2;
                    run.combatLog.push(`  ${target.name}: Reflexion! ${reflectDmg2} Schaden zurück!`);
                    if (unit.hp <= 0) this.checkRevive(unit, run);
                  }
                  target.hp -= dmg2;
                  run.combatLog.push(`  ${unit.name}: DOPPELSCHLAG! ${dmg2} extra Schaden!`);
                  this.applyOnDealDamage(unit, target, dmg2, rng, run);
                }
              }
            }
          }

          // revive check for target that just died
          if (target.hp <= 0) {
            this.checkRevive(target, run);
          }
        }

        // Decay taunt
        if (unit.tauntRounds > 0) unit.tauntRounds--;
      }

      // ── End of round effects ──

      // Decay buffs
      for (const unit of [...party.filter(u => u.hp > 0), ...enemies.filter(u => u.hp > 0)]) {
        for (let i = unit.buffs.length - 1; i >= 0; i--) {
          const buff = unit.buffs[i];
          buff.remainingRounds--;
          if (buff.remainingRounds <= 0) {
            if (buff.stat === 'atk') unit.atk -= buff.value;
            if (buff.stat === 'def') unit.def -= buff.value;
            if (buff.stat === 'spd') unit.spd -= buff.value;
            unit.buffs.splice(i, 1);
          }
        }
      }

      // Regen: +3 HP per round for units with regen effect
      for (const unit of [...party.filter(u => u.hp > 0), ...enemies.filter(u => u.hp > 0)]) {
        if (this.hasEffect(unit, 'regen')) {
          const regenAmt = SPECIAL_EFFECT_DEFS.regen.power;
          const prevHp = unit.hp;
          unit.hp = Math.min(unit.maxHp, unit.hp + regenAmt);
          if (unit.hp > prevHp) {
            run.combatLog.push(`  ${unit.name}: Regeneration +${unit.hp - prevHp} HP`);
          }
        }
      }

      // Clear anti_heal debuffs (they last one round)
      for (const unit of [...party, ...enemies]) {
        unit.antiHealDebuff = false;
      }

      // Decay focus target
      if (run.focusTarget) {
        run.focusTarget.roundsLeft--;
        if (run.focusTarget.roundsLeft <= 0) {
          run.focusTarget = null;
        }
      }
      if (run.focusTargetCooldown > 0) {
        run.focusTargetCooldown--;
      }
    }

    // Award loot from defeated enemies
    for (const enemy of enemies) {
      if (enemy.hp <= 0 && enemy.lootTableId) {
        this.rollLoot(run, enemy.lootTableId, rng);
      }
    }

    // Award XP: use xpReward from enemy def, fallback to 5 XP. Split among living party.
    const killedEnemies = enemies.filter(e => e.hp <= 0);
    const totalXp = killedEnemies.reduce((sum, e) => {
      const reward = (e.defId ? ENEMY_DEFS[e.defId]?.xpReward : undefined) ?? 5;
      return sum + reward;
    }, 0);
    if (totalXp > 0) {
      const livingParty = party.filter(u => u.hp > 0);
      const xpEach = Math.max(1, Math.floor(totalXp / Math.max(1, livingParty.length)));
      // Store XP to award at end-of-run (unit IDs → accumulated XP)
      if (!run.xpEarned) run.xpEarned = {};
      for (const u of livingParty) {
        run.xpEarned[u.id] = (run.xpEarned[u.id] ?? 0) + xpEach;
      }
    }

    // Score-Statistiken tracken
    run.enemiesKilled += killedEnemies.length;
    if (room.type === 'boss') {
      const bossKills = killedEnemies.filter(
        e => e.defId != null && ENEMY_DEFS[e.defId]?.isBoss === true,
      ).length;
      run.bossesKilled += bossKills;

      // Nemesis-Modifier: Bonus-Loot-Tabelle bei Boss-Kill
      if (bossKills > 0 && run.activeModifier === 'nemesis') {
        this.rollLoot(run, 'loot_nemesis_legendary', rng);
        run.combatLog.push('>> NEMESIS-BEUTE! Legendärer Gegenstand gefunden!');
      }
    }
    run.totalCombatRounds += round;
  }

  // ─── Special-Effect Helpers ─────────────────────────────────────

  /** Check if a unit has a specific active special effect */
  private hasEffect(unit: CombatUnit, effectId: string): boolean {
    return unit.specialEffects?.some(e => e.id === effectId && e.usesLeft !== 0) ?? false;
  }

  /** Apply on_deal_damage effects: lifesteal, anti_heal */
  private applyOnDealDamage(
    attacker: CombatUnit, target: CombatUnit, dmg: number,
    _rng: SeededRNG, run: ExpeditionRun,
  ): void {
    // lifesteal: heal 25% of damage dealt
    if (this.hasEffect(attacker, 'lifesteal') && dmg > 0) {
      const healAmt = Math.max(1, Math.floor(dmg * SPECIAL_EFFECT_DEFS.lifesteal.power));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      run.combatLog.push(`  ${attacker.name}: Lebensraub +${healAmt} HP`);
    }
    // anti_heal: mark target so their healing is halved this round
    if (this.hasEffect(attacker, 'anti_heal')) {
      target.antiHealDebuff = true;
    }
  }

  /** Check for revive effect on a unit that just died */
  private checkRevive(unit: CombatUnit, run: ExpeditionRun): void {
    const reviveEffect = unit.specialEffects?.find(e => e.id === 'revive' && e.usesLeft > 0);
    if (reviveEffect) {
      reviveEffect.usesLeft--;
      const reviveHp = Math.max(1, Math.floor(unit.maxHp * SPECIAL_EFFECT_DEFS.revive.power));
      unit.hp = reviveHp;
      run.combatLog.push(`>> ${unit.name}: WIEDERGEBURT! Steht mit ${reviveHp} HP wieder auf!`);
    }
  }

  private selectTarget(targets: CombatUnit[], rng: SeededRNG): CombatUnit {
    // Priority: taunt > highest threat > lowest HP
    const taunters = targets.filter(t => t.tauntRounds > 0);
    if (taunters.length > 0) return rng.pick(taunters);

    const maxThreat = Math.max(...targets.map(t => t.threat));
    if (maxThreat > 0) {
      const highThreat = targets.filter(t => t.threat === maxThreat);
      return rng.pick(highThreat);
    }

    // Lowest HP
    return targets.reduce((a, b) => a.hp < b.hp ? a : b);
  }

  private rollLoot(run: ExpeditionRun, lootTableId: string, rng: SeededRNG): void {
    const table = LOOT_TABLE_DEFS[lootTableId];
    if (!table) return;

    // Guaranteed gold
    const gold = rng.nextInt(table.guaranteedGold.min, table.guaranteedGold.max);
    run.goldEarned += gold;

    // Roll one item
    if (table.entries.length > 0) {
      const weights = table.entries.map(e => e.weight);
      const idx = rng.weightedPick(weights);
      const entry = table.entries[idx];
      const qty = rng.nextInt(entry.minQty, entry.maxQty);
      run.loot[entry.itemId] = (run.loot[entry.itemId] ?? 0) + qty;
    }
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

  // ─── Rest & Hazard & Find & Merchant & Survivor ─────────────────────────────────────────────

  private processRest(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    // Feature #11: Begegnungs-Wahl für Rast-Räume generieren
    const optionA: EncounterChoice = {
      label: `Rasten (+${room.healPercent}% HP)`,
      flavorText: 'Das Team legt eine kurze Rast ein und erholt sich.',
      effect: 'heal',
      value: room.healPercent,
    };

    // Zweite Option variiert per RNG
    const roll = rng.nextInt(0, 2); // 0, 1 oder 2
    let optionB: EncounterChoice;
    if (roll === 0) {
      optionB = {
        label: 'Kräuter sammeln (+2 Grüne Kräuter)',
        flavorText: 'Ein aufmerksamer Blick entdeckt heilsame Kräuter am Wegesrand.',
        effect: 'item',
        value: 2,
        itemId: 'herb_green',
      };
    } else if (roll === 1) {
      optionB = {
        label: 'Meditieren (+5 XP)',
        flavorText: 'Stille Besinnung bringt neue Erkenntnisse.',
        effect: 'xp',
        value: 5,
      };
    } else {
      optionB = {
        label: 'Riskant heilen (60% Chance: +60% HP, sonst -30% HP)',
        flavorText: 'Ein unbekanntes Gebräu – könnte Wunder wirken oder schaden.',
        effect: 'risky_heal',
        value: 30,
      };
    }

    room.encounterChoices = { optionA, optionB };
    run.pendingChoice = { roomIndex: room.index, optionA, optionB };
    run.combatLog.push('>> Rastplatz gefunden! Wähle eine Aktion.');
  }

  private processHazard(run: ExpeditionRun, room: EncounterRoom): void {
    for (const unit of run.party) {
      if (unit.hp > 0) {
        let dmg = room.hazardDamage;
        // fire_resist: reduce hazard damage by 30% (Vulkan-Hazards)
        if (this.hasEffect(unit, 'fire_resist')) {
          dmg = Math.floor(dmg * (1 - SPECIAL_EFFECT_DEFS.fire_resist.power));
        }
        unit.hp -= dmg;
      }
    }
    const hasResist = run.party.some(u => this.hasEffect(u, 'fire_resist'));
    run.combatLog.push(`>> Hazard! Team erleidet ${room.hazardDamage} Schaden.${hasResist ? ' (Feuerresistenz aktiv!)' : ''}`);
  }

  private processFind(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    run.combatLog.push('>> Fundstätte entdeckt!');

    // Feature #11: Begegnungs-Wahl für Fund-Räume generieren
    const gold = room.findGold ?? 20;

    const optionA: EncounterChoice = {
      label: `Truhe öffnen (+${gold} Gold)`,
      flavorText: 'Eine verschlossene Truhe wartet auf euch. Euer Dieb knackt das Schloss.',
      effect: 'gold',
      value: gold,
    };

    // Zweite Option variiert per RNG
    const roll = rng.nextInt(0, 2); // 0, 1 oder 2
    let optionB: EncounterChoice;
    if (roll === 0) {
      optionB = {
        label: 'Weitergehen (+5% HP)',
        flavorText: 'Ihr ignoriert die Truhe und schont eure Kräfte für das Kommende.',
        effect: 'heal',
        value: 5,
      };
    } else if (roll === 1) {
      // Erstes findItem oder Fallback auf herb_green
      const firstItem = room.findItems?.[0];
      if (firstItem) {
        const itemName = ITEM_DEFS[firstItem.itemId]?.name ?? firstItem.itemId;
        optionB = {
          label: `Versteck durchsuchen (+${firstItem.qty}× ${itemName})`,
          flavorText: 'Ein gut verborgenes Versteck birgt nützliche Ausrüstung.',
          effect: 'item',
          value: firstItem.qty,
          itemId: firstItem.itemId,
        };
      } else {
        optionB = {
          label: 'Altes Lager plündern (+2 Grüne Kräuter)',
          flavorText: 'Ein verlassenes Lager hält noch einige Vorräte bereit.',
          effect: 'item',
          value: 2,
          itemId: 'herb_green',
        };
      }
    } else {
      optionB = {
        label: 'Wissen sammeln (+8 XP)',
        flavorText: 'Auf dem Boden liegen alte Bücher und Schriftrollen.',
        effect: 'xp',
        value: 8,
      };
    }

    room.encounterChoices = { optionA, optionB };
    run.pendingChoice = { roomIndex: room.index, optionA, optionB };
  }

  private processMerchant(run: ExpeditionRun, _room: EncounterRoom): void {
    // Feature #16: Händler-Interaktion – pendingMerchant setzen, NICHT auto-healen
    run.pendingMerchant = true;
    run.merchantPurchases = 0;
    run.combatLog.push('>> Ein reisender Händler bietet seine Waren an! (Max. 2 Käufe)');
    run.combatLog.push('   Heiltrankh: 15 Gold | Brot: 8 Gold | Kraft-Brot: 25 Gold');
  }

  private processSurvivor(run: ExpeditionRun, _room: EncounterRoom, rng: SeededRNG): void {
    // 3 XP für jedes lebende Party-Mitglied
    const aliveParty = run.party.filter(u => u.hp > 0);
    if (!run.xpEarned) run.xpEarned = {};
    for (const u of aliveParty) {
      run.xpEarned[u.id] = (run.xpEarned[u.id] ?? 0) + 3;
    }
    run.combatLog.push('>> Ihr findet einen Überlebenden! Er teilt wertvolle Erfahrungen. (+3 XP)');

    // Feature #17: 20% Chance einen Spezialisten zu finden
    if (rng.chance(0.2)) {
      // Bereits gefundene Spezialisten ausschließen
      const ownedSpecialists: string[] = [];
      if (run.specialistFound) ownedSpecialists.push(run.specialistFound);

      const specialist = pickRandomSpecialist(ownedSpecialists, () => rng.next());
      if (specialist) {
        run.specialistFound = specialist.id;
        run.combatLog.push(`>> SPEZIALIST! ${specialist.name} schließt sich euch an! (${specialist.flavorText})`);
      }
    }
  }

  // ─── Unit Factories ─────────────────────────────────────────────

  private fighterToCombatUnit(fighter: GuildFighter): CombatUnit {
    const stats = this.gearSystem.getEffectiveStats(fighter);
    const cls = CLASS_DEFS[fighter.classId];
    const specialEffects = this.gearSystem.getSpecialEffects(fighter);

    return {
      id: fighter.id,
      name: fighter.name,
      isPlayer: true,
      hp: stats.hp,
      maxHp: stats.maxHp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      critChance: stats.critChance,
      critMult: stats.critMult,
      threat: 0,
      tauntRounds: 0,
      skills: (cls?.skills ?? []).map(s => ({
        id: s.id,
        name: s.name,
        cooldown: s.cooldown,
        currentCooldown: 0,
        effectType: s.effectType,
        power: s.power,
        target: s.target,
      })),
      buffs: [],
      lootTableId: null,
      spriteKey: cls?.spriteKey,
      specialEffects,
    };
  }

  private enemyToCombatUnit(enemyId: string, difficulty: string = 'normal'): CombatUnit {
    const def = ENEMY_DEFS[enemyId];
    if (!def) {
      return {
        id: 0, name: 'Unknown', isPlayer: false,
        hp: 1, maxHp: 1, atk: 1, def: 0, spd: 1, critChance: 0, critMult: 1,
        threat: 0, tauntRounds: 0, skills: [], buffs: [], lootTableId: null,
      };
    }

    const diff = DIFFICULTY_DEFS[difficulty] ?? DIFFICULTY_DEFS.normal;
    const scaledHp = Math.floor(def.hp * diff.enemyHpMult);
    const scaledAtk = Math.floor(def.atk * diff.enemyAtkMult);
    const scaledDef = def.def + diff.enemyDefBonus;

    return {
      id: Math.floor(Math.random() * 100000),
      name: def.name,
      isPlayer: false,
      hp: scaledHp,
      maxHp: scaledHp,
      atk: scaledAtk,
      def: scaledDef,
      spd: def.spd,
      critChance: def.critChance,
      critMult: def.critMult,
      threat: 0,
      tauntRounds: 0,
      skills: def.skills.map(s => ({
        id: s.id,
        name: s.name,
        cooldown: s.cooldown,
        currentCooldown: 0,
        effectType: s.effectType,
        power: s.power,
        target: s.target,
      })),
      buffs: [],
      lootTableId: def.lootTableId,
      spriteKey: def.spriteKey,
      defId: enemyId,
    };
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
