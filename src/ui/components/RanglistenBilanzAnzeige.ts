// ─── Magic City – Rangliste im Expeditions-Ergebnis ─────────────
// Ein paar Zeilen nach jeder Expedition: Ruhm, Wochenplatz, wer überholt
// wurde und was die Rivalen in dieser Runde bezwungen haben
// (systems/Rangliste.ts, ranglisteNachExpedition).
// ────────────────────────────────────────────────────────────────

import { dungeonWen } from '../../data/dungeonNamen';
import { RanglistenBilanz } from '../../systems/Rangliste';

/** So viele Siege der Rivalen stehen höchstens einzeln da, der Rest als «und n weitere» */
const MAX_RIVALEN_ZEILEN = 3;

export interface BilanzZeile {
  text: string;
  farbe: string;
}

/** Die Zeilen für den Ergebnis-Dialog */
export function ranglistenZeilen(b: RanglistenBilanz): BilanzZeile[] {
  const zahl = (n: number): string => n.toLocaleString('de');
  const zeilen: BilanzZeile[] = [];

  if (b.ruhm > 0) {
    zeilen.push({
      text: `Ruhm: +${zahl(b.ruhm)}${b.erstbezwingung ? ' (erster Sieg hier, doppelt!)' : ''} · Woche: ${zahl(b.wocheRuhm)}, Platz ${b.wochePlatz}`,
      farbe: '#c8a227',
    });
  }
  if (b.ueberholt.length > 0) {
    zeilen.push({ text: `Gipfel-Rangliste: vorbei an ${b.ueberholt.join(', ')} · jetzt Platz ${b.platzNachher}!`, farbe: '#4ade80' });
  }

  // Wer an dir vorbeizieht, steht zuerst
  const rivalen = [...b.rivalen].sort((x, y) => Number(y.vorbei) - Number(x.vorbei));
  for (const r of rivalen.slice(0, MAX_RIVALEN_ZEILEN)) {
    const vorbei = r.vorbei ? ` und ${r.mehrzahl ? 'ziehen' : 'zieht'} an dir vorbei` : '';
    zeilen.push({ text: `${r.wappen} ${r.name} ${r.mehrzahl ? 'bezwingen' : 'bezwingt'} ${dungeonWen(r.routeId)}${vorbei}`, farbe: r.vorbei ? '#f87171' : '#9ca3af' });
  }
  const weitere = rivalen.length - MAX_RIVALEN_ZEILEN;
  if (weitere > 0) {
    zeilen.push({ text: `… und ${weitere === 1 ? 'ein weiterer Sieg' : `${weitere} weitere Siege`} der Rivalen`, farbe: '#9ca3af' });
  }

  if (b.platzNachher > b.platzVorher && b.ueberholt.length === 0) {
    zeilen.push({ text: `Gipfel-Rangliste: jetzt Platz ${b.platzNachher}`, farbe: '#f87171' });
  }
  return zeilen;
}
