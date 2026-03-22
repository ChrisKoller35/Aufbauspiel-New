/**
 * cutWeaponSheetV2.ts
 * Improved cutter: detects actual cell boundaries by finding dark separator lines.
 * Adds inset to avoid border artifacts from the slot frame edges.
 * IMPORTANT: NO remove-bg — colored slot backgrounds are intentional!
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

const INPUT = path.resolve('public/assets/sprites/WaffenIcons t1-t4 sheet gründ blau violet und orang.png');
const OUTPUT_FINAL = path.resolve('public/assets/sprites/final');
const OUTPUT_GEN   = path.resolve('public/assets/sprites/generated');

const TARGET_SIZE = 128;
const COLS = 4;
const ROWS = 4;

const MAPPING: string[][] = [
  ['ITEM_IRON_SWORD',         'ITEM_STEEL_SWORD',         'ITEM_HYDRA_VENOMFANG',      'ITEM_SOULBREAKER'],
  ['ITEM_IRON_SHIELD',        'ITEM_STEEL_SHIELD',        'ITEM_WYRM_SCALE_SHIELD',    'ITEM_AETHER_GUARDIAN_SHIELD'],
  ['ITEM_HUNTER_BOW',         'ITEM_LONGBOW',             'ITEM_FALLEN_HUNTERS_BOW',   'ITEM_ETERNAL_HUNTER_BOW'],
  ['ITEM_OAK_STAFF',          'ITEM_CRYSTAL_STAFF',       'ITEM_CRYSTAL_GOLEM_STAFF',  'ITEM_WORLDEND_STAFF'],
];

/** Find separator lines by scanning for columns/rows with very dark average brightness */
async function findSeparators(
  raw: Buffer, width: number, height: number, count: number, direction: 'x' | 'y'
): Promise<number[]> {
  const channels = 4; // RGBA

  const averages: number[] = [];

  if (direction === 'x') {
    // Scan each column, compute average brightness
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * channels;
        sum += (raw[idx] + raw[idx+1] + raw[idx+2]) / 3;
      }
      averages.push(sum / height);
    }
  } else {
    // Scan each row, compute average brightness
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        sum += (raw[idx] + raw[idx+1] + raw[idx+2]) / 3;
      }
      averages.push(sum / width);
    }
  }

  // Find the (count-1) darkest regions = separators between cells
  // We expect count-1 = 3 separators for 4 cells
  // Each separator is a band of dark pixels

  const size = direction === 'x' ? width : height;
  const approxCellSize = size / count;
  const separators: number[] = [];

  // Search in windows around expected separator positions
  for (let i = 1; i < count; i++) {
    const expectedCenter = Math.round(i * approxCellSize);
    const searchRadius = Math.round(approxCellSize * 0.15); // 15% search window
    const start = Math.max(0, expectedCenter - searchRadius);
    const end = Math.min(size - 1, expectedCenter + searchRadius);

    // Find darkest pixel in window
    let minBrightness = Infinity;
    let minPos = expectedCenter;
    for (let p = start; p <= end; p++) {
      if (averages[p] < minBrightness) {
        minBrightness = averages[p];
        minPos = p;
      }
    }
    separators.push(minPos);
  }

  return separators;
}

/** Convert separator positions to cell [start, end] pairs */
function toCellRanges(separators: number[], totalSize: number): Array<[number, number]> {
  const boundaries = [0, ...separators, totalSize];
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    ranges.push([boundaries[i], boundaries[i + 1]]);
  }
  return ranges;
}

async function cut() {
  const meta = await sharp(INPUT).metadata();
  const W = meta.width!;
  const H = meta.height!;
  console.log(`Sheet: ${W}×${H}`);

  // Load raw RGBA for separator detection
  const raw = await sharp(INPUT).ensureAlpha().raw().toBuffer();

  /** Compute average brightness per column or row */
  function avgBrightness(dir: 'x' | 'y', size: number, other: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let j = 0; j < other; j++) {
        const idx = dir === 'x'
          ? (j * size + i) * 4   // column i, row j
          : (i * W + j) * 4;     // row i, col j
        sum += (raw[idx] + raw[idx+1] + raw[idx+2]) / 3;
      }
      out.push(sum / other);
    }
    return out;
  }

  /**
   * Find (count-1) separator center positions.
   * Searches near expected equally-spaced positions, finds darkest pixel.
   */
  function findSeps(avgs: number[], total: number, count: number): number[] {
    const seps: number[] = [];
    const approxCell = total / count;
    for (let i = 1; i < count; i++) {
      const expected = Math.round(i * approxCell);
      const radius   = Math.round(approxCell * 0.12);
      const lo = Math.max(0, expected - radius);
      const hi = Math.min(total - 1, expected + radius);
      let minVal = Infinity, minPos = expected;
      for (let p = lo; p <= hi; p++) {
        if (avgs[p] < minVal) { minVal = avgs[p]; minPos = p; }
      }
      seps.push(minPos);
    }
    return seps;
  }

  /** Convert separator centers (+ half-width of separator gap) to cell [start,end] pairs */
  function sepsToCellRanges(seps: number[], total: number, halfGap = 3): Array<[number, number]> {
    const bounds = [0, ...seps.flatMap(s => [s - halfGap, s + halfGap]), total];
    // bounds has pairs: [0, s0-g, s0+g, s1-g, s1+g, ..., total]
    const ranges: Array<[number, number]> = [];
    for (let i = 0; i < seps.length + 1; i++) {
      const start = i === 0 ? 0 : seps[i - 1] + halfGap;
      const end   = i === seps.length ? total : seps[i] - halfGap;
      ranges.push([start, end]);
    }
    return ranges;
  }

  const xAvg  = avgBrightness('x', W, H);
  const yAvg  = avgBrightness('y', H, W);
  const xSeps = findSeps(xAvg, W, COLS);
  const ySeps = findSeps(yAvg, H, ROWS);

  console.log(`X separator centers: ${xSeps.join(', ')}`);
  console.log(`Y separator centers: ${ySeps.join(', ')}`);

  // Half-gap = 4px (separators appear to be ~8px wide dark bands)
  const xRanges = sepsToCellRanges(xSeps, W, 4);
  const yRanges = sepsToCellRanges(ySeps, H, 4);

  console.log('X ranges:', xRanges.map(([a,b]) => `${a}-${b} (${b-a}px)`).join(', '));
  console.log('Y ranges:', yRanges.map(([a,b]) => `${a}-${b} (${b-a}px)`).join(', '));

  // Inset: trim slot frame border — small value since we already skip the separator gap
  const INSET = 10; // pixels to trim from each edge of a cell

  const results: string[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = MAPPING[row][col];
      const [xStart, xEnd] = xRanges[col];
      const [yStart, yEnd] = yRanges[row];

      // Compute a centered SQUARE crop to avoid any distortion on resize
      const cellW = xEnd - xStart;
      const cellH = yEnd - yStart;
      const sqSize = Math.min(cellW, cellH) - INSET * 2;
      const left   = xStart + Math.floor((cellW - sqSize) / 2);
      const top    = yStart + Math.floor((cellH - sqSize) / 2);
      const width  = sqSize;
      const height = sqSize;

      console.log(`  ${key}: cell ${cellW}×${cellH} → square (${left},${top}) ${width}×${height}px`);

      const outFinal = path.join(OUTPUT_FINAL, `${key}.png`);
      const outGen   = path.join(OUTPUT_GEN,   `${key}.png`);

      await sharp(INPUT)
        .extract({ left, top, width, height })
        .resize(TARGET_SIZE, TARGET_SIZE, {
          kernel: 'lanczos3',
          fit: 'fill', // square in → square out, no distortion
        })
        .toFile(outFinal);

      fs.copyFileSync(outFinal, outGen);
      results.push(key);
    }
  }

  // Also write CRYSTAL_GOLEM_STAFF alias
  const coreSrc = path.join(OUTPUT_FINAL, 'ITEM_CRYSTAL_GOLEM_STAFF.png');
  const coreDst = path.join(OUTPUT_FINAL, 'ITEM_CRYSTAL_GOLEM_CORE.png');
  if (fs.existsSync(coreSrc)) {
    fs.copyFileSync(coreSrc, coreDst);
    fs.copyFileSync(coreSrc, path.join(OUTPUT_GEN, 'ITEM_CRYSTAL_GOLEM_CORE.png'));
  }

  console.log(`\n✅ Done! ${results.length} icons cut and saved.`);
  console.log('⚠️  NO remove-bg was run — slot backgrounds preserved.');
}

cut().catch(err => { console.error(err); process.exit(1); });
