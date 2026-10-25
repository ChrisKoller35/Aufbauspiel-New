// ============================================================
// Magic City – CombatScreen
// Migrated from _legacy/ui/HTMLCombatOverlay.ts.
// All Phaser and SoundManager dependencies removed.
// Camera shake replaced with CSS animation on #app.
// ============================================================

import { ExpeditionRun, CombatUnit, CombatSkill, EncounterRoom, CombatRoundSnapshot, WegZustand } from '../../models/ExpeditionRun';
import { ExpeditionSystem } from '../../systems/ExpeditionSystem';
import { bossWut, wutAbRunde } from '../../systems/CombatEngine';
import { GameState } from '../../models/GameState';
import { ROUTE_DEFS, ROUTE_IMAGE_MAP } from '../../data/routes';
import { CLASS_DEFS, HERO_IMAGE_MAP } from '../../data/classes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ITEM_DEFS, getItemSpriteKey } from '../../data/items';
import { SPECIAL_EFFECT_DEFS } from '../../data/specialEffects';
import { getSet } from '../../data/dungeonSets';
import { getSpezialisierung } from '../../data/spezialisierungen';
import { getLogLineColor } from '../../rendering/Colors';
import { istGeschichtsBeuteZeile } from '../../systems/Geschichten';
import { klangKnopfHtml } from '../components/KlangSchalter';

/** Ab dieser Breite gilt das PC-Layout des Kampfes (darunter eigene Regeln fürs Handy). */
const PC_BREITE = '(min-width: 701px)';
/** Bildgrösse der Einheiten am PC: so gross wie Platz ist, zwischen diesen Werten. */
const BILD_MAX = 230;
const BILD_MIN = 84;

type CombatPhase = 'preview' | 'animating' | 'result';

interface UnitEntry {
  el: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  /** ATK/DEF/SPD-Zeile: wird nach einem Trank in der Vorschau neu geschrieben */
  statsEl: HTMLElement;
  unitId: number;
}

/** Die Werte-Zeile einer Einheit in der Kampfkarte */
function statsText(unit: CombatUnit): string {
  return `ATK:${unit.atk} DEF:${unit.def} SPD:${unit.spd.toFixed(1)}`;
}

// ─── CSS Shake (replaces Phaser camera.shake) ────────────────

function shakeScreen(duration: number, _intensity: number): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.style.animation = `mc-shake ${duration}ms ease-in-out`;
  setTimeout(() => { app.style.animation = ''; }, duration);
}

// ─── CombatScreen Class ──────────────────────────────────────

/** HTML-based Combat Overlay. Mounts into #s-combat screen container. */
export class CombatScreen {
  private readonly el: HTMLElement;
  private phase: CombatPhase = 'preview';
  private combatSpeed: number = 1.0;

  // Expedition context
  private expSystem: ExpeditionSystem | null = null;
  private expState: GameState | null = null;
  private expRun: ExpeditionRun | null = null;
  private previewRoom: EncounterRoom | null = null;

  // Pre-combat HP snapshot
  private preHpMap = new Map<number, number>();

  // Länge des Kampfprotokolls vor diesem Raum: was danach dazukommt, gehört zu diesem Kampf
  private logStart = 0;

  // Unit entries (DOM refs)
  private partyEntries: UnitEntry[] = [];
  private enemyEntries: UnitEntry[] = [];

  // Ability selection
  private selectedAbilities = new Map<number, string>();

  // Pre-combat targeting
  private preTargetEnemyId: number | null = null;

  // DOM refs
  private titleEl!: HTMLElement;
  private roomInfoEl!: HTMLElement;
  private partyColEl!: HTMLElement;
  private enemyColEl!: HTMLElement;
  private abilitiesAreaEl: HTMLElement | null = null;
  private itemsAreaEl: HTMLElement | null = null;
  private enemySkillsAreaEl: HTMLElement | null = null;
  private logLinesEl!: HTMLElement;
  private actionsEl!: HTMLElement;
  private airShieldEl: HTMLElement | null = null;
  private fortBarEl: HTMLElement | null = null;
  private previewStripEl!: HTMLElement;

  // Pending setTimeout IDs for cleanup
  private timers: ReturnType<typeof setTimeout>[] = [];

  // Public callbacks
  public onFightClicked?: () => void;
  public onComplete?: () => void;
  public onPreCombatTarget?: (enemyId: number) => void;
  public onRetreat?: () => void;

  constructor(container: HTMLElement) {
    // Create the screen wrapper inside the given container
    const screenEl = document.createElement('div');
    screenEl.id = 's-combat';
    screenEl.className = 'screen';
    screenEl.style.cssText = 'display:none;flex-direction:column;width:100vw;height:100vh;overflow-y:auto;overflow-x:hidden;background:#060810;';
    container.appendChild(screenEl);

    // Inner overlay element
    const root = document.createElement('div');
    root.className = 'mc-combat-overlay';
    screenEl.appendChild(root);
    this.el = root;

    this.buildDOM();
    let geplant = false;
    window.addEventListener('resize', () => {
      if (geplant || !this.isVisible()) return;
      geplant = true;
      requestAnimationFrame(() => { geplant = false; this.passeKartenAn(); });
    });
  }

  setExpeditionContext(system: ExpeditionSystem, state: GameState): void {
    this.expSystem = system;
    this.expState = state;
  }

  // ─── DOM Builder ──────────────────────────────────────────

  private buildDOM(): void {
    this.el.innerHTML = `
      <div class="mc-co-header">
        <div class="mc-co-title-group">
          <span class="mc-co-title">KAMPF</span>
          <span class="mc-co-room-info"></span>
        </div>
        <div class="mc-co-speed-group">
          <button class="mc-co-speed active" data-speed="1">x1</button>
          <button class="mc-co-speed" data-speed="1.5">x1.5</button>
          <button class="mc-co-speed" data-speed="2">x2</button>
          ${klangKnopfHtml('mc-co-klang')}
        </div>
      </div>
      <div class="mc-co-air-shield" hidden style="
        display:flex; align-items:center; gap:10px;
        padding:4px 14px 5px;
        background:#071020;
        border-bottom:1px solid #0d2a4a;
        flex-shrink:0;
      ">
        <span style="font-size:13px; color:#90CAF9; white-space:nowrap;">🫁 Luft</span>
        <div style="flex:1; height:8px; background:#0a1a2a; border-radius:4px; overflow:hidden; min-width:80px;">
          <div class="mc-co-air-fill" style="height:100%; width:100%; background:#2196F3; border-radius:4px; transition:width 0.3s, background 0.3s;"></div>
        </div>
        <span class="mc-co-air-value" style="font-size:12px; color:#90CAF9; white-space:nowrap; min-width:60px; text-align:right;">100 / 100</span>
      </div>
      <div class="mc-co-fort-bar" hidden style="
        display:flex; align-items:center; gap:10px;
        padding:4px 14px 5px;
        background:#1a0a0a;
        border-bottom:1px solid #4a1a0a;
        flex-shrink:0;
      ">
        <span class="mc-co-fort-name" style="font-size:13px; color:#FF8C00; white-space:nowrap;">🏰 Festung</span>
        <div style="flex:1; height:8px; background:#2a1000; border-radius:4px; overflow:hidden; min-width:80px;">
          <div class="mc-co-fort-fill" style="height:100%; width:100%; background:#FF6600; border-radius:4px; transition:width 0.3s, background 0.3s;"></div>
        </div>
        <span class="mc-co-fort-value" style="font-size:12px; color:#FF8C00; white-space:nowrap; min-width:60px; text-align:right;">100 / 100</span>
      </div>
      <div class="mc-co-body">
        <div class="mc-co-party-col mc-co-col"></div>
        <div class="mc-co-enemy-col mc-co-col"></div>
      </div>
      <div class="mc-co-preview-strip"></div>
      <div class="mc-co-log-area">
        <div class="mc-co-log-header">Kampfprotokoll</div>
        <div class="mc-co-log-lines"></div>
      </div>
      <div class="mc-co-actions-area"></div>
    `;

    this.titleEl = this.el.querySelector('.mc-co-title')!;
    this.roomInfoEl = this.el.querySelector('.mc-co-room-info')!;
    this.partyColEl = this.el.querySelector('.mc-co-party-col')!;
    this.enemyColEl = this.el.querySelector('.mc-co-enemy-col')!;
    this.logLinesEl = this.el.querySelector('.mc-co-log-lines')!;
    this.actionsEl = this.el.querySelector('.mc-co-actions-area')!;
    this.airShieldEl = this.el.querySelector('.mc-co-air-shield');
    this.fortBarEl = this.el.querySelector('.mc-co-fort-bar');
    this.previewStripEl = this.el.querySelector('.mc-co-preview-strip')!;

    // Speed button wiring
    Array.from(this.el.querySelectorAll<HTMLElement>('.mc-co-speed')).forEach(btn => {
      btn.addEventListener('click', () => {
        this.combatSpeed = parseFloat(btn.dataset.speed ?? '1');
        this.updateSpeedButtons();
      });
    });
  }

  // ─── Show / Hide ──────────────────────────────────────────

  /** Show the combat screen for a given room. */
  show(run: ExpeditionRun, roomIndex: number): void {
    this.phase = 'preview';
    this.preTargetEnemyId = null;
    this.clearTimers();
    this.selectedAbilities.clear();

    const room = run.rooms[roomIndex];
    const isBoss = room.type === 'boss';

    this.titleEl.textContent = isBoss ? 'BOSS KAMPF!' : 'KAMPF';
    this.titleEl.style.color = isBoss ? 'var(--mc-damage)' : 'var(--mc-accent-expedition)';
    // Bossmusik und boss_intro (klang.ts)
    if (isBoss) window.dispatchEvent(new CustomEvent('mc:bosskampf'));
    this.roomInfoEl.textContent = `Raum ${roomIndex + 1} / ${run.rooms.length}`;

    this.logStart = run.combatLog.length;

    // HP snapshot
    this.preHpMap.clear();
    for (const u of run.party) this.preHpMap.set(u.id, u.hp);
    for (const e of room.enemies) this.preHpMap.set(e.id, e.hp);

    this.expRun = run;
    this.previewRoom = room;

    // Air Shield (Unterwasser)
    const isUnderwater = ROUTE_DEFS[run.routeId]?.isUnderwater ?? false;
    if (this.airShieldEl) {
      if (isUnderwater) {
        this.airShieldEl.removeAttribute('hidden');
        this.airShieldEl.style.display = 'flex';
        this.updateAirDisplay(run.airShield ?? run.airShieldMax ?? 100, run.airShieldMax ?? 100);
      } else {
        this.airShieldEl.setAttribute('hidden', '');
        this.airShieldEl.style.display = 'none';
      }
    }

    // Fortification bar (Belagerung)
    const isFortRoom = room.type === 'fortification';
    if (this.fortBarEl) {
      if (isFortRoom && room.fortification) {
        this.fortBarEl.removeAttribute('hidden');
        this.fortBarEl.style.display = 'flex';
        const nameEl = this.fortBarEl.querySelector('.mc-co-fort-name') as HTMLElement | null;
        if (nameEl) nameEl.textContent = `🏰 ${room.fortification.name}`;
        this.updateFortDisplay(room.fortification.hp, room.fortification.maxHp);
      } else {
        this.fortBarEl.setAttribute('hidden', '');
        this.fortBarEl.style.display = 'none';
      }
    }

    this.clearDisplays();
    // Include war machine unit in party column if present
    const partyWithWM = run.warMachineUnit ? [...run.party, run.warMachineUnit] : run.party;
    this.buildPartyDisplays(partyWithWM);
    this.buildEnemyDisplays(room.enemies);
    this.updateLog([]);
    this.buildAbilitySection(run, room);
    this.buildItemSection(run, room);
    this.showPreviewActions();
    this.updateSpeedButtons();

    // Show the screen
    const screenEl = document.getElementById('s-combat');
    if (screenEl) {
      screenEl.style.cssText = 'display:flex;flex-direction:column;width:100vw;height:100vh;overflow-y:auto;overflow-x:hidden;background:#060810;';
    }
    // Set route background image on overlay
    const routeImg = ROUTE_IMAGE_MAP[run.routeId];
    if (routeImg) {
      this.el.style.backgroundImage = `url('assets/tiles/${routeImg}.png')`;
      this.el.style.backgroundSize = 'cover';
      this.el.style.backgroundPosition = 'center';
      this.el.style.backgroundColor = 'transparent';
    } else {
      this.el.style.backgroundImage = 'none';
      this.el.style.backgroundColor = '#060810';
    }
    this.passeKartenAn();
  }

  hide(): void {
    this.clearTimers();
    this.clearDisplays();
    const screenEl = document.getElementById('s-combat');
    if (screenEl) {
      screenEl.style.cssText = 'display:none;';
    }
  }

  isVisible(): boolean {
    const screenEl = document.getElementById('s-combat');
    return screenEl ? screenEl.style.display !== 'none' : false;
  }

  /**
   * Am PC: Bilder der Einheiten so gross wie möglich (höchstens 230 px), aber so,
   * dass alle Karten einer Spalte ganz sichtbar sind, auch in kleinen Fenstern und
   * mit Fähigkeiten und Vorräten unter dem Kampffeld. Die Grösse kommt als
   * `--mc-co-bild` an die Spalte (magic-city.css); sie bleibt während des Kampfes gleich.
   */
  private passeKartenAn(): void {
    if (!window.matchMedia(PC_BREITE).matches) return;
    for (const col of [this.partyColEl, this.enemyColEl]) {
      const karten = Array.from(col.children).filter((k): k is HTMLElement => k.classList.contains('mc-co-unit'));
      if (karten.length === 0 || col.clientHeight === 0) continue;
      col.style.removeProperty('--mc-co-bild');
      const stil = getComputedStyle(col);
      const abstand = parseFloat(stil.rowGap) || 10;
      const breite = col.clientWidth - parseFloat(stil.paddingLeft) - parseFloat(stil.paddingRight);
      let hoehe = col.clientHeight - parseFloat(stil.paddingTop) - parseFloat(stil.paddingBottom);
      // Andere Kästen (Gegnerfähigkeiten) stehen in einer eigenen Zeile darunter
      for (const k of Array.from(col.children) as HTMLElement[]) {
        if (!karten.includes(k)) hoehe -= k.offsetHeight + abstand;
      }
      // Was die Karte um das Bild herum braucht (Rand, Name, Werte, Leben)
      const bild = karten[0].querySelector<HTMLElement>('.mc-co-sprite, .mc-co-sprite-fallback');
      const randBreite = bild ? karten[0].offsetWidth - bild.offsetWidth : 30;
      const randHoehe = bild ? karten[0].offsetHeight - bild.offsetHeight : 92;
      // Beste Aufteilung in Spalten und Reihen suchen
      let groesse = BILD_MIN;
      for (let spalten = 1; spalten <= karten.length; spalten++) {
        const reihen = Math.ceil(karten.length / spalten);
        const proKarteBreit = Math.floor((breite - (spalten - 1) * abstand) / spalten) - randBreite;
        const proKarteHoch = Math.floor((hoehe - (reihen - 1) * abstand) / reihen) - randHoehe;
        groesse = Math.max(groesse, Math.min(proKarteBreit, proKarteHoch));
      }
      groesse = Math.min(BILD_MAX, groesse);
      col.style.setProperty('--mc-co-bild', `${groesse}px`);
      // Bricht Text bei kleinen Karten um, wird die Karte höher: nachmessen
      for (let i = 0; i < 12 && groesse > BILD_MIN && col.scrollHeight > col.clientHeight + 1; i++) {
        groesse = Math.max(BILD_MIN, groesse - 8);
        col.style.setProperty('--mc-co-bild', `${groesse}px`);
      }
    }
  }

  /** No-op: HTML panels are always screen-space. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* no-op */ }

  // ─── Speed Buttons ────────────────────────────────────────

  private updateSpeedButtons(): void {
    Array.from(this.el.querySelectorAll<HTMLElement>('.mc-co-speed')).forEach(btn => {
      const s = parseFloat(btn.dataset.speed ?? '1');
      btn.classList.toggle('active', s === this.combatSpeed);
    });
  }

  // ─── Air Shield Display ───────────────────────────────────

  private updateAirDisplay(current: number, max: number): void {
    if (!this.airShieldEl) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    const fill = this.airShieldEl.querySelector('.mc-co-air-fill') as HTMLElement | null;
    const label = this.airShieldEl.querySelector('.mc-co-air-value') as HTMLElement | null;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = pct > 50 ? '#2196F3' : pct > 25 ? '#FF9800' : '#F44336';
    }
    if (label) {
      label.textContent = `${Math.round(current)} / ${Math.round(max)}`;
      label.style.color = pct <= 0 ? '#F44336' : pct <= 25 ? '#FF9800' : '#90CAF9';
    }
  }

  // ─── Fortification Bar ────────────────────────────────────

  private updateFortDisplay(current: number, max: number): void {
    if (!this.fortBarEl) return;
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    const fill = this.fortBarEl.querySelector('.mc-co-fort-fill') as HTMLElement | null;
    const label = this.fortBarEl.querySelector('.mc-co-fort-value') as HTMLElement | null;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.style.background = pct > 50 ? '#FF6600' : pct > 25 ? '#FF4400' : '#CC2200';
    }
    if (label) {
      label.textContent = `${Math.max(0, Math.round(current))} / ${Math.round(max)}`;
    }
  }

  // ─── Unit Displays ────────────────────────────────────────

  private buildPartyDisplays(party: CombatUnit[]): void {
    this.partyColEl.innerHTML = '';
    this.partyEntries = [];
    for (const unit of party) {
      const entry = this.createUnitCard(unit, false);
      this.partyColEl.appendChild(entry.el);
      this.partyEntries.push(entry);
    }
  }

  private buildEnemyDisplays(enemies: CombatUnit[]): void {
    this.enemyColEl.innerHTML = '';
    this.enemyEntries = [];
    for (const unit of enemies) {
      const entry = this.createUnitCard(unit, true);
      // Enemy targeting click
      entry.el.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        this.setPreCombatTarget(unit.id);
      });
      entry.el.style.cursor = 'pointer';
      entry.el.title = 'Klicken = Fokus-Ziel';
      this.enemyColEl.appendChild(entry.el);
      this.enemyEntries.push(entry);
    }
  }

  private createUnitCard(unit: CombatUnit, isEnemy: boolean): UnitEntry {
    const card = document.createElement('div');
    card.className = `mc-co-unit${unit.hp <= 0 ? ' is-dead' : ''}`;
    card.dataset.unitId = String(unit.id);

    // Sprite — for heroes use portrait, for enemies use sprite
    const resolvedSpriteKey = unit.spriteKey
      ?? (unit.classId ? CLASS_DEFS[unit.classId]?.spriteKey : undefined)
      ?? (unit.defId ? ENEMY_DEFS[unit.defId]?.spriteKey : undefined)
      ?? '';
    const heroImg = unit.classId ? HERO_IMAGE_MAP[unit.classId] : undefined;
    const spriteEl = document.createElement('img');
    spriteEl.className = 'mc-co-sprite';
    spriteEl.src = heroImg
      ? `assets/heroes/${heroImg}.png`
      : `assets/sprites/final/${resolvedSpriteKey}.png`;
    spriteEl.width = 230;
    spriteEl.height = 230;
    if (heroImg) spriteEl.style.objectFit = 'cover';
    spriteEl.onerror = () => {
      // Fallback: initials
      const fallback = document.createElement('div');
      fallback.className = 'mc-co-sprite-fallback';
      fallback.textContent = unit.name.substring(0, 2).toUpperCase();
      fallback.style.color = isEnemy ? 'var(--mc-damage)' : 'var(--mc-info)';
      card.replaceChild(fallback, spriteEl);
    };

    // Info block
    const info = document.createElement('div');
    info.className = 'mc-co-unit-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'mc-co-unit-name';
    nameEl.style.color = isEnemy ? 'var(--mc-damage)' : 'var(--mc-light)';
    nameEl.textContent = unit.name;

    const statsEl = document.createElement('div');
    statsEl.className = 'mc-co-unit-stats';
    statsEl.textContent = statsText(unit);

    // Boss: ab wann er wütet, mit der Sonnenuhr (run.bossWutFrueher) früher. Der Preis einer Wahl muss
    // sofort zu sehen sein, wie die Hort-Gier in den Werten.
    const wut = isEnemy && this.previewRoom?.type === 'boss' ? bossWut(unit.defId) : undefined;
    const wutEl = wut && this.expRun ? document.createElement('div') : null;
    if (wutEl && wut) {
      wutEl.className = 'mc-co-unit-stats mc-co-unit-wut';
      wutEl.textContent = `Wut ab Runde ${wutAbRunde(wut, this.expRun!)}`;
      wutEl.title = `Ab dieser Runde: Angriff ×${wut.atkMult}, Tempo ×${wut.spdMult}`;
    }

    const hpText = document.createElement('div');
    hpText.className = 'mc-co-unit-hp';
    hpText.textContent = `${Math.max(0, unit.hp)} / ${unit.maxHp}`;
    this.colorHpText(hpText, unit.hp, unit.maxHp);

    // HP bar
    const barTrack = document.createElement('div');
    barTrack.className = 'mc-bar-track mc-co-hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'mc-bar-fill mc-bar-hp';
    hpFill.style.width = `${unit.maxHp > 0 ? Math.min(100, Math.max(0, unit.hp) / unit.maxHp * 100) : 0}%`;
    barTrack.appendChild(hpFill);

    // Effect badges: Gegenstands-Effekte mit Kürzel, Set-Fähigkeiten mit dem Zeichen des Sets,
    // der Weg des Helden golden mit seinem Zeichen
    if (unit.specialEffects && unit.specialEffects.length > 0) {
      const badges = document.createElement('div');
      badges.className = 'mc-co-badges';
      const gezeigteSets = new Set<string>();
      const gezeigteWege = new Set<string>();
      for (const eff of unit.specialEffects) {
        if (eff.weg) {
          const weg = getSpezialisierung(eff.weg);
          if (!weg || gezeigteWege.has(weg.id)) continue;
          gezeigteWege.add(weg.id);
          const badge = document.createElement('span');
          badge.className = 'mc-co-badge mc-co-badge-weg';
          badge.textContent = weg.zeichen;
          badge.title = `★ ${weg.name}: ${weg.kurz}`;
          badge.dataset.zeichen = badge.textContent;
          badge.dataset.titel = badge.title;
          badges.appendChild(badge);
          continue;
        }
        const def = SPECIAL_EFFECT_DEFS[eff.id];
        if (!def) continue;
        const set = eff.set ? getSet(eff.set) : undefined;
        if (set && gezeigteSets.has(set.id)) continue;
        const badge = document.createElement('span');
        badge.className = set ? 'mc-co-badge mc-co-badge-set' : 'mc-co-badge';
        if (set) {
          gezeigteSets.add(set.id);
          badge.textContent = set.zeichen;
          badge.title = `${set.name}: ${set.dreiTeile.name} – ${set.dreiTeile.text}`;
        } else {
          badge.textContent = def.name.substring(0, 3).toUpperCase();
          badge.title = `${def.name}: ${def.description}`;
        }
        badges.appendChild(badge);
      }
      info.appendChild(badges);
    }

    info.appendChild(nameEl);
    info.appendChild(statsEl);
    if (wutEl) info.appendChild(wutEl);
    info.appendChild(hpText);
    info.appendChild(barTrack);

    card.appendChild(spriteEl);
    card.appendChild(info);

    return { el: card, hpFill, hpText, statsEl, unitId: unit.id };
  }

  private colorHpText(el: HTMLElement, hp: number, maxHp: number): void {
    const pct = maxHp > 0 ? hp / maxHp : 0;
    el.style.color = pct > 0.5 ? 'var(--mc-heal)' : pct > 0.2 ? 'var(--mc-gold-bright)' : 'var(--mc-damage)';
  }

  private setPreCombatTarget(enemyId: number): void {
    this.preTargetEnemyId = enemyId;
    for (const entry of this.enemyEntries) {
      entry.el.classList.toggle('is-targeted', entry.unitId === enemyId);
    }
    this.onPreCombatTarget?.(enemyId);
  }

  // ─── Retreat Button Helper ─────────────────────────────────

  private createRetreatButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-co-retreat-btn';
    btn.textContent = 'Rückzug';
    btn.addEventListener('click', () => {
      this.hide();
      this.onRetreat?.();
    });
    return btn;
  }

  // ─── Preview: Actions ─────────────────────────────────────

  private showPreviewActions(): void {
    this.actionsEl.innerHTML = '';

    const focusHint = document.createElement('span');
    focusHint.className = 'mc-co-focus-hint';
    focusHint.textContent = 'Klick auf Gegner = Fokus';

    const btnRow = document.createElement('div');
    btnRow.className = 'mc-co-btn-row';

    const retreatBtn = this.createRetreatButton();

    const fightBtn = document.createElement('button');
    fightBtn.className = 'mc-btn mc-co-fight-btn';
    fightBtn.textContent = 'Kampf starten!';
    fightBtn.addEventListener('click', () => {
      if (this.phase !== 'preview') return;
      this.phase = 'animating';
      // Apply queued ability selections
      const run = this.expRun;
      const room = this.previewRoom;
      if (this.expSystem && run && room) {
        for (const [unitId, skillId] of this.selectedAbilities) {
          this.expSystem.useAbilityInPreview(run, unitId, skillId, room);
        }
      }
      this.selectedAbilities.clear();
      // Remove preview sections
      this.abilitiesAreaEl?.remove();
      this.abilitiesAreaEl = null;
      this.itemsAreaEl?.remove();
      this.itemsAreaEl = null;
      this.onFightClicked?.();
    });

    btnRow.appendChild(retreatBtn);
    btnRow.appendChild(fightBtn);

    this.actionsEl.appendChild(focusHint);
    this.actionsEl.appendChild(btnRow);
  }

  // ─── Preview: Abilities ───────────────────────────────────

  private buildAbilitySection(run: ExpeditionRun, room: EncounterRoom): void {
    this.abilitiesAreaEl?.remove();
    this.abilitiesAreaEl = null;

    const routeTier = ROUTE_DEFS[run.routeId]?.tier ?? 1;
    if (routeTier < 2) return;

    const area = document.createElement('div');
    area.className = 'mc-co-abilities-area';
    this.abilitiesAreaEl = area;
    // Always first in the strip, also when rebuilt after a click (provisions stay below)
    this.previewStripEl.prepend(area);

    const divider = document.createElement('div');
    divider.className = 'mc-co-section-divider';
    divider.textContent = 'Fähigkeiten — 1× pro Mission wählbar';
    area.appendChild(divider);

    const cols = document.createElement('div');
    cols.className = 'mc-co-ability-cols';

    for (const unit of run.party) {
      if (unit.skills.length === 0) continue;

      const alreadyUsed = !!run.abilitiesUsed[unit.id];
      const isDead = unit.hp <= 0;
      const canInteract = !alreadyUsed && !isDead;

      const col = document.createElement('div');
      col.className = 'mc-co-ability-col';

      const heroName = document.createElement('div');
      heroName.className = 'mc-co-ability-hero';
      heroName.textContent = unit.name;
      heroName.style.color = isDead || alreadyUsed ? 'var(--mc-dim)' : 'var(--mc-gold)';
      col.appendChild(heroName);

      for (const skill of unit.skills) {
        const btn = this.createAbilityButton(unit, skill, alreadyUsed, isDead, canInteract, run, room);
        col.appendChild(btn);
      }

      cols.appendChild(col);
    }
    area.appendChild(cols);
  }

  private createAbilityButton(
    unit: CombatUnit, skill: CombatSkill,
    alreadyUsed: boolean, isDead: boolean, canInteract: boolean,
    run: ExpeditionRun, room: EncounterRoom,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'mc-co-ability-btn';
    btn.disabled = !canInteract;

    const isSelected = this.selectedAbilities.get(unit.id) === skill.id;

    if (isDead || alreadyUsed) {
      btn.classList.add('used');
      btn.textContent = alreadyUsed ? `✓ ${skill.name}` : skill.name;
    } else if (isSelected) {
      btn.classList.add('selected');
      btn.textContent = `▶ ${skill.name}`;
    } else {
      btn.textContent = skill.name;
    }

    if (canInteract) {
      const tooltipLines = this.buildAbilityTooltip(skill);
      btn.title = tooltipLines.join('\n');

      btn.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        if (this.selectedAbilities.get(unit.id) === skill.id) {
          this.selectedAbilities.delete(unit.id);
        } else {
          this.selectedAbilities.set(unit.id, skill.id);
        }
        this.buildAbilitySection(run, room);
      });
    }

    return btn;
  }

  private buildAbilityTooltip(skill: CombatSkill): string[] {
    const effectLabels: Record<string, string> = {
      damage: 'Schaden', heal: 'Heilung', taunt: 'Provokation',
      buff: 'Buff', aoe: 'Flächenschaden', summon: 'Beschwörung',
    };
    const lines = [
      skill.name,
      `Typ: ${effectLabels[skill.effectType] ?? skill.effectType}`,
      `Cooldown: ${skill.cooldown} Runden`,
      `Stärke: ${skill.power}${skill.effectType === 'damage' || skill.effectType === 'aoe' ? '× ATK' : ''}`,
    ];
    for (const cls of Object.values(CLASS_DEFS)) {
      const found = cls.skills.find(s => s.id === skill.id);
      if (found?.description) { lines.push('', found.description); break; }
    }
    return lines;
  }

  // ─── Preview: Items ───────────────────────────────────────

  private buildItemSection(run: ExpeditionRun, room?: EncounterRoom): void {
    // Rebuild only the provisions area: the abilities area in the same strip stays
    // (clearing the whole strip here used to remove the hero abilities on every show)
    this.itemsAreaEl?.remove();
    this.itemsAreaEl = null;
    this.enemySkillsAreaEl?.remove();
    this.enemySkillsAreaEl = null;

    // Enemy skills in enemy column (right side)
    if (room) {
      const mitSkills = room.enemies.filter(u => u.hp > 0 && u.skills.length > 0);
      if (mitSkills.length > 0) {
        const enemyArea = document.createElement('div');
        enemyArea.className = 'mc-co-items-area';
        this.enemySkillsAreaEl = enemyArea;
        this.enemyColEl.appendChild(enemyArea);

        const divider = document.createElement('div');
        divider.className = 'mc-co-section-divider';
        divider.style.color = 'var(--mc-damage)';
        divider.textContent = 'Gegnerfähigkeiten';
        enemyArea.appendChild(divider);

        for (const unit of mitSkills) {
          const kurz = unit.name.split(',')[0]; // «Sunna» statt «Sunna, die T»
          for (const skill of unit.skills) {
            const line = document.createElement('div');
            line.className = 'mc-co-enemy-skill';
            line.textContent = mitSkills.length === 1 ? `• ${skill.name}` : `• ${kurz}: ${skill.name}`;
            enemyArea.appendChild(line);
          }
        }
      }
    }

    // Provisions in left column
    const active = run.provisions.filter(p => p.qty > 0);
    if (active.length === 0) return;

    const area = document.createElement('div');
    area.className = 'mc-co-items-area';
    this.itemsAreaEl = area;
    this.previewStripEl.appendChild(area);

    const provDivider = document.createElement('div');
    provDivider.className = 'mc-co-section-divider';
    provDivider.style.color = 'var(--mc-gold-bright)';
    provDivider.textContent = 'Vorräte — vor Kampf nutzbar';
    area.appendChild(provDivider);

    const row = document.createElement('div');
    row.className = 'mc-co-items-row';
    area.appendChild(row);

    run.provisions.forEach((prov, idx) => {
      if (prov.qty <= 0) return;
      const itemDef = ITEM_DEFS[prov.itemId as keyof typeof ITEM_DEFS];
      const name = (itemDef as { name?: string })?.name ?? prov.itemId;

      const card = document.createElement('div');
      card.className = 'mc-co-item-card';

      const itemImg = document.createElement('img');
      itemImg.src = `assets/sprites/final/${getItemSpriteKey(prov.itemId)}.png`;
      itemImg.width = 22;
      itemImg.height = 22;
      itemImg.style.objectFit = 'contain';
      itemImg.onerror = () => { itemImg.style.display = 'none'; };

      const itemQty = document.createElement('span');
      itemQty.className = 'mc-co-item-qty';
      itemQty.textContent = `×${prov.qty}`;

      const useBtn = document.createElement('button');
      useBtn.className = 'mc-btn success mc-co-use-btn';
      useBtn.textContent = 'Nutzen';
      useBtn.title = name;
      useBtn.addEventListener('click', () => {
        if (this.phase !== 'preview') return;
        if (!this.expSystem || !this.expState) return;
        this.expSystem.useProvision(this.expState, idx);
        this.refreshAfterProvision();
      });

      card.appendChild(itemImg);
      card.appendChild(itemQty);
      card.appendChild(useBtn);
      row.appendChild(card);
    });
  }

  private refreshAfterProvision(): void {
    const run = this.expRun;
    if (!run) return;
    if (run.airShield !== undefined && (ROUTE_DEFS[run.routeId]?.isUnderwater)) {
      this.updateAirDisplay(run.airShield, run.airShieldMax ?? 100);
    }
    for (const entry of this.partyEntries) {
      const unit = run.party.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const pct = unit.maxHp > 0 ? Math.max(0, unit.hp) / unit.maxHp : 0;
      entry.hpFill.style.width = `${pct * 100}%`;
      entry.hpText.textContent = `${Math.max(0, unit.hp)} / ${unit.maxHp}`;
      this.colorHpText(entry.hpText, unit.hp, unit.maxHp);
      // Tränke wirken sofort auf Angriff und Tempo (Krafttrank, Schnelligkeitstrank): die Vorschau zeigt es
      entry.statsEl.textContent = statsText(unit);
      this.preHpMap.set(unit.id, unit.hp);
    }
    // Was der Vorrat bewirkt hat («Krafttrank: +3 Angriff bis zum Ende des Dungeons», «wirkt schon») steht im Protokoll
    this.updateLog(run.combatLog.slice(this.logStart).slice(-8));
    this.buildItemSection(run, this.previewRoom ?? undefined);
  }

  // ─── Combat Log ───────────────────────────────────────────

  private updateLog(lines: string[]): void {
    this.logLinesEl.innerHTML = '';
    for (const line of lines) {
      const span = document.createElement('div');
      span.className = 'mc-co-log-line';
      span.style.color = getLogLineColor(line);
      span.textContent = line;
      this.logLinesEl.appendChild(span);
    }
  }

  // ─── Animation: Combat Intro ──────────────────────────────

  startCombatAnimation(run: ExpeditionRun, room: EncounterRoom): void {
    this.phase = 'animating';
    this.actionsEl.innerHTML = '';
    this.previewStripEl.innerHTML = '';

    const spd = this.combatSpeed;
    const isBoss = room.type === 'boss';

    this.playCombatIntro(isBoss, spd, () => {
      this.animateRounds(run, room, spd);
    });
  }

  private playCombatIntro(isBoss: boolean, spd: number, onDone: () => void): void {
    // TODO: Sound — combat_sword / boss_intro
    if (isBoss) shakeScreen(Math.round(400 / spd), 0.012);

    // Flash overlay
    const flash = document.createElement('div');
    flash.className = 'mc-co-intro-flash';
    flash.style.background = isBoss ? 'rgba(204,0,0,0.6)' : 'rgba(255,255,255,0.55)';
    flash.style.animationDuration = `${Math.round(600 / spd)}ms`;
    this.el.appendChild(flash);
    this.onAnimEnd(flash, () => flash.remove());

    // Intro title
    const title = document.createElement('div');
    title.className = 'mc-co-intro-title';
    title.textContent = isBoss ? 'BOSS KAMPF!' : 'KAMPF!';
    title.style.color = isBoss ? '#FF3333' : '#FFD700';
    const totalMs = Math.round(1100 / spd);
    title.style.animationDuration = `${totalMs}ms`;
    this.el.appendChild(title);
    this.onAnimEnd(title, () => title.remove());

    this.after(totalMs, onDone);
  }

  // ─── Animation: Round-by-Round ────────────────────────────

  private animateRounds(run: ExpeditionRun, room: EncounterRoom, spd: number): void {
    const snapshots = run.combatRoundSnapshots ?? [];
    const partyAll = run.warMachineUnit ? [...run.party, run.warMachineUnit] : run.party;

    if (snapshots.length === 0) {
      this.updateLog(run.combatLog.slice(-8));
      this.after(Math.round(400 / spd), () => this.showResult(run));
      return;
    }

    // Round counter
    let roundCounterEl = this.el.querySelector<HTMLElement>('.mc-co-round-counter');
    if (!roundCounterEl) {
      roundCounterEl = document.createElement('div');
      roundCounterEl.className = 'mc-co-round-counter';
      this.el.querySelector('.mc-co-log-area')?.prepend(roundCounterEl);
    }

    const maxDisplay = Math.min(snapshots.length, 8);
    const displayRounds: CombatRoundSnapshot[] =
      snapshots.length > maxDisplay
        ? [...snapshots.slice(0, 4), ...snapshots.slice(-4)]
        : snapshots;

    let roundIdx = 0;

    const animateNextRound = () => {
      if (roundIdx >= displayRounds.length) {
        roundCounterEl?.remove();
        this.updateLog(run.combatLog.slice(-8));
        this.after(Math.round(300 / spd), () => this.showResult(run));
        return;
      }

      const snapshot = displayRounds[roundIdx];
      const isLastRound = roundIdx === displayRounds.length - 1;
      roundIdx++;

      // Pulse round counter
      if (roundCounterEl) {
        roundCounterEl.textContent = `Runde ${snapshot.round}`;
        roundCounterEl.classList.remove('pulse');
        void roundCounterEl.offsetWidth;
        roundCounterEl.classList.add('pulse');
      }

      this.updateLog(snapshot.logLines.slice(-6));
      this.showActionBanners(snapshot.logLines, run.party, room.enemies);
      for (const id of snapshot.markiert ?? []) this.markieren(id);
      this.wegZustaendeZeigen(snapshot.wegZustand);

      // Update fortification HP bar during siege rounds
      if (room.type === 'fortification' && room.fortification && snapshot.fortificationHp !== undefined) {
        this.updateFortDisplay(snapshot.fortificationHp, room.fortification.maxHp);
      }

      const atkDur = Math.round(180 / spd);

      // Phase 1: Party attack slide right
      const aliveParty = this.partyEntries.filter(e => {
        const prevSnap = roundIdx > 1 ? displayRounds[roundIdx - 2] : null;
        const hp = prevSnap ? (prevSnap.partyHp[e.unitId] ?? 0) : (this.preHpMap.get(e.unitId) ?? 1);
        return hp > 0;
      });

      if (aliveParty.length > 0) {
        // TODO: Sound — combat_sword
        for (const entry of aliveParty) {
          this.slideUnit(entry.el, 'right', atkDur);
        }
      }

      // Phase 2: Enemy damage (after slide impact)
      this.after(atkDur + Math.round(80 / spd), () => {
        if (snapshot.hadCrit) shakeScreen(Math.round(120 / spd), 0.008);
        // TODO: Sound — combat_hit
        this.showRoundDamage(
          room.enemies, this.enemyEntries, snapshot.enemyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null, spd,
        );
        this.animateHpBars(
          room.enemies, this.enemyEntries, snapshot.enemyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null,
        );
      });

      // Phase 3: Enemy attack slide left
      this.after(atkDur * 2 + Math.round(100 / spd), () => {
        const aliveEnemies = this.enemyEntries.filter(e => (snapshot.enemyHp[e.unitId] ?? 0) > 0);
        if (aliveEnemies.length > 0) {
          // TODO: Sound — combat_hit
          for (const entry of aliveEnemies) {
            this.slideUnit(entry.el, 'left', atkDur);
          }
        }
      });

      // Phase 4: Party damage + death flash
      this.after(atkDur * 3 + Math.round(180 / spd), () => {
        this.showRoundDamage(
          partyAll, this.partyEntries, snapshot.partyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null, spd,
        );
        this.animateHpBars(
          partyAll, this.partyEntries, snapshot.partyHp,
          roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null,
        );

        if (snapshot.hadDeath) {
          shakeScreen(Math.round(200 / spd), 0.01);
          this.flashDeadUnits(partyAll, this.partyEntries, snapshot.partyHp,
            roundIdx > 1 ? displayRounds[roundIdx - 2]?.partyHp ?? null : null, spd);
          this.flashDeadUnits(room.enemies, this.enemyEntries, snapshot.enemyHp,
            roundIdx > 1 ? displayRounds[roundIdx - 2]?.enemyHp ?? null : null, spd);
        }

        const pauseDelay = Math.round(300 / spd);
        if (isLastRound) {
          this.after(Math.round(400 / spd), () => this.showResult(run));
        } else {
          this.after(pauseDelay, () => {
            this.showRoundContinueButton(animateNextRound);
          });
        }
      });
    };

    animateNextRound();
  }

  private slideUnit(el: HTMLElement, dir: 'right' | 'left', dur: number): void {
    const cls = dir === 'right' ? 'mc-co-slide-right' : 'mc-co-slide-left';
    el.style.setProperty('--co-slide-dur', `${dur * 2}ms`);
    el.classList.remove('mc-co-slide-right', 'mc-co-slide-left');
    void el.offsetWidth;
    el.classList.add(cls);
    this.onAnimEnd(el, () => el.classList.remove(cls));
  }

  // ─── Animation: Floaty Damage ─────────────────────────────

  private showRoundDamage(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
    spd: number,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = currentHp[unit.id] ?? 0;
      const preHp = prevHp ? (prevHp[unit.id] ?? unit.maxHp) : (this.preHpMap.get(unit.id) ?? unit.maxHp);
      const diff = preHp - curHp;
      if (diff === 0) continue;

      const floaty = document.createElement('div');
      floaty.className = 'mc-co-floaty';
      floaty.textContent = diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`;
      floaty.style.color = diff > 0 ? 'var(--mc-damage)' : 'var(--mc-heal)';
      floaty.style.fontSize = Math.abs(diff) >= 20 ? '22px' : Math.abs(diff) >= 10 ? '18px' : '16px';
      floaty.style.animationDuration = `${Math.round(900 / spd)}ms`;

      const rect = entry.el.getBoundingClientRect();
      const panelRect = this.el.getBoundingClientRect();
      floaty.style.left = `${rect.left - panelRect.left + 24}px`;
      floaty.style.top = `${rect.top - panelRect.top}px`;

      this.el.appendChild(floaty);
      this.onAnimEnd(floaty, () => floaty.remove());
    }
  }

  // ─── Animation: HP Bar Update ─────────────────────────────

  private animateHpBars(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = Math.max(0, currentHp[unit.id] ?? 0);
      const pct = unit.maxHp > 0 ? curHp / unit.maxHp : 0;
      entry.hpFill.style.width = `${pct * 100}%`;
      entry.hpText.textContent = `${curHp} / ${unit.maxHp}`;
      this.colorHpText(entry.hpText, curHp, unit.maxHp);
      if (curHp <= 0) entry.el.classList.add('is-dead');
    }
    void prevHp; // suppress unused warning — caller needs param for symmetry
  }

  // ─── Animation: Death Flash ───────────────────────────────

  private flashDeadUnits(
    units: CombatUnit[], entries: UnitEntry[],
    currentHp: Record<number, number>, prevHp: Record<number, number> | null,
    spd: number,
  ): void {
    for (const entry of entries) {
      const unit = units.find(u => u.id === entry.unitId);
      if (!unit) continue;
      const curHp = currentHp[unit.id] ?? 0;
      const preHp = prevHp ? (prevHp[unit.id] ?? unit.maxHp) : (this.preHpMap.get(unit.id) ?? unit.maxHp);
      if (preHp > 0 && curHp <= 0) {
        const flash = document.createElement('div');
        flash.className = 'mc-co-death-flash';
        flash.style.animationDuration = `${Math.round(400 / spd)}ms`;
        entry.el.appendChild(flash);
        this.onAnimEnd(flash, () => flash.remove());

        // TODO: Sound — party_wipe (if unit.isPlayer)
      }
    }
  }

  // ─── Animation: Action Banners ────────────────────────────

  private showActionBanners(lines: string[], partyUnits: CombatUnit[], enemyUnits: CombatUnit[]): void {
    const usesPattern = /^(.+?) uses (.+?) →/;
    // Set-Fähigkeiten und andere Kampfeffekte (systems/Kampfeffekte.ts): «✦ Brom setzt Rudelgeheul ein → …»
    const effektPattern = /^✦ (.+?) setzt (.+?) ein →/;
    // Wege der Helden: «★ Brom setzt Phalanx ein → …»
    const wegPattern = /^★ (.+?) setzt (.+?) ein →/;
    const setztPattern = /^(.+?) setzt (.+?) ein →/;
    const enragePattern = /^!! (.+?) ENRAGE !!$/;
    // Verschiedene Banner über derselben Einheit in einer Runde stehen übereinander,
    // ein gleiches (Münzhagel trifft drei Helden) nur einmal
    const proEinheit = new Map<UnitEntry, Set<string>>();

    for (const line of lines) {
      let unitName: string | null = null;
      let bannerText: string | null = null;
      let bannerColor = 'var(--mc-info)';

      const usesMatch = line.match(usesPattern);
      const effektMatch = line.match(effektPattern);
      const wegMatch = line.match(wegPattern);
      const setztMatch = line.match(setztPattern);
      const enrageMatch = line.match(enragePattern);

      if (effektMatch) {
        unitName = effektMatch[1].trim();
        bannerText = `✦ ${effektMatch[2].trim().toUpperCase()}`;
        bannerColor = '#6ee7b7';
      } else if (wegMatch) {
        unitName = wegMatch[1].trim();
        bannerText = `★ ${wegMatch[2].trim().toUpperCase()}`;
        bannerColor = '#fcd34d';
      } else if (usesMatch) {
        unitName = usesMatch[1].trim();
        bannerText = usesMatch[2].trim().toUpperCase();
        bannerColor = '#ef9a9a';
      } else if (setztMatch) {
        unitName = setztMatch[1].trim();
        bannerText = setztMatch[2].trim().toUpperCase();
        bannerColor = '#64b5f6';
      } else if (enrageMatch) {
        unitName = enrageMatch[1].trim();
        bannerText = '⚡ ENRAGE! ⚡';
        bannerColor = 'var(--mc-damage)';
      }

      if (!unitName || !bannerText) continue;

      let targetEntry: UnitEntry | undefined;
      const enemyUnit = enemyUnits.find(u => u.name === unitName);
      if (enemyUnit) targetEntry = this.enemyEntries.find(e => e.unitId === enemyUnit.id);
      if (!targetEntry) {
        const partyUnit = partyUnits.find(u => u.name === unitName);
        if (partyUnit) targetEntry = this.partyEntries.find(e => e.unitId === partyUnit.id);
      }
      if (!targetEntry) continue;

      const gezeigt = proEinheit.get(targetEntry) ?? new Set<string>();
      if (gezeigt.has(bannerText)) continue;
      const stapel = gezeigt.size;
      gezeigt.add(bannerText);
      proEinheit.set(targetEntry, gezeigt);

      const banner = document.createElement('div');
      banner.className = 'mc-co-action-banner';
      banner.textContent = bannerText;
      banner.style.color = bannerColor;

      const rect = targetEntry.el.getBoundingClientRect();
      const panelRect = this.el.getBoundingClientRect();
      const oben = this.bannerOben(targetEntry, rect, stapel);
      if (oben.innen) banner.classList.add('innen');
      banner.style.left = `${rect.left - panelRect.left + rect.width / 2}px`;
      banner.style.top = `${oben.y - panelRect.top}px`;
      banner.style.transform = 'translateX(-50%)';

      this.el.appendChild(banner);
      this.onAnimEnd(banner, () => banner.remove());
    }
  }

  /** Banner stehen über der Karte; liegt dort eine andere Karte (zweite Reihe) oder die Kopfzeile, oben in der Karte */
  private bannerOben(entry: UnitEntry, rect: DOMRect, stapel: number): { y: number; innen: boolean } {
    const y = rect.top - 28 - stapel * 24;
    const feld = this.el.querySelector('.mc-co-body')?.getBoundingClientRect();
    const verdeckt = [...this.partyEntries, ...this.enemyEntries].some(e => {
      if (e === entry) return false;
      const r = e.el.getBoundingClientRect();
      return r.left < rect.right && r.right > rect.left && r.bottom > y && r.top < rect.top;
    });
    if (!verdeckt && (!feld || y >= feld.top)) return { y, innen: false };
    return { y: rect.top + 6 + stapel * 24, innen: true };
  }

  /** Zeile mit den Abzeichen einer Karte (wird angelegt, wenn die Einheit noch keine hat) */
  private abzeichenZeile(entry: UnitEntry): Element | null {
    const info = entry.el.querySelector('.mc-co-unit-info');
    if (!info) return null;
    let badges = info.querySelector('.mc-co-badges');
    if (!badges) {
      badges = document.createElement('div');
      badges.className = 'mc-co-badges';
      info.insertBefore(badges, info.firstChild);
    }
    return badges;
  }

  /**
   * Zustände aus den Wegen nach dieser Runde mit Zahl: 🔥+4 (Zorn), 🐻 (Bärin), 💀2 (Skelette) leuchten
   * im Weg-Abzeichen des Helden selbst, 🕸️−2 (Fluch) und 🎭−2 (Kränkung) sind eigene Abzeichen bei den
   * Gegnern. Was nicht mehr gilt, verschwindet.
   */
  private wegZustaendeZeigen(zustand: CombatRoundSnapshot['wegZustand']): void {
    const karten: [UnitEntry[], Record<number, WegZustand[]> | undefined][] = [
      [this.partyEntries, zustand?.helden], [this.enemyEntries, zustand?.gegner],
    ];
    for (const [entries, liste] of karten) {
      for (const entry of entries) {
        entry.el.querySelectorAll('.mc-co-badge-zustand').forEach(b => b.remove());
        entry.el.querySelectorAll<HTMLElement>('.mc-co-badge-weg.aktiv').forEach(b => {
          b.textContent = b.dataset.zeichen ?? b.textContent;
          b.title = b.dataset.titel ?? b.title;
          b.classList.remove('aktiv');
        });
        const zustaende = liste?.[entry.unitId];
        if (!zustaende) continue;
        const badges = this.abzeichenZeile(entry);
        for (const z of zustaende) {
          const eigenes = Array.from(badges?.querySelectorAll<HTMLElement>('.mc-co-badge-weg[data-zeichen]') ?? [])
            .find(b => z.zeichen.startsWith(b.dataset.zeichen!));
          if (eigenes) {
            eigenes.textContent = z.zeichen;
            eigenes.title = `${eigenes.dataset.titel} · ${z.titel}`;
            eigenes.classList.add('aktiv');
            continue;
          }
          const badge = document.createElement('span');
          badge.className = 'mc-co-badge mc-co-badge-weg mc-co-badge-zustand';
          badge.textContent = z.zeichen;
          badge.title = z.titel;
          badges?.appendChild(badge);
        }
      }
    }
  }

  /** Fährtenleserin: Der markierte Gegner bekommt ein 🐾 auf seine Karte (nach ID, Gegner heissen oft gleich) */
  private markieren(unitId: number): void {
    const entry = this.enemyEntries.find(e => e.unitId === unitId);
    if (!entry || entry.el.querySelector('.mc-co-badge-marke')) return;
    const badges = this.abzeichenZeile(entry);
    if (!badges) return;
    const badge = document.createElement('span');
    badge.className = 'mc-co-badge mc-co-badge-weg mc-co-badge-marke';
    badge.textContent = '🐾';
    badge.title = 'Markiert: Alle Helden machen gegen ihn mehr Schaden';
    badges.appendChild(badge);
  }

  // ─── Round Continue Button ────────────────────────────────

  private showRoundContinueButton(onContinue: () => void): void {
    this.actionsEl.innerHTML = '';

    const btnRow = document.createElement('div');
    btnRow.className = 'mc-co-btn-row';

    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-co-continue-btn';
    btn.textContent = 'Nächste Runde →';
    btn.addEventListener('click', () => {
      this.actionsEl.innerHTML = '';
      onContinue();
    });

    btnRow.appendChild(this.createRetreatButton());
    btnRow.appendChild(btn);
    this.actionsEl.appendChild(btnRow);
  }

  // ─── State: Result ────────────────────────────────────────

  private showResult(run: ExpeditionRun): void {
    this.phase = 'result';
    this.actionsEl.innerHTML = '';

    const isOver = run.status !== 'exploring';

    if (isOver) {
      // Ton zum Ausgang (klang.ts): boss_victory oder party_wipe
      window.dispatchEvent(new CustomEvent('mc:kampfausgang', { detail: { status: run.status } }));
      if (run.status === 'victory') shakeScreen(300, 0.006);
      else if (run.status === 'defeat') shakeScreen(500, 0.015);

      const outcomeText = run.status === 'victory' ? 'SIEG!'
        : run.status === 'defeat' ? 'NIEDERLAGE...'
        : 'RÜCKZUG';
      const outcomeColor = run.status === 'victory' ? 'var(--mc-heal)'
        : run.status === 'defeat' ? 'var(--mc-damage)'
        : 'var(--mc-gold-bright)';

      const outcome = document.createElement('div');
      outcome.className = 'mc-co-outcome';
      outcome.textContent = outcomeText;
      outcome.style.color = outcomeColor;
      this.actionsEl.appendChild(outcome);
    } else {
      const cleared = document.createElement('div');
      cleared.className = 'mc-co-room-cleared';
      cleared.textContent = 'Raum geschafft!';
      this.actionsEl.appendChild(cleared);
    }

    // Geschichte: Beute einer mutigen Wahl, die auf diesen Kampf gewartet hat (oder liegen bleibt)
    for (const zeile of run.combatLog.slice(this.logStart).filter(istGeschichtsBeuteZeile)) {
      const beute = document.createElement('div');
      beute.className = 'mc-co-geschichte-beute';
      beute.textContent = zeile;
      this.actionsEl.appendChild(beute);
    }

    const label = isOver ? 'Einsammeln & Schließen' : 'Weiter';
    const btn = document.createElement('button');
    btn.className = 'mc-btn mc-co-continue-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (this.phase !== 'result') return;
      this.hide();
      this.onComplete?.();
    });
    this.actionsEl.appendChild(btn);
  }

  // ─── Cleanup ──────────────────────────────────────────────

  private clearDisplays(): void {
    this.partyColEl.innerHTML = '';
    this.enemyColEl.innerHTML = '';
    this.partyEntries = [];
    this.enemyEntries = [];
    this.logLinesEl.innerHTML = '';
    this.actionsEl.innerHTML = '';
    this.previewStripEl.innerHTML = '';
    this.abilitiesAreaEl = null;
    this.itemsAreaEl = null;
    this.el.querySelectorAll('.mc-co-floaty, .mc-co-action-banner, .mc-co-intro-flash, .mc-co-intro-title, .mc-co-round-counter').forEach(el => el.remove());
  }

  private clearTimers(): void {
    for (const id of this.timers) clearTimeout(id);
    this.timers = [];
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private onAnimEnd(el: HTMLElement, fn: () => void): void {
    const handler = () => { el.removeEventListener('animationend', handler); fn(); };
    el.addEventListener('animationend', handler);
  }

  destroy(): void {
    this.clearTimers();
    this.el.remove();
  }

  /** No-op für refresh() Kompatibilität. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refresh(_state: unknown): void { /* no-op */ }
}
