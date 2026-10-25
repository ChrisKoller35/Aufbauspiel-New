// ─── Magic City – Ablauf einer Expedition ───────────────────────
// Vom Aufbruch bis zur Truhe: Einleitung der Geschichte, Kampfräume
// (CombatScreen), Kontrollpunkt, reisender Händler, Entscheidungen,
// zum Schluss Beute, Bilanz und die Freigabe der Helden. main.ts
// richtet den Ablauf ein (initExpeditionFlow) und startet ihn auf
// mc:startExpedition (startExpeditionFlow).
// ────────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { EncounterChoice } from '../../models/ExpeditionRun';
import { ITEM_DEFS } from '../../data/items';
import { ExpeditionSystem, MERCHANT_PRICES, MERCHANT_MAX_PURCHASES } from '../../systems/ExpeditionSystem';
import { finalizeExpeditionProgress, ExpeditionProgress } from '../../systems/ExpeditionFinalizer';
import { erfolgName, erfolgePruefen } from '../../systems/AchievementSystem';
import { setBeute, setTeilHinweise } from '../../systems/DungeonSets';
import { bereiteTeile, neuBereit, schmiedeBeute, schmiedeStufen } from '../../systems/Schmiede';
import {
  einleitungGelesen, geschichtsBilanz, GeschichtsBilanz, istGeschichtsWahl, raumWahlText, ungeleseneEinleitung, wahlNachRaum,
} from '../../systems/Geschichten';
import { navigateTo } from '../ScreenRouter';
import { CombatScreen } from './CombatScreen';
import { initExpeditionsScreen } from './ExpeditionsScreen';
import { ranglistenZeilen } from '../components/RanglistenBilanzAnzeige';
import { auftragsZeilen } from '../components/AuftragsBilanzAnzeige';
import { escapeAttr, truhenHinweise } from '../components/SchmiedeAnzeige';
import { showChestReveal } from '../components/ChestRevealOverlay';
import { wegBilanz, wegWirkungZeile } from '../components/WegAnzeige';
import { chronikHtml, einleitungHtml, flavorHtml, folgenHtml, geschichtsText } from '../components/GeschichtsAnzeige';
import { DialogButton, partyHpHtml, showExpeditionDialog } from '../components/ExpeditionsDialog';

export interface ExpeditionFlowKontext {
  app: HTMLElement;
  state: GameState;
  expeditionSystem: ExpeditionSystem;
  combatScreen: CombatScreen;
  /** Speichert den Spielstand (main.ts) */
  speichern: () => void;
}

let app: HTMLElement;
let state: GameState;
let expeditionSystem: ExpeditionSystem;
let combatScreen: CombatScreen;
let speichern: () => void;

/** Einmal beim Start (main.ts), bevor die erste Expedition aufbricht. */
export function initExpeditionFlow(kontext: ExpeditionFlowKontext): void {
  ({ app, state, expeditionSystem, combatScreen, speichern } = kontext);
}

export function startExpeditionFlow(routeId: string, heroIds: number[], provisionMap: Record<string, number>): void {
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
  speichern();

  // Erst jetzt geht es wirklich los (nach der Einleitung, nicht schon beim Klick auf Start): Klang (klang.ts)
  window.dispatchEvent(new CustomEvent('mc:aufbruch', { detail: { routeId } }));

  // Show combat for first combat room
  showNextCombatRoom();
}

type ActiveRun = NonNullable<GameState['activeExpedition']>;

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

/**
 * Was noch auf einen Sieg wartet (Beute einer mutigen Wahl, Pfandzettel, Morgengabe, ein zugesagtes
 * Set-Teil): Wer am Kontrollpunkt umkehrt, lässt es liegen, und der Dialog sagt das, statt das Gegenteil.
 */
function wartendeBeuteText(run: ActiveRun): string {
  let gold = 0;
  const dinge: Record<string, number> = {};
  for (const b of run.geschichtsBeute ?? []) {
    gold += b.gold;
    for (const [itemId, menge] of Object.entries(b.dinge)) dinge[itemId] = (dinge[itemId] ?? 0) + menge;
  }
  const teile = [
    ...(gold > 0 ? [`${gold} Gold`] : []),
    ...Object.entries(dinge).map(([itemId, menge]) => `${menge} ${ITEM_DEFS[itemId]?.name ?? itemId}`),
    ...(run.setTeilVersprochen ? ['1 Set-Teil'] : []),
  ];
  return teile.length === 0
    ? 'Bei Rückzug behältst du die bisherige Beute.'
    : `Was auf den Sieg wartet (${teile.join(', ')}), bleibt beim Rückzug liegen.`;
}

function showCheckpointDialog(run: ActiveRun): void {
  showExpeditionDialog('⚑', 'KONTROLLPUNKT ERREICHT', `
    <div style="color:#9ca3af;font-size:.85rem;margin-bottom:8px;">Raum ${run.currentRoom + 1} von ${run.rooms.length}</div>
    ${partyHpHtml(run)}
    <div style="color:#6b7280;font-size:.78rem;margin-bottom:20px;">${wartendeBeuteText(run)}</div>
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

  // Feste Wahl-Räume: jede Option steht einmal da, als Knopf mit ihrem Satz darunter (Gewinn und
  // Preis stehen in der Beschriftung); die obersten Dungeons erzählen ihre Geschichte dazu
  const raum = raumWahlText(run.routeId, choice.roomIndex);
  const knopf = (c: EncounterChoice, index: 0 | 1): DialogButton =>
    ({ label: c.label, folgen: flavorHtml(c.flavorText), onClick: waehlen(index) });

  showExpeditionDialog(raum ? '📜' : '✦', raum?.titel ?? 'EURE WAHL', `
    ${raum ? geschichtsText(raum.text) : ''}
    ${partyHpHtml(run)}
  `, [knopf(choice.optionA, 0), knopf(choice.optionB, 1)]);
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
    const allScreens = app.children;
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
  // Ton zum Ausgang (klang.ts), auch wo der Kampfbildschirm keinen zeigt: Rückzug (Horn), Rückzug aus einem schon
  // entschiedenen Kampf, letzter Raum ohne Kampf
  window.dispatchEvent(new CustomEvent('mc:expeditionsende', { detail: { status: run.status } }));

  // Set-Teil des Dungeons: liegt nach einem Sieg mit in der Truhe (eins mehr, wenn die Geschichte es versprochen hat)
  const setHinweise = setTeilHinweise(state, setBeute(state, run));
  // Material für die Schmiede: ein Sieg bringt die volle Menge, sonst nach den geschafften Räumen
  const material = schmiedeBeute(run);
  const hinweise = truhenHinweise(state, setHinweise, material?.itemId ?? null);

  // Capture loot data before clearing
  const loot = { ...run.loot };

  const goldEarned = run.goldEarned ?? 0;
  const hasLoot = goldEarned > 0 || Object.values(loot).some(q => q > 0);

  // Was in der Schmiede schon vorher ging (danach kommen Material der Zettel und die Beute dazu)
  const schonBereit = bereiteTeile(state);

  // XP, score + scoreboard, statistics, guild rank, bestiarium, achievements
  // (before returning provisions: leftover provisions count towards the score)
  const progress = finalizeExpeditionProgress(state, run, expeditionSystem);
  const { entry } = progress;

  // Return unused provisions to stock (gifted ones stay with the guild)
  expeditionSystem.returnProvisions(state, run);

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
    // Erfolge, die erst mit der Beute im Lager zählen (ganzes Set: Stern im Trophäensaal), auch in die Bilanz
    progress.newAchievements.push(...erfolgePruefen(state, { hinweis: false }).map(erfolgName));

    // Save
    speichern();
    console.log(`Expedition finished: ${entry.status}, Score: ${entry.score}`);

    showExpeditionSummary(progress, geschichte, neuBereit(state, schonBereit), () => {
      // Reset expedition screen state and navigate back
      initExpeditionsScreen(state);
      navigateTo('expeditions');
    });
  };

  // Show chest reveal animation if there's loot
  if (hasLoot) {
    showChestReveal(loot, goldEarned, hinweise, undefined, schmiedeStufen(state)).then(applyLootAndFinish);
  } else {
    applyLootAndFinish();
  }
}

/**
 * Result dialog after the chest: score, hero XP, everything newly unlocked, what the Schmiede can
 * now do (schmiede: «Rudelreisser auf +2») and the chronicle of the story.
 */
function showExpeditionSummary(progress: ExpeditionProgress, geschichte: GeschichtsBilanz | null, schmiede: string[], onClose: () => void): void {
  const { entry, xp, rankUp, newClasses, newAchievements } = progress;
  const title = entry.status === 'victory' ? 'SIEG' : entry.status === 'defeat' ? 'NIEDERLAGE' : 'RÜCKZUG';
  const line = (text: string, color = '#e5e7eb'): string =>
    `<div style="color:${color};font-size:.82rem;margin-bottom:6px;">${text}</div>`;

  let body = line(`Punkte: ${entry.score.toLocaleString('de')}`, '#c8a227');
  for (const h of xp) {
    const held = state.fighters.find(f => f.id === h.id);
    const weg = held ? wegBilanz(held, h.levelUps) : '';
    const farbe = weg ? '#fcd34d' : h.levelUps > 0 ? '#4ade80' : '#9ca3af';
    body += line(`${escapeAttr(h.name)}: +${h.xp} XP${h.levelUps > 0 ? ` · Level ${h.level}!` : ''}${weg}`, farbe);
    const wirkung = held ? wegWirkungZeile(held, h.wegWirkung) : '';
    if (wirkung) body += `<div class="weg-wirkung-zeile">${wirkung}</div>`;
  }
  if (rankUp) {
    // Was der Rang öffnet (rangFreischaltungen): Dungeons, Gebäude, Ausbau, Titel
    body += line(`${rankUp.title}!`, '#c8a227');
    for (const u of rankUp.unlocks) body += line(u, '#9ca3af');
  }
  for (const c of newClasses) body += line(`Neue Klasse: ${c}`, '#4ade80');
  for (const a of newAchievements) body += line(`🏅 Erfolg: ${a}`, '#4ade80');
  for (const z of ranglistenZeilen(progress.rangliste)) body += line(z.text, z.farbe);
  for (const z of auftragsZeilen(progress.auftraege, progress.neueTrophaee)) body += line(z.text, z.farbe);
  if (schmiede.length) body += line(`⚒️ Jetzt in der Schmiede möglich: ${schmiede.join(', ')}`, '#fbbf24');

  const chronik = geschichte ? chronikHtml(geschichte) : '';
  showExpeditionDialog(entry.status === 'victory' ? '🏆' : '⚑', title, `<div style="margin-bottom:20px;">${body}</div>${chronik}`, [
    { label: 'WEITER', primary: true, onClick: onClose },
  ]);
}
