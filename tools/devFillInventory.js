/**
 * devFillInventory.js
 * Browser Console Script — alle Items ins Lager packen.
 * Einmal in die Browser-Konsole (F12) kopieren und Enter drücken.
 * Danach F5 im Spiel drücken zum Speichern.
 */
(function() {
  const SAVE_KEY = 'magic_city_save';
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { console.error('Kein Spielstand gefunden!'); return; }

  const state = JSON.parse(raw);

  const allItems = [
    // T1 Waffen
    'iron_sword', 'hunter_bow', 'oak_staff', 'iron_shield',
    // T1 Rüstungen
    'leather_armor', 'chain_armor', 'novizenrobe',
    // T1 Trinkets
    'wolf_fang_necklace',
    // T2 Waffen
    'steel_sword', 'longbow', 'crystal_staff', 'steel_shield',
    // T2 Rüstungen
    'steel_armor', 'heavy_leather_armor', 'battle_robe',
    // T2 Trinkets
    'crystal_pendant',
    // T3 Boss-Drops
    'hydra_venomfang', 'fallen_hunters_bow', 'crystal_golem_staff',
    'wyrm_scale_shield', 'mystic_plate_armor', 'bandit_king_armor',
    'spider_silk_robe', 'lich_phylactery',
    // T4 Legendary
    'soulbreaker', 'eternal_hunter_bow', 'worldend_staff',
    'aether_guardian_shield', 'dragonlord_plate', 'shadowhunter_armor',
    'magiarch_robe', 'aether_heart',
    // T4 Arkanschmiede
    'war_hammer', 'arcane_blade', 'magitech_shield', 'arcane_amulet',
    // T5 Nemesis
    'blade_of_thousand_shadows', 'shield_of_the_ancient', 'amulet_of_rebirth',
    // Consumables
    'bread', 'healing_potion', 'power_bread',
    'potion_strength', 'potion_mana', 'potion_antidote', 'potion_titan', 'potion_speed',
    // Materialien & Ressourcen
    'crystal_shard', 'talisman_fragment', 'old_coin', 'magitech_component',
    // Kriegsmaschinen
    'war_catapult', 'war_cannon', 'war_hammer',
  ];

  allItems.forEach(id => {
    state.globalStock[id] = (state.globalStock[id] || 0) + 5;
  });

  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  console.log(`✅ ${allItems.length} Item-Typen ins Lager gepackt (je 5 Stück). Seite neu laden!`);
})();
