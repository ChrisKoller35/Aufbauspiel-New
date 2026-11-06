import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lesbarkeit (docs/LESBARKEIT.md): liest die CSS-Dateien und rechnet die Kontraste nach WCAG 2.x selbst nach.
 * Prüft Tokens, Goldknöpfe, Namensschilder auf Bildern und dass gesperrte Karten das Bild dimmen, nicht die Schrift.
 */

const CSS_ORDNER = join(__dirname, '../src/ui/html');
const lies = (datei: string) => readFileSync(join(CSS_ORDNER, datei), 'utf8');
const ALLE_CSS = readdirSync(CSS_ORDNER).filter(d => d.endsWith('.css')).map(d => ({ datei: d, text: lies(d) }));

type Regel = { selektoren: string[]; inhalt: string };

/** Alle Regeln ohne Kommentare; Regeln in @media werden mitgenommen (der Teil vor «{» ohne Klammern ist der Selektor). */
function regeln(css: string): Regel[] {
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const liste: Regel[] = [];
  for (const m of ohneKommentare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    liste.push({ selektoren: m[1].split(',').map(s => s.trim().replace(/\s+/g, ' ')), inhalt: m[2] });
  }
  return liste;
}

function regelnFuer(css: string, selektor: string): Regel[] {
  const treffer = regeln(css).filter(r => r.selektoren.includes(selektor));
  expect(treffer.length, `Regel ${selektor} fehlt`).toBeGreaterThan(0);
  return treffer;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function leuchtdichte([r, g, b]: number[]): number {
  const k = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

function kontrast(a: number[], b: number[]): number {
  const [x, y] = [leuchtdichte(a), leuchtdichte(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Hover-Effekt filter: brightness(1.2) – je Kanal ×1,2, bei 255 gekappt (wirkt auf Schrift und Hintergrund). */
const hell = (c: number[]) => c.map(v => Math.min(255, Math.round(v * 1.2)));

/** Halbdurchsichtige Farbe über einem Hintergrund */
const mischen = (vorne: number[], a: number, hinten: number[]) => vorne.map((v, i) => Math.round(a * v + (1 - a) * hinten[i]));

const ROOT: Record<string, string> = {};
for (const m of regelnFuer(lies('magic-city.css'), ':root')[0].inhalt.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  ROOT[m[1]] = m[2].trim();
}
const token = (name: string) => rgb(ROOT[name]);

describe('Tokens', () => {
  test('--mut ≥ 4,5 : 1 auf allen Flächen und auf der goldenen Ranglisten-Zeile', () => {
    for (const flaeche of ['--bg', '--s1', '--s2', '--s3']) {
      expect(kontrast(token('--mut'), token(flaeche)), flaeche).toBeGreaterThanOrEqual(4.5);
    }
    expect(kontrast(token('--mut'), rgb('#343122'))).toBeGreaterThanOrEqual(4.5);
  });

  test('--gl-knopf ≥ 5 : 1 auf dem Goldverlauf, im Hover ≥ 4,5', () => {
    for (const verlauf of ['#6e5710', '#7a5c08']) {
      expect(kontrast(token('--gl-knopf'), rgb(verlauf)), verlauf).toBeGreaterThanOrEqual(5.0);
      expect(kontrast(hell(token('--gl-knopf')), hell(rgb(verlauf))), `${verlauf} Hover`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Goldknöpfe', () => {
  const VERLAEUFE = [
    /linear-gradient\(\s*135deg\s*,\s*var\(--gd\)\s*,\s*#7a5c08\s*\)/,
    /linear-gradient\(\s*135deg\s*,\s*#6e5710\s*,\s*#7a5c08\s*\)/,
  ];

  test('jede Regel mit dem Goldverlauf setzt color: var(--gl-knopf)', () => {
    let anzahl = 0;
    for (const { datei, text } of ALLE_CSS) {
      for (const r of regeln(text)) {
        if (!VERLAEUFE.some(v => v.test(r.inhalt))) continue;
        anzahl++;
        expect(r.inhalt, `${datei}: ${r.selektoren.join(', ')}`).toMatch(/(^|[;\s])color:\s*var\(--gl-knopf\)/);
      }
    }
    // .btn-go, .btn-train, .hdm2-aktion, .weg-knopf, .dmap-btn-go, .mc-btn, zwei im Gildenhaus, .lb-lernen
    expect(anzahl).toBeGreaterThanOrEqual(9);
  });

  test('.bg-btn.active hat die Knopf-Schrift', () => {
    expect(regelnFuer(lies('magic-city.css'), '.bg-btn.active')[0].inhalt).toMatch(/color:\s*var\(--gl-knopf\)/);
  });
});

describe('Schrift auf Bildern', () => {
  const schild = (selektor: string, mindestens: number) => {
    const inhalt = regelnFuer(lies('magic-city.css'), selektor).map(r => r.inhalt).join(';');
    const m = inhalt.match(/background:\s*rgba\(\s*6\s*,\s*8\s*,\s*16\s*,\s*([\d.]+)\s*\)/);
    expect(m, `${selektor} ohne Schild`).not.toBeNull();
    const a = Number(m![1]);
    expect(a).toBeGreaterThanOrEqual(mindestens);
    // Schlimmster Fall: reines Weiss hinter dem Schild
    expect(kontrast(token('--txt'), mischen([6, 8, 16], a, [255, 255, 255]))).toBeGreaterThanOrEqual(4.5);
  };

  test('Heldenname auf dem Bild hat ein Schild (Deckkraft ≥ .70)', () => schild('.hcard-img .hc-nm', 0.7));
  test('Anzahl auf dem Gegenstandsbild hat ein Schild (Deckkraft ≥ .75)', () => schild('.hdm2-inv-qty', 0.75));

  test('gesperrte Karten dimmen das Bild, nicht die Schrift', () => {
    const faelle: [string, string][] = [
      ['magic-city.css', '.exp-card.locked'],
      ['schmiede.css', '.mat-chip.leer'],
      ['gildenhaus.css', '.gh-ware:disabled'],
      ['ausbildung.css', '.kt-karte.gesperrt .kt-bild'],
      ['ausbildung.css', '.kt-karte.in-gilde .kt-bild'],
    ];
    for (const [datei, selektor] of faelle) {
      for (const r of regeln(lies(datei)).filter(x => x.selektoren.includes(selektor))) {
        expect(r.inhalt, selektor).not.toMatch(/(^|[;\s])(opacity|filter)\s*:/);
      }
    }
  });
});

describe('Rangliste', () => {
  test('Rang 3 ≥ 4,5 : 1 auf der goldenen Zeile und auf --s2', () => {
    const m = regelnFuer(lies('rangliste.css'), '.rl-zeile.r3 .rl-platz')[0].inhalt.match(/color:\s*(#[0-9a-f]{6})/i);
    expect(m).not.toBeNull();
    expect(kontrast(rgb(m![1]), rgb('#343122'))).toBeGreaterThanOrEqual(4.5);
    expect(kontrast(rgb(m![1]), token('--s2'))).toBeGreaterThanOrEqual(4.5);
  });
});
