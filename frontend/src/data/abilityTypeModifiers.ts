export interface AbilityModifier {
  immunities?: string[];
  resistances?: string[];
  weaknesses?: string[];
  filterEffect?: boolean;
}

export const ABILITY_TYPE_MODIFIERS: Record<string, AbilityModifier> = {
  // Immunities
  "Dry Skin":      { immunities: ["Water"], weaknesses: ["Fire"] },
  "Earth Eater":   { immunities: ["Ground"] },
  "Flash Fire":    { immunities: ["Fire"] },
  "Levitate":      { immunities: ["Ground"] },
  "Lightning Rod": { immunities: ["Electric"] },
  "Motor Drive":   { immunities: ["Electric"] },
  "Sap Sipper":   { immunities: ["Grass"] },
  "Storm Drain":   { immunities: ["Water"] },
  "Volt Absorb":   { immunities: ["Electric"] },
  "Water Absorb":  { immunities: ["Water"] },
  "Well-Baked Body": { immunities: ["Fire"] },

  // Resistances
  "Heatproof":     { resistances: ["Fire"] },
  "Purifying Salt": { resistances: ["Ghost"] },
  "Thick Fat":     { resistances: ["Ice", "Fire"] },
  "Water Bubble":  { resistances: ["Fire"] },

  // Weaknesses
  "Fluffy":        { weaknesses: ["Fire"] },

  // Filter effect (halves super-effective damage)
  "Filter":        { filterEffect: true },
  "Prism Armor":   { filterEffect: true },
  "Solid Rock":    { filterEffect: true },
};
