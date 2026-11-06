// ─── Magic City – Bild eines Helden ─────────────────────────────
// Jede Klasse hat ein Bild (HERO_IMAGE_MAP, assets/heroes/). Der Lehrling einer Klasse
// (data/lehrlinge.ts) zeigt dasselbe Bild gespiegelt: So stehen zwei derselben Klasse
// nebeneinander, ohne gleich auszusehen. Gespiegelt wird mit CSS (magic-city.css,
// `.lehrling-bild`): bei <img> das Bild selbst, bei Karten mit Hintergrundbild eine
// Ebene hinter dem Inhalt, die das Bild aus `--held-bild` trägt.
// ────────────────────────────────────────────────────────────────

import { HERO_IMAGE_MAP } from '../data/classes';

/** Was ein Bild braucht: die Klasse und ob es der Lehrling ist (Held, Kampfeinheit) */
export interface BildTraeger {
  classId?: string;
  lehrling?: boolean;
}

/** «assets/heroes/hero_guardian.png», oder null für Klassen ohne Bild */
export function heldBildPfad(classId: string | undefined): string | null {
  const bild = classId ? HERO_IMAGE_MAP[classId] : undefined;
  return bild ? `assets/heroes/${bild}.png` : null;
}

/** CSS-Klasse für ein <img> mit dem Heldenbild: der Lehrling gespiegelt */
export function bildKlasse(held: BildTraeger): string {
  return held.lehrling ? 'lehrling-bild' : '';
}

/**
 * Die ganze Adresse eines Bildes, für `--held-bild`. Eine relative url() in einer CSS-Variablen löst der Browser
 * gegen das Stylesheet auf, das sie benutzt: im fertigen Spiel (npm run build) liegt es unter /assets/, und das Bild
 * fehlte (/assets/assets/heroes/…). Gegen die Seite aufgelöst stimmt sie überall. Ohne Seite (Tests) bleibt sie relativ.
 */
function seitenAdresse(pfad: string): string {
  const basis = typeof document !== 'undefined' ? document.baseURI : undefined;
  return basis ? new URL(pfad, basis).href : pfad;
}

/**
 * Klasse und Stil für eine Karte mit dem Heldenbild als Hintergrund. Ohne Bild beide leer.
 * Der Lehrling bekommt das Bild in `--held-bild` statt in `background-image`.
 */
export function bildKarte(held: BildTraeger): { klasse: string; stil: string } {
  const pfad = heldBildPfad(held.classId);
  if (!pfad) return { klasse: '', stil: '' };
  return held.lehrling
    ? { klasse: 'lehrling-bild', stil: `--held-bild:url('${seitenAdresse(pfad)}')` }
    : { klasse: '', stil: `background-image:url('${pfad}')` };
}
