import './ui/html/magic-city.css';
import { GameState, createNewGameState } from './models/GameState';
import { SaveSystem, nutzeProbespiel } from './systems/SaveSystem';
import { istProbespiel, probespielNeu, richteProbespielEin } from './systems/Probespiel';
import { renderMainMenu } from './ui/screens/MainMenuScreen';
import { renderHeroesScreen, initHeroesScreen } from './ui/screens/HeroesScreen';
import { renderBuildingsScreen, initBuildingsScreen } from './ui/screens/BuildingsScreen';
import { renderExpeditionsScreen, initExpeditionsScreen, setSelectedRoute, refreshExpeditionsScreens } from './ui/screens/ExpeditionsScreen';
import { renderRankingScreen, initRankingScreen } from './ui/screens/RankingScreen';
import { renderBestiariumScreen, initBestiariumScreen } from './ui/screens/BestiariumScreen';
import { renderAchievementsScreen, initAchievementsScreen } from './ui/screens/AchievementsScreen';
import { renderDungeonMapScreen, initDungeonMapScreen } from './ui/screens/DungeonMapScreen';
import { CombatScreen } from './ui/screens/CombatScreen';
import { navigateTo, initScreenStyles, ScreenId } from './ui/ScreenRouter';
import { ExpeditionSystem, MERCHANT_PRICES, MERCHANT_MAX_PURCHASES } from './systems/ExpeditionSystem';
import { EncounterChoice } from './models/ExpeditionRun';
import { ITEM_DEFS } from './data/items';
import { GearSystem } from './systems/GearSystem';
import { ProvisionSystem } from './systems/ProvisionSystem';
import { ProductionSystem } from './systems/ProductionSystem';
import { EconomySystem } from './systems/EconomySystem';
import { PeopleSystem } from './systems/PeopleSystem';
import { SatisfactionSystem } from './systems/SatisfactionSystem';
import { ConnectivitySystem } from './systems/ConnectivitySystem';
import { finalizeExpeditionProgress, ExpeditionProgress } from './systems/ExpeditionFinalizer';
import { ranglistenZeilen } from './ui/components/RanglistenBilanzAnzeige';
import { setBeute, setTeilHinweise } from './systems/DungeonSets';
import { placeStartingLayout, createStartingCitizens } from './scenes/CityStartingLayout';
import { showChestReveal } from './ui/components/ChestRevealOverlay';
import { wegBilanz } from './ui/components/WegAnzeige';
import { chronikHtml, einleitungHtml, folgenHtml, geschichtsText, optionsKnopfHtml } from './ui/components/GeschichtsAnzeige';
import { einleitungGelesen, geschichtsBilanz, GeschichtsBilanz, istGeschichtsWahl, raumWahlText, ungeleseneEinleitung, wahlNachRaum } from './systems/Geschichten';
import { getRouteBauplan } from './data/routes';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  // localhost:5173/?probe: eigenes Spiel zum Ausprobieren der obersten Dungeons, eigener Speicherplatz
  const probe = istProbespiel(location.search);
  if (probe) nutzeProbespiel();
  const saveSystem = new SaveSystem();
  if (probe && probespielNeu(location.search)) {
    saveSystem.deleteSave();
    history.replaceState(null, '', `${location.pathname}?probe`);
  }

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
    if (probe) richteProbespielEin(state);
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

  // An expedition running at save time cannot be resumed (combat UI state is transient):
  // abort it and return provisions so a new expedition can be started.
  if (expeditionSystem.abortExpedition(state)) {
    console.warn('Unterbrochene Expedition abgebrochen, Proviant zurück ins Lager.');
    saveSystem.save(state);
  }

  // Every run starts at full HP (GearSystem), so stored HP is display-only:
  // heal heroes wounded by older saves.
  for (const fighter of state.fighters) {
    fighter.baseStats.hp = fighter.baseStats.maxHp;
  }

  // Initialize all screens with state
  initHeroesScreen(state);
  initBuildingsScreen(state);
  initExpeditionsScreen(state);
  initRankingScreen(state);
  initBestiariumScreen(state);
  initAchievementsScreen(state);
  initDungeonMapScreen(state);

  // Redraw the target screen on every navigation so numbers (XP, gold, rank, unlocks) are current.
  // Registered before the screens render, so screen-own mc:navigate listeners
  // (e.g. the building mind map) already see the new DOM.
  const screenRerender: Partial<Record<ScreenId, () => void>> = {
    main: () => replaceScreen('s-main', () => renderMainMenu(app, state)),
    heroes: () => replaceScreen('s-heroes', () => renderHeroesScreen(app)),
    buildings: () => replaceScreen('s-buildings', () => renderBuildingsScreen(app)),
    ranking: () => replaceScreen('s-ranking', () => renderRankingScreen(app)),
    bestiarium: () => replaceScreen('s-bestiarium', () => renderBestiariumScreen(app)),
    achievements: () => replaceScreen('s-achievements', () => renderAchievementsScreen(app)),
    dungeon: () => replaceScreen('s-dungeon', () => renderDungeonMapScreen(app)),
    // List + team screen keep their delegated listeners and the current team selection
    expeditions: refreshExpeditionsScreens,
    team: refreshExpeditionsScreens,
  };

  /** Re-render a screen in place: same DOM position, keeps the visibility set by the router. */
  function replaceScreen(id: string, render: () => void): void {
    const old = document.getElementById(id);
    if (!old) return;
    const style = old.style.cssText;
    const next = old.nextSibling;
    old.remove();
    try {
      render();
    } finally {
      // On failure keep the old screen instead of leaving a blank page
      const fresh = document.getElementById(id) ?? old;
      app!.insertBefore(fresh, next);
      fresh.style.cssText = style;
    }
  }

  window.addEventListener('mc:navigate', ((e: CustomEvent) => {
    const screen = e.detail?.screen as ScreenId;
    try {
      screenRerender[screen]?.();
    } catch (err) {
      console.error(`✗ ${screen} re-render failed:`, err);
    }
  }) as EventListener);

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

    // Geschichte: vor dem ersten Aufbruch in diesen Dungeon die Einleitung des Stadtschreibers
    const geschichte = ungeleseneEinleitung(state, routeId);
    if (geschichte) {
      showExpeditionDialog('📜', geschichte.titel, einleitungHtml(geschichte), [
        { label: 'ZURÜCK', onClick: () => {} },
        {
          label: 'AUFBRECHEN', primary: true, onClick: () => {
            einleitungGelesen(state, routeId);
            aufbrechen(routeId, heroIds, provisionMap);
          },
        },
      ]);
      return;
    }
    aufbrechen(routeId, heroIds, provisionMap);
  }

  function aufbrechen(routeId: string, heroIds: number[], provisionMap: Record<string, number>): void {
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
    saveSystem.save(state);

    // Show combat for first combat room
    showNextCombatRoom();
  }

  type ActiveRun = NonNullable<GameState['activeExpedition']>;

  interface DialogButton {
    label: string;
    primary?: boolean;
    disabled?: boolean;
    /** Entscheidung der Geschichte: die Folgen unter der Beschriftung (HTML aus GeschichtsAnzeige) */
    folgen?: string;
    onClick: () => void;
  }

  const DIALOG_BTN_BASE = "flex:1 1 140px;padding:12px;border-radius:6px;font-family:'Cinzel',serif;font-size:.8rem;letter-spacing:1px;transition:.2s;";
  const DIALOG_BTN_PRIMARY = 'background:linear-gradient(135deg,#c8a227,#7a5c08);border:1px solid #c8a227;color:#0f1420;font-weight:700;';
  const DIALOG_BTN_SECONDARY = 'background:none;border:1px solid #6b7280;color:#9ca3af;';

  /** Simple modal overlay used for all expedition decisions (checkpoint, merchant, choice). */
  function showExpeditionDialog(icon: string, title: string, bodyHtml: string, buttons: DialogButton[]): void {
    document.getElementById('expedition-dialog')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'expedition-dialog';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:200;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = "background:#0f1420;border:1px solid #c8a227;border-radius:10px;padding:28px 32px;max-width:440px;width:90%;max-height:90vh;max-height:90dvh;overflow-y:auto;text-align:center;font-family:'Cinzel',serif;";
    box.innerHTML = `
      <div style="font-size:2rem;margin-bottom:8px;">${icon}</div>
      <div style="color:#c8a227;font-size:1.1rem;letter-spacing:2px;margin-bottom:16px;">${title}</div>
      ${bodyHtml}
    `;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.disabled = !!b.disabled;
      if (b.folgen !== undefined) {
        btn.className = 'gs-option';
        btn.innerHTML = optionsKnopfHtml(b.label, b.folgen);
      } else {
        btn.textContent = b.label;
        btn.style.cssText = DIALOG_BTN_BASE + (b.primary ? DIALOG_BTN_PRIMARY : DIALOG_BTN_SECONDARY)
          + (b.disabled ? 'opacity:.4;cursor:not-allowed;' : 'cursor:pointer;');
      }
      btn.addEventListener('click', () => {
        if (b.disabled) return;
        overlay.remove();
        b.onClick();
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function partyHpHtml(run: ActiveRun): string {
    const hpTotal = run.party.reduce((s, u) => s + u.hp, 0);
    const hpMax = run.party.reduce((s, u) => s + u.maxHp, 0);
    const hpPct = hpMax > 0 ? Math.round(hpTotal / hpMax * 100) : 0;
    const hpColor = hpPct > 60 ? '#4ade80' : hpPct > 30 ? '#eab308' : '#ef4444';
    return `
      <div style="margin-bottom:20px;">
        <span style="color:${hpColor};font-size:.9rem;">Team HP: ${hpPct}%</span>
        <div style="background:#1a1a2e;border-radius:4px;height:8px;margin-top:6px;overflow:hidden;">
          <div style="background:${hpColor};height:100%;width:${hpPct}%;border-radius:4px;transition:.3s"></div>
        </div>
      </div>
    `;
  }

  /**
   * Single decision point after every room (combat or not):
   * show the pending dialog, enter the next room, or finish.
   */
  function continueExpedition(run: ActiveRun): void {
    switch (expeditionSystem.nextStep(run)) {
      case 'checkpoint': showCheckpointDialog(run); break;
      case 'merchant': showMerchantDialog(run); break;
      case 'choice': showChoiceDialog(run); break;
      // setTimeout prevents stack overflow with consecutive non-combat rooms
      case 'room': setTimeout(showNextCombatRoom, 0); break;
      case 'finish': finishExpedition(); break;
    }
  }

  function showCheckpointDialog(run: ActiveRun): void {
    showExpeditionDialog('⚑', 'CHECKPOINT ERREICHT', `
      <div style="color:#9ca3af;font-size:.85rem;margin-bottom:8px;">Raum ${run.currentRoom + 1} von ${run.rooms.length}</div>
      ${partyHpHtml(run)}
      <div style="color:#6b7280;font-size:.78rem;margin-bottom:20px;">Bei Rückzug behältst du die bisherige Beute.</div>
    `, [
      { label: 'RÜCKZUG', onClick: () => { expeditionSystem.resolveCheckpoint(run, true); finishExpedition(); } },
      { label: 'WEITER', primary: true, onClick: () => { expeditionSystem.resolveCheckpoint(run, false); continueExpedition(run); } },
    ]);
  }

  function showMerchantDialog(run: ActiveRun): void {
    const purchases = run.merchantPurchases ?? 0;
    const buyButtons: DialogButton[] = Object.entries(MERCHANT_PRICES).map(([itemId, price]) => ({
      label: `${ITEM_DEFS[itemId]?.name ?? itemId} (${price} G)`,
      disabled: run.goldEarned < price || purchases >= MERCHANT_MAX_PURCHASES,
      onClick: () => { expeditionSystem.merchantBuy(run, itemId); showMerchantDialog(run); },
    }));
    const leaveButton: DialogButton = purchases === 0
      ? { label: 'ABLEHNEN (+15% HP)', primary: true, onClick: () => { expeditionSystem.merchantSkip(run); continueExpedition(run); } }
      : { label: 'WEITERZIEHEN', primary: true, onClick: () => { expeditionSystem.merchantClose(run); continueExpedition(run); } };

    showExpeditionDialog('🛒', 'REISENDER HÄNDLER', `
      <div style="color:#9ca3af;font-size:.85rem;margin-bottom:8px;">Beutegold: ${run.goldEarned} · Käufe: ${purchases}/${MERCHANT_MAX_PURCHASES}</div>
      ${partyHpHtml(run)}
      <div style="color:#6b7280;font-size:.78rem;margin-bottom:20px;">Gekaufte Waren kommen mit der Beute ins Lager. Wer nichts kauft, wird kostenlos geheilt.</div>
    `, [...buyButtons, leaveButton]);
  }

  function showChoiceDialog(run: ActiveRun): void {
    const choice = run.pendingChoice;
    if (!choice) { continueExpedition(run); return; }
    const waehlen = (index: 0 | 1) => (): void => { expeditionSystem.resolveChoice(run, index); continueExpedition(run); };

    // Entscheidung der Geschichte: die Lage, darunter zwei Knöpfe mit ihren Folgen
    const wahl = istGeschichtsWahl(choice) ? wahlNachRaum(run.routeId, choice.roomIndex) : undefined;
    if (wahl) {
      const knopf = (c: EncounterChoice, index: 0 | 1): DialogButton =>
        ({ label: c.label, folgen: folgenHtml(run.routeId, c.wirkung ?? []), onClick: waehlen(index) });
      showExpeditionDialog('📜', wahl.titel, geschichtsText(wahl.text) + partyHpHtml(run), [
        knopf(choice.optionA, 0), knopf(choice.optionB, 1),
      ]);
      return;
    }

    const option = (c: EncounterChoice): string => `
      <div style="margin-bottom:10px;">
        <div style="color:#e5e7eb;font-size:.85rem;">${c.label}</div>
        <div style="color:#6b7280;font-size:.75rem;">${c.flavorText}</div>
      </div>`;
    // Feste Wahl-Räume der obersten Dungeons erzählen ihre Geschichte mit
    const raum = raumWahlText(run.routeId, choice.roomIndex);

    showExpeditionDialog(raum ? '📜' : '✦', raum?.titel ?? 'EURE WAHL', `
      ${raum ? geschichtsText(raum.text) : ''}
      ${partyHpHtml(run)}
      <div style="margin-bottom:20px;">${option(choice.optionA)}${option(choice.optionB)}</div>
    `, [
      { label: choice.optionA.label, primary: true, onClick: waehlen(0) },
      { label: choice.optionB.label, primary: true, onClick: waehlen(1) },
    ]);
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

      // processCurrentRoom already advanced the room or set a pending checkpoint
      combatScreen.onComplete = () => continueExpedition(run);
    } else {
      // Non-combat room: process automatically, then handle pending dialogs
      expeditionSystem.processCurrentRoom(state);
      continueExpedition(run);
    }
  }

  function finishExpedition(): void {
    const run = state.activeExpedition;
    if (!run) return;

    // Set-Teil des Dungeons: liegt nach einem Sieg mit in der Truhe (eins mehr, wenn die Geschichte es versprochen hat)
    const setHinweise = setTeilHinweise(state, setBeute(state, run));

    // Capture loot data before clearing
    const loot = { ...run.loot };

    // Bauplan: garantierter Drop beim ersten Sieg über den Routen-Boss
    const bauplanDrop = run.bossesKilled > 0 ? getRouteBauplan(run.routeId) : null;
    const neuerBauplan = bauplanDrop && !state.erhalteneBauplaene.includes(bauplanDrop) ? bauplanDrop : null;
    if (neuerBauplan) loot[neuerBauplan] = (loot[neuerBauplan] ?? 0) + 1;
    const goldEarned = run.goldEarned ?? 0;
    const hasLoot = goldEarned > 0 || Object.values(loot).some(q => q > 0);

    // XP, score + scoreboard, statistics, guild rank, bestiarium, achievements
    // (before returning provisions: leftover provisions count towards the score)
    const progress = finalizeExpeditionProgress(state, run, expeditionSystem);
    const { entry } = progress;

    // Return unused provisions to stock (gifted ones stay with the guild)
    expeditionSystem.returnProvisions(state, run);

    // Release fighters from expedition (CombatUnit.id === GuildFighter.id)
    for (const unit of run.party) {
      const fighter = state.fighters.find(f => f.id === unit.id);
      if (fighter) {
        const citizen = state.citizens.find(c => c.fighterId === fighter.id);
        if (citizen) citizen.status = 'IDLE';
      }
    }

    // Geschichte: was der Stadtschreiber festhält (der erste Sieg zählt sie als erlebt)
    const geschichte = geschichtsBilanz(state, run);

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

      // Save
      saveSystem.save(state);
      console.log(`Expedition finished: ${entry.status}, Score: ${entry.score}`);

      showExpeditionSummary(progress, geschichte, () => {
        // Reset expedition screen state and navigate back
        initExpeditionsScreen(state);
        navigateTo('expeditions');
      });
    };

    // Show chest reveal animation if there's loot
    if (hasLoot) {
      showChestReveal(loot, goldEarned, setHinweise).then(applyLootAndFinish);
    } else {
      applyLootAndFinish();
    }
  }

  /** Result dialog after the chest: score, hero XP, everything newly unlocked and the chronicle of the story. */
  function showExpeditionSummary(progress: ExpeditionProgress, geschichte: GeschichtsBilanz | null, onClose: () => void): void {
    const { entry, xp, rankUp, newClasses, newAchievements } = progress;
    const title = entry.status === 'victory' ? 'SIEG' : entry.status === 'defeat' ? 'NIEDERLAGE' : 'RÜCKZUG';
    const line = (text: string, color = '#e5e7eb'): string =>
      `<div style="color:${color};font-size:.82rem;margin-bottom:6px;">${text}</div>`;

    let body = line(`Punkte: ${entry.score.toLocaleString('de')}`, '#c8a227');
    for (const h of xp) {
      const held = state.fighters.find(f => f.id === h.id);
      const weg = held ? wegBilanz(held, h.levelUps) : '';
      const farbe = weg ? '#fcd34d' : h.levelUps > 0 ? '#4ade80' : '#9ca3af';
      body += line(`${h.name}: +${h.xp} XP${h.levelUps > 0 ? ` · Level ${h.level}!` : ''}${weg}`, farbe);
    }
    if (rankUp) {
      body += line(`${rankUp.title}!`, '#c8a227');
      for (const u of rankUp.unlocks) body += line(`Freigeschaltet: ${u}`, '#9ca3af');
    }
    for (const c of newClasses) body += line(`Neue Klasse: ${c}`, '#4ade80');
    for (const a of newAchievements) body += line(`Erfolg: ${a}`, '#4ade80');
    for (const z of ranglistenZeilen(progress.rangliste)) body += line(z.text, z.farbe);

    const chronik = geschichte ? chronikHtml(geschichte) : '';
    showExpeditionDialog(entry.status === 'victory' ? '🏆' : '⚑', title, `<div style="margin-bottom:20px;">${body}</div>${chronik}`, [
      { label: 'WEITER', primary: true, onClick: onClose },
    ]);
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
  // Sofort speichern nach Entscheidungen, die für immer gelten (Weg eines Helden)
  window.addEventListener('mc:speichern', () => saveSystem.save(state));

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
