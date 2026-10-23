// ─── Magic City – Klassen-Tafel im Reiter «Anheuern» ────────────
// Alle Klassen auf einen Blick: freie mit «Anheuern» (Preis aus
// anheuerKosten), gesperrte mit Rolle, Grundwerten und jeder Bedingung samt
// Fortschritt («Besiege «Kristallgolem» in der Tiefen Höhle: 0/1»). Der
// Fortschritt kommt aus fortschritt() in systems/ClassUnlockSystem.ts, mit
// derselben Rechnung, mit der checkUnlocks freischaltet. Doku: docs/AUSBILDUNG.md.
// ────────────────────────────────────────────────────────────────

import '../html/ausbildung.css';
import { GameState } from '../../models/GameState';
import { CLASS_DEFS, ClassDef, HERO_IMAGE_MAP } from '../../data/classes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ROUTE_DEFS } from '../../data/routes';
import { DUNGEON_IM_SATZ } from '../../data/dungeonNamen';
import { FreischaltSchritt, fortschritt } from '../../systems/ClassUnlockSystem';
import { anheuerKosten } from '../../systems/Empfehlung';

const ROLLEN: Record<ClassDef['role'], string> = {
  tank: 'Tank', dps: 'Schaden', healer: 'Heiler', support: 'Unterstützer',
};

/** «Besiege «Uralter Treant» im Tiefwald: 0/1», «10 gewonnene Expeditionen: 4/10», «Guardian auf Stufe 5: Stufe 3» */
export function bedingungText(s: FreischaltSchritt): string {
  if (s.art === 'boss') {
    const route = Object.values(ROUTE_DEFS).find(r => r.bossId === s.bossId);
    const ort = route ? ` ${DUNGEON_IM_SATZ[route.id]?.wo ?? `im Dungeon «${route.name}»`}` : '';
    return `Besiege «${ENEMY_DEFS[s.bossId]?.name ?? s.bossId}»${ort}: ${s.ist}/${s.soll}`;
  }
  if (s.art === 'expeditionen') {
    return `${s.soll} gewonnene Expeditionen: ${Math.min(s.ist, s.soll)}/${s.soll}`;
  }
  const klasse = CLASS_DEFS[s.classId]?.name ?? s.classId;
  return `${klasse} auf Stufe ${s.soll}: ${s.ist > 0 ? `Stufe ${s.ist}` : `noch kein ${klasse} in der Gilde`}`;
}

function werte(c: ClassDef): string {
  const b = c.baseStats;
  return `❤ ${b.hp} · ⚔ ${b.atk} · 🛡 ${b.def}`;
}

function karte(c: ClassDef, art: 'gesperrt' | 'in-gilde', inhalt: string): string {
  const bild = HERO_IMAGE_MAP[c.id];
  return `
    <article class="kt-karte ${art}" data-kt-klasse="${c.id}">
      <div class="kt-bild"${bild ? ` style="background-image:url('assets/heroes/${bild}.png')"` : ''}>
        <span class="kt-name">${art === 'gesperrt' ? '🔒 ' : ''}${c.name}</span>
      </div>
      <div class="kt-info">
        <div class="kt-rolle">${ROLLEN[c.role]} · ${werte(c)}</div>
        ${inhalt}
      </div>
    </article>`;
}

/**
 * Alle Klassen aus CLASS_DEFS: freie zuerst (mit der Anheuern-Karte aus HeroesScreen,
 * deren Knöpfe renderHeroesScreen bindet), dann gesperrte, zuletzt die schon in der Gilde.
 */
export function klassenTafelHtml(state: GameState, anheuerKarte: (c: ClassDef, kosten: number) => string): string {
  const kosten = anheuerKosten(state.fighters.length);
  const inGilde = new Set(state.fighters.map(f => f.classId));
  const klassen = Object.values(CLASS_DEFS).map(c => ({ c, f: fortschritt(state, c.id) }));
  const freiAnzahl = klassen.filter(k => k.f.frei).length;

  const frei = klassen.filter(k => k.f.frei && !inGilde.has(k.c.id)).map(({ c, f }) => `
    <div class="kt-frei">
      ${anheuerKarte(c, kosten)}
      <p class="kt-hinweis">${f.start ? 'von Anfang an' : 'freigeschaltet'} · ${ROLLEN[c.role]} · ${werte(c)}</p>
    </div>`);
  const gesperrt = klassen.filter(k => !k.f.frei).map(({ c, f }) => karte(c, 'gesperrt', `
    <ul class="kt-bedingungen">
      ${f.schritte.map(s => `<li class="${s.fertig ? 'fertig' : 'offen'}">${s.fertig ? '✓' : '○'} ${bedingungText(s)}</li>`).join('')}
    </ul>
    ${f.fertig ? '<p class="kt-hinweis">Alles erfüllt: Die Klasse wird nach der nächsten Expedition frei.</p>' : ''}`));
  const vorhanden = klassen.filter(k => k.f.frei && inGilde.has(k.c.id)).map(({ c, f }) =>
    karte(c, 'in-gilde', `<p class="kt-hinweis">${f.start ? 'von Anfang an · ' : ''}✓ Schon in deiner Gilde</p>`));
  // Der Preis nur, solange es etwas anzuheuern gibt (jede Klasse gibt es einmal in der Gilde)
  const anheuern = frei.length > 0 ? `Anheuern kostet jetzt ${kosten} Gold`
    : freiAnzahl === klassen.length ? 'Alle Klassen sind schon in deiner Gilde'
    : 'Alle freien Klassen sind schon in deiner Gilde';

  return `
    <div class="klassentafel">
      <p class="kt-kopf">${freiAnzahl} von ${klassen.length} Klassen freigeschaltet · ${anheuern}</p>
      <div class="hcards">${[...frei, ...gesperrt, ...vorhanden].join('')}</div>
    </div>`;
}
