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
  },
  ranger: {
    classId: 'ranger',
    name: 'Wenna',
    kurz: 'Trifft alles, was sich bewegt, und vorsichtshalber auch den Rest.',
    hintergrund: 'Sie ist auf Valdris geboren, im Jahr nach der Landung, und kennt keinen anderen Wald. Die Rangerin '
      + 'hat ihr das Schiessen beigebracht und das Schweigen versucht; das Schiessen hat geklappt. Wenna trifft alles, '
      + 'was sich bewegt, und vorsichtshalber auch, was sich nicht bewegt.\n\nMotivation: Als Erste sehen, was hinter der '
      + 'nächsten Tür wartet. Notfalls durch das Schlüsselloch, mit einem Pfeil.',
  },
  cleric: {
    classId: 'cleric',
    name: 'Pirmin',
    kurz: 'Betet vor jedem Kampf, nach jedem Kampf und, wenn es knapp wird, sehr schnell.',
    hintergrund: 'Er war Ministrant in einem Tempel, den es nicht mehr gibt, und hat den Cleric gefragt, ob sein Gott '
      + 'noch Leute nimmt. Der Cleric sagte, das frage er selbst jeden Morgen. Seither fragen sie zu zweit. Pirmin betet '
      + 'vor jedem Kampf, nach jedem Kampf und, wenn es knapp wird, sehr schnell.\n\nMotivation: Niemanden verlieren, den '
      + 'er kennt. Er kennt inzwischen sehr viele Leute.',
  },
  berserker: {
    classId: 'berserker',
    name: 'Ragna',
    kurz: 'Aus drei Wirtshäusern geworfen, aus einem zweimal am selben Abend.',
    hintergrund: 'Sie wurde aus drei Wirtshäusern geworfen, aus einem zweimal am selben Abend. Der Berserker hat sie '
      + 'draussen aufgelesen und gefragt, ob sie ihre Wut nicht für etwas Nützliches brauchen wolle. Sie hat ihn dafür '
      + 'angeschrien. Dann hat sie Ja gesagt.\n\nMotivation: Lernen, wann man aufhört. Das ist das Einzige, was er ihr '
      + 'nicht beibringen kann, sagt der Berserker. Er weiss es selbst nicht.',
  },
  assassin: {
    classId: 'assassin',
    name: 'Nix',
    kurz: 'Niemand hat ihn eintreten sehen. Er sagt, er sei seit Dienstag da.',
    hintergrund: 'Niemand hat Nix eintreten sehen. Er sagt, er sei schon seit Dienstag da, und die Assassine sagt, das '
      + 'stimme: Sie habe ihn am Dienstag bemerkt und beschlossen, es nicht zu erwähnen. Er hat ihr dreimal den '
      + 'Geldbeutel gestohlen und zweimal zurückgelegt.\n\nMotivation: Unbemerkt bleiben und trotzdem gelobt werden. Er '
      + 'arbeitet noch daran, wie das zusammengeht.',
  },
  paladin: {
    classId: 'paladin',
    name: 'Gerlinde',
    kurz: 'Hat einen Eid geschworen und vergessen, worauf. Hält ihn trotzdem.',
    hintergrund: 'Sie hat einen Eid geschworen, laut und feierlich, vor dem ganzen Markt, und dann vergessen, worauf. '
      + 'Sie hält ihn trotzdem, vorsichtshalber in alle Richtungen. Der Paladin sagt, mit Eiden sei es so: Man trägt sie '
      + 'am besten, ohne dauernd hinzuschauen.\n\nMotivation: Herausfinden, was sie geschworen hat. Bis dahin beschützt sie '
      + 'alles, was nicht schnell genug wegkommt.',
  },
  bard: {
    classId: 'bard',
    name: 'Benno',
    kurz: 'Kennt vierhundert Lieder. Die meisten handeln von ihm.',
    hintergrund: 'Benno kennt vierhundert Lieder, die meisten handeln von ihm. Die Bardin schreibt die Chronik von '
      + 'Valdris; Benno schreibt seine eigene, und sie ist schon dicker. Sie hat ihm beigebracht, dass ein Lied im Kampf '
      + 'kurz sein muss. Er arbeitet an einer Fassung mit nur elf Strophen.\n\nMotivation: Einmal in ihrer Chronik '
      + 'vorkommen. Nicht als Fussnote.',
  },
  witch: {
    classId: 'witch',
    name: 'Mirabell',
    kurz: 'Hat ihren ersten Fluch beim Niesen gesprochen. Der Fischhändler quakt noch.',
    hintergrund: 'Ihren ersten Fluch hat sie aus Versehen gesprochen, beim Niesen, auf den Fischhändler. Er ist '
      + 'inzwischen wieder ganz Mensch, bis auf das Quaken, wenn er lacht. Die Hexe hat sie daraufhin aufgenommen, weil das '
      + 'billiger sei, als den Hafen ständig zu entfluchen.\n\nMotivation: Fluchen, wann sie will, und nur dann. Sie trägt '
      + 'seither immer ein Taschentuch.',
  },
  necromancer: {
    classId: 'necromancer',
    name: 'Edgar',
    kurz: 'Sammelt Knochen, sorgfältig beschriftet und nach Grösse sortiert.',
    hintergrund: 'Edgar sammelt Knochen, wie andere Leute Muscheln sammeln: sorgfältig beschriftet, nach Grösse '
      + 'sortiert. Der Nekromant hat die Sammlung gesehen und gesagt, das sei solide Vorarbeit. Die Skelette, die Edgar '
      + 'beschwört, salutieren noch etwas schief, aber sie kommen pünktlich.\n\nMotivation: Ein eigener Kollege. Einer, '
      + 'der bleibt, wenn der Kampf vorbei ist, und beim Aufräumen hilft.',
  },
  druid: {
    classId: 'druid',
    name: 'Farn',
    kurz: 'Spricht mit Pflanzen. Sie antworten nur der Druidin, und das kränkt ihn.',
    hintergrund: 'Farn spricht mit Pflanzen. Die Pflanzen antworten, aber nur der Druidin, und das kränkt ihn. Sie hat '
      + 'ihn auf einem Fels gefunden, Beeren essend, genau dort, wo sie selbst einmal sass, und es als Zeichen genommen. Er '
      + 'sagt, er habe nur Hunger gehabt.\n\nMotivation: Dass ihm eine Eiche einmal zurückwinkt. Er winkt jeden Morgen '
      + 'zuerst.',
  },
};
