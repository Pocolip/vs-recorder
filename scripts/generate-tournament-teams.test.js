import test from "node:test";
import assert from "node:assert/strict";
import { validateTopTeams, trimCluster } from "./generate-tournament-teams.js";

// Minimal example of the live M-C schema checked on 2026-10-28.
function response() {
  return [{
    composition: 4,
    teams: [{
      pokemon: ["026", "059-h", "1000", "812"],
      pokemon_names: ["Raichu", "Arcanine-Hisui", "Gholdengo", "Rillaboom"],
      wins: 10,
      losses: 2,
      teams: [{
        name: "Example",
        placement: 1,
        record: "10-2-0",
        pokemon_names: ["Raichu", "Arcanine-Hisui", "Gholdengo", "Rillaboom", "Basculegion ♂", "Indeedee ♀"],
        team_url: "https://pokepast.es/f923016c52691ce2",
        tournament_name: "Reg M-C tournament",
      }],
    }],
  }];
}

test("current LabMaus schema produces the frontend ingestion fields", () => {
  const raw = response();
  validateTopTeams(raw);
  assert.deepEqual(trimCluster(raw[0].teams[0]), {
    pokemon: ["026", "059-h", "1000", "812"],
    pokemonNames: ["Raichu", "Arcanine-Hisui", "Gholdengo", "Rillaboom"],
    wins: 10,
    losses: 2,
    teams: [{
      name: "Example", placement: 1, record: "10-2-0",
      pokemonNames: ["Raichu", "Arcanine-Hisui", "Gholdengo", "Rillaboom", "Basculegion-M", "Indeedee-F"],
      pokepasteUrl: "https://pokepast.es/f923016c52691ce2",
      tournamentName: "Reg M-C tournament",
    }],
  });
});

test("rejects missing or renamed fields instead of silently emitting empty data", () => {
  for (const mutate of [
    (raw) => { delete raw[0].teams; },
    (raw) => { delete raw[0].teams[0].pokemon_names; },
    (raw) => { raw[0].teams[0].wins = "10"; },
    (raw) => { delete raw[0].teams[0].teams; },
    (raw) => { raw[0].teams[0].teams[0].pokemon_names = ["Raichu"]; },
    (raw) => { raw[0].teams[0].teams[0].placement = "1"; },
    (raw) => { delete raw[0].teams[0].teams[0].team_url; },
  ]) {
    const raw = response();
    mutate(raw);
    assert.throws(() => validateTopTeams(raw), /Invalid LabMaus response/);
  }
  assert.throws(() => validateTopTeams({ teams: response() }), /composition array/);
  assert.throws(() => validateTopTeams([]), /composition array/);
});

test("skips unsupported paste hosts and retains at most twenty usable teams", () => {
  const raw = response();
  const cluster = raw[0].teams[0];
  const team = cluster.teams[0];
  cluster.teams = [{ ...team, team_url: "https://example.com/team" }, ...Array(25).fill(team)];
  validateTopTeams(raw);
  assert.equal(trimCluster(cluster).teams.length, 20);
  assert.ok(trimCluster(cluster).teams.every((entry) => entry.pokepasteUrl === team.team_url));
});
