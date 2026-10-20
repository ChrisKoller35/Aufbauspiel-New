import { ExpeditionRun, CombatUnit, EncounterRoom, FortificationState } from '../models/ExpeditionRun';
import { GuildFighter } from '../models/GuildRoster';
import { ENEMY_DEFS } from '../data/enemies';
import { LOOT_TABLE_DEFS } from '../data/lootTables';
import { CLASS_DEFS } from '../data/classes';
import { ITEM_DEFS } from '../data/items';
import { GearSystem } from './GearSystem';
import { SeededRNG } from '../utils/RNG';
import { DIFFICULTY_DEFS } from '../data/difficulty';
import { SPECIAL_EFFECT_DEFS } from '../data/specialEffects';

/** Check if a unit has a specific active special effect */
export function hasEffect(unit: CombatUnit, effectId: string): boolean {
  return unit.specialEffects?.some(e => e.id === effectId && e.usesLeft !== 0) ?? false;
}

/**
 * Auto-battler combat engine: processCombat, unit factories, loot rolling.
 */
export class CombatEngine {
  constructor(private gearSystem: GearSystem) {}

  processCombat(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    const enemies = room.enemies;
    const party = run.party.filter(u => u.hp > 0);

    run.combatLog.push(`── Room ${room.index + 1}: ${room.type === 'boss' ? 'BOSS' : 'Combat'} ──`);

    // Initialize round snapshots for animated playback
    run.combatRoundSnapshots = [];

    let round = 0;
    // speed_march: maximal 10 Runden; Standard: 20 Runden
    const maxRounds = run.activeModifier === 'speed_march' ? 10 : 20;

    while (round < maxRounds) {
      round++;
      const aliveParty = party.filter(u => u.hp > 0);
      const aliveEnemies = enemies.filter(u => u.hp > 0);

      if (aliveParty.length === 0 || aliveEnemies.length === 0) break;

      // Track log entries for this round
      const logStartIdx = run.combatLog.length;

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

        // Build target list - apply Guardian Spott redirect for enemy units
        let targets: CombatUnit[];
        if (isPlayer) {
          targets = enemies.filter(u => u.hp > 0);
        } else if (run.guardianTauntActive) {
          // Spott: redirect attacks to the taunting hero, but only if alive
          const taunter = run.party.find(u => u.hp > 0 &&
            (run.tauntUnitId !== undefined ? u.id === run.tauntUnitId : u.classId === 'guardian'));
          if (taunter) {
            targets = [taunter];
          } else {
            // Taunter died → Spott ends, enemies attack normally
            run.guardianTauntActive = false;
            run.tauntUnitId = undefined;
            targets = party.filter(u => u.hp > 0);
          }
        } else {
          targets = party.filter(u => u.hp > 0);
        }

        if (targets.length === 0) continue; // Skip turn if no valid targets

        // Check skills - only for enemy units (player abilities are used pre-combat via ability UI)
        let usedSkill = false;
        if (!isPlayer) { // enemy skills only
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
              run.combatLog.push(`${unit.name} setzt ${skill.name} ein → heilt ${lowest.name} um ${healAmt}`);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true;
              break;
            }

            if (skill.effectType === 'damage') {
              // spell_power: +25% skill damage
              const spellMult = hasEffect(unit, 'spell_power') ? 1.25 : 1.0;
              if (skill.target === 'all_enemies' || skill.target === 'all_players') {
                for (const t of targets) {
                  let dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - Math.floor(t.def * 0.7)) * skill.power * spellMult));
                  // aoe_resist: target takes 30% less AoE damage
                  if (hasEffect(t, 'aoe_resist')) dmg = Math.max(1, Math.floor(dmg * 0.7));
                  t.hp -= dmg;
                  run.combatLog.push(`${unit.name} setzt ${skill.name} ein → ${t.name} erleidet ${dmg}`);
                }
              } else {
                const target = this.selectTarget(targets, rng);
                const dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - Math.floor(target.def * 0.7)) * skill.power * spellMult));
                target.hp -= dmg;
                run.combatLog.push(`${unit.name} setzt ${skill.name} ein → ${target.name} erleidet ${dmg}`);
                // lifesteal on skill damage
                this.applyOnDealDamage(unit, target, dmg, rng, run);
              }
              skill.currentCooldown = skill.cooldown;
              usedSkill = true;
              break;
            }

            if (skill.effectType === 'taunt') {
              unit.tauntRounds = skill.power;
              run.combatLog.push(`${unit.name} setzt ${skill.name} ein → Spott für ${skill.power} Runden`);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true;
              break;
            }

            if (skill.effectType === 'aoe') {
              // spell_power: +25% AoE skill damage
              const spellMult = hasEffect(unit, 'spell_power') ? 1.25 : 1.0;
              for (const t of targets) {
                let dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - Math.floor(t.def * 0.7)) * skill.power * spellMult));
                // aoe_resist: target takes 30% less AoE damage
                if (hasEffect(t, 'aoe_resist')) {
                  dmg = Math.max(1, Math.floor(dmg * 0.7));
                  run.combatLog.push(`  ${t.name}: AoE-Resistenz! (-30%)`);
                }
                t.hp -= dmg;
                run.combatLog.push(`${unit.name} setzt ${skill.name} ein → ${t.name} erleidet ${dmg}`);
                // F4: lifesteal + anti_heal on AoE damage
                this.applyOnDealDamage(unit, t, dmg, rng, run);
              }
              // Kombinierter Luftentzug (z.B. Leviathan-Druckwelle)
              if (skill.drainAirAmount && skill.drainAirAmount > 0 && run.airShield !== undefined) {
                run.airShield = Math.max(0, run.airShield - skill.drainAirAmount);
                run.combatLog.push(`>> ${unit.name} reißt ${skill.drainAirAmount} Luft aus dem Schild!`);
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

            if (skill.effectType === 'drain_air') {
              // Luftentzug-Fähigkeiten: kein HP-Schaden, stattdessen Luftschild reduzieren
              const AIR_DRAIN_TABLE: Record<string, number> = {
                luftsauger: 10,
                blasenstoss: 8,
              };
              const drainAmount = AIR_DRAIN_TABLE[skill.id] ?? skill.power;
              if (run.airShield !== undefined) {
                run.airShield = Math.max(0, run.airShield - drainAmount);
              }
              run.combatLog.push(`>> ${unit.name} entzieht dem Luftschild ${drainAmount} Luft!`);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true;
              break;
            }
          }
        } // end if (!isPlayer) - enemy skills only

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
          if (hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
            run.combatLog.push(`${unit.name} greift ${target.name} an → AUSGEWICHEN!`);
          } else {
            const isCrit = rng.chance(unit.critChance);
            let dmg = Math.max(1, unit.atk - Math.floor(target.def * 0.7));
            if (isCrit) dmg = Math.floor(dmg * unit.critMult);

            // reflect: target reflects 20% damage back
            if (hasEffect(target, 'reflect')) {
              const reflectDmg = Math.max(1, Math.floor(dmg * SPECIAL_EFFECT_DEFS.reflect.power));
              unit.hp -= reflectDmg;
              run.combatLog.push(`  ${target.name}: Reflexion! ${reflectDmg} Schaden zurück!`);
              // F1: revive check if reflect killed attacker
              if (unit.hp <= 0) this.checkRevive(unit, run);
            }

            target.hp -= dmg;
            run.combatLog.push(
              `${unit.name} greift ${target.name} an für ${dmg}${isCrit ? ' KRIT!' : ''}`,
            );

            // on_deal_damage effects (lifesteal, anti_heal)
            this.applyOnDealDamage(unit, target, dmg, rng, run);

            // double_strike: 30% chance for a second attack
            if (hasEffect(unit, 'double_strike') && rng.chance(SPECIAL_EFFECT_DEFS.double_strike.procChance)) {
              if (target.hp > 0 && unit.hp > 0) {
                // F3: dodge check for second hit
                if (hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
                  run.combatLog.push(`  ${unit.name}: DOPPELSCHLAG → AUSGEWICHEN!`);
                } else {
                  const dmg2 = Math.max(1, unit.atk - Math.floor(target.def * 0.7));
                  // F2: reflect check for second hit
                  if (hasEffect(target, 'reflect')) {
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
        if (hasEffect(unit, 'regen')) {
          const regenAmt = SPECIAL_EFFECT_DEFS.regen.power;
          const prevHp = unit.hp;
          unit.hp = Math.min(unit.maxHp, unit.hp + regenAmt);
          if (unit.hp > prevHp) {
            run.combatLog.push(`  ${unit.name}: Regeneration +${unit.hp - prevHp} HP`);
          }
        }
      }

      // Sauerstoffmangel: Wenn Luft <= 0, alle lebenden Helden nehmen 5 HP Schaden
      if (run.airShield !== undefined && run.airShield <= 0) {
        for (const hero of party) {
          if (hero.hp > 0) {
            hero.hp = Math.max(0, hero.hp - 5);
            run.combatLog.push(`⚠️ ${hero.name} erleidet Sauerstoffmangel! (-5 HP)`);
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

      // ── Record round snapshot for animated playback ──
      const roundLogLines = run.combatLog.slice(logStartIdx);
      const hadCrit = roundLogLines.some(l => l.includes('CRIT'));
      const hadDeath = [...party, ...enemies].some(u => {
        const preHp = run.combatRoundSnapshots!.length > 0
          ? (run.combatRoundSnapshots![run.combatRoundSnapshots!.length - 1].partyHp[u.id]
             ?? run.combatRoundSnapshots![run.combatRoundSnapshots!.length - 1].enemyHp[u.id]
             ?? u.maxHp)
          : u.maxHp;
        return preHp > 0 && u.hp <= 0;
      });
      const partyHp: Record<number, number> = {};
      for (const u of run.party) partyHp[u.id] = u.hp;
      const enemyHp: Record<number, number> = {};
      for (const e of enemies) enemyHp[e.id] = e.hp;
      run.combatRoundSnapshots!.push({
        round,
        partyHp,
        enemyHp,
        logLines: roundLogLines,
        hadCrit,
        hadDeath,
      });
    }

    // Clear Spott after combat ends
    run.guardianTauntActive = false;
    run.tauntUnitId = undefined;

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

  // ─── Siege Combat (Belagerung) ────────────────────────────

  /**
   * Verarbeitet einen Fortification-Raum (Belagerungsraum).
   * Kriegsmaschine beschießt die Befestigung, Gegner greifen Party + Maschine an,
   * Helden schützen die Maschine und greifen Gegner an.
   * Sieg: Befestigung HP ≤ 0. Niederlage: alle Helden tot.
   */
  processFortificationCombat(run: ExpeditionRun, room: EncounterRoom, rng: SeededRNG): void {
    const fort = room.fortification!;
    const enemies = room.enemies;
    const warMachine = run.warMachineUnit ?? null;

    run.combatLog.push(`── Raum ${room.index + 1}: BELAGERUNG ──`);
    run.combatLog.push(`>> ${fort.name} versperrt den Weg! (${fort.hp}/${fort.maxHp} HP | Rüstung: ${fort.armor})`);
    if (warMachine) {
      run.combatLog.push(`>> ${warMachine.name} positioniert! Bereit zum Beschuss.`);
    } else {
      run.combatLog.push('>> Keine Kriegsmaschine! Helden müssen die Befestigung bezwingen.');
    }

    run.combatRoundSnapshots = [];

    let round = 0;
    const maxRounds = run.activeModifier === 'speed_march' ? 15 : 30;

    while (round < maxRounds) {
      round++;
      const aliveParty = run.party.filter(u => u.hp > 0);
      const aliveEnemies = enemies.filter(u => u.hp > 0);

      if (aliveParty.length === 0) break; // Niederlage
      if (fort.hp <= 0) break;            // Sieg

      const logStartIdx = run.combatLog.length;

      // Turn-Order: Party + War Machine + Enemies, sortiert nach SPD
      const allCombatants: CombatUnit[] = [...aliveParty];
      if (warMachine && warMachine.hp > 0) allCombatants.push(warMachine);
      allCombatants.push(...aliveEnemies);
      allCombatants.sort((a, b) => b.spd - a.spd);

      for (const unit of allCombatants) {
        if (unit.hp <= 0) continue;
        if (fort.hp <= 0) break; // Befestigung schon zerstört

        if (unit.isWarMachine) {
          // ── Kriegsmaschine beschießt Befestigung ──
          const dmg = Math.max(5, unit.atk - Math.floor(fort.armor * 0.7));
          fort.hp = Math.max(0, fort.hp - dmg);
          run.combatLog.push(`${unit.name} beschießt ${fort.name}: ${dmg} Schaden! (${fort.hp}/${fort.maxHp} HP)`);
          if (fort.hp <= 0) {
            run.combatLog.push(`>> ${fort.name} ist zerstört! Der Weg ist frei!`);
            break;
          }
        } else if (run.party.includes(unit)) {
          // ── Held greift Gegner an (schützt Kriegsmaschine) ──
          const currentAliveEnemies = enemies.filter(u => u.hp > 0);
          if (currentAliveEnemies.length > 0) {
            const target = this.selectTarget(currentAliveEnemies, rng);
            if (hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
              run.combatLog.push(`${unit.name} greift ${target.name} an → AUSGEWICHEN!`);
            } else {
              const isCrit = rng.chance(unit.critChance);
              let dmg = Math.max(1, unit.atk - Math.floor(target.def * 0.7));
              if (isCrit) dmg = Math.floor(dmg * unit.critMult);
              // reflect check
              if (hasEffect(target, 'reflect')) {
                const reflectDmg = Math.max(1, Math.floor(dmg * SPECIAL_EFFECT_DEFS.reflect.power));
                unit.hp -= reflectDmg;
                run.combatLog.push(`  ${target.name}: Reflexion! ${reflectDmg} Schaden zurück!`);
                if (unit.hp <= 0) this.checkRevive(unit, run);
              }
              target.hp -= dmg;
              run.combatLog.push(`${unit.name} greift ${target.name} an für ${dmg}${isCrit ? ' KRIT!' : ''}`);
              this.applyOnDealDamage(unit, target, dmg, rng, run);
              if (target.hp <= 0) this.checkRevive(target, run);
            }
          } else {
            // Keine Gegner mehr: Helden greifen Befestigung an (10% Effektivität)
            if (fort.hp > 0) {
              const rawDmg = Math.max(1, unit.atk - Math.floor(fort.armor * 0.7));
              const dmg = Math.max(1, Math.floor(rawDmg * 0.1));
              fort.hp = Math.max(0, fort.hp - dmg);
              run.combatLog.push(`${unit.name} greift ${fort.name} an: ${dmg} Schaden (10% Effizienz)`);
            }
          }
        } else {
          // ── Gegner greift Party oder Kriegsmaschine an ──
          let targets: CombatUnit[];
          if (unit.prefersWarMachineTarget && warMachine && warMachine.hp > 0) {
            targets = [warMachine];
          } else {
            targets = run.party.filter(u => u.hp > 0);
            // Fallback: greift War Machine wenn Party tot (sollte nicht passieren, aber Sicherheit)
            if (targets.length === 0 && warMachine && warMachine.hp > 0) {
              targets = [warMachine];
            }
          }
          if (targets.length === 0) continue;

          // Gegner-Skills (vereinfacht: damage, aoe, heal, buff)
          let usedSkill = false;
          for (const skill of unit.skills) {
            if (skill.currentCooldown > 0) { skill.currentCooldown--; continue; }

            if (skill.effectType === 'heal') {
              const allies = enemies.filter(u => u.hp > 0);
              if (allies.length > 0) {
                const lowest = allies.reduce((a, b) => a.hp < b.hp ? a : b);
                const healAmt = Math.floor(skill.power);
                lowest.hp = Math.min(lowest.maxHp, lowest.hp + healAmt);
                run.combatLog.push(`${unit.name} setzt ${skill.name} ein → heilt ${lowest.name} um ${healAmt}`);
                skill.currentCooldown = skill.cooldown;
                usedSkill = true; break;
              }
            }
            if (skill.effectType === 'damage') {
              const target = this.selectTarget(targets, rng);
              const dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - Math.floor(target.def * 0.7)) * skill.power));
              target.hp -= dmg;
              run.combatLog.push(`${unit.name} setzt ${skill.name} ein → ${target.name} erleidet ${dmg}`);
              if (target.hp <= 0 && !target.isWarMachine) this.checkRevive(target, run);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true; break;
            }
            if (skill.effectType === 'aoe') {
              for (const t of targets) {
                let dmg = Math.max(1, Math.floor(Math.max(1, unit.atk - Math.floor(t.def * 0.7)) * skill.power));
                if (hasEffect(t, 'aoe_resist')) dmg = Math.max(1, Math.floor(dmg * 0.7));
                t.hp -= dmg;
                run.combatLog.push(`${unit.name} setzt ${skill.name} ein → ${t.name} erleidet ${dmg}`);
                if (t.hp <= 0 && !t.isWarMachine) this.checkRevive(t, run);
              }
              skill.currentCooldown = skill.cooldown;
              usedSkill = true; break;
            }
            if (skill.effectType === 'buff') {
              unit.atk += skill.power;
              unit.buffs.push({ stat: 'atk', value: skill.power, remainingRounds: 3 });
              run.combatLog.push(`${unit.name} setzt ${skill.name} ein → +${skill.power} ATK für 3 Runden`);
              skill.currentCooldown = skill.cooldown;
              usedSkill = true; break;
            }
          }

          if (!usedSkill) {
            const target = this.selectTarget(targets, rng);
            if (hasEffect(target, 'dodge') && rng.chance(SPECIAL_EFFECT_DEFS.dodge.procChance)) {
              run.combatLog.push(`${unit.name} greift ${target.name} an → AUSGEWICHEN!`);
            } else {
              const isCrit = rng.chance(unit.critChance);
              let dmg = Math.max(1, unit.atk - Math.floor(target.def * 0.7));
              if (isCrit) dmg = Math.floor(dmg * unit.critMult);
              target.hp -= dmg;
              run.combatLog.push(`${unit.name} greift ${target.name} an für ${dmg}${isCrit ? ' KRIT!' : ''}`);
              if (target.hp <= 0 && !target.isWarMachine) this.checkRevive(target, run);
            }
          }
        }
      }

      // End-of-Round: Buff Decay
      const allLiving = [...run.party.filter(u => u.hp > 0), ...enemies.filter(u => u.hp > 0)];
      if (warMachine && warMachine.hp > 0) allLiving.push(warMachine);
      for (const unit of allLiving) {
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

      // Guardian Taunt Decay (greift in Belagerung nicht, aber Safety)
      run.guardianTauntActive = false;
      run.tauntUnitId = undefined;

      // Snapshot aufzeichnen
      const roundLogLines = run.combatLog.slice(logStartIdx);
      const hadCrit = roundLogLines.some(l => l.includes('KRIT'));
      const hadDeath = [...run.party, ...enemies].some(u => {
        const prevHp = run.combatRoundSnapshots!.length > 0
          ? (run.combatRoundSnapshots![run.combatRoundSnapshots!.length - 1].partyHp[u.id]
             ?? run.combatRoundSnapshots![run.combatRoundSnapshots!.length - 1].enemyHp[u.id]
             ?? u.maxHp)
          : u.maxHp;
        return prevHp > 0 && u.hp <= 0;
      });
      const partyHp: Record<number, number> = {};
      for (const u of run.party) partyHp[u.id] = u.hp;
      if (warMachine) partyHp[warMachine.id] = warMachine.hp;
      const enemyHp: Record<number, number> = {};
      for (const e of enemies) enemyHp[e.id] = e.hp;
      run.combatRoundSnapshots!.push({
        round, partyHp, enemyHp, logLines: roundLogLines,
        hadCrit, hadDeath,
        fortificationHp: fort.hp,
      });
    }

    // Loot von besiegten Gegnern
    for (const enemy of enemies) {
      if (enemy.hp <= 0 && enemy.lootTableId) {
        this.rollLoot(run, enemy.lootTableId, rng);
      }
    }

    // XP: nur Helden erhalten XP
    const killedEnemies = enemies.filter(e => e.hp <= 0);
    const totalXp = killedEnemies.reduce((sum, e) => {
      const reward = (e.defId ? ENEMY_DEFS[e.defId]?.xpReward : undefined) ?? 5;
      return sum + reward;
    }, 0);
    if (totalXp > 0) {
      const livingParty = run.party.filter(u => u.hp > 0);
      const xpEach = Math.max(1, Math.floor(totalXp / Math.max(1, livingParty.length)));
      if (!run.xpEarned) run.xpEarned = {};
      for (const u of livingParty) {
        run.xpEarned[u.id] = (run.xpEarned[u.id] ?? 0) + xpEach;
      }
    }

    run.enemiesKilled += killedEnemies.length;
    run.totalCombatRounds += round;

    if (fort.hp <= 0) {
      run.combatLog.push('>> Belagerung erfolgreich! Befestigung zerstört!');
    } else {
      run.combatLog.push('>> Belagerung abgebrochen — Befestigung hält stand.');
    }
  }

  /**
   * Erstellt eine Kriegsmaschine als CombatUnit aus einem Item-ID.
   */
  warMachineToCombatUnit(itemId: string): CombatUnit {
    const itemDef = ITEM_DEFS[itemId] as { name?: string; combatAbility?: { name: string; damage: number; target: string; cooldown: number } };
    const ability = itemDef?.combatAbility;
    const isCannon = itemId === 'war_cannon';
    return {
      id: Math.floor(Math.random() * 900000) + 100000,
      name: isCannon ? 'Kanone' : 'Katapult',
      isPlayer: true,
      isWarMachine: true,
      hp: isCannon ? 60 : 70,
      maxHp: isCannon ? 60 : 70,
      atk: ability?.damage ?? (isCannon ? 28 : 22),
      def: isCannon ? 15 : 10,
      spd: isCannon ? 0.8 : 0.7,
      critChance: 0,
      critMult: 1.0,
      threat: 0,
      tauntRounds: 0,
      skills: [],
      buffs: [],
      lootTableId: null,
      spriteKey: isCannon ? 'ITEM_WAR_CANNON' : 'ITEM_WAR_CATAPULT',
    };
  }

  rollLoot(run: ExpeditionRun, lootTableId: string, rng: SeededRNG): void {
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

  fighterToCombatUnit(fighter: GuildFighter): CombatUnit {
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
      classId: fighter.classId,
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

  enemyToCombatUnit(enemyId: string, difficulty: string = 'normal'): CombatUnit {
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

  // ─── Private Helpers ─────────────────────────────────────────────

  /** Apply on_deal_damage effects: lifesteal, anti_heal */
  private applyOnDealDamage(
    attacker: CombatUnit, target: CombatUnit, dmg: number,
    _rng: SeededRNG, run: ExpeditionRun,
  ): void {
    // lifesteal: heal 25% of damage dealt
    if (hasEffect(attacker, 'lifesteal') && dmg > 0) {
      const healAmt = Math.max(1, Math.floor(dmg * SPECIAL_EFFECT_DEFS.lifesteal.power));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
      run.combatLog.push(`  ${attacker.name}: Lebensraub +${healAmt} HP`);
    }
    // anti_heal: mark target so their healing is halved this round
    if (hasEffect(attacker, 'anti_heal')) {
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

    // Random target
    return rng.pick(targets);
  }
}
