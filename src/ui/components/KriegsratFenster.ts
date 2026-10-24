// ─── Magic City – Das Kriegsrat-Fenster ─────────────────────────
// Im Team-Bildschirm vor dem Aufbruch (ExpeditionsScreen.ts): zeigt, wie
// die gewählte Expedition in Probeläufen ausgeht (systems/Kriegsrat.ts).
// Erst steht das Fenster mit «Der Kriegsrat tagt …», dann rechnet es.
// Escape, «Schliessen» und der dunkle Rand schliessen (FensterHilfen.ts).
// ────────────────────────────────────────────────────────────────

import '../html/kriegsrat.css';
import { ROUTE_DEFS } from '../../data/routes';
import { GameState } from '../../models/GameState';
import { kriegsrat, KriegsratErgebnis } from '../../systems/Kriegsrat';
import { bindeFensterTasten, hintergrundKlick, schluckeZweitenKlick } from './FensterHilfen';
import { escapeAttr } from './SchmiedeAnzeige';

const ANZAHL = 20;

function zahlWort(n: number, eins: string, viele: string): string {
  return `${n} ${n === 1 ? eins : viele}`;
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
  return `
    <p class="kr-kopf">${anzahl} Probeläufe: ${zahlWort(r.siege, 'Sieg', 'Siege')} · ${zahlWort(r.niederlagen, 'Niederlage', 'Niederlagen')} · ${zahlWort(r.rueckzuege, 'Rückzug', 'Rückzüge')}</p>
    ${balken('sieg', 'Siege', r.siege, anzahl)}
    ${balken('niederlage', 'Niederlagen', r.niederlagen, anzahl)}
    ${balken('rueckzug', 'Rückzüge', r.rueckzuege, anzahl)}
    <p class="kr-info">${raum ? `Gefährlichster Raum: Raum ${raum.nummer}${gegner}` : 'Kein Lauf ist gescheitert.'}</p>
    <p class="kr-info">Ø Gold je Lauf: ${r.goldSchnitt.toLocaleString('de')}</p>
    <p class="kr-rat">${rat(r.siege, anzahl)}</p>
    <p class="kr-hinweis">Aus ${anzahl} Probeläufen. Proviant setzt der Rat nur unter halben Leben ein; Stärkungs-Tränke und Fähigkeiten, die du im Kampf selbst auslöst, sind nicht eingerechnet.</p>`;
}

/** Öffnet das Fenster über `root` und rechnet danach; `beimSchliessen` läuft, sobald es zu ist. */
export function zeigeKriegsrat(
  root: HTMLElement, state: GameState, routeId: string, heroIds: number[], proviant: Record<string, number>,
  beimSchliessen: () => void,
): void {
  const ov = document.createElement('div');
  ov.className = 'ov on kr-ov';
  ov.innerHTML = `
    <div class="modal kr" role="dialog" aria-modal="true" tabindex="-1">
      <h3 class="mt">🎲 Kriegsrat: ${escapeAttr(ROUTE_DEFS[routeId]?.name ?? routeId)}</h3>
      <div class="kr-body"><p class="kr-tagt">Der Kriegsrat tagt …</p></div>
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
    if ((target === ov && hintergrund(e)) || target.closest('.kr-zu')) {
      close();
      schluckeZweitenKlick();
    }
  });

  setTimeout(() => {
    if (!ov.isConnected) return;
    const body = ov.querySelector<HTMLElement>('.kr-body')!;
    try {
      body.innerHTML = ergebnisHtml(kriegsrat(state, routeId, heroIds, proviant, ANZAHL), ANZAHL);
    } catch (err) {
      console.error('Kriegsrat:', err);
      body.innerHTML = '<p class="kr-info">Der Rat konnte diese Expedition nicht durchspielen.</p>';
    }
  }, 0);
}
