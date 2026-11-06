// ─── Magic City – Raids ganz oben über der Dungeon-Karte ─────────
// Ein Raid ist ein einziger grosser Kampf mit 4 bis 10 Helden auf einem Feld aus Reihen und Spalten, in
// Trupps geteilt. Der Boss zielt nicht auf Helden, er trifft Orte (systems/RaidKampf.ts). Kein RouteDef und
// kein EnemyDef: Sets, Saal, Monsterbuch und Klang hängen nicht daran. Regeln und Eichung: docs/RAID.md.
// ─────────────────────────────────────────────────────────────────

export interface RaidRegeln {
  /** Zeiger: Wucht = Angriff × zeiger, geteilt durch die lebenden Helden der Spalte */
  zeiger: number;
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
}

export interface TruhenDef {
  name: string;
  text: string;
  /** Festes Gold (zusätzlich zum Gold der Würfe) */
  gold?: number;
  /** Beutetabellen: je Tabelle ihr garantiertes Gold und ein Eintrag */
  wuerfeAus: string[];
  /**
   * Ein Set-Teil, das der Gilde fehlt, aus diesem Stufenbereich; zuerst aus Sets, die ein Teilnehmer zum Teil trägt.
   * `getrageneAusJederStufe`: die angefangenen Sets der Teilnehmer gehen dem Bereich vor, egal aus welcher Stufe.
   * `sonstJedeStufe`: fehlt im Bereich nichts mehr, ein fehlendes Teil jeder Stufe (sonst gibt es den Ersatz).
   */
  setTeil: { stufeVon: number; stufeBis: number; getrageneAusJederStufe: boolean; sonstJedeStufe: boolean };
  dinge: Record<string, number>;
  /** Statt des Set-Teils, wenn keins mehr fehlt */
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
  /** Lage des Knotens auf der Dungeon-Karte */
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
        wuerfeAus: ['loot_boss_alruna', 'loot_boss_orm'],
        setTeil: { stufeVon: 9, stufeBis: 12, getrageneAusJederStufe: true, sonstJedeStufe: true },
        dinge: { mat_tagstein: 10, crystal_shard: 15 },
        ersatz: { crystal_shard: 20 },
      },
    },
    ersterSiegBeute: 'die_unruh',
    freiAb: 'tagespfeiler',
    karte: { x: 390, y: -4120, radius: 72 },
  },
};

/** Der eine Raid, den es heute gibt */
export const ZENIT = RAID_DEFS.zenit;

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
/** «A» bis «F» */
export function spaltenName(spalte: number): string {
  return SPALTEN_NAMEN[spalte] ?? '?';
}
/** «Links», «Rechts» (mehr Trupps im Ausbau: «Mitte») */
export function truppName(trupp: number, truppZahl = 2): string {
  if (truppZahl === 2) return trupp === 0 ? 'Links' : 'Rechts';
  return ['Links', 'Mitte', 'Rechts', 'Aussen'][trupp] ?? `Trupp ${trupp + 1}`;
}
/** «links», «rechts» für Sätze */
export function truppKlein(trupp: number, truppZahl = 2): string {
  return truppName(trupp, truppZahl).toLowerCase();
}

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

  karte: {
    name: 'ÜBER DEM TAG',
    klein: (min: number, max: number) => `RAID · ${min} BIS ${max} HELDEN`,
    keinVersuch: 'Noch kein Versuch',
    best: (rest: number) => `Bestversuch: Zenit bei ${rest} %`,
    besiegtDieseWoche: 'Diese Woche besiegt',
    aufgezogen: 'Zenit hat sich wieder aufgezogen',
    zwoelf: 'Zenit steht auf zwölf',
    tooltip: 'Zenit, das Uhrwerk über dem Tag. Ein Kampf für bis zu zehn Helden.',
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
    zeigerOk: 'Jede Spalte ist besetzt. Der Zeiger findet überall jemanden.',
    zeigerLeer: (spalte: string, runden: number[]) =>
      `Spalte ${spalte} ist leer. Dort schlägt der Zeiger durch, auf alle: Runde ${runden.join(', ')}.`,
    zeigerEinzeln: (spalte: string, name: string) => `Spalte ${spalte} trägt nur ${name}. Fällt ${name}, steht ${spalte} leer.`,
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
    durchschlag: (spalte: string) => `Durchschlag (Spalte ${spalte} leer)`,
    glocke: (reihe: number) => `Glocke (Reihe ${reihe})`,
    funken: (name: string) => `Funken (um ${name})`,
    rest: 'Rundenende',
    mitternacht: 'Mitternacht',
  },

  /** Satz zur Hauptursache (Ergebnis und Kriegsrat) */
  hauptursache: {
    glocke: (reihe: number) => `Die meisten fielen unter der Glocke, in Reihe ${reihe}. Sie schlägt, wo am meisten los ist, `
      + 'und bei uns war dort am meisten los.',
    zeiger: (spalte: string, name: string) => `Der Zeiger drückte Spalte ${spalte}, und ${name} trug sie allein.`,
    zeigerViele: (spalte: string) => `Der Zeiger drückte Spalte ${spalte}, und dort stand zu wenig, um ihn zu tragen.`,
    durchschlag: (spalte: string) => `Spalte ${spalte} stand leer, und der Zeiger ging durch alle. Leere Spalten mag er am liebsten.`,
    pendel: (seite: string, k: number) => `Das Pendel traf die Front ${seite} ${k}-mal. Am Ende stand dort niemand mehr, `
      + 'der dafür gebaut war.',
    funken: (name: string) => `Die Funken trafen ${name} und wer daneben stand. Danach stand niemand mehr daneben.`,
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
    glocke: (reihe: number, n: number) => `Die Glocke schlägt, wo am meisten los ist. In Reihe ${reihe} standen ${n}. Sie hat `
      + 'nachgezählt.',
    funken: (name: string, nachbarn: string[]) => `Zenit merkt sich, wer ihm am meisten wehtut. ${name} hat gewonnen.`
      + (nachbarn.length > 0 ? ` ${liste(nachbarn)} standen daneben.` : ''),
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
    rundeTitel: (runde: number, spalte: string, seite: string, extra: string[]) =>
      `Runde ${runde}: Zeiger ${spalte}${seite ? `, Pendel ${seite}` : ''}${extra.length > 0 ? `, ${extra.join(', ')}` : ''}`,
    legende: {
      funken: 'Funken', glocke: 'Glocke', zeiger: 'Zeiger', pendel: 'Pendel', seitenLang: 'links / rechts', seitenKurz: 'l / r',
      mittagLang: 'ab Mittag × 1,5', mittagKurz: 'Mittag × 1,5', heilung: 'Heilung',
    },
    truppZeile: (n: number, heiler: string[]) =>
      `${n === 1 ? '1 Held' : `${n} Helden`} · ${heiler.length > 0 ? `Heiler: ${heiler.join(', ')}` : 'kein Heiler'}`,
    spalteNur: (name: string) => `nur ${name}`,
    spalteLeer: 'leer',
    spalteHelden: (n: number) => (n === 1 ? '1 Held' : `${n} Helden`),
    vorn: 'VORN',
    hinten: 'HINTEN',
    gang: 'GANG',
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
    durchschlag: (spalte: string, min: number, max: number) =>
      `Durchschlag ${spalte}: alle ${min === max ? `−${min}` : `−${min} bis −${max}`}`,
    glocke: (reihe: number, treffer: string) => `Glocke, Reihe ${reihe}: ${treffer}`,
    funken: (treffer: string) => `Funken: ${treffer}`,
    heilung: (heiler: string, name: string, n: number) => `${heiler} heilt ${name} +${n}`,
    gefallen: (name: string, ursache: string) => `${name} fällt (${ursache})`,
    angriff: (summe: number) => `Die Gilde trifft Zenit: −${summe}`,
    mittag: 'Es schlägt zwölf!',
    ueberspringen: 'Zum Ergebnis',
    schneller: 'Schneller',
    probelauf: 'PROBELAUF · ZÄHLT NICHT',
    ernstkampf: 'ERNSTKAMPF',
    treffer: (name: string, wert: number) => `${name} −${wert}`,
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
