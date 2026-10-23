// ─── Magic City – Randnotizen im Monsterbuch ────────────────────
// Eine Notiz von Stadtschreiber Ottokar je Seite (Dungeon aus DUNGEON_GRAPH),
// sichtbar, sobald alle Gegner der Seite erforscht sind (docs/MONSTERBUCH.md).
// Nur über die Tiere, keine Handlung: die steht in dungeonGeschichten.ts.
// Jede Zahl stammt aus enemies.ts, lootTables.ts oder routes.ts und aus der
// Kampfregel in CombatEngine.ts (Stärkung und Beschwörung geben Angriff). Takt:
// Eine Fähigkeit mit Abklingzeit N kommt erst N + 1 Runden später wieder, eine
// zweite oder dritte oft noch später (Monsterkunde.einsatzRunden).
// Der Test tests/monsterbuch.test.ts prüft Route, Gegnernamen und Zeichen und
// jede Takt-Angabe am echten Kampf (Tabelle TAKT dort).
// ────────────────────────────────────────────────────────────────

export interface MonsterbuchNotiz {
  routeId: string;
  text: string;
}

export const MONSTERBUCH_NOTIZEN: MonsterbuchNotiz[] = [
  {
    routeId: 'forest_short',
    text: 'Die Waldspinne trifft mit ihrem Netz alle Helden zugleich, aber nur mit halber Wucht. Der Waldbär schlägt mit Zerfleischen doppelt so hart zu und bringt 5 bis 10 Gold, ein Waldwolf nur 2 bis 5.',
  },
  {
    routeId: 'forest_ruins',
    text: 'Auf der Lichtung stehen zwei Waldbanditen statt einem wie auf dem kurzen Waldpfad. Der Waldbär ist hier der einzige, der Kristallsplitter fallen lassen kann, in 6,4 von 100 Fällen.',
  },
  {
    routeId: 'forest_medium',
    text: 'Uralter Treant: ab Runde 8 wütend, Angriff mal 1,5, Tempo mal 1,3. Sein Rindenwall ist kein Schutz, sondern bringt ihm 3 Angriff mehr für drei Runden, zuerst in Runde 2 und danach nur alle acht Runden, weil sein Wurzelschlag vorgeht.',
  },
  {
    routeId: 'haunted_woods',
    text: 'Verfluchtes Irrlicht und Waldschamane heilen beide um 24 Leben, das Irrlicht jede vierte Runde, der Schamane jede fünfte. Von beiden kommen hier je drei. Wer zuerst die Heiler fällt, kämpft kürzer.',
  },
  {
    routeId: 'ocean_shallows',
    text: 'Der Quallenschwarm trifft mit Stromtentakel jede dritte Runde alle Helden; sein Luftsauger zieht dazu 10 Luft aus dem Schild. Die Druckkrabbe hat 7 Abwehr, mehr als jeder andere Gegner an dieser Küste.',
  },
  {
    routeId: 'ocean_depths',
    text: 'Der Leviathan wütet schon ab Runde 7, so früh wie von sich aus kein anderer Boss in diesem Buch: Angriff mal 1,6, Tempo mal 1,2. Sein Tiefenstrahl trifft jede dritte Runde alle Helden.',
  },
  {
    routeId: 'ocean_abyss',
    text: 'Ertrunkener Ritter: Flutfluch trifft alle Helden, Rostiger Hieb kommt jede dritte Runde. In der Abyssalen Tiefe kommen drei von ihnen und drei Tiefseeangler, einen Boss gibt es nicht.',
  },
  {
    routeId: 'cave_deep',
    text: 'Der Kristallkäfer lässt immer Kristallsplitter fallen, seine Beutetabelle kennt nichts anderes. Diamantpanzer schützt den Kristallgolem nicht, sondern gibt ihm 5 Angriff mehr für drei Runden.',
  },
  {
    routeId: 'cave_spider',
    text: 'Sechs Giftzahnspinnen je Lauf, mehr als von jedem anderen Gegner hier. Brut beschwören ruft keine Spinnen herbei: Die Spinnenkönigin bekommt damit vier Runden lang 3 Angriff mehr.',
  },
  {
    routeId: 'cave_tunnels',
    text: 'Höhlenschleim: mit Tempo 0,5 der langsamste Gegner in diesen Tunneln, aber seine Säure trifft alle Helden. Die Höhlenfledermaus hat keine Fähigkeit und gibt nur 3 XP.',
  },
  {
    routeId: 'crystal_mines',
    text: 'Sechs Kristallkäfer je Lauf, und jeder lässt Kristallsplitter fallen. Der Höhlentroll hält mit 150 Leben am längsten durch und bringt 8 bis 15 Gold.',
  },
  {
    routeId: 'swamp_long',
    text: 'Die Moorhexe heilt mit Dunkler Heilung jede vierte Runde um 30 Leben, nur die Sumpfhydra heilt mehr. Sumpfphantom und Hohlschatten kommen je nur einmal je Lauf vor; an ihnen hängt, wie schnell diese Seite erforscht ist.',
  },
  {
    routeId: 'swamp_village',
    text: 'Sumpftroll: 195 Leben bei Tempo 0,55, sein Keulenschlag trifft alle Helden. Im Sumpfdorf kommt nur einer vor, der Blutegelschwarm dagegen zweimal.',
  },
  {
    routeId: 'siege_walls',
    text: 'Mauerschütze und Armbrustschütze zielen bevorzugt auf die Kriegsmaschine. Der Torwächter hat 10 Abwehr, der Eiserne Kommandant wütet ab Runde 9.',
  },
  {
    routeId: 'frozen_pass',
    text: 'Fünf Skelettkrieger je Lauf. Knochenritter und Steinwächter kommen je nur einmal vor; der Steinwächter ist mit Tempo 0,6 der langsamste am Pass.',
  },
  {
    routeId: 'siege_fortress',
    text: 'Der Kampfmagier hat nur 32 Leben, so wenig wie kein anderer in der Festung. Seine Schutzbarriere schützt niemanden, sie heilt den Verbündeten mit den wenigsten Leben um 8. Sieben Burgverteidiger je Lauf; der Festungswächter wütet erst ab Runde 10.',
  },
  {
    routeId: 'ruins_crypts',
    text: 'Gefallener Ritter: ab Runde 8 wütend, Angriff mal 1,5, Tempo mal 1,3. Der Verwunschene Priester heilt jede vierte Runde um 27 Leben und gibt dabei nur 6 XP.',
  },
  {
    routeId: 'ruins_depths',
    text: 'Totenerweckung weckt keine Toten: Der Schattenlich bekommt damit vier Runden lang 1 Angriff mehr. Ernster ist sein Seelenraub, der jede vierte Runde kommt.',
  },
  {
    routeId: 'shadow_catacombs',
    text: 'Die Grabschrecke ist mit Tempo 1,5 der schnellste Gegner der Katakomben und trifft in 16 von 100 Schlägen kritisch. Einen Boss gibt es nicht, und jede Gegnerart kommt mindestens zweimal je Lauf vor.',
  },
  {
    routeId: 'obsidian_tunnels',
    text: 'Die Feuerfledermaus greift jede dritte Runde mit Flammensturz an. Einen Kristallstab lassen Feuerfledermaus, Obsidiankrabbe und Lavaelementar nur in 1,7 von 100 Fällen fallen, Aschegolem und Flammengeist in 9,8.',
  },
  {
    routeId: 'ash_wastes',
    text: 'Der Magmabrüter gibt sich mit Flammenaura jede vierte Runde 2 Angriff mehr. Der Aschegolem hat mit 204 Leben die meisten in der Wüste, ist mit Tempo 0,5 aber auch der langsamste.',
  },
  {
    routeId: 'magma_caverns',
    text: 'Lavaelementar: Magmawelle trifft jede fünfte Runde alle Helden. In den Magmahöhlen kommt keine der sechs Gegnerarten seltener als zweimal je Lauf vor.',
  },
  {
    routeId: 'volcano_core',
    text: 'Magma-Wyrm: Infernoodem trifft jede dritte Runde alle Helden, die Wut kommt ab Runde 10. Die Feuerfledermaus begegnet einem hier sechsmal je Lauf.',
  },
  {
    routeId: 'drachenhort',
    text: 'Ignarax, der Uralte: 959 Leben, Wut ab Runde 10. Den Seelenbrecher lässt er in 12 von 100 Fällen fallen, Glutwyrmling und Hortkobold nur in 3,3.',
  },
  {
    routeId: 'himmelsarchiv',
    text: 'Der Oberarchivar heilt sich mit Neuauflage um 150 Leben, aber nur in Runde 3 und 14, weil seine zwei anderen Fähigkeiten vorgehen. Der Flüstergeist heilt mit Stiller Restaurierung um 70 und kommt fünfmal je Lauf.',
  },
  {
    routeId: 'sternenschmiede',
    text: 'Sieben Funkenwichtel je Lauf, mit Tempo 1,5. Der Ambossgolem hat 15 Abwehr; Korrund, der Sternenschmied, wütet ab Runde 10.',
  },
  {
    routeId: 'sternenschlund',
    text: 'Nyxars Brut ist mit Tempo 1,6 schneller als alles andere im Schlund. Der Kometenkäfer hat mit 17 die höchste Abwehr hier, Nyxar selbst nur 13.',
  },
  {
    routeId: 'mondhof',
    text: 'Die Mondwache hat 615 Leben und 19 Abwehr. Der Silberschreiber heilt mit Pfandzettel um 105 Leben; Argentis, der Mondvogt, wütet ab Runde 10.',
  },
  {
    routeId: 'morgentor',
    text: 'Der Torhüter aus Messing hat 23 Abwehr, die höchste am Morgentor. Sunna, die Tagwächterin, schlägt mit 77 Angriff zu und wütet ab Runde 10. Jedes Vorstellen der Sonnenuhr zieht ihre Wut um 2 Runden vor, dreimal vorgestellt wütet sie schon ab Runde 4.',
  },
];
