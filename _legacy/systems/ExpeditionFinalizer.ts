// ─── ExpeditionFinalizer ────────────────────────────────────────
// Encapsulates all post-expedition logic: loot distribution, XP,
// scoreboard updates, guild rank, achievements, celebrations.
// Extracted from CityScene.finalizeExpedition().
// ──────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { GameState } from '../models/GameState';
import { UIManager } from '../ui/UIManager';
import { BuildingUpgradeSystem } from './BuildingUpgradeSystem';
import { ExpeditionSystem } from './ExpeditionSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { GearMaintenanceSystem } from './GearMaintenanceSystem';
import { GuildRankSystem } from './GuildRankSystem';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { AchievementSystem } from './AchievementSystem';
import { BestiariumSystem } from './BestiariumSystem';
import { NpcRescueSystem } from './NpcRescueSystem';
import { awardXP } from './HeroProgression';
import { generateWeeklyChallenge, determineMedal } from '../data/weeklyChallenges';
import { createEmptyWeeklyChallengeState } from '../models/WeeklyChallengeState';
import { CLASS_DEFS } from '../data/classes';
import { SeededRNG } from '../utils/RNG';
import { Celebrations } from '../ui/Celebrations';

export class ExpeditionFinalizer {
  constructor(
    private scene: Phaser.Scene,
    private gameState: GameState,
    private uiManager: UIManager,
    private buildingUpgradeSystem: BuildingUpgradeSystem,
    private expeditionSystem: ExpeditionSystem,
    private provisionSystem: ProvisionSystem,
    private gearMaintenanceSystem: GearMaintenanceSystem,
    private guildRankSystem: GuildRankSystem,
    private classUnlockSystem: ClassUnlockSystem,
    private achievementSystem: AchievementSystem,
    private bestiariumSystem: BestiariumSystem,
    private npcRescueSystem: NpcRescueSystem,
  ) {}

  finalize(dungeonExpeditionActive: boolean, onDungeonReset: () => void): void {
    const run = this.gameState.activeExpedition;
    if (!run) return;

    // ── Guaranteed gear drop: 1 thematic gear item per completed run ──
    const ROUTE_GEAR_POOLS: Record<string, string[]> = {
      forest_short:  ['wolf_fang_necklace', 'hunter_bow', 'leather_armor'],
      forest_medium: ['wolf_fang_necklace', 'hunter_bow', 'leather_armor'],
      cave_deep:     ['iron_sword', 'iron_shield', 'leather_armor'],
      cave_spider:   ['spider_silk_robe', 'iron_sword', 'wolf_fang_necklace'],
      swamp_long:    ['spider_silk_robe', 'leather_armor', 'wolf_fang_necklace'],
      ruins_crypts:  ['steel_sword', 'steel_armor', 'crystal_pendant'],
      ruins_depths:  ['steel_sword', 'steel_armor', 'battle_robe', 'crystal_pendant'],
      volcano_core:  ['steel_armor', 'longbow', 'crystal_staff'],
    };
    const gearPool = ROUTE_GEAR_POOLS[run.routeId];
    if (gearPool && gearPool.length > 0) {
      const guaranteed = gearPool[Math.floor(Math.random() * gearPool.length)];
      run.loot[guaranteed] = (run.loot[guaranteed] ?? 0) + 1;
    }

    // ── Bestiarium route completion bonus: +5% loot if all enemies of this biome defeated ──
    const lootBonus = this.bestiariumSystem.getRouteLootBonus(this.gameState, run.routeId);
    if (lootBonus > 0) {
      for (const itemId of Object.keys(run.loot)) {
        const extra = Math.floor(run.loot[itemId] * lootBonus);
        if (extra > 0) run.loot[itemId] += extra;
      }
      const extraGold = Math.floor(run.goldEarned * lootBonus);
      if (extraGold > 0) run.goldEarned += extraGold;
      run.combatLog.push(`>> Bestiarium-Bonus: +${Math.round(lootBonus * 100)}% Beute!`);
    }

    // Add loot to treasure chest (player opens chest to collect)
    if (!this.gameState.pendingChestLoot) {
      this.gameState.pendingChestLoot = { items: {}, expeditionCount: 0 };
    }
    const chest = this.gameState.pendingChestLoot;
    for (const [itemId, qty] of Object.entries(run.loot)) {
      chest.items[itemId] = (chest.items[itemId] ?? 0) + qty;
    }
    if (run.goldEarned > 0) {
      chest.items['gold'] = (chest.items['gold'] ?? 0) + run.goldEarned;
    }
    chest.expeditionCount += 1;

    // Return unused provisions
    this.provisionSystem.returnProvisions(this.gameState, run.provisions);

    // Award XP to fighters (+10 bonus for completing the run)
    const xpMap = run.xpEarned ?? {};
    const runBonus = run.status === 'victory' ? 10 : 0;
    for (const unit of run.party) {
      const fighter = this.gameState.fighters.find(f => f.id === unit.id);
      if (!fighter) continue;

      const earnedXp = (xpMap[unit.id] ?? 0) + runBonus;
      if (earnedXp > 0) {
        const levelUps = awardXP(fighter, earnedXp);
        if (levelUps > 0) {
          run.combatLog.push(`>> ${fighter.name} erreicht Level ${fighter.level}!`);
        }
      }
    }

    // Calculate score before clearing the run
    this.expeditionSystem.calculateScore(run);

    // Save to scoreboard
    if (!this.gameState.scoreboard) this.gameState.scoreboard = [];
    this.gameState.scoreboard.push({
      routeId: run.routeId,
      score: run.score,
      difficulty: run.difficulty,
      modifier: run.activeModifier,
      status: run.status === 'exploring' ? 'retreat' : run.status,
      partyClasses: run.party.map(u => {
        const fighter = this.gameState.fighters.find(f => f.id === u.id);
        return fighter?.classId ?? 'unknown';
      }),
      timestamp: Date.now(),
      day: this.gameState.day,
      enemiesKilled: run.enemiesKilled,
      bossesKilled: run.bossesKilled,
    });
    if (this.gameState.scoreboard.length > 100) {
      this.gameState.scoreboard.sort((a, b) => b.score - a.score);
      this.gameState.scoreboard.length = 100;
    }

    // Update weekly challenge tracking
    const currentChallenge = generateWeeklyChallenge();
    const wc = this.gameState.weeklyChallenge;
    if (!wc || wc.currentChallengeId !== currentChallenge.id) {
      this.gameState.weeklyChallenge = createEmptyWeeklyChallengeState(currentChallenge.id);
    }
    const challengeMatch =
      run.routeId === currentChallenge.routeId &&
      run.difficulty === currentChallenge.difficulty &&
      (currentChallenge.requiredModifier === null || run.activeModifier === currentChallenge.requiredModifier);
    if (challengeMatch) {
      const wcState = this.gameState.weeklyChallenge!;
      wcState.attempts++;
      if (run.score > wcState.bestScore) {
        wcState.bestScore = run.score;
        const newMedal = determineMedal(run.score, currentChallenge);
        if (newMedal !== 'none' && wcState.completedAt === null) {
          wcState.completedAt = Date.now();
        }
        wcState.medal = newMedal;
      }
    }

    // Handle fighters: surviving = IDLE, downed = INJURED_REST
    for (const unit of run.party) {
      const fighter = this.gameState.fighters.find(f => f.id === unit.id);
      if (!fighter) continue;
      const citizen = this.gameState.citizens.find(c => c.fighterId === fighter.id);
      if (!citizen) continue;

      if (unit.hp <= 0) {
        citizen.status = 'INJURED_REST';
        citizen.injuryTimer = 120;
      } else {
        citizen.status = 'GUILD_FIGHTER';
      }

      if (unit.hp <= 0) {
        fighter.gearNeedsRepair = true;
      }
    }

    // ── Gear Maintenance (5 Gold/item, first item free) ──
    const fighterIds = run.party.map(u => u.id);
    const maintenanceCost = this.gearMaintenanceSystem.processAfterExpedition(
      this.gameState, fighterIds,
    );
    if (maintenanceCost > 0) {
      run.combatLog.push(`>> Reparaturkosten: ${maintenanceCost} Gold`);
    }

    // ── Guild Rank: update stats + check rank-up ──
    const bossIds = run.rooms
      .filter(r => r.type === 'boss' && r.completed)
      .flatMap(r => r.enemies.filter(e => e.hp <= 0).map(e => e.defId ?? ''))
      .filter(id => id !== '');
    this.guildRankSystem.updateStats(
      this.gameState, run.routeId, run.bossesKilled, bossIds,
    );
    const rankUp = this.guildRankSystem.checkRankUp(this.gameState);
    if (rankUp) {
      run.combatLog.push(`>> ${rankUp.title}!`);
      for (const unlock of rankUp.unlocks) {
        run.combatLog.push(`   Freigeschaltet: ${unlock}`);
      }
    }

    // ── Class Unlock check ──
    const newClasses = this.classUnlockSystem.checkUnlocks(this.gameState);
    for (const classId of newClasses) {
      const cls = CLASS_DEFS[classId];
      if (cls) {
        run.combatLog.push(`>> Neue Klasse freigeschaltet: ${cls.name}!`);
      }
    }

    // ── Statistics tracking ──
    const stats = this.gameState.statistics;
    stats.total_expeditions = (stats.total_expeditions ?? 0) + 1;
    stats.total_enemies_killed = (stats.total_enemies_killed ?? 0) + run.enemiesKilled;
    stats.total_bosses_killed = (stats.total_bosses_killed ?? 0) + run.bossesKilled;
    stats.total_gold_earned = (stats.total_gold_earned ?? 0) + run.goldEarned;
    if (run.status === 'victory') {
      stats.total_victories = (stats.total_victories ?? 0) + 1;
      const allAlive = run.party.every(u => u.hp > 0);
      if (allAlive) stats.total_flawless_victories = (stats.total_flawless_victories ?? 0) + 1;
    }
    else if (run.status === 'defeat') stats.total_defeats = (stats.total_defeats ?? 0) + 1;
    else stats.total_retreats = (stats.total_retreats ?? 0) + 1;

    // ── Milestone banners ──
    if (stats.total_expeditions === 1) {
      this.uiManager.tutorialOverlay.showMilestoneBanner('Erste Expedition abgeschlossen!');
    } else if (stats.total_victories === 1) {
      this.uiManager.tutorialOverlay.showMilestoneBanner('Erster Sieg errungen!');
    } else if (stats.total_bosses_killed === 1 && run.bossesKilled > 0) {
      this.uiManager.tutorialOverlay.showMilestoneBanner('Erster Boss besiegt!');
    }

    // ── Specialist from survivor room ──
    if (run.specialistFound) {
      const alreadyOwned = this.gameState.specialists.some(
        s => s.specialistId === run.specialistFound,
      );
      if (!alreadyOwned) {
        this.gameState.specialists.push({
          specialistId: run.specialistFound,
          assignedBuildingId: null,
        });
        run.combatLog.push(`>> Spezialist gefunden: ${run.specialistFound}!`);
      }
    }

    // ── Celebrations ──
    if (run.bossesKilled > 0) {
      Celebrations.bossConfetti(this.scene);
    }
    if (rankUp) {
      Celebrations.flashBanner(this.scene, `Rang aufgestiegen: ${rankUp.title}!`);
    }

    // ── Achievement check ──
    const newAchievements = this.achievementSystem.checkAchievements(
      this.gameState.statistics,
      this.gameState.achievements,
    );
    for (const achId of newAchievements) {
      this.gameState.achievements.push(achId);
      Celebrations.floatingNotification(this.scene, `Errungenschaft: ${achId}`);
    }

    // ── Bestiarium: update discovered/defeated entries ──
    this.bestiariumSystem.processExpeditionEnd(this.gameState, run);

    // ── NPC Rescue: chance to rescue an NPC after the expedition ──
    const rescueRng = new SeededRNG(this.gameState.rngSeed++);
    const rescuedId = this.npcRescueSystem.checkRescue(this.gameState, run.routeId, rescueRng);
    if (rescuedId) {
      this.npcRescueSystem.rescueNpc(this.gameState, rescuedId);
      run.combatLog.push(`>> Gefährte gerettet!`);
      Celebrations.floatingNotification(this.scene, `Gefährte gerettet!`);
    }

    this.gameState.activeExpedition = null;
    this.uiManager.refreshHUD(this.gameState);

    // Wenn die Expedition vom Dungeon-Lager gestartet wurde, Dungeon-Karte erneut öffnen
    if (dungeonExpeditionActive) {
      onDungeonReset();
    }
  }
}
