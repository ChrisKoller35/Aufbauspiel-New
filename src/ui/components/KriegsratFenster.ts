// ─── Magic City – Das Kriegsrat-Fenster ─────────────────────────
// Im Team-Bildschirm vor dem Aufbruch (ExpeditionsScreen.ts): zeigt, wie
// die gewählte Expedition in Probeläufen ausgeht (systems/Kriegsrat.ts).
// Erst steht das Fenster mit «Der Kriegsrat tagt …», dann rechnet es in
// Häppchen (rechneImHintergrund), damit der Browser dazwischen zeichnen und
// Tasten annehmen kann. Escape, «Schliessen» und der dunkle Rand schliessen
// (FensterHilfen.ts), auch mitten im Rechnen; danach rechnet es nicht weiter.
// ────────────────────────────────────────────────────────────────

import '../html/kriegsrat.css';
import { ROUTE_DEFS } from '../../data/routes';
import { GameState } from '../../models/GameState';
import { kriegsratLaeufe, KriegsratErgebnis } from '../../systems/Kriegsrat';
import { BeuteVorschau, HeldVorschau } from '../../systems/KriegsratVorschau';
import { MAX_HERO_LEVEL } from '../../systems/HeroProgression';
import { KLUG_AB_LEBEN } from '../../systems/Musterlauf';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from './FensterHilfen';
import { escapeAttr } from './SchmiedeAnzeige';

const ANZAHL = 20;
/** Nach so langem Rechnen am Stück ist der Browser wieder dran (der letzte Schritt rechnet noch fertig). */
const HAEPPCHEN_MS = 30;

/**
 * Ein Häppchen: rechnet `schritte` weiter, bis `ms` um sind, mindestens einen Schritt. Gibt den letzten Schritt
 * zurück (`done`: fertig, mit dem Ergebnis). Ein Häppchen dauert also bis `ms` plus einen Schritt.
 */
export function rechneHaeppchen<T, R>(
  schritte: Iterator<T, R>, ms: number, uhr: () => number = () => performance.now(),
): IteratorResult<T, R> {
  const bis = uhr() + ms;
  let schritt = schritte.next();
  while (!schritt.done && uhr() < bis) schritt = schritte.next();
  return schritt;
}

/**
 * Rechnet `schritte` häppchenweise, je Aufruf ein Häppchen (`rechneHaeppchen`). Das erste rechnet nur einen Schritt,
 * beim Kriegsrat den Start des ersten Laufs: Gleich nach dem Laden der Seite dauert schon der erste Kampfraum allein
 * fast ein ganzes Häppchen. Danach rechnet jedes bis `ms`.
 */
export function haeppchenweise<T, R>(
  schritte: Iterator<T, R>, ms = HAEPPCHEN_MS, uhr: () => number = () => performance.now(),
): () => IteratorResult<T, R> {
  let bis = 0;
  return () => {
    const schritt = rechneHaeppchen(schritte, bis, uhr);
    bis = ms;
    return schritt;
  };
}

/**
 * Rechnet im Hintergrund, ein Häppchen (`naechstesHaeppchen`) je Aufgabe: Dazwischen ist der Browser dran
 * (setTimeout 0). Meldet nach jedem Häppchen den Stand, am Ende das Ergebnis oder eine Ausnahme. Hört auf, sobald
 * `offen()` false gibt (das Fenster ist zu).
 */
export function rechneImHintergrund<T, R>(
  naechstesHaeppchen: () => IteratorResult<T, R>, offen: () => boolean,
  melde: { zwischen(stand: T): void; fertig(ergebnis: R): void; fehler(err: unknown): void },
): void {
  const rechne = () => {
    if (!offen()) return;
    try {
      const schritt = naechstesHaeppchen();
      if (!schritt.done) {
        melde.zwischen(schritt.value);
        setTimeout(rechne, 0);
        return;
      }
      melde.fertig(schritt.value);
    } catch (err) {
      melde.fehler(err);
    }
  };
  setTimeout(rechne, 0);
}

/** Zahl und Wort mit geschütztem Leerzeichen: Die Zeile bricht nie zwischen den beiden um. */
function zahlWort(n: number, eins: string, viele: string): string {
  return `${n}&nbsp;${n === 1 ? eins : viele}`;
}

function rat(siege: number, anzahl: number): string {
  const quote = anzahl > 0 ? (siege / anzahl) * 100 : 0;
  if (quote >= 80) return 'Gute Aussichten.';
  if (quote >= 40) return 'Es kann klappen, aber rechne mit Verlusten.';
  return 'Der Rat rät ab.';
}

function balken(cls: string, name: string, n: number, anzahl: number): string {
  const breite = anzahl > 0 ? Math.round((n / anzahl) * 100) : 0;
  return `
    <div class="kr-zeile">
      <span class="kr-name">${name}</span>
      <span class="kr-spur"><span class="kr-balken ${cls}" style="width:${breite}%"></span></span>
      <span class="kr-zahl">${n}</span>
    </div>`;
}

/** «Beute»: Set-Teil, Schmiede-Material und Splitter, Ausrüstung (KriegsratVorschau.ts) */
function beuteHtml(b: BeuteVorschau, anzahl: number): string {
  const zeilen: string[] = [];
  if (b.set) {
    const wie = b.setLaeufe > 0
      ? `in&nbsp;${b.setLaeufe}&nbsp;von&nbsp;${anzahl}&nbsp;Läufen${b.setTeile > b.setLaeufe ? ` (zusammen&nbsp;${zahlWort(b.setTeile, 'Teil', 'Teile')})` : ''}`
      : 'in keinem Lauf';
    zeilen.push(`<span class="rar-set">✦ Set-Teil ${b.set.zeichen} ${escapeAttr(b.set.name)}</span> (die Gilde hat&nbsp;${b.set.gesammelt}&nbsp;von&nbsp;3): ${wie}`);
  }
  if (b.material) {
    const splitter = b.splitterSchnitt > 0 ? `&nbsp;· Ø&nbsp;${b.splitterSchnitt}&nbsp;Kristallsplitter` : '';
    zeilen.push(`⚒️ Schmiede-Material: Ø&nbsp;${b.material.schnitt}&nbsp;${escapeAttr(b.material.name)}${splitter} je Lauf`);
  }
  if (b.ausruestung.length > 0) {
    zeilen.push(`🗡️ Ausrüstung: ${b.ausruestung.map(a => {
      const name = a.legendaer ? `<span class="rar-legendary">${escapeAttr(a.name)}</span>` : escapeAttr(a.name);
      return `${name}${a.neu ? '&nbsp;(neu)' : ''}&nbsp;${a.laeufe}&nbsp;von&nbsp;${anzahl}`;
    }).join('&nbsp;· ')}`);
  }
  return zeilen.length > 0 ? `<p class="kr-titel">Beute</p>${zeilen.map(z => `<p class="kr-info">${z}</p>`).join('')}` : '';
}

/** «Helden»: je Held Ø XP, Aufstieg oder was bis dahin fehlt, wie oft er fällt */
function heldenHtml(helden: HeldVorschau[], anzahl: number): string {
  if (helden.length === 0) return '';
  const zeilen = helden.map(h => {
    let text = `<b>${escapeAttr(h.name)}</b>&nbsp;· Stufe&nbsp;${h.stufe}: Ø&nbsp;+${h.xpSchnitt}&nbsp;XP`;
    if (h.stufe >= MAX_HERO_LEVEL) text += ' Überschuss fürs Lehrbuch';
    else if (h.aufstiege > 0) {
      text += `&nbsp;· Aufstieg in&nbsp;${h.aufstiege}&nbsp;von&nbsp;${anzahl}&nbsp;Läufen`;
      if (h.besteStufe >= h.stufe + 2) text += ` (bis Stufe&nbsp;${h.besteStufe})`;
    } else text += `&nbsp;· bis Stufe&nbsp;${h.stufe + 1} fehlen&nbsp;${h.fehltXp}&nbsp;XP`;
    if (h.gefallen > 0) text += `&nbsp;· fällt in&nbsp;${h.gefallen}&nbsp;von&nbsp;${anzahl}`;
    return `<p class="kr-info">${text}</p>`;
  });
  return `<p class="kr-titel">Helden</p>${zeilen.join('')}`;
}

/** «Entscheidungen unterwegs»: wie oft der Rat das Wagnis nahm, wie oft die sichere Wahl (Kriegsrat.ts); leer ohne */
function wahlenHtml(w: KriegsratErgebnis['wahlen']): string {
  const teile = [
    w.wagnis > 0 ? `${w.wagnis}-\u2060mal das Wagnis` : '',
    w.sicher > 0 ? `${w.sicher}-\u2060mal die sichere Wahl` : '',
  ].filter(Boolean);
  if (teile.length === 0) return '';
  return `<p class="kr-info">Entscheidungen unterwegs:&nbsp;${teile.join('&nbsp;· ')}. Der Rat wagt es nur ab&nbsp;`
    + `${Math.round(KLUG_AB_LEBEN * 100)}&nbsp;% Leben; entscheidest du anders, sehen Beute und XP anders aus.</p>`;
}

/**
 * Das Ergebnis als HTML. Eine Zahl bricht nie von ihren Wörtern weg, auch nicht von dem davor (geschützte Leerzeichen:
 * «fehlen 120 XP», «Langbogen (neu) 16 von 20»); umbrechen darf die Zeile zwischen den übrigen Wörtern und nach «·».
 */
export function ergebnisHtml(r: KriegsratErgebnis, anzahl: number): string {
  const raum = r.gefaehrlichsterRaum;
  const gegner = raum && raum.gegner.length > 0 ? ` (${raum.gegner.map(escapeAttr).join(', ')})` : '';
  // «Boss überlebt» nur, wenn es vorkam: Das Spiel zeigt dann «SIEG!», gezählt wird hier nur ein bezwungener Dungeon
  const boss = r.bossUeberlebt > 0;
  // «17-mal»: nach dem Strich ein Wortverbinder (U+2060), sonst bricht die Zeile bei 330–350 px nach «17-» um (wie stueck im Fundbuch)
  return `
    <p class="kr-kopf">${anzahl}&nbsp;Probeläufe:&nbsp;${zahlWort(r.siege, 'Sieg', 'Siege')}&nbsp;· ${zahlWort(r.niederlagen, 'Niederlage', 'Niederlagen')}${boss ? `&nbsp;· ${r.bossUeberlebt}×&nbsp;Boss&nbsp;überlebt` : ''}</p>
    ${balken('sieg', 'Siege', r.siege, anzahl)}
    ${balken('niederlage', 'Niederlagen', r.niederlagen, anzahl)}
    ${boss ? balken('boss', 'Boss überlebt', r.bossUeberlebt, anzahl) : ''}
    ${boss ? '<p class="kr-info">Boss überlebt: Nach&nbsp;20&nbsp;Kampfrunden steht der Boss noch. Das Spiel zeigt dann «SIEG!» und zahlt die Beute, aber der Boss gilt nicht als besiegt: Er öffnet keinen neuen Dungeon, und es gibt keine Trophäe.</p>' : ''}
    <p class="kr-info">${raum ? `Gefährlichster Raum: Raum&nbsp;${raum.nummer}${gegner}. Dort ${raum.laeufe === 1 ? 'scheitert' : 'scheitern'}&nbsp;${raum.laeufe}&nbsp;von&nbsp;${anzahl}&nbsp;Läufen.` : 'Kein Lauf ist gescheitert.'}</p>
    <p class="kr-info">Ø Gold je Lauf:&nbsp;${r.goldSchnitt.toLocaleString('de')}</p>
    <p class="kr-info">Ø Leben am Ende:&nbsp;${r.lebenSchnitt}&nbsp;%&nbsp;· ${r.proviantEingesetzt > 0 ? `Proviant eingesetzt:&nbsp;${r.proviantEingesetzt}-\u2060mal in&nbsp;${anzahl}&nbsp;Läufen` : 'Proviant: nie gebraucht'}</p>
    ${wahlenHtml(r.wahlen)}
    <p class="kr-rat">${rat(r.siege, anzahl)}</p>
    ${beuteHtml(r.beute, anzahl)}
    ${heldenHtml(r.helden, anzahl)}
    <p class="kr-hinweis">Aus&nbsp;${anzahl}&nbsp;Probeläufen. Proviant setzt der Rat nur vor einem Kampf und unter halben Leben ein; Stärkungs-Tränke und Fähigkeiten, die du im Kampf selbst auslöst, sind nicht eingerechnet.</p>`;
}

/** Öffnet das Fenster über `root` und rechnet danach; `beimSchliessen` läuft, sobald es zu ist. */
export function zeigeKriegsrat(
  root: HTMLElement, state: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>,
  beimSchliessen: () => void,
): void {
  const ov = document.createElement('div');
  ov.className = 'ov on kr-ov';
  ov.innerHTML = `
    <div class="modal kr" role="dialog" aria-modal="true" aria-labelledby="kr-titel" tabindex="-1">
      <h3 class="mt" id="kr-titel">🎲 Kriegsrat: ${escapeAttr(ROUTE_DEFS[routeId]?.name ?? routeId)}</h3>
      <div class="kr-body" aria-live="polite" aria-busy="true">
        <p class="kr-tagt">Der Kriegsrat tagt …<span class="kr-stand" aria-hidden="true"></span></p>
      </div>
      <div class="kr-aktionen"><button class="fk-btn kr-zu">Schliessen</button></div>
    </div>`;
  root.appendChild(ov);
  const fenster = ov.querySelector<HTMLElement>('.modal')!;
  fenster.focus();

  const close = () => {
    tastenLoesen();
    ov.remove();
    beimSchliessen();
  };
  const tastenLoesen = bindeFensterTasten(ov, fenster, close);

  const hintergrund = hintergrundKlick(ov);
  // Ein Druck auf den Rand nimmt dem Fenster den Fokus nicht (etwa der zweite eines Doppelklicks auf «🎲 Kriegsrat»)
  ov.addEventListener('mousedown', (e) => {
    if (e.target === ov) e.preventDefault();
  });
  ov.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === ov) {
      if (hintergrund(e)) {
        close();
        schluckeZweitenKlick();
      }
      return;
    }
    // Der zweite Klick eines Doppeltipps auf «🎲 Kriegsrat» träfe am Handy «Schliessen» (wie SpielstandFenster)
    if (e.detail > 1) return;
    if (target.closest('.kr-zu')) {
      close();
      schluckeZweitenKlick();
    }
  });

  const body = ov.querySelector<HTMLElement>('.kr-body')!;
  const stand = ov.querySelector<HTMLElement>('.kr-stand')!;
  // Der Stand von jetzt (beim Klick), nicht der beim ersten Häppchen
  const naechstesHaeppchen = haeppchenweise(kriegsratLaeufe(state, routeId, heroIds, proviant, ANZAHL));
  const zeige = (html: string) => {
    body.innerHTML = html;
    body.setAttribute('aria-busy', 'false');
  };
  // Erst «tagt» zeichnen, dann rechnen: requestAnimationFrame kommt vor dem nächsten Bild, setTimeout danach
  requestAnimationFrame(() => rechneImHintergrund(naechstesHaeppchen, () => ov.isConnected, {
    zwischen: fertigeLaeufe => { stand.textContent = ` ${fertigeLaeufe}\u00a0von\u00a0${ANZAHL}`; },
    fertig: ergebnis => zeige(ergebnisHtml(ergebnis, ANZAHL)),
    fehler: err => {
      console.error('Kriegsrat:', err);
      zeige('<p class="kr-info">Der Rat konnte diese Expedition nicht durchspielen.</p>');
    },
  }));
}
