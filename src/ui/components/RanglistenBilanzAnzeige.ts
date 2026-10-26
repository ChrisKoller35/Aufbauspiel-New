// ─── Magic City – Rangliste im Expeditions-Ergebnis ─────────────
// Ein paar Zeilen nach jeder Expedition: Ruhm, Wochenplatz, wer überholt
// wurde und was die Rivalen in dieser Runde bezwungen haben
// (systems/Rangliste.ts, ranglisteNachExpedition). Dazu höchstens eine Stimme
// je Bericht: Wer überholt wurde oder vorbeizieht, lässt einen Satz ausrichten
// (data/rivalenStimmen.ts), jeder Satz einmal bis zum Neuladen. Beispiel
// (frisches Spiel, erster Sieg im Waldpfad): Unter «Gipfel-Rangliste: vorbei an
// Das Rudel von Dunstmoor · jetzt Platz 4!» steht grau «🐺 Das Rudel von Dunstmoor
// lässt ausrichten: «Wir haben kurz nachgedacht. Das passiert uns nicht wieder.»».
// ────────────────────────────────────────────────────────────────

import { dungeonWen } from '../../data/dungeonNamen';
import { RIVALEN } from '../../data/rivalen';
import { RIVALEN_STIMMEN, StimmenAnlass } from '../../data/rivalenStimmen';
import { RanglistenBilanz } from '../../systems/Rangliste';

/** So viele Siege der Rivalen stehen höchstens einzeln da, der Rest als «und n weitere» */
const MAX_RIVALEN_ZEILEN = 3;

export interface BilanzZeile {
  text: string;
  farbe: string;
}

/** Sätze, die seit dem Laden schon kamen (`${id}:${anlass}`); nicht im Spielstand */
const GESAGT = new Set<string>();

/** Der Satz einer Gilde zu diesem Anlass als Zeile; null ohne Gilde, ohne Satz oder wenn er schon kam */
export function stimmeZeile(name: string, anlass: StimmenAnlass, gesagt = GESAGT): BilanzZeile | null {
  const gilde = RIVALEN.find(r => r.name === name);
  const satz = gilde ? RIVALEN_STIMMEN[gilde.id]?.[anlass] : undefined;
  if (!gilde || !satz) return null;
  const schluessel = `${gilde.id}:${anlass}`;
  if (gesagt.has(schluessel)) return null;
  gesagt.add(schluessel);
  return { text: `${gilde.wappen} ${name} ${gilde.mehrzahl ? 'lassen' : 'lässt'} ausrichten: «${satz}»`, farbe: gilde.farbe };
}

/** Die Zeilen für den Ergebnis-Dialog (höchstens eine Stimme je Bericht) */
export function ranglistenZeilen(b: RanglistenBilanz, gesagt = GESAGT): BilanzZeile[] {
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
  // Zuerst spricht, wer überholt wurde, sonst wer an dir vorbeizieht
  let stimme: BilanzZeile | null = null;
  for (const name of b.ueberholt) stimme ??= stimmeZeile(name, 'ueberholt', gesagt);
  if (stimme) zeilen.push(stimme);

  // Wer an dir vorbeizieht, steht zuerst
  const rivalen = [...b.rivalen].sort((x, y) => Number(y.vorbei) - Number(x.vorbei));
  for (const r of rivalen.slice(0, MAX_RIVALEN_ZEILEN)) {
    const vorbei = r.vorbei ? ` und ${r.mehrzahl ? 'ziehen' : 'zieht'} an dir vorbei` : '';
    zeilen.push({ text: `${r.wappen} ${r.name} ${r.mehrzahl ? 'bezwingen' : 'bezwingt'} ${dungeonWen(r.routeId)}${vorbei}`, farbe: r.vorbei ? '#f87171' : '#9ca3af' });
    if (r.vorbei && !stimme) {
      stimme = stimmeZeile(r.name, 'vorbei', gesagt);
      if (stimme) zeilen.push(stimme);
    }
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
