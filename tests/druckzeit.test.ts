import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { gedruecktUm } from '../src/ui/components/Druckzeit';

// Wann gedrückt wurde: Sperren nach einem Klick (Heldenfenster, Schmiede) zählen damit ab dem Druck

describe('gedruecktUm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(60_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const klick = (timeStamp: number) => ({ timeStamp }) as Event;

  test('Zeit des Browsers auf der Uhr von performance.now: der Druck, auch wenn das Spiel erst später dazu kommt', () => {
    const jetzt = performance.now();
    expect(gedruecktUm(klick(jetzt))).toBe(jetzt);
    expect(gedruecktUm(klick(jetzt - 400))).toBe(jetzt - 400);
    expect(gedruecktUm(klick(jetzt - 4900))).toBe(jetzt - 4900);
  });

  test('ältere Browser zählen ab 1970: dann gilt jetzt', () => {
    expect(gedruecktUm(klick(Date.now()))).toBe(performance.now());
    expect(gedruecktUm(klick(Date.now() - 400))).toBe(performance.now());
  });

  test('keine Zeit (0 oder kleiner) oder eine, die nicht zu einem eben gedrückten Knopf passt: dann gilt jetzt', () => {
    const jetzt = performance.now();
    for (const zeit of [0, -5, jetzt - 5000, jetzt - 30_000, jetzt + 5000]) {
      expect(gedruecktUm(klick(zeit))).toBe(jetzt);
    }
  });

  test('auch kurz nach dem Laden zählt 0 nicht als Druck', () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    expect(performance.now()).toBeLessThan(5000);
    expect(gedruecktUm(klick(0))).toBe(performance.now());
  });
});
