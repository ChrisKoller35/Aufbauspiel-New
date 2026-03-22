/**
 * Magic City – Item Card Compositor
 * Layout: Text links oben, Waffe rechts (leicht überlaufend), Gold/Orange-Akzente
 *
 * Nutzung:
 *   npm run composite-item -- WAR_HAMMER auto 5
 *   npm run composite-item -- WAR_HAMMER "pfad/zur/waffe.png" 5
 *
 *   Arg 1: Item-Key (UPPER_SNAKE_CASE, ohne ITEM_ Prefix)
 *   Arg 2: Pfad zum Waffen-Artwork ODER "auto" (nutzt generierten Sprite aus generated/)
 *   Arg 3: Rahmen-Nummer 1-5 (default: 5 = Gold)
 */

import sharp from 'sharp';
import fs from 'fs';
import { ITEM_DEFS } from '../src/data/items.js';
import { getStatLabel, formatStatValue, getSpecialEffectText, getSlotLabel, getWeaponTypeLabel } from '../src/ui/html/ItemRarity.js';

// ─── Inline Background Removal (Magenta + Black) ──────────────────────────────

function isMagenta(r: number, g: number, b: number): boolean {
  if (r > 150 && g < 100 && b > 150) return true;
  if (r > 160 && g < 100 && b > 130 && (r + b) > (g * 3)) return true;
  return false;
}
function isBlack(r: number, g: number, b: number): boolean {
  return Math.max(r, g, b) < 20;
}
function isSemiMagenta(r: number, g: number, b: number): boolean {
  if (g >= r && g >= b) return false;
  if (r < 100 || b < 80) return false;
  const mag = Math.min(1, r/160) * Math.min(1, b/130) * (1 - g / Math.max(r, b, 1));
  return mag > 0.35;
}
function magentaAmount(r: number, g: number, b: number): number {
  if (g >= r && g >= b) return 0;
  if (r < 80 || b < 60) return 0;
  return Math.min(1, Math.min(1, r/180) * Math.min(1, b/140) * (1 - g / Math.max(r, b, 1)));
}

async function removeBg(inputBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  const w = info.width, h = info.height, total = w * h;
  const isBg = new Uint8Array(total);
  const idx = (x: number, y: number) => y * w + x;
  const pix = (x: number, y: number) => { const i = (y*w+x)*4; return [pixels[i],pixels[i+1],pixels[i+2],pixels[i+3]]; };

  const queue: number[] = [];
  const seed = (x: number, y: number) => {
    const [r,g,b,a] = pix(x,y);
    if (a === 0 || isMagenta(r,g,b) || isBlack(r,g,b)) {
      const i = idx(x,y); if (!isBg[i]) { isBg[i]=1; queue.push(i); }
    }
  };
  for (let x = 0; x < w; x++) { seed(x,0); seed(x,h-1); }
  for (let y = 0; y < h; y++) { seed(0,y); seed(w-1,y); }

  let head = 0;
  while (head < queue.length) {
    const ci = queue[head++];
    for (const [nx,ny] of [[ci%w-1,Math.floor(ci/w)],[ci%w+1,Math.floor(ci/w)],[ci%w,Math.floor(ci/w)-1],[ci%w,Math.floor(ci/w)+1]]) {
      if (nx<0||nx>=w||ny<0||ny>=h) continue;
      const ni = idx(nx,ny); if (isBg[ni]) continue;
      const [r,g,b,a] = pix(nx,ny);
      isBg[ni] = (a===0||isMagenta(r,g,b)||isBlack(r,g,b)) ? 1 : 2;
      if (isBg[ni]===1) queue.push(ni);
    }
  }

  for (let i = 0; i < total; i++) {
    if (isBg[i]===1) { pixels[i*4+3]=0; continue; }
    if (isBg[i]===2) continue;
    const pi=i*4, r=pixels[pi],g=pixels[pi+1],b=pixels[pi+2],a=pixels[pi+3];
    let adj=false;
    const x=i%w,y=Math.floor(i/w);
    for (const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])
      if (nx>=0&&nx<w&&ny>=0&&ny<h&&isBg[idx(nx,ny)]===1){adj=true;break;}
    if (!adj) continue;
    if (isSemiMagenta(r,g,b)) pixels[pi+3]=Math.max(0,Math.round((1-magentaAmount(r,g,b)*0.8)*a));
    else if (Math.max(r,g,b)<40) pixels[pi+3]=Math.max(0,Math.round(a*0.3));
  }

  return sharp(pixels, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CARD_W = 860;
const CARD_H = 960;

// Waffe: rechte Hälfte, leicht überlaufend
const ART_W      = 660;   // deckt rechte 77% der Karte ab
const ART_H      = 920;   // fast volle Kartenhöhe
const ART_LEFT   = 240;   // startet bei 240, endet bei 900 → 40px overflow
const ART_TOP    = 20;    // leicht nach unten eingerückt

// Text-Bereich: linke Seite, mittig vertikal
const TEXT_X     = 50;
const TEXT_MAX_W = 330;

const FRAMES: Record<number, string> = {
  1: 'Vorlage Ramen/openart-image_1773420513259_3ae58417_1773420513694_40638f7e.png',
  2: 'Vorlage Ramen/openart-image_1773420519835_7c83b384_1773420520547_ac925e0b.png',
  3: 'Vorlage Ramen/openart-image_1773420539437_8e2aabdc_1773420539924_6e51696b.png',
  4: 'Vorlage Ramen/openart-image_1773420561104_e0348b18_1773420561428_b8965fe5.png',
  5: 'Vorlage Ramen/openart-image_1773420597029_eae8ec8b_1773420597554_5b6df257.png',
};

const STAT_COLORS: Record<string, string> = {
  atk: '#FF7A30', def: '#5BC8F5', hp: '#4AE880', spd: '#F5D040', critChance: '#F5D040',
};

// ─── Args ─────────────────────────────────────────────────────────────────────

const [,, itemKey = 'WAR_HAMMER', artworkArg = 'auto', frameArgStr = '5'] = process.argv;
const frameNum = parseInt(frameArgStr, 10) || 5;
const itemId   = itemKey.toLowerCase();

// ─── Lookup Item ──────────────────────────────────────────────────────────────

const item = (ITEM_DEFS as Record<string, any>)[itemId];
if (!item) { console.error(`❌ Item '${itemId}' nicht gefunden`); process.exit(1); }

const sb      = item.statBonuses ?? {};
const special = getSpecialEffectText(item.tags ?? []);
const slotLbl = item.gearSlot ? getSlotLabel(item.gearSlot) : '';
const wepLbl  = getWeaponTypeLabel(item.weaponSlotType);
const typeStr = [slotLbl, wepLbl].filter(Boolean).join(' · ');

// ─── Paths ────────────────────────────────────────────────────────────────────

const framePath   = FRAMES[frameNum];
const artworkPath = artworkArg === 'auto'
  ? `public/assets/sprites/generated/ITEM_${itemKey.toUpperCase()}.png`
  : artworkArg;
const outputPath  = `public/assets/sprites/final/ITEM_${itemKey.toUpperCase()}.png`;

if (!fs.existsSync(framePath))   { console.error(`❌ Rahmen nicht gefunden: ${framePath}`); process.exit(1); }
if (!fs.existsSync(artworkPath)) { console.error(`❌ Artwork nicht gefunden: ${artworkPath}`); process.exit(1); }

// ─── SVG Text (linke Seite) ────────────────────────────────────────────────────

let y = 470;   // Stats starten bei ~50% der Kartenhöhe
const LINE = 62;

// Stats rows
const statRows = Object.entries(sb).map(([key, val]) => {
  const color = STAT_COLORS[key] ?? '#F2F2F2';
  const lbl   = getStatLabel(key);
  const v     = formatStatValue(key, val as number);
  const row   = `
    <text x="${TEXT_X}" y="${y}" font-family="Arial,sans-serif" font-size="26" fill="#C0C8D8">${lbl}</text>
    <text x="${TEXT_X + TEXT_MAX_W - 10}" y="${y}" font-family="Arial,sans-serif" font-size="28"
          font-weight="bold" fill="${color}" text-anchor="end">${v}</text>`;
  y += LINE;
  return row;
}).join('');

// Special effect
const specialBlock = special ? (() => {
  y += 12;
  const lines = special.includes('–') ? special.split('–').map(s => s.trim()) : [special];
  let out = `<rect x="${TEXT_X - 6}" y="${y - 28}" width="${TEXT_MAX_W + 12}" height="${lines.length * 38 + 16}"
        fill="rgba(0,80,0,0.55)" rx="6" stroke="#1eff0055" stroke-width="1"/>`;
  out += `<text x="${TEXT_X + 4}" y="${y}" font-family="Arial,sans-serif" font-size="19"
        fill="#1eff00" font-style="italic">&#x2736; ${lines[0]}</text>`;
  if (lines[1]) out += `<text x="${TEXT_X + 4}" y="${y + 36}" font-family="Arial,sans-serif" font-size="18"
        fill="#1eff00" font-style="italic">${lines[1]}</text>`;
  return out;
})() : '';

const statsStartY = 85 + Object.keys(sb).length * LINE + (special ? 80 : 0);

const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
  <!-- Dunkles Gradient links für Lesbarkeit -->
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="rgba(0,0,0,0.88)"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.75)"/>
      <stop offset="65%" stop-color="rgba(0,0,0,0.30)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="url(#lg)"/>

  <!-- Item Name -->
  <text x="${TEXT_X}" y="370" font-family="Georgia,serif" font-size="50" font-weight="bold"
        fill="#FFD700">${item.name}</text>

  <!-- Divider unter Name -->
  <line x1="${TEXT_X}" y1="388" x2="${TEXT_X + TEXT_MAX_W}" y2="388"
        stroke="#FFD70066" stroke-width="2"/>

  <!-- Typ + Rarity -->
  <text x="${TEXT_X}" y="418" font-family="Arial,sans-serif" font-size="22" fill="#C8A840"
        >T${item.tier ?? '?'} · ${typeStr}</text>
  <line x1="${TEXT_X}" y1="435" x2="${TEXT_X + TEXT_MAX_W}" y2="435"
        stroke="#FFFFFF22" stroke-width="1"/>

  ${statRows}
  ${specialBlock}
</svg>`;

// ─── Composite ────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🔨 Compositing ${itemKey} (Rahmen ${frameNum})...`);

  // 1. Rahmen auf Kartengröße
  const frameResized = await sharp(framePath)
    .resize(CARD_W, CARD_H, { fit: 'fill' })
    .toBuffer();

  // 2. Waffen-Artwork: erst BG entfernen, dann skalieren
  const artRaw   = await sharp(artworkPath).toBuffer();
  const artNoBg  = await removeBg(artRaw);
  const artScaled = await sharp(artNoBg)
    .resize(ART_W, ART_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .toBuffer();

  // Radiale Vignette-Maske: Mitte = weiß (sichtbar), Rand = schwarz (transparent)
  // Hammer sitzt im rechten 60% Bereich → Maske asymmetrisch (mehr links ausfaden)
  const vignetteMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}">
    <defs>
      <radialGradient id="v" cx="50%" cy="48%" r="48%" gradientUnits="objectBoundingBox">
        <stop offset="0%"   stop-color="white" stop-opacity="1"/>
        <stop offset="50%"  stop-color="white" stop-opacity="1"/>
        <stop offset="75%"  stop-color="white" stop-opacity="0.5"/>
        <stop offset="92%"  stop-color="white" stop-opacity="0.05"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${ART_W}" height="${ART_H}" fill="url(#v)"/>
  </svg>`);

  const artResized = await sharp(artScaled)
    .composite([{ input: vignetteMask, blend: 'dest-in' }])
    .toBuffer();

  // 3. SVG Text-Overlay
  const svgBuf = Buffer.from(svgText);

  // 4a. Dunkle Ellipse hinter dem Artwork (neutralisiert den Glow-Hintergrund)
  const backdropSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">
    <radialGradient id="bg" cx="65%" cy="50%" r="45%">
      <stop offset="0%"  stop-color="rgba(5,5,15,0.96)"/>
      <stop offset="70%" stop-color="rgba(5,5,15,0.85)"/>
      <stop offset="100%" stop-color="rgba(5,5,15,0)"/>
    </radialGradient>
    <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>
  </svg>`);

  // 4b. Zusammenbauen: Rahmen → dunkler Backdrop → Artwork → Text
  await sharp(frameResized)
    .composite([
      { input: backdropSvg, left: 0,        top: 0,        blend: 'over' },
      { input: artResized,  left: ART_LEFT, top: ART_TOP,  blend: 'over' },
      { input: svgBuf,      left: 0,        top: 0,        blend: 'over' },
    ])
    .png()
    .toFile(outputPath);

  console.log(`✅ Fertig! → ${outputPath}\n`);
}

run().catch(err => { console.error('❌ Fehler:', err.message); process.exit(1); });
