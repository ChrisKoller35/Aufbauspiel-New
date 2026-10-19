// ─── Magic City – Bild der endlosen Treppe (aus Code) ───────────
// Eine gewundene Treppe, die oben in einem leuchtenden Tor verschwindet.
// Als SVG gezeichnet, ohne Bilddatei: Karte in der Routenliste und
// Eingang oben auf der Dungeon-Karte. Leuchten und Funkeln: treppe.css.
// ────────────────────────────────────────────────────────────────

let bildNummer = 0;

/** Eindeutiger Präfix für Verläufe, falls das Bild mehrmals auf der Seite steht. */
export function neueTreppenBildId(): string {
  bildNummer += 1;
  return `trk${bildNummer}`;
}

const STUFEN = 17;

/** Feste «Sterne» (x, y, Grösse), damit das Bild immer gleich aussieht. */
const STERNE: [number, number, number][] = [
  [34, 30, 1.2], [78, 64, 0.8], [118, 22, 1], [160, 48, 0.7], [244, 30, 0.9], [286, 58, 1.3],
  [330, 24, 0.8], [362, 70, 1], [52, 108, 0.7], [350, 120, 0.8], [20, 160, 1], [380, 180, 0.7],
];

const r1 = (n: number): string => n.toFixed(1);

/** Lage einer Stufe: t = 0 ganz unten (vorn), t = 1 ganz oben (am Tor). */
function stufe(t: number): { x: number; y: number; breite: number } {
  return {
    // Oben rücken die Stufen zusammen (Tiefe) …
    y: 292 - 236 * (1 - Math.pow(1 - t, 1.5)),
    // … werden schmaler …
    breite: 236 * (1 - 0.84 * t),
    // … und winden sich hin und her.
    x: 200 + 58 * Math.sin(t * Math.PI * 2.6) * (1 - t),
  };
}

/** Inhalt für viewBox «0 0 400 300»: Himmel, Treppe, Tor. */
export function treppenKunstInhalt(id: string): string {
  let sterne = '';
  for (const [x, y, r] of STERNE) {
    sterne += `<circle class="trk-stern" cx="${x}" cy="${y}" r="${r}" fill="#f3e7c4"/>`;
  }

  // Von hinten (oben) nach vorn zeichnen, damit nahe Stufen die fernen verdecken
  let stufen = '';
  for (let i = STUFEN - 1; i >= 0; i--) {
    const t = i / (STUFEN - 1);
    const s = stufe(t);
    const darueber = stufe(Math.min(1, t + 1 / (STUFEN - 1)));
    const abstand = Math.max(3, s.y - darueber.y);
    const links = s.x - s.breite / 2;
    const rechts = s.x + s.breite / 2;
    const oben = s.y - abstand * 0.95;
    const kante = s.y - abstand * 0.5;
    const einzug = s.breite * 0.05;
    const licht = (0.25 + 0.6 * t).toFixed(2);
    stufen += `<polygon points="${r1(links + einzug)},${r1(oben)} ${r1(rechts - einzug)},${r1(oben)} ${r1(rechts)},${r1(kante)} ${r1(links)},${r1(kante)}" fill="url(#${id}-tritt)"/>`
      + `<rect x="${r1(links)}" y="${r1(kante)}" width="${r1(s.breite)}" height="${r1(s.y - kante)}" fill="#1a1530"/>`
      + `<line x1="${r1(links)}" y1="${r1(kante)}" x2="${r1(rechts)}" y2="${r1(kante)}" stroke="#e6c060" stroke-width="${r1(0.6 + 1.4 * (1 - t))}" opacity="${licht}"/>`;
    // Jede dritte Stufe trägt zwei leuchtende Runen
    if (i % 3 === 1) {
      const ry = r1(kante + (s.y - kante) / 2);
      const rr = r1(Math.max(0.8, 2.6 * (1 - t)));
      stufen += `<circle class="trk-rune" cx="${r1(links + s.breite * 0.18)}" cy="${ry}" r="${rr}" fill="#a78bfa"/>`
        + `<circle class="trk-rune" cx="${r1(rechts - s.breite * 0.18)}" cy="${ry}" r="${rr}" fill="#a78bfa"/>`;
    }
  }

  const tor = stufe(1);
  const torY = tor.y - 26;
  return `<defs>
      <radialGradient id="${id}-himmel" cx="50%" cy="14%" r="80%">
        <stop offset="0%" stop-color="#5b3596"/>
        <stop offset="42%" stop-color="#1c1342"/>
        <stop offset="100%" stop-color="#060810"/>
      </radialGradient>
      <radialGradient id="${id}-tor" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stop-color="#fffbe8"/>
        <stop offset="40%" stop-color="#f5d27a"/>
        <stop offset="100%" stop-color="#c8a227" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-tritt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a3f68"/>
        <stop offset="100%" stop-color="#8a7a5a"/>
      </linearGradient>
      <linearGradient id="${id}-nebel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#060810" stop-opacity="0"/>
        <stop offset="100%" stop-color="#060810" stop-opacity=".9"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#${id}-himmel)"/>
    ${sterne}
    <circle class="trk-schein" cx="${r1(tor.x)}" cy="${r1(torY)}" r="96" fill="url(#${id}-tor)" opacity=".35"/>
    <path d="M${r1(tor.x - 17)},${r1(tor.y - 2)} V${r1(torY - 8)} A17 17 0 0 1 ${r1(tor.x + 17)},${r1(torY - 8)} V${r1(tor.y - 2)} Z" fill="url(#${id}-tor)" class="trk-tor"/>
    ${stufen}
    <rect y="230" width="400" height="70" fill="url(#${id}-nebel)"/>`;
}

/** Ganzes Bild, füllt seinen Platz (z. B. eine Karte). */
export function treppenKunst(klasse = 'tr-kunst'): string {
  return `<svg class="${klasse}" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`
    + `${treppenKunstInhalt(neueTreppenBildId())}</svg>`;
}
