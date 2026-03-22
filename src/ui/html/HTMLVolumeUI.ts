// ============================================================
// Magic City – HTMLVolumeUI
// Kleines Audio-Panel oben rechts mit SFX- und Musik-Slider.
// Tastenkuerzel: M toggelt Sichtbarkeit.
// ============================================================

import { HTMLPanel } from './HTMLPanel';

export class HTMLVolumeUI extends HTMLPanel {
  public onClose?: () => void;
  public onVolumeChange?: (sfxVolume: number, musicVolume: number) => void;

  private sfxVolume: number = 0.5;
  private musicVolume: number = 0.3;

  private readonly sfxInput: HTMLInputElement;
  private readonly sfxValueEl: HTMLElement;
  private readonly musicInput: HTMLInputElement;
  private readonly musicValueEl: HTMLElement;

  private boundKeyHandler: (e: KeyboardEvent) => void;

  constructor() {
    const root = document.createElement('div');
    root.className = 'mc-panel mc-modal';
    root.style.cssText = [
      'position: absolute',
      'top: 56px',
      'right: 12px',
      'width: 280px',
      'pointer-events: auto',
    ].join('; ');
    root.setAttribute('hidden', '');

    super(root);

    // ── Header ──────────────────────────────────────────────
    const header = HTMLPanel.el('div', 'mc-panel-header');
    header.textContent = '\uD83D\uDD0A Audio-Einstellungen';
    root.appendChild(header);
    root.appendChild(HTMLPanel.closeBtn(() => this.hide()));

    // ── Content ──────────────────────────────────────────────
    const content = HTMLPanel.el('div');
    content.style.cssText = 'padding: 14px 16px 16px;';
    root.appendChild(content);

    // ── SFX Slider ───────────────────────────────────────────
    const [sfxGroup, sfxInput, sfxValueEl] = HTMLVolumeUI.buildSliderGroup(
      'SFX-Lautst\u00e4rke',
      this.sfxVolume,
      (v) => {
        this.sfxVolume = v;
        this.onVolumeChange?.(this.sfxVolume, this.musicVolume);
      },
    );
    this.sfxInput = sfxInput;
    this.sfxValueEl = sfxValueEl;
    content.appendChild(sfxGroup);

    // ── Spacer ───────────────────────────────────────────────
    const spacer = HTMLPanel.el('div');
    spacer.style.height = '12px';
    content.appendChild(spacer);

    // ── Musik Slider ─────────────────────────────────────────
    const [musicGroup, musicInput, musicValueEl] = HTMLVolumeUI.buildSliderGroup(
      'Musik-Lautst\u00e4rke',
      this.musicVolume,
      (v) => {
        this.musicVolume = v;
        this.onVolumeChange?.(this.sfxVolume, this.musicVolume);
      },
    );
    this.musicInput = musicInput;
    this.musicValueEl = musicValueEl;
    content.appendChild(musicGroup);

    // ── Keyboard shortcut (M) ────────────────────────────────
    this.boundKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (this.isVisible()) {
          this.hide();
        }
        // Opening is handled by the caller (UIManager / CityScene)
        // so that they can supply current volume values via show()
      }
    };
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  /**
   * Zeigt das Panel. Kann ohne Argumente aufgerufen werden –
   * der interne Zustand (sfxVolume / musicVolume) wird angezeigt.
   * Der Caller soll setVolumes() vorher aufrufen wenn noetig.
   */
  show(): void {
    this.syncInputs();
    super.show();
  }

  hide(): void {
    super.hide();
    this.onClose?.();
  }

  /** Setzt die aktuellen Lautstaerke-Werte (z.B. aus SoundManager). */
  setVolumes(sfx: number, music: number): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.isVisible()) {
      this.syncInputs();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyHandler);
    super.destroy();
  }

  // ─── Privat ─────────────────────────────────────────────

  private syncInputs(): void {
    this.sfxInput.value = String(this.sfxVolume);
    this.sfxValueEl.textContent = Math.round(this.sfxVolume * 100) + '%';
    this.musicInput.value = String(this.musicVolume);
    this.musicValueEl.textContent = Math.round(this.musicVolume * 100) + '%';
  }

  /**
   * Baut eine Slider-Gruppe (Label + Range-Input + Wert-Anzeige).
   * Gibt [groupEl, inputEl, valueEl] zurueck.
   */
  private static buildSliderGroup(
    label: string,
    initialValue: number,
    onChange: (value: number) => void,
  ): [HTMLElement, HTMLInputElement, HTMLElement] {
    const group = HTMLPanel.el('div');

    // Row: label + value
    const labelRow = HTMLPanel.el('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;';

    const labelEl = HTMLPanel.el('span', 'mc-label-dim mc-text-md');
    labelEl.textContent = label;

    const valueEl = HTMLPanel.el('span', 'mc-bold mc-text-md');
    valueEl.style.color = 'var(--mc-light)';
    valueEl.textContent = Math.round(initialValue * 100) + '%';

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    // Range input
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1';
    input.step = '0.05';
    input.value = String(initialValue);
    input.style.cssText = [
      'width: 100%',
      'cursor: pointer',
      'pointer-events: auto',
      'accent-color: var(--mc-gold)',
    ].join('; ');

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueEl.textContent = Math.round(v * 100) + '%';
      onChange(v);
    });

    group.appendChild(labelRow);
    group.appendChild(input);

    return [group, input, valueEl];
  }
}
