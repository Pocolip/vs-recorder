/**
 * Reportworm source (official events: Regionals, Internationals, Worlds).
 *
 * Reportworm (https://reportworm.com, github.com/mikewVGC/vgc-standings)
 * publishes processed standings + open teamsheets for majors as static JSON.
 * We use it instead of scraping RK9 ourselves: RK9's robots.txt disallows
 * /roster/, /pairings/ and /teamlist/public/.
 *
 *   GET /api/v1/{season}          event index for a season (e.g. 2027)
 *   GET /api/v1/{season}/{code}   standings with teams and per-round results
 *
 * `/api/v1/grassroots` is intentionally NOT used: Reportworm sources those
 * events from Limitless, which we already ingest directly.
 *
 * Note: Reportworm's code license forbids using its software for ML
 * training. This feeds only the Recent Tour modal; don't route it into the
 * matchup engine's training pool without the author's OK.
 */

import { getJson as defaultGetJson } from "./http.js";

const API = "https://standings.reportworm.com/api/v1";

function fail(path, shape) {
  throw new Error(`Invalid Reportworm response at ${path}: expected ${shape}`);
}
const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isCount = (v) => Number.isInteger(v) && v >= 0;

export function validateSeason(raw) {
  if (!Array.isArray(raw)) fail("$", "event array");
  raw.forEach((e, i) => {
    if (!e || !isStr(e.code)) fail(`$[${i}].code`, "string");
    if (!isStr(e.name)) fail(`$[${i}].name`, "string");
    if (!isStr(e.start) || Number.isNaN(Date.parse(e.start))) fail(`$[${i}].start`, "date");
    if (typeof e.format !== "string") fail(`$[${i}].format`, "string");
    if (typeof e.status !== "string") fail(`$[${i}].status`, "string");
  });
}

export function validateEvent(raw) {
  if (!raw || typeof raw !== "object") fail("$", "object");
  if (!raw.event || !isStr(raw.event.name)) fail("$.event.name", "string");
  const s = raw.standings;
  if (!s || typeof s !== "object" || Array.isArray(s)) fail("$.standings", "object keyed by player code");
  for (const [code, p] of Object.entries(s)) {
    const path = `$.standings[${JSON.stringify(code)}]`;
    if (!p || !isStr(p.name)) fail(`${path}.name`, "string");
    if (p.place != null && !isCount(p.place)) fail(`${path}.place`, "integer or null");
    const r = p.record;
    if (!r || !isCount(r.w) || !isCount(r.l) || !isCount(r.t ?? 0)) fail(`${path}.record`, "{ w, l, t } integers");
    if (p.team == null) continue;
    if (!Array.isArray(p.team)) fail(`${path}.team`, "array or null");
    p.team.forEach((m, j) => {
      const mp = `${path}.team[${j}]`;
      if (!m || !isStr(m.name)) fail(`${mp}.name`, "species name");
      if (!Array.isArray(m.moves) || !m.moves.every((mv) => mv && typeof mv.name === "string")) {
        fail(`${mp}.moves`, "[{ name }] array");
      }
      for (const f of ["item", "ability", "nature"]) {
        if (m[f] != null && typeof m[f] !== "string") fail(`${mp}.${f}`, "string or null");
      }
    });
  }
}

/**
 * Seasons that can contain events between `from` and `to`. A VGC season
 * runs roughly Sept → Aug and is named for the year it ends, so query the
 * calendar years in range plus the following one; unknown seasons 404.
 */
export function seasonsFor(from, to) {
  const a = Number(from.slice(0, 4));
  const b = Number(to.slice(0, 4));
  const out = [];
  for (let y = a; y <= b + 1; y++) out.push(y);
  return out;
}

/** Completed + processed events for `formatLabel` starting inside the window. */
export async function listEvents({ formatLabel, from, to }, { getJson = defaultGetJson, log = () => {} } = {}) {
  const out = [];
  for (const season of seasonsFor(from, to)) {
    const { json } = await getJson(`${API}/${season}`, { log });
    if (json == null) continue; // season not published yet
    validateSeason(json);
    for (const e of json) {
      if (
        e.format === formatLabel &&
        e.status === "complete" &&
        e.processed === true &&
        e.start >= from &&
        e.start <= to
      ) {
        out.push({ ...e, season });
      }
    }
  }
  return out;
}

export async function fetchEvent(event, { getJson = defaultGetJson, log = () => {} } = {}) {
  const { json } = await getJson(`${API}/${event.season}/${event.code}`, { log });
  if (json == null) throw new Error(`Reportworm event ${event.season}/${event.code} not found`);
  validateEvent(json);
  return json;
}

/** Convert one event into NormalizedTeam records. */
export function normalizeReportworm(event, data, registry) {
  const standings = Object.entries(data.standings);
  const players = data.event.playerCount || event.playerCount || standings.length;
  return standings
    .filter(([, p]) => Array.isArray(p.team) && p.team.length > 0)
    .map(([code, p]) => ({
      player: p.name,
      placement: p.place ?? null,
      players,
      record: { w: p.record.w, l: p.record.l, t: p.record.t ?? 0 },
      // `name`/`code` are the out-of-battle species; `altname` carries the
      // mega forme, which we collapse to match Limitless and LabMaus.
      mons: p.team.map((m) => {
        const { key, name } = registry.resolveSpecies(m.name, m.code);
        return {
          key,
          name,
          item: m.item || null,
          ability: m.ability || null,
          nature: m.nature || null,
          moves: m.moves.map((mv) => mv.name).filter(Boolean),
        };
      }),
      tournamentName: data.event.name,
      sourceUrl: `https://standings.reportworm.com/${event.season}/${event.code}/player/${encodeURIComponent(code)}`,
    }));
}
