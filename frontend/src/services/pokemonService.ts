/**
 * Pokemon service - fetches Pokemon data from backend registry with PokeAPI fallback
 */

import * as storageService from "./storageService";
import SPRITE_MAP from "../data/pokemonSpriteMap.json";
import apiClient from "./api/client";

// Storage configuration
const STORAGE_KEY = "pokemon_cache";
const CACHE_EXPIRY_DAYS = 7;
const REGISTRY_STORAGE_KEY = "pokemon_registry";
const REGISTRY_VERSION_KEY = "pokemon_registry_version";

// Backend registry data (loaded on init)
interface RegistryEntry {
  num: number;
  form: number;
  name: string;
  displayName: string;
  baseSpecies: string;
  types: string[];
  aliases: string[];
}

let registryData: Record<string, RegistryEntry> | null = null;
let registryAliasIndex: Record<string, string> | null = null;

// Common VGC Pokemon for fallback
const COMMON_VGC_POKEMON: Record<string, { id: number; name: string; types: string[] }> = {
  "flutter-mane": { id: 987, name: "Flutter Mane", types: ["Ghost", "Fairy"] },
  "iron-hands": { id: 992, name: "Iron Hands", types: ["Fighting", "Electric"] },
  "iron-bundle": { id: 991, name: "Iron Bundle", types: ["Ice", "Water"] },
  "chi-yu": { id: 1004, name: "Chi-Yu", types: ["Dark", "Fire"] },
  "urshifu": { id: 892, name: "Urshifu", types: ["Fighting", "Dark"] },
  "urshifu-rapid-strike": { id: 892, name: "Urshifu", types: ["Fighting", "Water"] },
  "rillaboom": { id: 812, name: "Rillaboom", types: ["Grass"] },
  "incineroar": { id: 727, name: "Incineroar", types: ["Fire", "Dark"] },
  "landorus": { id: 645, name: "Landorus", types: ["Ground", "Flying"] },
  "landorus-therian": { id: 645, name: "Landorus", types: ["Ground", "Flying"] },
  "tornadus": { id: 641, name: "Tornadus", types: ["Flying"] },
  "thundurus": { id: 642, name: "Thundurus", types: ["Electric", "Flying"] },
  "amoonguss": { id: 591, name: "Amoonguss", types: ["Grass", "Poison"] },
  "raging-bolt": { id: 1021, name: "Raging Bolt", types: ["Electric", "Dragon"] },
  "iron-crown": { id: 1023, name: "Iron Crown", types: ["Steel", "Psychic"] },
  "ogerpon": { id: 1017, name: "Ogerpon", types: ["Grass"] },
  "ogerpon-wellspring": { id: 1017, name: "Ogerpon", types: ["Grass", "Water"] },
  "ogerpon-hearthflame": { id: 1017, name: "Ogerpon", types: ["Grass", "Fire"] },
  "ogerpon-cornerstone": { id: 1017, name: "Ogerpon", types: ["Grass", "Rock"] },
  "calyrex-ice": { id: 898, name: "Calyrex", types: ["Psychic", "Ice"] },
  "calyrex-shadow": { id: 898, name: "Calyrex", types: ["Psychic", "Ghost"] },
  "gouging-fire": { id: 1020, name: "Gouging Fire", types: ["Fire", "Dragon"] },
  "walking-wake": { id: 1009, name: "Walking Wake", types: ["Water", "Dragon"] },
  "iron-leaves": { id: 1010, name: "Iron Leaves", types: ["Grass", "Psychic"] },
  "farigiraf": { id: 981, name: "Farigiraf", types: ["Normal", "Psychic"] },
  "arcanine": { id: 59, name: "Arcanine", types: ["Fire"] },
  "arcanine-hisui": { id: 59, name: "Arcanine", types: ["Fire", "Rock"] },
  "tauros-paldea-blaze": { id: 128, name: "Tauros", types: ["Fighting", "Fire"] },
  "tauros-paldea-aqua": { id: 128, name: "Tauros", types: ["Fighting", "Water"] },
  "pecharunt": { id: 1025, name: "Pecharunt", types: ["Poison", "Ghost"] },
  "kingambit": { id: 983, name: "Kingambit", types: ["Dark", "Steel"] },
  "indeedee-f": { id: 876, name: "Indeedee Female", types: ["Psychic", "Normal"] },
  "tatsugiri": { id: 978, name: "Tatsugiri Curly", types: ["Water", "Dragon"] },
};

interface PokemonData {
  id: number;
  name: string;
  types: string[];
  sprite?: string;
  spriteShiny?: string;
  abilities?: string[];
  stats?: Record<string, number>;
}

interface CachedPokemon {
  data: PokemonData;
  timestamp: number;
}

// Pokedex instance (lazy loaded)
let pokedexInstance: any = null;

/**
 * Initialize the Pokedex instance and load backend registry
 */
export async function initialize(): Promise<void> {
  // Load backend registry (non-blocking)
  loadRegistry().catch((err) =>
    console.warn("Failed to load Pokemon registry:", err)
  );

  if (pokedexInstance) return;

  try {
    const { Pokedex } = await import("pokeapi-js-wrapper");
    pokedexInstance = new Pokedex({ cache: true, timeout: 5000 });
  } catch (error) {
    console.warn("Failed to initialize PokeAPI wrapper:", error);
  }
}

/**
 * Load the Pokemon registry from the backend.
 * Caches in localStorage with version-based invalidation.
 */
export async function loadRegistry(): Promise<void> {
  if (registryData) return;

  // Try localStorage cache first
  try {
    const cachedVersion = localStorage.getItem(REGISTRY_VERSION_KEY);
    const cachedData = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (cachedVersion && cachedData) {
      registryData = JSON.parse(cachedData);
      buildAliasIndex();
    }
  } catch {
    // Ignore parse errors
  }

  // Fetch from backend
  try {
    const response: any = await apiClient.get("/api/pokemon/registry");
    const version = response.version;
    const pokemon = response.pokemon;

    if (pokemon && typeof pokemon === "object") {
      registryData = pokemon;
      buildAliasIndex();

      // Cache in localStorage
      localStorage.setItem(REGISTRY_VERSION_KEY, version);
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(pokemon));
    }
  } catch (error) {
    // Registry fetch failed - use cached data or fall back to sprite map
    if (!registryData) {
      console.warn("Pokemon registry unavailable, using offline fallbacks");
    }
  }
}

/**
 * Build alias index from registry data for fast lookups.
 */
function buildAliasIndex(): void {
  if (!registryData) return;
  registryAliasIndex = {};
  for (const [key, entry] of Object.entries(registryData)) {
    registryAliasIndex[key] = key;
    registryAliasIndex[entry.name.toLowerCase()] = key;
    for (const alias of entry.aliases) {
      registryAliasIndex[alias.toLowerCase()] = key;
    }
  }
}

/**
 * Resolve a Pokemon name to its canonical kebab-case key using the backend registry.
 * Returns null if not found in registry (caller should fall back to other methods).
 */
export function resolveFromRegistry(name: string): string | null {
  if (!registryAliasIndex) return null;
  const key = name.toLowerCase().trim();
  return registryAliasIndex[key] || registryAliasIndex[key.replace(/\s+/g, "-")] || null;
}

/**
 * Look up a Pokemon in the backend registry by any name variant.
 */
function getRegistryEntry(identifier: string): RegistryEntry | null {
  if (!registryData || !registryAliasIndex) return null;
  const key = identifier.toLowerCase().trim();
  const canonicalKey = registryAliasIndex[key] || registryAliasIndex[key.replace(/\s+/g, "-")];
  if (canonicalKey && registryData[canonicalKey]) {
    return registryData[canonicalKey];
  }
  return null;
}

/**
 * Get Pokemon data by name or ID
 */
export async function getPokemon(identifier: string | number): Promise<PokemonData> {
  const normalizedId = typeof identifier === "string" ? identifier.toLowerCase().replace(/\s+/g, "-") : identifier;

  // Check cache first
  const cached = await getCachedPokemon(normalizedId);
  if (cached && !isCacheExpired(cached.timestamp)) {
    return cached.data;
  }

  const staticKey = typeof normalizedId === "string" ? normalizedId : String(normalizedId);

  // Check backend registry first
  const registryEntry = getRegistryEntry(staticKey);
  if (registryEntry) {
    const spriteUrls = generateSpriteUrls(staticKey);
    return {
      id: registryEntry.num,
      name: registryEntry.displayName,
      types: registryEntry.types,
      sprite: spriteUrls.normal,
      spriteShiny: spriteUrls.shiny,
    };
  }

  // Check static fallback (avoids 404s for form-Pokemon like landorus, urshifu)
  if (COMMON_VGC_POKEMON[staticKey]) {
    return enrichFallbackData(COMMON_VGC_POKEMON[staticKey], staticKey);
  }

  // Try to fetch from API
  try {
    await initialize();
    if (pokedexInstance) {
      const apiData = await pokedexInstance.getPokemonByName(normalizedId);
      const pokemonData = processPokemonData(apiData);
      await cachePokemon(normalizedId, pokemonData);
      return pokemonData;
    }
  } catch (error) {
    console.warn(`Failed to fetch Pokemon from API: ${identifier}`, error);
  }

  // Fallback to static data (for any not caught above)
  if (COMMON_VGC_POKEMON[staticKey]) {
    return enrichFallbackData(COMMON_VGC_POKEMON[staticKey], staticKey);
  }

  // Fallback to sprite map
  const spriteInfo = getSpriteInfo(staticKey);
  if (spriteInfo) {
    const fallbackData: PokemonData = {
      id: spriteInfo.id,
      name: formatDisplayName(String(identifier)),
      types: ["Unknown"],
      sprite: getLocalSpritePath(spriteInfo.id, spriteInfo.form, false),
      spriteShiny: getLocalSpritePath(spriteInfo.id, spriteInfo.form, true),
    };
    return fallbackData;
  }

  // Last resort: create unknown Pokemon
  return createUnknownPokemon(identifier);
}

/**
 * Get multiple Pokemon data
 */
export async function getMultiplePokemon(
  identifiers: (string | number)[]
): Promise<PokemonData[]> {
  const results = await Promise.allSettled(
    identifiers.map((id) => getPokemon(id))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error(`Failed to fetch Pokemon: ${identifiers[index]}`, result.reason);
      return createUnknownPokemon(identifiers[index]);
    }
  });
}

/**
 * Get sprite URL for a Pokemon
 */
export function getSpriteUrl(identifier: string | number, variant?: "shiny"): string {
  const spriteUrls = generateSpriteUrls(identifier);
  return variant === "shiny" ? spriteUrls.shiny : spriteUrls.normal;
}

/**
 * Process raw API data into PokemonData
 */
function processPokemonData(apiData: any): PokemonData {
  const spriteUrls = generateSpriteUrls(apiData.name, undefined, apiData.id);
  return {
    id: apiData.id,
    name: formatDisplayName(apiData.name),
    types: apiData.types.map((t: any) => formatDisplayName(t.type.name)),
    sprite: spriteUrls.normal,
    spriteShiny: spriteUrls.shiny,
    abilities: apiData.abilities?.map((a: any) => formatDisplayName(a.ability.name)),
    stats: apiData.stats?.reduce((acc: Record<string, number>, s: any) => {
      acc[s.stat.name] = s.base_stat;
      return acc;
    }, {}),
  };
}

/**
 * Enrich fallback data with sprite info
 * @param nameKey - normalized name for sprite map lookup (e.g. "ogerpon-hearthflame")
 */
function enrichFallbackData(
  fallbackData: { id: number; name: string; types: string[] },
  nameKey?: string,
): PokemonData {
  const spriteUrls = generateSpriteUrls(nameKey || fallbackData.id);
  return {
    ...fallbackData,
    sprite: spriteUrls.normal,
    spriteShiny: spriteUrls.shiny,
  };
}

/**
 * Get sprite info from backend registry, falling back to sprite map
 */
function getSpriteInfo(identifier: string): { id: number; form: number } | null {
  // Check backend registry first
  const registryEntry = getRegistryEntry(identifier);
  if (registryEntry) {
    return { id: registryEntry.num, form: registryEntry.form };
  }

  // Fallback to sprite map
  const key = identifier.toLowerCase().replace(/\s+/g, "-");
  const spriteData = (SPRITE_MAP as unknown as Record<string, { id: number; form: number }>)[key];
  return spriteData || null;
}

/**
 * Get local sprite path
 */
export function getLocalSpritePath(id: number, form: number, shiny: boolean): string {
  const idStr = String(id).padStart(4, "0");
  const formStr = String(form).padStart(2, "0");
  const shinyStr = shiny ? "1" : "0";
  return `/sprites/icon${idStr}_f${formStr}_s${shinyStr}.png`;
}

/**
 * Generate sprite URLs (local + remote fallback)
 */
export function generateSpriteUrls(
  idOrName: string | number,
  formOverride?: number,
  idFallback?: number
): { normal: string; shiny: string } {
  // Try to get from sprite map
  const key = String(idOrName).toLowerCase();
  const spriteInfo = getSpriteInfo(key);

  if (spriteInfo) {
    const form = formOverride !== undefined ? formOverride : spriteInfo.form;
    return {
      normal: getLocalSpritePath(spriteInfo.id, form, false),
      shiny: getLocalSpritePath(spriteInfo.id, form, true),
    };
  }

  // Fallback: check COMMON_VGC_POKEMON, then idFallback, then numeric idOrName
  const normalized = String(idOrName).toLowerCase().replace(/\s+/g, "-");
  const fallback = COMMON_VGC_POKEMON[normalized];
  const id = typeof idOrName === "number" ? idOrName : (fallback?.id ?? idFallback ?? 0);
  if (id > 0) {
    const form = formOverride ?? 0;
    return {
      normal: getLocalSpritePath(id, form, false),
      shiny: getLocalSpritePath(id, form, true),
    };
  }

  // Last resort: PokeAPI sprites
  const normalizedName = String(idOrName).toLowerCase().replace(/\s+/g, "-");
  return {
    normal: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${normalizedName}.png`,
    shiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${normalizedName}.png`,
  };
}

/**
 * Format display name (capitalize words)
 */
export function formatDisplayName(name: string): string {
  return name
    .split(/[-\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Create unknown Pokemon fallback
 */
export function createUnknownPokemon(identifier: string | number): PokemonData {
  return {
    id: 0,
    name: formatDisplayName(String(identifier)),
    types: ["Unknown"],
    sprite: "/sprites/icon0000_f00_s0.png",
  };
}

/**
 * Cache Pokemon data
 */
async function cachePokemon(identifier: string | number, data: PokemonData): Promise<void> {
  const key = String(identifier).toLowerCase();
  const cache = (await storageService.get<Record<string, CachedPokemon>>(STORAGE_KEY)) || {};
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
  await storageService.set(STORAGE_KEY, cache);
}

/**
 * Get cached Pokemon data
 */
async function getCachedPokemon(identifier: string | number): Promise<CachedPokemon | null> {
  const key = String(identifier).toLowerCase();
  const cache = (await storageService.get<Record<string, CachedPokemon>>(STORAGE_KEY)) || {};
  return cache[key] || null;
}

/**
 * Check if cache is expired
 */
function isCacheExpired(timestamp: number): boolean {
  const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > expiryMs;
}

/**
 * Check if local sprites are available
 */
export function hasLocalSprites(): boolean {
  // Simple check - could be enhanced to actually verify sprite existence
  return true;
}

/**
 * Clear the Pokemon cache
 */
export async function clearCache(): Promise<void> {
  await storageService.remove(STORAGE_KEY);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}> {
  const cache = (await storageService.get<Record<string, CachedPokemon>>(STORAGE_KEY)) || {};
  const entries = Object.keys(cache).length;
  const timestamps = Object.values(cache).map((c) => c.timestamp);

  return {
    entries,
    oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : 0,
    newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : 0,
  };
}
