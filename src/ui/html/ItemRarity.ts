// ============================================================
// Magic City – ItemRarity
// Shared rarity logic: Tier/boss_drop → Farbe, Glow, Label.
// Genutzt von ItemTooltip, ChestUI, GuildUI Slots.
// ============================================================

import { ItemDef } from '../../data/items';

export interface RarityInfo {
  label:    string; // "Legendär", "Episch", …
  tier:     number; // 1–5
  color:    string; // CSS hex – Text + Border
  glow:     string; // CSS rgba – Box-Shadow
  bgColor:  string; // CSS rgba – Hintergrund-Tint
  cssClass: string; // "mc-item-slot-legendary", …
}

export function getItemRarity(item: ItemDef): RarityInfo {
  const t = item.tier ?? 1;

  if (t >= 5) return {
    label: 'Nemesis', tier: 5,
    color: '#E8E8E8', glow: 'rgba(232,232,232,0.60)', bgColor: 'rgba(232,232,232,0.06)',
    cssClass: 'mc-item-slot-nemesis',
  };
  if (t >= 4) return {
    label: 'Legendär', tier: 4,
    color: '#FF8C00', glow: 'rgba(255,140,0,0.65)', bgColor: 'rgba(255,140,0,0.09)',
    cssClass: 'mc-item-slot-legendary',
  };
  if (t >= 3) return {
    label: 'Selten', tier: 3,
    color: '#a335ee', glow: 'rgba(163,53,238,0.65)', bgColor: 'rgba(163,53,238,0.09)',
    cssClass: 'mc-item-slot-rare',
  };
  if (t >= 2) return {
    label: 'Ungewöhnlich', tier: 2,
    color: '#4FC3F7', glow: 'rgba(79,195,247,0.55)', bgColor: 'rgba(79,195,247,0.07)',
    cssClass: 'mc-item-slot-uncommon',
  };
  return {
    label: 'Gewöhnlich', tier: 1,
    color: '#1eff00', glow: 'rgba(30,255,0,0.50)', bgColor: 'rgba(30,255,0,0.06)',
    cssClass: 'mc-item-slot-common',
  };
}

export function getStatLabel(key: string): string {
  const map: Record<string, string> = {
    atk: 'ATK', def: 'DEF', hp: 'HP', spd: 'SPD', critChance: 'KRIT',
  };
  return map[key] ?? key.toUpperCase();
}

export function formatStatValue(key: string, value: number): string {
  if (key === 'critChance') return `+${(value * 100).toFixed(0)}%`;
  if (key === 'spd')        return value >= 0 ? `+${value.toFixed(2)}` : `${value.toFixed(2)}`;
  return `+${value}`;
}

export function getSpecialEffectText(tags: string[]): string | null {
  const map: Record<string, string> = {
    'special:lifesteal':  'Bei Treffer: 20% Schaden als HP zurück',
    'special:regen':      'Regeneriert 5% HP pro Raum',
    'special:dodge':      'Erhöhte Ausweichwahrscheinlichkeit',
    'special:aoe_resist': 'Reduziert Flächenschaden',
    'special:anti_heal':  'Verursacht Heilungsblock beim Feind',
    'special:spell_power':'Erhöht magischen Schaden um 20%',
    'special:fire_resist':'Feuerresistenz: reduziert Feuerschaden',
    'special:stun_strike':'25% Chance: Erschütterungsschlag – betäubt den Feind für 1 Runde',
  };
  for (const tag of tags) {
    if (map[tag]) return map[tag];
  }
  return null;
}

export function getSlotLabel(slot: string): string {
  const map: Record<string, string> = {
    mainHand: 'Haupthand', offHand: 'Nebenhand', armor: 'Rüstung', trinket: 'Schmuck',
  };
  return map[slot] ?? slot;
}

export function getWeaponTypeLabel(wst?: string): string {
  const map: Record<string, string> = { '1h': 'Einhandig', '2h': 'Zweihandig', shield: 'Schild' };
  return wst ? (map[wst] ?? '') : '';
}
