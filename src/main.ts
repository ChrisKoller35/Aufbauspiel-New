import './ui/html/magic-city.css';
import { GameState, createNewGameState } from './models/GameState';
import { SaveSystem } from './systems/SaveSystem';
import { renderMainMenu } from './ui/screens/MainMenuScreen';
import { renderHeroesScreen, initHeroesScreen } from './ui/screens/HeroesScreen';
import { renderBuildingsScreen, initBuildingsScreen } from './ui/screens/BuildingsScreen';
import { renderExpeditionsScreen, initExpeditionsScreen, setSelectedRoute } from './ui/screens/ExpeditionsScreen';
import { renderRankingScreen, initRankingScreen } from './ui/screens/RankingScreen';
import { renderBestiariumScreen, initBestiariumScreen } from './ui/screens/BestiariumScreen';
import { renderAchievementsScreen, initAchievementsScreen } from './ui/screens/AchievementsScreen';
import { renderDungeonMapScreen, initDungeonMapScreen } from './ui/screens/DungeonMapScreen';
import { CombatScreen } from './ui/screens/CombatScreen';
import { navigateTo, initScreenStyles } from './ui/ScreenRouter';
import { ExpeditionSystem } from './systems/ExpeditionSystem';
import { GearSystem } from './systems/GearSystem';
import { ProvisionSystem } from './systems/ProvisionSystem';
import { ProductionSystem } from './systems/ProductionSystem';
import { EconomySystem } from './systems/EconomySystem';
import { PeopleSystem } from './systems/PeopleSystem';
import { SatisfactionSystem } from './systems/SatisfactionSystem';
import { ConnectivitySystem } from './systems/ConnectivitySystem';
import { ScoreboardEntry } from './models/ScoreboardEntry';
import { placeStartingLayout, createStartingCitizens } from './scenes/CityStartingLayout';
import { showChestReveal } from './ui/components/ChestRevealOverlay';
import { getRouteBauplan } from './data/routes';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  const saveSystem = new SaveSystem();

  // Load or create game state
  let state: GameState;
  let isNewGame = false;
  try {
    const loaded = saveSystem.load();
    if (loaded) {
      state = loaded;
    } else {
      state = createNewGameState();
      isNewGame = true;
    }
  } catch (e) {
    console.warn('SaveSystem.load() failed, creating fresh state:', e);
    state = createNewGameState();
    isNewGame = true;
  }

  // Place starting buildings + citizens for new games
  if (isNewGame) {
    placeStartingLayout(state);
    createStartingCitizens(state);
  }

  // Initialize game systems
  const gearSystem = new GearSystem();
  const provisionSystem = new ProvisionSystem();
  const expeditionSystem = new ExpeditionSystem(gearSystem, provisionSystem);
  const productionSystem = new ProductionSystem();
  const economySystem = new EconomySystem();
  const peopleSystem = new PeopleSystem();
  const satisfactionSystem = new SatisfactionSystem();
  const connectivitySystem = new ConnectivitySystem();

  // Initialize all screens with state
  initHeroesScreen(state);
  initBuildingsScreen(state);
  initExpeditionsScreen(state);
  initRankingScreen(state);
  initBestiariumScreen(state);
  initAchievementsScreen(state);
  initDungeonMapScreen(state);

  // Render all screens into #app
  app.innerHTML = '';
  const screens = [
    ['MainMenu', () => renderMainMenu(app, state)],
    ['Heroes', () => renderHeroesScreen(app)],
    ['Buildings', () => renderBuildingsScreen(app)],
    ['Expeditions', () => renderExpeditionsScreen(app)],
    ['Ranking', () => renderRankingScreen(app)],
    ['Bestiarium', () => renderBestiariumScreen(app)],
    ['Achievements', () => renderAchievementsScreen(app)],
    ['DungeonMap', () => renderDungeonMapScreen(app)],
  ] as const;

  for (const [name, render] of screens) {
    try {
      render();
      console.log(`✓ ${name} rendered`);
    } catch (e) {
      console.error(`✗ ${name} failed:`, e);
    }
  }

  // Combat screen (class-based, manages its own DOM)
  const combatScreen = new CombatScreen(app);
  combatScreen.setExpeditionContext(expeditionSystem, state);

  // Apply screen visibility (inline styles)
  initScreenStyles();

  // ─── Expedition Flow ─────────────────────────────────────────

  function startExpeditionFlow(routeId: string, heroIds: number[], provisionMap: Record<string, number>): void {
    if (state.activeExpedition) {
      console.warn('Expedition already active');
      return;
    }

    // Convert provision map {itemId: qty} to requestedConsumables array
    const consumables: string[] = [];
    for (const [itemId, qty] of Object.entries(provisionMap)) {
      for (let i = 0; i < qty; i++) {
        consumables.push(itemId);
      }
    }

    const run = expeditionSystem.startExpedition(state, routeId, heroIds, 'normal', null, false, consumables);
    if (!run) {
      console.error('Failed to start expedition');
      return;
    }

    // Track statistics
    state.statistics['total_expeditions'] = (state.statistics['total_expeditions'] ?? 0) + 1;

    // Show combat for first combat room
    showNextCombatRoom();
  }

  function showCheckpointDialog(
    run: NonNullable<GameState['activeExpedition']>,
    onContinue: () => void,
    onRetreat: () => void,
  ): void {
    // Build a simple modal overlay for the checkpoint decision
    let overlay = document.getElementById('checkpoint-dialog');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'checkpoint-dialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;';

    const hpTotal = run.party.reduce((s, u) => s + u.hp, 0);
    const hpMax = run.party.reduce((s, u) => s + u.maxHp, 0);
    const hpPct = hpMax > 0 ? Math.round(hpTotal / hpMax * 100) : 0;
    const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#eab308' : '#ef4444';
    const roomsDone = run.currentRoom;
    const roomsTotal = run.rooms.length;

    overlay.innerHTML = `
      <div style="background:#0f1420;border:1px solid #c8a227;border-radius:10px;padding:28px 32px;max-width:400px;width:90%;text-align:center;font-family:'Cinzel',serif;">
        <div style="font-size:2rem;margin-bottom:8px;">⚑</div>
        <div style="color:#c8a227;font-size:1.1rem;letter-spacing:2px;margin-bottom:16px;">CHECKPOINT ERREICHT</div>
        <div style="color:#9ca3af;font-size:.85rem;margin-bottom:8px;">Raum ${roomsDone} von ${roomsTotal}</div>
        <div style="margin-bottom:20px;">
          <span style="color:${hpColor};font-size:.9rem;">Team HP: ${hpPct}%</span>
          <div style="background:#1a1a2e;border-radius:4px;height:8px;margin-top:6px;overflow:hidden;">
            <div style="background:${hpColor};height:100%;width:${hpPct}%;border-radius:4px;transition:.3s"></div>
          </div>
        </div>
        <div style="color:#6b7280;font-size:.78rem;margin-bottom:20px;">
          Bei Rückzug behältst du die bisherige Beute.
        </div>
        <div style="display:flex;gap:12px;">
          <button id="cp-retreat" style="flex:1;padding:12px;background:none;border:1px solid #6b7280;color:#9ca3af;border-radius:6px;cursor:pointer;font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:1px;transition:.2s;">RÜCKZUG</button>
          <button id="cp-continue" style="flex:1;padding:12px;background:linear-gradient(135deg,#c8a227,#7a5c08);border:1px solid #c8a227;color:#0f1420;border-radius:6px;cursor:pointer;font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:1px;font-weight:700;transition:.2s;">WEITER</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cp-continue')!.addEventListener('click', () => {
      overlay!.remove();
      expeditionSystem.resolveCheckpoint(run, false);
      onContinue();
    });

    document.getElementById('cp-retreat')!.addEventListener('click', () => {
      overlay!.remove();
      expeditionSystem.resolveCheckpoint(run, true);
      onRetreat();
    });
  }

  function showNextCombatRoom(): void {
    const run = state.activeExpedition;
    if (!run || run.status !== 'exploring') {
      finishExpedition();
      return;
    }

    const room = run.rooms[run.currentRoom];
    if (!room) {
      finishExpedition();
      return;
    }

    // Only show combat UI for combat/boss/fortification rooms
    if (room.type === 'combat' || room.type === 'boss' || room.type === 'fortification') {
      // Hide all other screens
      const allScreens = app!.children;
      for (let i = 0; i < allScreens.length; i++) {
        const el = allScreens[i] as HTMLElement;
        if (el.id !== 's-combat') {
          el.style.cssText = 'display:none;';
        }
      }

      combatScreen.show(run, run.currentRoom);

      combatScreen.onRetreat = () => {
        expeditionSystem.retreat(run);
        finishExpedition();
      };

      combatScreen.onFightClicked = () => {
        // Process combat
        expeditionSystem.processCurrentRoom(state);
        combatScreen.startCombatAnimation(run, room);
      };

      combatScreen.onComplete = () => {
        // Advance to next room if still exploring
        if (run.status === 'exploring') {
          // Room was already advanced by processCurrentRoom
          showNextCombatRoom();
        } else {
          finishExpedition();
        }
      };
    } else {
      // Non-combat room: process automatically and advance
      expeditionSystem.processCurrentRoom(state);

      // Checkpoint dialog — ask player to continue or retreat
      if (run.pendingCheckpoint) {
        showCheckpointDialog(run, () => showNextCombatRoom(), () => finishExpedition());
        return; // stop processing until player decides
      }
      if (run.pendingMerchant) {
        run.pendingMerchant = false;
        const currentRoom = run.rooms[run.currentRoom];
        if (currentRoom) currentRoom.completed = true;
        run.currentRoom++;
        if (run.currentRoom >= run.rooms.length) {
          run.status = 'victory';
        }
      }
      if (run.pendingChoice) {
        run.pendingChoice = undefined;
        run.currentRoom++;
        if (run.currentRoom >= run.rooms.length) {
          run.status = 'victory';
        }
      }

      if (run.status === 'exploring') {
        // Use setTimeout to prevent stack overflow with consecutive non-combat rooms
        setTimeout(showNextCombatRoom, 0);
      } else {
        finishExpedition();
      }
    }
  }

  function finishExpedition(): void {
    const run = state.activeExpedition;
    if (!run) return;

    // Capture loot data before clearing
    const loot = { ...run.loot };

    // Bauplan: garantierter Drop beim ersten Sieg über den Routen-Boss
    const bauplanDrop = run.bossesKilled > 0 ? getRouteBauplan(run.routeId) : null;
    const neuerBauplan = bauplanDrop && !state.erhalteneBauplaene.includes(bauplanDrop) ? bauplanDrop : null;
    if (neuerBauplan) loot[neuerBauplan] = (loot[neuerBauplan] ?? 0) + 1;
    const goldEarned = run.goldEarned ?? 0;
    const hasLoot = goldEarned > 0 || Object.values(loot).some(q => q > 0);

    // Create scoreboard entry
    const entry: ScoreboardEntry = {
      routeId: run.routeId,
      score: run.score ?? 0,
      difficulty: run.difficulty ?? 'normal',
      modifier: run.activeModifier ?? null,
      status: run.status === 'victory' ? 'victory' : run.status === 'defeat' ? 'defeat' : 'retreat',
      partyClasses: run.party.map(u => u.classId ?? ''),
      timestamp: Date.now(),
      day: state.day,
      enemiesKilled: run.enemiesKilled ?? 0,
      bossesKilled: run.bossesKilled ?? 0,
    };
    if (!state.scoreboard) state.scoreboard = [];
    state.scoreboard.push(entry);

    // Return unused provisions to stock
    for (const prov of run.provisions) {
      if (prov.qty > 0) {
        state.globalStock[prov.itemId] = (state.globalStock[prov.itemId] ?? 0) + prov.qty;
      }
    }

    // Track statistics
    state.statistics['total_enemies_killed'] = (state.statistics['total_enemies_killed'] ?? 0) + (run.enemiesKilled ?? 0);
    state.statistics['total_bosses_killed'] = (state.statistics['total_bosses_killed'] ?? 0) + (run.bossesKilled ?? 0);
    if (run.status === 'victory') {
      state.statistics['total_victories'] = (state.statistics['total_victories'] ?? 0) + 1;
      const allAlive = run.party.every(u => u.hp > 0);
      if (allAlive) {
        state.statistics['total_flawless_victories'] = (state.statistics['total_flawless_victories'] ?? 0) + 1;
      }
    }

    // Release fighters from expedition (CombatUnit.id === GuildFighter.id)
    for (const unit of run.party) {
      const fighter = state.fighters.find(f => f.id === unit.id);
      if (fighter) {
        const citizen = state.citizens.find(c => c.fighterId === fighter.id);
        if (citizen) citizen.status = 'IDLE';
        fighter.baseStats.hp = Math.max(1, unit.hp);
      }
    }

    // Clear active expedition
    state.activeExpedition = null;

    // Apply loot and finish (with or without chest reveal)
    const applyLootAndFinish = (): void => {
      // Add loot to global stock
      for (const [itemId, qty] of Object.entries(loot)) {
        state.globalStock[itemId] = (state.globalStock[itemId] ?? 0) + qty;
      }
      state.globalStock['gold'] = (state.globalStock['gold'] ?? 0) + goldEarned;
      if (neuerBauplan) state.erhalteneBauplaene.push(neuerBauplan);
      state.statistics['total_gold_earned'] = (state.statistics['total_gold_earned'] ?? 0) + goldEarned;

      // Save
      saveSystem.save(state);

      // Reset expedition screen state and navigate back
      initExpeditionsScreen(state);
      navigateTo('expeditions');
      console.log(`Expedition finished: ${entry.status}, Score: ${entry.score}`);
    };

    // Show chest reveal animation if there's loot
    if (hasLoot) {
      showChestReveal(loot, goldEarned).then(applyLootAndFinish);
    } else {
      applyLootAndFinish();
    }
  }

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toUpperCase()) {
      case 'K': navigateTo('bestiarium'); break;
      case 'A': navigateTo('achievements'); break;
      case 'ESCAPE':
        // If combat is active, don't allow ESC to navigate away
        if (state.activeExpedition) return;
        navigateTo('main');
        break;
    }

    if (e.key === 'F5') {
      e.preventDefault();
      saveSystem.save(state);
      console.log('Game saved.');
    }
  });

  // ─── Game Loop (City Tick) ─────────────────────────────────────
  const CITY_TICK_INTERVAL = 1.0;  // seconds
  const DAY_TICK_INTERVAL = 30.0;  // seconds

  let lastTickTime = performance.now();

  setInterval(() => {
    const now = performance.now();
    const deltaSec = (now - lastTickTime) / 1000;
    lastTickTime = now;

    // Connectivity (mark all built buildings as connected)
    connectivitySystem.update(state);

    // City tick: production, workers, satisfaction
    state.cityTickAccumulator += deltaSec;
    while (state.cityTickAccumulator >= CITY_TICK_INTERVAL) {
      state.cityTickAccumulator -= CITY_TICK_INTERVAL;
      productionSystem.update(state, CITY_TICK_INTERVAL);
      peopleSystem.cityTick(state, CITY_TICK_INTERVAL);
      satisfactionSystem.update(state);
    }

    // Day tick: economy (tax), population growth
    state.dayTickAccumulator += deltaSec;
    while (state.dayTickAccumulator >= DAY_TICK_INTERVAL) {
      state.dayTickAccumulator -= DAY_TICK_INTERVAL;
      economySystem.dayTick(state);
      peopleSystem.dayTick(state);
    }

    // Update resource display in header
    updateResourceDisplays(state);
  }, 1000);

  /** Update all visible resource bars in headers across screens */
  function updateResourceDisplays(s: GameState): void {
    const resBars = document.querySelectorAll('.res');
    for (let i = 0; i < resBars.length; i++) {
      const bar = resBars[i] as HTMLElement;
      // Only update if bar is visible (parent screen is displayed)
      if (!bar.offsetParent) continue;
      bar.innerHTML = buildResourceHTML(s);
    }
  }

  function buildResourceHTML(s: GameState): string {
    const gold = s.globalStock['gold'] ?? 0;
    const wood = s.globalStock['wood'] ?? 0;
    const stone = s.globalStock['stone'] ?? 0;
    const bread = s.globalStock['bread'] ?? 0;
    const grain = s.globalStock['grain'] ?? 0;
    const iron = s.globalStock['iron_scrap'] ?? 0;
    const gems = s.globalStock['crystal_shard'] ?? 0;

    const rankNum = s.guildStats?.rank ?? 1;

    return `
      <span>\uD83E\uDE99 ${gold.toLocaleString('de')}</span>
      <span>\uD83E\uDEB5 ${wood}</span>
      <span>\uD83E\uDEA8 ${stone}</span>
      <span>\uD83C\uDF5E ${bread}</span>
      <span>\uD83C\uDF3E ${grain}</span>
      <span>\u2699\uFE0F ${iron}</span>
      <span>\uD83D\uDC8E ${gems}</span>
      <span style="color:var(--mut)">Tag ${s.day}</span>
    `;
  }

  // Auto-save every 60 seconds
  setInterval(() => {
    saveSystem.save(state);
  }, 60_000);

  // Expedition start listener
  window.addEventListener('mc:startExpedition', ((e: CustomEvent) => {
    const { routeId, heroes, provisions } = e.detail;
    startExpeditionFlow(routeId, heroes, provisions);
  }) as EventListener);

  // Route selection from dungeon map
  window.addEventListener('mc:selectRoute', ((e: CustomEvent) => {
    const { routeId } = e.detail;
    setSelectedRoute(routeId);
  }) as EventListener);

  console.log('Magic City UI loaded. State:', state.day ? `Day ${state.day}` : 'New Game');
});
