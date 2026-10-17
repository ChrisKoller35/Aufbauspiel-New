// ─── Magic City – CitySystemContainer ───────────────────────────────────────
// Holds all game-system instances that CityScene previously owned directly.
// Extraction reduces CityScene from God Object; no logic changes.
// ─────────────────────────────────────────────────────────────────────────────

import Phaser from 'phaser';
import { GridSystem } from './GridSystem';
import { ConnectivitySystem } from './ConnectivitySystem';
import { ProductionSystem } from './ProductionSystem';
import { SatisfactionSystem } from './SatisfactionSystem';
import { EconomySystem } from './EconomySystem';
import { PeopleSystem } from './PeopleSystem';
import { GearSystem } from './GearSystem';
import { ExpeditionSystem } from './ExpeditionSystem';
import { ProvisionSystem } from './ProvisionSystem';
import { SaveSystem } from './SaveSystem';
import { SoundManager } from './SoundManager';
import { GuildRankSystem } from './GuildRankSystem';
import { CityEventSystem } from './CityEventSystem';
import { FighterSynergySystem } from './FighterSynergySystem';
import { GearMaintenanceSystem } from './GearMaintenanceSystem';
import { TalismanSystem } from './TalismanSystem';
import { ClassUnlockSystem } from './ClassUnlockSystem';
import { BuildingUpgradeSystem } from './BuildingUpgradeSystem';
import { AchievementSystem } from './AchievementSystem';
import { BestiariumSystem } from './BestiariumSystem';
import { NpcRescueSystem } from './NpcRescueSystem';

export class CitySystemContainer {
  readonly grid: GridSystem;
  readonly connectivity: ConnectivitySystem;
  readonly production: ProductionSystem;
  readonly satisfaction: SatisfactionSystem;
  readonly economy: EconomySystem;
  readonly people: PeopleSystem;
  readonly gear: GearSystem;
  readonly provision: ProvisionSystem;
  readonly expedition: ExpeditionSystem;
  readonly save: SaveSystem;
  readonly sound: SoundManager;
  readonly guildRank: GuildRankSystem;
  readonly cityEvent: CityEventSystem;
  readonly fighterSynergy: FighterSynergySystem;
  readonly gearMaintenance: GearMaintenanceSystem;
  readonly talisman: TalismanSystem;
  readonly classUnlock: ClassUnlockSystem;
  readonly buildingUpgrade: BuildingUpgradeSystem;
  readonly achievement: AchievementSystem;
  readonly bestiarium: BestiariumSystem;
  readonly npcRescue: NpcRescueSystem;

  constructor(scene: Phaser.Scene) {
    this.grid = new GridSystem();
    this.connectivity = new ConnectivitySystem();
    this.production = new ProductionSystem();
    this.satisfaction = new SatisfactionSystem();
    this.economy = new EconomySystem();
    this.people = new PeopleSystem();
    // GearSystem and ProvisionSystem must be created before ExpeditionSystem
    this.gear = new GearSystem();
    this.provision = new ProvisionSystem();
    this.expedition = new ExpeditionSystem(this.gear, this.provision);
    this.save = new SaveSystem();
    // SoundManager needs the scene reference
    this.sound = new SoundManager(scene);
    this.guildRank = new GuildRankSystem();
    this.cityEvent = new CityEventSystem();
    this.fighterSynergy = new FighterSynergySystem();
    this.gearMaintenance = new GearMaintenanceSystem();
    this.talisman = new TalismanSystem();
    this.classUnlock = new ClassUnlockSystem();
    this.buildingUpgrade = new BuildingUpgradeSystem();
    this.achievement = new AchievementSystem();
    this.bestiarium = new BestiariumSystem();
    this.npcRescue = new NpcRescueSystem();
  }
}
