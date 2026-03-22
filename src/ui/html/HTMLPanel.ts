// ============================================================
// Magic City – HTMLPanel Base Class
// Basisklasse für alle HTML-UI-Panels.
// Ersetzt Phaser Container + updatePosition(cam) Pattern.
// ============================================================

/**
 * Basis für alle HTML-basierten UI-Panels.
 * Panels registrieren sich im #ui-layer div und nutzen
 * native Browser-Text-Rendering für maximale Schärfe.
 */
export abstract class HTMLPanel {
  /** Das Root-Element dieses Panels im DOM. */
  protected readonly el: HTMLElement;

  /** Singleton-Referenz auf den globalen UI-Layer. */
  protected static readonly layer: HTMLElement =
    document.getElementById('ui-layer') as HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    HTMLPanel.layer.appendChild(this.el);
  }

  /** Panel anzeigen. Subklassen können überschreiben um Daten zu befüllen. */
  show(): void {
    this.el.removeAttribute('hidden');
  }

  /** Panel verstecken. */
  hide(): void {
    this.el.setAttribute('hidden', '');
  }

  /** Ob das Panel sichtbar ist. */
  isVisible(): boolean {
    return !this.el.hasAttribute('hidden');
  }

  /**
   * No-op: HTML-Panels brauchen kein Kamera-Update.
   * Nur vorhanden damit UIManager.updatePositions() ohne
   * instanceof-Checks auskommt.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updatePosition(_cam: unknown): void { /* HTML panels are always screen-space */ }

  /** Panel aus dem DOM entfernen. */
  destroy(): void {
    this.el.remove();
  }

  // ─── Helper: Element erstellen ─────────────────────────

  /** Erstellt ein Element mit optionalen CSS-Klassen. */
  public static el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    classes?: string,
    content?: string,
  ): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (classes) e.className = classes;
    if (content !== undefined) e.textContent = content;
    return e;
  }

  /** Erstellt einen Close-Button mit Callback. */
  public static closeBtn(onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'mc-close-btn';
    btn.textContent = '✕';
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** Erstellt eine Stat-Bar (Track + farbiger Fill). */
  public static statBar(
    value: number,
    max: number,
    colorClass: 'mc-bar-hp' | 'mc-bar-atk' | 'mc-bar-def',
  ): HTMLElement {
    const track = document.createElement('div');
    track.className = 'mc-bar-track';
    const fill = document.createElement('div');
    fill.className = `mc-bar-fill ${colorClass}`;
    fill.style.width = `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`;
    track.appendChild(fill);
    return track;
  }

  /** Sprite-Icon als <img> Tag (native Browser-Rendering, scharf). */
  public static icon(key: string, size = 20): HTMLImageElement {
    const img = document.createElement('img');
    img.src = `/assets/sprites/final/${key}.png`;
    img.width = size;
    img.height = size;
    img.style.objectFit = 'contain';
    img.style.imageRendering = 'auto';
    return img;
  }
}
