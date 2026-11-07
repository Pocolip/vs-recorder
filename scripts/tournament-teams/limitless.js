/**
 * Limitless source (grassroots online events).
 *
 * API docs: https://docs.limitlesstcg.com/developer.html — no key is needed
 * for tournaments/standings (only the TCG deck-rules endpoint is keyed).
 *
 *   GET /tournaments?game=VGC&format=M-C&limit=100&page=N   newest first
 *   GET /tournaments/{id}/standings   placing, record, open teamsheet
 *
 * Without a key the limit is 50 requests / 5 min. Set LIMITLESS_API_KEY to
 * send `X-Access-Key` for the higher keyed limit; requests are then only
 * lightly spaced and the `ratelimit` response header governs backoff.
 */

import { getJson as defaultGetJson } from "./http.js";

const API = "https://play.limitlesstcg.com/api";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
// Tournaments this recent may still be running or have late corrections.
const FINAL_AFTER_DAYS = 3;
// Skip events where most players didn't submit a teamsheet (open-format
// events without teamlist submission still show up under the VGC format).
const MIN_TEAMLIST_SHARE = 0.5;
// Custom-rule events filed under the regular VGC format. Off-meta events
// ban the top Pokémon and mono-type/region events restrict team building, so
// their teams would distort core usage and win rates.
export const EXCLUDED_EVENT_NAME = /off[\s-]?meta|mono[\s-]?(type|region)|little[\s-]?cup|\bdraft\b/i;

export function isExcludedEvent(name) {
  return EXCLUDED_EVENT_NAME.test(name ?? "");
}

// With a key we don't know the exact limit, so go fast and let the
// `ratelimit` header (r=0 → wait t seconds) and 429 handling pace us.
const KEYED_SPACING_MS = 250;

/** Request options for Limitless calls; never log the returned headers. */
export function limitlessRequestOptions(env = process.env) {
  const key = env.LIMITLESS_API_KEY?.trim();
  return key
    ? { headers: { "X-Access-Key": key }, spacingMs: KEYED_SPACING_MS, keyed: true }
    : { keyed: false };
}

function fail(path, shape) {
  throw new Error(`Invalid Limitless response at ${path}: expected ${shape}`);
}
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isCount = (v) => Number.isInteger(v) && v >= 0;

export function validateTournamentList(raw) {
  if (!Array.isArray(raw)) fail("$", "tournament array");
  raw.forEach((t, i) => {
    if (!t || !isStr(t.id)) fail(`$[${i}].id`, "string");
    if (!isStr(t.name)) fail(`$[${i}].name`, "string");
    if (!isStr(t.date) || Number.isNaN(Date.parse(t.date))) fail(`$[${i}].date`, "ISO date");
    if (!isCount(t.players)) fail(`$[${i}].players`, "non-negative integer");
  });
}

export function validateStandings(raw) {
  if (!Array.isArray(raw)) fail("$", "standings array");
  raw.forEach((p, i) => {
    const path = `$[${i}]`;
    if (!p || !isStr(p.player)) fail(`${path}.player`, "string");
    if (p.placing != null && !isCount(p.placing)) fail(`${path}.placing`, "integer or null");
    const r = p.record;
    if (!r || !isCount(r.wins) || !isCount(r.losses) || !isCount(r.ties ?? 0)) {
      fail(`${path}.record`, "{ wins, losses, ties } integers");
    }
    if (p.decklist == null) return;
    if (!Array.isArray(p.decklist)) fail(`${path}.decklist`, "array or null");
    p.decklist.forEach((m, j) => {
      const mp = `${path}.decklist[${j}]`;
      if (!m || !isStr(m.id)) fail(`${mp}.id`, "species slug");
      if (!Array.isArray(m.attacks) || !m.attacks.every((a) => typeof a === "string")) {
        fail(`${mp}.attacks`, "string array");
      }
      for (const f of ["name", "item", "ability", "nature"]) {
        if (m[f] != null && typeof m[f] !== "string") fail(`${mp}.${f}`, "string or null");
      }
    });
  });
}

/**
 * List tournaments for `format` dated on/after `from` (YYYY-MM-DD) with at
 * least `minPlayers`. Paginates the newest-first listing until it passes
 * `from`.
 */
export async function listTournaments({ format, from, to, minPlayers }, { getJson = defaultGetJson, log = () => {}, request = {} } = {}) {
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T23:59:59Z`);
  const out = [];
  const excluded = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${API}/tournaments?game=VGC&format=${encodeURIComponent(format)}&limit=${PAGE_SIZE}&page=${page}`;
    const { json, headers } = await getJson(url, { log, headers: request.headers, spacingMs: request.spacingMs });
    // Shows whether a key was accepted (keyed policies report a higher quota).
    if (page === 1 && headers?.ratelimit) log(`  Limitless rate limit: ${headers["ratelimit-policy"] ?? headers.ratelimit}`);
    const list = json ?? [];
    validateTournamentList(list);
    for (const t of list) {
      const at = Date.parse(t.date);
      if (at >= fromMs && at <= toMs && t.players >= minPlayers) {
        if (isExcludedEvent(t.name)) excluded.push(t.name);
        else out.push(t);
      }
    }
    const oldest = list.length ? Date.parse(list.at(-1).date) : -Infinity;
    if (list.length < PAGE_SIZE || oldest < fromMs) break;
  }
  if (excluded.length) log(`  Limitless: excluded ${excluded.length} custom-rule events (${excluded.join("; ")})`);
  return out;
}

export function isFinal(tournament, now = Date.now()) {
  return now - Date.parse(tournament.date) > FINAL_AFTER_DAYS * 86_400_000;
}

/** Standings for one tournament, served from cache when finished. */
export async function fetchStandings(tournament, { cache, getJson = defaultGetJson, log = () => {}, now = Date.now(), request = {} } = {}) {
  const cached = cache?.get("limitless", tournament.id);
  if (cached) return { standings: cached, fromCache: true };
  const { json } = await getJson(`${API}/tournaments/${tournament.id}/standings`, {
    log,
    headers: request.headers,
    spacingMs: request.spacingMs,
  });
  const standings = json ?? [];
  validateStandings(standings);
  if (cache && isFinal(tournament, now)) cache.set("limitless", tournament.id, standings);
  return { standings, fromCache: false };
}

/**
 * Convert one tournament's standings into NormalizedTeam records. Returns []
 * when too few players submitted teamsheets for the event to be meaningful.
 */
export function normalizeLimitless(tournament, standings, registry) {
  const withSheets = standings.filter((p) => Array.isArray(p.decklist) && p.decklist.length > 0);
  if (standings.length === 0 || withSheets.length / standings.length < MIN_TEAMLIST_SHARE) return [];

  const players = tournament.players || standings.length;
  return withSheets.map((p) => ({
    player: p.name || p.player,
    placement: p.placing ?? null,
    players,
    record: { w: p.record.wins, l: p.record.losses, t: p.record.ties ?? 0 },
    mons: p.decklist.map((m) => {
      const { key, name } = registry.resolveSpecies(m.id, m.name);
      return {
        key,
        name,
        item: m.item || null,
        ability: m.ability || null,
        nature: m.nature || null,
        moves: m.attacks.filter(Boolean),
      };
    }),
    tournamentName: tournament.name,
    sourceUrl: `https://play.limitlesstcg.com/tournament/${tournament.id}/player/${encodeURIComponent(p.player)}/teamlist`,
  }));
}
