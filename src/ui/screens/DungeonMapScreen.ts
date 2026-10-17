// ─── Magic City – Dungeon Map Screen (Redesign) ──────────────
// Scrollable SVG world map with organic paths & branching routes.
// Main path runs bottom→top, side branches lead to dead ends.
// ──────────────────────────────────────────────────────────────

import { GameState } from '../../models/GameState';
import { ROUTE_DEFS, RouteDef, DUNGEON_GRAPH, DungeonGraphNode, ROUTE_IMAGE_MAP } from '../../data/routes';
import { navigateTo } from '../ScreenRouter';
import { renderHeader } from './HeaderRenderer';



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
      <div class="dmap-legend-title">LEGENDE</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#4ade80"></span> Wald</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#fcd34d"></span> Sumpf</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#93c5fd"></span> Höhle</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#c4b5fd"></span> Ruinen</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#fca5a5"></span> Vulkan</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#7dd3fc"></span> Unterwasser</div>
      <div class="dmap-legend-row"><span class="dmap-ldot" style="background:#f9a8d4"></span> Belagerung</div>
      <div class="dmap-legend-row" style="margin-top:4px"><span class="dmap-ldot" style="background:#c8a227"></span> Hauptpfad</div>
      <div class="dmap-legend-row"><span class="dmap-lhex" style="background:#c8a227"></span> Boss</div>
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

  // Scroll to bottom (start node)
  requestAnimationFrame(() => {
    const wrap = document.getElementById('dmap-wrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
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

function getBiomeStyle(route: RouteDef): BiomeStyle {
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

// ── Route availability (now checks boss unlocks too) ──

function isRouteAvailable(route: RouteDef, state: GameState): boolean {
  const playerRank = state.guildStats?.rank ?? 1;
  if (playerRank < route.tier) return false;
  if (route.unlockCondition?.bossesDefeated) {
    const defeated = state.guildStats?.bossesDefeatedIds ?? [];
    return route.unlockCondition.bossesDefeated.every(b => defeated.includes(b));
  }
  return true;
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

// ── SVG World Map ──

function buildDungeonSVG(state: GameState): string {
  const WIDTH = 900;
  const HEIGHT = 2600;

  const { nodeMap, allEdges } = buildGraphIndex();

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
  `;

  // ── Grid dots for atmosphere ──
  let gridDots = '';
  for (let gx = 40; gx < WIDTH; gx += 60) {
    for (let gy = 40; gy < HEIGHT; gy += 60) {
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
  for (const r of regions) {
    nodesHtml += `<text x="${WIDTH / 2}" y="${r.y + 80}" text-anchor="middle" fill="${r.color}" font-size="9" font-family="Cinzel, serif" letter-spacing="3" opacity="0.25">${r.label}</text>`;
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
    const isFromDone = state.scoreboard.some(s => s.routeId === fromId && s.status === 'victory');
    const isToDone = state.scoreboard.some(s => s.routeId === toId && s.status === 'victory');

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
    const isCompleted = state.scoreboard.some(s => s.routeId === route.id && s.status === 'victory');
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
         <text x="${x}" y="${y + r + 72}" text-anchor="middle" fill="#c8a227" font-size="9" font-family="Cinzel, serif" letter-spacing="2" opacity="0.7">START</text>`
      : '';

    // Dead end marker
    const deadEndMarker = isDeadEnd && !isStart
      ? `<text x="${x}" y="${y - r - 12}" text-anchor="middle" fill="${biome.stroke}" font-size="7" font-family="Cinzel, serif" opacity="0.4" letter-spacing="1">SACKGASSE</text>`
      : '';

    // Emoji icon (smaller / hidden when image is present)
    const emojiSize = hasBoss ? 20 : 15;
    const emoji = hasImage
      ? '' // image replaces the emoji
      : `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${emojiSize}" style="user-select:none">${biome.icon}</text>`;

    // Name label
    const shortName = route.name.length > 18 ? route.name.substring(0, 17) + '…' : route.name;
    const labelOpacity = isLocked ? 0.4 : 1;
    const nameLabel = `<text x="${x}" y="${y + r + 16}" text-anchor="middle" fill="${biome.text}" font-size="${hasBoss ? 11 : 9}" font-family="Cinzel, serif" letter-spacing="0.5" opacity="${labelOpacity}">${shortName}</text>`;

    // Difficulty stars
    const diff = route.tier;
    const stars = `<text x="${x}" y="${y + r + 29}" text-anchor="middle" fill="${biome.stroke}" font-size="8" opacity="${isLocked ? 0.3 : 0.6}">${'★'.repeat(diff)}${'☆'.repeat(5 - diff)}</text>`;

    // Room count
    const roomsBadge = `<text x="${x}" y="${y + r + 41}" text-anchor="middle" fill="#6b6050" font-size="7.5" font-family="Cinzel, serif" opacity="${labelOpacity}">${route.rooms} Räume</text>`;

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
      </g>`;
  }

  return `
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" class="dmap-svg-scroll"
         xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
         style="width:${WIDTH}px;height:${HEIGHT}px;">
      ${bgHtml}
      <defs>${clipDefsHtml}</defs>
      <g class="dmap-paths">${pathsHtml}</g>
      <g class="dmap-nodes">${nodesHtml}</g>
    </svg>`;
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
  const isCompleted = state.scoreboard.some(s => s.routeId === route.id && s.status === 'victory');
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
  if (route.bossId) detailHtml += `<p><span style="color:${biome.stroke}">Boss:</span> ${route.bossId.replace('boss_', '').replace(/_/g, ' ')}</p>`;
  if (isDeadEnd) detailHtml += `<p><span style="color:#8a7a5a">⚑ Sackgasse</span> — Kein Durchgang</p>`;
  if (route.isUnderwater) detailHtml += `<p><span style="color:#7dd3fc">🫧 Unterwasser-Route</span> — Luftvorrat beachten!</p>`;
  if (route.isSiegeRoute) detailHtml += `<p><span style="color:#f9a8d4">🏰 Belagerung</span> — Kriegsmaschine empfohlen</p>`;
  if (isCompleted) detailHtml += `<p style="color:#4ade80">✓ Bereits abgeschlossen</p>`;

  // Show unlock requirements if locked
  if (!isAvailable && !isCompleted) {
    const rankNeeded = route.tier > (state.guildStats?.rank ?? 1);
    const bossNeeded = route.unlockCondition?.bossesDefeated;
    if (rankNeeded) detailHtml += `<p style="color:#ef4444">🔒 Gildenrang ${route.tier} benötigt</p>`;
    if (bossNeeded) {
      const defeated = state.guildStats?.bossesDefeatedIds ?? [];
      const missing = bossNeeded.filter(b => !defeated.includes(b));
      if (missing.length > 0) {
        const names = missing.map(b => b.replace('boss_', '').replace(/_/g, ' ')).join(', ');
        detailHtml += `<p style="color:#ef4444">🔒 Besiege: ${names}</p>`;
      }
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
