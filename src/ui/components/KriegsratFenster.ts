// ─── Magic City – Das Kriegsrat-Fenster ─────────────────────────
// Im Team-Bildschirm vor dem Aufbruch (ExpeditionsScreen.ts): zeigt, wie
// die gewählte Expedition in Probeläufen ausgeht (systems/Kriegsrat.ts).
// Erst steht das Fenster mit «Der Kriegsrat tagt …», dann rechnet es in
// Häppchen, damit der Browser dazwischen zeichnen und Tasten annehmen kann.
// Escape, «Schliessen» und der dunkle Rand schliessen (FensterHilfen.ts),
// auch mitten im Rechnen; danach rechnet es nicht weiter.
// ────────────────────────────────────────────────────────────────

import '../html/kriegsrat.css';
import { ROUTE_DEFS } from '../../data/routes';
import { GameState } from '../../models/GameState';
import { kriegsratLaeufe, KriegsratErgebnis } from '../../systems/Kriegsrat';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from './FensterHilfen';
import { escapeAttr } from './SchmiedeAnzeige';

const ANZAHL = 20;
/** So lange rechnet das Fenster höchstens am Stück, dann ist der Browser wieder dran. */
const HAEPPCHEN_MS = 30;

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

function ergebnisHtml(r: KriegsratErgebnis, anzahl: number): string {
  const raum = r.gefaehrlichsterRaum;
  const gegner = raum && raum.gegner.length > 0 ? ` (${raum.gegner.map(escapeAttr).join(', ')})` : '';
  // «Boss überlebt» nur, wenn es vorkam: Das Spiel zeigt dann «SIEG!», gezählt wird hier nur ein bezwungener Dungeon
  const boss = r.bossUeberlebt > 0;
  return `
    <p class="kr-kopf">${anzahl}&nbsp;Probeläufe: ${zahlWort(r.siege, 'Sieg', 'Siege')} · ${zahlWort(r.niederlagen, 'Niederlage', 'Niederlagen')}${boss ? ` · ${r.bossUeberlebt}×&nbsp;Boss&nbsp;überlebt` : ''}</p>
    ${balken('sieg', 'Siege', r.siege, anzahl)}
    ${balken('niederlage', 'Niederlagen', r.niederlagen, anzahl)}
    ${boss ? balken('boss', 'Boss überlebt', r.bossUeberlebt, anzahl) : ''}
    ${boss ? '<p class="kr-info">Boss überlebt: Nach 20 Kampfrunden steht der Boss noch. Das Spiel zeigt dann «SIEG!» und zahlt die Beute, aber der Boss gilt nicht als besiegt: Er öffnet keinen neuen Dungeon, und es gibt keine Trophäe.</p>' : ''}
    <p class="kr-info">${raum ? `Gefährlichster Raum: Raum ${raum.nummer}${gegner}. Dort ${raum.laeufe === 1 ? 'scheitert' : 'scheitern'} ${raum.laeufe} von ${anzahl}&nbsp;Läufen.` : 'Kein Lauf ist gescheitert.'}</p>
    <p class="kr-info">Ø Gold je Lauf: ${r.goldSchnitt.toLocaleString('de')}</p>
    <p class="kr-rat">${rat(r.siege, anzahl)}</p>
    <p class="kr-hinweis">Aus ${anzahl}&nbsp;Probeläufen. Proviant setzt der Rat nur vor einem Kampf und unter halben Leben ein; Stärkungs-Tränke und Fähigkeiten, die du im Kampf selbst auslöst, sind nicht eingerechnet.</p>`;
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
  const laeufe = kriegsratLaeufe(state, routeId, heroIds, proviant, ANZAHL);
  const rechne = () => {
    if (!ov.isConnected) return;
    try {
      const bis = performance.now() + HAEPPCHEN_MS;
      let schritt = laeufe.next();
      while (!schritt.done && performance.now() < bis) schritt = laeufe.next();
      if (!schritt.done) {
        stand.textContent = ` ${schritt.value} von ${ANZAHL}`;
        setTimeout(rechne, 0);
        return;
      }
      body.innerHTML = ergebnisHtml(schritt.value, ANZAHL);
    } catch (err) {
      console.error('Kriegsrat:', err);
      body.innerHTML = '<p class="kr-info">Der Rat konnte diese Expedition nicht durchspielen.</p>';
    }
    body.setAttribute('aria-busy', 'false');
  };
  // Erst «tagt» zeichnen, dann rechnen: requestAnimationFrame kommt vor dem nächsten Bild, setTimeout danach
  requestAnimationFrame(() => setTimeout(rechne, 0));
}
