// ─── Magic City – Raids ganz oben über der Dungeon-Karte ─────────
// Ein Raid ist ein einziger grosser Kampf mit vielen Helden auf einem Feld aus Reihen und Spalten, in
// Trupps geteilt. Der Boss zielt nicht auf Helden, er trifft Orte (systems/RaidKampf.ts). Kein RouteDef und
// kein EnemyDef: Sets, Saal, Monsterbuch und Klang hängen nicht daran. Es gibt zwei Stufen: «Über dem Tag»
// (Zenit, 4 bis 10 Helden, zwei Trupps) und, nach dem ersten Sieg dort, «Die dreizehnte Stunde» (Zenit mit
// einem Gegenzeiger, 10 bis 15 Helden, drei Trupps). Regeln und Eichung: docs/RAID.md.
// ─────────────────────────────────────────────────────────────────

export interface RaidRegeln {
  /** Zeiger: Wucht = Angriff × zeiger, geteilt durch die lebenden Helden der Spalte */
  zeiger: number;
  /**
   * Gegenzeiger (fehlt: gibt es nicht): ein zweiter Zeiger, der rückwärts läuft, Runde 1 die letzte Spalte, Runde 2
   * die vorletzte … Sonst wie der Zeiger: Wucht = Angriff × gegenzeiger, geteilt durch die lebenden Helden der Spalte,
   * leere Spalte → Durchschlag. Stehen beide auf derselben Spalte, trifft sie beide, zuerst der Zeiger.
   */
  gegenzeiger?: number;
  /** Leere Spalte: Wucht = Angriff × durchschlag auf jeden lebenden Helden */
  durchschlag: number;
  /** Glocke: Wucht = Angriff × glocke auf jeden Helden der vollsten Reihe … */
  glocke: number;
  /** … alle so viele Runden */
  glockeAlle: number;
  /** Funken: Wucht = Angriff × funken auf das Ziel und seine Nachbarn im Trupp … */
  funken: number;
  /** … alle so viele Runden */
  funkenAlle: number;
  /** Ab dieser Runde (Mittag) wütet der Boss: alle Wuchten × mittagMal */
  mittagAb: number;
  mittagMal: number;
  /** Steht der Boss nach dieser Runde noch, ist der Kampf verloren (Mitternacht) */
  mitternacht: number;
  /** Raid-Heilregel: Heilung = Stärke der Fähigkeit + heilFaktor × Angriff des Heilers */
  heilFaktor: number;
  /** Geheilt wird, wenn im eigenen Trupp jemand unter diesem Anteil seiner Leben steht */
  heilUnter: number;
  /** Flächenschutz (aoe_resist) auf Glocke, Zeiger, Durchschlag und Funken */
  flaechenschutz: number;
  /**
   * Kuckuck (fehlt: gibt es nicht; Stufe III): jede Runde über einem Gang, reihum von links. Er pickt den mit den
   * wenigsten Leben unter denen, die direkt am Gang stehen (die zwei Spalten daneben), mit Angriff × kuckuck, wie ein
   * Schlag des Pendels (Abwehr, Ausweichen, Schutzherr und Deckung wirken). Steht dort niemand, geht er wieder hinein.
   */
  kuckuck?: number;
}

export interface TruhenDef {
  name: string;
  text: string;
  /** Festes Gold (zusätzlich zum Gold der Würfe) */
  gold?: number;
  /** Beutetabellen, je Nennung ein Wurf: ihr garantiertes Gold und ein Eintrag (zweimal genannt, zweimal gewürfelt) */
  wuerfeAus: string[];
  /**
   * Ein Set-Teil, das der Gilde fehlt, aus diesem Stufenbereich; zuerst aus Sets, die ein Teilnehmer zum Teil trägt.
   * `getrageneAusJederStufe`: die angefangenen Sets der Teilnehmer gehen dem Bereich vor, egal aus welcher Stufe.
   * `sonstJedeStufe`: fehlt im Bereich nichts mehr, ein fehlendes Teil jeder Stufe (sonst gibt es den Ersatz).
   */
  setTeil: { stufeVon: number; stufeBis: number; getrageneAusJederStufe: boolean; sonstJedeStufe: boolean };
  dinge: Record<string, number>;
  /** Statt des Set-Teils, wenn keins mehr fehlt (kommt zu `dinge` dazu) */
  ersatz: Record<string, number>;
}

export interface RaidDef {
  id: string;
  /** Name des Ortes auf der Karte */
  name: string;
  bossName: string;
  werte: { hp: number; atk: number; def: number; spd: number; critChance: number; critMult: number };
  regeln: RaidRegeln;
  reihen: number;
  /** Trupps zu je drei Spalten */
  truppZahl: number;
  minHelden: number;
  maxHelden: number;
  freieVersucheJeWoche: number;
  kostenJeVersuch: Record<string, number>;
  xp: { sieg: number; niederlage: number };
  truhen: { halb: TruhenDef; sieg: TruhenDef };
  /** «Was vom Pendel fiel» öffnet sich, wenn der Boss unter diesen Anteil fällt */
  halbUnter: number;
  /** Gegenstand zum ersten Sieg überhaupt */
  ersterSiegBeute: string;
  /** Offen, sobald dieser Dungeon einmal bezwungen ist */
  freiAb: string;
  /** Dazu erst nach dem ersten Sieg in diesem Raid (Stufe II nach Stufe I) */
  freiNachRaid?: string;
  /** Lage des Knotens auf der Dungeon-Karte (alle Stufen teilen sich den einen Knoten) */
  karte: { x: number; y: number; radius: number };
}

/** Spalten je Trupp */
export const SPALTEN_JE_TRUPP = 3;

export const RAID_DEFS: Record<string, RaidDef> = {
  zenit: {
    id: 'zenit',
    name: 'Über dem Tag',
    bossName: 'Zenit, das Uhrwerk',
    werte: { hp: 14000, atk: 110, def: 24, spd: 1.0, critChance: 0.1, critMult: 1.5 },
    regeln: {
      zeiger: 1.0, durchschlag: 0.6, glocke: 1.0, glockeAlle: 4, funken: 1.0, funkenAlle: 3,
      mittagAb: 12, mittagMal: 1.5, mitternacht: 24, heilFaktor: 2, heilUnter: 0.9, flaechenschutz: 0.7,
    },
    reihen: 3,
    truppZahl: 2,
    minHelden: 4,
    maxHelden: 10,
    freieVersucheJeWoche: 3,
    kostenJeVersuch: { mat_tagstein: 10 },
    xp: { sieg: 300, niederlage: 100 },
    halbUnter: 0.5,
    truhen: {
      halb: {
        name: 'Was vom Pendel fiel',
        text: 'Zenit kam unter die Hälfte. Dabei fiel etwas aus dem Räderwerk, und Jorinde hat es aufgehoben, '
          + 'bevor es jemand vermisst.',
        gold: 150,
        wuerfeAus: [],
        setTeil: { stufeVon: 4, stufeBis: 8, getrageneAusJederStufe: false, sonstJedeStufe: false },
        dinge: { mat_tagstein: 5 },
        ersatz: { crystal_shard: 8 },
      },
      sieg: {
        name: 'Zenits Truhe',
        text: 'Hinter dem Zifferblatt liegt, was die Vorigen nicht mehr abholen konnten. Alruna sagt, es gehöre den '
          + 'Nächsten, und sieht dabei auf die Uhr.',
        // je Tabelle viermal: Zenits Truhe soll etwa zwei Läufe bei Orm wert sein
        wuerfeAus: [
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
        ],
        setTeil: { stufeVon: 9, stufeBis: 12, getrageneAusJederStufe: true, sonstJedeStufe: true },
        dinge: { mat_tagstein: 10, crystal_shard: 15 },
        ersatz: { crystal_shard: 20 },
      },
    },
    ersterSiegBeute: 'die_unruh',
    freiAb: 'tagespfeiler',
    karte: { x: 390, y: -4120, radius: 72 },
  },
  // Stufe II: derselbe Zenit mit Ersatz-Unruh und Gegenzeiger, drei Trupps auf neun Spalten (A bis I). Eigene Woche,
  // eigene freie Ernstkämpfe, eigene Truhen; offen nach dem ersten Sieg auf Stufe I. Eichung: docs/RAID.md.
  dreizehn: {
    id: 'dreizehn',
    name: 'Die dreizehnte Stunde',
    bossName: 'Zenit, aufgezogen',
    werte: { hp: 15250, atk: 110, def: 12, spd: 1.0, critChance: 0.1, critMult: 1.5 },
    regeln: {
      zeiger: 1.0, gegenzeiger: 1.0, durchschlag: 0.6, glocke: 1.0, glockeAlle: 4, funken: 1.0, funkenAlle: 3,
      mittagAb: 12, mittagMal: 1.5, mitternacht: 24, heilFaktor: 2, heilUnter: 0.9, flaechenschutz: 0.7,
    },
    reihen: 3,
    truppZahl: 3,
    minHelden: 10,
    maxHelden: 15,
    freieVersucheJeWoche: 3,
    kostenJeVersuch: { mat_tagstein: 10 },
    xp: { sieg: 450, niederlage: 150 },
    halbUnter: 0.5,
    truhen: {
      halb: {
        name: 'Was der Gegenzeiger verlor',
        text: 'Zenit kam unter die Hälfte, und der Gegenzeiger hat dabei etwas verloren, rückwärts. Jorinde hat es '
          + 'aufgehoben, bevor er es wieder einsammelt.',
        gold: 250,
        wuerfeAus: [],
        setTeil: { stufeVon: 6, stufeBis: 10, getrageneAusJederStufe: false, sonstJedeStufe: false },
        dinge: { mat_tagstein: 8 },
        ersatz: { crystal_shard: 12 },
      },
      sieg: {
        name: 'Die dreizehnte Truhe',
        text: 'Hinter dem zweiten Zifferblatt steht eine Truhe, die es um zwölf noch nicht gab. Orm sagt, sie sei schon '
          + 'offen gewesen. Sie war es nicht.',
        // je Tabelle sechsmal: deutlich mehr als Zenits Truhe (viermal), dazu Set-Teile der Stufen 10 bis 12
        wuerfeAus: [
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
        ],
        setTeil: { stufeVon: 10, stufeBis: 12, getrageneAusJederStufe: true, sonstJedeStufe: true },
        dinge: { mat_tagstein: 15, crystal_shard: 25 },
        ersatz: { crystal_shard: 30 },
      },
    },
    ersterSiegBeute: 'die_unruh',
    freiAb: 'tagespfeiler',
    freiNachRaid: 'zenit',
    karte: { x: 390, y: -4120, radius: 72 },
  },
  // Stufe III: Zenit mit beiden Zeigern und einem Kuckuck, der über den Gängen pickt; vier Trupps auf zwölf Spalten (A
  // bis L), 15 bis 20 Helden. Eigene Woche, eigene Truhen; offen nach dem ersten Sieg auf Stufe II. Eichung: docs/RAID.md.
  kuckuck: {
    id: 'kuckuck',
    name: 'Das Kuckucksei',
    bossName: 'Zenit, mit Kuckuck',
    werte: { hp: 19000, atk: 110, def: 12, spd: 1.0, critChance: 0.1, critMult: 1.5 },
    regeln: {
      zeiger: 1.0, gegenzeiger: 1.0, kuckuck: 0.6, durchschlag: 0.6, glocke: 1.0, glockeAlle: 4, funken: 1.0, funkenAlle: 3,
      mittagAb: 12, mittagMal: 1.5, mitternacht: 24, heilFaktor: 2, heilUnter: 0.9, flaechenschutz: 0.7,
    },
    reihen: 3,
    truppZahl: 4,
    minHelden: 15,
    maxHelden: 20,
    freieVersucheJeWoche: 3,
    kostenJeVersuch: { mat_tagstein: 10 },
    xp: { sieg: 600, niederlage: 200 },
    halbUnter: 0.5,
    truhen: {
      halb: {
        name: 'Was aus dem Nest fiel',
        text: 'Zenit kam unter die Hälfte, und aus dem Nest fiel etwas, das nicht hineingehörte. Jorinde hat es '
          + 'aufgefangen, bevor der Kuckuck es zurückholt.',
        gold: 350,
        wuerfeAus: [],
        setTeil: { stufeVon: 8, stufeBis: 12, getrageneAusJederStufe: false, sonstJedeStufe: false },
        dinge: { mat_tagstein: 10 },
        ersatz: { crystal_shard: 15 },
      },
      sieg: {
        name: 'Das Nest',
        text: 'Hinter der Kuckuckstür liegt ein Nest, und darin alles, was der Kuckuck hinausgeworfen hat, nur nicht '
          + 'hinaus. Orm sagt, das Nest habe er nie gesehen. Es ist aus seinen Socken.',
        // je Tabelle achtmal: mehr als die dreizehnte Truhe (sechsmal), dazu Set-Teile der Stufen 10 bis 12
        wuerfeAus: [
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
          'loot_boss_alruna', 'loot_boss_orm', 'loot_boss_alruna', 'loot_boss_orm',
        ],
        setTeil: { stufeVon: 10, stufeBis: 12, getrageneAusJederStufe: true, sonstJedeStufe: true },
        dinge: { mat_tagstein: 20, crystal_shard: 35 },
        ersatz: { crystal_shard: 40 },
      },
    },
    ersterSiegBeute: 'die_unruh',
    freiAb: 'tagespfeiler',
    freiNachRaid: 'dreizehn',
    karte: { x: 390, y: -4120, radius: 72 },
  },
};

/** Stufe I: «Über dem Tag» (der Spielstand heisst dafür weiter `raid`) */
export const ZENIT = RAID_DEFS.zenit;
/** Stufe II: «Die dreizehnte Stunde» (Spielstand: `raidStufen.dreizehn`) */
export const DREIZEHN = RAID_DEFS.dreizehn;
/** Stufe III: «Das Kuckucksei» (Spielstand: `raidStufen.kuckuck`) */
export const KUCKUCK = RAID_DEFS.kuckuck;
/** Die Stufen in ihrer Reihenfolge (Umschalter im Raid-Bildschirm, Knoten auf der Karte) */
export const RAID_STUFEN: RaidDef[] = [ZENIT, DREIZEHN, KUCKUCK];

/** Teamwirkungen, die nur im eigenen Trupp wirken (Alrunas Liste nennt sie je Trupp) */
export const TRUPP_WIRKUNGEN: Record<string, string> = {
  phalanx: 'Phalanx',
  heldenlied: 'Heldenlied',
  kriegssegen: 'Kriegssegen',
  hain: 'Hain',
  mondwall: 'Mondwall',
  rudelgeheul: 'Rudelgeheul',
  schmiedetakt: 'Schmiedetakt',
  tragkraft: 'Tragkraft',
  seuche: 'Seuche',
  wachfeuer: 'Wachfeuer',
  schildwall: 'Schildwall',
};

const SPALTEN_NAMEN = 'ABCDEFGHIJKL';
/** «A» bis «F» (Stufe II: bis «I», mit vier Trupps bis «L») */
export function spaltenName(spalte: number): string {
  return SPALTEN_NAMEN[spalte] ?? '?';
}
/** «Links», «Rechts»; mit drei Trupps «Links», «Mitte», «Rechts»; mit vier «Links», «Halblinks», «Halbrechts», «Rechts» */
export function truppName(trupp: number, truppZahl = 2): string {
  if (truppZahl === 2) return trupp === 0 ? 'Links' : 'Rechts';
  const namen = truppZahl === 4 ? ['Links', 'Halblinks', 'Halbrechts', 'Rechts'] : ['Links', 'Mitte', 'Rechts'];
  return namen[trupp] ?? `Trupp ${trupp + 1}`;
}
/** «links», «halblinks», «rechts» für Sätze («Pendel links»); die Mitte bleibt ein Hauptwort («Pendel Mitte») */
export function truppKlein(trupp: number, truppZahl = 2): string {
  const name = truppName(trupp, truppZahl);
  return name === 'Mitte' ? name : name.toLowerCase();
}
/** «nach links», «in die Mitte», «nach halbrechts», «nach rechts» */
export function truppRichtung(trupp: number, truppZahl = 2): string {
  const name = truppName(trupp, truppZahl);
  return name === 'Mitte' ? 'in die Mitte' : `nach ${name.toLowerCase()}`;
}
/** «Runde 5, 14 und 23» ohne das Wort «Runde» */
export const rundenListe = (runden: number[]): string =>
  runden.length <= 1 ? String(runden[0] ?? '') : `${runden.slice(0, -1).join(', ')} und ${runden[runden.length - 1]}`;

/** Was ein Held hinterlassen hat, nach Klasse (Alrunas Liste: «Wir hatten auch einmal … vorn») */
function vorigeNachKlasse(classId: string): string {
  if (classId === 'ranger' || classId === 'bard') return 'den Bogen';
  if (classId === 'assassin') return 'das Messer';
  if (classId === 'cleric' || classId === 'druid') return 'den Salbentopf';
  return 'jemanden, der nicht dafür gebaut war';
}

const liste = (namen: string[]): string =>
  namen.length <= 1 ? (namen[0] ?? '') : `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`;

/** Alle Texte des Raids. Platzhalter als Parameter, nichts davon steht im Bildschirm-Code. */
export const RAID_TEXTE = {
  einleitung:
    'Die Leiter, die Jorinde über dem Tag gefunden hat, ist länger, als sie aussah, und oben tickt es. Über den '
    + 'Pfeilern hängt ein Uhrwerk, so gross wie der Marktplatz: ein Pendel, das nach links und rechts ausschlägt, ein '
    + 'Zeiger, der die Stunden abfährt, und eine Glocke, die dort schlägt, wo am meisten los ist. Alruna nennt es Zenit. '
    + 'Es zieht den Tag über den Himmel und zieht ihn schief, seit unten Pfeiler fehlen; Orm sagt, da oben sei nichts, '
    + 'und schaut dabei nicht hinauf. Der letzte Punkt auf Alrunas Liste lautet: «Nicht zu viert hinauf.» Ihre Gilde ging '
    + 'zu viert, Schild, Bogen, Messer und Salbentopf; die Hocker stehen noch in der Wachstube. Ich habe im Gildenhaus '
    + 'unsere gezählt. Es sind mehr geworden.',
  schluss:
    'Zenit steht auf zwölf und bleibt dort, nicht aus Trotz, sagt Alruna, sondern weil ihn zum ersten Mal jemand '
    + 'angehalten hat, der nicht zu viert kam. Der Tag hängt wieder gerade, und Orm hat zum ersten Mal nach oben '
    + 'geschaut; er sagt, es sei leichter geworden, und tut dann so, als hätte er nichts gesagt. Alruna hat den letzten '
    + 'Punkt auf ihrer Liste durchgestrichen, mit dem neuen Stift, und darunter einen neuen geschrieben, für die Nächsten. '
    + 'Er lautet «Montag». Jorinde sagt, über dem Zenit sei nichts. Ich habe es aufgeschrieben, mit Bleistift.',
  montagVorSieg: 'Montag. Drei neue Ernstkämpfe. Zenit hat die alten nicht gezählt, Alruna schon.',
  montagNachSieg: 'Montag. Zenit hat sich wieder aufgezogen, mit einer Ersatz-Unruh. Jemand muss sie ihm gebracht haben, '
    + 'und Orm sagt, er sei es nicht gewesen.',
  unterschrift: 'Ottokar, Stadtschreiber',
  /** Stufe III: der Gang zwischen zwei Trupps (0 = der linke); mit vier Trupps «links», «Mitte», «rechts» */
  gangName: (gang: number, truppZahl: number): string => {
    const namen = truppZahl === 4 ? ['links', 'Mitte', 'rechts'] : truppZahl === 3 ? ['links', 'rechts'] : ['Mitte'];
    return namen[gang] ?? `${gang + 1}`;
  },

  karte: {
    name: 'ÜBER DEM TAG',
    klein: (min: number, max: number) => `RAID · ${min} BIS ${max} HELDEN`,
    keinVersuch: 'Noch kein Versuch',
    best: (rest: number) => `Bestversuch: Zenit bei ${rest} %`,
    besiegtDieseWoche: 'Diese Woche besiegt',
    aufgezogen: 'Zenit hat sich wieder aufgezogen',
    zwoelf: 'Zenit steht auf zwölf',
    /** Titel des Knotens: je offene Stufe ein Satzteil (eine offen: Stufe I allein, auch solange alles zu ist) */
    tooltipStufen: (offen: number) => offen <= 1
      ? 'Zenit, das Uhrwerk über dem Tag. Ein Kampf für bis zu zehn Helden.'
      : `Zenit, das Uhrwerk über dem Tag. Stufe I für bis zu zehn Helden, Stufe II für bis zu fünfzehn${offen >= 3
        ? ', Stufe III für bis zu zwanzig' : ''}.`,
    /** Zweite Zeile am Knoten, sobald Stufe II offen ist */
    stufeZeile: (stufe: string, zeile: string) => `Stufe ${stufe} · ${zeile}`,
    leiter: 'Jorindes Leiter. Zehn Sprossen.',
    truhenPunkt: 'Diese Woche wartet noch eine Truhe.',
    zu: 'Erst die Pfeiler des Tages',
  },

  regelBlatt: [
    'Pendel: jede Runde abwechselnd links und rechts. Es trifft alle in der vordersten besetzten Reihe des Trupps. '
      + 'Spott hilft nicht: Zenit zielt nicht, Zenit schwingt.',
    'Zeiger: jede Runde eine Spalte weiter, A bis F und wieder A. Seine Last teilt sich auf alle in der Spalte. Ist die '
      + 'Spalte leer, schlägt er durch, auf alle.',
    'Glocke: alle vier Runden, auf jeden in der vollsten Reihe. Bei Gleichstand die hintere.',
    'Funken: alle drei Runden, auf den, der bisher am meisten Schaden gemacht hat, und auf seine Nachbarn im Trupp: oben, '
      + 'unten, links, rechts. Über den Gang springen sie nicht.',
    'Mittag: Ab Runde 12 schlägt alles anderthalbmal so hart. Mitternacht: Nach Runde 24 ist der Tag um.',
    'Trupps: Links sind die Spalten A bis C, Rechts D bis F. Lieder, Segen, Schilde und Heilung wirken nur im eigenen '
      + 'Trupp.',
    'Hier oben heilen Kleriker, Druiden und Paladine mitten im Kampf: Steht im eigenen Trupp jemand unter neun Zehnteln, '
      + 'heilen sie den Schwächsten statt anzugreifen und warten dann ihre Abklingzeit.',
    'Ein Ernstkampf wird beim Klick gerechnet und gebucht. Die Wiedergabe zeigt nur, was geschah.',
  ],

  liste: {
    kopf: 'ALRUNAS LISTE',
    unterzeile: 'Was wir falsch gemacht haben. Damit ihr es besser macht.',
    pendelOk: (seite: string, namen: string[], name: string, vor: number, nach: number) =>
      `Pendel ${seite} trifft ${liste(namen)}. ${name} hält etwa ${vor} Schläge, ab Mittag ${nach}.`,
    pendelZerbrechlich: (seite: string, name: string, schlaege: number, classId: string) =>
      `Pendel ${seite} trifft ${name}, und ${name} hält ${schlaege === 1 ? 'einen Schlag' : `${schlaege} Schläge`}. `
      + `Wir hatten auch einmal ${vorigeNachKlasse(classId)} vorn. Einmal.`,
    pendelViele: (seite: string, n: number) => `Vorn ${seite} stehen ${n}. Das Pendel trifft jeden davon.`,
    pendelLeer: (seite: string, andere: string) => `Trupp ${seite} ist leer. Das Pendel schlägt dann jede Runde ${andere}.`,
    /** Mit drei Trupps: Der leere Trupp gibt seine Pendelrunden an den nächsten ab («nach rechts», «in die Mitte») */
    pendelLeerWeiter: (seite: string, wohin: string, mal: number) =>
      `Trupp ${seite} ist leer. Das Pendel nimmt seine Runden dann mit, ${wohin}, und dort schlägt es `
      + `${mal >= 3 ? 'dreimal' : 'doppelt'} so oft.`,
    zeigerOk: 'Jede Spalte ist besetzt. Der Zeiger findet überall jemanden.',
    zeigerLeer: (spalte: string, runden: number[]) =>
      `Spalte ${spalte} ist leer. Dort schlägt der Zeiger durch, auf alle: Runde ${runden.join(', ')}.`,
    zeigerEinzeln: (spalte: string, name: string) => `Spalte ${spalte} trägt nur ${name}. Fällt ${name}, steht ${spalte} leer.`,
    // Mit Gegenzeiger (Stufe II): beide Zeiger und ihre Runden, und die Spalte, auf der sie sich treffen
    zeigerOkBeide: 'Jede Spalte ist besetzt. Zeiger und Gegenzeiger finden überall jemanden.',
    zeigerLeerBeide: (spalte: string, zeiger: number[], gegen: number[]) =>
      `Spalte ${spalte} ist leer. Dort schlagen beide durch, auf alle: der Zeiger in Runde ${rundenListe(zeiger)}, `
      + `der Gegenzeiger in Runde ${rundenListe(gegen)}.`,
    zeigerEinzelnBeide: (spalte: string, name: string, zeiger: number[], gegen: number[]) =>
      `Spalte ${spalte} trägt nur ${name}, gegen den Zeiger in Runde ${rundenListe(zeiger)} und den Gegenzeiger in Runde `
      + `${rundenListe(gegen)}. Fällt ${name}, steht ${spalte} leer.`,
    treffpunktLeer: (spalte: string, runden: number[]) =>
      `Auf Spalte ${spalte} treffen sich die Zeiger, in Runde ${rundenListe(runden)}, und dort steht niemand. Dann schlagen `
      + 'beide durch, auf alle, zweimal in derselben Runde.',
    treffpunktEinzeln: (spalte: string, runden: number[], name: string) =>
      `Auf Spalte ${spalte} treffen sich die Zeiger, in Runde ${rundenListe(runden)}. Dort steht nur ${name} und trägt beide. `
      + `Fällt ${name} unter dem ersten, schlägt der zweite durch.`,
    treffpunktZerbrechlich: (spalte: string, runden: number[], name: string) =>
      `Auf Spalte ${spalte} treffen sich die Zeiger, in Runde ${rundenListe(runden)}. ${name} hält ab Mittag keine zwei `
      + 'solchen Runden.',
    treffpunktOk: (spalte: string, runden: number[], namen: string[]) =>
      `Auf Spalte ${spalte} treffen sich die Zeiger, in Runde ${rundenListe(runden)}. `
      + (namen.length === 1 ? `${namen[0]} trägt dort beide allein und hält es aus.` : `Dort teilen sich ${liste(namen)} beide.`),
    glockeOk: (reihe: number, namen: string[]) => `Die Glocke schlägt in Reihe ${reihe}: ${liste(namen)}.`,
    glockeVoll: (reihe: number, namen: string[]) =>
      `Die Glocke schlägt in Reihe ${reihe}, dort stehen ${namen.length}: ${liste(namen)}. Sie zählt gern.`,
    glockeZerbrechlich: (reihe: number, name: string) =>
      `Die Glocke schlägt in Reihe ${reihe}, und ${name} hält ab Mittag keine zwei Glockenschläge.`,
    funkenOk: (name: string) => `Funken: wohl ${name}. Niemand daneben.`,
    funkenNachbarn: (name: string, nachbarn: string[]) =>
      `Funken: wohl ${name}, daneben ${liste(nachbarn)}. Wer neben ${name} steht, steht im Funkenflug.`,
    truppOk: (seite: string, wirkungen: string[], heiler: string[]) =>
      `${seite}: ${wirkungen.length > 0 ? `${wirkungen.join(', ')}. ` : ''}Heiler: ${liste(heiler)}.`,
    truppOhneHeiler: (seite: string) => `${seite} hat keinen Heiler. Bei uns stand der Salbentopf auch auf der falschen Seite.`,
    truppDoppelt: (seite: string, wirkung: string) => `${seite}: zweimal ${wirkung}. Es zählt nur die stärkere.`,
    zahl: (n: number, max: number) => {
      if (n >= max) return 'Zehn gehen hinauf. Dafür hat die Liste keinen Punkt. Alruna hat nachgesehen.';
      if (n >= 5) return `${n} gehen hinauf. Mehr wären besser, sagt die Liste nicht. Alruna schon.`;
      if (n === 4) return 'Vier gehen hinauf. Das ist der letzte Punkt auf der Liste, und er ist zweimal unterstrichen.';
      return 'Mindestens vier. Darunter lohnt sich nicht einmal die Leiter.';
    },
  },

  kriegsrat: {
    rechnet: 'Der Kriegsrat schaut 20-mal hinauf …',
    siege: (s: number, n: number) => `Sieg in ${s} von ${n}`,
    rest: (rest: number) => `Zenit im Schnitt bei ${rest} %`,
    ursache: (ort: string) => `Meist gefallen durch: ${ort}`,
    meistGefallen: (name: string, k: number, n: number) => `Am häufigsten gefallen: ${name} (${k} von ${n})`,
    funken: (name: string, k: number, n: number) => `Funken trafen: ${name} (${k} von ${n})`,
    gleich: 'Gleiche Aufstellung, gleicher Rat. Wer anders fragen will, muss anders stellen.',
    letzter: (s: number, n: number, rest: number) => `Letzter Rat: ${s} von ${n} · Zenit bei ${rest} %`,
  },

  /** Ort einer Ursache: «Glocke (Reihe 3)», «Zeiger (Spalte C)» … */
  ort: {
    pendel: (seite: string) => `Pendel (Trupp ${seite})`,
    zeiger: (spalte: string) => `Zeiger (Spalte ${spalte})`,
    gegenzeiger: (spalte: string) => `Gegenzeiger (Spalte ${spalte})`,
    durchschlag: (spalte: string) => `Durchschlag (Spalte ${spalte} leer)`,
    glocke: (reihe: number) => `Glocke (Reihe ${reihe})`,
    funken: (name: string) => `Funken (um ${name})`,
    kuckuck: (gang: string) => `Kuckuck (Gang ${gang})`,
    rest: 'Rundenende',
    mitternacht: 'Mitternacht',
  },

  /** Satz zur Hauptursache (Ergebnis und Kriegsrat) */
  hauptursache: {
    glocke: (reihe: number) => `Die meisten fielen unter der Glocke, in Reihe ${reihe}. Sie schlägt, wo am meisten los ist, `
      + 'und bei uns war dort am meisten los.',
    zeiger: (spalte: string, name: string) => `Der Zeiger drückte Spalte ${spalte}, und ${name} trug sie allein.`,
    zeigerViele: (spalte: string) => `Der Zeiger drückte Spalte ${spalte}, und dort stand zu wenig, um ihn zu tragen.`,
    gegenzeiger: (spalte: string, name: string) => `Der Gegenzeiger drückte Spalte ${spalte}, und ${name} trug sie allein. `
      + 'Er kam von der anderen Seite, wie immer.',
    gegenzeigerViele: (spalte: string) => `Der Gegenzeiger drückte Spalte ${spalte}, und dort stand zu wenig, um ihn zu `
      + 'tragen. Rückwärts ist er nicht leichter.',
    durchschlag: (spalte: string) => `Spalte ${spalte} stand leer, und der Zeiger ging durch alle. Leere Spalten mag er am liebsten.`,
    /** Stufe II: Auf einer leeren Spalte schlagen beide Zeiger durch; welcher es war, sagt der Satz nicht */
    durchschlagBeide: (spalte: string) => `Spalte ${spalte} stand leer, und wer von den beiden Zeigern dort vorbeikam, ging `
      + 'durch alle. Leere Spalten mögen beide am liebsten.',
    pendel: (seite: string, k: number) => `Das Pendel traf die Front ${seite === 'Mitte' ? 'in der Mitte' : seite} ${k}-mal. `
      + 'Am Ende stand dort niemand mehr, der dafür gebaut war.',
    funken: (name: string) => `Die Funken trafen ${name} und wer daneben stand. Danach stand niemand mehr daneben.`,
    kuckuck: (gang: string, name: string) => `Der Kuckuck pickte am Gang ${gang}, und ${name} war dort jedes Mal der `
      + 'Kleinste im Nest.',
    kuckuckViele: (gang: string, k: number) => `Der Kuckuck pickte am Gang ${gang} ${k}-mal den Kleinsten aus dem Nest. `
      + 'Am Gang standen die Falschen.',
    rest: (name: string) => `${name} fiel am Rundenende. Das System hat es trotzdem Zenit angeschrieben.`,
    mitternacht: 'Mitternacht. Der Tag ist um, und Zenit stellt die Gilde vor die Tür, wie man Stühle hochstellt.',
    keiner: 'Niemand ist gefallen. Alruna hat die Liste trotzdem mitgebracht, für alle Fälle.',
  },

  /** Ansagen des Stadtschreibers, je Art höchstens einmal je Kampf, an echte Ereignisse gebunden */
  ansage: {
    spott: (name: string) => `${name} ruft Zenit zum Zweikampf. Zenit ist eine Uhr.`,
    heilung: (heiler: string) => `${heiler} heilt mitten im Kampf. Hier oben, sagt ${heiler}, gibt es keine Rast, also muss `
      + 'die Rast eben mitkommen.',
    durchschlagLeer: (spalte: string) => `Spalte ${spalte} war leer. Der Zeiger hat das als Einladung verstanden.`,
    durchschlagGefallen: (name: string, spalte: string) => `${name} fiel, und Spalte ${spalte} stand leer. Der Zeiger merkt `
      + 'so etwas sofort.',
    /** Stufe III: der Kuckuck, zum ersten Mal mit einem Ziel, und zum ersten Mal vor einem leeren Gang */
    kuckuck: (gang: string, name: string) => `Über dem Gang ${gang} geht eine Tür auf. Der Kuckuck schaut, wer am Gang am `
      + `kleinsten ist, und pickt ${name}. So machen es Kuckucke, sagt Alruna.`,
    kuckuckLeer: (gang: string) => `Über dem Gang ${gang} geht die Tür auf, aber am Gang steht niemand. Der Kuckuck schaut `
      + 'beleidigt und geht wieder hinein.',
    /** Stufe II: Zeiger und Gegenzeiger stehen auf derselben Spalte */
    dreizehn: (spalte: string) => `Es schlägt dreizehn: Beide Zeiger stehen auf Spalte ${spalte}. Zenit tut, als sei das Absicht.`,
    glocke: (reihe: number, n: number) => `Die Glocke schlägt, wo am meisten los ist. In Reihe ${reihe} standen ${n}. Sie hat `
      + 'nachgezählt.',
    funken: (name: string, nachbarn: string[]) => `Zenit merkt sich, wer ihm am meisten wehtut. ${name} hat gewonnen.`
      + (nachbarn.length > 0 ? ` ${liste(nachbarn)} ${nachbarn.length === 1 ? 'stand' : 'standen'} daneben.` : ''),
    pendelZerbrechlich: (name: string) => `${name} stand vorn. Das Pendel fragt nicht, wer eingeteilt war.`,
    mittag: 'Es schlägt zwölf. Zenit hat Mittag und nimmt ihn sich nicht frei.',
    bardin: (name: string, runde: number) => `Zuerst fiel ${name}, in Runde ${runde}. Das Heldenlied lief trotzdem weiter, bis zum Ende.`,
    viele: (n: number) => `${n} gehen hinauf. Alruna zählt mit und sagt nichts, sehr deutlich.`,
    vier: 'Vier gehen hinauf. Alruna holt die Liste heraus, schlägt die erste Seite auf und legt den Stift bereit.',
    mitternacht: 'Mitternacht. Der Tag ist um, und Zenit stellt die Gilde vor die Tür, wie man Stühle hochstellt.',
    niederlageSpaet: (runde: number) => `Alruna sagt, ihre Gilde sei bis Runde neun gekommen, zu viert. Ihr kamt bis Runde `
      + `${runde}. Sie schreibt es auf.`,
    niederlageFrueh: (runde: number) => `Ihr kamt bis Runde ${runde}. Alrunas Gilde kam bis Runde neun, zu viert. Alruna sagt `
      + 'nichts und schreibt sehr ordentlich.',
    zwoelf: 'Zenit fiel, als es zwölf schlug. Mittag hat er nicht mehr gemacht.',
    vorZwoelf: 'Zenit fiel vor zwölf. Mittag hat er nicht mehr gemacht.',
    abriss: 'Orm hat zugesehen und nichts gesagt. Er hat aber die Pfeiler gezählt, die wir ihm gelassen haben.',
  },

  ergebnis: {
    sieg: 'ZENIT STEHT AUF ZWÖLF',
    siegZeile: (runde: number, k: number, n: number) => `Sieg in Runde ${runde}. Am Ende standen ${k} von ${n}.`,
    niederlage: (rest: number) => `ZENIT BEI ${rest} %`,
    vorher: (best: number) => `vorher: ${best} %`,
    neuerBest: 'Neuer Bestversuch!',
    niederlageZeile: (runde: number, k: number, n: number) => `Ihr kamt bis Runde ${runde}. Am Ende standen ${k} von ${n}.`,
    xp: (xp: number, n: number) => `+${xp} XP für jeden der ${n}`,
    stufe: (name: string, stufe: number) => `${name} ist jetzt Stufe ${stufe}`,
    klasse: (klasse: string) => `${klasse} freigeschaltet`,
    meisterSchaden: (name: string, p: number) => `Meister Schaden: ${name} (${p} %)`,
    meisteHeilung: (name: string, h: number) => `Meiste Heilung: ${name} (${h})`,
    gefallenKopf: 'GEFALLEN',
    gefallenZeile: (name: string, ort: string, runde: number) => `${name}: ${ort}, Runde ${runde}`,
    keinerGefallen: 'Niemand.',
    truhenKopf: 'INS LAGER',
    aendern: 'Aufstellung ändern',
    nochmalFrei: (frei: number, max: number) => `Nochmal · frei (${frei} von ${max})`,
    nochmalKosten: (kosten: number) => `Nochmal · ${kosten} Tagstein`,
    zurKarte: 'Zur Karte',
    wiedergabe: 'Wiedergabe ansehen',
    dialog: 'Ergebnis des Ernstkampfs',
    gildeKopf: 'DIE GILDE',
    erfolgeKopf: 'ERFOLGE',
    chronikKopf: 'AUS DER CHRONIK',
    gold: (n: number) => `${n} Gold`,
    frei: (rest: number, max: number) => `Freier Ernstkampf · noch ${rest} von ${max} diese Woche`,
    bezahlt: (kosten: number) => `Bezahlt: ${kosten} Tagstein`,
    keineTruheHalb: 'Unter der Hälfte öffnet sich «Was vom Pendel fiel». Diesmal blieb sie zu.',
    halbSchonGeholt: '«Was vom Pendel fiel» ist diese Woche schon geholt. Beim Sieg wartet noch Zenits Truhe.',
    truhenTitel: (namen: string[]) => namen.join(' · '),
  },

  bildschirm: {
    titel: 'ZENIT, DAS UHRWERK',
    leben: (hp: number) => `Leben ${hp.toLocaleString('de-CH')}`,
    best: (rest: number) => `Bestversuch: Zenit bei ${rest} %`,
    keinErnstkampf: 'Noch kein Ernstkampf',
    besiegt: (n: number) => `Besiegt: ${n}-mal`,
    frei: (frei: number, max: number, kosten: number) => `Frei: ${frei} von ${max} · danach ${kosten} Tagstein`,
    wocheBesiegt: 'Diese Woche besiegt · Truhen geleert',
    nachWochensieg: 'Zenits Truhe ist diese Woche geleert. Er zieht sich am Montag wieder auf. Ernstkämpfe zählen weiter '
      + 'für Erfolge und Erfahrung.',
    mindestens: (min: number) => `Mindestens ${min} Helden aufstellen`,
    zuWenigTagstein: (hat: number, kosten: number) => `Zu wenig Tagstein (${hat} von ${kosten})`,
    unterwegs: 'Eine Expedition ist unterwegs. Zenit wartet.',
    rueckfrage: (kosten: number, hat: number) => `Die freien Ernstkämpfe dieser Woche sind verbraucht. Einer kostet ${kosten} `
      + `Tagstein, im Lager liegen ${hat}. Hinauf?`,
    rueckfrageJa: 'Hinauf',
    rueckfrageNein: 'Lieber nicht',
    nochZu: 'Erst die Pfeiler des Tages bezwingen. Die Leiter steht auf ihnen.',
    aufstellung: 'AUFSTELLUNG',
    tippen: 'HELD ANKLICKEN, DANN FELD',
    tippenKurz: 'Held antippen, dann Feld. Lange drücken: sein Blatt.',
    gewaehlt: (name: string) => `${name} gewählt: Feld antippen zum Versetzen oder Tauschen, Bank zum Zurücknehmen.`,
    gewaehltKurz: (name: string) => `${name.toUpperCase()} GEWÄHLT · FELD ODER BANK ANKLICKEN`,
    voll: (max: number) => `${max} Helden stehen schon oben. Tausch einen gegen einen, der auf dem Feld steht.`,
    leeren: 'Leeren',
    hilfe: 'Wie Zenit schlägt',
    bank: 'BANK',
    bankZahl: (n: number, max: number) => `${n} VON ${max} AUFGESTELLT`,
    bankTipp: 'Alle Helden der Gilde, die Marke zeigt ihr Feld.',
    bankFuss: 'Lange drücken oder Rechtsklick auf einen Helden zeigt sein Blatt: Werte, Weg, Sets und Raid-Rolle. '
      + 'Am PC lassen sich Helden auch ziehen.',
    kriegsrat: 'KRIEGSRAT · 20 PROBEN',
    kriegsratKurz: 'KRIEGSRAT',
    proben: (n: number) => `${n} PROBEN`,
    ernstkampfFrei: (frei: number, max: number) => `ERNSTKAMPF · FREI (${frei} VON ${max})`,
    ernstkampfKosten: (kosten: number) => `ERNSTKAMPF · ${kosten} TAGSTEIN`,
    ernstkampfKurz: 'ERNSTKAMPF',
    wochentruhen: 'WOCHENTRUHEN',
    truheGeholt: 'Diese Woche schon geholt',
    truheWartet: (wann: string) => wann,
    halbWann: 'ZENIT UNTER 50 %',
    siegWann: 'BEIM SIEG',
    halbInhalt: 'Set-Teil, Gold, Tagstein',
    siegInhalt: 'Beute von Alruna und Orm, Set-Teil, Tagstein',
    unruhZeile: 'Erster Sieg: Die Unruh',
    unruhInhalt: 'Schmuck, Stufe 12, nur einmal',
    unruhGeholt: 'Schon geholt',
    kw: (nr: number) => `KW ${nr}`,
    vormittag: 'VORMITTAG · RUNDE 1 BIS 11',
    mittag: 'ES SCHLÄGT ZWÖLF · AB HIER ALLES × 1,5',
    mitternacht: 'MITTERNACHT ▸',
    legendeTag: 'nach Runde 24 ist der Tag um',
    rollen: { tank: 'Pendelfänger', heil: 'Heiler', dps: 'Schaden', stuetze: 'Trupp-Stütze' },
    vorige: 'DIE VORIGEN',
    vorigeTitel: 'Die Vorigen: Schild, Bogen, Messer, Salbentopf',
    alleZeigen: (erledigt: number, alle: number) => `${erledigt} erledigt · alle ${alle} ▾`,
    wenigerZeigen: 'nur Warnungen ▴',
    uhr: { vor: 'Zenit, das Uhrwerk, kurz vor zwölf', auf: 'Zenit, das Uhrwerk, auf zwölf' },
    werte: { angriff: 'Angriff', abwehr: 'Abwehr', tempo: 'Tempo', krit: 'Krit' },
    lebenTitel: 'Weisse Striche: wo die bisherigen Ernstkämpfe Zenit gelassen haben. Gold: der Bestversuch.',
    bestMarke: (rest: number) => `Bestversuch ${rest} %`,
    freiLabel: 'Frei:',
    freiWert: (frei: number, max: number) => `${frei} von ${max}`,
    freiDanach: (kosten: number) => `diese Woche · danach je ${kosten}`,
    lager: (n: number) => `Tagstein · im Lager ${n}`,
    rundeTitel: (runde: number, spalte: string, seite: string, extra: string[], gegen?: string, gang?: string) =>
      `Runde ${runde}: Zeiger ${spalte}${gegen ? `, Gegenzeiger ${gegen}` : ''}${seite ? `, Pendel ${seite}` : ''}`
      + `${gang ? `, Kuckuck am Gang ${gang}` : ''}${extra.length > 0 ? `, ${extra.join(', ')}` : ''}`,
    /** Stufe II: Runde, in der beide Zeiger auf derselben Spalte stehen (Markierung in der Rundenleiste) */
    dreizehnMarke: 'es schlägt dreizehn',
    legende: {
      funken: 'Funken', glocke: 'Glocke', zeiger: 'Zeiger', pendel: 'Pendel', seitenLang: 'links / rechts', seitenKurz: 'l / r',
      mittagLang: 'ab Mittag × 1,5', mittagKurz: 'Mittag × 1,5', heilung: 'Heilung',
      gegenzeiger: 'Gegenzeiger', seitenDreiLang: 'links / Mitte / rechts', seitenDreiKurz: 'l / m / r',
      seitenVierLang: 'links / halblinks / halbrechts / rechts', seitenVierKurz: 'l / hl / hr / r',
      kuckuck: 'Kuckuck', gangLang: 'am Gang links / Mitte / rechts', gangKurz: 'Gang l / m / r',
      dreizehnLang: 'beide Zeiger auf einer Spalte', dreizehnKurz: 'dreizehn',
    },
    /** Umschalter zwischen den Stufen */
    stufen: 'Stufe',
    stufenNav: 'Stufen des Raids',
    stufeKnopf: (stufe: string, name: string) => `Stufe ${stufe} · ${name}`,
    stufeHelden: (min: number, max: number) => `${min}–${max} Helden`,
    stufeFrei: (frei: number, max: number) => `Frei: ${frei} von ${max} diese Woche`,
    stufeKosten: (kosten: number) => `Ernstkampf je ${kosten} Tagstein`,
    /** Am Umschalter: eine offene Stufe, auf der noch niemand war */
    stufeNeuMarke: 'neu',
    stufeNeu: (stufe: string, name: string) => `Neu offen: Stufe ${stufe}, «${name}»`,
    zurStufe: (stufe: string) => `Zu Stufe ${stufe}`,
    truppZeile: (n: number, heiler: string[]) =>
      `${n === 1 ? '1 Held' : `${n} Helden`} · ${heiler.length > 0 ? `Heiler: ${heiler.join(', ')}` : 'kein Heiler'}`,
    spalteNur: (name: string) => `nur ${name}`,
    spalteLeer: 'leer',
    spalteHelden: (n: number) => (n === 1 ? '1 Held' : `${n} Helden`),
    vorn: 'VORN',
    hinten: 'HINTEN',
    gang: 'GANG',
    /** Stufe III: Spaltenkopf am Gang (C/D, F/G, I/J) */
    amGang: (gang: string) => `Am Gang ${gang} pickt der Kuckuck den mit den wenigsten Leben.`,
    feldLabel: (feld: string) => `Feld ${feld}, leer`,
    zelleTitel: (name: string, klasse: string, feld: string) => `${name} · ${klasse} · Feld ${feld}`,
    karteTitel: (name: string, klasse: string, rolle: string, feld: string | null) =>
      `${name} · ${klasse} · ${rolle}${feld ? ` · Feld ${feld}` : ' · auf der Bank'}`,
    aufDieBank: 'Auf die Bank',
    leerenSicher: 'Wirklich leeren?',
    ratLeer: 'Der Kriegsrat schaut 20-mal hinauf, mit genau dieser Aufstellung. Er ändert nichts und kostet nichts.',
    ratBefragen: 'Kriegsrat befragen',
    ratProbe: 'Einen Probelauf ansehen',
    ratVorige: (s: number, n: number, rest: number) => `Vorige Aufstellung: ${s} von ${n} · Zenit bei ${rest} %`,
    ratUnterLeer: '20 Proben · ändert nichts',
    ratUnterLaeuft: 'Der Kriegsrat rechnet …',
    ratUnterKurz: (s: number | null) => (s === null ? '20 Proben' : `zuletzt ${s} von 20`),
    ratLabel: {
      sieg: 'Sieg', rest: 'Zenit im Schnitt bei', ursache: 'Meist gefallen durch:', meist: 'Am häufigsten gefallen:',
      funken: 'Funken trafen:',
    },
    ratSiege: (s: number, n: number) => `${s} von ${n}`,
    ratOft: (name: string, k: number, n: number) => `${name} (${k} von ${n})`,
    ratNiemand: 'niemand',
    alruna: '— ALRUNA',
    ernstFreiUnter: (frei: number, max: number, kosten: number) => `noch ${frei} von ${max} diese Woche, danach ${kosten} Tagstein`,
    ernstFreiKurz: (frei: number, max: number) => `frei · noch ${frei} von ${max}`,
    ernstKostenUnter: (hat: number) => `im Lager ${hat} Tagstein`,
    schliessen: 'Schliessen',
    weiter: 'Weiter',
    rueckfrageTitel: 'ERNSTKAMPF',
    blatt: {
      unter: (klasse: string, stufe: number) => `${klasse} · Stufe ${stufe}`,
      weg: 'Weg:',
      keinWeg: 'noch keiner (ab Stufe 10)',
      sets: 'Sets:',
      keineSets: 'keins',
      setTeile: (n: number, von: number) => `${n} von ${von}`,
      rolle: 'Im Raid:',
      steht: (feld: string) => `Steht auf ${feld}.`,
      bank: 'Sitzt auf der Bank.',
      leben: 'Leben',
      abwehr: 'Abwehr',
      angriff: 'Angriff',
      tempo: 'Tempo',
    },
    rollenText: {
      tank: 'Hält vorn das Pendel aus. Gehört allein in die vorderste Reihe seines Trupps.',
      heil: 'Heilt hier oben mitten im Kampf, aber nur im eigenen Trupp.',
      dps: 'Macht den Schaden und zieht damit die Funken an. Steht besser ohne Nachbarn.',
      stuetze: 'Hilft dem eigenen Trupp mit Lied oder Seuche. Beides wirkt nur dort.',
    },
  },

  /** Laufzeile der Wiedergabe */
  lauf: {
    runde: (runde: number, max: number, zeit: string) => `Runde ${runde} von ${max} · ${zeit}`,
    zeiten: { vormittag: 'Vormittag', mittag: 'Mittag', nachmittag: 'Nachmittag' },
    pendel: (seite: string, treffer: string) => `Pendel ${seite}: ${treffer}`,
    zeiger: (spalte: string, treffer: string) => `Zeiger ${spalte}: ${treffer}`,
    gegenzeiger: (spalte: string, treffer: string) => `Gegenzeiger ${spalte}: ${treffer}`,
    durchschlag: (spalte: string, min: number, max: number) =>
      `Durchschlag ${spalte}: alle ${min === max ? `−${min}` : `−${min} bis −${max}`}`,
    durchschlagGegen: (spalte: string, min: number, max: number) =>
      `Durchschlag ${spalte}, Gegenzeiger: alle ${min === max ? `−${min}` : `−${min} bis −${max}`}`,
    glocke: (reihe: number, treffer: string) => `Glocke, Reihe ${reihe}: ${treffer}`,
    funken: (treffer: string) => `Funken: ${treffer}`,
    kuckuck: (gang: string, treffer: string) => `Kuckuck am Gang ${gang}: ${treffer}`,
    kuckuckLeer: (gang: string) => `Kuckuck am Gang ${gang}: niemand da, er geht wieder hinein`,
    heilung: (heiler: string, name: string, n: number) => `${heiler} heilt ${name} +${n}`,
    /** Die Ursache trägt oft schon eine Klammer («Zeiger (Spalte G)»), darum mit Doppelpunkt */
    gefallen: (name: string, ursache: string) => `${name} fällt: ${ursache}`,
    angriff: (summe: number) => `Die Gilde trifft Zenit: −${summe}`,
    mittag: 'Es schlägt zwölf!',
    /** Zenit ist betäubt: sein Zug, das Pendel, fällt aus */
    aussetzen: (grund: string, wer: string | null) =>
      (wer ? `Zenit setzt aus (${grund} von ${wer}): kein Pendel` : `Zenit setzt aus (${grund}): kein Pendel`),
    ueberspringen: 'Zum Ergebnis',
    schneller: 'Schneller',
    probelauf: 'PROBELAUF · ZÄHLT NICHT',
    ernstkampf: 'ERNSTKAMPF',
    /** Ein Treffer in der Laufzeile; 0: ausgewichen, abgeschirmt oder gedeckt */
    treffer: (name: string, wert: number) => (wert > 0 ? `${name} −${wert}` : `${name} unversehrt`),
    start: 'Die Gilde steigt die Leiter hinauf …',
    pause: 'Pause',
    weiter: 'Weiter',
    tempo: (n: number) => `${n}×`,
    schliessen: 'Schliessen',
    dialog: 'Wiedergabe des Kampfs gegen Zenit',
  },

  /** Gegenstand zum ersten Sieg */
  unruh: {
    name: 'Die Unruh',
    text: 'Zum ersten Sieg: Was Zenit am Laufen hielt, weil es nie stillhielt. Er läuft jetzt ohne, und zwar gar nicht.',
  },
};

/**
 * Was je Stufe anders heisst und klingt. Stufe I verweist nur auf die Texte oben (dort ändert sich nichts), Stufe II
 * hat eigene. Alles andere (Liste, Ort, Laufzeile, Bildschirm) teilen sich die Stufen.
 */
export interface StufenTexte {
  /** «I», «II» */
  stufe: string;
  /** «Über dem Tag», «Die dreizehnte Stunde» */
  name: string;
  /** Kopf des Bildschirms */
  titel: string;
  einleitung: string;
  schluss: string;
  montagVorSieg: string;
  montagNachSieg: string;
  /** Kurz, solange die Stufe zu ist (Kartenzeile, Grund am Knopf) */
  zu: string;
  /** Lang, solange die Stufe zu ist (Bildschirm) */
  nochZu: string;
  /** Kartenzeile nach dem ersten Sieg, solange die Woche noch nicht besiegt ist */
  aufgezogen: string;
  /** Beschriftung der Uhr (vor dem Sieg dieser Woche, danach) */
  uhr: { vor: string; auf: string };
  regelBlatt: string[];
  /** Alrunas Liste: wie viele hinaufgehen */
  zahl: (n: number, max: number) => string;
  ansage: {
    vier: string;
    viele: (n: number) => string;
    zwoelf: string;
    vorZwoelf: string;
    niederlageSpaet: (runde: number) => string;
    niederlageFrueh: (runde: number) => string;
  };
  /** Überschrift des Ergebnisses beim Sieg */
  sieg: string;
  keineTruheHalb: string;
  halbSchonGeholt: string;
  nachWochensieg: string;
  halbInhalt: string;
  siegInhalt: string;
  ersterZeile: string;
  ersterInhalt: string;
  /** Truhe zum ersten Sieg */
  erster: { name: string; text: string };
}

const T = RAID_TEXTE;

export const STUFEN_TEXTE: Record<string, StufenTexte> = {
  zenit: {
    stufe: 'I',
    name: ZENIT.name,
    titel: T.bildschirm.titel,
    einleitung: T.einleitung,
    schluss: T.schluss,
    montagVorSieg: T.montagVorSieg,
    montagNachSieg: T.montagNachSieg,
    zu: T.karte.zu,
    nochZu: T.bildschirm.nochZu,
    aufgezogen: T.karte.aufgezogen,
    uhr: T.bildschirm.uhr,
    regelBlatt: T.regelBlatt,
    zahl: T.liste.zahl,
    ansage: {
      vier: T.ansage.vier, viele: T.ansage.viele, zwoelf: T.ansage.zwoelf, vorZwoelf: T.ansage.vorZwoelf,
      niederlageSpaet: T.ansage.niederlageSpaet, niederlageFrueh: T.ansage.niederlageFrueh,
    },
    sieg: T.ergebnis.sieg,
    keineTruheHalb: T.ergebnis.keineTruheHalb,
    halbSchonGeholt: T.ergebnis.halbSchonGeholt,
    nachWochensieg: T.bildschirm.nachWochensieg,
    halbInhalt: T.bildschirm.halbInhalt,
    siegInhalt: T.bildschirm.siegInhalt,
    ersterZeile: T.bildschirm.unruhZeile,
    ersterInhalt: T.bildschirm.unruhInhalt,
    erster: T.unruh,
  },

  dreizehn: {
    stufe: 'II',
    name: DREIZEHN.name,
    titel: 'ZENIT, AUFGEZOGEN',
    einleitung:
      'Zenit hat sich wieder aufgezogen, mit einer Ersatz-Unruh, und seither hat er zwei Zeiger. Der zweite läuft '
      + 'rückwärts, von der letzten Spalte zur ersten, und wo sich die beiden treffen, schlägt es dreizehn. Jorinde hat '
      + 'mitgezählt: dreimal am Tag. Alruna sagt, das seien zweimal zu oft. Die Ersatz-Unruh ist grösser als die alte, und '
      + 'der Deckel geht nicht mehr ganz zu; Jorinde sagt, man komme jetzt leichter hinein, es sei nur mehr drin. Das Feld '
      + 'ist breiter geworden, drei Trupps statt zwei, und Alruna besteht darauf, dass jeder seinen eigenen Schild und '
      + 'seinen eigenen Salbentopf bekommt. Orm sagt, er habe die Ersatz-Unruh nie gesehen. Gefragt hat ihn niemand. Ich '
      + 'habe im Gildenhaus noch einmal die Hocker gezählt, diesmal mit den Lehrlingen. Es reicht knapp.',
    schluss:
      'Zenit steht still, nicht auf zwölf und nicht auf dreizehn, sondern dazwischen, wo es keine Stunde gibt. Jorinde hat '
      + 'die Ersatz-Unruh mit dem Taschenmesser herausgedreht, und Alruna hat einen Zettel daran gebunden: «Nicht '
      + 'zurückgeben.» Orm sagt, er habe sie nie gebracht, und sagt es ein wenig zu oft. In der Wachstube reichen die '
      + 'Hocker nicht mehr; Jorinde hat Bänke bestellt. Alruna hat eine neue Seite angefangen, und der erste Punkt darauf '
      + 'lautet «Montag». Ich habe ihn aufgeschrieben, diesmal mit Tinte.',
    montagVorSieg: 'Montag. Drei neue Ernstkämpfe auf Stufe II. Der Gegenzeiger hat die alten rückwärts gezählt und kam auf null.',
    montagNachSieg: 'Montag. Zenit hat sich wieder aufgezogen, mit beiden Zeigern. Orm sagt, er habe keine Ersatz-Unruh mehr. '
      + 'Gefragt hat ihn wieder niemand.',
    zu: 'Erst Zenit einmal anhalten',
    nochZu: 'Erst Zenit auf Stufe I einmal anhalten. Bis dahin hat er nur einen Zeiger, und Alruna findet, einer reiche '
      + 'zum Üben.',
    aufgezogen: 'Zenit hat beide Zeiger wieder',
    uhr: { vor: 'Zenit, aufgezogen, kurz vor dreizehn', auf: 'Zenit, aufgezogen, angehalten' },
    regelBlatt: [
      'Pendel: jede Runde einen Trupp weiter, links, Mitte, rechts. Es trifft alle in der vordersten besetzten Reihe des '
        + 'Trupps. Spott hilft nicht: Zenit zielt nicht, Zenit schwingt.',
      'Zeiger: jede Runde eine Spalte weiter, A bis I und wieder A. Seine Last teilt sich auf alle in der Spalte. Ist die '
        + 'Spalte leer, schlägt er durch, auf alle.',
      'Gegenzeiger: rückwärts, I bis A und wieder I, sonst wie der Zeiger. In Runde 5, 14 und 23 stehen beide auf Spalte E. '
        + 'Dann schlägt es dreizehn, und E trägt beide, zuerst den Zeiger, dann den Gegenzeiger.',
      'Glocke: alle vier Runden, auf jeden in der vollsten Reihe. Bei Gleichstand die hintere.',
      'Funken: alle drei Runden, auf den, der bisher am meisten Schaden gemacht hat, und auf seine Nachbarn im Trupp: oben, '
        + 'unten, links, rechts. Über die Gänge springen sie nicht.',
      'Mittag: Ab Runde 12 schlägt alles anderthalbmal so hart. Mitternacht: Nach Runde 24 ist der Tag um.',
      'Trupps: Links sind die Spalten A bis C, Mitte D bis F, Rechts G bis I. Lieder, Segen, Schilde und Heilung wirken nur '
        + 'im eigenen Trupp.',
      'Hier oben heilen Kleriker, Druiden und Paladine mitten im Kampf: Steht im eigenen Trupp jemand unter neun Zehnteln, '
        + 'heilen sie den Schwächsten statt anzugreifen und warten dann ihre Abklingzeit.',
      'Zehn bis fünfzehn Helden. Stufe II hat ihre eigene Woche: drei freie Ernstkämpfe, danach je zehn Tagstein, und ihre '
        + 'eigenen zwei Truhen.',
      'Ein Ernstkampf wird beim Klick gerechnet und gebucht. Die Wiedergabe zeigt nur, was geschah.',
    ],
    zahl: (n: number, max: number) => {
      if (n >= max) return 'Fünfzehn gehen hinauf. Für so viele hatte Alruna nie eine Liste. Sie schreibt gerade eine.';
      if (n >= 10) return `${n} gehen hinauf. Drei Trupps, zwei Zeiger: Jeder mehr ist einer, der mitträgt.`;
      return 'Mindestens zehn. Drei Trupps wollen gefüllt sein, und der Gegenzeiger zählt nach, rückwärts.';
    },
    ansage: {
      vier: 'Vier gehen hinauf, für drei Trupps. Alruna schlägt die erste Seite auf und sagt, die kenne sie schon.',
      viele: (n: number) => `${n} gehen hinauf, auf drei Trupps. Alruna zählt mit, Jorinde zählt die Hocker.`,
      zwoelf: 'Zenit fiel, als es zwölf schlug. Bis dreizehn hat er es nicht mehr geschafft.',
      vorZwoelf: 'Zenit fiel vor zwölf. Bis dreizehn hat er es nicht mehr geschafft.',
      niederlageSpaet: (runde: number) => `Ihr kamt bis Runde ${runde}. Der Gegenzeiger hat rückwärts mitgezählt und kam `
        + 'auf dieselbe Zahl. Alruna schreibt beide auf.',
      niederlageFrueh: (runde: number) => `Ihr kamt bis Runde ${runde}. Alruna sagt nichts und schreibt sehr ordentlich, `
        + 'auf eine neue Seite.',
    },
    sieg: 'ES SCHLÄGT NICHT DREIZEHN',
    keineTruheHalb: 'Unter der Hälfte öffnet sich «Was der Gegenzeiger verlor». Diesmal blieb sie zu.',
    halbSchonGeholt: '«Was der Gegenzeiger verlor» ist diese Woche schon geholt. Beim Sieg wartet noch die dreizehnte Truhe.',
    nachWochensieg: 'Die dreizehnte Truhe ist diese Woche geleert. Zenit zieht sich am Montag wieder auf, mit beiden Zeigern. '
      + 'Ernstkämpfe zählen weiter für Erfolge und Erfahrung.',
    halbInhalt: 'Set-Teil, Gold, Tagstein',
    siegInhalt: 'Beute von Alruna und Orm, je sechsmal, Set-Teil, Tagstein',
    ersterZeile: 'Erster Sieg: Ersatz-Unruh',
    ersterInhalt: 'Schmuck, Stufe 12, nur einmal',
    erster: {
      name: 'Die Ersatz-Unruh',
      text: 'Zum ersten Sieg auf Stufe II: die Unruh, die jemand Zenit gebracht hat. Jorinde hat sie herausgedreht, Alruna '
        + 'hat «Nicht zurückgeben.» daran gebunden.',
    },
  },

  kuckuck: {
    stufe: 'III',
    name: KUCKUCK.name,
    titel: 'ZENIT, MIT KUCKUCK',
    einleitung:
      'Zenit stand still, zwischen zwölf und dreizehn, bis am Montag jemand ein Ei in sein Gehäuse gelegt hat. Seither '
      + 'geht über jedem Gang eine kleine Tür auf, und ein Kuckuck schaut heraus. Er ruft nicht. Er schaut, wer am Gang am '
      + 'kleinsten ist, und pickt. Alruna sagt, so machen es Kuckucke: Wer im Nest am wenigsten hat, fliegt zuerst hinaus. '
      + 'Das Feld ist wieder breiter geworden, vier Trupps auf zwölf Spalten, und die beiden Zeiger treffen sich darauf nie '
      + 'mehr. Jorinde findet das schade, sie hatte sich an dreizehn gewöhnt. Orm sagt, er habe kein Ei gelegt. Gefragt hat '
      + 'ihn diesmal Jorinde. Ich habe die Bänke in der Wachstube gezählt, mit allen Lehrlingen: zwanzig. Es reicht genau.',
    schluss:
      'Der Kuckuck ist still. Er sitzt in seiner Tür und schaut niemanden mehr an, und Zenit steht wieder zwischen zwölf '
      + 'und dreizehn, diesmal mit offenem Deckel. Jorinde hat die Tür mit Draht zugebunden, Alruna hat einen Zettel daran '
      + 'gehängt: «Nicht füttern.» Orm hat beim Aufräumen geholfen, ungefragt, und hatte dabei Federn am Ärmel. Gefragt hat '
      + 'ihn niemand. Ich habe die Federn trotzdem aufgeschrieben.',
    montagVorSieg: 'Montag. Drei neue Ernstkämpfe auf Stufe III. Der Kuckuck hat die alten aus dem Nest geworfen.',
    montagNachSieg: 'Montag. Der Draht ist ab, die Tür ist auf, der Kuckuck schaut wieder. Orm sagt, er habe keinen Draht '
      + 'gebraucht. Gefragt hat ihn diesmal Alruna.',
    zu: 'Erst Zenit auf Stufe II anhalten',
    nochZu: 'Erst Zenit auf Stufe II anhalten. Solange er zwei Zeiger hat, legt ihm niemand ein Ei hinein, sagt Alruna, '
      + 'und sie klingt dabei nicht ganz sicher.',
    aufgezogen: 'Der Kuckuck ist wieder da',
    uhr: { vor: 'Zenit mit Kuckuck, gleich geht die Tür auf', auf: 'Zenit mit Kuckuck, still' },
    regelBlatt: [
      'Pendel: jede Runde einen Trupp weiter, links, halblinks, halbrechts, rechts. Es trifft alle in der vordersten '
        + 'besetzten Reihe des Trupps. Spott hilft nicht: Zenit zielt nicht, Zenit schwingt.',
      'Zeiger: jede Runde eine Spalte weiter, A bis L und wieder A. Seine Last teilt sich auf alle in der Spalte. Ist die '
        + 'Spalte leer, schlägt er durch, auf alle.',
      'Gegenzeiger: rückwärts, L bis A und wieder L, sonst wie der Zeiger. Auf zwölf Spalten treffen sich die beiden nie, '
        + 'dreizehn schlägt es hier nicht.',
      'Kuckuck: jede Runde über einem Gang, reihum links, Mitte, rechts. Er pickt den, der in den zwei Spalten am Gang '
        + '(C und D, F und G, I und J) die wenigsten Leben hat, etwas mehr als halb so hart wie das Pendel. Ausweichen, '
        + 'Schutz und Deckung wirken. Steht am Gang niemand, geht er wieder hinein.',
      'Glocke: alle vier Runden, auf jeden in der vollsten Reihe. Bei Gleichstand die hintere.',
      'Funken: alle drei Runden, auf den, der bisher am meisten Schaden gemacht hat, und auf seine Nachbarn im Trupp: oben, '
        + 'unten, links, rechts. Über die Gänge springen sie nicht.',
      'Mittag: Ab Runde 12 schlägt alles anderthalbmal so hart, auch der Kuckuck. Mitternacht: Nach Runde 24 ist der Tag um.',
      'Trupps: Links sind die Spalten A bis C, Halblinks D bis F, Halbrechts G bis I, Rechts J bis L. Lieder, Segen, '
        + 'Schilde und Heilung wirken nur im eigenen Trupp.',
      'Hier oben heilen Kleriker, Druiden und Paladine mitten im Kampf: Steht im eigenen Trupp jemand unter neun Zehnteln, '
        + 'heilen sie den Schwächsten statt anzugreifen und warten dann ihre Abklingzeit.',
      'Fünfzehn bis zwanzig Helden. Stufe III hat ihre eigene Woche: drei freie Ernstkämpfe, danach je zehn Tagstein, und '
        + 'ihre eigenen zwei Truhen.',
      'Ein Ernstkampf wird beim Klick gerechnet und gebucht. Die Wiedergabe zeigt nur, was geschah.',
    ],
    zahl: (n: number, max: number) => {
      if (n >= max) return 'Zwanzig gehen hinauf. Alruna hat die Liste auf zwei Seiten geschrieben, Jorinde hat die Bänke '
        + 'gezählt. Es reicht genau.';
      if (n >= 15) return `${n} gehen hinauf. Vier Trupps, drei Gänge: Wer am Gang steht, sollte nicht der Kleinste sein.`;
      return 'Mindestens fünfzehn. Vier Trupps wollen gefüllt sein, und der Kuckuck sucht sich an jedem Gang den Kleinsten.';
    },
    ansage: {
      vier: 'Vier gehen hinauf, einer je Trupp. Alruna schlägt die erste Seite auf, der Kuckuck schaut schon heraus.',
      viele: (n: number) => `${n} gehen hinauf, auf vier Trupps. Alruna zählt mit, der Kuckuck auch.`,
      zwoelf: 'Zenit fiel, als es zwölf schlug. Der Kuckuck ist vor Schreck in seiner Tür sitzen geblieben.',
      vorZwoelf: 'Zenit fiel vor zwölf. Der Kuckuck ist in seiner Tür sitzen geblieben und schaut beleidigt.',
      niederlageSpaet: (runde: number) => `Ihr kamt bis Runde ${runde}. Der Kuckuck hat am Schluss noch einmal `
        + 'herausgeschaut. Alruna schreibt auf, wen er gepickt hat.',
      niederlageFrueh: (runde: number) => `Ihr kamt bis Runde ${runde}. Alruna sagt nichts und malt neben die Zahl einen `
        + 'kleinen Vogel.',
    },
    sieg: 'DER KUCKUCK SCHWEIGT',
    keineTruheHalb: 'Unter der Hälfte öffnet sich «Was aus dem Nest fiel». Diesmal blieb sie zu.',
    halbSchonGeholt: '«Was aus dem Nest fiel» ist diese Woche schon geholt. Beim Sieg wartet noch das Nest.',
    nachWochensieg: 'Das Nest ist diese Woche geleert. Am Montag geht die Tür wieder auf. Ernstkämpfe zählen weiter für '
      + 'die Erfahrung.',
    halbInhalt: 'Set-Teil, Gold, Tagstein',
    siegInhalt: 'Beute von Alruna und Orm, je achtmal, Set-Teil, Tagstein',
    ersterZeile: 'Erster Sieg: das Kuckucksei',
    ersterInhalt: 'Schmuck, Stufe 12, nur einmal',
    erster: {
      name: 'Das Kuckucksei',
      text: 'Zum ersten Sieg auf Stufe III: das Ei, das jemand in Zenit gelegt hat. Jorinde hat es aufgeklopft. Drin war '
        + 'kein Küken, sondern eine Unruh, und Alruna sagt, das erkläre einiges.',
    },
  },
};

/** 1 für Stufe I, 2 für Stufe II, 3 für Stufe III (unbekannt: 1); Zähler raid2_…, raid3_… (Raid.ernstkampf) */
export function stufenNummer(def: RaidDef): number {
  const i = RAID_STUFEN.findIndex(d => d.id === def.id);
  return i >= 0 ? i + 1 : 1;
}

/** Die Texte einer Stufe (unbekannt: die von Stufe I) */
export function stufenTexte(def: RaidDef): StufenTexte {
  return STUFEN_TEXTE[def.id] ?? STUFEN_TEXTE.zenit;
}
