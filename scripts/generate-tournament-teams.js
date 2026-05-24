#!/usr/bin/env node

/**
 * Generate per-regulation tournament team JSON for the Matchup Planner's
 * "Recent Tour" modal.
 *
 * Fetches the last ~60 days of top teams from labmaus.net's public
 * top_teams endpoint, trims aggressively, and writes one JSON file per
 * supported regulation.
 *
 * Writes:
 *   - frontend/src/data/tournamentTeams-regM-A.json
 *
 * Usage: node scripts/generate-tournament-teams.js
 *        (or: cd frontend && npm run generate:tournament-teams)
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// LabMaus ships this bearer in their public SPA bundle — it is not a secret,
// every visitor receives it. We treat it as a public anonymous API key.
// If LabMaus rotates it, this script will start failing with 403; copy the
// new value from their bundle (`Discord.Api_Key`) and re-run.
const LABMAUS_TOKEN = "X:F3mz5e4SP6Rcl3co!ou:8y";

// (Code → LabMaus regulation string). Add entries here when expanding
// coverage to other formats.
const REGULATIONS = [
  { code: "M-A", labmaus: "Regulation Set M-A" },
];

const WINDOW_DAYS = 60;

// LabMaus returns every individual tournament submission per cluster (often
// 50–100). The UI lists them inline; keeping that many is both wasteful in
// bundle size and unhelpful in the browse experience. LabMaus already sorts
// them by score, so the head of the list is the most representative.
const MAX_INNER_TEAMS_PER_CLUSTER = 20;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function computeDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - WINDOW_DAYS);
  return { from: isoDate(from), to: isoDate(to) };
}

function isPokepasteUrl(url) {
  return typeof url === "string" && /^https?:\/\/(www\.)?pokepast\.es\//.test(url);
}

// LabMaus encodes gender forms as Unicode "♂"/"♀" suffixes (e.g. "Basculegion ♂").
// Our Pokemon registry uses Showdown-style "-M"/"-F" suffixes, which already
// have alias coverage in scripts/pokemon-aliases.json. Normalize at the source
// so the frontend doesn't need to know about the Unicode form.
function normalizePokemonName(name) {
  if (typeof name !== "string") return name;
  return name.replace(/\s*♂$/u, "-M").replace(/\s*♀$/u, "-F");
}

function normalizeNames(names) {
  return Array.isArray(names) ? names.map(normalizePokemonName) : [];
}

function trimInnerTeam(team) {
  return {
    name: team.name ?? "",
    placement: team.placement ?? null,
    record: team.record ?? "",
    pokemonNames: normalizeNames(team.pokemon_names),
    pokepasteUrl: team.team_url,
    tournamentName: team.tournament_name ?? "",
  };
}

function trimCluster(cluster) {
  const teams = Array.isArray(cluster.teams)
    ? cluster.teams
        .filter((t) => isPokepasteUrl(t.team_url))
        .slice(0, MAX_INNER_TEAMS_PER_CLUSTER)
        .map(trimInnerTeam)
    : [];

  return {
    pokemon: Array.isArray(cluster.pokemon) ? cluster.pokemon : [],
    pokemonNames: normalizeNames(cluster.pokemon_names),
    wins: cluster.wins ?? 0,
    losses: cluster.losses ?? 0,
    teams,
  };
}

// Use curl for the HTTP request. Node's `fetch` trips over corporate
// MITM TLS proxies on some dev machines (UNABLE_TO_VERIFY_LEAF_SIGNATURE);
// curl honors the system trust store and "just works" on every platform
// we care about (macOS + Linux). The script is run manually by developers,
// so the curl dependency is fine.
function fetchTopTeams(labmausRegulation, dateRange) {
  const url = new URL("https://labmaus.net/api/top_teams");
  url.searchParams.set("regulation", labmausRegulation);
  url.searchParams.set("date_range", `${dateRange.from} to ${dateRange.to}`);
  url.searchParams.set("language", "en");

  const stdout = execFileSync(
    "curl",
    [
      "-sSf",
      "--max-time", "60",
      "-H", `authorization: Bearer ${LABMAUS_TOKEN}`,
      url.toString(),
    ],
    { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
  );

  return JSON.parse(stdout);
}

function generateForRegulation({ code, labmaus }) {
  const dateRange = computeDateRange();
  console.log(`Fetching ${labmaus} (${dateRange.from} → ${dateRange.to})…`);
  const raw = fetchTopTeams(labmaus, dateRange);

  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected top-level shape for ${code}: expected array`);
  }

  const compositions = raw
    .map((bucket) => ({
      size: bucket.composition,
      clusters: Array.isArray(bucket.teams) ? bucket.teams.map(trimCluster) : [],
    }))
    .filter((c) => typeof c.size === "number")
    .sort((a, b) => a.size - b.size);

  const totalClusters = compositions.reduce((n, c) => n + c.clusters.length, 0);
  const totalInnerTeams = compositions.reduce(
    (n, c) => n + c.clusters.reduce((m, k) => m + k.teams.length, 0),
    0,
  );

  const output = {
    regulation: code,
    labmausRegulation: labmaus,
    dateRange,
    generatedAt: isoDate(new Date()),
    compositions,
  };

  const outPath = resolve(ROOT, `frontend/src/data/tournamentTeams-reg${code}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  console.log(
    `  Wrote ${totalClusters} clusters / ${totalInnerTeams} teams → ${outPath}`,
  );
}

function main() {
  for (const reg of REGULATIONS) {
    generateForRegulation(reg);
  }
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
