// ============================================================
// Magic City – Building Sprites im neuen Painterly Style
// Usage: npx tsx tools/generateBuildingImages.ts
// ============================================================

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error("Kein GOOGLE_AI_API_KEY in .env gefunden!");
  process.exit(1);
}

const OUTPUT_DIR = path.join("public", "assets", "sprites", "final");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;
const DELAY_MS = 5000;

interface BuildingDef {
  key: string;
  prompt: string;
}

const STYLE = `Style: painterly digital illustration, modern fantasy RPG building art (World of Warcraft / Diablo IV quality),
rich colors, dramatic lighting, detailed textures. Isometric 45-degree top-down perspective.
The building must be fully visible and centered in the frame. Solid bright magenta (#FF00FF) background for chroma key removal.
No text, no UI elements. Clean edges against the magenta background.`;

const BUILDINGS: BuildingDef[] = [
  {
    key: "WAREHOUSE",
    prompt: `A sturdy medieval fantasy warehouse building, isometric view.
Large timber-frame structure with stone foundation, heavy reinforced wooden double doors wide open revealing crates and barrels stacked inside,
a winch mechanism on the upper level for hoisting goods, thatched roof with wooden beams visible, lanterns hanging by the entrance.
Warm interior glow spilling out from inside, weathered but well-maintained look.
${STYLE}`,
  },
  {
    key: "GUILD_HALL",
    prompt: `A grand medieval fantasy guild hall, isometric view.
Impressive two-story stone and timber building with a tall pointed roof, ornate carved entrance with a large emblem above the door,
stained glass windows glowing with warm light, stone pillars flanking the entrance, banners hanging from the walls,
a small courtyard with a training dummy visible. Prestigious and powerful atmosphere.
${STYLE}`,
  },
  {
    key: "LUMBER_CAMP",
    prompt: `A rustic medieval fantasy lumber camp building, isometric view.
A wooden cabin workshop with an open front wall showing workbenches with saws and axes,
stacks of fresh-cut logs piled beside the building, sawdust on the ground, a large tree stump with an axe embedded in it,
wood shavings and planks leaning against the walls, smoke rising from a small chimney. Earthy and industrious.
${STYLE}`,
  },
  {
    key: "FARM_GRAIN",
    prompt: `A charming medieval fantasy grain farm building, isometric view.
A farmhouse with attached barn, golden wheat fields surrounding it (small patch visible around the building),
a scarecrow in the field, wooden fence enclosure, hay bales stacked near the barn door,
a windmill-style grain silo attached to one side, warm golden afternoon light. Pastoral and productive.
${STYLE}`,
  },
  {
    key: "MILL_WIND",
    prompt: `A picturesque medieval fantasy windmill, isometric view.
A tall stone tower windmill with large wooden sails/blades, whitewashed stone walls with a wooden upper section,
a small door at the base with flour sacks stacked outside, a wooden platform and stairs wrapping around the base,
the sails catching wind. Flour dust in the air catching golden sunlight. Charming and functional.
${STYLE}`,
  },
  {
    key: "BAKERY",
    prompt: `A cozy medieval fantasy bakery building, isometric view.
A warm stone and timber building with a large brick oven chimney billowing fragrant smoke,
an open shop window displaying loaves of bread and pastries, a wooden counter at the front,
warm orange glow from the ovens visible through windows, flour sacks by the door, a sign with a bread loaf symbol.
Warm, inviting, and bustling with baking activity.
${STYLE}`,
  },
  {
    key: "WELL",
    prompt: `A medieval fantasy stone well structure, isometric view.
A circular stone well with a wooden roof canopy above it, a rope-and-bucket pulley mechanism,
moss growing on the old stones, clean blue water visible inside, cobblestone base around the well,
small wildflowers growing in the cracks. Magical faint blue glow emanating from the water.
Quaint and essential village infrastructure.
${STYLE}`,
  },
  {
    key: "HOUSE_T1",
    prompt: `A cozy medieval fantasy cottage house, isometric view.
A small but charming timber-frame house with whitewashed walls and dark wooden beams,
a thatched roof with a stone chimney with gentle smoke, a wooden front door with a small porch,
flower boxes under the windows with warm candlelight glowing inside, a small garden patch beside the house,
a cobblestone path leading to the door. Homely, warm, and lived-in.
${STYLE}`,
  },
  // ── Neue Gebäude (vorher fehlend) ──
  {
    key: "QUARRY",
    prompt: `A rugged medieval fantasy stone quarry, isometric view.
An exposed rocky hillside with visible stone layers and chisel marks, a wooden crane with rope and pulley for lifting stone blocks,
a mining cart on small wooden rails, neatly stacked cut stone blocks, pickaxes and hammers leaning against rocks,
a small covered work shelter for the stonecutters, lanterns for working in dim light, gravel paths between work areas.
Dusty and industrious atmosphere with grey stone and warm wood tones.
${STYLE}`,
  },
  {
    key: "HERB_GARDEN",
    prompt: `A lush medieval fantasy herb garden, isometric view.
A beautiful fenced garden with raised wooden beds full of colorful herbs and medicinal plants in greens, purples, and yellows,
a small wooden potting shed with a thatched roof, drying herbs hanging from a rack, clay pots and a watering can,
a stone path winding through the garden beds, a wooden archway with climbing vines at the entrance,
butterflies and soft sunlight filtering through. Peaceful, fragrant, and magical healing atmosphere.
${STYLE}`,
  },
  {
    key: "SMITHY",
    prompt: `A powerful medieval fantasy blacksmith forge, isometric view.
A dark stone and timber smithy with a large open front revealing the forge with bright orange-red fire blazing,
a heavy iron anvil in the center with a hammer resting on it, sparks flying from hot metal,
weapon racks displaying swords and shields outside, bellows mechanism visible, dark smoke billowing from the stone chimney,
iron ingots and metal bars stacked near the entrance, a quenching barrel of water. Hot, powerful, and industrious.
${STYLE}`,
  },
  {
    key: "IRON_MINE",
    prompt: `A dark medieval fantasy iron mine entrance, isometric view.
A cave opening in a rocky hillside reinforced with heavy wooden support beams and iron brackets,
small rail tracks leading into the dark tunnel, a hanging lantern illuminating the entrance with warm glow,
piles of dark iron ore and rocks outside, a mining cart on rails, pickaxes and shovels leaning against the rock face,
wooden crates for storing ore, a small shelter with a roof for the miners. Mysterious and industrious atmosphere.
${STYLE}`,
  },
  {
    key: "ARCANE_SMITHY",
    prompt: `A mystical medieval fantasy arcane smithy, isometric view.
A large imposing dark stone forge building with glowing purple-blue arcane crystals embedded in the walls and roof,
the forge front showing bright orange fire swirling with purple magical energy, an enchanted anvil with glowing runes,
magical sparks and arcane vapor rising from the chimney, enchanted weapons displayed on racks with faint magical auras,
crystal formations growing near the base, heavy oak doors with carved rune symbols, purple-flame torches flanking the entrance.
Dramatic contrast between warm forge glow and cool arcane magic. Powerful and mystical.
${STYLE}`,
  },
  {
    key: "MARKETPLACE",
    prompt: `A bustling medieval fantasy marketplace, isometric view.
A large open-sided market hall with heavy timber frame and colorful canvas awnings in red, gold, and green,
stone pillar supports, multiple merchant stalls with exotic goods on wooden tables, hanging lanterns and banners,
barrels and crates of trade goods, a stone fountain nearby, iron scales for weighing,
colorful fabric bolts, pottery, fruit baskets, and exotic items on display. Vibrant, busy, warm afternoon light.
${STYLE}`,
  },
  {
    key: "WAR_MACHINE_WORKSHOP",
    prompt: `A massive medieval fantasy siege workshop, isometric view.
A fortress-grade stone and timber workshop with wide open bay doors showing a half-built trebuchet inside,
a tall wooden construction crane with iron chains and pulleys overhead, heavy timber beams and iron bracing everywhere,
large wooden wheels and siege engine components stacked outside, iron-bound ammunition chests,
a small forge area with glowing coals, weapon blueprints pinned to a board, heavy barricades and shields on display.
Imposing dark military engineering atmosphere. Massive and powerful.
${STYLE}`,
  },
  {
    key: "BANK",
    prompt: `A grand medieval fantasy bank building, isometric view.
A sturdy imposing stone building with thick fortified walls and narrow iron-barred windows,
a grand stone archway entrance with heavy iron-reinforced oak double doors, stone pillars with burning torches,
a large carved golden coin emblem above the entrance, wide stone steps leading up,
iron-bound treasure chests visible through a side window, gold and brass decorative details in the stonework,
a guard alcove at the entrance. Wealthy, authoritative, and secure atmosphere with warm gold and cool stone tones.
${STYLE}`,
  },
];

async function generateImage(prompt: string): Promise<Buffer | null> {
  const body = {
    contents: [{ parts: [{ text: prompt + "\n\nOutput ONLY the image, no text." }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      temperature: 0.5,
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
  console.log(`\n  Generiere ${BUILDINGS.length} Building-Sprites (painterly style)...\n`);

  for (let i = 0; i < BUILDINGS.length; i++) {
    const bld = BUILDINGS[i];
    const outPath = path.join(OUTPUT_DIR, `${bld.key}.png`);

    const outPath2 = path.join(OUTPUT_DIR, `${bld.key}.png`);
    // Skip if file already exists and is large (>500KB = already good quality)
    if (fs.existsSync(outPath2) && fs.statSync(outPath2).size > 500_000) {
      console.log(`  [${i + 1}/${BUILDINGS.length}] ${bld.key} — bereits vorhanden (${(fs.statSync(outPath2).size / 1024).toFixed(0)} KB), überspringe`);
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

  console.log(`\n  Fertig! Sprites in: ${OUTPUT_DIR}/`);
  console.log(`  WICHTIG: Jetzt 'npm run remove-bg' ausfuehren!\n`);
}

main().catch(console.error);
