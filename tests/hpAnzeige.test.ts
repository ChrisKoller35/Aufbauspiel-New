import { describe, it, expect } from 'vitest';
import { hpAnzeige, hpZahl, rundeLogZahlen } from '../src/ui/hpAnzeige';

describe('hpAnzeige', () => {
  it('zeigt keine Gleitkomma-Reste', () => {
    expect(hpAnzeige(12.600000000000001, 35)).toBe('13 / 35');
    expect(hpAnzeige(113.79999999999997, 388)).toBe('114 / 388');
  });
  it('zeigt Lebende nie als 0, Tote als 0', () => {
    expect(hpZahl(0.2)).toBe(1);
    expect(hpZahl(0)).toBe(0);
    expect(hpZahl(-4.5)).toBe(0);
    expect(hpZahl(20)).toBe(20);
    expect(hpZahl(20.0000000000001)).toBe(20);
  });
  it('rundet Schaden im Protokoll', () => {
    expect(rundeLogZahlen('Brom setzt Hieb ein → Wolf erleidet 12.600000000000001')).toBe('Brom setzt Hieb ein → Wolf erleidet 13');
    expect(rundeLogZahlen('Schaden 1.5× und 3 HP')).toBe('Schaden 1.5× und 3 HP');
  });
});
