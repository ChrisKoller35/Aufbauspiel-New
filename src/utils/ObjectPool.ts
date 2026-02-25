/**
 * Generic object pool to reduce GC pressure for frequently created/destroyed objects.
 *
 * Usage example – damage number text objects in CityScene:
 *
 *   const dmgPool = new ObjectPool<Phaser.GameObjects.Text>(
 *     () => this.add.text(0, 0, '', { fontSize: '14px', color: '#fff' }).setVisible(false),
 *     (t) => { t.setText(''); t.setVisible(false); t.setPosition(0, 0); },
 *     10, // pre-allocate 10 instances
 *   );
 *
 *   // Acquire:
 *   const txt = dmgPool.get();
 *   txt.setText('+5').setPosition(x, y).setVisible(true);
 *   this.time.delayedCall(800, () => dmgPool.release(txt));
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) this.pool.push(factory());
  }

  /** Get an object from the pool, or create a new one if the pool is empty. */
  get(): T {
    if (this.pool.length > 0) return this.pool.pop()!;
    return this.factory();
  }

  /** Return an object to the pool. The reset function is called before storing it. */
  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  /** Number of objects currently waiting in the pool. */
  get size(): number {
    return this.pool.length;
  }
}
