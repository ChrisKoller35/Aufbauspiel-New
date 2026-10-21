// ─── Magic City – Dungeon Map Screen (Redesign) ──────────────
// Scrollable SVG world map with organic paths & branching routes.
// Main path runs bottom→top, side branches lead to dead ends.
// ──────────────────────────────────────────────────────────────

import '../html/dungeonkarte.css';
import { GameState } from '../../models/GameState';
import {
  ROUTE_DEFS, RouteDef, DUNGEON_GRAPH, DungeonGraphNode, ROUTE_IMAGE_MAP, isRouteAvailable, isRouteCompleted, getRouteLockReasons,
} from '../../data/routes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ITEM_DEFS } from '../../data/items';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';
import { setFuerRoute } from '../../data/dungeonSets';
import { setKurzinfo, setTeileHtml } from '../components/SetAnzeige';
import { materialZeile } from '../components/SchmiedeAnzeige';
import { kartenGeschichteHtml } from '../components/GeschichtsAnzeige';
import { GildenStand, gildenAufKarte, gipfelRangliste } from '../../systems/Rangliste';



// ── Module state ──

let gameState: GameState | null = null;

// ── Public API ──

export function initDungeonMapScreen(state: GameState): void {
  gameState = state;
}

export function renderDungeonMapScreen(container: HTMLElement): void {
  const state = gameState;
  if (!state) return;

  const el = document.createElement('div');
  el.id = 's-dungeon';
  el.className = 'screen';

  el.innerHTML = `
    ${renderHeader(state, 'expeditions', 'DUNGEONKARTE')}
    <div class="dmap-wrap" id="dmap-wrap">
      ${buildDungeonSVG(state)}
    </div>
    <div class="dmap-legend-float">
      <button type="button" class="dmap-legend-knopf" data-legende-knopf aria-expanded="false">Legende</button>
      <div class="dmap-legend-title">LEGENDE</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#4ade80"></span> Wald</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#fcd34d"></span> Sumpf</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#93c5fd"></span> Höhle</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#c4b5fd"></span> Ruinen</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#fca5a5"></span> Vulkan</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#7dd3fc"></span> Unterwasser</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#f9a8d4"></span> Belagerung</div>
      ${Object.values(GEBIETE).map(g => `<div class="dmap-legend-row"><span class="dmap-ldot" style="background:${g.stil.stroke};box-shadow:0 0 5px ${g.stil.glow}"></span> ${g.stil.label}</div>`).join('')}
      <div class="dmap-legend-row" style="margin-top:4px"><span class="dmap-ldot" style="background:#c8a227"></span> Hauptpfad</div>
      <div class="dmap-legend-row"><span class="dmap-lhex" style="background:#c8a227"></span> Boss</div>
      <div class="dmap-legend-row"><span class="dmap-lwappen">🦅</span> Gilde, höchster Dungeon</div>
    </div>
    <div class="dmap-scroll-hint" id="dmap-scroll-hint">▲ SCROLL — HÖHER = GEFÄHRLICHER ▲</div>
  `;

  // Modal overlay
  const modal = document.createElement('div');
  modal.className = 'dmap-modal-overlay';
  modal.id = 'dmap-modal';
  modal.innerHTML = `
    <div class="dmap-modal">
      <button class="dmap-modal-close" id="dmap-modal-close">✕</button>
      <div id="dmap-m-icon"></div>
      <div id="dmap-m-tag"></div>
      <div id="dmap-m-name"></div>
      <div id="dmap-m-sub"></div>
      <div class="dmap-m-detail" id="dmap-m-detail"></div>
      <div id="dmap-m-actions"></div>
    </div>
  `;
  el.appendChild(modal);

  bindDungeonEvents(el);
  container.appendChild(el);

  // Scroll to bottom (start node); on narrow screens also centre horizontally
  requestAnimationFrame(() => {
    const wrap = document.getElementById('dmap-wrap');
    if (!wrap) return;
    wrap.scrollTop = wrap.scrollHeight;
    wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2;
  });

  // Fade scroll hint on first scroll
  const wrap = el.querySelector('#dmap-wrap');
  if (wrap) {
    let hintHidden = false;
    wrap.addEventListener('scroll', () => {
      if (!hintHidden) {
        hintHidden = true;
        const hint = document.getElementById('dmap-scroll-hint');
        if (hint) hint.classList.add('dmap-hint-gone');
      }
    });
  }
}

// ── Biome classification ──

interface BiomeStyle {
  fill: string;
  stroke: string;
  text: string;
  glow: string;
  icon: string;
  label: string;
}

/** Gebiete über dem Vulkankern (RouteDef.gebiet): Farbe der Dungeons, Schriftzug und Schein auf der Karte. */
const GEBIETE: Record<NonNullable<RouteDef['gebiet']>, { stil: BiomeStyle; region: string }> = {
  gipfel: {
    stil: { fill: '#3a1405', stroke: '#fdba74', text: '#fdba74', glow: '#f97316', icon: '🐉', label: 'Drachengipfel' },
    region: 'DRACHENGIPFEL — MYTHISCH',
  },
  himmel: {
    stil: { fill: '#141b3a', stroke: '#e0e7ff', text: '#e0e7ff', glow: '#a5b4fc', icon: '📚', label: 'Himmel' },
    region: 'ÜBER DEN WOLKEN — JENSEITS',
  },
  sterne: {
    stil: { fill: '#1a0b33', stroke: '#fde68a', text: '#fef3c7', glow: '#a855f7', icon: '🌠', label: 'Sterne' },
    region: 'ZWISCHEN DEN STERNEN — UNENDLICH',
  },
};

function getBiomeStyle(route: RouteDef): BiomeStyle {
  if (route.gebiet) return GEBIETE[route.gebiet].stil;
  if (route.isUnderwater) return { fill: '#0a2540', stroke: '#7dd3fc', text: '#7dd3fc', glow: '#38bdf8', icon: '🌊', label: 'Unterwasser' };
  if (route.isSiegeRoute) return { fill: '#2a1020', stroke: '#f9a8d4', text: '#f9a8d4', glow: '#ec4899', icon: '🏰', label: 'Belagerung' };
  const id = route.id;
  if (id.includes('volcano') || id.includes('obsidian') || id.includes('ash') || id.includes('magma')) return { fill: '#450a0a', stroke: '#fca5a5', text: '#fca5a5', glow: '#ef4444', icon: '🌋', label: 'Vulkan' };
  if (id.includes('ruins') || id.includes('shadow') || id.includes('frozen')) return { fill: '#250d50', stroke: '#c4b5fd', text: '#c4b5fd', glow: '#a78bfa', icon: '🏛️', label: 'Ruinen' };
  if (id.includes('swamp')) return { fill: '#3a1e05', stroke: '#fcd34d', text: '#fcd34d', glow: '#eab308', icon: '☠️', label: 'Sumpf' };
  if (id.includes('cave') || id.includes('crystal') || id.includes('spider')) return { fill: '#0f1e4a', stroke: '#93c5fd', text: '#93c5fd', glow: '#60a5fa', icon: '💎', label: 'Höhle' };
  if (id.includes('haunted')) return { fill: '#0d2e16', stroke: '#4ade80', text: '#86efac', glow: '#22c55e', icon: '👻', label: 'Wald' };
  return { fill: '#0d2e16', stroke: '#4ade80', text: '#4ade80', glow: '#22c55e', icon: '🌲', label: 'Wald' };
}

/** Schwierigkeit als Sterne; Ebenen über 5 bekommen je einen Funken dazu (★★★★★✦). */
function sterne(tier: number): string {
  return '★'.repeat(Math.min(tier, 5)) + '☆'.repeat(Math.max(0, 5 - tier)) + '✦'.repeat(Math.max(0, tier - 5));
}

// ── Build graph index ──

function buildGraphIndex(): { nodeMap: Map<string, DungeonGraphNode>; allEdges: [string, string][] } {
  const nodeMap = new Map<string, DungeonGraphNode>();
  const allEdges: [string, string][] = [];
  for (const node of DUNGEON_GRAPH) {
    nodeMap.set(node.routeId, node);
    for (const target of node.leadsTo) {
      allEdges.push([node.routeId, target]);
    }
  }
  return { nodeMap, allEdges };
}

// ── Über dem Vulkankern: Himmel für die neuen Dungeons ──

/** Platz über dem obersten Dungeon: Himmel und der Weg ins Unerforschte (buildUnerforscht). */
const GIPFEL_RAND = 330;

/**
 * Hintergrund über der alten Karte (y < 0): Nachthimmel mit Sternen, ein Wolkenband
 * unter dem Himmel-Gebiet, Glut und Schein um die Dungeons (Schriftzüge: gebietsSchriftzuege).
 * Alles richtet sich nach DUNGEON_GRAPH, neue Dungeons weiter oben brauchen hier nichts.
 */
function buildGipfelHimmel(width: number, oben: number): string {
  if (oben <= 0) return '';
  const gebietsKnoten = DUNGEON_GRAPH
    .map(n => ({ n, gebiet: ROUTE_DEFS[n.routeId]?.gebiet }))
    .filter((k): k is { n: DungeonGraphNode; gebiet: NonNullable<RouteDef['gebiet']> } => !!k.gebiet);

  let html = `
    <defs>
      <linearGradient id="dmap-himmel-g" gradientUnits="userSpaceOnUse" x1="0" y1="${-oben}" x2="0" y2="0">
        <stop offset="0" stop-color="#060810"/>
        <stop offset=".25" stop-color="#0c1233"/>
        <stop offset=".6" stop-color="#11122e"/>
        <stop offset=".85" stop-color="#140a10"/>
        <stop offset="1" stop-color="#060810"/>
      </linearGradient>
      <linearGradient id="dmap-himmel-naht" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#060810" stop-opacity="0"/>
        <stop offset="50%" stop-color="#060810" stop-opacity=".85"/>
        <stop offset="100%" stop-color="#060810" stop-opacity="0"/>
      </linearGradient>`;
  for (const [id, g] of Object.entries(GEBIETE)) {
    html += `
      <radialGradient id="dmap-schein-${id}">
        <stop offset="0%" stop-color="${g.stil.glow}" stop-opacity=".22"/>
        <stop offset="100%" stop-color="${g.stil.glow}" stop-opacity="0"/>
      </radialGradient>`;
  }
  html += `
    </defs>
    <rect y="${-oben}" width="${width}" height="${oben}" fill="url(#dmap-himmel-g)"/>
    <rect y="-110" width="${width}" height="220" fill="url(#dmap-himmel-naht)"/>`;

  let sternHtml = '';
  for (let i = 0; i < 80; i++) {
    const x = (i * 211 + 37) % width;
    const y = -oben + 20 + ((i * 131) % Math.max(1, oben - 160));
    sternHtml += `<circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 1.4 : 0.8}" fill="#f3e7c4" opacity="${i % 3 ? 0.3 : 0.6}"/>`;
  }
  html += `<g>${sternHtml}</g>`;

  // Zwischen den Sternen: violetter Nebel und ein dichteres Sternenfeld, einige Sterne funkeln
  const sterneYs = gebietsKnoten.filter(k => k.gebiet === 'sterne').map(k => k.n.y);
  if (sterneYs.length > 0) {
    const bis = Math.max(...sterneYs) + 320;
    const hoehe = bis + oben;
    html += `
    <defs>
      <radialGradient id="dmap-nebel">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity=".2"/>
        <stop offset="55%" stop-color="#4c1d95" stop-opacity=".1"/>
        <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${width / 2}" cy="${-oben + hoehe / 2}" rx="${width * 0.8}" ry="${hoehe / 2}" fill="url(#dmap-nebel)"/>`;
    let feld = '';
    for (let i = 0; i < 90; i++) {
      const x = (i * 157 + 61) % width;
      const y = -oben + 24 + ((i * 97) % Math.max(1, hoehe - 48));
      const gross = i % 6 === 0;
      const farbe = i % 4 === 0 ? '#fde68a' : '#f8fafc';
      feld += `<circle${gross ? ' class="dmap-funkeln"' : ''} cx="${x}" cy="${y}" r="${gross ? 1.9 : 1}" fill="${farbe}" opacity="${gross ? 0.85 : 0.45}"${gross ? ` style="animation-delay:-${(i % 5) * 0.7}s"` : ''}/>`;
    }
    html += `<g class="dmap-sternenfeld">${feld}</g>`;
  }

  // Wolkenband unter dem Himmel-Gebiet
  const himmelYs = gebietsKnoten.filter(k => k.gebiet === 'himmel').map(k => k.n.y);
  if (himmelYs.length > 0) {
    const wolkenY = Math.max(...himmelYs) + 250;
    let wolken = '';
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 105 + (i % 2) * 30;
      const y = wolkenY + ((i * 37) % 50) - 25;
      const rx = 90 + ((i * 53) % 60);
      wolken += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${22 + (i % 3) * 8}" fill="#c7d2fe" opacity="${0.05 + (i % 3) * 0.02}"/>`;
    }
    html += `<g class="dmap-wolken">${wolken}</g>`;
  }

  // Schein um jeden Dungeon
  for (const { n, gebiet } of gebietsKnoten) {
    html += `<circle cx="${n.x}" cy="${n.y}" r="260" fill="url(#dmap-schein-${gebiet})"/>`;
  }
  return html;
}

/**
 * Über dem obersten Dungeon: ein Weg, der in den Sternen verblasst, und ein leeres
 * Feld mit Fragezeichen. Die Karte wächst nach oben, sobald neue Dungeons dazukommen
 * (docs/NEUE-DUNGEONS.md); dieser Teil rückt dann von selbst mit.
 */
function buildUnerforscht(width: number): string {
  const oberster = DUNGEON_GRAPH.reduce((a, b) => (b.y < a.y ? b : a));
  const radius = ROUTE_DEFS[oberster.routeId]?.bossId ? 80 : 64;
  const feld = { x: Math.round((oberster.x + width / 2) / 2), y: oberster.y - 230 };
  const vonY = oberster.y - radius - 8;
  const bisY = feld.y + 52;
  return `
    <defs>
      <linearGradient id="dmap-unerforscht-g" gradientUnits="userSpaceOnUse" x1="0" y1="${vonY}" x2="0" y2="${bisY}">
        <stop offset="0" stop-color="#c8a227" stop-opacity=".5"/>
        <stop offset="1" stop-color="#c8a227" stop-opacity=".08"/>
      </linearGradient>
    </defs>
    <g class="dmap-unerforscht">
      <title>Hier wächst die Karte weiter: Neue Dungeons kommen dazu.</title>
      <path d="M${oberster.x},${vonY} C${oberster.x},${vonY - 50} ${feld.x},${bisY + 50} ${feld.x},${bisY}"
        fill="none" stroke="url(#dmap-unerforscht-g)" stroke-width="2.5" stroke-dasharray="8 6" stroke-linecap="round"/>
      <polygon points="${hexPoints(feld.x, feld.y, 44, 30)}" fill="#0c1233" fill-opacity=".5" stroke="#c8a227" stroke-width="1.5" stroke-dasharray="6 5" opacity=".5"/>
      <text x="${feld.x}" y="${feld.y}" text-anchor="middle" dominant-baseline="central" font-size="28" font-family="Cinzel, serif" fill="#c8a227" opacity=".6" style="user-select:none">?</text>
      <text class="dmap-t-klein" x="${feld.x}" y="${feld.y - 66}" ${SCHRIFT_ART} fill="#c8a227" opacity=".6">NOCH UNERFORSCHT</text>
    </g>`;
}

// ── Gebiets-Schriftzüge ──

interface Schriftzug { x: number; y: number; farbe: string; deckkraft: number; text: string }

const SCHRIFT_ART = 'text-anchor="middle" font-size="9" font-family="Cinzel, serif" letter-spacing="3"';

/** Schriftzug unter dem untersten Dungeon jedes Gebiets über dem Vulkankern. */
function gebietsSchriftzuege(width: number): Schriftzug[] {
  const liste: Schriftzug[] = [];
  for (const [id, g] of Object.entries(GEBIETE)) {
    const ys = DUNGEON_GRAPH.filter(n => ROUTE_DEFS[n.routeId]?.gebiet === id).map(n => n.y);
    if (ys.length > 0) liste.push({ x: width / 2, y: Math.max(...ys) + 175, farbe: g.stil.stroke, deckkraft: 0.3, text: g.region });
  }
  return liste;
}

/**
 * Die Wege laufen oft mitten durch die Schriftzüge. Diese Maske spart sie unter den Buchstaben
 * (mit etwas Rand) aus, so bleibt die Schrift lesbar. Am Handy setzt dungeonkarte.css die
 * Maske gleich gross wie die Schrift.
 */
function wegeMaske(schriftzuege: Schriftzug[], width: number, von: number, bis: number): string {
  const flaeche = `x="-50" y="${von}" width="${width + 100}" height="${bis - von}"`;
  const buchstaben = schriftzuege.map(s =>
    `<text class="dmap-t-region-maske" x="${s.x}" y="${s.y}" ${SCHRIFT_ART} fill="black" stroke="black" stroke-width="6" stroke-linejoin="round">${s.text}</text>`).join('');
  return `<mask id="dmap-wege-maske" maskUnits="userSpaceOnUse" ${flaeche}><rect ${flaeche} fill="white"/>${buchstaben}</mask>`;
}

// ── SVG World Map ──

function buildDungeonSVG(state: GameState): string {
  const WIDTH = 900;
  const HEIGHT = 2600;

  const { nodeMap, allEdges } = buildGraphIndex();
  // Rangliste mit Rivalen: Wappen jeder Gilde auf ihrem höchsten bezwungenen Dungeon
  const aufKarte = gildenAufKarte(state, Date.now());
  // Dungeons über dem Vulkankern haben negative y: so viel Platz kommt oben dazu
  const minY = Math.min(0, ...DUNGEON_GRAPH.map(n => n.y));
  const oben = minY < 0 ? GIPFEL_RAND - minY : 0;

  let bgHtml = '';
  let pathsHtml = '';
  let nodesHtml = '';

  // ── Background atmosphere ──
  bgHtml += `
    <defs>
      <filter id="dmap-glow-f" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="dmap-bg-g" cx="50%" cy="50%">
        <stop offset="0%" stop-color="#0a0f1f"/>
        <stop offset="100%" stop-color="#060810"/>
      </radialGradient>
      <radialGradient id="dmap-top-glow" cx="50%" cy="5%" r="60%">
        <stop offset="0%" stop-color="#7f0000" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#060810" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="dmap-mid-glow" cx="40%" cy="50%" r="40%">
        <stop offset="0%" stop-color="#1a3a00" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#060810" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="dmap-bot-glow" cx="50%" cy="95%" r="50%">
        <stop offset="0%" stop-color="#3d2a00" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="#060810" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dmap-bg-g)"/>
    <rect width="${WIDTH}" height="${Math.round(HEIGHT * 0.25)}" fill="url(#dmap-top-glow)"/>
    <rect y="${Math.round(HEIGHT * 0.35)}" width="${WIDTH}" height="${Math.round(HEIGHT * 0.3)}" fill="url(#dmap-mid-glow)"/>
    <rect y="${Math.round(HEIGHT * 0.75)}" width="${WIDTH}" height="${Math.round(HEIGHT * 0.25)}" fill="url(#dmap-bot-glow)"/>
    ${buildGipfelHimmel(WIDTH, oben)}
  `;

  // ── Grid dots for atmosphere ──
  let gridDots = '';
  for (let gx = 40; gx < WIDTH; gx += 60) {
    for (let gy = 40 - oben; gy < HEIGHT; gy += 60) {
      gridDots += `<circle cx="${gx}" cy="${gy}" r="0.6" fill="#c8a227"/>`;
    }
  }
  bgHtml += `<g opacity="0.04">${gridDots}</g>`;

  // ── Region labels ──
  const regions = [
    { y: 2350, label: 'WALDRAND — EINSTEIGER', color: '#4ade80' },
    { y: 1850, label: 'HÖHLEN & KÜSTEN — ERFAHREN', color: '#93c5fd' },
    { y: 1200, label: 'SUMPF & RUINEN — VETERANEN', color: '#fcd34d' },
    { y: 650,  label: 'VULKANREGION — LEGENDÄR', color: '#fca5a5' },
  ];
  const schriftzuege: Schriftzug[] = [
    ...regions.map(r => ({ x: WIDTH / 2, y: r.y + 80, farbe: r.color, deckkraft: 0.25, text: r.label })),
    ...gebietsSchriftzuege(WIDTH),
  ];
  for (const s of schriftzuege) {
    nodesHtml += `<text class="dmap-t-region" x="${s.x}" y="${s.y}" ${SCHRIFT_ART} fill="${s.farbe}" opacity="${s.deckkraft}">${s.text}</text>`;
  }

  // ── Draw edges ──
  for (const [fromId, toId] of allEdges) {
    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    if (!fromNode || !toNode) continue;

    const fromRoute = ROUTE_DEFS[fromId];
    const toRoute = ROUTE_DEFS[toId];
    if (!fromRoute || !toRoute) continue;

    const isFromAvailable = isRouteAvailable(fromRoute, state);
    const isToAvailable = isRouteAvailable(toRoute, state);
    const isFromDone = isRouteCompleted(fromId, state);
    const isToDone = isRouteCompleted(toId, state);

    // Edge is "active" if both endpoints are available or completed
    const isActive = (isFromAvailable || isFromDone) && (isToAvailable || isToDone);
    const bothDone = isFromDone && isToDone;

    // Check if this is part of the main path
    const isMainEdge = fromNode.isMainPath && toNode.isMainPath;

    const edgeOpacity = bothDone ? 0.6 : isActive ? 0.4 : 0.1;
    const edgeColor = bothDone ? '#4ade80' : isMainEdge ? '#c8a227' : '#8a7a5a';
    const edgeWidth = isMainEdge ? 2.5 : 1.5;

    // Bezier curve between nodes
    const x1 = fromNode.x;
    const y1 = fromNode.y;
    const x2 = toNode.x;
    const y2 = toNode.y;

    // Control points: vertical bias for organic curves
    const dy = y1 - y2; // positive since from is below to
    const dx = x2 - x1;
    const cx1 = x1 + dx * 0.15;
    const cy1 = y1 - dy * 0.4;
    const cx2 = x2 - dx * 0.15;
    const cy2 = y2 + dy * 0.4;

    // Soft glow
    pathsHtml += `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
      fill="none" stroke="${edgeColor}" stroke-width="${edgeWidth + 4}" opacity="${edgeOpacity * 0.15}"/>`;
    // Main line
    pathsHtml += `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
      fill="none" stroke="${edgeColor}" stroke-width="${edgeWidth}" opacity="${edgeOpacity}"
      stroke-dasharray="${isMainEdge ? 'none' : '8 5'}" stroke-linecap="round"/>`;
  }

  // ── Draw nodes (all hexagonal) ──
  let clipDefsHtml = '';
  let nodeIdx = 0;

  for (const graphNode of DUNGEON_GRAPH) {
    const route = ROUTE_DEFS[graphNode.routeId];
    if (!route) continue;

    const { x, y } = graphNode;
    const biome = getBiomeStyle(route);
    const isCompleted = isRouteCompleted(route.id, state);
    const isAvailable = isRouteAvailable(route, state);
    const isLocked = !isAvailable && !isCompleted;
    const hasBoss = !!route.bossId;
    const r = hasBoss ? 80 : 64;
    const isDeadEnd = graphNode.leadsTo.length === 0 && !graphNode.isMainPath;
    const isStart = graphNode.routeId === 'forest_short';
    const hasImage = route.id in ROUTE_IMAGE_MAP;

    const statusClass = isCompleted ? 'dmap-node-done' : isAvailable ? 'dmap-node-open' : 'dmap-node-locked';
    // Locked: inner content dimmed, but border stays full strength
    const innerOpacityMult = isLocked ? 0.3 : 1;

    const strokeColor = isCompleted ? '#4ade80' : graphNode.isMainPath ? '#c8a227' : biome.stroke;
    const strokeWidth = isCompleted ? 3 : graphNode.isMainPath ? 2.5 : 2;

    // Unique clip path ID for this node's hex
    const clipId = `hex-clip-${nodeIdx++}`;
    clipDefsHtml += `<clipPath id="${clipId}"><polygon points="${hexPoints(x, y, r - 2, 30)}"/></clipPath>`;

    // Outer glow ring
    const glowRing = `<polygon points="${hexPoints(x, y, r + 10, 30)}" fill="${biome.stroke}" opacity="0.08" class="dmap-glow-ring"/>`;

    // Background hex fill (always drawn — visible when no image)
    const bgHex = `<polygon points="${hexPoints(x, y, r, 30)}" fill="${biome.fill}" opacity="${innerOpacityMult}" class="dmap-shape"/>`;

    // Expedition image clipped to hex shape
    let imageLayer = '';
    if (hasImage) {
      const imgKey = ROUTE_IMAGE_MAP[route.id];
      const imgSize = r * 2.2; // slightly larger than hex to ensure full coverage
      imageLayer = `<image href="assets/tiles/${imgKey}.png"
        x="${x - imgSize / 2}" y="${y - imgSize / 2}"
        width="${imgSize}" height="${imgSize}"
        clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"
        opacity="${innerOpacityMult}"/>`;
      // Darken overlay so labels are still readable (only when unlocked)
      if (!isLocked) imageLayer += `<polygon points="${hexPoints(x, y, r, 30)}" fill="${biome.fill}" opacity="0.25"/>`;
    }

    // Hex border (on top of image) — ALWAYS full opacity for visibility
    const border = `<polygon points="${hexPoints(x, y, r, 30)}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" class="dmap-shape"/>`;

    // Inner decorative ring (subtler when image is present)
    const innerRingOpacity = (hasImage ? 0.15 : 0.3) * innerOpacityMult;
    const inner = `<polygon points="${hexPoints(x, y, r * 0.6, 30)}" fill="none" stroke="${biome.stroke}" stroke-width="0.8" opacity="${innerRingOpacity}"/>`;

    // Boss extra ornament — also full opacity border
    const bossExtra = hasBoss
      ? `<polygon points="${hexPoints(x, y, r + 5, 0)}" fill="none" stroke="${biome.stroke}" stroke-width="1.2" opacity="0.25"/>
         <line x1="${x - r * 0.4}" y1="${y}" x2="${x + r * 0.4}" y2="${y}" stroke="${biome.stroke}" stroke-width="0.8" opacity="0.15"/>
         <line x1="${x}" y1="${y - r * 0.4}" x2="${x}" y2="${y + r * 0.4}" stroke="${biome.stroke}" stroke-width="0.8" opacity="0.15"/>`
      : '';

    // Start node special marker
    const startMarker = isStart
      ? `<circle cx="${x}" cy="${y + r + 55}" r="5" fill="#c8a227" opacity="0.6"/>
         <text class="dmap-t-klein" x="${x}" y="${y + r + 72}" text-anchor="middle" fill="#c8a227" font-size="9" font-family="Cinzel, serif" letter-spacing="2" opacity="0.7">START</text>`
      : '';

    // Dead end marker
    const deadEndMarker = isDeadEnd && !isStart
      ? `<text class="dmap-t-klein" x="${x}" y="${y - r - 12}" text-anchor="middle" fill="${biome.stroke}" font-size="7" font-family="Cinzel, serif" opacity="0.4" letter-spacing="1">SACKGASSE</text>`
      : '';

    // Emoji icon (hidden when image is present; big and glowing while a new dungeon has no image yet)
    const emojiSize = Math.round(r * 0.55);
    const emoji = hasImage
      ? '' // image replaces the emoji
      : `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${emojiSize}" filter="url(#dmap-glow-f)" style="user-select:none">${biome.icon}</text>`;

    // Name label
    const shortName = route.name.length > 18 ? route.name.substring(0, 17) + '…' : route.name;
    const labelOpacity = isLocked ? 0.4 : 1;
    const nameLabel = `<text class="dmap-t-name${hasBoss ? ' boss' : ''}" x="${x}" y="${y + r + 16}" text-anchor="middle" fill="${biome.text}" font-size="${hasBoss ? 11 : 9}" font-family="Cinzel, serif" letter-spacing="0.5" opacity="${labelOpacity}">${shortName}</text>`;

    // Difficulty stars
    const diff = route.tier;
    const stars = `<text class="dmap-t-sterne" x="${x}" y="${y + r + 29}" text-anchor="middle" fill="${biome.stroke}" font-size="8" opacity="${isLocked ? 0.3 : 0.6}">${sterne(diff)}</text>`;

    // Room count
    const roomsBadge = `<text class="dmap-t-raeume" x="${x}" y="${y + r + 41}" text-anchor="middle" fill="#6b6050" font-size="7.5" font-family="Cinzel, serif" opacity="${labelOpacity}">${route.rooms} Räume</text>`;

    // Completed checkmark
    const checkMark = isCompleted
      ? `<text x="${x + r + 5}" y="${y - r + 8}" font-size="16" fill="#4ade80">✓</text>`
      : '';

    // Available pulse dot
    const pulseDot = isAvailable && !isCompleted
      ? `<circle cx="${x + r + 3}" cy="${y - r}" r="5" fill="#c8a227" class="dmap-pulse-dot"/>`
      : '';

    // Lock icon for locked nodes
    const lockIcon = isLocked
      ? `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="18" fill="#555" style="user-select:none">🔒</text>`
      : '';

    nodesHtml += `
      <g class="dmap-nd ${statusClass}" data-route="${route.id}" style="cursor:pointer">
        ${glowRing}
        ${bossExtra}
        ${bgHex}
        ${imageLayer}
        ${border}
        ${inner}
        ${isLocked ? lockIcon : emoji}
        ${nameLabel}
        ${stars}
        ${roomsBadge}
        ${checkMark}
        ${pulseDot}
        ${startMarker}
        ${deadEndMarker}
        ${wappenHtml(aufKarte.get(route.id) ?? [], x, y - r * 0.55)}
      </g>`;
  }

  // Dungeons above the Vulkankern have negative y: the map moves down by the room above
  const totalHeight = HEIGHT + oben;
  return `
    <svg viewBox="0 0 ${WIDTH} ${totalHeight}" class="dmap-svg-scroll"
         xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         style="width:${WIDTH}px;height:${totalHeight}px;">
      <g transform="translate(0 ${oben})">
        ${bgHtml}
        <defs>${clipDefsHtml}${wegeMaske(schriftzuege, WIDTH, -oben, HEIGHT)}</defs>
        <g class="dmap-paths" mask="url(#dmap-wege-maske)">${pathsHtml}</g>
        ${oben > 0 ? buildUnerforscht(WIDTH) : ''}
        <g class="dmap-nodes">${nodesHtml}</g>
      </g>
    </svg>`;
}

// ── Wappen der Gilden (Rangliste mit Rivalen) ──

/** Bis zu drei Wappen nebeneinander, darüber hinaus «+n»; mit Namen beim Darüberfahren */
function wappenHtml(gilden: GildenStand[], cx: number, cy: number): string {
  if (gilden.length === 0) return '';
  const sichtbar = gilden.slice(0, 3);
  const rest = gilden.slice(3);
  const anzahl = sichtbar.length + (rest.length > 0 ? 1 : 0);
  const xVon = (i: number): number => cx + (i - (anzahl - 1) / 2) * 25;
  const kreise = sichtbar.map((g, i) => `
    <g class="dmap-wappen${g.spieler ? ' du' : ''}">
      <title>${g.name}: höchster Dungeon${g.spieler ? '' : ` (${g.sterne} Sterne)`}</title>
      <circle cx="${xVon(i)}" cy="${cy}" r="11.5" fill="rgba(10,8,5,0.88)" stroke="${g.spieler ? '#e6c060' : g.farbe ?? '#c8a227'}" stroke-width="2"/>
      <text x="${xVon(i)}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="13" style="user-select:none">${g.wappen}</text>
    </g>`).join('');
  const mehr = rest.length > 0 ? `
    <g class="dmap-wappen">
      <title>${rest.map(g => g.name).join(', ')}</title>
      <circle cx="${xVon(anzahl - 1)}" cy="${cy}" r="11.5" fill="rgba(10,8,5,0.88)" stroke="#8a7a5a" stroke-width="1.5"/>
      <text x="${xVon(anzahl - 1)}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#e5e7eb" font-family="Cinzel, serif">+${rest.length}</text>
    </g>` : '';
  return `<g class="dmap-wappen-reihe">${kreise}${mehr}</g>`;
}

// ── Hex point generator ──

function hexPoints(cx: number, cy: number, r: number, rotDeg: number = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + rotDeg);
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// ── Modal ──

function showRouteModal(routeId: string, state: GameState): void {
  const route = ROUTE_DEFS[routeId];
  if (!route) return;

  const biome = getBiomeStyle(route);
  const isCompleted = isRouteCompleted(route.id, state);
  const isAvailable = isRouteAvailable(route, state);
  const graphNode = DUNGEON_GRAPH.find(n => n.routeId === routeId);
  const isDeadEnd = graphNode ? graphNode.leadsTo.length === 0 && !graphNode.isMainPath : false;

  const iconEl = document.getElementById('dmap-m-icon');
  const tagEl = document.getElementById('dmap-m-tag');
  const nameEl = document.getElementById('dmap-m-name');
  const subEl = document.getElementById('dmap-m-sub');
  const detailEl = document.getElementById('dmap-m-detail');
  const actionsEl = document.getElementById('dmap-m-actions');
  const overlay = document.getElementById('dmap-modal');

  if (!iconEl || !tagEl || !nameEl || !subEl || !detailEl || !actionsEl || !overlay) return;

  iconEl.textContent = biome.icon;
  iconEl.style.fontSize = '2.5rem';
  iconEl.style.textAlign = 'center';
  iconEl.style.marginBottom = '8px';

  tagEl.innerHTML = `<span style="background:${biome.fill};color:${biome.text};border:1px solid ${biome.stroke};padding:2px 10px;border-radius:999px;font-family:Cinzel,serif;font-size:0.6rem;letter-spacing:2px;">${biome.label.toUpperCase()}</span>`;

  nameEl.textContent = route.name;
  subEl.textContent = `Ebene ${route.tier} · ${route.rooms} Räume · ${route.recommendedLevel}`;

  let detailHtml = '';
  if (route.bossId) detailHtml += `<p><span style="color:${biome.stroke}">Boss:</span> ${ENEMY_DEFS[route.bossId]?.name ?? route.bossId}</p>`;
  if (route.besonderheit) detailHtml += `<p><span style="color:${biome.stroke}">✦</span> ${route.besonderheit}</p>`;
  if (route.ersterSiegBeute && route.bossId) {
    const beute = ITEM_DEFS[route.ersterSiegBeute]?.name ?? route.ersterSiegBeute;
    const erhalten = state.guildStats.bossesDefeatedIds.includes(route.bossId);
    detailHtml += `<p style="color:#8a7a5a;font-size:0.75rem">${erhalten ? '✓' : '🎁'} Erster Sieg: ${beute}</p>`;
  }
  const set = setFuerRoute(route.id);
  if (set) {
    detailHtml += `<p><span style="color:#34d399">Set-Beute:</span> ${setKurzinfo(state, set, true)}</p>`
      + `<div class="dmap-set-teile set-teile">${setTeileHtml(state, set)}</div>`;
  }
  const material = materialZeile(route.id);
  if (material) detailHtml += `<p class="dmap-mat"><span style="color:#fbbf24">⚒️ Schmiede:</span> ${material}</p>`;
  detailHtml += kartenGeschichteHtml(state, route.id);
  if (isDeadEnd) detailHtml += `<p><span style="color:#8a7a5a">⚑ Sackgasse</span> — Kein Durchgang</p>`;
  if (route.isUnderwater) detailHtml += `<p><span style="color:#7dd3fc">🫧 Unterwasser-Route</span> — Luftvorrat beachten!</p>`;
  if (route.isSiegeRoute) detailHtml += `<p><span style="color:#f9a8d4">🏰 Belagerung</span> — Kriegsmaschine empfohlen</p>`;
  if (isCompleted) detailHtml += `<p style="color:#4ade80">✓ Bereits abgeschlossen</p>`;
  detailHtml += rivalenHtml(state, route.id);

  // Show unlock requirements if locked
  if (!isAvailable && !isCompleted) {
    for (const reason of getRouteLockReasons(route, state)) {
      detailHtml += `<p style="color:#ef4444">🔒 ${reason}</p>`;
    }
  }

  // Show connections
  if (graphNode && graphNode.leadsTo.length > 0) {
    const targetNames = graphNode.leadsTo
      .map(id => ROUTE_DEFS[id]?.name)
      .filter(Boolean)
      .join(', ');
    detailHtml += `<p style="color:#8a7a5a;font-size:0.75rem">→ Führt zu: ${targetNames}</p>`;
  }

  detailEl.innerHTML = detailHtml || '<p>Erkunde diese Route und besiege alle Gegner.</p>';

  if (isAvailable) {
    actionsEl.innerHTML = `<button class="dmap-btn-go" data-go-route="${route.id}">EXPEDITION STARTEN</button>`;
  } else if (isCompleted) {
    actionsEl.innerHTML = `<button class="dmap-btn-replay" data-go-route="${route.id}">ERNEUT SPIELEN</button>`;
  } else {
    actionsEl.innerHTML = `<button class="dmap-btn-locked" disabled>GESPERRT</button>`;
  }

  overlay.classList.add('dmap-modal-on');
}

/** Welche Rivalen-Gilden hier schon gesiegt haben und wer hier gerade ganz oben steht */
function rivalenHtml(state: GameState, routeId: string): string {
  const rivalen = gipfelRangliste(state, Date.now()).filter(g => !g.spieler);
  const hier = rivalen.filter(g => g.hoechster === routeId);
  const schon = rivalen.filter(g => g.bezwungen.includes(routeId));
  if (schon.length === 0) return '<p style="color:#8a7a5a;font-size:0.75rem">🏆 Noch keine Rivalen-Gilde hat diesen Dungeon bezwungen.</p>';
  let html = `<p style="color:#8a7a5a;font-size:0.75rem">🏆 Bezwungen von ${schon.length} ${schon.length === 1 ? 'Rivalen-Gilde' : 'Rivalen-Gilden'}: ${schon.map(g => g.wappen).join(' ')}</p>`;
  if (hier.length > 0) {
    html += `<p style="color:#8a7a5a;font-size:0.75rem">Ihr höchster Dungeon bisher: ${hier.map(g => `${g.wappen} ${g.name}`).join(', ')}</p>`;
  }
  return html;
}

function hideRouteModal(): void {
  const overlay = document.getElementById('dmap-modal');
  if (overlay) overlay.classList.remove('dmap-modal-on');
}

// ── Events ──

function bindDungeonEvents(el: HTMLElement): void {
  el.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Back / nav buttons
    const nav = target.closest<HTMLElement>('[data-nav]');
    if (nav) {
      navigateTo(nav.dataset.nav as Parameters<typeof navigateTo>[0]);
      return;
    }

    // Legende auf kleinen Bildschirmen auf- und zuklappen
    const legendeKnopf = target.closest<HTMLElement>('[data-legende-knopf]');
    if (legendeKnopf) {
      const offen = legendeKnopf.parentElement?.classList.toggle('offen') ?? false;
      legendeKnopf.setAttribute('aria-expanded', String(offen));
      return;
    }

    // Modal close
    if (target.id === 'dmap-modal-close' || target.id === 'dmap-modal') {
      hideRouteModal();
      return;
    }

    // Go route button in modal
    const goBtn = target.closest<HTMLElement>('[data-go-route]');
    if (goBtn) {
      const routeId = goBtn.dataset.goRoute;
      if (routeId) {
        hideRouteModal();
        window.dispatchEvent(new CustomEvent('mc:selectRoute', { detail: { routeId } }));
        navigateTo('team');
      }
      return;
    }

    // Route node click — show modal for any node
    const node = target.closest<HTMLElement>('.dmap-nd[data-route]');
    if (node && gameState) {
      const routeId = node.dataset.route;
      if (routeId) showRouteModal(routeId, gameState);
      return;
    }
  });
}
