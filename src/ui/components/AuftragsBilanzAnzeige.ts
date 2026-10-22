// ─── Magic City – Auftragsbrett im Expeditions-Ergebnis ─────────
// Ein paar Zeilen nach jeder Expedition: wie weit die Zettel und die Kette
// «Der Saal der Gilde» sind, was erledigt ist und was es gebracht hat, dazu
// eine neue Trophäe im Saal (systems/Auftragsbrett.ts, systems/Trophaeensaal.ts).
// ────────────────────────────────────────────────────────────────

import { AuftragsBilanz, belohnungText } from '../../systems/Auftragsbrett';
import { BilanzZeile } from './RanglistenBilanzAnzeige';

/** Die Zeilen für den Ergebnis-Dialog */
export function auftragsZeilen(b: AuftragsBilanz, neueTrophaee: boolean): BilanzZeile[] {
  const zeilen: BilanzZeile[] = [];
  if (neueTrophaee) zeilen.push({ text: '🏆 Eine neue Trophäe steht im Saal des Gildenhauses', farbe: '#fbbf24' });
  for (const m of b.meldungen) {
    if (m.prunkstueck && m.belohnung) {
      zeilen.push({ text: `🏺 Prunkstück für den Saal: ${m.prunkstueck} · ${belohnungText(m.belohnung)}`, farbe: '#fde68a' });
    } else if (m.fertig && m.belohnung) {
      zeilen.push({ text: `📜 Zettel erledigt: ${m.titel} · ${belohnungText(m.belohnung)}`, farbe: '#fbbf24' });
    } else {
      zeilen.push({ text: `📜 ${m.titel}: ${m.stand} von ${m.ziel}`, farbe: '#9ca3af' });
    }
  }
  if (b.tagesbonus > 0) zeilen.push({ text: `📜 Alle Zettel von heute erledigt: Tagesbonus +${b.tagesbonus} Siegel`, farbe: '#4ade80' });
  if (b.saalVoll) zeilen.push({ text: '🏛️ Alle Sockel im Saal sind voll. Im Gildenhaus liegt eine Notiz von Ottokar.', farbe: '#fde68a' });
  return zeilen;
}
