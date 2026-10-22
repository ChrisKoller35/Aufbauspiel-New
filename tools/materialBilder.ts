// ============================================================
// Magic City – Bilder der Schmiede-Materialien
// ============================================================
// Zeichnet die Materialien der Schmiede (src/data/schmiede.ts) als SVG und
// speichert sie mit sharp als PNG (128 × 128, durchsichtig) unter
// public/assets/sprites/final/. Keine KI, kein Netz, kostet nichts.
//
// Nutzung:
//   npm run material-bilder            # alle Materialien
//   npm run material-bilder -- KEY     # nur eins, z. B. MAT_GLUTKERN
//
// Die Bilder sind nicht in tools/spriteRegistry.ts, weil sie nicht generiert werden.
// ============================================================

import sharp from 'sharp';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ZIEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets/sprites/final');
const GROESSE = 128;
const LINIE = '#1b1208';

/** Weicher Schatten unter dem Gegenstand und ein Leuchten in einer Farbe */
function defs(id: string, leuchten: string): string {
  return `
    <filter id="${id}-schatten" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.2"/>
      <feOffset dy="2.5"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.55"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="${id}-schein" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${leuchten}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${leuchten}" stop-opacity="0"/>
    </radialGradient>`;
}

/** Ein kleiner Funkel-Stern */
function funkeln(x: number, y: number, r: number, farbe = '#ffffff'): string {
  return `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}
    Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="${farbe}"/>`;
}

const BILDER: Record<string, string> = {
  // Bernsteinfarbener Harztropfen mit einem eingeschlossenen Blatt
  MAT_WALDHARZ: `
    <defs>${defs('h', '#fbbf24')}
      <radialGradient id="h-k" cx="38%" cy="58%" r="65%">
        <stop offset="0%" stop-color="#fde68a"/><stop offset="45%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#9a3412"/>
      </radialGradient>
    </defs>
    <circle cx="64" cy="72" r="50" fill="url(#h-schein)"/>
    <g filter="url(#h-schatten)">
      <path d="M64 14 C78 38 98 56 98 80 C98 101 82 114 64 114 C46 114 30 101 30 80 C30 56 50 38 64 14Z"
        fill="url(#h-k)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M52 92 C56 76 66 68 78 64 C76 78 68 90 52 92Z" fill="#4d7c0f" opacity="0.8" stroke="#365314" stroke-width="1.5"/>
      <path d="M52 92 L74 68" stroke="#365314" stroke-width="1.5" opacity="0.8"/>
      <path d="M46 62 C48 50 54 40 60 32" stroke="#fffbeb" stroke-width="6" stroke-linecap="round" opacity="0.75" fill="none"/>
      <circle cx="44" cy="74" r="3.5" fill="#fffbeb" opacity="0.8"/>
    </g>
    <path d="M100 30 C104 37 108 41 108 46 C108 50 105 53 101 53 C97 53 94 50 94 46 C94 41 97 37 100 30Z"
      fill="#f59e0b" stroke="${LINIE}" stroke-width="3"/>
    ${funkeln(30, 34, 6)}`,

  // Leuchtender Moorpilz mit glimmenden Tupfen
  MAT_MOORPILZ: `
    <defs>${defs('p', '#34d399')}
      <radialGradient id="p-hut" cx="45%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#a7f3d0"/><stop offset="40%" stop-color="#10b981"/><stop offset="100%" stop-color="#064e3b"/>
      </radialGradient>
      <linearGradient id="p-stiel" x1="0" x2="1">
        <stop offset="0%" stop-color="#d6d3d1"/><stop offset="60%" stop-color="#f5f5f4"/><stop offset="100%" stop-color="#a8a29e"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="58" r="52" fill="url(#p-schein)"/>
    <g filter="url(#p-schatten)">
      <path d="M54 66 C52 84 48 100 44 112 L84 112 C80 100 76 84 74 66Z" fill="url(#p-stiel)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M54 70 C60 74 68 74 74 70" stroke="#78716c" stroke-width="2" fill="none"/>
      <path d="M16 66 C16 36 38 16 64 16 C90 16 112 36 112 66 C96 74 32 74 16 66Z"
        fill="url(#p-hut)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="44" cy="40" r="6" fill="#ecfccb"/><circle cx="72" cy="30" r="4.5" fill="#ecfccb"/>
      <circle cx="88" cy="48" r="5.5" fill="#ecfccb"/><circle cx="58" cy="56" r="4" fill="#ecfccb"/>
      <circle cx="30" cy="56" r="3.5" fill="#ecfccb"/>
      <path d="M30 40 C36 28 46 22 56 20" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.55" fill="none"/>
    </g>
    <circle cx="22" cy="94" r="3" fill="#6ee7b7"/><circle cx="104" cy="88" r="2.5" fill="#6ee7b7"/><circle cx="98" cy="104" r="2" fill="#a7f3d0"/>`,

  // Grauer Erzbrocken mit leuchtend blauen Adern
  MAT_HOEHLENERZ: `
    <defs>${defs('e', '#60a5fa')}
      <linearGradient id="e-s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#94a3b8"/><stop offset="55%" stop-color="#475569"/><stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="e-o" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="70" r="50" fill="url(#e-schein)"/>
    <g filter="url(#e-schatten)">
      <path d="M22 78 L34 40 L62 24 L94 34 L108 66 L98 98 L64 110 L32 102Z" fill="url(#e-s)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M34 40 L62 24 L94 34 L76 50 L46 54Z" fill="url(#e-o)" opacity="0.9"/>
      <path d="M46 54 L76 50 L94 34 M76 50 L80 84 M46 54 L40 90" stroke="#0f172a" stroke-width="2" opacity="0.6" fill="none"/>
      <path d="M30 70 C42 66 50 74 60 70 C70 66 78 76 92 70" stroke="#3b82f6" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M30 70 C42 66 50 74 60 70 C70 66 78 76 92 70" stroke="#bfdbfe" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M58 88 C64 82 72 90 80 86" stroke="#3b82f6" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M58 88 C64 82 72 90 80 86" stroke="#bfdbfe" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </g>
    ${funkeln(92, 60, 7, '#dbeafe')}${funkeln(42, 66, 5, '#dbeafe')}`,

  // Fächermuschel mit einer schimmernden Perle davor
  MAT_TIEFSEEPERLE: `
    <defs>${defs('m', '#7dd3fc')}
      <linearGradient id="m-u" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ccfbf1"/><stop offset="55%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#115e59"/>
      </linearGradient>
      <radialGradient id="m-p" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#fce7f3"/><stop offset="100%" stop-color="#a5b4fc"/>
      </radialGradient>
    </defs>
    <circle cx="64" cy="66" r="52" fill="url(#m-schein)"/>
    <g filter="url(#m-schatten)">
      <path d="M52 98 L48 110 L80 110 L76 98Z" fill="#0f766e" stroke="${LINIE}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M64 102 C40 102 18 92 16 64 C16 40 38 18 64 16 C90 18 112 40 112 64 C110 92 88 102 64 102Z"
        fill="url(#m-u)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <clipPath id="m-c"><path d="M64 102 C40 102 18 92 16 64 C16 40 38 18 64 16 C90 18 112 40 112 64 C110 92 88 102 64 102Z"/></clipPath>
      <g clip-path="url(#m-c)">
        ${[-62, -40, -20, 0, 20, 40, 62].map(w => `<path d="M64 100 L64 10" transform="rotate(${w} 64 100)" stroke="#134e4a" stroke-width="2.5" opacity="0.55"/>`).join('')}
      </g>
      <path d="M30 46 C38 32 50 24 62 22" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.65" stroke-linecap="round"/>
      <circle cx="64" cy="84" r="18" fill="url(#m-p)" stroke="${LINIE}" stroke-width="3.5"/>
      <circle cx="57" cy="77" r="6" fill="#ffffff" opacity="0.95"/>
    </g>
    ${funkeln(98, 30, 6, '#e0f2fe')}${funkeln(24, 100, 4, '#e0f2fe')}`,

  // Genietete Torplatte mit schwerem Eisenring und einem roten Wimpel
  MAT_FESTUNGSEISEN: `
    <defs>${defs('f', '#94a3b8')}
      <linearGradient id="f-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e5e7eb"/><stop offset="100%" stop-color="#6b7280"/>
      </linearGradient>
      <linearGradient id="f-v" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6b7280"/><stop offset="55%" stop-color="#374151"/><stop offset="100%" stop-color="#111827"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="52" fill="url(#f-schein)" opacity="0.6"/>
    <g filter="url(#f-schatten)">
      <rect x="20" y="16" width="88" height="88" rx="12" fill="url(#f-v)" stroke="${LINIE}" stroke-width="4"/>
      <rect x="29" y="25" width="70" height="70" rx="7" fill="none" stroke="#9ca3af" stroke-width="2" opacity="0.45"/>
      ${[[31, 27], [97, 27], [31, 93], [97, 93]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="url(#f-o)" stroke="${LINIE}" stroke-width="2.5"/>`).join('')}
      <path d="M28 22 L76 22" stroke="#d1d5db" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
      <rect x="55" y="34" width="18" height="16" rx="4" fill="url(#f-o)" stroke="${LINIE}" stroke-width="3"/>
      <circle cx="64" cy="76" r="25" fill="none" stroke="${LINIE}" stroke-width="14"/>
      <circle cx="64" cy="76" r="25" fill="none" stroke="#9ca3af" stroke-width="7.5"/>
      <path d="M44 66 C48 56 56 52 64 51" stroke="#f3f4f6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M58 100 L70 100 L72 118 L64 112 L56 118Z" fill="#b91c1c" stroke="${LINIE}" stroke-width="3" stroke-linejoin="round"/>
    </g>`,

  // Blüte aus Eis mit sechs Blättern
  MAT_EISBLUETE: `
    <defs>${defs('i', '#a5f3fc')}
      <linearGradient id="i-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ecfeff"/><stop offset="55%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#0e7490"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="54" fill="url(#i-schein)"/>
    <g filter="url(#i-schatten)">
      ${[0, 60, 120, 180, 240, 300].map(w => `
      <g transform="rotate(${w} 64 64)">
        <path d="M64 64 C54 50 54 30 64 14 C74 30 74 50 64 64Z" fill="url(#i-b)" stroke="${LINIE}" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M64 58 L64 24" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
      </g>`).join('')}
      <circle cx="64" cy="64" r="11" fill="#ecfeff" stroke="${LINIE}" stroke-width="3"/>
      <circle cx="64" cy="64" r="5" fill="#22d3ee"/>
    </g>
    ${funkeln(104, 26, 7, '#ecfeff')}${funkeln(22, 100, 5, '#ecfeff')}`,

  // Angelaufenes Silbermedaillon mit Totenkopf und grünem Schimmer
  MAT_GRUFTSILBER: `
    <defs>${defs('g', '#86efac')}
      <radialGradient id="g-m" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#f1f5f9"/><stop offset="50%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#3f4a5a"/>
      </radialGradient>
    </defs>
    <circle cx="64" cy="66" r="52" fill="url(#g-schein)" opacity="0.8"/>
    <g filter="url(#g-schatten)">
      <path d="M64 10 L64 22" stroke="${LINIE}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="64" cy="12" r="6" fill="none" stroke="#94a3b8" stroke-width="4"/>
      <circle cx="64" cy="68" r="44" fill="url(#g-m)" stroke="${LINIE}" stroke-width="4"/>
      <circle cx="64" cy="68" r="35" fill="none" stroke="#475569" stroke-width="2.5" stroke-dasharray="4 5"/>
      <path d="M48 64 C48 50 56 44 64 44 C72 44 80 50 80 64 C80 72 76 76 72 78 L72 86 L56 86 L56 78 C52 76 48 72 48 64Z"
        fill="#e2e8f0" stroke="${LINIE}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="58" cy="64" r="5" fill="#1e293b"/><circle cx="70" cy="64" r="5" fill="#1e293b"/>
      <path d="M61 86 L61 80 M67 86 L67 80" stroke="${LINIE}" stroke-width="2"/>
      <path d="M30 90 C38 102 50 108 64 110" stroke="#4ade80" stroke-width="4" fill="none" opacity="0.45" stroke-linecap="round"/>
      <path d="M38 44 C44 36 52 32 60 31" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>
    </g>
    <circle cx="104" cy="36" r="3" fill="#86efac" opacity="0.9"/><circle cx="22" cy="60" r="2.5" fill="#86efac" opacity="0.9"/>`,

  // Schwarzer Steinkern mit glühenden Rissen
  MAT_GLUTKERN: `
    <defs>${defs('k', '#f97316')}
      <radialGradient id="k-s" cx="40%" cy="38%" r="70%">
        <stop offset="0%" stop-color="#57534e"/><stop offset="60%" stop-color="#292524"/><stop offset="100%" stop-color="#0c0a09"/>
      </radialGradient>
      <radialGradient id="k-g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fef3c7"/><stop offset="45%" stop-color="#fb923c"/><stop offset="100%" stop-color="#c2410c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="64" cy="66" r="58" fill="url(#k-schein)"/>
    <g filter="url(#k-schatten)">
      <path d="M26 66 C24 42 42 24 64 22 C88 22 106 40 104 66 C104 90 86 108 62 108 C40 108 26 90 26 66Z"
        fill="url(#k-s)" stroke="${LINIE}" stroke-width="4"/>
      <circle cx="66" cy="66" r="18" fill="url(#k-g)"/>
      <path d="M66 66 L44 44 M66 66 L92 50 M66 66 L84 96 M66 66 L42 86 M66 66 L62 30 M44 44 L34 50 M92 50 L100 64 M42 86 L36 74"
        stroke="#f97316" stroke-width="6" stroke-linecap="round" fill="none"/>
      <path d="M66 66 L44 44 M66 66 L92 50 M66 66 L84 96 M66 66 L42 86 M66 66 L62 30 M44 44 L34 50 M92 50 L100 64 M42 86 L36 74"
        stroke="#fde68a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <circle cx="66" cy="66" r="7" fill="#fffbeb"/>
    </g>
    <circle cx="104" cy="28" r="3" fill="#fb923c"/><circle cx="96" cy="16" r="2" fill="#fde68a"/><circle cx="24" cy="30" r="2.5" fill="#fb923c"/>`,

  // Rot-goldene Drachenschuppe mit Graten
  MAT_DRACHENSCHUPPE: `
    <defs>${defs('d', '#f87171')}
      <linearGradient id="d-s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fca5a5"/><stop offset="40%" stop-color="#dc2626"/><stop offset="100%" stop-color="#450a0a"/>
      </linearGradient>
      <linearGradient id="d-r" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="66" r="50" fill="url(#d-schein)"/>
    <g filter="url(#d-schatten)">
      <path d="M64 12 C88 20 104 40 104 64 C104 88 86 106 64 116 C42 106 24 88 24 64 C24 40 40 20 64 12Z"
        fill="url(#d-r)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M64 22 C82 30 94 46 94 64 C94 84 80 98 64 106 C48 98 34 84 34 64 C34 46 46 30 64 22Z" fill="url(#d-s)"/>
      <path d="M64 26 L64 102" stroke="#fca5a5" stroke-width="3" opacity="0.7"/>
      <path d="M64 44 C56 50 48 52 40 52 M64 44 C72 50 80 52 88 52 M64 66 C56 72 48 74 40 74 M64 66 C72 72 80 74 88 74 M64 86 C58 90 52 92 46 92 M64 86 C70 90 76 92 82 92"
        stroke="#7f1d1d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M44 36 C50 30 56 27 62 26" stroke="#ffffff" stroke-width="4" fill="none" opacity="0.7" stroke-linecap="round"/>
    </g>
    ${funkeln(98, 30, 7, '#fef3c7')}`,

  // Tintenfläschchen mit Sternen in der blauen Tinte
  MAT_HIMMELSTINTE: `
    <defs>${defs('t', '#818cf8')}
      <radialGradient id="t-t" cx="45%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="55%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#0b1026"/>
      </radialGradient>
      <linearGradient id="t-k" x1="0" x2="1">
        <stop offset="0%" stop-color="#a16207"/><stop offset="50%" stop-color="#d6a35c"/><stop offset="100%" stop-color="#78350f"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="72" r="50" fill="url(#t-schein)"/>
    <g filter="url(#t-schatten)">
      <path d="M50 30 L78 30 L78 42 C98 50 106 66 104 84 C102 104 86 114 64 114 C42 114 26 104 24 84 C22 66 30 50 50 42Z"
        fill="url(#t-t)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M44 16 L84 16 L82 32 L46 32Z" fill="url(#t-k)" stroke="${LINIE}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M36 70 C40 58 48 52 56 50" stroke="#c7d2fe" stroke-width="4" fill="none" opacity="0.6" stroke-linecap="round"/>
      ${funkeln(58, 82, 7, '#fde68a')}${funkeln(80, 70, 5, '#ffffff')}${funkeln(74, 98, 4, '#fde68a')}${funkeln(44, 96, 3.5, '#ffffff')}
      <circle cx="90" cy="88" r="2" fill="#ffffff"/><circle cx="50" cy="66" r="1.8" fill="#ffffff"/>
    </g>
    ${funkeln(104, 26, 6, '#c7d2fe')}`,

  // Barren aus dunkelblauem Sternenstahl mit goldenen Funken (Sternenschmiede, Sternenschlund)
  MAT_STERNENSTAHL: `
    <defs>${defs('s', '#93c5fd')}
      <linearGradient id="s-o" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#eff6ff"/><stop offset="100%" stop-color="#8ea6e8"/>
      </linearGradient>
      <linearGradient id="s-v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4c63b6"/><stop offset="40%" stop-color="#22306b"/><stop offset="100%" stop-color="#0b1026"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="70" r="54" fill="url(#s-schein)"/>
    <g filter="url(#s-schatten)">
      <path d="M36 46 L92 46 L100 64 L28 64Z" fill="url(#s-o)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M28 64 L100 64 L114 100 L14 100Z" fill="url(#s-v)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M42 50 L86 50" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
      <path d="M30 70 L98 70" stroke="#93c5fd" stroke-width="2" opacity="0.5"/>
      ${funkeln(46, 84, 8, '#fde68a')}${funkeln(78, 78, 5, '#ffffff')}${funkeln(94, 92, 4, '#fde68a')}
      <circle cx="62" cy="92" r="1.8" fill="#ffffff"/><circle cx="30" cy="92" r="1.6" fill="#ffffff"/>
    </g>
    ${funkeln(100, 26, 8, '#fde68a')}${funkeln(24, 34, 5, '#bfdbfe')}`,

  // Barren aus Mondsilber in Sichelform, kalt und hell, mit eisblauem Schein (Mondhof)
  MAT_MONDSILBER: `
    <defs>${defs('mo', '#bae6fd')}
      <linearGradient id="mo-s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fafc"/><stop offset="50%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
      <linearGradient id="mo-i" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#334155"/>
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="54" fill="url(#mo-schein)"/>
    <g filter="url(#mo-schatten)">
      <path d="M78 14 C48 20 28 44 30 72 C32 98 52 114 76 116 C60 106 50 90 50 70 C50 48 62 28 78 14Z"
        fill="url(#mo-s)" stroke="${LINIE}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M78 14 C62 28 50 48 50 70 C50 90 60 106 76 116 C66 110 58 96 56 78 C54 54 64 32 78 14Z"
        fill="url(#mo-i)" opacity="0.75"/>
      <path d="M44 48 C52 36 60 28 68 22" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8" fill="none"/>
      <path d="M38 76 L44 76 M40 86 L46 86" stroke="#334155" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      <circle cx="40" cy="60" r="2" fill="#ffffff" opacity="0.9"/>
    </g>
    ${funkeln(96, 44, 8, '#e0f2fe')}${funkeln(104, 84, 5, '#ffffff')}${funkeln(92, 104, 4, '#e0f2fe')}
    <circle cx="86" cy="64" r="1.8" fill="#ffffff"/><circle cx="100" cy="24" r="1.6" fill="#e0f2fe"/>`,
};

async function zeichne(key: string): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GROESSE}" height="${GROESSE}" viewBox="0 0 128 128">${BILDER[key]}</svg>`;
  const datei = path.join(ZIEL, `${key}.png`);
  await sharp(Buffer.from(svg)).png().toFile(datei);
  console.log(`✓ ${key}.png`);
}

async function main(): Promise<void> {
  const nur = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const keys = nur.length ? nur : Object.keys(BILDER);
  for (const key of keys) {
    if (!BILDER[key]) {
      console.error(`Unbekannt: ${key}. Vorhanden: ${Object.keys(BILDER).join(', ')}`);
      process.exitCode = 1;
      continue;
    }
    await zeichne(key);
  }
}

main();
