// ─── Magic City – Die wachsende Stadt (Bild aus Code) ───────────
// Nachtbild der Stadt als SVG: je Stadtstufe kommen Gebäude dazu
// (Zelte und Lagerfeuer, Hütten, Windmühle, Markt, Stadtmauer, Burg),
// ab der Grossstadt wächst das Arkane Herz, in der Magischen Stadt
// leuchtet es und die endlose Treppe auf dem Berg glüht.
// Wird im Hauptmenü (klein) und im Stadtweg-Fenster (gross) gezeigt.
// ────────────────────────────────────────────────────────────────

const G = 214; // Bodenlinie
const HINTEN = '#1b2142';
const VORNE = '#10142a';
const MAUER = '#0b0f20';

interface Teil {
  ab: number;
  bis?: number;
  svg: (s: Kontext) => string;
}

interface Kontext {
  stufe: number;
  herzsteine: number;
  id: (name: string) => string;
}

/** Kleiner fester Zufall, damit Sterne und Fenster immer gleich liegen. */
function zufall(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fensterFarbe(s: Kontext, r: () => number): string {
  return s.stufe >= 7 && r() < 0.45 ? '#d9b8ff' : '#f2c46d';
}

/** Fenster in einem Raster, ein Teil davon beleuchtet. */
function fenster(s: Kontext, x: number, y: number, w: number, h: number, seed: number): string {
  const r = zufall(seed);
  const spalten = Math.max(1, Math.floor((w - 6) / 10));
  const reihen = Math.max(1, Math.floor((h - 8) / 13));
  const abstandX = w / (spalten + 1);
  let out = '';
  for (let i = 0; i < reihen; i++) {
    for (let j = 0; j < spalten; j++) {
      if (r() < 0.42) continue;
      const fx = x + abstandX * (j + 1) - 1.5;
      const fy = y + 7 + i * 13;
      const flackert = r() < 0.18 ? ' class="sw-flacker"' : '';
      out += `<rect${flackert} x="${fx.toFixed(1)}" y="${fy}" width="3" height="4.5" fill="${fensterFarbe(s, r)}"/>`;
    }
  }
  return out;
}

function haus(s: Kontext, x: number, w: number, h: number, dach: number, farbe: string, seed: number): string {
  const y = G - h;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${farbe}"/>`
    + `<polygon points="${x - 3},${y} ${x + w / 2},${y - dach} ${x + w + 3},${y}" fill="${farbe}"/>`
    + fenster(s, x, y, w, h, seed) + '</g>';
}

function turm(s: Kontext, x: number, w: number, h: number, spitze: number, farbe: string, seed: number): string {
  const y = G - h;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${farbe}"/>`
    + `<polygon points="${x - 2},${y} ${x + w / 2},${y - spitze} ${x + w + 2},${y}" fill="${farbe}"/>`
    + fenster(s, x, y + 6, w, h - 20, seed) + '</g>';
}

function zelt(x: number, w: number, h: number): string {
  return `<g><polygon points="${x},${G} ${x + w / 2},${G - h} ${x + w},${G}" fill="${VORNE}"/>`
    + `<polygon points="${x + w / 2 - 4},${G} ${x + w / 2},${G - h * 0.45} ${x + w / 2 + 4},${G}" fill="#3a2a14"/></g>`;
}

function lagerfeuer(x: number): string {
  return `<g><ellipse cx="${x}" cy="${G - 6}" rx="34" ry="14" fill="#f59e0b" opacity=".12"/>`
    + `<rect x="${x - 11}" y="${G - 4}" width="22" height="4" rx="2" fill="#3b2412" transform="rotate(-12 ${x} ${G - 2})"/>`
    + `<rect x="${x - 11}" y="${G - 4}" width="22" height="4" rx="2" fill="#4a2e16" transform="rotate(12 ${x} ${G - 2})"/>`
    + `<polygon class="sw-flamme" points="${x - 8},${G - 3} ${x},${G - 26} ${x + 8},${G - 3}" fill="#f97316"/>`
    + `<polygon class="sw-flamme sw-flamme2" points="${x - 4},${G - 3} ${x + 1},${G - 17} ${x + 5},${G - 3}" fill="#fde047"/></g>`;
}

function schild(x: number): string {
  return `<g><rect x="${x}" y="${G - 30}" width="2.5" height="30" fill="#2d2010"/>`
    + `<rect x="${x - 22}" y="${G - 33}" width="46" height="12" rx="1.5" fill="#3b2a12"/>`
    + `<text x="${x + 1}" y="${G - 24.5}" font-size="6.3" text-anchor="middle" fill="#e6c060" font-family="Cinzel, serif" letter-spacing=".6">MAGIC CITY</text></g>`;
}

function muehle(x: number): string {
  const nabeY = G - 76;
  const fluegel = [0, 90, 180, 270].map(w =>
    `<rect x="${x - 2.5}" y="${nabeY - 34}" width="5" height="34" fill="#232a4a" transform="rotate(${w} ${x} ${nabeY})"/>`
    + `<rect x="${x - 7}" y="${nabeY - 32}" width="5" height="22" fill="#2b3357" transform="rotate(${w} ${x} ${nabeY})"/>`,
  ).join('');
  return `<g><polygon points="${x - 15},${G} ${x - 9},${nabeY + 4} ${x + 9},${nabeY + 4} ${x + 15},${G}" fill="${HINTEN}"/>`
    + `<polygon points="${x - 11},${nabeY + 5} ${x},${nabeY - 8} ${x + 11},${nabeY + 5}" fill="${HINTEN}"/>`
    + `<rect x="${x - 2}" y="${G - 40}" width="4" height="6" fill="#f2c46d"/>`
    + `<g class="sw-fluegel">${fluegel}<circle cx="${x}" cy="${nabeY}" r="3" fill="#2b3357"/></g></g>`;
}

function rauch(x: number, y: number): string {
  return [0, 1, 2].map(i =>
    `<circle class="sw-rauch" style="animation-delay:${i * 1.3}s" cx="${x}" cy="${y}" r="${3 + i}" fill="#8b93b8" opacity="0"/>`,
  ).join('');
}

function baeckerei(s: Kontext, x: number): string {
  return `<g><rect x="${x + 26}" y="${G - 52}" width="7" height="16" fill="${VORNE}"/>${rauch(x + 29.5, G - 54)}`
    + haus(s, x, 40, 32, 14, VORNE, 31) + '</g>';
}

function marktstand(x: number, farbe: string): string {
  let streifen = '';
  for (let i = 0; i < 6; i++) {
    streifen += `<rect x="${x + i * 7}" y="${G - 30}" width="7" height="8" fill="${i % 2 ? '#e8dcc0' : farbe}" opacity=".75"/>`;
  }
  return `<g><rect x="${x + 2}" y="${G - 22}" width="2" height="22" fill="#2a2016"/>`
    + `<rect x="${x + 38}" y="${G - 22}" width="2" height="22" fill="#2a2016"/>`
    + `<rect x="${x}" y="${G - 12}" width="42" height="12" fill="${VORNE}"/>${streifen}`
    + `<circle cx="${x + 21}" cy="${G - 17}" r="2.2" fill="#fbbf24" class="sw-flacker"/></g>`;
}

function markthalle(s: Kontext, x: number): string {
  return `<g>${haus(s, x, 66, 50, 18, HINTEN, 41)}`
    + `<rect x="${x + 25}" y="${G - 96}" width="16" height="46" fill="${HINTEN}"/>`
    + `<polygon points="${x + 23},${G - 96} ${x + 33},${G - 116} ${x + 43},${G - 96}" fill="${HINTEN}"/>`
    + `<circle cx="${x + 33}" cy="${G - 84}" r="4.5" fill="#f2c46d" opacity=".85"/></g>`;
}

function zinnen(x: number, y: number, w: number, farbe: string): string {
  let out = '';
  for (let i = 0; i + 8 <= w; i += 14) out += `<rect x="${x + i}" y="${y - 6}" width="8" height="6" fill="${farbe}"/>`;
  return out;
}

function stadtmauer(): string {
  const tuerme = [26, 232, 546, 752].map(x =>
    `<rect x="${x}" y="${G - 40}" width="24" height="40" fill="${MAUER}"/>${zinnen(x - 1, G - 40, 28, MAUER)}`
    + `<rect x="${x + 10.5}" y="${G - 31}" width="3" height="7" fill="#f2c46d" opacity=".8"/>`,
  ).join('');
  let gitter = '';
  for (let x = 391; x <= 409; x += 4.5) gitter += `<line x1="${x}" y1="${G - 17}" x2="${x}" y2="${G}" stroke="#2a1a0a" stroke-width="1.2"/>`;
  return `<g><rect x="16" y="${G - 14}" width="768" height="14" fill="${MAUER}"/>${zinnen(16, G - 14, 768, MAUER)}`
    + `<rect x="384" y="${G - 26}" width="32" height="26" fill="${MAUER}"/>${zinnen(383, G - 26, 36, MAUER)}`
    + `<path d="M389 ${G} V${G - 11} A11 11 0 0 1 411 ${G - 11} V${G} Z" fill="#e0953e" opacity=".6"/>${gitter}`
    + `${tuerme}</g>`;
}

function fahne(x: number, y: number, farbe: string): string {
  return `<rect x="${x}" y="${y}" width="1.6" height="18" fill="#2a2f4f"/>`
    + `<polygon class="sw-fahne" points="${x + 1.6},${y} ${x + 15},${y + 3.5} ${x + 1.6},${y + 7}" fill="${farbe}"/>`;
}

function burg(s: Kontext, x: number): string {
  const farbe = '#181e3c';
  return `<g><rect x="${x}" y="${G - 112}" width="62" height="112" fill="${farbe}"/>${zinnen(x - 2, G - 112, 66, farbe)}`
    + `<rect x="${x - 16}" y="${G - 140}" width="20" height="140" fill="${farbe}"/>`
    + `<polygon points="${x - 19},${G - 140} ${x - 6},${G - 170} ${x + 7},${G - 140}" fill="${farbe}"/>`
    + `<rect x="${x + 58}" y="${G - 132}" width="20" height="132" fill="${farbe}"/>`
    + `<polygon points="${x + 55},${G - 132} ${x + 68},${G - 160} ${x + 81},${G - 132}" fill="${farbe}"/>`
    + fahne(x - 6.8, G - 188, '#c8a227') + fahne(x + 67.2, G - 178, '#7c3aed')
    + fenster(s, x, G - 104, 62, 90, 61) + fenster(s, x - 16, G - 128, 20, 110, 62) + fenster(s, x + 58, G - 122, 20, 104, 63)
    + '</g>';
}

function berg(s: Kontext): string {
  let out = `<polygon points="520,${G} 585,150 610,160 650,105 675,118 705,46 735,98 760,90 800,140 800,${G}" fill="#121733"/>`
    + `<polyline points="650,105 675,118 705,46 735,98 760,90" fill="none" stroke="#252c52" stroke-width="2"/>`;
  if (s.stufe >= 7) {
    const treppe = '592,172 610,160 603,148 625,136 618,124 641,112 634,100 657,88 650,76 674,64 667,52 692,42 686,28 704,14 698,-4';
    out += `<polyline points="${treppe}" fill="none" stroke="#f5d27a" stroke-width="5" opacity=".18"/>`
      + `<polyline class="sw-treppe" points="${treppe}" fill="none" stroke="#f5d27a" stroke-width="1.8" stroke-dasharray="5 4"/>`;
    // Funkelnde Lichter entlang der Treppe, damit sie auch als kleiner Ausschnitt magisch wirkt
    for (const [x, y, verzoegerung] of [[618, 124, 0], [650, 76, 1.1], [674, 64, 2.3], [692, 42, 0.6], [704, 14, 1.7]]) {
      out += `<circle class="sw-stern" style="animation-delay:${verzoegerung}s" cx="${x}" cy="${y}" r="2.2" fill="#fde68a"/>`;
    }
  }
  return out;
}

function herz(s: Kontext): string {
  const erwacht = s.stufe >= 7;
  const kristall = '400,50 425,96 418,172 400,192 382,172 375,96';
  let out = '<g>';
  if (erwacht) {
    out += `<circle class="sw-aura" cx="400" cy="120" r="120" fill="url(#${s.id('aura')})"/>`;
    for (let i = 0; i < 10; i++) {
      const w = (i / 10) * Math.PI * 2;
      out += `<line x1="400" y1="118" x2="${(400 + Math.cos(w) * 150).toFixed(1)}" y2="${(118 + Math.sin(w) * 110).toFixed(1)}" stroke="#c4b5fd" stroke-width="1" opacity=".16"/>`;
    }
    out += `<polygon points="${kristall}" fill="url(#${s.id('kristall')})"/>`;
  } else {
    // Baustelle: Gerüst um den freigelegten Kristall, je Herzstein heller
    const hell = 0.12 + 0.13 * s.herzsteine;
    out += `<polygon points="${kristall}" fill="#8b5cf6" opacity="${hell.toFixed(2)}" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="4 3"/>`
      + `<g stroke="#4b3a22" stroke-width="2"><line x1="368" y1="${G}" x2="368" y2="88"/><line x1="432" y1="${G}" x2="432" y2="88"/>`
      + `<line x1="366" y1="150" x2="434" y2="150"/><line x1="366" y1="110" x2="434" y2="110"/>`
      + `<line x1="368" y1="${G}" x2="432" y2="150"/><line x1="432" y1="150" x2="368" y2="110"/></g>`;
  }
  out += `<polyline points="400,50 400,192" stroke="#ede9fe" stroke-width=".8" opacity="${erwacht ? '.7' : '.25'}"/>`
    + `<polyline points="375,96 400,118 425,96" fill="none" stroke="#ede9fe" stroke-width=".8" opacity="${erwacht ? '.6' : '.25'}"/>`;
  for (let i = 0; i < 5; i++) {
    const an = erwacht || i < s.herzsteine;
    out += `<circle cx="${384 + i * 8}" cy="${G - 8}" r="2.6" fill="${an ? '#67e8f9' : '#1e2445'}" stroke="#a78bfa" stroke-width=".6"/>`;
  }
  if (erwacht) {
    const r = zufall(77);
    for (let i = 0; i < 14; i++) {
      out += `<circle class="sw-funke" style="animation-delay:${(r() * 4).toFixed(2)}s" cx="${(330 + r() * 140).toFixed(1)}" cy="${(70 + r() * 120).toFixed(1)}" r="${(0.8 + r() * 1.4).toFixed(1)}" fill="#e9d5ff"/>`;
    }
  }
  return out + '</g>';
}

// Reihenfolge = Zeichenreihenfolge: erst hinten, dann vorne, die Mauer zuletzt.
const TEILE: Teil[] = [
  // Hintere Reihe
  { ab: 3, svg: () => muehle(132) },
  { ab: 4, svg: s => markthalle(s, 488) },
  { ab: 5, svg: s => haus(s, 222, 40, 70, 18, HINTEN, 51) },
  { ab: 5, svg: s => turm(s, 292, 28, 92, 40, HINTEN, 52) },
  { ab: 5, svg: s => haus(s, 604, 42, 64, 16, HINTEN, 53) },
  { ab: 6, svg: s => haus(s, 168, 44, 82, 18, HINTEN, 54) },
  { ab: 6, svg: s => burg(s, 676) },
  { ab: 6, svg: s => herz(s) },
  // Vordere Reihe
  { ab: 1, bis: 2, svg: () => zelt(292, 36, 26) },
  { ab: 1, bis: 2, svg: () => zelt(336, 44, 32) },
  { ab: 1, bis: 2, svg: () => zelt(434, 42, 30) },
  { ab: 1, bis: 4, svg: () => lagerfeuer(400) },
  { ab: 1, bis: 2, svg: () => schild(492) },
  { ab: 2, svg: s => haus(s, 214, 38, 26, 16, VORNE, 21) },
  { ab: 2, svg: s => haus(s, 528, 40, 28, 16, VORNE, 22) },
  { ab: 2, svg: s => haus(s, 574, 34, 24, 14, VORNE, 23) },
  { ab: 3, svg: s => haus(s, 258, 44, 44, 18, VORNE, 32) },
  { ab: 3, svg: s => baeckerei(s, 612) },
  { ab: 3, svg: s => haus(s, 660, 46, 38, 16, VORNE, 33) },
  { ab: 4, svg: () => marktstand(304, '#b91c1c') },
  { ab: 4, svg: () => marktstand(454, '#1d4ed8') },
  { ab: 4, svg: s => haus(s, 158, 38, 32, 14, VORNE, 42) },
  { ab: 4, svg: s => haus(s, 712, 40, 34, 14, VORNE, 43) },
  { ab: 5, svg: () => stadtmauer() },
];

/**
 * SVG der Stadt auf einer Stadtstufe. `idPraefix` muss je Bild auf der Seite eindeutig sein
 * (Farbverläufe), `neu` lässt die Gebäude dieser Stufe einblenden (nach einem Aufstieg).
 */
export function stadtSilhouette(
  stufe: number, herzsteine: number, opts: { idPraefix: string; neu?: boolean; klein?: boolean },
): string {
  const s: Kontext = { stufe, herzsteine, id: name => `${opts.idPraefix}-${name}` };
  const r = zufall(7);
  let sterne = '';
  for (let i = 0; i < 46; i++) {
    const funkelt = r() < 0.35;
    sterne += `<circle${funkelt ? ` class="sw-stern" style="animation-delay:${(r() * 5).toFixed(2)}s"` : ''} cx="${(r() * 800).toFixed(1)}" cy="${(4 + r() * 128).toFixed(1)}" r="${(0.5 + r() * 1.1).toFixed(2)}" fill="#e8e4ff" opacity="${(0.35 + r() * 0.55).toFixed(2)}"/>`;
  }
  const teile = TEILE
    .filter(t => stufe >= t.ab && (t.bis === undefined || stufe <= t.bis))
    .map(t => (opts.neu && t.ab === stufe ? `<g class="sw-neu">${t.svg(s)}</g>` : t.svg(s)))
    .join('');
  // Klein (Banner im Hauptmenü): Ausschnitt um den Dorfplatz, damit die Häuser grösser wirken
  const viewBox = opts.klein ? '170 56 460 184' : '0 0 800 240';
  return `<svg class="sw-svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Die Stadt auf Stufe ${stufe}">
  <defs>
    <linearGradient id="${s.id('himmel')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#070a1c"/><stop offset=".6" stop-color="#141838"/><stop offset="1" stop-color="${stufe >= 7 ? '#3b2766' : '#2a2350'}"/>
    </linearGradient>
    <radialGradient id="${s.id('aura')}"><stop offset="0" stop-color="#a855f7" stop-opacity=".55"/><stop offset=".55" stop-color="#7c3aed" stop-opacity=".18"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <linearGradient id="${s.id('kristall')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f3ff"/><stop offset=".35" stop-color="#c084fc"/><stop offset=".75" stop-color="#7c3aed"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
  </defs>
  <rect width="800" height="240" fill="url(#${s.id('himmel')})"/>
  ${sterne}
  <circle cx="566" cy="74" r="32" fill="#efe3c0" opacity=".08"/><circle cx="566" cy="74" r="14" fill="#efe3c0" opacity=".9"/>
  ${berg(s)}
  <path d="M0 ${G - 18} Q120 ${G - 34} 240 ${G - 16} T520 ${G - 14} T800 ${G - 22} V${G} H0 Z" fill="#0e1228"/>
  ${teile}
  <rect y="${G}" width="800" height="${240 - G}" fill="#080b17"/><rect y="${G}" width="800" height="1" fill="#1f2547"/>
</svg>`;
}
