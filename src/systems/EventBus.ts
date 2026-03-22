// ─── Magic City – Typed EventBus ──────────────────────────────────
// Lightweight publish/subscribe bus for inter-system communication.
// No external dependencies, pure TypeScript generics.
// ──────────────────────────────────────────────────────────────────

import { SidebarAction } from '../ui/html/HTMLSidebar';

// ─── Event Map ───────────────────────────────────────────────────
// Every cross-system event with its typed payload.

export interface GameEventMap {
  // ── Building Events ──
  'building:placed':      { buildingId: number };
  'building:demolished':  { buildingId: number };
  'building:upgraded':    { buildingId: number };
  'building:selected':    { buildingId: number };
  'building:deselected':  {};

  // ── Build Mode Events ──
  'mode:changed':         { mode: string; previousMode: string };
  'mode:buildingSelected':{ typeId: string | null };

  // ── Expedition Events ──
  'expedition:started':   {
    routeId: string;
    fighterIds: number[];
    difficulty: string;
    modifierId: string | null;
    fromDungeon: boolean;
    consumables?: string[];
  };
  'expedition:returned':  {};
  'expedition:combatTarget': { enemyId: number };

  // ── City Events ──
  'cityevent:tradeAccepted': {};

  // ── Tutorial ──
  'tutorial:completed':   {};

  // ── Sidebar ──
  'sidebar:action':       { action: SidebarAction };

  // ── UI Panel Lifecycle ──
  'ui:panel:open':        { panel: string };
  'ui:panel:close':       { panel: string };

  // ── State Change (broad notification for HUD/rendering refresh) ──
  'state:changed':        {};
}

export type GameEvent = keyof GameEventMap;

// ─── EventBus Class ──────────────────────────────────────────────

type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventHandler<any>>>();

  /**
   * Subscribe to an event.
   * @returns An unsubscribe function — call it to remove this listener.
   */
  on<K extends GameEvent>(
    event: K,
    handler: EventHandler<GameEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  /** Unsubscribe a specific handler. */
  off<K extends GameEvent>(
    event: K,
    handler: EventHandler<GameEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(handler);
  }

  /** Emit an event to all subscribed handlers. */
  emit<K extends GameEvent>(
    event: K,
    payload: GameEventMap[K],
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /** Remove all listeners (for scene teardown / restart). */
  clear(): void {
    this.listeners.clear();
  }
}

// ─── Singleton ───────────────────────────────────────────────────
// One global instance. Reset via resetEventBus() on scene restart.

let _instance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!_instance) _instance = new EventBus();
  return _instance;
}

export function resetEventBus(): void {
  _instance?.clear();
  _instance = null;
}
