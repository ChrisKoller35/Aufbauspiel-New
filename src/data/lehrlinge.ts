// ─── Magic City – Die Lehrlinge (Zweitbesetzung) ────────────────
// Je Klasse ein zweiter Held: Wer Stufe 15 erreicht, darf einen Lehrling aufnehmen
// (systems/Lehrlinge.ts). Der Lehrling hat einen eigenen Namen und Hintergrund, kämpft
// mit den Werten seiner Klasse und wählt seinen Weg selbst. Sein Bild ist das der Klasse,
// gespiegelt (ui/heldBild.ts). Anleitung: docs/AUSBILDUNG.md, Abschnitt «Lehrlinge».
// ────────────────────────────────────────────────────────────────

export interface LehrlingDef {
  /** Klasse des Lehrlings (CLASS_DEFS) */
  classId: string;
  name: string;
  /** Ein Satz für die Karte im Reiter «Anheuern» */
  kurz: string;
  /** Hintergrund im Heldenfenster, im Ton der Klassen (Absatz, dann «Motivation:») */
  hintergrund: string;
  /**
   * Sätze nach einer Lehrstunde (Expedition mit dem Meister, systems/Lehrlinge.ts), reihum; «{meister}» wird
   * zum Namen des Meisters
   */
  lehrstunde: string[];
  /** Satz, wenn er Stufe 15 erreicht und Geselle wird (Bilanz, Lehrbuch, Heldenfenster) */
  geselle: string;
}

export const LEHRLINGE: Record<string, LehrlingDef> = {
  guardian: {
    classId: 'guardian',
    name: 'Bertram',
    kurz: 'Hat den Schild zu gross gekauft, damit er hineinwächst.',
    hintergrund: 'Er hat den Guardian einmal einen Karren voller Kinder aus dem Hafenbecken ziehen sehen und trägt '
      + 'seither einen Schild, der ihm bis zur Nase reicht. Er hat ihn zu gross gekauft, damit er hineinwächst. Bis '
      + 'dahin steht er überall im Weg, und er sagt, genau das sei die Aufgabe.\n\nMotivation: Einmal so stehen bleiben '
      + 'wie sein Meister. Er übt es jeden Morgen vor der Wachstube, auch wenn niemand angreift.',
    lehrstunde: [
      '{meister} hat den ganzen Kampf nicht gezuckt. Bertram hat zweimal gezuckt, aber in die richtige Richtung.',
      'Bertram stand die ganze Zeit hinter {meister}. Er nennt das Formation.',
      '{meister} sagt, man stehe nicht im Weg, man sei der Weg. Bertram hat es sich auf den Schild geschrieben, innen.',
    ],
    geselle: 'Bertram ist in seinen Schild hineingewachsen. Er hat sich sofort einen grösseren gekauft.',
  },
  ranger: {
    classId: 'ranger',
    name: 'Wenna',
    kurz: 'Trifft alles, was sich bewegt, und vorsichtshalber auch den Rest.',
    hintergrund: 'Sie ist auf Valdris geboren, im Jahr nach der Landung, und kennt keinen anderen Wald. Die Rangerin '
      + 'hat ihr das Schiessen beigebracht und das Schweigen versucht; das Schiessen hat geklappt. Wenna trifft alles, '
      + 'was sich bewegt, und vorsichtshalber auch, was sich nicht bewegt.\n\nMotivation: Als Erste sehen, was hinter der '
      + 'nächsten Tür wartet. Notfalls durch das Schlüsselloch, mit einem Pfeil.',
    lehrstunde: [
      'Wenna hat heute nur auf Gegner geschossen. {meister} hat es zweimal nachgezählt.',
      '{meister} hat ihr gezeigt, wie man wartet. Wenna hat gewartet und dann sehr viel geschossen.',
      'In der Tür steckt noch ein Pfeil. Wenna sagt, die Tür habe angefangen.',
    ],
    geselle: 'Wenna trifft jetzt nur noch, was sie meint. Die Tür der Wachstube bleibt trotzdem verriegelt.',
  },
  cleric: {
    classId: 'cleric',
    name: 'Pirmin',
    kurz: 'Betet vor jedem Kampf, nach jedem Kampf und, wenn es knapp wird, sehr schnell.',
    hintergrund: 'Er war Ministrant in einem Tempel, den es nicht mehr gibt, und hat den Cleric gefragt, ob sein Gott '
      + 'noch Leute nimmt. Der Cleric sagte, das frage er selbst jeden Morgen. Seither fragen sie zu zweit. Pirmin betet '
      + 'vor jedem Kampf, nach jedem Kampf und, wenn es knapp wird, sehr schnell.\n\nMotivation: Niemanden verlieren, den '
      + 'er kennt. Er kennt inzwischen sehr viele Leute.',
    lehrstunde: [
      'Pirmin hat nur dreimal gebetet, einmal davon langsam. {meister} ist stolz auf ihn.',
      '{meister} hat ihm gezeigt, wann ein Gebet reicht und wann ein Verband. Pirmin nimmt seither beides.',
      'Pirmin hat nach dem Kampf alle gezählt. Alle waren noch da. Er hat zur Sicherheit noch einmal gezählt.',
    ],
    geselle: 'Pirmin kennt jetzt so viele Leute, dass er für sie in Schichten betet.',
  },
  berserker: {
    classId: 'berserker',
    name: 'Ragna',
    kurz: 'Aus drei Wirtshäusern geworfen, aus einem zweimal am selben Abend.',
    hintergrund: 'Sie wurde aus drei Wirtshäusern geworfen, aus einem zweimal am selben Abend. Der Berserker hat sie '
      + 'draussen aufgelesen und gefragt, ob sie ihre Wut nicht für etwas Nützliches brauchen wolle. Sie hat ihn dafür '
      + 'angeschrien. Dann hat sie Ja gesagt.\n\nMotivation: Lernen, wann man aufhört. Das ist das Einzige, was er ihr '
      + 'nicht beibringen kann, sagt der Berserker. Er weiss es selbst nicht.',
    lehrstunde: [
      'Ragna hat heute rechtzeitig aufgehört. Nach dem Kampf, aber rechtzeitig.',
      '{meister} hat ihr gezeigt, wie man die Wut einteilt. Ragna hat sie eingeteilt, in sehr grosse Stücke.',
      'Ragna hat nur geschrien, wenn es nützlich war. {meister} sagt, das sei fast immer gewesen.',
    ],
    geselle: 'Ragna darf wieder in zwei der drei Wirtshäuser. Sie sagt, das dritte sei es nicht wert.',
  },
  assassin: {
    classId: 'assassin',
    name: 'Nix',
    kurz: 'Niemand hat ihn eintreten sehen. Er sagt, er sei seit Dienstag da.',
    hintergrund: 'Niemand hat Nix eintreten sehen. Er sagt, er sei schon seit Dienstag da, und die Assassine sagt, das '
      + 'stimme: Sie habe ihn am Dienstag bemerkt und beschlossen, es nicht zu erwähnen. Er hat ihr dreimal den '
      + 'Geldbeutel gestohlen und zweimal zurückgelegt.\n\nMotivation: Unbemerkt bleiben und trotzdem gelobt werden. Er '
      + 'arbeitet noch daran, wie das zusammengeht.',
    lehrstunde: [
      'Nix war die ganze Zeit dabei, sagt er. {meister} hat ihn erst beim Teilen der Beute bemerkt.',
      '{meister} hat Nix einen neuen Trick gezeigt. Nix sagt, den habe er schon am Dienstag gekonnt.',
      'Nix hat zwei Gegner erledigt und einen Geldbeutel gefunden. Der Geldbeutel gehört {meister}.',
    ],
    geselle: 'Nix ist jetzt Geselle. Niemand hat die Feier bemerkt. Er sagt, sie sei sehr schön gewesen.',
  },
  paladin: {
    classId: 'paladin',
    name: 'Gerlinde',
    kurz: 'Hat einen Eid geschworen und vergessen, worauf. Hält ihn trotzdem.',
    hintergrund: 'Sie hat einen Eid geschworen, laut und feierlich, vor dem ganzen Markt, und dann vergessen, worauf. '
      + 'Sie hält ihn trotzdem, vorsichtshalber in alle Richtungen. Der Paladin sagt, mit Eiden sei es so: Man trägt sie '
      + 'am besten, ohne dauernd hinzuschauen.\n\nMotivation: Herausfinden, was sie geschworen hat. Bis dahin beschützt sie '
      + 'alles, was nicht schnell genug wegkommt.',
    lehrstunde: [
      'Gerlinde hat alle beschützt, auch eine Kiste. {meister} sagt, die Kiste sei sicher dankbar.',
      '{meister} hat sie gefragt, worauf sie geschworen hat. «Auf alles», sagt Gerlinde. «Zur Sicherheit.»',
      'Gerlinde stand vor jedem Verwundeten und vor zwei Statuen. Nur für den Fall.',
    ],
    geselle: 'Gerlinde weiss jetzt, worauf sie geschworen hat: auf die Gilde. Sie hält den Eid jetzt mit Absicht.',
  },
  bard: {
    classId: 'bard',
    name: 'Benno',
    kurz: 'Kennt vierhundert Lieder. Die meisten handeln von ihm.',
    hintergrund: 'Benno kennt vierhundert Lieder, die meisten handeln von ihm. Die Bardin schreibt die Chronik von '
      + 'Valdris; Benno schreibt seine eigene, und sie ist schon dicker. Sie hat ihm beigebracht, dass ein Lied im Kampf '
      + 'kurz sein muss. Er arbeitet an einer Fassung mit nur elf Strophen.\n\nMotivation: Einmal in ihrer Chronik '
      + 'vorkommen. Nicht als Fussnote.',
    lehrstunde: [
      'Benno hat ein Lied über die Expedition geschrieben. {meister} kommt in der dritten Strophe vor, kurz.',
      '{meister} sagt, im Kampf zählen kurze Lieder. Benno hat neun Strophen gestrichen. Es blieben elf.',
      'Benno hat {meister} besungen und danach wieder sich selbst, aber leiser.',
    ],
    geselle: 'Benno steht jetzt in der Chronik von Valdris, als Fussnote. Er hat sie vergrössert abgeschrieben.',
  },
  witch: {
    classId: 'witch',
    name: 'Mirabell',
    kurz: 'Hat ihren ersten Fluch beim Niesen gesprochen. Der Fischhändler quakt noch.',
    hintergrund: 'Ihren ersten Fluch hat sie aus Versehen gesprochen, beim Niesen, auf den Fischhändler. Er ist '
      + 'inzwischen wieder ganz Mensch, bis auf das Quaken, wenn er lacht. Die Hexe hat sie daraufhin aufgenommen, weil das '
      + 'billiger sei, als den Hafen ständig zu entfluchen.\n\nMotivation: Fluchen, wann sie will, und nur dann. Sie trägt '
      + 'seither immer ein Taschentuch.',
    lehrstunde: [
      'Mirabell hat nur absichtlich geflucht. Einmal hat sie geniest, aber ins Taschentuch.',
      '{meister} hat ihr einen neuen Fluch gezeigt. Mirabell hat ihn sofort am richtigen Gegner ausprobiert. Fast sofort.',
      'Ein Gegner quakt jetzt. {meister} sagt, das sei eigentlich ein Lob.',
    ],
    geselle: 'Mirabell flucht jetzt nur noch, wann sie will. Der Fischhändler hat ihr zur Feier einen Fisch geschenkt und dabei gequakt.',
  },
  necromancer: {
    classId: 'necromancer',
    name: 'Edgar',
    kurz: 'Sammelt Knochen, sorgfältig beschriftet und nach Grösse sortiert.',
    hintergrund: 'Edgar sammelt Knochen, wie andere Leute Muscheln sammeln: sorgfältig beschriftet, nach Grösse '
      + 'sortiert. Der Nekromant hat die Sammlung gesehen und gesagt, das sei solide Vorarbeit. Die Skelette, die Edgar '
      + 'beschwört, salutieren noch etwas schief, aber sie kommen pünktlich.\n\nMotivation: Ein eigener Kollege. Einer, '
      + 'der bleibt, wenn der Kampf vorbei ist, und beim Aufräumen hilft.',
    lehrstunde: [
      'Edgar hat nach dem Kampf aufgeräumt und drei Knochen beschriftet. {meister} hat einen davon zurückverlangt.',
      'Edgars Skelette salutieren jetzt fast gerade. {meister} hat es ihnen vorgemacht.',
      '{meister} hat ihm gezeigt, wie man Knochen nach Gegnern sortiert statt nach Grösse. Edgar ist erschüttert.',
    ],
    geselle: 'Edgar hat jetzt einen Kollegen, der nach dem Kampf bleibt und aufräumt. Er heisst Knut und ist ein Schienbein.',
  },
  druid: {
    classId: 'druid',
    name: 'Farn',
    kurz: 'Spricht mit Pflanzen. Sie antworten nur der Druidin, und das kränkt ihn.',
    hintergrund: 'Farn spricht mit Pflanzen. Die Pflanzen antworten, aber nur der Druidin, und das kränkt ihn. Sie hat '
      + 'ihn auf einem Fels gefunden, Beeren essend, genau dort, wo sie selbst einmal sass, und es als Zeichen genommen. Er '
      + 'sagt, er habe nur Hunger gehabt.\n\nMotivation: Dass ihm eine Eiche einmal zurückwinkt. Er winkt jeden Morgen '
      + 'zuerst.',
    lehrstunde: [
      'Eine Brennnessel hat Farn heute geantwortet. {meister} sagt, das sei ein Anfang.',
      '{meister} hat ihm gezeigt, wie man zuhört. Farn hat zugehört. Der Wald hat geschwiegen, aber freundlich.',
      'Farn hat eine Wurzel überredet, einen Gegner festzuhalten. Die Wurzel sagt, es sei ihre Idee gewesen.',
    ],
    geselle: 'Eine Eiche hat Farn zurückgewinkt. Es war windig, aber er zählt es.',
  },
};
