// ─── Magic City – Auftragsbrett und Saal der Gilde ──────────────
// Im Gildenhaus hängt ein Brett mit drei Zetteln am Tag (systems/Auftragsbrett.ts):
// Leute aus der Stadt bitten die Gilde um etwas, Ottokar schreibt es ab. Dazu
// kommt die Kette «Der Saal der Gilde»: ein Kapitel je Boss, von unten nach oben
// auf der Dungeon-Karte, jedes bringt ein Prunkstück in den Trophäensaal.
// Platzhalter in den Texten: {wo} «im Vulkankern», {wen} «den Vulkankern»,
// {set} Name des Sets. Anleitung: docs/AUFTRAGSBRETT.md.
// ────────────────────────────────────────────────────────────────

import type { AuftragsArt } from '../models/AuftragsbrettStand';

export interface Auftraggeber {
  name: string;
  zeichen: string;
}

export const AUFTRAGGEBER: Record<string, Auftraggeber> = {
  hauptmann: { name: 'Der Hauptmann der Stadtwache', zeichen: '🛡️' },
  jorinde: { name: 'Jorinde', zeichen: '⛏️' },
  haendler: { name: 'Der Händler', zeichen: '⚖️' },
  baeckerin: { name: 'Die Bäckerin', zeichen: '🥖' },
  glaser: { name: 'Der Glaser', zeichen: '🔎' },
  ottokar: { name: 'Ottokar, der Stadtschreiber', zeichen: '✒️' },
};

export interface AuftragsVorlage {
  id: string;
  art: AuftragsArt;
  /** Schlüssel in AUFTRAGGEBER */
  von: string;
  titel: string;
  text: string;
  /** Dungeons, zu denen der Text nicht passt (FERNE_DUNGEONS) */
  nichtIn?: string[];
}

/** Unter Wasser, in der Glut und über den Wolken: Dort zieht keine Karawane durch, und dort gräbt niemand */
export const FERNE_DUNGEONS = [
  'ocean_depths', 'ocean_abyss', 'volcano_core', 'magma_caverns', 'drachenhort', 'himmelsarchiv', 'sternenschmiede', 'sternenschlund',
  'mondhof', 'morgentor',
];

/** Die Zettel für Dungeons; Lieferungen stehen bei ihrer Ware (LIEFER_WAREN) */
export const AUFTRAGS_VORLAGEN: AuftragsVorlage[] = [
  {
    id: 'sieg_hauptmann', art: 'sieg', von: 'hauptmann', titel: 'Ruhe schaffen',
    text: 'Aus der Gegend kommen wieder Geräusche, die niemand hören will. Der Hauptmann bittet die Gilde, {wen} '
      + 'zu bezwingen, bevor die Geräusche näher kommen. Er hat die Bitte in Grossbuchstaben geschrieben, er meint es also ernst.',
  },
  {
    id: 'sieg_jorinde', art: 'sieg', von: 'jorinde', titel: 'Ein Loch in der Karte',
    text: 'Jorinde hat in einer alten Karte ein Loch gefunden, {wo}, und will hineinschauen. Sie geht aber erst, '
      + 'wenn vorher jemand aufgeräumt hat. Es ist das erste Mal, dass Jorinde auf jemanden wartet. Ich habe es ins Protokoll aufgenommen.',
  },
  {
    id: 'sieg_haendler', art: 'sieg', von: 'haendler', titel: 'Ein freier Weg', nichtIn: FERNE_DUNGEONS,
    text: 'Am Stadttor wartet eine Karawane, und ihr Weg führt durch {wen}. Der Händler zahlt gut für einen Weg ohne Zähne. '
      + 'Freie Wege, sagt er, seien das Einzige, was er nicht selbst verkaufen könne.',
  },
  {
    id: 'makellos_baeckerin', art: 'makellos', von: 'baeckerin', titel: 'Kuchen für alle',
    text: 'Die Bäckerin backt jedem, der heil zurückkommt, einen Kuchen. Für alle oder für keinen, sagt sie, '
      + 'halbe Kuchen backt sie nicht. Bezwingt also {wen}, und bringt alle wieder mit.',
  },
  {
    id: 'makellos_hauptmann', art: 'makellos', von: 'hauptmann', titel: 'Ein Vorbild für die Rekruten',
    text: 'Die neuen Rekruten der Stadtwache sollen sehen, wie man es richtig macht. Der Hauptmann will, dass die Gilde '
      + '{wen} bezwingt, ohne dass einer fällt. Die Rekruten hören sich den Bericht an und führen eine Strichliste.',
  },
  {
    id: 'set_glaser', art: 'set', von: 'glaser', titel: 'Ein Muster für das Fenster',
    text: 'Der Glaser setzt ein neues Fenster in die Halle des Gildenhauses und will ein Teil aus dem Set «{set}» '
      + 'als Vorlage. Er fasst es nicht an, er schaut nur. Die Teile tragen die, die {wo} hausen.',
  },
  {
    id: 'set_ottokar', art: 'set', von: 'ottokar', titel: 'Eine Zeichnung für das Archiv',
    text: 'Im Archiv fehlt mir eine Zeichnung aus dem Set «{set}». Bringt ein Teil davon heim, ich zeichne es an '
      + 'einem Abend ab, und es bleibt eures. Für die Gilde schreibe ich, für das Archiv zeichne ich.',
  },
  {
    id: 'jagd_hauptmann', art: 'jagd', von: 'hauptmann', titel: 'Die Liste der Wache',
    text: 'Die Stadtwache führt eine Liste, wer zuletzt Ärger gemacht hat. Ganz oben steht seit Wochen dieselbe Sorte, '
      + 'und sie haust {wo}. Der Hauptmann möchte, dass die Liste kürzer wird. Wie viel kürzer, steht unten.',
  },
  {
    id: 'jagd_jorinde', art: 'jagd', von: 'jorinde', titel: 'Ruhe zum Graben', nichtIn: FERNE_DUNGEONS,
    text: 'Jorinde will {wo} graben, aber beim letzten Versuch kam sie nicht weit: Eine ganze Horde hat sie bis vor die Stadt gejagt. '
      + 'Sie bittet die Gilde, die Horde kleiner zu machen. Wie klein, hat sie genau ausgerechnet.',
  },
  {
    id: 'jagd_haendler', art: 'jagd', von: 'haendler', titel: 'Weniger Zähne am Weg', nichtIn: FERNE_DUNGEONS,
    text: 'Die Fuhrleute meiden {wen}, seit dort zu viele unterwegs sind, die nicht bezahlen, sondern beissen. '
      + 'Der Händler zahlt, wenn es weniger werden, und hat aufgeschrieben, wie viele weniger.',
  },
  {
    id: 'jagd_ottokar', art: 'jagd', von: 'ottokar', titel: 'Eine Zahl für die Chronik',
    text: 'In meiner Chronik steht, was {wo} haust, aber nicht, wie viel davon übrig bleibt, wenn die Gilde dort war. '
      + 'Besiegt so viele, wie unten steht, dann schreibe ich die Zahl hin. Eine Chronik ohne Zahlen ist ein Gerücht.',
  },
];

export interface LieferWare {
  itemId: string;
  menge: number;
  von: string;
  titel: string;
  text: string;
}

/**
 * Waren aus den Werkstätten. Am Brett hängt nur eine Ware, die die Stadt herstellen kann
 * (die Werkstatt steht und ihre Zutaten kommen), oder die schon im Lager liegt. Ihre Zutaten
 * gibt es auch am Markt; daran hängt ihr Gold (LIEFER_AUFSCHLAG, tests/auftragsbrett.test.ts).
 */
export const LIEFER_WAREN: LieferWare[] = [
  {
    itemId: 'healing_potion', menge: 3, von: 'hauptmann', titel: 'Tränke für die Nachtwache',
    text: 'Die Nachtwache will Heiltränke im Wachhaus haben, nicht weil etwas passiert, sondern damit nichts passiert. '
      + 'Gebt dem Kräutergarten den Auftrag, die Kräuter zieht er selbst.',
  },
  {
    itemId: 'power_bread', menge: 3, von: 'jorinde', titel: 'Proviant für die Grabung',
    text: 'Jorinde gräbt eine Woche lang unter dem Stadttor. Normales Brot reicht ihr nur bis Mittag, sagt sie, '
      + 'sie braucht Kraft-Brot. Die Bäckerei backt es, wenn ihr es bestellt.',
  },
  {
    itemId: 'iron_sword', menge: 2, von: 'hauptmann', titel: 'Schwerter für die Rekruten',
    text: 'Die Stadtwache hat neue Leute und alte Schwerter, und die alten Schwerter sind aus Holz. '
      + 'Die Schmiede kann helfen, wenn die Gilde sie beauftragt.',
  },
  {
    itemId: 'iron_shield', menge: 2, von: 'glaser', titel: 'Schilde vor die Fenster',
    text: 'Der Glaser hat neue Fenster ins Gildenhaus gesetzt und will sie schützen, bevor der nächste Sturm kommt. '
      + 'Zwei Eisenschilde, sagt er. Mehr Fenster hat er noch nicht.',
  },
  {
    itemId: 'leather_armor', menge: 2, von: 'haendler', titel: 'Rüstung für die Fuhrleute',
    text: 'Der Händler schickt eine Karawane in die Hauptstadt und will, dass die Fuhrleute heil ankommen. '
      + 'Lederrüstungen, sagt er, halten mehr aus als Fuhrleute.',
  },
];

/** Siegel je erledigtem Zettel */
export const SIEGEL_JE_ART: Record<AuftragsArt, number> = {
  sieg: 2, jagd: 2, lieferung: 2, makellos: 3, set: 3,
};

/** Alle Zettel eines Tages erledigt */
export const TAGESBONUS_SIEGEL = 3;

/** Zettel am Tag; einer davon darf kostenlos getauscht werden */
export const ZETTEL_JE_TAG = 3;
export const TAUSCH_JE_TAG = 1;

/** Gold eines Zettels: dieser Anteil vom Gold eines Laufs im Dungeon (Lieferung: LIEFER_AUFSCHLAG) */
export const GOLD_ANTEIL = 0.6;

/**
 * Gold einer Lieferung: das Dreifache dessen, was ihre Zutaten auf dem billigsten Weg am Markt kosten
 * (marktKosten in systems/Handel.ts), auf jeder Ebene gleich. Wer die Zutaten kauft, behält höchstens
 * zwei Drittel davon, in ganzen Bündeln oft weniger; was die Stadt selbst macht, bringt das Ganze.
 * Vorher 15 Gold je Stück mal Ebene: bis 360 Gold für Kräuter, die am Markt 15 kosten (docs/AUFTRAGSBRETT.md).
 */
export const LIEFER_AUFSCHLAG = 3;

// ── Siegel einlösen ──

export type EinloeseArt = 'setteil' | 'material' | 'splitter';

export interface EinloeseAngebot {
  art: EinloeseArt;
  titel: string;
  text: string;
}

export const EINLOESE_ANGEBOTE: EinloeseAngebot[] = [
  {
    art: 'setteil', titel: 'Ein Set-Teil nach Wahl',
    text: 'Aus jedem Dungeon, den die Gilde bezwungen hat. Der Händler kennt jemanden, der jemanden kennt.',
  },
  {
    art: 'material', titel: 'Material für die Schmiede',
    text: 'So viel, wie ein Sieg im höchsten bezwungenen Dungeon seines Gebiets bringt.',
  },
  {
    art: 'splitter', titel: 'Kristallsplitter',
    text: 'Für die Schmiede ab +3 und für die Werkstätten. Jorinde gräbt sie aus, wenn sie ohnehin gräbt.',
  },
];

/** Preis eines Set-Teils in Siegeln, nach der Ebene seines Dungeons */
export function setTeilPreis(ebene: number): number {
  return 4 + 2 * Math.ceil(Math.max(1, ebene) / 2);
}

/** Material: so viel, wie ein Sieg bringt. Ein Set-Teil zu kaufen und einzuschmelzen ist nie billiger. */
export const MATERIAL_PREIS = 3;
export const SPLITTER_PREIS = 2;
export const SPLITTER_MENGE = 3;

// ── Die Kette: Der Saal der Gilde ──

export interface SaalKapitel {
  /** Der Boss-Dungeon */
  routeId: string;
  art: 'sieg' | 'makellos' | 'set';
  ziel: number;
  /** Was auf den Sockel kommt */
  prunkstueck: string;
  /** Das alte Messingschild vor dem Sockel */
  schild: string;
  text: string;
  /** Text, solange die Gilde den Dungeon noch nie bezwungen hat (wenn «text» schon den ersten Sieg kennt) */
  vorSieg?: string;
}

export const SAAL_EINLEITUNG = 'Hinter dem Gildenhaus liegt ein Saal, den niemand benutzt hat, solange es uns gibt. '
  + '{anzahl} leere Sockel stehen darin, vor jedem ein Messingschild mit einem Namen, und jeder Name gehört einem Ungeheuer, '
  + 'das heute noch lebt. Jorinde will wissen, wer den Saal gebaut hat. Ich will, dass die Sockel nicht leer bleiben.';

export const SAAL_SCHLUSS = 'Alle Sockel sind voll. Als das letzte Prunkstück auf seinem Sockel lag, hat Jorinde hinter dem Saal eine '
  + 'weitere Platte gefunden, ohne Namen, nur mit einem Satz: «Für die Nächsten. Macht es besser als wir.» Die Schrift ist '
  + 'dieselbe wie auf dem Schild in der Asche, mit dem diese Stadt angefangen hat. Ich habe die Platte geputzt und aufgestellt. Daneben ist noch Platz.';

/** Siegel für das letzte Prunkstück, zusätzlich zur Belohnung des Kapitels */
export const SAAL_SCHLUSS_SIEGEL = 15;

/** Ein Kapitel je Boss; die Reihenfolge der Kette kommt von der Dungeon-Karte (von unten nach oben) */
export const SAAL_KAPITEL: SaalKapitel[] = [
  {
    routeId: 'forest_medium', art: 'sieg', ziel: 2, prunkstueck: 'Ein Zweig des Uralten',
    schild: 'Der Uralte. Er stand schon, als wir kamen.',
    text: 'Das erste Schild meint den Uralten Treant im Tiefwald, da sind Jorinde und ich uns einig. Beim ersten Besuch '
      + 'gibt er keinen Zweig her. Beim zweiten, sagen die Holzfäller, lässt er einen fallen, wie einen Gruss unter alten Bekannten.',
  },
  {
    routeId: 'cave_deep', art: 'makellos', ziel: 1, prunkstueck: 'Ein Splitter der Golemfaust',
    schild: 'Der Steinerne. Er brummt, solange einer zuhört.',
    text: 'Das Herz des Kristallgolems brummt längst auf unserem Dorfplatz, auf den Sockel kommt ein Splitter seiner Faust. '
      + 'Jorinde sagt, der Splitter springt nur sauber ab, wenn dabei keiner von uns zu Boden geht. Sie hat das nicht aus einem Buch.',
    vorSieg: 'Das zweite Schild meint den Kristallgolem in der Tiefen Höhle, der so brummt wie unser Dorfplatz, nur lauter. Auf den Sockel '
      + 'kommt ein Splitter seiner Faust. Jorinde sagt, der Splitter springt nur sauber ab, wenn dabei keiner von uns zu Boden geht. '
      + 'Sie hat das nicht aus einem Buch.',
  },
  {
    routeId: 'cave_spider', art: 'set', ziel: 1, prunkstueck: 'Ein Faden aus dem Schleier der Königin',
    schild: 'Die Weberin. Was sie nicht frisst, verwebt sie.',
    text: 'Auf dem dritten Sockel liegt nur Staub, und im Staub sind Spuren von acht Beinen. Die Spinnenkönigin verwebt in '
      + 'jedes Teil ihres Sets einen Faden aus ihrem Schleier. Bringt ein Teil heim: Das Teil bleibt euch, der Faden kommt auf den Sockel.',
  },
  {
    routeId: 'ocean_depths', art: 'sieg', ziel: 2, prunkstueck: 'Ein Zahn des Leviathan',
    schild: 'Der Sänger. Er sucht, was ihm fehlt.',
    text: 'Das vierte Schild ist grün angelaufen, wie alles, was zu lange am Meer lag. Es meint den Leviathan in den Abgrundtiefen. '
      + 'Die Fischer sagen, er verliert einen Zahn erst, wenn er zweimal am selben Ort verliert. Sie kennen ihn länger als wir.',
  },
  {
    routeId: 'swamp_long', art: 'makellos', ziel: 1, prunkstueck: 'Der Kopf, der nicht nachwuchs',
    schild: 'Die Vielköpfige. Sie wächst nach, wo man sie schneidet.',
    text: 'Die Kräuterfrau sagt in Versen, einer der Hydraköpfe wachse nicht nach, wenn die Hydra fällt und sonst niemand. '
      + 'Ich habe die Verse für die Gilde in Prosa übersetzt. Ins Protokoll kommen sie trotzdem gereimt.',
  },
  {
    routeId: 'ruins_crypts', art: 'sieg', ziel: 2, prunkstueck: 'Der Schild des Wächters',
    schild: 'Der Wächter. Er bewacht, was von uns bleibt.',
    text: 'Das sechste Schild nennt keinen Namen, nur «der Wächter», und ich weiss, wen es meint: Aldric aus der Alten Krypta, '
      + 'der bei der Gründung der ersten Stadt Wache hielt. Seinen Schild gibt er nicht beim ersten Mal her. '
      + 'Wenn der Saal so alt ist wie Aldric, ist er älter als alles, was wir kennen.',
    vorSieg: 'Das sechste Schild nennt keinen Namen, nur «der Wächter». Es meint den Ritter in der Alten Krypta, der bei der Gründung '
      + 'der ersten Stadt Wache hielt und jetzt seinen Namen sucht. Seinen Schild gibt er nicht beim ersten Mal her. '
      + 'Wenn der Saal so alt ist wie dieser Ritter, ist er älter als alles, was wir kennen.',
  },
  {
    routeId: 'siege_walls', art: 'set', ziel: 1, prunkstueck: 'Das Abzeichen des Kommandanten',
    schild: 'Der Eiserne. Er verteidigt Mauern, die nicht seine sind.',
    text: 'Das siebte Schild meint den Eisernen Kommandanten an den Stadtmauern. An jedem Teil seines Rüstzeugs hängt ein '
      + 'Abzeichen der Hauptstadt. Bringt ein Teil heim: Das Abzeichen kommt auf den Sockel, eine Abschrift lege ich der Hauptstadt ins nächste Schreiben.',
  },
  {
    routeId: 'ruins_depths', art: 'makellos', ziel: 1, prunkstueck: 'Die Feder des Schattenlichs',
    schild: 'Der Schreiber. Er schreibt um, was andere schrieben.',
    text: 'Das Buch des Schattenlichs liegt verschlossen bei mir, aber seine Feder hat er behalten. Sie schreibt jeden auf, '
      + 'der vor ihm fällt, sagt Jorinde. Darum fällt diesmal keiner, und die Feder kommt auf den Sockel, weit weg von jeder Tinte.',
    vorSieg: 'Das achte Schild meint den Schattenlich in den Tiefen Ruinen, der an meiner Chronik mitschreibt, nur falsch. Seine Feder '
      + 'schreibt jeden auf, der vor ihm fällt, sagt Jorinde. Darum fällt diesmal keiner, und die Feder kommt auf den Sockel, weit weg von jeder Tinte.',
  },
  {
    routeId: 'siege_fortress', art: 'sieg', ziel: 2, prunkstueck: 'Der Torschlüssel der Festung',
    schild: 'Der Schlaflose. Er wartet auf einen Befehl, der nie kommt.',
    text: 'Die Festung gehört uns, aber ihr Wächter steht wieder auf, sobald einer das Tor schliesst. Der Torschlüssel hängt an '
      + 'seinem Gürtel. Nach dem zweiten Mal, meint Jorinde, gibt er ihn her, weil er dann versteht, dass niemand mehr kommt, um ihm Befehle zu geben.',
    vorSieg: 'Das neunte Schild meint den Festungswächter, den die Hauptstadt in die alte Festung über dem Tal gesetzt hat und der keine '
      + 'Briefe beantwortet. Der Torschlüssel hängt an seinem Gürtel. Nach dem zweiten Mal, meint Jorinde, gibt er ihn her, '
      + 'weil er dann versteht, dass niemand mehr kommt, um ihm Befehle zu geben.',
  },
  {
    routeId: 'volcano_core', art: 'set', ziel: 1, prunkstueck: 'Eine Schuppe, die nie abkühlt',
    schild: 'Der Glühende. Er schläft auf dem, was die Welt wärmt.',
    text: 'Das zehnte Schild ist warm, obwohl der Saal kalt ist. Es meint den Magma-Wyrm im Vulkankern. In jedem Teil seines '
      + 'Sets klebt eine seiner Schuppen. Bringt ein Teil heim, die Schuppe kommt auf den Sockel. Ich trage dabei Handschuhe.',
  },
  {
    routeId: 'drachenhort', art: 'sieg', ziel: 2, prunkstueck: 'Eine Münze aus dem Hort',
    schild: 'Der Zählende. Er hat alles und zählt es trotzdem.',
    text: 'Für den Sockel reicht eine einzige Münze aus Ignarax\' Hort. Er bemerkt jede fehlende Münze, sagt der Händler, '
      + 'und holt sie sich zurück, solange er nur einmal verloren hat. Nach dem zweiten Mal zählt er neu und lässt es gut sein.',
  },
  {
    routeId: 'himmelsarchiv', art: 'set', ziel: 1, prunkstueck: 'Ein Blatt aus dem Buch der Namen',
    schild: 'Der Hüter. Er hütet jeden Namen, auch unsere.',
    text: 'Aus dem Buch der Namen fehlt ein Blatt. Der Oberarchivar hat es in seinem Nachlass versteckt, zwischen den Teilen '
      + 'seines Sets, und wer ein Teil davon heimbringt, bringt das Blatt mit. Ich will wissen, wessen Namen darauf stehen.',
  },
  {
    routeId: 'sternenschmiede', art: 'sieg', ziel: 2, prunkstueck: 'Ein Funke aus Korrunds Esse',
    schild: 'Der Schmied. Er nimmt keine Aufträge an.',
    text: 'Korrunds Hammer hängt schon im Gildenhaus. Auf den Sockel gehört ein Funke aus seiner Esse, einer, der nie ausgeht. '
      + 'Korrund gibt ihn erst her, wenn man ihm zweimal gezeigt hat, dass gute Arbeit auch von unten kommen kann.',
    vorSieg: 'Das dreizehnte Schild meint Korrund, den Sternenschmied, der keine Aufträge annimmt, auch nicht für einen Sockel. Auf den '
      + 'Sockel gehört ein Funke aus seiner Esse, einer, der nie ausgeht. Korrund gibt ihn erst her, wenn man ihm zweimal gezeigt hat, '
      + 'dass gute Arbeit auch von unten kommen kann.',
  },
  {
    routeId: 'sternenschlund', art: 'sieg', ziel: 1, prunkstueck: 'Der Stern, den Nyxar nicht mehr schaffte',
    schild: 'Der Hungrige. Er frisst, was über uns leuchtet.',
    text: 'Das letzte Schild der Reihe ist das neueste, die Buchstaben glänzen noch. Wer diesen Saal gebaut hat, kannte Nyxar und war vor '
      + 'uns zwischen den Sternen. Der Stern, den wir aus dem Schlund mitgenommen haben, gehört auf diesen Sockel, aber er bleibt nur dort, wenn Nyxar noch einmal fällt.',
    vorSieg: 'Das letzte Schild der Reihe ist das neueste, die Buchstaben glänzen noch. Wer diesen Saal gebaut hat, kannte Nyxar und war vor '
      + 'uns zwischen den Sternen. Im Schlund hält Nyxar die Sterne, die er noch nicht gefressen hat, in Käfigen. Einer davon gehört auf diesen Sockel.',
  },
  {
    routeId: 'mondhof', art: 'sieg', ziel: 2, prunkstueck: 'Ein Pfandzettel mit dem Siegel des Mondvogts',
    schild: 'Der Vogt. Er nimmt, was aufsteigt, und gibt Quittungen.',
    text: 'Die zwei obersten Sockel standen von Anfang an da, nur lagen ihre Schilder unter einer Decke aus Staub, als hätte sie jemand '
      + 'für später zugedeckt. Das erste davon meint Argentis, den Mondvogt. Auf den Sockel gehört ein Pfandzettel mit seinem Siegel, '
      + 'aber er gilt im Hof nur, wenn er zweimal eingelöst wurde, sagt Argentis, und zweimal eingelöst heisst zweimal gefallen.',
    vorSieg: 'Die zwei obersten Sockel standen von Anfang an da, nur lagen ihre Schilder unter einer Decke aus Staub, als hätte sie jemand '
      + 'für später zugedeckt. Das erste davon meint den Mondvogt, der über dem Sternenschlund Zoll nimmt und noch nie etwas durchgelassen '
      + 'hat, ohne eine Quittung zu schreiben. Auf den Sockel gehört einer seiner Pfandzettel mit Siegel; er gilt erst, wenn er zweimal eingelöst ist.',
  },
  {
    routeId: 'morgentor', art: 'set', ziel: 1, prunkstueck: 'Der erste Strahl des Tages, in Messing gefasst',
    schild: 'Die Wächterin. Sie öffnet, wann sie will, und für wen sie will.',
    text: 'Das zweite der neuen Schilder meint Sunna, die Tagwächterin am Morgentor, und es ist das einzige im Saal, das nicht '
      + 'angelaufen ist; Jorinde meint, Messing laufe nicht an, wenn jeden Morgen die Sonne darauf fällt, aber hier fällt keine. '
      + 'In jedes Teil ihrer Morgengabe hat Sunna den ersten Strahl des Tages gefasst, an dem es gemacht wurde. Bringt ein Teil heim: '
      + 'Das Teil bleibt euch, der Strahl kommt auf den Sockel, und dann ist es in diesem Saal zum ersten Mal hell.',
  },
];
