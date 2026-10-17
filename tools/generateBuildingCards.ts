// ============================================================
// Magic City – Building Card Illustrations (full background)
// Same style as hero cards and expedition tiles
// Usage: npx tsx tools/generateBuildingCards.ts
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("Kein GOOGLE_AI_API_KEY in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "buildings");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const DELAY_MS = 5000;

interface BuildingDef {
  key: string;
  prompt: string;
}

const STYLE = `Style: painterly digital illustration, modern fantasy RPG (World of Warcraft / Diablo IV quality),
rich colors, dramatic lighting, dark moody atmosphere with warm interior glow.
Square 1:1 composition, the building fills most of the frame in its environment.
No text, no UI elements, no borders. Dark atmospheric background that blends into a dark game UI.`;

const BUILDINGS: BuildingDef[] = [
  {
    key: "bld_warehouse",
    prompt: `A sturdy medieval fantasy warehouse at dusk, surrounded by crates and barrels.
Large timber-frame structure with stone foundation, heavy reinforced wooden double doors wide open
revealing stacked goods inside, a winch mechanism above, lanterns casting warm golden light.
Set in a cobblestone yard with cargo carts nearby, misty evening atmosphere.
${STYLE}`,
  },
  {
    key: "bld_guild_hall",
    prompt: `A grand medieval fantasy guild hall at night, imposing and prestigious.
Impressive two-story stone and timber building with Gothic pointed roof, ornate carved entrance,
stained glass windows blazing with warm amber light, stone pillars, guild banners hanging,
torches flanking the entrance. Set in a moonlit courtyard with training dummies visible.
${STYLE}`,
  },
  {
    key: "bld_lumber_camp",
    prompt: `A rustic medieval fantasy lumber camp in a forest clearing at golden hour.
Wooden cabin workshop with open front showing workbenches with saws and axes,
stacks of fresh-cut logs piled high, a large tree stump with axe embedded,
sawdust and wood shavings everywhere, tall trees surrounding the clearing.
Warm sunset light filtering through the forest canopy, campfire smoke rising.
${STYLE}`,
  },
  {
    key: "bld_farm_grain",
    prompt: `A charming medieval fantasy grain farm at sunset with golden wheat fields.
Farmhouse with attached barn surrounded by ripe golden wheat swaying in warm breeze,
a scarecrow silhouetted against the orange sky, hay bales stacked near the barn,
warm light from farmhouse windows, rolling hills in the background.
Pastoral and warm golden-hour atmosphere.
${STYLE}`,
  },
  {
    key: "bld_mill_wind",
    prompt: `A picturesque medieval fantasy windmill on a hilltop at dusk.
Tall stone tower windmill with large wooden sails silhouetted against a dramatic sunset sky,
whitewashed walls glowing in warm light, flour sacks stacked at the base,
a winding path leading up the hill, wildflowers and grass in the foreground.
Romantic and atmospheric with deep orange and purple sky tones.
${STYLE}`,
  },
  {
    key: "bld_bakery",
    prompt: `A cozy medieval fantasy bakery at night, warm and inviting.
Stone and timber building with a large brick oven chimney glowing orange from within,
warm light spilling from windows onto the cobblestone street, bread loaves displayed
in an open window, flour sacks by the door, a hanging sign with bread symbol.
Cozy nighttime village atmosphere with warm golden interior glow contrasting cool blue moonlight.
${STYLE}`,
  },
  {
    key: "bld_well",
    prompt: `A magical medieval fantasy stone well in a moonlit village square.
Circular stone well with wooden roof canopy, rope-and-bucket mechanism,
magical blue-green glow emanating from the water below, casting ethereal light on the stones.
Moss and wildflowers growing around the base, cobblestone square, lanterns nearby.
Mystical nighttime atmosphere with the magical water glow as the focal point.
${STYLE}`,
  },
  {
    key: "bld_house",
    prompt: `A cozy medieval fantasy cottage at night, warmth radiating from within.
Small timber-frame house with whitewashed walls and dark wooden beams, thatched roof,
warm candlelight glowing through small windows, gentle chimney smoke rising into starry sky,
flower boxes at windows, small garden with a cobblestone path, a wooden fence.
Peaceful nighttime scene with warm interior glow contrasting the cool blue night.
${STYLE}`,
  },
  // ── Neue Gebäude ──
  {
    key: "bld_marketplace",
    prompt: `A bustling medieval fantasy marketplace at dusk, vibrant and lively.
Large open-sided market hall with heavy timber frame and colorful canvas awnings glowing in warm lantern light,
multiple merchant stalls with exotic goods, hanging lanterns and festive banners,
barrels and crates of trade goods, a stone fountain in the corner reflecting warm light.
Busy evening atmosphere with warm golden light from stalls contrasting cool blue twilight sky.
${STYLE}`,
  },
  {
    key: "bld_quarry",
    prompt: `A rugged medieval fantasy stone quarry at sunset, industrial and imposing.
Exposed rocky hillside with visible stone layers and deep chisel marks, a wooden crane silhouetted against the orange sky,
mining carts on wooden rails, neatly stacked cut stone blocks glowing in warm light,
pickaxes and tools scattered around, a covered work shelter with lanterns lit for the evening shift.
Dusty golden-hour atmosphere with warm sunset light on grey stone and long shadows.
${STYLE}`,
  },
  {
    key: "bld_herb_garden",
    prompt: `A magical medieval fantasy herb garden at twilight, peaceful and enchanting.
Beautiful fenced garden with raised wooden beds overflowing with colorful herbs and glowing medicinal plants,
a small thatched potting shed with warm light inside, drying herbs hanging from racks,
stone path winding through garden beds, a wooden archway with climbing roses at the entrance,
fireflies and faint magical sparkles drifting among the plants. Serene twilight atmosphere with soft purple sky and warm garden lanterns.
${STYLE}`,
  },
  {
    key: "bld_smithy",
    prompt: `A powerful medieval fantasy blacksmith forge at night, fiery and dramatic.
Dark stone and timber smithy with the forge blazing bright orange-red inside, sparks flying from hot metal on the anvil,
the smith's silhouette working by firelight, weapon racks displaying gleaming swords outside,
dark smoke billowing from the stone chimney into the night sky, bellows mechanism visible,
iron ingots stacked nearby glowing in reflected firelight. Intense and powerful nighttime atmosphere with dramatic fire glow.
${STYLE}`,
  },
  {
    key: "bld_iron_mine",
    prompt: `A mysterious medieval fantasy iron mine entrance at dusk, dark and foreboding.
A cave opening in a rocky hillside reinforced with heavy wooden beams, a warm lantern hanging at the entrance
casting golden light into the dark tunnel, rail tracks disappearing into shadow,
piles of dark iron ore and rocks outside, mining carts and tools, a small covered shelter for miners.
Atmospheric dusk scene with the warm mine entrance glow contrasting the cool evening sky.
${STYLE}`,
  },
  {
    key: "bld_arcane_smithy",
    prompt: `A towering and awe-inspiring arcane weapon forge, the most powerful building in a fantasy kingdom, seen at night during a thunderstorm.
Massive dark obsidian stone fortress with two stories, covered in pulsing violet and electric-blue arcane veins that crack across the walls like lightning frozen in stone.
The enormous open forge entrance reveals a blinding inferno inside — white-hot magical fire swirling with deep purple arcane energy and floating molten metal shaping itself into legendary weapons mid-air.
Giant glowing crystals erupt from the rooftop and walls, each one humming with raw magical power, casting beams of violet light into the stormy sky above.
Enchanted legendary weapons — a massive glowing greatsword, a crystalline battle-axe, a staff crackling with lightning — hover in display cases outside the entrance, each radiating its own aura.
Arcane runes carved deep into every surface blaze with intense blue-white light, magical sparks and embers swirl in the air around the building like fireflies.
The ground around the forge is scorched and cracked from the sheer magical energy radiating outward.
Thunder and lightning in the dark sky above, the building is the brightest and most dominant structure, radiating power and ancient magic.
${STYLE}`,
  },
  {
    key: "bld_war_workshop",
    prompt: `A massive medieval fantasy siege workshop at night, imposing and military.
Fortress-grade stone and timber workshop with wide bay doors open revealing a half-built trebuchet inside lit by forge light,
a tall wooden construction crane silhouetted against the moonlit sky, heavy chains and pulleys,
siege engine components and large wooden wheels stacked outside, iron-bound chests of ammunition,
torches and braziers casting dramatic flickering light. Dark military atmosphere with warm firelight and cool moonlight.
${STYLE}`,
  },
  {
    key: "bld_bank",
    prompt: `A grand medieval fantasy bank at night, wealthy and imposing.
Sturdy stone building with thick fortified walls, a grand archway entrance with heavy oak doors,
burning torches flanking the entrance casting warm golden light on the stone pillars,
a large carved golden coin emblem above the door gleaming in torchlight, iron-barred windows,
wide stone steps leading up, a guard post with dim lantern. Prestigious nighttime atmosphere
with rich gold and warm stone tones against the dark sky.
${STYLE}`,
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

    console.error("   Kein Bild gefunden.");
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

  console.log(`\n  Generiere ${BUILDINGS.length} Building-Karten (full background)...\n`);

  for (let i = 0; i < BUILDINGS.length; i++) {
    const bld = BUILDINGS[i];
    const outPath = path.join(OUTPUT_DIR, `${bld.key}.png`);

    if (fs.existsSync(outPath)) {
      console.log(`  [${i + 1}/${BUILDINGS.length}] ${bld.key} — existiert bereits, uebersprungen`);
      continue;
    }

    console.log(`  [${i + 1}/${BUILDINGS.length}] ${bld.key} — generiere...`);

    const buf = await generateImage(bld.prompt);
    if (buf) {
      fs.writeFileSync(outPath, buf);
      console.log(`    -> ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`    -> FEHLER bei ${bld.key}`);
    }

    if (i < BUILDINGS.length - 1) {
      console.log(`    Warte ${DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n  Fertig! Bilder in: ${OUTPUT_DIR}/\n`);
}

main().catch(console.error);
