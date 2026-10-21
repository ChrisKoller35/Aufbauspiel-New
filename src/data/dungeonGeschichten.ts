// ─── Magic City – Geschichten der Dungeons ───────────────────────
// Jeder Dungeon erzählt eine kurze Geschichte, aufgeschrieben von Ottokar, dem Stadtschreiber
// (wie die Stadtchronik in data/stadtstufen.ts): eine Einleitung vor dem Aufbruch,
// zwei bis drei Entscheidungen unterwegs, die Beute oder Gefahr verändern, und
// ein Schluss nach dem Sieg. Regeln: systems/Geschichten.ts, Anleitung:
// docs/GESCHICHTEN.md.
// ────────────────────────────────────────────────────────────────

/** Was eine Entscheidung bewirkt. Die Zahlen zeigt das Spiel selbst neben dem Knopf an. */
export type Wirkung =
  | { art: 'gold'; menge: number }
  | { art: 'gegenstand'; itemId: string; menge: number }
  /** Heilt jeden lebenden Helden um Prozent seines vollen Lebens */
  | { art: 'heilen'; prozent: number }
  /** Kostet jeden lebenden Helden Prozent seines vollen Lebens, nie das letzte */
  | { art: 'leben'; prozent: number }
  /** Die nächsten Kämpfe (ohne Boss): Gegner mit so viel Prozent mehr (oder weniger) Leben und Angriff */
  | { art: 'gegner'; prozent: number; kaempfe: number }
  /** Der Boss mit so viel Prozent mehr (oder weniger) Leben und Angriff */
  | { art: 'boss'; prozent: number }
  /** Nach dem Sieg liegt ein Teil des Dungeon-Sets mehr in der Truhe (zum gewöhnlichen Wurf dazu) */
  | { art: 'setTeil' }
  | { art: 'xp'; menge: number };

export interface GeschichtsOption {
  /** Knopf, wenige Worte */
  label: string;
  wirkung: Wirkung[];
  /** Ein Satz für den Bericht nach der Expedition */
  nachklang: string;
}

export interface GeschichtsWahl {
  /** Die Entscheidung fällt, wenn dieser Raum geschafft ist (0 = erster Raum) */
  nachRaum: number;
  titel: string;
  /** Die Lage in ein bis drei Sätzen */
  text: string;
  /** Die vorsichtige Option, steht im Fenster zuerst */
  sicher: GeschichtsOption;
  /** Mehr Beute, mehr Gefahr */
  mutig: GeschichtsOption;
}

/** Geschichte zu einem festen Wahl-Raum der Route (EncounterTemplate.wahl); a und b wie dort */
export interface RaumWahlText {
  titel: string;
  text: string;
  nachklang: { a: string; b: string };
}

export interface DungeonGeschichte {
  routeId: string;
  titel: string;
  /** Vor dem Aufbruch, in der Stimme des Stadtschreibers */
  einleitung: string;
  wahlen: GeschichtsWahl[];
  /** Feste Wahl-Räume der Route, nach Raum-Index */
  raumWahlen?: Record<number, RaumWahlText>;
  /** Nach dem Sieg */
  ende: string;
}

const gold = (menge: number): Wirkung => ({ art: 'gold', menge });
const ding = (itemId: string, menge: number): Wirkung => ({ art: 'gegenstand', itemId, menge });
const heilen = (prozent: number): Wirkung => ({ art: 'heilen', prozent });
const leben = (prozent: number): Wirkung => ({ art: 'leben', prozent });
const gegner = (prozent: number, kaempfe = 1): Wirkung => ({ art: 'gegner', prozent, kaempfe });
const boss = (prozent: number): Wirkung => ({ art: 'boss', prozent });
const setTeil: Wirkung = { art: 'setTeil' };
const xp = (menge: number): Wirkung => ({ art: 'xp', menge });

export const DUNGEON_GESCHICHTEN: DungeonGeschichte[] = [
  // ── Ebene 1 ──
  {
    routeId: 'forest_short', titel: 'Die Ziege',
    einleitung: 'Die Ziege ist weg. Sie ist nicht über den Zaun gesprungen, sie hat ihn gegessen, und dann ist sie in den Wald spaziert. '
      + 'Ohne Ziege keine Milch, ohne Milch kein Käse, ohne Käse schlechte Laune im ganzen Lager. '
      + 'Ausserdem war sie bei der Gründung dabei und hat sich damals der Stimme enthalten. So jemanden lässt man nicht im Wald.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Spur',
        text: 'Hinter dem Wolfsrevier teilt sich die Spur. Links führt ein Pfad aus angeknabberten Büschen bergab. '
          + 'Rechts glänzt etwas im Unterholz, und dort riecht es sehr stark nach Wolf.',
        sicher: {
          label: 'Den Büschen folgen', wirkung: [ding('herb_green', 3)],
          nachklang: 'Wir folgten den angeknabberten Büschen und sammelten unterwegs, was die Ziege übrig gelassen hatte: Kräuter, die ihr nicht geschmeckt hatten.',
        },
        mutig: {
          label: 'Zum Glänzen gehen', wirkung: [gold(30), gegner(25)],
          nachklang: 'Wir holten das Glänzende aus dem Wolfsrevier, eine volle Börse. Die Wölfe nahmen das persönlich.',
        },
      },
      {
        nachRaum: 3, titel: 'Die Lichtung',
        text: 'Da steht sie, mitten auf der Lichtung, und frisst einem schlafenden Waldbären den Honig vom Bauch. '
          + 'Neben dem Bären liegt ein Sack, aus dem es klimpert. Wem er vorher gehört hat, will man lieber nicht wissen.',
        sicher: {
          label: 'Nur die Ziege nehmen', wirkung: [xp(15)],
          nachklang: 'Wir nahmen nur die Ziege. Sie meckerte erst, als wir draussen waren. Das war höflich von ihr.',
        },
        mutig: {
          label: 'Auch den Sack nehmen', wirkung: [gold(40), gegner(25)],
          nachklang: 'Wir nahmen auch den Sack. Der Bär wachte auf und fand, der Sack gehöre jetzt ihm. Die Ziege frass in Ruhe weiter.',
        },
      },
    ],
    ende: 'Die Ziege ist zurück. Sie steht wieder vor dem Zelt, frisst den neuen Zaun und tut, als wäre nichts gewesen. '
      + 'Ich habe den Ausflug ins Protokoll aufgenommen. Unter «Grund» steht: «Hunger». Unter «Reue» steht nichts.',
  },
  {
    routeId: 'forest_ruins', titel: 'Die zweite Platte',
    einleitung: 'Jorinde hat wieder gegraben, diesmal in alten Büchern. Die Steinplatte aus dem Steinbruch hat eine Schwester, sagt sie, '
      + 'und die liegt auf der verfallenen Lichtung, wo früher ein Tempel stand. Heute stehen dort Bären. '
      + 'Ich will die zweite Platte für mein Archiv, Jorinde will wissen, was draufsteht, und die Bären wollen, dass wir gehen.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Opferstein',
        text: 'Auf einem bemoosten Opferstein liegen alte, grün angelaufene Münzen und ein Kranz aus frischen Blumen. '
          + 'Jemand pflegt diesen Ort noch. Jemand, der nicht hier ist. Hoffentlich.',
        sicher: {
          label: 'Eine Blume dazulegen', wirkung: [gegner(-10)],
          nachklang: 'Wir legten eine Blume auf den Opferstein, und der Wald war danach freundlicher, sogar seine Wölfe. Einbildung, sagt Jorinde. Sie hat keine gelegt.',
        },
        mutig: {
          label: 'Die Münzen einstecken', wirkung: [gold(30), gegner(30)],
          nachklang: 'Wir steckten die Münzen vom Opferstein ein. Der Wald hat das gesehen, und der Wald hat Zähne.',
        },
      },
      {
        nachRaum: 4, titel: 'Die Platte',
        text: 'Unter einer umgestürzten Säule liegt die zweite Platte, halb im Boden. Darauf schläft ein Waldbär, '
          + 'der den warmen Stein offenbar für sein Bett hält. Unter der Platte schimmert etwas, das nach altem Tempelschmuck aussieht.',
        sicher: {
          label: 'Die Schrift abpausen', wirkung: [xp(20)],
          nachklang: 'Wir pausten die Schrift ab, mit Kohle, Geduld und angehaltenem Atem. Der Bär schnarchte den Takt dazu.',
        },
        mutig: {
          label: 'Die Platte ausgraben', wirkung: [setTeil, gegner(20)],
          nachklang: 'Wir gruben die Platte aus, samt dem Tempelschmuck darunter. Der Bär wachte auf und war gegen Archivarbeit.',
        },
      },
    ],
    ende: 'Die Schrift der zweiten Platte hängt jetzt in meinem Archiv, gleich neben der ersten. Sie sagt: «Wer das Herz weckt, muss es auch füttern.» '
      + 'Jorinde hält das für eine Warnung. Ich halte es für ein Kochrezept. Wir reden gerade nicht miteinander.',
  },

  // ── Ebene 2 ──
  {
    routeId: 'forest_medium', titel: 'Holz für den Ofen',
    einleitung: 'Die Bäckerin braucht Holz, und zwar viel. Ihr Ofen frisst inzwischen mehr als das ganze Dorf, '
      + 'aber unsere Holzfäller weigern sich, in den Tiefwald zu gehen. Dort laufen nachts die Bäume herum, sagen sie. '
      + 'Ich habe gelacht. Dann habe ich die Spuren gesehen: Wurzelabdrücke quer über den Weg, und dahinter ein Loch, wo gestern eine Eiche stand.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Axt',
        text: 'Mitten im Weg steckt eine Holzfälleraxt in einem Baumstumpf, frisch geschliffen, mit Silber am Stiel. '
          + 'Aus dem Stumpf rinnt Harz wie aus einer Wunde. Ringsum ist der Wald sehr still geworden.',
        sicher: {
          label: 'Die Axt stecken lassen', wirkung: [xp(30)],
          nachklang: 'Wir liessen die Axt im Stumpf. Danach wurde der Wald wieder lauter, und das war ein gutes Zeichen.',
        },
        mutig: {
          label: 'Die Axt mitnehmen', wirkung: [gold(60), boss(15)],
          nachklang: 'Wir nahmen die Silberaxt mit, der Schmied zahlte gut. Der Uralte hat es gesehen und es sich gemerkt.',
        },
      },
      {
        nachRaum: 4, titel: 'Der Schamane',
        text: 'Ein verletzter Waldschamane lehnt an einer Birke und hält euch einen Trank hin. Ihr dürft ihn haben, wenn ihr ihn gehen lasst. '
          + 'Sein Beutel ist voller Kräuter. Seine Freunde sind nicht weit, das sagt er nicht, aber man hört sie.',
        sicher: {
          label: 'Ihn gehen lassen', wirkung: [heilen(20)],
          nachklang: 'Wir liessen den Schamanen gehen. Sein Trank schmeckte nach Moos und wirkte trotzdem.',
        },
        mutig: {
          label: 'Ihm den Beutel abnehmen', wirkung: [ding('herb_green', 4), ding('healing_potion', 1), gegner(25, 2)],
          nachklang: 'Wir nahmen dem Schamanen den Kräuterbeutel ab. Seine Freunde kamen schneller, als uns lieb war.',
        },
      },
      {
        nachRaum: 7, titel: 'Die goldene Frucht',
        text: 'Vor euch liegt eine Lichtung mit einem Kreis aus Baumstümpfen. In der Mitte steht er, so alt, dass sein Moos Moos angesetzt hat. '
          + 'An seinen Wurzeln hängt eine goldene Frucht. Er hat euch noch nicht bemerkt. Glaubt ihr.',
        sicher: {
          label: 'Warten, bis er döst', wirkung: [boss(-10)],
          nachklang: 'Wir warteten, bis der Uralte döste. Bei ihm dauert Einschlafen drei Stunden, dafür ist er dann langsam.',
        },
        mutig: {
          label: 'Die Frucht pflücken', wirkung: [setTeil, boss(10)],
          nachklang: 'Wir pflückten die goldene Frucht an seinen Wurzeln. Er wachte auf. Sehr.',
        },
      },
    ],
    ende: 'Der Tiefwald ist wieder ein Wald, in dem die Bäume stehen bleiben. Die Holzfäller trauen sich zurück, die Bäckerin heizt, '
      + 'und das Brot schmeckt nach Rauch und Sieg. Aus dem Uralten haben wir übrigens kein Brennholz gemacht. Er stand schon da, als es noch keine Bäckerinnen gab.',
  },
  {
    routeId: 'cave_deep', titel: 'Das zweite Brummen',
    einleitung: 'Jorinde hat ihr Ohr an die Felsen der Tiefen Höhle gelegt. Dort brummt es, sagt sie, genau wie unter unserem Dorfplatz, nur lauter. '
      + 'Sie glaubt, die Höhle sei mit dem Platz verbunden. Ich glaube, Jorinde sollte weniger Ohren an Felsen legen. '
      + 'Trotzdem: Wenn unter uns etwas brummt, will ich wissen, was.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Goblin-Stollen',
        text: 'Höhlengoblins haben einen Stollen voller Kristallsplitter gegraben und dann vergessen, ihn abzustützen. '
          + 'Die Splitter funkeln und summen leise, genau wie der Golem, der tiefer in der Höhle schläft. Vielleicht gehören sie zu ihm.',
        sicher: {
          label: 'Am Stollen vorbei', wirkung: [xp(25)],
          nachklang: 'Wir gingen am Goblin-Stollen vorbei. Hinter uns stürzte er ein. Ich nenne das Planung.',
        },
        mutig: {
          label: 'Splitter herausbrechen', wirkung: [ding('crystal_shard', 3), boss(7)],
          nachklang: 'Wir brachen Kristallsplitter aus dem Goblin-Stollen. Sie gehörten tatsächlich zum Golem, und er spürte jeden einzelnen.',
        },
      },
      {
        nachRaum: 4, titel: 'Der singende Kristall',
        text: 'In einer Kammer steht ein Kristall, so gross wie ein Mann, und brummt. Es ist genau das Brummen von unserem Dorfplatz. '
          + 'Fasst man ihn an, wird er warm. Tief in der Höhle antwortet etwas Schweres mit einem Knirschen.',
        sicher: {
          label: 'Nur zuhören', wirkung: [heilen(15)],
          nachklang: 'Wir hörten dem Kristall eine Weile zu. Es war erstaunlich erholsam. Jorinde hatte recht, aber das sage ich ihr nicht.',
        },
        mutig: {
          label: 'Den Kristall ausgraben', wirkung: [setTeil, boss(20)],
          nachklang: 'Wir gruben den singenden Kristall aus. Der Golem hat es gemerkt, man gräbt nicht ungestraft an seinem Lieblingsstein.',
        },
      },
      {
        nachRaum: 6, titel: 'Die Fledermäuse',
        text: 'Vor der Halle des Golems hängen tausend Fledermäuse an der Decke und schlafen. '
          + 'Unter ihnen liegt die Beute der Goblins: Münzen, Löffel und ein sehr schöner Hut.',
        sicher: {
          label: 'Leise vorbeischleichen', wirkung: [boss(-10)],
          nachklang: 'Wir schlichen an den Fledermäusen vorbei. Der Golem war so überrascht, wie ein Stein überrascht sein kann.',
        },
        mutig: {
          label: 'Die Beute einsammeln', wirkung: [gold(80), boss(10)],
          nachklang: 'Wir sammelten die Goblin-Beute ein. Tausend Fledermäuse wachten auf und meldeten uns beim Golem an.',
        },
      },
    ],
    ende: 'Der Kristallgolem ist besiegt, und in seiner Brust steckte ein Stein, der brummt. Seit er auf dem Dorfplatz liegt, brummt der Platz zweistimmig. '
      + 'Die Bäckerin sagt, jetzt seien es eben zwei Öfen.',
  },
  {
    routeId: 'cave_spider', titel: 'Seide für die Hauptstadt',
    einleitung: 'Die Hauptstadt hat geschrieben, sehr höflich und ein bisschen nervös: Ob wir Spinnenseide liefern könnten, für die Fahnen zum Stadtjubiläum. '
      + 'Bezahlt wird sofort und in Gold. Die beste Seide spinnt die Spinnenkönigin in ihrer Höhle. Sie liefert nicht. Wir holen ab.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Seidenfäden',
        text: 'Quer durch den Gang ziehen sich Seidenfäden, dick wie Taue und so fein gesponnen, dass sie im Fackellicht schimmern. '
          + 'Genau die Ware, die die Hauptstadt will. An jedem Faden hängt eine kleine Glocke aus Knochen.',
        sicher: {
          label: 'Darunter durchkriechen', wirkung: [xp(25)],
          nachklang: 'Wir krochen unter den Seidenfäden durch, ohne eine einzige Glocke. Ich bin heute noch stolz auf uns.',
        },
        mutig: {
          label: 'Fäden abschneiden', wirkung: [gold(60), gegner(25)],
          nachklang: 'Wir schnitten Seide ab. Die Knochenglocken läuteten, und die Spinnen kamen wie zum Gottesdienst.',
        },
      },
      {
        nachRaum: 4, titel: 'Die Brut',
        text: 'In einer Nische liegen Spinneneier, gross wie Kürbisse, und pulsieren leise. Ein Alchemist würde für eines ein Vermögen zahlen. '
          + 'Die Königin würde dafür jemanden fressen. Vermutlich den, der es trägt.',
        sicher: {
          label: 'Liegen lassen', wirkung: [boss(-10)],
          nachklang: 'Wir liessen die Eier liegen. Dankbar war die Königin deshalb nicht, aber etwas weniger wütend.',
        },
        mutig: {
          label: 'Ein Ei mitnehmen', wirkung: [setTeil, boss(10)],
          nachklang: 'Wir nahmen ein Spinnenei mit. Die Königin zählt ihre Eier, wie sich herausstellte.',
        },
      },
      {
        nachRaum: 6, titel: 'Der Kokon',
        text: 'Kurz vor dem Nest zappelt ein Kokon an der Wand und schimpft. Darin hängt ein Händler, kopfüber, und neben ihm sein Wagen, ebenso sorgfältig eingesponnen. '
          + 'Er verspricht euch seine Heiltränke, wenn ihr ihn herausschneidet, und schlägt vor, dabei nicht zu trödeln.',
        sicher: {
          label: 'Ihn herausschneiden', wirkung: [ding('healing_potion', 2)],
          nachklang: 'Wir schnitten einen Händler aus einem Kokon. Er zahlte mit Heiltränken und mit Dankbarkeit, vor allem mit Heiltränken.',
        },
        mutig: {
          label: 'Erst den Wagen ausräumen', wirkung: [gold(80), ding('healing_potion', 2), boss(12)],
          nachklang: 'Wir räumten zuerst den eingesponnenen Wagen des Händlers aus und dann den Händler. Die Königin hatte inzwischen Zeit, sich vorzubereiten.',
        },
      },
    ],
    ende: 'Die Spinnenkönigin ist besiegt, ihre Seide unterwegs in die Hauptstadt. Die Fahnen fürs Jubiläum werden wunderschön, schreibt man uns. '
      + 'Nur kleben sie ein bisschen. Und manchmal zappeln sie.',
  },
  {
    routeId: 'ocean_shallows', titel: 'Die Glocke im Watt',
    einleitung: 'Bei Ebbe läutet draussen an der versunkenen Küste eine Glocke, und das seit einer Woche. Die Fischer bleiben zu Hause. '
      + 'Eine Glocke, die unter Wasser läutet, sagen sie, ruft niemanden zum Essen. Sie ruft etwas, das isst. '
      + 'Ich habe nachgezählt: Uns fehlen drei Fischer und ein Boot. Das Boot ist mir weniger wichtig.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Das Wrack',
        text: 'Im Schlick liegt ein umgekipptes Fischerboot, unseres. Darunter hört man jemanden husten. '
          + 'Draussen in der Bucht schaukelt eine Truhe auf den Wellen, gerade noch erreichbar, bevor die Flut kommt.',
        sicher: {
          label: 'Das Boot anheben', wirkung: [xp(25)],
          nachklang: 'Wir hoben das Boot an. Darunter sass einer der Fischer und war beleidigt, dass wir so lange gebraucht hatten.',
        },
        mutig: {
          label: 'Zur Truhe schwimmen', wirkung: [ding('sea_crystal', 2), gold(40), gegner(25)],
          nachklang: 'Wir schwammen zur Truhe in der Bucht. Die Bucht war bewohnt. Den Fischer unter dem Boot holten wir auf dem Rückweg.',
        },
      },
      {
        nachRaum: 3, titel: 'Die Glocke',
        text: 'Da hängt sie, an einem Mast, der aus dem Schlick ragt. Um sie herum treiben Quallen in einem Kreis, als würden sie tanzen. '
          + 'Der Glockenschlegel ist aus reinem Meerkristall. Die beiden letzten Fischer sitzen auf dem Mast und winken nicht, sie zittern.',
        sicher: {
          label: 'Die Glocke festbinden', wirkung: [heilen(15)],
          nachklang: 'Wir banden die Glocke mit einem Fischernetz fest. Die Quallen verloren das Interesse, und die Fischer kletterten herunter.',
        },
        mutig: {
          label: 'Den Schlegel abschlagen', wirkung: [setTeil, gegner(20)],
          nachklang: 'Wir schlugen den Kristallschlegel ab. Die Glocke läutete ein letztes Mal, sehr laut, und die ganze Bucht kam nachsehen.',
        },
      },
    ],
    ende: 'Die Glocke schweigt, die Fischer fischen, und das Boot ist wieder unser Boot. '
      + 'Einer der Fischer schwört, er habe unter Wasser etwas Grosses gesehen, das der Glocke zuhörte. Ich habe es aufgeschrieben, unter «Später».',
  },
  {
    routeId: 'haunted_woods', titel: 'Der Brief',
    einleitung: 'Im Geisterwald wohnte früher ein Postbote. Er wohnt immer noch dort, nur nicht mehr ganz. '
      + 'Seit Wochen liegen jeden Morgen Briefe vor meiner Tür, adressiert an Leute, die seit hundert Jahren tot sind. '
      + 'Einer ist an mich adressiert. Ich habe ihn nicht geöffnet. Ich möchte zuerst wissen, wer ihn geschrieben hat.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Postsack',
        text: 'An einem Ast hängt ein Postsack, prall voll, und aus jedem Brief steigt ein Irrlicht, sobald man ihn berührt. '
          + 'Zwischen den Briefen klimpert Porto, alte Silbermünzen, von denen keiner mehr weiss, was sie wert sind.',
        sicher: {
          label: 'Den Sack zubinden', wirkung: [xp(25)],
          nachklang: 'Wir banden den Postsack zu, damit nichts mehr herausflattert. Ein Irrlicht bedankte sich, glaube ich.',
        },
        mutig: {
          label: 'Das Porto nehmen', wirkung: [gold(60), gegner(15)],
          nachklang: 'Wir nahmen das alte Porto aus dem Postsack. Die Irrlichter fanden, das sei Diebstahl am Postgeheimnis.',
        },
      },
      {
        nachRaum: 4, titel: 'Das Postamt',
        text: 'Mitten im Wald steht ein Postamt, Fenster ohne Glas, Tür ohne Angeln. Hinter dem Schalter sortiert ein Geist mit Mütze Pakete, die nie abgeholt wurden. '
          + 'Auf einigen steht «Gilde, Magic City». Er gibt sie heraus, sagt er, gegen eine Unterschrift. Mit Blut. Und dann kennt der ganze Wald euren Namen.',
        sicher: {
          label: 'Höflich ablehnen', wirkung: [xp(30)],
          nachklang: 'Wir lehnten die Blutunterschrift höflich ab. Der Postgeist stempelte das als «Annahme verweigert».',
        },
        mutig: {
          label: 'Mit Blut unterschreiben', wirkung: [gold(40), ding('healing_potion', 2), gegner(15, 2)],
          nachklang: 'Wir unterschrieben beim Postgeist mit Blut und bekamen die Pakete der Gilde, hundert Jahre zu spät, aber vollständig. Danach kannte der ganze Wald unseren Namen.',
        },
      },
      {
        nachRaum: 6, titel: 'Der Absender',
        text: 'Am Ende des Pfads sitzt ein alter Mann auf einem Baumstumpf und schreibt. Er ist durchsichtig und hat Tinte an den Fingern. '
          + 'Er schreibt allen, die er vergessen hat zu besuchen, sagt er. Neben ihm liegt eine Kiste mit seinem Lohn aus hundert Jahren.',
        sicher: {
          label: 'Ihm zuhören', wirkung: [xp(40)],
          nachklang: 'Wir hörten dem alten Postboten zu, bis er fertig war. Er schrieb einen letzten Brief, an uns, und dann war er weg.',
        },
        mutig: {
          label: 'Die Kiste nehmen', wirkung: [setTeil, gegner(30)],
          nachklang: 'Wir nahmen die Kiste mit dem Postlohn. Der alte Mann sah uns traurig an, und der Wald wurde sehr kalt.',
        },
      },
    ],
    ende: 'Ich habe den Brief geöffnet. Er lautet: «Lieber Stadtschreiber, schreib alles auf, sonst ist es weg.» '
      + 'Unterschrift unleserlich. Seither kommen keine Briefe mehr. Ich schreibe trotzdem alles auf.',
  },
  {
    routeId: 'cave_tunnels', titel: 'Der Schmuggler',
    einleitung: 'Unser Händler hat einen Vetter, und der Vetter hat Schulden, und zwar bei Höhlengoblins. '
      + 'Seit einer Woche sitzt er in den verschlungenen Tunneln fest und schickt Zettel mit der Bitte um Rettung, Lösegeld oder beides. '
      + 'Der Händler bietet uns zehn Prozent Rabatt auf alles, wenn wir den Vetter holen. Auf Karten sogar zwölf.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Wegweiser',
        text: 'An jeder Abzweigung stehen Wegweiser, und alle zeigen in andere Richtungen. Einer ist frisch gemalt und zeigt in einen Gang, aus dem es nach Goldstaub riecht. '
          + 'Ein anderer ist mit Kreide gekritzelt: «Hier lang, Vetter».',
        sicher: {
          label: 'Der Kreide folgen', wirkung: [xp(25)],
          nachklang: 'Wir folgten der Kreide des Vetters. Der Weg war lang und leer, und wir kennen die Tunnel seither besser als die Goblins.',
        },
        mutig: {
          label: 'Dem Goldstaub nach', wirkung: [gold(60), gegner(20)],
          nachklang: 'Wir folgten dem Goldstaub und fanden die Kasse der Goblins. Die Goblins fanden uns.',
        },
      },
      {
        nachRaum: 3, titel: 'Der Vetter',
        text: 'Der Vetter sitzt in einem Käfig über einer Schlucht und isst ein Sandwich. Die Goblins lassen ihn hungern, sagt er, mit vollem Mund. '
          + 'Unter dem Käfig stapelt sich die Schmuggelware der Goblins, und die Wache schläft.',
        sicher: {
          label: 'Nur den Vetter befreien', wirkung: [xp(25)],
          nachklang: 'Wir befreiten nur den Vetter. Er wollte das Sandwich nicht teilen.',
        },
        mutig: {
          label: 'Die Ware mitnehmen', wirkung: [setTeil, gegner(15, 2)],
          nachklang: 'Wir nahmen den Vetter und die Schmuggelware. Die Wache wachte auf, und mit ihr die halben Tunnel.',
        },
      },
    ],
    ende: 'Der Vetter ist zurück und hat sich bei uns allen bedankt, schriftlich, mit Rechnung für die Auslagen. '
      + 'Der Händler hat uns den Rabatt gewährt. Seine Preise sind seit gestern zwölf Prozent höher.',
  },
  {
    routeId: 'swamp_village', titel: 'Die Hochzeit',
    einleitung: 'Im Sumpfdorf wird geheiratet, und wir sind eingeladen. Das ist schön. Die Einladung kam allerdings mit einem Blutegel als Briefmarke, '
      + 'und auf der Rückseite steht: «Bringt Schwerter mit, der Brautvater ist ein Troll.» '
      + 'Ich habe ein Geschenk eingepackt, einen Kerzenständer. Die Gruppe hat Schwerter eingepackt.',
    wahlen: [
      {
        nachRaum: 0, titel: 'Der Brautvater',
        text: 'Ein Sumpftroll versperrt den Steg, der Brautvater, und will wissen, ob ihr Freunde der Braut oder des Bräutigams seid. '
          + 'Die Freunde der Braut dürfen über den Steg. Die Freunde des Bräutigams wirft er in den Sumpf, und dort glänzt es: Was frühere Gäste beim Fallen verloren haben.',
        sicher: {
          label: '«Freunde der Braut»', wirkung: [xp(25)],
          nachklang: 'Wir sagten, wir seien Freunde der Braut. Der Troll war gerührt und liess uns über den Steg.',
        },
        mutig: {
          label: '«Freunde des Bräutigams»', wirkung: [gold(60), gegner(15)],
          nachklang: 'Wir sagten, wir seien Freunde des Bräutigams, und der Troll warf uns in den Sumpf. Dort lag das Gold der Gäste vor uns. Die Blutegel lagen auch dort.',
        },
      },
      {
        nachRaum: 2, titel: 'Das Fest',
        text: 'Auf dem Fest tanzen Kröten und Fäulniswandler im Kreis. Die Braut, eine Moorhexe, bietet euch vom Hochzeitstrunk an. '
          + 'Der Bräutigam flüstert, ihr solltet besser den Brautschmuck stehlen, solange alle tanzen. Er habe es sich anders überlegt.',
        sicher: {
          label: 'Mit der Braut anstossen', wirkung: [ding('healing_potion', 2)],
          nachklang: 'Wir stiessen mit der Braut an. Der Trunk war grün und warm, und sie gab uns zwei Flaschen für unterwegs mit. Den Bräutigam haben wir nicht mehr gesehen.',
        },
        mutig: {
          label: 'Den Brautschmuck stehlen', wirkung: [setTeil, ding('herb_swamp_blossom', 3), gegner(40)],
          nachklang: 'Wir stahlen den Brautschmuck, weil der Bräutigam darum bat. Die Braut fand das gar nicht romantisch und schickte uns ihren Vater hinterher.',
        },
      },
    ],
    ende: 'Die Hochzeit fand statt, mit Verspätung und mit einem anderen Bräutigam. Das Sumpfdorf schickt uns jetzt jeden Monat Sumpfblüten. '
      + 'Mein Kerzenständer steht im Haus des Brautpaars, mitten im Sumpf, und brennt. Man hat mir versichert, das sei Absicht.',
  },

  // ── Ebene 3 ──
  {
    routeId: 'swamp_long', titel: 'Das Fieber',
    einleitung: 'Ein Fieber geht im Dorf um. Wer es hat, wird grün um die Nase und spricht nur noch in Reimen. '
      + 'Die Kräuterfrau sagt, es kommt aus dem Giftsumpf, wo die Hydra in einem Teich aus ihrem eigenen Gift schläft. '
      + 'Gegen das Fieber hilft nur ihr Blut, frisch, und zwar von allen Köpfen. Ich habe nachgefragt: Es sind viele Köpfe.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Kräuterfrau',
        text: 'Die Kräuterfrau ist euch heimlich gefolgt. Sie hat einen Korb dabei und will Sumpfblüten pflücken, '
          + 'die nur dort wachsen, wo das Gift der Hydra in den Sumpf sickert. Allein schafft sie das nicht, sagt sie, und schaut euch an.',
        sicher: {
          label: 'Sie zurückschicken', wirkung: [xp(40)],
          nachklang: 'Wir schickten die Kräuterfrau zurück ins Dorf. Sie schimpfte in Reimen, sie hatte das Fieber inzwischen auch.',
        },
        mutig: {
          label: 'Ihr beim Pflücken helfen', wirkung: [ding('herb_swamp_blossom', 4), boss(5)],
          nachklang: 'Wir halfen der Kräuterfrau beim Pflücken, mitten im Giftgarten der Hydra. Sie bezahlte uns mit Blüten, und die Hydra roch uns von da an schon von Weitem.',
        },
      },
      {
        nachRaum: 7, titel: 'Die Moorhexe',
        text: 'In einer Hütte auf Stelzen wohnt eine Moorhexe, die das Fieber kennt. Sie habe es erfunden, sagt sie stolz, und wer ihr Werk lobt, '
          + 'dem verrät sie, welcher Kopf der Hydra der echte ist. Hinter ihr steht ein Regal voller Gegengift und Gold, und sie redet gern und lange.',
        sicher: {
          label: 'Ihr Fieber loben', wirkung: [boss(-10)],
          nachklang: 'Wir lobten das Fieber der Moorhexe, bis sie rot wurde, und sie zeigte uns den echten Kopf der Hydra. Es war das unehrlichste Gespräch meines Lebens.',
        },
        mutig: {
          label: 'Das Regal ausräumen', wirkung: [gold(100), ding('healing_potion', 2), gegner(30)],
          nachklang: 'Wir räumten das Regal der Moorhexe aus, während sie redete. Sie hörte auf zu reden und rief ihre Sumpfphantome.',
        },
      },
      {
        nachRaum: 9, titel: 'Der Giftteich',
        text: 'Der Teich der Hydra dampft. Am Ufer liegen die Rüstungen derer, die vor euch hier waren, und in einer davon steckt noch ein Brief nach Hause. '
          + 'Im Schilf schlafen die Jungen der Hydra, kleine Köpfe, grosse Zähne.',
        sicher: {
          label: 'Den Brief mitnehmen', wirkung: [xp(40), heilen(10)],
          nachklang: 'Wir nahmen den Brief aus der Rüstung am Ufer mit. Er ging an eine Familie im Dorf, die seit zwanzig Jahren auf ihn wartete.',
        },
        mutig: {
          label: 'Die Jungen wecken', wirkung: [setTeil, boss(15)],
          nachklang: 'Wir weckten die Jungen der Hydra, um an das Nest zu kommen. Die Mutter hat das nicht gut aufgenommen.',
        },
      },
    ],
    ende: 'Das Blut der Hydra hat geholfen. Das Dorf ist wieder gesund, und niemand spricht mehr in Reimen. '
      + 'Bis auf die Kräuterfrau. Sie sagt, sie sei gesund, es gefalle ihr nur so. Ich schreibe ihre Aussagen jetzt in Versen ins Protokoll.',
  },
  {
    routeId: 'ruins_crypts', titel: 'Der Ritter ohne Namen',
    einleitung: 'In der alten Krypta liegt ein Ritter begraben, der bei der Gründung der ersten Stadt hier Wache hielt. '
      + 'Seit ein paar Nächten hält er wieder Wache, nur steht er dazu jetzt auf. Er sucht seinen Namen, sagen die Grabräuber, die schreiend zurückkamen. '
      + 'Ich habe im Archiv nachgesehen. Sein Name fehlt. Jemand hat ihn aus der Chronik gekratzt.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Grabräuber',
        text: 'In einer Seitenkammer kauern zwei Grabräuber und bieten euch ihre Beute an, wenn ihr sie hinausbegleitet. '
          + 'Ihre Säcke sind schwer. Draussen ist es weit, und die Skelette sind schon unterwegs.',
        sicher: {
          label: 'Sie hinausschicken', wirkung: [xp(40)],
          nachklang: 'Wir zeigten den Grabräubern den Ausgang und behielten den Rest der Krypta im Auge. Sie bedankten sich, ohne uns etwas abzugeben.',
        },
        mutig: {
          label: 'Ihnen die Säcke abnehmen', wirkung: [gold(100), gegner(30, 3)],
          nachklang: 'Wir nahmen den Grabräubern die Säcke ab. Die Skelette kamen und wollten ihre Grabbeigaben zurück.',
        },
      },
      {
        nachRaum: 6, titel: 'Der zerkratzte Stein',
        text: 'In der Wand der Gruft steckt ein Gedenkstein mit einer leeren Stelle, wo ein Name stand. Jemand hat ihn sorgfältig weggekratzt. '
          + 'In den Kratzspuren steckt ein abgebrochener Dolch mit dem Wappen der Hauptstadt.',
        sicher: {
          label: 'Den Stein reinigen', wirkung: [boss(-5)],
          nachklang: 'Wir reinigten den zerkratzten Gedenkstein. Einen Namen fanden wir nicht, aber irgendwo in der Krypta seufzte jemand erleichtert.',
        },
        mutig: {
          label: 'Den Dolch mitnehmen', wirkung: [ding('talisman_fragment', 2), boss(5)],
          nachklang: 'Wir nahmen den Dolch mit dem Wappen der Hauptstadt mit. Der Ritter hat den Dolch wiedererkannt.',
        },
      },
      {
        nachRaum: 9, titel: 'Die Ehrenwache',
        text: 'Vor seiner Gruft stehen zwei Steinwächter, die Schwerter gekreuzt. Hinter ihnen liegt seine Rüstung, aufgebahrt wie ein Heiligtum. '
          + 'Die Wächter lassen nur durch, wer den Namen des Ritters nennt.',
        sicher: {
          label: '«Wir kennen ihn nicht»', wirkung: [heilen(15)],
          nachklang: 'Wir sagten den Steinwächtern, dass wir seinen Namen nicht kennen. Ehrlichkeit öffnet in Krypten erstaunlich viele Türen.',
        },
        mutig: {
          label: 'Die Rüstung holen', wirkung: [setTeil, boss(15)],
          nachklang: 'Wir drängten uns an den Steinwächtern vorbei zur aufgebahrten Rüstung. Er hat zugesehen, wie wir sie anfassten.',
        },
      },
    ],
    ende: 'Der Ritter ruht wieder. Im Archiv der Hauptstadt fand ich später seinen Namen, falsch abgelegt unter «Unbequeme». '
      + 'Er hiess Aldric. Ich habe ihn zurück in die Chronik geschrieben, gross und mit sehr viel Tinte.',
  },
  {
    routeId: 'siege_walls', titel: 'Der Steuerbrief',
    einleitung: 'Die Hauptstadt hat uns einen Steuerbrief geschickt, sehr förmlich und sehr teuer. Gleich dahinter kamen ihre Söldner und haben die alte Stadtmauer besetzt, '
      + 'die zwischen uns und dem Rest der Welt steht. Bis wir zahlen, kommt kein Händler mehr durch. '
      + 'Ich habe den Brief zurückgeschickt, mit Korrekturen in Rot. Die Gruppe holt die Mauer.',
    wahlen: [
      {
        nachRaum: 0, titel: 'Der Steuereintreiber',
        text: 'Am Tor sitzt ein Steuereintreiber an einem Klapptisch und zählt. Neben ihm stehen Kisten mit dem, was er den Händlern schon abgenommen hat. '
          + 'Er wirkt nicht wie jemand, der kämpft. Er wirkt wie jemand, der Leute ruft, die kämpfen.',
        sicher: {
          label: 'Ihn wegschicken', wirkung: [xp(40)],
          nachklang: 'Wir schickten den Steuereintreiber nach Hause, mit Klapptisch. Er gab uns eine Quittung, für alle Fälle.',
        },
        mutig: {
          label: 'Die Kisten zurückholen', wirkung: [gold(100), gegner(30, 3)],
          nachklang: 'Wir holten uns die Kisten des Steuereintreibers. Er rief Leute, die kämpfen, genau wie vermutet.',
        },
      },
      {
        nachRaum: 3, titel: 'Die Kaserne',
        text: 'In der Mauer liegt die Kaserne der Söldner. Durchs Fenster sieht man ihre Kriegskasse und ihre Frühstücksgrütze. '
          + 'Die Grütze ist bewacht. Die Kasse auch, aber nachlässiger.',
        sicher: {
          label: 'Die Grütze versalzen', wirkung: [gegner(-10, 2)],
          nachklang: 'Wir versalzten die Frühstücksgrütze der Söldner. Wer schlecht frühstückt, kämpft schlecht.',
        },
        mutig: {
          label: 'Die Kriegskasse leeren', wirkung: [gold(120), gegner(30, 2)],
          nachklang: 'Wir leerten die Kriegskasse der Söldner. Unbezahlte Söldner sind schlecht gelaunt, und sie wussten genau, wer schuld war.',
        },
      },
      {
        nachRaum: 7, titel: 'Der Kommandant',
        text: 'Auf dem Wehrgang hängt das Banner des Eisernen Kommandanten, daneben sein Feldplan für die Belagerung von Magic City. '
          + 'Der Plan ist gut. Das ist das Beunruhigende daran.',
        sicher: {
          label: 'Den Plan studieren', wirkung: [boss(-10)],
          nachklang: 'Wir studierten den Feldplan des Kommandanten. Er hatte einen Fehler, und zwar ihn selbst auf Seite drei.',
        },
        mutig: {
          label: 'Das Banner einholen', wirkung: [setTeil, boss(12)],
          nachklang: 'Wir holten das Banner des Eisernen Kommandanten ein. Er hat sehr dünne Haut für jemanden aus Eisen.',
        },
      },
    ],
    ende: 'Die Mauer ist frei, die Händler kommen wieder, und die Hauptstadt hat einen neuen Brief geschickt. '
      + 'Darin steht, es habe sich um ein Missverständnis gehandelt. Ich habe ihn eingerahmt.',
  },
  {
    routeId: 'ocean_depths', titel: 'Das Lied aus der Tiefe',
    einleitung: 'Die Glocke im Watt schweigt, aber jetzt singt es. Jede Nacht, tief unter der Bucht, ein Lied, das niemand versteht und alle mitsummen. '
      + 'Die Fischer sagen, der Leviathan rufe nach seinem Herzen. Er hat es verloren, oder jemand hat es ihm genommen. '
      + 'Wenn jemand singt, weil ihm etwas fehlt, sollte man herausfinden, was. Bevor er es selbst sucht.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Luftblasen',
        text: 'Aus einem Riss im Meeresboden steigen Luftblasen auf, gross genug, um darin Luft zu holen. '
          + 'Daneben liegt ein Wrack mit offenen Truhen, und in jede ist das Zeichen des Leviathans geritzt. Es sind Opfergaben.',
        sicher: {
          label: 'Luft holen', wirkung: [heilen(15)],
          nachklang: 'Wir holten Luft in den Blasen am Meeresboden. Einfach atmen ist unter Wasser ein Luxus.',
        },
        mutig: {
          label: 'Das Wrack plündern', wirkung: [gold(100), ding('sea_crystal', 2), boss(5)],
          nachklang: 'Wir plünderten das Wrack mit den Opfergaben. Tief unten merkte der Leviathan, dass jemand an seinen Truhen war.',
        },
      },
      {
        nachRaum: 4, titel: 'Der ertrunkene Ritter',
        text: 'Ein ertrunkener Ritter steht im Seegras und salutiert. Er habe den Leviathan einst gejagt, sagt er, und ihm dabei etwas gestohlen. '
          + 'Jetzt will er es zurückgeben, aber er traut sich nicht allein. Seine Rüstung ist voller Muscheln und Perlen.',
        sicher: {
          label: 'Ihn begleiten', wirkung: [gegner(-15)],
          nachklang: 'Wir begleiteten den ertrunkenen Ritter ein Stück. Er kannte jede Strömung und führte uns den Wächtern der Tiefe in den Rücken.',
        },
        mutig: {
          label: 'Ihm die Perlen abnehmen', wirkung: [gold(120), boss(10)],
          nachklang: 'Wir nahmen dem ertrunkenen Ritter die Perlen ab. Er salutierte nicht mehr. Er schwamm hinunter zum Leviathan und erzählte ihm alles.',
        },
      },
      {
        nachRaum: 9, titel: 'Das Gestohlene',
        text: 'Ihr findet es in einer Grotte: eine Schuppe, gross wie ein Schild, die leise singt. Sie gehört dem Leviathan. '
          + 'Bringt ihr sie zurück, ist er vielleicht milder. Behaltet ihr sie, wird er sie holen.',
        sicher: {
          label: 'Zurücklegen', wirkung: [boss(-5), xp(50)],
          nachklang: 'Wir legten die singende Schuppe zurück. Das Lied wurde leiser, dann wurde es wütend, aber nur noch ein bisschen.',
        },
        mutig: {
          label: 'Behalten', wirkung: [setTeil, boss(10)],
          nachklang: 'Wir behielten die singende Schuppe. Der Leviathan hörte sie und kam, um sie zu holen.',
        },
      },
    ],
    ende: 'Der Leviathan schläft am Grund der Bucht, und das Lied ist verstummt. Die Fischer behaupten, sie hörten es manchmal noch, ganz leise, im Schlaf. '
      + 'Ich habe die Melodie aufgeschrieben, so gut es ging. Die Brunnen auf dem Platz singen sie jetzt, falsch, aber mit Gefühl.',
  },
  {
    routeId: 'crystal_mines', titel: 'Der verschüttete Stollen',
    einleitung: 'Jorinde hat in den Kristallminen einen alten Stollen gefunden, der zu unserem Dorfplatz führt. Sagt sie. '
      + 'Dann ist der Stollen eingestürzt, mit drei Bergleuten darin, und jetzt klopfen sie. Jede Stunde dreimal. '
      + 'Ich bin eigentlich für das Protokoll zuständig, nicht für Rettungen. Diesmal gehe ich mit, bis zum Eingang.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Kristallader',
        text: 'Eine Ader aus reinem Kristall zieht sich durch die Wand, so hell, dass man ohne Fackel sieht. '
          + 'Kristallkäfer knabbern daran, und davor schläft ein Höhlentroll, als hätte er die Ader gepachtet. Das Klopfen der Bergleute ist von hier nicht mehr zu hören.',
        sicher: {
          label: 'Weiter dem Klopfen nach', wirkung: [xp(40)],
          nachklang: 'Wir liessen die Kristallader den Käfern und ihrem Troll und folgten dem Klopfen. Es wurde lauter, und das war gut.',
        },
        mutig: {
          label: 'Die Ader abbauen', wirkung: [ding('crystal_shard', 4), gegner(15)],
          nachklang: 'Wir bauten Kristall aus der Ader ab. Die Käfer fanden das unhöflich, und der Troll wachte davon auf.',
        },
      },
      {
        nachRaum: 4, titel: 'Der Stützbalken',
        text: 'Ein einziger Balken hält die Decke über dem Hauptgang. Er ächzt. Auf der anderen Seite liegt eine Werkzeugkiste der Bergleute, '
          + 'und dahinter ein Seitengang, der schneller zu ihnen führt, aber unter dem Balken durch. Fällt der Balken, hört man das in der ganzen Mine.',
        sicher: {
          label: 'Den Balken stützen', wirkung: [xp(40)],
          nachklang: 'Wir stützten den ächzenden Balken mit dem, was wir hatten. Er hält bis heute, mit einem Schild darunter.',
        },
        mutig: {
          label: 'Unter dem Balken durch', wirkung: [setTeil, gegner(20, 2)],
          nachklang: 'Wir nahmen den schnellen Weg unter dem Balken durch, samt Werkzeugkiste. Hinter uns fiel der Balken, und die halbe Mine kam nachsehen.',
        },
      },
      {
        nachRaum: 7, titel: 'Die Bergleute',
        text: 'Hinter dem Schutt sitzen die drei Bergleute, staubig und erstaunlich gut gelaunt. Sie haben Kristall gefunden, sagen sie, einen ganzen Sack voll. '
          + 'Der Sack ist schwer, und auf dem Weg nach draussen wimmelt es von Käfern und Schlimmerem.',
        sicher: {
          label: 'Den Sack zurücklassen', wirkung: [gegner(-20)],
          nachklang: 'Wir liessen den Sack der Bergleute zurück und trugen dafür die Bergleute. Leicht beladen ist man schnell.',
        },
        mutig: {
          label: 'Den Sack mitschleppen', wirkung: [gold(100), ding('crystal_shard', 2), gegner(25)],
          nachklang: 'Wir schleppten den Kristallsack mit, und er klirrte bei jedem Schritt. Die Käfer hörten uns kommen, und das Schlimmere hinter ihnen auch.',
        },
      },
    ],
    ende: 'Die drei Bergleute sind zu Hause, und der alte Stollen führt tatsächlich Richtung Dorfplatz. Am Ende fanden wir eine Tür mit derselben Schrift wie auf Jorindes Platte. '
      + 'Sie ist verschlossen. Jorinde hat sich davorgesetzt und wartet. Ich habe ihr ein Kissen gebracht.',
  },
  {
    routeId: 'frozen_pass', titel: 'Der Eiswächter',
    einleitung: 'Über den gefrorenen Pass kommt seit dem Winter kein Händler mehr. Oben, sagt der letzte, der es versucht hat, stehe ein Heer aus Eis und warte. '
      + 'Worauf, wollte ich wissen. Auf seinen Befehl, sagte er, und der Befehl sei vor dreihundert Jahren eingefroren. '
      + 'Ohne den Pass kein Salz. Ohne Salz kein Brot, wie die Bäckerin es mag. Es ist also ernst.',
    wahlen: [
      {
        nachRaum: 3, titel: 'Das Lagerfeuer',
        text: 'An einem geschützten Lagerplatz brennt ein Feuer, das niemand angezündet hat. Daneben liegt ein erfrorener Bote mit seinem Proviant und einer versiegelten Rolle: der Befehl. '
          + 'Ihn zu öffnen könnte das Heer wecken. Oder beruhigen.',
        sicher: {
          label: 'Am Feuer aufwärmen', wirkung: [ding('healing_potion', 2)],
          nachklang: 'Wir wärmten uns am Feuer, das niemand angezündet hatte, nahmen den Proviant des Boten und liessen die Befehlsrolle versiegelt. Manche Briefe sind besser ungeöffnet.',
        },
        mutig: {
          label: 'Den Befehl öffnen', wirkung: [ding('talisman_fragment', 2), gegner(15, 2)],
          nachklang: 'Wir brachen das Siegel des eingefrorenen Befehls. Er lautete: «Angriff.» Das Heer hatte dreihundert Jahre darauf gewartet.',
        },
      },
      {
        nachRaum: 6, titel: 'Die Schneebrücke',
        text: 'Über eine Schlucht spannt sich eine Brücke aus Schnee, glatt wie Glas. Auf der anderen Seite wartet der Rest des Eisheers, '
          + 'und mitten auf der Brücke steckt eine Fahne aus Frostseide.',
        sicher: {
          label: 'Ein Stück zurück und aussen herum', wirkung: [xp(40)],
          nachklang: 'Wir gingen aussen um die Schlucht herum. Es dauerte, aber Schnee ist geduldig, und wir waren es auch.',
        },
        mutig: {
          label: 'Über die Brücke, mit Fahne', wirkung: [setTeil, gegner(25)],
          nachklang: 'Wir gingen über die Schneebrücke und nahmen die Frostfahne mit. Die Brücke hielt, aber das Eisheer drüben erkannte seine Fahne.',
        },
      },
    ],
    ende: 'Der Pass ist offen, das Salz kommt wieder, und die Bäckerin backt Brot, wie sie es mag. '
      + 'Vom Eisheer ist nur eine Statue übrig, die mitten auf dem Pass steht und in Richtung Magic City salutiert. Ich habe beschlossen, das als Kompliment zu nehmen.',
  },
  {
    routeId: 'obsidian_tunnels', titel: 'Glas aus dem Berg',
    einleitung: 'Der Glaser will Fenster bauen, richtige, durch die man durchsieht, und dafür braucht er schwarzes Glas aus den Obsidiantunneln. '
      + 'Er hat eine Liste gemacht. Sie ist sehr lang und sehr genau, und am Ende steht: «Bitte nicht zerbrechen.» '
      + 'In den Tunneln leben Feuergeister, die Glas mögen, solange es flüssig ist.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Glasgarten',
        text: 'In einer Höhle wachsen Obsidianplatten aus dem Boden wie Blätter aus einer Pflanze, dünn und glänzend. '
          + 'Flammengeister wärmen sich daran. Der Glaser würde für jede Platte ein Vermögen zahlen.',
        sicher: {
          label: 'Nur Bruchstücke sammeln', wirkung: [gold(30), xp(20)],
          nachklang: 'Wir sammelten nur Bruchstücke am Rand des Glasgartens. Der Glaser nannte das «Anfängerware» und kaufte trotzdem alles.',
        },
        mutig: {
          label: 'Ganze Platten brechen', wirkung: [gold(100), gegner(15, 2)],
          nachklang: 'Wir brachen ganze Obsidianplatten aus dem Glasgarten. Die Flammengeister waren gerade dabei, sich daran zu wärmen.',
        },
      },
      {
        nachRaum: 6, titel: 'Die Glutkammer',
        text: 'Am Ende der Tunnel liegt eine Kammer, in der flüssiges Glas in einem Becken kreist. Darin treibt ein Panzer aus Obsidian, fertig geschmiedet, '
          + 'als hätte der Berg ihn selbst gemacht. Die Hitze ist kaum auszuhalten.',
        sicher: {
          label: 'Draussen abkühlen', wirkung: [heilen(15)],
          nachklang: 'Wir kühlten uns vor der Glutkammer ab und liessen den Obsidianpanzer dem Berg. Er hat ihn schliesslich gemacht.',
        },
        mutig: {
          label: 'Den Panzer herausholen', wirkung: [setTeil, leben(10), gegner(25)],
          nachklang: 'Wir holten den Obsidianpanzer aus dem glühenden Becken. Es zischte, es roch nach Haaren, und die Feuergeister waren empört.',
        },
      },
    ],
    ende: 'Das Rathaus hat jetzt Fenster aus schwarzem Glas. Man sieht durch sie hindurch, nur alles ein bisschen dunkler und dramatischer. '
      + 'Der Glaser nennt es Kunst. Ich nenne es Rathaus. Wir haben uns auf «Kunstrathaus» geeinigt.',
  },

  // ── Ebene 4 ──
  {
    routeId: 'ruins_depths', titel: 'Das Buch des Lichs',
    einleitung: 'Unter den Ruinen schreibt jemand an unserer Geschichte mit, nur falsch. Jede Nacht ändert sich ein Wort in meiner Chronik. '
      + 'Aus «Stadt» wird «Grab», aus «Bäckerin» wird «Futter». Die Spur der Tinte führt in die tiefen Ruinen, zum Schattenlich, '
      + 'der ein Buch besitzt, das alles umschreibt, was darin steht. Er hat offenbar uns hineingeschrieben.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Bibliothek',
        text: 'Ein Saal voller verbrannter Bücher, und dazwischen ein paar unversehrte. Eines davon ist eine Chronik von Magic City, '
          + 'geschrieben in einer Zukunft, die es noch nicht gibt. Das letzte Kapitel ist versiegelt.',
        sicher: {
          label: 'Die Chronik zuklappen', wirkung: [xp(60)],
          nachklang: 'Wir klappten die Chronik aus der Zukunft zu, ohne das letzte Kapitel zu lesen. Manche Dinge muss man selber schreiben.',
        },
        mutig: {
          label: 'Das Siegel brechen', wirkung: [ding('talisman_fragment', 3), gegner(15, 3)],
          nachklang: 'Wir brachen das Siegel des letzten Kapitels. Der Text sprang heraus, lief uns voraus und las allen Untoten vor, wer wir sind.',
        },
      },
      {
        nachRaum: 6, titel: 'Die Tintenquelle',
        text: 'Aus einem Brunnen sprudelt schwarze Tinte, und mit ihr schreibt der Lich. Wer sie verschüttet, schwächt ihn. '
          + 'Wer sie abfüllt, könnte selbst damit schreiben. Am Brunnenrand liegen leere Fläschchen, ordentlich aufgereiht.',
        sicher: {
          label: 'Die Tinte verschütten', wirkung: [boss(-10)],
          nachklang: 'Wir verschütteten die Tinte des Lichs. Seine nächsten Zauber waren voller Kleckse.',
        },
        mutig: {
          label: 'Tinte abfüllen', wirkung: [gold(160), gegner(10, 2)],
          nachklang: 'Wir füllten Tinte des Lichs ab, sie ist ein Vermögen wert. Er schrieb uns dafür ein paar Gemeinheiten in die nächsten Kapitel.',
        },
      },
      {
        nachRaum: 9, titel: 'Die Krone',
        text: 'Vor der Halle seiner Leibwache liegt seine Krone auf einem Kissen, als wolle sie jemand stehlen. Ganz klar eine Falle. '
          + 'Auf der Krone steht in kleiner Schrift: «Für den nächsten Lich.»',
        sicher: {
          label: 'Die Falle umgehen', wirkung: [heilen(15)],
          nachklang: 'Wir liessen die Krone auf ihrem Kissen liegen. Wir haben genug Ämter in Magic City, wir brauchen kein neues.',
        },
        mutig: {
          label: 'Die Krone nehmen', wirkung: [setTeil, gegner(20)],
          nachklang: 'Wir nahmen die Krone des Lichs. Seine Leibwache wollte sie zurück, und zwar sofort.',
        },
      },
    ],
    ende: 'Das Buch des Lichs liegt jetzt bei mir, gut verschlossen, und meine Chronik stimmt wieder. Fast. '
      + 'Aus «Ziege» wurde «Bürgermeisterin», und das hat sich nicht mehr zurückverwandelt. Die Ziege trägt es mit Würde.',
  },
  {
    routeId: 'volcano_core', titel: 'Das Feuer des Wyrms',
    einleitung: 'Das Herz unter dem Platz will den Stein des Magma-Wyrms, und es fragt nicht mehr, es fordert. Nachts glühen die Pflastersteine. '
      + 'Der Wyrm schläft im Vulkankern auf einem Bett aus flüssigem Gestein, und jedes Mal, wenn er sich umdreht, bebt bei uns das Geschirr. '
      + 'Die Hauptstadt hat uns zur Sicherheit «viel Glück» gewünscht. Mehr schicken sie nicht.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Schmiede der Zwerge',
        text: 'Eine verlassene Zwergenschmiede am Lavastrom, der Amboss noch warm. Auf ihm liegt eine halb fertige Klinge, daneben eine Kiste mit Glutwurzeln, der Leibspeise des Wyrms. '
          + 'Der Lavastrom steigt. Langsam, aber er steigt.',
        sicher: {
          label: 'Weiterziehen', wirkung: [xp(60)],
          nachklang: 'Wir zogen an der Zwergenschmiede vorbei, bevor die Lava kam. Hinter uns floss sie über den Amboss, sehr ordentlich.',
        },
        mutig: {
          label: 'Die Schmiede ausräumen', wirkung: [ding('herb_fire_root', 4), gold(120), boss(5)],
          nachklang: 'Wir räumten die Zwergenschmiede aus, während die Lava stieg. Die Stiefel sind seither kürzer, und der Wyrm vermisst seine Glutwurzeln.',
        },
      },
      {
        nachRaum: 7, titel: 'Die Brüter',
        text: 'In einer Höhle voller Asche liegen Eier, die glühen. Magmabrüter wachen darüber und schnauben Funken. '
          + 'Wer leise ist, kommt an ihnen vorbei. Wer eines mitnimmt, hat ein sehr warmes Andenken.',
        sicher: {
          label: 'Leise vorbeigehen', wirkung: [heilen(15)],
          nachklang: 'Wir schlichen an den Eiern der Magmabrüter vorbei und rasteten erst, als ihr Schnauben weit hinter uns lag.',
        },
        mutig: {
          label: 'Ein Ei mitnehmen', wirkung: [setTeil, boss(15)],
          nachklang: 'Wir nahmen ein glühendes Ei mit. Es liegt jetzt in der Bäckerei und hält den Ofen warm. Der Wyrm hat das nicht gut gefunden.',
        },
      },
      {
        nachRaum: 12, titel: 'Der Atem des Wyrms',
        text: 'Vor dem Lager des Wyrms liegt ein Spalt im Fels, aus dem in gleichmässigen Stössen heisse Luft bläst. Er atmet. Er schläft noch. '
          + 'Neben dem Spalt glänzt sein Hort: geschmolzenes Gold in Pfützen.',
        sicher: {
          label: 'Den Spalt verschliessen', wirkung: [boss(-5), heilen(10)],
          nachklang: 'Wir verschlossen den Atemspalt mit Steinen. Der Wyrm wachte hustend auf, und Husten ist kein guter Start in einen Kampf.',
        },
        mutig: {
          label: 'Gold aus den Pfützen schöpfen', wirkung: [gold(200), boss(10)],
          nachklang: 'Wir schöpften flüssiges Gold aus dem Hort des Wyrms. Er roch es im Schlaf und kam hellwach.',
        },
      },
    ],
    ende: 'Der Magma-Wyrm ist besiegt und sein Stein auf dem Weg zum Herzen. Seit es ihn hat, ist es warm auf dem Platz, auch im Winter, '
      + 'und die Kinder backen Kartoffeln in den Ritzen zwischen den Pflastersteinen. Das Geschirr bebt nicht mehr. Nur der Platz schnurrt.',
  },
  {
    routeId: 'siege_fortress', titel: 'Die letzte Festung',
    einleitung: 'Die Hauptstadt gibt nicht auf. Sie hat die alte Festung über dem Tal besetzt und einen Festungswächter hineingesetzt, '
      + 'der nicht schläft, nicht isst und keine Briefe beantwortet. Er trägt einen Herzstein in seiner Rüstung, und das Herz will ihn. '
      + 'Ich habe der Hauptstadt geschrieben, dass wir kommen. Höflich. Mit Datum.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Vorräte',
        text: 'Im Vorhof stehen die Wagen mit den Vorräten der Festung: Pfeile, Pech, Proviant. '
          + 'Anzünden würde die Verteidiger schwächen. Plündern würde die Truhen füllen, aber es dauert, und man sieht euch von den Mauern.',
        sicher: {
          label: 'Die Wagen anzünden', wirkung: [gegner(-10, 2)],
          nachklang: 'Wir zündeten die Vorratswagen der Festung an. Ohne Pech und Pfeile wurden die Verteidiger sehr nachdenklich.',
        },
        mutig: {
          label: 'Die Wagen plündern', wirkung: [gold(160), ding('healing_potion', 2), boss(10)],
          nachklang: 'Wir plünderten die Vorratswagen. Von den Mauern aus sah man uns dabei zu, und der Festungswächter bekam einen genauen Bericht.',
        },
      },
      {
        nachRaum: 7, titel: 'Der Überläufer',
        text: 'Ein Kampfmagier winkt euch aus einem Fenster zu. Er will überlaufen, sagt er, und kennt den Weg zum Wächter. '
          + 'Dafür will er mit nach Magic City, mit Familie, drei Katzen und einer Bibliothek.',
        sicher: {
          label: 'Ihn mitnehmen', wirkung: [boss(-10)],
          nachklang: 'Wir nahmen den Kampfmagier mit, mit Familie, Katzen und Bibliothek. Er kannte die Schwachstelle des Wächters.',
        },
        mutig: {
          label: 'Seine Bibliothek allein mitnehmen', wirkung: [ding('talisman_fragment', 3), gold(80), gegner(30)],
          nachklang: 'Wir nahmen die Bibliothek des Kampfmagiers mit, aber nicht ihn. Er nahm das persönlich und zauberte entsprechend.',
        },
      },
      {
        nachRaum: 10, titel: 'Der Herzstein',
        text: 'Vor dem Bergfried pulsiert der Herzstein des Wächters durch die Mauer, rot und langsam. Man kann ihn von hier aus anzapfen, '
          + 'aber dann spürt der Wächter es. Oder man wartet auf den Kampf und nimmt ihn sich danach.',
        sicher: {
          label: 'Abwarten', wirkung: [heilen(15)],
          nachklang: 'Wir warteten mit dem Herzstein bis nach dem Kampf. Geduld ist eine Tugend, auch bei Belagerungen.',
        },
        mutig: {
          label: 'Den Stein anzapfen', wirkung: [setTeil, boss(20)],
          nachklang: 'Wir zapften den Herzstein durch die Mauer an. Der Festungswächter spürte es und kam mit voller Kraft.',
        },
      },
    ],
    ende: 'Die Festung gehört jetzt Magic City, mit Mauern, Türmen und einem Festungswächter weniger. '
      + 'Die Hauptstadt hat uns zum «befreundeten Nachbarn» ernannt. Ich habe das Schreiben neben den Steuerbrief gehängt. Sie passen gut zusammen.',
  },
  {
    routeId: 'ocean_abyss', titel: 'Das Licht im Abgrund',
    einleitung: 'Unter der Bucht, tiefer als der Leviathan je geschwommen ist, brennt ein Licht. Es ist grün, es blinkt in Abständen, '
      + 'und die Fischer schwören, es blinke ihren Namen. Zwei sind schon getaucht, um nachzusehen, und nicht zurückgekommen. '
      + 'Ich möchte nicht, dass das Licht auch meinen Namen kennt.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Anglerfisch',
        text: 'Das Licht hängt an einer Angel, und die Angel an einem Tiefseeangler, gross wie ein Haus. Er schläft, das Maul offen. '
          + 'Zwischen seinen Zähnen glitzern Dinge, die er verschluckt hat: Ringe, Münzen, ein Taucherhelm.',
        sicher: {
          label: 'Vorbeischwimmen', wirkung: [xp(60)],
          nachklang: 'Wir schwammen am schlafenden Anglerfisch vorbei. Sein Licht blinkte unsere Namen, aber falsch geschrieben.',
        },
        mutig: {
          label: 'In sein Maul greifen', wirkung: [gold(160), ding('air_crystal', 2), gegner(20)],
          nachklang: 'Wir griffen dem schlafenden Anglerfisch ins Maul. Er wachte auf und spuckte uns aus, samt Beute, mitten in das Revier einer Meeresschlange.',
        },
      },
      {
        nachRaum: 4, titel: 'Die Taucher',
        text: 'In einer Luftblase unter einem Felsvorsprung sitzen die zwei Fischer, verängstigt, aber lebendig. Ihre Luft reicht nicht mehr lange. '
          + 'Ihr könntet eure Luftkristalle mit ihnen teilen. Oder sie hierlassen und den Abgrund erst zu Ende plündern.',
        sicher: {
          label: 'Luft teilen', wirkung: [xp(60)],
          nachklang: 'Wir teilten unsere Luft mit den beiden Fischern. Es war eng, aber zu viert atmet man mutiger.',
        },
        mutig: {
          label: 'Später zurückkommen', wirkung: [setTeil, gegner(20, 2)],
          nachklang: 'Wir liessen die Fischer zurück und plünderten zuerst den Abgrund, bis hinunter, wo die grossen Räuber jagen. Wir kamen zurück, gerade noch rechtzeitig, und die Fischer sprechen bis heute nicht mit uns.',
        },
      },
      {
        nachRaum: 7, titel: 'Der Rausch',
        text: 'Hier unten wird alles bunt. Die Fische singen, die Felsen lachen, und ein Teil von euch möchte einfach hierbleiben. '
          + 'Tiefenrausch, sagt euer Verstand. Klingt nett, sagt der Rest.',
        sicher: {
          label: 'Langsam auftauchen', wirkung: [heilen(15)],
          nachklang: 'Wir tauchten langsam ein Stück auf, bis der Tiefenrausch vorbei war. Die Felsen hörten auf zu lachen. Schade eigentlich.',
        },
        mutig: {
          label: 'Weiter hinab', wirkung: [gold(180), gegner(20)],
          nachklang: 'Wir tauchten im Tiefenrausch weiter hinab und fanden Schätze, an die sich keiner mehr genau erinnert. Kämpfen im Rausch war schwierig.',
        },
      },
    ],
    ende: 'Das Licht im Abgrund ist aus, die Fischer sind zu Hause, und der Anglerfisch hat eine neue Angel. Sie blinkt jetzt nur noch «Hunger». '
      + 'Das finde ich ehrlicher.',
  },
  {
    routeId: 'shadow_catacombs', titel: 'Die Schattenklinge',
    einleitung: 'Jemand verkauft auf unserem Markt Schatten. Echte Schatten, abgeschnitten von ihren Besitzern, in Gläsern, zum Mitnehmen. '
      + 'Wer seinen Schatten verliert, wird blass und vergesslich. Die Spur des Verkäufers führt in die Schattenkatakomben, '
      + 'wo eine Klinge liegen soll, die Schatten schneidet. Ich prüfe jetzt jeden Morgen, ob meiner noch da ist.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Die Gläser',
        text: 'In einer Gruft stehen hunderte Gläser mit Schatten darin. Sie klopfen gegen das Glas. '
          + 'Auf manchen stehen Namen von Leuten aus Magic City. Auf anderen nur Preise.',
        sicher: {
          label: 'Alle Gläser öffnen', wirkung: [heilen(15), xp(60)],
          nachklang: 'Wir öffneten alle Schattengläser. Die Schatten flohen nach Hause, und am nächsten Tag hatte der Markt wieder Farbe.',
        },
        mutig: {
          label: 'Die teuren mitnehmen', wirkung: [gold(160), gegner(25, 2)],
          nachklang: 'Wir nahmen die teuren Schattengläser mit. Die anderen Schatten verfolgten uns und waren ausgesprochen schlecht gelaunt.',
        },
      },
      {
        nachRaum: 4, titel: 'Der Händler',
        text: 'Der Schattenhändler sitzt hinter einem Tisch aus Knochen und lächelt. Er bietet euch einen Handel an: '
          + 'Euer Schatten für einen Kampf lang, gegen eine Truhe Gold. Er gibt ihn danach zurück, sagt er. Fast unbenutzt.',
        sicher: {
          label: 'Ablehnen', wirkung: [xp(60)],
          nachklang: 'Wir lehnten den Handel des Schattenhändlers ab. Er lächelte weiter, aber nicht mehr so breit.',
        },
        mutig: {
          label: 'Den Schatten verleihen', wirkung: [gold(200), gegner(40)],
          nachklang: 'Wir liehen dem Schattenhändler unsere Schatten für einen Kampf. Ohne Schatten kämpft es sich seltsam, man weiss nie, wo man aufhört. Wir bekamen sie zurück, mit ein paar Knicken.',
        },
      },
      {
        nachRaum: 7, titel: 'Die Klinge',
        text: 'Die Schattenklinge steckt in einem Sarg, und der Sarg steckt in einer Wand. Wer sie herauszieht, zieht den Schatten der ganzen Katakombe mit. '
          + 'Lässt man sie stecken, schneidet niemand mehr Schatten, aber sie liegt dann eben hier.',
        sicher: {
          label: 'Den Sarg zumauern', wirkung: [gegner(-5, 2)],
          nachklang: 'Wir mauerten den Sarg mit der Schattenklinge zu. Die Schatten der Katakombe wurden blass und müde.',
        },
        mutig: {
          label: 'Die Klinge ziehen', wirkung: [setTeil, gegner(10, 2)],
          nachklang: 'Wir zogen die Schattenklinge aus dem Sarg. Der ganze Schatten der Katakombe hing daran und kam mit.',
        },
      },
    ],
    ende: 'Auf dem Markt werden keine Schatten mehr verkauft, und jeder in Magic City hat wieder einen. Fast jeder. '
      + 'Der Schatten des Händlers ist allein zurückgekommen und arbeitet jetzt bei mir im Archiv. Er ist fleissig und sehr leise.',
  },
  {
    routeId: 'ash_wastes', titel: 'Die Karawane',
    einleitung: 'Eine Karawane aus dem Süden ist in der Aschewüste verschollen, mit allem, was Magic City für den Winter bestellt hat: '
      + 'Gewürze, Stoffe und vierzig Fässer Lampenöl. Ihr Führer hat einen Notruf geschickt, mit Rauchzeichen. '
      + 'Ich konnte nur das letzte Zeichen lesen. Es hiess «Golems».',
    wahlen: [
      {
        nachRaum: 0, titel: 'Die Spur',
        text: 'Die Spur der Karawane führt in zwei Richtungen: gerade durch das Aschefeld, wo Flammengeister über den Glutspalten tanzen, '
          + 'oder in einem weiten Bogen um die Spalten herum. Der Bogen kostet einen halben Tag.',
        sicher: {
          label: 'Den Bogen nehmen', wirkung: [xp(60)],
          nachklang: 'Wir nahmen den weiten Bogen um die Glutspalten. Es dauerte, aber Asche lässt sich auch umgehen.',
        },
        mutig: {
          label: 'Gerade durch', wirkung: [gold(120), gegner(25)],
          nachklang: 'Wir gingen gerade durch das Aschefeld und fanden unterwegs, was frühere Karawanen verloren hatten. Die Flammengeister fanden uns.',
        },
      },
      {
        nachRaum: 4, titel: 'Die Wagen',
        text: 'Die Karawane steckt in der Asche fest, die Wagen halb versunken. Die Händler leben, nur das Lampenöl ist ausgelaufen und brennt. '
          + 'Ihr könnt die Wagen freischaufeln oder zuerst das Feuer löschen, bevor es die Gewürze erreicht.',
        sicher: {
          label: 'Das Feuer löschen', wirkung: [xp(50)],
          nachklang: 'Wir löschten das brennende Lampenöl, bevor es die Gewürze erreichte. Die Karawane duftet seither nach Zimt und Rauch.',
        },
        mutig: {
          label: 'Die Wagen freischaufeln', wirkung: [setTeil, gegner(15)],
          nachklang: 'Wir schaufelten die Wagen frei, während daneben das Öl brannte. Die Händler gaben uns, was im Feuer übrig blieb, und der Rauch lockte alles an, was in der Wüste brennt.',
        },
      },
      {
        nachRaum: 7, titel: 'Der Heimweg',
        text: 'Auf dem Rückweg zieht ein Aschesturm auf. Ihr könnt in einer Höhle warten, bis er vorbei ist, oder weiterziehen, '
          + 'und im Sturm sieht euch niemand, aber ihr seht auch niemanden.',
        sicher: {
          label: 'In der Höhle warten', wirkung: [heilen(15)],
          nachklang: 'Wir warteten den Aschesturm in einer Höhle ab. Die Händler erzählten Geschichten aus dem Süden, und die waren gut.',
        },
        mutig: {
          label: 'Durch den Sturm', wirkung: [gold(160), gegner(30)],
          nachklang: 'Wir zogen durch den Aschesturm und kamen schneller voran als gedacht. Den Magmabrüter sahen wir erst, als er vor uns stand.',
        },
      },
    ],
    ende: 'Die Karawane ist angekommen. Wir haben Gewürze, Stoffe und vier Fässer Lampenöl, von vierzig. '
      + 'Die Händler aus dem Süden wollen jetzt jedes Jahr kommen. Sie sagen, so freundliche Retter hätten sie noch nie gehabt. Ich glaube, sie meinten die Gruppe.',
  },
  {
    routeId: 'magma_caverns', titel: 'Die Esse',
    einleitung: 'Unser Schmied hat einen Traum, und der Traum hat eine Adresse: die Esse in den Magmahöhlen, wo früher die Zwerge Sterne geschmiedet haben. '
      + 'Sagt er. Dort brenne ein Feuer, das nie ausgeht, und wer daran schmiedet, schmiedet für immer. '
      + 'Ich habe gefragt, ob «für immer» nicht etwas lang sei für ein Hufeisen. Er hat nicht geantwortet, er hat gepackt.',
    wahlen: [
      {
        nachRaum: 1, titel: 'Der Zwergenweg',
        text: 'Ein alter Zwergenweg führt auf einer Brücke aus Ketten über einen Lavasee. Die Ketten glühen, und in der Mitte steht das Zollhaus der Zwerge, '
          + 'mit Fledermäusen unter dem Dach. Der lange Weg führt um den See herum, durch Asche und Geröll.',
        sicher: {
          label: 'Um den See herum', wirkung: [xp(60)],
          nachklang: 'Wir gingen um den Lavasee herum, durch Asche und Geröll. Es dauerte, aber Geröll beisst nicht.',
        },
        mutig: {
          label: 'Über die Kettenbrücke', wirkung: [gold(140), leben(10), gegner(25)],
          nachklang: 'Wir gingen über die glühende Kettenbrücke und leerten das Zollhaus der Zwerge, noch voller Münzen. Die Handschuhe sind hin, und die Fledermäuse unter dem Dach kamen mit.',
        },
      },
      {
        nachRaum: 6, titel: 'Der Wächter der Esse',
        text: 'Vor der Esse steht ein Aschegolem mit einer Zwergenschürze. Er wacht hier seit tausend Jahren und will nur eines: '
          + 'dass jemand den Blasebalg tritt, damit das Feuer nicht ausgeht. Er bietet euch dafür seinen Hammer an.',
        sicher: {
          label: 'Den Blasebalg treten', wirkung: [gegner(-10, 2)],
          nachklang: 'Wir traten den Blasebalg für den alten Aschegolem, eine Stunde lang. Er war so dankbar, dass er uns den Weg zeigte.',
        },
        mutig: {
          label: 'Den Hammer nehmen', wirkung: [setTeil, gegner(10, 2)],
          nachklang: 'Wir nahmen dem Aschegolem den Hammer und liessen den Blasebalg stehen. Das Feuer der Esse wurde kleiner, und alles in den Höhlen wurde wütend.',
        },
      },
      {
        nachRaum: 9, titel: 'Das ewige Feuer',
        text: 'Die Esse brennt tatsächlich, weiss und still. Der Schmied kniet davor und weint ein bisschen. '
          + 'Ihr könntet eine Glut mitnehmen, in einer Laterne aus Obsidian, aber das Feuer wehrt sich, wenn man es teilt.',
        sicher: {
          label: 'Nur zuschauen', wirkung: [xp(60), heilen(10)],
          nachklang: 'Wir sahen dem ewigen Feuer eine Weile zu, und der Schmied schmiedete an Ort und Stelle ein Hufeisen. Für immer.',
        },
        mutig: {
          label: 'Eine Glut mitnehmen', wirkung: [ding('herb_fire_root', 4), gold(120), gegner(35)],
          nachklang: 'Wir nahmen eine Glut des ewigen Feuers mit. Das Feuer schickte uns seine Hüter hinterher, und die Glut nahm uns die Augenbrauen. Sie brennt jetzt in der Schmiede von Magic City.',
        },
      },
    ],
    ende: 'Der Schmied ist zurück, mit Russ im Bart und einem Hufeisen, das nicht abkühlt. Er hat es über die Tür der Schmiede genagelt. '
      + 'Seither muss niemand mehr klopfen, man hört die Tür von selbst zischen. Er nennt das Kundendienst.',
  },

  // ── Über dem Vulkankern: die Entscheidungen sind die festen Wahl-Räume der Route ──
  {
    routeId: 'drachenhort', titel: 'Die Krone des Uralten',
    einleitung: 'Die Karte des Händlers ist wieder ein Stück länger geworden. Über dem Vulkankern steht jetzt ein Gipfel, und darunter, in krakeliger Schrift: «Ignarax, der Uralte. Hat alles.» '
      + 'Das stimmt wohl. Ignarax schläft auf dem grössten Hort der Welt, und er zählt ihn im Schlaf. '
      + 'Das Herz unter dem Platz brummt, seit es den Namen gehört hat. Es klingt hungrig.',
    wahlen: [],
    raumWahlen: {
      2: {
        titel: 'Der erste Haufen',
        text: 'Am Eingang des Horts türmen sich Münzen bis unter die Decke, so viele, dass sie von selbst ins Rutschen kommen. '
          + 'Weiter oben schnaubt etwas sehr Grosses im Schlaf und zählt: «… vierhunderttausendzwölf, vierhunderttausenddreizehn …»',
        nachklang: {
          a: 'Wir steckten den ersten Goldhaufen ein. Ignarax zählte im Schlaf nach und kam auf eine andere Zahl.',
          b: 'Wir liessen den ersten Goldhaufen liegen und rasteten daneben. Gold ist auch zum Anlehnen schön.',
        },
      },
      8: {
        titel: 'Die Edelsteinschale',
        text: 'Auf einem Sockel steht eine Schale voller Rubine, jeder so gross wie ein Hühnerei. Der Hortgolem, der sie bewacht hat, liegt in Trümmern. '
          + 'Er hätte es gemerkt. Ignarax merkt es auch, nur später.',
        nachklang: {
          a: 'Wir leerten die Edelsteinschale. Irgendwo oben zählte Ignarax die Rubine und kam ins Stocken.',
          b: 'Wir liessen die Rubine liegen und verbanden lieber unsere Wunden. Ignarax zählte ruhig weiter.',
        },
      },
      13: {
        titel: 'Die Drachenkrone',
        text: 'Direkt vor seiner Höhle liegt die Drachenkrone auf einem Kissen aus Goldmünzen. Natürlich ist das eine Falle. '
          + 'Aber was für eine Krone.',
        nachklang: {
          a: 'Wir nahmen die Drachenkrone. Ignarax wachte auf, bevor wir sie aufsetzen konnten.',
          b: 'Wir liessen die Krone liegen und sammelten Kraft für den Kampf. Klüger, aber weniger glänzend.',
        },
      },
    },
    ende: 'Ignarax ist besiegt, und sein Hort ist es auch, zumindest der Teil, den wir tragen konnten. Den Rest zählt jetzt das Herz unter dem Platz, '
      + 'das sich einen Herzstein aus dem Drachenschatz genommen hat. Es zählt laut und im Schlaf. Ich kann seither nicht mehr gut schlafen, aber ich bin reich.',
  },
  {
    routeId: 'himmelsarchiv', titel: 'Das Buch der Namen',
    einleitung: 'Ganz oben auf der Karte, über den Wolken, liegt ein Archiv, und dort, sagt der Händler, steht ein Buch mit allen Namen, die je geschrieben wurden. '
      + 'Auch meiner. Auch der von Magic City. Ein Oberarchivar wacht darüber, dass niemand etwas ändert, und er findet, wir hätten schon viel zu viel geändert. '
      + 'Ich bin Stadtschreiber. Ich muss dieses Archiv sehen, und wenn es das Letzte ist, was ich lese.',
    wahlen: [],
    raumWahlen: {
      2: {
        titel: 'Der Lesesaal',
        text: 'Im ersten Lesesaal liegen verbotene Bücher aufgeschlagen auf den Pulten, und zwischen den Seiten stecken Kristalle als Lesezeichen. '
          + 'Die Seiten flüstern. Wer zu lange liest, hört, was sie sagen.',
        nachklang: {
          a: 'Wir lasen das verbotene Buch und behielten die Kristall-Lesezeichen. Was die Seiten flüsterten, schreibe ich lieber nicht auf.',
          b: 'Wir lasen nicht und ruhten uns zwischen den Pulten aus. Die Bücher fanden das enttäuschend.',
        },
      },
      8: {
        titel: 'Die Baupläne',
        text: 'Hier liegen die Baupläne für Maschinen, die es noch nicht gibt, und für einige, die es nie geben sollte. '
          + 'Die Folianten sind so verboten, dass sie beim Aufschlagen zurückbeissen.',
        nachklang: {
          a: 'Wir schlugen die Magitech-Folianten auf. Sie bissen zurück, aber was wir sahen, war den Biss wert.',
          b: 'Wir liessen die Folianten zu. Manche Maschinen bauen sich besser nicht.',
        },
      },
      14: {
        titel: 'Das Buch der Namen',
        text: 'Da liegt es, auf einem Pult aus Wolken: das Buch der Namen. Jeder Name, der je geschrieben wurde, steht darin. '
          + 'Eurer ist rot unterstrichen.',
        nachklang: {
          a: 'Wir stahlen das Buch der Namen. Der Oberarchivar hat es gemerkt, bevor wir die Tür erreichten.',
          b: 'Wir liessen das Buch der Namen liegen. Unsere Namen blieben rot unterstrichen, aber wenigstens in Ruhe.',
        },
      },
    },
    ende: 'Der Oberarchivar ist besiegt, und das Himmelsarchiv steht offen. Ich habe darin meinen eigenen Eintrag gefunden: «Stadtschreiber, Magic City. Schreibt alles auf.» '
      + 'Das stimmt. Ich habe einen Satz dazugeschrieben, ganz klein, am Rand: «Und es lohnt sich.»',
  },

  // ── Zwischen den Sternen: auch hier sind die Entscheidungen die festen Wahl-Räume der Route ──
  {
    routeId: 'sternenschmiede', titel: 'Der Sternenschmied',
    einleitung: 'Über dem Himmelsarchiv geht die Karte weiter, mit Silbertinte zwischen die Sterne gezeichnet: ein Amboss und daneben «Korrund, der Sternenschmied. Nimmt keine Aufträge an.» '
      + 'Seit ein paar Nächten fehlen über Magic City Sterne, jede Nacht einer mehr; die Bäckerin zählt sie, weil sie als Erste wach ist, und gestern hat sie beim Zählen geweint. '
      + 'Wer Sterne schmiedet, weiss, wohin sie verschwinden, und Korrund wird es uns sagen, Aufträge hin oder her.',
    wahlen: [],
    raumWahlen: {
      2: {
        titel: 'Die Lehrlingsesse',
        text: 'In der ersten Halle glüht die Lehrlingsesse, an der Korrunds Funkenwichtel das Schmieden üben. '
          + 'Wer seine Waffe hineinhält, schlägt bis ganz nach oben härter zu; das Feuer nimmt sich dafür ein Stück von dem, der sie hält.',
        nachklang: {
          a: 'Wir hielten die Waffen in die Lehrlingsesse, bis die Klingen weiss glühten und die Finger rot.',
          b: 'Wir verschnauften am Kühltrog, während die Funkenwichtel uns nass spritzten und sich sehr lustig fanden.',
        },
      },
      8: {
        titel: 'Die grosse Esse',
        text: 'In der grossen Esse schmiedet Korrund die Sterne, und ein Ambossgolem tritt dazu den Blasebalg, Tag und Nacht, ohne hinzusehen. '
          + 'Die Glut hier macht jede Klinge besser und jede Hand schlechter.',
        nachklang: {
          a: 'Wir hielten die Waffen in die grosse Esse, und seither riechen sie nach Sternenstaub.',
          b: 'Wir kühlten uns lieber am Trog ab, und der Ambossgolem trat weiter den Blasebalg, als wären wir Luft.',
        },
      },
      14: {
        titel: 'Korrunds Amboss',
        text: 'Vor der letzten Tür steht Korrunds Amboss, und unter einem Tuch daneben glimmt ein halb fertiger Stern. '
          + 'Drinnen hämmert jemand, langsam und genau, wie einer, der keine Fehler macht.',
        nachklang: {
          a: 'Wir schärften unsere Waffen auf Korrunds Amboss nach, und drinnen hörte das Hämmern auf.',
          b: 'Wir liessen den Amboss in Ruhe und atmeten durch, während Korrund drinnen weiterhämmerte.',
        },
      },
    },
    ende: 'Korrund hat verloren und es genommen wie ein Handwerker: Seinen Hammer durften wir behalten, er habe einen zweiten, und gute Arbeit erkenne er auch dann, wenn sie sich gegen ihn richte. '
      + 'Dann hat er uns gezeigt, wofür er schmiedet: Hinter der Schmiede liegt der Sternenschlund, wo Nyxar die Sterne frisst, schneller, als ein Schmied allein sie nachschmieden kann. '
      + 'Allein ist er jetzt nicht mehr.',
  },
  {
    routeId: 'sternenschlund', titel: 'Der Sternenfresser',
    einleitung: 'Hinter Korrunds Schmiede wird die Karte schwarz, und mitten im Schwarz steht nur ein Wort: «Nyxar». '
      + 'Dort hält der Sternenfresser die Sterne, die er noch nicht gefressen hat, in Käfigen und Netzen, sagt Korrund, wie andere Leute Würste in der Speisekammer. '
      + 'Die Bäckerin zählt noch dreihundertzwölf Sterne über Magic City; wir gehen die übrigen holen, bevor Nyxar wieder Hunger hat.',
    wahlen: [],
    raumWahlen: {
      2: {
        titel: 'Der erste Stern',
        text: 'In einem Käfig aus schwarzem Glas zappelt ein Stern, kaum grösser als eine Laterne. '
          + 'Aus seinem Rand liesse sich Sternenstahl schlagen, genug für ein gutes Stück aus Korrunds Esse, und der Stern schaut uns an, als wüsste er das.',
        nachklang: {
          a: 'Wir schlugen Sternenstahl aus dem ersten Stern, und er leuchtet seither etwas schwächer und sehr vorwurfsvoll.',
          b: 'Wir bogen den Käfig auf, verbrannten uns die Finger und sahen den ersten Stern zurück an den Himmel sausen.',
        },
      },
      8: {
        titel: 'Das Sternennetz',
        text: 'Quer durch eine Höhle hängt ein Netz aus Licht, und darin kleben Sterne wie Fliegen. '
          + 'Lichtmotten flattern davor und passen auf, dass keiner entwischt, und ein Kometenkäfer passt auf die Lichtmotten auf.',
        nachklang: {
          a: 'Wir zerlegten einen der Sterne im Netz zu Sternenstahl, und die Lichtmotten flogen los, es Nyxar zu erzählen.',
          b: 'Wir zerrissen das Sternennetz, das wie Nesseln brannte, und die Sterne flogen davon, alle auf einmal.',
        },
      },
      14: {
        titel: 'Vor Nyxars Lager',
        text: 'Vor Nyxars Lager liegt der grösste Stern, den wir je gesehen haben, angekettet wie ein Hofhund. '
          + 'Er ist für später, für die Nacht, in der Nyxar richtig Hunger hat. Drinnen schmatzt es schon.',
        nachklang: {
          a: 'Wir schlugen Sternenstahl aus dem grössten Stern, und Nyxar hörte das Klopfen.',
          b: 'Wir lösten die Ketten des grössten Sterns, und als er aufstieg, wurde es im ganzen Schlund hell, auch dort, wo Nyxar lag.',
        },
      },
    },
    ende: 'Nyxar ist besiegt. Wir haben jeden Käfig und jedes Netz im Schlund geöffnet, und einen Stern, den er nicht mehr geschafft hat, haben wir mitgenommen. '
      + 'In der Nacht darauf kamen die Sterne über Magic City zurück, einer nach dem anderen, und die Bäckerin hat bis zum Morgen gezählt und zum ersten Mal in zwanzig Jahren das Brot verschlafen. '
      + 'Niemand hat sich beschwert.',
  },
];
