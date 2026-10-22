// ============================================================
// Magic City – Zentrale Sprite-Registry
// ============================================================
// Einzige Quelle der Wahrheit für ALLE Sprite-Definitionen.
// Wird von generateSprites.ts und dem Spiel selbst genutzt.
//
// Wenn du an einer Stelle im Code einen neuen Sprite brauchst:
// 1. Füge ihn hier in die passende Kategorie ein
// 2. Laufe: npm run sprite-check  (zeigt fehlende Sprites)
// 3. Laufe: npm run generate-sprites  (generiert fehlende)
// 4. Laufe: npm run resize-sprites  (skaliert auf Zielgröße)
// ============================================================

// ─── Style-Prompts (einheitlich für alle Sprites) ────────────

export const STYLES = {
  BUILDING: `
2D cartoon illustration style, isometric 3/4 perspective view,
fantasy medieval city builder game, vibrant warm colors with magical accents,
clean outlines, smooth shading, hand-painted look,
solid bright magenta background (#FF00FF),
single building centered in frame, no text, no labels, no UI elements,
rich color palette, detailed but clean,
inspired by mobile city builder games like Clash of Clans and Warcraft`.trim(),

  UNIT: `
2D cartoon illustration style, front-facing 3/4 view,
fantasy medieval RPG hero character,
vibrant colors, clean outlines, smooth shading, expressive pose,
solid bright magenta background (#FF00FF),
single character centered, no text, no labels,
detailed proportions, semi-chibi style,
inspired by mobile RPG character art`.trim(),

  ENEMY: `
Dramatic 2D cartoon illustration style, front-facing 3/4 view,
fantasy medieval RPG monster creature, menacing and full of personality,
vibrant saturated colors with strong contrast, clean black outlines,
smooth cel-shading with bright highlights and deep shadows,
solid bright magenta background (#FF00FF),
single creature centered and large, filling 75% of image height,
dynamic aggressive pose suggesting movement or impending attack,
no text, no labels, detailed creature design with visible texture and unique silhouette,
inspired by Hearthstone card art and Clash Royale troop designs, high quality game asset`.trim(),

  BOSS: `
Dramatic 2D cartoon illustration style, front-facing 3/4 view,
fantasy medieval RPG BOSS monster, supremely imposing and terrifying,
vibrant saturated colors with dramatic cinematic lighting, powerful contrast,
thick clean black outlines, painterly digital art style with glowing special effects,
solid bright magenta background (#FF00FF),
single massive creature centered, filling 85% of image height, large and epic in scale,
no text, no labels, powerful dramatic pose radiating raw threat and dominance,
highly detailed design with glowing elements, rich texture, unique unforgettable silhouette,
inspired by Hearthstone legendary card art and Diablo boss monster designs`.trim(),

  ITEM: `
2D cartoon illustration style, icon view from slightly above,
fantasy medieval RPG item icon,
vibrant colors, clean outlines, recognizable silhouette,
solid bright magenta background (#FF00FF),
single item centered, no text, no labels,
clean and detailed icon style,
inspired by modern RPG inventory icons`.trim(),

  ITEM_EPIC: `
Stunning modern fantasy RPG legendary item concept art, single item centered and MASSIVE filling 90% of the frame,
AAA game quality full-color digital oil painting — NOT pixel art, NOT cartoon, NOT sketchy,
ultra-detailed surface textures: visible metal scratches, gem facets catching light, leather grain, etched runes,
dramatic cinematic lighting with strong warm key light from top-right, deep atmospheric shadow on left,
vivid magical energy: blazing elemental glow, sparkling particle trails, aura radiating outward,
inspired by Diablo IV legendary weapons and Destiny exotic armor — that same jaw-dropping visual quality,
solid bright magenta background (#FF00FF), no text, no labels, no UI elements, no ground, no pedestal,
the item must look OVERWHELMINGLY POWERFUL — the kind of weapon that ends wars`.trim(),

  ICON: `
Bold modern mobile game UI icon, single large symbol centered in frame,
the icon symbol fills at least 75% of the image area,
vibrant saturated colors with strong contrast, clean black outlines,
smooth cel-shading with highlights and shadows, 3D-looking rounded icon style,
solid bright magenta background (#FF00FF),
no text, no letters, no border frame around the icon,
immediately recognizable silhouette at small sizes,
inspired by Clash of Clans Supercell icon style and premium mobile game UI,
high quality game asset`.trim(),

  SPECIALIST: `
2D cartoon illustration style, portrait view, head and shoulders,
fantasy medieval RPG character portrait,
vibrant colors, clean outlines, expressive face,
solid bright magenta background (#FF00FF),
single character centered, no text,
detailed with smooth shading`.trim(),

  TERRAIN: `
2D cartoon illustration style, top-down view,
fantasy medieval tileset, seamless tile,
vibrant natural colors, smooth shading,
clean and detailed`.trim(),

  UI_ELEMENT: `
2D cartoon illustration style, fantasy medieval game UI element,
hand-painted look, warm rich colors, ornamental details,
clean edges suitable for 9-slice scaling,
solid bright magenta background (#FF00FF),
no text, no labels, inspired by Clash of Clans and mobile RPG UI design`.trim(),

  ISO_BUILDING: `
2D cartoon illustration style, TRUE isometric 45-degree left-front perspective,
the building is viewed from slightly above-left so THREE faces are visible:
- TOP FACE (roof) clearly visible at the top
- LEFT WALL visible on the left side
- FRONT WALL visible on the right-front side
fantasy medieval city builder, vibrant warm colors, magical accents,
clean black outlines, smooth cel-shading, hand-painted look,
solid bright magenta background (#FF00FF),
single building centered in frame filling 70% of image height,
no text, no UI, rich color palette,
inspired by Clash of Clans and Boom Beach building art, high quality game asset`.trim(),

  ISO_TREE: `
2D cartoon illustration style, TRUE isometric 45-degree perspective,
fantasy medieval game nature asset, vibrant saturated colors,
clean black outlines, smooth cel-shading, hand-painted look,
solid bright magenta background (#FF00FF),
single tree centered in frame, trunk in lower portion, canopy filling upper 2/3,
the tree casts a subtle isometric shadow to the lower-right,
no text, no labels, high quality game asset`.trim(),

  ISO_TERRAIN: `
2D cartoon illustration style, isometric diamond tile viewed from above-left,
fantasy medieval game terrain tile, exactly fills a diamond/rhombus shape,
the diamond tile has a visible left face (darker) and top face (lighter),
vibrant natural colors, clean edges, smooth cel-shading,
solid bright magenta background (#FF00FF),
tileable terrain texture, no text, no labels, high quality game asset`.trim(),

  PORTRAIT: `
Dramatic fantasy character art, full-body illustration,
fantasy medieval RPG hero in a powerful heroic pose,
vibrant dramatic lighting with strong highlights and deep shadows,
painterly digital art style with rich color depth, detailed textures,
solid bright magenta background (#FF00FF),
single character centered and tall, filling 85% of image height,
full body visible from head to toe, armor and weapon clearly shown,
no text, no labels, no UI, high quality game art,
inspired by Hearthstone card art and Diablo character splash art`.trim(),
  ISO_BUILDING_SCIFI: `
2D cartoon illustration style, TRUE isometric 45-degree left-front perspective,
the building is viewed from slightly above-left so THREE faces are visible:
- TOP FACE (roof) clearly visible at the top
- LEFT WALL visible on the left side
- FRONT WALL visible on the right-front side
SCI-FI MEDIEVAL / TECHNO-FANTASY style: massive riveted metal plates combined with rough stone and heavy oak wood,
visible glowing BLUE or PURPLE arkan-energy veins pulsing through walls and roof,
reinforced struts and inlaid crystals on the structure,
the building sits on a platform of dark metallic plates with energy conduit lines,
vibrant warm colors with cool blue/purple energy accents, magical glowing details,
clean black outlines, smooth cel-shading, hand-painted look,
solid bright magenta background (#FF00FF),
single building centered in frame filling 70% of image height,
no text, no UI, rich color palette,
inspired by Arcane (Netflix) architectural style blended with Clash of Clans art, high quality game asset`.trim(),

  ISO_BUILDING_DARK: `
2D cartoon illustration style, TRUE isometric 45-degree left-front perspective,
the building is viewed from slightly above-left so THREE faces are visible:
- TOP FACE (roof) clearly visible at the top
- LEFT WALL visible on the left side
- FRONT WALL visible on the right-front side
CYBERPUNK / DARK INDUSTRIAL style: near-black and dark charcoal concrete brutalist multi-story structure,
external pipes, thick cables and conduits running exposed across the facade,
neon accent lights in cyan/teal strips and warm orange glow from windows and signs,
weathered grungy surfaces with rust stains and scratches, metal railings on balconies,
dramatic high-contrast between the dark mass and vivid neon/amber accents,
air conditioning units, satellite dishes and antennas on roof,
clean black outlines, smooth cel-shading, hand-painted cartoon look,
solid bright magenta background (#FF00FF),
single building centered in frame filling 70% of image height,
no text, no UI, rich dark color palette,
inspired by Cyberpunk 2077 city buildings and Shadowrun tabletop art, high quality game asset`.trim(),

  ISO_BUILDING_WARM: `
2D cartoon illustration style, TRUE isometric 45-degree left-front perspective,
the building is viewed from slightly above-left so THREE faces are visible:
- TOP FACE (roof) clearly visible at the top
- LEFT WALL visible on the left side
- FRONT WALL visible on the right-front side
STEAMPUNK / WARM INDUSTRIAL style: light grey and beige walls with rust-brown and copper metallic accents,
many visible external pipes, pressure tanks, steam vents and brass fittings running across the building,
warm amber-orange glowing windows with cozy interior light, lanterns with soft flame glow,
plants, vines and flowers growing on walls and balconies adding organic warmth and life,
rounded dome elements, riveted metal tanks and steam chimneys on the roof,
charming, lively and inviting despite its industrial character,
clean black outlines, smooth cel-shading, cartoon 3D render look,
solid bright magenta background (#FF00FF),
single building centered in frame filling 70% of image height,
no text, no UI, warm and richly detailed,
inspired by Arcane (Netflix) Piltover district and Studio Ghibli industrial buildings, high quality game asset`.trim(),

} as const;

// ─── Typen ───────────────────────────────────────────────────

export type SpriteCategory =
  | "building" | "unit" | "enemy" | "boss"
  | "item" | "terrain" | "icon" | "specialist" | "ui";

export type SpritePhase = "mvp" | "post-mvp";

export interface SpriteDefinition {
  key: string;
  category: SpriteCategory;
  prompt: string;
  targetWidth: number;
  targetHeight: number;
  phase: SpritePhase;        // mvp = jetzt, post-mvp = später
  description: string;       // Kurzbeschreibung für Logs
  rarityColor?: string;      // 'green'|'blue'|'violet'|'orange' → Hintergrund-Gradient nach remove-bg
  keepBackground?: boolean;  // true = KI generiert Hintergrund selbst, remove-bg komplett überspringen
}

// ─── Helper ──────────────────────────────────────────────────

function sprite(
  key: string,
  category: SpriteCategory,
  w: number, h: number,
  phase: SpritePhase,
  description: string,
  prompt: string,
  rarityColor?: string,
  keepBackground?: boolean
): SpriteDefinition {
  return { key, category, prompt, targetWidth: w, targetHeight: h, phase, description, rarityColor, keepBackground };
}

// Rarity-colored icon background: T1=green, T2=blue, T3=violet, T4=orange
function rarityIcon(item: string, bgColor: string, colorFamily: string): string {
  return `Create a single fantasy mobile RPG item icon of a ${item}. The icon must have a visible ${bgColor} background tile matching the ${colorFamily} theme. The item is centered on top of the tile. Do not use black backgrounds.

The background tile should be bright, magical, smooth, polished, and clearly visible, with soft glow, subtle gradients, magical energy, and faint decorative texture, but still clean enough to keep the item readable. The assigned color must fill the whole background area behind the item.

Style: premium fantasy mobile game item icon, epic MMORPG loot, stylized but detailed, polished rendering, highly readable at small size, strong silhouette, ornate fantasy craftsmanship, glowing magical effects, clean outlines, centered composition, collectible inventory art.

Layout: single square icon tile, centered item, no overlap, no cropped object, balanced composition, game-ready icon.

No text, no logo, no watermark, no characters, no hands, no environment, no scene, no UI windows, no decorative card frame, no black background.`.trim();
}

// =============================================================
// SPRITE-REGISTRY – Alle Sprites des Spiels
// =============================================================
// Füge neue Sprites einfach in die passende Sektion ein.
// Der Generator und das Check-Tool lesen automatisch von hier.
// =============================================================

export const SPRITE_REGISTRY: SpriteDefinition[] = [

  // ═══════════════════════════════════════════════════════════
  // GEBÄUDE (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("FARM_GRAIN", "building", 256, 256, "mvp",
    "Getreidefarm",
    `Isometric 3/4 top-down perspective of a medieval fantasy grain farm on a grassy plot.
Every part of the image is filled with scenery: green grass, a dirt path, wooden fence border.
Brown plowed field rows with green sprouting wheat and golden ripe wheat ears,
a small rustic wooden farmhouse in the corner with thatched roof, a scarecrow in the field,
a wooden cart with hay bales, chickens pecking in the grass, trees along the back edge.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The farm is the main focus at 80% of the frame. No text, no labels.`),

  sprite("MILL_WIND", "building", 256, 256, "mvp",
    "Windmühle",
    `Isometric 3/4 top-down perspective of a medieval fantasy stone windmill on a grassy hill.
Every part of the image is filled with scenery: green grass hillside, wildflowers, a stone path.
A circular grey stone windmill tower with four large wooden windmill blades spinning,
brown wooden door at the base, small windows, sacks of flour stacked outside,
a wooden wheelbarrow nearby, bushes and a low stone wall around the base, trees in the background.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The windmill is the main focus at 75% of the frame. No text, no labels.`),

  sprite("BAKERY", "building", 256, 256, "mvp",
    "Bäckerei",
    `Isometric 3/4 top-down perspective of a medieval fantasy bakery in a cozy village setting.
Every part of the image is filled with scenery: cobblestone ground, green grass patches, flowers.
A cozy stone bakery with warm orange glow from the oven visible through the window,
stone chimney with wisps of smoke, wooden door with a bread sign hanging above it,
a small wooden display table outside with bread loaves, barrels and crates nearby,
a wooden bench, hanging flower baskets, warm inviting atmosphere, trees behind.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The bakery is the main focus at 75% of the frame. No text, no labels.`),

  sprite("LUMBER_CAMP", "building", 256, 256, "mvp",
    "Holzfällerlager",
    `Isometric 3/4 top-down perspective of a medieval fantasy lumber camp in a forest clearing.
Every part of the image is filled with scenery: green grass, fallen leaves, dirt ground.
A small wooden log cabin with sloped roof, an axe embedded in a tree stump,
neat stacks of cut logs beside the cabin, a sawing bench, wood chips scattered around,
tall pine and oak trees surrounding the clearing, a wooden fence section, a lantern hanging.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The lumber camp is the main focus at 75% of the frame. No text, no labels.`),

  sprite("QUARRY", "building", 256, 256, "mvp",
    "Steinbruch",
    `Isometric 3/4 top-down perspective of a medieval fantasy stone quarry on rocky terrain.
Every part of the image is filled with scenery: rocky ground, gravel, sparse grass.
An exposed grey rock face with chisel marks, a small mining cart on wooden rails,
pickaxes leaning against rocks, piles of cut stone blocks neatly stacked,
a wooden crane with ropes, a small work shelter with a wooden roof, lanterns for light,
rocky boulders and sparse bushes around the edges.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The quarry is the main focus at 80% of the frame. No text, no labels.`),

  sprite("WAREHOUSE", "building", 256, 256, "mvp",
    "Lagerhaus",
    `Isometric 3/4 top-down perspective of a medieval fantasy warehouse on a cobblestone yard.
Every part of the image is filled with scenery: cobblestone ground, grass edges, wooden crates.
A large wooden warehouse with double barn doors open, brown timber walls,
visible wooden crates and barrels inside, a loading platform at the front,
stacked barrels and sacks outside, a wooden cart for deliveries, rope coils,
a lantern hanging by the door, trees and bushes along the back.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The warehouse is the main focus at 75% of the frame. No text, no labels.`),

  sprite("HOUSE_T1", "building", 256, 256, "mvp",
    "Wohnhaus Stufe 1",
    `Isometric 3/4 top-down perspective of a cozy medieval fantasy cottage in a small garden.
Every part of the image is filled with scenery: green grass lawn, a stone walkway, flowers.
A cozy wooden house with plank walls, triangular brown thatched roof,
one small yellow-lit window, wooden door, tiny stone chimney with faint smoke,
flower boxes under the window, a small garden fence, a tree beside the house,
potted plants by the door, a wooden bench, clothesline in the back.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The house is the main focus at 70% of the frame. No text, no labels.`),

  sprite("GUILD_HALL", "building", 384, 384, "mvp",
    "Gildenhalle",
    `Isometric 3/4 top-down perspective of a medieval fantasy adventure guild hall in a forest clearing.
Every part of the image is filled with scenery: green grass on the ground, tall leafy trees filling the top and sides,
a cobblestone path leading to the entrance, wildflowers scattered in the grass, a wooden fence along one edge.
The guild hall is a grand stone and dark timber building with a steep slate roof, golden weathervane,
large ornate wooden double door with torch sconces, arched windows with warm amber glow,
a quest notice board with scrolls pinned to it, a weapon rack leaning on the wall, a hanging guild sign.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The building is the main focus at 75% of the frame. No text, no labels.`),

  sprite("WELL", "building", 256, 256, "mvp",
    "Brunnen",
    `Isometric 3/4 top-down perspective of a medieval fantasy stone well in a village square.
Every part of the image is filled with scenery: cobblestone plaza, green grass patches, flowers.
A circular cobblestone well with a small wooden roof overhead, rope and wooden bucket,
blue shimmering magical water visible inside with a faint blue glow,
stone benches nearby, potted flowers around the well, hanging lanterns,
a wooden signpost, trees and bushes along the edges.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The well is the main focus at 65% of the frame. No text, no labels.`),

  sprite("HERB_GARDEN", "building", 256, 256, "mvp",
    "Kräutergarten",
    `Isometric 3/4 top-down perspective of a medieval fantasy herb garden in a lush setting.
Every part of the image is filled with scenery: rich green grass, garden soil, stone borders.
Neat rectangular garden beds with colorful herbs and flowers in green, purple, red and yellow,
a wooden border fence around the garden, a small wooden potting shelf with clay pots,
a watering can, garden tools leaning against a post, a small wooden archway with climbing vines,
butterflies fluttering, trees and hedges in the background.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The herb garden is the main focus at 80% of the frame. No text, no labels.`,
    undefined, true),

  sprite("SMITHY", "building", 256, 256, "mvp",
    "Schmiede",
    `Isometric 3/4 top-down perspective of a medieval fantasy blacksmith forge in a workshop yard.
Every part of the image is filled with scenery: dirt and stone ground, grass edges, scattered tools.
A dark stone smithy building with an open front showing the anvil and bright orange forge fire glow,
a hammer resting on the anvil, dark smoke rising from the chimney,
metal ingots and iron bars stacked nearby, a weapon rack with swords,
a water quenching barrel, bellows beside the forge, a wooden cart with ore.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The smithy is the main focus at 75% of the frame. No text, no labels.`,
    undefined, true),

  sprite("IRON_MINE", "building", 256, 256, "mvp",
    "Eisenmine",
    `Isometric 3/4 top-down perspective of a medieval fantasy iron mine entrance in a rocky hillside.
Every part of the image is filled with scenery: rocky terrain, sparse grass, gravel paths.
A dark cave opening in a rocky hillside with wooden support beams framing the entrance,
small rail tracks leading inside, a hanging lantern illuminating the entrance,
piles of dark iron ore outside, a mining cart on rails, pickaxes and shovels,
wooden crates for ore, a small shelter for miners, boulders and pine trees around.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The mine entrance is the main focus at 75% of the frame. No text, no labels.`,
    undefined, true),

  sprite("ARCANE_SMITHY", "building", 256, 256, "mvp",
    "Arkan-Schmiede",
    `Isometric 3/4 top-down perspective of a medieval fantasy arcane smithy in a magical workshop district.
Every part of the image is filled with scenery: cobblestone ground, mystical rune circles, arcane energy wisps.
A large imposing dark stone smithy with glowing purple-blue arcane crystals embedded in the walls,
an open forge front showing bright orange fire mixed with swirling purple magical energy,
a massive enchanted anvil with glowing runes, dark smoke and magical sparks rising from the chimney,
enchanted weapons and glowing ingots displayed on racks outside, arcane crystal formations growing near the base,
heavy iron-reinforced oak doors with carved rune symbols, purple-flame torch brackets flanking the entrance,
stacked magical ore and crystal shards nearby, mystical atmosphere with warm forge glow and cool arcane light.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The arcane smithy is the main focus at 75% of the frame. No text, no labels.`),

  sprite("MARKETPLACE", "building", 256, 256, "mvp",
    "Marktplatz",
    `Isometric 3/4 top-down perspective of a bustling medieval fantasy marketplace in a town square.
Every part of the image is filled with scenery: cobblestone plaza, green grass edges, decorative banners.
A large open-sided market hall with heavy timber frame and colorful canvas awnings in red and gold,
stone pillar supports, multiple merchant stalls with goods displayed on wooden tables,
hanging lanterns, barrels and crates of trade goods, a stone fountain in the corner,
iron scales on a weighing platform, colorful fabric bolts, pottery and exotic items on display,
a wooden signboard with a trade symbol, busy and vibrant atmosphere with warm afternoon light.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The marketplace is the main focus at 75% of the frame. No text, no labels.`),

  sprite("WAR_MACHINE_WORKSHOP", "building", 256, 256, "mvp",
    "Kriegsmaschinenwerkstatt",
    `Isometric 3/4 top-down perspective of a medieval fantasy siege workshop and war machine factory.
Every part of the image is filled with scenery: dirt and gravel ground, wooden scaffolding, iron fittings.
A massive stone and timber workshop with wide open bay doors showing a half-built trebuchet inside,
a tall wooden construction crane with iron chains and pulleys, heavy timber beams and iron bracing,
large wooden wheels and siege engine components stacked outside, iron-bound ammunition chests,
a forge area with glowing coals for metalwork, weapon blueprints pinned to a wooden board,
heavy wooden barricades and iron shields leaning against the walls, military engineering atmosphere.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The war workshop is the main focus at 75% of the frame. No text, no labels.`),

  sprite("BANK", "building", 256, 256, "mvp",
    "Bank",
    `Isometric 3/4 top-down perspective of a medieval fantasy bank and treasury building in a prosperous district.
Every part of the image is filled with scenery: polished cobblestone, manicured hedges, gold-trimmed details.
A sturdy imposing stone bank building with thick fortified walls and iron-barred narrow windows,
a grand stone archway entrance with heavy iron-reinforced oak double doors, stone pillars with torch brackets,
a large carved golden coin emblem mounted above the entrance, stone steps leading up,
iron-bound treasure chests visible through a side window, gold coins and gem details in the stonework,
a guard post with a small watchtower, iron gate and chain barrier at the perimeter,
wealthy authoritative atmosphere with warm gold and cool stone colors, secure and prestigious.
Style: 2D hand-painted cartoon, clean outlines, warm vibrant colors, smooth shading, fantasy city builder game art.
The bank is the main focus at 75% of the frame. No text, no labels.`),

  sprite("ROAD", "terrain", 64, 64, "mvp",
    "Straßen-Tile",
    `${STYLES.BUILDING}, a single cobblestone road tile: beige and light brown cobblestones with darker mortar lines between them, flat top-down view, seamless tile pattern, worn medieval path`),

  // ═══════════════════════════════════════════════════════════
  // HELDEN (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("HERO_GUARDIAN", "unit", 256, 256, "mvp",
    "Held: Wächter (Tank)",
    `A heroic fantasy knight guardian character in a dynamic protective stance, front-facing 3/4 view.
Heavy polished steel plate armor with blue and silver trim, a large ornate blue shield with a golden lion crest held firmly,
a sturdy short sword at his side, blue tabard over the armor, strong stocky build indicating a tank role.
Warm dramatic lighting with slight magical glow from the shield. Rich detailed armor textures.
Style: 2D hand-painted illustration, modern fantasy RPG character art, clean outlines, vibrant colors, smooth shading.
Solid bright magenta background (#FF00FF). No text, no labels, no UI elements.
The character fills 80% of the frame.`),

  sprite("HERO_RANGER", "unit", 256, 256, "mvp",
    "Held: Waldläufer (DPS)",
    `A nimble fantasy forest ranger character in an alert stance, front-facing 3/4 view.
Dark green hooded cloak flowing in the wind, light brown leather armor with leaf-pattern engravings,
a finely crafted wooden longbow held ready, a quiver of arrows on the back with green feather fletching,
slim agile build with keen piercing eyes, small belt pouches and a hunting knife.
Dappled forest light atmosphere with green and gold tones. Rich detailed textures on leather and cloth.
Style: 2D hand-painted illustration, modern fantasy RPG character art, clean outlines, vibrant colors, smooth shading.
Solid bright magenta background (#FF00FF). No text, no labels, no UI elements.
The character fills 80% of the frame.`),

  sprite("HERO_CLERIC", "unit", 256, 256, "mvp",
    "Held: Kleriker (Heiler)",
    `A gentle fantasy cleric healer character in a serene casting pose, front-facing 3/4 view.
Flowing white and gold ceremonial robes with intricate golden sun embroidery, a tall wooden staff
topped with a brightly glowing amber crystal emanating warm healing light, a golden sun medallion on the chest,
peaceful wise expression with soft features, gentle healing aura radiating around the hands.
Warm golden light atmosphere with divine glow effects. Rich detailed fabric and jewelry textures.
Style: 2D hand-painted illustration, modern fantasy RPG character art, clean outlines, vibrant colors, smooth shading.
Solid bright magenta background (#FF00FF). No text, no labels, no UI elements.
The character fills 80% of the frame.`),

  // ═══════════════════════════════════════════════════════════
  // HELDEN Post-MVP (7 neue Klassen)
  // ═══════════════════════════════════════════════════════════

  sprite("HERO_BERSERKER", "unit", 128, 128, "post-mvp",
    "Held: Berserker (Melee DPS)",
    `${STYLES.UNIT}, a fierce berserker warrior: muscular build, war paint on face, dual-wielding axes, fur-lined leather armor, wild hair, raging battle stance, red accents`),

  sprite("HERO_ASSASSIN", "unit", 128, 128, "post-mvp",
    "Held: Assassine (Burst DPS)",
    `${STYLES.UNIT}, a stealthy assassin: dark hooded figure, dual daggers, black leather armor, face partially hidden, agile crouching pose, purple shadow accents`),

  sprite("HERO_PALADIN", "unit", 128, 128, "post-mvp",
    "Held: Paladin (Tank/Heiler Hybrid)",
    `${STYLES.UNIT}, a holy paladin: gleaming white and gold plate armor, large glowing hammer, holy symbol on shield, radiant aura, righteous stance, golden light`),

  sprite("HERO_BARD", "unit", 128, 128, "post-mvp",
    "Held: Barde (Support/Buffer)",
    `${STYLES.UNIT}, a charming bard: colorful medieval minstrel clothes, playing a lute, feathered hat, cheerful expression, musical note suggestion, green and gold outfit`),

  sprite("HERO_WITCH", "unit", 128, 128, "post-mvp",
    "Held: Hexe (AoE DPS)",
    `${STYLES.UNIT}, a mysterious witch: dark purple robes, pointed hat, glowing green potion bottle, black cat familiar at feet, eerie green magic glow, crooked staff`),

  sprite("HERO_NECROMANCER", "unit", 128, 128, "post-mvp",
    "Held: Nekromant (Summoner)",
    `${STYLES.UNIT}, a dark necromancer: tattered black robes, skull-topped staff, glowing purple eyes, ghostly spirits swirling around, pale skin, dark magic aura`),

  sprite("HERO_DRUID", "unit", 128, 128, "post-mvp",
    "Held: Druide (Heiler/Hybrid)",
    `${STYLES.UNIT}, a nature druid: green and brown robes with leaf patterns, wooden antlered staff, flowers growing at feet, peaceful wise face, nature magic green glow`),

  // ═══════════════════════════════════════════════════════════
  // BOSSE (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("BOSS_ELDER_TREANT", "boss", 96, 96, "mvp",
    "Boss: Alter Treant (Wald)",
    `${STYLES.BOSS}, the Elder Treant boss: colossal ancient tree creature, massive gnarled bark torso with glowing amber eyes, enormous root-arms raised to crush, dense carpet of moss and glowing vines covering body, a crown of autumn leaves and broken branches, face carved into ancient bark, absolute guardian of the deep forest`),

  sprite("BOSS_BANDIT_CHIEF", "boss", 96, 96, "mvp",
    "Boss: Banditenführer (Wald)",
    `${STYLES.BOSS}, the Bandit Chief boss: imposing scarred warrior, fur-trimmed dark leather armor studded with trophies, dual serrated daggers crossed in battle stance, red war-paint on face, gold chains and stolen jewelry, wild hair and beard, a pile of gold coins and weapons behind him, criminal king of the forest`),

  sprite("BOSS_CRYSTAL_GOLEM", "boss", 96, 96, "mvp",
    "Boss: Kristallgolem (Höhle)",
    `${STYLES.BOSS}, the Crystal Golem boss: immense stone body bristling with razor purple crystal shards erupting from shoulders and head, pulsing violet crystalline core glowing in chest cavity, fists of solid rock raised to smash, cave stalactites framing the base, slow unstoppable geological force`),

  sprite("BOSS_SWAMP_HYDRA", "boss", 96, 96, "mvp",
    "Boss: Sumpfhydra (Sumpf)",
    `${STYLES.BOSS}, the Swamp Hydra boss: three enormous serpent heads on thick scaly necks, dark green scales with yellow underbelly, each head hissing with open jaws and dripping toxic saliva, rising from murky swamp water, toxic green mist around body, the supreme monster of the marshes`),

  // ═══════════════════════════════════════════════════════════
  // BOSSE Post-MVP
  // ═══════════════════════════════════════════════════════════

  sprite("BOSS_SPIDER_QUEEN", "boss", 96, 96, "post-mvp",
    "Boss: Spinnenkönigin (Spinnennest)",
    `${STYLES.BOSS}, the Spider Queen boss: colossal spider with a regal chitin crown, glowing crimson compound eyes, thick black and purple carapace, venomous mandibles dripping green ichor, silk-wrapped egg sac throne behind her, smaller spiderlings crawling around massive legs, terrifying matriarch of the nest`),

  sprite("BOSS_FALLEN_KNIGHT", "boss", 96, 96, "post-mvp",
    "Boss: Gefallener Ritter (Ruinen)",
    `${STYLES.BOSS}, the Fallen Knight boss: towering undead warrior in cracked black plate armor etched with faded noble crests, spectral blue flames pour from visor and gauntlet gaps, massive corroded greatsword dragging sparks on the ground, ragged torn royal cape, aura of tragedy and unstoppable cursed might`),

  sprite("BOSS_SHADOW_LICH", "boss", 96, 96, "post-mvp",
    "Boss: Schattenlich (Schattenreich)",
    `${STYLES.BOSS}, the Shadow Lich boss: ancient skeletal sorcerer in flowing obsidian robes, blazing purple soul-fire in hollow eye sockets, floating three feet above ground, both hands conjuring swirling void magic, ancient rusted crown, ornate phylactery glowing at chest, the most powerful undead in existence`),

  sprite("BOSS_MAGMA_WYRM", "boss", 96, 96, "post-mvp",
    "Boss: Magmawyrm (Vulkankern)",
    `${STYLES.BOSS}, the Magma Wyrm boss: massive serpentine dragon forged of cooling lava and volcanic obsidian, brilliant orange-white glowing cracks running through dark rocky body, massive open jaws pouring molten fire, coiled in a pool of lava, wings of hardened magma half-spread, volcanic devastation incarnate`),

  sprite("BOSS_ARCHIV_WATCHER", "boss", 96, 96, "post-mvp",
    "Boss: Der Oberarchivar (Himmelsarchiv)",
    `${STYLES.BOSS}, the Archive Watcher boss: enormous floating eldritch eye with a slit reptilian pupil, orbited by cursed ancient tomes and scrolls, writhing magical tentacles of energy extending outward, ancient runes burning gold and blue, mystical purple aura, the all-seeing immortal guardian of forbidden knowledge`),

  sprite("BOSS_ANCIENT_DRAGON", "boss", 96, 96, "post-mvp",
    "Boss: Ignarax, der Uralte (Drachenhort)",
    `${STYLES.BOSS}, the Ancient Dragon boss: titanic scarred dragon with wings fully spread wide, deep red and gold battle-worn scales, fire breath charging in jaws with visible heat distortion, massive clawed feet planted on a golden treasure hoard, wise cruel ancient eyes, the ultimate final boss radiating unstoppable primordial power`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – WALD (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_FOREST_WOLF", "enemy", 96, 96, "mvp",
    "Gegner: Waldwolf",
    `${STYLES.ENEMY}, a Forest Wolf: large grey timber wolf with thick matted fur, bared fangs dripping saliva, amber glowing eyes, muscular lunging attack pose, scarred battle-hardened body, dark forest shadows behind it`),

  sprite("ENEMY_BANDIT_RAIDER", "enemy", 96, 96, "mvp",
    "Gegner: Banditenräuber",
    `${STYLES.ENEMY}, a Bandit Raider: scarred hooded human rogue, dark brown leather armor with metal rivets, short curved dagger in attack grip, threatening grin, multiple pouches and stolen loot on belt, dangerous forest outlaw`),

  sprite("ENEMY_CAVE_SLIME", "enemy", 96, 96, "mvp",
    "Gegner: Höhlenschleim",
    `${STYLES.ENEMY}, a Cave Slime: large pulsating gelatinous blob, translucent murky green-grey body with visible trapped bones inside, wobbling offensive stance, acidic bubbles on surface, small beady eyes gleaming in the slime`),

  sprite("ENEMY_THORN_SPRITE", "enemy", 96, 96, "mvp",
    "Gegner: Dornengeist",
    `${STYLES.ENEMY}, a Thorn Sprite: small floating fey creature woven from living thorny vines, glowing venomous green eyes, sharp thorn-tipped fingers, hovering with leaves swirling around it, mischievous and dangerous nature spirit`),

  sprite("ENEMY_FUNGAL_CREEPER", "enemy", 96, 96, "mvp",
    "Gegner: Pilzkriecher",
    `${STYLES.ENEMY}, a Fungal Creeper: hunched creature with a massive spotted mushroom cap for a head, purple and brown mottled body, releasing a toxic spore cloud, shambling aggressive stance, bioluminescent glowing spots on skin`),

  sprite("ENEMY_SHADOW_BAT", "enemy", 96, 96, "mvp",
    "Gegner: Schattenfledermaus",
    `${STYLES.ENEMY}, a Shadow Bat: large dark purple-black bat with enormous leathery wings fully spread in a dive attack, blazing red eyes, razor fangs, shadowy wisps trailing from wing-tips, creature of pure darkness`),

  sprite("ENEMY_MOSS_GOLEM", "enemy", 96, 96, "mvp",
    "Gegner: Moosgolem",
    `${STYLES.ENEMY}, a Moss Golem: large hulking rock creature densely carpeted in thick green moss and small ferns, glowing forest-green eyes in a boulder face, massive fist raised to smash, earth and roots tangled in body`),

  sprite("ENEMY_VENOMFANG_SPIDER", "enemy", 96, 96, "mvp",
    "Gegner: Giftzahnspinne",
    `${STYLES.ENEMY}, a Venomfang Spider: large menacing dark spider with vivid green venom dripping from oversized curved fangs, all eight hairy legs spread in attack stance, multiple pairs of red eyes gleaming, bright green venom markings on dark body`),

  sprite("ENEMY_GOBLIN_SCOUT", "enemy", 96, 96, "mvp",
    "Gegner: Goblin-Späher",
    `${STYLES.ENEMY}, a Goblin Scout: wiry green-skinned goblin with huge pointed ears, beady cunning yellow eyes, worn rusty short sword, tattered patched leather armor, crouched sneaky readied stance, covered in forest mud and grime`),

  sprite("ENEMY_WILD_BOAR", "enemy", 96, 96, "mvp",
    "Gegner: Wildschwein",
    `${STYLES.ENEMY}, a Wild Boar: massive bristling dark brown boar with two huge sharp tusks, small fierce red eyes, coarse spiked fur standing on end, powerful charging stance with front hoof pawing the ground, forest beast in a rage`),

  sprite("ENEMY_HOLLOW_SHADE", "enemy", 96, 96, "mvp",
    "Gegner: Hohlschatten",
    `${STYLES.ENEMY}, a Hollow Shade: terrifying near-invisible shadow assassin, body made of swirling darkness with a featureless face save for two burning red eyes, smoke-like edges dissolving into shadow, clawed hand reaching forward, undead phantom`),

  sprite("ENEMY_BRAMBLE_BEAR", "enemy", 96, 96, "mvp",
    "Gegner: Dornenbär",
    `${STYLES.ENEMY}, a Bramble Bear: enormous brown bear fused with wild thorny vines growing through its hide, sharp thorns protruding from shoulders and legs, roaring with mouth open wide, standing on hind legs, furious forest brute`),

  sprite("ENEMY_CURSED_WISP", "enemy", 96, 96, "mvp",
    "Gegner: Verfluchtes Irrlicht",
    `${STYLES.ENEMY}, a Cursed Wisp: small eerie floating orb of corrupted ghostly energy, shifting blue-green and sickly purple glow, spectral tendrils trailing behind, hollow screaming face forming in the light, undead support spirit`),

  sprite("ENEMY_FOREST_WISP", "enemy", 96, 96, "mvp",
    "Gegner: Waldirrlicht",
    `${STYLES.ENEMY}, a Forest Wisp: gentle but dangerous floating orb of warm golden-green light, swirling leaves orbit around it, soft glow illuminating mist below, small leaf-like wings of pure energy, ethereal nature spirit with a mischievous face`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – HÖHLE (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_CRYSTAL_BEETLE", "enemy", 96, 96, "mvp",
    "Gegner: Kristallkäfer",
    `${STYLES.ENEMY}, a Crystal Beetle: large armored cave insect with a stunning shell made of interlocking purple crystal facets, sharp crystal spike horns, six powerful clawed legs, glowing bioluminescent underbelly, defensive stance with head lowered to charge`),

  sprite("ENEMY_DEEP_CRAWLER", "enemy", 96, 96, "mvp",
    "Gegner: Tiefenkriecher",
    `${STYLES.ENEMY}, a Deep Crawler: long dark grey cave centipede with many segmented armored legs, razor mandibles at the front, glowing yellow dots along its body, rearing up aggressively from a low stalking pose, cave predator in the darkness`),

  sprite("ENEMY_MINE_SPECTER", "enemy", 96, 96, "mvp",
    "Gegner: Minengeist",
    `${STYLES.ENEMY}, a Mine Specter: translucent grey-blue ghost of a dead miner, wearing a tattered hardhat and torn overalls, swinging a glowing ghostly pickaxe, hollow screaming face with empty eye sockets, floating just above the ground, cursed cave spirit`),

  sprite("ENEMY_STALACTITE_BAT", "enemy", 96, 96, "mvp",
    "Gegner: Stalaktit-Fledermaus",
    `${STYLES.ENEMY}, a Stalactite Bat: grey bat with wings like jagged stone, sharp rocky wing-tips that cut like blades, small glowing red eyes, body camouflaged like cave rock, fangs like stone daggers, swooping dive-attack pose`),

  sprite("ENEMY_MAGMA_SLUG", "enemy", 96, 96, "mvp",
    "Gegner: Magmaschnecke",
    `${STYLES.ENEMY}, a Magma Slug: enormous glowing orange-red slug with a hardened cooled lava shell on its back, molten rock dripping from its trail, small burning eyes, body pulsing with intense heat, slow but unstoppable volcanic cave brute`),

  sprite("ENEMY_CAVE_BAT", "enemy", 96, 96, "mvp",
    "Gegner: Höhlenfledermaus",
    `${STYLES.ENEMY}, a Cave Bat: brown-grey bat with wide leathery wings dramatically spread in a swooping attack, mouth open revealing sharp fangs, small fierce red beady eyes, matted fur, perfectly adapted cave hunter`),

  sprite("ENEMY_CAVE_GOBLIN", "enemy", 96, 96, "mvp",
    "Gegner: Höhlengoblin",
    `${STYLES.ENEMY}, a Cave Goblin: pale bluish-grey skinned goblin with enormous eyes evolved for total darkness, hunched sneaky body, crude stone club raised to strike, pointy ears, nasty grin with broken teeth, dirty cave dwelling ambush predator`),

  sprite("ENEMY_CAVE_SPIDER_QUEEN", "enemy", 96, 96, "mvp",
    "Gegner: Höhlenspinnenkönigin",
    `${STYLES.ENEMY}, a Cave Spider Queen: large bloated pale grey spider with a purple crown-like marking on the abdomen, multiple glowing red eyes, thick spiny legs, small spiderlings crawling around her feet, protective and deadly brood mother`),

  sprite("ENEMY_CAVE_GOLEM_SHARD", "enemy", 96, 96, "mvp",
    "Gegner: Höhlengolem-Splitter",
    `${STYLES.ENEMY}, a Cave Golem Shard: jagged compact creature assembled from broken rocks and glinting crystal shards, stumpy powerful animated stone body, rough cracked surface, tiny glowing cracks of energy between the stones, aggressive forward-leaning stance`),

  sprite("ENEMY_CAVE_TROLL", "enemy", 96, 96, "mvp",
    "Gegner: Höhlentroll",
    `${STYLES.ENEMY}, a Cave Troll: massive hunched grey-stone-skinned troll, huge ape-like arms dragging on the ground, boulders for fists, dull glowing yellow eyes beneath a heavy brow ridge, stalagmites growing from its shoulders, lumbering devastating cave brute`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – SUMPF (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_BOG_WITCH", "enemy", 96, 96, "mvp",
    "Gegner: Moorhexe",
    `${STYLES.ENEMY}, a Bog Witch: hunched ancient swamp hag in rotting tattered green robes, gnarled driftwood staff topped with a glowing hex rune, warts and mud on grey skin, wild mossy hair, conjuring a bubbling green poison curse, swamp support caster`),

  sprite("ENEMY_SWAMP_TROLL", "enemy", 96, 96, "mvp",
    "Gegner: Sumpftroll",
    `${STYLES.ENEMY}, a Swamp Troll: colossal green-brown troll with thick mossy hide, dragging a rotted wooden club, muddy matted fur and algae patches on skin, wide flat nose, red eyes glowing with dull rage, knee-deep in swamp water, lumbering unstoppable brute`),

  sprite("ENEMY_LEECH_SWARM", "enemy", 96, 96, "mvp",
    "Gegner: Blutegelschwarm",
    `${STYLES.ENEMY}, a Leech Swarm: a writhing pulsating mass of dozens of dark red-brown leeches coiling together into a creature-like form, slimy glistening bodies, tiny sucking mouths all facing outward, a horrifying undulating mass of parasites`),

  sprite("ENEMY_MIRE_PHANTOM", "enemy", 96, 96, "mvp",
    "Gegner: Sumpfphantom",
    `${STYLES.ENEMY}, a Mire Phantom: deadly translucent swamp spirit, shifting green-grey ghostly body with a skull-like face, clawed spectral hands reaching forward, tattered burial shroud trailing behind, hovering silently over dark swamp water, assassin of the marsh`),

  sprite("ENEMY_TOXIC_TOAD", "enemy", 96, 96, "mvp",
    "Gegner: Giftkröte",
    `${STYLES.ENEMY}, a Toxic Toad: enormous bloated toad with sickly yellow-green warty skin, huge bulging poison glands on back, wide mouth open with dripping purple toxic slime on tongue, beady amber eyes, crouching ready to lunge, noxious swamp creature`),

  sprite("ENEMY_ROT_WALKER", "enemy", 96, 96, "mvp",
    "Gegner: Fäulniswandler",
    `${STYLES.ENEMY}, a Rot Walker: horrifying undead swamp zombie with decaying green-brown flesh hanging off exposed bones, tattered rotting rags, shambling arms outstretched, hollow sunken eyes glowing faint green, trailing swamp mud and decomposition, relentless undead fighter`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – RUINEN/KRYPTA
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_SKELETON_WARRIOR", "enemy", 96, 96, "post-mvp",
    "Gegner: Skelettkrieger (Ruinen)",
    `${STYLES.ENEMY}, a Skeleton Warrior: animated human skeleton in rusted dented iron armor, wielding a chipped sword and battered shield, glowing blue fire in empty eye sockets, cracked yellowed bones, battle-ready fighting stance, crypt undead soldier`),

  sprite("ENEMY_CURSED_KNIGHT", "enemy", 96, 96, "post-mvp",
    "Gegner: Verfluchter Ritter (Ruinen)",
    `${STYLES.ENEMY}, a Cursed Knight: ghostly armored warrior in corroded dark plate armor, spectral blue energy bleeding from visor and armor joints, ethereal sword raised in guard, tattered cape dissolving into mist, haunted ruins guardian still bound by duty`),

  sprite("ENEMY_TOMB_WRAITH", "enemy", 96, 96, "post-mvp",
    "Gegner: Grabgespenst (Ruinen)",
    `${STYLES.ENEMY}, a Tomb Wraith: wailing undead spirit in tattered burial shroud, translucent grey-white body with a tortured screaming face, clawed hands outstretched, eerie blue-white glow emanating from within, floating in a swirl of grave dust, undead horror`),

  sprite("ENEMY_BONE_ARCHER", "enemy", 96, 96, "post-mvp",
    "Gegner: Knochenschütze (Ruinen)",
    `${STYLES.ENEMY}, a Bone Archer: skeleton crouched in sniper stance, drawing an ancient crumbling bow with a bone arrow nocked, quiver of yellowed bone arrows on spine, glowing blue eye sockets tracking a target, nimble undead ranged attacker`),

  sprite("ENEMY_STONE_GUARDIAN", "enemy", 96, 96, "post-mvp",
    "Gegner: Steinwächter (Ruinen)",
    `${STYLES.ENEMY}, a Stone Guardian: massive animated stone statue warrior with deeply cracked ancient armor carved from granite, blazing runic eyes of orange fire, raising a colossal stone sword, runes carved across the body glowing with ancient magic, ruins protector`),

  sprite("ENEMY_BONE_KNIGHT", "enemy", 96, 96, "post-mvp",
    "Gegner: Knochenritter (Ruinen)",
    `${STYLES.ENEMY}, a Bone Knight: commanding skeleton in dark rusted full plate armor, wielding a large heavy sword and tower shield, blue flame eyes visible through visor, cracked bone hands gripping weapons, elite undead champion of the crypt, disciplined battle stance`),

  sprite("ENEMY_TOMB_HORROR", "enemy", 96, 96, "post-mvp",
    "Gegner: Grabentsetzen (Ruinen)",
    `${STYLES.ENEMY}, a Tomb Horror: monstrous undead abomination, massive body grotesquely stitched together from multiple corpses, bandaged limbs of different sizes, hollow skull-like eye sockets glowing sickly yellow, shambling hunched pose, arms dragging on the ground, terrifying brute of pure horror`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – SPINNENNEST
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_GIANT_SPIDER", "enemy", 96, 96, "post-mvp",
    "Gegner: Riesenspinne (Spinnennest)",
    `${STYLES.ENEMY}, a Giant Spider: huge hairy dark brown and black spider with eight glowing red eyes, thick spiny legs spread wide, dripping web strands attached to its body, fangs parted and glistening, rearing up in a threatening attack stance, terrifying cave hunter`),

  sprite("ENEMY_EGG_SAC_GUARDIAN", "enemy", 96, 96, "post-mvp",
    "Gegner: Eiersack-Wächter (Spinnennest)",
    `${STYLES.ENEMY}, an Egg Sac Guardian: bulbous pale white and green spider with a swollen abdomen full of eggs, protectively curled around a large translucent egg sac, defensive lowered stance, smaller spider hatchlings emerging, devoted deadly brood mother`),

  sprite("ENEMY_VENOMOUS_LURKER", "enemy", 96, 96, "post-mvp",
    "Gegner: Giftlauerer (Spinnennest)",
    `${STYLES.ENEMY}, a Venomous Lurker: sleek jet-black spider with vivid neon-green venom stripe markings, low crouched ambush predator stance, eight eyes all forward-facing and intent, venom droplets glistening at fang tips, fast and deadly assassin of the nest`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – VULKANKERN
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_LAVA_GOLEM", "enemy", 96, 96, "post-mvp",
    "Gegner: Lavagolem (Vulkan)",
    `${STYLES.ENEMY}, a Lava Golem: powerful humanoid creature of black cooling obsidian rock, brilliant orange-red lava glowing through deep cracks in its body, magma dripping from fists, heat shimmer rising around it, volcanic eruption pose with arm raised to smash, slow unstoppable volcanic brute`),

  sprite("ENEMY_FLAME_SPIRIT", "enemy", 96, 96, "post-mvp",
    "Gegner: Flammengeist (Vulkan)",
    `${STYLES.ENEMY}, a Flame Spirit: floating fire elemental with a swirling vortex of orange-yellow flames forming a vaguely humanoid body, an angry burning face in the center of the inferno, heat distortion shimmer around it, jets of fire streaming from outstretched arms, pure volcanic spirit`),

  sprite("ENEMY_ASH_GOLEM", "enemy", 96, 96, "post-mvp",
    "Gegner: Aschegolem (Vulkan)",
    `${STYLES.ENEMY}, an Ash Golem: large slow creature built of compacted volcanic ash and cinder, crumbling grey-black body with smoldering orange embers glowing within every crack, ash dust trailing from each movement, hollow burning ember eyes, raised fist ready to crumble into impact`),

  sprite("ENEMY_LAVA_ELEMENTAL", "enemy", 96, 96, "post-mvp",
    "Gegner: Lavaelementar (Vulkan)",
    `${STYLES.ENEMY}, a Lava Elemental: swirling humanoid tornado of molten lava, blazing orange-white core radiating intense heat, outer shell of black cooling rock crust breaking apart to reveal inner fire, lava rivers flowing down its body, primal volcanic spirit in attack stance`),

  sprite("ENEMY_FIRE_BAT", "enemy", 96, 96, "post-mvp",
    "Gegner: Feuerfledermaus (Vulkan)",
    `${STYLES.ENEMY}, a Fire Bat: sleek bat with wings made of living flame, orange-red fire feathers burning at the edges, bright molten ember eyes, heat trails streaming behind in flight, mouth open revealing fire-breathing teeth, fast agile volcanic predator`),

  sprite("ENEMY_OBSIDIAN_CRAB", "enemy", 96, 96, "post-mvp",
    "Gegner: Obsidiankrabbe (Vulkan)",
    `${STYLES.ENEMY}, an Obsidian Crab: massive armored crab with shiny jet-black obsidian shell plates, bright lava cracks glowing orange between every plate, enormous razor-sharp volcanic claws raised in fighting stance, heavy defensive brute of the volcano, cracks smoking with heat`),

  sprite("ENEMY_MAGMA_BROODLING", "enemy", 96, 96, "post-mvp",
    "Gegner: Magmabrut (Vulkan)",
    `${STYLES.ENEMY}, a Magma Broodling: small fast lizard-like creature of hardening dark magma, bright glowing orange-red cracks across its body, skittering aggressive forward-leaning pose with claws digging in, smoke rising from its body, fast and deadly volcanic minion`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – DRACHENHORT (über dem Vulkankern, docs/NEUE-DUNGEONS.md)
  // Freigestellt mit npm run sprite-freistellen (Drachenpriester mit --boden 0.87)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_GLUTWYRMLING", "enemy", 96, 96, "post-mvp",
    "Gegner: Glutwyrmling (Drachenhort)",
    `${STYLES.ENEMY}, a Glutwyrmling young ember drake: lean young dragon the size of a large dog, glowing orange-red scales with charred black edges, oversized wings half spread, sharp teeth bared in a cocky snarl, smoke curling from its nostrils, crouched pouncing stance on a few scattered gold coins, arrogant young dragon that thinks every hoard is its own`),

  sprite("ENEMY_HORTKOBOLD", "enemy", 96, 96, "post-mvp",
    "Gegner: Hortkobold (Drachenhort)",
    `${STYLES.ENEMY}, a Hoard Kobold: small scrawny reptilian kobold with rust-red scales and huge greedy yellow eyes, overloaded with stolen gold chains and rings, a far too large jeweled crown slipping over one eye, a bulging sack of coins on its back, one clawed hand ready to hurl a fistful of gold coins, sneaky greedy pose`),

  sprite("ENEMY_DRACHENPRIESTER", "enemy", 96, 96, "post-mvp",
    "Gegner: Drachenpriester (Drachenhort)",
    `${STYLES.ENEMY}, a Dragon Priest: tall cultist in deep crimson and gold vestments wearing a horned dragon skull mask, dragon scale pauldrons, staff topped with a glowing ember crystal, swirling fire runes around one raised hand, zealous preacher of the dragon flame in a support caster pose`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – STERNENSCHMIEDE UND STERNENSCHLUND (über dem Himmelsarchiv)
  // Bilder vom 20.10.2026 (Christophs Okay für 8), freigestellt mit npm run sprite-freistellen.
  // 192 px, weil der Kampf am PC die Bilder bis 230 px gross zeigt.
  // ═══════════════════════════════════════════════════════════

  sprite("BOSS_KORRUND", "boss", 192, 192, "post-mvp",
    "Boss: Korrund, der Sternenschmied (Sternenschmiede)",
    `${STYLES.BOSS}, Korrund the Star Smith: a colossal titan blacksmith whose skin is dark blue-black star-metal crossed by thin glowing white-gold cracks, a long braided beard made of white-hot sparks, bare muscular arms, a heavy brown leather smith's apron dotted with tiny shining stars, raising an enormous forge hammer whose head is a glowing meteorite, holding a small newborn star in long iron tongs in his other hand, proud and grumpy master craftsman about to strike`),

  sprite("ENEMY_FUNKENWICHTEL", "enemy", 192, 192, "post-mvp",
    "Gegner: Funkenwichtel (Sternenschmiede)",
    `${STYLES.ENEMY}, a Spark Imp: a small mischievous imp whose body is made of crackling golden-white sparks and dark grey soot smoke, glowing ember-orange eyes and a wide cheeky grin, long pointed ears, tiny wings of flickering yellow flame, hugging a stolen glowing star fragment like a treasure, darting forward in a quick leaping attack pose, sparks kept compact close to its body`),

  sprite("ENEMY_AMBOSSGOLEM", "enemy", 192, 192, "post-mvp",
    "Gegner: Ambossgolem (Sternenschmiede)",
    `${STYLES.ENEMY}, an Anvil Golem: a hulking golem whose chest is a huge black iron anvil, arms and legs made of chained dark meteorite chunks, seams of molten white-gold metal glowing between the parts, tiny constellation-like points of light speckled across the dark iron, small fierce glowing eyes in a squat blocky head, heavy fists raised in a slow powerful guarding stance`),

  sprite("BOSS_NYXAR", "boss", 192, 192, "post-mvp",
    "Boss: Nyxar, der Sternenfresser (Sternenschlund)",
    `${STYLES.BOSS}, Nyxar the Star Eater: a colossal cosmic serpent-dragon whose long body is an opaque dark blue-black hide that looks like a piece of the night sky, full of tiny stars and swirling teal nebulae, edged by a glowing ice-blue rim, a gigantic gaping maw ringed with rows of pale crystal teeth, many small glowing ice-blue eyes along its long head, a half-swallowed golden star shining between its jaws, coiling forward out of the darkness in a devouring strike`),

  sprite("ENEMY_LICHTMOTTE", "enemy", 192, 192, "post-mvp",
    "Gegner: Lichtmotte (Sternenschlund)",
    `${STYLES.ENEMY}, a Light Moth: a giant fluffy moth the size of a wolf, huge wings patterned like a deep blue starry night sky with glowing golden constellation eye-spots, thick soft silver-white fur, large feathery glowing antennae, big dark shiny eyes, a long curled proboscis greedily sipping a thin stream of golden starlight, swooping forward in an attacking hover`),

  sprite("ENEMY_LEERENKRIECHER", "enemy", 192, 192, "post-mvp",
    "Gegner: Leerenkriecher (Sternenschlund)",
    `${STYLES.ENEMY}, a Void Crawler: a low spider-like creature made of living darkness, its body an opaque deep black void sprinkled with faint tiny white stars, six long thin jointed legs tipped with pale ice-blue light, a cluster of small white glowing eyes, wisps of dark blue-grey mist trailing from its back, creeping forward ready to pounce`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – VERFLUCHTE BIBLIOTHEK
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_CURSED_PRIEST", "enemy", 96, 96, "post-mvp",
    "Gegner: Verfluchter Priester (Bibliothek)",
    `${STYLES.ENEMY}, a Cursed Priest: undead cleric in tattered holy robes now stained black with corruption, golden corrupted staff topped with an inverted holy symbol, dark void magic swirling from hands, sunken undead face with black hollow eyes, fallen healer turned dark magic support`),

  sprite("ENEMY_GHOST_MAGE", "enemy", 96, 96, "post-mvp",
    "Gegner: Geistermagier (Bibliothek)",
    `${STYLES.ENEMY}, a Ghost Mage: translucent spectral wizard with a semi-visible skull face, floating ancient spell book open in front, arcane glowing runes orbiting its body, blue-purple ghostly glow emanating from within, robes dissolving into mist at the edges, librarian of the dead`),

  sprite("ENEMY_TOME_GUARDIAN", "enemy", 96, 96, "post-mvp",
    "Gegner: Buchwächter (Bibliothek)",
    `${STYLES.ENEMY}, a Tome Guardian: animated suit of dark iron armor possessed and kept alive by cursed ancient books, three large tomes orbiting its armored body on arcane chains, pages fluttering with dark energy, glowing rune-carved visor, sentinel posture with mace raised, absolute library protector`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – TIEFSEE (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_DEEP_SEA_ANGLER", "enemy", 128, 128, "mvp",
    "Gegner: Tiefsee-Anglerfisch",
    `${STYLES.ENEMY}, A terrifying deep-sea anglerfish monster standing upright, bioluminescent lure dangling above its massive toothy maw, pitch-black deep ocean body with glowing blue-green patterns, sunken hollow eyes, rows of needle-sharp fangs dripping with water, fan-like pectoral fins spread menacingly, barnacles and deep-sea crusts on its dark scaly skin, dramatic deep-ocean atmosphere`),

  sprite("ENEMY_JELLYFISH_SWARM", "enemy", 128, 128, "mvp",
    "Gegner: Quallenschwarm",
    `${STYLES.ENEMY}, A swarm of bioluminescent jellyfish forming a single threatening entity, dozens of translucent bells glowing electric blue and violet, long trailing venomous tentacles weaving together like whips, ethereal ghostly glow illuminating the surrounding water, pulsating light patterns across each bell, the swarm appears as one dangerous creature, deep sea atmosphere, otherworldly and dangerous`),

  sprite("ENEMY_SEA_SERPENT", "enemy", 128, 128, "mvp",
    "Gegner: Meeresschlange",
    `${STYLES.ENEMY}, An ancient massive sea serpent rearing up aggressively, sleek muscular body with iridescent blue-green scales shimmering like the deep ocean, large serpentine head with flared nostrils and venomous fangs, bioluminescent stripe running along its spine, powerful coiled body suggesting immense speed and strength, sharp angular scales and fins along the neck, menacing predatory pose`),

  sprite("ENEMY_DROWNED_KNIGHT", "enemy", 128, 128, "mvp",
    "Gegner: Ertrunkener Ritter",
    `${STYLES.ENEMY}, An undead knight that has spent centuries underwater, rusted and corroded plate armor encrusted with barnacles, sea anemones and coral growing from the helmet and pauldrons, glowing sickly green eyes behind the visor, a broken sword trailing seaweed, waterlogged tattered cape drifting as if still submerged, hollow undead menace, cold aquatic undead atmosphere, dark and foreboding`),

  sprite("ENEMY_PRESSURE_CRAB", "enemy", 128, 128, "mvp",
    "Gegner: Druckkrabbe",
    `${STYLES.ENEMY}, A massive deep-sea crab with enormous crushing claws, black chitinous shell with dark purple undertones that can withstand immense ocean pressure, angular sharp-edged carapace with heavy reinforced plates, beady luminous red eyes on stalks, froth and bubbles around its razor-sharp claw edges, heavy armored body low to the ground, deep abyssal creature radiating crushing force`),

  sprite("BOSS_LEVIATHAN", "boss", 192, 192, "mvp",
    "Boss: Leviathan (Tiefsee)",
    `${STYLES.BOSS}, An absolutely colossal ancient sea leviathan, massive serpentine dragon-like body with dark navy and midnight blue scales, rows of bioluminescent spots running along its entire length in electric blue and cyan, enormous fanged maw wide open revealing rows of teeth and a glowing abyss within, multiple massive fins like dark sails, crushing tentacle-like appendages, ancient ocean god energy, dramatic underwater lighting with rays of pale light cutting through darkness, supremely terrifying and epic scale`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – BELAGERUNG (POST-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_WALL_ARCHER", "enemy", 128, 128, "post-mvp",
    "Gegner: Mauerarcher",
    `${STYLES.ENEMY}, Medieval fantasy castle wall archer, human soldier in heavy plate armor standing on stone battlements, drawing a longbow, determined grim face, blue/gray stone castle wall background implied, classic fantasy RPG enemy design`),

  sprite("ENEMY_WALL_GUARD", "enemy", 128, 128, "post-mvp",
    "Gegner: Torwächter",
    `${STYLES.ENEMY}, Medieval fantasy fortress gate guard, massive heavily armored soldier with full plate armor and tower shield, standing firm in front of iron-banded wooden gate, stoic defender pose`),

  sprite("ENEMY_SIEGE_CROSSBOWMAN", "enemy", 128, 128, "post-mvp",
    "Gegner: Belagerungs-Armbrustschütze",
    `${STYLES.ENEMY}, Medieval fantasy siege crossbowman, armored soldier in dark iron plate firing a heavy siege crossbow, aiming directly at viewer, crossbow bolts visible at belt, menacing ranged attacker`),

  sprite("ENEMY_SIEGE_DEFENDER", "enemy", 128, 128, "post-mvp",
    "Gegner: Elite-Burgverteidiger",
    `${STYLES.ENEMY}, Medieval fantasy elite castle defender, veteran knight in ornate plate armor with sword and shield bearing fortress crest, battle-scarred but unbroken, powerful defensive stance`),

  sprite("ENEMY_SIEGE_MAGE", "enemy", 128, 128, "post-mvp",
    "Gegner: Festungsmagier",
    `${STYLES.ENEMY}, Medieval fantasy battle mage defending a fortress, robed spellcaster in partial mage armor with glowing arcane runes, casting lightning bolt or arcane shield, defending castle walls`),

  // ═══════════════════════════════════════════════════════════
  // BOSSE – BELAGERUNG (POST-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("BOSS_IRON_COMMANDER", "boss", 192, 192, "post-mvp",
    "Boss: Eisenkommandant",
    `${STYLES.BOSS}, Medieval fantasy Iron Commander boss, imposing general in full black iron plate armor with horned helmet, carrying massive warhammer, cape of crimson, commanding presence radiating tactical genius, veteran of a hundred sieges`),

  sprite("BOSS_FORTRESS_WARDEN", "boss", 192, 192, "post-mvp",
    "Boss: Festungshüter",
    `${STYLES.BOSS}, Medieval fantasy Fortress Warden boss, ancient magical stone guardian construct, 15 feet tall, body made of enchanted castle stone with glowing magical runes, massive stone fists, eyes burning with defensive magic, sworn protector of the inner keep`),

  // ═══════════════════════════════════════════════════════════
  // STADTMAUER – PERIMETER (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("WALL_SIDE_A", "terrain", 256, 256, "mvp",
    "Stadtmauer: Mauerabschnitt horizontal (2×1)",
    `${STYLES.BUILDING}, a medieval stone city wall section: 2-tile-wide horizontal wall segment running diagonally toward lower-right in isometric view, thick gray stone blocks with crenellated battlements on top, narrow arrow slits on the front face, front stone face fully visible to viewer, solid well-fitted stonework, slightly mossy with aged look, faint magical runes carved into the stone, city perimeter defense wall, no gate or tower`),

  sprite("WALL_SIDE_B", "terrain", 256, 256, "mvp",
    "Stadtmauer: Mauerabschnitt vertikal (1×2)",
    `${STYLES.BUILDING}, a medieval stone city wall section: 2-tile-long perpendicular wall segment running diagonally toward lower-left in isometric view, thick gray stone blocks with crenellated battlements on top, narrow arrow slits on the visible side face, side stone face fully visible to viewer, solid well-fitted stonework, slightly mossy with aged look, faint magical runes carved into the stone, city perimeter defense wall, no gate or tower, mirror orientation compared to standard wall`),

  sprite("WALL_CORNER_TOWER", "terrain", 192, 256, "mvp",
    "Stadtmauer: Eckturm (1×1)",
    `${STYLES.BUILDING}, a medieval stone corner tower: compact round stone tower 1-tile footprint, gray stone masonry with conical dark slate roof, three narrow arrow slits on upper section, slightly taller than adjacent wall segments, torch bracket on outer stone face, crenellated parapet at roofline, symmetrical round design visible equally from all isometric directions, corner junction of city wall, solid imposing presence`),

  // ═══════════════════════════════════════════════════════════
  // FORTIFIKATIONEN – BELAGERUNG (POST-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("SIEGE_WALL", "terrain", 256, 256, "post-mvp",
    "Fortifikation: Burgmauer",
    `Medieval fantasy fortress/castle architectural element, top-down isometric 3/4 view, stone masonry wall or gate structure, detailed stonework texture, damaged from siege, dramatic cinematic lighting, solid bright magenta background (#FF00FF), no characters, no UI elements, game asset style inspired by Age of Empires and Stronghold Crusader, Stone castle wall section, crenellated battlement top, aged gray stone with moss, arrow slits, partial damage from cannon fire, medieval fortress wall segment`),

  sprite("SIEGE_GATE", "terrain", 256, 256, "post-mvp",
    "Fortifikation: Burgtor",
    `Medieval fantasy fortress/castle architectural element, top-down isometric 3/4 view, stone masonry wall or gate structure, detailed stonework texture, damaged from siege, dramatic cinematic lighting, solid bright magenta background (#FF00FF), no characters, no UI elements, game asset style inspired by Age of Empires and Stronghold Crusader, Medieval castle gate with iron-banded wooden doors, portcullis visible, stone archway with defensive murder holes, imposing iron hinges and bolts, partially damaged`),

  sprite("SIEGE_TOWER", "terrain", 256, 256, "post-mvp",
    "Fortifikation: Verteidigungsturm",
    `Medieval fantasy fortress/castle architectural element, top-down isometric 3/4 view, stone masonry wall or gate structure, detailed stonework texture, damaged from siege, dramatic cinematic lighting, solid bright magenta background (#FF00FF), no characters, no UI elements, game asset style inspired by Age of Empires and Stronghold Crusader, Medieval round stone defense tower with conical roof, arrow slits on multiple levels, catapult mounting bracket on top, aged weathered stone`),

  sprite("SIEGE_KEEP", "terrain", 256, 256, "post-mvp",
    "Fortifikation: Bergfried",
    `Medieval fantasy fortress/castle architectural element, top-down isometric 3/4 view, stone masonry wall or gate structure, detailed stonework texture, damaged from siege, dramatic cinematic lighting, solid bright magenta background (#FF00FF), no characters, no UI elements, game asset style inspired by Age of Empires and Stronghold Crusader, Medieval castle keep/donjon, tall square stone tower with battlements, royal banner torn and hanging, damaged stone from siege bombardment, most heavily fortified structure`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_GRAIN", "item", 16, 16, "mvp",
    "Item: Getreide",
    `${STYLES.ITEM}, a bundle of grain: golden wheat sheaf, ripe grain stalks tied together, harvest, medieval farming`),

  sprite("ITEM_BREAD", "item", 16, 16, "mvp",
    "Item: Brot",
    `${STYLES.ITEM}, a loaf of bread: golden-brown baked bread loaf, warm, rustic medieval bakery bread`),

  sprite("ITEM_HEALING_POTION", "item", 16, 16, "mvp",
    "Item: Heiltrank",
    `${STYLES.ITEM}, a healing potion: small glass bottle with glowing red-pink liquid, cork stopper, magical healing`),

  sprite("ITEM_IRON_SWORD", "item", 256, 256, "mvp",
    "Item: Eisenschwert (T1)",
    rarityIcon("an iron sword", "green", "green"), undefined, true),

  sprite("ITEM_IRON_SHIELD", "item", 128, 128, "mvp",
    "Item: Eisenschild (T1)",
    rarityIcon("an iron shield", "green", "green"), undefined, true),

  sprite("ITEM_LEATHER_ARMOR", "item", 128, 128, "mvp",
    "Item: Lederrüstung (T1)",
    `${STYLES.ITEM}, leather armor: brown leather chest armor/vest, buckles and straps, simple but protective`, 'green'),

  sprite("ITEM_CRYSTAL_SHARD", "item", 16, 16, "mvp",
    "Item: Kristallsplitter",
    `${STYLES.ITEM}, a crystal shard: glowing purple-pink magical crystal fragment, faceted, radiating magical energy`),

  sprite("ITEM_WOOD", "item", 16, 16, "mvp",
    "Item: Holz (Ressource)",
    `${STYLES.ITEM}, wood logs resource: two or three small brown wooden logs stacked, warm brown wood grain texture, natural timber`),

  sprite("ITEM_STONE", "item", 16, 16, "mvp",
    "Item: Stein (Ressource)",
    `${STYLES.ITEM}, a stone resource: a rough grey rock chunk, natural stone texture, grey-brown color, basic building material`),

  sprite("ITEM_IRON_SCRAP", "item", 16, 16, "mvp",
    "Item: Eisenschrott",
    `${STYLES.ITEM}, iron scrap metal: a rough pile of dark grey iron chunks and metal scraps, rusty edges, industrial resource`),

  sprite("ITEM_MAGITECH_COMPONENT", "item", 16, 16, "mvp",
    "Item: Magitech-Komponente",
    `${STYLES.ITEM}, a magitech component: a small mechanical cog/gear fused with a glowing arcane crystal core, purple-gold energy, magical engineering part`),

  sprite("ITEM_WAR_HAMMER", "item", 256, 256, "mvp",
    "Item: Kriegshammer (T3 Schwerer Hammer)",
    `${STYLES.ITEM_EPIC.replace('solid bright magenta background (#FF00FF)', 'solid pure BLACK background (#000000)')}, a massive two-handed war hammer with a colossal dark iron hammerhead covered in glowing golden runes, the flat face engraved with a roaring dragon crest, thick reinforced handle wrapped in battle-worn leather with iron rings, crackling golden-orange lightning energy arcing between the runes, weapon radiates raw crushing power and ancient might`),

  sprite("ITEM_ARCANE_BLADE", "item", 256, 256, "mvp",
    "Item: Arkanklinge (T3 Arkan-Waffe)",
    `${STYLES.ITEM_EPIC}, an arcane shortsword with a brilliant crystalline blade blazing with intense blue-purple arcane fire, crackling purple lightning arcing along both razor edges, ornate golden crossguard inlaid with pulsing arcane gems, magical runes glowing white-hot, a weapon of raw arcane power`),

  sprite("ITEM_MAGITECH_SHIELD", "item", 256, 256, "mvp",
    "Item: Magitech-Schild (T3 Arkan-Schild)",
    `${STYLES.ITEM_EPIC}, a powerful magitech battle shield with a massive glowing arcane crystal core radiating brilliant blue-purple energy, intricate golden energy circuit lines etched across the iron surface, magical barrier aura visible around the rim, runes blazing with arcane power, a masterpiece of magical engineering`),

  sprite("ITEM_ARCANE_AMULET", "item", 256, 256, "mvp",
    "Item: Arkan-Amulett (T3 Arkan-Schmuck)",
    `${STYLES.ITEM_EPIC}, a magnificent arcane talisman with a large deep purple gem blazing with inner magical light at center, ornate golden filigree setting with glowing inscription runes, chains of pure arcane energy radiating outward, brilliant purple light beams emanating, an amulet of tremendous magical power`),

  sprite("ITEM_WAR_CATAPULT", "item", 32, 32, "mvp",
    "Item: Katapult (Kriegsmaschine)",
    `${STYLES.ITEM}, a war catapult: a sturdy medieval wooden catapult war machine in miniature icon form, dark oak frame with iron reinforcements, a large stone loaded in the sling, battle-ready and imposing`),

  sprite("ITEM_WAR_CANNON", "item", 32, 32, "mvp",
    "Item: Kanone (Kriegsmaschine)",
    `${STYLES.ITEM}, a war cannon: a heavy iron cannon with arcane crystal engravings, blue-purple magical glow at the barrel tip, mounted on a dark oak wheeled carriage, magitech war weapon`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – RESISTENZ-AUSRÜSTUNG
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_FROSTUMHANG", "item", 16, 16, "post-mvp",
    "Item: Frostumhang (Eisresistenz)",
    `${STYLES.ITEM}, a frost cloak: flowing icy blue cloak with snowflake patterns, cold mist emanating, frost resistance`),

  sprite("ITEM_FLAMMENWARD", "item", 16, 16, "post-mvp",
    "Item: Flammenward (Feuerresistenz)",
    `${STYLES.ITEM}, a flame ward amulet: golden medallion with embedded red fire gem, protective flame runes, fire resistance`),

  sprite("ITEM_ANTIDOT_AMULETT", "item", 16, 16, "post-mvp",
    "Item: Antidot-Amulett (Giftresistenz)",
    `${STYLES.ITEM}, an antidote amulet: green crystal pendant on silver chain, purifying glow, poison resistance`),

  sprite("ITEM_STURMMANTEL", "item", 16, 16, "post-mvp",
    "Item: Sturmmantel (Blitzresistenz)",
    `${STYLES.ITEM}, a storm cloak: dark blue cape crackling with small lightning sparks, wind-blown fabric, lightning resistance`),

  sprite("ITEM_SCHATTENSCHLEIER", "item", 16, 16, "post-mvp",
    "Item: Schattenschleier (Schattenresistenz)",
    `${STYLES.ITEM}, a shadow veil: dark translucent fabric with purple edges, shifting shadows, shadow resistance`),

  sprite("ITEM_MAGIESCHILD", "item", 16, 16, "post-mvp",
    "Item: Magieschild (Arkane Resistenz)",
    `${STYLES.ITEM}, a magic shield charm: small floating rune-covered crystal orb, arcane barrier glow, magic resistance`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – CRAFTING-MATERIALIEN
  // ═══════════════════════════════════════════════════════════

  sprite("MAT_FROSTKRISTALL", "item", 16, 16, "post-mvp",
    "Material: Frostkristall",
    `${STYLES.ITEM}, a frost crystal: jagged ice-blue crystal shard, cold mist, frozen sparkle, crafting material`),

  sprite("MAT_MAGMASPLITTER", "item", 16, 16, "post-mvp",
    "Material: Magmasplitter",
    `${STYLES.ITEM}, a magma shard: glowing orange-red volcanic rock fragment, molten core visible, hot embers, crafting material`),

  sprite("MAT_STURMFEDER", "item", 16, 16, "post-mvp",
    "Material: Sturmfeder",
    `${STYLES.ITEM}, a storm feather: electrified blue-white feather with lightning sparks, floating, wind element, crafting material`),

  sprite("MAT_SCHATTENFRAGMENT", "item", 16, 16, "post-mvp",
    "Material: Schattenfragment",
    `${STYLES.ITEM}, a shadow fragment: dark swirling void shard, purple-black edges, whispy darkness, crafting material`),

  sprite("MAT_ARKANKRISTALL", "item", 16, 16, "post-mvp",
    "Material: Arkankristall",
    `${STYLES.ITEM}, an arcane crystal: bright purple glowing crystal with floating rune symbols inside, magical energy, crafting material`),

  sprite("MAT_KNOCHEN_FRAGMENT", "item", 16, 16, "post-mvp",
    "Material: Knochenfragment",
    `${STYLES.ITEM}, a bone fragment: ancient yellowish bone shard with faint ghostly glow, undead essence, crafting material`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – T1 WAFFEN & AUSRÜSTUNG
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_HUNTER_BOW", "item", 128, 128, "mvp",
    "Item: Jägerbogen (T1 Waffe)",
    `${STYLES.ITEM}, a wooden hunter's bow with a taut string, fantasy RPG style`, 'green'),

  sprite("ITEM_OAK_STAFF", "item", 128, 128, "mvp",
    "Item: Eichenstab (T1 Waffe)",
    `${STYLES.ITEM}, a gnarled oak magic staff with a glowing green crystal tip`, 'green'),

  sprite("ITEM_WOLF_FANG_NECKLACE", "item", 128, 128, "mvp",
    "Item: Wolfszahn-Kette (T1 Accessoire)",
    `${STYLES.ITEM}, a necklace made of wolf fangs on a leather cord`, 'green'),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – T2 WAFFEN & AUSRÜSTUNG
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_STEEL_SWORD", "item", 256, 256, "post-mvp",
    "Item: Stahlschwert (T2 Waffe)",
    `${STYLES.ITEM}, a polished steel longsword with a cross-guard, T2 weapon`),

  sprite("ITEM_LONGBOW", "item", 256, 256, "post-mvp",
    "Item: Langbogen (T2 Waffe)",
    `${STYLES.ITEM}, an elegant elven longbow made of dark wood, T2 weapon`),

  sprite("ITEM_CRYSTAL_STAFF", "item", 256, 256, "post-mvp",
    "Item: Kristallstab (T2 Waffe)",
    `${STYLES.ITEM}, a crystal-topped magic staff glowing blue, T2 weapon`),

  sprite("ITEM_STEEL_ARMOR", "item", 256, 256, "post-mvp",
    "Item: Stahlrüstung (T2 Rüstung)",
    `${STYLES.ITEM}, heavy steel plate armor with shoulder guards, T2 armor`),

  sprite("ITEM_RANGER_CLOAK", "item", 16, 16, "post-mvp",
    "Item: Waldläufermantel (T2 Rüstung)",
    `${STYLES.ITEM}, a green hooded ranger cloak with leaf clasps, T2 armor`),

  sprite("ITEM_CRYSTAL_PENDANT", "item", 16, 16, "post-mvp",
    "Item: Kristallanhänger (T2 Accessoire)",
    `${STYLES.ITEM}, a glowing blue crystal pendant on a silver chain, T2 accessory`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – T3 BOSS-DROP AUSRÜSTUNG
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_TREANT_HEARTWOOD_SHIELD", "item", 256, 256, "post-mvp",
    "Item: Treant-Herzholzschild (T3 Boss-Drop)",
    `${STYLES.ITEM_EPIC}, a massive ancient shield carved from living treant heartwood, deep glowing green nature runes spiraling across the gnarled wood surface, vibrant green life-energy pulsing like a heartbeat through the grain, roots and vines coiling around the edges as if alive, ancient forest power radiating from the core`),

  sprite("ITEM_CRYSTAL_GOLEM_CORE", "item", 256, 256, "post-mvp",
    "Item: Kristallgolem-Kern (T3 Boss-Drop)",
    `${STYLES.ITEM_EPIC}, a cracked crystalline golem core pulsing with brilliant blue-white arcane energy, translucent blue crystal with a blazing magical light trapped within, glowing fracture lines on the facets, intense blue light beams shooting outward, pure magical energy barely contained, a crystal heart ripped from a destroyed golem`),

  sprite("ITEM_HYDRA_VENOMFANG", "item", 256, 256, "post-mvp",
    "Item: Hydra-Giftzahn (T3 Boss-Drop, Lifesteal)",
    `${STYLES.ITEM_EPIC}, a massive curved hydra fang dripping vivid toxic green venom, dark iridescent tooth surface with a blood-red glowing edge, thick green poison pooling at the lethal tip, sinister green energy tendrils swirling upward, a trophy from a slain hydra radiating dark life-draining power`),

  sprite("ITEM_BANDIT_KINGS_CLOAK", "item", 256, 256, "post-mvp",
    "Item: Banditenkönigs-Umhang (T3 Boss-Drop)",
    `${STYLES.ITEM_EPIC}, a magnificent dark crimson bandit king's battle cloak spread wide, rich deep red velvet with skull-embossed golden trim along every edge, dramatic dark shadows billowing behind it, a hidden glint of gold coins visible in a pocket, elegant and dangerous, the mark of a feared outlaw lord`),

  sprite("ITEM_SPIDER_SILK_VEST", "item", 256, 256, "post-mvp",
    "Item: Spinnenseide-Weste (T3 Boss-Drop, Dodge)",
    `${STYLES.ITEM_EPIC}, a sleek form-fitting vest armor woven entirely from enchanted queen spider silk, shimmering purple-silver iridescent fabric catching light like a prism, intricate web patterns worked into the weave, magical purple threading glowing faintly, impossibly thin yet supernaturally strong`),

  sprite("ITEM_FALLEN_KNIGHTS_BLADE", "item", 256, 256, "post-mvp",
    "Item: Klinge des Gefallenen Ritters (T3 Boss-Drop, Anti-Heal)",
    `${STYLES.ITEM_EPIC}, a heavy cursed knight's greatsword with a jagged pitch-black blade, deep crimson glowing runes carved along both edges, dark purple-black energy crackling and coursing through the metal, shadow tendrils bleeding from the crossguard, a weapon that corrupts and curses with every wound it inflicts`),

  sprite("ITEM_LICH_PHYLACTERY", "item", 256, 256, "post-mvp",
    "Item: Lich-Phylakterium (T3 Boss-Drop, Spell Power)",
    `${STYLES.ITEM_EPIC}, a sinister obsidian lich phylactery shaped like a skull, glowing green necromantic death-runes carved deep into the black stone, sickly green soul-energy swirling visibly within the cracked surface, magical chains of dark energy wrapped around it, the captured essence of undead power`),

  sprite("ITEM_WYRM_SCALE_SHIELD", "item", 256, 256, "post-mvp",
    "Item: Wyrmschuppen-Schild (T3 Boss-Drop, Fire Resist)",
    `${STYLES.ITEM_EPIC}, a powerful war shield covered entirely in brilliant red dragon wyrm scales, each overlapping scale gleaming like fire-hardened crimson metal, a massive central dragon-eye gem burning with orange-red fire, wisps of actual flame curling from the rim, forged from a slain wyrm's hide`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – T4 LEGENDARY AUSRÜSTUNG
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_BLADE_OF_THOUSAND_SHADOWS", "item", 256, 256, "post-mvp",
    "Item: Klinge der 1000 Schatten (T4 Legendary)",
    `${STYLES.ITEM_EPIC}, a legendary void-black katana with a blade that seems to be made of crystallized darkness itself, the edge vanishing into pure shadow, thousands of tiny shadow wisps trailing upward like smoke, deep violet void runes blazing along the central groove, absolute darkness and death embodied in a weapon`),

  sprite("ITEM_SHIELD_OF_THE_ANCIENT", "item", 256, 256, "post-mvp",
    "Item: Schild des Uralten (T4 Legendary)",
    `${STYLES.ITEM_EPIC}, a colossal ancient stone shield from the age of gods, its deep grey stone surface entirely covered in blazing golden divine runes of tremendous age and power, a massive central gemstone burning with blinding golden divine light, intricate dwarven inscriptions telling a saga of a thousand battles, absolutely indestructible and divine`),

  sprite("ITEM_AMULET_OF_REBIRTH", "item", 256, 256, "post-mvp",
    "Item: Amulett der Wiedergeburt (T4 Legendary)",
    `${STYLES.ITEM_EPIC}, a breathtaking legendary golden phoenix amulet with a magnificent phoenix spreading its wings wide at the center, brilliant golden-orange resurrection flames blazing outward, wing-tips set with glowing rubies and sapphires, divine golden light radiating in all directions, the embodiment of rebirth and eternal life`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS Post-MVP – VERBRAUCHSGÜTER & SCHÄTZE
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_POWER_BREAD", "item", 16, 16, "post-mvp",
    "Item: Kraftbrot (Verbrauchsgut)",
    `${STYLES.ITEM}, enchanted golden bread loaf radiating magical energy`),

  sprite("ITEM_HERB_GREEN", "item", 16, 16, "post-mvp",
    "Item: Grüne Kräuter (Verbrauchsgut)",
    `${STYLES.ITEM}, a bundle of fresh green healing herbs tied with twine`),

  sprite("ITEM_OLD_COIN", "item", 16, 16, "post-mvp",
    "Item: Alte Münze (Schatz)",
    `${STYLES.ITEM}, an ancient worn gold coin with mysterious engravings`),

  sprite("ITEM_TALISMAN_FRAGMENT", "item", 16, 16, "post-mvp",
    "Item: Talisman-Fragment (Schatz)",
    `${STYLES.ITEM}, a broken shard of a magical talisman glowing faintly purple`),

  // ═══════════════════════════════════════════════════════════
  // TALISMANE (Post-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("TALISMAN_FORTITUDE", "item", 16, 16, "post-mvp",
    "Talisman: Standhaftigkeit (+HP)",
    `${STYLES.ITEM}, a fortitude talisman: round bronze medallion with shield emblem, protective warm glow, sturdy chain, defensive charm`),

  sprite("TALISMAN_STRIKER", "item", 16, 16, "post-mvp",
    "Talisman: Angreifer (+ATK)",
    `${STYLES.ITEM}, a striker talisman: sharp red crystal pendant, aggressive jagged edges, power glow, offensive charm`),

  sprite("TALISMAN_FRAGMENT", "item", 16, 16, "post-mvp",
    "Talisman: Fragment (Basis-Material)",
    `${STYLES.ITEM}, a talisman fragment: broken piece of ancient magical artifact, faint residual glow, mysterious runes, raw material`),

  // ═══════════════════════════════════════════════════════════
  // SPEZIALISTEN-PORTRAITS (Post-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("SPEC_BAKER_MASTER", "specialist", 32, 32, "post-mvp",
    "Spezialist: Bäckermeister",
    `${STYLES.SPECIALIST}, a master baker: friendly round face, white baker hat (toque), flour-dusted apron, warm smile, holding bread`),

  sprite("SPEC_HERB_SAGE", "specialist", 32, 32, "post-mvp",
    "Spezialist: Kräuterweise",
    `${STYLES.SPECIALIST}, an herb sage: elderly wise woman, green headscarf, kind eyes, holding herb bundle, nature-attuned healer`),

  sprite("SPEC_FORGE_SMITH", "specialist", 32, 32, "post-mvp",
    "Spezialist: Schmiedemeister",
    `${STYLES.SPECIALIST}, a forge master: strong bearded man, leather apron, soot-marked face, holding hammer, muscular arms, determined look`),

  // ═══════════════════════════════════════════════════════════
  // HELD-PORTRAITS — Große Charakter-Illustrationen (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("PORTRAIT_GUARDIAN", "unit", 256, 320, "mvp",
    "Held-Portrait: Guardian (Beschützer)",
    `${STYLES.PORTRAIT}, a heavily armored knight guardian hero: full plate armor in deep blue and gold, large tower shield with heraldic crest, one-handed sword raised in guard stance, stern noble face with battle-worn expression, golden cape flowing behind, glowing blue runes on armor, protective warrior of the realm`),

  sprite("PORTRAIT_RANGER", "unit", 256, 320, "mvp",
    "Held-Portrait: Ranger (Waldläufer)",
    `${STYLES.PORTRAIT}, a swift elven ranger hero: lightweight green-brown leather armor with silver accents, recurve bow in hand with arrow nocked, quiver on back, sharp focused eyes scanning the distance, short dark cape, gloves with protective bracers, agile hunter pose leaning slightly forward, forest and nature attunement visible in earthy tones`),

  sprite("PORTRAIT_CLERIC", "unit", 256, 320, "mvp",
    "Held-Portrait: Cleric (Heilerin)",
    `${STYLES.PORTRAIT}, a wise female cleric healer hero: flowing white and gold robes with holy symbols, ornate wooden staff topped with a glowing white gem, gentle powerful expression, warm golden light emanating from staff hand, divine aura around the character, intricate embroidered robes, sacred medallion around neck, healer and protector of the innocent`),

  // ═══════════════════════════════════════════════════════════
  // TERRAIN / BIOME TILES (Post-MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("TILE_GRASS", "terrain", 32, 32, "post-mvp",
    "Terrain: Gras (Standard)",
    `${STYLES.TERRAIN}, a grass tile: lush green grass with subtle variation, few tiny flowers, flat top-down seamless tile, solid black background`),

  sprite("TILE_FOREST", "terrain", 32, 32, "post-mvp",
    "Terrain: Wald-Boden",
    `${STYLES.TERRAIN}, a forest floor tile: dark brown earth with fallen leaves, small mushrooms, tree roots, seamless tile, solid black background`),

  sprite("TILE_CAVE", "terrain", 32, 32, "post-mvp",
    "Terrain: Höhlen-Boden",
    `${STYLES.TERRAIN}, a cave floor tile: dark grey stone with crystal fragments, small puddles, rough rocky surface, seamless tile, solid black background`),

  sprite("TILE_SWAMP", "terrain", 32, 32, "post-mvp",
    "Terrain: Sumpf-Boden",
    `${STYLES.TERRAIN}, a swamp tile: murky green-brown water with lily pads, reeds, bubbles, muddy edges, seamless tile, solid black background`),

  sprite("TILE_WATER", "terrain", 32, 32, "post-mvp",
    "Terrain: Wasser",
    `${STYLES.TERRAIN}, a water tile: blue reflective water surface with gentle ripples, seamless tile, solid black background`),

  // ═══════════════════════════════════════════════════════════
  // UI-TEXTUREN (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("UI_PANEL_BG", "ui", 256, 256, "mvp",
    "UI: Panel-Hintergrund",
    `${STYLES.UI_ELEMENT}, a dark stone panel background for game UI, subtle cracks and weathering, slightly rounded corners, soft inner glow, dark grey-blue stone texture`),

  sprite("UI_PANEL_HEADER", "ui", 256, 64, "mvp",
    "UI: Panel-Header-Balken",
    `${STYLES.UI_ELEMENT}, a wooden header bar for game UI panel, dark oak wood with small metal rivets on edges, horizontal plank texture, slightly lighter than the panel`),

  sprite("UI_BUTTON_NORMAL", "ui", 128, 48, "mvp",
    "UI: Button normal",
    `${STYLES.UI_ELEMENT}, a raised stone and wood button for game UI, slightly convex surface with 3D bevel effect, rounded corners, medium brown wood frame with stone center`),

  sprite("UI_BUTTON_HOVER", "ui", 128, 48, "mvp",
    "UI: Button hover",
    `${STYLES.UI_ELEMENT}, a glowing highlighted stone and wood button for game UI, same shape as normal button but with warm golden glow and shimmer effect, brighter and more inviting`),

  sprite("UI_BUTTON_ACTIVE", "ui", 128, 48, "mvp",
    "UI: Button aktiv/gedrückt",
    `${STYLES.UI_ELEMENT}, a pressed-in stone and wood button for game UI, same shape but visually pushed down, darker, inverted bevel, slight shadow on top edge`),

  sprite("UI_HUD_BAR", "ui", 256, 48, "mvp",
    "UI: HUD-Leiste oben",
    `${STYLES.UI_ELEMENT}, a wide ornamental bar for top HUD, dark wood and metal construction, decorative metal studs along edges, horizontally tileable, rich dark brown with gold trim`),

  sprite("UI_SIDEBAR_BG", "ui", 64, 256, "mvp",
    "UI: Sidebar-Hintergrund",
    `${STYLES.UI_ELEMENT}, a vertical stone pillar background for sidebar UI, dark stone with ornamental carved edges, narrow and tall, subtle moss or vine detail at edges`),

  sprite("UI_BUILDMENU_BG", "ui", 256, 80, "mvp",
    "UI: Build-Menü-Hintergrund",
    `${STYLES.UI_ELEMENT}, a wide horizontal bar for build menu, dark wood plank base with iron reinforcement strips, horizontally stretchable, sturdy medieval workshop look`),

  sprite("UI_TAB_ACTIVE", "ui", 128, 40, "mvp",
    "UI: Aktiver Tab",
    `${STYLES.UI_ELEMENT}, an active tab for game UI, light warm wood, rounded top corners, seamlessly connecting to panel below, slightly raised appearance, well-lit`),

  sprite("UI_TAB_INACTIVE", "ui", 128, 40, "mvp",
    "UI: Inaktiver Tab",
    `${STYLES.UI_ELEMENT}, an inactive tab for game UI, darker recessed wood, rounded top corners, slightly pushed back, less prominent than active tab, same shape`),

  sprite("UI_TOOLTIP_BG", "ui", 128, 128, "mvp",
    "UI: Tooltip-Hintergrund",
    `${STYLES.UI_ELEMENT}, a parchment tooltip background for game UI, aged yellowish paper texture, thin dark border, slightly curled edges, clean and readable`),

  sprite("UI_FRAME_GOLD", "ui", 128, 128, "mvp",
    "UI: Goldener Zierrahmen",
    `${STYLES.UI_ELEMENT}, an ornamental golden picture frame for game UI, decorative gold border with small flourishes at corners, inner area is transparent/magenta, medieval heraldic style`),

  sprite("UI_PROGRESS_BAR_BG", "ui", 256, 24, "mvp",
    "UI: Fortschrittsbalken-Hintergrund",
    `${STYLES.UI_ELEMENT}, a progress bar background trough for game UI, dark hollowed-out stone channel, slightly recessed, ready to be filled with colored bar`),

  sprite("UI_PROGRESS_BAR_FILL", "ui", 256, 24, "mvp",
    "UI: Fortschrittsbalken-Füllung (grün)",
    `${STYLES.UI_ELEMENT}, a green glowing energy bar fill for game progress bar, bright emerald green with inner glow and slight shimmer, smooth gradient, horizontal`),

  sprite("UI_HP_BAR_FILL", "ui", 256, 24, "mvp",
    "UI: HP-Balken-Füllung (grün→rot)",
    `${STYLES.UI_ELEMENT}, a health bar fill with gradient from bright green on left to deep red on right, smooth color transition, glowing energy look, horizontal bar`),

  sprite("UI_RESOURCE_SLOT", "ui", 96, 40, "mvp",
    "UI: Ressourcen-Slot im HUD",
    `${STYLES.UI_ELEMENT}, a small resource slot frame for HUD, dark recessed compartment with thin metallic border, compact rectangular shape, slightly darker inside`),

  sprite("UI_CARD_BG", "ui", 256, 128, "mvp",
    "UI: Karten-Hintergrund",
    `${STYLES.UI_ELEMENT}, a card background for game UI, aged parchment and leather look, thin stitched leather border, warm beige interior, slightly worn edges`),

  sprite("UI_DIVIDER", "ui", 256, 8, "mvp",
    "UI: Trennlinie ornamental",
    `${STYLES.UI_ELEMENT}, a thin horizontal ornamental divider line for game UI, delicate metal filigree with small diamond shape in the center, decorative separator`),

  sprite("UI_LOGO", "ui", 512, 128, "mvp",
    "UI: Magic City Logo",
    `${STYLES.UI_ELEMENT}, the text 'Magic City' as a fantasy game logo, golden ornate medieval lettering with magical sparkle effects, decorative flourishes around letters, epic fantasy style`),

  // ═══════════════════════════════════════════════════════════
  // ICONS SIDEBAR & RESSOURCEN (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ICON_BUILD", "icon", 64, 64, "mvp",
    "Icon: Bauen",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered construction hammer — thick orange wooden handle, heavy dark iron hammerhead at 30-degree angle with metallic highlight, bold cel-shaded 3D style, clean symbol fills 65% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_ROAD", "icon", 64, 64, "mvp",
    "Icon: Straße",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered cobblestone road symbol — three grey-beige rectangular stones side by side with dark mortar lines, slight perspective, bold cel-shaded style, clean symbol fills 65% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_GUILD", "icon", 64, 64, "mvp",
    "Icon: Gilde",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered medieval guild emblem — bright gold heraldic shield with two crossed silver swords behind it, bold cel-shaded 3D metallic style, clean symbol fills 70% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_EXPEDITION", "icon", 64, 64, "mvp",
    "Icon: Expedition",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered compass rose — 8-pointed gold and teal metallic compass, cardinal directions N S E W visible, gleaming metallic sheen, bold cel-shaded style, clean symbol fills 70% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_STORAGE", "icon", 64, 64, "mvp",
    "Icon: Lager",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered wooden treasure chest — dark brown wood planks with gold metal bands and iron lock, 3/4 front view, bold cel-shaded 3D style, clean symbol fills 72% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_HELP", "icon", 64, 64, "mvp",
    "Icon: Hilfe",
    `Game UI icon, pure solid magenta background #FF00FF filling the entire image, centered bold question mark — large bright gold metallic question mark with circular dot below, glowing magical sparkle aura, 3D metallic cel-shaded style, clean symbol fills 68% of frame, no decorative corner brackets or frames, strong black outlines, no text`),

  sprite("ICON_WOOD", "icon", 32, 32, "mvp",
    "Icon: Holz (HUD)",
    `${STYLES.ICON}, a small wood log stack icon, three brown logs stacked, tiny clear icon`),

  sprite("ICON_STONE", "icon", 32, 32, "mvp",
    "Icon: Stein (HUD)",
    `${STYLES.ICON}, a small grey stone block icon, rough-cut stone cube, tiny clear icon`),

  sprite("ICON_BREAD", "icon", 32, 32, "mvp",
    "Icon: Brot (HUD)",
    `${STYLES.ICON}, a small bread loaf icon, golden brown round bread, tiny clear icon`),

  sprite("ICON_GOLD", "icon", 32, 32, "mvp",
    "Icon: Gold (HUD)",
    `${STYLES.ICON}, a small gold coins icon, stack of shiny gold coins, tiny clear icon`),

  sprite("ICON_POP", "icon", 32, 32, "mvp",
    "Icon: Bevölkerung (HUD)",
    `${STYLES.ICON}, a small person silhouette icon, simple villager figure outline, tiny clear icon`),

  sprite("ICON_TRAINING", "icon", 32, 32, "mvp",
    "Icon: Training (HUD)",
    `${STYLES.ICON}, a small sword with sparks icon, blade with training sparks flying off, tiny clear icon`),

  // ═══════════════════════════════════════════════════════════
  // HINTERGRÜNDE & DEKO (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("BG_MAIN_MENU", "terrain", 1280, 720, "mvp",
    "Hintergrund: Hauptmenü",
    `${STYLES.BUILDING}, a panoramic fantasy medieval city at golden hour sunset, towers and rooftops visible, warm atmospheric lighting, slightly blurred painterly style, wide landscape format, magical atmosphere with faint glowing particles`),

  sprite("DECO_FLOWER_1", "terrain", 32, 32, "mvp",
    "Deko: Wildblumen",
    `${STYLES.TERRAIN}, tiny colorful wildflowers patch, small meadow flowers in pink yellow and white, top-down view`),

  sprite("DECO_ROCK_1", "terrain", 32, 32, "mvp",
    "Deko: Feldstein",
    `${STYLES.TERRAIN}, a tiny grey field stone, small natural rock, top-down view`),

  sprite("DECO_BUSH_1", "terrain", 32, 32, "mvp",
    "Deko: Busch",
    `${STYLES.TERRAIN}, a tiny green leafy bush, small round shrub, top-down view`),

  sprite("TERRAIN_GRASS", "terrain", 64, 64, "mvp",
    "Terrain: Gras-Tile (nahtlos)",
    `${STYLES.TERRAIN}, a seamless grass tile texture, lush green with subtle color variation, top-down view, tileable on all edges, natural meadow look`),

  // ─── Visual Overhaul: Map Border & Deko ──────────────────────

  sprite("TERRAIN_TREE_LARGE", "terrain", 64, 80, "mvp",
    "Großer Laubbaum für Map-Rand",
    `${STYLES.BUILDING}, a large lush green deciduous oak tree seen from isometric 3/4 top-down perspective, round full canopy with rich green leaves, thick brown trunk, fantasy medieval style, vibrant greens and warm browns, solid bright magenta background (#FF00FF), single tree centered, no ground, no text`),

  sprite("TERRAIN_TREE_PINE", "terrain", 48, 72, "mvp",
    "Nadelbaum für Map-Rand",
    `${STYLES.BUILDING}, a tall evergreen pine tree seen from isometric 3/4 top-down perspective, triangular dark green conifer shape, fantasy medieval style, vibrant dark greens, solid bright magenta background (#FF00FF), single tree centered, no ground, no text`),

  sprite("DECO_TREE_SMALL", "terrain", 32, 40, "mvp",
    "Kleiner Baum für Spielfeld",
    `${STYLES.BUILDING}, a small young sapling tree seen from isometric 3/4 top-down perspective, tiny round green canopy, thin trunk, cute and compact, fantasy medieval style, solid bright magenta background (#FF00FF), single small tree centered, no ground, no text`),

  sprite("DECO_GRASS_TUFT", "terrain", 32, 32, "mvp",
    "Deko: Hohes Grasbüschel",
    `${STYLES.TERRAIN}, a small tuft of tall wild grass blades, green and yellow-green meadow grass, top-down view, transparent look`),

  sprite("DECO_STONE_LARGE", "terrain", 32, 32, "mvp",
    "Deko: Großer Feldstein",
    `${STYLES.TERRAIN}, a medium sized mossy grey boulder stone, natural rock with green moss patches, top-down view`),

  sprite("DECO_MUSHROOM", "terrain", 32, 32, "mvp",
    "Deko: Pilzgruppe",
    `${STYLES.TERRAIN}, a tiny cluster of three small fantasy mushrooms, red caps with white dots, cute and colorful, top-down view`),

  sprite("DECO_LOG", "terrain", 32, 32, "mvp",
    "Deko: Gefallener Baumstamm",
    `${STYLES.TERRAIN}, a small fallen log piece, brown wood with bark texture, moss growing on it, top-down view`),

  sprite("DECO_WILDFLOWER_2", "terrain", 32, 32, "mvp",
    "Deko: Blaue Wildblumen",
    `${STYLES.TERRAIN}, tiny blue and purple wildflowers patch, small meadow flowers, delicate and colorful, top-down view`),

  sprite("TERRAIN_DIRT", "terrain", 32, 32, "mvp",
    "Terrain: Erd-Basis unter Gebäuden",
    `${STYLES.TERRAIN}, a seamless dirt earth patch tile, brown packed earth with subtle pebbles, top-down view, flat and even surface`),

  sprite("TERRAIN_WATER", "terrain", 64, 64, "mvp",
    "Terrain: Wasser-Tile für Map-Rand",
    `${STYLES.TERRAIN}, a seamless water tile, clear blue medieval fantasy pond water with gentle ripples, top-down view, tileable`),

  sprite("ROAD_COBBLE", "terrain", 32, 32, "mvp",
    "Straße: Kopfsteinpflaster",
    `${STYLES.TERRAIN}, a seamless cobblestone road tile, grey and brown medieval stone pavement, neat fitted stones, top-down view, tileable on all edges`),

  // ─── Cliff Face Source Textures (for floating island edges) ──
  sprite("CLIFF_SOURCE_A", "terrain", 128, 192, "mvp",
    "Klippen-Textur A: Erdreich und Felsen",
    `A vertical cross-section texture of a fantasy floating island cliff face, viewed directly from the side as a flat texture sheet. The image shows distinct horizontal geological strata filling the ENTIRE image edge to edge: at the very top a thin strip of grass with visible soil and small dangling root tips, below that a thick warm brown earth layer with embedded small pebbles and cut roots, transitioning into grey-brown weathered sedimentary rock with horizontal crack lines and small patches of green moss, and at the bottom dark nearly-black basalt stone. Rich earthy natural colors, painterly game art style with visible brush texture and color variation within each layer. The texture must fill the entire rectangular image with NO empty space and NO background color.`,
    undefined, true),

  sprite("CLIFF_SOURCE_B", "terrain", 128, 192, "mvp",
    "Klippen-Textur B: Magischer Kristall-Felsen",
    `A vertical cross-section texture of a magical fantasy floating island cliff face, viewed directly from the side as a flat texture sheet. The image shows distinct horizontal geological strata filling the ENTIRE image edge to edge: at the top a thin grass edge with twisted root tendrils hanging down, below that reddish-brown sedimentary earth with occasional small glowing purple amethyst crystals embedded in cracks, transitioning into weathered grey stone with green lichen patches and faint blue-glowing ancient vein patterns, and at the bottom dark volcanic basalt. Rich fantasy color palette with subtle magical elements. Painterly game art style. The texture must fill the entire rectangular image with NO empty space and NO background color.`,
    undefined, true),

  // ─── Cliff Edge Decoration Sprites (3D isometric) ─────────────
  // Felsblöcke und Pflanzen für natürliche Klippenkante

  sprite("CLIFF_ROCK_LARGE", "terrain", 80, 96, "mvp",
    "Klippen-Deko: Großer zerklüfteter Felsbrocken",
    `${STYLES.ISO_TREE}, a large rugged weathered boulder sitting on a cliff edge,
dark grey and brown stone with deep cracks and rough chipped surface,
patches of green-grey lichen and dark moss in crevices,
the rock has an irregular jagged shape with sharp broken edges,
small loose pebbles and rubble scattered at its base,
subtle purple crystal vein glowing faintly in one crack,
dramatic rocky mass, heavy and ancient looking, casting shadow to lower-right`),

  sprite("CLIFF_ROCK_SMALL", "terrain", 48, 48, "mvp",
    "Klippen-Deko: Kleine Felsgruppe / Trümmer",
    `${STYLES.ISO_TREE}, a cluster of 3-4 small broken rock fragments on ground,
dark grey stone rubble with sharp fractured edges,
tiny green moss patches, a few loose pebbles scattered around,
the rocks look like they broke off from a larger cliff face,
natural weathered stone texture, isometric perspective with shadow to lower-right`),

  sprite("CLIFF_CRYSTAL", "terrain", 64, 96, "mvp",
    "Klippen-Deko: Magische Kristall-Felsformation",
    `${STYLES.ISO_TREE}, a dramatic crystal formation growing from dark rock,
3-4 large pointed purple and violet amethyst crystal shards jutting upward at angles,
the crystals emit a soft magical purple-blue glow illuminating surrounding rock,
dark grey stone base with cracks where crystals emerge,
small sparkling particles floating around the crystal tips,
mystical and ancient, fantasy RPG crystal node, isometric view with shadow to lower-right`),

  sprite("CLIFF_VINE_HANG", "terrain", 48, 96, "mvp",
    "Klippen-Deko: Hängende Ranken und Wurzeln",
    `${STYLES.ISO_TREE}, thick twisted vines and ancient tree roots hanging downward,
dark brown woody roots intertwined with green leafy vines,
small leaves and tiny glowing blue-green bioluminescent flowers dotted along the vines,
the vines hang vertically as if draping over a cliff edge,
some roots are thick and gnarled, others thin and trailing,
natural organic shapes, fantasy jungle vegetation, isometric perspective`),

  sprite("CLIFF_EDGE_BUSH", "terrain", 64, 64, "mvp",
    "Klippen-Deko: Randbusch mit sichtbaren Wurzeln",
    `${STYLES.ISO_TREE}, a wild overgrown bush growing on the edge of a cliff,
dense dark green foliage with scattered tiny white and yellow flowers,
thick twisted roots visible below extending over and gripping the rock edge,
the bush leans slightly outward over the void as if reaching for light,
a few branches hang down past the cliff face,
rugged natural growth, fantasy wilderness plant, isometric view with shadow to lower-right`),

  sprite("CLIFF_MUSHROOM_GLOW", "terrain", 48, 64, "mvp",
    "Klippen-Deko: Glühende Fantasy-Pilze an Felswand",
    `${STYLES.ISO_TREE}, a cluster of 4-5 fantasy mushrooms growing from dark stone,
large flat caps in teal and cyan colors with bioluminescent glow,
the mushrooms emit soft blue-green light illuminating the nearby rock surface,
thin pale stalks attached to dark grey stone surface,
small glowing spores floating upward from the caps,
magical cave mushrooms, ethereal and mysterious, isometric perspective with shadow`),

  // ─── Isometric Building Sprites (Sci-Fi Techno-Fantasy) ──────
  sprite("ISO_HOUSE", "building", 160, 200, "mvp",
    "ISO: Habitat-Pod (Wohngebäude, Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a compact sci-fi habitat pod / crew quarters module,
top face shows modular roof panels with air recycling vents, solar cell strips and a small status antenna,
left wall shows dark riveted metal plating with blue energy conduit lines and two hexagonal viewport windows glowing warm amber,
front has a pressurized airlock door with glowing green access panel and entry light strip,
small rounded shape, functional crew housing, warm amber interior glow contrasting cool metal exterior`),

  sprite("ISO_GUILD_HALL", "building", 256, 320, "mvp",
    "ISO: Kommandozentrum / Gilden-Nexus (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a large imposing operations command center and guild nexus,
top face shows communication array dishes, rotating radar dome and holographic projector emitting blue light,
left wall displays tall arched energy-windows glowing blue from interior holo-screens, arkan-veined stone buttresses with purple glow,
front facade has massive reinforced blast doors flanked by glowing shield generator pylons,
holographic guild crest emblem projected above the entrance, arkan energy crystals embedded at every corner,
impressive two-story structure radiating power and authority`),

  sprite("ISO_WAREHOUSE", "building", 224, 256, "mvp",
    "ISO: Cargo-Hangar / Lagerbucht (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a large sci-fi armored cargo storage hangar,
top face shows rows of sealed cargo hatch panels and a retractable loading crane arm,
left wall shows thick reinforced blast panels with a cargo manifest hologram screen mounted on the wall,
front has massive double shutter blast doors with yellow caution stripes and automated loading dock,
stacked metal cargo containers visible near the entrance, industrial and functional military aesthetic`),

  // ─── Isometric Building Sprites – Ressourcen ─────────────────
  sprite("ISO_FARM_GRAIN", "building", 384, 440, "mvp",
    "ISO: Hydroponik-Bucht / Nahrungsproduktion (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi hydroponics production bay and food synthesis unit,
top face shows transparent cultivation dome panels with glowing cyan and green grow-lights visible through them,
left side shows metallic walls with bio-tube conduits and nutrient flow pipes running vertically,
front has sliding glass lab doors with a food production display screen, lush glowing plants visible inside,
warm teal and green light tones contrast the dark metal hull, living plants thrive inside the industrial shell`),

  sprite("ISO_MILL_WIND", "building", 192, 280, "mvp",
    "ISO: Energie-Kollektor-Turm (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a tall sci-fi energy collector tower with a rotating turbine array,
tall cylindrical metallic tower body with energy absorption panels lining the sides,
large spinning turbine rotor blades extending to the upper-right in isometric view, glowing at the hub,
glowing purple arkan energy flows down spiral conduits along the tower exterior,
front base shows a power distribution hub with thick output cables branching out,
blue-white crackling energy at the turbine center, powerful and iconic`),

  sprite("ISO_BAKERY", "building", 160, 200, "mvp",
    "ISO: Syntheseküche / Nahrungslabor (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a compact sci-fi food synthesis laboratory and processing unit,
top face shows exhaust steam vents and a small cooling array with blinking status lights,
left wall shows a reinforced glass panel revealing a glowing fabrication chamber with orange processing glow inside,
front has a service window with holographic menu display and an automated food dispenser slot,
warm amber glow from processing units, chemical conduit pipes on the exterior, efficient and functional`),

  sprite("ISO_LUMBER_CAMP", "building", 160, 200, "mvp",
    "ISO: Material-Verarbeitungseinheit (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a compact sci-fi raw material processing and sorting unit,
top face shows an open-top sorting bay with raw material chunks on a conveyor belt,
left wall shows rugged armored panels with a mounted laser cutter tool rack and extraction arm,
front has a loading dock with a material hopper chute and control panel interface with holographic readout,
sparks and particle effects from material cutting, industrial and rugged, functional workhorse aesthetic`),

  sprite("ISO_QUARRY", "building", 192, 220, "mvp",
    "ISO: Tiefen-Bohrplattform / Abbau-Anlage (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi deep core mining drill platform,
top face shows the drill shaft opening with rotating drill head machinery and excavated rock debris,
left wall shows exposed reinforced drilling framework with hydraulic struts and structural supports,
front has a worker operator shelter booth with core sample display screen and extraction control console,
dark grey rock and gleaming metal, ore veins lit by drilling equipment lights, industrial extraction atmosphere`),

  sprite("ISO_HERB_GARDEN", "building", 192, 220, "mvp",
    "ISO: Xenobotanik-Labor / Kultivierungskapsel (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi xenobotany biolab and specimen cultivation pod,
top face shows a curved transparent dome with exotic bioluminescent alien plants and specimen tubes glowing inside,
left wall shows metallic lab walls with specimen storage cylinders glowing cyan and purple,
front has a sealed bio-containment lab entrance with airlock status display and warning lights,
lush alien-looking plants with bioluminescent glows visible through glass, mysterious scientific atmosphere`),

  sprite("ISO_SMITHY", "building", 192, 220, "mvp",
    "ISO: Montage-Schmiede / Fertigungswerkstatt (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi advanced assembly forge and equipment fabrication workshop,
top face shows factory roof with exhaust stacks glowing orange-red from active energy forge below,
left wall shows the workshop exterior with robotic arm mount brackets and a blueprint hologram display screen,
front has a large open workshop bay with a glowing blue-orange energy anvil, sparks flying dramatically,
dark heat-proof metal walls, weapon racks and finished gear visible inside, hot industrial forge atmosphere`),

  sprite("ISO_IRON_MINE", "building", 224, 256, "mvp",
    "ISO: Tiefen-Extraktionsschacht (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi deep resource extraction shaft facility,
top face shows the mine shaft opening with automated extraction machinery and ore scanner beams,
left side shows massive reinforced metal portal beams with pulsing safety warning lights,
front has an industrial mine entrance with crawler vehicle tracks leading in and an ore conveyor belt running out,
dark metallic structure with glowing scan beams illuminating the shaft, powerful drilling operation atmosphere`),

  sprite("ISO_WELL", "building", 128, 160, "mvp",
    "ISO: Energie-Knoten / Relais-Säule (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a compact sci-fi energy node and power relay pillar,
top shows a large glowing arkan energy crystal mounted on the relay cap, pulsing blue-purple,
left side shows a hexagonal metallic pillar body with stacked energy distribution rings glowing,
front has a small holographic status display panel showing power grid output and node status,
energy conduit lines branching outward from the base in all directions, constant energy shimmer and glow`),

  sprite("ISO_TREASURE_CHEST", "building", 512, 640, "mvp",
    "ISO: Schatztruhe – geschlossen, lange Seite zum Betrachter",
    `Isometric pixel art building sprite, pure solid magenta background #FF00FF filling the entire image completely.
A closed wooden treasure chest rendered in isometric pixel art style. Image is 128x160 pixels.

EXACT ORIENTATION — this is critical:
- The chest is a rectangular box (wider than tall, like a real treasure chest).
- The chest's LONG AXIS runs from the LEFT side of the image to the RIGHT side of the image (horizontal in the image).
- The LARGE FRONT FACE of the chest (the long side with the lock) faces toward the BOTTOM of the image — toward the viewer. This face takes up the lower half of the chest in the image.
- The TOP of the chest is visible from slightly above (standard isometric top-down angle).
- The small SHORT END faces toward the upper-right of the image.
- Think of it like a wooden crate or treasure box lying on its side, viewed from slightly above and in front, long side facing you.

Visual details: Dark aged oak wood planks, a horizontal metal band across the front face, an iron lock clasp in the center of the front face. Worn wood grain texture on the top. Small copper rivets at corners.
Color palette: MUTED medieval — dark brown wood, dull aged bronze/iron hardware, no bright colors, no gems, no glow.
Rests flat on the ground. Strong black outlines. SNES/GBA pixel art style.`),

  sprite("ISO_TREASURE_CHEST_V2", "building", 512, 640, "mvp",
    "ISO: Schatztruhe V2 – geschlossen, lange Seite zum Betrachter, wärmere Farben",
    `Isometric pixel art building sprite, pure solid magenta background #FF00FF filling the entire image completely.
A closed wooden treasure chest rendered in isometric pixel art style. Image is 128x160 pixels.

EXACT ORIENTATION — this is critical:
- The chest is a rectangular box (wider than tall, like a real treasure chest).
- The chest's LONG AXIS runs from the LEFT side of the image to the RIGHT side of the image (horizontal in the image).
- The LARGE FRONT FACE of the chest (the long side with the lock) faces toward the BOTTOM of the image — toward the viewer. This face takes up the lower half of the chest in the image.
- The TOP of the chest is visible from slightly above (standard isometric top-down angle).
- The small SHORT END faces toward the upper-right of the image.
- Think of it like a wooden crate or treasure box lying on its side, viewed from slightly above and in front, long side facing you.

Visual details: Dark aged oak wood planks with worn grain texture, aged gold metal bands running horizontally across the front face, an ornate iron lock clasp with a keyhole in the center of the front face. Brass corner reinforcements and small copper rivets. A subtle warm glow around the lock hinting at magical contents.
Color palette: Dark brown oak wood, warm aged gold/brass hardware, rich amber wood tones — warmer and more ornate than the V1 chest.
Rests flat on the ground. Strong black outlines. SNES/GBA pixel art style. Same quality as existing guild hall and smithy sprites.`),

  sprite("ISO_BANK_V2", "building", 512, 640, "mvp",
    "ISO: Arkan-Bank mit Truhe (Scifi-Medieval)",
    `${STYLES.ISO_BUILDING_SCIFI}, a grand two-story arcane city bank and treasury building with a large treasure chest placed prominently beside it,
BUILDING: top face shows a steep gabled dark charcoal slate roof with heavy iron ridge capping, decorative arkan-crystal finial at the peak glowing warm gold, iron chimney with faint smoke,
left wall shows two-story dark oak timber frame construction with thick exposed wooden beams, riveted iron reinforcement bands across the planks, arkan-energy veins glowing golden-amber pulsing through the wood grain, two tall arched windows with warm amber interior glow and iron bar grilles,
front facade: wide heavy oak double doors with oversized iron hinges and iron bolts, stone foundation steps, iron torch brackets flanking the entrance with bright flickering flames, a large ornate carved gold coin-and-scales guild emblem above the door, ivy creeping at the lower corners,
TREASURE CHEST: a very large closed wooden treasure chest sitting directly beside the front-left of the building on the ground, richly detailed — warm dark oak wood planks with wide gold metal bands and corner iron fittings, a prominent ornate brass lock on the front latch, subtle golden glow emanating from the chest seams hinting at magical contents inside, slightly angled toward viewer for full visibility,
COLOR PALETTE: deep brown oak, dark charcoal slate, warm amber-gold glow, iron grey hardware — rich and detailed matching the guild hall quality,
the whole scene reads as a wealthy secure bank full of magical treasure, high detail, premium game asset quality`),

  sprite("ISO_BANK", "building", 512, 640, "mvp",
    "ISO: Mittelalterliche Fantasie-Bank",
    `${STYLES.ISO_BUILDING}, a sturdy imposing medieval fantasy bank building,
top face shows a solid stone roof with iron ridge capping, a gilded weathervane shaped like a coin on top, heavy stone chimney,
left wall shows thick fortified stone masonry with narrow iron-barred windows with gold coin motif ironwork, stone buttresses reinforcing the wall,
front facade has a grand stone archway entrance with heavy iron-reinforced oak double doors, stone pillars flanking the entrance with iron torch brackets holding burning flames,
a large carved golden coin sign mounted above the entrance with decorative ironwork frame, stone steps leading up to the entrance,
a heavy iron-banded vault door visible through a side arch, iron chains and locks on display,
warm stone colors with gold and brass accents, authoritative and wealthy atmosphere matching the guild hall style`),

  sprite("ISO_VAULT", "building", 512, 640, "mvp",
    "ISO: Mittelalterliche Schatzkammer / Tresorgebäude",
    `${STYLES.ISO_BUILDING}, a low squat heavily fortified medieval fantasy vault building,
top face shows a flat reinforced stone roof with iron grating across the top, iron rings and chains bolted into the stone, no windows on the roof,
left wall shows extremely thick dark grey stone masonry with iron reinforcement bands running horizontally, small barred slit windows with heavy iron shutters, mossy stone at the base,
front facade has a massive iron-banded oak door with multiple iron locks, iron chains crossing the door in an X pattern, iron torch brackets on either side with dim flickering flames,
a large iron padlock symbol carved in relief into the stone above the entrance, iron gargoyle heads mounted at the corners as waterspouts,
heavy iron hinges and deadbolts visible on the door frame, aged iron chains draped decoratively around the entrance,
dark grey stone, aged black iron hardware, mossy weathered stones at ground level, mysterious and impenetrable atmosphere`),

  sprite("ISO_BANK_WITH_CHEST", "building", 512, 640, "mvp",
    "ISO: Mittelalterliche Bank mit Schatztruhe an der Seite",
    `${STYLES.ISO_BUILDING}, a sturdy imposing medieval fantasy bank building with a treasure chest placed beside it,
top face shows a flat stone roof with iron reinforcement bands, decorative gold coin motif finial at the peak,
left wall shows thick fortified stone masonry with narrow iron-barred windows, a wooden treasure chest with golden metal bands and a heavy brass lock sitting prominently on the ground against the left wall beside the building, the chest is closed and slightly angled toward the viewer,
front facade has a grand stone archway entrance with heavy iron-reinforced oak double doors, stone pillars flanking the entrance with iron torch brackets holding burning flames,
a large carved golden coin sign mounted above the entrance with decorative ironwork frame, stone steps leading up to the entrance,
warm stone colors with gold and brass accents, the treasure chest has warm golden-brown wood planks and shiny brass fittings,
authoritative and wealthy atmosphere matching the guild hall style, the chest adds a sense of accumulated wealth and treasure`),

  sprite("ISO_DUNGEON_CAMP", "building", 320, 400, "mvp",
    "ISO: Vorposten-Station / Expeditionslager (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a sci-fi forward military outpost station for deep-zone exploration operations,
top face shows a communications dish array and a tactical hologram projector emitting blue light,
left wall shows armored blast barriers with guild insignia hologram and weapon rack mounts,
front shows the outpost gate with energy barrier shield posts flanking the entrance and sentry position,
reinforced modular prefab structure, blue shield emitter glow on perimeter poles, tactical combat-ready atmosphere`),

  sprite("ISO_DUNGEON_MOUNTAIN", "building", 384, 480, "mvp",
    "ISO: Dungeon-Berg mit Höhleneingang (isometrisch, sehr groß)",
    `${STYLES.ISO_BUILDING}, a massive imposing rocky mountain with a dark dungeon cave entrance,
the mountain top is craggy jagged grey rock with sparse dead vegetation visible from above,
left face shows sheer cliff walls with dark cracks, hanging roots, and ancient stone carvings,
front face has a grand arched dungeon portal entrance glowing with eerie purple-green magical light,
iron chains and skull decorations flank the entrance, skull-shaped rock formation above the cave mouth,
very large impressive structure, dark grey and charcoal rock colors, menacing fantasy dungeon atmosphere,
dead twisted trees clinging to the cliff sides, bats silhouetted in the cave opening`),

  // ─── Style-Tests: Dark (Cyberpunk) ───────────────────────────
  sprite("ISO_HOUSE_DARK", "building", 160, 200, "post-mvp",
    "Style-Test Dark: Wohngebäude Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a 2-3 story residential apartment block,
stacked floors with metal railings on balconies and small potted plants,
left wall shows dark concrete with window AC units, exposed pipe runs and a glowing cyan power meter,
front has a grimy reinforced entry door flanked by neon-lit mailboxes and a flickering orange lantern overhead,
cracked window patched with tape, satellite dish on roof, rusted drainpipe down one corner`),

  sprite("ISO_GUILD_HALL_DARK", "building", 256, 320, "post-mvp",
    "Style-Test Dark: Gildenhalle Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a large imposing 4-story guild headquarters and operations center,
top face shows a communications array dish, antennas and a holographic cyan guild crest projector,
left wall shows massive dark concrete with guild insignia in cyan neon strip lighting and barred windows,
front facade has heavy reinforced blast doors flanked by two glowing orange-amber security lanterns,
thick power conduits and cables run the full height of the building, intimidating and powerful`),

  sprite("ISO_WAREHOUSE_DARK", "building", 224, 256, "post-mvp",
    "Style-Test Dark: Lagerhaus Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a large dark industrial storage warehouse,
wide blocky rectangular building with ventilation exhaust units and generator stacks on top face,
left wall shows reinforced dark metal paneling with a cargo company logo in orange neon and barred vent,
front has a massive roll-up shutter door with orange hazard stripe markings and a side loading dock,
stacked metal cargo crates beside the entrance, heavy security gate, gritty dock atmosphere`),

  sprite("ISO_FARM_GRAIN_DARK", "building", 384, 440, "post-mvp",
    "Dark: Hydroponik-Bucht Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a large cyberpunk vertical farming complex and hydroponic production facility,
top face shows rows of grimy greenhouse panels with sickly green grow-lights glowing through cracked glass,
left wall shows dark concrete with external nutrient pipe runs, a flickering cyan monitor and rusted vents,
front has a reinforced industrial sliding door with orange hazard stripes and a neon food-corp logo,
condensation dripping from pipes, tangled cables overhead, oppressive industrial food production atmosphere`),

  sprite("ISO_MILL_WIND_DARK", "building", 192, 280, "post-mvp",
    "Dark: Energie-Kollektor Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a tall dark cyberpunk energy collection tower with spinning turbine blades,
tall cylindrical structure of riveted dark metal panels with exposed cable runs and warning lights,
large spinning turbine rotor blades extending to the upper-right with cyan energy glow at the hub,
front base shows a power distribution junction box with thick cables branching out and orange warning lights,
electrical arcs and sparks at cable junctions, industrial power generation atmosphere`),

  sprite("ISO_BAKERY_DARK", "building", 160, 200, "post-mvp",
    "Dark: Synthese-Küche Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a compact cyberpunk food synthesis lab and noodle shop,
top face shows exhaust steam vents and a satellite dish with blinking status lights,
left wall shows grimy dark concrete with a neon-lit service window revealing orange fabrication glow inside,
front has a small automated food dispenser slot with flickering holographic menu and a buzzing neon sign,
steam rising from vents, stained walls, compact and grungy street food aesthetic`),

  sprite("ISO_LUMBER_CAMP_DARK", "building", 160, 200, "post-mvp",
    "Dark: Material-Verarbeitung Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a compact cyberpunk raw material processing and scrap sorting unit,
top face shows an open sorting bay with scrap metal chunks on a rusted conveyor belt,
left wall shows dark metal panels with a mounted plasma cutter rack and robotic extraction arm,
front has a loading dock chute with control panel showing cyan holographic readout and orange warning light,
sparks flying from cutting operations, scrap metal piles nearby, industrial salvage atmosphere`),

  sprite("ISO_QUARRY_DARK", "building", 192, 220, "post-mvp",
    "Dark: Tiefenbohrung Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk deep core mining drill platform and excavation rig,
top face shows the drill shaft opening with rotating drill machinery and excavated debris,
left wall shows exposed dark metal drilling framework with hydraulic struts and orange safety lights,
front has a cramped operator booth with a glowing cyan core sample display and extraction controls,
ore dust in the air, harsh flood lights, heavy industrial drilling atmosphere`),

  sprite("ISO_HERB_GARDEN_DARK", "building", 192, 220, "post-mvp",
    "Dark: Xenobotanik-Labor Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk biolab and specimen containment pod for exotic plants,
top face shows a cracked transparent dome with eerie bioluminescent specimens glowing cyan and purple inside,
left wall shows dark concrete with bio-hazard warning signs, specimen storage cylinders glowing sickly green,
front has a sealed bio-containment entrance with airlock status display and red warning lights,
alien-looking plants with toxic glow visible through dirty glass, ominous scientific atmosphere`),

  sprite("ISO_SMITHY_DARK", "building", 192, 220, "post-mvp",
    "Dark: Montage-Schmiede Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk weapons forge and equipment fabrication workshop,
top face shows factory exhaust stacks glowing hot orange from the active forge below,
left wall shows dark metal exterior with robotic arm brackets and a flickering blueprint hologram,
front has a large open workshop bay with a glowing orange-blue energy anvil and flying sparks,
weapon racks and gear visible inside, graffiti on exterior walls, underground arms dealer atmosphere`),

  sprite("ISO_IRON_MINE_DARK", "building", 224, 256, "post-mvp",
    "Dark: Extraktionsschacht Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk deep resource extraction shaft and mining facility,
top face shows the mine shaft opening with automated extraction machinery and orange scanner beams,
left side shows massive dark metal portal beams with pulsing red-orange safety warning lights,
front has an industrial mine entrance with crawler tracks leading in and an ore conveyor belt running out,
harsh flood lighting, toxic dust clouds, heavy-duty extraction operation atmosphere`),

  sprite("ISO_WELL_DARK", "building", 128, 160, "post-mvp",
    "Dark: Energie-Knoten Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a compact cyberpunk energy relay node and power distribution pillar,
top shows a glowing cyan energy crystal mounted on the relay cap pulsing with electricity,
left side shows a hexagonal dark metal pillar body with stacked energy rings glowing cyan,
front has a small holographic status display showing power grid output with orange warning indicators,
energy conduit cables branching outward from the base, constant electrical shimmer and sparks`),

  sprite("ISO_ARCANE_SMITHY_DARK", "building", 224, 280, "post-mvp",
    "Dark: Arkan-Schmiede Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk arcane-tech forge fusing dark crystal magic with heavy machinery,
top face shows a crackling energy reactor dome with purple-blue arcs radiating outward through the smog,
left wall shows heavy dark metal plating with embedded glowing arkan runes and crystal conduit veins pulsing,
front has a reinforced blast door with arkan scanner and holographic rune display glowing purple,
dark energy crystals embedded in the structure, electrical storms around the reactor, forbidden tech atmosphere`),

  sprite("ISO_MARKETPLACE_DARK", "building", 256, 280, "post-mvp",
    "Dark: Schwarzmarkt Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk black market bazaar and underground trading hub,
top face shows a patchwork roof of corrugated metal sheets with neon signs and antenna arrays,
left wall shows dark concrete with multiple vendor stall windows lit by different colored neon lights,
front has a wide entrance with hanging bead curtains and a buzzing holographic price board,
scattered crates and shady merchandise displays, flickering neon signs, underground economy atmosphere`),

  sprite("ISO_WAR_MACHINE_WORKSHOP_DARK", "building", 256, 300, "post-mvp",
    "Dark: Kriegsmaschinen-Werkstatt Cyberpunk",
    `${STYLES.ISO_BUILDING_DARK}, a cyberpunk heavy weapons factory and war machine assembly plant,
top face shows a heavy crane gantry system and armored vehicle chassis under construction,
left wall shows massive dark reinforced blast doors with orange hazard markings and weapon test range signage,
front has an open assembly bay with a half-built combat mech visible inside glowing with welding sparks,
heavy ammunition crates stacked outside, smoke and sparks, military-industrial complex atmosphere`),

  // ─── Medieval (Fantasy) ──────────────────────────────────────
  sprite("ISO_HOUSE_MED", "building", 160, 200, "post-mvp",
    "Medieval: Wohnhaus Fantasy",
    `${STYLES.ISO_BUILDING}, a sturdy 2-story medieval house built from rough-cut grey stone blocks and dark oak timber framing,
top face shows a steep dark slate roof with weathered stone chimney and iron chimney cap,
left wall shows heavy grey stone masonry with dark timber cross-bracing, small iron-barred windows with faint amber glow inside,
front has a thick oak plank door with heavy iron strap hinges and a simple iron ring handle, a stone step at the threshold,
cobblestone foundation, a wooden rain barrel at one corner, worn and weathered but solid,
dark earthy tones, heavy and grounded medieval stone construction`),

  sprite("ISO_GUILD_HALL_MED", "building", 256, 320, "post-mvp",
    "Medieval: Gildenhalle Fantasy",
    `${STYLES.ISO_BUILDING}, a massive imposing 3-story medieval guild hall of heavy stone and dark timber construction,
top face shows a steep dark slate roof with iron ridge crest, a stone watchtower rising from one corner with a flag pole,
left wall shows thick fortress-grade stone masonry with dark timber bracing, tall narrow arched windows with iron grating and warm firelight inside,
front facade has a grand stone archway entrance with heavy reinforced iron-banded double doors, iron torch brackets with burning flames on either side,
carved stone guild emblem above the entrance, stone buttresses reinforcing the corners, iron chains and pulleys at the upper level,
imposing dark stone fortress aesthetic, the seat of power and authority`),

  sprite("ISO_WAREHOUSE_MED", "building", 224, 256, "post-mvp",
    "Medieval: Lagerhaus Fantasy",
    `${STYLES.ISO_BUILDING}, a large heavy medieval storage warehouse of rough stone walls and heavy timber frame,
top face shows a dark wood plank roof with iron fittings, a rope-and-pulley hoist crane arm at the ridge beam,
left wall shows thick grey stone masonry with a large wooden loading shutter held by iron chains, iron-barred vent,
front has massive heavy oak double doors with iron reinforcement bands and a large iron padlock and chain,
stacked wooden crates and iron-bound barrels near the entrance, stone loading dock platform,
dark industrial storage atmosphere, heavy and functional`),

  sprite("ISO_FARM_GRAIN_MED", "building", 384, 440, "post-mvp",
    "Medieval: Kornfarm Fantasy",
    `${STYLES.ISO_BUILDING}, a large medieval grain farm with a heavy stone-and-timber barn and harvested wheat field,
top face shows a dark wooden plank barn roof with stone chimney, adjacent wheat field with cut stubble and gathered sheaves,
left side shows the barn wall of rough stone foundation with heavy dark timber planks above, iron tools hung on pegs,
front has wide open barn doors with heavy iron hinges revealing stacked hay bales inside, a wooden ox cart with grain sacks,
a stone well and iron water pump nearby, heavy wooden fence posts with rope,
earthy and grounded farming atmosphere with muted harvest tones`),

  sprite("ISO_MILL_WIND_MED", "building", 192, 280, "post-mvp",
    "Medieval: Windmühle Fantasy",
    `${STYLES.ISO_BUILDING}, a tall sturdy medieval windmill built from rough grey stone blocks,
tall cylindrical stone tower body with weathered grey stone walls and small iron-barred windows,
four heavy wooden windmill sails extending to the upper-right in isometric view with worn canvas stretched over thick timber frames,
the cap is a dark conical wooden roof with iron weathervane,
front base has a heavy arched stone doorway with iron-banded door, stone steps, and flour sacks on a wooden pallet,
dark stone and heavy timber construction matching quarry and smithy aesthetic`),

  sprite("ISO_BAKERY_MED", "building", 160, 200, "post-mvp",
    "Medieval: Bäckerei Fantasy",
    `${STYLES.ISO_BUILDING}, a compact medieval bakery of heavy stone and dark timber construction with a massive stone oven,
top face shows a dark clay tile roof with a large stone chimney stack billowing dark smoke,
left wall shows grey stone masonry with dark timber framing and a small iron-barred service window,
front has a heavy wooden counter built into the stone wall front with iron hooks for hanging bread, a thick oak door with iron hinges,
flour sacks and iron bread paddles leaning against the stone wall,
warm orange oven glow visible through the window, heavy stone workshop atmosphere`),

  sprite("ISO_LUMBER_CAMP_MED", "building", 160, 200, "post-mvp",
    "Medieval: Holzfällerlager Fantasy",
    `${STYLES.ISO_BUILDING}, a rugged medieval lumber camp with heavy timber log construction,
top face shows a rough bark-covered log roof with iron fittings and moss growth,
left wall shows stacked raw timber logs and heavy wooden planks against the cabin wall, iron saw blades hung up,
front has an open work area with a massive tree stump chopping block with an iron axe embedded in it, a heavy iron sawhorse,
wood chips and sawdust on the ground, iron chains and hooks on a rack,
raw and rugged industrial woodworking atmosphere, heavy tools and rough timber`),

  sprite("ISO_QUARRY_MED", "building", 192, 220, "post-mvp",
    "Medieval: Steinbruch Fantasy",
    `${STYLES.ISO_BUILDING}, a medieval stone quarry and mason's cutting yard,
top face shows an open excavation pit with exposed rock layers in different grey and brown tones,
left wall shows a rough stone cliff face with chisel marks, wooden scaffolding and support beams bracing the quarry walls,
front has a mason's work shelter with a stone cutting bench, chisels and hammers on a rack, and finished stone blocks stacked neatly,
a wooden cart loaded with cut stone blocks, rubble and rock chips scattered around,
dusty hard-working quarry atmosphere with visible tool marks in the stone`),

  sprite("ISO_HERB_GARDEN_MED", "building", 192, 220, "post-mvp",
    "Medieval: Kräutergarten Fantasy",
    `${STYLES.ISO_BUILDING}, a medieval apothecary workshop with stone walls and an attached herb drying shed,
top face shows a dark wood shingle roof with an open-air herb drying rack covered by canvas, bundles of dried herbs hanging,
left side shows heavy grey stone walls with dark timber framing, a small leaded glass window with faint green glow inside,
front has a heavy wood and iron door with an apothecary mortar-and-pestle iron sign above, stone shelves with clay jars and bottles,
raised stone garden beds with dark green herbs in neat rows, a grinding stone and iron cauldron nearby,
dark mysterious apothecary atmosphere with earthy muted tones`),

  sprite("ISO_SMITHY_MED", "building", 192, 220, "post-mvp",
    "Medieval: Schmiede Fantasy",
    `${STYLES.ISO_BUILDING}, a medieval blacksmith forge with roaring fire and heavy anvil,
top face shows a heavy stone and timber roof with a large brick chimney billowing dark smoke and orange sparks,
left wall shows dark stone walls blackened by soot with weapon racks displaying swords and shields,
front has a wide open workshop with a glowing hot forge, a heavy iron anvil in the center, hammer and tongs hanging nearby,
a water quenching barrel with steam rising, horseshoes and metal ingots stacked on shelves,
hot industrial atmosphere with orange firelight and dramatic sparks flying from the anvil`),

  sprite("ISO_IRON_MINE_MED", "building", 224, 256, "post-mvp",
    "Medieval: Eisenmine Fantasy",
    `${STYLES.ISO_BUILDING}, a medieval iron mine entrance built into massive craggy rock with heavy timber reinforcement,
top face shows exposed rough craggy rock with heavy wooden support beam framework and iron ore veins visible,
left side shows the rough rock cliff face with thick timber pit props, iron chains and hanging oil lanterns,
front has a dark imposing mine entrance portal with massive timber frame and iron reinforcement, rail cart tracks leading inside and a loaded ore cart,
iron mining tools on a heavy wooden rack, piles of raw iron ore and crushed rock,
dark deep underground mining atmosphere matching the quarry and smithy stone-and-iron aesthetic`),

  sprite("ISO_WELL_MED", "building", 128, 160, "post-mvp",
    "Medieval: Brunnen Fantasy",
    `${STYLES.ISO_BUILDING}, a sturdy medieval stone well with a heavy timber-and-iron frame,
top shows a dark wooden shingle roof canopy on iron-reinforced timber posts with a heavy iron pulley and chain mechanism,
left side shows the circular well wall built from rough-cut grey stone blocks with iron banding,
front has the well opening with a thick timber crossbar holding iron chain and bucket, a stone water trough at the base,
cobblestones surrounding the well, heavy iron hardware throughout,
functional and solid medieval stone construction, dark earthy tones`),

  sprite("ISO_ARCANE_SMITHY_MED", "building", 320, 400, "post-mvp",
    "ISO: Arkan-Schmiede – Großes Magitech-Gebäude (MED)",
    `${STYLES.ISO_BUILDING_SCIFI}, a large impressive two-story arcane smithy and magitech forge,
TOP FACE: steep gabled dark charcoal slate roof with heavy iron ridge capping, a large crackling arkan-crystal reactor dome at the peak glowing intense purple-blue, iron smoke chimneys billowing faint magical vapor, iron weather vane shaped like a crossed sword and gear,
LEFT WALL: massive two-story dark oak timber frame construction with thick exposed wooden beams and iron reinforcement bands, arkan-energy veins glowing vivid purple-blue pulsing through the wood grain, two large arched forge windows with deep orange-purple interior glow and iron bar grilles, exterior crystal formations growing from the base corners emitting soft arcane light,
FRONT FACADE: enormous heavy reinforced double oak doors with oversized iron hinges and arcane rune carvings, intense purple-orange forge glow blazing from within, two iron torch brackets with magical purple flames flanking the entrance, a large carved emblem above the door showing crossed tools with a crystal — the guild mark of the arcane smiths, stone foundation steps,
DETAILS: stacked ingots and crystal shards visible near the entrance, iron chain pulley system on the side wall, arcane runic inscriptions etched into wooden beam accents,
COLOR PALETTE: deep dark brown oak, charcoal slate, vivid purple-blue arkan energy glow, deep orange forge light from within, iron grey hardware — dramatic contrast between warm forge glow and cool arcane magic,
highly detailed, premium quality, larger and more imposing than other buildings, clearly the most powerful crafting structure in the city`),

  sprite("ISO_MARKETPLACE_MED", "building", 256, 280, "post-mvp",
    "Medieval: Marktplatz Fantasy",
    `${STYLES.ISO_BUILDING}, a medieval market hall and trading post built from heavy stone pillars and dark timber framing,
top face shows a heavy dark wood plank roof with iron ridge fittings over an open-sided market hall structure,
left side shows thick stone pillar supports with dark timber crossbeams, merchant goods hanging from iron hooks,
front has a wide stone-arched entrance to the trading hall with iron lantern brackets, wooden merchant tables with goods displayed,
iron-bound barrels and wooden crates stacked at the sides, a stone weighing platform with iron scales,
dark industrial trading post atmosphere, heavy stone and timber construction`),

  sprite("ISO_WAR_MACHINE_WORKSHOP_MED", "building", 256, 300, "post-mvp",
    "Medieval: Kriegswerkstatt Fantasy",
    `${STYLES.ISO_BUILDING}, a massive medieval siege workshop and armory built from fortress-grade stone with heavy timber crane,
top face shows a heavy dark stone and timber roof with a large wooden construction crane arm and iron chains,
left wall shows thick fortress stone walls with iron weapon brackets, mounted siege engine blueprints and heavy timber bracing,
front has a massive open workshop bay with a half-built trebuchet or battering ram inside, thick timber beams and iron fittings everywhere,
heavy wooden wheels and iron siege components stacked outside, an iron-bound ammunition chest,
imposing dark military engineering atmosphere with the weight and scale of medieval warfare`),

  sprite("ISO_DUNGEON_CAMP_MED", "building", 320, 400, "post-mvp",
    "Medieval: Expeditionslager Fantasy",
    `${STYLES.ISO_BUILDING}, a fortified medieval expedition outpost built from heavy timber palisade and rough stone,
top face shows a pointed timber stake palisade wall enclosure with a stone watchtower and iron brazier fire beacon,
left wall shows rough timber palisade with iron-reinforced gates, heavy shields and weapon racks mounted to the fence,
front shows the camp gate with heavy iron-banded timber doors, burning iron torch brackets on stone posts and a quest board with parchment maps,
dark canvas military tents inside the compound, weapon crates and potion barrels, iron campfire cooking rack,
dark frontier fortress atmosphere at the edge of danger, heavy stone and timber fortification`),

  // ─── Style-Tests: Warm (Steampunk) ───────────────────────────
  sprite("ISO_HOUSE_WARM", "building", 160, 200, "post-mvp",
    "Style-Test Warm: Wohngebäude Steampunk",
    `${STYLES.ISO_BUILDING_WARM}, a cozy 2-story steampunk residential house,
top face shows a small rounded copper dome with a steam vent chimney and tiny rooftop garden,
left wall shows light grey walls with exposed copper pipes, a potted plant on a windowsill with warm amber glow,
front has a charming wooden door with brass knocker, flower boxes under windows and a glowing lantern above,
vines growing up one corner, pressure gauge mounted on an exterior pipe, friendly and lived-in feeling`),

  sprite("ISO_GUILD_HALL_WARM", "building", 256, 320, "post-mvp",
    "Style-Test Warm: Gildenhalle Steampunk",
    `${STYLES.ISO_BUILDING_WARM}, a grand 3-story steampunk guild hall and meeting house,
top face shows a large brass dome with riveted fittings, pressure tanks and guild banner pole with flag,
left wall shows wide round-arched windows glowing warm golden, decorative copper pipe columns,
front has impressive double wooden doors with brass hardware flanked by two large amber lanterns,
guild crest plaque above the entrance, decorative riveted metal panels, potted plants at the entrance,
impressive and welcoming, clearly the most important building in the area`),

  sprite("ISO_WAREHOUSE_WARM", "building", 224, 256, "post-mvp",
    "Style-Test Warm: Lagerhaus Steampunk",
    `${STYLES.ISO_BUILDING_WARM}, a large steampunk storage warehouse and distribution hub,
top face shows a barrel-vaulted corrugated roof with steam exhaust pipes and a large copper pressure dome,
left wall shows beige-grey walls with large round loading hatch, copper pipe runs and visible pressure gauge,
front has large wooden double doors with brass hardware, a loading dock with rope-and-pulley and crates,
a steam-powered crane arm extends from one corner, warm glow from interior lights, busy industrial charm`),

  sprite("ISO_ARCANE_SMITHY", "building", 320, 400, "mvp",
    "ISO: Arkan-Schmiede – Großes Magitech-Gebäude",
    `${STYLES.ISO_BUILDING_SCIFI}, a large impressive two-story arcane smithy and magitech forge,
TOP FACE: steep gabled dark charcoal slate roof with heavy iron ridge capping, a large crackling arkan-crystal reactor dome at the peak glowing intense purple-blue, iron smoke chimneys billowing faint magical vapor, iron weather vane shaped like a crossed sword and gear,
LEFT WALL: massive two-story dark oak timber frame construction with thick exposed wooden beams and iron reinforcement bands, arkan-energy veins glowing vivid purple-blue pulsing through the wood grain, two large arched forge windows with deep orange-purple interior glow and iron bar grilles, exterior crystal formations growing from the base corners emitting soft arcane light,
FRONT FACADE: enormous heavy reinforced double oak doors with oversized iron hinges and arcane rune carvings, intense purple-orange forge glow blazing from within, two iron torch brackets with magical purple flames flanking the entrance, a large carved emblem above the door showing crossed tools with a crystal — the guild mark of the arcane smiths, stone foundation steps,
DETAILS: stacked ingots and crystal shards visible near the entrance, iron chain pulley system on the side wall, arcane runic inscriptions etched into wooden beam accents,
COLOR PALETTE: deep dark brown oak, charcoal slate, vivid purple-blue arkan energy glow, deep orange forge light from within, iron grey hardware — dramatic contrast between warm forge glow and cool arcane magic,
highly detailed, premium quality, larger and more imposing than other buildings, clearly the most powerful crafting structure in the city`),

  sprite("ISO_MARKETPLACE", "building", 256, 280, "mvp",
    "ISO: Handels-Nexus / Marktplatz (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a busy sci-fi trade nexus and holographic marketplace hub,
top face shows an open trading floor with holographic product displays floating above stall positions,
left wall shows the market exterior with neon-lit shop signs and trade route display screens,
front has an inviting open arcade entrance with glowing price holo-boards and automated trading terminals,
vibrant warm amber and neon accent lights, busy commercial energy, merchandise visible on displays`),

  sprite("ISO_WAR_MACHINE_WORKSHOP", "building", 256, 300, "mvp",
    "ISO: Kriegsmaschinen-Werkstatt (Sci-Fi)",
    `${STYLES.ISO_BUILDING_SCIFI}, a heavy-duty sci-fi war machine assembly and maintenance workshop,
top face shows a massive reinforced roof with heavy crane rails and a war machine chassis being assembled,
left wall shows thick armored panels with mounted weapon racks and engineering tool stations,
front has an enormous blast-proof hangar door wide enough for heavy vehicles, ramp leading in,
heavy military aesthetic, dark metal with orange hazard markings, intimidating industrial scale`),

  // ─── Isometric Terrain Tiles ─────────────────────────────────
  sprite("ISO_GRASS_TILE", "terrain", 128, 64, "mvp",
    "ISO: Gras-Terrain-Kachel (isometrisch)",
    `${STYLES.ISO_TERRAIN}, a lush green grass terrain tile,
the diamond shape shows bright varied green grass texture on the top face,
left face shows dark earthy soil side,
small grass tufts, tiny wildflowers and clover dots on surface,
rich warm green tones with natural variation`),

  sprite("ISO_WATER_TILE", "terrain", 128, 64, "mvp",
    "ISO: Wasser-Terrain-Kachel (isometrisch)",
    `${STYLES.ISO_TERRAIN}, a clear blue water terrain tile for an ocean/lake border,
the diamond shape shows shimmering blue water surface on the top face with gentle ripples,
left face shows dark deep blue water depth,
small highlights and sparkle reflections on the water surface,
rich clear blue and teal tones`),

  // ─── Isometric Tree Sprites ───────────────────────────────────
  sprite("ISO_TREE_LARGE", "terrain", 128, 192, "mvp",
    "ISO: Großer Baum (isometrisch)",
    `${STYLES.ISO_TREE}, a large majestic fantasy oak tree in isometric view,
wide round canopy of rich dark green foliage with lighter highlights,
visible brown-grey trunk base in lower portion casting shadow to lower-right,
scattered orange-red autumn leaf details for magical flair,
canopy fills upper 70% of frame, tall and impressive`),

  sprite("ISO_TREE_PINE", "terrain", 96, 160, "mvp",
    "ISO: Kiefernbaum (isometrisch)",
    `${STYLES.ISO_TREE}, a tall conical pine/fir tree in isometric view,
classic triangular silhouette with layered dark green branches,
visible brown trunk base and root flares in lower portion,
snow dusting on branch tips for magical winter fantasy touch,
clean conical shape pointing upward, elegant and simple`),

  sprite("ISO_TREE_SMALL", "terrain", 80, 112, "mvp",
    "ISO: Kleiner Baum (isometrisch)",
    `${STYLES.ISO_TREE}, a small young deciduous tree in isometric view,
compact round canopy of bright fresh green foliage,
thin brown trunk visible at base,
a few small colorful berries or blossoms for charm,
small and cute, fits between buildings`),

  // ─── Sci-Fi Medieval Building Sprites (V2 Style Rework) ──────
  // Priority: Gildenhaus → Schmiede → Dungeon-Lager → Produktionsgebäude
  // These replace the medieval-only originals with techno-fantasy hybrid style

  sprite("ISO_GUILD_HALL_V2", "building", 256, 320, "post-mvp",
    "ISO: Gildenhalle V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a grand techno-medieval guild hall headquarters,
massive reinforced stone walls with riveted dark metal plates and glowing blue arkan-veins,
left side shows tall arched windows with pulsing purple energy glow behind stained glass,
front facade has imposing armored double doors with energy conduit patterns etched into the metal,
roof has dark metallic tiles with a central crystal spire emitting faint blue light,
guild banner hangs from an energy-lit pole, holographic guild emblem floating above entrance,
warm interior light contrasting cool blue energy accents, powerful established atmosphere`),

  sprite("ISO_SMITHY_V2", "building", 192, 220, "post-mvp",
    "ISO: Schmiede V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval blacksmith forge and arkan-workshop,
forge chimney on roof emits both orange sparks and faint purple energy wisps,
left wall shows dark reinforced metal with mounted magitech weapon rack glowing faintly,
front has an open workshop with hybrid anvil: traditional iron base with glowing blue crystal core,
energy conduit pipes run along the base of the building connecting to the forge,
sparks flying from both traditional hammering and arkan-energy forging,
dark charcoal walls with orange ember glow and blue energy accent lighting`),

  sprite("ISO_DUNGEON_CAMP_V2", "building", 320, 400, "post-mvp",
    "ISO: Dungeon-Expeditionslager V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a rugged techno-medieval dungeon expedition staging camp,
reinforced metal-and-wood palisade walls with glowing purple warning sigils on the stakes,
large command tent with dark canvas stretched over a metal frame structure, energy cables running to it,
left side shows the palisade with mounted magitech lanterns casting blue light and a holographic map display,
front gate entrance with crossed energy-tipped spears, a campfire at center with both natural flames and drifting arcane embers,
tactical equipment crates with glowing lock runes, worn battle-scarred gear rack,
dark muted earthy tones with blue-purple energy accents, dangerous expedition atmosphere`),

  sprite("ISO_FARM_GRAIN_V2", "building", 224, 256, "post-mvp",
    "ISO: Getreidefarm V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval grain farm with automated harvest elements,
wooden barn reinforced with metal plates, roof has solar crystal panels beside golden wheat sheaves,
left side shows arkan irrigation pipes glowing faintly blue feeding the crop rows,
front has open barn doors with both traditional grain sacks and a small magitech grain sorter device,
golden wheat field on the top face with subtle blue energy grid lines in the soil,
warm golden and brown tones with blue-tech accents, productive agricultural atmosphere`),

  sprite("ISO_LUMBER_CAMP_V2", "building", 160, 200, "post-mvp",
    "ISO: Holzfällerhütte V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval lumber processing cabin,
rough hewn timber cabin with riveted metal reinforcement plates on corners,
log pile on the top face with a small magitech saw blade glowing purple at one end,
left wall shows raw wood planks with a mounted energy-powered axe and tool rack,
front has a porch with chopping block, traditional woodchips mixed with faint energy sawdust,
dark brown wood and gunmetal grey tones with purple energy tool accents`),

  sprite("ISO_QUARRY_V2", "building", 192, 220, "post-mvp",
    "ISO: Steinbruch V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval stone quarry with magitech cutting tools,
exposed rock face with arkan-energy drill marks glowing faint purple in the stone,
metal crane arm with energy cable hoist on the top face lifting cut stone blocks,
left side shows reinforced worker's shed with energy conduit running to cutting tools,
front has stacked precision-cut stone blocks and a magitech stone cutter device,
grey stone and dark metal tones with purple energy tool highlights`),

  sprite("ISO_IRON_MINE_V2", "building", 224, 256, "post-mvp",
    "ISO: Eisenmine V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval iron mine with magitech extraction,
reinforced mine shaft frame with energy-powered ore cart track on the top face,
left side shows metal-plated mine entrance with blue-glowing support beams and safety runes,
front has the main mine portal with iron ore chunks on a conveyor and arkan sorting crystals,
energy conduit cables running from the mine to a small processing unit outside,
dark grey rock and heavy metal tones with blue extraction energy highlights`),

  sprite("ISO_BAKERY_V2", "building", 160, 200, "post-mvp",
    "ISO: Bäckerei V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval bakery with arkan-heated ovens,
brick chimney with warm smoke and faint purple energy wisps on the roof,
left wall shows reinforced brick with a display window of bread loaves glowing warm,
front has a welcoming door with a pretzel sign and a small magitech oven vent beside it,
energy conduit pipe runs to the oven providing consistent arkan heat,
warm orange-red brick with subtle purple energy accent lines`),

  sprite("ISO_HERB_GARDEN_V2", "building", 192, 220, "post-mvp",
    "ISO: Kräutergarten V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval alchemist greenhouse with arkan growth enhancement,
crystal glass greenhouse panels on roof glowing with faint purple growth-light from within,
colorful herb patches on the top face with blue energy irrigation grid visible between rows,
left wall shows metal trellis with climbing vines enhanced by arkan energy nodes,
front has an arched entrance with potion bottles and a small holographic plant analysis display,
rich greens and purple energy tones, magical and scientific atmosphere combined`),

  sprite("ISO_HOUSE_V2", "building", 160, 200, "post-mvp",
    "ISO: Wohnhaus V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a small techno-medieval residential dwelling,
stone-and-timber construction reinforced with dark metal plates at the corners,
steep roof with dark metallic tiles and a small crystal antenna receiver on top,
left wall shows grey stone with a shuttered window that has a faint blue energy glow at edges,
front has a reinforced wooden door with arkan lock rune and a warm glowing window,
energy conduit pipe runs along the foundation connecting to the city grid,
cozy but technologically integrated atmosphere`),

  sprite("ISO_WAREHOUSE_V2", "building", 224, 256, "post-mvp",
    "ISO: Lagerhaus V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a large techno-medieval warehouse with magitech inventory system,
wide reinforced structure with dark metal beam roof and arkan preservation runes on panels,
left wall shows thick metal-plated stone with a holographic inventory counter glowing blue,
front has large armored double doors with a magitech loading crane and energy-lit dock,
crates with glowing preservation sigils stacked nearby, arkan conveyor track on the floor,
dark metal and stone tones with blue inventory-system energy accents`),

  sprite("ISO_WELL_V2", "building", 128, 160, "post-mvp",
    "ISO: Brunnen V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval energy-enhanced well and water purifier,
hexagonal stone well with dark metal reinforcement rings and a small crystal purification device on top,
glowing blue arkan water visible in the well opening from above,
left side shows stone and metal with an energy pump mechanism replacing the traditional pulley,
front shows the well opening with blue-glowing purified water, energy conduit base,
grey stone with blue water energy accents, essential utility atmosphere`),

  sprite("ISO_MILL_WIND_V2", "building", 192, 280, "post-mvp",
    "ISO: Windmühle V2 (Sci-Fi Mittelalter)",
    `${STYLES.ISO_BUILDING_SCIFI}, a techno-medieval windmill with hybrid energy generation,
tall cylindrical stone tower reinforced with dark metal bands and arkan conduit lines,
energy-enhanced sail blades with faint blue tips spinning to the upper-right,
round conical roof with metal shingles and a crystal energy collector on peak,
left wall shows stone blocks with inlaid energy conduit patterns glowing blue,
front has a metal-reinforced door and flour chute with magitech grinding sounds visible as energy sparks,
stone and metal tones with blue energy blade and conduit accents`),
];

// ─── Hilfsfunktionen ─────────────────────────────────────────

/** Alle Sprites einer Phase holen */
export function getSpritesByPhase(phase: SpritePhase): SpriteDefinition[] {
  return SPRITE_REGISTRY.filter(s => s.phase === phase);
}

/** Alle Sprites einer Kategorie holen */
export function getSpritesByCategory(category: SpriteCategory): SpriteDefinition[] {
  return SPRITE_REGISTRY.filter(s => s.category === category);
}

/** Einzelnen Sprite per Key finden */
export function getSpriteByKey(key: string): SpriteDefinition | undefined {
  return SPRITE_REGISTRY.find(s => s.key === key);
}

/** Alle Sprite-Keys als Set */
export function getAllSpriteKeys(): Set<string> {
  return new Set(SPRITE_REGISTRY.map(s => s.key));
}

/** Target-Sizes Map für den Resizer */
export function getTargetSizes(): Record<string, { w: number; h: number }> {
  const sizes: Record<string, { w: number; h: number }> = {};
  for (const s of SPRITE_REGISTRY) {
    sizes[s.key] = { w: s.targetWidth, h: s.targetHeight };
  }
  return sizes;
}
