#!/usr/bin/env node

/**
 * Generate per-regulation tournament team JSON for the Matchup Planner's
 * "Recent Tour" modal.
 *
 * Two sources, chosen with --source (or TOURNAMENT_TEAMS_SOURCE):
 *
 *   direct  (default) — Limitless API for grassroots online events plus
 *           Reportworm for official events (Regionals/ICs). Open teamsheets
 *           are clustered into 4/5/6-Pokémon cores here, and each team ships
 *           its sheet as Showdown paste text (`sheets` map) so it can be
 *           imported without a pokepaste link.
 *   labmaus — LabMaus' pre-clustered top_teams endpoint (pokepaste links).
 *
 * Writes:
 *   - frontend/src/data/tournamentTeams-reg{X}.json for each REGULATIONS entry
 *
 * Usage:
 *   node scripts/generate-tournament-teams.js [--source=direct|labmaus]
 *        [--min-players=32] [--window-days=60]
 *   (or: cd frontend && npm run generate:tournament-teams)
 *
 * Limitless allows 50 unauthenticated requests per 5 minutes, so a cold
 * keyless direct run takes ~30 minutes. Set LIMITLESS_API_KEY for the higher
 * keyed limit. Finished events are cached under scripts/.cache/tournament-teams
 * (persisted in CI with actions/cache).
 */

import { appendFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildCompositions, fetchTopTeams } from "./tournament-teams/labmaus.js";
import { createRegistry } from "./tournament-teams/registry.js";
import { createCache } from "./tournament-teams/cache.js";
import * as limitless from "./tournament-teams/limitless.js";
import * as reportworm from "./tournament-teams/reportworm.js";
import { buildDirectCompositions } from "./tournament-teams/cluster.js";

// Re-exported for scripts/generate-tournament-teams.test.js.
export { validateTopTeams, trimCluster } from "./tournament-teams/labmaus.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Refresh only the active regulation; older snapshots remain available in the UI.
const REGULATIONS = [
  {
    code: "M-C",
    labmaus: "Regulation Set M-C",   // LabMaus `regulation` param
    limitless: "M-C",                // Limitless `format` id (GET /games)
    reportworm: "Regulation M-C",    // Reportworm event `format` label
  },
];

const SOURCES = ["direct", "labmaus"];
const DEFAULTS = { windowDays: 60, minPlayers: 32 };

// Refuse to overwrite the checked-in dataset with something this thin.
const MIN_DIRECT_TEAMS = 100;
// A source with more failed events than this is treated as broken.
const MAX_SKIPPED_EVENT_SHARE = 0.25;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function computeDateRange(windowDays) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - windowDays);
  return { from: isoDate(from), to: isoDate(to) };
}

export function parseArgs(argv, env = process.env) {
  const opts = {
    source: env.TOURNAMENT_TEAMS_SOURCE || "direct",
    ...DEFAULTS,
  };
  for (const arg of argv) {
    const [flag, value] = arg.split("=", 2);
    if (flag === "--source") opts.source = value;
    else if (flag === "--min-players") opts.minPlayers = Number(value);
    else if (flag === "--window-days") opts.windowDays = Number(value);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!SOURCES.includes(opts.source)) {
    throw new Error(`--source must be one of ${SOURCES.join(", ")} (got "${opts.source}")`);
  }
  for (const k of ["minPlayers", "windowDays"]) {
    if (!Number.isInteger(opts[k]) || opts[k] < 1) throw new Error(`--${k} must be a positive integer`);
  }
  return opts;
}

const log = (msg) => console.log(msg);

// Surface warnings in the GitHub Actions UI when running in CI.
function warn(msg) {
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `WARNING: ${msg}`);
}

function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  }
}

function countClusters(compositions) {
  return compositions.reduce((n, c) => n + c.clusters.length, 0);
}

function countInnerTeams(compositions) {
  return compositions.reduce(
    (n, c) => n + c.clusters.reduce((m, k) => m + k.teams.length, 0),
    0,
  );
}

/**
 * Run `normalize` over each event, skipping (with a warning) events that
 * fail individually — e.g. one tournament with a species the registry
 * doesn't know yet. Too many failures means the source itself is broken.
 */
async function collectEvents(label, events, loadTeams) {
  const teams = [];
  let used = 0;
  const skipped = [];
  for (const [i, event] of events.entries()) {
    try {
      const eventTeams = await loadTeams(event, i);
      if (eventTeams.length > 0) used++;
      teams.push(...eventTeams);
    } catch (err) {
      skipped.push(`${event.name ?? event.code ?? event.id}: ${err.message}`);
    }
  }
  for (const s of skipped) warn(`${label}: skipped ${s}`);
  if (events.length > 0 && skipped.length / events.length > MAX_SKIPPED_EVENT_SHARE) {
    throw new Error(`${label}: ${skipped.length}/${events.length} events failed`);
  }
  return { teams, events: used };
}

async function fetchLimitlessTeams(reg, dateRange, opts, ctx) {
  const request = limitless.limitlessRequestOptions();
  log(`  Limitless: ${request.keyed ? "using API key (LIMITLESS_API_KEY)" : "no API key — limited to 50 requests / 5 min"}`);
  const tournaments = await limitless.listTournaments(
    { format: reg.limitless, from: dateRange.from, to: dateRange.to, minPlayers: opts.minPlayers },
    { log, request },
  );
  log(`  Limitless: ${tournaments.length} ${reg.limitless} tournaments with ≥${opts.minPlayers} players`);
  let cached = 0;
  const result = await collectEvents("Limitless", tournaments, async (t, i) => {
    const { standings, fromCache } = await limitless.fetchStandings(t, { cache: ctx.cache, log, request });
    if (fromCache) cached++;
    else log(`    [${i + 1}/${tournaments.length}] ${t.name} (${t.players} players)`);
    return limitless.normalizeLimitless(t, standings, ctx.registry);
  });
  log(`  Limitless: ${result.events} events / ${result.teams.length} teams (${cached} from cache)`);
  return result;
}

async function fetchReportwormTeams(reg, dateRange, ctx) {
  const events = await reportworm.listEvents(
    { formatLabel: reg.reportworm, from: dateRange.from, to: dateRange.to },
    { log },
  );
  log(`  Reportworm: ${events.length} completed ${reg.reportworm} events`);
  const result = await collectEvents("Reportworm", events, async (e) => {
    const data = await reportworm.fetchEvent(e, { log });
    log(`    ${e.name} (${e.playerCount ?? "?"} players)`);
    return reportworm.normalizeReportworm(e, data, ctx.registry);
  });
  log(`  Reportworm: ${result.events} events / ${result.teams.length} teams`);
  return result;
}

async function generateDirect(reg, dateRange, opts, ctx) {
  const results = await Promise.allSettled([
    fetchLimitlessTeams(reg, dateRange, opts, ctx),
    fetchReportwormTeams(reg, dateRange, ctx),
  ]);
  const names = ["Limitless", "Reportworm"];
  const sources = [];
  const teams = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      sources.push({ name: names[i], events: r.value.events });
      teams.push(...r.value.teams);
    } else {
      warn(`${names[i]} source failed for ${reg.code}: ${r.reason?.message ?? r.reason}`);
    }
  });
  if (sources.length === 0) {
    throw new Error(`Both direct sources failed for ${reg.code}; not overwriting existing data`);
  }

  const { compositions, sheets, teamCount } = buildDirectCompositions(teams);
  if (teamCount < MIN_DIRECT_TEAMS) {
    throw new Error(`Only ${teamCount} complete teams for ${reg.code} (need ≥${MIN_DIRECT_TEAMS}); not overwriting existing data`);
  }
  for (const c of compositions) {
    if (c.clusters.length === 0) throw new Error(`No ${c.size}-Pokémon clusters for ${reg.code}; not overwriting existing data`);
  }

  return {
    output: {
      regulation: reg.code,
      source: "direct",
      sources,
      dateRange,
      generatedAt: isoDate(new Date()),
      compositions,
      sheets,
    },
    detail: `${teamCount} teams from ${sources.map((s) => `${s.name} (${s.events} events)`).join(" + ")}`,
  };
}

function generateLabmaus(reg, dateRange) {
  const compositions = buildCompositions(fetchTopTeams(reg.labmaus, dateRange));
  return {
    output: {
      regulation: reg.code,
      source: "labmaus",
      labmausRegulation: reg.labmaus,
      dateRange,
      generatedAt: isoDate(new Date()),
      compositions,
    },
    detail: "LabMaus top_teams",
  };
}

async function generateForRegulation(reg, opts, ctx) {
  const dateRange = computeDateRange(opts.windowDays);
  log(`${reg.code} via ${opts.source} (${dateRange.from} → ${dateRange.to})…`);

  const { output, detail } = opts.source === "labmaus"
    ? generateLabmaus(reg, dateRange)
    : await generateDirect(reg, dateRange, opts, ctx);

  const outPath = resolve(ROOT, `frontend/src/data/tournamentTeams-reg${reg.code}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  const line = `${countClusters(output.compositions)} clusters / ${countInnerTeams(output.compositions)} listed teams (${detail})`;
  log(`  Wrote ${line} → ${outPath}`);
  summary([`- **Reg ${reg.code}** via \`${opts.source}\`: ${line}`]);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ctx = {};
  if (opts.source === "direct") {
    ctx.registry = createRegistry();
    ctx.cache = createCache();
    const pruned = ctx.cache.prune("limitless", opts.windowDays + 7);
    if (pruned) log(`Pruned ${pruned} stale cache entries`);
  }
  summary(["### Tournament teams refresh"]);
  for (const reg of REGULATIONS) {
    await generateForRegulation(reg, opts, ctx);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
