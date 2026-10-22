// ============================================================
// Magic City – Tile-Illustrationen fuer Main Menu generieren
// Nutzt Google Gemini Flash API, 16:9 Format
// Usage: npx tsx tools/generateTileImages.ts
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("Kein GOOGLE_AI_API_KEY in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "tiles");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

const DELAY_MS = 5000;

interface TileDef {
  key: string;
  prompt: string;
}

const TILES: TileDef[] = [
  // ── Main Menu Tiles (16:9) ──
  {
    key: "tile_expeditions",
    prompt: `A sweeping fantasy landscape scene for a game menu tile.
Show a dramatic vista: a winding forest path leading through ancient misty woods toward distant mountains,
with a glowing magical portal or dungeon entrance visible in the distance.
Small adventurer silhouettes on the path hint at an upcoming journey.
Atmospheric lighting with god rays filtering through the canopy, warm golden and cool teal tones.
Style: painterly digital illustration, modern fantasy RPG (like World of Warcraft loading screens),
rich colors, dramatic depth. Dark moody atmosphere suitable for dark UI overlay text on top.
No text, no UI elements, no borders.`,
  },
  {
    key: "tile_heroes",
    prompt: `A dramatic fantasy scene for a game menu tile.
Show a guild training hall interior: a grand stone arena with weapon racks, training dummies, and magical runes glowing on the walls.
In the center, 3-4 diverse fantasy heroes stand in heroic poses — a knight with shield, an archer, a mage with glowing staff, a rogue with daggers.
Warm torchlight and cool magical ambient light create dramatic contrast.
Style: painterly digital illustration, modern fantasy RPG (like Diablo IV character select screen),
rich colors, dramatic lighting. Dark moody atmosphere suitable for dark UI overlay text on top.
No text, no UI elements, no borders.`,
  },
  {
    key: "tile_buildings",
    prompt: `A fantasy city builder scene for a game menu tile.
Show a bustling medieval fantasy town from a slightly elevated perspective: timber-frame houses, a smoking smithy with anvil and sparks,
a lumber mill, grain fields in the background, and a magical workshop with glowing crystals.
Workers are busy crafting and building. Warm afternoon light with chimney smoke rising.
Style: painterly digital illustration, modern fantasy RPG city builder aesthetic,
rich warm colors, cozy but epic atmosphere. Dark moody atmosphere suitable for dark UI overlay text on top.
No text, no UI elements, no borders.`,
  },
  {
    key: "tile_ranking",
    prompt: `A fantasy trophy hall scene for a game menu tile.
Show a grand guild hall of fame: a majestic stone chamber with tall arched windows letting in golden light,
trophy pedestals displaying legendary weapons and armor, a large ornate scoreboard or ranking monument in the center,
golden banners hanging from the ceiling, scattered gold coins and treasure.
Epic and prestigious atmosphere with rich golden and deep blue tones.
Style: painterly digital illustration, modern fantasy RPG achievement hall,
rich colors, dramatic lighting. Dark moody atmosphere suitable for dark UI overlay text on top.
No text, no UI elements, no borders.`,
  },

  // ── Expedition Route Cards (4:3) ──
  {
    key: "exp_forest_short",
    prompt: `A serene but slightly mysterious forest path scene in 4:3 landscape format for a fantasy RPG expedition card.
A sunlit trail winds through a young deciduous forest with dappled light, wildflowers along the path, and a glimpse of a small clearing ahead.
Friendly but adventurous atmosphere — this is a beginner-level route. Soft green and golden tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, atmospheric depth.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_forest_medium",
    prompt: `A dense, ancient deep forest scene in 4:3 landscape format for a fantasy RPG expedition card.
Towering old-growth trees with thick trunks and hanging moss, mysterious fog between the trees, faint magical glow deep in the forest.
A narrow trail disappears into darkness. Ominous but beautiful atmosphere with deep green, teal, and purple tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, atmospheric depth.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_cave_deep",
    prompt: `A dramatic deep cave entrance scene in 4:3 landscape format for a fantasy RPG expedition card.
A massive cavern opening in a rocky mountainside, with stalactites, glowing crystal formations casting blue and purple light,
and a dark abyss descending into the depths. Bats fly near the ceiling, water drips from the rocks.
Mysterious and dangerous atmosphere with blue, purple, and deep grey tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_cave_spider",
    prompt: `A terrifying spider lair cave scene in 4:3 landscape format for a fantasy RPG expedition card.
A dark cavern filled with giant spider webs stretching between stalactites, cocooned prey hanging from the ceiling,
faint green bioluminescent glow from fungi on the walls, and shadows suggesting enormous spiders lurking.
Horror-tinged fantasy atmosphere with sickly green, grey, and dark purple tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic and creepy lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_swamp_long",
    prompt: `A treacherous poison swamp scene in 4:3 landscape format for a fantasy RPG expedition card.
A murky, bubbling swamp with twisted dead trees, toxic green mist rising from stagnant water,
glowing poisonous mushrooms, and wooden planks forming a dangerous walkway across the bog.
Oppressive and toxic atmosphere with sickly green, murky brown, and dark purple tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, atmospheric haze.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ruins_crypts",
    prompt: `An ancient stone crypt entrance scene in 4:3 landscape format for a fantasy RPG expedition card.
Crumbling stone archway leading into underground burial chambers, with faded runes carved into the walls,
eerie blue-green ghostly light emanating from within, scattered bones, and overgrown ivy on the stone.
Haunted and ancient atmosphere with grey stone, teal ghost-light, and dark earth tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ruins_depths",
    prompt: `A massive underground ruin complex scene in 4:3 landscape format for a fantasy RPG expedition card.
A grand subterranean hall with colossal broken pillars, ancient magical machinery still faintly glowing,
collapsed walkways over a deep chasm, and remnants of a once-great civilization.
Epic and foreboding atmosphere with warm amber magical glow contrasting dark stone and deep shadows.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic scale and lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_volcano_core",
    prompt: `A dramatic volcanic core scene in 4:3 landscape format for a fantasy RPG expedition card.
Inside an active volcano — rivers of glowing lava flowing between black obsidian rock formations,
fiery embers floating in the scorching air, a narrow stone bridge crossing over a lava lake,
and a massive volcanic chamber with magma falls in the background.
Intense and deadly atmosphere with bright orange, deep red, and black tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic fiery lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  // ── Über dem Vulkankern (docs/NEUE-DUNGEONS.md) ──
  {
    key: "exp_drachenhort",
    prompt: `A legendary dragon's lair on a mountain peak above a volcano, in 4:3 landscape format for a fantasy RPG expedition card.
A vast cavern opening onto the night sky, mountains of gold coins, jeweled crowns and ancient armor piled high,
glowing embers drifting in the air, the silhouette of a colossal sleeping dragon coiled around the hoard,
volcanic glow far below the cliff edge.
Greedy and dangerous atmosphere with warm gold, ember orange and deep night blue tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_himmelsarchiv",
    prompt: `A vast floating library above the clouds, in 4:3 landscape format for a fantasy RPG expedition card.
Towering bookshelves rising into a starry sky, stone walkways and spiral stairs floating on a sea of clouds,
books drifting through the air with glowing pages, ghostly blue lanterns, a giant watchful eye faintly visible in the dark above.
Mysterious and forbidding atmosphere with silver moonlight, pale blue and deep indigo tones with warm candle accents.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  // ── Über dem Himmelsarchiv: die Sterne (Bilder vom 20.10.2026, quadratisch) ──
  {
    key: "exp_sternenschmiede",
    prompt: `A colossal forge built into a fallen star high above the clouds, as a square full-bleed image for a fantasy RPG expedition card.
A gigantic anvil glowing white-hot under a vaulted roof of dark star-metal, streams of molten starlight pouring from huge crucibles, freshly forged stars hanging on chains like lanterns, showers of golden sparks drifting into a deep violet night sky full of constellations, stone bridges and heavy chains suspended over a sea of clouds far below.
Warm white-gold forge light against deep violet and midnight blue.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No people or figures. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_sternenschlund",
    prompt: `A vast swirling rift in the night sky that swallows the stars, seen from a crumbling floating stone path at the edge of the world, as a square full-bleed image for a fantasy RPG expedition card.
Stars being pulled into a black spiral maw ringed with faint violet light, broken constellations, floating rock fragments and snapped ancient star-chains drifting in the void, a few small lanterns along the path leading toward the dark.
Ominous, awe-inspiring cosmic atmosphere with deep black, violet and ice-blue tones and a few warm golden star accents.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic lighting.
Dark moody lower third suitable for text overlay. No people or figures. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_siege_walls",
    prompt: `A medieval fantasy siege battle scene in 4:3 landscape format for a fantasy RPG expedition card.
Massive stone city walls under siege — siege ladders, catapults firing, arrows flying through smoke-filled air,
defenders on the battlements, and attacking forces gathered below with torches and war banners.
Epic military atmosphere with warm firelight, grey stone, and dark smoky skies.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic battle lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_siege_fortress",
    prompt: `A grand dark fortress under assault scene in 4:3 landscape format for a fantasy RPG expedition card.
A towering black stone fortress on a hilltop, with multiple defensive towers, a massive reinforced gate,
magical barrier shields flickering under bombardment, and an army approaching through a fiery battlefield.
Epic and climactic atmosphere — the final battle. Dark crimson, black, and golden magical tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic epic-scale lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ocean_shallows",
    prompt: `A magical underwater coastal scene in 4:3 landscape format for a fantasy RPG expedition card.
Shallow sunlit waters near a sunken coastline — coral reefs, colorful tropical fish, sunken ship wreckage half-buried in sand,
shafts of sunlight filtering through turquoise water, and kelp forests swaying gently.
Beautiful and mysterious underwater atmosphere with turquoise, teal, gold sunbeams, and sandy tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dreamy underwater lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ocean_depths",
    prompt: `A terrifying deep ocean abyss scene in 4:3 landscape format for a fantasy RPG expedition card.
The crushing depths of a dark ocean trench — bioluminescent creatures glowing in the void,
massive ancient underwater ruins barely visible, a giant sea creature silhouette in the distance,
and strange deep-sea flora emitting eerie light. Pressure and darkness everywhere.
Terrifying and alien atmosphere with deep navy, black, bioluminescent cyan and purple tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic deep-sea lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  // ── NEW Expedition Route Cards (Placeholder routes) ──
  {
    key: "exp_forest_ruins",
    prompt: `A mysterious ruined clearing in an enchanted forest, 4:3 landscape format for a fantasy RPG expedition card.
Crumbling moss-covered stone walls and broken archways overgrown with vines and wildflowers, ancient tree roots growing through the ruins,
soft shafts of golden sunlight filtering through the canopy onto the forgotten structure.
Peaceful yet mysterious atmosphere — an easy exploration area. Warm green, golden, and earthy tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, atmospheric depth.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_haunted_woods",
    prompt: `A terrifying haunted forest at twilight, 4:3 landscape format for a fantasy RPG expedition card.
Gnarled twisted trees with ghostly pale bark, faintly glowing spectral wisps floating between the trunks,
thick ground fog with an eerie greenish glow, a dark overgrown path leading into impenetrable darkness.
Creepy and unsettling atmosphere with pale green, ghostly white, deep purple, and black tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, eerie supernatural lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_cave_tunnels",
    prompt: `A labyrinthine network of narrow cave tunnels, 4:3 landscape format for a fantasy RPG expedition card.
Winding stone passages splitting in multiple directions, faint torchlight flickering on wet rock walls,
dripping water creating small underground pools reflecting the light, strange mineral veins glowing faintly.
Claustrophobic and disorienting atmosphere with warm amber torchlight against cold grey-blue stone.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic tunnel lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_crystal_mines",
    prompt: `A magnificent crystal mine deep underground, 4:3 landscape format for a fantasy RPG expedition card.
Enormous glowing crystal formations jutting from walls and ceiling in brilliant blue, purple, and white,
abandoned mining equipment and cart tracks, the crystals illuminating a vast underground cavern with prismatic light.
Awe-inspiring and dangerous atmosphere with brilliant crystal blues, purples, and deep shadow contrasts.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic crystalline lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ocean_abyss",
    prompt: `The absolute deepest ocean abyss — a nightmare of the deep, 4:3 landscape format for a fantasy RPG expedition card.
Total darkness except for bioluminescent horrors — giant anglerfish lures, pulsing jellyfish swarms,
ancient leviathan bones on the sea floor, a massive dark trench descending further into the unknown.
Terrifying abyssal pressure atmosphere with pitch black, bioluminescent red and cyan accents.
Style: painterly digital illustration, modern fantasy RPG, rich colors, extreme deep-sea lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_swamp_village",
    prompt: `A decrepit swamp village on stilts, 4:3 landscape format for a fantasy RPG expedition card.
Ramshackle wooden huts built on stilts over murky swamp water, rope bridges connecting buildings,
lanterns casting warm orange light through toxic green mist, mysterious hooded figures, a merchant stall.
Eerie but lived-in atmosphere — a place of uneasy commerce. Warm lantern orange against toxic green swamp.
Style: painterly digital illustration, modern fantasy RPG, rich colors, atmospheric swamp lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_frozen_pass",
    prompt: `A treacherous frozen mountain pass in a blizzard, 4:3 landscape format for a fantasy RPG expedition card.
A narrow ice-covered path along a cliff face, howling wind carrying snow horizontally,
frozen waterfalls and massive icicles, ancient frost-covered ruins partially buried in snow, a distant frozen peak.
Brutal and unforgiving atmosphere with icy blue, white, pale purple, and dark grey tones.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic blizzard lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_shadow_catacombs",
    prompt: `Nightmarish shadow-filled catacombs deep beneath ancient ruins, 4:3 landscape format for a fantasy RPG expedition card.
Endless rows of skull-filled ossuaries, living shadows creeping along the walls, dark magical energy crackling,
ancient sarcophagi with broken seals, an overwhelming sense of ancient evil awakening.
Pure horror atmosphere with deep black, sickly purple shadow magic, and faint bone-white highlights.
Style: painterly digital illustration, modern fantasy RPG, rich colors, extreme dark horror lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_obsidian_tunnels",
    prompt: `Volcanic obsidian tunnels carved by ancient lava flows, 4:3 landscape format for a fantasy RPG expedition card.
Smooth black obsidian walls reflecting faint red glow from magma veins, jagged volcanic glass formations,
a winding tunnel leading deeper with increasing heat shimmer, small lava pools dotting the path.
Hot and oppressive atmosphere — the gateway to the volcanic region. Black obsidian with deep red and orange glow.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic volcanic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_ash_wastes",
    prompt: `A desolate volcanic ash wasteland stretching to the horizon, 4:3 landscape format for a fantasy RPG expedition card.
Grey ash covering everything as far as the eye can see, skeletal remains of dead trees, ember storms swirling in the hot wind,
a blood-red sky with volcanic lightning, cracked ground revealing glowing lava beneath.
Apocalyptic and desolate atmosphere with ash grey, blood red sky, and orange ember accents.
Style: painterly digital illustration, modern fantasy RPG, rich colors, dramatic apocalyptic lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
  {
    key: "exp_magma_caverns",
    prompt: `Enormous magma-filled underground caverns, 4:3 landscape format for a fantasy RPG expedition card.
A vast underground lake of churning magma with volcanic rock islands, fire geysers erupting periodically,
chains and ancient bridges spanning the molten sea, the silhouette of a dragon-like creature in the distance.
Infernal and epic atmosphere — extreme danger. Brilliant magma orange, deep volcanic red, and black rock.
Style: painterly digital illustration, modern fantasy RPG, rich colors, intense magma lighting.
Dark moody lower third suitable for text overlay. No text, no UI elements, no borders.`,
  },
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = {
    contents: [{ parts: [{ text: prompt + "\n\nOutput ONLY the image, no text." }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   API Error (${response.status}): ${errorText.substring(0, 300)}`);
      return null;
    }

    const data = (await response.json()) as any;
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.error("   Keine Parts in Response.");
      return null;
    }

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    console.error(
      "   Kein Bild gefunden. Text:",
      parts
        .map((p: any) => p.text)
        .filter(Boolean)
        .join(" ")
        .substring(0, 200)
    );
    return null;
  } catch (err) {
    console.error(`   Netzwerk-Fehler:`, err);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n  Generiere ${TILES.length} Tile-Illustrationen (16:9)...\n`);

  for (let i = 0; i < TILES.length; i++) {
    const tile = TILES[i];
    const outPath = path.join(OUTPUT_DIR, `${tile.key}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`  [${i + 1}/${TILES.length}] ${tile.key} — existiert bereits, uebersprungen`);
      continue;
    }

    console.log(`  [${i + 1}/${TILES.length}] ${tile.key} — generiere...`);

    const buf = await generateImage(tile.prompt);
    if (buf) {
      fs.writeFileSync(outPath, buf);
      console.log(`    -> ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`    -> FEHLER bei ${tile.key}`);
    }

    if (i < TILES.length - 1) {
      console.log(`    Warte ${DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n  Fertig! Bilder in: ${OUTPUT_DIR}/\n`);
}

main().catch(console.error);
