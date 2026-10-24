import './ui/html/magic-city.css';
import { GameState, createNewGameState } from './models/GameState';
import { SaveSystem, VOR_GILDENSTADT, alterStandVerworfenBeimStart, hebeSperreNachLadenAuf, nutzeProbespiel } from './systems/SaveSystem';
import { istProbespiel, probespielNeu, probespielStufe, richteProbespielEin } from './systems/Probespiel';
import { renderMainMenu } from './ui/screens/MainMenuScreen';
import { renderHeroesScreen, initHeroesScreen } from './ui/screens/HeroesScreen';
import { renderBuildingsScreen, initBuildingsScreen } from './ui/screens/BuildingsScreen';
import { renderExpeditionsScreen, initExpeditionsScreen, setSelectedRoute, refreshExpeditionsScreens } from './ui/screens/ExpeditionsScreen';
import { renderRankingScreen, initRankingScreen } from './ui/screens/RankingScreen';
import { renderBestiariumScreen, initBestiariumScreen } from './ui/screens/BestiariumScreen';
import { renderAchievementsScreen, initAchievementsScreen } from './ui/screens/AchievementsScreen';
import { renderDungeonMapScreen, initDungeonMapScreen } from './ui/screens/DungeonMapScreen';
import { renderGildenhausScreen, initGildenhausScreen } from './ui/screens/GildenhausScreen';
import { CombatScreen } from './ui/screens/CombatScreen';
import { initExpeditionFlow, startExpeditionFlow } from './ui/screens/ExpeditionFlow';
import { vorratsZeileHtml, zeigeKopfHinweis } from './ui/screens/HeaderRenderer';
import { navigateTo, initScreenStyles, ScreenId, setzeNavigationsSperre } from './ui/ScreenRouter';
import { ExpeditionSystem } from './systems/ExpeditionSystem';
import { GearSystem } from './systems/GearSystem';
import { ProvisionSystem } from './systems/ProvisionSystem';
import { ProductionSystem } from './systems/ProductionSystem';
import { STADT_TAKT_SEKUNDEN, TAG_SEKUNDEN, neuerTag } from './systems/Tag';
import { placeStartingLayout } from './scenes/CityStartingLayout';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  // localhost:5173/?probe: eigenes Spiel zum Ausprobieren der obersten Dungeons, eigener Speicherplatz
  const probe = istProbespiel(location.search);
  const probeStufe = probespielStufe(location.search);
  if (probe) nutzeProbespiel();
  const saveSystem = new SaveSystem();
  if (probe && probespielNeu(location.search)) {
    saveSystem.deleteSave();
    history.replaceState(null, '', `${location.pathname}?probe`);
  }

  // Spielstand laden oder ein neues Spiel beginnen (ein Stand aus der Zeit vor der
  // Gildenstadt gilt wie keiner: load() liefert null, der Hinweis kommt nach dem Zeichnen)
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

  // Startgebäude (Gildenhaus, Händler) für ein neues Spiel
  if (isNewGame) {
    placeStartingLayout(state);
    if (probe) richteProbespielEin(state, probeStufe);
  }

  // Initialize game systems
  const gearSystem = new GearSystem();
  const provisionSystem = new ProvisionSystem();
  const expeditionSystem = new ExpeditionSystem(gearSystem, provisionSystem);
  const productionSystem = new ProductionSystem();

  // An expedition running at save time cannot be resumed (combat UI state is transient):
  // abort it and return provisions so a new expedition can be started.
  if (expeditionSystem.abortExpedition(state)) {
    console.warn('Unterbrochene Expedition abgebrochen, Proviant zurück ins Lager.');
    saveSystem.save(state);
  }

  // Während einer Expedition kein Bildschirmwechsel: Der Kampf läuft am Router vorbei und
  // wäre sonst versteckt, ohne Weg zurück (Tasten K, A, G, Escape und alle Knöpfe)
  setzeNavigationsSperre(() => state.activeExpedition != null);

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
  initGildenhausScreen(state);

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
    gildenhaus: () => replaceScreen('s-gildenhaus', () => renderGildenhausScreen(app)),
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

  // Neue Zettel am Auftragsbrett gleich speichern: Sie entstehen aus dem Lager von jetzt,
  // und Neuladen soll sie nicht anders würfeln (systems/Auftragsbrett.ts)
  let gespeicherterBrettTag = state.auftragsbrett?.tag.id;
  const neueZettelSpeichern = (): void => {
    const tag = state.auftragsbrett?.tag.id;
    if (!tag || tag === gespeicherterBrettTag) return;
    gespeicherterBrettTag = tag;
    saveSystem.save(state);
  };

  window.addEventListener('mc:navigate', ((e: CustomEvent) => {
    const screen = e.detail?.screen as ScreenId;
    try {
      screenRerender[screen]?.();
    } catch (err) {
      console.error(`✗ ${screen} re-render failed:`, err);
    }
    neueZettelSpeichern();
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
    ['Gildenhaus', () => renderGildenhausScreen(app)],
  ] as const;

  for (const [name, render] of screens) {
    try {
      render();
      console.log(`✓ ${name} rendered`);
    } catch (e) {
      console.error(`✗ ${name} failed:`, e);
    }
  }
  neueZettelSpeichern();

  // Combat screen (class-based, manages its own DOM)
  const combatScreen = new CombatScreen(app);
  combatScreen.setExpeditionContext(expeditionSystem, state);
  initExpeditionFlow({ app, state, expeditionSystem, combatScreen, speichern: () => saveSystem.save(state) });

  // Apply screen visibility (inline styles)
  initScreenStyles();

  // Ein alter Stand wurde beim Start verworfen: das einmal sagen, jetzt, wo es eine Kopfzeile gibt
  // (10 Sekunden: der Satz ist lang, und wer ihn verpasst, findet ihn nur noch im Fenster «Spielstand»)
  if (alterStandVerworfenBeimStart()) zeigeKopfHinweis(VOR_GILDENSTADT, 10_000);
  hebeSperreNachLadenAuf();

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // F5 speichert statt neu zu laden, auch in einem Eingabefeld (Suche im Fundbuch, Auswahl im Gildenhaus)
    if (e.key === 'F5') {
      e.preventDefault();
      saveSystem.save(state);
      console.log('Game saved.');
      return;
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

    // Während einer Expedition sperrt der Router jeden Wechsel (setzeNavigationsSperre oben).
    // Ist ein Fenster offen (Händler, Gebäude, Stadtweg, Spielstand, Fundbuch), fängt dessen Hörer in der
    // Capture-Phase die Taste vorher ab (FensterHilfen.fensterTaste): Escape schliesst dann nur das Fenster.
    switch (e.key.toUpperCase()) {
      case 'K': navigateTo('bestiarium'); break;
      case 'A': navigateTo('achievements'); break;
      case 'G': navigateTo('gildenhaus'); break;
      case 'ESCAPE': navigateTo('main'); break;
    }
  });

  // ─── Takt der Stadt (systems/Tag.ts) ────────────────────────────
  let lastTickTime = performance.now();

  setInterval(() => {
    const now = performance.now();
    const deltaSec = (now - lastTickTime) / 1000;
    lastTickTime = now;

    // Stadt-Takt: die Werkstätten arbeiten
    state.cityTickAccumulator += deltaSec;
    while (state.cityTickAccumulator >= STADT_TAKT_SEKUNDEN) {
      state.cityTickAccumulator -= STADT_TAKT_SEKUNDEN;
      productionSystem.update(state, STADT_TAKT_SEKUNDEN);
    }

    // Tageswechsel
    state.dayTickAccumulator += deltaSec;
    while (state.dayTickAccumulator >= TAG_SEKUNDEN) {
      state.dayTickAccumulator -= TAG_SEKUNDEN;
      neuerTag(state);
    }

    updateResourceDisplays(state);
  }, 1000);

  /** Vorrats-Anzeige in jeder sichtbaren Kopfzeile neu schreiben (HeaderRenderer.vorratsZeileHtml) */
  function updateResourceDisplays(s: GameState): void {
    const resBars = document.querySelectorAll('.res');
    for (let i = 0; i < resBars.length; i++) {
      const bar = resBars[i] as HTMLElement;
      // Only update if bar is visible (parent screen is displayed)
      if (!bar.offsetParent) continue;
      bar.innerHTML = vorratsZeileHtml(s);
    }
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
