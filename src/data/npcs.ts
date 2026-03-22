export interface NpcDef {
  id: string;
  name: string;
  routes: string[];          // Routen wo dieser NPC gefunden werden kann
  rescueChance: number;      // Prozentsatz (0.05 oder 0.10)
  spriteKey: string;
  unlockEffect: {
    type: 'building' | 'recipe' | 'bonus';
    buildingId?: string;
    description: string;    // Was wird freigeschaltet (UI-Text)
  };
  dialogue: string;          // Kurzer Dialog nach Rettung
  background: string;        // Charakter-Hintergrund
}

export const NPC_DEFS: Record<string, NpcDef> = {
  builder: {
    id: 'builder',
    name: 'Baumeister',
    routes: ['ruins', 'volcano'],
    rescueChance: 0.10,
    spriteKey: 'NPC_BUILDER',
    unlockEffect: {
      type: 'building',
      buildingId: 'WAR_MACHINE_WORKSHOP',
      description: 'Schaltet die Kriegsmaschinen-Werkstatt frei',
    },
    dialogue: 'Ihr habt mich befreit. Gut. Zeigt mir eure Pläne – ich kann das besser machen.',
    background: 'Er war Gefangener der Ruinen-Wächter und baute ihnen Fallen. Gute Fallen. Jetzt baut er lieber für die, die ihn befreit haben. Er redet wenig, seine Pläne sprechen für ihn.',
  },
  runesmith: {
    id: 'runesmith',
    name: 'Runenschmied',
    routes: ['ruins'],
    rescueChance: 0.10,
    spriteKey: 'NPC_RUNESMITH',
    unlockEffect: {
      type: 'recipe',
      description: 'Schaltet Resistenz-Items frei (Feuer-, Eis-, Giftschutz)',
    },
    dialogue: 'Runen schützen. Das ist ihr Zweck. Lasst mich anfangen.',
    background: 'Eine Frau, deren Hände mehr Runen tragen als freie Haut. Sie schmiedete Widerstandsamulette für Soldaten der alten Ordnung. Sie schmiedet sie jetzt für die nächste Ordnung – welche das auch sein wird.',
  },
  herbalist: {
    id: 'herbalist',
    name: 'Kräuterkundiger',
    routes: ['swamp', 'ruins'],
    rescueChance: 0.10,
    spriteKey: 'NPC_HERBALIST',
    unlockEffect: {
      type: 'recipe',
      description: 'Schaltet T2-Trankrezepte frei (Kraft, Mana, Gegengift, Titan, Schnelligkeit)',
    },
    dialogue: 'Der Sumpf lehrt Geduld. Und was wächst. Ich zeige euch beides.',
    background: 'Er hat mehr über Sumpfkräuter gelernt, als irgendjemand freiwillig gelernt hätte. Er war drei Jahre im Sumpf. Er riecht noch etwas danach. Seine Tränke funktionieren trotzdem.',
  },
  merchant: {
    id: 'merchant',
    name: 'Händler',
    routes: ['forest', 'volcano'],
    rescueChance: 0.10,
    spriteKey: 'NPC_MERCHANT',
    unlockEffect: {
      type: 'building',
      buildingId: 'MARKETPLACE',
      description: 'Schaltet den Marktplatz frei',
    },
    dialogue: 'Ein Markt braucht Vertrauen. Den hab ich mitgebracht.',
    background: 'Er hatte in der alten Welt Handelsrouten auf drei Kontinenten. Jetzt hat er Valdris. Er findet das – nach einer Pause – in Ordnung. Ein Markt ist ein Markt.',
  },
  healer: {
    id: 'healer',
    name: 'Heiler',
    routes: ['forest', 'swamp'],
    rescueChance: 0.10,
    spriteKey: 'NPC_HEALER',
    unlockEffect: {
      type: 'bonus',
      description: 'HP-Regen +30% schneller – verletzte Helden erholen sich deutlich schneller',
    },
    dialogue: 'Eure Verwundeten? Bringt sie zu mir.',
    background: 'Eine stille Heil-Meisterin, die nicht viel spricht. Ihre Hände arbeiten besser als Worte. Mit ihr in der Stadt werden verwundete Helden deutlich schneller wieder einsatzfähig.',
  },
  cartographer: {
    id: 'cartographer',
    name: 'Kartograf',
    routes: ['cave'],
    rescueChance: 0.10,
    spriteKey: 'NPC_CARTOGRAPHER',
    unlockEffect: {
      type: 'bonus',
      description: 'Dungeon-Routenvorschau – zeigt Gefahren und Kammern vor dem Betreten',
    },
    dialogue: 'Ich habe diese Routen kartiert. Ich zeige euch, was euch erwartet.',
    background: 'Ein begeisterter Kartograph, dessen Augen mehr sehen als die meisten. Seine Karten zeigen nicht nur die Route, sondern auch versteckte Kammeränderungen und potenzielle Gefahren.',
  },
  architect: {
    id: 'architect',
    name: 'Architekt',
    routes: ['cave', 'ruins'],
    rescueChance: 0.05,
    spriteKey: 'NPC_ARCHITECT',
    unlockEffect: {
      type: 'bonus',
      description: 'T2-Gebäudeausbauten freischalten – bestehende Gebäude können aufgewertet werden',
    },
    dialogue: 'Diese Stadt... hat Potenzial. Gebt mir Zeit.',
    background: 'Eine Perfektionistin. Sie sah die Stadt von weitem und stöhnte laut. Seit sie freigeschaltet ist, redesignt sie still bestehende Gebäude. Die Ergebnisse sind unmissverständlich besser.',
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arkanist',
    routes: ['volcano'],
    rescueChance: 0.05,
    spriteKey: 'NPC_ARCANIST',
    unlockEffect: {
      type: 'building',
      buildingId: 'ARCANE_SMITHY',
      description: 'Schaltet die Arkanschmiede frei',
    },
    dialogue: 'Ich weiß, was die alten Maschinen wollten. Lasst uns das nutzen.',
    background: 'Überlebender eines Arkan-Labors, das explodierte. Warum er überlebte, erklärt er nicht. Was er weiß, ist mehr als alles, was die Stadt über Magitech hat. Er gibt es weiter – gegen gutes Essen und einen trockenen Raum.',
  },
  alchemist: {
    id: 'alchemist',
    name: 'Alchemist',
    routes: ['swamp'],
    rescueChance: 0.05,
    spriteKey: 'NPC_ALCHEMIST',
    unlockEffect: {
      type: 'bonus',
      description: 'Kombinierte Tränke – zwei Trankeffekte können zusammengeführt werden',
    },
    dialogue: 'Gifte und Heilmittel – die Grenze ist Ansichtssache.',
    background: 'Ein Experimentierer, der die Grenzen zwischen Giften und Heilmitteln verschwimmen lässt. Mit seiner Hilfe können zwei Trank-Effekte kombiniert werden – mit unvorhersehbaren, aber oft starken Folgen.',
  },
  mercenary_leader: {
    id: 'mercenary_leader',
    name: 'Söldnerführer',
    routes: ['ruins'],
    rescueChance: 0.05,
    spriteKey: 'NPC_MERCENARY_LEADER',
    unlockEffect: {
      type: 'bonus',
      description: 'Söldner-System – erfahrene Söldner können für Gold angeheuert werden',
    },
    dialogue: 'Gold zahlt. Ich liefere. So einfach.',
    background: 'Ein harter Veteran mehrerer Kriege. Er rekrutiert schnell, trainiert schnell, denkt schnell. Mit ihm können erfahrene Söldner für Gold angeheuert werden – kurzzeitig, aber effektiv.',
  },
};
