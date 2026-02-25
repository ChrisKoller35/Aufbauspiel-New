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
2D cartoon illustration style, front-facing 3/4 view,
fantasy medieval RPG monster creature,
vibrant colors, clean outlines, menacing but stylized,
solid bright magenta background (#FF00FF),
single creature centered, no text, no labels,
detailed with smooth shading,
inspired by mobile RPG monster designs`.trim(),

  BOSS: `
2D cartoon illustration style, front-facing 3/4 view,
fantasy medieval RPG boss monster, imposing and powerful,
vibrant colors, clean outlines, dramatic lighting and detail,
solid bright magenta background (#FF00FF),
single large creature centered, no text, no labels,
highly detailed with smooth shading and special effects,
inspired by mobile RPG boss designs, larger and more menacing than regular enemies`.trim(),

  ITEM: `
2D cartoon illustration style, icon view from slightly above,
fantasy medieval RPG item icon,
vibrant colors, clean outlines, recognizable silhouette,
solid bright magenta background (#FF00FF),
single item centered, no text, no labels,
clean and detailed icon style,
inspired by modern RPG inventory icons`.trim(),

  ICON: `
2D cartoon illustration style, simple clean icon,
fantasy medieval RPG UI icon,
vibrant colors, instantly recognizable shape,
solid bright magenta background (#FF00FF),
single icon centered, no text,
clean flat design with subtle shading`.trim(),

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
}

// ─── Helper ──────────────────────────────────────────────────

function sprite(
  key: string,
  category: SpriteCategory,
  w: number, h: number,
  phase: SpritePhase,
  description: string,
  prompt: string
): SpriteDefinition {
  return { key, category, prompt, targetWidth: w, targetHeight: h, phase, description };
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
    `${STYLES.BUILDING}, a grain farm: brown plowed field rows with green sprouting wheat and golden ripe wheat ears, rustic wooden fence border, small wooden farmhouse in corner with thatched roof`),

  sprite("MILL_WIND", "building", 256, 192, "mvp",
    "Windmühle",
    `${STYLES.BUILDING}, a stone windmill: circular grey stone base tower, four large wooden windmill blades/sails extending from top, brown wooden door at base, small window`),

  sprite("BAKERY", "building", 192, 192, "mvp",
    "Bäckerei",
    `${STYLES.BUILDING}, a cozy bakery: stone walls with warm orange glow from oven visible through window, stone chimney with wisps of smoke, wooden door, bread sign hanging, warm inviting atmosphere`),

  sprite("LUMBER_CAMP", "building", 192, 192, "mvp",
    "Holzfällerlager",
    `${STYLES.BUILDING}, a lumber camp: small wooden log cabin with sloped roof, an axe leaning against the wall, neat stack of cut logs beside it, tree stump with axe marks nearby`),

  sprite("QUARRY", "building", 256, 192, "mvp",
    "Steinbruch",
    `${STYLES.BUILDING}, a stone quarry: exposed grey rock face with chisel marks, small mining cart on rails, pickaxe leaning on rocks, piles of cut stone blocks nearby`),

  sprite("WAREHOUSE", "building", 384, 256, "mvp",
    "Lagerhaus",
    `${STYLES.BUILDING}, a large wooden warehouse: big rectangular building with double barn doors, brown timber walls, visible wooden crates and barrels inside through open door, loading platform at front`),

  sprite("HOUSE_T1", "building", 192, 192, "mvp",
    "Wohnhaus Stufe 1",
    `${STYLES.BUILDING}, a cozy medieval house: wooden plank walls, triangular brown thatched roof, one small yellow-lit window, wooden door, tiny stone chimney with faint smoke, flower box under window`),

  sprite("GUILD_HALL", "building", 384, 384, "mvp",
    "Gildenhalle",
    `${STYLES.BUILDING}, an imposing guild hall: large stone building with reinforced walls, grand wooden double-door entrance, two tall windows with golden light, triangular roof with golden banner and guild crest symbol, most impressive building in town, heraldic flags`),

  sprite("WELL", "building", 192, 192, "mvp",
    "Brunnen",
    `${STYLES.BUILDING}, a stone well: circular cobblestone well with small wooden roof overhead, rope and wooden bucket, blue shimmering water visible inside, slightly magical blue glow from water`),

  sprite("HERB_GARDEN", "building", 192, 256, "mvp",
    "Kräutergarten",
    `${STYLES.BUILDING}, an herb garden: neat rectangular garden beds with colorful herbs and flowers, green, purple, red and yellow plant dots, wooden border fence, small wooden potting shelf, watering can`),

  sprite("SMITHY", "building", 256, 192, "mvp",
    "Schmiede",
    `${STYLES.BUILDING}, a blacksmith forge: dark stone building with open front showing anvil, bright orange forge fire glow, hammer on anvil, dark smoke from chimney, metal ingots stacked nearby`),

  sprite("IRON_MINE", "building", 256, 256, "mvp",
    "Eisenmine",
    `${STYLES.BUILDING}, an iron mine entrance: dark cave opening in rocky hillside, wooden support beams framing entrance, small rail tracks leading inside, hanging lantern, pile of dark iron ore outside, mining cart`),

  sprite("ROAD", "terrain", 64, 64, "mvp",
    "Straßen-Tile",
    `${STYLES.BUILDING}, a single cobblestone road tile: beige and light brown cobblestones with darker mortar lines between them, flat top-down view, seamless tile pattern, worn medieval path`),

  // ═══════════════════════════════════════════════════════════
  // HELDEN (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("HERO_GUARDIAN", "unit", 128, 128, "mvp",
    "Held: Wächter (Tank)",
    `${STYLES.UNIT}, a sturdy knight guardian: heavy plate armor, large blue shield with crest, blue tabard, strong protective stance, short sword at side, stocky build indicating tank role`),

  sprite("HERO_RANGER", "unit", 128, 128, "mvp",
    "Held: Waldläufer (DPS)",
    `${STYLES.UNIT}, a nimble forest ranger: green hooded cloak, leather armor, wooden bow in hand with quiver of arrows on back, slim agile build, keen eyes, forest scout appearance`),

  sprite("HERO_CLERIC", "unit", 128, 128, "mvp",
    "Held: Kleriker (Heiler)",
    `${STYLES.UNIT}, a gentle cleric healer: flowing white and gold robes, wooden staff with glowing crystal top, golden cross/sun symbol on chest, peaceful wise expression, healing aura suggestion`),

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

  sprite("BOSS_ELDER_TREANT", "boss", 64, 64, "mvp",
    "Boss: Alter Treant (Wald)",
    `${STYLES.BOSS}, an ancient elder treant boss: massive living tree creature, gnarled bark body with glowing green eyes, huge root-arms, moss and vines covering body, leaves as crown, imposing forest guardian, ancient and powerful`),

  sprite("BOSS_BANDIT_CHIEF", "boss", 64, 64, "mvp",
    "Boss: Banditenführer (Wald)",
    `${STYLES.BOSS}, a menacing bandit chief boss: tall muscular human with scarred face, dark leather armor with fur collar, dual-wielding daggers, red bandana, gold chains, intimidating leader pose, treasure behind him`),

  sprite("BOSS_CRYSTAL_GOLEM", "boss", 64, 64, "mvp",
    "Boss: Kristallgolem (Höhle)",
    `${STYLES.BOSS}, a massive crystal golem boss: body made of grey rock with purple crystal shards protruding from shoulders, arms and head, glowing purple crystal core in chest, slow but immovable stance, cave crystal formations around base`),

  sprite("BOSS_SWAMP_HYDRA", "boss", 64, 64, "mvp",
    "Boss: Sumpfhydra (Sumpf)",
    `${STYLES.BOSS}, a three-headed swamp hydra boss: serpentine body with dark green scales, three snake-like heads with yellow eyes and open jaws, rising from murky brown-green swamp water, water dripping, toxic green aura, the largest and most fearsome monster`),

  // ═══════════════════════════════════════════════════════════
  // BOSSE Post-MVP
  // ═══════════════════════════════════════════════════════════

  sprite("BOSS_SPIDER_QUEEN", "boss", 64, 64, "post-mvp",
    "Boss: Spinnenkönigin (Spinnennest)",
    `${STYLES.BOSS}, a terrifying spider queen boss: massive dark spider with glowing red eyes, crown-like chitin crest on head, egg sacs hanging from web strands, venomous dripping mandibles, dark purple and black coloring, surrounded by smaller spiderlings`),

  sprite("BOSS_FALLEN_KNIGHT", "boss", 64, 64, "post-mvp",
    "Boss: Gefallener Ritter (Ruinen)",
    `${STYLES.BOSS}, a fallen knight boss: once-noble knight in corroded dark plate armor, ghostly blue glow from helmet visor, broken but still imposing greatsword, tattered cape, undead aura, tragic and menacing`),

  sprite("BOSS_SHADOW_LICH", "boss", 64, 64, "post-mvp",
    "Boss: Schattenlich (Schattenreich)",
    `${STYLES.BOSS}, a terrifying shadow lich boss: skeletal figure in flowing dark robes, glowing purple soul fire in eye sockets, floating above ground, dark magic swirling around bony hands, ancient crown, most powerful undead`),

  sprite("BOSS_MAGMA_WYRM", "boss", 64, 64, "post-mvp",
    "Boss: Magmawyrm (Vulkankern)",
    `${STYLES.BOSS}, a massive magma wyrm boss: serpentine dragon-like creature made of cooling lava and obsidian, glowing orange cracks in dark rock body, magma dripping from jaws, volcanic fire breath, coiled in lava pool`),

  sprite("BOSS_ARCHIV_WATCHER", "boss", 64, 64, "post-mvp",
    "Boss: Archivwächter (Verfluchte Bibliothek)",
    `${STYLES.BOSS}, an arcane archive watcher boss: floating eldritch eye creature surrounded by orbiting cursed books, tentacles of magical energy, ancient runes glowing, mystical blue and purple, guardian of forbidden knowledge`),

  sprite("BOSS_ANCIENT_DRAGON", "boss", 96, 96, "post-mvp",
    "Boss: Uralter Drache (Drachenhort, 3-Phasen)",
    `${STYLES.BOSS}, an ancient dragon boss: massive scaled dragon with golden treasure hoard, enormous wings spread wide, fire breath charging, scarred battle-worn scales of deep red and gold, the ultimate final boss, awe-inspiring and terrifying`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – WALD (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_FOREST_WOLF", "enemy", 32, 32, "mvp",
    "Gegner: Waldwolf",
    `${STYLES.ENEMY}, a grey forest wolf: snarling wild wolf, grey fur, aggressive lunging pose, green forest theme`),

  sprite("ENEMY_BANDIT_RAIDER", "enemy", 32, 32, "mvp",
    "Gegner: Banditenräuber",
    `${STYLES.ENEMY}, a bandit raider: hooded human thug with dagger, dark brown leather clothes, menacing`),

  sprite("ENEMY_CAVE_SLIME", "enemy", 32, 32, "mvp",
    "Gegner: Höhlenschleim",
    `${STYLES.ENEMY}, a cave slime: large green-grey gelatinous blob creature, semi-transparent, wobbling`),

  sprite("ENEMY_THORN_SPRITE", "enemy", 28, 28, "mvp",
    "Gegner: Dornengeist",
    `${STYLES.ENEMY}, a thorn sprite: tiny floating fey creature made of thorny vines, glowing green eyes, sharp`),

  sprite("ENEMY_FUNGAL_CREEPER", "enemy", 32, 32, "mvp",
    "Gegner: Pilzkriecher",
    `${STYLES.ENEMY}, a fungal creeper: mushroom-headed creature with spore cloud, brown and purple, slow shambling`),

  sprite("ENEMY_SHADOW_BAT", "enemy", 28, 28, "mvp",
    "Gegner: Schattenfledermaus",
    `${STYLES.ENEMY}, a shadow bat: dark purple-black bat with glowing red eyes, wings spread, swooping`),

  sprite("ENEMY_MOSS_GOLEM", "enemy", 36, 36, "mvp",
    "Gegner: Moosgolem",
    `${STYLES.ENEMY}, a moss golem: large rock creature covered in green moss, slow heavy stance, forest earth tones`),

  sprite("ENEMY_VENOMFANG_SPIDER", "enemy", 32, 32, "mvp",
    "Gegner: Giftzahnspinne",
    `${STYLES.ENEMY}, a venomfang spider: large dark spider with green venom dripping from fangs, eight legs, terrifying`),

  sprite("ENEMY_GOBLIN_SCOUT", "enemy", 28, 28, "mvp",
    "Gegner: Goblin-Späher",
    `${STYLES.ENEMY}, a goblin scout: small green-skinned goblin with pointy ears, rusty short sword, ragged clothes`),

  sprite("ENEMY_WILD_BOAR", "enemy", 32, 32, "mvp",
    "Gegner: Wildschwein",
    `${STYLES.ENEMY}, a wild boar: angry brown bristly boar with sharp tusks, charging stance, forest creature`),

  sprite("ENEMY_HOLLOW_SHADE", "enemy", 32, 32, "mvp",
    "Gegner: Hohlschatten",
    `${STYLES.ENEMY}, a hollow shade: ghostly dark figure, almost invisible, red glowing eyes, shadowy wisps, undead assassin`),

  sprite("ENEMY_BRAMBLE_BEAR", "enemy", 36, 36, "mvp",
    "Gegner: Dornenbär",
    `${STYLES.ENEMY}, a bramble bear: large brown bear with thorny vine growths on body, fierce, forest brute`),

  sprite("ENEMY_CURSED_WISP", "enemy", 28, 28, "mvp",
    "Gegner: Verfluchtes Irrlicht",
    `${STYLES.ENEMY}, a cursed wisp: small floating ghostly orb with eerie blue-green glow, spectral trails, healer support`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – HÖHLE (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_CRYSTAL_BEETLE", "enemy", 32, 32, "mvp",
    "Gegner: Kristallkäfer",
    `${STYLES.ENEMY}, a crystal beetle: armored insect with crystalline shell, purple crystal spikes, cave creature`),

  sprite("ENEMY_DEEP_CRAWLER", "enemy", 32, 32, "mvp",
    "Gegner: Tiefenkriecher",
    `${STYLES.ENEMY}, a deep crawler: multi-legged cave centipede creature, dark grey, long segmented body, cave dweller`),

  sprite("ENEMY_MINE_SPECTER", "enemy", 32, 32, "mvp",
    "Gegner: Minengeist",
    `${STYLES.ENEMY}, a mine specter: ghostly miner apparition, translucent grey-blue, pickaxe weapon, undead cave ghost`),

  sprite("ENEMY_STALACTITE_BAT", "enemy", 28, 28, "mvp",
    "Gegner: Stalaktit-Fledermaus",
    `${STYLES.ENEMY}, a stalactite bat: small grey stone-colored bat with sharp rocky wings, cave creature, fast`),

  sprite("ENEMY_MAGMA_SLUG", "enemy", 36, 36, "mvp",
    "Gegner: Magmaschnecke",
    `${STYLES.ENEMY}, a magma slug: large glowing orange-red slug creature, lava dripping, rocky shell, cave brute`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER – SUMPF (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_BOG_WITCH", "enemy", 32, 32, "mvp",
    "Gegner: Moorhexe",
    `${STYLES.ENEMY}, a bog witch: hunched swamp hag with gnarled staff, tattered green robes, healer/support enemy`),

  sprite("ENEMY_SWAMP_TROLL", "enemy", 36, 36, "mvp",
    "Gegner: Sumpftroll",
    `${STYLES.ENEMY}, a swamp troll: huge green-brown troll with wooden club, mossy skin, massive brute, slow`),

  sprite("ENEMY_LEECH_SWARM", "enemy", 28, 28, "mvp",
    "Gegner: Blutegelschwarm",
    `${STYLES.ENEMY}, a leech swarm: cluster of dark writhing leeches forming a mass, slimy dark brown-red, disgusting`),

  sprite("ENEMY_MIRE_PHANTOM", "enemy", 32, 32, "mvp",
    "Gegner: Sumpfphantom",
    `${STYLES.ENEMY}, a mire phantom: ghostly swamp spirit, translucent green-grey, haunting pose, assassin type, deadly`),

  sprite("ENEMY_TOXIC_TOAD", "enemy", 32, 32, "mvp",
    "Gegner: Giftkröte",
    `${STYLES.ENEMY}, a toxic toad: bloated poison toad with yellow-green skin, purple poison warts, swamp creature`),

  sprite("ENEMY_ROT_WALKER", "enemy", 32, 32, "mvp",
    "Gegner: Fäulniswandler",
    `${STYLES.ENEMY}, a rot walker: undead swamp zombie, decaying green-brown flesh, shambling pose, swamp undead fighter`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – RUINEN/KRYPTA
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_SKELETON_WARRIOR", "enemy", 32, 32, "post-mvp",
    "Gegner: Skelettkrieger (Ruinen)",
    `${STYLES.ENEMY}, a skeleton warrior: animated human skeleton with rusted sword and dented shield, glowing blue eye sockets, crypt dweller`),

  sprite("ENEMY_CURSED_KNIGHT", "enemy", 32, 32, "post-mvp",
    "Gegner: Verfluchter Ritter (Ruinen)",
    `${STYLES.ENEMY}, a cursed knight: ghostly knight in dark corroded armor, spectral blue glow, ethereal sword, haunted ruins guardian`),

  sprite("ENEMY_TOMB_WRAITH", "enemy", 32, 32, "post-mvp",
    "Gegner: Grabgespenst (Ruinen)",
    `${STYLES.ENEMY}, a tomb wraith: floating ghostly figure in tattered burial shroud, wailing pose, eerie blue-white glow, undead spirit`),

  sprite("ENEMY_BONE_ARCHER", "enemy", 28, 28, "post-mvp",
    "Gegner: Knochenschütze (Ruinen)",
    `${STYLES.ENEMY}, a bone archer: skeleton with ancient bow, quiver of bone arrows, crouching sniper pose, crypt ranged attacker`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – SPINNENNEST
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_GIANT_SPIDER", "enemy", 36, 36, "post-mvp",
    "Gegner: Riesenspinne (Spinnennest)",
    `${STYLES.ENEMY}, a giant spider: large hairy spider with multiple glowing red eyes, dark brown and black, web strands, cave spider`),

  sprite("ENEMY_EGG_SAC_GUARDIAN", "enemy", 32, 32, "post-mvp",
    "Gegner: Eiersack-Wächter (Spinnennest)",
    `${STYLES.ENEMY}, an egg sac guardian: bulbous spider protecting translucent egg sac, defensive stance, pale white and green, brood protector`),

  sprite("ENEMY_VENOMOUS_LURKER", "enemy", 28, 28, "post-mvp",
    "Gegner: Giftlauerer (Spinnennest)",
    `${STYLES.ENEMY}, a venomous lurker: sleek dark spider with bright green venom markings, ambush predator, fast and deadly`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – VULKANKERN
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_LAVA_GOLEM", "enemy", 36, 36, "post-mvp",
    "Gegner: Lavagolem (Vulkan)",
    `${STYLES.ENEMY}, a lava golem: humanoid creature of cooling lava and obsidian rock, glowing orange cracks, magma dripping, volcanic brute`),

  sprite("ENEMY_FLAME_SPIRIT", "enemy", 28, 28, "post-mvp",
    "Gegner: Flammengeist (Vulkan)",
    `${STYLES.ENEMY}, a flame spirit: floating fire elemental, swirling orange and yellow flames forming a face, intense heat shimmer`),

  sprite("ENEMY_ASH_GOLEM", "enemy", 32, 32, "post-mvp",
    "Gegner: Aschegolem (Vulkan)",
    `${STYLES.ENEMY}, an ash golem: crumbling grey-black creature of volcanic ash and cinder, smoldering embers, slow but tough`),

  // ═══════════════════════════════════════════════════════════
  // GEGNER Post-MVP – VERFLUCHTE BIBLIOTHEK
  // ═══════════════════════════════════════════════════════════

  sprite("ENEMY_CURSED_PRIEST", "enemy", 32, 32, "post-mvp",
    "Gegner: Verfluchter Priester (Bibliothek)",
    `${STYLES.ENEMY}, a cursed priest: undead cleric in tattered holy robes, corrupted golden staff, dark magic aura, fallen healer`),

  sprite("ENEMY_GHOST_MAGE", "enemy", 32, 32, "post-mvp",
    "Gegner: Geistermagier (Bibliothek)",
    `${STYLES.ENEMY}, a ghost mage: translucent spectral wizard, floating spell book, arcane runes orbiting, blue-purple glow, library guardian`),

  sprite("ENEMY_TOME_GUARDIAN", "enemy", 36, 36, "post-mvp",
    "Gegner: Buchwächter (Bibliothek)",
    `${STYLES.ENEMY}, a tome guardian: animated suit of armor possessed by cursed books, books floating around body, arcane chains, library protector`),

  // ═══════════════════════════════════════════════════════════
  // ITEMS (MVP)
  // ═══════════════════════════════════════════════════════════

  sprite("ITEM_BREAD", "item", 16, 16, "mvp",
    "Item: Brot",
    `${STYLES.ITEM}, a loaf of bread: golden-brown baked bread loaf, warm, rustic medieval bakery bread`),

  sprite("ITEM_HEALING_POTION", "item", 16, 16, "mvp",
    "Item: Heiltrank",
    `${STYLES.ITEM}, a healing potion: small glass bottle with glowing red-pink liquid, cork stopper, magical healing`),

  sprite("ITEM_IRON_SWORD", "item", 16, 16, "mvp",
    "Item: Eisenschwert",
    `${STYLES.ITEM}, an iron sword: simple medieval iron short sword, grey blade, brown leather grip, straight blade`),

  sprite("ITEM_IRON_SHIELD", "item", 16, 16, "mvp",
    "Item: Eisenschild",
    `${STYLES.ITEM}, an iron shield: round medieval iron shield with rivets, grey metal, simple crest design`),

  sprite("ITEM_LEATHER_ARMOR", "item", 16, 16, "mvp",
    "Item: Lederrüstung",
    `${STYLES.ITEM}, leather armor: brown leather chest armor/vest, buckles and straps, simple but protective`),

  sprite("ITEM_CRYSTAL_SHARD", "item", 16, 16, "mvp",
    "Item: Kristallsplitter",
    `${STYLES.ITEM}, a crystal shard: glowing purple-pink magical crystal fragment, faceted, radiating magical energy`),

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

  sprite("ICON_BUILD", "icon", 48, 48, "mvp",
    "Icon: Bauen",
    `${STYLES.ICON}, a construction hammer icon, wooden handle with iron head, simple recognizable shape`),

  sprite("ICON_ROAD", "icon", 48, 48, "mvp",
    "Icon: Straße",
    `${STYLES.ICON}, a cobblestone road path icon, winding stone path viewed from above, simple recognizable shape`),

  sprite("ICON_GUILD", "icon", 48, 48, "mvp",
    "Icon: Gilde",
    `${STYLES.ICON}, a crossed sword and shield icon, medieval heraldic style, simple recognizable shape`),

  sprite("ICON_EXPEDITION", "icon", 48, 48, "mvp",
    "Icon: Expedition",
    `${STYLES.ICON}, a compass and treasure map icon, rolled parchment with compass rose, simple recognizable shape`),

  sprite("ICON_STORAGE", "icon", 48, 48, "mvp",
    "Icon: Lager",
    `${STYLES.ICON}, a wooden treasure chest icon, closed chest with metal bands, simple recognizable shape`),

  sprite("ICON_HELP", "icon", 48, 48, "mvp",
    "Icon: Hilfe",
    `${STYLES.ICON}, a question mark on a scroll icon, parchment scroll with golden question mark, simple recognizable shape`),

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
