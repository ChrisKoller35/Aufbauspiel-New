// ─── Magic City – Klassen-Tafel im Reiter «Anheuern» ────────────
// Alle Klassen auf einen Blick: freie mit «Anheuern» (Preis aus
// anheuerKosten), gesperrte mit Rolle, Grundwerten und jeder Bedingung samt
// Fortschritt («Besiege «Kristallgolem» in der Tiefen Höhle: 0/1»). Der
// Fortschritt kommt aus fortschritt() in systems/ClassUnlockSystem.ts, mit
// derselben Rechnung, mit der checkUnlocks freischaltet. Darunter (oder darüber,
// wenn keine Klasse mehr anzuheuern ist) die Lehrlinge: je Klasse in der Gilde
// eine Karte aus systems/Lehrlinge.ts. Doku: docs/AUSBILDUNG.md.
// ────────────────────────────────────────────────────────────────

import '../html/ausbildung.css';
import { GameState } from '../../models/GameState';
import { CLASS_DEFS, ClassDef, HERO_IMAGE_MAP } from '../../data/classes';
import { ENEMY_DEFS } from '../../data/enemies';
import { ROUTE_DEFS } from '../../data/routes';
import { DUNGEON_IM_SATZ } from '../../data/dungeonNamen';
import { FreischaltSchritt, fortschritt } from '../../systems/ClassUnlockSystem';
import { anheuerKosten } from '../../systems/Empfehlung';
import { LEHRLINGE } from '../../data/lehrlinge';
import { LEHRLING_AB_STUFE, LehrlingLage, lehrlingLage, standVon } from '../../systems/Lehrlinge';
import { lehrbuchVorschau } from '../../systems/Ausbildung';
import { bildKarte } from '../heldBild';
import { escapeAttr } from './SchmiedeAnzeige';

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

  // Gibt es keine Klasse mehr anzuheuern, sind die Lehrlinge das, was man hier tun kann: dann zuerst
  const lehrlinge = lehrlingTafelHtml(state);
  const tafel = `<div class="hcards">${[...frei, ...gesperrt, ...vorhanden].join('')}</div>`;
  return `
    <div class="klassentafel">
      <p class="kt-kopf">${freiAnzahl} von ${klassen.length} Klassen freigeschaltet · ${anheuern}</p>
      ${frei.length === 0 ? lehrlinge + tafel : tafel + lehrlinge}
    </div>`;
}

/** Was unter der Lehrlings-Karte steht, je nach Lage (frei, zu früh, schon da) */
function lehrlingInfo(lage: LehrlingLage, klasse: string): string {
  if (lage.art === 'frei') {
    return `<p class="kt-hinweis">Lehrling von ${escapeAttr(lage.meister.name)} · beginnt auf Stufe 1</p>`;
  }
  if (lage.art === 'zu_frueh') {
    return `<p class="kt-hinweis">Kommt, sobald ${escapeAttr(lage.meister.name)} Stufe ${LEHRLING_AB_STUFE} erreicht `
      + `(jetzt Stufe ${lage.meister.level}).</p>`;
  }
  if (lage.art !== 'da') return '';
  const { lehrling, meister } = lage;
  const vorschau = meister ? lehrbuchVorschau(meister, lehrling) : null;
  const lehrbuch = vorschau && vorschau.nachStufe > vorschau.vonStufe
    ? `<p class="kt-hinweis">Im Lehrbuch (Reiter «Training») kommt ${escapeAttr(lehrling.name)} mit dem Überschuss von `
      + `${escapeAttr(meister!.name)} auf Stufe ${vorschau.nachStufe}.</p>`
    : '';
  return `<p class="kt-hinweis">✓ In deiner Gilde · ${escapeAttr(klasse)} · Stufe ${lehrling.level}</p>${lehrbuch}`;
}

/**
 * Je Klasse, von der die Gilde einen Helden hat, eine Karte für ihren Lehrling: aufnehmen (mit Preis und
 * Knopf, den renderHeroesScreen bindet), «kommt ab Stufe 15» oder «schon da». Leer, solange die Gilde
 * keinen Helden hat.
 */
export function lehrlingTafelHtml(state: GameState): string {
  const reihenfolge: LehrlingLage['art'][] = ['frei', 'zu_frueh', 'da'];
  const karten = Object.values(CLASS_DEFS)
    .filter(c => LEHRLINGE[c.id])
    .map(c => ({ c, lage: lehrlingLage(state, c.id) }))
    .filter(({ lage }) => lage.art !== 'ohne_meister')
    .sort((a, b) => reihenfolge.indexOf(a.lage.art) - reihenfolge.indexOf(b.lage.art));
  if (karten.length === 0) return '';
  const imHaus = karten.filter(k => k.lage.art === 'da').length;

  const html = karten.map(({ c, lage }) => {
    const def = LEHRLINGE[c.id];
    const bild = bildKarte({ classId: c.id, lehrling: true });
    const art = lage.art === 'frei' ? 'frei' : lage.art === 'zu_frueh' ? 'wartet' : 'in-gilde';
    const knopf = lage.art === 'frei'
      ? `<div class="hcard-footer">
          <span class="hc-cost">\uD83D\uDCB0 ${lage.kosten} Gold</span>
          <button class="btn btn-sm btn-hire btn-lehrling" data-lehrling-klasse="${c.id}" data-cost="${lage.kosten}"
                  aria-label="${escapeAttr(def.name)} als Lehrling aufnehmen, ${lage.kosten} Gold">AUFNEHMEN</button>
        </div>`
      : '';
    return `
      <article class="kt-karte kt-lehrling ${art}" data-kt-lehrling="${c.id}">
        <div class="kt-bild ${bild.klasse}" style="${bild.stil}">
          <span class="kt-name">${escapeAttr(def.name)}<small class="kt-unter">${lage.art === 'da' ? standVon(lage.lehrling) : 'Lehrling'} · ${escapeAttr(c.name)}</small></span>
        </div>
        <div class="kt-info">
          <p class="kt-zitat">${escapeAttr(def.kurz)}</p>
          ${lehrlingInfo(lage, c.name)}
        </div>
        ${knopf}
      </article>`;
  }).join('');

  return `
    <section class="kt-lehrlinge" aria-labelledby="kt-lehrlinge-titel">
      <h3 class="kt-titel" id="kt-lehrlinge-titel">Lehrlinge · ${imHaus} von ${Object.keys(LEHRLINGE).length}</h3>
      <p class="kt-kopf">Wer Stufe ${LEHRLING_AB_STUFE} erreicht, nimmt einen Lehrling seiner Klasse auf: einen zweiten
        Helden mit eigenem Namen. Das Lehrbuch im Reiter «Training» gibt ihm den Überschuss seines Meisters.</p>
      <div class="hcards">${html}</div>
    </section>`;
}
