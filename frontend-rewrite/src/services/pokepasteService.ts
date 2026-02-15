/**
 * Pokepaste service - fetches and parses Pokemon team pastes from pokepast.es and pokebin
 */

import * as storageService from "./storageService";
import { apiClient } from "./api";

// URL patterns
const POKEPASTE_PATTERN = /^https?:\/\/(www\.)?pokepast\.es\/([a-zA-Z0-9]+)/;
const POKEBIN_PATTERN = /^https?:\/\/(www\.)?pokebin\.com\/([a-zA-Z0-9]+)/;

// Cache configuration — v3 to invalidate old-format entries from original frontend
const CACHE_KEY = "pokepaste_cache_v3";
const CACHE_EXPIRY_HOURS = 24;

interface PasteServiceType {
  type: "pokepaste" | "pokebin";
  pasteId: string;
}

interface ParseOptions {
  maxPokemon?: number;
  validateFormat?: boolean;
}

export interface PokemonData {
  name: string;
  species: string;
  nickname?: string;
  gender?: string;
  ability?: string;
  item?: string;
  level?: number;
  shiny?: boolean;
  gigantamax?: boolean;
  tera_type?: string;
  nature?: string;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  moves?: string[];
}

interface CachedPaste {
  data: PokemonData[];
  timestamp: number;
  url: string;
}

/**
 * Detect paste service type from URL
 */
export function detectPasteService(url: string): PasteServiceType | null {
  const pokepasteMatch = url.match(POKEPASTE_PATTERN);
  if (pokepasteMatch) {
    return { type: "pokepaste", pasteId: pokepasteMatch[2] };
  }

  const pokebinMatch = url.match(POKEBIN_PATTERN);
  if (pokebinMatch) {
    return { type: "pokebin", pasteId: pokebinMatch[2] };
  }

  return null;
}

/**
 * Fetch and parse a pokepaste URL
 */
export async function fetchAndParse(
  pasteUrl: string,
  options?: ParseOptions
): Promise<PokemonData[]> {
  // Check cache first
  const cached = await getCachedPokepaste(pasteUrl);
  if (cached && Array.isArray(cached.data) && !isCacheExpired(cached.timestamp)) {
    return cached.data;
  }

  const detected = detectPasteService(pasteUrl);
  if (!detected) {
    throw new Error("Invalid paste URL");
  }

  let pokemonData: PokemonData[];

  if (detected.type === "pokepaste") {
    pokemonData = await fetchPokepaste(detected.pasteId, pasteUrl, options?.maxPokemon);
  } else {
    pokemonData = await fetchPokebin(detected.pasteId, pasteUrl, options?.maxPokemon);
  }

  // Cache the result
  await cachePokepaste(pasteUrl, pokemonData);

  return pokemonData;
}

/**
 * Fetch pokepaste data from pokepast.es
 */
async function fetchPokepaste(
  pasteId: string,
  _originalUrl: string,
  maxPokemon?: number
): Promise<PokemonData[]> {
  try {
    // Fetch raw text
    const rawResponse = await fetch(`https://pokepast.es/${pasteId}/raw`);
    if (!rawResponse.ok) {
      throw new Error(`Failed to fetch pokepaste: ${rawResponse.statusText}`);
    }
    const rawText = await rawResponse.text();

    // Parse the text
    const pokemonData = parsePokepasteText(rawText, { maxPokemon });
    return pokemonData;
  } catch (error) {
    console.error("Error fetching pokepaste:", error);
    throw error;
  }
}

/**
 * Fetch pokebin data via backend API
 */
async function fetchPokebin(
  _pasteId: string,
  originalUrl: string,
  maxPokemon?: number
): Promise<PokemonData[]> {
  try {
    const response = await apiClient.get("/api/pokemon/pokepaste/fetch", {
      params: { url: originalUrl },
    });
    
    // The backend should return parsed data or raw text
    if (response.data.pokemon) {
      return response.data.pokemon.slice(0, maxPokemon);
    } else if (response.data.raw) {
      return parsePokepasteText(response.data.raw, { maxPokemon });
    } else {
      throw new Error("Invalid response from pokebin API");
    }
  } catch (error) {
    console.error("Error fetching pokebin:", error);
    throw error;
  }
}

/**
 * Parse pokepaste text format
 */
export function parsePokepasteText(
  rawText: string,
  options?: ParseOptions
): PokemonData[] {
  const blocks = splitIntoPokemonBlocks(rawText);
  const maxPokemon = options?.maxPokemon || 6;
  
  return blocks.slice(0, maxPokemon).map((block) => parsePokemonBlock(block));
}

/**
 * Split paste text into individual Pokemon blocks
 */
function splitIntoPokemonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Empty line indicates end of a Pokemon block
    if (trimmed === "" && currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [];
    } else if (trimmed !== "") {
      currentBlock.push(line);
    }
  }

  // Add last block if exists
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks;
}

/**
 * Parse a single Pokemon block
 */
function parsePokemonBlock(block: string): PokemonData {
  const lines = block.split("\n");
  const pokemon: PokemonData = {
    name: "",
    species: "",
    moves: [],
  };

  // Parse first line (name/species + item)
  const nameLine = parseNameLine(lines[0]);
  pokemon.name = nameLine.name;
  pokemon.species = nameLine.species;
  pokemon.nickname = nameLine.nickname;
  pokemon.gender = nameLine.gender;

  // Extract item from first line (format: "Pokemon @ Item")
  if (lines[0].includes(" @ ")) {
    const parts = lines[0].split(" @ ");
    if (parts[1]) {
      pokemon.item = parts[1].trim();
    }
  }

  // Parse remaining lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("Ability:")) {
      pokemon.ability = line.substring(8).trim();
    } else if (line.startsWith("Level:")) {
      pokemon.level = parseInt(line.substring(6).trim());
    } else if (line.startsWith("Shiny:")) {
      pokemon.shiny = line.substring(6).trim().toLowerCase() === "yes";
    } else if (line.startsWith("Gigantamax:")) {
      pokemon.gigantamax = line.substring(11).trim().toLowerCase() === "yes";
    } else if (line.startsWith("Tera Type:")) {
      pokemon.tera_type = line.substring(10).trim();
    } else if (line.includes(" Nature")) {
      pokemon.nature = line.replace(" Nature", "").trim();
    } else if (line.startsWith("EVs:")) {
      pokemon.evs = parseStats(line.substring(4));
    } else if (line.startsWith("IVs:")) {
      pokemon.ivs = parseStats(line.substring(4));
    } else if (line.startsWith("-") || line.startsWith("~")) {
      const move = line.substring(1).trim();
      if (move && pokemon.moves) {
        pokemon.moves.push(move);
      }
    } else if (line.includes(" @ ")) {
      // Item on name line
      const parts = line.split(" @ ");
      if (parts[1]) {
        pokemon.item = parts[1].trim();
      }
    }
  }

  return pokemon;
}

/**
 * Parse the name/species line
 */
function parseNameLine(line: string): {
  name: string;
  species: string;
  nickname?: string;
  gender?: string;
} {
  let name = line.trim();
  let species = name;
  let nickname: string | undefined;
  let gender: string | undefined;

  // Extract item if present
  if (name.includes(" @ ")) {
    name = name.split(" @ ")[0];
  }

  // Extract gender
  if (name.includes(" (M)")) {
    gender = "M";
    name = name.replace(" (M)", "").trim();
  } else if (name.includes(" (F)")) {
    gender = "F";
    name = name.replace(" (F)", "").trim();
  }

  // Extract nickname and species
  if (name.includes(" (") && name.includes(")")) {
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      nickname = match[1].trim();
      species = match[2].trim();
      name = species;
    }
  }

  return { name, species, nickname, gender };
}

/**
 * Parse stats string (EVs/IVs)
 */
function parseStats(statsStr: string): Record<string, number> {
  const stats: Record<string, number> = {};
  const parts = statsStr.split("/");

  for (const part of parts) {
    const trimmed = part.trim();
    const match = trimmed.match(/(\d+)\s+(\w+)/);
    if (match) {
      const value = parseInt(match[1]);
      const stat = match[2];
      stats[stat] = value;
    }
  }

  return stats;
}

/**
 * Check if URL is a valid pokepaste URL
 */
export function isValidPokepasteUrl(url: string): boolean {
  return detectPasteService(url) !== null;
}

/**
 * Extract paste ID from URL
 */
export function extractPasteId(url: string): string | null {
  const detected = detectPasteService(url);
  return detected ? detected.pasteId : null;
}

/**
 * Cache a pokepaste
 */
async function cachePokepaste(url: string, data: PokemonData[]): Promise<void> {
  const cache = (await storageService.get<Record<string, CachedPaste>>(CACHE_KEY)) || {};
  cache[url] = {
    data,
    timestamp: Date.now(),
    url,
  };
  await storageService.set(CACHE_KEY, cache);
}

/**
 * Get cached pokepaste
 */
async function getCachedPokepaste(url: string): Promise<CachedPaste | null> {
  const cache = (await storageService.get<Record<string, CachedPaste>>(CACHE_KEY)) || {};
  return cache[url] || null;
}

/**
 * Check if cache is expired
 */
function isCacheExpired(timestamp: number): boolean {
  if (!timestamp || typeof timestamp !== "number") return true;
  const expiryMs = CACHE_EXPIRY_HOURS * 60 * 60 * 1000;
  return Date.now() - timestamp > expiryMs;
}

/**
 * Clear the pokepaste cache
 */
export async function clearCache(): Promise<void> {
  await storageService.remove(CACHE_KEY);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: number;
  oldestTimestamp: number;
  newestTimestamp: number;
}> {
  const cache = (await storageService.get<Record<string, CachedPaste>>(CACHE_KEY)) || {};
  const entries = Object.keys(cache).length;
  const timestamps = Object.values(cache).map((c) => c.timestamp);

  return {
    entries,
    oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : 0,
    newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : 0,
  };
}

/**
 * Get Pokemon names from a paste URL (simplified interface)
 */
export async function getPokemonNames(
  pasteUrl: string,
  maxPokemon?: number
): Promise<string[]> {
  const pokemonData = await fetchAndParse(pasteUrl, { maxPokemon });
  return pokemonData.map((p) => p.name);
}

/**
 * Validate a pokepaste URL
 */
export async function validatePokepaste(
  pasteUrl: string
): Promise<{ valid: boolean; error?: string; pokemonCount?: number }> {
  try {
    const pokemonData = await fetchAndParse(pasteUrl);
    return {
      valid: true,
      pokemonCount: pokemonData.length,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
