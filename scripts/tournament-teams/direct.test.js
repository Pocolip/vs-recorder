import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, utimesSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { createRegistry } from "./registry.js";
import { createCache } from "./cache.js";
import { parseRateLimit } from "./http.js";
import * as limitless from "./limitless.js";
import * as reportworm from "./reportworm.js";
import { buildDirectCompositions } from "./cluster.js";
import { formatSheet, sheetId } from "./sheet.js";
import { parseArgs } from "../generate-tournament-teams.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf8"));
const registry = createRegistry();

// Live schemas sampled on 2026-11-07: Limitless "Sitrus-Series #81" and
// Reportworm "Gdańsk Regional" (2027 season), trimmed to a few players.

test("registry resolves both sources' species spellings", () => {
  for (const [input, name] of [
    ["floette-eternal", "Floette-Eternal"],
    ["Floette-Eternal", "Floette-Eternal"],
    ["floetteeternal", "Floette-Eternal"],
    ["indeedee-f", "Indeedee-F"],
    ["basculegionf", "Basculegion-F"],
    ["kommoo", "Kommo-o"],
    ["arcanine-hisui", "Arcanine-Hisui"],
  ]) {
    assert.equal(registry.resolveSpecies(input).name, name, input);
  }
  assert.throws(() => registry.resolveSpecies("definitely-not-a-pokemon"), /Unknown species/);
});

test("Limitless standings normalize into teams with sheets and links", () => {
  const { tournament, standings } = fixture("limitless-standings.json");
  limitless.validateStandings(standings);
  const teams = limitless.normalizeLimitless(tournament, standings, registry);

  assert.equal(teams.length, standings.length);
  const [first] = teams;
  assert.equal(first.placement, 1);
  assert.equal(first.players, tournament.players);
  assert.deepEqual(first.record, { w: 10, l: 2, t: 0 });
  assert.equal(first.mons.length, 6);
  assert.deepEqual(first.mons[2], {
    key: "raichu", name: "Raichu", item: "Raichunite Y", ability: "Lightning Rod",
    nature: "Timid", moves: ["Zap Cannon", "Focus Blast", "Fake Out", "Protect"],
  });
  assert.equal(
    first.sourceUrl,
    `https://play.limitlesstcg.com/tournament/${tournament.id}/player/centiskorch18/teamlist`,
  );
  assert.ok(teams.some((t) => t.mons.some((m) => m.name === "Floette-Eternal")));
});

test("Limitless events without teamsheets are skipped", () => {
  const { tournament, standings } = fixture("limitless-standings.json");
  const mostlyOpen = standings.map((p, i) => (i === 0 ? p : { ...p, decklist: null }));
  assert.deepEqual(limitless.normalizeLimitless(tournament, mostlyOpen, registry), []);
});

test("Limitless validators reject schema drift", () => {
  const { standings } = fixture("limitless-standings.json");
  for (const mutate of [
    (s) => { delete s[0].record; },
    (s) => { s[0].record.wins = "10"; },
    (s) => { delete s[0].decklist[0].id; },
    (s) => { s[0].decklist[0].attacks = "Protect"; },
    (s) => { s[0].placing = "1"; },
  ]) {
    const copy = structuredClone(standings);
    mutate(copy);
    assert.throws(() => limitless.validateStandings(copy), /Invalid Limitless response/);
  }
  assert.throws(() => limitless.validateTournamentList([{ id: "x", name: "y", date: "nope", players: 3 }]), /date/);
});

test("Limitless listing paginates until it passes the window start", async () => {
  const page = (dates) => dates.map((d, i) => ({ id: `${d}-${i}`, name: "T", date: `${d}T20:00:00.000Z`, players: 40 + i }));
  const pages = [
    page(Array(100).fill("2026-11-05")),
    page([...Array(50).fill("2026-10-01"), ...Array(50).fill("2026-08-01")]),
    page(["2026-07-01"]),
  ];
  const urls = [];
  const getJson = async (url) => {
    urls.push(url);
    return { json: pages[urls.length - 1] };
  };
  const out = await limitless.listTournaments(
    { format: "M-C", from: "2026-09-08", to: "2026-11-07", minPlayers: 32 },
    { getJson },
  );
  assert.equal(urls.length, 2, "stops once a page reaches past `from`");
  assert.match(urls[0], /format=M-C&limit=100&page=1$/);
  assert.equal(out.length, 150);
});

test("Limitless standings are cached only once a tournament is final", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vsr-cache-"));
  try {
    const cache = createCache(dir);
    const { standings } = fixture("limitless-standings.json");
    let calls = 0;
    const getJson = async () => { calls++; return { json: standings }; };
    const now = Date.parse("2026-11-07T00:00:00Z");
    const fresh = { id: "fresh", date: "2026-11-06T00:00:00Z" };
    const old = { id: "old", date: "2026-10-01T00:00:00Z" };

    await limitless.fetchStandings(fresh, { cache, getJson, now });
    await limitless.fetchStandings(fresh, { cache, getJson, now });
    assert.equal(calls, 2, "recent tournaments are refetched");

    const first = await limitless.fetchStandings(old, { cache, getJson, now });
    const second = await limitless.fetchStandings(old, { cache, getJson, now });
    assert.equal(calls, 3);
    assert.equal(first.fromCache, false);
    assert.equal(second.fromCache, true);
    assert.deepEqual(second.standings, standings);

    const stale = join(dir, "limitless", "old.json");
    utimesSync(stale, new Date("2026-01-01"), new Date("2026-01-01"));
    assert.equal(cache.prune("limitless", 67), 1);
    assert.deepEqual(readdirSync(join(dir, "limitless")), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Reportworm season index filters to completed events in the window", async () => {
  const season = fixture("reportworm-season.json");
  const requested = [];
  const getJson = async (url) => {
    requested.push(url);
    return { json: url.endsWith("/2027") ? season : null };
  };
  const events = await reportworm.listEvents(
    { formatLabel: "Regulation M-C", from: "2026-09-25", to: "2026-11-07" },
    { getJson },
  );
  assert.deepEqual(requested.map((u) => u.split("/").at(-1)), ["2026", "2027"]);
  assert.deepEqual(events.map((e) => e.code), ["gdansk", "puebla"]);
  assert.equal(events[0].season, 2027);
});

test("Reportworm events normalize with megas collapsed to the base species", () => {
  const data = fixture("reportworm-event.json");
  reportworm.validateEvent(data);
  const event = { season: 2027, code: "gdansk", playerCount: 758 };
  const teams = reportworm.normalizeReportworm(event, data, registry);

  assert.equal(teams.length, Object.keys(data.standings).length);
  const winner = teams.find((t) => t.placement === 1);
  assert.equal(winner.player, "Javier Varela");
  assert.equal(winner.players, 758);
  assert.deepEqual(winner.record, { w: 14, l: 2, t: 0 });
  assert.equal(winner.sourceUrl, "https://standings.reportworm.com/2027/gdansk/player/javier-varela");
  const ttar = winner.mons.find((m) => m.key === "tyranitar");
  assert.deepEqual(ttar, {
    key: "tyranitar", name: "Tyranitar", item: "Tyranitarite", ability: "Sand Stream",
    nature: "Jolly", moves: ["Rock Slide", "Knock Off", "Dragon Dance", "Protect"],
  });
  assert.ok(teams.every((t) => t.mons.every((m) => !/mega/i.test(m.key))));
});

test("Reportworm validators reject schema drift", () => {
  for (const mutate of [
    (d) => { d.standings = []; },
    (d) => { delete Object.values(d.standings)[0].record; },
    (d) => { Object.values(d.standings)[0].team[0].moves = ["Protect"]; },
    (d) => { delete d.event; },
  ]) {
    const copy = fixture("reportworm-event.json");
    mutate(copy);
    assert.throws(() => reportworm.validateEvent(copy), /Invalid Reportworm response/);
  }
  assert.throws(() => reportworm.validateSeason({}), /event array/);
});

test("sheets render as Showdown paste text", () => {
  const team = {
    mons: [
      { name: "Raichu", item: "Raichunite Y", ability: "Lightning Rod", nature: "Timid", moves: ["Fake Out", "Protect"] },
      { name: "Kommo-o", item: null, ability: null, nature: null, moves: ["Clanging Scales"] },
    ],
  };
  const text = formatSheet(team);
  assert.equal(
    text,
    "Raichu @ Raichunite Y\nAbility: Lightning Rod\nTimid Nature\n- Fake Out\n- Protect\n\nKommo-o\n- Clanging Scales",
  );
  assert.match(sheetId(text), /^[0-9a-f]{10}$/);
});

function syntheticTeam(keys, { placement = 1, players = 100, w = 5, l = 2, player = "P" } = {}) {
  return {
    player,
    placement,
    players,
    record: { w, l, t: 0 },
    mons: keys.map((k) => ({ key: k, name: k.toUpperCase(), item: null, ability: null, nature: null, moves: ["Protect"] })),
    tournamentName: "Test Open",
    sourceUrl: `https://example.test/${player}`,
  };
}

test("clustering ranks cores by frequency, aggregates records and caps output", () => {
  const core = ["a", "b", "c", "d"];
  const teams = [
    syntheticTeam([...core, "e", "f"], { placement: 8, players: 64, w: 6, l: 2, player: "late" }),
    syntheticTeam([...core, "e", "g"], { placement: 1, players: 64, w: 8, l: 0, player: "winner" }),
    syntheticTeam([...core, "h", "i"], { placement: 1, players: 16, w: 4, l: 1, player: "small" }),
    syntheticTeam(["m", "n", "o", "p", "q", "r"], { player: "other" }),
    syntheticTeam(["a", "a", "b", "c", "d", "e"], { player: "dupe" }), // invalid: duplicate species
    syntheticTeam(["a", "b", "c", "d", "e"], { player: "short" }),    // invalid: 5 mons
  ];
  const { compositions, sheets, teamCount } = buildDirectCompositions(teams, { maxClusters: 2, maxTeams: 2 });

  assert.equal(teamCount, 4);
  assert.deepEqual(compositions.map((c) => c.size), [4, 5, 6]);
  const four = compositions[0];
  assert.equal(four.clusters.length, 2);
  const top = four.clusters[0];
  assert.deepEqual([...top.pokemon].sort(), core);
  assert.deepEqual(top.pokemonNames, top.pokemon.map((k) => k.toUpperCase()));
  assert.equal(top.wins, 18);
  assert.equal(top.losses, 3);
  // best placing as a share of the field first, capped at maxTeams
  // (1st of 64 beats 1st of 16; 8th of 64 is cut by maxTeams)
  assert.deepEqual(top.teams.map((t) => t.name), ["winner", "small"]);
  assert.equal(top.teams[0].record, "8-0-0");
  assert.equal(top.teams[0].sourceUrl, "https://example.test/winner");
  for (const c of compositions) for (const k of c.clusters) for (const t of k.teams) {
    assert.ok(sheets[t.sheetId], "every listed team has its sheet");
  }
  // the 5-core shared by two teams outranks singletons
  assert.deepEqual([...compositions[1].clusters[0].pokemon].sort(), [...core, "e"]);
});

test("identical sheets are stored once", () => {
  const keys = ["a", "b", "c", "d", "e", "f"];
  const { sheets, compositions } = buildDirectCompositions(
    [syntheticTeam(keys, { player: "x" }), syntheticTeam(keys, { player: "y" })],
    { maxClusters: 1 },
  );
  assert.equal(Object.keys(sheets).length, 1);
  const [a, b] = compositions[2].clusters[0].teams;
  assert.equal(a.sheetId, b.sheetId);
});

test("rate-limit header parsing", () => {
  assert.deepEqual(parseRateLimit('"50-in-5min"; r=49; t=300'), { remaining: 49, reset: 300 });
  assert.deepEqual(parseRateLimit('"50-in-5min"; r=0; t=12'), { remaining: 0, reset: 12 });
  assert.equal(parseRateLimit(undefined), null);
});

test("CLI source selection: flag beats env, env beats default", () => {
  assert.equal(parseArgs([], {}).source, "direct");
  assert.equal(parseArgs([], { TOURNAMENT_TEAMS_SOURCE: "labmaus" }).source, "labmaus");
  assert.equal(parseArgs(["--source=direct"], { TOURNAMENT_TEAMS_SOURCE: "labmaus" }).source, "direct");
  assert.equal(parseArgs(["--min-players=64"], {}).minPlayers, 64);
  assert.throws(() => parseArgs(["--source=rk9"], {}), /--source must be one of/);
  assert.throws(() => parseArgs(["--bogus"], {}), /Unknown argument/);
});

test("Limitless API key is sent as a header, never in the URL", async () => {
  assert.deepEqual(limitless.limitlessRequestOptions({}), { keyed: false });
  assert.deepEqual(limitless.limitlessRequestOptions({ LIMITLESS_API_KEY: "  " }), { keyed: false });
  const request = limitless.limitlessRequestOptions({ LIMITLESS_API_KEY: "secret-key" });
  assert.equal(request.keyed, true);
  assert.deepEqual(request.headers, { "X-Access-Key": "secret-key" });

  const seen = [];
  const getJson = async (url, opts) => {
    seen.push({ url, opts });
    return { json: url.includes("/standings") ? [] : [] };
  };
  await limitless.listTournaments({ format: "M-C", from: "2026-09-08", to: "2026-11-07", minPlayers: 32 }, { getJson, request });
  await limitless.fetchStandings({ id: "abc", date: "2026-11-06T00:00:00Z" }, { getJson, request });
  assert.equal(seen.length, 2);
  for (const { url, opts } of seen) {
    assert.ok(!url.includes("secret-key"));
    assert.equal(opts.headers["X-Access-Key"], "secret-key");
    assert.equal(opts.spacingMs, request.spacingMs);
  }
});

test("custom-rule Limitless events are excluded by name", async () => {
  for (const name of [
    "Off Meta Fight Club #9",
    "MetaVGC Arena #2 | Off-Meta Edition| $10 Prize",
    "Monotype Mayhem ( by bakaiti villa )",
    "Gym Leader GAUNTLET (Monotype Tour)",
    "Copa Oak Stadium #12 - MonoType - R$ 50",
    "MetaVGC Arena #4 | MonoRegion | $10 Prize",
  ]) {
    assert.ok(limitless.isExcludedEvent(name), name);
  }
  for (const name of [
    "🍋Sitrus-Series🍋|Champions-MC|#81",
    "Talon's FIGHT CLUB #109 POKEMON CHAMPIONS REG M-C",
    "MetaVGC Arena #1 - Reg MC - Prizes: R$ 50 + Shiny",
    "Monterrey Weekly",
  ]) {
    assert.ok(!limitless.isExcludedEvent(name), name);
  }

  const getJson = async () => ({
    json: [
      { id: "a", name: "Off Meta Fight Club #9", date: "2026-11-01T00:00:00Z", players: 49 },
      { id: "b", name: "Sitrus-Series #81", date: "2026-11-01T00:00:00Z", players: 170 },
    ],
  });
  const out = await limitless.listTournaments({ format: "M-C", from: "2026-09-08", to: "2026-11-07", minPlayers: 32 }, { getJson });
  assert.deepEqual(out.map((t) => t.id), ["b"]);
});
